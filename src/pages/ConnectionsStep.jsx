import { useState, Suspense } from 'react';
import useTwinStore from '../store/useTwinStore';
import Scene3D from '../components/Scene3D';
import Grid2D from '../components/Grid2D';
import { ChevronRight, ArrowLeft, Link2, Layers, Trash2 } from 'lucide-react';

const VIEWS = ['2D Grid', '3D Preview'];

const STATUS_COLORS = { green: '#10d98d', orange: '#f59e0b', red: '#ef4444' };
const FLOW_LABELS = { green: 'Fluid', orange: 'Congested', red: 'Bottleneck' };

const FLOOR_COLORS = [
    '#4865f2', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
    '#84cc16', '#64748b',
];

export default function ConnectionsStep() {
    const {
        setStep, components, connections, selectedDomain, removeConnection,
        numFloors, activeFloor, setActiveFloor,
    } = useTwinStore();

    const [hoveredConn, setHoveredConn] = useState(null);
    const [view, setView] = useState('2D Grid');

    const DOMAIN_LINK_TYPES = {
        factory:   { label: 'Production Flow',  desc: 'Parts pass from machine A to B', icon: '⚙️' },
        airport:   { label: 'Passenger Flow',   desc: 'Terminal → Gate → Runway',       icon: '✈️' },
        warehouse: { label: 'Picking Route',    desc: 'Reception → Rack → Shipping',    icon: '📦' },
    };
    const linkType = DOMAIN_LINK_TYPES[selectedDomain] || DOMAIN_LINK_TYPES.factory;

    const getComp = (id) => components.find(c => c.id === id);

    // Only show connections whose both endpoints are on the active floor
    const floorConnections = connections.filter(conn => {
        const src = getComp(conn.sourceId);
        const tgt = getComp(conn.targetId);
        return (src?.floor ?? 0) === activeFloor && (tgt?.floor ?? 0) === activeFloor;
    });

    // Count connections per floor for the badge
    const connCountByFloor = (fi) => connections.filter(conn => {
        const src = getComp(conn.sourceId);
        const tgt = getComp(conn.targetId);
        return (src?.floor ?? 0) === fi && (tgt?.floor ?? 0) === fi;
    }).length;

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr', overflow: 'hidden' }}>

                {/* ── Left panel ──────────────────────────────────────────────── */}
                <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(255,255,255,0.85)' }}>

                    {/* Header */}
                    <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <Link2 size={15} color="var(--accent)" />
                            <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em' }}>Connections</span>
                        </div>
                        <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(72,101,242,0.06)', border: '1px solid rgba(72,101,242,0.15)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600, marginBottom: '3px' }}>
                                {linkType.icon} {linkType.label}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-1)' }}>{linkType.desc}</div>
                        </div>
                    </div>

                    {/* ── Floor selector (only when multi-floor) ── */}
                    {numFloors > 1 && (
                        <div style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid var(--border)',
                            background: 'var(--bg-0)',
                            flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                                <Layers size={11} style={{ color: 'var(--text-2)' }} />
                                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                    Floor
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {Array.from({ length: numFloors }).map((_, fi) => {
                                    const isActive = fi === activeFloor;
                                    const color = FLOOR_COLORS[fi % FLOOR_COLORS.length];
                                    const count = connCountByFloor(fi);
                                    return (
                                        <button
                                            key={fi}
                                            onClick={() => setActiveFloor(fi)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                padding: '3px 10px', borderRadius: '20px',
                                                border: isActive ? `1.5px solid ${color}` : '1px solid var(--border)',
                                                background: isActive ? `${color}18` : 'transparent',
                                                color: isActive ? color : 'var(--text-2)',
                                                fontSize: '11px', fontWeight: isActive ? 700 : 500,
                                                cursor: 'pointer', transition: 'all 0.15s',
                                            }}
                                        >
                                            Floor {fi + 1}
                                            {count > 0 && (
                                                <span style={{
                                                    fontSize: '9px', padding: '0 4px', borderRadius: '8px',
                                                    background: isActive ? `${color}30` : 'rgba(148,163,184,0.2)',
                                                    color: isActive ? color : 'var(--text-2)',
                                                    fontWeight: 700, minWidth: '14px', textAlign: 'center',
                                                }}>
                                                    {count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Connection list — filtered to active floor */}
                    <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
                        {floorConnections.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: '13px', padding: '40px 20px' }}>
                                No connections on {numFloors > 1 ? `Floor ${activeFloor + 1}` : 'this floor'} yet.<br />
                                <span style={{ fontSize: '11px', opacity: 0.7 }}>Drag from one component to another in the 2D grid.</span>
                            </div>
                        ) : (
                            floorConnections.map((conn, i) => {
                                const src = getComp(conn.sourceId);
                                const tgt = getComp(conn.targetId);
                                const color = STATUS_COLORS[conn.flowStatus];
                                return (
                                    <div
                                        key={conn.id}
                                        onMouseEnter={() => setHoveredConn(conn.id)}
                                        onMouseLeave={() => setHoveredConn(null)}
                                        style={{
                                            padding: '12px', borderRadius: '10px', marginBottom: '8px',
                                            border: hoveredConn === conn.id ? `1px solid ${color}55` : '1px solid var(--border)',
                                            background: hoveredConn === conn.id ? `rgba(${hexToRgb(color)},0.06)` : 'var(--bg-3)',
                                            cursor: 'pointer', transition: 'all 0.2s ease',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-2)', fontWeight: 600 }}>LINK {i + 1}</span>
                                            <span className={`badge badge-${conn.flowStatus}`} style={{ marginLeft: 'auto' }}>
                                                <span className={`dot dot-${conn.flowStatus}`} />
                                                {FLOW_LABELS[conn.flowStatus]}
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeConnection(conn.id); }}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                                                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}
                                                title="Delete Connection"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ padding: '4px 8px', borderRadius: '6px', background: 'var(--bg-4)', fontSize: '11px', fontWeight: 600, color: 'var(--text-0)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {src?.name || conn.sourceId}
                                            </div>
                                            <div style={{ color, flexShrink: 0 }}>→</div>
                                            <div style={{ padding: '4px 8px', borderRadius: '6px', background: 'var(--bg-4)', fontSize: '11px', fontWeight: 600, color: 'var(--text-0)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {tgt?.name || conn.targetId}
                                            </div>
                                        </div>

                                        {/* Flow bar */}
                                        <div style={{ marginTop: '8px', height: '3px', borderRadius: '2px', background: 'var(--bg-4)', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%',
                                                width: conn.flowStatus === 'green' ? '80%' : conn.flowStatus === 'orange' ? '50%' : '20%',
                                                background: `linear-gradient(90deg, ${color}, transparent)`,
                                                transition: 'width 0.5s',
                                            }} />
                                        </div>
                                    </div>
                                );
                            })
                        )}

                        {/* Cross-floor connections summary */}
                        {numFloors > 1 && (() => {
                            const crossFloor = connections.filter(conn => {
                                const src = getComp(conn.sourceId);
                                const tgt = getComp(conn.targetId);
                                return src && tgt && (src.floor ?? 0) !== (tgt.floor ?? 0);
                            });
                            if (crossFloor.length === 0) return null;
                            return (
                                <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '11px', color: '#6366f1' }}>
                                    <span style={{ fontWeight: 700 }}>↕ {crossFloor.length} cross-floor connection{crossFloor.length > 1 ? 's' : ''}</span>
                                    <span style={{ opacity: 0.7, marginLeft: '4px' }}>(visible in 3D view)</span>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Legend */}
                    <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-2)', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.06em' }}>FLOW LEGEND</div>
                        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                            {[
                                { status: 'green',  label: 'Fluid Flow' },
                                { status: 'orange', label: 'Congested' },
                                { status: 'red',    label: 'Bottleneck' },
                            ].map(l => (
                                <div key={l.status} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                    <span style={{ color: STATUS_COLORS[l.status] }}>●</span>
                                    <span style={{ color: 'var(--text-1)' }}>{l.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Right — view ────────────────────────────────────────────── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                    {/* View toggle */}
                    <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)', borderRadius: '7px', padding: '2px' }}>
                        {VIEWS.map(v => (
                            <button key={v} onClick={() => setView(v)} style={{ padding: '4px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, transition: 'all 0.15s', background: view === v ? 'var(--accent)' : 'transparent', color: view === v ? '#fff' : 'var(--text-2)' }}>{v}</button>
                        ))}
                    </div>

                    {view === '2D Grid' ? (
                        <Grid2D />
                    ) : (
                        <Suspense fallback={<div style={{ color: 'var(--text-2)', padding: '40px', textAlign: 'center' }}>Loading…</div>}>
                            <Scene3D />
                        </Suspense>
                    )}

                    {/* Hint */}
                    <div style={{
                        position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
                        padding: '8px 16px', borderRadius: '100px',
                        background: 'rgba(255,255,255,0.8)', border: '1px solid var(--border)',
                        backdropFilter: 'blur(10px)', fontSize: '12px', color: 'var(--text-1)',
                        zIndex: 10, pointerEvents: 'none',
                    }}>
                        {view === '2D Grid'
                            ? `🖱️ Drag from one component to another on Floor ${activeFloor + 1} to link them`
                            : '🔗 Connections rendered as animated tubes — cross-floor arcs shown in 3D'}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', flexShrink: 0 }}>
                <button className="btn btn-ghost" onClick={() => setStep(2)}>
                    <ArrowLeft size={16} /> Back
                </button>
                <button className="btn btn-primary" onClick={() => setStep(4)}>
                    Next: Configure KPIs <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
        : '99,149,255';
}
