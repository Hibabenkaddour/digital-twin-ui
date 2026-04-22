import { useState, useEffect } from 'react';
import useTwinStore, { DOMAINS } from '../store/useTwinStore';
import { Play, Layers, Sparkles, Clock, Trash2, ArrowRight, Database } from 'lucide-react';

const DOMAIN_ICONS  = { factory: '🏭', airport: '✈️', warehouse: '📦' };
const DOMAIN_COLORS = { factory: '#f97316', airport: '#06b6d4', warehouse: '#84cc16' };
const DOMAIN_DESCS  = {
  factory:   'Monitor production lines, machines & manufacturing flows in real time',
  airport:   'Track terminals, gates, runways & passenger flows with live KPIs',
  warehouse: 'Manage racks, picking zones, docks & logistics flows efficiently',
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function HomePage() {
  const { setStep, loadDemo, twins, savedSessions, loadSession, deleteSession, viewPublished } = useTwinStore();
  const [published, setPublished] = useState([]);
  const BASE = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    fetch(`${BASE}/publish/list`)
      .then(r => r.ok ? r.json() : { dashboards: [] })
      .then(d => setPublished(d.dashboards || []))
      .catch(() => {});
  }, []);

  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

      {/* ── Hero ── */}
      <div style={{
        padding: '80px 60px 60px',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(72,101,242,0.08) 0%, transparent 70%)',
        borderBottom: '1px solid var(--border)',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <span className="badge badge-blue" style={{ padding: '6px 16px', fontSize: '12px' }}>
            <Sparkles size={12} />
            Nexus 3D · Digital Twin Platform
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(36px,5vw,64px)', fontWeight: 900, lineHeight: 1.05,
          letterSpacing: '-0.03em', marginBottom: '20px',
          background: 'linear-gradient(135deg, #1e293b 0%, #4865f2 50%, #f4723e 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          3D Digital Twin<br />Platform
        </h1>

        <p style={{ fontSize: '18px', color: 'var(--text-1)', maxWidth: '540px', margin: '0 auto 40px', lineHeight: 1.6 }}>
          Create agnostic real-time 3D digital twins for factories, airports and
          warehouses — with live KPI monitoring and AI-assisted placement.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" onClick={() => setStep(1)}>
            <Play size={18} /> Create New Twin
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => setStep(6)} style={{ borderColor: 'rgba(16,217,141,0.4)', color: '#10d98d' }}>
            <Database size={18} /> Connect Data Source
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => { loadDemo(); setStep(5); }}>
            <Layers size={18} /> View Live Demo
          </button>
        </div>
      </div>

      {/* ── Recent Twins (saved sessions) ── */}
      {savedSessions.length > 0 && (
        <div style={{ padding: '40px 60px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <Clock size={14} color="var(--accent)" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Recent Twins — continue where you left off
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px', marginBottom: '40px' }}>
            {savedSessions.map(session => {
              const dc = DOMAIN_COLORS[session.domain] || '#4865f2';
              return (
                <div
                  key={session.id}
                  className="glass"
                  style={{
                    padding: '18px 20px', borderRadius: '14px', position: 'relative',
                    border: `1px solid ${dc}30`,
                    background: `linear-gradient(135deg, rgba(255,255,255,0.85), ${dc}08)`,
                    transition: 'all 0.22s ease', cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${dc}22`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                  onClick={() => loadSession(session.id)}
                >
                  {/* Delete */}
                  <button
                    onClick={e => { e.stopPropagation(); deleteSession(session.id); }}
                    style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: 'var(--text-2)', opacity: 0.45, borderRadius: '5px' }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = 0.45; e.currentTarget.style.color = 'var(--text-2)'; }}
                    title="Remove"
                  >
                    <Trash2 size={12} />
                  </button>

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '26px' }}>{DOMAIN_ICONS[session.domain] || '⬡'}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-0)', lineHeight: 1.2 }}>{session.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-2)', marginTop: '2px' }}>
                        {session.domain} · {timeAgo(session.savedAt)}
                      </div>
                    </div>
                  </div>

                  {/* Stats pills */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {[
                      { label: `${session.stats?.components ?? 0} components`, color: '#4865f2' },
                      { label: `${session.stats?.connections ?? 0} connections`, color: '#10d98d' },
                      { label: `${session.stats?.kpis ?? 0} KPIs`, color: dc },
                    ].map(p => (
                      <span key={p.label} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '8px', background: `${p.color}15`, color: p.color, fontWeight: 600, border: `1px solid ${p.color}25` }}>
                        {p.label}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: dc }}>
                    <ArrowRight size={13} /> Open Live View
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ height: '1px', background: 'var(--border)' }} />
        </div>
      )}

      {/* ── Published Dashboards ── */}
      {published.length > 0 && (
        <div style={{ padding: '40px 60px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <span style={{ fontSize: '14px' }}>🚀</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Published Dashboards — Live Interactive Views
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px', marginBottom: '40px' }}>
            {published.map(pub => {
              const dc = DOMAIN_COLORS[pub.domain] || '#10d98d';
              return (
                <div key={pub.id}
                  className="glass"
                  style={{
                    padding: '18px 20px', borderRadius: '14px', position: 'relative',
                    border: `1px solid ${dc}30`,
                    background: `linear-gradient(135deg, rgba(255,255,255,0.85), ${dc}08)`,
                    transition: 'all 0.22s ease', cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${dc}22`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                  onClick={() => viewPublished(pub.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '26px' }}>{DOMAIN_ICONS[pub.domain] || '📊'}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-0)', lineHeight: 1.2 }}>{pub.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-2)', marginTop: '2px' }}>{pub.domain} · v{pub.version}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '8px', background: 'rgba(16,217,141,0.12)', color: '#10d98d', fontWeight: 700, border: '1px solid rgba(16,217,141,0.25)' }}>PUBLISHED</span>
                    <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '8px', background: `${dc}15`, color: dc, fontWeight: 600, border: `1px solid ${dc}25` }}>{pub.access_type}</span>
                    <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '8px', background: 'rgba(72,101,242,0.1)', color: 'var(--accent)', fontWeight: 600 }}>{timeAgo(pub.updated_at)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: dc }}>
                    <ArrowRight size={13} /> View Dashboard
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ height: '1px', background: 'var(--border)' }} />
        </div>
      )}

      {/* ── Domain cards ── */}
      <div style={{ padding: '48px 60px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '24px' }}>
          Supported Domains
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px', marginBottom: '48px' }}>
          {Object.entries(DOMAINS).map(([key, domain]) => (
            <button
              key={key}
              onClick={() => setStep(1)}
              className="glass"
              style={{
                padding: '28px', textAlign: 'left', cursor: 'pointer',
                border: '1px solid var(--border)', borderRadius: '16px',
                background: 'rgba(255,255,255,0.5)',
                transition: 'all 0.25s ease', position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = domain.color + '55';
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = `0 8px 32px ${domain.color}22`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', background: `radial-gradient(circle at top right, ${domain.color}22, transparent)`, borderRadius: '0 0 0 80px' }} />
              <div style={{ fontSize: '36px', marginBottom: '14px' }}>{DOMAIN_ICONS[key]}</div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-0)', marginBottom: '8px' }}>{domain.label}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-1)', lineHeight: 1.5, marginBottom: '16px' }}>{DOMAIN_DESCS[key]}</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {domain.components.slice(0, 3).map(c => (
                  <span key={c.type} className="tag" style={{ fontSize: '10px' }}>{c.name}</span>
                ))}
                <span className="tag" style={{ fontSize: '10px' }}>+{Math.max(0, domain.components.length - 3)} more</span>
              </div>
            </button>
          ))}
        </div>

        {/* Feature pills */}
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '20px' }}>
          Platform Features
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            '🎯 Drag & Drop Placement', '🤖 AI-Assisted Prompts',
            '📊 Real-Time KPI Monitoring', '🔗 Component Connections',
            '⚡ Live PostgreSQL Data', '📐 Blueprint Catalog',
            '💾 Session Save & Restore', '🎨 3D Visualization',
            '🚀 Publish & Share', '🦙 NLQ Analytics (Groq)',
          ].map(f => (
            <span key={f} className="glass-subtle" style={{ padding: '8px 16px', fontSize: '13px', color: 'var(--text-1)', borderRadius: '100px' }}>
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Legacy twins list */}
      {twins.length > 0 && (
        <div style={{ padding: '0 60px 48px' }}>
          <div className="divider" />
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px', marginTop: '16px' }}>
            Your Twins
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {twins.map(twin => (
              <div key={twin.id} className="glass-subtle" style={{ padding: '16px', cursor: 'pointer' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{DOMAIN_ICONS[twin.domain]}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-0)', marginBottom: '4px' }}>{twin.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>{twin.width}m × {twin.length}m</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
