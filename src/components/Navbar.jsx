import useTwinStore from '../store/useTwinStore';
import { Home, Building2, Layers, ChevronRight } from 'lucide-react';

// Breadcrumb steps for the new project flow
const PROJECT_STEPS = [
    { id: 1, label: 'New Project', icon: '📋' },
    { id: 2, label: 'Site Plan',   icon: '🗺️' },
    { id: 4, label: 'Floor Editor',icon: '🏢' },
    { id: 5, label: 'Live View',   icon: '📊' },
];

export default function Navbar() {
    const { currentStep, setStep, getActiveProject, getActiveBuilding } = useTwinStore();
    const project = getActiveProject?.() || null;
    const building = getActiveBuilding?.() || null;

    const isInProjectFlow = currentStep >= 1 && currentStep <= 5;
    const showProjectBreadcrumb = project && currentStep >= 2;

    return (
        <nav style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '0 18px', height: '52px', flexShrink: 0,
            borderBottom: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
            position: 'relative', zIndex: 100,
        }}>
            {/* Logo / Home */}
            <button
                onClick={() => setStep(0)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '9px',
                    cursor: 'pointer', background: 'none', border: 'none', padding: '4px 6px',
                    borderRadius: '8px', transition: 'background 0.2s ease', flexShrink: 0,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-dim)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    background: 'linear-gradient(135deg, #4865f2, #f4723e)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 900, color: 'white',
                    boxShadow: '0 0 12px rgba(72,101,242,0.35)',
                    flexShrink: 0,
                }}>
                    ⬡
                </div>
                <div style={{ lineHeight: 1.1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-0)', letterSpacing: '-0.01em' }}>
                        Digital Twin
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 500 }}>
                        DXC Intelligent Analytics
                    </div>
                </div>
            </button>

            {/* Breadcrumb */}
            {isInProjectFlow && (
                <>
                    <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

                    {/* Step trail */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1, overflow: 'hidden' }}>
                        {/* Home crumb */}
                        <button
                            onClick={() => setStep(0)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 7px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '11px', color: 'var(--text-2)', flexShrink: 0, transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)'; }}
                        >
                            <Home size={11} /> Projects
                        </button>

                        {showProjectBreadcrumb && (
                            <>
                                <ChevronRight size={11} style={{ color: 'var(--text-2)', flexShrink: 0 }} />
                                <button
                                    onClick={() => setStep(2)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 7px', borderRadius: '6px', border: 'none', background: currentStep === 2 ? 'var(--accent-dim)' : 'transparent', cursor: 'pointer', fontSize: '11px', color: currentStep === 2 ? 'var(--accent)' : 'var(--text-2)', flexShrink: 0, fontWeight: currentStep === 2 ? 700 : 400, transition: 'all 0.15s', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    onMouseEnter={e => { if (currentStep !== 2) { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent)'; } }}
                                    onMouseLeave={e => { if (currentStep !== 2) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)'; } }}
                                >
                                    {project.name}
                                </button>
                            </>
                        )}

                        {building && currentStep === 4 && (
                            <>
                                <ChevronRight size={11} style={{ color: 'var(--text-2)', flexShrink: 0 }} />
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 7px', borderRadius: '6px', background: 'var(--accent-dim)', fontSize: '11px', color: 'var(--accent)', fontWeight: 700, flexShrink: 0, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <Building2 size={10} /> {building.name}
                                </span>
                            </>
                        )}

                        {currentStep === 5 && (
                            <>
                                <ChevronRight size={11} style={{ color: 'var(--text-2)', flexShrink: 0 }} />
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 7px', borderRadius: '6px', background: 'rgba(16,217,141,0.1)', fontSize: '11px', color: '#10d98d', fontWeight: 700, flexShrink: 0 }}>
                                    <span style={{ fontSize: '8px' }}>●</span> Live View
                                </span>
                            </>
                        )}
                    </div>
                </>
            )}

            {!isInProjectFlow && <div style={{ flex: 1 }} />}

            {/* Right: DXC brand pill */}
            <div style={{
                padding: '4px 12px', borderRadius: '6px',
                background: 'rgba(72,101,242,0.08)',
                border: '1px solid rgba(72,101,242,0.15)',
                fontSize: '11px', fontWeight: 700, color: 'var(--accent)',
                letterSpacing: '0.06em', flexShrink: 0,
            }}>
                DXC Technology
            </div>
        </nav>
    );
}
