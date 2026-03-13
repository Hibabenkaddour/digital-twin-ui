import { create } from 'zustand';

export const DOMAINS = {
    factory: {
        label: 'Factory', icon: '🏭', color: '#f97316',
        components: [
            { type: 'hydraulic_press', name: 'Hydraulic Press', gridSize: [2, 2], color: '#64748b' },
            { type: 'conveyor_belt', name: 'Conveyor Belt', gridSize: [4, 1], color: '#3b82f6' },
            { type: 'cnc_machine', name: 'CNC Machine', gridSize: [2, 2], color: '#6366f1' },
            { type: 'assembly_station', name: 'Assembly Station', gridSize: [2, 2], color: '#10b981' },
            { type: 'quality_control', name: 'Quality Control', gridSize: [2, 1], color: '#f59e0b' },
            { type: 'warehouse_rack', name: 'Warehouse Rack', gridSize: [3, 1], color: '#8b5cf6' },
        ],
    },
    airport: {
        label: 'Airport', icon: '✈️', color: '#06b6d4',
        components: [
            { type: 'terminal', name: 'Terminal', gridSize: [4, 3], color: '#0ea5e9' },
            { type: 'gate', name: 'Gate', gridSize: [2, 1], color: '#6366f1' },
            { type: 'runway', name: 'Runway', gridSize: [6, 2], color: '#374151' },
            { type: 'checkin_desk', name: 'Check-in Desk', gridSize: [2, 1], color: '#10b981' },
            { type: 'security_zone', name: 'Security Zone', gridSize: [3, 2], color: '#ef4444' },
            { type: 'baggage_claim', name: 'Baggage Claim', gridSize: [3, 2], color: '#f59e0b' },
        ],
    },
    warehouse: {
        label: 'Warehouse', icon: '📦', color: '#84cc16',
        components: [
            { type: 'storage_rack', name: 'Storage Rack', gridSize: [3, 1], color: '#a78bfa' },
            { type: 'picking_zone', name: 'Picking Zone', gridSize: [2, 2], color: '#34d399' },
            { type: 'reception_dock', name: 'Reception Dock', gridSize: [3, 2], color: '#60a5fa' },
            { type: 'shipping_dock', name: 'Shipping Dock', gridSize: [3, 2], color: '#f472b6' },
            { type: 'conveyor', name: 'Conveyor', gridSize: [4, 1], color: '#fbbf24' },
            { type: 'sorter', name: 'Sorter', gridSize: [2, 2], color: '#fb923c' },
        ],
    },
};

const generateKpis = (domain) => {
    const kpiSets = {
        factory: [
            { id: 'kpi_temp', name: 'Machine Temperature', value: 72, unit: '°C', status: 'orange', rules: { green: [0, 60], orange: [60, 85], red: [85, 200] } },
            { id: 'kpi_throughput', name: 'Production Throughput', value: 94, unit: 'u/h', status: 'green', rules: { green: [80, 200], orange: [50, 80], red: [0, 50] } },
            { id: 'kpi_downtime', name: 'Machine Downtime', value: 8, unit: '%', status: 'green', rules: { green: [0, 10], orange: [10, 20], red: [20, 100] } },
            { id: 'kpi_quality', name: 'Quality Rate', value: 96, unit: '%', status: 'green', rules: { green: [90, 100], orange: [70, 90], red: [0, 70] } },
        ],
        airport: [
            { id: 'kpi_pax_flow', name: 'Passenger Flow', value: 1240, unit: 'pax/h', status: 'orange', rules: { green: [0, 1000], orange: [1000, 1500], red: [1500, 5000] } },
            { id: 'kpi_gate_util', name: 'Gate Utilization', value: 78, unit: '%', status: 'green', rules: { green: [60, 100], orange: [30, 60], red: [0, 30] } },
            { id: 'kpi_security_wait', name: 'Security Wait', value: 22, unit: 'min', status: 'orange', rules: { green: [0, 15], orange: [15, 30], red: [30, 120] } },
            { id: 'kpi_baggage_delay', name: 'Baggage Delay', value: 4, unit: 'min', status: 'green', rules: { green: [0, 10], orange: [10, 20], red: [20, 60] } },
        ],
        warehouse: [
            { id: 'kpi_pick_rate', name: 'Pick Rate', value: 340, unit: 'items/h', status: 'green', rules: { green: [300, 600], orange: [200, 300], red: [0, 200] } },
            { id: 'kpi_fill_rate', name: 'Rack Fill Rate', value: 88, unit: '%', status: 'green', rules: { green: [0, 85], orange: [85, 95], red: [95, 100] } },
            { id: 'kpi_dock_util', name: 'Dock Utilization', value: 65, unit: '%', status: 'green', rules: { green: [50, 90], orange: [30, 50], red: [0, 30] } },
            { id: 'kpi_cycle_time', name: 'Order Cycle Time', value: 38, unit: 'min', status: 'orange', rules: { green: [0, 30], orange: [30, 60], red: [60, 240] } },
        ],
    };
    return kpiSets[domain] || kpiSets.factory;
};

