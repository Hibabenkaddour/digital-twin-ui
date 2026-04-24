import { useState, useEffect } from 'react';
import { ChevronRight, ArrowLeft, Database, Plus, Trash2 } from 'lucide-react';
import useTwinStore from '../store/useTwinStore';
import { safeApiFetch } from '../services/api';
import { toast } from '../store/useToastStore';

export default function KpiStep() {
  const { setStep, components, selectedDomain } = useTwinStore();
  const [columns,     setColumns]     = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    safeApiFetch(`/source/schema?domain=${selectedDomain}`, {}, 'Impossible de charger le schéma depuis le backend')
      .then(data => {
        if (!data) return;
        setColumns(data.columns || []);
        const savedAssig = data.assignments || {};
        const arr = Object.entries(savedAssig).map(([kpi_id, val]) => ({
          kpi_id,
          component_id: val.component_id || '',
          kpi_name:     val.kpi_name     || '',
          formula:      val.formula      || '',
          unit:         val.unit         || '',
          interaction:  val.interaction  || 'pulse',
          rules: {
            orange:    [val.orange_threshold ?? null, null],
            red:       [val.red_threshold    ?? null, null],
            direction:  val.direction        || 'asc',
          },
        }));
        if (arr.length > 0) setAssignments(arr);
      });
  }, [selectedDomain]);

  const addKpi = () => setAssignments([...assignments, {
    kpi_id: `kpi_${Date.now()}`, component_id: '', kpi_name: 'New KPI',
    formula: '', unit: '', rules: { orange: [null, null], red: [null, null], direction: 'asc' }, interaction: 'pulse',
  }]);

  const handleSuggestKpis = async () => {
    if (!columns.length) return;
    setAiLoading(true);
    const data = await safeApiFetch(
      '/source/propose_kpis',
      { method: 'POST', body: JSON.stringify({ domain: selectedDomain, columns }) },
      'Impossible de récupérer les suggestions IA'
    );
    if (data?.kpis) {
      const newAssignments = data.kpis.map(k => ({
        kpi_id: `kpi_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
        component_id: components[0]?.id || '', kpi_name: k.kpi_name || 'AI KPI',
        formula: k.formula || '', unit: k.unit || '',
        rules: { orange: [k.orange ?? null, null], red: [k.red ?? null, null], direction: k.direction || 'asc' },
        interaction: k.interaction || 'pulse',
      }));
      setAssignments(prev => [...prev, ...newAssignments]);
    }
    setAiLoading(false);
  };

  const updateKpi  = (id, field, value) => setAssignments(prev => prev.map(a => a.kpi_id === id ? { ...a, [field]: value } : a));
  const removeKpi  = (id) => setAssignments(prev => prev.filter(a => a.kpi_id !== id));
  const updateRule = (id, level, valueStr) => {
    const val = valueStr === '' ? null : parseFloat(valueStr);
    setAssignments(prev => prev.map(a => {
      if (a.kpi_id !== id) return a;
      const newRules = { ...a.rules };
      newRules[level] = [val, newRules[level]?.[1] || 9999];
      return { ...a, rules: newRules };
    }));
  };

  const handleLaunch = async () => {
    const valid = assignments.filter(a => a.component_id && a.kpi_name && a.formula);
    setLoading(true);
    const result = await safeApiFetch(
      '/source/assign',
      { method: 'POST', body: JSON.stringify({ domain: selectedDomain, assignments: valid }) },
      'Échec de la sauvegarde des KPIs'
    );
    setLoading(false);
    if (!result) return;
    toast.success(`${valid.length} KPI(s) sauvegardés`);
    useTwinStore.getState().clearKpis();
    setStep(5);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left — schema */}
        <div style={{ width: '300px', flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.9)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Database size={15} color="var(--accent)" />
              <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em' }}>PostgreSQL</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
              Live schema for <strong style={{ color: 'var(--accent)' }}>{selectedDomain}_data</strong> table.
              Use these column names in your KPI formulas.
            </p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {columns.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                Waiting for backend…
              </div>
            ) : columns.map(col => (
              <div key={col} style={{ padding: '8px 12px', background: 'var(--bg-2)', borderRadius: '6px', marginBottom: '8px', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'monospace', color: 'var(--accent)' }}>
                {col}
              </div>
            ))}
          </div>
        </div>

        {/* Right — builder */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-1)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>KPI Formula Engine</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleSuggestKpis} disabled={aiLoading || columns.length === 0}
                style={{ padding: '8px 14px', borderRadius: '8px', background: 'linear-gradient(135deg,#4865f2,#f4723e)', color: '#fff', border: 'none', cursor: (aiLoading || columns.length === 0) ? 'not-allowed' : 'pointer', opacity: (aiLoading || columns.length === 0) ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
                {aiLoading ? '🔄 Thinking...' : '✨ AI Suggestions'}
              </button>
              <button onClick={addKpi}
                style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(72,101,242,0.1)', color: 'var(--accent)', border: '1px solid rgba(72,101,242,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
                <Plus size={14} /> Add New KPI
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {assignments.length === 0 && (
              <div style={{ margin: 'auto', color: 'var(--text-2)', fontSize: '13px', textAlign: 'center' }}>
                <Database size={32} opacity={0.5} style={{ marginBottom: '12px' }} />
                <div>No KPIs defined yet.</div>
                <div style={{ marginTop: '4px' }}>Click "Add New KPI" to start building derived metrics.</div>
              </div>
            )}

            {assignments.map((kpi, index) => (
              <div key={kpi.kpi_id} style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-0)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>KPI Rule #{index + 1}</div>
                  <button onClick={() => removeKpi(kpi.kpi_id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) minmax(150px, 1fr) minmax(250px, 2fr) 80px', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-2)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Component</label>
                    <select value={kpi.component_id} onChange={e => updateKpi(kpi.kpi_id, 'component_id', e.target.value)}
                      style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text-0)', fontSize: '12px', outline: 'none' }}>
                      <option value="">-- Select --</option>
                      {components.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-2)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Label</label>
                    <input value={kpi.kpi_name} onChange={e => updateKpi(kpi.kpi_id, 'kpi_name', e.target.value)} placeholder="e.g. Total Energy"
                      style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text-0)', fontSize: '12px', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--accent)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Formula (Math)</label>
                    <input value={kpi.formula} onChange={e => updateKpi(kpi.kpi_id, 'formula', e.target.value)} placeholder="e.g. temp_1 + temp_2 * 1.5"
                      style={{ width: '100%', background: 'rgba(72,101,242,0.05)', border: '1px solid rgba(72,101,242,0.3)', borderRadius: '6px', padding: '8px', color: 'var(--text-0)', fontSize: '12px', fontFamily: 'monospace', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-2)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Unit</label>
                    <input value={kpi.unit} onChange={e => updateKpi(kpi.kpi_id, 'unit', e.target.value)} placeholder="kWh"
                      style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text-0)', fontSize: '12px', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '4px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-2)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Direction</label>
                    <select value={kpi.rules.direction || 'asc'} onChange={e => updateKpi(kpi.kpi_id, 'rules', { ...kpi.rules, direction: e.target.value })}
                      style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text-0)', fontSize: '12px', outline: 'none' }}>
                      <option value="asc">Ascending (≥)</option>
                      <option value="desc">Descending (≤)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: '#f59e0b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>🟡 Warn</label>
                    <input type="number" value={kpi.rules.orange?.[0] ?? ''} onChange={e => updateRule(kpi.kpi_id, 'orange', e.target.value)} placeholder="Threshold"
                      style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', padding: '8px', color: 'var(--text-0)', fontSize: '12px', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: '#ef4444', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>🔴 Critical</label>
                    <input type="number" value={kpi.rules.red?.[0] ?? ''} onChange={e => updateRule(kpi.kpi_id, 'red', e.target.value)} placeholder="Threshold"
                      style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '8px', color: 'var(--text-0)', fontSize: '12px', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: '#10d98d', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>✨ Interaction</label>
                    <select value={kpi.interaction} onChange={e => updateKpi(kpi.kpi_id, 'interaction', e.target.value)}
                      style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid rgba(16,217,141,0.3)', borderRadius: '6px', padding: '8px', color: 'var(--text-0)', fontSize: '12px', outline: 'none' }}>
                      <option value="pulse">Luminous Pulse</option>
                      <option value="transition">Solid Color Transition</option>
                      <option value="glow">Outline Glow</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', flexShrink: 0 }}>
        <button className="btn btn-ghost" onClick={() => setStep(3)}><ArrowLeft size={16} /> Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost" onClick={() => setStep(5)} style={{ fontSize: '12px' }}>Skip for now →</button>
          <button className="btn btn-primary btn-lg" onClick={handleLaunch} disabled={loading || assignments.length === 0} style={{ opacity: (loading || assignments.length === 0) ? 0.5 : 1 }}>
            {loading ? '⏳ Deploying…' : '🚀 Compile & Launch'}
            {!loading && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
