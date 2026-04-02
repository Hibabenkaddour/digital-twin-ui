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


# ─── Helper: find closest free cell ───────────────────────────────────────────
def check_collision(components: list[dict], row: int, col: int, w: int, h: int) -> bool:
    for c in components:
        cw, ch = c.get("gridSize", [2, 2])
        # AABB collision
        if row < c["row"] + ch and row + h > c["row"] and col < c["col"] + cw and col + w > c["col"]:
            return True
    return False

def find_closest_free_cell(components: list[dict], cols: int, rows: int, size: list[int], target_row: int, target_col: int) -> tuple[int, int]:
    """Finds the closest non-overlapping cell to the target via concentric rectangles."""
    w, h = size
    
    # Boundary clamp target
    t_r = max(0, min(target_row, rows - h))
    t_c = max(0, min(target_col, cols - w))
    
    if not check_collision(components, t_r, t_c, w, h):
        return t_r, t_c
        
    # Search radius
    for radius in range(1, max(cols, rows)):
        for r in range(max(0, t_r - radius), min(rows - h + 1, t_r + radius + 1)):
            for c in range(max(0, t_c - radius), min(cols - w + 1, t_c + radius + 1)):
                # Only check perimeter of the expanded search box
                if abs(r - t_r) == radius or abs(c - t_c) == radius:
                    if not check_collision(components, r, c, w, h):
                        return r, c
                        
    return t_r, t_c # Fallback, let it overlap if grid is 100% full

