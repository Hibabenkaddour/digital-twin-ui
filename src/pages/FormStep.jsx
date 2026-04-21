import { useState } from 'react';
import useTwinStore, { DOMAINS } from '../store/useTwinStore';
import { ChevronRight, ArrowLeft, Check } from 'lucide-react';

const DOMAIN_ICONS = { factory: '🏭', airport: '✈️', warehouse: '📦' };

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
    : '99,149,255';
}

export default function FormStep() {
  const { setStep, setDomain, setTwinName, setDimensions, selectedDomain, twinName, width, length, initScene, createTwin } = useTwinStore();
  const [localName,   setLocalName]   = useState(twinName || '');
  const [localDomain, setLocalDomain] = useState(selectedDomain || '');
  const [localWidth,  setLocalWidth]  = useState(width  || 60);
  const [localLength, setLocalLength] = useState(length || 40);

  const cellSize  = 6;
  const gridCols  = Math.ceil(localWidth  / cellSize);
  const gridRows  = Math.ceil(localLength / cellSize);
  const adjustedW = gridCols * cellSize;
  const adjustedL = gridRows * cellSize;

  const canProceed = localDomain && localName.trim() && localWidth > 0 && localLength > 0;

  const handleNext = () => {
    setDomain(localDomain);
    setTwinName(localName);
    setDimensions(localWidth, localLength);
    initScene();
    createTwin();
    setStep(2);
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
                    padding: '16px 12px', borderRadius: '10px',
                    border: localDomain === key ? `2px solid ${domain.color}` : '1px solid var(--border)',
                    background: localDomain === key ? `rgba(${hexToRgb(domain.color)},0.1)` : 'var(--bg-3)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '8px', transition: 'all 0.2s ease', position: 'relative',
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

          {/* Dimensions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label className="label">Width (meters)</label>
              <input className="input" type="number" min={12} max={600} value={localWidth}  onChange={e => setLocalWidth(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Length (meters)</label>
              <input className="input" type="number" min={12} max={600} value={localLength} onChange={e => setLocalLength(Number(e.target.value))} />
            </div>
          </div>

          {/* Grid summary */}
          {localWidth > 0 && localLength > 0 && (
            <div className="animate-fade" style={{
              padding: '14px 16px', borderRadius: '10px', marginBottom: '28px',
              background: 'rgba(72,101,242,0.08)', border: '1px solid rgba(72,101,242,0.2)',
              display: 'flex', gap: '24px', flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '2px' }}>Adjusted Area</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent)' }}>{adjustedW}m × {adjustedL}m</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '2px' }}>Grid</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent)' }}>{gridCols} × {gridRows} cells</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '2px' }}>Cell Size</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent)' }}>6m²</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
            <button className="btn btn-ghost" onClick={() => setStep(0)}>
              <ArrowLeft size={16} /> Back
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
