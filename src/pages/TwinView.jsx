import { useEffect, useRef, useState } from 'react';
import useTwinStore from '../store/useTwinStore';
import Scene3D from '../components/Scene3D';
import KpiPanel from '../components/KpiPanel';
import KpiCharts from '../components/KpiCharts';
import Chatbot from '../components/Chatbot';

const PANELS = [
    { id: 'kpi', label: '📊 KPIs', title: 'KPI Monitor' },
    { id: 'charts', label: '📈 Charts', title: 'KPI Charts' },
    { id: 'chat', label: '🤖 AI', title: 'Analytics AI' },
];

export default function TwinView() {
    const { twinName, selectedDomain, kpis, components, connections, setStep, setView, updateKpiValues, toggleSidebar, sidebarOpen, activeView, activePanel, setActivePanel } = useTwinStore();

    const [alerts, setAlerts] = useState([]);
    const [showAlerts, setShowAlerts] = useState(false);
    const [refreshIn, setRefreshIn] = useState(3);
    const intervalRef = useRef();
    const countRef = useRef(0);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            updateKpiValues();
            countRef.current += 1;
            setRefreshIn(3);
            const newCriticals = useTwinStore.getState().kpis.filter(k => k.status === 'red');
            if (newCriticals.length > 0) {
                setAlerts(prev => [
                    ...newCriticals.map(k => ({ id: Date.now() + Math.random(), text: `🚨 ${k.name}: ${k.value.toFixed(1)} ${k.unit}`, time: new Date().toLocaleTimeString() })),
                    ...prev,
                ].slice(0, 12));
            }
        }, 3000);
        const countdown = setInterval(() => setRefreshIn(r => r > 0 ? r - 1 : 3), 1000);
        return () => { clearInterval(intervalRef.current); clearInterval(countdown); };
    }, []);

    const critCount = kpis.filter(k => k.status === 'red').length;
    const warnCount = kpis.filter(k => k.status === 'orange').length;

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            {/* Top Toolbar */}
            <div style={{ padding: '0 16px', height: '48px', borderBottom: '1px solid var(--border)', background: 'rgba(4,5,10,0.97)', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 20, flexShrink: 0 }}>
                {/* Left: Twin info */}
                <button className="btn btn-ghost" onClick={() => setStep(4)} style={{ fontSize: '11px', padding: '4px 8px' }}>← Edit</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{selectedDomain === 'factory' ? '🏭' : selectedDomain === 'airport' ? '✈️' : '📦'}</span>
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-0)' }}>{twinName || 'Digital Twin'}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-2)' }}>
                            {components.length > 0 ? `${components[0].gridSize?.[0] ? '' : ''}` : ''}{(useTwinStore.getState().gridCols || 10)}×{(useTwinStore.getState().gridRows || 8)} cells · {components.length} components · {connections.length} links
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '20px', background: 'rgba(16,217,141,0.1)', border: '1px solid rgba(16,217,141,0.25)', fontSize: '11px', color: '#10d98d', fontWeight: 600 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10d98d', display: 'inline-block', animation: 'livePulse 1.5s ease-in-out infinite' }} /> LIVE
                    </div>
                </div>

                <div style={{ flex: 1 }} />

                {/* Alerts button */}
                {(critCount > 0 || warnCount > 0) && (
                    <button
                        onClick={() => setShowAlerts(a => !a)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', background: critCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', border: `1px solid ${critCount > 0 ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.35)'}`, color: critCount > 0 ? '#ef4444' : '#f59e0b', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        ⚠ {critCount + warnCount} Alert{critCount + warnCount !== 1 ? 's' : ''}
                    </button>
                )}

                {/* Refresh indicator */}
                <div style={{ fontSize: '10px', color: 'var(--text-2)', padding: '3px 8px', background: 'var(--bg-1)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    ↻ {refreshIn}s
                </div>

                {/* Camera view */}
                <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-0)', borderRadius: '8px', padding: '2px' }}>
                    {[['isometric', '⬡ Iso'], ['top', '⊞ Top'], ['free', '⊙ Free']].map(([v, label]) => (
                        <button key={v} onClick={() => setView(v)} style={{ padding: '4px 9px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 500, transition: 'all 0.15s', background: activeView === v ? 'var(--accent)' : 'transparent', color: activeView === v ? '#fff' : 'var(--text-2)' }}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Toggle panel */}
                <button className="btn btn-ghost" onClick={toggleSidebar} style={{ padding: '4px 10px', fontSize: '12px' }}>
                    {sidebarOpen ? '▶ Hide' : '◀ Show'}
                </button>
            </div>

            {/* Alert dropdown */}
            {showAlerts && alerts.length > 0 && (
                <div style={{ position: 'absolute', top: '100px', right: '16px', zIndex: 100, background: 'var(--bg-1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px', minWidth: '280px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>⚠ Recent Alerts</div>
                    {alerts.slice(0, 6).map(a => (
                        <div key={a.id} style={{ padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-1)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{a.text}</span>
                            <span style={{ color: 'var(--text-2)', marginLeft: '8px' }}>{a.time}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Main content */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
                {/* 3D Scene */}
                <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
                    <Scene3D />

                    {/* Floating stats overlay */}
                    <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', flexDirection: 'column', gap: '6px', pointerEvents: 'none' }}>
                        {[
                            { label: 'Components', value: components.length },
                            { label: 'Connections', value: connections.length },
                            { label: 'KPIs Active', value: kpis.length },
                            { label: 'Refresh', value: `${refreshIn}s` },
                        ].map(stat => (
                            <div key={stat.label} style={{ padding: '4px 10px', background: 'rgba(4,5,10,0.8)', border: '1px solid var(--border)', borderRadius: '6px', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'space-between', gap: '12px', minWidth: '130px' }}>
                                <span style={{ fontSize: '10px', color: 'var(--text-2)' }}>{stat.label}</span>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }}>{stat.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Bottom hint */}
                    <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px' }}>
                        <div style={{ padding: '5px 14px', background: 'rgba(4,5,10,0.75)', border: '1px solid var(--border)', borderRadius: '20px', fontSize: '10px', color: 'var(--text-2)', backdropFilter: 'blur(8px)', pointerEvents: 'none' }}>
                            ⊙ Orbit · Scroll to Zoom · Ctrl+drag to move · Click for KPIs
                        </div>
                    </div>
                </div>

                {/* Right panel */}
                {sidebarOpen && (
                    <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', background: 'var(--bg-1)', overflow: 'hidden' }}>
                        {/* Panel tabs */}
                        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                            {PANELS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setActivePanel(p.id)}
                                    style={{
                                        flex: 1, padding: '10px 6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                                        background: activePanel === p.id ? 'var(--bg-0)' : 'transparent',
                                        color: activePanel === p.id ? 'var(--accent)' : 'var(--text-2)',
                                        borderBottom: activePanel === p.id ? '2px solid var(--accent)' : '2px solid transparent',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* Panel content */}
                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {activePanel === 'kpi' && <KpiPanel />}
                            {activePanel === 'charts' && <KpiCharts />}
                            {activePanel === 'chat' && <Chatbot />}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
      `}</style>
        </div>
    );
}
