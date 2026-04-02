/**
 * TwinView — Final Live View (Step 5)
 * Shows all project buildings/floors in a 3D isometric canvas,
 * with Connections, KPIs, and AI tabs that are scoped per section.
 */
import { useEffect, useState, useRef } from 'react';
import useTwinStore from '../store/useTwinStore';
import KpiPanel from '../components/KpiPanel';
import KpiCharts from '../components/KpiCharts';
import Chatbot from '../components/Chatbot';
import useKpiWebSocket from '../hooks/useKpiWebSocket';
import { ArrowLeft, Building2, Layers, Zap, Activity, Link, ChevronRight, ChevronDown } from 'lucide-react';

const TABS = [
    { id: 'kpi',         label: '📊 KPIs' },
    { id: 'connections', label: '🔗 Connections' },
    { id: 'charts',      label: '📈 Charts' },
    { id: 'chat',        label: '🤖 AI' },
];

const CAMERA_VIEWS = ['Isometric', 'Top', 'Front', 'Free'];
const WS_LABELS = {
    connecting:   { color: '#f59e0b', text: '⏳ Connecting' },
    live:         { color: '#10d98d', text: '● Live' },
    reconnecting: { color: '#f97316', text: '↻ Reconnecting' },
    offline:      { color: '#64748b', text: '○ No data source' },
};

