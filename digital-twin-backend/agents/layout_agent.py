"""
Layout Agent — LangGraph StateGraph that converts natural language prompts
into structured layout actions (add / move / remove / connect components).

Works with or without a real LLM (mock fallback included).
"""
from __future__ import annotations
import json
import re
import uuid
from typing import TypedDict, Annotated
import operator

from models.schemas import (
    LayoutStateSchema, ComponentSchema, ConnectionSchema,
    LayoutAction, LayoutPromptResponse
)
from services.llm_service import llm_json_call, has_real_llm

# ─── Default component palettes per domain ────────────────────────────────────
DOMAIN_DEFAULTS = {
    "factory": {
        "hydraulic_press":   {"color": "#ef4444", "gridSize": [2, 2]},
        "conveyor_belt":     {"color": "#f59e0b", "gridSize": [4, 1]},
        "cnc_machine":       {"color": "#10b981", "gridSize": [2, 2]},
        "assembly_station":  {"color": "#6395ff", "gridSize": [2, 2]},
        "quality_control":   {"color": "#8b5cf6", "gridSize": [2, 2]},
        "warehouse_rack":    {"color": "#06b6d4", "gridSize": [2, 3]},
    },
    "airport": {
        "terminal":       {"color": "#6395ff", "gridSize": [4, 3]},
        "gate":           {"color": "#10b981", "gridSize": [2, 2]},
        "runway":         {"color": "#374151", "gridSize": [6, 2]},
        "checkin_desk":   {"color": "#f59e0b", "gridSize": [3, 1]},
        "security_zone":  {"color": "#ef4444", "gridSize": [2, 2]},
        "baggage_claim":  {"color": "#8b5cf6", "gridSize": [3, 3]},
    },
    "warehouse": {
        "warehouse_rack":  {"color": "#06b6d4", "gridSize": [2, 3]},
        "picking_zone":    {"color": "#f59e0b", "gridSize": [3, 2]},
        "reception_dock":  {"color": "#10b981", "gridSize": [2, 2]},
        "shipping_dock":   {"color": "#6395ff", "gridSize": [2, 2]},
        "sorter":          {"color": "#8b5cf6", "gridSize": [2, 2]},
        "conveyor":        {"color": "#ef4444", "gridSize": [4, 1]},
    },
}

# ─── LangGraph State ──────────────────────────────────────────────────────────
class AgentState(TypedDict):
    prompt: str
    layout: dict
    actions: Annotated[list, operator.add]
    explanation: str
    error: str | None


# ─── Helper: find next free cell ──────────────────────────────────────────────
def find_free_cell(components: list[dict], cols: int, rows: int, size: list[int]) -> tuple[int, int]:
    occupied = set()
    for c in components:
        cw, ch = c.get("gridSize", [2, 2])
        for r in range(c["row"], c["row"] + ch):
            for col in range(c["col"], c["col"] + cw):
                occupied.add((r, col))

    w, h = size
    for row in range(rows - h + 1):
        for col in range(cols - w + 1):
            cells = [(row + dr, col + dc) for dr in range(h) for dc in range(w)]
            if not any(cell in occupied for cell in cells):
                return row, col
    return 0, 0


def find_component_by_name(components: list[dict], name_hint: str) -> dict | None:
    name_hint = name_hint.lower()
    for c in components:
        if name_hint in c.get("name", "").lower() or name_hint in c.get("type", "").lower():
            return c
    return None


