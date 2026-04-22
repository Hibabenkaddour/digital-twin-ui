import { useState, useCallback, useRef } from 'react';
import useTwinStore from '../store/useTwinStore';
import {
  Database, FileSpreadsheet, Globe, Radio,
  ChevronRight, ChevronLeft, CheckCircle, XCircle,
  Loader2, Upload, Eye, Tag, ToggleLeft, ToggleRight,
  ArrowLeft, Plug, Table2, Settings2
} from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL || '';

/* ── Source type catalog ────────────────────────────────── */
const SOURCE_TYPES = [
  { id: 'postgresql', name: 'PostgreSQL',  icon: '🐘', category: 'database',  badge: 'Popular' },
  { id: 'mysql',      name: 'MySQL',       icon: '🐬', category: 'database',  badge: '' },
  { id: 'mongodb',    name: 'MongoDB',     icon: '🍃', category: 'database',  badge: '', disabled: true },
  { id: 'mssql',      name: 'SQL Server',  icon: '🏢', category: 'database',  badge: '', disabled: true },
  { id: 'rest_api',   name: 'REST API',    icon: '🔗', category: 'api',       badge: '', disabled: true },
  { id: 'graphql',    name: 'GraphQL',     icon: '◈',  category: 'api',       badge: '', disabled: true },
  { id: 'csv',        name: 'CSV / Excel', icon: '📄', category: 'file',      badge: 'Easy' },
  { id: 'kafka',      name: 'Kafka',       icon: '📡', category: 'realtime',  badge: 'Real-time', disabled: true },
  { id: 'mqtt',       name: 'MQTT',        icon: '📶', category: 'realtime',  badge: 'Real-time', disabled: true },
  { id: 'webhook',    name: 'Webhook',     icon: '🪝', category: 'realtime',  badge: '', disabled: true },
];

const CATEGORIES = [
  { id: 'all',      label: 'All',       icon: <Globe size={13} /> },
  { id: 'database', label: 'Databases', icon: <Database size={13} /> },
  { id: 'file',     label: 'Files',     icon: <FileSpreadsheet size={13} /> },
  { id: 'api',      label: 'APIs',      icon: <Globe size={13} /> },
  { id: 'realtime', label: 'Real-time', icon: <Radio size={13} /> },
];

/* ── Step indicator ─────────────────────────────────────── */
function StepBar({ step }) {
  const steps = [
    { n: 1, label: 'Source Type',  icon: <Plug size={14} /> },
    { n: 2, label: 'Configure',    icon: <Settings2 size={14} /> },
    { n: 3, label: 'Schema & Map', icon: <Table2 size={14} /> },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '28px' }}>
      {steps.map((s, i) => (
        <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
            borderRadius: '20px', fontSize: '12px', fontWeight: 700,
            background: step >= s.n ? 'rgba(72,101,242,0.12)' : 'var(--bg-2)',
            color: step >= s.n ? 'var(--accent)' : 'var(--text-2)',
            border: `1px solid ${step >= s.n ? 'rgba(72,101,242,0.3)' : 'var(--border)'}`,
            transition: 'all 0.2s',
          }}>
            {step > s.n ? <CheckCircle size={13} /> : s.icon}
            {s.label}
          </div>
          {i < 2 && <ChevronRight size={14} color="var(--text-2)" />}
        </div>
      ))}
    </div>
  );
}

