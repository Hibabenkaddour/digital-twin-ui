import { useState } from 'react';
import useTwinStore, { DOMAINS } from '../store/useTwinStore';
import { ChevronRight, Factory, Plane, Package, Cpu, Layers, Sparkles, ArrowRight, Play } from 'lucide-react';

const DOMAIN_ICONS = { factory: '🏭', airport: '✈️', warehouse: '📦' };
const DOMAIN_DESCS = {
    factory: 'Monitor production lines, machines & manufacturing flows in real time',
    airport: 'Track terminals, gates, runways & passenger flows with live KPIs',
    warehouse: 'Manage racks, picking zones, docks & logistics flows efficiently',
};

export default function HomePage() {
    const { setStep, loadDemo, twins } = useTwinStore();

    return (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Hero */}
            <div
                style={{
                    padding: '80px 60px 60px',
                    background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,149,255,0.08) 0%, transparent 70%)',
                    borderBottom: '1px solid var(--border)',
                    textAlign: 'center',
                }}
            >
                {/* Badge */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    <span className="badge badge-blue" style={{ padding: '6px 16px', fontSize: '12px' }}>
                        <Sparkles size={12} />
                        DXC Technology · Intelligent Analytics
                    </span>
                </div>

                <h1
                    style={{
                        fontSize: 'clamp(36px,5vw,64px)',
                        fontWeight: 900,
                        lineHeight: 1.05,
                        letterSpacing: '-0.03em',
                        marginBottom: '20px',
                        background: 'linear-gradient(135deg, #f0f4ff 0%, #94a3c8 50%, #6395ff 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}
                >
                    3D Digital Twin<br />Platform
                </h1>

                <p style={{ fontSize: '18px', color: 'var(--text-1)', maxWidth: '540px', margin: '0 auto 40px', lineHeight: 1.6 }}>
                    Create agnostic real-time 3D digital twins for factories, airports and
                    warehouses — with live KPI monitoring and AI-assisted placement.
                </p>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary btn-lg" onClick={() => setStep(1)}>
                        <Play size={18} />
                        Create New Twin
                    </button>
                    <button className="btn btn-ghost btn-lg" onClick={() => { loadDemo(); setStep(5); }}>
                        <Layers size={18} />
                        View Live Demo
                    </button>
                </div>
            </div>

            {/* Domain cards */}
            <div style={{ padding: '48px 60px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '24px' }}>
                    Supported Domains
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px', marginBottom: '48px' }}>
                    {Object.entries(DOMAINS).map(([key, domain]) => (
                        <button
                            key={key}
                            className="glass"
                            onClick={() => { setStep(1); }}
                            style={{
                                padding: '28px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                border: '1px solid var(--border)',
                                borderRadius: '16px',
                                background: 'rgba(17,24,39,0.5)',
                                transition: 'all 0.25s ease',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = domain.color + '55';
                                e.currentTarget.style.transform = 'translateY(-3px)';
                                e.currentTarget.style.boxShadow = `0 8px 32px ${domain.color}22`;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'var(--border)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <div style={{
                                position: 'absolute', top: 0, right: 0, width: '80px', height: '80px',
                                background: `radial-gradient(circle at top right, ${domain.color}22, transparent)`,
                                borderRadius: '0 0 0 80px',
                            }} />
                            <div style={{ fontSize: '36px', marginBottom: '14px' }}>{DOMAIN_ICONS[key]}</div>
                            <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-0)', marginBottom: '8px' }}>
                                {domain.label}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-1)', lineHeight: 1.5, marginBottom: '16px' }}>
                                {DOMAIN_DESCS[key]}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {domain.components.slice(0, 3).map(c => (
                                    <span key={c.type} className="tag" style={{ fontSize: '10px' }}>
                                        {c.name}
                                    </span>
                                ))}
                                <span className="tag" style={{ fontSize: '10px' }}>+{Math.max(0, domain.components.length - 3)} more</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Feature pills */}
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '20px' }}>
                    Platform Features
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {[
                        '🎯 Drag & Drop Placement',
                        '🤖 AI-Assisted Prompts',
                        '📊 Real-Time KPI Monitoring',
                        '🔗 Component Connections',
                        '⚡ Data Adapters (SQL, REST, MQTT)',
                        '📐 Blueprint Catalog',
                        '🔄 Auto-Save & Versioning',
                        '📸 High-Res Screenshots',
                    ].map(f => (
                        <span key={f} className="glass-subtle" style={{
                            padding: '8px 16px',
                            fontSize: '13px',
                            color: 'var(--text-1)',
                            borderRadius: '100px',
                        }}>
                            {f}
                        </span>
                    ))}
                </div>
            </div>

            {/* Existing twins */}
            {twins.length > 0 && (
                <div style={{ padding: '0 60px 48px' }}>
                    <div className="divider" />
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px', marginTop: '16px' }}>
                        Your Twins
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                        {twins.map(twin => (
                            <div key={twin.id} className="glass-subtle" style={{ padding: '16px', cursor: 'pointer' }}>
                                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{DOMAIN_ICONS[twin.domain]}</div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-0)', marginBottom: '4px' }}>{twin.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>{twin.width}m × {twin.length}m</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
