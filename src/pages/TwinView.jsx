import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import useTwinStore from '../store/useTwinStore';
import Scene3D from '../components/Scene3D';
import KpiPanel from '../components/KpiPanel';
import KpiCharts from '../components/KpiCharts';
import Chatbot from '../components/Chatbot';
import { checkBackendHealth, getKpiSummary } from '../services/api';

const TABS = [
  { id: 'kpi', label: '📊 KPIs' },
  { id: 'charts', label: '📈 Charts' },
  { id: 'chat', label: '🦙 AI Chat' },
];

const CAMERA_PRESETS = {
  isometric: { position: [20, 18, 20], target: [0, 0, 0] },
  top:        { position: [0, 30, 0.01], target: [0, 0, 0] },
  front:      { position: [0, 10, 30], target: [0, 0, 0] },
  free:       null,
};

export default function TwinView() {
  const { kpis, components, connections, updateKpiValues, setStep,
          activePanel, setActivePanel, selectedComponentId, selectComponent,
          twinName, selectedDomain } = useTwinStore();

  const [cameraView, setCameraView] = useState('isometric');
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [alerts, setAlerts] = useState([]);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [backendOnline, setBackendOnline] = useState(false);
  const [kpiSummary, setKpiSummary] = useState([]);
  const controlsRef = useRef();
  const refreshRef = useRef();

  // Backend health check
  useEffect(() => {
    checkBackendHealth().then(ok => {
      setBackendOnline(ok);
      if (ok) getKpiSummary().then(setKpiSummary).catch(() => {});
    });
  }, []);

  // KPI refresh loop
  useEffect(() => {
    const tick = () => {
      updateKpiValues();
      setCountdown(3);
    };
    tick();
    refreshRef.current = setInterval(tick, 3000);
    const cdInterval = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => { clearInterval(refreshRef.current); clearInterval(cdInterval); };
  }, []);

  // Watch for critical KPIs → show alerts
  useEffect(() => {
    const crits = kpis.filter(k => k.status === 'red');
    if (crits.length > 0) {
      setAlerts(crits.map(k => ({ id: k.id, msg: `${k.name}: ${typeof k.value === 'number' ? k.value.toFixed(1) : k.value} ${k.unit}`, time: new Date().toLocaleTimeString() })));
    }
  }, [kpis]);

  const critCount = kpis.filter(k => k.status === 'red').length;
  const warnCount = kpis.filter(k => k.status === 'orange').length;
  const selComp   = components.find(c => c.id === selectedComponentId);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-0)' }}>
      {/* Top toolbar */}
      <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-0)' }}>
            ⬡ {twinName || 'Digital Twin'} — Live
          </span>
          <span style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--text-2)' }}>
            {components.length} components · {connections.length} connections
          </span>
        </div>

        {/* Backend status */}
        <div style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '8px', fontWeight: 600,
          background: backendOnline ? 'rgba(16,217,141,0.1)' : 'rgba(100,116,139,0.1)',
          color: backendOnline ? '#10d98d' : '#64748b',
          border: `1px solid ${backendOnline ? '#10d98d40' : '#64748b40'}` }}>
          {backendOnline ? '● Backend: Llama 3 online' : '○ Backend: mock mode'}
        </div>

        {/* Camera selector */}
        <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-0)', borderRadius: '7px', padding: '2px' }}>
          {Object.keys(CAMERA_PRESETS).map(v => (
            <button key={v} onClick={() => setCameraView(v)}
              style={{ padding: '3px 9px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 500, textTransform: 'capitalize', transition: 'all 0.15s',
                background: cameraView === v ? 'var(--accent)' : 'transparent',
                color: cameraView === v ? '#fff' : 'var(--text-2)' }}>
              {v}
            </button>
          ))}
        </div>

        {/* Alerts bell */}
        <button onClick={() => setAlertsOpen(o => !o)} style={{ position: 'relative', padding: '4px 10px', borderRadius: '8px', border: `1px solid ${critCount > 0 ? '#ef4444' : 'var(--border)'}`, background: critCount > 0 ? 'rgba(239,68,68,0.08)' : 'var(--bg-0)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: critCount > 0 ? '#ef4444' : 'var(--text-2)' }}>
          🔔 {critCount > 0 ? `${critCount} Critical` : warnCount > 0 ? `${warnCount} Warn` : 'No alerts'}
        </button>

        {/* Refresh countdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--text-2)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: countdown === 0 ? 'none' : undefined }}>
            <circle cx="7" cy="7" r="5.5" fill="none" stroke="#1e3a5f" strokeWidth="1.5" />
            <circle cx="7" cy="7" r="5.5" fill="none" stroke="var(--accent)" strokeWidth="1.5"
              strokeDasharray={`${34.6 * (countdown / 3)} 34.6`}
              strokeDashoffset="8.65" transform="rotate(-90 7 7)" style={{ transition: 'stroke-dasharray 0.5s' }} />
          </svg>
          {countdown}s
        </div>

        <button className="btn btn-ghost" style={{ fontSize: '11px' }} onClick={() => setStep(4)}>← KPI Setup</button>
      </div>

      {/* Alert dropdown */}
      {alertsOpen && alerts.length > 0 && (
        <div style={{ position: 'absolute', top: '88px', right: '14px', zIndex: 50, width: '280px', background: 'var(--bg-1)', border: '1px solid #ef4444', borderRadius: '10px', padding: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>🚨 Active Critical Alerts</div>
          {alerts.map(a => (
            <div key={a.id} style={{ padding: '6px 8px', marginBottom: '4px', borderRadius: '6px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '11px', color: 'var(--text-1)' }}>
              <span style={{ fontWeight: 600, color: '#ef4444' }}>{a.msg}</span>
              <span style={{ float: 'right', color: 'var(--text-2)', fontSize: '9px' }}>{a.time}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* 3D Scene */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Scene3D cameraView={cameraView} />

          {/* Floating stats overlay */}
          <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', flexDirection: 'column', gap: '6px', pointerEvents: 'none' }}>
            {[
              { label: 'Components', value: components.length, icon: '⬡', color: '#6395ff' },
              { label: 'OK KPIs', value: kpis.filter(k => k.status === 'green').length, icon: '✅', color: '#10d98d' },
              { label: 'Warnings', value: warnCount, icon: '⚠️', color: '#f59e0b' },
              { label: 'Critical', value: critCount, icon: '🚨', color: '#ef4444' },
            ].map(s => (
              <div key={s.label} style={{ padding: '5px 10px', borderRadius: '8px', background: 'rgba(9,18,32,0.85)', border: `1px solid ${s.color}30`, backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px' }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '9px', color: '#64748b' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Selected component tooltip */}
          {selComp && (
            <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', padding: '8px 16px', borderRadius: '10px', background: 'rgba(9,18,32,0.9)', border: `1px solid ${selComp.color}60`, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '12px', pointerEvents: 'none' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: selComp.color }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{selComp.name}</div>
                <div style={{ fontSize: '10px', color: '#94a3c8' }}>{selComp.type.replace(/_/g,' ')} · {selComp.gridSize.join('×')} cells</div>
              </div>
              {useTwinStore.getState().kpis.filter(k => selComp.kpiIds?.includes(k.id)).map(k => (
                <div key={k.id} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: k.status === 'red' ? '#ef4444' : k.status === 'orange' ? '#f59e0b' : '#10d98d' }}>{typeof k.value === 'number' ? k.value.toFixed(1) : k.value}</div>
                  <div style={{ fontSize: '9px', color: '#64748b' }}>{k.unit}</div>
                </div>
              ))}
              <button style={{ pointerEvents: 'all', fontSize: '10px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(99,149,255,0.15)', border: '1px solid rgba(99,149,255,0.3)', color: '#6395ff', cursor: 'pointer' }}
                onClick={() => selectComponent(null)}>✕</button>
            </div>
          )}

          {/* Bottom hint */}
          {!selComp && (
            <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', padding: '5px 14px', borderRadius: '20px', background: 'rgba(9,18,32,0.7)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '10px', color: '#64748b', backdropFilter: 'blur(4px)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
              Click component to select · Orbit drag · Scroll zoom · Ctrl+drag to move
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ width: `${sidebarWidth}px`, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', background: 'var(--bg-1)', overflow: 'hidden' }}>
          {/* Sidebar tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-0)', flexShrink: 0 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActivePanel(t.id)}
                style={{ flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, transition: 'all 0.15s',
                  borderBottom: `2px solid ${activePanel === t.id ? 'var(--accent)' : 'transparent'}`,
                  background: 'transparent',
                  color: activePanel === t.id ? 'var(--accent)' : 'var(--text-2)' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activePanel === 'kpi'    && <KpiPanel />}
            {activePanel === 'charts' && <KpiCharts />}
            {activePanel === 'chat'   && <Chatbot />}
          </div>

          {/* Backend KPI summary (when real data imported) */}
          {backendOnline && kpiSummary.length > 0 && activePanel === 'kpi' && (
            <div style={{ padding: '8px', borderTop: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-0)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-2)', marginBottom: '4px', fontWeight: 600 }}>📥 IMPORTED KPI DATA</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '80px', overflowY: 'auto' }}>
                {kpiSummary.slice(0, 5).map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-1)' }}>
                    <span style={{ color: 'var(--text-2)' }}>{s.kpi_name}</span>
                    <span style={{ color: 'var(--accent)' }}>avg {s.avg_val?.toFixed(1)} · {s.count} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
