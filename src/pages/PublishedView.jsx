/**
 * PublishedView.jsx
 * ─────────────────
 * Standalone published dashboard viewer — accessed via /view/:pubId
 * This is what employees see when a manager shares a link.
 *
 * Features:
 *  ✅ Loads frozen config (components, connections, KPIs) from API
 *  ✅ Real-time data via WebSocket (useKpiWebSocket)
 *  ✅ NLQ Chat powered by Groq (same /nlq/ask endpoint)
 *  ✅ Charts from live PostgreSQL data
 *  ✅ Interactive 3D Digital Twin (Scene3D)
 *  ✅ Read-only — no editing, no admin controls
 */
import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
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
const CHART_COLORS = ['#4865f2', '#10d98d', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];


/* ════════════════════════════════════════════════════════════
   NLQ Chat (Groq — reused from TwinView)
   ════════════════════════════════════════════════════════════ */
function ViewerChat({ domain }) {
  const [messages, setMessages] = useState([
    { id: 0, role: 'assistant', text: '👋 **Analytics AI** powered by Groq\n\nAsk anything about the live data — I\'ll analyze and generate charts.\n\nTry a suggestion below.' }
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
  if (kpis.length === 0) return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-2)', fontSize: '13px' }}>📊 Waiting for live data…</div>;
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
   Charts Panel (live data from /analytics/chart-data)
   ════════════════════════════════════════════════════════════ */
function ViewerCharts({ domain }) {
  const [chartData, setChartData] = useState([]);

  const fetchCharts = () => {
    fetch(`${BASE}/analytics/chart-data?domain=${domain}&limit=30`)
      .then(r => r.ok ? r.json() : { rows: [] })
      .then(d => setChartData(d.rows || []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchCharts();
    const t = setInterval(fetchCharts, 30000);
    return () => clearInterval(t);
  }, [domain]);

  if (chartData.length === 0) {
    return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-2)', fontSize: '13px' }}>📈 Waiting for chart data…</div>;
  }

  const numericKeys = Object.keys(chartData[0]).filter(k =>
    k !== 'id' && k !== 'recorded_at' && k !== 'flow_status' && typeof chartData[0][k] === 'number'
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
      {numericKeys.map((key, i) => (
        <div key={key} style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            {key.replace(/_/g, ' ')}
          </div>
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


/* ════════════════════════════════════════════════════════════
   PublishedView — Main Export (standalone, URL-routed)
   ════════════════════════════════════════════════════════════ */
export default function PublishedView() {
  const { pubId } = useParams();  // ← from URL: /view/:pubId
  const { updateKpiValues } = useTwinStore();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState('kpi');
  const [cameraView, setCameraView] = useState('Isometric');

  // Local state for the frozen config (not stored in Zustand)
  const [components, setComponents] = useState([]);
  const [connections, setConnections] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [domain, setDomain] = useState('factory');

  // Load published dashboard from API
  useEffect(() => {
    if (!pubId) return;
    setLoading(true);
    fetch(`${BASE}/publish/${pubId}`)
      .then(r => { if (!r.ok) throw new Error('Dashboard not found'); return r.json(); })
      .then(data => {
        setDashboard(data);
        setDomain(data.domain || 'factory');
        if (data.config) {
          setComponents(data.config.components || []);
          setConnections(data.config.connections || []);
          setKpis(data.config.kpis || []);
          // Also push to Zustand so Scene3D and useKpiWebSocket can read them
          useTwinStore.setState({
            components: data.config.components || [],
            connections: data.config.connections || [],
            kpis: data.config.kpis || [],
            selectedDomain: data.domain || 'factory',
            twinName: data.name,
            gridCols: data.config.gridCols || 10,
            gridRows: data.config.gridRows || 7,
            cellSize: data.config.cellSize || 6,
            width: data.config.width || 60,
            length: data.config.length || 40,
          });
        }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [pubId]);

  // Real-time data via WebSocket
  const { status: wsStatus, lastUpdate, messageCount, STATUS } = useKpiWebSocket(domain);

  // Read KPIs from store (WebSocket updates them there)
  const storeKpis = useTwinStore(s => s.kpis);
  const storeComponents = useTwinStore(s => s.components);

  // Fallback simulation when WS offline
  useEffect(() => {
    if (wsStatus === STATUS.LIVE) return;
    const t = setInterval(updateKpiValues, 5000);
    return () => clearInterval(t);
  }, [wsStatus, STATUS.LIVE]);

  const critKpis = storeKpis.filter(k => k.status === 'red');
  const warnKpis = storeKpis.filter(k => k.status === 'orange');

  // Loading state
  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '40px', animation: 'spin 1s linear infinite' }}>⬡</div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-0)' }}>Loading dashboard…</div>
    </div>
  );

  // Error state
  if (error) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '48px' }}>❌</div>
      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-0)' }}>Dashboard not found</div>
      <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>{error}</div>
      <Link to="/" style={{ padding: '8px 20px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
        ← Back to Home
      </Link>
    </div>
  );

  const TABS = [
    { id: 'kpi',    label: '📊 KPIs' },
    { id: 'charts', label: '📈 Charts' },
    { id: 'chat',   label: '🦙 AI' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-0)' }}>

      {/* ── Toolbar ── */}
      <div style={{
        padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)',
        display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap',
      }}>
        {/* Dashboard identity */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>{DOMAIN_ICONS[domain] || '⬡'}</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-0)', lineHeight: 1.2 }}>
              {dashboard?.name || 'Dashboard'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {domain} · v{dashboard?.version || 1}
              <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 700, background: 'rgba(16,217,141,0.12)', color: '#10d98d', border: '1px solid rgba(16,217,141,0.3)' }}>
                LIVE
              </span>
            </div>
          </div>
        </div>

        {/* Real-time status badge */}
        <div style={{
          fontSize: '10px', padding: '4px 12px', borderRadius: '8px', fontWeight: 600,
          background: wsStatus === 'live' ? 'rgba(16,217,141,0.1)' : 'rgba(245,158,11,0.1)',
          color: wsStatus === 'live' ? '#10d98d' : '#f59e0b',
          border: `1px solid ${wsStatus === 'live' ? '#10d98d' : '#f59e0b'}40`,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: wsStatus === 'live' ? '#10d98d' : '#f59e0b', animation: wsStatus === 'live' ? 'pulse-dot 1.5s infinite' : 'none' }} />
          {wsStatus === 'live' ? `Real-time · ${messageCount} readings` : wsStatus === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
          {lastUpdate && wsStatus === 'live' && <span style={{ opacity: 0.5 }}>{lastUpdate.toLocaleTimeString()}</span>}
        </div>

        {/* Alerts */}
        {(critKpis.length > 0 || warnKpis.length > 0) && (
          <div style={{ fontSize: '10px', padding: '4px 12px', borderRadius: '8px', fontWeight: 600, background: critKpis.length > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', color: critKpis.length > 0 ? '#ef4444' : '#f59e0b', border: `1px solid ${critKpis.length > 0 ? '#ef4444' : '#f59e0b'}40` }}>
            🔔 {critKpis.length > 0 ? `${critKpis.length} Critical` : `${warnKpis.length} Warn`}
          </div>
        )}

        {/* Camera controls */}
        <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-0)', borderRadius: '8px', padding: '2px' }}>
          {['Isometric', 'Top', 'Front', 'Free'].map(v => (
            <button key={v} onClick={() => setCameraView(v)}
              style={{ padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 600, transition: 'all 0.15s', background: cameraView === v ? 'var(--accent)' : 'transparent', color: cameraView === v ? '#fff' : 'var(--text-2)' }}
            >{v}</button>
          ))}
        </div>

        {/* Powered by badge */}
        <div style={{ fontSize: '9px', color: 'var(--text-2)', padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-2)', fontWeight: 600 }}>
          ⬡ Digital Twin Platform
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* 3D Scene */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Scene3D cameraView={cameraView.toLowerCase()} />

          {/* Stats overlay */}
          <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', flexDirection: 'column', gap: '6px', pointerEvents: 'none' }}>
            {[
              { icon: '⬡', label: 'Components', value: storeComponents.length, color: '#4865f2' },
              { icon: '✅', label: 'OK', value: storeKpis.filter(k => k.status === 'green').length, color: '#10d98d' },
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

        {/* ── Right sidebar (KPIs / Charts / NLQ AI) ── */}
        <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', background: 'var(--bg-1)', overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-0)', flexShrink: 0 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setPanel(t.id)}
                style={{ flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, transition: 'all 0.15s', borderBottom: `2px solid ${panel === t.id ? 'var(--accent)' : 'transparent'}`, background: 'transparent', color: panel === t.id ? 'var(--accent)' : 'var(--text-2)' }}
              >{t.label}</button>
            ))}
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {panel === 'kpi'    && <ViewerKpis kpis={storeKpis} components={storeComponents} />}
            {panel === 'charts' && <ViewerCharts domain={domain} />}
            {panel === 'chat'   && <ViewerChat domain={domain} />}
          </div>
        </div>
      </div>
    </div>
  );
}