# ─── Mock fallback parser ─────────────────────────────────────────────────────
def mock_parse_prompt(prompt: str, layout: dict) -> dict:
    """Rule-based prompt parser for demo without LLM."""
    prompt_lower = prompt.lower()
    domain = layout.get("domain", "factory")
    palette = DOMAIN_DEFAULTS.get(domain, DOMAIN_DEFAULTS["factory"])
    components = layout.get("components", [])
    cols = layout.get("gridCols", 10)
    rows = layout.get("gridRows", 8)
    actions = []

    # ── ADD patterns ──────────────────────────────────────────────────────────
    add_patterns = [
        (r"add(?:er|ez|er)?\s+(\d+)?\s*([a-z_ ]+?)(?:\s+(?:near|pr[eè]s|à|a|next to|beside)\s+(.+?))?(?:\s*$|\.)",
         "add"),
    ]
    for pat, _ in add_patterns:
        for m in re.finditer(pat, prompt_lower):
            count = int(m.group(1)) if m.group(1) else 1
            type_hint = m.group(2).strip().replace(" ", "_")
            # Match to closest component type in palette
            matched_type = next(
                (t for t in palette if type_hint in t or t in type_hint), list(palette.keys())[0]
            )
            cfg = palette[matched_type]
            for i in range(count):
                row, col = find_free_cell(
                    components + [a for a in actions if a.get("action") == "add"],
                    cols, rows, cfg["gridSize"]
                )
                name_suffix = len([c for c in components if matched_type in c.get("type", "")]) + i + 1
                actions.append({
                    "action": "add",
                    "componentType": matched_type,
                    "componentName": f"{matched_type.replace('_', ' ').title()} {name_suffix}",
                    "row": row, "col": col,
                    "gridSize": cfg["gridSize"],
                    "color": cfg["color"],
                })

    # ── MOVE patterns ─────────────────────────────────────────────────────────
    for m in re.finditer(r"(?:move|d[eé]placer|bouger)\s+([a-z_ ]+?)\s+(?:to|vers|à|a|at)\s+(?:row\s*)?(\d+)[\s,]+(?:col(?:umn)?\s*)?(\d+)", prompt_lower):
        comp = find_component_by_name(components, m.group(1).strip())
        if comp:
            actions.append({
                "action": "move",
                "componentId": comp["id"],
                "row": int(m.group(2)) - 1,
                "col": int(m.group(3)) - 1,
            })

    # ── REMOVE patterns ───────────────────────────────────────────────────────
    for m in re.finditer(r"(?:remove|delete|supprimer|enlever)\s+([a-z_ 0-9]+?)(?:\s*$|\.)", prompt_lower):
        comp = find_component_by_name(components, m.group(1).strip())
        if comp:
            actions.append({"action": "remove", "componentId": comp["id"]})

    # ── CONNECT patterns ──────────────────────────────────────────────────────
    for m in re.finditer(r"(?:connect|lier|relier)\s+([a-z_ 0-9]+?)\s+(?:to|avec|and|à)\s+([a-z_ 0-9]+?)(?:\s*$|\.)", prompt_lower):
        src = find_component_by_name(components, m.group(1).strip())
        tgt = find_component_by_name(components, m.group(2).strip())
        if src and tgt:
            actions.append({
                "action": "connect",
                "sourceId": src["id"],
                "targetId": tgt["id"],
            })

    if not actions:
        # Generic: if only a component type is mentioned, add one
        for t in palette:
            if t.replace("_", " ") in prompt_lower or t in prompt_lower:
                cfg = palette[t]
                row, col = find_free_cell(components, cols, rows, cfg["gridSize"])
                name_suffix = len([c for c in components if t in c.get("type", "")]) + 1
                actions.append({
                    "action": "add",
                    "componentType": t,
                    "componentName": f"{t.replace('_', ' ').title()} {name_suffix}",
                    "row": row, "col": col,
                    "gridSize": cfg["gridSize"],
                    "color": cfg["color"],
                })
                break

    explanation = f"Processed prompt: '{prompt}'. Actions planned: {len(actions)}."
    if not actions:
        explanation = f"No specific action detected for: '{prompt}'. Try 'Add 2 conveyor belts' or 'Move Assembly Station to row 3, col 5'."

    return {"actions": actions, "explanation": explanation}


# ─── LLM system prompt ────────────────────────────────────────────────────────
LAYOUT_SYSTEM_PROMPT = """You are an expert Digital Twin layout planner.
Given a natural language instruction and the current layout state (JSON), generate a JSON object with:
- "actions": array of layout actions
- "explanation": a concise explanation of what you did

Each action has one of these shapes:
- Add:     {"action":"add","componentType":"<type>","componentName":"<name>","row":<int>,"col":<int>,"gridSize":[w,h],"color":"<hex>"}
- Move:    {"action":"move","componentId":"<id>","row":<int>,"col":<int>}
- Remove:  {"action":"remove","componentId":"<id>"}
- Connect: {"action":"connect","sourceId":"<id>","targetId":"<id>"}
- Resize:  {"action":"resize","componentId":"<id>","gridSize":[w,h]}

Rules:
- Use only component types from the domain palette.
- Never place components outside the grid bounds.
- Never overlap components.
- Row and col are 0-indexed.
- Return ONLY valid JSON, no markdown.
"""


