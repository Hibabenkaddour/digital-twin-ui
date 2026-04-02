import { useState, useRef, useCallback } from 'react';
import useTwinStore from '../store/useTwinStore';
import { Plus, ArrowLeft, Building2, Trash2, Move, ChevronRight, Eye, Edit3 } from 'lucide-react';

const BUILDING_COLORS = ['#4865f2','#10b981','#f97316','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f59e0b'];

function AddBuildingModal({ onAdd, onClose, siteWidth, siteLength }) {
    const [bName, setBName] = useState('');
    const [bWidth, setBWidth] = useState(20);
    const [bLength, setBLength] = useState(15);
    const [bColor, setBColor] = useState(BUILDING_COLORS[0]);

    const handleAdd = () => {
        if (!bName.trim()) return;
        onAdd({ name: bName.trim(), width: bWidth, length: bLength, color: bColor, x: 2, y: 2 });
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div className="glass animate-scale" style={{ width: '400px', padding: '32px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Add Building</h3>
                <div style={{ marginBottom: '16px' }}>
                    <label className="label">Building Name</label>
                    <input className="input" placeholder='e.g. "Tower A", "Hangar 1"' value={bName} onChange={e => setBName(e.target.value)} autoFocus />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div><label className="label">Width (m)</label><input className="input" type="number" min={5} max={siteWidth} value={bWidth} onChange={e => setBWidth(Number(e.target.value))} /></div>
                    <div><label className="label">Length (m)</label><input className="input" type="number" min={5} max={siteLength} value={bLength} onChange={e => setBLength(Number(e.target.value))} /></div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                    <label className="label">Color</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {BUILDING_COLORS.map(c => (
                            <button key={c} onClick={() => setBColor(c)} style={{ width: '28px', height: '28px', borderRadius: '6px', background: c, border: 'none', cursor: 'pointer', outline: bColor === c ? '2px solid #1e293b' : 'none', outlineOffset: '2px', transform: bColor === c ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.15s' }} />
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleAdd} disabled={!bName.trim()} style={{ opacity: bName.trim() ? 1 : 0.4 }}>
                        <Plus size={14} /> Add Building
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function SitePlanPage() {
    const {
        buildings, addBuilding, removeBuilding, setActiveBuilding, setStep,
        getActiveProject, moveBuildingOnSite, saveProjectBuildings
    } = useTwinStore();

    const project = getActiveProject();
    const siteWidth = project?.siteWidth || 200;
    const siteLength = project?.siteLength || 150;

    const [showAddModal, setShowAddModal] = useState(false);
    const [dragging, setDragging] = useState(null); // { buildingId, startMouseX, startMouseY, startBX, startBY }
    const [selectedBuildingId, setSelectedBuildingId] = useState(null);
    const canvasRef = useRef(null);

    // Scale so that the site fits nicely in the canvas
    const CANVAS_W = 700;
    const CANVAS_H = 480;
    const PADDING = 24;
    const scaleX = (CANVAS_W - PADDING * 2) / siteWidth;
    const scaleY = (CANVAS_H - PADDING * 2) / siteLength;
    const scale = Math.min(scaleX, scaleY);

    const toCanvas = (x, y) => ({ cx: PADDING + x * scale, cy: PADDING + y * scale });
    const fromCanvas = (cx, cy) => ({ x: (cx - PADDING) / scale, y: (cy - PADDING) / scale });

    const handleMouseDown = useCallback((e, buildingId) => {
        e.preventDefault();
        const building = buildings.find(b => b.id === buildingId);
        if (!building) return;
        setSelectedBuildingId(buildingId);
        const rect = canvasRef.current.getBoundingClientRect();
        setDragging({ buildingId, startMouseX: e.clientX - rect.left, startMouseY: e.clientY - rect.top, startBX: building.x, startBY: building.y });
    }, [buildings]);

    const handleMouseMove = useCallback((e) => {
        if (!dragging) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const dx = (mx - dragging.startMouseX) / scale;
        const dy = (my - dragging.startMouseY) / scale;
        const building = buildings.find(b => b.id === dragging.buildingId);
        if (!building) return;
        const nx = Math.max(0, Math.min(dragging.startBX + dx, siteWidth - building.width));
        const ny = Math.max(0, Math.min(dragging.startBY + dy, siteLength - building.length));
        moveBuildingOnSite(dragging.buildingId, nx, ny);
    }, [dragging, buildings, scale, siteWidth, siteLength, moveBuildingOnSite]);

    const handleMouseUp = useCallback(() => {
        setDragging(null);
        saveProjectBuildings();
    }, [saveProjectBuildings]);

    const handleEnterBuilding = (id) => {
        setActiveBuilding(id);
        setStep(4); // Floor editor
    };

    const handleAdd = (data) => {
        addBuilding(data);
        saveProjectBuildings();
    };

    const handleRemove = (id) => {
        removeBuilding(id);
        saveProjectBuildings();
        if (selectedBuildingId === id) setSelectedBuildingId(null);
    };

    const drawW = siteWidth * scale;
    const drawH = siteLength * scale;

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setStep(0)}><ArrowLeft size={14} /> Projects</button>
                <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-0)' }}>
                        {project?.name || 'Site Plan'}
                    </span>
                    <span style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--text-2)' }}>
                        {siteWidth}m × {siteLength}m · {buildings.length} building{buildings.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                    <Plus size={14} /> Add Building
                </button>
                {buildings.length > 0 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setStep(5)}>
                        <Eye size={14} /> Live View
                    </button>
                )}
            </div>

            {/* Main split */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
                {/* Canvas */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '24px', background: 'var(--bg-0)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '4px' }}>
                            📐 Site Plan — Drag buildings to position them · Click to select
                        </div>
                        <div
                            ref={canvasRef}
                            style={{
                                position: 'relative',
                                width: drawW + PADDING * 2,
                                height: drawH + PADDING * 2,
                                cursor: dragging ? 'grabbing' : 'default',
                                userSelect: 'none',
                            }}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            {/* Site background */}
                            <div style={{
                                position: 'absolute',
                                left: PADDING, top: PADDING,
                                width: drawW, height: drawH,
                                background: 'repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(72,101,242,0.06) 19px, rgba(72,101,242,0.06) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(72,101,242,0.06) 19px, rgba(72,101,242,0.06) 20px)',
                                border: '2px solid rgba(72,101,242,0.25)',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(72,101,242,0.02)',
                            }} />
                            {/* Site label */}
                            <div style={{ position: 'absolute', left: PADDING + 8, top: PADDING + 6, fontSize: '10px', color: 'rgba(72,101,242,0.5)', fontWeight: 600, pointerEvents: 'none' }}>
                                {siteWidth}m × {siteLength}m
                            </div>

                            {/* Buildings */}
                            {buildings.map(b => {
                                const { cx, cy } = toCanvas(b.x, b.y);
                                const bw = b.width * scale;
                                const bh = b.length * scale;
                                const isSelected = selectedBuildingId === b.id;
                                const isDraggingThis = dragging?.buildingId === b.id;
                                return (
                                    <div
                                        key={b.id}
                                        style={{
                                            position: 'absolute',
                                            left: cx, top: cy,
                                            width: bw, height: bh,
                                            background: `${b.color}22`,
                                            border: `2px solid ${isSelected ? b.color : b.color + '88'}`,
                                            borderRadius: '4px',
                                            cursor: isDraggingThis ? 'grabbing' : 'grab',
                                            transition: isDraggingThis ? 'none' : 'box-shadow 0.2s',
                                            boxShadow: isSelected ? `0 0 0 3px ${b.color}44, 0 4px 20px ${b.color}33` : 'none',
                                            display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', justifyContent: 'center',
                                            overflow: 'hidden',
                                        }}
                                        onMouseDown={e => handleMouseDown(e, b.id)}
                                        onClick={() => setSelectedBuildingId(b.id)}
                                    >
                                        {/* Building interior pattern */}
                                        <div style={{
                                            position: 'absolute', inset: 0,
                                            background: `repeating-linear-gradient(45deg, transparent, transparent 4px, ${b.color}08 4px, ${b.color}08 5px)`,
                                        }} />
                                        {bw > 40 && bh > 30 && (
                                            <div style={{ position: 'relative', textAlign: 'center', padding: '4px' }}>
                                                <div style={{ fontSize: Math.min(13, bw / 8), fontWeight: 700, color: b.color, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: bw - 8 }}>
                                                    {b.name}
                                                </div>
                                                {bh > 50 && (
                                                    <div style={{ fontSize: 9, color: b.color + 'aa' }}>
                                                        {b.width}m×{b.length}m · {(b.floors || []).length}F
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {/* Floors indicator */}
                                        {bh > 28 && bw > 28 && (
                                            <div style={{
                                                position: 'absolute', bottom: 3, right: 4,
                                                fontSize: '8px', fontWeight: 700, color: b.color + 'cc',
                                                background: b.color + '18', borderRadius: '3px', padding: '1px 4px',
                                            }}>
                                                {(b.floors || []).length}F
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {buildings.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>Click "Add Building" to place buildings on the site</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right panel — building list */}
                <div style={{ width: '280px', flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--bg-1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Buildings
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>{buildings.length}</span>
                    </div>
                    <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
                        {buildings.length === 0 ? (
                            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-2)', fontSize: '12px' }}>
                                No buildings yet.<br />Add one to get started.
                            </div>
                        ) : (
                            buildings.map(b => {
                                const isSelected = selectedBuildingId === b.id;
                                const floorCount = (b.floors || []).length;
                                return (
                                    <div
                                        key={b.id}
                                        style={{
                                            padding: '12px',
                                            borderRadius: '10px',
                                            border: `1px solid ${isSelected ? b.color + '44' : 'var(--border)'}`,
                                            background: isSelected ? `${b.color}0a` : 'transparent',
                                            marginBottom: '6px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                        }}
                                        onClick={() => setSelectedBuildingId(b.id)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: b.color, flexShrink: 0 }} />
                                            <div style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: 'var(--text-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                                            <button
                                                onClick={e => { e.stopPropagation(); handleRemove(b.id); }}
                                                style={{ padding: '3px', borderRadius: '4px', border: 'none', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}
                                                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.background = 'transparent'; }}
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-2)', marginBottom: '10px' }}>
                                            {b.width}m × {b.length}m · {floorCount} floor{floorCount !== 1 ? 's' : ''}
                                        </div>
                                        <button
                                            className="btn btn-primary"
                                            style={{ width: '100%', padding: '7px', fontSize: '11px', justifyContent: 'center' }}
                                            onClick={e => { e.stopPropagation(); handleEnterBuilding(b.id); }}
                                        >
                                            <Edit3 size={11} /> Edit Floors <ChevronRight size={11} />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    {buildings.length > 0 && (
                        <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
                            <button
                                className="btn btn-ghost"
                                style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }}
                                onClick={() => setStep(5)}
                            >
                                <Eye size={13} /> Live Analytics View
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showAddModal && (
                <AddBuildingModal
                    siteWidth={siteWidth}
                    siteLength={siteLength}
                    onAdd={handleAdd}
                    onClose={() => setShowAddModal(false)}
                />
            )}
        </div>
    );
}
