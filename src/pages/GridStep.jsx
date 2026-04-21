import { useState, useEffect } from 'react';
import useTwinStore, { DOMAINS } from '../store/useTwinStore';
import Grid2D from '../components/Grid2D';
import Scene3D from '../components/Scene3D';
import { layoutPrompt, saveLayoutState, checkBackendHealth } from '../services/api';
import { Layers, Plus, Minus } from 'lucide-react';

const VIEWS = ['2D Grid', '3D Preview', 'Split'];

const FLOOR_COLORS = [
  '#4865f2', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
  '#84cc16', '#64748b',
];

export default function GridStep() {
  const {
    selectedDomain, components, connections, kpis, gridCols, gridRows, cellSize,
    numFloors, activeFloor, setActiveFloor, addFloor, removeLastFloor,
    setStep, addComponent, moveComponent, twinName, selectComponent, resizeGrid,
  } = useTwinStore();

  const [view, setView] = useState('Split');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [showAiBar, setShowAiBar] = useState(false);
  const [justAdded, setJustAdded] = useState(null);
  const [floorWarn, setFloorWarn] = useState(false);

  const domain = DOMAINS[selectedDomain];
  const blueprints = domain?.components || [];

  // Min grid size considering all floors
  let minCols = 1;
  let minRows = 1;
  components.forEach(c => {
    const w = c.col + c.gridSize[0];
    const h = c.row + c.gridSize[1];
    if (w > minCols) minCols = w;
    if (h > minRows) minRows = h;
  });

  // Count components per floor for badges
  const countByFloor = (fi) => components.filter(c => (c.floor ?? 0) === fi).length;
  const activeFloorCount = countByFloor(activeFloor);

  useEffect(() => {
    checkBackendHealth().then(setBackendOnline);
  }, []);

  const handleAdd = (type) => {
    addComponent(type);
    setJustAdded(type);
    setTimeout(() => setJustAdded(null), 1200);
  };

  const handleAiPrompt = async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResult(null);

    const currentState = {
      id: 'default',
      name: twinName || 'Digital Twin',
      domain: selectedDomain || 'factory',
      gridCols: gridCols || 10,
      gridRows: gridRows || 8,
      components: components.map(c => ({ id: c.id, name: c.name, type: c.type, row: c.row, col: c.col, floor: c.floor ?? 0, gridSize: c.gridSize, color: c.color, kpiIds: c.kpiIds || [] })),
      connections: connections.map(c => ({ id: c.id, sourceId: c.sourceId, targetId: c.targetId, label: c.label || '', flowStatus: c.flowStatus || 'green' })),
    };

    try {
      const result = await layoutPrompt(aiPrompt, currentState);
      const store = useTwinStore.getState();
      let customCount = 0;

      result.newState.components.forEach(comp => {
        const existing = components.find(c => c.id === comp.id);
        if (!existing) {
          store.addComponent(comp.type, {
            row: comp.row, col: comp.col,
            name: comp.name, color: comp.color,
            gridSize: comp.gridSize,
            floor: comp.floor ?? activeFloor,
            isCustom: comp.isCustom || false,
            icon: comp.icon || '',
            description: comp.description || '',
            mesh3D: comp.mesh3D || null,
          });
          if (comp.isCustom) customCount++;
        } else if (existing.row !== comp.row || existing.col !== comp.col) {
          store.moveComponent(comp.id, comp.col, comp.row);
        }
      });

      components.forEach(c => {
        if (!result.newState.components.find(nc => nc.id === c.id)) {
          useTwinStore.getState().removeComponent?.(c.id);
        }
      });

      setAiResult({ explanation: result.explanation, actionsCount: result.actions.length, customCount });
      setAiPrompt('');
    } catch (e) {
      const p = aiPrompt.toLowerCase();
      blueprints.forEach(bp => {
        if (p.includes(bp.type.replace('_', ' ')) || p.includes(bp.name.toLowerCase())) {
          const count = parseInt(p.match(/(\d+)/)?.[1] || '1');
          for (let i = 0; i < Math.min(count, 4); i++) handleAdd(bp.type);
        }
      });
      setAiResult({ explanation: `Backend offline — local parsing applied.`, actionsCount: 0, error: true });
    } finally {
      setAiLoading(false);
    }
  };

  const floorColor = FLOOR_COLORS[activeFloor % FLOOR_COLORS.length];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Top Toolbar ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '7px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
        {/* Component palette */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>+ Add</span>
          {blueprints.map(bp => (
            <button key={bp.type} onClick={() => handleAdd(bp.type)} title={`Add ${bp.name} to Floor ${activeFloor + 1}`}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '7px', cursor: 'pointer', fontSize: '11px', fontWeight: 500, transition: 'all 0.18s',
                background: justAdded === bp.type ? `${bp.color}30` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${justAdded === bp.type ? bp.color : 'rgba(255,255,255,0.08)'}`,
                color: justAdded === bp.type ? bp.color : 'var(--text-1)',
                transform: justAdded === bp.type ? 'scale(1.06)' : 'scale(1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background=`${bp.color}18`; e.currentTarget.style.borderColor=bp.color; e.currentTarget.style.color=bp.color; }}
              onMouseLeave={e => { if(justAdded!==bp.type){ e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'; e.currentTarget.style.color='var(--text-1)'; }}}>
              <span>{getIcon(bp.type)}</span>{bp.name}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-0)', borderRadius: '7px', padding: '2px', flexShrink: 0 }}>
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '3px 9px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 500, transition: 'all 0.15s', background: view === v ? 'var(--accent)' : 'transparent', color: view === v ? '#fff' : 'var(--text-2)' }}>{v}</button>
          ))}
        </div>

        {/* AI Prompt toggle */}
        <button onClick={() => setShowAiBar(p => !p)} style={{ padding: '3px 11px', borderRadius: '7px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
          background: showAiBar ? 'rgba(72,101,242,0.15)' : 'transparent',
          color: showAiBar ? 'var(--accent)' : 'var(--text-2)' }}>
          🦙 AI Layout
          <span style={{ fontSize: '8px', padding: '1px 4px', borderRadius: '4px', background: backendOnline ? 'rgba(16,217,141,0.2)' : 'rgba(245,158,11,0.2)', color: backendOnline ? '#10d98d' : '#f59e0b' }}>
            {backendOnline ? 'live' : 'mock'}
          </span>
        </button>

        <div style={{ padding: '3px 9px', borderRadius: '16px', background: 'rgba(72,101,242,0.1)', border: '1px solid rgba(72,101,242,0.2)', fontSize: '11px', fontWeight: 600, color: 'var(--accent)', flexShrink: 0 }}>
          {activeFloorCount} on floor · {components.length} total
        </div>

        {/* ── Floor +/− controls ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, borderLeft: '1px solid var(--border)', paddingLeft: '10px' }}>
          <Layers size={12} style={{ color: 'var(--text-2)' }} />
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-2)', marginRight: '2px' }}>
            {numFloors} floor{numFloors > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => { const ok = removeLastFloor(); if (!ok) { setFloorWarn(true); setTimeout(() => setFloorWarn(false), 2500); } }}
            disabled={numFloors <= 1}
            title="Remove last floor (only if empty)"
            style={{ width: '22px', height: '22px', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg-0)', color: numFloors <= 1 ? 'var(--text-2)' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: numFloors <= 1 ? 'not-allowed' : 'pointer', opacity: numFloors <= 1 ? 0.35 : 1, padding: 0 }}>
            <Minus size={11} />
          </button>
          <button
            onClick={() => addFloor()}
            disabled={numFloors >= 10}
            title="Add a floor"
            style={{ width: '22px', height: '22px', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg-0)', color: numFloors >= 10 ? 'var(--text-2)' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: numFloors >= 10 ? 'not-allowed' : 'pointer', opacity: numFloors >= 10 ? 0.35 : 1, padding: 0 }}>
            <Plus size={11} />
          </button>
        </div>
      </div>

      {/* Floor removal blocked warning */}
      {floorWarn && (
        <div style={{ padding: '6px 14px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', fontSize: '11px', color: '#ef4444', flexShrink: 0 }}>
          ⚠ Floor {numFloors} still has components. Remove them first before deleting this floor.
        </div>
      )}

      {/* ── AI Prompt Bar ────────────────────────────────────────────────────── */}
      {showAiBar && (
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'rgba(72,101,242,0.03)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '18px', paddingTop: '4px' }}>🦙</span>
            <div style={{ flex: 1 }}>
              <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiPrompt(); }}}
                placeholder={`Describe layout changes for Floor ${activeFloor + 1}, e.g. "Add 3 conveyor belts next to the shipping dock"`}
                rows={2}
                style={{ width: '100%', background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 10px', color: 'var(--text-0)', fontSize: '12px', resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: '5px', marginTop: '5px', flexWrap: 'wrap' }}>
                {[
                  `Add a fuel tank 3x2`,
                  `Add a radar dome`,
                  `Add a control tower 2x3`,
                  `Add a VIP lounge 4x2`,
                  `Add a solar panel array 3x1`,
                  `Connect all components in sequence`,
                ].map(ex => (
                  <button key={ex} onClick={() => setAiPrompt(ex)}
                    style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(72,101,242,0.07)', border: '1px solid rgba(72,101,242,0.15)', color: 'var(--text-2)', cursor: 'pointer' }}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleAiPrompt} disabled={!aiPrompt.trim() || aiLoading}
              style={{ padding: '9px 18px', borderRadius: '8px', background: 'linear-gradient(135deg,#4865f2,#f4723e)', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: aiPrompt.trim() ? 'pointer' : 'not-allowed', opacity: aiPrompt.trim() ? 1 : 0.5, flexShrink: 0 }}>
              {aiLoading ? '⏳' : '▶ Run'}
            </button>
          </div>
          {aiResult && (
            <div style={{ marginTop: '6px', padding: '7px 12px', borderRadius: '7px', fontSize: '11px',
              background: aiResult.error ? 'rgba(245,158,11,0.08)' : 'rgba(16,217,141,0.08)',
              border: `1px solid ${aiResult.error ? 'rgba(245,158,11,0.25)' : 'rgba(16,217,141,0.25)'}`,
              color: aiResult.error ? '#f59e0b' : '#10d98d' }}>
              {aiResult.error ? '⚠' : '✅'} {aiResult.explanation}
              {aiResult.actionsCount > 0 && ` (${aiResult.actionsCount} action${aiResult.actionsCount > 1 ? 's' : ''} applied)`}
              {aiResult.customCount > 0 && (
                <span style={{ marginLeft: '8px', padding: '1px 6px', borderRadius: '8px', background: 'rgba(168,85,247,0.2)', color: '#a855f7', fontSize: '10px', fontWeight: 700 }}>
                  ✨ {aiResult.customCount} custom 3D component{aiResult.customCount > 1 ? 's' : ''} generated
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Main area ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* 2D Grid pane */}
        {(view === '2D Grid' || view === 'Split') && (
          <div style={{ flex: view === 'Split' ? '0 0 50%' : '1', borderRight: view === 'Split' ? '1px solid var(--border)' : 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

            {/* 2D Editor header */}
            <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-1)' }}>⬜ 2D EDITOR</span>
              <div style={{ fontSize: '10px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <span>Drag to reposition</span>
                <span style={{ opacity: 0.3 }}>|</span>
                <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>Grid Size:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Width
                  <button onClick={() => resizeGrid(gridCols - 1, gridRows)} disabled={gridCols <= minCols} style={{ background: 'var(--bg-2)', opacity: gridCols <= minCols ? 0.3 : 1, border: '1px solid var(--border)', borderRadius: '2px', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: gridCols <= minCols ? 'not-allowed' : 'pointer', color: 'var(--text-1)', padding: 0 }}>-</button>
                  <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{gridCols}</span>
                  <button onClick={() => resizeGrid(gridCols + 1, gridRows)} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '2px', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-1)', padding: 0 }}>+</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Height
                  <button onClick={() => resizeGrid(gridCols, gridRows - 1)} disabled={gridRows <= minRows} style={{ background: 'var(--bg-2)', opacity: gridRows <= minRows ? 0.3 : 1, border: '1px solid var(--border)', borderRadius: '2px', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: gridRows <= minRows ? 'not-allowed' : 'pointer', color: 'var(--text-1)', padding: 0 }}>-</button>
                  <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{gridRows}</span>
                  <button onClick={() => resizeGrid(gridCols, gridRows + 1)} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '2px', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-1)', padding: 0 }}>+</button>
                </div>
              </div>
            </div>

            {/* ── Floor selector tabs (only shown when numFloors > 1) ── */}
            {numFloors > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-0)',
                overflowX: 'auto',
                flexShrink: 0,
              }}>
                <Layers size={12} style={{ color: 'var(--text-2)', flexShrink: 0 }} />
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginRight: '4px', flexShrink: 0 }}>Floor</span>
                {Array.from({ length: numFloors }).map((_, fi) => {
                  const isActive = fi === activeFloor;
                  const color = FLOOR_COLORS[fi % FLOOR_COLORS.length];
                  const count = countByFloor(fi);
                  return (
                    <button
                      key={fi}
                      onClick={() => setActiveFloor(fi)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        border: isActive ? `1.5px solid ${color}` : '1px solid var(--border)',
                        background: isActive ? `${color}18` : 'transparent',
                        color: isActive ? color : 'var(--text-2)',
                        fontSize: '11px',
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fi + 1}
                      {count > 0 && (
                        <span style={{
                          fontSize: '9px',
                          padding: '0 4px',
                          borderRadius: '8px',
                          background: isActive ? `${color}30` : 'rgba(148,163,184,0.2)',
                          color: isActive ? color : 'var(--text-2)',
                          fontWeight: 700,
                          minWidth: '14px',
                          textAlign: 'center',
                        }}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
                {/* Current floor indicator */}
                <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-2)', flexShrink: 0 }}>
                  Editing Floor {activeFloor + 1} of {numFloors}
                </span>
              </div>
            )}

            <div style={{ flex: 1, overflow: 'auto' }}><Grid2D /></div>
          </div>
        )}

        {/* 3D Preview pane */}
        {(view === '3D Preview' || view === 'Split') && (
          <div style={{ flex: view === 'Split' ? '0 0 50%' : '1', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-1)' }}>⬡ 3D PREVIEW</span>
              <span style={{ fontSize: '10px', color: 'var(--text-2)' }}>Orbit · Scroll zoom · Ctrl+drag to move</span>
              {numFloors > 1 && (
                <span style={{ marginLeft: 'auto', fontSize: '10px', padding: '2px 8px', borderRadius: '8px', background: 'rgba(72,101,242,0.1)', border: '1px solid rgba(72,101,242,0.2)', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Layers size={10} /> {numFloors} floors
                </span>
              )}
            </div>
            <div style={{ flex: 1, position: 'relative' }}><Scene3D /></div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ padding: '9px 14px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
        <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
        <button className="btn btn-primary" onClick={() => setStep(3)}>Next: Connections →</button>
      </div>
    </div>
  );
}

function getIcon(type) {
  const m = { terminal:'🏢',gate:'🚪',runway:'✈️',checkin_desk:'🖥️',security_zone:'🔒',baggage_claim:'🧳',hydraulic_press:'⚙️',conveyor_belt:'📦',cnc_machine:'🔩',assembly_station:'🔧',quality_control:'🔍',warehouse_rack:'📚',storage_rack:'📚',picking_zone:'🚜',reception_dock:'📥',shipping_dock:'📤',conveyor:'📦',sorter:'🔄' };
  return m[type] || '⬛';
}
