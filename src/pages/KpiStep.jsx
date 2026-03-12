import { useState } from 'react';
import useTwinStore from '../store/useTwinStore';
import { ChevronRight, ArrowLeft, Database, Globe, Cpu, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

const ADAPTER_TYPES = [
    { id: 'sql', label: 'SQL Database', icon: <Database size={18} />, color: '#6395ff', desc: 'PostgreSQL, MySQL, etc.', badge: 'Ready' },
    { id: 'rest', label: 'REST API', icon: <Globe size={18} />, color: '#10d98d', desc: 'HTTP endpoints + JSON mapping', badge: 'Ready' },
    { id: 'sim', label: 'Simulation', icon: <Cpu size={18} />, color: '#8b5cf6', desc: 'Realistic random data for demos', badge: 'Active' },
    { id: 'mqtt', label: 'MQTT / IoT', icon: '📡', color: '#f59e0b', desc: 'Real-time IoT sensor streams', badge: 'Custom' },
    { id: 'sap', label: 'SAP / ERP', icon: '🏢', color: '#ef4444', desc: 'SAP, MindSphere adapters', badge: 'Custom' },
];

const STATUS_COLORS = { green: '#10d98d', orange: '#f59e0b', red: '#ef4444' };
const STATUS_LABELS = { green: 'Normal', orange: 'Warning', red: 'Critical' };

export default function KpiStep() {
    const { setStep, kpis } = useTwinStore();
    const [selectedAdapter, setSelectedAdapter] = useState('sim');
    const [editingKpi, setEditingKpi] = useState(null);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '340px 1fr', overflow: 'hidden' }}>

                {/* Left — data adapters */}
                <div style={{
                    borderRight: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    background: 'rgba(7,10,20,0.85)',
                }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <Database size={15} color="var(--accent)" />
                            <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em' }}>Data Adapters</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                            The 3D engine consumes one standard KPI format. All sources are normalized before rendering.
                        </p>
                    </div>

                    <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                        {ADAPTER_TYPES.map(adapter => (
                            <button
                                key={adapter.id}
                                onClick={() => setSelectedAdapter(adapter.id)}
                                style={{
                                    width: '100%', padding: '14px', borderRadius: '10px', marginBottom: '8px',
                                    border: selectedAdapter === adapter.id ? `1.5px solid ${adapter.color}55` : '1px solid var(--border)',
                                    background: selectedAdapter === adapter.id ? `rgba(${hexToRgb(adapter.color)},0.08)` : 'var(--bg-3)',
                                    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '8px',
                                    background: `rgba(${hexToRgb(adapter.color)},0.15)`,
                                    border: `1px solid rgba(${hexToRgb(adapter.color)},0.3)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: adapter.color, fontSize: '18px', flexShrink: 0,
                                }}>
                                    {adapter.icon}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        {adapter.label}
                                        <span style={{
                                            fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '100px',
                                            background: adapter.badge === 'Active' ? 'rgba(16,217,141,0.15)' : adapter.badge === 'Ready' ? 'rgba(99,149,255,0.15)' : 'rgba(245,158,11,0.15)',
                                            color: adapter.badge === 'Active' ? '#10d98d' : adapter.badge === 'Ready' ? 'var(--accent)' : '#f59e0b',
                                        }}>
                                            {adapter.badge}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>{adapter.desc}</div>
                                </div>
                            </button>
                        ))}

                        {/* Standard format preview */}
                        <div style={{ marginTop: '16px', padding: '14px', borderRadius: '10px', background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-2)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: '10px' }}>
                                STANDARD KPI PAYLOAD
                            </div>
                            <pre style={{
                                fontSize: '11px', color: '#94a3c8', background: 'var(--bg-1)',
                                borderRadius: '8px', padding: '12px', lineHeight: 1.6, overflowX: 'auto',
                                border: '1px solid var(--border)',
                            }}>
                                {`{
  "kpi_id": "temp_presse_1",
  "value": 72.5,
  "timestamp": "2026-03-11T14:30:00Z",
  "status": "orange"
}`}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Right — KPI configuration */}
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-1)' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={14} color="var(--accent)" />
                        <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em' }}>KPI Configuration</span>
                        <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>
                            AI Recommended
                        </span>
                    </div>

                    <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                            {kpis.map((kpi) => (
                                <div
                                    key={kpi.id}
                                    className="glass-subtle"
                                    onClick={() => setEditingKpi(editingKpi === kpi.id ? null : kpi.id)}
                                    style={{
                                        padding: '16px', cursor: 'pointer',
                                        borderColor: editingKpi === kpi.id ? 'var(--border-glow)' : 'var(--border)',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {/* Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <div>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-0)', marginBottom: '3px' }}>
                                                {kpi.name}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                                                {kpi.id}
                                            </div>
                                        </div>
                                        <CheckCircle2 size={16} color="#10d98d" />
                                    </div>

                                    {/* Current value */}
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '10px', borderRadius: '8px', background: 'var(--bg-3)', marginBottom: '10px',
                                    }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>Current</span>
                                        <span style={{ fontSize: '18px', fontWeight: 800, color: STATUS_COLORS[kpi.status] }}>
                                            {kpi.value} {kpi.unit}
                                        </span>
                                        <span className={`badge badge-${kpi.status}`}>
                                            {STATUS_LABELS[kpi.status]}
                                        </span>
                                    </div>

                                    {/* Threshold rules */}
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {[
                                            { color: '#10d98d', label: '●', range: kpi.rules.green },
                                            { color: '#f59e0b', label: '●', range: kpi.rules.orange },
                                            { color: '#ef4444', label: '●', range: kpi.rules.red },
                                        ].filter(r => r.range).map((rule, i) => (
                                            <div key={i} style={{
                                                flex: 1, padding: '6px 8px', borderRadius: '6px',
                                                background: 'var(--bg-4)', fontSize: '10px', textAlign: 'center',
                                            }}>
                                                <div style={{ color: rule.color, fontWeight: 700, marginBottom: '2px' }}>{rule.label}</div>
                                                <div style={{ color: 'var(--text-2)' }}>{rule.range.join(' – ')}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Source info */}
                                    <div style={{
                                        marginTop: '10px', padding: '6px 10px', borderRadius: '6px',
                                        background: 'var(--bg-4)', display: 'flex', gap: '6px', alignItems: 'center',
                                        fontSize: '10px', color: 'var(--text-2)',
                                    }}>
                                        <span style={{ color: 'var(--accent)' }}>⬤</span>
                                        Simulation Adapter · refresh 5s
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', padding: '12px 20px',
                borderTop: '1px solid var(--border)', background: 'rgba(7,10,20,0.8)',
                backdropFilter: 'blur(10px)', flexShrink: 0,
            }}>
                <button className="btn btn-ghost" onClick={() => setStep(3)}>
                    <ArrowLeft size={16} /> Back
                </button>
                <button className="btn btn-primary btn-lg" onClick={() => setStep(5)}>
                    Launch Digital Twin <ChevronRight size={16} />
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
