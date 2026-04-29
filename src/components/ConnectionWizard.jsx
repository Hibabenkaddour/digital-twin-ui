/**
 * ConnectionWizard — unified single-source database setup panel.
 * Replaces the old per-component KPI import.
 *
 * Steps:
 *   1. Connect to PostgreSQL Database
 *   2. Discover tables & select one
 *   3. Assign each column to a component
 *   4. Save → WebSocket starts streaming real data to the plan
 */
import { useState, useEffect } from 'react';
import useTwinStore from '../store/useTwinStore';
import { connectTelemetryDb, selectTelemetryTable, getTelemetrySchema, saveTelemetryAssignments, disconnectTelemetry, getTelemetryStatus } from '../services/api';

export default function ConnectionWizard() {
  const { components, selectedDomain } = useTwinStore();

  const [step, setStep] = useState('connect');  // connect | assign | live
  const [dbUrl, setDbUrl] = useState('postgresql://postgres:postgrespassword@localhost:5432/digital_twin');
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [schema, setSchema] = useState(null);  // { columns, assignments, streaming }
  const [assignments, setAssignments] = useState({});  // { colName: { component_id, kpi_name, unit, rules } }
  const [sourceStatus, setSourceStatus] = useState(null);

  // Load current source status on mount
  useEffect(() => {
    getTelemetryStatus().then(s => {
      setSourceStatus(s);
      if (s.connected) {
        getTelemetrySchema().then(sch => {
          setSchema(sch);
          setAssignments(
            Object.fromEntries(
              Object.entries(sch.assignments || {}).map(([col, a]) => [col, a])
            )
          );
          setStep(sch.streaming ? 'live' : 'assign');
        });
      }
    }).catch(() => {});
  }, []);

  const handleConnect = async () => {
    if (!dbUrl) return;
    setLoading(true); setError('');
    try {
      const data = await connectTelemetryDb(dbUrl);
      setTables(data.tables || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTable = async (t) => {
    if (!t) return;
    setLoading(true); setError('');
    try {
      await selectTelemetryTable(t);
      setSelectedTable(t);
      const sch = await getTelemetrySchema();
      setSchema(sch);
      
      const init = {};
      sch.columns.forEach(col => { init[col] = { component_id: '', kpi_name: formatColName(col), unit: guessUnit(col), rules: {} }; });
      setAssignments(init);
      
      setStep('assign');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true); setError('');
    try {
      const assigned = Object.entries(assignments)
        .filter(([_, a]) => a.component_id && a.kpi_name)
        .map(([col, a]) => ({
          kpi_id: col, // Using column name as kpi_id for DB streaming
          component_id: a.component_id,
          kpi_name: a.kpi_name,
          formula: col, // The formula is just the column name to extract it
          unit: a.unit || '',
          rules: a.rules || {},
          interaction: 'pulse'
        }));

      if (assigned.length === 0) { setError('Please assign at least one column to a component.'); setLoading(false); return; }

      await saveTelemetryAssignments(selectedDomain, assigned);
      setStep('live');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectTelemetry();
    setStep('connect'); setSchema(null); setAssignments({}); setTables([]); setSelectedTable('');
  };

  const assignedCount = Object.values(assignments).filter(a => a.component_id && a.kpi_name).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-1)', overflow: 'hidden', border: '1px solid var(--border)', borderRadius: '12px' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-0)', marginBottom: '4px' }}>
          🔌 Connection Wizard
        </div>
        {/* Step indicators */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {[['connect','1 Connect'],['assign','2 Assign'],['live','3 Live']].map(([s, label]) => (
            <span key={s} style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', transition: 'all 0.15s',
              background: step === s ? 'rgba(72,101,242,0.2)' : 'transparent',
              color: step === s ? 'var(--accent)' : 'var(--text-2)',
              border: `1px solid ${step === s ? 'rgba(72,101,242,0.4)' : 'transparent'}` }}>
              {label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>

        {/* STEP 1: Connect */}
        {step === 'connect' && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>Database Connection</div>
              <div style={{ fontSize: '10px', color: 'var(--text-2)', marginBottom: '12px' }}>Enter your PostgreSQL database URL to connect to the telemetry source.</div>
              
              <input 
                type="text" 
                value={dbUrl} 
                onChange={e => setDbUrl(e.target.value)}
                placeholder="postgresql://user:password@localhost:5432/dbname"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-0)', color: 'var(--text-0)', fontSize: '12px', marginBottom: '12px', boxSizing: 'border-box' }}
              />
              
              <button onClick={handleConnect} disabled={!dbUrl || loading}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', background: dbUrl ? 'linear-gradient(135deg,#4865f2,#f4723e)' : 'var(--bg-0)', border: 'none', color: dbUrl ? '#fff' : 'var(--text-2)', fontSize: '12px', fontWeight: 700, cursor: dbUrl ? 'pointer' : 'not-allowed', marginBottom: '16px' }}>
                {loading ? '⏳ Connecting...' : '🔌 Test Connection & Fetch Tables'}
              </button>
            </div>

            {tables.length > 0 && (
              <div style={{ padding: '12px', background: 'rgba(16,217,141,0.05)', border: '1px solid rgba(16,217,141,0.2)', borderRadius: '8px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#10d98d', marginBottom: '8px' }}>✅ Connected successfully!</div>
                <div style={{ fontSize: '10px', color: 'var(--text-2)', marginBottom: '6px' }}>Select a table to start mapping columns:</div>
                <select 
                  onChange={e => handleSelectTable(e.target.value)}
                  defaultValue=""
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-0)', color: 'var(--text-0)', fontSize: '11px' }}
                >
                  <option value="" disabled>-- Select a table --</option>
                  {tables.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}

            {error && <div style={{ fontSize: '11px', color: '#ef4444', padding: '6px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: '6px' }}>{error}</div>}
          </>
        )}

        {/* STEP 2: Column Assignment */}
        {step === 'assign' && schema && (
          <>
            <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(16,217,141,0.07)', border: '1px solid rgba(16,217,141,0.2)', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#10d98d' }}>
                ✅ Table: {schema.table} — {schema.columns?.length} columns found
              </div>
            </div>

            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '8px' }}>
              Assign columns to components:
            </div>

            {schema.columns?.map(col => {
              const a = assignments[col] || {};
              return (
                <div key={col} style={{ marginBottom: '10px', padding: '10px', borderRadius: '8px', background: 'var(--bg-0)', border: `1px solid ${a.component_id ? 'rgba(72,101,242,0.3)' : 'var(--border)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>{col}</div>
                    {a.component_id && <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '8px', background: 'rgba(72,101,242,0.15)', color: 'var(--accent)', border: '1px solid rgba(72,101,242,0.3)' }}>✓ assigned</span>}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                    <div>
                      <label style={{ fontSize: '9px', color: 'var(--text-2)', display: 'block', marginBottom: '2px' }}>Component</label>
                      <select value={a.component_id || ''} onChange={e => setAssignments(prev => ({ ...prev, [col]: { ...prev[col], component_id: e.target.value } }))}
                        style={{ width: '100%', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px', color: 'var(--text-0)', fontSize: '10px' }}>
                        <option value="">— not assigned —</option>
                        {components.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '9px', color: 'var(--text-2)', display: 'block', marginBottom: '2px' }}>KPI Name</label>
                      <input value={a.kpi_name || ''} onChange={e => setAssignments(prev => ({ ...prev, [col]: { ...prev[col], kpi_name: e.target.value } }))}
                        placeholder="e.g. Temperature"
                        style={{ width: '100%', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px', color: 'var(--text-0)', fontSize: '10px', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr', gap: '5px' }}>
                    <div>
                      <label style={{ fontSize: '9px', color: 'var(--text-2)', display: 'block', marginBottom: '2px' }}>Unit</label>
                      <input value={a.unit || ''} onChange={e => setAssignments(prev => ({ ...prev, [col]: { ...prev[col], unit: e.target.value } }))}
                        placeholder="°C"
                        style={{ width: '100%', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px', color: 'var(--text-0)', fontSize: '10px', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    {[['🟡 Warn ≥', 'orange'], ['🔴 Critical ≥', 'red']].map(([label, key]) => (
                      <div key={key}>
                        <label style={{ fontSize: '9px', color: 'var(--text-2)', display: 'block', marginBottom: '2px' }}>{label}</label>
                        <input type="number" value={a.rules?.[key]?.[0] || ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            const max = key === 'orange' ? (a.rules?.red?.[0] || 9999) : 9999;
                            setAssignments(prev => ({ ...prev, [col]: { ...prev[col], rules: { ...prev[col]?.rules, [key]: [val, max] } } }));
                          }}
                          placeholder="—"
                          style={{ width: '100%', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px', color: 'var(--text-0)', fontSize: '10px', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button onClick={() => setAssignments(prev => ({ ...prev, [col]: { ...prev[col], component_id: '', kpi_name: '', unit: '', rules: {} } }))}
                        style={{ width: '100%', padding: '5px', borderRadius: '6px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '10px', cursor: 'pointer' }}>
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {error && <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '10px', padding: '6px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: '6px' }}>{error}</div>}
          </>
        )}

        {/* STEP 3: Live streaming */}
        {step === 'live' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>📡</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#10d98d', marginBottom: '6px' }}>Streaming Live Data</div>
            <div style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '16px' }}>
              {assignedCount} KPI column{assignedCount !== 1 ? 's' : ''} streaming to your digital twin via WebSocket.<br/>
              Values update automatically in the KPI panel.
            </div>
            <div style={{ textAlign: 'left', marginBottom: '14px' }}>
              {Object.entries(assignments).filter(([_, a]) => a.component_id).map(([col, a]) => {
                const comp = components.find(c => c.id === a.component_id);
                return (
                  <div key={col} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', marginBottom: '4px', borderRadius: '7px', background: 'var(--bg-0)', border: '1px solid var(--border)', fontSize: '10px' }}>
                    <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{col}</span>
                    <span style={{ color: 'var(--text-2)' }}>→</span>
                    <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{comp?.name || a.component_id}</span>
                    <span style={{ color: '#10d98d' }}>● {a.kpi_name} {a.unit && `(${a.unit})`}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setStep('assign')}
                style={{ flex: 1, padding: '9px', borderRadius: '8px', background: 'var(--bg-0)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '11px', cursor: 'pointer' }}>
                ✏️ Edit Assignments
              </button>
              <button onClick={handleDisconnect}
                style={{ flex: 1, padding: '9px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: '11px', cursor: 'pointer' }}>
                🔌 Disconnect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {(step === 'assign') && (
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: '8px' }}>
          <button onClick={() => setStep('connect')}
            style={{ padding: '8px 14px', borderRadius: '8px', background: 'var(--bg-0)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '11px', cursor: 'pointer' }}>
            ← Back
          </button>
          <button onClick={handleSave} disabled={assignedCount === 0 || loading}
            style={{ flex: 1, padding: '8px', borderRadius: '8px', background: assignedCount > 0 ? 'linear-gradient(135deg,#4865f2,#f4723e)' : 'var(--bg-0)', border: 'none', color: assignedCount > 0 ? '#fff' : 'var(--text-2)', fontSize: '12px', fontWeight: 700, cursor: assignedCount > 0 ? 'pointer' : 'not-allowed' }}>
            {loading ? '⏳ Saving…' : `▶ Start Streaming (${assignedCount} columns)`}
          </button>
        </div>
      )}
    </div>
  );
}

function formatColName(col) {
  return col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/ Pct$/, ' %').replace(/ C$/, ' °C').replace(/ H$/, '/h');
}

function guessUnit(col) {
  const l = col.toLowerCase();
  if (l.includes('_c')) return '°C';
  if (l.includes('_pct') || l.includes('_rate')) return '%';
  if (l.includes('_h') || l.includes('_per_h')) return '/h';
  if (l.includes('_min')) return 'min';
  if (l.includes('bar')) return 'bar';
  if (l.includes('persons') || l.includes('queue')) return 'persons';
  return '';
}
