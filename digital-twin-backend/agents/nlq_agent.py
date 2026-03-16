"""
NLQ Analytics Agent — converts natural language questions about KPIs
into structured answers + chart configurations.

Uses LangGraph ReAct pattern; falls back to rule-based analysis without LLM.
"""
from __future__ import annotations
import json
from datetime import datetime
from models.schemas import (
    AnalyticsQueryRequest, AnalyticsQueryResponse,
    ChartConfig, SeriesConfig, ReferenceLine
)
from services.llm_service import llm_json_call, has_real_llm
from services.data_service import (
    compute_stats, detect_anomalies, infer_chart_type,
    records_to_chart_data, filter_by_time_range
)

# ─── Chart color palette ──────────────────────────────────────────────────────
COLORS = ["#6395ff", "#10d98d", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316"]

# ─── LLM system prompt ────────────────────────────────────────────────────────
NLQ_SYSTEM_PROMPT = """You are an expert analytics AI for a Digital Twin platform.
Given a user question and KPI data (JSON), return a JSON object with:
- "answer": string — direct, insightful answer (max 3 sentences, use numbers)
- "chartType": one of LineChart|AreaChart|BarChart|PieChart|ScatterChart|RadarChart|ComposedChart
- "title": chart title string
- "insight": one key observation highlighted (for chart annotation)
- "seriesKeys": list of KPI names to plot from the data
- "referenceLines": optional [{y: value, label: "...", stroke: "#ef4444"}]

Be specific, analytical, and use actual values from the data.
Return ONLY valid JSON, no markdown.
"""


# ─── Mock NLQ fallback ────────────────────────────────────────────────────────
def mock_nlq_answer(question: str, records: list, stats_by_kpi: dict) -> dict:
    q = question.lower()
    kpi_names = list(stats_by_kpi.keys())

    # Build answer from stats
    if not stats_by_kpi:
        return {
            "answer": "No KPI data available for analysis. Please import data for your components first.",
            "chartType": "BarChart",
            "title": "No data available",
            "insight": "",
            "seriesKeys": [],
            "referenceLines": [],
        }

    summaries = []
    ref_lines = []
    for kpi, stats in stats_by_kpi.items():
        summaries.append(f"{kpi}: avg={stats.get('mean','N/A')}, max={stats.get('max','N/A')}, min={stats.get('min','N/A')}")
        if stats.get("max") is not None:
            ref_lines.append({"y": stats["p95"], "label": f"{kpi} P95", "stroke": "#f59e0b"})

    answer = ""
    if any(w in q for w in ("status", "statut", "état", "etat", "overview", "résumé", "resume")):
        answer = f"System overview: {len(kpi_names)} KPIs monitored. " + "; ".join(summaries[:2]) + "."
    elif any(w in q for w in ("anomaly", "anomalie", "alert", "alerte", "critical", "critique", "pic", "spike")):
        all_anomalies = []
        for r in records:
            val = getattr(r, "value", None)
            name = getattr(r, "kpi_name", "")
            if val and name in stats_by_kpi:
                s = stats_by_kpi[name]
                if s.get("std", 0) > 0 and abs(val - s["mean"]) / s["std"] > 2.5:
                    all_anomalies.append(f"{name}={val:.1f}")
        if all_anomalies:
            answer = f"Detected {len(all_anomalies)} anomalies: {', '.join(all_anomalies[:3])}."
        else:
            answer = "No significant anomalies detected within 2.5 standard deviations."
    elif any(w in q for w in ("max", "maximum", "highest", "plus haut", "peak")):
        best = max(stats_by_kpi.items(), key=lambda x: x[1].get("max", 0))
        answer = f"The highest recorded value is {best[0]}={best[1]['max']} (avg={best[1]['mean']})."
    elif any(w in q for w in ("min", "minimum", "lowest", "plus bas")):
        worst = min(stats_by_kpi.items(), key=lambda x: x[1].get("min", float("inf")))
        answer = f"The lowest recorded value is {worst[0]}={worst[1]['min']} (avg={worst[1]['mean']})."
    elif any(w in q for w in ("average", "mean", "moyenne")):
        answer = "KPI averages: " + ", ".join(f"{k}={v['mean']}" for k, v in list(stats_by_kpi.items())[:3]) + "."
    elif any(w in q for w in ("trend", "évolution", "evolution", "over time")):
        answer = f"Analyzing trends for {len(kpi_names)} KPIs. " + summaries[0] if summaries else "."
    else:
        answer = "Analysis complete. " + (summaries[0] if summaries else "No specific match found.")

    chart_type = infer_chart_type(question, records)
    title = f"KPI Analysis — {'All Components' if not any(w in q for w in kpi_names) else kpi_names[0]}"

    return {
        "answer": answer,
        "chartType": chart_type,
        "title": title,
        "insight": summaries[0] if summaries else "",
        "seriesKeys": kpi_names[:5],
        "referenceLines": ref_lines[:2],
    }


# ─── Build ChartConfig from records + LLM/mock result ────────────────────────
def build_chart_config(llm_result: dict, records: list, time_range: str) -> ChartConfig:
    chart_type = llm_result.get("chartType", "AreaChart")
    title = llm_result.get("title", "KPI Analysis")
    series_keys = llm_result.get("seriesKeys", [])
    ref_lines_raw = llm_result.get("referenceLines", [])
    insight = llm_result.get("insight", "")

    # Build chart data
    data = records_to_chart_data(records)
    if not data:
        # If no time-series, build aggregation data
        from collections import defaultdict
        agg: dict[str, dict] = defaultdict(lambda: {"count": 0, "total": 0.0})
        for r in records:
            name = getattr(r, "kpi_name", "value")
            val = getattr(r, "value", 0)
            agg[name]["count"] += 1
            agg[name]["total"] += val
        data = [{"name": k, "value": round(v["total"] / v["count"], 2) if v["count"] else 0}
                for k, v in agg.items()]
        chart_type = "BarChart"
        series_keys = ["value"]

    # For PieChart: transform to name/value pairs
    if chart_type == "PieChart" and data and "kpi_name" not in (data[0] if data else {}):
        from collections import defaultdict
        agg2: dict[str, list] = defaultdict(list)
        for r in records:
            agg2[getattr(r, "kpi_name", "KPI")].append(getattr(r, "value", 0))
        data = [{"name": k, "value": round(sum(v) / len(v), 2)} for k, v in agg2.items()]
        series_keys = ["value"]

    series = [
        SeriesConfig(key=k, name=k.replace("_", " ").title(), color=COLORS[i % len(COLORS)])
        for i, k in enumerate(series_keys or (list(data[0].keys() - {"timestamp", "name"}) if data else []))
    ]
    ref_lines = [
        ReferenceLine(y=rl.get("y"), label=rl.get("label", ""), stroke=rl.get("stroke", "#ef4444"))
        for rl in ref_lines_raw
    ]

    return ChartConfig(
        chartType=chart_type,
        title=title,
        xKey="timestamp" if "timestamp" in (data[0] if data else {}) else "name",
        series=series,
        referenceLines=ref_lines,
        data=data[-100:],  # max 100 points
        insight=insight,
        gradient=True,
    )


# ─── Main entry point ─────────────────────────────────────────────────────────
async def run_nlq_agent(
    request: AnalyticsQueryRequest,
    records: list,
    db_query_id: int = 0
) -> AnalyticsQueryResponse:
    """
    records: list of KpiDataDB ORM objects
    """
    # Filter by time range
    records_dicts = [
        {"timestamp": getattr(r, "timestamp"), "value": getattr(r, "value"), "kpi_name": getattr(r, "kpi_name"), "component_id": getattr(r, "component_id")}
        for r in records
    ]
    filtered_dicts = filter_by_time_range(records_dicts, request.timeRange or "24h")

    # Compute stats per KPI
    from collections import defaultdict
    by_kpi: dict[str, list] = defaultdict(list)
    for r in filtered_dicts:
        by_kpi[r["kpi_name"]].append(r)
    stats_by_kpi = {k: compute_stats(v, "value") for k, v in by_kpi.items()}

    if has_real_llm():
        context = json.dumps({
            "question": request.question,
            "component_filter": request.componentId,
            "time_range": request.timeRange,
            "kpi_statistics": stats_by_kpi,
            "sample_data": filtered_dicts[-20:] if filtered_dicts else [],
        }, indent=2, default=str)

        llm_result = await llm_json_call(
            NLQ_SYSTEM_PROMPT,
            f"Context:\n{context}\n\nQuestion: {request.question}",
            fallback_fn=lambda _: mock_nlq_answer(request.question, records, stats_by_kpi),
        )
    else:
        llm_result = mock_nlq_answer(request.question, records, stats_by_kpi)

    answer = llm_result.get("answer", "Analysis complete.")
    chart = build_chart_config(llm_result, records, request.timeRange or "24h")

    return AnalyticsQueryResponse(
        answer=answer,
        chart=chart,
        rawData=filtered_dicts[-50:],
        queryId=db_query_id,
    )