// ─── 3D Site Canvas: renders all buildings, all floors stacked ────────────────
function SiteView3D({ project, cameraView }) {
    const canvasRef = useRef(null);
    const animRef   = useRef(null);
    const stateRef  = useRef({ theta: 0.6, phi: 0.5, dist: 8, pan: [0, 0] });
    const mouseRef  = useRef(null);
    const { buildings } = useTwinStore();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
        resize();
        window.addEventListener('resize', resize);

        // Set camera for named views
        if (cameraView === 'top')       { stateRef.current = { theta: 0, phi: 1.55, dist: 10, pan: [0,0] }; }
        else if (cameraView === 'front') { stateRef.current = { theta: 0, phi: 0.1, dist: 10, pan: [0,0] }; }
        else if (cameraView === 'isometric') { stateRef.current = { theta: 0.6, phi: 0.5, dist: 8, pan: [0,0] }; }

        const siteW = project?.siteWidth  || 200;
        const siteL = project?.siteLength || 150;
        const SCALE  = 2.2;

        const project3d = (x, y, z) => {
            const { theta, phi, dist, pan } = stateRef.current;
            const rx = x / SCALE - siteW / SCALE / 2 - pan[0];
            const rz = z / SCALE - siteL / SCALE / 2 - pan[1];
            const cosT = Math.cos(theta), sinT = Math.sin(theta);
            const px = rx * cosT + rz * sinT;
            const pz = -rx * sinT + rz * cosT;
            const py = y;
            const sc = dist / (dist + pz * Math.sin(phi) + py * Math.cos(phi));
            const cx2 = canvas.width  / 2 + (px * sc) * 38;
            const cy2 = canvas.height / 2 - ((py * Math.cos(phi) - pz * Math.sin(phi)) * sc) * 38;
            return [cx2, cy2, sc];
        };

        const hexToRgb = hex => {
            const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return r ? [parseInt(r[1],16), parseInt(r[2],16), parseInt(r[3],16)] : [72,101,242];
        };

        const drawBox = (x, y, z, w, h, d, color, label) => {
            const corners = [
                [x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d],
                [x,y+h,z],[x+w,y+h,z],[x+w,y+h,z+d],[x,y+h,z+d],
            ].map(([px,py,pz]) => project3d(px,py,pz));
            const [r,g,b] = hexToRgb(color);
            const faces = [
                { verts:[4,5,6,7], bright:0.95 },
                { verts:[0,1,5,4], bright:0.75 },
                { verts:[1,2,6,5], bright:0.55 },
                { verts:[3,2,6,7], bright:0.65 },
                { verts:[0,3,7,4], bright:0.45 },
            ];
            faces.forEach(({ verts, bright }) => {
                ctx.beginPath();
                verts.forEach((vi,i) => { const [cx2,cy2] = corners[vi]; i===0?ctx.moveTo(cx2,cy2):ctx.lineTo(cx2,cy2); });
                ctx.closePath();
                ctx.fillStyle = `rgba(${Math.round(r*bright)},${Math.round(g*bright)},${Math.round(b*bright)},0.88)`;
                ctx.fill();
                ctx.strokeStyle = `rgba(255,255,255,0.25)`;
                ctx.lineWidth = 0.7;
                ctx.stroke();
            });
            if (label && w > 4) {
                const [lx,ly] = project3d(x+w/2, h+0.2, z+d/2);
                ctx.font = 'bold 10px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = 'rgba(255,255,255,0.95)';
                ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 3;
                ctx.fillText(label, lx, ly);
                ctx.shadowBlur = 0;
            }
        };

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Gradient sky
            const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            grad.addColorStop(0, '#dbeafe'); grad.addColorStop(1, '#ede9fe');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Ground
            const gPts = [[0,0,0],[siteW,0,0],[siteW,0,siteL],[0,0,siteL]].map(([x,y,z])=>project3d(x,y,z));
            ctx.beginPath(); gPts.forEach(([cx2,cy2],i)=>i===0?ctx.moveTo(cx2,cy2):ctx.lineTo(cx2,cy2)); ctx.closePath();
            ctx.fillStyle = '#f0f4ff'; ctx.fill();
            ctx.strokeStyle = 'rgba(72,101,242,0.3)'; ctx.lineWidth = 1; ctx.stroke();

            // Grid on ground
            ctx.strokeStyle = 'rgba(72,101,242,0.06)'; ctx.lineWidth = 0.5;
            for (let i=0;i<=siteW;i+=10) { const [ax,ay]=project3d(i,0,0); const [bx,by]=project3d(i,0,siteL); ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke(); }
            for (let j=0;j<=siteL;j+=10) { const [ax,ay]=project3d(0,0,j); const [bx,by]=project3d(siteW,0,j); ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke(); }

            // Buildings
            buildings.forEach(b => {
                const floors = b.floors || [];
                const floorH = 3.5;
                const bx = b.x || 0, bz = b.y || 0, bw = b.width || 10, bd = b.length || 8;

                // Building base slab
                drawBox(bx, 0, bz, bw, 0.3, bd, '#94a3b8', null);

                floors.forEach((floor, fi) => {
                    const fy = 0.3 + fi * floorH;
                    // Floor shell
                    drawBox(bx, fy, bz, bw, floorH * 0.9, bd, b.color || '#4865f2', fi === floors.length - 1 ? b.name : null);
                    // Components on floor
                    (floor.components || []).forEach(comp => {
                        const [gw, gh] = comp.gridSize;
                        const compH = 0.8;
                        const TYPE_H2 = { sofa:0.85, chair:0.9, desk:0.75, bookshelf:1.8, server_rack:2.0, fridge:1.7, vending_machine:1.8, elevator:2.5, stairs:2.5 };
                        const ch = TYPE_H2[comp.type] || compH;
                        drawBox(bx + comp.col, fy + floorH * 0.9, bz + comp.row, gw, ch, gh, comp.color, null);
                        // Emoji icon over component
                        if (comp.icon) {
                            const [ilx, ily] = project3d(bx + comp.col + gw/2, fy + floorH * 0.9 + ch + 0.2, bz + comp.row + gh/2);
                            ctx.font = `${Math.min(14, gw * 12)}px serif`;
                            ctx.textAlign = 'center';
                            ctx.fillText(comp.icon, ilx, ily);
                        }
                    });
                    // Floor label
                    if (floors.length > 1) {
                        const [lx,ly] = project3d(bx + 0.3, fy + floorH * 0.5, bz + 0.1);
                        ctx.font = '8px Inter, sans-serif';
                        ctx.fillStyle = 'rgba(255,255,255,0.7)';
                        ctx.textAlign = 'left';
                        ctx.fillText(floor.name, lx, ly);
                    }
                });
            });

            animRef.current = requestAnimationFrame(render);
        };
        animRef.current = requestAnimationFrame(render);

        const onDown = e => { mouseRef.current = { x: e.clientX, y: e.clientY, buttons: e.buttons || 1, ...stateRef.current }; };
        const onMove = e => {
            if (!mouseRef.current) return;
            const dx = e.clientX - mouseRef.current.x, dy = e.clientY - mouseRef.current.y;
            if (mouseRef.current.buttons === 1) {
                stateRef.current.theta = mouseRef.current.theta + dx * 0.01;
                stateRef.current.phi = Math.max(0.05, Math.min(1.55, mouseRef.current.phi - dy * 0.01));
            } else if (mouseRef.current.buttons === 2) {
                stateRef.current.pan = [mouseRef.current.pan[0] - dx * 0.03, mouseRef.current.pan[1] - dy * 0.03];
            }
        };
        const onUp = () => { mouseRef.current = null; };
        const onWheel = e => { e.preventDefault(); stateRef.current.dist = Math.max(2, Math.min(25, stateRef.current.dist + e.deltaY * 0.015)); };

        canvas.addEventListener('mousedown', onDown);
        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('mouseup', onUp);
        canvas.addEventListener('mouseleave', onUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('contextmenu', e => e.preventDefault());

        return () => {
            window.removeEventListener('resize', resize);
            ['mousedown','mousemove','mouseup','mouseleave','wheel','contextmenu'].forEach(ev => canvas.removeEventListener(ev, ev==='wheel'?onWheel:ev==='mousedown'?onDown:ev==='mousemove'?onMove:ev==='contextmenu'?e=>{}:onUp));
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [buildings, project, cameraView]);

    return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} onContextMenu={e => e.preventDefault()} />;
}

