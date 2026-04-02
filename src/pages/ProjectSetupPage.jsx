import { useState } from 'react';
import useTwinStore from '../store/useTwinStore';
import { ArrowLeft, Plus, Trash2, ChevronRight, Building2, Check } from 'lucide-react';

const BUILDING_COLORS = ['#4865f2', '#f4723e', '#10b981', '#f59e0b', '#a855f7', '#0ea5e9', '#ec4899', '#84cc16', '#22d3ee', '#fb923c'];

function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}` : '72,101,242';
}

export default function ProjectSetupPage() {
    const { setStep, createProject, addBuilding, addFloor, setActiveProject, setActiveBuilding } = useTwinStore();

    const [wizStep, setWizStep] = useState(1);
    const [projName, setProjName] = useState('');
    const [projDesc, setProjDesc] = useState('');
    const [buildings, setBuildings] = useState([]);

    // Building form
    const [bName, setBName] = useState('');
    const [bColor, setBColor] = useState(BUILDING_COLORS[0]);
    const [bW, setBW] = useState(12);
    const [bD, setBD] = useState(10);
    const [bFloors, setBFloors] = useState(3);
    const [addingBuilding, setAddingBuilding] = useState(false);

    const canProceed1 = projName.trim().length > 0;
    const canProceed2 = buildings.length > 0;

    const handleAddBuilding = () => {
        if (!bName.trim()) return;
        setBuildings(prev => [...prev, {
            id: `tmp_${Date.now()}`,
            name: bName.trim(),
            color: bColor,
            dimensions: { w: bW, d: bD },
            floorsCount: bFloors,
        }]);
        setBName('');
        const next = BUILDING_COLORS[buildings.length % BUILDING_COLORS.length + 1] || BUILDING_COLORS[0];
        setBColor(next);
        setBW(12); setBD(10); setBFloors(3);
        setAddingBuilding(false);
    };

    const removeBuilding = (id) => setBuildings(prev => prev.filter(b => b.id !== id));

    const handleCreate = () => {
        const projId = createProject(projName.trim(), projDesc.trim());
        setActiveProject(projId);
        // Add buildings + floors
        buildings.forEach(b => {
            const bldId = addBuilding(projId, b.name, { color: b.color, dimensions: b.dimensions });
            for (let i = 1; i <= b.floorsCount; i++) {
                addFloor(projId, bldId, `Floor ${i}`, { gridCols: b.dimensions.w, gridRows: b.dimensions.d });
            }
        });
        setStep(7); // → SiteView page
    };

    const steps = ['Project Info', 'Buildings', 'Review'];

    return (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: 'var(--bg-0)' }}>
            <div style={{ width: '100%', maxWidth: '740px' }}>
                {/* Progress */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '32px', justifyContent: 'center' }}>
                    {steps.map((s, i) => (
                        <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: i + 1 < wizStep ? 'pointer' : 'default' }} onClick={() => i + 1 < wizStep && setWizStep(i + 1)}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, transition: 'all 0.25s', background: wizStep > i + 1 ? '#10b981' : wizStep === i + 1 ? 'var(--accent)' : 'var(--bg-3)', color: wizStep >= i + 1 ? '#fff' : 'var(--text-2)', border: wizStep === i + 1 ? '2px solid var(--accent)' : '2px solid transparent' }}>
                                    {wizStep > i + 1 ? <Check size={12} /> : i + 1}
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: wizStep === i + 1 ? 'var(--text-0)' : 'var(--text-2)' }}>{s}</span>
                            </div>
                            {i < steps.length - 1 && <div style={{ width: '48px', height: '2px', background: wizStep > i + 1 ? '#10b981' : 'var(--border)', margin: '0 12px', borderRadius: '2px', transition: 'all 0.3s' }} />}
                        </div>
                    ))}
                </div>

                <div className="glass animate-fade" style={{ padding: '40px' }}>

                    {/* ── Step 1: Project Info ── */}
                    {wizStep === 1 && (
                        <>
                            <div style={{ marginBottom: '32px' }}>
                                <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '8px' }}>Create Custom Project</h2>
                                <p style={{ color: 'var(--text-1)', fontSize: '14px' }}>Define your project to start building a multi-level 3D digital twin with any number of buildings and floors.</p>
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label className="label">Project Name *</label>
                                <input className="input" placeholder="e.g. DXC Headquarters, Innovation Campus…" value={projName} onChange={e => setProjName(e.target.value)} autoFocus />
                            </div>
                            <div style={{ marginBottom: '32px' }}>
                                <label className="label">Description (optional)</label>
                                <textarea className="input" placeholder="Brief description of this project…" rows={3} value={projDesc} onChange={e => setProjDesc(e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <button className="btn btn-ghost" onClick={() => setStep(0)}><ArrowLeft size={16} /> Back</button>
                                <button className="btn btn-primary btn-lg" onClick={() => setWizStep(2)} disabled={!canProceed1} style={{ opacity: canProceed1 ? 1 : 0.4 }}>
                                    Next: Add Buildings <ChevronRight size={18} />
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── Step 2: Buildings ── */}
                    {wizStep === 2 && (
                        <>
                            <div style={{ marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '6px' }}>Add Buildings</h2>
                                <p style={{ color: 'var(--text-1)', fontSize: '13px' }}>Add all buildings for your site. Each building can have its own floors and sections.</p>
                            </div>

                            {/* Building list */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', maxHeight: '280px', overflowY: 'auto' }}>
                                {buildings.length === 0 && (
                                    <div style={{ padding: '32px', textAlign: 'center', borderRadius: '12px', border: '2px dashed var(--border)', color: 'var(--text-2)', fontSize: '13px' }}>
                                        <Building2 size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                        <div>No buildings yet. Add your first building below.</div>
                                    </div>
                                )}
                                {buildings.map((b, idx) => (
                                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', background: 'var(--bg-3)', border: `1px solid ${b.color}40` }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `rgba(${hexToRgb(b.color)},0.15)`, border: `2px solid ${b.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Building2 size={16} color={b.color} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-0)' }}>{b.name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>{b.dimensions.w}×{b.dimensions.d} grid · {b.floorsCount} floor{b.floorsCount !== 1 ? 's' : ''}</div>
                                        </div>
                                        <button onClick={() => removeBuilding(b.id)} style={{ padding: '5px', borderRadius: '6px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', color: '#ef4444', display: 'flex' }}>
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add building form */}
                            {!addingBuilding ? (
                                <button onClick={() => setAddingBuilding(true)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px dashed rgba(72,101,242,0.4)', background: 'rgba(72,101,242,0.04)', cursor: 'pointer', color: 'var(--accent)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px', transition: 'all 0.2s' }}>
                                    <Plus size={16} /> Add Building
                                </button>
                            ) : (
                                <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(72,101,242,0.05)', border: '1px solid rgba(72,101,242,0.2)', marginBottom: '24px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Building</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label className="label">Building Name *</label>
                                            <input className="input" placeholder="e.g. Tower A, Building Alpha…" value={bName} onChange={e => setBName(e.target.value)} autoFocus />
                                        </div>
                                        <div>
                                            <label className="label">Width (grid cols)</label>
                                            <input className="input" type="number" min={5} max={40} value={bW} onChange={e => setBW(Number(e.target.value))} />
                                        </div>
                                        <div>
                                            <label className="label">Depth (grid rows)</label>
                                            <input className="input" type="number" min={5} max={40} value={bD} onChange={e => setBD(Number(e.target.value))} />
                                        </div>
                                        <div>
                                            <label className="label">Number of Floors</label>
                                            <input className="input" type="number" min={1} max={50} value={bFloors} onChange={e => setBFloors(Number(e.target.value))} />
                                        </div>
                                        <div>
                                            <label className="label">Color</label>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '4px' }}>
                                                {BUILDING_COLORS.map(c => (
                                                    <button key={c} onClick={() => setBColor(c)} style={{ width: '22px', height: '22px', borderRadius: '50%', background: c, border: bColor === c ? `3px solid #fff` : '2px solid transparent', cursor: 'pointer', boxShadow: bColor === c ? `0 0 0 2px ${c}` : 'none', transition: 'all 0.15s' }} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => setAddingBuilding(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
                                        <button onClick={handleAddBuilding} className="btn btn-primary" style={{ flex: 2, opacity: bName.trim() ? 1 : 0.4 }} disabled={!bName.trim()}>
                                            <Plus size={14} /> Add Building
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <button className="btn btn-ghost" onClick={() => setWizStep(1)}><ArrowLeft size={16} /> Back</button>
                                <button className="btn btn-primary btn-lg" onClick={() => setWizStep(3)} disabled={!canProceed2} style={{ opacity: canProceed2 ? 1 : 0.4 }}>
                                    Review & Create <ChevronRight size={18} />
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── Step 3: Review ── */}
                    {wizStep === 3 && (
                        <>
                            <div style={{ marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '6px' }}>Review & Create</h2>
                                <p style={{ color: 'var(--text-1)', fontSize: '13px' }}>Your project is ready. You can edit everything later.</p>
                            </div>

                            {/* Summary card */}
                            <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(72,101,242,0.06)', border: '1px solid rgba(72,101,242,0.2)', marginBottom: '24px' }}>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-0)', marginBottom: '4px' }}>🏗️ {projName}</div>
                                {projDesc && <div style={{ fontSize: '13px', color: 'var(--text-1)', marginBottom: '12px' }}>{projDesc}</div>}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                                    {[
                                        { label: 'Buildings', value: buildings.length },
                                        { label: 'Total Floors', value: buildings.reduce((a, b) => a + b.floorsCount, 0) },
                                        { label: 'Sections', value: '∞ (add later)' },
                                    ].map(s => (
                                        <div key={s.label} style={{ textAlign: 'center', padding: '10px', borderRadius: '8px', background: 'var(--bg-3)' }}>
                                            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent)' }}>{s.value}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {buildings.map(b => (
                                        <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-3)' }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: b.color, flexShrink: 0 }} />
                                            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-0)', flex: 1 }}>{b.name}</span>
                                            <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>{b.floorsCount} floors · {b.dimensions.w}×{b.dimensions.d}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <button className="btn btn-ghost" onClick={() => setWizStep(2)}><ArrowLeft size={16} /> Back</button>
                                <button className="btn btn-primary btn-lg" style={{ background: 'linear-gradient(135deg,#4865f2,#f4723e)' }} onClick={handleCreate}>
                                    🚀 Create Project
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
