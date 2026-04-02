import { create } from 'zustand';

// ─── Legacy DOMAINS (for demo/analytics flow) ────────────────────────────────
export const DOMAINS = {
    factory: {
        label: 'Factory', icon: '🏭', color: '#f97316',
        components: [
            { type: 'hydraulic_press', name: 'Hydraulic Press', gridSize: [2, 2], color: '#64748b' },
            { type: 'conveyor_belt', name: 'Conveyor Belt', gridSize: [4, 1], color: '#3b82f6' },
            { type: 'cnc_machine', name: 'CNC Machine', gridSize: [2, 2], color: '#6366f1' },
            { type: 'assembly_station', name: 'Assembly Station', gridSize: [2, 2], color: '#10b981' },
            { type: 'quality_control', name: 'Quality Control', gridSize: [2, 1], color: '#f59e0b' },
            { type: 'warehouse_rack', name: 'Warehouse Rack', gridSize: [3, 1], color: '#f4723e' },
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

// ─── Section colors palette ───────────────────────────────────────────────────
export const SECTION_COLORS = [
    '#4865f2', '#f4723e', '#10b981', '#f59e0b', '#a855f7',
    '#0ea5e9', '#ec4899', '#84cc16', '#22d3ee', '#fb923c',
    '#e11d48', '#0d9488', '#7c3aed', '#d97706',
];

// ─── Office/Enterprise component catalog ─────────────────────────────────────
export const COMPONENT_CATEGORIES = ['All', 'Furniture', 'Kitchen', 'Tech', 'Spaces'];

export const OFFICE_COMPONENTS = [
    // Furniture
    { type: 'desk', name: 'Desk', category: 'Furniture', gridSize: [2, 1], color: '#7c3aed', icon: '🖥️', description: 'Work desk' },
    { type: 'chair', name: 'Chair', category: 'Furniture', gridSize: [1, 1], color: '#a78bfa', icon: '🪑', description: 'Office chair' },
    { type: 'sofa', name: 'Sofa', category: 'Furniture', gridSize: [3, 1], color: '#ec4899', icon: '🛋️', description: 'Lounge sofa' },
    { type: 'meeting_table', name: 'Meeting Table', category: 'Furniture', gridSize: [4, 2], color: '#f59e0b', icon: '📋', description: 'Conference table' },
    { type: 'standing_desk', name: 'Standing Desk', category: 'Furniture', gridSize: [2, 1], color: '#10b981', icon: '⬆️', description: 'Height-adjustable desk' },
    { type: 'bookshelf', name: 'Bookshelf', category: 'Furniture', gridSize: [3, 1], color: '#92400e', icon: '📚', description: 'Bookshelf' },
    { type: 'locker', name: 'Locker', category: 'Furniture', gridSize: [1, 1], color: '#374151', icon: '🔒', description: 'Personal locker' },
    { type: 'lounge_chair', name: 'Lounge Chair', category: 'Furniture', gridSize: [1, 1], color: '#db2777', icon: '🪑', description: 'Lounge armchair' },
    { type: 'filing_cabinet', name: 'Filing Cabinet', category: 'Furniture', gridSize: [1, 1], color: '#64748b', icon: '🗄️', description: 'Document cabinet' },
    { type: 'whiteboard', name: 'Whiteboard', category: 'Furniture', gridSize: [3, 1], color: '#e2e8f0', icon: '📝', description: 'Whiteboard' },
    // Kitchen
    { type: 'coffee_machine', name: 'Coffee Machine', category: 'Kitchen', gridSize: [1, 1], color: '#f97316', icon: '☕', description: 'Coffee machine' },
    { type: 'kitchen_counter', name: 'Kitchen Counter', category: 'Kitchen', gridSize: [4, 1], color: '#6b7280', icon: '🍽️', description: 'Prep counter' },
    { type: 'fridge', name: 'Fridge', category: 'Kitchen', gridSize: [1, 1], color: '#0ea5e9', icon: '❄️', description: 'Refrigerator' },
    { type: 'dining_table', name: 'Dining Table', category: 'Kitchen', gridSize: [3, 2], color: '#a78bfa', icon: '🍽️', description: 'Dining table' },
    { type: 'microwave', name: 'Microwave', category: 'Kitchen', gridSize: [1, 1], color: '#475569', icon: '📡', description: 'Microwave' },
    { type: 'water_cooler', name: 'Water Cooler', category: 'Kitchen', gridSize: [1, 1], color: '#22d3ee', icon: '💧', description: 'Water dispenser' },
    { type: 'vending_machine', name: 'Vending Machine', category: 'Kitchen', gridSize: [1, 2], color: '#dc2626', icon: '🏧', description: 'Vending machine' },
    { type: 'sink', name: 'Sink', category: 'Kitchen', gridSize: [1, 1], color: '#60a5fa', icon: '🚰', description: 'Kitchen sink' },
    // Tech
    { type: 'server_rack', name: 'Server Rack', category: 'Tech', gridSize: [1, 2], color: '#22d3ee', icon: '🗄️', description: '42U server rack' },
    { type: 'printer', name: 'Printer', category: 'Tech', gridSize: [1, 1], color: '#94a3b8', icon: '🖨️', description: 'Printer' },
    { type: 'monitor_wall', name: 'Monitor Wall', category: 'Tech', gridSize: [3, 1], color: '#3b82f6', icon: '📺', description: 'Monitor dashboard wall' },
    { type: 'network_cabinet', name: 'Network Cabinet', category: 'Tech', gridSize: [1, 1], color: '#6366f1', icon: '🌐', description: 'Network cabinet' },
    { type: 'workstation', name: 'Workstation', category: 'Tech', gridSize: [2, 2], color: '#7c3aed', icon: '💻', description: 'Workstation cluster' },
    { type: 'smart_display', name: 'Smart Display', category: 'Tech', gridSize: [2, 1], color: '#0891b2', icon: '🖥️', description: 'Room screen' },
    { type: 'ups', name: 'UPS System', category: 'Tech', gridSize: [1, 1], color: '#eab308', icon: '🔋', description: 'UPS power' },
    { type: 'cctv', name: 'CCTV Station', category: 'Tech', gridSize: [1, 1], color: '#374151', icon: '📷', description: 'Security camera' },
    // Spaces
    { type: 'reception_desk', name: 'Reception', category: 'Spaces', gridSize: [3, 2], color: '#f4723e', icon: '🏢', description: 'Reception desk' },
    { type: 'phone_booth', name: 'Phone Booth', category: 'Spaces', gridSize: [1, 2], color: '#a855f7', icon: '📞', description: 'Call booth' },
    { type: 'storage_closet', name: 'Storage Room', category: 'Spaces', gridSize: [2, 2], color: '#78716c', icon: '📦', description: 'Storage room' },
    { type: 'restroom', name: 'Restroom', category: 'Spaces', gridSize: [3, 3], color: '#06b6d4', icon: '🚻', description: 'Restroom' },
    { type: 'elevator', name: 'Elevator', category: 'Spaces', gridSize: [2, 2], color: '#6b7280', icon: '🔼', description: 'Elevator' },
    { type: 'stairs', name: 'Stairs', category: 'Spaces', gridSize: [2, 3], color: '#334155', icon: '🪜', description: 'Stairwell' },
    { type: 'glass_partition', name: 'Glass Partition', category: 'Spaces', gridSize: [4, 1], color: '#bae6fd', icon: '🔲', description: 'Glass wall' },
    { type: 'plant', name: 'Indoor Plant', category: 'Spaces', gridSize: [1, 1], color: '#4ade80', icon: '🌱', description: 'Indoor plant' },
    { type: 'projector_screen', name: 'Projector Screen', category: 'Spaces', gridSize: [3, 1], color: '#f1f5f9', icon: '🎬', description: 'Projector screen' },
    { type: 'fire_exit', name: 'Fire Exit', category: 'Spaces', gridSize: [1, 1], color: '#ef4444', icon: '🚪', description: 'Emergency exit' },
];

export const getOfficeBlueprint = (type) => OFFICE_COMPONENTS.find(c => c.type === type);

// ─── Legacy helpers ───────────────────────────────────────────────────────────
const AI_RESPONSES = (kpis, msg) => {
    const lower = msg.toLowerCase();
    const criticals = kpis.filter(k => k.status === 'red');
    const warnings = kpis.filter(k => k.status === 'orange');
    const normals = kpis.filter(k => k.status === 'green');
    if (lower.includes('status') || lower.includes('overview')) {
        return `📊 **System Status**\n\n✅ ${normals.length} OK · ⚠️ ${warnings.length} Warnings · 🚨 ${criticals.length} Critical\n\n${criticals.length > 0 ? `**Critical:** ${criticals.map(k => k.name).join(', ')}` : 'No critical alerts.'}`;
    }
    if (lower.includes('critical') || lower.includes('alert')) {
        if (!criticals.length) return '✅ No critical KPIs detected.';
        return `🚨 **Critical KPIs:**\n\n${criticals.map(k => `• **${k.name}**: ${k.value} ${k.unit}`).join('\n')}\n\n**Action:** Immediate intervention required.`;
    }
    if (lower.includes('recommend') || lower.includes('action')) {
        const issues = [...criticals, ...warnings];
        if (!issues.length) return '✅ All KPIs healthy. No actions needed.';
        return `💡 **Actions:**\n\n${issues.map((k, i) => `${i + 1}. **${k.name}** (${k.status.toUpperCase()}): ${k.status === 'red' ? 'Stop & inspect' : 'Schedule check'} — ${k.value} ${k.unit}`).join('\n')}`;
    }
    return `🤖 Ask me:\n• "What is the status?"\n• "Any critical alerts?"\n• "Recommend actions"\n• "Show trends"`;
};

let compIdCounter = 100;
let floorCompCounter = 1;

// ─── Store ────────────────────────────────────────────────────────────────────
const useTwinStore = create((set, get) => ({

    // ── Legacy twin wizard state (kept for demo/analytics) ─────────────────
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
    activePanel: 'kpi',
    chatMessages: [
        { id: 0, role: 'assistant', text: '👋 Hello! I\'m your Analytics AI.\n\nConnect your data source first, then ask me anything about your KPIs.' }
    ],

    // ── Project system state ───────────────────────────────────────────────
    projects: [],           // [{id, name, type, color, siteWidth, siteLength, _buildings, modifiedAt, createdAt}]
    activeProjectId: null,
    activeBuildingId: null,
    activeFloorId: null,
    activeSectionId: null,

    // buildings is a derived/convenience flat list from the active project
    buildings: [],          // [{id, name, width, length, color, x, y, floors}]
    floorComponents: [],    // components on the active floor

    // ─────────────────────────────────────────────────────────────────────────
    // ── Legacy twin actions ───────────────────────────────────────────────
    setStep: (step) => set(s => ({ currentStep: step, selectedComponentId: s.currentStep !== step ? null : s.selectedComponentId })),
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
    initScene: () => set({ components: [], connections: [], kpis: [], kpiHistory: [] }),

    addComponent: (type, overrides = {}) => {
        const { selectedDomain, gridCols, gridRows, components } = get();
        const bp = DOMAINS[selectedDomain]?.components.find(c => c.type === type) || { name: type, gridSize: [2, 2], color: '#4865f2' };
        const [w, h] = overrides.gridSize || bp.gridSize;
        const occupied = new Set();
        components.forEach(c => {
            const [cw, ch] = c.gridSize;
            for (let r = c.row; r < c.row + ch; r++) for (let cl = c.col; cl < c.col + cw; cl++) occupied.add(`${r}-${cl}`);
        });
        if (overrides.row !== undefined && overrides.col !== undefined) {
            const newComp = { id: `${type}_${++compIdCounter}`, type, name: overrides.name || `${bp.name} ${compIdCounter}`, gridSize: overrides.gridSize || bp.gridSize, color: overrides.color || bp.color, col: overrides.col, row: overrides.row, kpiIds: [], isCustom: overrides.isCustom || false, icon: overrides.icon || '', description: overrides.description || '', mesh3D: overrides.mesh3D || null };
            set(s => ({ components: [...s.components, newComp] }));
            return;
        }
        for (let row = 0; row < gridRows - h + 1; row++) {
            for (let col = 0; col < gridCols - w + 1; col++) {
                let ok = true;
                for (let r = row; r < row + h && ok; r++) for (let c = col; c < col + w && ok; c++) if (occupied.has(`${r}-${c}`)) ok = false;
                if (ok) { set(s => ({ components: [...s.components, { id: `${type}_${++compIdCounter}`, type, name: `${bp.name} ${compIdCounter}`, gridSize: bp.gridSize, color: bp.color, col, row, kpiIds: [] }] })); return; }
            }
        }
    },
    removeComponent: (id) => set(s => ({ components: s.components.filter(c => c.id !== id), connections: s.connections.filter(cn => cn.sourceId !== id && cn.targetId !== id), selectedComponentId: s.selectedComponentId === id ? null : s.selectedComponentId })),
    removeConnection: (id) => set(s => ({ connections: s.connections.filter(c => c.id !== id) })),
    addConnection: (sourceId, targetId) => set(s => {
        if (sourceId === targetId || s.connections.some(c => c.sourceId === sourceId && c.targetId === targetId)) return s;
        return { connections: [...s.connections, { id: `conn_${Date.now()}`, sourceId, targetId, flowStatus: 'green' }] };
    }),
    moveComponent: (id, newCol, newRow) => set(s => {
        const comp = s.components.find(c => c.id === id); if (!comp) return s;
        const [w, h] = comp.gridSize; const occupied = new Set();
        s.components.forEach(c => { if (c.id === id) return; const [cw, ch] = c.gridSize; for (let r = c.row; r < c.row + ch; r++) for (let cl = c.col; cl < c.col + cw; cl++) occupied.add(`${r}-${cl}`); });
        for (let r = newRow; r < newRow + h; r++) for (let c = newCol; c < newCol + w; c++) if (occupied.has(`${r}-${c}`)) return s;
        if (newCol < 0 || newRow < 0 || newCol + w > s.gridCols || newRow + h > s.gridRows) return s;
        return { components: s.components.map(c => c.id === id ? { ...c, col: newCol, row: newRow } : c) };
    }),
    rotateComponent: (id) => set(s => {
        const comp = s.components.find(c => c.id === id); if (!comp) return s;
        const [w, h] = comp.gridSize; const occupied = new Set();
        s.components.forEach(c => { if (c.id === id) return; const [cw, ch] = c.gridSize; for (let r = c.row; r < c.row + ch; r++) for (let cl = c.col; cl < c.col + cw; cl++) occupied.add(`${r}-${cl}`); });
        for (let r = comp.row; r < comp.row + w; r++) for (let c = comp.col; c < comp.col + h; c++) if (c >= s.gridCols || r >= s.gridRows || occupied.has(`${r}-${c}`)) return s;
        return { components: s.components.map(c => c.id === id ? { ...c, gridSize: [h, w], rotation: ((c.rotation || 0) + 90) % 360 } : c) };
    }),
    updateKpiValues: () => set(s => {
        const newKpis = s.kpis.map(kpi => {
            const lo = kpi.rules.green[0]; const hi = kpi.rules.red?.[1] || kpi.rules.orange?.[1] || 200;
            const v = +(kpi.value + (Math.random() - 0.5) * (hi - lo) * 0.04).toFixed(1);
            const clamped = Math.max(lo, Math.min(v, hi));
            let status = 'green';
            if (clamped >= (kpi.rules.red?.[0] ?? Infinity)) status = 'red';
            else if (clamped >= (kpi.rules.orange?.[0] ?? Infinity)) status = 'orange';
            return { ...kpi, value: clamped, status };
        });
        const pt = { time: new Date().toLocaleTimeString() }; newKpis.forEach(k => { pt[k.id] = k.value; });
        return { kpis: newKpis, kpiHistory: [...s.kpiHistory.slice(-49), pt] };
    }),
    clearKpis: () => set(s => ({ kpis: [], kpiHistory: [], components: s.components.map(c => ({ ...c, kpiIds: [] })) })),
    updateKpiFromWS: (reading) => set(s => {
        const kpiId = `ws_${reading.componentId}_${reading.kpiName}`.replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '').toLowerCase();
        const exists = s.kpis.find(k => k.id === kpiId);
        let newKpis, newComponents = s.components;
        if (exists) {
            newKpis = s.kpis.map(k => k.id === kpiId ? { ...k, value: reading.value, status: reading.status || 'green', unit: reading.unit || k.unit } : k);
        } else {
            const rules = reading.meta?.rules || {};
            newKpis = [...s.kpis, { id: kpiId, name: reading.kpiName, value: reading.value, unit: reading.unit || '', status: reading.status || 'green', rules: { green: rules.green || [0, 999], orange: rules.orange || null, red: rules.red || null } }];
            const comp = s.components.find(c => c.id === reading.componentId);
            if (comp && !comp.kpiIds?.includes(kpiId)) newComponents = s.components.map(c => c.id === reading.componentId ? { ...c, kpiIds: [...(c.kpiIds || []), kpiId] } : c);
        }
        const pt = { time: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
        newKpis.forEach(k => { pt[k.id] = typeof k.value === 'number' ? +k.value.toFixed(2) : k.value; });
        return { kpis: newKpis, kpiHistory: [...s.kpiHistory.slice(-59), pt], components: newComponents };
    }),
    sendMessage: (text) => {
        const msgId = Date.now();
        set(s => ({ chatMessages: [...s.chatMessages, { id: msgId, role: 'user', text }] }));
        setTimeout(() => { const { kpis } = get(); set(s => ({ chatMessages: [...s.chatMessages, { id: msgId + 1, role: 'assistant', text: AI_RESPONSES(kpis, text) }] })); }, 700);
    },
    createTwin: () => {
        const { twinName, selectedDomain, width, length, gridCols, gridRows } = get();
        const t = { id: `twin_${Date.now()}`, name: twinName || `${DOMAINS[selectedDomain]?.label} Twin`, domain: selectedDomain, width, length, gridCols, gridRows, modified: new Date().toISOString() };
        set(s => ({ twins: [...s.twins, t], activeTwinId: t.id }));
    },
    loadDemo: () => {
        set({ selectedDomain: 'factory', twinName: 'Main Production Floor', width: 60, length: 42, gridCols: 10, gridRows: 7, currentStep: 5 });
        get().initScene();
    },
    getDomains: () => DOMAINS,

    // ─────────────────────────────────────────────────────────────────────────
    // ── Project CRUD ──────────────────────────────────────────────────────
    createProject: ({ name, type = 'custom', color = '#4865f2', siteWidth = 200, siteLength = 150 }) => {
        const project = {
            id: `proj_${Date.now()}`,
            name, type, color, siteWidth, siteLength,
            _buildings: [],
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
        };
        set(s => ({ projects: [...s.projects, project] }));
        return project.id;
    },

    deleteProject: (id) => set(s => ({
        projects: s.projects.filter(p => p.id !== id),
        activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
        buildings: s.activeProjectId === id ? [] : s.buildings,
    })),

    setActiveProject: (id) => {
        const project = get().projects.find(p => p.id === id);
        set({
            activeProjectId: id,
            buildings: project?._buildings || [],
            activeBuildingId: null,
            activeFloorId: null,
            activeSectionId: null,
        });
    },

    getActiveProject: () => {
        const { projects, activeProjectId } = get();
        return projects.find(p => p.id === activeProjectId) || null;
    },

    // ── Building CRUD (operates on active project) ────────────────────────
    addBuilding: ({ name, width, length, color, x = 2, y = 2 }) => {
        const { activeProjectId, buildings } = get();
        if (!activeProjectId) return null;
        const building = {
            id: `bld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name, width, length, color, x, y,
            floors: [],
        };
        const newBuildings = [...buildings, building];
        set(s => ({
            buildings: newBuildings,
            projects: s.projects.map(p => p.id !== activeProjectId ? p : { ...p, _buildings: newBuildings, modifiedAt: new Date().toISOString() }),
        }));
        return building.id;
    },

    removeBuilding: (id) => {
        const { activeProjectId } = get();
        set(s => {
            const newBuildings = s.buildings.filter(b => b.id !== id);
            return {
                buildings: newBuildings,
                activeBuildingId: s.activeBuildingId === id ? null : s.activeBuildingId,
                projects: s.projects.map(p => p.id !== activeProjectId ? p : { ...p, _buildings: newBuildings, modifiedAt: new Date().toISOString() }),
            };
        });
    },

    setActiveBuilding: (id) => {
        const { buildings } = get();
        const building = buildings.find(b => b.id === id);
        const floors = building?.floors || [];
        const firstFloor = floors[0] || null;
        set({
            activeBuildingId: id,
            activeFloorId: firstFloor?.id || null,
            activeSectionId: null,
            floorComponents: firstFloor?.components || [],
        });
    },

    getActiveBuilding: () => {
        const { buildings, activeBuildingId } = get();
        return buildings.find(b => b.id === activeBuildingId) || null;
    },

    moveBuildingOnSite: (buildingId, x, y) => {
        const { activeProjectId } = get();
        set(s => {
            const newBuildings = s.buildings.map(b => b.id !== buildingId ? b : { ...b, x, y });
            return {
                buildings: newBuildings,
                projects: s.projects.map(p => p.id !== activeProjectId ? p : { ...p, _buildings: newBuildings }),
            };
        });
    },

    // ── Floor CRUD ────────────────────────────────────────────────────────
    addFloor: (name) => {
        const { activeBuildingId, activeProjectId, buildings } = get();
        if (!activeBuildingId) return;
        const building = buildings.find(b => b.id === activeBuildingId);
        const floorNumber = (building?.floors?.length || 0) + 1;
        const floor = {
            id: `fl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: name || `Floor ${floorNumber}`,
            floorNumber,
            width: building?.width || 20,
            length: building?.length || 15,
            sections: [],
            components: [],
        };
        const newBuildings = buildings.map(b => b.id !== activeBuildingId ? b : { ...b, floors: [...(b.floors || []), floor] });
        const newActiveFloorId = get().activeFloorId || floor.id;
        set(s => ({
            buildings: newBuildings,
            activeFloorId: newActiveFloorId,
            projects: s.projects.map(p => p.id !== activeProjectId ? p : { ...p, _buildings: newBuildings, modifiedAt: new Date().toISOString() }),
        }));
        return floor.id;
    },

    removeFloor: (floorId) => {
        const { activeBuildingId, activeProjectId, buildings } = get();
        const newBuildings = buildings.map(b => b.id !== activeBuildingId ? b : { ...b, floors: (b.floors || []).filter(f => f.id !== floorId) });
        set(s => ({
            buildings: newBuildings,
            activeFloorId: s.activeFloorId === floorId ? null : s.activeFloorId,
            projects: s.projects.map(p => p.id !== activeProjectId ? p : { ...p, _buildings: newBuildings, modifiedAt: new Date().toISOString() }),
        }));
    },

    renameFloor: (floorId, name) => {
        const { activeBuildingId, activeProjectId, buildings } = get();
        const newBuildings = buildings.map(b => b.id !== activeBuildingId ? b : {
            ...b, floors: (b.floors || []).map(f => f.id !== floorId ? f : { ...f, name })
        });
        set(s => ({
            buildings: newBuildings,
            projects: s.projects.map(p => p.id !== activeProjectId ? p : { ...p, _buildings: newBuildings, modifiedAt: new Date().toISOString() }),
        }));
    },

    setActiveFloor: (floorId) => {
        const { buildings, activeBuildingId } = get();
        const building = buildings.find(b => b.id === activeBuildingId);
        const floor = building?.floors?.find(f => f.id === floorId);
        set({ activeFloorId: floorId, activeSectionId: null, floorComponents: floor?.components || [] });
    },

    getActiveFloor: () => {
        const { buildings, activeBuildingId, activeFloorId } = get();
        const building = buildings.find(b => b.id === activeBuildingId);
        return building?.floors?.find(f => f.id === activeFloorId) || null;
    },

    // ── Section CRUD ──────────────────────────────────────────────────────
    addSection: (name, color) => {
        const { activeBuildingId, activeFloorId, activeProjectId, buildings } = get();
        if (!activeFloorId) return null;
        const building = buildings.find(b => b.id === activeBuildingId);
        const floor = building?.floors?.find(f => f.id === activeFloorId);
        const existingSections = floor?.sections || [];
        const section = {
            id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: name || 'New Section',
            color: color || SECTION_COLORS[existingSections.length % SECTION_COLORS.length],
            gridX: 0, gridY: 0,
            gridW: Math.floor((floor?.width || 10) / 2),
            gridH: Math.floor((floor?.length || 8) / 2),
        };
        const newBuildings = buildings.map(b => b.id !== activeBuildingId ? b : {
            ...b, floors: (b.floors || []).map(f => f.id !== activeFloorId ? f : { ...f, sections: [...(f.sections || []), section] })
        });
        set(s => ({
            buildings: newBuildings,
            projects: s.projects.map(p => p.id !== activeProjectId ? p : { ...p, _buildings: newBuildings, modifiedAt: new Date().toISOString() }),
        }));
        return section.id;
    },

    removeSection: (sectionId) => {
        const { activeBuildingId, activeFloorId, activeProjectId, buildings } = get();
        const newBuildings = buildings.map(b => b.id !== activeBuildingId ? b : {
            ...b, floors: (b.floors || []).map(f => f.id !== activeFloorId ? f : { ...f, sections: (f.sections || []).filter(s => s.id !== sectionId) })
        });
        set(s => ({
            buildings: newBuildings,
            activeSectionId: s.activeSectionId === sectionId ? null : s.activeSectionId,
            projects: s.projects.map(p => p.id !== activeProjectId ? p : { ...p, _buildings: newBuildings, modifiedAt: new Date().toISOString() }),
        }));
    },

    renameSection: (sectionId, name) => {
        const { activeBuildingId, activeFloorId, activeProjectId, buildings } = get();
        const newBuildings = buildings.map(b => b.id !== activeBuildingId ? b : {
            ...b, floors: (b.floors || []).map(f => f.id !== activeFloorId ? f : {
                ...f, sections: (f.sections || []).map(s => s.id !== sectionId ? s : { ...s, name })
            })
        });
        set(s => ({
            buildings: newBuildings,
            projects: s.projects.map(p => p.id !== activeProjectId ? p : { ...p, _buildings: newBuildings }),
        }));
    },

    setActiveSection: (id) => set({ activeSectionId: id }),

    // ── Floor Component CRUD ──────────────────────────────────────────────
    addFloorComponent: (type, opts = {}) => {
        const { activeBuildingId, activeFloorId, activeProjectId, buildings } = get();
        if (!activeFloorId) return null;
        const bp = getOfficeBlueprint(type) || { name: type, gridSize: [1, 1], color: '#4865f2', icon: '⬛', category: 'Spaces' };
        const comp = {
            id: `fc_${Date.now()}_${++floorCompCounter}`,
            type, name: bp.name, category: bp.category,
            gridSize: [...bp.gridSize], color: bp.color, icon: bp.icon || '',
            col: 0, row: 0, rotation: 0,
            sectionId: opts.sectionId || null,
            kpiIds: [],
        };
        const floor = buildings.find(b => b.id === activeBuildingId)?.floors?.find(f => f.id === activeFloorId);
        // Auto-place: find first free cell
        const occupied = new Set();
        (floor?.components || []).forEach(c => {
            const [cw, ch] = c.gridSize;
            for (let r = c.row; r < c.row + ch; r++) for (let cl = c.col; cl < c.col + cw; cl++) occupied.add(`${r}-${cl}`);
        });
        const fw = floor?.width || 20; const fh = floor?.length || 15;
        const [w, h] = bp.gridSize;
        outer: for (let row = 0; row < fh - h + 1; row++) {
            for (let col = 0; col < fw - w + 1; col++) {
                let ok = true;
                for (let r = row; r < row + h && ok; r++) for (let c = col; c < col + w && ok; c++) if (occupied.has(`${r}-${c}`)) ok = false;
                if (ok) { comp.col = col; comp.row = row; break outer; }
            }
        }
        const newBuildings = buildings.map(b => b.id !== activeBuildingId ? b : {
            ...b, floors: (b.floors || []).map(f => f.id !== activeFloorId ? f : { ...f, components: [...(f.components || []), comp] })
        });
        set(s => ({
            buildings: newBuildings,
            floorComponents: [...s.floorComponents, comp],
            projects: s.projects.map(p => p.id !== activeProjectId ? p : { ...p, _buildings: newBuildings, modifiedAt: new Date().toISOString() }),
        }));
        return comp.id;
    },

    removeFloorComponent: (compId) => {
        const { activeBuildingId, activeFloorId, activeProjectId, buildings } = get();
        const newBuildings = buildings.map(b => b.id !== activeBuildingId ? b : {
            ...b, floors: (b.floors || []).map(f => f.id !== activeFloorId ? f : { ...f, components: (f.components || []).filter(c => c.id !== compId) })
        });
        set(s => ({
            buildings: newBuildings,
            floorComponents: s.floorComponents.filter(c => c.id !== compId),
            selectedComponentId: s.selectedComponentId === compId ? null : s.selectedComponentId,
            projects: s.projects.map(p => p.id !== activeProjectId ? p : { ...p, _buildings: newBuildings, modifiedAt: new Date().toISOString() }),
        }));
    },

    moveFloorComponent: (compId, col, row) => {
        const { activeBuildingId, activeFloorId, activeProjectId, buildings } = get();
        const newBuildings = buildings.map(b => b.id !== activeBuildingId ? b : {
            ...b, floors: (b.floors || []).map(f => f.id !== activeFloorId ? f : {
                ...f, components: (f.components || []).map(c => c.id !== compId ? c : { ...c, col, row })
            })
        });
        set(s => ({
            buildings: newBuildings,
            floorComponents: s.floorComponents.map(c => c.id !== compId ? c : { ...c, col, row }),
        }));
    },

    rotateFloorComponent: (compId) => {
        const { activeBuildingId, activeFloorId, activeProjectId, buildings } = get();
        const newBuildings = buildings.map(b => b.id !== activeBuildingId ? b : {
            ...b, floors: (b.floors || []).map(f => f.id !== activeFloorId ? f : {
                ...f, components: (f.components || []).map(c => {
                    if (c.id !== compId) return c;
                    const [w, h] = c.gridSize;
                    return { ...c, gridSize: [h, w], rotation: ((c.rotation || 0) + 90) % 360 };
                })
            })
        });
        set(s => ({
            buildings: newBuildings,
            floorComponents: s.floorComponents.map(c => {
                if (c.id !== compId) return c;
                const [w, h] = c.gridSize;
                return { ...c, gridSize: [h, w], rotation: ((c.rotation || 0) + 90) % 360 };
            }),
            projects: s.projects.map(p => p.id !== activeProjectId ? p : { ...p, _buildings: newBuildings }),
        }));
    },

    moveSectionOnFloor: (sectionId, gridX, gridY) => {
        const { activeBuildingId, activeFloorId, activeProjectId, buildings } = get();
        const newBuildings = buildings.map(b => b.id !== activeBuildingId ? b : {
            ...b, floors: (b.floors || []).map(f => f.id !== activeFloorId ? f : {
                ...f, sections: (f.sections || []).map(s => s.id !== sectionId ? s : { ...s, gridX, gridY })
            })
        });
        set(s => ({
            buildings: newBuildings,
            projects: s.projects.map(p => p.id !== activeProjectId ? p : { ...p, _buildings: newBuildings }),
        }));
    },

    // ── Persist helper ─────────────────────────────────────────────────────
    saveProjectBuildings: () => {
        const { activeProjectId, buildings } = get();
        if (!activeProjectId) return;
        set(s => ({
            projects: s.projects.map(p => p.id !== activeProjectId ? p : { ...p, _buildings: buildings, modifiedAt: new Date().toISOString() }),
        }));
    },

    // ── Computed: all components across all floors (for TwinView) ──────────
    getAllProjectComponents: () => {
        const { buildings } = get();
        return buildings.flatMap(b =>
            (b.floors || []).flatMap(f => (f.components || []))
        );
    },

    getAllProjectSections: () => {
        const { buildings } = get();
        return buildings.flatMap(b =>
            (b.floors || []).flatMap(f => (f.sections || []).map(s => ({ ...s, buildingName: b.name, floorName: f.name, buildingColor: b.color })))
        );
    },
}));

export default useTwinStore;
