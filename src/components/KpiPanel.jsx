import { useEffect, useRef } from 'react';
import { BarChart2, ThermometerSun, Zap, AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import useTwinStore from '../store/useTwinStore';

const STATUS_COLORS = { green: '#10d98d', orange: '#f59e0b', red: '#ef4444' };
const STATUS_LABELS = { green: 'NORMAL', orange: 'WARNING', red: 'CRITICAL' };

function KpiCard({ kpi }) {
    const { rules } = kpi;
    const max = rules.red?.[1] || rules.orange?.[1] || 200;
    const min = rules.green[0];
    const pct = Math.min(100, ((kpi.value - min) / (max - min)) * 100);
    const color = STATUS_COLORS[kpi.status];

    return (
        <div
            className="glass-subtle animate-fade"
            style={{
                padding: '14px',
                marginBottom: '10px',
                borderColor: kpi.status === 'red' ? 'rgba(239,68,68,0.3)' : kpi.status === 'orange' ? 'rgba(245,158,11,0.2)' : 'var(--border)',
                transition: 'border-color 0.4s ease',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {kpi.status === 'red' && (
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(239,68,68,0.03)',
                    animation: 'pulse-bg 1.2s ease-in-out infinite',
                }} />
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-2)', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '2px' }}>
                        {kpi.name}
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.01em' }}>
                        {typeof kpi.value === 'number' ? kpi.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : kpi.value}
                        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-2)', marginLeft: '3px' }}>{kpi.unit}</span>
                    </div>
                </div>
                <span className={`badge badge-${kpi.status}`}>
                    <span className={`dot dot-${kpi.status}`} />
                    {STATUS_LABELS[kpi.status]}
                </span>
            </div>

            {/* Progress bar */}
            <div className="progress-wrap">
                <div
                    className={`progress-bar progress-${kpi.status}`}
                    style={{ width: `${Math.max(2, pct)}%`, transition: 'width 0.6s ease' }}
                />
            </div>

            {/* Thresholds */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: 'var(--text-2)' }}>
                <span style={{ color: '#10d98d' }}>▲ {rules.green.join('-')}</span>
                {rules.orange && <span style={{ color: '#f59e0b' }}>~ {rules.orange.join('-')}</span>}
                {rules.red && <span style={{ color: '#ef4444' }}>⚠ {rules.red[0]}+</span>}
            </div>
        </div>
    );
}

function ComponentDetailPanel({ component, kpis }) {
    const compKpis = kpis.filter(k => component.kpiIds?.includes(k.id));

    return (
        <div className="animate-slide">
            {/* Component header */}
            <div style={{
                padding: '14px',
                background: 'linear-gradient(135deg, rgba(99,149,255,0.1), rgba(139,92,246,0.05))',
                border: '1px solid rgba(99,149,255,0.2)',
                borderRadius: '10px',
                marginBottom: '14px',
            }}>
                <div style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '4px', letterSpacing: '0.06em', fontWeight: 600 }}>
                    SELECTED COMPONENT
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-0)', marginBottom: '4px' }}>
                    {component.name}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="tag">{component.type.replace(/_/g, ' ')}</span>
                    <span className="tag">Grid {component.gridSize.join('×')}</span>
                    <span className="tag">({component.col},{component.row})</span>
                </div>
            </div>

            {/* KPIs for this component */}
            {compKpis.length > 0 && (
                <>
                    <div className="label" style={{ marginBottom: '8px' }}>KPIs</div>
                    {compKpis.map(kpi => <KpiCard key={kpi.id} kpi={kpi} />)}
                </>
            )}
        </div>
    );
}

export default function KpiPanel() {
    const { kpis, components, selectedComponentId, sidebarOpen } = useTwinStore();

    const selectedComp = components.find(c => c.id === selectedComponentId);

    const alertCount = kpis.filter(k => k.status !== 'green').length;
    const criticalCount = kpis.filter(k => k.status === 'red').length;

    const panelRef = useRef();

    return (
        <div
            ref={panelRef}
            style={{
                width: sidebarOpen ? '300px' : '0px',
                minWidth: sidebarOpen ? '300px' : '0px',
                height: '100%',
                transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(7,10,20,0.95)',
                backdropFilter: 'blur(20px)',
                borderLeft: '1px solid var(--border)',
            }}
        >
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                {/* Alerts summary header */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <Activity size={16} color="var(--accent)" />
                        <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-0)' }}>
                            KPI Monitor
                        </span>
                    </div>

                    {/* Summary badges */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{
                            flex: 1, padding: '10px', borderRadius: '8px',
                            background: 'rgba(16,217,141,0.08)', border: '1px solid rgba(16,217,141,0.2)',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#10d98d' }}>
                                {kpis.filter(k => k.status === 'green').length}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-2)', fontWeight: 600 }}>NORMAL</div>
                        </div>
                        <div style={{
                            flex: 1, padding: '10px', borderRadius: '8px',
                            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b' }}>
                                {kpis.filter(k => k.status === 'orange').length}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-2)', fontWeight: 600 }}>WARNING</div>
                        </div>
                        <div style={{
                            flex: 1, padding: '10px', borderRadius: '8px',
                            background: criticalCount > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
                            border: criticalCount > 0 ? '1px solid rgba(239,68,68,0.25)' : '1px solid var(--border)',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: criticalCount > 0 ? '#ef4444' : 'var(--text-2)' }}>
                                {criticalCount}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-2)', fontWeight: 600 }}>CRITICAL</div>
                        </div>
                    </div>
                </div>

                <div className="divider" />

                {/* Component detail or all KPIs */}
                {selectedComp ? (
                    <ComponentDetailPanel component={selectedComp} kpis={kpis} />
                ) : (
                    <>
                        <div className="label" style={{ marginBottom: '10px' }}>All KPIs</div>
                        {kpis.map(kpi => <KpiCard key={kpi.id} kpi={kpi} />)}
                    </>
                )}
            </div>

            <style>{`
        @keyframes pulse-bg {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
        </div>
    );
}
