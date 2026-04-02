import { useState } from 'react';
import useTwinStore from '../store/useTwinStore';
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, ChevronRight, Layers } from 'lucide-react';

function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}` : '72,101,242';
}

export default function BuildingEditorPage() {
    const {
        setStep, setActiveFloor, projects, activeProjectId, activeBuildingId,
        addFloor, removeFloor, renameFloor,
    } = useTwinStore();

    const project = projects.find(p => p.id === activeProjectId);
    const building = project?.buildings.find(b => b.id === activeBuildingId);

    const [editingFloorId, setEditingFloorId] = useState(null);
    const [editName, setEditName] = useState('');
    const [addingFloor, setAddingFloor] = useState(false);
    const [newFloorName, setNewFloorName] = useState('');

    if (!building) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-2)' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏗️</div>
                    <div style={{ fontSize: '16px', fontWeight: 600 }}>No building selected</div>
                    <button className="btn btn-ghost" style={{ marginTop: '16px' }} onClick={() => setStep(7)}>← Back to Site</button>
                </div>
            </div>
        );
    }

    const floors = [...(building.floors || [])].sort((a, b) => b.floorNumber - a.floorNumber);

    const handleAddFloor = () => {
        if (!newFloorName.trim()) return;
        addFloor(activeProjectId, activeBuildingId, newFloorName.trim());
        setNewFloorName('');
        setAddingFloor(false);
    };

    const handleRename = (floorId) => {
        if (editName.trim()) renameFloor(activeProjectId, activeBuildingId, floorId, editName.trim());
        setEditingFloorId(null);
        setEditName('');
    };

    const handleOpenFloor = (floorId) => {
        setActiveFloor(floorId);
        setStep(9);
    };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-0)' }}>
            {/* Header */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                <button className="btn btn-ghost" style={{ fontSize: '11px' }} onClick={() => setStep(7)}>
                    <ArrowLeft size={14} /> Site View
                </button>
                <div style={{ fontSize: '10px', color: 'var(--text-2)' }}>/</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: building.color }} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-0)' }}>{building.name}</span>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-2)' }}>
                    {building.floors.length} floor{building.floors.length !== 1 ? 's' : ''} · {building.dimensions.w}×{building.dimensions.d} grid
                </div>
                <button onClick={() => { setNewFloorName(''); setAddingFloor(true); }} className="btn btn-primary" style={{ fontSize: '12px' }}>
                    <Plus size={14} /> Add Floor
                </button>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
                {/* Floor list */}
                <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
                            Floors — top to bottom
                        </div>

                        {/* Add floor inline */}
                        {addingFloor && (
                            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(72,101,242,0.06)', border: '1px solid rgba(72,101,242,0.25)', marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <Layers size={16} color="var(--accent)" />
                                <input className="input" style={{ flex: 1, height: '36px' }} placeholder="Floor name, e.g. Ground Floor, Level 3…" value={newFloorName} onChange={e => setNewFloorName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddFloor()} autoFocus />
                                <button onClick={handleAddFloor} className="btn btn-primary" disabled={!newFloorName.trim()} style={{ height: '36px', opacity: newFloorName.trim() ? 1 : 0.4 }}>Add</button>
                                <button onClick={() => setAddingFloor(false)} style={{ padding: '6px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-2)', display: 'flex' }}>
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        {floors.length === 0 && !addingFloor && (
                            <div style={{ padding: '60px 24px', textAlign: 'center', borderRadius: '16px', border: '2px dashed var(--border)', color: 'var(--text-2)' }}>
                                <Layers size={36} style={{ opacity: 0.25, marginBottom: '12px' }} />
                                <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>No floors yet</div>
                                <div style={{ fontSize: '13px', marginBottom: '16px' }}>Add floors to start designing the interior of this building.</div>
                                <button className="btn btn-primary" onClick={() => setAddingFloor(true)}>
                                    <Plus size={14} /> Add First Floor
                                </button>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {floors.map((floor, idx) => (
                                <div key={floor.id}
                                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderRadius: '12px', background: 'var(--bg-1)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${building.color}80`; e.currentTarget.style.background = `rgba(${hexToRgb(building.color)},0.04)`; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-1)'; }}>

                                    {/* Floor number badge */}
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `rgba(${hexToRgb(building.color)},0.12)`, border: `1px solid ${building.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <span style={{ fontSize: '14px', fontWeight: 800, color: building.color }}>F{floor.floorNumber}</span>
                                    </div>

                                    {/* Floor info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {editingFloorId === floor.id ? (
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input className="input" style={{ height: '32px', flex: 1 }} value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleRename(floor.id); if (e.key === 'Escape') setEditingFloorId(null); }} autoFocus />
                                                <button onClick={() => handleRename(floor.id)} style={{ padding: '5px', borderRadius: '6px', background: '#10b981', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex' }}><Check size={12} /></button>
                                                <button onClick={() => setEditingFloorId(null)} style={{ padding: '5px', borderRadius: '6px', background: 'var(--bg-3)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-2)', display: 'flex' }}><X size={12} /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-0)', marginBottom: '2px' }}>{floor.name}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                                                    {floor.sections?.length || 0} section{(floor.sections?.length || 0) !== 1 ? 's' : ''} · {floor.components?.length || 0} components · {floor.gridCols}×{floor.gridRows} grid
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {editingFloorId !== floor.id && (
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <button onClick={e => { e.stopPropagation(); setEditingFloorId(floor.id); setEditName(floor.name); }} style={{ padding: '6px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-2)', display: 'flex', transition: 'all 0.15s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <Pencil size={12} />
                                            </button>
                                            <button onClick={e => { e.stopPropagation(); removeFloor(activeProjectId, activeBuildingId, floor.id); }} style={{ padding: '6px', borderRadius: '6px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', color: '#ef4444', display: 'flex', transition: 'all 0.15s' }}>
                                                <Trash2 size={12} />
                                            </button>
                                            <button onClick={() => handleOpenFloor(floor.id)} className="btn btn-primary" style={{ fontSize: '12px', height: '34px' }}>
                                                Edit Floor <ChevronRight size={13} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3D Building preview sidebar */}
                <div style={{ width: '260px', flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--bg-1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        ⬡ Building Preview
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', gap: '6px' }}>
                        {/* Isometric building illustration */}
                        <BuildingIllustration building={building} />
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-0)', marginTop: '12px' }}>{building.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>{building.floors.length} floors · {building.dimensions.w * 6}m × {building.dimensions.d * 6}m</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BuildingIllustration({ building }) {
    const floors = Math.max(1, building.floors.length);
    const w = 120; const d = 80; const fh = Math.max(14, Math.min(28, 160 / floors));
    const totalH = floors * fh + 20;
    const color = building.color;
    const floorList = [...(building.floors || [])];

    return (
        <svg width={160} height={Math.min(totalH + 40, 260)} viewBox={`0 0 160 ${Math.min(totalH + 40, 260)}`} style={{ overflow: 'visible' }}>
            {/* Building shadow */}
            <ellipse cx={80} cy={Math.min(totalH + 30, 250)} rx={55} ry={8} fill="rgba(0,0,0,0.12)" />
            {/* Floors from bottom to top */}
            {Array.from({ length: floors }).map((_, i) => {
                const fi = floors - 1 - i; // bottom = low floor number
                const y = 20 + i * fh;
                const isTop = i === 0;
                const floorData = floorList[fi];
                const hasSections = (floorData?.sections?.length || 0) > 0;
                return (
                    <g key={i}>
                        {/* Floor slab */}
                        <rect x={20} y={totalH - y - fh} width={120} height={fh - 2} rx={3}
                            fill={hasSections ? `${color}22` : 'rgba(255,255,255,0.04)'}
                            stroke={color} strokeWidth={isTop ? 2 : 1} strokeOpacity={isTop ? 0.9 : 0.35} />
                        {/* Floor number */}
                        <text x={28} y={totalH - y - fh / 2 + 4} fontSize={8} fill={color} opacity={0.7} fontWeight={600}>
                            F{fi + 1}
                        </text>
                        {/* Section dots */}
                        {hasSections && floorData.sections.slice(0, 4).map((sec, si) => (
                            <circle key={si} cx={70 + si * 14} cy={totalH - y - fh / 2} r={3} fill={sec.color} opacity={0.85} />
                        ))}
                    </g>
                );
            })}
            {/* Roof */}
            <rect x={20} y={20} width={120} height={8} rx={3} fill={color} opacity={0.8} />
        </svg>
    );
}
