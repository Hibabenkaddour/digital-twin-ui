"""
KPI Agent — Uses the specified LLM to propose KPIs based on the domain and available DB columns.
"""
from typing import List, Dict
import json
from services.llm_service import llm_json_call

KPI_SYSTEM_PROMPT = """You are an elite Data Scientist and Domain Architect specializing in Industry 4.0 Digital Twins.
Your task is to analyze an industry `domain` and a list of available PostgreSQL `columns`, and engineer exactly 3 to 5 BRILLIANT, HIGH-VALUE Key Performance Indicators (KPIs).

Do not just return the raw columns. You must deduce the physical meaning of the data and propose advanced metrics that operational managers actually care about.
Depending on the domain, construct metrics such as:
- **Factory/Manufacturing**: Overall Equipment Effectiveness (OEE), scrap rates, output efficiency, temperature deltas, pressure drops.
- **Airport**: Passenger throughput, average security wait times, baggage handling efficiency, gate turnaround times.
- **Warehousing/Supply Chain**: Picking velocity, storage density, conveyor belt load factor, sorting accuracy.

For each KPI, provide:
- "kpi_name": A professional, actionable label (e.g., "Thermal Efficiency", "Pressure Drop Delta", "Throughput Velocity").
- "formula": A mathematical formula EXACTLY matching the available columns. Use basic math operators: +, -, *, /. 
   > Examples of good formulas: "(produced_units - defective_units) / produced_units * 100", "temp_out - temp_in", "fuel_consumed / distance_travelled".
   > CRITICAL: YOU MUST ONLY USE EXACT COLUMN NAMES PROVIDED IN THE INPUT. DO NOT HALLUCINATE COLUMN NAMES.
- "unit": The strictly correct unit of measurement for this derived value (e.g., "%", "bar", "°C", "units/hr").
- "direction": "asc" if higher values are BAD (e.g., temperature getting too high means danger). "desc" if lower values are BAD (e.g., efficiency dropping below a certain % is bad).
- "orange": The threshold value for a Warning state. Estimate a highly realistic industrial value.
- "red": The critical threshold for a Red Alert state. Estimate a highly realistic industrial value.
- "interaction": Choose the most logical visual behavior ("transition" for continuous stats like temperature, "pulse" for high-priority alerts, "glow" for efficiencies).

Return a valid JSON object containing an array under the key "kpis".
Example format:
{
  "kpis": [
    {
      "kpi_name": "Thermal Efficiency", "formula": "(energy_out / energy_in) * 100", "unit": "%", "direction": "desc", "orange": 85, "red": 75, "interaction": "glow"
    }
  ]
}
"""

def fallback_kpi_proposals(domain: str, columns: List[str]) -> Dict:
    """Fallback mocked KPIs if LLM is down."""
    mock_kpis = []
    if columns:
        col1 = columns[0]
        col2 = columns[1] if len(columns) > 1 else columns[0]
        mock_kpis.append({
            "kpi_name": "Base " + col1.title(),
            "formula": col1,
            "unit": "units",
            "direction": "asc",
            "orange": 75,
            "red": 90,
            "interaction": "pulse"
        })
        if col1 != col2:
            mock_kpis.append({
                "kpi_name": f"{col1.title()} & {col2.title()} Sum",
                "formula": f"{col1} + {col2}",
                "unit": "units",
                "direction": "asc",
                "orange": 150,
                "red": 200,
                "interaction": "transition"
            })
    return {"kpis": mock_kpis}

async def propose_kpis(domain: str, columns: List[str]) -> List[Dict]:
    """Invoke the LLM to get proposed KPIs."""
    if not columns:
        return []

    user_message = json.dumps({
        "domain": domain,
        "columns": columns
    }, indent=2)

    result = await llm_json_call(
        KPI_SYSTEM_PROMPT,
        user_message,
        fallback_fn=lambda _: fallback_kpi_proposals(domain, columns)
    )

    return result.get("kpis", [])
