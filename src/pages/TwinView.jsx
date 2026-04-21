import { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, BarChart, Bar, Cell
} from 'recharts';
import useTwinStore from '../store/useTwinStore';
import Scene3D from '../components/Scene3D';
import useKpiWebSocket from '../hooks/useKpiWebSocket';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const TABS = [
  { id: 'kpi',    label: '📊 KPIs'   },
  { id: 'charts', label: '📈 Charts'  },
  { id: 'chat',   label: '🦙 AI'      },
];
const CAMERA_VIEWS = ['Isometric', 'Top', 'Front', 'Free'];
const WS_LABELS = {
  connecting:   { color: '#f59e0b', dot: '⏳', text: 'Connecting…' },
  live:         { color: '#10d98d', dot: '●',  text: 'Live' },
  reconnecting: { color: '#f97316', dot: '↻',  text: 'Reconnecting' },
  offline:      { color: '#64748b', dot: '○',  text: 'No data source' },
};
const STATUS_COLORS = { green: '#10d98d', orange: '#f59e0b', red: '#ef4444' };

// ─── KPI Panel ───────────────────────────────────────────────
function KpiPanel({ kpis, components }) {
  if (kpis.length === 0) return (
    <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-2)', fontSize: '13px' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
      No KPI data yet.<br />Connect a data source in KPI Setup.
    </div>
  );

  // Group by component
  const byComp = {};
  kpis.forEach(k => {
    const comp = components.find(c => c.kpiIds?.includes(k.id));
    const key = comp?.name || 'General';
    if (!byComp[key]) byComp[key] = { color: comp?.color || '#4865f2', kpis: [] };
    byComp[key].kpis.push(k);
  });

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
      {Object.entries(byComp).map(([compName, group]) => (
        <div key={compName} style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: group.color, display: 'inline-block', flexShrink: 0 }} />
            {compName}
          </div>
          {group.kpis.map(k => {
            const color = STATUS_COLORS[k.status] || '#64748b';
            const pct   = Math.min(100, Math.max(0, typeof k.value === 'number' ? (k.value / ((k.rules?.red?.[0] || 100) * 1.2)) * 100 : 0));
            return (
              <div key={k.id} style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-0)', border: `1px solid ${color}30`, marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-1)' }}>{k.name}</span>
                  <span className={`badge badge-${k.status}`} style={{ fontSize: '9px', padding: '2px 7px' }}>{k.status?.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 800, color, lineHeight: 1 }}>
                    {typeof k.value === 'number' ? k.value.toFixed(1) : k.value}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>{k.unit}</span>
                </div>
                <div className="progress-wrap">
                  <div className={`progress-bar progress-${k.status === 'red' ? 'red' : k.status === 'orange' ? 'orange' : 'green'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Charts Panel ────────────────────────────────────────────
function ChartsPanel({ kpis, kpiHistory, selectedDomain }) {
  const [chartData,    setChartData]    = useState([]);
  const [chartMeta,    setChartMeta]    = useState([]);   // [{name, unit, orange, red, direction}]
  const [selectedKpi,  setSelectedKpi]  = useState(null);
  const [loading,      setLoading]      = useState(false);

  // Fetch full column history from backend for bar + line charts
  const fetchChartData = useCallback(async () => {
    if (!selectedDomain) return;
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/analytics/chart-data?domain=${selectedDomain}&limit=60`);
      const json = await res.json();
      setChartData(json.data || []);
    } catch {}
    finally { setLoading(false); }
  }, [selectedDomain]);

  useEffect(() => { fetchChartData(); }, [fetchChartData]);

  // Refresh every 5 s
  useEffect(() => {
    const t = setInterval(fetchChartData, 5000);
    return () => clearInterval(t);
  }, [fetchChartData]);

  // Build KPI meta from WS kpis list
  useEffect(() => {
    if (kpis.length > 0) {
      setChartMeta(kpis.map(k => ({
        id:        k.id,
        name:      k.name,
        unit:      k.unit || '',
        orange:    k.rules?.orange?.[0] ?? null,
        red:       k.rules?.red?.[0]    ?? null,
        direction: k.rules?.direction   ?? 'asc',
        status:    k.status,
        value:     k.value,
      })));
      if (!selectedKpi && kpis[0]) setSelectedKpi(kpis[0].name);
    }
  }, [kpis]);

  // Use live kpiHistory from store for the selected KPI line
  const historyForSelected = kpiHistory.slice(-60);

  // Detect available domain columns from chartData
  const domainCols = chartData.length > 0
    ? Object.keys(chartData[0]).filter(k => !['id','recorded_at','flow_status'].includes(k))
    : [];

  // Status breakdown bar chart data
  const statusBreakdown = [
    { status: 'Normal',   count: kpis.filter(k => k.status==='green').length,  color: '#10d98d' },
    { status: 'Warning',  count: kpis.filter(k => k.status==='orange').length, color: '#f59e0b' },
    { status: 'Critical', count: kpis.filter(k => k.status==='red').length,    color: '#ef4444' },
  ];

  if (kpis.length === 0 && chartData.length === 0) return (
    <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-2)', fontSize: '13px' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>📈</div>
      No chart data yet.<br />Backend must be running.
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── KPI selector tabs ── */}
      {chartMeta.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {chartMeta.map(m => (
            <button key={m.id} onClick={() => setSelectedKpi(m.name)}
              style={{ padding: '3px 9px', borderRadius: '12px', border: `1px solid ${selectedKpi===m.name ? STATUS_COLORS[m.status||'green'] : 'var(--border)'}`, background: selectedKpi===m.name ? `${STATUS_COLORS[m.status||'green']}20` : 'var(--bg-0)', color: selectedKpi===m.name ? STATUS_COLORS[m.status||'green'] : 'var(--text-2)', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>
              {m.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Selected KPI Line Chart ── */}
      {selectedKpi && historyForSelected.length > 0 && (() => {
        const meta = chartMeta.find(m => m.name === selectedKpi);
        return (
          <div style={{ background: 'var(--bg-0)', borderRadius: '10px', padding: '12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>
              {selectedKpi} {meta?.unit ? `(${meta.unit})` : ''}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={historyForSelected} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(72,101,242,0.08)" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px' }} />
                {meta?.orange && <ReferenceLine y={meta.orange} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Warn', fill: '#f59e0b', fontSize: 9 }} />}
                {meta?.red    && <ReferenceLine y={meta.red}    stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'Crit', fill: '#ef4444', fontSize: 9 }} />}
                <Line dataKey={selectedKpi} stroke="#4865f2" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {/* ── Status breakdown bar ── */}
      {kpis.length > 0 && (
        <div style={{ background: 'var(--bg-0)', borderRadius: '10px', padding: '12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>KPI Status Breakdown</div>
          <ResponsiveContainer width="100%" height={90}>
            <BarChart data={statusBreakdown} margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
              <XAxis dataKey="status" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {statusBreakdown.map((entry) => <Cell key={entry.status} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Raw sensor multi-line charts (2 columns per panel) ── */}
      {chartData.length > 0 && domainCols.length > 0 && (
        <div style={{ background: 'var(--bg-0)', borderRadius: '10px', padding: '12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>
            Sensor Readings — {selectedDomain}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {domainCols.map(col => {
              const colData = chartData.map(r => ({
                t: new Date(r.recorded_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                v: typeof r[col] === 'number' ? r[col] : Number(r[col]),
              }));
              return (
                <div key={col} style={{ background: 'var(--bg-1)', borderRadius: '8px', padding: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-2)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.replace(/_/g, ' ')}</div>
                  <ResponsiveContainer width="100%" height={60}>
                    <LineChart data={colData} margin={{ top: 2, right: 4, bottom: 0, left: -30 }}>
                      <YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={30} />
                      <Tooltip contentStyle={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '10px' }} formatter={v => [typeof v === 'number' ? v.toFixed(2) : v, col]} labelFormatter={() => ''} />
                      <Line dataKey="v" stroke="#4865f2" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button onClick={fetchChartData} style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(72,101,242,0.1)', border: '1px solid rgba(72,101,242,0.2)', color: 'var(--accent)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}>
        {loading ? '⏳ Refreshing…' : '↻ Refresh Charts'}
      </button>
    </div>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────
function ChatPanel() {
  const { chatMessages, sendMessage } = useTwinStore();
  const [input, setInput] = useState('');
  const send = () => { if (!input.trim()) return; sendMessage(input); setInput(''); };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {chatMessages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '85%', padding: '8px 12px', borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-2)', color: msg.role === 'user' ? '#fff' : 'var(--text-0)', fontSize: '12px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask about KPIs…"
          style={{ flex: 1, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-0)', fontSize: '12px', outline: 'none' }} />
        <button onClick={send} style={{ padding: '8px 14px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Send</button>
      </div>
    </div>
  );
}

// ─── TwinView ─────────────────────────────────────────────────
export default function TwinView() {
  const {
    kpis, kpiHistory, components, connections,
    updateKpiValues, setStep,
    activePanel, setActivePanel,
    selectedComponentId, selectComponent,
    twinName, selectedDomain,
  } = useTwinStore();

  const [cameraView, setCameraView] = useState('Isometric');
  const [alertsOpen, setAlertsOpen] = useState(false);

  const { status: wsStatus, lastUpdate, messageCount, STATUS } = useKpiWebSocket(selectedDomain || 'factory');

  // Fallback local simulation when WS is offline
  useEffect(() => {
    if (wsStatus === STATUS.LIVE) return;
    const t = setInterval(updateKpiValues, 5000);
    return () => clearInterval(t);
  }, [wsStatus, STATUS.LIVE]);

  // Auto-switch to Charts when a KPI enters critical
  useEffect(() => {
    if (kpis.some(k => k.status === 'red') && activePanel === 'kpi') {
      // don't force-switch, just show badge
    }
  }, [kpis]);

  const critKpis = kpis.filter(k => k.status === 'red');
  const warnKpis = kpis.filter(k => k.status === 'orange');
  const selComp  = components.find(c => c.id === selectedComponentId);
  const wsInfo   = WS_LABELS[wsStatus] || WS_LABELS.offline;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-0)', position: 'relative' }}>

      {/* ── Toolbar ── */}
      <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>

        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-0)' }}>⬡ {twinName || 'Digital Twin'} — Live</span>
          <span style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--text-2)' }}>{components.length} components · {connections.length} connections</span>
        </div>

        {/* WS badge */}
        <div style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '8px', fontWeight: 600, whiteSpace: 'nowrap', background: `rgba(${wsStatus==='live'?'16,217,141':wsStatus==='connecting'||wsStatus==='reconnecting'?'245,158,11':'100,116,139'},0.1)`, color: wsInfo.color, border: `1px solid ${wsInfo.color}40` }}>
          {wsInfo.dot} {wsInfo.text}
          {wsStatus === 'live' && <span style={{ marginLeft: '6px', opacity: 0.65, fontWeight: 400 }}>· {messageCount} readings</span>}
          {lastUpdate && wsStatus === 'live' && <span style={{ marginLeft: '6px', opacity: 0.5, fontWeight: 400 }}>{lastUpdate.toLocaleTimeString()}</span>}
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

        {/* Alert bell */}
        <button onClick={() => setAlertsOpen(o => !o)}
          style={{ padding: '4px 10px', borderRadius: '8px', border: `1px solid ${critKpis.length > 0 ? '#ef4444' : 'var(--border)'}`, background: critKpis.length > 0 ? 'rgba(239,68,68,0.08)' : 'var(--bg-0)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: critKpis.length > 0 ? '#ef4444' : warnKpis.length > 0 ? '#f59e0b' : 'var(--text-2)', position: 'relative' }}>
          🔔 {critKpis.length > 0 ? `${critKpis.length} Critical` : warnKpis.length > 0 ? `${warnKpis.length} Warn` : 'No alerts'}
          {critKpis.length > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', animation: 'pulse-red 1s infinite' }} />}
        </button>

        <button className="btn btn-ghost" style={{ fontSize: '11px' }} onClick={() => setStep(4)}>← KPI Setup</button>
      </div>

      {/* ── Alert dropdown ── */}
      {alertsOpen && (critKpis.length > 0 || warnKpis.length > 0) && (
        <div style={{ position: 'absolute', top: '58px', right: '14px', zIndex: 200, width: '300px', background: 'var(--bg-1)', border: `1px solid ${critKpis.length > 0 ? '#ef4444' : '#f59e0b'}`, borderRadius: '10px', padding: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          {critKpis.length > 0 && (
            <>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>🚨 Critical ({critKpis.length})</div>
              {critKpis.map(k => (
                <div key={k.id} style={{ padding: '7px 10px', marginBottom: '5px', borderRadius: '7px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, color: '#ef4444' }}>{k.name}</span>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>{typeof k.value === 'number' ? k.value.toFixed(1) : k.value} {k.unit}</span>
                </div>
              ))}
            </>
          )}
          {warnKpis.length > 0 && (
            <>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px', marginTop: critKpis.length > 0 ? '10px' : 0 }}>⚠️ Warning ({warnKpis.length})</div>
              {warnKpis.map(k => (
                <div key={k.id} style={{ padding: '7px 10px', marginBottom: '5px', borderRadius: '7px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, color: '#f59e0b' }}>{k.name}</span>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>{typeof k.value === 'number' ? k.value.toFixed(1) : k.value} {k.unit}</span>
                </div>
              ))}
            </>
          )}
          <button onClick={() => setAlertsOpen(false)} style={{ width: '100%', marginTop: '8px', padding: '5px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '10px', color: 'var(--text-2)' }}>Dismiss</button>
        </div>
      )}

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* 3D Scene */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Scene3D cameraView={cameraView.toLowerCase()} />

          {/* Stats overlay */}
          <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', flexDirection: 'column', gap: '6px', pointerEvents: 'none' }}>
            {[
              { icon: '⬡', label: 'Components', value: components.length,                             color: '#4865f2' },
              { icon: '✅', label: 'OK',         value: kpis.filter(k=>k.status==='green').length,    color: '#10d98d' },
              { icon: '⚠️', label: 'Warnings',   value: warnKpis.length,                             color: '#f59e0b' },
              { icon: '🚨', label: 'Critical',   value: critKpis.length,                             color: '#ef4444' },
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
              <div style={{ fontSize: '10px', color: 'var(--text-2)' }}>Run docker compose up -d then refresh</div>
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
              {kpis.filter(k => selComp.kpiIds?.includes(k.id)).map(k => (
                <div key={k.id} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: STATUS_COLORS[k.status] || '#64748b' }}>{typeof k.value === 'number' ? k.value.toFixed(1) : k.value}</div>
                  <div style={{ fontSize: '9px', color: '#64748b' }}>{k.unit || k.name}</div>
                </div>
              ))}
              <button onClick={() => selectComponent(null)} style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(72,101,242,0.12)', border: '1px solid rgba(72,101,242,0.3)', color: '#4865f2', cursor: 'pointer' }}>✕</button>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div style={{ width: '310px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', background: 'var(--bg-1)', overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-0)', flexShrink: 0 }}>
            {TABS.map(t => {
              const hasCrit = t.id === 'kpi' && critKpis.length > 0;
              return (
                <button key={t.id} onClick={() => setActivePanel(t.id)}
                  style={{ flex: 1, padding: '9px 4px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, transition: 'all 0.15s', borderBottom: `2px solid ${activePanel === t.id ? 'var(--accent)' : 'transparent'}`, background: 'transparent', color: activePanel === t.id ? 'var(--accent)' : 'var(--text-2)', position: 'relative' }}>
                  {t.label}
                  {hasCrit && <span style={{ position: 'absolute', top: '5px', right: '8px', width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', animation: 'pulse-red 1s infinite' }} />}
                </button>
              );
            })}
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activePanel === 'kpi'    && <KpiPanel kpis={kpis} components={components} />}
            {activePanel === 'charts' && <ChartsPanel kpis={kpis} kpiHistory={kpiHistory} selectedDomain={selectedDomain} />}
            {activePanel === 'chat'   && <ChatPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
