import { useState } from 'react';
import useTwinStore from '../store/useTwinStore';
import { Plus, Folder, Building2, Layers, Play, Sparkles, Clock, ArrowRight, Trash2, ChevronRight } from 'lucide-react';

const TYPE_META = {
    custom:    { icon: '🏗️', color: '#4865f2', label: 'Custom' },
    factory:   { icon: '🏭', color: '#f97316', label: 'Factory' },
    airport:   { icon: '✈️', color: '#06b6d4', label: 'Airport' },
    warehouse: { icon: '📦', color: '#84cc16', label: 'Warehouse' },
};

export default function ProjectsPage() {
    const { projects, setStep, setActiveProject, deleteProject, loadDemo } = useTwinStore();
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const handleOpen = (projectId) => {
        setActiveProject(projectId);
        setStep(2); // Go to site plan
    };

    const handleDelete = (id) => {
        deleteProject(id);
        setDeleteConfirm(null);
    };

    return (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Hero */}
            <div style={{
                padding: '64px 60px 48px',
                background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(72,101,242,0.08) 0%, transparent 70%)',
                borderBottom: '1px solid var(--border)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                    <span className="badge badge-blue" style={{ padding: '6px 16px', fontSize: '12px' }}>
                        <Sparkles size={12} />
                        DXC Technology · Intelligent Analytics Platform
                    </span>
                </div>

                <h1 style={{
                    fontSize: 'clamp(32px,4.5vw,56px)', fontWeight: 900,
                    lineHeight: 1.05, letterSpacing: '-0.03em', marginBottom: '16px', textAlign: 'center',
                    background: 'linear-gradient(135deg, #1e293b 0%, #4865f2 60%, #f4723e 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                    3D Digital Twin Platform
                </h1>
                <p style={{ fontSize: '17px', color: 'var(--text-1)', maxWidth: '500px', margin: '0 auto 36px', lineHeight: 1.6, textAlign: 'center' }}>
                    Build custom multi-building projects with multi-floor interior editors, sections, and live KPI analytics.
                </p>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={() => setStep(1)}
                        id="create-new-project-btn"
                    >
                        <Plus size={18} />
                        Create New Project
                    </button>
                    <button
                        className="btn btn-ghost btn-lg"
                        onClick={() => { loadDemo(); setStep(5); }}
                    >
                        <Play size={18} />
                        View Live Demo
                    </button>
                </div>
            </div>

            {/* Projects grid */}
            <div style={{ padding: '48px 60px', flex: 1 }}>
                {projects.length === 0 ? (
                    <EmptyState onCreate={() => setStep(1)} />
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                                    Your Projects
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</div>
                            </div>
                            <button className="btn btn-primary" onClick={() => setStep(1)}>
                                <Plus size={15} /> New Project
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                            {projects.map(project => {
                                const meta = TYPE_META[project.type] || TYPE_META.custom;
                                const buildingCount = (project._buildings || []).length;
                                return (
                                    <div
                                        key={project.id}
                                        className="glass"
                                        style={{ padding: '28px', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.25s ease' }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 40px ${meta.color}22`; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                                        onClick={() => handleOpen(project.id)}
                                    >
                                        {/* Color accent */}
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${meta.color}, ${meta.color}88)` }} />

                                        {/* Header */}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '44px', height: '44px', borderRadius: '12px',
                                                    background: `${meta.color}18`, border: `1px solid ${meta.color}33`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'
                                                }}>
                                                    {meta.icon}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-0)', marginBottom: '2px' }}>{project.name}</div>
                                                    <div style={{ fontSize: '11px', color: meta.color, fontWeight: 600 }}>{meta.label}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={e => { e.stopPropagation(); setDeleteConfirm(project.id); }}
                                                style={{ padding: '5px', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', opacity: 0.5 }}
                                                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = 'transparent'; }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        {/* Stats */}
                                        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                            {[
                                                { icon: <Building2 size={12} />, label: `${buildingCount} building${buildingCount !== 1 ? 's' : ''}` },
                                                { icon: <Layers size={12} />, label: `${project.siteWidth}×${project.siteLength}m site` },
                                            ].map((stat, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-2)' }}>
                                                    {stat.icon} {stat.label}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Footer */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-2)' }}>
                                                <Clock size={10} />
                                                {new Date(project.modifiedAt).toLocaleDateString()}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: meta.color }}>
                                                Open <ChevronRight size={13} />
                                            </div>
                                        </div>

                                        {/* Delete confirm overlay */}
                                        {deleteConfirm === project.id && (
                                            <div
                                                onClick={e => e.stopPropagation()}
                                                style={{
                                                    position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.96)',
                                                    borderRadius: 'inherit', display: 'flex', flexDirection: 'column',
                                                    alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '20px'
                                                }}
                                            >
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-0)', textAlign: 'center' }}>Delete "{project.name}"?</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-2)', textAlign: 'center' }}>This action cannot be undone.</div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(project.id)}>Delete</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function EmptyState({ onCreate }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', textAlign: 'center' }}>
            <div style={{
                width: '80px', height: '80px', borderRadius: '24px',
                background: 'rgba(72,101,242,0.08)', border: '1px solid rgba(72,101,242,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '36px', marginBottom: '24px',
            }}>
                🏗️
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-0)', marginBottom: '8px' }}>No projects yet</div>
            <div style={{ fontSize: '14px', color: 'var(--text-1)', maxWidth: '360px', lineHeight: 1.6, marginBottom: '28px' }}>
                Create your first project to start building digital twins with multi-floor layouts, sections, and live analytics.
            </div>
            <button className="btn btn-primary btn-lg" onClick={onCreate}>
                <Plus size={18} /> Create Your First Project
            </button>
        </div>
    );
}
