/**
 * PublishedView.jsx
 * Read-only viewer for published dashboards.
 * - Locked layout (no editing)
 * - Live data via WebSocket
 * - NLQ Chat with Groq (same as TwinView)
 * - 3D Scene with live overlays
 * - Responsive toolbar + KPI/Charts/AI panels
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, AreaChart, Area
} from 'recharts';
import useTwinStore from '../store/useTwinStore';
import Scene3D from '../components/Scene3D';
import useKpiWebSocket from '../hooks/useKpiWebSocket';

const BASE = import.meta.env.VITE_API_URL || '';
const STATUS_COLORS = { green: '#10d98d', orange: '#f59e0b', red: '#ef4444' };
const DOMAIN_ICONS = { factory: '🏭', airport: '✈️', warehouse: '📦' };

/* ════════════════════════════════════════════════════════════
   NLQ Chat (reused Groq integration — same as TwinView)
   ════════════════════════════════════════════════════════════ */
function ViewerChat({ domain }) {
  const [messages, setMessages] = useState([
    { id: 0, role: 'assistant', text: '👋 **Analytics AI** powered by Groq\n\nAsk anything about the live data — I\'ll analyze it and generate charts.\n\nTry clicking a suggestion below.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const SUGGESTIONS = ['Show temperature trends', 'Any KPIs critical?', 'Compare energy vs throughput', 'Average pressure?'];

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/nlq/ask`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, domain: domain || 'factory' }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant',
        text: data.answer || 'No answer.', charts: data.charts || [],
        model: data.model, dataRows: data.dataRows,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: `❌ ${err.message}`, charts: [] }]);
    }
    setLoading(false);
  };

  const renderChart = (chart, idx) => {
    if (!chart?.data?.length) return null;
    const CT = chart.type === 'bar' ? BarChart : chart.type === 'area' ? AreaChart : LineChart;
    const DT = chart.type === 'bar' ? Bar : chart.type === 'area' ? Area : Line;
    return (
      <div key={idx} style={{ marginTop: '8px', background: 'var(--bg-1)', borderRadius: '10px', padding: '10px', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', marginBottom: '6px' }}>📊 {chart.title}</div>
        <ResponsiveContainer width="100%" height={130}>
          <CT data={chart.data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(72,101,242,0.08)" />
            <XAxis dataKey={chart.xKey || 'x'} tick={{ fontSize: 8, fill: '#94a3b8' }} tickLine={false} />
            <YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '10px' }} />
            {(chart.series || []).map((s, si) => (
              <DT key={si} dataKey={s.key} name={s.label || s.key} stroke={s.color || '#4865f2'}
                fill={chart.type !== 'line' ? (s.color || '#4865f2') + (chart.type === 'area' ? '40' : '') : undefined}
                strokeWidth={chart.type !== 'bar' ? 2 : undefined} dot={false} isAnimationActive={false}
                radius={chart.type === 'bar' ? [3, 3, 0, 0] : undefined} />
            ))}
            {(chart.series || []).length > 1 && <Legend iconSize={8} wrapperStyle={{ fontSize: '9px' }} />}
          </CT>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '4px' }}>
            <div style={{
              maxWidth: '92%', padding: msg.role === 'user' ? '8px 12px' : '10px 12px',
              borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-2)',
              color: msg.role === 'user' ? '#fff' : 'var(--text-0)',
              fontSize: '12px', lineHeight: 1.55, whiteSpace: 'pre-wrap',
            }}>
              {msg.text}
              {msg.charts?.map((c, ci) => renderChart(c, ci))}
              {msg.model && (
                <div style={{ marginTop: '6px', fontSize: '9px', color: 'var(--text-2)', borderTop: '1px solid var(--border)', paddingTop: '5px' }}>
                  🧠 {msg.model} · 📊 {msg.dataRows} rows
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'var(--bg-2)', fontSize: '12px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}>
            <span style={{ animation: 'pulse-dot 1.2s infinite' }}>●</span> Analyzing with Groq…
          </div>
        )}
        {messages.length <= 1 && !loading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                style={{ padding: '5px 10px', borderRadius: '16px', border: '1px solid rgba(72,101,242,0.25)', background: 'rgba(72,101,242,0.06)', color: 'var(--accent)', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}
              >{s}</button>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', background: 'var(--bg-0)' }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={loading ? 'Waiting…' : 'Ask about your data…'} disabled={loading}
          style={{ flex: 1, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-0)', fontSize: '12px', outline: 'none', opacity: loading ? 0.6 : 1 }} />
        <button onClick={() => send()} disabled={loading || !input.trim()}
          style={{ padding: '8px 14px', borderRadius: '8px', background: loading ? 'var(--bg-2)' : 'var(--accent)', color: loading ? 'var(--text-2)' : '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600 }}
        >{loading ? '⏳' : 'Send'}</button>
      </div>
    </div>
  );
}


/* ════════════════════════════════════════════════════════════
   KPI Cards (view-only)
   ════════════════════════════════════════════════════════════ */
function ViewerKpis({ kpis, components }) {
  if (kpis.length === 0) return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-2)', fontSize: '13px' }}>📊 No KPI data yet</div>;
  const byComp = {};
  kpis.forEach(k => {
    const comp = components.find(c => c.kpiIds?.includes(k.id));
    const key = comp?.name || 'General';
    if (!byComp[key]) byComp[key] = { color: comp?.color || '#4865f2', kpis: [] };
    byComp[key].kpis.push(k);
  });

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
      {Object.entries(byComp).map(([name, g]) => (
        <div key={name} style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: g.color, display: 'inline-block' }} />
            {name}
          </div>
          {g.kpis.map(k => (
            <div key={k.id} style={{
              padding: '8px 10px', marginBottom: '5px', borderRadius: '8px',
              background: `${STATUS_COLORS[k.status] || '#64748b'}08`,
              border: `1px solid ${STATUS_COLORS[k.status] || '#64748b'}20`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-0)' }}>{k.name}</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: STATUS_COLORS[k.status] || '#64748b' }}>
                {typeof k.value === 'number' ? k.value.toFixed(1) : k.value} <span style={{ fontSize: '9px', fontWeight: 400 }}>{k.unit}</span>
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}


/* ════════════════════════════════════════════════════════════
   Published View — Main Export
   ════════════════════════════════════════════════════════════ */
export default function PublishedView() {
  const {
    publishedId, kpis, kpiHistory, components, connections,
    updateKpiValues, selectedDomain, setStep, twinName,
  } = useTwinStore();

  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState('kpi');
  const [cameraView, setCameraView] = useState('Isometric');

  const domain = dashboard?.domain || selectedDomain || 'factory';
  const { status: wsStatus, lastUpdate, messageCount, STATUS } = useKpiWebSocket(domain);

  // Load published dashboard config
  useEffect(() => {
    if (!publishedId) return;
    fetch(`${BASE}/publish/${publishedId}`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(data => {
        setDashboard(data);
        // Restore the frozen state into the store
        if (data.config) {
          const s = useTwinStore.getState();
          if (data.config.components) s.components = data.config.components;
          if (data.config.connections) s.connections = data.config.connections;
          if (data.config.kpis) s.kpis = data.config.kpis;
          useTwinStore.setState({
            components: data.config.components || [],
            connections: data.config.connections || [],
            kpis: data.config.kpis || [],
            selectedDomain: data.domain,
            twinName: data.name,
          });
        }
      })
      .catch(e => setError(e.message));
  }, [publishedId]);

  // Fallback simulation when WS offline
  useEffect(() => {
    if (wsStatus === STATUS.LIVE) return;
    const t = setInterval(updateKpiValues, 5000);
    return () => clearInterval(t);
  }, [wsStatus, STATUS.LIVE]);

  const critKpis = kpis.filter(k => k.status === 'red');
  const warnKpis = kpis.filter(k => k.status === 'orange');
  const name = dashboard?.name || twinName || 'Dashboard';

  if (error) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '48px' }}>❌</div>
      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-0)' }}>Dashboard not found</div>
      <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>{error}</div>
      <button className="btn btn-primary" onClick={() => setStep(0)}>← Back to Home</button>
    </div>
  );

  const TABS = [
    { id: 'kpi',    label: '📊 KPIs' },
    { id: 'charts', label: '📈 Charts' },
    { id: 'chat',   label: '🦙 AI' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-0)' }}>

      {/* ── Published banner ── */}
      <div style={{
        padding: '6px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)',
        display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>{DOMAIN_ICONS[domain] || '⬡'}</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-0)' }}>{name}</span>
          <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 700, background: 'rgba(16,217,141,0.12)', color: '#10d98d', border: '1px solid rgba(16,217,141,0.3)' }}>
            PUBLISHED{dashboard?.version ? ` v${dashboard.version}` : ''}
          </span>
        </div>

        {/* Live badge */}
        <div style={{
          fontSize: '10px', padding: '3px 10px', borderRadius: '8px', fontWeight: 600,
          background: wsStatus === 'live' ? 'rgba(16,217,141,0.1)' : 'rgba(245,158,11,0.1)',
          color: wsStatus === 'live' ? '#10d98d' : '#f59e0b',
          border: `1px solid ${wsStatus === 'live' ? '#10d98d' : '#f59e0b'}40`,
        }}>
          {wsStatus === 'live' ? `● Live · ${messageCount} readings` : wsStatus === 'connecting' ? '⏳ Connecting…' : '⚠️ Stale data'}
          {lastUpdate && wsStatus === 'live' && <span style={{ marginLeft: '6px', opacity: 0.5 }}>Updated {lastUpdate.toLocaleTimeString()}</span>}
        </div>

        {/* Alerts summary */}
        {(critKpis.length > 0 || warnKpis.length > 0) && (
          <div style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '8px', fontWeight: 600, background: critKpis.length > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', color: critKpis.length > 0 ? '#ef4444' : '#f59e0b', border: `1px solid ${critKpis.length > 0 ? '#ef4444' : '#f59e0b'}40` }}>
            🔔 {critKpis.length > 0 ? `${critKpis.length} Critical` : `${warnKpis.length} Warn`}
          </div>
        )}

        {/* Camera */}
        <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-0)', borderRadius: '8px', padding: '2px' }}>
          {['Isometric', 'Top', 'Front', 'Free'].map(v => (
            <button key={v} onClick={() => setCameraView(v)}
              style={{ padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 600, background: cameraView === v ? 'var(--accent)' : 'transparent', color: cameraView === v ? '#fff' : 'var(--text-2)' }}
            >{v}</button>
          ))}
        </div>

        <button className="btn btn-ghost" style={{ fontSize: '11px' }} onClick={() => setStep(0)}>← Home</button>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* 3D Scene */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Scene3D cameraView={cameraView.toLowerCase()} />

          {/* Stats overlay */}
          <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', flexDirection: 'column', gap: '6px', pointerEvents: 'none' }}>
            {[
              { icon: '⬡', label: 'Components', value: components.length, color: '#4865f2' },
              { icon: '✅', label: 'OK', value: kpis.filter(k => k.status === 'green').length, color: '#10d98d' },
              { icon: '⚠️', label: 'Warnings', value: warnKpis.length, color: '#f59e0b' },
              { icon: '🚨', label: 'Critical', value: critKpis.length, color: '#ef4444' },
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
        </div>

        {/* ── Right sidebar ── */}
        <div style={{ width: '310px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', background: 'var(--bg-1)', overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-0)', flexShrink: 0 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setPanel(t.id)}
                style={{ flex: 1, padding: '9px 4px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, borderBottom: `2px solid ${panel === t.id ? 'var(--accent)' : 'transparent'}`, background: 'transparent', color: panel === t.id ? 'var(--accent)' : 'var(--text-2)' }}
              >{t.label}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {panel === 'kpi' && <ViewerKpis kpis={kpis} components={components} />}
            {panel === 'charts' && <ViewerCharts kpis={kpis} kpiHistory={kpiHistory} domain={domain} />}
            {panel === 'chat' && <ViewerChat domain={domain} />}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ── Viewer Charts ──────────────────────────────────────────── */
function ViewerCharts({ kpis, kpiHistory, domain }) {
  const [chartData, setChartData] = useState([]);
  useEffect(() => {
    fetch(`${BASE}/analytics/chart-data?domain=${domain}&limit=30`)
      .then(r => r.ok ? r.json() : { rows: [] })
      .then(d => setChartData(d.rows || []))
      .catch(() => {});
    const t = setInterval(() => {
      fetch(`${BASE}/analytics/chart-data?domain=${domain}&limit=30`)
        .then(r => r.ok ? r.json() : { rows: [] })
        .then(d => setChartData(d.rows || []))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, [domain]);

  if (chartData.length === 0 && kpiHistory.length === 0) {
    return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-2)', fontSize: '13px' }}>📈 No chart data yet</div>;
  }

  const numericKeys = chartData.length > 0
    ? Object.keys(chartData[0]).filter(k => k !== 'id' && k !== 'recorded_at' && k !== 'flow_status' && typeof chartData[0][k] === 'number')
    : [];
  const CHART_COLORS = ['#4865f2', '#10d98d', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
      {numericKeys.map((key, i) => (
        <div key={key} style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{key.replace(/_/g, ' ')}</div>
          <div style={{ background: 'var(--bg-0)', borderRadius: '10px', padding: '8px', border: '1px solid var(--border)' }}>
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(72,101,242,0.06)" />
                <XAxis dataKey="recorded_at" tick={false} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '10px' }} />
                <Line dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}
