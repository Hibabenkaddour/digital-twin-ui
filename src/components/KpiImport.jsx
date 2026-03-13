import { useState, useRef } from 'react';
import { importKpiFile, getComponentKpis } from '../services/api';

export default function KpiImport({ component, onClose, onImported }) {
    const [step, setStep] = useState('upload'); // upload | map | preview | done
    const [file, setFile] = useState(null);
    const [kpiName, setKpiName] = useState('');
    const [unit, setUnit] = useState('');
    const [columns, setColumns] = useState([]);
    const [valueCol, setValueCol] = useState('');
    const [timestampCol, setTimestampCol] = useState('');
    const [preview, setPreview] = useState([]);
    const [rowsImported, setRowsImported] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef();

    const handleFileDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer?.files[0] || e.target.files[0];
        if (f) { setFile(f); setError(''); }
    };

    const handleUpload = async () => {
        if (!file || !kpiName.trim()) { setError('File and KPI name are required.'); return; }
        setLoading(true); setError('');
        try {
            const result = await importKpiFile(file, component.id, kpiName, { unit });
            setColumns(result.columns);
            setPreview(result.preview);
            setRowsImported(result.rowsImported);
            setValueCol(result.columns.find(c => /value|val|measure|reading/i.test(c)) || result.columns[0]);
            setTimestampCol(result.columns.find(c => /time|date|ts/i.test(c)) || '');
            setStep('preview');
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemap = async () => {
        if (!file || !kpiName.trim()) return;
        setLoading(true); setError('');
        try {
            const result = await importKpiFile(file, component.id, kpiName, { valueCol, timestampCol, unit });
            setRowsImported(result.rowsImported);
            setPreview(result.preview);
            setStep('done');
            onImported?.({ componentId: component.id, kpiName, rowsImported: result.rowsImported });
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)',
        }}>
            <div style={{
                width: '520px', background: 'var(--bg-1)', border: '1px solid var(--border)',
                borderRadius: '16px', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            }}>
                {/* Header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-0)' }}>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-0)' }}>📥 Import KPI Data</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>{component.name} · {component.type}</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                </div>

                {/* Step indicators */}
                <div style={{ display: 'flex', padding: '10px 20px', gap: '8px', borderBottom: '1px solid var(--border)', background: 'rgba(99,149,255,0.04)' }}>
                    {[['upload', '📂 Upload'], ['preview', '🔍 Preview'], ['done', '✅ Done']].map(([s, label]) => (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: step === s ? 'var(--accent)' : 'var(--text-2)', opacity: step === s ? 1 : 0.5 }}>
                            {label}
                        </div>
                    ))}
                </div>

                <div style={{ padding: '20px' }}>
                    {/* STEP: Upload */}
                    {(step === 'upload' || step === 'map') && (
                        <>
                            {/* Drop zone */}
                            <div
                                onDrop={handleFileDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onClick={() => fileRef.current?.click()}
                                style={{
                                    border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                                    borderRadius: '10px', padding: '28px', textAlign: 'center', cursor: 'pointer',
                                    background: dragOver ? 'rgba(99,149,255,0.06)' : 'var(--bg-0)',
                                    transition: 'all 0.15s', marginBottom: '14px',
                                }}
                            >
                                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileDrop} style={{ display: 'none' }} />
                                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
                                {file
                                    ? <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>✅ {file.name}</div>
                                    : <>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '4px' }}>Drop CSV or Excel file here</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>or click to browse · supports .csv, .xlsx, .xls</div>
                                    </>}
                            </div>

                            {/* KPI Name + Unit */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', marginBottom: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>KPI Name *</label>
                                    <input value={kpiName} onChange={e => setKpiName(e.target.value)} placeholder="e.g. Machine Temperature"
                                        style={{ width: '100%', background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 10px', color: 'var(--text-0)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ width: '80px' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>Unit</label>
                                    <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="°C"
                                        style={{ width: '100%', background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 10px', color: 'var(--text-0)', fontSize: '12px', outline: 'none' }} />
                                </div>
                            </div>

                            {error && <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '10px', padding: '6px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: '6px' }}>{error}</div>}

                            <button onClick={handleUpload} disabled={!file || !kpiName.trim() || loading}
                                style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'linear-gradient(135deg,#6395ff,#8b5cf6)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: file && kpiName ? 'pointer' : 'not-allowed', opacity: file && kpiName ? 1 : 0.5 }}>
                                {loading ? '⏳ Parsing file...' : '⬆ Upload & Preview'}
                            </button>
                        </>
                    )}

                    {/* STEP: Preview & Column Mapping */}
                    {step === 'preview' && (
                        <>
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-0)', marginBottom: '8px' }}>📋 Column Mapping</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '3px' }}>Value Column *</label>
                                        <select value={valueCol} onChange={e => setValueCol(e.target.value)}
                                            style={{ width: '100%', background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: '7px', padding: '7px', color: 'var(--text-0)', fontSize: '12px' }}>
                                            {columns.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '3px' }}>Timestamp Column</label>
                                        <select value={timestampCol} onChange={e => setTimestampCol(e.target.value)}
                                            style={{ width: '100%', background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: '7px', padding: '7px', color: 'var(--text-0)', fontSize: '12px' }}>
                                            <option value="">— auto —</option>
                                            {columns.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Data Preview Table */}
                            <div style={{ marginBottom: '14px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '5px' }}>Preview (first 5 rows)</div>
                                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--bg-0)' }}>
                                                {preview[0] && Object.keys(preview[0]).map(k => (
                                                    <th key={k} style={{ padding: '5px 10px', textAlign: 'left', color: 'var(--text-2)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{k}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preview.map((row, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    {Object.values(row).map((v, j) => (
                                                        <td key={j} style={{ padding: '5px 10px', color: 'var(--text-1)' }}>{String(v)}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-2)', marginTop: '4px' }}>
                                    {rowsImported} rows imported · Adjust column mapping if needed
                                </div>
                            </div>

                            {error && <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '10px' }}>{error}</div>}

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setStep('upload')} style={{ flex: '0 0 auto', padding: '9px 16px', borderRadius: '8px', background: 'var(--bg-0)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '12px', cursor: 'pointer' }}>← Back</button>
                                <button onClick={handleRemap} disabled={loading}
                                    style={{ flex: 1, padding: '9px', borderRadius: '8px', background: 'linear-gradient(135deg,#6395ff,#8b5cf6)', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                                    {loading ? '⏳ Saving...' : `✅ Confirm & Save ${rowsImported} rows`}
                                </button>
                            </div>
                        </>
                    )}

                    {/* STEP: Done */}
                    {step === 'done' && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-0)', marginBottom: '6px' }}>{rowsImported} rows imported!</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '20px' }}>
                                KPI "<strong style={{ color: 'var(--accent)' }}>{kpiName}</strong>" is now linked to {component.name}.
                                <br />You can now query it via Analytics AI.
                            </div>
                            <button onClick={onClose} style={{ padding: '10px 28px', borderRadius: '10px', background: 'linear-gradient(135deg,#6395ff,#8b5cf6)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
