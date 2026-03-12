import { useState, Suspense } from 'react';
import useTwinStore, { DOMAINS } from '../store/useTwinStore';
import Grid2D from '../components/Grid2D';
import Scene3D from '../components/Scene3D';

const VIEWS = ['2D Grid', '3D Preview', 'Split'];

export default function GridStep() {
    const { selectedDomain, components, gridCols, gridRows, setStep, addComponent } = useTwinStore();
    const [view, setView] = useState('Split');
    const [aiPrompt, setAiPrompt] = useState(false);
    const [promptText, setPromptText] = useState('');
    const [justAdded, setJustAdded] = useState(null);

    const domain = DOMAINS[selectedDomain];
    const blueprints = domain?.components || [];

    const handleAdd = (type) => {
        addComponent(type);
        setJustAdded(type);
        setTimeout(() => setJustAdded(null), 1200);
    };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
                {/* Component palette */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: '4px', flexShrink: 0 }}>
                        + Add
                    </span>
                    {blueprints.map(bp => (
                        <button
                            key={bp.type}
                            onClick={() => handleAdd(bp.type)}
                            title={`Add ${bp.name} to grid`}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '4px 10px', borderRadius: '8px', cursor: 'pointer',
                                background: justAdded === bp.type ? `${bp.color}30` : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${justAdded === bp.type ? bp.color : 'rgba(255,255,255,0.08)'}`,
                                color: justAdded === bp.type ? bp.color : 'var(--text-1)',
                                fontSize: '11px', fontWeight: 500, transition: 'all 0.2s',
                                transform: justAdded === bp.type ? 'scale(1.05)' : 'scale(1)',
                            }}
                            onMouseEnter={e => { if (justAdded !== bp.type) { e.currentTarget.style.background = `${bp.color}18`; e.currentTarget.style.borderColor = bp.color; e.currentTarget.style.color = bp.color; } }}
                            onMouseLeave={e => { if (justAdded !== bp.type) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text-1)'; } }}
                        >
                            <span style={{ fontSize: '13px' }}>{getIcon(bp.type)}</span>
                            {bp.name}
                        </button>
                    ))}
                </div>

                {/* View toggle */}
                <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-0)', borderRadius: '8px', padding: '2px', flexShrink: 0 }}>
                    {VIEWS.map(v => (
                        <button key={v} onClick={() => setView(v)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 500, transition: 'all 0.15s', background: view === v ? 'var(--accent)' : 'transparent', color: view === v ? '#fff' : 'var(--text-2)' }}>
                            {v}
                        </button>
                    ))}
                </div>

                {/* AI Prompt toggle */}
                <button
                    onClick={() => setAiPrompt(p => !p)}
                    style={{ padding: '4px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: aiPrompt ? 'rgba(99,149,255,0.15)' : 'transparent', color: aiPrompt ? 'var(--accent)' : 'var(--text-2)', fontSize: '11px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}
                >
                    🤖 AI Prompt
                </button>

                {/* Component count badge */}
                <div style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(99,149,255,0.1)', border: '1px solid rgba(99,149,255,0.2)', fontSize: '11px', fontWeight: 600, color: 'var(--accent)', flexShrink: 0 }}>
                    {components.length} components
                </div>
            </div>

            {/* AI Prompt Bar */}
            {aiPrompt && (
                <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(99,149,255,0.04)', display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '16px', paddingTop: '4px' }}>🤖</span>
                    <input
                        value={promptText}
                        onChange={e => setPromptText(e.target.value)}
                        placeholder={`Describe what to add, e.g. "Add 2 more conveyor belts near the shipping dock"`}
                        style={{ flex: 1, background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', color: 'var(--text-0)', fontSize: '12px', outline: 'none' }}
                    />
                    <button
                        onClick={() => {
                            // Simulate AI adding components
                            if (promptText.toLowerCase().includes('conveyor')) handleAdd('conveyor_belt');
                            else if (promptText.toLowerCase().includes('rack')) handleAdd('warehouse_rack');
                            else blueprints[0] && handleAdd(blueprints[0].type);
                            setPromptText('');
                        }}
                        style={{ padding: '6px 16px', borderRadius: '8px', background: 'var(--accent)', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Generate
                    </button>
                </div>
            )}

            {/* Main area */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
                {/* 2D Grid pane */}
                {(view === '2D Grid' || view === 'Split') && (
                    <div style={{ flex: view === 'Split' ? '0 0 50%' : '1', borderRight: view === 'Split' ? '1px solid var(--border)' : 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-1)' }}>⬜ 2D EDITOR</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-2)' }}>Drag components to reposition • {gridCols}×{gridRows} cells</span>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto' }}>
                            <Grid2D />
                        </div>
                    </div>
                )}

                {/* 3D Preview pane */}
                {(view === '3D Preview' || view === 'Split') && (
                    <div style={{ flex: view === 'Split' ? '0 0 50%' : '1', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-1)' }}>⬡ 3D PREVIEW</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-2)' }}>Orbit · Scroll to Zoom · Ctrl+drag to move</span>
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Scene3D />
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom nav */}
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <button className="btn btn-ghost" onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ← Back
                </button>
                <button className="btn btn-primary" onClick={() => setStep(3)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Next: Connections →
                </button>
            </div>
        </div>
    );
}

function getIcon(type) {
    const icons = { terminal: '🏢', gate: '🚪', runway: '✈️', checkin_desk: '🖥️', security_zone: '🔒', baggage_claim: '🧳', hydraulic_press: '⚙️', conveyor_belt: '📦', cnc_machine: '🔩', assembly_station: '🔧', quality_control: '🔍', warehouse_rack: '📚', storage_rack: '📚', picking_zone: '🚜', reception_dock: '📥', shipping_dock: '📤', conveyor: '📦', sorter: '🔄' };
    return icons[type] || '⬛';
}
