from pydantic import BaseModel, Field
from typing import Any, Optional
from datetime import datetime


# ─── Layout Schemas ────────────────────────────────────────────────────────────

class ComponentSchema(BaseModel):
    id: str
    name: str
    type: str
    row: int
    col: int
    gridSize: list[int] = [2, 2]
    color: str = "#6395ff"
    kpiIds: list[str] = []
    isCustom: bool = False
    icon: Optional[str] = None
    description: Optional[str] = None
    mesh3D: Optional[dict] = None

class ConnectionSchema(BaseModel):
    id: str
    sourceId: str
    targetId: str
    label: str = ""
    flowStatus: str = "green"

class LayoutStateSchema(BaseModel):
    id: str = "default"
    name: str = "Digital Twin"
    domain: str = "factory"
    width: float = 60.0
    length: float = 40.0
    gridCols: int = 10
    gridRows: int = 8
    components: list[ComponentSchema] = []
    connections: list[ConnectionSchema] = []
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


class TwinSummary(BaseModel):
    id: str
    name: str
    domain: str
    width: float
    length: float
    gridCols: int
    gridRows: int
    componentCount: int
    connectionCount: int
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

class LayoutPromptRequest(BaseModel):
    prompt: str = Field(..., description="Natural language instruction to modify layout")
    currentState: LayoutStateSchema

class LayoutAction(BaseModel):
    action: str  # add | move | remove | connect | disconnect | resize
    componentId: Optional[str] = None
    componentType: Optional[str] = None
    componentName: Optional[str] = None
    row: Optional[int] = None
    col: Optional[int] = None
    gridSize: Optional[list[int]] = None
    sourceId: Optional[str] = None
    targetId: Optional[str] = None
    color: Optional[str] = None
    isCustom: Optional[bool] = None
    icon: Optional[str] = None
    mesh3D: Optional[dict] = None

class LayoutPromptResponse(BaseModel):
    actions: list[LayoutAction]
    explanation: str
    newState: LayoutStateSchema


# ─── KPI Schemas ───────────────────────────────────────────────────────────────

class KpiDataPoint(BaseModel):
    timestamp: Optional[datetime] = None
    value: float
    unit: str = ""
    source: str = "manual"

class KpiImportResponse(BaseModel):
    componentId: str
    kpiName: str
    rowsImported: int
    preview: list[dict]
    columns: list[str]

class KpiRecord(BaseModel):
    id: int
    componentId: str
    kpiName: str
    value: float
    unit: str
    timestamp: datetime
    source: str


# ─── Analytics Schemas ─────────────────────────────────────────────────────────

class SeriesConfig(BaseModel):
    key: str
    name: str
    color: str = "#6395ff"
    type: str = "monotone"

class ReferenceLine(BaseModel):
    y: Optional[float] = None
    x: Optional[str] = None
    label: str = ""
    stroke: str = "#ef4444"
    strokeDasharray: str = "5 5"

class ChartConfig(BaseModel):
    chartType: str  # LineChart | AreaChart | BarChart | PieChart | ScatterChart | RadarChart | ComposedChart
    title: str
    xKey: str = "timestamp"
    yLabel: Optional[str] = None
    series: list[SeriesConfig] = []
    referenceLines: list[ReferenceLine] = []
    data: list[dict] = []
    insight: str = ""
    stacked: bool = False
    gradient: bool = True

class AnalyticsQueryRequest(BaseModel):
    question: str
    componentId: Optional[str] = None  # filter to specific component
    timeRange: Optional[str] = "24h"   # 1h | 6h | 24h | 7d | 30d

class AnalyticsQueryResponse(BaseModel):
    answer: str
    chart: Optional[ChartConfig] = None
    rawData: list[dict] = []
    queryId: int = 0

class ChartFromPromptRequest(BaseModel):
    prompt: str
    data: list[dict]

class QuerySuggestion(BaseModel):
    text: str
    category: str  # trend | compare | anomaly | summary