/* ── Step 1: Choose source ──────────────────────────────── */
function Step1({ selected, onSelect }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? SOURCE_TYPES : SOURCE_TYPES.filter(s => s.category === filter);

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-0)', marginBottom: '4px' }}>
        Choose Data Source
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '20px' }}>
        Select the type of data you want to connect to your dashboard.
      </p>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setFilter(c.id)}
            style={{
              padding: '5px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 600,
              border: `1px solid ${filter === c.id ? 'rgba(72,101,242,0.3)' : 'var(--border)'}`,
              background: filter === c.id ? 'rgba(72,101,242,0.1)' : 'var(--bg-0)',
              color: filter === c.id ? 'var(--accent)' : 'var(--text-2)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
            }}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Source cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
        {filtered.map(src => (
          <button
            key={src.id}
            onClick={() => !src.disabled && onSelect(src.id)}
            disabled={src.disabled}
            style={{
              padding: '16px 14px', borderRadius: '12px', textAlign: 'center', cursor: src.disabled ? 'not-allowed' : 'pointer',
              border: `2px solid ${selected === src.id ? 'var(--accent)' : 'var(--border)'}`,
              background: selected === src.id ? 'rgba(72,101,242,0.06)' : 'var(--bg-0)',
              opacity: src.disabled ? 0.4 : 1, transition: 'all 0.15s', position: 'relative',
            }}
            onMouseEnter={e => { if (!src.disabled) e.currentTarget.style.borderColor = 'rgba(72,101,242,0.4)'; }}
            onMouseLeave={e => { if (!src.disabled && selected !== src.id) e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            {src.badge && (
              <span style={{
                position: 'absolute', top: '6px', right: '6px', fontSize: '8px', fontWeight: 700,
                padding: '1px 6px', borderRadius: '6px',
                background: src.badge === 'Real-time' ? 'rgba(16,217,141,0.15)' : 'rgba(72,101,242,0.12)',
                color: src.badge === 'Real-time' ? '#10d98d' : 'var(--accent)',
              }}>
                {src.badge}
              </span>
            )}
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{src.icon}</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-0)' }}>{src.name}</div>
            {src.disabled && <div style={{ fontSize: '9px', color: 'var(--text-2)', marginTop: '3px' }}>Coming soon</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Step 2: Configure connection ───────────────────────── */
function Step2({ sourceType, config, setConfig, testResult, testing, onTest, csvUpload }) {
  const fileRef = useRef(null);

  if (sourceType === 'csv') {
    return (
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-0)', marginBottom: '4px' }}>Upload File</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '20px' }}>
          Drag & drop a CSV or Excel file, or click to browse.
        </p>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; if (e.dataTransfer.files[0]) csvUpload(e.dataTransfer.files[0]); }}
          style={{
            padding: '48px 32px', borderRadius: '16px', border: '2px dashed var(--border)',
            background: 'var(--bg-0)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <Upload size={32} color="var(--accent)" style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-0)', marginBottom: '4px' }}>
            {config.file_name || 'Click or drop a file here'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>Supports CSV, TSV, Excel (.xlsx)</div>
          <input ref={fileRef} type="file" accept=".csv,.tsv,.xlsx,.xls" hidden
            onChange={e => { if (e.target.files[0]) csvUpload(e.target.files[0]); }} />
        </div>
        {testing && <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}><Loader2 size={14} className="spin" /> Parsing file…</div>}
        {testResult && (
          <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: testResult.success ? 'rgba(16,217,141,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${testResult.success ? '#10d98d' : '#ef4444'}30`, color: testResult.success ? '#10d98d' : '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {testResult.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {testResult.success ? testResult.message : testResult.error}
          </div>
        )}
      </div>
    );
  }

  // Database connection form
  const fields = [
    { key: 'host',     label: 'Host',     placeholder: 'localhost',  type: 'text' },
    { key: 'port',     label: 'Port',     placeholder: sourceType === 'mysql' ? '3306' : '5432', type: 'number' },
    { key: 'database', label: 'Database', placeholder: 'my_database', type: 'text' },
    { key: 'username', label: 'Username', placeholder: 'db_user',    type: 'text' },
    { key: 'password', label: 'Password', placeholder: '••••••••',   type: 'password' },
  ];

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-0)', marginBottom: '4px' }}>
        Configure {SOURCE_TYPES.find(s => s.id === sourceType)?.name}
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '16px' }}>
        Enter the connection details for your database.
      </p>

      {/* Quick connect shortcut */}
      <button
        onClick={() => setConfig({ host: 'db', port: 5432, database: 'dt2_db', username: 'dt2_user', password: 'dt2_pass', ssl: false })}
        style={{
          padding: '10px 16px', borderRadius: '10px', marginBottom: '16px',
          border: '1px solid rgba(16,217,141,0.3)', background: 'rgba(16,217,141,0.06)',
          color: '#10d98d', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center',
        }}
      >
        ⚡ Quick Connect — Local Docker PostgreSQL (dt2_db)
      </button>

      {/* Docker networking hint */}
      <div style={{
        padding: '8px 12px', borderRadius: '8px', marginBottom: '16px',
        background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
        fontSize: '11px', color: '#f59e0b', lineHeight: 1.5,
      }}>
        💡 <b>Docker tip:</b> Since the backend runs inside Docker, use <code style={{ background: 'rgba(245,158,11,0.15)', padding: '1px 4px', borderRadius: '3px' }}>db</code> as host (not <code style={{ background: 'rgba(245,158,11,0.15)', padding: '1px 4px', borderRadius: '3px' }}>localhost</code>). For external databases, use the actual IP or hostname.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {fields.map(f => (
          <div key={f.key} style={{ gridColumn: f.key === 'host' ? '1 / -1' : undefined }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {f.label}
            </label>
            <input
              type={f.type} placeholder={f.placeholder}
              value={config[f.key] || ''}
              onChange={e => setConfig({ ...config, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-0)', color: 'var(--text-0)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        ))}
      </div>

      {/* SSL toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px' }}>
        <button onClick={() => setConfig({ ...config, ssl: !config.ssl })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: config.ssl ? 'var(--accent)' : 'var(--text-2)' }}>
          {config.ssl ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
        </button>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)' }}>Use SSL</span>
      </div>

      {/* Test button */}
      <button onClick={onTest} disabled={testing}
        style={{
          marginTop: '20px', padding: '10px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
          background: 'var(--accent)', color: '#fff', border: 'none', cursor: testing ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', gap: '8px', opacity: testing ? 0.7 : 1,
        }}
      >
        {testing ? <Loader2 size={14} className="spin" /> : <Plug size={14} />}
        {testing ? 'Testing…' : 'Test Connection'}
      </button>

      {testResult && (
        <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: testResult.success ? 'rgba(16,217,141,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${testResult.success ? '#10d98d' : '#ef4444'}30`, color: testResult.success ? '#10d98d' : '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {testResult.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {testResult.success ? testResult.message : testResult.error}
        </div>
      )}
    </div>
  );
}

/* ── Step 3: Schema mapping & preview ───────────────────── */
function Step3({ schema, preview, previewTable, setPreviewTable, onPreview, loadingPreview, onToggleTable, onAlias, onTag }) {
  if (!schema?.tables?.length) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-2)', fontSize: '13px' }}>No schema discovered. Go back and test your connection.</div>;
  }

  const TAG_OPTIONS = ['dimension', 'measure', 'timestamp', 'geo', 'id'];
  const TAG_COLORS = { dimension: '#6366f1', measure: '#10d98d', timestamp: '#f59e0b', geo: '#06b6d4', id: '#94a3b8' };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-0)', marginBottom: '4px' }}>Schema Mapping</h2>
      <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '20px' }}>
        Review discovered tables, toggle visibility, add business aliases, and tag field types.
      </p>

      {schema.tables.map(table => (
        <div key={table.name} style={{ marginBottom: '16px', borderRadius: '12px', border: `1px solid ${table.enabled !== false ? 'var(--border)' : 'rgba(100,116,139,0.2)'}`, overflow: 'hidden', opacity: table.enabled !== false ? 1 : 0.5 }}>
          {/* Table header */}
          <div style={{ padding: '10px 14px', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)' }}>
            <button onClick={() => onToggleTable(table.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: table.enabled !== false ? 'var(--accent)' : 'var(--text-2)' }}>
              {table.enabled !== false ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            </button>
            <Table2 size={14} color="var(--accent)" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-0)' }}>{table.name}</span>
            <span style={{ fontSize: '10px', color: 'var(--text-2)', marginLeft: 'auto' }}>{table.row_count?.toLocaleString() || '?'} rows · {table.columns?.length || 0} columns</span>
            <button onClick={() => { setPreviewTable(table.name); onPreview(table.name); }}
              style={{ padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(72,101,242,0.3)', background: 'rgba(72,101,242,0.06)', color: 'var(--accent)', fontSize: '10px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Eye size={11} /> Preview
            </button>
          </div>

          {/* Columns */}
          {table.enabled !== false && (
            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-1)' }}>
                    <th style={{ padding: '6px 12px', textAlign: 'left', color: 'var(--text-2)', fontWeight: 700 }}>Column</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-2)', fontWeight: 700 }}>Type</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-2)', fontWeight: 700 }}>Alias</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-2)', fontWeight: 700 }}>Tag</th>
                  </tr>
                </thead>
                <tbody>
                  {(table.columns || []).map(col => (
                    <tr key={col.name} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '5px 12px', fontWeight: 600, color: 'var(--text-0)', fontFamily: 'monospace', fontSize: '11px' }}>{col.name}</td>
                      <td style={{ padding: '5px 8px', color: 'var(--text-2)' }}>{col.data_type}</td>
                      <td style={{ padding: '5px 8px' }}>
                        <input
                          value={col.alias || ''}
                          onChange={e => onAlias(table.name, col.name, e.target.value)}
                          placeholder="Business name…"
                          style={{ width: '100%', padding: '3px 6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-0)', color: 'var(--text-0)', fontSize: '10px', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '5px 8px' }}>
                        <select value={col.tag || 'dimension'} onChange={e => onTag(table.name, col.name, e.target.value)}
                          style={{ padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border)', background: `${TAG_COLORS[col.tag || 'dimension']}15`, color: TAG_COLORS[col.tag || 'dimension'], fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          {TAG_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {/* Preview panel */}
      {previewTable && preview.length > 0 && (
        <div style={{ marginTop: '16px', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', background: 'var(--bg-2)', fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }}>
            📋 Preview — {previewTable} ({preview.length} rows)
          </div>
          <div style={{ overflowX: 'auto', maxHeight: '200px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-1)' }}>
                  {Object.keys(preview[0]).map(k => (
                    <th key={k} style={{ padding: '5px 8px', textAlign: 'left', color: 'var(--text-2)', fontWeight: 700, whiteSpace: 'nowrap' }}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    {Object.values(row).map((v, j) => (
                      <td key={j} style={{ padding: '4px 8px', color: 'var(--text-0)', whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {v === null ? <span style={{ color: 'var(--text-2)' }}>null</span> : String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {loadingPreview && <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}><Loader2 size={14} /> Loading preview…</div>}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════
   DataSourceWizard — main component
   ══════════════════════════════════════════════════════════ */
export default function DataSourceWizard() {
  const { setStep: setAppStep } = useTwinStore();

  const [step, setStep] = useState(1);
  const [sourceType, setSourceType] = useState('');
  const [config, setConfig] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [schema, setSchema] = useState(null);
  const [preview, setPreview] = useState([]);
  const [previewTable, setPreviewTable] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dsName, setDsName] = useState('');

  // ── Test connection ──
  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch(`${BASE}/datasources/test`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_type: sourceType, config }),
      });
      const data = await res.json();
      setTestResult(data);

      // Auto-discover schema on success
      if (data.success) {
        const schemaRes = await fetch(`${BASE}/datasources/discover-schema`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_type: sourceType, config }),
        });
        const schemaData = await schemaRes.json();
        setSchema(schemaData);
      }
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    }
    setTesting(false);
  };

  // ── CSV upload ──
  const handleCsvUpload = async (file) => {
    setTesting(true); setTestResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${BASE}/datasources/upload-csv`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.schema) {
        setConfig({ file_content: data.file_content, file_name: data.filename });
        setSchema(data.schema);
        setPreview(data.preview || []);
        setPreviewTable(data.schema.tables?.[0]?.name || '');
        setTestResult({ success: true, message: `Parsed ${data.preview?.length || 0} rows from ${data.filename}` });
      }
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    }
    setTesting(false);
  };

  // ── Preview table ──
  const handlePreview = async (tableName) => {
    setLoadingPreview(true);
    try {
      const res = await fetch(`${BASE}/datasources/preview?table=${tableName}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_type: sourceType, config }),
      });
      const data = await res.json();
      setPreview(data.rows || []);
    } catch {}
    setLoadingPreview(false);
  };

  // ── Schema mutation helpers ──
  const onToggleTable = (tableName) => {
    setSchema(prev => ({
      ...prev,
      tables: prev.tables.map(t => t.name === tableName ? { ...t, enabled: t.enabled === false ? true : false } : t),
    }));
  };
  const onAlias = (tableName, colName, alias) => {
    setSchema(prev => ({
      ...prev,
      tables: prev.tables.map(t => t.name === tableName ? {
        ...t, columns: t.columns.map(c => c.name === colName ? { ...c, alias } : c)
      } : t),
    }));
  };
  const onTag = (tableName, colName, tag) => {
    setSchema(prev => ({
      ...prev,
      tables: prev.tables.map(t => t.name === tableName ? {
        ...t, columns: t.columns.map(c => c.name === colName ? { ...c, tag } : c)
      } : t),
    }));
  };

  // ── Save data source ──
  const handleSave = async () => {
    setSaving(true);
    try {
      const name = dsName || `${SOURCE_TYPES.find(s => s.id === sourceType)?.name} Source`;
      const res = await fetch(`${BASE}/datasources/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          source_type: sourceType,
          config,
          schema_mappings: { tables: schema?.tables || [] },
        }),
      });
      const data = await res.json();
      if (data.id) {
        setAppStep(0); // go back to home
      }
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    }
    setSaving(false);
  };

  const canNext = step === 1 ? !!sourceType
    : step === 2 ? testResult?.success
    : step === 3;

  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '720px', padding: '48px 32px' }}>
        {/* Back to home */}
        <button onClick={() => setAppStep(0)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={14} /> Back to Home
        </button>

        <StepBar step={step} />

        {/* Step content */}
        {step === 1 && <Step1 selected={sourceType} onSelect={t => setSourceType(t)} />}
        {step === 2 && <Step2 sourceType={sourceType} config={config} setConfig={setConfig} testResult={testResult} testing={testing} onTest={handleTest} csvUpload={handleCsvUpload} />}
        {step === 3 && <Step3 schema={schema} preview={preview} previewTable={previewTable} setPreviewTable={setPreviewTable} onPreview={handlePreview} loadingPreview={loadingPreview} onToggleTable={onToggleTable} onAlias={onAlias} onTag={onTag} />}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
            style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, border: '1px solid var(--border)', background: 'var(--bg-0)', color: step === 1 ? 'var(--text-2)' : 'var(--text-0)', cursor: step === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: step === 1 ? 0.4 : 1 }}
          >
            <ChevronLeft size={14} /> Back
          </button>

          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext}
              style={{ padding: '10px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, background: canNext ? 'var(--accent)' : 'var(--bg-2)', color: canNext ? '#fff' : 'var(--text-2)', border: 'none', cursor: canNext ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input value={dsName} onChange={e => setDsName(e.target.value)}
                placeholder="Data source name…"
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-0)', color: 'var(--text-0)', fontSize: '13px', outline: 'none', width: '200px' }}
              />
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '10px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, background: '#10d98d', color: '#fff', border: 'none', cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {saving ? <Loader2 size={14} /> : <CheckCircle size={14} />}
                {saving ? 'Saving…' : 'Save Data Source'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
