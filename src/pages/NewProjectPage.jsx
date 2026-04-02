import { useState } from 'react';
import useTwinStore from '../store/useTwinStore';
import { ArrowLeft, ChevronRight, Check, Sparkles } from 'lucide-react';

const PROJECT_TYPES = [
    { key: 'custom', label: 'Custom', icon: '🏗️', color: '#4865f2', desc: 'Build any type of enterprise space from scratch' },
    { key: 'factory', label: 'Factory', icon: '🏭', color: '#f97316', desc: 'Manufacturing, production lines & machine monitoring' },
    { key: 'airport', label: 'Airport', icon: '✈️', color: '#06b6d4', desc: 'Terminals, gates, runways & passenger flow' },
    { key: 'warehouse', label: 'Warehouse', icon: '📦', color: '#84cc16', desc: 'Racks, docks, logistics & inventory management' },
];

const ACCENT_COLORS = ['#4865f2', '#f97316', '#06b6d4', '#84cc16', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];

export default function NewProjectPage() {
    const { setStep, createProject, setActiveProject, addBuilding } = useTwinStore();

    const [name, setName] = useState('');
    const [type, setType] = useState('custom');
    const [color, setColor] = useState('#4865f2');
    const [siteWidth, setSiteWidth] = useState(200);
    const [siteLength, setSiteLength] = useState(150);

    const canProceed = name.trim().length > 0;

    const handleCreate = () => {
        const id = createProject({ name: name.trim(), type, color, siteWidth, siteLength });
        setActiveProject(id);
        setStep(2); // Go to site plan
    };

    const selectedType = PROJECT_TYPES.find(t => t.key === type);

    return (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
            <div style={{ width: '100%', maxWidth: '720px' }}>
                {/* Back */}
                <button className="btn btn-ghost btn-sm" onClick={() => setStep(0)} style={{ marginBottom: '24px' }}>
                    <ArrowLeft size={14} /> Back to Projects
                </button>

                <div className="glass animate-fade" style={{ padding: '44px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '14px',
                            background: `${color}18`, border: `1px solid ${color}33`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px'
                        }}>
                            {selectedType?.icon}
                        </div>
                        <div>
                            <h2 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>Create New Project</h2>
                            <p style={{ color: 'var(--text-1)', fontSize: '13px' }}>Define your digital twin project settings</p>
                        </div>
                    </div>

                    {/* Project name */}
                    <div style={{ marginBottom: '28px' }}>
                        <label className="label">Project Name</label>
                        <input
                            className="input"
                            placeholder='e.g. "HQ Campus", "North Factory", "Terminal 2"'
                            value={name}
                            onChange={e => setName(e.target.value)}
                            autoFocus
                            style={{ fontSize: '16px' }}
                        />
                    </div>

                    {/* Project type */}
                    <div style={{ marginBottom: '28px' }}>
                        <label className="label">Project Type</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            {PROJECT_TYPES.map(pt => (
                                <button
                                    key={pt.key}
                                    onClick={() => { setType(pt.key); setColor(pt.color); }}
                                    style={{
                                        padding: '16px',
                                        borderRadius: '12px',
                                        border: type === pt.key ? `2px solid ${pt.color}` : '1px solid var(--border)',
                                        background: type === pt.key ? `${pt.color}0d` : 'var(--bg-3)',
                                        cursor: 'pointer', textAlign: 'left',
                                        position: 'relative', transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={e => { if (type !== pt.key) { e.currentTarget.style.borderColor = `${pt.color}66`; e.currentTarget.style.background = `${pt.color}06`; } }}
                                    onMouseLeave={e => { if (type !== pt.key) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-3)'; } }}
                                >
                                    {type === pt.key && (
                                        <div style={{ position: 'absolute', top: '10px', right: '10px', width: '18px', height: '18px', borderRadius: '50%', background: pt.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Check size={10} color="#fff" strokeWidth={3} />
                                        </div>
                                    )}
                                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{pt.icon}</div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-0)', marginBottom: '4px' }}>{pt.label}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-1)', lineHeight: 1.4 }}>{pt.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Accent color */}
                    <div style={{ marginBottom: '28px' }}>
                        <label className="label">Accent Color</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {ACCENT_COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    style={{
                                        width: '32px', height: '32px', borderRadius: '8px',
                                        background: c, border: color === c ? `3px solid ${c}` : '3px solid transparent',
                                        outline: color === c ? `2px solid var(--text-0)` : 'none',
                                        cursor: 'pointer', outlineOffset: '2px',
                                        transition: 'all 0.15s',
                                        transform: color === c ? 'scale(1.15)' : 'scale(1)',
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Site dimensions */}
                    <div style={{ marginBottom: '28px' }}>
                        <label className="label">Site Dimensions</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '6px', display: 'block' }}>Width (meters)</label>
                                <input className="input" type="number" min={50} max={2000} value={siteWidth} onChange={e => setSiteWidth(Number(e.target.value))} />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '6px', display: 'block' }}>Length (meters)</label>
                                <input className="input" type="number" min={50} max={2000} value={siteLength} onChange={e => setSiteLength(Number(e.target.value))} />
                            </div>
                        </div>
                        {/* Preview info */}
                        <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: '10px', background: `${color}0d`, border: `1px solid ${color}22`, display: 'flex', gap: '24px' }}>
                            <div><div style={{ fontSize: '10px', color: 'var(--text-2)', marginBottom: '2px' }}>Total Area</div><div style={{ fontSize: '14px', fontWeight: 700, color }}>{(siteWidth * siteLength).toLocaleString()} m²</div></div>
                            <div><div style={{ fontSize: '10px', color: 'var(--text-2)', marginBottom: '2px' }}>Site</div><div style={{ fontSize: '14px', fontWeight: 700, color }}>{siteWidth}m × {siteLength}m</div></div>
                            <div><div style={{ fontSize: '10px', color: 'var(--text-2)', marginBottom: '2px' }}>Next Step</div><div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)' }}>Place buildings →</div></div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost" onClick={() => setStep(0)}>Cancel</button>
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={handleCreate}
                            disabled={!canProceed}
                            style={{ opacity: canProceed ? 1 : 0.4, cursor: canProceed ? 'pointer' : 'not-allowed' }}
                        >
                            <Sparkles size={16} />
                            Create Project
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
