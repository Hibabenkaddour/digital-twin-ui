/**
 * KpiStep (Step 4) — Data source setup before launching the Digital Twin.
 *
 * Flow:
 *   A) Upload one CSV/Excel file containing all KPI columns
 *   B) Backend discovers columns + stats (min/max/mean)
 *   C) User assigns each column → component + KPI name + unit + thresholds
 *   D) "Launch" saves assignments, backend starts streaming, goes to TwinView
 */
import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ArrowLeft, Upload, Link2, CheckCircle2, AlertCircle, FileSpreadsheet, Cpu } from 'lucide-react';
import useTwinStore from '../store/useTwinStore';

const BASE_URL = '';  // Vite proxy

function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '99,149,255';
}

function formatColLabel(col) {
    return col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        .replace(/ Pct$/, ' (%)').replace(/ C$/, ' (°C)').replace(/ H$/, ' /h').replace(/ Min$/, ' (min)');
}

function guessUnit(col) {
    const l = col.toLowerCase();
    if (l.endsWith('_c') || l.includes('temp')) return '°C';
    if (l.includes('pct') || l.includes('rate') || l.includes('util')) return '%';
    if (l.includes('_per_h') || l.endsWith('_h')) return '/h';
    if (l.includes('_min') || l.includes('wait')) return 'min';
    if (l.includes('bar') || l.includes('pressure')) return 'bar';
    if (l.includes('person') || l.includes('queue')) return 'persons';
    return '';
}

