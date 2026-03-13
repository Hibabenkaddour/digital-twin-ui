import { useState } from 'react';
import useTwinStore from '../store/useTwinStore';
import KpiImport from './KpiImport';

const STATUS_COLORS = { green: '#10d98d', orange: '#f59e0b', red: '#ef4444' };
const STATUS_LABELS = { green: 'NORMAL', orange: 'WARNING', red: 'CRITICAL' };

export default function KpiPanel() {
  const { kpis, components, selectedComponentId, selectComponent } = useTwinStore();
  const [importTarget, setImportTarget] = useState(null); // component to import for
  const [filter, setFilter] = useState('all'); // all | critical | warning | normal
  const [search, setSearch] = useState('');

  const selectedComp = components.find(c => c.id === selectedComponentId);
  const displayKpis = selectedComp
    ? kpis.filter(k => selectedComp.kpiIds?.includes(k.id))
    : kpis;

  const filteredKpis = displayKpis.filter(k => {
    const matchFilter = filter === 'all' || k.status === filter;
    const matchSearch = !search || k.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const critCount = kpis.filter(k => k.status === 'red').length;
  const warnCount = kpis.filter(k => k.status === 'orange').length;
  const okCount   = kpis.filter(k => k.status === 'green').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-1)' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-0)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>📊 KPI Monitor</span>
          {selectedComp && (
            <span style={{ fontSize: '10px', color: 'var(--text-2)', fontWeight: 400 }}>{selectedComp.name}</span>
          )}
        </div>

        {/* Summary badges */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '8px' }}>
          {[['green', okCount, 'Normal'], ['orange', warnCount, 'Warning'], ['red', critCount, 'Critical']].map(([status, count, label]) => (
            <div key={status} onClick={() => setFilter(filter === status ? 'all' : status)}
              style={{ padding: '6px', textAlign: 'center', border: `1px solid ${STATUS_COLORS[status]}${filter === status ? '80' : '30'}`, borderRadius: '8px', background: `${STATUS_COLORS[status]}${filter === status ? '20' : '10'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: STATUS_COLORS[status], lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search KPIs..."
          style={{ width: '100%', background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 10px', color: 'var(--text-0)', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {/* Selected component info */}
      {selectedComp && (
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'rgba(99,149,255,0.04)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>{selectedComp.name}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-2)' }}>{selectedComp.type.replace(/_/g,' ')} · grid {selectedComp.gridSize?.join('×')}</div>
            </div>
            <button onClick={() => setImportTarget(selectedComp)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 11px', borderRadius: '8px', background: 'linear-gradient(135deg,#6395ff,#8b5cf6)', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
              📥 Import Data
            </button>
          </div>
        </div>
      )}

      {/* KPI list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {filteredKpis.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-2)', fontSize: '12px' }}>
            {kpis.length === 0 ? 'No KPI data. Import via "📥 Import Data" or run the demo.' : 'No KPIs match filter.'}
          </div>
        ) : (
          filteredKpis.map(kpi => {
            const color = STATUS_COLORS[kpi.status];
            const compNames = components.filter(c => c.kpiIds?.includes(kpi.id)).map(c => c.name);
            return (
              <div key={kpi.id}
                style={{ marginBottom: '8px', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-0)', border: `1px solid ${color}25`, borderLeft: `3px solid ${color}`, position: 'relative', overflow: 'hidden' }}>
                {kpi.status === 'red' && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.04)', animation: 'pulse-kpi 1.5s ease-in-out infinite' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-0)' }}>{kpi.name}</div>
                    {compNames.length > 0 && (
                      <div style={{ fontSize: '9px', color: 'var(--text-2)', marginTop: '1px' }}>{compNames.join(', ')}</div>
                    )}
                  </div>
                  <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '10px', background: `${color}20`, color, fontWeight: 700, flexShrink: 0, border: `1px solid ${color}40` }}>
                    {STATUS_LABELS[kpi.status]}
                  </span>
                </div>
                {/* Value */}
                <div style={{ fontSize: '22px', fontWeight: 800, color, lineHeight: 1, marginBottom: '6px' }}>
                  {typeof kpi.value === 'number' ? kpi.value.toFixed(1) : kpi.value}
                  <span style={{ fontSize: '12px', fontWeight: 400, marginLeft: '4px', color: 'var(--text-2)' }}>{kpi.unit}</span>
                </div>
                {/* Threshold bar */}
                {kpi.rules && (
                  <div style={{ marginBottom: '4px' }}>
                    <KpiBar value={kpi.value} rules={kpi.rules} color={color} />
                  </div>
                )}
                {/* Threshold legend */}
                {kpi.rules && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {Object.entries(kpi.rules).map(([s, [lo, hi]]) => (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: 'var(--text-2)' }}>
                        <div style={{ width: '7px', height: '7px', borderRadius: '1px', background: STATUS_COLORS[s] }} />
                        {lo}–{hi} {kpi.unit}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Import buttons for all components when nothing selected */}
        {!selectedComp && components.length > 0 && (
          <div style={{ marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-2)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Import Data Per Component</div>
            {components.map(comp => (
              <button key={comp.id} onClick={() => setImportTarget(comp)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '7px 10px', marginBottom: '4px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-0)', color: 'var(--text-1)', fontSize: '11px', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,149,255,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-0)'}>
                <span>{comp.name}</span>
                <span style={{ fontSize: '10px', color: 'var(--accent)' }}>📥 Import</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPI Import Modal */}
      {importTarget && (
        <KpiImport
          component={importTarget}
          onClose={() => setImportTarget(null)}
          onImported={({ kpiName, rowsImported }) => {
            console.log(`Imported ${rowsImported} rows for KPI: ${kpiName}`);
            setImportTarget(null);
          }}
        />
      )}

      <style>{`@keyframes pulse-kpi{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}

function KpiBar({ value, rules, color }) {
  const allVals = Object.values(rules).flat();
  const min = Math.min(...allVals, 0);
  const max = Math.max(...allVals, value);
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return (
    <div style={{ height: '4px', background: 'var(--bg-1)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.5s ease' }} />
    </div>
  );
}
