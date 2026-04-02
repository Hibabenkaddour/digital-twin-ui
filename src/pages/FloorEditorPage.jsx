import { useState, useRef, useCallback, useEffect } from 'react';
import useTwinStore, { OFFICE_COMPONENTS, COMPONENT_CATEGORIES, SECTION_COLORS } from '../store/useTwinStore';
import {
    ArrowLeft, Plus, Trash2, Edit3, Check, X,
    Layers, RotateCcw, Move, ZapIcon
} from 'lucide-react';

// ─── Mini color picker ────────────────────────────────────────────────────────
function ColorDot({ color, selected, onClick }) {
    return (
        <button onClick={onClick} style={{
            width: '20px', height: '20px', borderRadius: '5px', background: color,
            border: 'none', cursor: 'pointer',
            outline: selected ? '2px solid var(--text-0)' : 'none', outlineOffset: '2px',
            transform: selected ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.15s',
            flexShrink: 0,
        }} />
    );
}

// ─── Inline rename input ──────────────────────────────────────────────────────
function InlineEdit({ value, onSave, onCancel, style }) {
    const [v, setV] = useState(value);
    return (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', ...style }}>
            <input
                autoFocus
                value={v}
                onChange={e => setV(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onSave(v); if (e.key === 'Escape') onCancel(); }}
                style={{ flex: 1, background: 'var(--bg-0)', border: '1px solid var(--accent)', borderRadius: '5px', padding: '3px 7px', fontSize: '12px', color: 'var(--text-0)', outline: 'none' }}
            />
            <button onClick={() => onSave(v)} style={{ padding: '3px', border: 'none', background: 'rgba(72,101,242,0.15)', borderRadius: '4px', cursor: 'pointer', color: 'var(--accent)' }}><Check size={11} /></button>
            <button onClick={onCancel} style={{ padding: '3px', border: 'none', background: 'transparent', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-2)' }}><X size={11} /></button>
        </div>
    );
}

// ─── 2D Floor Plan Canvas ─────────────────────────────────────────────────────
function FloorPlan2D({ building, floor, activeSectionId, onSelectSection, onMoveComponent, onSelectComponent, selectedComponentId, onRotateComponent, onRemoveComponent, onMoveSection }) {
    const CELL = 28;
    const cols = Math.ceil(building.width);
    const rows = Math.ceil(building.length);
    const canvasW = cols * CELL;
    const canvasH = rows * CELL;

    const [dragging, setDragging] = useState(null);      // comp drag
    const [secDrag, setSecDrag] = useState(null);        // section drag
    const canvasRef = useRef(null);

    const sections = floor?.sections || [];
    const components = floor?.components || [];

    // ── Component drag ──
    const handleCompMouseDown = useCallback((e, comp) => {
        e.preventDefault(); e.stopPropagation();
        onSelectComponent(comp.id);
        const rect = canvasRef.current.getBoundingClientRect();
        setDragging({ id: comp.id, startMouseX: e.clientX - rect.left, startMouseY: e.clientY - rect.top, startCol: comp.col, startRow: comp.row });
    }, [onSelectComponent]);

    // ── Section drag ──
    const handleSecMouseDown = useCallback((e, sec) => {
        e.stopPropagation();
        onSelectSection(sec.id);
        const rect = canvasRef.current.getBoundingClientRect();
        setSecDrag({ id: sec.id, startX: e.clientX - rect.left, startY: e.clientY - rect.top, startGX: sec.gridX, startGY: sec.gridY });
    }, [onSelectSection]);

    const handleMouseMove = useCallback((e) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        if (dragging) {
            const dCol = Math.round((mx - dragging.startMouseX) / CELL);
            const dRow = Math.round((my - dragging.startMouseY) / CELL);
            onMoveComponent(dragging.id, Math.max(0, dragging.startCol + dCol), Math.max(0, dragging.startRow + dRow));
        }
        if (secDrag && onMoveSection) {
            const dx = Math.round((mx - secDrag.startX) / CELL);
            const dy = Math.round((my - secDrag.startY) / CELL);
            onMoveSection(secDrag.id, Math.max(0, secDrag.startGX + dx), Math.max(0, secDrag.startGY + dy));
        }
    }, [dragging, secDrag, onMoveComponent, onMoveSection]);

    const handleMouseUp = () => { setDragging(null); setSecDrag(null); };

    const selComp = selectedComponentId ? components.find(c => c.id === selectedComponentId) : null;

    return (
        <div ref={canvasRef} style={{ position: 'relative', width: canvasW, height: canvasH, minWidth: canvasW, minHeight: canvasH, cursor: (dragging || secDrag) ? 'grabbing' : 'default', userSelect: 'none' }}
            onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            {/* Grid */}
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width={canvasW} height={canvasH}>
                <defs>
                    <pattern id="fgrid2" x="0" y="0" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
                        <path d={`M ${CELL} 0 L 0 0 0 ${CELL}`} fill="none" stroke="rgba(72,101,242,0.1)" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width={canvasW} height={canvasH} fill="url(#fgrid2)" />
                <rect width={canvasW} height={canvasH} fill="none" stroke="rgba(72,101,242,0.3)" strokeWidth="1.5" />
            </svg>

            {/* Sections — draggable */}
            {sections.map(sec => {
                const isActive = activeSectionId === sec.id;
                return (
                    <div key={sec.id}
                        onMouseDown={e => handleSecMouseDown(e, sec)}
                        onClick={() => onSelectSection(sec.id)}
                        style={{ position: 'absolute', left: sec.gridX * CELL, top: sec.gridY * CELL, width: sec.gridW * CELL, height: sec.gridH * CELL,
                            background: `${sec.color}14`, border: `2px ${isActive ? 'solid' : 'dashed'} ${sec.color}${isActive ? 'ff' : '88'}`,
                            borderRadius: '6px', cursor: 'grab', zIndex: 1,
                            boxShadow: isActive ? `0 0 0 3px ${sec.color}22, inset 0 0 0 1px ${sec.color}44` : 'none', transition: 'box-shadow 0.15s' }}>
                        {/* Section header bar */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '20px', background: `${sec.color}22`, borderBottom: `1px solid ${sec.color}44`, display: 'flex', alignItems: 'center', paddingLeft: '6px', gap: '4px', borderRadius: '4px 4px 0 0' }}>
                            <Move size={8} color={sec.color} />
                            <span style={{ fontSize: '10px', fontWeight: 700, color: sec.color, pointerEvents: 'none' }}>{sec.name}</span>
                        </div>
                        <div style={{ position: 'absolute', bottom: 4, right: 6, fontSize: '9px', color: sec.color, opacity: 0.6 }}>
                            {sec.gridW}×{sec.gridH}
                        </div>
                    </div>
                );
            })}

            {/* Components */}
            {components.map(comp => {
                const [w, h] = comp.gridSize;
                const isSel = selectedComponentId === comp.id;
                return (
                    <div key={comp.id} onMouseDown={e => handleCompMouseDown(e, comp)}
                        style={{ position: 'absolute', left: comp.col * CELL, top: comp.row * CELL, width: w * CELL, height: h * CELL,
                            background: `${comp.color}dd`, border: `2px solid ${isSel ? '#fff' : comp.color + 'cc'}`,
                            borderRadius: '5px', cursor: 'grab', zIndex: isSel ? 10 : 2,
                            boxShadow: isSel ? `0 0 0 3px ${comp.color}, 0 4px 16px ${comp.color}55` : '0 2px 6px rgba(0,0,0,0.2)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', transition: 'box-shadow 0.15s' }}>
                        <span style={{ fontSize: Math.min(16, w * CELL / 2.2), lineHeight: 1 }}>{comp.icon || '⬛'}</span>
                        {w * CELL > 34 && h * CELL > 24 && (
                            <div style={{ fontSize: Math.max(8, Math.min(10, w * CELL / 5)), color: 'rgba(255,255,255,0.95)', fontWeight: 700, textAlign: 'center', marginTop: '2px', lineHeight: 1.1, padding: '0 2px', overflow: 'hidden' }}>{comp.name}</div>
                        )}
                    </div>
                );
            })}

            {/* Floating action toolbar for selected component */}
            {selComp && (() => {
                const [w] = selComp.gridSize;
                const toolX = selComp.col * CELL;
                const toolY = Math.max(0, selComp.row * CELL - 36);
                return (
                    <div style={{ position: 'absolute', left: toolX, top: toolY, display: 'flex', gap: '3px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '4px 6px', boxShadow: '0 4px 20px rgba(0,0,0,0.6)', zIndex: 30, alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#e2e8f0', paddingRight: '6px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>{selComp.icon} {selComp.name}</span>
                        <button title="Rotate" onClick={e => { e.stopPropagation(); onRotateComponent?.(selComp.id); }}
                            style={{ padding: '3px 6px', borderRadius: '5px', background: 'rgba(72,101,242,0.2)', border: '1px solid rgba(72,101,242,0.4)', cursor: 'pointer', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px' }}>
                            <RotateCcw size={10} /> Rotate
                        </button>
                        <button title="Delete" onClick={e => { e.stopPropagation(); onRemoveComponent?.(selComp.id); onSelectComponent(null); }}
                            style={{ padding: '3px 6px', borderRadius: '5px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px' }}>
                            <Trash2 size={10} /> Delete
                        </button>
                        <button onClick={e => { e.stopPropagation(); onSelectComponent(null); }}
                            style={{ padding: '3px 5px', borderRadius: '5px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                            <X size={10} />
                        </button>
                    </div>
                );
            })()}
        </div>
    );
}

// ─── Main Floor Editor Page ───────────────────────────────────────────────────
export default function FloorEditorPage() {
    const {
        buildings, activeBuildingId, activeFloorId, floorComponents, activeSectionId,
        setStep, addFloor, removeFloor, renameFloor, setActiveFloor,
        addSection, removeSection, renameSection, setActiveSection,
        addFloorComponent, removeFloorComponent, moveFloorComponent, rotateFloorComponent, moveSectionOnFloor,
        selectComponent, selectedComponentId,
        getActiveProject, getActiveBuilding, getActiveFloor,
        saveProjectBuildings,
    } = useTwinStore();

    const project = getActiveProject();
    const building = getActiveBuilding();
    const floor = getActiveFloor();
    const floors = building?.floors || [];
    const sections = floor?.sections || [];
    const components = floor?.components || [];

    const [view, setView] = useState('Split'); // '2D' | '3D' | 'Split'
    const [panel, setPanel] = useState('sections'); // 'sections' | 'components' | 'settings'
    const [category, setCategory] = useState('All');
    const [editingFloorId, setEditingFloorId] = useState(null);
    const [editingSectionId, setEditingSectionId] = useState(null);
    const [showAddSection, setShowAddSection] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    const [newSectionColor, setNewSectionColor] = useState(SECTION_COLORS[0]);
    const [justAdded, setJustAdded] = useState(null);

    const filteredComponents = category === 'All'
        ? OFFICE_COMPONENTS
        : OFFICE_COMPONENTS.filter(c => c.category === category);

    const handleAddComponent = (type) => {
        addFloorComponent(type, { sectionId: activeSectionId });
        setJustAdded(type);
        setTimeout(() => setJustAdded(null), 1200);
        saveProjectBuildings();
    };

    const handleRotateComponent = (id) => {
        rotateFloorComponent?.(id);
        saveProjectBuildings();
    };

    const handleMoveSection = (sectionId, gx, gy) => {
        moveSectionOnFloor?.(sectionId, gx, gy);
    };

    const handleMoveComponent = (id, col, row) => {
        moveFloorComponent(id, col, row);
        saveProjectBuildings();
    };

    // ── Section-scoped connections state ──
    const [sectionConnections, setSectionConnections] = useState({});
    const [sectionKpis, setSectionKpis] = useState({});
    const [connFromSel, setConnFromSel] = useState({});
    const [connToSel, setConnToSel] = useState({});
    const addSectionConnection = (secId, fromId, toId) => {
        if (!fromId || !toId || fromId === toId) return;
        setSectionConnections(prev => ({ ...prev, [secId]: [...(prev[secId] || []), { id: `conn_${Date.now()}`, fromId, toId, status: 'green' }] }));
        setConnFromSel(p => ({ ...p, [secId]: '' }));
        setConnToSel(p => ({ ...p, [secId]: '' }));
    };
    const removeSectionConnection = (secId, connId) =>
        setSectionConnections(prev => ({ ...prev, [secId]: (prev[secId] || []).filter(c => c.id !== connId) }));
    const addSectionKpi = (secId) =>
        setSectionKpis(prev => ({ ...prev, [secId]: [...(prev[secId] || []), { id: `kpi_${Date.now()}`, name: 'New KPI', formula: '', unit: '', warnAt: '', critAt: '', componentId: '' }] }));
    const updateSectionKpi = (secId, kpiId, field, value) =>
        setSectionKpis(prev => ({ ...prev, [secId]: (prev[secId] || []).map(k => k.id === kpiId ? { ...k, [field]: value } : k) }));
    const removeSectionKpi = (secId, kpiId) =>
        setSectionKpis(prev => ({ ...prev, [secId]: (prev[secId] || []).filter(k => k.id !== kpiId) }));


    const handleAddSection = () => {
        if (!newSectionName.trim()) return;
        addSection(newSectionName.trim(), newSectionColor);
        setNewSectionName('');
        setNewSectionColor(SECTION_COLORS[sections.length % SECTION_COLORS.length]);
        setShowAddSection(false);
        saveProjectBuildings();
    };

    const handleAddFloor = () => {
        addFloor(`Floor ${floors.length + 1}`);
        saveProjectBuildings();
    };

    const handleRemoveFloor = (id) => {
        removeFloor(id);
        saveProjectBuildings();
    };

    const handleRenameFloor = (id, name) => {
        renameFloor(id, name);
        setEditingFloorId(null);
        saveProjectBuildings();
    };

    const handleRenameSection = (id, name) => {
        renameSection(id, name);
        setEditingSectionId(null);
        saveProjectBuildings();
    };

    const handleRemoveSection = (id) => {
        removeSection(id);
        saveProjectBuildings();
    };

    const handleRemoveComponent = (id) => {
        removeFloorComponent(id);
        saveProjectBuildings();
    };

    const selectedComponent = components.find(c => c.id === selectedComponentId);

    if (!building) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>🏗️</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-0)' }}>No building selected</div>
                    <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setStep(2)}>← Back to Site Plan</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* ── Top Toolbar ──────────────────────────────────────────────── */}
            <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setStep(2)}>
                    <ArrowLeft size={13} /> Site Plan
                </button>
                <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-0)' }}>{building.name}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-2)' }}>
                    {building.width}m × {building.length}m · {floors.length} floor{floors.length !== 1 ? 's' : ''}
                </span>

                <div style={{ flex: 1 }} />

                {/* Component palette — inline mini */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>+ Add</span>
                    {filteredComponents.slice(0, 6).map(bp => (
                        <button
                            key={bp.type}
                            onClick={() => handleAddComponent(bp.type)}
                            title={`Add ${bp.name} (${bp.category})`}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '3px',
                                padding: '2px 7px', borderRadius: '6px', cursor: 'pointer',
                                fontSize: '10px', fontWeight: 500, transition: 'all 0.15s',
                                background: justAdded === bp.type ? `${bp.color}28` : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${justAdded === bp.type ? bp.color : 'rgba(0,0,0,0.1)'}`,
                                color: justAdded === bp.type ? bp.color : 'var(--text-1)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = `${bp.color}18`; e.currentTarget.style.borderColor = bp.color; }}
                            onMouseLeave={e => { if (justAdded !== bp.type) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; } }}
                        >
                            <span>{bp.icon}</span>{bp.name}
                        </button>
                    ))}
                </div>

                <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

                {/* View toggle */}
                <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-0)', borderRadius: '6px', padding: '2px' }}>
                    {['2D', 'Split', '3D'].map(v => (
                        <button key={v} onClick={() => setView(v)} style={{
                            padding: '3px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                            fontSize: '10px', fontWeight: 500, transition: 'all 0.15s',
                            background: view === v ? 'var(--accent)' : 'transparent',
                            color: view === v ? '#fff' : 'var(--text-2)',
                        }}>{v}</button>
                    ))}
                </div>

                <div style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(72,101,242,0.1)', border: '1px solid rgba(72,101,242,0.2)', fontSize: '10px', fontWeight: 600, color: 'var(--accent)' }}>
                    {components.length} items
                </div>
            </div>

            {/* ── Main layout ───────────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

                {/* ── LEFT PANEL: Floors + Sections + Panel ─────────────────── */}
                <div style={{ width: '240px', flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Floor tabs */}
                    <div style={{ padding: '10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                <Layers size={10} style={{ display: 'inline', marginRight: '4px' }} />Floors
                            </span>
                            <button
                                onClick={handleAddFloor}
                                style={{ padding: '2px 6px', borderRadius: '5px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '10px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '3px' }}
                            >
                                <Plus size={10} /> Add
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '140px', overflow: 'auto' }}>
                            {floors.map((f, idx) => {
                                const isActive = f.id === activeFloorId;
                                return (
                                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {editingFloorId === f.id ? (
                                            <InlineEdit
                                                value={f.name}
                                                onSave={name => handleRenameFloor(f.id, name)}
                                                onCancel={() => setEditingFloorId(null)}
                                                style={{ flex: 1 }}
                                            />
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setActiveFloor(f.id)}
                                                    style={{
                                                        flex: 1, padding: '5px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                                        background: isActive ? 'var(--accent)' : 'transparent',
                                                        color: isActive ? '#fff' : 'var(--text-1)',
                                                        fontSize: '11px', fontWeight: isActive ? 700 : 400, textAlign: 'left',
                                                        transition: 'all 0.15s',
                                                    }}
                                                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-3)'; }}
                                                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                                                >
                                                    {f.name}
                                                    <span style={{ marginLeft: '4px', fontSize: '9px', opacity: 0.7 }}>({(f.components || []).length})</span>
                                                </button>
                                                <button onClick={() => setEditingFloorId(f.id)} style={{ padding: '3px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-2)', opacity: 0.6 }}
                                                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; }}
                                                >
                                                    <Edit3 size={9} />
                                                </button>
                                                {floors.length > 1 && (
                                                    <button onClick={() => handleRemoveFloor(f.id)} style={{ padding: '3px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-2)', opacity: 0.4 }}
                                                        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.opacity = '1'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.opacity = '0.4'; }}
                                                    >
                                                        <Trash2 size={9} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Panel tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                        {[
                            { id: 'sections', label: '🗂 Zones' },
                            { id: 'components', label: '🧩 Palette' },
                            { id: 'connections', label: '🔗 Links' },
                            { id: 'kpis', label: '📊 KPIs' },
                        ].map(t => (
                            <button key={t.id} onClick={() => setPanel(t.id)} style={{
                                flex: 1, padding: '7px 2px', border: 'none', cursor: 'pointer',
                                fontSize: '9px', fontWeight: 600, transition: 'all 0.15s',
                                borderBottom: `2px solid ${panel === t.id ? 'var(--accent)' : 'transparent'}`,
                                background: 'transparent',
                                color: panel === t.id ? 'var(--accent)' : 'var(--text-2)',
                            }}>{t.label}</button>
                        ))}
                    </div>

                    {/* Panel content */}
                    <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
                        {/* ── SECTIONS PANEL ── */}
                        {panel === 'sections' && (
                            <div>
                                <div style={{ marginBottom: '8px' }}>
                                    {sections.length === 0 && (
                                        <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-2)', fontSize: '11px', lineHeight: 1.5 }}>
                                            Sections help you organize your floor into named zones (e.g. Business, AI Team, Kitchen...)
                                        </div>
                                    )}
                                    {sections.map(sec => {
                                        const isActive = activeSectionId === sec.id;
                                        const secComponents = components.filter(c => c.sectionId === sec.id);
                                        return (
                                            <div
                                                key={sec.id}
                                                style={{
                                                    padding: '8px', borderRadius: '8px', marginBottom: '5px',
                                                    border: `1px solid ${isActive ? sec.color + '66' : 'var(--border)'}`,
                                                    background: isActive ? `${sec.color}0d` : 'transparent',
                                                    cursor: 'pointer', transition: 'all 0.15s',
                                                }}
                                                onClick={() => setActiveSection(isActive ? null : sec.id)}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: sec.color, flexShrink: 0 }} />
                                                    {editingSectionId === sec.id ? (
                                                        <InlineEdit value={sec.name} onSave={name => handleRenameSection(sec.id, name)} onCancel={() => setEditingSectionId(null)} style={{ flex: 1 }} />
                                                    ) : (
                                                        <>
                                                            <span style={{ flex: 1, fontSize: '12px', fontWeight: 600, color: 'var(--text-0)' }}>{sec.name}</span>
                                                            <button onClick={e => { e.stopPropagation(); setEditingSectionId(sec.id); }} style={{ padding: '2px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-2)', opacity: 0.5 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}><Edit3 size={9} /></button>
                                                            <button onClick={e => { e.stopPropagation(); handleRemoveSection(sec.id); }} style={{ padding: '2px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-2)', opacity: 0.4 }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.opacity = '1'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.opacity = '0.4'; }}><Trash2 size={9} /></button>
                                                        </>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-2)', paddingLeft: '14px' }}>
                                                    {secComponents.length} component{secComponents.length !== 1 ? 's' : ''}
                                                    {isActive && <span style={{ marginLeft: '4px', color: sec.color, fontWeight: 600 }}>· active</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Add section form */}
                                {showAddSection ? (
                                    <div style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-3)' }}>
                                        <input
                                            autoFocus
                                            className="input"
                                            placeholder="Section name..."
                                            value={newSectionName}
                                            onChange={e => setNewSectionName(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleAddSection(); if (e.key === 'Escape') setShowAddSection(false); }}
                                            style={{ marginBottom: '8px', fontSize: '12px', padding: '6px 10px' }}
                                        />
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                            {SECTION_COLORS.map(c => (
                                                <ColorDot key={c} color={c} selected={newSectionColor === c} onClick={() => setNewSectionColor(c)} />
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: '11px' }} onClick={() => setShowAddSection(false)}>Cancel</button>
                                            <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: '11px' }} onClick={handleAddSection} disabled={!newSectionName.trim()}>
                                                <Plus size={10} /> Add
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowAddSection(true)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '7px', border: '1px dashed var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '11px', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Plus size={11} /> Add Section
                                    </button>
                                )}
                            </div>
                        )}
                        {/* ── CONNECTIONS panel (per section) ── */}
                        {panel === 'connections' && (
                            <div>
                                {sections.length === 0 && (
                                    <div style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--text-2)', fontSize: '10px', lineHeight: 1.6 }}>Add sections first to link components between zones.</div>
                                )}
                                {sections.map(sec => {
                                    const secComps = components.filter(c => c.sectionId === sec.id);
                                    const conns = sectionConnections[sec.id] || [];
                                    const SC = { green: '#10b981', orange: '#f59e0b', red: '#ef4444' };
                                    return (
                                        <div key={sec.id} style={{ marginBottom: '10px', borderRadius: '8px', border: `1px solid ${sec.color}33`, overflow: 'hidden' }}>
                                            <div style={{ padding: '7px 10px', background: `${sec.color}14`, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: sec.color }} />
                                                <span style={{ fontWeight: 700, color: sec.color, fontSize: '11px' }}>{sec.name}</span>
                                                <span style={{ fontSize: '9px', color: 'var(--text-2)', marginLeft: 'auto' }}>{conns.length} links</span>
                                            </div>
                                            <div style={{ padding: '8px' }}>
                                                {secComps.length < 2 ? (
                                                    <div style={{ color: 'var(--text-2)', fontSize: '9px', padding: '4px 0' }}>Need ≥2 components in this section.</div>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '3px', marginBottom: '6px', alignItems: 'center' }}>
                                                        <select value={connFromSel[sec.id] || ''} onChange={e => setConnFromSel(p => ({ ...p, [sec.id]: e.target.value }))}
                                                            style={{ flex: 1, fontSize: '9px', padding: '3px', background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-0)', borderRadius: '4px' }}>
                                                            <option value=''>From…</option>
                                                            {secComps.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                                                        </select>
                                                        <span style={{ color: sec.color }}>→</span>
                                                        <select value={connToSel[sec.id] || ''} onChange={e => setConnToSel(p => ({ ...p, [sec.id]: e.target.value }))}
                                                            style={{ flex: 1, fontSize: '9px', padding: '3px', background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-0)', borderRadius: '4px' }}>
                                                            <option value=''>To…</option>
                                                            {secComps.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                                                        </select>
                                                        <button onClick={() => addSectionConnection(sec.id, connFromSel[sec.id], connToSel[sec.id])}
                                                            disabled={!connFromSel[sec.id] || !connToSel[sec.id] || connFromSel[sec.id] === connToSel[sec.id]}
                                                            style={{ padding: '3px 8px', borderRadius: '5px', background: 'var(--accent)', border: 'none', color: '#fff', fontSize: '11px', cursor: 'pointer', opacity: (!connFromSel[sec.id] || !connToSel[sec.id]) ? 0.4 : 1 }}>+</button>
                                                    </div>
                                                )}
                                                {conns.map(conn => {
                                                    const fr = secComps.find(c => c.id === conn.fromId);
                                                    const to = secComps.find(c => c.id === conn.toId);
                                                    return (
                                                        <div key={conn.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 6px', borderRadius: '5px', background: 'var(--bg-3)', marginBottom: '3px', border: `1px solid ${SC[conn.status]}22` }}>
                                                            <span style={{ flex: 1, fontSize: '9px', color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fr?.icon} {fr?.name} → {to?.icon} {to?.name}</span>
                                                            <select value={conn.status} onChange={e => setSectionConnections(prev => ({ ...prev, [sec.id]: (prev[sec.id] || []).map(c => c.id === conn.id ? { ...c, status: e.target.value } : c) }))}
                                                                style={{ fontSize: '8px', padding: '1px 3px', background: `${SC[conn.status]}18`, border: `1px solid ${SC[conn.status]}44`, borderRadius: '3px', color: SC[conn.status], cursor: 'pointer' }}>
                                                                <option value='green'>● Fluid</option>
                                                                <option value='orange'>● Congested</option>
                                                                <option value='red'>● Critical</option>
                                                            </select>
                                                            <button onClick={() => removeSectionConnection(sec.id, conn.id)}
                                                                style={{ padding: '1px 4px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '10px' }}>✕</button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── KPIs panel (per section) ── */}
                        {panel === 'kpis' && (
                            <div>
                                {sections.length === 0 && (
                                    <div style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--text-2)', fontSize: '10px', lineHeight: 1.6 }}>Add sections first to configure KPI metrics for each zone.</div>
                                )}
                                {sections.map(sec => {
                                    const secComps = components.filter(c => c.sectionId === sec.id);
                                    const kpis = sectionKpis[sec.id] || [];
                                    return (
                                        <div key={sec.id} style={{ marginBottom: '10px', borderRadius: '8px', border: `1px solid ${sec.color}33`, overflow: 'hidden' }}>
                                            <div style={{ padding: '7px 10px', background: `${sec.color}14`, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: sec.color }} />
                                                <span style={{ fontWeight: 700, color: sec.color, fontSize: '11px' }}>{sec.name}</span>
                                                <button onClick={() => addSectionKpi(sec.id)} style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: '5px', background: 'var(--accent)', border: 'none', color: '#fff', fontSize: '9px', cursor: 'pointer' }}>+ KPI</button>
                                            </div>
                                            <div style={{ padding: '8px' }}>
                                                {kpis.length === 0 && <div style={{ color: 'var(--text-2)', fontSize: '9px', padding: '4px 0' }}>Click "+ KPI" to define a metric for this section.</div>}
                                                {kpis.map(kpi => (
                                                    <div key={kpi.id} style={{ padding: '8px', borderRadius: '7px', background: 'var(--bg-3)', border: '1px solid var(--border)', marginBottom: '6px' }}>
                                                        <div style={{ display: 'flex', gap: '3px', marginBottom: '5px' }}>
                                                            <input value={kpi.name} onChange={e => updateSectionKpi(sec.id, kpi.id, 'name', e.target.value)}
                                                                placeholder='KPI name…' style={{ flex: 1, fontSize: '9px', padding: '3px 5px', background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-0)' }} />
                                                            <input value={kpi.unit} onChange={e => updateSectionKpi(sec.id, kpi.id, 'unit', e.target.value)}
                                                                placeholder='Unit' style={{ width: '38px', fontSize: '9px', padding: '3px', background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-0)' }} />
                                                            <button onClick={() => removeSectionKpi(sec.id, kpi.id)}
                                                                style={{ padding: '2px 4px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '10px' }}>✕</button>
                                                        </div>
                                                        <select value={kpi.componentId || ''} onChange={e => updateSectionKpi(sec.id, kpi.id, 'componentId', e.target.value)}
                                                            style={{ width: '100%', fontSize: '9px', padding: '3px', background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-0)', marginBottom: '4px' }}>
                                                            <option value=''>-- All section --</option>
                                                            {secComps.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                                                        </select>
                                                        <input value={kpi.formula} onChange={e => updateSectionKpi(sec.id, kpi.id, 'formula', e.target.value)}
                                                            placeholder='Formula: temp + humidity * 0.5…' style={{ width: '100%', fontSize: '9px', padding: '3px 5px', background: 'var(--bg-0)', border: '1px solid rgba(72,101,242,0.35)', borderRadius: '4px', color: 'var(--text-0)', fontFamily: 'monospace', marginBottom: '5px' }} />
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <label style={{ fontSize: '8px', color: '#f59e0b', display: 'block', marginBottom: '1px' }}>⚠️ Warn ≥</label>
                                                                <input type='number' value={kpi.warnAt} onChange={e => updateSectionKpi(sec.id, kpi.id, 'warnAt', e.target.value)}
                                                                    style={{ width: '100%', fontSize: '9px', padding: '3px 4px', background: 'var(--bg-0)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '4px', color: '#f59e0b' }} />
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <label style={{ fontSize: '8px', color: '#ef4444', display: 'block', marginBottom: '1px' }}>🔴 Crit ≥</label>
                                                                <input type='number' value={kpi.critAt} onChange={e => updateSectionKpi(sec.id, kpi.id, 'critAt', e.target.value)}
                                                                    style={{ width: '100%', fontSize: '9px', padding: '3px 4px', background: 'var(--bg-0)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '4px', color: '#ef4444' }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {panel === 'components' && (
                            <div>
                                {/* Category filter */}
                                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                    {COMPONENT_CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setCategory(cat)}
                                            style={{
                                                padding: '2px 7px', borderRadius: '10px', border: '1px solid var(--border)',
                                                background: category === cat ? 'var(--accent)' : 'transparent',
                                                color: category === cat ? '#fff' : 'var(--text-2)',
                                                fontSize: '9px', fontWeight: 600, cursor: 'pointer',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                {activeSectionId && (
                                    <div style={{ padding: '5px 8px', borderRadius: '6px', background: `${SECTION_COLORS[0]}0d`, border: `1px solid ${SECTION_COLORS[0]}22`, marginBottom: '8px', fontSize: '9px', color: 'var(--text-2)' }}>
                                        Adding to: <strong style={{ color: 'var(--text-0)' }}>{sections.find(s => s.id === activeSectionId)?.name || '?'}</strong>
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                                    {filteredComponents.map(bp => (
                                        <button
                                            key={bp.type}
                                            onClick={() => handleAddComponent(bp.type)}
                                            title={bp.name}
                                            style={{
                                                padding: '8px 6px', borderRadius: '7px', border: `1px solid ${justAdded === bp.type ? bp.color : 'var(--border)'}`,
                                                background: justAdded === bp.type ? `${bp.color}18` : 'var(--bg-3)',
                                                cursor: 'pointer', textAlign: 'center',
                                                transform: justAdded === bp.type ? 'scale(1.05)' : 'scale(1)',
                                                transition: 'all 0.15s',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = bp.color; e.currentTarget.style.background = `${bp.color}12`; }}
                                            onMouseLeave={e => { if (justAdded !== bp.type) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-3)'; } }}
                                        >
                                            <div style={{ fontSize: '16px', marginBottom: '3px' }}>{bp.icon}</div>
                                            <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.2 }}>{bp.name}</div>
                                            <div style={{ fontSize: '8px', color: 'var(--text-2)' }}>{bp.gridSize.join('×')}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Selected component detail */}
                    {selectedComponent && (
                        <div style={{ padding: '10px', borderTop: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-3)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: selectedComponent.color }} />
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-0)', flex: 1 }}>{selectedComponent.name}</span>
                                <button onClick={() => selectComponent(null)} style={{ padding: '2px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-2)' }}><X size={10} /></button>
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-2)', marginBottom: '8px' }}>
                                {selectedComponent.type?.replace(/_/g, ' ')} · {selectedComponent.gridSize?.join('×')} cells
                            </div>
                            <button
                                className="btn btn-danger btn-sm"
                                style={{ width: '100%', justifyContent: 'center', fontSize: '10px' }}
                                onClick={() => handleRemoveComponent(selectedComponent.id)}
                            >
                                <Trash2 size={10} /> Remove
                            </button>
                        </div>
                    )}
                </div>

                {/* ── CENTER: 2D Floor Plan ──────────────────────────────────── */}
                {(view === '2D' || view === 'Split') && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, borderRight: view === 'Split' ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ padding: '5px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-1)' }}>⬜ 2D FLOOR PLAN</span>
                            <span style={{ fontSize: '9px', color: 'var(--text-2)' }}>
                                {floor?.name || 'Floor'} · {building.width}×{building.length}m · Drag to reposition
                            </span>
                            {activeSectionId && (
                                <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '8px', background: `${sections.find(s => s.id === activeSectionId)?.color || '#4865f2'}18`, color: sections.find(s => s.id === activeSectionId)?.color || 'var(--accent)', fontWeight: 600 }}>
                                    Section: {sections.find(s => s.id === activeSectionId)?.name}
                                </span>
                            )}
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: '16px', background: 'var(--bg-0)' }}>
                            <FloorPlan2D
                                building={building}
                                floor={floor}
                                activeSectionId={activeSectionId}
                                onSelectSection={id => setActiveSection(activeSectionId === id ? null : id)}
                                onMoveComponent={handleMoveComponent}
                                onSelectComponent={selectComponent}
                                selectedComponentId={selectedComponentId}
                                onRotateComponent={handleRotateComponent}
                                onRemoveComponent={handleRemoveComponent}
                                onMoveSection={handleMoveSection}
                            />
                        </div>
                    </div>
                )}

                {/* ── RIGHT: 3D View ─────────────────────────────────────────── */}
                {(view === '3D' || view === 'Split') && (
                    <div style={{ flex: view === 'Split' ? '0 0 42%' : 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                        <div style={{ padding: '5px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-1)' }}>⬡ 3D PREVIEW</span>
                            <span style={{ fontSize: '9px', color: 'var(--text-2)' }}>Live sync · Orbit · Scroll zoom</span>
                        </div>
                        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                            <FloorScene3D building={building} floor={floor} sections={sections} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── 3D Floor Scene — bright, icon-rich canvas renderer ─────────────────────
function FloorScene3D({ building, floor, sections }) {
    const { floorComponents, selectedComponentId, selectComponent } = useTwinStore();

    // We inject the floor components into the legacy Scene3D by temporarily mapping them
    // Actually we reuse the store's floorComponents which are synced to the floor
    // For now render a lightweight 3D scene directly with Three.js-like CSS3D simulation
    // Since we already have Scene3D, we'll use a lightweight canvas approach

    const canvasRef = useRef(null);
    const animRef = useRef(null);
    const stateRef = useRef({ theta: 0.6, phi: 0.5, dist: 6, pan: [0, 0] });
    const mouseRef = useRef(null);

    const components = floor?.components || [];
    const W = building?.width || 20;
    const L = building?.length || 15;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const project = (x, y, z) => {
            const { theta, phi, dist, pan } = stateRef.current;
            const rx = x - W / 2 - pan[0];
            const rz = z - L / 2 - pan[1];
            const cosT = Math.cos(theta), sinT = Math.sin(theta);
            const cosP = Math.cos(phi), sinP = Math.sin(phi);
            const px = rx * cosT + rz * sinT;
            const pz = -rx * sinT + rz * cosT;
            const py = y;
            const sc = dist / (dist + pz * sinP + py * cosP);
            const cx = canvas.width / 2 + (px * sc) * 40;
            const cy = canvas.height / 2 - ((py * Math.cos(phi) - pz * Math.sin(phi)) * sc) * 40;
            return [cx, cy, sc];
        };

        // ── per-type 3D heights (meters) ──────────────────────────────────────
        const TYPE_H = { sofa:0.85, lounge_chair:0.9, chair:0.9, desk:0.75, standing_desk:0.9, meeting_table:0.75, bookshelf:1.8, locker:1.9, server_rack:2.0, monitor_wall:1.2, workstation:0.9, vending_machine:1.8, fridge:1.7, kitchen_counter:0.9, dining_table:0.75, water_cooler:1.2, reception_desk:1.1, phone_booth:2.1, stairs:2.5, elevator:2.5, printer:1.0, filing_cabinet:1.3 };

        const hexToRgb = (hex) => {
            const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return r ? [parseInt(r[1],16), parseInt(r[2],16), parseInt(r[3],16)] : [72,101,242];
        };

        const drawBox = (ctx, x, y, z, w, h, d, color, isSelected) => {
            const corners = [
                [x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d],
                [x,y+h,z],[x+w,y+h,z],[x+w,y+h,z+d],[x,y+h,z+d],
            ].map(([px,py,pz]) => project(px,py,pz));
            const [r,g,b] = hexToRgb(color);
            const faces = [
                { verts:[4,5,6,7], bright:1.0 },   // top
                { verts:[0,1,5,4], bright:0.85 },  // front
                { verts:[1,2,6,5], bright:0.65 },  // right
                { verts:[3,2,6,7], bright:0.75 },  // back
                { verts:[0,3,7,4], bright:0.55 },  // left
            ];
            faces.forEach(({ verts, bright }) => {
                ctx.beginPath();
                verts.forEach((vi,i) => { const [cx,cy] = corners[vi]; i===0?ctx.moveTo(cx,cy):ctx.lineTo(cx,cy); });
                ctx.closePath();
                ctx.fillStyle = `rgba(${Math.round(r*bright)},${Math.round(g*bright)},${Math.round(b*bright)},0.92)`;
                ctx.fill();
                ctx.strokeStyle = isSelected ? 'rgba(255,255,255,0.9)' : `rgba(255,255,255,0.18)`;
                ctx.lineWidth = isSelected ? 2 : 0.8;
                ctx.stroke();
            });
            // Glow on selected
            if (isSelected) {
                const [tx,ty] = corners[4];
                ctx.shadowColor = color;
                ctx.shadowBlur = 18;
                ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
                ctx.shadowBlur = 0;
            }
        };

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Bright gradient background
            const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            grad.addColorStop(0, '#e8eaf6');
            grad.addColorStop(1, '#c5cae9');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Floor plate
            const floorPts = [[0,0,0],[W,0,0],[W,0,L],[0,0,L]].map(([px,py,pz])=>project(px,py,pz));
            ctx.beginPath();
            floorPts.forEach(([cx,cy],i) => i===0?ctx.moveTo(cx,cy):ctx.lineTo(cx,cy));
            ctx.closePath();
            ctx.fillStyle = '#f8f9ff';
            ctx.fill();
            ctx.strokeStyle = 'rgba(72,101,242,0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Grid
            ctx.strokeStyle = 'rgba(72,101,242,0.1)';
            ctx.lineWidth = 0.5;
            for (let i=1;i<W;i++) { const [ax,ay]=project(i,0,0); const [bx,by]=project(i,0,L); ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke(); }
            for (let j=1;j<L;j++) { const [ax,ay]=project(0,0,j); const [bx,by]=project(W,0,j); ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke(); }

            // Wall outlines
            const wallH = 2.8;
            const wPts = [[0,0,0],[W,0,0],[W,0,L],[0,0,L]].map(([px,py,pz])=>project(px,py,pz));
            const wtPts = [[0,wallH,0],[W,wallH,0],[W,wallH,L],[0,wallH,L]].map(([px,py,pz])=>project(px,py,pz));
            for (let i=0;i<4;i++) {
                const j=(i+1)%4;
                ctx.beginPath();
                ctx.moveTo(wPts[i][0],wPts[i][1]); ctx.lineTo(wtPts[i][0],wtPts[i][1]);
                ctx.lineTo(wtPts[j][0],wtPts[j][1]); ctx.lineTo(wPts[j][0],wPts[j][1]);
                ctx.closePath();
                ctx.fillStyle = 'rgba(200,210,255,0.2)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(72,101,242,0.35)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Section floor zones
            sections.forEach(sec => {
                const sx=sec.gridX,sy=sec.gridY,sw=sec.gridW,sh=sec.gridH;
                const zone=[[sx,0,sy],[sx+sw,0,sy],[sx+sw,0,sy+sh],[sx,0,sy+sh]].map(([px,py,pz])=>project(px,py,pz));
                ctx.beginPath();
                zone.forEach(([cx,cy],i) => i===0?ctx.moveTo(cx,cy):ctx.lineTo(cx,cy));
                ctx.closePath();
                const [r,g,b] = hexToRgb(sec.color);
                ctx.fillStyle = `rgba(${r},${g},${b},0.18)`;
                ctx.fill();
                ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                // Section label on floor
                const [lx,ly] = project(sx+sw/2, 0.02, sy+sh/2);
                ctx.font = 'bold 11px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;
                ctx.fillText(sec.name, lx, ly);
            });

            // Components — styled 3D boxes with icons
            components.forEach(comp => {
                const [gw, gh] = comp.gridSize;
                const isSel = comp.id === selectedComponentId;
                const h3d = TYPE_H[comp.type] || 0.9;
                drawBox(ctx, comp.col, 0, comp.row, gw, h3d, gh, comp.color, isSel);
                // Icon + label above box
                const [lx, ly] = project(comp.col + gw/2, h3d + 0.15, comp.row + gh/2);
                ctx.font = `${Math.min(20, gw*18)}px serif`;
                ctx.textAlign = 'center';
                ctx.fillStyle = '#000';
                ctx.shadowColor = 'rgba(255,255,255,0.8)';
                ctx.shadowBlur = 4;
                ctx.fillText(comp.icon || '⬛', lx, ly - 2);
                ctx.shadowBlur = 0;
                // Name
                if (gw >= 2) {
                    ctx.font = `bold 9px Inter, sans-serif`;
                    ctx.fillStyle = 'rgba(30,41,59,0.9)';
                    ctx.fillText(comp.name, lx, ly + 12);
                }
            });

            animRef.current = requestAnimationFrame(render);
        };

        animRef.current = requestAnimationFrame(render);

        // Mouse/touch controls
        const onDown = (e) => {
            const evX = e.touches ? e.touches[0].clientX : e.clientX;
            const evY = e.touches ? e.touches[0].clientY : e.clientY;
            mouseRef.current = { x: evX, y: evY, buttons: e.buttons || 1, ...stateRef.current };
        };
        const onMove = (e) => {
            if (!mouseRef.current) return;
            const evX = e.touches ? e.touches[0].clientX : e.clientX;
            const evY = e.touches ? e.touches[0].clientY : e.clientY;
            const dx = evX - mouseRef.current.x;
            const dy = evY - mouseRef.current.y;
            if (mouseRef.current.buttons === 1) {
                stateRef.current.theta = mouseRef.current.theta + dx * 0.01;
                stateRef.current.phi = Math.max(0.1, Math.min(1.4, mouseRef.current.phi - dy * 0.01));
            }
        };
        const onUp = () => { mouseRef.current = null; };
        const onWheel = (e) => {
            e.preventDefault();
            stateRef.current.dist = Math.max(2, Math.min(20, stateRef.current.dist + e.deltaY * 0.01));
        };

        canvas.addEventListener('mousedown', onDown);
        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('mouseup', onUp);
        canvas.addEventListener('mouseleave', onUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('touchstart', onDown);
        canvas.addEventListener('touchmove', onMove);
        canvas.addEventListener('touchend', onUp);

        return () => {
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('mousedown', onDown);
            canvas.removeEventListener('mousemove', onMove);
            canvas.removeEventListener('mouseup', onUp);
            canvas.removeEventListener('mouseleave', onUp);
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('touchstart', onDown);
            canvas.removeEventListener('touchmove', onMove);
            canvas.removeEventListener('touchend', onUp);
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [W, L, components, sections, selectedComponentId]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
        />
    );
}
