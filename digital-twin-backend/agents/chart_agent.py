"""
Chart Agent — given raw data + user prompt, generates a complete
Recharts-compatible chart configuration JSON.
"""
from __future__ import annotations
from models.schemas import ChartConfig, SeriesConfig, ReferenceLine
from services.llm_service import llm_json_call, has_real_llm
from services.data_service import infer_chart_type

COLORS = ["#6395ff", "#10d98d", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316"]

CHART_SYSTEM_PROMPT = """You are a data visualization expert.
Given data (JSON) and a user prompt, return a JSON chart configuration:
{
  "chartType": "AreaChart"|"LineChart"|"BarChart"|"PieChart"|"ScatterChart"|"RadarChart"|"ComposedChart",
  "title": "<descriptive title>",
  "xKey": "<field name for x axis>",
  "series": [{"key":"<field>","name":"<label>","color":"<hex>","type":"monotone"}],
  "referenceLines": [{"y":<num>,"label":"<str>","stroke":"<hex>"}],
  "insight": "<one key insight from the data>",
  "stacked": false
}
Pick the most effective chart type for the data shape and user intent.
Return ONLY valid JSON, no markdown.
"""

def mock_chart_config(prompt: str, data: list[dict]) -> dict:
    """Rule-based chart config generation."""
    chart_type = infer_chart_type(prompt, data)
    if not data:
        return {"chartType": "BarChart", "title": "No data", "xKey": "name", "series": [], "referenceLines": [], "insight": "", "stacked": False}

    # detect numeric keys
    sample = data[0]
    x_key = next((k for k in ("timestamp", "time", "date", "name", "label") if k in sample), list(sample.keys())[0])
    num_keys = [k for k in sample if k != x_key and isinstance(sample[k], (int, float))]

    series = [{"key": k, "name": k.replace("_", " ").title(), "color": COLORS[i % len(COLORS)], "type": "monotone"} for i, k in enumerate(num_keys[:6])]

    return {
        "chartType": chart_type,
        "title": f"Chart — {prompt[:50]}",
        "xKey": x_key,
        "series": series,
        "referenceLines": [],
        "insight": f"Showing {len(data)} data points across {len(num_keys)} metrics.",
        "stacked": False,
    }


async def run_chart_agent(prompt: str, data: list[dict]) -> ChartConfig:
    if has_real_llm():
        context = {
            "prompt": prompt,
            "data_sample": data[:10],
            "total_rows": len(data),
            "columns": list(data[0].keys()) if data else [],
        }
        result = await llm_json_call(
            CHART_SYSTEM_PROMPT,
            str(context),
            fallback_fn=lambda p: mock_chart_config(p, data),
        )
    else:
        result = mock_chart_config(prompt, data)

    return ChartConfig(
        chartType=result.get("chartType", "AreaChart"),
        title=result.get("title", "Chart"),
        xKey=result.get("xKey", "timestamp"),
        series=[SeriesConfig(**s) for s in result.get("series", [])],
        referenceLines=[ReferenceLine(**r) for r in result.get("referenceLines", [])],
        data=data,
        insight=result.get("insight", ""),
        stacked=result.get("stacked", False),
        gradient=True,
    )