# ─── Apply actions to state ───────────────────────────────────────────────────
def apply_actions(state_dict: dict, actions: list[dict]) -> dict:
    """Apply a list of actions to the layout state dict and return updated state."""
    components = [c.copy() for c in state_dict.get("components", [])]
    connections = [c.copy() for c in state_dict.get("connections", [])]
    cols = state_dict.get("gridCols", 10)
    rows = state_dict.get("gridRows", 8)

    for action in actions:
        act = action.get("action")

        if act == "add":
            comp_type = action.get("componentType", "unknown")
            new_comp = {
                "id": f"{comp_type}_{uuid.uuid4().hex[:6]}",
                "name": action.get("componentName", comp_type.replace("_", " ").title()),
                "type": comp_type,
                "row": max(0, min(action.get("row", 0), rows - 1)),
                "col": max(0, min(action.get("col", 0), cols - 1)),
                "gridSize": action.get("gridSize", [2, 2]),
                "color": action.get("color", "#6395ff"),
                "kpiIds": [],
            }
            components.append(new_comp)

        elif act == "move":
            cid = action.get("componentId")
            for c in components:
                if c["id"] == cid:
                    c["row"] = max(0, min(action.get("row", c["row"]), rows - 1))
                    c["col"] = max(0, min(action.get("col", c["col"]), cols - 1))
                    break

        elif act == "remove":
            cid = action.get("componentId")
            components = [c for c in components if c["id"] != cid]
            connections = [cn for cn in connections
                           if cn.get("sourceId") != cid and cn.get("targetId") != cid]

        elif act == "connect":
            src_id = action.get("sourceId")
            tgt_id = action.get("targetId")
            if src_id and tgt_id:
                existing = any(
                    cn.get("sourceId") == src_id and cn.get("targetId") == tgt_id
                    for cn in connections
                )
                if not existing:
                    connections.append({
                        "id": f"conn_{uuid.uuid4().hex[:6]}",
                        "sourceId": src_id,
                        "targetId": tgt_id,
                        "label": action.get("label", ""),
                        "flowStatus": "green",
                    })

        elif act == "resize":
            cid = action.get("componentId")
            for c in components:
                if c["id"] == cid:
                    c["gridSize"] = action.get("gridSize", c["gridSize"])
                    break

    return {**state_dict, "components": components, "connections": connections}


# ─── Main entry point ─────────────────────────────────────────────────────────
async def run_layout_agent(prompt: str, current_state: LayoutStateSchema) -> LayoutPromptResponse:
    state_dict = current_state.model_dump()

    if has_real_llm():
        context = json.dumps({
            "domain": state_dict["domain"],
            "gridCols": state_dict["gridCols"],
            "gridRows": state_dict["gridRows"],
            "components": [{"id": c["id"], "name": c["name"], "type": c["type"], "row": c["row"], "col": c["col"], "gridSize": c["gridSize"]} for c in state_dict["components"]],
            "connections": [{"id": c["id"], "sourceId": c["sourceId"], "targetId": c["targetId"]} for c in state_dict["connections"]],
            "availableTypes": list(DOMAIN_DEFAULTS.get(state_dict["domain"], DOMAIN_DEFAULTS["factory"]).keys()),
        }, indent=2)
        result = await llm_json_call(
            LAYOUT_SYSTEM_PROMPT,
            f"Current layout:\n{context}\n\nInstruction: {prompt}",
            fallback_fn=lambda p: mock_parse_prompt(p, state_dict),
        )
    else:
        result = mock_parse_prompt(prompt, state_dict)

    actions_raw = result.get("actions", [])
    explanation = result.get("explanation", "Actions applied.")

    new_state_dict = apply_actions(state_dict, actions_raw)

    actions = [LayoutAction(**a) for a in actions_raw]
    new_state = LayoutStateSchema(**new_state_dict)

    return LayoutPromptResponse(actions=actions, explanation=explanation, newState=new_state)