# ─── LLM system prompt ────────────────────────────────────────────────────────
LAYOUT_SYSTEM_PROMPT = """You are an elite Digital Twin Spatial Architect AND a 3D modeling expert.
Given a natural language instruction and the current layout state (JSON), generate a JSON object with:
- "actions": array of layout actions
- "explanation": a concise, operational explanation of what you did.

═══════════════════════════════════════════════════
ACTION FORMATS
═══════════════════════════════════════════════════

1. Add standard (from domain palette):
   {"action":"add", "componentType":"<type_from_availableTypes>", "componentName":"<name>", "row":<int>, "col":<int>}

2. Add custom (ANY new real-world object):
   {"action":"add", "componentType":"custom_<snake_case>", "componentName":"<name>", "row":<int>, "col":<int>,
    "isCustom":true, "gridSize":[w,h], "color":"<main_hex_color>", "icon":"<emoji>",
    "mesh3D":{"parts":[ ...array of 3D primitives... ]}}

3. Move:   {"action":"move", "componentId":"<id>", "row":<int>, "col":<int>}
4. Remove: {"action":"remove", "componentId":"<id>"}

═══════════════════════════════════════════════════
RULE #1: USE STANDARD TYPES FIRST
═══════════════════════════════════════════════════
If the requested object matches an `availableTypes` entry, use "Add standard". Do NOT create a custom component for paletteitems.

═══════════════════════════════════════════════════
RULE #2: 3D MODELING FOR CUSTOM COMPONENTS
═══════════════════════════════════════════════════
For custom components, you MUST generate a `mesh3D.parts` array that faithfully represents the REAL-WORLD physical shape of the object.
Think like a 3D artist: decompose the object into simple primitives and assemble them.

Each part in the array is a JSON object:
{
  "geo": "box" | "cylinder" | "sphere" | "cone" | "torus",
  "pos": [x, y, z],    // Position as FRACTIONS of component width(x), height(y), depth(z). [0,0,0]=ground center.
  "size": [...],        // Geometry dimensions as fractions (see below)
  "rot": [rx, ry, rz],  // Rotation in DEGREES (optional, default [0,0,0])
  "color": "#hex",      // Color of this specific part
  "metalness": 0.0-1.0, // Metal look (optional, default 0.5)
  "roughness": 0.0-1.0, // Surface roughness (optional, default 0.3)
  "emissive": "#hex",   // Glow color (optional, for lights/screens)
  "emissiveIntensity": 0.0-2.0, // Glow strength (optional)
  "opacity": 0.0-1.0    // Transparency (optional, default 1.0)
}

Size conventions per geometry:
- box:      [width_frac, height_frac, depth_frac]  (fractions of w, h, d)
- cylinder: [radiusTop_frac, radiusBottom_frac, height_frac, segments]  (radius as fraction of min(w,d), height as fraction of h)
- sphere:   [radius_frac, widthSegments, heightSegments]  (radius as fraction of min(w,d))
- cone:     [radius_frac, height_frac, segments]
- torus:    [radius_frac, tube_frac, radialSegments, tubularSegments]

═══════════════════════════════════════════════════
EXAMPLES OF REAL-WORLD 3D MODELING
═══════════════════════════════════════════════════

Robotic Arm:
"parts": [
  {"geo":"cylinder","pos":[0,0.08,0],"size":[0.35,0.4,0.15],"color":"#374151","metalness":0.6},
  {"geo":"box","pos":[0,0.35,0],"size":[0.08,0.4,0.08],"color":"#3b82f6","metalness":0.7},
  {"geo":"sphere","pos":[0,0.55,0],"size":[0.06],"color":"#9ca3af","metalness":0.8},
  {"geo":"box","pos":[0.12,0.7,0],"size":[0.06,0.3,0.06],"rot":[0,0,-30],"color":"#3b82f6","metalness":0.7},
  {"geo":"sphere","pos":[0.2,0.85,0],"size":[0.05],"color":"#ef4444","emissive":"#ef4444","emissiveIntensity":0.8}
]

Water Tank:
"parts": [
  {"geo":"cylinder","pos":[0,0.4,0],"size":[0.4,0.4,0.7],"color":"#9ca3af","metalness":0.7,"roughness":0.2},
  {"geo":"sphere","pos":[0,0.82,0],"size":[0.4],"color":"#9ca3af","metalness":0.7},
  {"geo":"cylinder","pos":[0,0.05,0],"size":[0.42,0.42,0.08],"color":"#374151","metalness":0.5},
  {"geo":"box","pos":[0.3,0.3,0],"size":[0.04,0.5,0.04],"color":"#6b7280","metalness":0.6},
  {"geo":"sphere","pos":[0.3,0.55,0],"size":[0.03],"color":"#ef4444","emissive":"#ef4444","emissiveIntensity":1.0}
]

Solar Panel:
"parts": [
  {"geo":"box","pos":[0,0.04,0],"size":[0.9,0.02,0.9],"color":"#1e3a5f","metalness":0.9,"roughness":0.1},
  {"geo":"box","pos":[0,0.06,0],"size":[0.88,0.01,0.88],"color":"#3b82f6","metalness":0.8,"roughness":0.05,"emissive":"#1e40af","emissiveIntensity":0.3},
  {"geo":"cylinder","pos":[0,0.02,0],"size":[0.03,0.03,0.04],"color":"#6b7280","metalness":0.6},
  {"geo":"box","pos":[-0.35,0.04,0],"size":[0.02,0.01,0.8],"color":"#9ca3af"},
  {"geo":"box","pos":[0.35,0.04,0],"size":[0.02,0.01,0.8],"color":"#9ca3af"}
]

═══════════════════════════════════════════════════
SPATIAL RULES
═══════════════════════════════════════════════════
- Grid: row=0, col=0 (top-left) to row=(gridRows-1), col=(gridCols-1).
- "Top right" -> row=0, col=max.  "Next to X" -> col = X.col + X.width.
- DO NOT overlap. The backend will auto-correct collisions, but try your best.
- To reposition EXISTING items, use "move" with the exact componentId.

Return ONLY valid JSON.
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
            is_custom = action.get("isCustom", False)
            
            # Default to palette size if not custom
            g_size = action.get("gridSize", [2, 2])
            clr = action.get("color", "#6395ff")
            if not is_custom:
                domain = state_dict.get("domain", "factory")
                palette = DOMAIN_DEFAULTS.get(domain, DOMAIN_DEFAULTS["factory"])
                if comp_type in palette:
                    g_size = palette[comp_type]["gridSize"]
                    clr = action.get("color", palette[comp_type]["color"]) # Allow llm to override color
            
            # Smart positioning: Anti-collision
            target_row = action.get("row", 0)
            target_col = action.get("col", 0)
            safe_row, safe_col = find_closest_free_cell(components, cols, rows, g_size, target_row, target_col)
            
            new_comp = {
                "id": f"{comp_type}_{uuid.uuid4().hex[:6]}",
                "name": action.get("componentName", comp_type.replace("_", " ").title()),
                "type": comp_type,
                "row": safe_row,
                "col": safe_col,
                "gridSize": g_size,
                "color": clr,
                "kpiIds": [],
                "isCustom": is_custom,
            }
            if is_custom:
                new_comp["icon"] = action.get("icon", "✨")
                new_comp["mesh3D"] = action.get("mesh3D", {"shape": "box"})
                
            components.append(new_comp)

        elif act == "move":
            cid = action.get("componentId")
            for c in components:
                if c["id"] == cid:
                    current_g_size = c.get("gridSize", [2, 2])
                    
                    # Temporarily remove self from collision check
                    temp_components = [tc for tc in components if tc["id"] != cid]
                    
                    target_row = action.get("row", c["row"])
                    target_col = action.get("col", c["col"])
                    safe_row, safe_col = find_closest_free_cell(temp_components, cols, rows, current_g_size, target_row, target_col)
                    
                    c["row"] = safe_row
                    c["col"] = safe_col
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
