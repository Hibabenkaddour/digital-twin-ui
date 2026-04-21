import { useState } from 'react';
import useTwinStore, { DOMAINS } from '../store/useTwinStore';
import { ChevronRight, ArrowLeft, Check, Layers } from 'lucide-react';

const DOMAIN_ICONS = { factory: '🏭', airport: '✈️', warehouse: '📦' };

export default function FormStep() {
    const { setStep, setDomain, setTwinName, setDimensions, setNumFloors, selectedDomain, twinName, width, length, numFloors, initScene, createTwin } = useTwinStore();
    const [localName, setLocalName] = useState(twinName || '');
    const [localDomain, setLocalDomain] = useState(selectedDomain || '');
    const [localWidth, setLocalWidth] = useState(width || 60);
    const [localLength, setLocalLength] = useState(length || 40);
    const [localFloors, setLocalFloors] = useState(numFloors || 1);

    const cellSize = 6;
    const gridCols = Math.ceil(localWidth / cellSize);
    const gridRows = Math.ceil(localLength / cellSize);
    const adjustedW = gridCols * cellSize;
    const adjustedL = gridRows * cellSize;

    const canProceed = localDomain && localName.trim() && localWidth > 0 && localLength > 0;

    const handleNext = () => {
        setDomain(localDomain);
        setTwinName(localName);
        setDimensions(localWidth, localLength);
        setNumFloors(localFloors);
        initScene();
        createTwin();
        setStep(2);
    };

    const handleFloors = (val) => {
        const n = Math.max(1, Math.min(10, val));
        setLocalFloors(n);
    };

    return (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
            <div style={{ width: '100%', maxWidth: '680px' }}>
                <div className="glass animate-fade" style={{ padding: '40px' }}>
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '8px' }}>
                            Configure Your Twin
                        </h2>
                        <p style={{ color: 'var(--text-1)', fontSize: '14px' }}>
                            Set the domain and spatial parameters to begin building your digital twin.
                        </p>
                    </div>

                    {/* Twin name */}
                    <div style={{ marginBottom: '24px' }}>
                        <label className="label">Twin Name</label>
                        <input
                            className="input"
                            placeholder="e.g. Main Production Floor"
                            value={localName}
                            onChange={e => setLocalName(e.target.value)}
                        />
                    </div>

                    {/* Domain selection */}
                    <div style={{ marginBottom: '24px' }}>
                        <label className="label">Domain</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                            {Object.entries(DOMAINS).map(([key, domain]) => (
                                <button
                                    key={key}
                                    onClick={() => setLocalDomain(key)}
                                    style={{
                                        padding: '16px 12px',
                                        borderRadius: '10px',
                                        border: localDomain === key
                                            ? `2px solid ${domain.color}`
                                            : '1px solid var(--border)',
                                        background: localDomain === key
                                            ? `rgba(${hexToRgb(domain.color)},0.1)`
                                            : 'var(--bg-3)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s ease',
                                        position: 'relative',
                                    }}
                                >
                                    {localDomain === key && (
                                        <div style={{
                                            position: 'absolute', top: '8px', right: '8px',
                                            width: '18px', height: '18px', borderRadius: '50%',
                                            background: domain.color,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Check size={10} color="#000" strokeWidth={3} />
                                        </div>
                                    )}
                                    <span style={{ fontSize: '28px' }}>{DOMAIN_ICONS[key]}</span>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: localDomain === key ? 'var(--text-0)' : 'var(--text-1)' }}>
                                        {domain.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dimensions + Floors row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        <div>
                            <label className="label">Width (meters)</label>
                            <input
                                className="input"
                                type="number"
                                min={12}
                                max={600}
                                value={localWidth}
                                onChange={e => setLocalWidth(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="label">Length (meters)</label>
                            <input
                                className="input"
                                type="number"
                                min={12}
                                max={600}
                                value={localLength}
                                onChange={e => setLocalLength(Number(e.target.value))}
                            />
                        </div>
                        {/* ── Floors stepper ── */}
                        <div>
                            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Layers size={12} />
                                Number of Floors
                            </label>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0',
                                background: 'var(--bg-3)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                height: '40px',
                            }}>
                                <button
                                    onClick={() => handleFloors(localFloors - 1)}
                                    disabled={localFloors <= 1}
                                    style={{
                                        width: '40px', height: '100%', border: 'none',
                                        background: 'transparent',
                                        color: localFloors <= 1 ? 'var(--text-2)' : 'var(--text-0)',
                                        fontSize: '18px', fontWeight: 700, cursor: localFloors <= 1 ? 'not-allowed' : 'pointer',
                                        opacity: localFloors <= 1 ? 0.3 : 1,
                                        borderRight: '1px solid var(--border)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}
                                >−</button>
                                <div style={{
                                    flex: 1, textAlign: 'center',
                                    fontSize: '15px', fontWeight: 700,
                                    color: 'var(--accent)',
                                }}>
                                    {localFloors}
                                </div>
                                <button
                                    onClick={() => handleFloors(localFloors + 1)}
                                    disabled={localFloors >= 10}
                                    style={{
                                        width: '40px', height: '100%', border: 'none',
                                        background: 'transparent',
                                        color: localFloors >= 10 ? 'var(--text-2)' : 'var(--text-0)',
                                        fontSize: '18px', fontWeight: 700, cursor: localFloors >= 10 ? 'not-allowed' : 'pointer',
                                        opacity: localFloors >= 10 ? 0.3 : 1,
                                        borderLeft: '1px solid var(--border)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}
                                >+</button>
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-2)', marginTop: '4px', textAlign: 'center' }}>
                                {localFloors === 1 ? 'Single level' : `${localFloors} stacked levels`}
                            </div>
                        </div>
                    </div>

                    {/* Grid summary */}
                    {localWidth > 0 && localLength > 0 && (
                        <div
                            className="animate-fade"
                            style={{
                                padding: '14px 16px',
                                borderRadius: '10px',
                                background: 'rgba(72,101,242,0.08)',
                                border: '1px solid rgba(72,101,242,0.2)',
                                marginBottom: '28px',
                                display: 'flex',
                                gap: '24px',
                                flexWrap: 'wrap',
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '2px' }}>Adjusted Area</div>
                                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent)' }}>
                                    {adjustedW}m × {adjustedL}m
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '2px' }}>Grid</div>
                                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent)' }}>
                                    {gridCols} × {gridRows} cells
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '2px' }}>Cell Size</div>
                                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent)' }}>6m²</div>
                            </div>
                            {localFloors > 1 && (
                                <div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '2px' }}>Floors</div>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Layers size={14} />
                                        {localFloors}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
                        <button className="btn btn-ghost" onClick={() => setStep(0)}>
                            <ArrowLeft size={16} />
                            Back
                        </button>
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={handleNext}
                            disabled={!canProceed}
                            style={{ opacity: canProceed ? 1 : 0.4, cursor: canProceed ? 'pointer' : 'not-allowed' }}
                        >
                            Next: Place Components
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
        : '99,149,255';
}