const getBlueprint = (domain, type) =>
    DOMAINS[domain]?.components.find(c => c.type === type);

const generateComponents = (domain, gridCols, gridRows) => {
    const blueprints = DOMAINS[domain]?.components || [];
    const placed = [];
    const occupied = new Set();
    let idCounter = 1;

    const canPlace = (col, row, w, h) => {
        for (let r = row; r < row + h; r++)
            for (let c = col; c < col + w; c++)
                if (c >= gridCols || r >= gridRows || occupied.has(`${r}-${c}`)) return false;
        return true;
    };
    const markOccupied = (col, row, w, h) => {
        for (let r = row; r < row + h; r++)
            for (let c = col; c < col + w; c++)
                occupied.add(`${r}-${c}`);
    };

    for (const bp of blueprints) {
        const [w, h] = bp.gridSize;
        for (let row = 1; row < gridRows - h; row++) {
            let found = false;
            for (let col = 1; col < gridCols - w; col++) {
                if (canPlace(col, row, w, h)) {
                    placed.push({ id: `${bp.type}_${idCounter++}`, type: bp.type, name: `${bp.name} ${idCounter - 1}`, gridSize: bp.gridSize, color: bp.color, col, row, kpiIds: [] });
                    markOccupied(col, row, w, h);
                    found = true; break;
                }
            }
            if (found) break;
        }
    }
    return placed;
};

const generateConnections = (components) => {
    const connections = [];
    const statuses = ['green', 'orange', 'green', 'red'];
    for (let i = 0; i < Math.min(components.length - 1, 5); i++) {
        connections.push({ id: `conn_${i}`, sourceId: components[i].id, targetId: components[i + 1].id, flowStatus: statuses[i % 4] });
    }
    return connections;
};

// Generate simulated history for charts
const generateHistory = (kpis) => {
    const now = Date.now();
    const history = [];
    for (let i = 29; i >= 0; i--) {
        const point = { time: new Date(now - i * 10000).toLocaleTimeString() };
        kpis.forEach(kpi => {
            const lo = kpi.rules.green[0];
            const hi = kpi.rules.red?.[1] || kpi.rules.orange?.[1] || 200;
            point[kpi.id] = Math.max(lo, Math.min(hi, kpi.value + (Math.random() - 0.5) * (hi - lo) * 0.15));
        });
        history.push(point);
    }
    return history;
};

