import { useEffect, useState } from 'react';
import useTwinStore from '../store/useTwinStore';
import Scene3D from '../components/Scene3D';
import useKpiWebSocket from '../hooks/useKpiWebSocket';

const TABS = [
  { id: 'kpi',    label: '📊 KPIs' },
  { id: 'chat',   label: '🦙 AI' },
];

const CAMERA_VIEWS = ['Isometric', 'Top', 'Front', 'Free'];

const WS_LABELS = {
  connecting:   { color: '#f59e0b', dot: '⏳', text: 'Connecting…' },
  live:         { color: '#10d98d', dot: '●',  text: 'Live' },
  reconnecting: { color: '#f97316', dot: '↻',  text: 'Reconnecting' },
  offline:      { color: '#64748b', dot: '○',  text: 'No data source' },
};

/* ── Simple KPI panel ── */
function KpiPanel() {
  const { kpis } = useTwinStore();
  const STATUS_COLORS = { green: '#10d98d', orange: '#f59e0b', red: '#ef4444' };
  if (kpis.length === 0) return (
    <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-2)', fontSize: '13px' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
      No KPI data yet.<br />Connect a data source in KPI Setup.
    </div>
  );
  return (
    <div style={{ padding: '12px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {kpis.map(k => {
        const color = STATUS_COLORS[k.status] || '#64748b';
        return (
          <div key={k.id} style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-0)', border: `1px solid ${color}30` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)' }}>{k.name}</span>
              <span className={`badge badge-${k.status}`}>{k.status.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color, lineHeight: 1 }}>
              {typeof k.value === 'number' ? k.value.toFixed(1) : k.value}
              <span style={{ fontSize: '12px', fontWeight: 500, marginLeft: '4px', color: 'var(--text-2)' }}>{k.unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Simple chat panel ── */
function ChatPanel() {
  const { chatMessages, sendMessage } = useTwinStore();
  const [input, setInput] = useState('');
  const send = () => { if (!input.trim()) return; sendMessage(input); setInput(''); };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {chatMessages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%', padding: '8px 12px', borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-2)',
              color: msg.role === 'user' ? '#fff' : 'var(--text-0)',
              fontSize: '12px', lineHeight: 1.5, whiteSpace: 'pre-wrap',
            }}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about KPIs…"
          style={{ flex: 1, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-0)', fontSize: '12px', outline: 'none' }}
        />
        <button onClick={send} style={{ padding: '8px 14px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Send</button>
      </div>
    </div>
  );
}

export default function TwinView() {
  const {
    kpis, components, connections,
    updateKpiValues, setStep,
    activePanel, setActivePanel,
    selectedComponentId, selectComponent,
    twinName, selectedDomain,
  } = useTwinStore();

  const [cameraView, setCameraView] = useState('Isometric');
  const [alertsOpen, setAlertsOpen] = useState(false);

  const { status: wsStatus, lastUpdate, messageCount, STATUS } = useKpiWebSocket(selectedDomain || 'factory');

  useEffect(() => {
    if (wsStatus === STATUS.LIVE) return;
    const t = setInterval(updateKpiValues, 5000);
    return () => clearInterval(t);
  }, [wsStatus, STATUS.LIVE]);

  const critKpis = kpis.filter(k => k.status === 'red');
  const warnKpis = kpis.filter(k => k.status === 'orange');
  const selComp  = components.find(c => c.id === selectedComponentId);
  const wsInfo   = WS_LABELS[wsStatus] || WS_LABELS.offline;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-0)' }}>

      {/* Toolbar */}
      <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-0)' }}>
            ⬡ {twinName || 'Digital Twin'} — Live
          </span>
          <span style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--text-2)' }}>
            {components.length} components · {connections.length} connections
          </span>
        </div>

        {/* WS status */}
        <div style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '8px', fontWeight: 600, whiteSpace: 'nowrap', background: `rgba(${wsStatus==='live'?'16,217,141':wsStatus==='connecting'||wsStatus==='reconnecting'?'245,158,11':'100,116,139'},0.1)`, color: wsInfo.color, border: `1px solid ${wsInfo.color}40` }}>
          {wsInfo.dot} {wsInfo.text}
          {wsStatus === 'live' && <span style={{ marginLeft: '6px', opacity: 0.65, fontWeight: 400 }}>· {messageCount} readings</span>}
        </div>

        {/* Camera views */}
        <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-0)', borderRadius: '8px', padding: '2px' }}>
          {CAMERA_VIEWS.map(v => (
            <button key={v} onClick={() => setCameraView(v)}
              style={{ padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 600, transition: 'all 0.15s', background: cameraView === v ? 'var(--accent)' : 'transparent', color: cameraView === v ? '#fff' : 'var(--text-2)' }}>
              {v}
            </button>
          ))}
        </div>

        {/* Alerts */}
        <button onClick={() => setAlertsOpen(o => !o)}
          style={{ padding: '4px 10px', borderRadius: '8px', border: `1px solid ${critKpis.length > 0 ? '#ef4444' : 'var(--border)'}`, background: critKpis.length > 0 ? 'rgba(239,68,68,0.08)' : 'var(--bg-0)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: critKpis.length > 0 ? '#ef4444' : 'var(--text-2)' }}>
          🔔 {critKpis.length > 0 ? `${critKpis.length} Critical` : warnKpis.length > 0 ? `${warnKpis.length} Warn` : 'No alerts'}
        </button>

        <button className="btn btn-ghost" style={{ fontSize: '11px' }} onClick={() => setStep(4)}>← KPI Setup</button>
      </div>

      {/* Alert dropdown */}
      {alertsOpen && critKpis.length > 0 && (
        <div style={{ position: 'absolute', top: '90px', right: '14px', zIndex: 200, width: '290px', background: 'var(--bg-1)', border: '1px solid #ef4444', borderRadius: '10px', padding: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
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

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* 3D Scene */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Scene3D cameraView={cameraView.toLowerCase()} />

          {/* Stats overlay */}
          <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', flexDirection: 'column', gap: '6px', pointerEvents: 'none' }}>
            {[
              { icon: '⬡', label: 'Components', value: components.length, color: '#4865f2' },
              { icon: '✅', label: 'OK',         value: kpis.filter(k => k.status === 'green').length, color: '#10d98d' },
              { icon: '⚠️', label: 'Warnings',   value: warnKpis.length, color: '#f59e0b' },
              { icon: '🚨', label: 'Critical',   value: critKpis.length, color: '#ef4444' },
            ].map(s => (
              <div key={s.label} style={{ padding: '5px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.88)', border: `1px solid ${s.color}28`, backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px' }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-2)' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* No data overlay */}
          {wsStatus !== 'live' && kpis.length === 0 && (
            <div style={{ position: 'absolute', bottom: '50px', left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(72,101,242,0.3)', backdropFilter: 'blur(8px)', textAlign: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: '18px', marginBottom: '4px' }}>📂</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>No data source connected</div>
              <div style={{ fontSize: '10px', color: 'var(--text-2)' }}>Go to ← KPI Setup to assign your data</div>
            </div>
          )}

          {/* Selected component tooltip */}
          {selComp && (
            <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', padding: '8px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.92)', border: `1px solid ${selComp.color}55`, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: selComp.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-0)' }}>{selComp.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-2)' }}>{selComp.type?.replace(/_/g,' ')} · {selComp.gridSize?.join('×')} cells</div>
              </div>
              <button onClick={() => selectComponent(null)} style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(72,101,242,0.12)', border: '1px solid rgba(72,101,242,0.3)', color: '#4865f2', cursor: 'pointer' }}>✕</button>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', background: 'var(--bg-1)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-0)', flexShrink: 0 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActivePanel(t.id)}
                style={{ flex: 1, padding: '9px 4px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, transition: 'all 0.15s', borderBottom: `2px solid ${activePanel === t.id ? 'var(--accent)' : 'transparent'}`, background: 'transparent', color: activePanel === t.id ? 'var(--accent)' : 'var(--text-2)' }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activePanel === 'kpi'  && <KpiPanel />}
            {activePanel === 'chat' && <ChatPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
