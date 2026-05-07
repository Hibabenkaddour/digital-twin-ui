import useTwinStore from '../store/useTwinStore';
import { doLogout } from '../services/keycloak';
import { LogOut, User } from 'lucide-react';

const STEPS = [
    { id: 1, label: 'Configure' },
    { id: 2, label: 'Layout' },
    { id: 3, label: 'Connections' },
    { id: 4, label: 'KPIs' },
    { id: 5, label: 'Live View' },
];

export default function Navbar() {
    const { currentStep, setStep, user } = useTwinStore();
    const isInWizard = currentStep >= 1;

    // Extract display name from Keycloak token claims
    const displayName = user?.preferred_username || user?.given_name || user?.email || 'User';
    const initials = displayName.slice(0, 2).toUpperCase();

    return (
        <nav style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '0 20px', height: '52px', flexShrink: 0,
            borderBottom: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
            position: 'relative', zIndex: 100,
        }}>
            {/* Logo */}
            <button
                onClick={() => setStep(0)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    cursor: 'pointer', background: 'none', border: 'none', padding: '4px',
                    borderRadius: '8px', transition: 'background 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-dim)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
                {/* Logo mark */}
                <div style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    background: 'linear-gradient(135deg, #4865f2, #f4723e)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 900, color: 'white',
                    boxShadow: '0 0 12px rgba(72,101,242,0.4)',
                }}>
                    ⬡
                </div>
                <div style={{ lineHeight: 1.1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-0)', letterSpacing: '-0.01em' }}>
                        Digital Twin
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-2)', fontWeight: 500 }}>
                        DXC Intelligent Analytics
                    </div>
                </div>
            </button>

            {/* Wizard breadcrumb */}
            {isInWizard && (
                <>
                    <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />
                    <div className="step-wizard" style={{ flex: 1 }}>
                        {STEPS.map((step, i) => (
                            <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
                                <div
                                    className={`step-item ${currentStep === step.id ? 'active' : currentStep > step.id ? 'done' : ''}`}
                                    style={{ cursor: currentStep > step.id ? 'pointer' : 'default' }}
                                    onClick={() => currentStep > step.id && setStep(step.id)}
                                >
                                    <div className="step-circle">
                                        {currentStep > step.id ? '✓' : step.id}
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 500, display: window.innerWidth > 600 ? 'block' : 'none' }}>
                                        {step.label}
                                    </span>
                                </div>
                                {i < STEPS.length - 1 && <div className="step-sep" />}
                            </div>
                        ))}
                    </div>
                </>
            )}

            <div style={{ flex: isInWizard ? 0 : 1 }} />

            {/* Right corner: user info + logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* DXC brand pill */}
                <div style={{
                    padding: '4px 12px', borderRadius: '6px',
                    background: 'rgba(72,101,242,0.08)',
                    border: '1px solid rgba(72,101,242,0.15)',
                    fontSize: '11px', fontWeight: 700, color: 'var(--accent)',
                    letterSpacing: '0.06em',
                }}>
                    DXC Technology
                </div>

                {/* User avatar */}
                {user && (
                    <div
                        title={displayName}
                        style={{
                            width: '30px', height: '30px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #4865f2, #f4723e)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: 700, color: 'white',
                            cursor: 'default', flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(72,101,242,0.3)',
                        }}
                    >
                        {initials}
                    </div>
                )}

                {/* Logout button */}
                <button
                    onClick={doLogout}
                    title={`Sign out (${displayName})`}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '5px 10px', borderRadius: '7px',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        cursor: 'pointer', fontSize: '12px',
                        fontWeight: 500, color: 'var(--text-1)',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                        e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
                        e.currentTarget.style.color = '#ef4444';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.color = 'var(--text-1)';
                    }}
                >
                    <LogOut size={13} />
                    <span style={{ display: window.innerWidth > 700 ? 'inline' : 'none' }}>Sign out</span>
                </button>
            </div>
        </nav>
    );
}