const AI_RESPONSES = (kpis, msg) => {
    const lower = msg.toLowerCase();
    const criticals = kpis.filter(k => k.status === 'red');
    const warnings = kpis.filter(k => k.status === 'orange');
    const normals = kpis.filter(k => k.status === 'green');

    if (lower.includes('status') || lower.includes('overview') || lower.includes('rapport') || lower.includes('résumé')) {
        return `📊 **System Status Overview**\n\n✅ ${normals.length} KPIs in normal range\n⚠️ ${warnings.length} KPIs with warnings\n🚨 ${criticals.length} KPIs critical\n\n${criticals.length > 0 ? `**Critical alerts:** ${criticals.map(k => k.name).join(', ')}` : 'No critical alerts at this time.'}`;
    }
    if (lower.includes('critical') || lower.includes('critique') || lower.includes('alert') || lower.includes('alerte')) {
        if (criticals.length === 0) return '✅ No critical KPIs detected. All systems are within safe thresholds.';
        return `🚨 **Critical KPIs Detected:**\n\n${criticals.map(k => `• **${k.name}**: ${k.value} ${k.unit} (threshold: ${k.rules.red?.[0]}+)`).join('\n')}\n\n**Recommendation:** Immediate intervention required for highlighted systems.`;
    }
    if (lower.includes('recommend') || lower.includes('action') || lower.includes('conseil')) {
        const issues = [...criticals, ...warnings];
        if (issues.length === 0) return '✅ All KPIs are healthy. No actions needed. Continue monitoring at current 3s refresh rate.';
        return `💡 **Recommended Actions:**\n\n${issues.map((k, i) => `${i + 1}. **${k.name}** (${k.status.toUpperCase()}): ${k.status === 'red' ? 'Stop and inspect immediately' : 'Schedule maintenance check'
            } — current value ${k.value} ${k.unit}`).join('\n')}`;
    }
    if (lower.includes('trend') || lower.includes('tendance') || lower.includes('evolution')) {
        return `📈 **KPI Trends (last 5 minutes):**\n\n${kpis.map(k => `• **${k.name}**: ${k.value} ${k.unit} — ${k.status === 'green' ? '↔ Stable' : k.status === 'orange' ? '↗ Rising' : '↑ Critical rise'}`).join('\n')}\n\nRefresh rate: every 3 seconds.`;
    }
    if (lower.includes('best') || lower.includes('worst') || lower.includes('performance')) {
        const best = normals[0];
        const worst = criticals[0] || warnings[0];
        return `🏆 **Performance Summary:**\n\n${best ? `**Best performing:** ${best.name} at ${best.value} ${best.unit} ✅` : ''}\n${worst ? `\n**Needs attention:** ${worst.name} at ${worst.value} ${worst.unit} ${worst.status === 'red' ? '🚨' : '⚠️'}` : ''}`;
    }
    // Default
    return `🤖 I can help you analyze your digital twin data. Try asking:\n\n• "What is the system status?"\n• "Are there any critical alerts?"\n• "What actions do you recommend?"\n• "Show me KPI trends"\n• "What is the best/worst performing KPI?"`;
};

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
    sidebarOpen: true,
    activeView: 'isometric',
    activePanel: 'kpi',  // 'kpi' | 'charts' | 'chat'

    chatMessages: [
        { id: 0, role: 'assistant', text: '👋 Hello! I\'m your Digital Twin AI assistant. Ask me anything about your KPIs, alerts, or system performance.' }
    ],

    setStep: (step) => set({ currentStep: step }),
    setDomain: (domain) => set({ selectedDomain: domain }),
    setTwinName: (name) => set({ twinName: name }),
    setDimensions: (width, length) => {
        const cellSize = 6;
        set({ width, length, gridCols: Math.ceil(width / cellSize), gridRows: Math.ceil(length / cellSize), cellSize });
    },
    selectComponent: (id) => set({ selectedComponentId: id }),
    hoverComponent: (id) => set({ hoveredComponentId: id }),
    toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
    setView: (v) => set({ activeView: v }),
    setActivePanel: (p) => set({ activePanel: p }),

    initScene: () => {
        const { selectedDomain, gridCols, gridRows } = get();
        const components = generateComponents(selectedDomain, gridCols, gridRows);
        const kpis = generateKpis(selectedDomain);
        components.forEach((c, i) => { c.kpiIds = [kpis[i % kpis.length]?.id].filter(Boolean); });
        const kpiHistory = generateHistory(kpis);
        set({ components, connections: generateConnections(components), kpis, kpiHistory });
    },

    addComponent: (type, overrides = {}) => {
        const { selectedDomain, gridCols, gridRows, components } = get();
        const bp = getBlueprint(selectedDomain, type) || { name: type, gridSize: [2, 2], color: '#6395ff' };
        const [w, h] = overrides.gridSize || bp.gridSize;
        const occupied = new Set();
        components.forEach(c => {
            const [cw, ch] = c.gridSize;
            for (let r = c.row; r < c.row + ch; r++)
                for (let cl = c.col; cl < c.col + cw; cl++)
                    occupied.add(`${r}-${cl}`);
        });

        // If explicit position provided (from AI agent), use it
        if (overrides.row !== undefined && overrides.col !== undefined) {
            const newComp = {
                id: `${type}_${++compIdCounter}`,
                type,
                name: overrides.name || `${bp.name} ${compIdCounter}`,
                gridSize: overrides.gridSize || bp.gridSize,
                color: overrides.color || bp.color,
                col: overrides.col,
                row: overrides.row,
                kpiIds: [],
            };
            set(s => ({ components: [...s.components, newComp] }));
            return;
        }

        // Auto-place: find first free cell
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

    removeComponent: (id) => {
        set(s => ({
            components: s.components.filter(c => c.id !== id),
            connections: s.connections.filter(cn => cn.sourceId !== id && cn.targetId !== id),
            selectedComponentId: s.selectedComponentId === id ? null : s.selectedComponentId,
        }));
    },

    moveComponent: (id, newCol, newRow) => {
        set(s => {
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
        });
    },

    updateKpiValues: () => {
        set(s => {
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
            newKpis.forEach(k => { newPoint[k.id] = k.value; });
            const newHistory = [...s.kpiHistory.slice(-49), newPoint];
            return { kpis: newKpis, kpiHistory: newHistory };
        });
    },

    sendMessage: (text) => {
        const msgId = Date.now();
        set(s => ({ chatMessages: [...s.chatMessages, { id: msgId, role: 'user', text }] }));
        setTimeout(() => {
            const { kpis } = get();
            const response = AI_RESPONSES(kpis, text);
            set(s => ({ chatMessages: [...s.chatMessages, { id: msgId + 1, role: 'assistant', text: response }] }));
        }, 700);
    },

    createTwin: () => {
        const { twinName, selectedDomain, width, length, gridCols, gridRows } = get();
        const newTwin = { id: `twin_${Date.now()}`, name: twinName || `${DOMAINS[selectedDomain]?.label} Twin`, domain: selectedDomain, width, length, gridCols, gridRows, modified: new Date().toISOString() };
        set(s => ({ twins: [...s.twins, newTwin], activeTwinId: newTwin.id }));
    },

    loadDemo: () => {
        set({ selectedDomain: 'factory', twinName: 'Main Production Floor', width: 60, length: 42, gridCols: 10, gridRows: 7, currentStep: 5 });
        get().initScene();
    },

    getDomains: () => DOMAINS,
}));

export default useTwinStore;
