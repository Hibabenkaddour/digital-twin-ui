import { create } from 'zustand';

export const DOMAINS = {
  factory: {
    label: 'Factory', icon: '🏭', color: '#f97316',
    components: [
      { type: 'hydraulic_press',    name: 'Hydraulic Press',    gridSize: [2, 2], color: '#64748b' },
      { type: 'conveyor_belt',      name: 'Conveyor Belt',      gridSize: [4, 1], color: '#3b82f6' },
      { type: 'cnc_machine',        name: 'CNC Machine',        gridSize: [2, 2], color: '#6366f1' },
      { type: 'assembly_station',   name: 'Assembly Station',   gridSize: [2, 2], color: '#10b981' },
      { type: 'quality_control',    name: 'Quality Control',    gridSize: [2, 1], color: '#f59e0b' },
      { type: 'warehouse_rack',     name: 'Warehouse Rack',     gridSize: [3, 1], color: '#f4723e' },
    ],
  },
  airport: {
    label: 'Airport', icon: '✈️', color: '#06b6d4',
    components: [
      { type: 'terminal',       name: 'Terminal',        gridSize: [4, 3], color: '#0ea5e9' },
      { type: 'gate',           name: 'Gate',            gridSize: [2, 1], color: '#6366f1' },
      { type: 'runway',         name: 'Runway',          gridSize: [6, 2], color: '#374151' },
      { type: 'checkin_desk',   name: 'Check-in Desk',   gridSize: [2, 1], color: '#10b981' },
      { type: 'security_zone',  name: 'Security Zone',   gridSize: [3, 2], color: '#ef4444' },
      { type: 'baggage_claim',  name: 'Baggage Claim',   gridSize: [3, 2], color: '#f59e0b' },
    ],
  },
  warehouse: {
    label: 'Warehouse', icon: '📦', color: '#84cc16',
    components: [
      { type: 'storage_rack',    name: 'Storage Rack',    gridSize: [3, 1], color: '#a78bfa' },
      { type: 'picking_zone',    name: 'Picking Zone',    gridSize: [2, 2], color: '#34d399' },
      { type: 'reception_dock',  name: 'Reception Dock',  gridSize: [3, 2], color: '#60a5fa' },
      { type: 'shipping_dock',   name: 'Shipping Dock',   gridSize: [3, 2], color: '#f472b6' },
      { type: 'conveyor',        name: 'Conveyor',        gridSize: [4, 1], color: '#fbbf24' },
      { type: 'sorter',          name: 'Sorter',          gridSize: [2, 2], color: '#fb923c' },
    ],
  },
};

const getBlueprint = (domain, type) =>
  DOMAINS[domain]?.components.find(c => c.type === type);

let compIdCounter = 100;

