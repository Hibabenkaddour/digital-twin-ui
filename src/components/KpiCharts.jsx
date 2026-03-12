import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend } from 'recharts';
import useTwinStore from '../store/useTwinStore';

const STATUS_COLORS = { green: '#10d98d', orange: '#f59e0b', red: '#ef4444' };
const LINE_COLORS = ['#6395ff', '#10d98d', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#0d1117', border: '1px solid #1e3a5f', borderRadius: '8px', padding: '8px 12px', fontSize: '11px' }}>
            <div style={{ color: '#94a3c8', marginBottom: '4px' }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</div>
            ))}
        </div>
    );
};

export default function KpiCharts() {
    const { kpis, kpiHistory, selectedComponentId, components } = useTwinStore();

    const selectedComp = components.find(c => c.id === selectedComponentId);
    const displayKpis = selectedComp
        ? kpis.filter(k => selectedComp.kpiIds?.includes(k.id))
        : kpis;

    // Show last 20 points for cleaner chart
    const chartData = kpiHistory.slice(-20);

    if (kpis.length === 0) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-2)', fontSize: '13px' }}>
                No KPI data available. Run the demo first.
            </div>
        );
    }

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-0)' }}>
                        📈 KPI Trends
                        {selectedComp && <span style={{ color: 'var(--accent)', marginLeft: '6px' }}>— {selectedComp.name}</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>Last 20 readings · auto-update every 3s</div>
                </div>
                {selectedComp && (
                    <div style={{ fontSize: '10px', color: 'var(--text-2)', padding: '4px 8px', background: 'var(--bg-0)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        Click component in scene to filter
                    </div>
                )}
            </div>

            {/* KPI Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: '8px', flexShrink: 0 }}>
                {displayKpis.map(kpi => (
                    <div key={kpi.id} style={{ padding: '8px', background: 'var(--bg-0)', border: `1px solid ${STATUS_COLORS[kpi.status]}40`, borderRadius: '8px', borderTop: `2px solid ${STATUS_COLORS[kpi.status]}` }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-2)', marginBottom: '3px', lineHeight: 1.2 }}>{kpi.name}</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: STATUS_COLORS[kpi.status] }}>
                            {typeof kpi.value === 'number' ? kpi.value.toFixed(1) : kpi.value}
                            <span style={{ fontSize: '10px', fontWeight: 400, marginLeft: '2px', color: 'var(--text-2)' }}>{kpi.unit}</span>
                        </div>
                        <div style={{ fontSize: '9px', color: STATUS_COLORS[kpi.status], textTransform: 'uppercase', fontWeight: 600 }}>{kpi.status}</div>
                    </div>
                ))}
            </div>

            {/* Main Combined Chart */}
            <div style={{ background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', flexShrink: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '8px' }}>All KPIs Timeline</div>
                <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 4" stroke="#1e3a5f" vertical={false} />
                        <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        {kpis.map((kpi, i) => (
                            <Line
                                key={kpi.id}
                                type="monotone"
                                dataKey={kpi.id}
                                name={kpi.name}
                                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                                strokeWidth={1.5}
                                dot={false}
                                activeDot={{ r: 3 }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Individual KPI Charts */}
            {displayKpis.map((kpi, i) => {
                const color = STATUS_COLORS[kpi.status];
                const lineColor = LINE_COLORS[i % LINE_COLORS.length];
                return (
                    <div key={kpi.id} style={{ background: 'var(--bg-0)', border: `1px solid ${color}25`, borderRadius: '10px', padding: '12px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-1)' }}>{kpi.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 800, color }}>
                                    {typeof kpi.value === 'number' ? kpi.value.toFixed(1) : kpi.value} {kpi.unit}
                                </span>
                                <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '10px', background: `${color}20`, color, fontWeight: 700, textTransform: 'uppercase' }}>
                                    {kpi.status}
                                </span>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={90}>
                            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                                <defs>
                                    <linearGradient id={`grad_${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={lineColor} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="2 4" stroke="#1e3a5f" vertical={false} />
                                <XAxis dataKey="time" tick={{ fontSize: 8, fill: '#64748b' }} tickLine={false} interval={4} />
                                <YAxis tick={{ fontSize: 8, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey={kpi.id} name={kpi.name} stroke={lineColor} strokeWidth={2} fill={`url(#grad_${kpi.id})`} dot={false} activeDot={{ r: 3, fill: lineColor }} />
                                {/* Threshold lines via reference */}
                                {kpi.rules.orange && (
                                    <line x1="0%" y1={`${getYPercent(kpi.rules.orange[0], kpi)}%`} x2="100%" y2={`${getYPercent(kpi.rules.orange[0], kpi)}%`} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                        {/* Threshold legend */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                            {Object.entries(kpi.rules).map(([status, [lo, hi]]) => (
                                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: 'var(--text-2)' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: STATUS_COLORS[status] || '#888' }} />
                                    {status}: {lo}–{hi} {kpi.unit}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function getYPercent(val, kpi) {
    const allVals = Object.values(kpi.rules).flat();
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    return 100 - ((val - min) / (max - min)) * 100;
}
