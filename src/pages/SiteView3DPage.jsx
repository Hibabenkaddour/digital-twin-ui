import { useState, useRef, useEffect, useCallback } from 'react';
import useTwinStore from '../store/useTwinStore';
import { ArrowLeft, Plus, Building2, ChevronRight } from 'lucide-react';

const CELL = 18; // pixels per grid cell on site map

function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}` : '72,101,242';
}

export default function SiteView3DPage() {
    const { setStep, projects, activeProjectId, setActiveBuilding } = useTwinStore();
    const project = projects.find(p => p.id === activeProjectId);
    const [hovered, setHovered] = useState(null);
    const [view, setView] = useState('2D'); // '2D' | '3D'

    if (!project) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏗️</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '16px' }}>No project selected</div>
                <button className="btn btn-primary" onClick={() => setStep(6)}>Create Project</button>
            </div>
        );
    }

    const buildings = project.buildings || [];

    const handleEnter = (building) => {
        setActiveBuilding(building.id);
        setStep(8);
    };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-0)' }}>
            {/* Header */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                <button className="btn btn-ghost" style={{ fontSize: '11px' }} onClick={() => setStep(0)}>
                    <ArrowLeft size={14} /> Home
                </button>
                <div style={{ width: '1px', height: '18px', background: 'var(--border)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-0)' }}>🏗️ {project.name}</span>
                {project.description && <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>— {project.description}</span>}

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-0)', borderRadius: '7px', padding: '2px' }}>
                        {['2D', '3D'].map(v => (
                            <button key={v} onClick={() => setView(v)} style={{ padding: '3px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, transition: 'all 0.15s', background: view === v ? 'var(--accent)' : 'transparent', color: view === v ? '#fff' : 'var(--text-2)' }}>{v} View</button>
                        ))}
                    </div>
                    <button className="btn btn-primary" style={{ fontSize: '12px' }} onClick={() => setStep(6)}>
                        <Plus size={14} /> New Project
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)', display: 'flex', gap: '24px', flexShrink: 0 }}>
                {[
                    { label: 'Buildings', value: buildings.length },
                    { label: 'Total Floors', value: buildings.reduce((a, b) => a + (b.floors?.length || 0), 0) },
                    { label: 'Total Sections', value: buildings.reduce((a, b) => a + (b.floors || []).reduce((c, f) => c + (f.sections?.length || 0), 0), 0) },
                    { label: 'Components', value: buildings.reduce((a, b) => a + (b.floors || []).reduce((c, f) => c + (f.components?.length || 0), 0), 0) },
                ].map(s => (
                    <div key={s.label}>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent)', marginRight: '4px' }}>{s.value}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>{s.label}</span>
                    </div>
                ))}
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
                {/* Main area — site map */}
                <div style={{ flex: 1, overflow: 'auto', position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                    {view === '2D' ? (
                        <SiteMap2D buildings={buildings} hovered={hovered} setHovered={setHovered} onEnter={handleEnter} />
                    ) : (
                        <SiteMap3D buildings={buildings} hovered={hovered} setHovered={setHovered} onEnter={handleEnter} />
                    )}
                </div>

                {/* Right panel — building list */}
                <div style={{ width: '290px', flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--bg-1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Buildings ({buildings.length})
                    </div>
                    <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
                        {buildings.length === 0 && (
                            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-2)', fontSize: '13px' }}>
                                <Building2 size={28} style={{ opacity: 0.25, marginBottom: '8px' }} />
                                <div>No buildings yet</div>
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {buildings.map(b => {
                                const totalSections = (b.floors || []).reduce((a, f) => a + (f.sections?.length || 0), 0);
                                const totalComps = (b.floors || []).reduce((a, f) => a + (f.components?.length || 0), 0);
                                return (
                                    <div key={b.id}
                                        style={{ padding: '14px', borderRadius: '10px', border: `1px solid ${hovered === b.id ? b.color + '80' : 'var(--border)'}`, background: hovered === b.id ? `rgba(${hexToRgb(b.color)},0.05)` : 'var(--bg-3)', cursor: 'pointer', transition: 'all 0.2s' }}
                                        onMouseEnter={() => setHovered(b.id)}
                                        onMouseLeave={() => setHovered(null)}
                                        onClick={() => handleEnter(b)}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `rgba(${hexToRgb(b.color)},0.15)`, border: `2px solid ${b.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Building2 size={16} color={b.color} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-0)', marginBottom: '3px' }}>{b.name}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-2)' }}>
                                                    {b.floors?.length || 0} floors · {totalSections} sections · {totalComps} components
                                                </div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-2)' }}>
                                                    {b.dimensions.w * 6}m × {b.dimensions.d * 6}m
                                                </div>
                                            </div>
                                            <ChevronRight size={14} color={b.color} />
                                        </div>
                                        {/* Floor pills */}
                                        {(b.floors?.length || 0) > 0 && (
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
                                                {b.floors.slice(0, 6).map(f => (
                                                    <span key={f.id} style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '8px', background: `rgba(${hexToRgb(b.color)},0.12)`, color: b.color, fontWeight: 600 }}>F{f.floorNumber}</span>
                                                ))}
                                                {b.floors.length > 6 && <span style={{ fontSize: '9px', color: 'var(--text-2)' }}>+{b.floors.length - 6}</span>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── 2D site map ───────────────────────────────────────────────────────────────
function SiteMap2D({ buildings, hovered, setHovered, onEnter }) {
    const SITE_COLS = 40; const SITE_ROWS = 30;
    const PAD = 3;

    // Auto-position buildings in a grid layout if no explicit position
    const positioned = buildings.map((b, i) => {
        const cols = Math.ceil(Math.sqrt(buildings.length));
        const bx = (i % cols) * 14 + PAD;
        const by = Math.floor(i / cols) * 12 + PAD;
        return { ...b, px: b.position?.x ?? bx, py: b.position?.y ?? by };
    });

    return (
        <div style={{ padding: '24px', minWidth: SITE_COLS * CELL + 48, minHeight: SITE_ROWS * CELL + 48 }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
                ⬜ Site Plan — 2D Overview
            </div>
            <div style={{ position: 'relative', width: SITE_COLS * CELL, height: SITE_ROWS * CELL, borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(15,20,40,0.8)', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
                {/* Grid dots */}
                <svg width={SITE_COLS * CELL} height={SITE_ROWS * CELL} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {Array.from({ length: SITE_COLS }).map((_, cx) =>
                        Array.from({ length: SITE_ROWS }).map((_, cy) => (
                            <circle key={`${cx}-${cy}`} cx={cx * CELL + CELL / 2} cy={cy * CELL + CELL / 2} r={1} fill="rgba(255,255,255,0.06)" />
                        ))
                    )}
                </svg>
                {/* Park / green area decoration */}
                <div style={{ position: 'absolute', right: '12px', top: '12px', width: '80px', height: '60px', borderRadius: '8px', background: 'rgba(74,222,128,0.06)', border: '1px dashed rgba(74,222,128,0.2)' }} />
                <div style={{ position: 'absolute', right: '18px', top: '18px', fontSize: '14px', opacity: 0.3 }}>🌳</div>
                <div style={{ position: 'absolute', right: '44px', top: '30px', fontSize: '12px', opacity: 0.2 }}>🌳</div>

                {/* Road */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: SITE_ROWS * CELL / 2 - 6, height: '12px', background: 'rgba(255,255,255,0.03)', borderTop: '1px dashed rgba(255,255,255,0.07)', borderBottom: '1px dashed rgba(255,255,255,0.07)' }} />

                {/* Buildings */}
                {positioned.map(b => {
                    const bw = b.dimensions.w * CELL;
                    const bh = b.dimensions.d * CELL;
                    const isHov = hovered === b.id;
                    const floorCount = b.floors?.length || 0;
                    return (
                        <div key={b.id}
                            style={{ position: 'absolute', left: b.px * CELL, top: b.py * CELL, width: bw, height: bh, borderRadius: '6px', background: `rgba(${hexToRgb(b.color)},${isHov ? 0.2 : 0.1})`, border: `${isHov ? 2 : 1}px solid ${b.color}${isHov ? 'cc' : '60'}`, cursor: 'pointer', transition: 'all 0.18s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', boxShadow: isHov ? `0 0 24px ${b.color}44` : 'none', zIndex: isHov ? 10 : 1 }}
                            onMouseEnter={() => setHovered(b.id)}
                            onMouseLeave={() => setHovered(null)}
                            onDoubleClick={() => onEnter(b)}>
                            <div style={{ fontSize: Math.min(16, bw / 5), fontWeight: 800, color: b.color, textAlign: 'center', lineHeight: 1.1, padding: '0 4px', overflow: 'hidden', maxWidth: '100%', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {b.name}
                            </div>
                            <div style={{ fontSize: '9px', color: b.color, opacity: 0.7 }}>{floorCount} floors</div>
                            {isHov && (
                                <button onClick={e => { e.stopPropagation(); onEnter(b); }}
                                    style={{ marginTop: '4px', padding: '3px 10px', borderRadius: '8px', background: b.color, border: 'none', color: '#fff', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                                    Enter →
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-2)', marginTop: '10px', textAlign: 'center' }}>Double-click a building to enter · Hover to inspect</div>
        </div>
    );
}

// ── 3D Isometric site view ────────────────────────────────────────────────────
function SiteMap3D({ buildings, hovered, setHovered, onEnter }) {
    const SCALE = 6; const FLOOR_H = 12; const ISO_X = 0.7; const ISO_Y = 0.4;

    const project3d = (x, y, z) => ({
        sx: (x - y) * SCALE * ISO_X,
        sy: -(x + y) * SCALE * ISO_Y + z * FLOOR_H,
    });

    // Layout buildings
    const laid = buildings.map((b, i) => {
        const cols = Math.ceil(Math.sqrt(buildings.length));
        const bx = (i % cols) * 18;
        const by = Math.floor(i / cols) * 14;
        return { ...b, bx, by };
    });

    const cx = 320; const cy = 200;

    return (
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '700px', minHeight: '500px' }}>
            <div style={{ position: 'relative' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>⬡ Site Plan — 3D Isometric</div>
                <svg width={700} height={500} style={{ overflow: 'visible', filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.5))' }}>
                    {/* Ground */}
                    <ellipse cx={cx} cy={cy + 180} rx={280} ry={80} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" />
                    {/* Grid lines */}
                    {Array.from({ length: 6 }).map((_, i) => {
                        const p0 = project3d(i * 5, 0, 0);
                        const p1 = project3d(i * 5, 28, 0);
                        const p2 = project3d(0, i * 5, 0);
                        const p3 = project3d(28, i * 5, 0);
                        return (
                            <g key={i}>
                                <line x1={cx + p0.sx} y1={cy + p0.sy} x2={cx + p1.sx} y2={cy + p1.sy} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                                <line x1={cx + p2.sx} y1={cy + p2.sy} x2={cx + p3.sx} y2={cy + p3.sy} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                            </g>
                        );
                    })}

                    {laid.map(b => {
                        const { bx, by } = b;
                        const bw = b.dimensions.w; const bd = b.dimensions.d;
                        const floorH = (b.floors?.length || 1) * 2.5;
                        const isHov = hovered === b.id;
                        const col = b.color;

                        const tl = project3d(bx, by, floorH);
                        const tr = project3d(bx + bw, by, floorH);
                        const bl = project3d(bx, by + bd, floorH);
                        const br = project3d(bx + bw, by + bd, floorH);
                        const btl = project3d(bx, by, 0);
                        const btr = project3d(bx + bw, by, 0);
                        const bbl = project3d(bx, by + bd, 0);
                        const bbr = project3d(bx + bw, by + bd, 0);

                        const pts = (pts) => pts.map(([px, py]) => `${cx + px},${cy + py}`).join(' ');

                        return (
                            <g key={b.id} style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHovered(b.id)}
                                onMouseLeave={() => setHovered(null)}
                                onDoubleClick={() => onEnter(b)}>
                                {/* Left face */}
                                <polygon points={pts([[tl.sx, tl.sy], [bl.sx, bl.sy], [bbl.sx, bbl.sy], [btl.sx, btl.sy]])} fill={col} fillOpacity={isHov ? 0.25 : 0.14} stroke={col} strokeWidth={isHov ? 1.5 : 0.8} strokeOpacity={0.7} />
                                {/* Right face */}
                                <polygon points={pts([[tr.sx, tr.sy], [br.sx, br.sy], [bbr.sx, bbr.sy], [btr.sx, btr.sy]])} fill={col} fillOpacity={isHov ? 0.18 : 0.09} stroke={col} strokeWidth={isHov ? 1.5 : 0.8} strokeOpacity={0.5} />
                                {/* Top face */}
                                <polygon points={pts([[tl.sx, tl.sy], [tr.sx, tr.sy], [br.sx, br.sy], [bl.sx, bl.sy]])} fill={col} fillOpacity={isHov ? 0.35 : 0.2} stroke={col} strokeWidth={isHov ? 2 : 1} strokeOpacity={isHov ? 1 : 0.7} />
                                {/* Floor lines */}
                                {Array.from({ length: b.floors?.length || 0 }).map((_, fi) => {
                                    const fz = (fi / (b.floors?.length || 1)) * floorH;
                                    const ll = project3d(bx, by + bd, fz);
                                    const lr = project3d(bx + bw, by + bd, fz);
                                    const rl = project3d(bx, by, fz);
                                    const rr = project3d(bx + bw, by, fz);
                                    return (
                                        <g key={fi} opacity={0.4}>
                                            <line x1={cx + ll.sx} y1={cy + ll.sy} x2={cx + lr.sx} y2={cy + lr.sy} stroke={col} strokeWidth={0.5} />
                                            <line x1={cx + rl.sx} y1={cy + rl.sy} x2={cx + rr.sx} y2={cy + rr.sy} stroke={col} strokeWidth={0.5} />
                                        </g>
                                    );
                                })}
                                {/* Label */}
                                {isHov && (
                                    <text x={cx + (tl.sx + tr.sx) / 2} y={cy + (tl.sy + tr.sy) / 2 - 8} textAnchor="middle" fontSize={10} fontWeight={700} fill={col}>{b.name}</text>
                                )}
                            </g>
                        );
                    })}
                </svg>
                <div style={{ fontSize: '10px', color: 'var(--text-2)', marginTop: '8px', textAlign: 'center' }}>Double-click a building to enter</div>
            </div>
        </div>
    );
}