const useTwinStore = create((set, get) => ({
  currentStep: 0,
  selectedDomain: null,
  twinName: '',
  width: 60,
  length: 40,
  gridCols: 0,
  gridRows: 0,
  cellSize: 6,

  twins: [],
  activeTwinId: null,

  components: [],
  connections: [],
  kpis: [],
  kpiHistory: [],
  selectedComponentId: null,
  hoveredComponentId: null,
  activePanel: 'kpi',

  chatMessages: [
    { id: 0, role: 'assistant', text: '👋 Hello! I\'m your Analytics AI.\n\nAsk me anything about your digital twin KPIs.' }
  ],

  setStep: (step) => set(s => ({
    currentStep: step,
    selectedComponentId: s.currentStep !== step ? null : s.selectedComponentId
  })),
  setDomain:     (domain) => set({ selectedDomain: domain }),
  setTwinName:   (name)   => set({ twinName: name }),
  setDimensions: (width, length) => {
    const cellSize = 6;
    set({ width, length, gridCols: Math.ceil(width / cellSize), gridRows: Math.ceil(length / cellSize), cellSize });
  },

  resizeGrid: (cols, rows) => set(s => {
    let minCols = 1, minRows = 1;
    s.components.forEach(c => {
      const w = c.col + c.gridSize[0];
      const h = c.row + c.gridSize[1];
      if (w > minCols) minCols = w;
      if (h > minRows) minRows = h;
    });
    const newCols = Math.max(minCols, cols);
    const newRows = Math.max(minRows, rows);
    return { gridCols: newCols, gridRows: newRows, width: newCols * s.cellSize, length: newRows * s.cellSize };
  }),

  selectComponent: (id) => set({ selectedComponentId: id }),
  hoverComponent:  (id) => set({ hoveredComponentId: id }),
  setActivePanel:  (p)  => set({ activePanel: p }),

  initScene: () => set({ components: [], connections: [], kpis: [], kpiHistory: [] }),

  addComponent: (type, overrides = {}) => {
    const { selectedDomain, gridCols, gridRows, components } = get();
    const bp = getBlueprint(selectedDomain, type) || { name: type, gridSize: [2, 2], color: '#4865f2' };
    const [w, h] = overrides.gridSize || bp.gridSize;
    const occupied = new Set();
    components.forEach(c => {
      const [cw, ch] = c.gridSize;
      for (let r = c.row; r < c.row + ch; r++)
        for (let cl = c.col; cl < c.col + cw; cl++)
          occupied.add(`${r}-${cl}`);
    });

    if (overrides.row !== undefined && overrides.col !== undefined) {
      const newComp = {
        id: `${type}_${++compIdCounter}`,
        type,
        name: overrides.name || `${bp.name} ${compIdCounter}`,
        gridSize: overrides.gridSize || bp.gridSize,
        color: overrides.color || bp.color,
        col: overrides.col, row: overrides.row,
        kpiIds: [],
        isCustom: overrides.isCustom || false,
        icon: overrides.icon || '',
        description: overrides.description || '',
        mesh3D: overrides.mesh3D || null,
      };
      set(s => ({ components: [...s.components, newComp] }));
      return;
    }

    for (let row = 0; row < gridRows - h + 1; row++) {
      for (let col = 0; col < gridCols - w + 1; col++) {
        let ok = true;
        for (let r = row; r < row + h && ok; r++)
          for (let c = col; c < col + w && ok; c++)
            if (occupied.has(`${r}-${c}`)) ok = false;
        if (ok) {
          const newComp = { id: `${type}_${++compIdCounter}`, type, name: `${bp.name} ${compIdCounter}`, gridSize: bp.gridSize, color: bp.color, col, row, kpiIds: [] };
          set(s => ({ components: [...s.components, newComp] }));
          return;
        }
      }
    }
  },

  removeComponent: (id) => set(s => ({
    components: s.components.filter(c => c.id !== id),
    connections: s.connections.filter(cn => cn.sourceId !== id && cn.targetId !== id),
    selectedComponentId: s.selectedComponentId === id ? null : s.selectedComponentId,
  })),

  removeConnection: (id) => set(s => ({ connections: s.connections.filter(c => c.id !== id) })),

  addConnection: (sourceId, targetId) => set(s => {
    if (sourceId === targetId) return s;
    if (s.connections.some(c => c.sourceId === sourceId && c.targetId === targetId)) return s;
    const newConn = { id: `conn_${Date.now()}_${Math.floor(Math.random()*1000)}`, sourceId, targetId, flowStatus: 'green' };
    return { connections: [...s.connections, newConn] };
  }),

  moveComponent: (id, newCol, newRow) => set(s => {
    const comp = s.components.find(c => c.id === id);
    if (!comp) return s;
    const [w, h] = comp.gridSize;
    const occupied = new Set();
    s.components.forEach(c => {
      if (c.id === id) return;
      const [cw, ch] = c.gridSize;
      for (let r = c.row; r < c.row + ch; r++)
        for (let cl = c.col; cl < c.col + cw; cl++)
          occupied.add(`${r}-${cl}`);
    });
    for (let r = newRow; r < newRow + h; r++)
      for (let c = newCol; c < newCol + w; c++)
        if (occupied.has(`${r}-${c}`)) return s;
    if (newCol < 0 || newRow < 0 || newCol + w > s.gridCols || newRow + h > s.gridRows) return s;
    return { components: s.components.map(c => c.id === id ? { ...c, col: newCol, row: newRow } : c) };
  }),

  rotateComponent: (id) => set(s => {
    const comp = s.components.find(c => c.id === id);
    if (!comp) return s;
    const [w, h] = comp.gridSize;
    const newW = h, newH = w;
    const occupied = new Set();
    s.components.forEach(c => {
      if (c.id === id) return;
      const [cw, ch] = c.gridSize;
      for (let r = c.row; r < c.row + ch; r++)
        for (let cl = c.col; cl < c.col + cw; cl++)
          occupied.add(`${r}-${cl}`);
    });
    for (let r = comp.row; r < comp.row + newH; r++)
      for (let c = comp.col; c < comp.col + newW; c++)
        if (c >= s.gridCols || r >= s.gridRows || occupied.has(`${r}-${c}`)) return s;
    return {
      components: s.components.map(c =>
        c.id === id ? { ...c, gridSize: [newW, newH], rotation: ((c.rotation || 0) + 90) % 360 } : c
      )
    };
  }),

  renameComponent: (id, newName) => set(s => ({
    components: s.components.map(c => c.id === id ? { ...c, name: newName } : c)
  })),

  resizeComponent: (id, newWidth, newHeight) => set(s => {
    const comp = s.components.find(c => c.id === id);
    if (!comp) return s;
    if (newWidth < 1 || newHeight < 1) return s;
    if (comp.col + newWidth > s.gridCols || comp.row + newHeight > s.gridRows) return s;
    const occupied = new Set();
    s.components.forEach(c => {
      if (c.id === id) return;
      const [cw, ch] = c.gridSize;
      for (let r = c.row; r < c.row + ch; r++)
        for (let cl = c.col; cl < c.col + cw; cl++)
          occupied.add(`${r}-${cl}`);
    });
    for (let r = comp.row; r < comp.row + newHeight; r++)
      for (let c = comp.col; c < comp.col + newWidth; c++)
        if (occupied.has(`${r}-${c}`)) return s;
    return { components: s.components.map(c => c.id === id ? { ...c, gridSize: [newWidth, newHeight] } : c) };
  }),

  updateKpiValues: () => set(s => {
    if (s.kpis.length === 0) return s;
    const newKpis = s.kpis.map(kpi => {
      const lo = kpi.rules.green[0];
      const hi = kpi.rules.red?.[1] || kpi.rules.orange?.[1] || 200;
      const newVal = +(kpi.value + (Math.random() - 0.5) * (hi - lo) * 0.04).toFixed(1);
      const clamped = Math.max(lo, Math.min(newVal, hi));
      let status = 'green';
      if (clamped >= (kpi.rules.red?.[0] ?? Infinity)) status = 'red';
      else if (clamped >= (kpi.rules.orange?.[0] ?? Infinity)) status = 'orange';
      return { ...kpi, value: clamped, status };
    });
    const newPoint = { time: new Date().toLocaleTimeString() };
    newKpis.forEach(k => { newPoint[k.id] = k.value; newPoint[k.name] = k.value; });
    return { kpis: newKpis, kpiHistory: [...s.kpiHistory.slice(-59), newPoint] };
  }),

  clearKpis: () => set(s => ({
    kpis: [], kpiHistory: [],
    components: s.components.map(c => ({ ...c, kpiIds: [] })),
  })),

  updateKpiFromWS: (reading) => set(s => {
    const kpiId = `ws_${reading.componentId}_${reading.kpiName}`
      .replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '').toLowerCase();
    const exists = s.kpis.find(k => k.id === kpiId);
    let newKpis, newComponents = s.components;
    if (exists) {
      newKpis = s.kpis.map(k => k.id === kpiId
        ? { ...k, value: reading.value, status: reading.status || 'green', unit: reading.unit || k.unit, interaction: reading.meta?.interaction || k.interaction || 'pulse' }
        : k);
    } else {
      const rules = reading.meta?.rules || {};
      const newKpi = {
        id: kpiId, name: reading.kpiName, value: reading.value,
        unit: reading.unit || '', status: reading.status || 'green',
        source: reading.source || 'realtime', interaction: reading.meta?.interaction || 'pulse',
        rules: { green: rules.green || [0, rules.orange?.[0] || 999], orange: rules.orange || null, red: rules.red || null },
      };
      newKpis = [...s.kpis, newKpi];
      const comp = s.components.find(c => c.id === reading.componentId);
      if (comp && !comp.kpiIds?.includes(kpiId)) {
        newComponents = s.components.map(c =>
          c.id === reading.componentId ? { ...c, kpiIds: [...(c.kpiIds || []), kpiId] } : c
        );
      }
    }
    const newPoint = { time: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
    newKpis.forEach(k => {
      const v = typeof k.value === 'number' ? +k.value.toFixed(2) : k.value;
      newPoint[k.id]   = v;
      newPoint[k.name] = v;  // allow Chart dataKey by name
    });
    // Update connection flow_status if reading contains it
    let newConnections = s.connections;
    if (reading.flowStatus) {
      newConnections = s.connections.map(cn => ({ ...cn, flowStatus: reading.flowStatus }));
    }
    return { kpis: newKpis, kpiHistory: [...s.kpiHistory.slice(-59), newPoint], components: newComponents, connections: newConnections };
  }),

  sendMessage: (text) => {
    const msgId = Date.now();
    set(s => ({ chatMessages: [...s.chatMessages, { id: msgId, role: 'user', text }] }));
    setTimeout(() => {
      const { kpis } = get();
      const criticals = kpis.filter(k => k.status === 'red');
      const warnings  = kpis.filter(k => k.status === 'orange');
      const normals   = kpis.filter(k => k.status === 'green');
      const lower     = text.toLowerCase();
      let response    = `🤖 I can help you analyze your digital twin data. Try asking:\n\n• "What is the system status?"\n• "Are there any critical alerts?"\n• "What actions do you recommend?"`;
      if (lower.includes('status') || lower.includes('overview')) {
        response = `📊 **System Status Overview**\n\n✅ ${normals.length} KPIs normal\n⚠️ ${warnings.length} KPIs warning\n🚨 ${criticals.length} KPIs critical`;
      } else if (lower.includes('critical') || lower.includes('alert')) {
        response = criticals.length === 0
          ? '✅ No critical KPIs. All systems within safe thresholds.'
          : `🚨 **Critical KPIs:**\n\n${criticals.map(k => `• **${k.name}**: ${k.value} ${k.unit}`).join('\n')}`;
      }
      set(s => ({ chatMessages: [...s.chatMessages, { id: msgId + 1, role: 'assistant', text: response }] }));
    }, 700);
  },

  createTwin: () => {
    const { twinName, selectedDomain, width, length, gridCols, gridRows } = get();
    const newTwin = { id: `twin_${Date.now()}`, name: twinName || `${DOMAINS[selectedDomain]?.label} Twin`, domain: selectedDomain, width, length, gridCols, gridRows };
    set(s => ({ twins: [...s.twins, newTwin], activeTwinId: newTwin.id }));
  },

  loadDemo: () => {
    set({ selectedDomain: 'factory', twinName: 'Main Production Floor', width: 60, length: 42, gridCols: 10, gridRows: 7, currentStep: 5 });
    get().initScene();
  },
}));

export default useTwinStore;