export default function KpiStep() {
    const { setStep, components, selectedDomain } = useTwinStore();

    // ── State ───────────────────────────────────────────────────────────────
    const [mode, setMode] = useState('upload');   // 'upload' | 'assign' | 'done'
    const [file, setFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [schema, setSchema] = useState(null);   // { columns, columnStats, rowCount, timestampColumn, fileName }
    const [assignments, setAssignments] = useState({});  // { col: { component_id, kpi_name, unit, rules } }
    const [existingSource, setExistingSource] = useState(false);
    const fileRef = useRef();

    // Check if a source is already connected from a previous session
    useEffect(() => {
        fetch(`${BASE_URL}/source/status`).then(r => r.json()).then(s => {
            if (s.connected && s.assignedColumns > 0) {
                setExistingSource(true);
                fetch(`${BASE_URL}/source/schema`).then(r => r.json()).then(sc => {
                    setSchema(sc);
                    setAssignments(sc.assignments || {});
                    setMode('assign');
                });
            }
        }).catch(() => {});
    }, []);

    // ── File handlers ───────────────────────────────────────────────────────
    const handleFileSelect = (f) => {
        if (!f) return;
        setFile(f); setError('');
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true); setError('');
        try {
            const form = new FormData();
            form.append('file', file);
            const res = await fetch(`${BASE_URL}/source/upload`, { method: 'POST', body: form });
            if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Upload failed'); }
            const data = await res.json();
            setSchema(data);
            // Pre-fill with smart defaults
            const init = {};
            data.columns.forEach(col => {
                // Try to auto-match column to a component by name similarity
                const matchedComp = components.find(c =>
                    c.name.toLowerCase().split(' ').some(w => col.toLowerCase().includes(w)) ||
                    col.toLowerCase().includes(c.type?.replace(/_/g,''))
                );
                init[col] = {
                    component_id: matchedComp?.id || '',
                    kpi_name: formatColLabel(col),
                    unit: guessUnit(col),
                    rules: {},
                };
            });
            setAssignments(init);
            setMode('assign');
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const assignedCount = Object.values(assignments).filter(a => a.component_id && a.kpi_name).length;

    const handleLaunch = async () => {
        if (assignedCount === 0) { setError('Assign at least one column to a component first.'); return; }
        setLoading(true); setError('');
        try {
            const payload = Object.entries(assignments)
                .filter(([_, a]) => a.component_id && a.kpi_name)
                .map(([col, a]) => ({
                    column: col,
                    component_id: a.component_id,
                    component_name: components.find(c => c.id === a.component_id)?.name || a.component_id,
                    kpi_name: a.kpi_name,
                    unit: a.unit || '',
                    rules: a.rules || {},
                }));

            const res = await fetch(`${BASE_URL}/source/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignments: payload }),
            });
            if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Save failed'); }
            setStep(5);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // ── RENDER ──────────────────────────────────────────────────────────────
    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* ── LEFT PANEL: info + sample files ── */}
                <div style={{ width: '300px', flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'rgba(7,10,20,0.9)', overflow: 'hidden' }}>
                    <div style={{ padding: '20px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <Link2 size={15} color="var(--accent)" />
                            <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em' }}>Data Source Setup</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
                            Upload <strong style={{ color: '#fff' }}>one file</strong> containing all your KPI columns.
                            You'll assign each column to a component before launching.
                        </p>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                        {/* Format guide */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Expected Format</div>
                            <pre style={{ fontSize: '10px', color: '#94a3c8', background: 'var(--bg-2)', borderRadius: '8px', padding: '10px', lineHeight: 1.7, border: '1px solid var(--border)', margin: 0, overflowX: 'auto' }}>
{`timestamp, col_1, col_2, ...
2026-01-01 08:00, 1240, 22, ...
2026-01-01 08:05, 1315, 28, ...`}
                            </pre>
                        </div>

                        {/* Sample files by domain */}
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Sample Files</div>
                        {[
                            { icon: '✈️', domain: 'airport', file: 'airport_data.csv', cols: 'passenger_flow · security_wait · gate_util · baggage_delay · checkin_queue · runway_movements' },
                            { icon: '🏭', domain: 'factory', file: 'factory_data.csv', cols: 'machine_temp · throughput · pressure · quality_rate · downtime · belt_speed' },
                            { icon: '📦', domain: 'warehouse', file: 'warehouse_data.csv', cols: 'pick_rate · rack_fill · dock_util · cycle_time · conveyor · error_rate' },
                        ].map(s => (
                            <div key={s.domain} style={{ padding: '10px', borderRadius: '8px', background: s.domain === selectedDomain ? 'rgba(99,149,255,0.07)' : 'var(--bg-3)', border: `1px solid ${s.domain === selectedDomain ? 'rgba(99,149,255,0.3)' : 'var(--border)'}`, marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '14px' }}>{s.icon}</span>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-0)' }}>{s.file}</span>
                                    {s.domain === selectedDomain && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '8px', background: 'rgba(99,149,255,0.2)', color: 'var(--accent)', marginLeft: 'auto' }}>Your domain</span>}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-2)', lineHeight: 1.5 }}>{s.cols}</div>
                            </div>
                        ))}
                        <div style={{ fontSize: '10px', color: 'var(--text-2)', marginTop: '4px' }}>
                            📁 Located in <code style={{ fontSize: '9px', background: 'var(--bg-2)', padding: '1px 4px', borderRadius: '3px' }}>digital-twin-backend/sample_data/</code>
                        </div>

                        {/* Progress indicator */}
                        {schema && (
                            <div style={{ marginTop: '16px', padding: '10px', borderRadius: '8px', background: assignedCount > 0 ? 'rgba(16,217,141,0.07)' : 'rgba(99,149,255,0.07)', border: `1px solid ${assignedCount > 0 ? 'rgba(16,217,141,0.25)' : 'rgba(99,149,255,0.25)'}` }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: assignedCount > 0 ? '#10d98d' : 'var(--accent)', marginBottom: '4px' }}>
                                    {assignedCount > 0 ? `✅ ${assignedCount} of ${schema.columns?.length} columns assigned` : `⚡ ${schema.columns?.length} columns discovered`}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-2)' }}>
                                    {schema.rowCount} rows · {schema.timestampColumn ? `timestamp: ${schema.timestampColumn}` : 'no timestamp detected'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT PANEL: upload or assign ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-1)' }}>

                    {/* Mode tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'rgba(7,10,20,0.6)', flexShrink: 0 }}>
                        {[
                            { id: 'upload', icon: <Upload size={12} />, label: '1 · Upload File' },
                            { id: 'assign', icon: <FileSpreadsheet size={12} />, label: '2 · Assign Columns', disabled: !schema },
                        ].map(t => (
                            <button key={t.id} onClick={() => !t.disabled && setMode(t.id)} disabled={t.disabled}
                                style={{ padding: '12px 20px', border: 'none', background: 'transparent', cursor: t.disabled ? 'default' : 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s',
                                    borderBottom: `2px solid ${mode === t.id ? 'var(--accent)' : 'transparent'}`,
                                    color: mode === t.id ? 'var(--accent)' : t.disabled ? 'var(--text-2)' : 'var(--text-1)', opacity: t.disabled ? 0.4 : 1 }}>
                                {t.icon} {t.label}
                            </button>
                        ))}
                        {schema && (
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '6px' }}>
                                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10d98d', boxShadow: '0 0 6px #10d98d' }} />
                                <span style={{ fontSize: '11px', color: '#10d98d', fontWeight: 600 }}>{schema.fileName}</span>
                            </div>
                        )}
                    </div>

                    {/* ── UPLOAD PANEL ── */}
                    {mode === 'upload' && (
                        <div style={{ flex: 1, overflowY: 'auto', padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '100%', maxWidth: '520px' }}>

                                {/* Existing source notice */}
                                {existingSource && (
                                    <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(16,217,141,0.07)', border: '1px solid rgba(16,217,141,0.3)', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <CheckCircle2 size={16} color="#10d98d" />
                                        <div>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#10d98d' }}>Source already connected</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>Upload a new file to replace it, or switch to Assign tab to continue.</div>
                                        </div>
                                    </div>
                                )}

                                {/* Drop zone */}
                                <div
                                    onDrop={e => { e.preventDefault(); handleFileSelect(e.dataTransfer?.files[0]); setDragOver(false); }}
                                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onClick={() => fileRef.current?.click()}
                                    style={{ border: `2px dashed ${dragOver ? 'var(--accent)' : file ? '#10d98d' : 'var(--border)'}`, borderRadius: '14px', padding: '40px', textAlign: 'center', cursor: 'pointer', marginBottom: '16px',
                                        background: dragOver ? 'rgba(99,149,255,0.05)' : file ? 'rgba(16,217,141,0.04)' : 'var(--bg-0)', transition: 'all 0.2s' }}>
                                    <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={e => handleFileSelect(e.target.files[0])} style={{ display: 'none' }} />
                                    {file ? (
                                        <>
                                            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📊</div>
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#10d98d', marginBottom: '4px' }}>✅ {file.name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>{(file.size / 1024).toFixed(1)} KB · Click to change</div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: '44px', marginBottom: '12px' }}>📂</div>
                                            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-0)', marginBottom: '6px' }}>Drop your data file here</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>One CSV or Excel file with all KPI columns</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '4px', opacity: 0.7 }}>.csv · .xlsx · .xls supported</div>
                                        </>
                                    )}
                                </div>

                                {error && (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: '14px', fontSize: '12px', color: '#ef4444' }}>
                                        <AlertCircle size={14} /> {error}
                                    </div>
                                )}

                                <button
                                    onClick={handleUpload} disabled={!file || loading}
                                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: 700, cursor: file ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
                                        background: file ? 'linear-gradient(135deg,var(--accent),#8b5cf6)' : 'var(--bg-3)',
                                        color: file ? '#fff' : 'var(--text-2)',
                                        boxShadow: file ? '0 4px 20px rgba(99,149,255,0.3)' : 'none' }}>
                                    {loading ? '⏳ Analysing columns…' : '🔍 Upload & Discover Columns →'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── ASSIGN PANEL ── */}
                    {mode === 'assign' && schema && (
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '14px' }}>
                                Assign each column to a component. Unassigned columns are ignored.
                            </div>

                            {schema.columns?.map(col => {
                                const stats = schema.columnStats?.[col];
                                const a = assignments[col] || {};
                                const isAssigned = !!(a.component_id && a.kpi_name);
                                return (
                                    <div key={col} style={{ marginBottom: '10px', padding: '14px 16px', borderRadius: '10px', background: 'var(--bg-0)', border: `1.5px solid ${isAssigned ? 'rgba(16,217,141,0.25)' : 'var(--border)'}`, transition: 'border-color 0.15s' }}>
                                        {/* Column header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <div>
                                                <code style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>{col}</code>
                                                {stats && !stats.error && (
                                                    <span style={{ marginLeft: '10px', fontSize: '10px', color: 'var(--text-2)' }}>
                                                        min {stats.min} · avg {stats.mean} · max {stats.max} · {stats.count} pts
                                                    </span>
                                                )}
                                            </div>
                                            {isAssigned
                                                ? <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(16,217,141,0.12)', color: '#10d98d', border: '1px solid rgba(16,217,141,0.3)', fontWeight: 700 }}>✓ assigned</span>
                                                : <span style={{ fontSize: '10px', color: 'var(--text-2)' }}>not assigned</span>}
                                        </div>

                                        {/* Assignment row */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 60px 90px 90px auto', gap: '8px', alignItems: 'end' }}>
                                            {/* Component */}
                                            <div>
                                                <label style={{ fontSize: '9px', color: 'var(--text-2)', display: 'block', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Component</label>
                                                <select value={a.component_id || ''} onChange={e => setAssignments(p => ({ ...p, [col]: { ...p[col], component_id: e.target.value } }))}
                                                    style={{ width: '100%', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 8px', color: 'var(--text-0)', fontSize: '11px', cursor: 'pointer' }}>
                                                    <option value="">— not assigned —</option>
                                                    {components.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>

                                            {/* KPI Name */}
                                            <div>
                                                <label style={{ fontSize: '9px', color: 'var(--text-2)', display: 'block', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KPI Label</label>
                                                <input value={a.kpi_name || ''} onChange={e => setAssignments(p => ({ ...p, [col]: { ...p[col], kpi_name: e.target.value } }))}
                                                    placeholder="e.g. Temperature"
                                                    style={{ width: '100%', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 8px', color: 'var(--text-0)', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }} />
                                            </div>

                                            {/* Unit */}
                                            <div>
                                                <label style={{ fontSize: '9px', color: 'var(--text-2)', display: 'block', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unit</label>
                                                <input value={a.unit || ''} onChange={e => setAssignments(p => ({ ...p, [col]: { ...p[col], unit: e.target.value } }))}
                                                    placeholder="°C"
                                                    style={{ width: '100%', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 8px', color: 'var(--text-0)', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }} />
                                            </div>

                                            {/* Warn threshold */}
                                            <div>
                                                <label style={{ fontSize: '9px', color: '#f59e0b', display: 'block', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🟡 Warn ≥</label>
                                                <input type="number" value={a.rules?.orange?.[0] || ''}
                                                    onChange={e => { const v = parseFloat(e.target.value); setAssignments(p => ({ ...p, [col]: { ...p[col], rules: { ...p[col]?.rules, orange: [v, p[col]?.rules?.red?.[0] || 9999] } } })); }}
                                                    placeholder="—"
                                                    style={{ width: '100%', background: 'var(--bg-1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '7px', padding: '6px 8px', color: 'var(--text-0)', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }} />
                                            </div>

                                            {/* Critical threshold */}
                                            <div>
                                                <label style={{ fontSize: '9px', color: '#ef4444', display: 'block', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔴 Critical ≥</label>
                                                <input type="number" value={a.rules?.red?.[0] || ''}
                                                    onChange={e => { const v = parseFloat(e.target.value); setAssignments(p => ({ ...p, [col]: { ...p[col], rules: { ...p[col]?.rules, red: [v, 9999] } } })); }}
                                                    placeholder="—"
                                                    style={{ width: '100%', background: 'var(--bg-1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '7px', padding: '6px 8px', color: 'var(--text-0)', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }} />
                                            </div>

                                            {/* Clear btn */}
                                            <div style={{ paddingBottom: '0' }}>
                                                <label style={{ fontSize: '9px', color: 'transparent', display: 'block', marginBottom: '3px' }}>·</label>
                                                <button onClick={() => setAssignments(p => ({ ...p, [col]: { component_id: '', kpi_name: '', unit: '', rules: {} } }))}
                                                    style={{ padding: '6px 10px', borderRadius: '7px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '11px', cursor: 'pointer' }}>
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {error && (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', marginTop: '12px', fontSize: '12px', color: '#ef4444' }}>
                                    <AlertCircle size={14} /> {error}
                                </div>
                            )}
                        </div>
                    )}

                    {/* No schema yet in assign mode */}
                    {mode === 'assign' && !schema && (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', fontSize: '13px' }}>
                            Upload a file first to see columns here.
                        </div>
                    )}
                </div>
            </div>

            {/* ── FOOTER ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'rgba(7,10,20,0.85)', backdropFilter: 'blur(10px)', flexShrink: 0 }}>
                <button className="btn btn-ghost" onClick={() => setStep(3)}>
                    <ArrowLeft size={16} /> Back
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {mode === 'assign' && assignedCount > 0 && (
                        <span style={{ fontSize: '12px', color: '#10d98d' }}>
                            ✅ {assignedCount} KPI{assignedCount > 1 ? 's' : ''} ready to stream
                        </span>
                    )}

                    {/* Skip (no data) */}
                    <button className="btn btn-ghost" onClick={() => setStep(5)} style={{ fontSize: '12px' }}>
                        Skip for now →
                    </button>

                    {/* Launch */}
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={mode === 'assign' ? handleLaunch : handleUpload}
                        disabled={loading || (mode === 'upload' && !file) || (mode === 'assign' && assignedCount === 0)}
                        style={{ opacity: (loading || (mode === 'upload' && !file) || (mode === 'assign' && assignedCount === 0)) ? 0.5 : 1 }}>
                        {loading ? '⏳ Saving…' : mode === 'upload' ? '🔍 Discover Columns' : `🚀 Launch Digital Twin`}
                        {!loading && mode === 'assign' && <ChevronRight size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