// ─── Connections panel ─────────────────────────────────────────────────────────
function ConnectionsPanel() {
    const { buildings, getAllProjectSections } = useTwinStore();
    const [expanded, setExpanded] = useState({});
    const sections = getAllProjectSections?.() || [];

    const toggleExpand = id => setExpanded(s => ({ ...s, [id]: !s[id] }));

    return (
        <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                🔗 Connections by Building · Floor · Section
            </div>
            {buildings.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-2)', fontSize: '12px' }}>
                    No buildings yet. Create a project and add buildings.
                </div>
            )}
            {buildings.map(b => (
                <div key={b.id} style={{ marginBottom: '8px', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div onClick={() => toggleExpand(b.id)} style={{ padding: '10px 12px', background: `${b.color || '#4865f2'}12`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: b.color || '#4865f2', flexShrink: 0 }} />
                        <div style={{ flex: 1, fontSize: '12px', fontWeight: 700, color: 'var(--text-0)' }}>{b.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-2)' }}>{(b.floors || []).length} floors · {(b.floors || []).reduce((s,f)=>(s+(f.components||[]).length),0)} items</div>
                        {expanded[b.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </div>
                    {expanded[b.id] && (b.floors || []).map(floor => (
                        <div key={floor.id} style={{ borderTop: '1px solid var(--border)' }}>
                            <div onClick={() => toggleExpand(floor.id)} style={{ padding: '8px 16px', background: 'var(--bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Layers size={10} color="var(--text-2)" />
                                <div style={{ flex: 1, fontSize: '11px', fontWeight: 600, color: 'var(--text-1)' }}>{floor.name}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-2)' }}>{(floor.sections||[]).length} sections · {(floor.components||[]).length} components</div>
                                {expanded[floor.id] ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                            </div>
                            {expanded[floor.id] && (
                                <div style={{ padding: '6px 12px 10px 24px' }}>
                                    {(floor.sections || []).length === 0 && (
                                        <div style={{ fontSize: '10px', color: 'var(--text-2)', padding: '4px 0' }}>No sections defined</div>
                                    )}
                                    {(floor.sections || []).map(sec => {
                                        const secComps = (floor.components || []).filter(c => c.sectionId === sec.id);
                                        return (
                                            <div key={sec.id} style={{ marginBottom: '8px', padding: '8px', borderRadius: '8px', border: `1px solid ${sec.color}33`, background: `${sec.color}08` }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: sec.color }} />
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: sec.color }}>{sec.name}</span>
                                                    <span style={{ fontSize: '9px', color: 'var(--text-2)', marginLeft: 'auto' }}>{secComps.length} items</span>
                                                </div>
                                                {secComps.length > 1 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                        {secComps.slice(0, -1).map((c, i) => (
                                                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                                                                <span style={{ background: `${c.color}30`, borderRadius: '4px', padding: '1px 5px', color: c.color, fontWeight: 600 }}>{c.icon} {c.name}</span>
                                                                <Link size={8} color={sec.color} style={{ opacity: 0.5 }} />
                                                                <span style={{ background: `${secComps[i+1].color}30`, borderRadius: '4px', padding: '1px 5px', color: secComps[i+1].color, fontWeight: 600 }}>{secComps[i+1].icon} {secComps[i+1].name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : secComps.length === 1 ? (
                                                    <div style={{ fontSize: '10px', color: 'var(--text-2)' }}>Only 1 item — add more to create connections</div>
                                                ) : (
                                                    <div style={{ fontSize: '10px', color: 'var(--text-2)' }}>Empty section</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {/* Floor-level (unassigned) components */}
                                    {(floor.sections||[]).length > 0 && (floor.components||[]).filter(c => !c.sectionId).length > 0 && (
                                        <div style={{ fontSize: '10px', color: 'var(--text-2)', padding: '4px 0' }}>
                                            + {(floor.components||[]).filter(c=>!c.sectionId).length} unassigned items
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

// ─── KPI panel for project (per section) ──────────────────────────────────────
function ProjectKpiPanel() {
    const { buildings, kpis } = useTwinStore();
    const [expanded, setExpanded] = useState({});
    const toggleExpand = id => setExpanded(s => ({ ...s, [id]: !s[id] }));

    // Simulate KPI data per section if no real KPIs connected
    const mockKpis = [
        { name: 'Occupancy', value: Math.floor(60 + Math.random() * 30), unit: '%', status: 'green' },
        { name: 'Air Quality', value: +(0.4 + Math.random() * 0.5).toFixed(2), unit: 'AQI', status: 'green' },
        { name: 'Energy Use', value: Math.floor(20 + Math.random() * 80), unit: 'kWh', status: Math.random() > 0.7 ? 'orange' : 'green' },
        { name: 'Noise Level', value: Math.floor(30 + Math.random() * 50), unit: 'dB', status: Math.random() > 0.8 ? 'red' : 'green' },
    ];

    const STATUS_COLOR = { green: '#10b981', orange: '#f59e0b', red: '#ef4444' };

    return (
        <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
            {kpis.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                    <KpiPanel />
                </div>
            )}
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                📊 Metrics per Section
            </div>
            {buildings.flatMap(b => (b.floors || []).flatMap(f =>
                (f.sections || []).map(sec => ({ sec, floor: f, building: b }))
            )).map(({ sec, floor, building }) => (
                <div key={sec.id} style={{ marginBottom: '8px', borderRadius: '10px', border: `1px solid ${sec.color}33`, overflow: 'hidden' }}>
                    <div onClick={() => toggleExpand(sec.id)} style={{ padding: '9px 12px', background: `${sec.color}10`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: sec.color }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-0)' }}>{sec.name}</div>
                            <div style={{ fontSize: '9px', color: 'var(--text-2)' }}>{building.name} · {floor.name}</div>
                        </div>
                        {expanded[sec.id] ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    </div>
                    {expanded[sec.id] && (
                        <div style={{ padding: '8px 12px 10px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                {mockKpis.map((kpi, i) => (
                                    <div key={i} style={{ padding: '7px 9px', borderRadius: '8px', background: `${STATUS_COLOR[kpi.status]}10`, border: `1px solid ${STATUS_COLOR[kpi.status]}30` }}>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: STATUS_COLOR[kpi.status] }}>{kpi.value}<span style={{ fontSize: '9px', marginLeft: '2px' }}>{kpi.unit}</span></div>
                                        <div style={{ fontSize: '9px', color: 'var(--text-2)', marginTop: '1px' }}>{kpi.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}
            {buildings.every(b => (b.floors||[]).every(f => (f.sections||[]).length === 0)) && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-2)', fontSize: '12px' }}>
                    Add sections in the Floor Editor to see per-section KPIs here.
                </div>
            )}
        </div>
    );
}

// ─── Main TwinView ─────────────────────────────────────────────────────────────
export default function TwinView() {
    const {
        kpis, components, connections,
        updateKpiValues, setStep,
        activePanel, setActivePanel,
        selectedComponentId, selectComponent,
        twinName, selectedDomain,
        getActiveProject, buildings, getAllProjectComponents,
    } = useTwinStore();

    const [cameraView, setCameraView] = useState('Isometric');
    const [alertsOpen, setAlertsOpen] = useState(false);

    const project = getActiveProject();
    const allComps = getAllProjectComponents?.() || buildings.flatMap(b => (b.floors || []).flatMap(f => f.components || []));
    const isProjectMode = buildings.length > 0 || !!project;

    const { status: wsStatus, lastUpdate, messageCount, STATUS } = useKpiWebSocket(selectedDomain || 'airport');

    useEffect(() => {
        if (wsStatus === STATUS.LIVE) return;
        const t = setInterval(updateKpiValues, 5000);
        return () => clearInterval(t);
    }, [wsStatus, STATUS.LIVE]);

    useEffect(() => {
        if (selectedComponentId) setActivePanel('charts');
    }, [selectedComponentId]);

    const critKpis = kpis.filter(k => k.status === 'red');
    const warnKpis = kpis.filter(k => k.status === 'orange');
    const wsInfo = WS_LABELS[wsStatus] || WS_LABELS.offline;

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-0)' }}>
            {/* Toolbar */}
            <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setStep(isProjectMode ? 2 : 0)}>
                    <ArrowLeft size={13} /> {isProjectMode ? 'Site Plan' : 'Projects'}
                </button>

                <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-0)' }}>
                        ⬡ {project?.name || twinName || 'Digital Twin'} — Live View
                    </span>
                    {isProjectMode && (
                        <span style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--text-2)' }}>
                            {buildings.length} buildings · {allComps.length} components
                        </span>
                    )}
                    {!isProjectMode && (
                        <span style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--text-2)' }}>
                            {components.length} components · {connections.length} connections
                        </span>
                    )}
                </div>

                <div style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '8px', fontWeight: 600, color: wsInfo.color, background: `${wsInfo.color}18`, border: `1px solid ${wsInfo.color}40` }}>
                    {wsInfo.text}
                </div>

                {/* Camera views */}
                <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-0)', borderRadius: '8px', padding: '2px' }}>
                    {CAMERA_VIEWS.map(v => (
                        <button key={v} onClick={() => setCameraView(v)}
                            style={{ padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 600, transition: 'all 0.15s',
                                background: cameraView === v ? 'var(--accent)' : 'transparent',
                                color: cameraView === v ? '#fff' : 'var(--text-2)' }}>
                            {v}
                        </button>
                    ))}
                </div>

                <button onClick={() => setAlertsOpen(o => !o)}
                    style={{ padding: '4px 10px', borderRadius: '8px', border: `1px solid ${critKpis.length > 0 ? '#ef4444' : 'var(--border)'}`, background: critKpis.length > 0 ? 'rgba(239,68,68,0.08)' : 'var(--bg-0)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: critKpis.length > 0 ? '#ef4444' : 'var(--text-2)' }}>
                    🔔 {critKpis.length > 0 ? `${critKpis.length} Critical` : warnKpis.length > 0 ? `${warnKpis.length} Warn` : 'No alerts'}
                </button>

                <button className="btn btn-ghost" style={{ fontSize: '11px' }} onClick={() => setStep(isProjectMode ? 4 : 13)}>
                    ← Floor Editor
                </button>
            </div>

            {/* Alert dropdown */}
            {alertsOpen && critKpis.length > 0 && (
                <div style={{ position: 'absolute', top: '90px', right: '14px', zIndex: 100, width: '290px', background: 'var(--bg-1)', border: '1px solid #ef4444', borderRadius: '10px', padding: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>🚨 Critical Alerts</div>
                    {critKpis.map(k => (
                        <div key={k.id} style={{ padding: '6px 8px', marginBottom: '5px', borderRadius: '7px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '11px' }}>
                            <span style={{ fontWeight: 700, color: '#ef4444' }}>{k.name}</span>
                            <span style={{ color: 'var(--text-2)', marginLeft: '6px' }}>{typeof k.value === 'number' ? k.value.toFixed(1) : k.value} {k.unit}</span>
                        </div>
                    ))}
                    <button onClick={() => setAlertsOpen(false)} style={{ width: '100%', marginTop: '6px', padding: '5px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '10px', color: 'var(--text-2)' }}>Dismiss</button>
                </div>
            )}

            {/* Main content */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
                {/* 3D Scene */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    {isProjectMode ? (
                        <SiteView3D project={project} cameraView={cameraView.toLowerCase()} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)', color: '#475569', fontSize: '14px', gap: '12px' }}>
                            <div style={{ fontSize: '48px' }}>🏗️</div>
                            <div style={{ fontWeight: 700 }}>No project loaded</div>
                            <div style={{ fontSize: '12px', opacity: 0.7 }}>Go back to the site plan and add buildings</div>
                            <button className="btn btn-primary btn-sm" onClick={() => setStep(2)}>← Back to Site Plan</button>
                        </div>
                    )}

                    {/* Stats overlay */}
                    <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', flexDirection: 'column', gap: '5px', pointerEvents: 'none' }}>
                        {[
                            { icon: <Building2 size={12} />, label: 'Buildings', value: buildings.length, color: '#4865f2' },
                            { icon: <Layers size={12} />,   label: 'Floors',    value: buildings.reduce((s,b)=>s+(b.floors||[]).length,0), color: '#a855f7' },
                            { icon: <Activity size={12} />, label: 'Items',     value: allComps.length, color: '#10b981' },
                            { icon: '⚠️', label: 'Warn', value: warnKpis.length, color: '#f59e0b' },
                            { icon: '🚨', label: 'Critical', value: critKpis.length, color: '#ef4444' },
                        ].map((s, i) => (
                            <div key={i} style={{ padding: '5px 9px', borderRadius: '8px', background: 'rgba(255,255,255,0.92)', border: `1px solid ${s.color}28`, backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <span style={{ color: s.color, display: 'flex' }}>{s.icon}</span>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                                    <div style={{ fontSize: '8px', color: 'var(--text-2)' }}>{s.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tip */}
                    <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', padding: '5px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)', fontSize: '10px', color: 'var(--text-2)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                        🖱 Drag to orbit · Scroll to zoom · Right-drag to pan
                    </div>
                </div>

                {/* Right sidebar */}
                <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', background: 'var(--bg-1)', overflow: 'hidden' }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-0)', flexShrink: 0 }}>
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => setActivePanel(t.id)}
                                style={{ flex: 1, padding: '9px 2px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 600, transition: 'all 0.15s',
                                    borderBottom: `2px solid ${activePanel === t.id ? 'var(--accent)' : 'transparent'}`,
                                    background: 'transparent',
                                    color: activePanel === t.id ? 'var(--accent)' : 'var(--text-2)' }}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {activePanel === 'kpi'         && <ProjectKpiPanel />}
                        {activePanel === 'connections' && <ConnectionsPanel />}
                        {activePanel === 'charts'      && <KpiCharts />}
                        {activePanel === 'chat'        && <Chatbot />}
                    </div>
                </div>
            </div>
        </div>
    );
}
