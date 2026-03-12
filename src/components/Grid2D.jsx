import { useState, useRef } from 'react';
import useTwinStore from '../store/useTwinStore';

const CELL_PX = 40;
const STATUS_COLORS = { green: '#10d98d', orange: '#f59e0b', red: '#ef4444' };

export default function Grid2D() {
    const { components, connections, kpis, gridCols, gridRows, selectedComponentId, hoveredComponentId, selectComponent, hoverComponent, moveComponent } = useTwinStore();
    const cols = gridCols || 10;
    const rows = gridRows || 8;
    const [dragging, setDragging] = useState(null); // { id, offsetCol, offsetRow }
    const [ghostPos, setGhostPos] = useState(null);  // { col, row }

    // Build occupied map
    const cellMap = {};
    components.forEach(comp => {
        const [cw, ch] = comp.gridSize;
        for (let r = comp.row; r < comp.row + ch; r++)
            for (let c = comp.col; c < comp.col + cw; c++)
                cellMap[`${r}-${c}`] = comp;
    });

    const getKpi = comp => kpis.find(k => comp?.kpiIds?.includes(k.id));

    const handleMouseDown = (e, comp) => {
        e.preventDefault();
        setDragging({ id: comp.id, gridSize: comp.gridSize });
        selectComponent(comp.id);
    };

    const handleCellEnter = (col, row) => {
        if (!dragging) return;
        setGhostPos({ col, row });
    };

    const handleMouseUp = () => {
        if (dragging && ghostPos) {
            moveComponent(dragging.id, ghostPos.col, ghostPos.row);
        }
        setDragging(null);
        setGhostPos(null);
    };

    // Check if ghost fits
    const ghostOk = () => {
        if (!dragging || !ghostPos) return false;
        const comp = components.find(c => c.id === dragging.id);
        if (!comp) return false;
        const [w, h] = comp.gridSize;
        const { col, row } = ghostPos;
        if (col < 0 || row < 0 || col + w > cols || row + h > rows) return false;
        for (let r = row; r < row + h; r++)
            for (let c = col; c < col + w; c++) {
                const occupant = cellMap[`${r}-${c}`];
                if (occupant && occupant.id !== dragging.id) return false;
            }
        return true;
    };

    return (
        <div style={{ position: 'relative', overflow: 'auto', flex: 1, userSelect: 'none' }} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            {/* Column headers */}
            <div style={{ display: 'flex', paddingLeft: '24px', marginBottom: '2px', position: 'sticky', top: 0, background: 'var(--bg-1)', zIndex: 5 }}>
                {Array.from({ length: cols }).map((_, c) => (
                    <div key={c} style={{ width: CELL_PX, textAlign: 'center', fontSize: '8px', color: 'var(--text-2)', flexShrink: 0 }}>{c + 1}</div>
                ))}
            </div>

            <div style={{ display: 'flex', padding: '4px 8px' }}>
                {/* Row numbers */}
                <div style={{ display: 'flex', flexDirection: 'column', marginRight: '4px' }}>
                    {Array.from({ length: rows }).map((_, r) => (
                        <div key={r} style={{ height: CELL_PX, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: 'var(--text-2)', width: '16px', flexShrink: 0 }}>{r + 1}</div>
                    ))}
                </div>

                {/* Grid */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${cols}, ${CELL_PX}px)`,
                        gridTemplateRows: `repeat(${rows}, ${CELL_PX}px)`,
                        gap: '1px',
                        cursor: dragging ? 'grabbing' : 'default',
                    }}
                >
                    {Array.from({ length: rows }).map((_, row) =>
                        Array.from({ length: cols }).map((_, col) => {
                            const comp = cellMap[`${row}-${col}`];
                            const isOrigin = comp && comp.row === row && comp.col === col;
                            const [cw, ch] = comp?.gridSize || [1, 1];
                            const kpi = comp ? getKpi(comp) : null;
                            const isSelected = comp && selectedComponentId === comp.id;
                            const isHovered = comp && hoveredComponentId === comp.id;
                            const isDraggingThis = dragging?.id === comp?.id;
                            const statusColor = kpi ? STATUS_COLORS[kpi.status] : null;

                            // Ghost display
                            const isGhost = dragging && ghostPos && ghostPos.col === col && ghostPos.row === row;
                            const ghostFits = ghostOk();

                            if (comp && !isOrigin) return null;

                            const w = CELL_PX * cw + (cw - 1);
                            const h = CELL_PX * ch + (ch - 1);

                            return (
                                <div
                                    key={`${row}-${col}`}
                                    style={{
                                        gridColumn: comp ? `span ${cw}` : undefined,
                                        gridRow: comp ? `span ${ch}` : undefined,
                                        width: comp ? `${w}px` : `${CELL_PX}px`,
                                        height: comp ? `${h}px` : `${CELL_PX}px`,
                                        background: comp
                                            ? isDraggingThis
                                                ? 'rgba(99,149,255,0.08)'
                                                : isSelected
                                                    ? `rgba(99,149,255,0.18)`
                                                    : isHovered
                                                        ? `rgba(99,149,255,0.1)`
                                                        : `rgba(${hexRgb(comp.color)},0.12)`
                                            : isGhost
                                                ? ghostFits ? 'rgba(99,149,255,0.15)' : 'rgba(239,68,68,0.15)'
                                                : 'rgba(255,255,255,0.02)',
                                        border: comp
                                            ? isDraggingThis
                                                ? '1.5px dashed #6395ff'
                                                : isSelected
                                                    ? '1.5px solid #6395ff'
                                                    : isHovered
                                                        ? `1.5px solid rgba(${hexRgb(comp.color)},0.8)`
                                                        : `1px solid rgba(${hexRgb(comp.color)},0.35)`
                                            : isGhost
                                                ? ghostFits ? '1.5px dashed #6395ff' : '1.5px dashed #ef4444'
                                                : '1px solid rgba(255,255,255,0.04)',
                                        borderRadius: comp ? '5px' : '2px',
                                        cursor: comp ? (dragging ? 'grabbing' : 'grab') : isGhost ? 'crosshair' : 'default',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        position: 'relative',
                                        transition: isDraggingThis ? 'none' : 'all 0.15s ease',
                                        opacity: isDraggingThis ? 0.4 : 1,
                                        boxShadow: isSelected && !isDraggingThis ? '0 0 10px rgba(99,149,255,0.2)' : 'none',
                                    }}
                                    onMouseDown={comp ? (e) => handleMouseDown(e, comp) : undefined}
                                    onMouseEnter={() => {
                                        if (comp) hoverComponent(comp.id);
                                        handleCellEnter(col, row);
                                    }}
                                    onMouseLeave={() => hoverComponent(null)}
                                    onClick={() => !dragging && comp && selectComponent(comp.id)}
                                >
                                    {comp && (
                                        <>
                                            {/* KPI status strip */}
                                            {statusColor && (
                                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: statusColor, opacity: 0.9 }} />
                                            )}
                                            {/* Component type icon */}
                                            <div style={{ fontSize: CELL_PX > 36 ? '14px' : '10px', lineHeight: 1, marginBottom: '2px' }}>
                                                {getTypeIcon(comp.type)}
                                            </div>
                                            {/* Name */}
                                            <span style={{ fontSize: '8px', fontWeight: 600, color: isSelected ? '#6395ff' : '#94a3c8', textAlign: 'center', lineHeight: 1.1, padding: '0 2px' }}>
                                                {comp.name.split(' ').slice(0, -1).join(' ')}
                                            </span>
                                            {/* KPI value */}
                                            {kpi && (
                                                <span style={{ fontSize: '8px', fontWeight: 700, color: statusColor, marginTop: '1px' }}>
                                                    {typeof kpi.value === 'number' ? kpi.value.toFixed(0) : kpi.value}{kpi.unit}
                                                </span>
                                            )}
                                            {/* Red pulse */}
                                            {kpi?.status === 'red' && (
                                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.06)', animation: 'pulse-bg 1s ease-in-out infinite', borderRadius: '5px' }} />
                                            )}
                                        </>
                                    )}
                                    {/* Ghost cell */}
                                    {!comp && isGhost && (
                                        <div style={{ width: '60%', height: '60%', borderRadius: '3px', background: ghostFits ? 'rgba(99,149,255,0.3)' : 'rgba(239,68,68,0.3)' }} />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <style>{`
        @keyframes pulse-bg { 0%,100% { opacity:1; } 50% { opacity:0; } }
      `}</style>
        </div>
    );
}

function getTypeIcon(type) {
    const icons = {
        terminal: '🏢', gate: '🚪', runway: '✈️', checkin_desk: '🖥️', security_zone: '🔒', baggage_claim: '🧳',
        hydraulic_press: '⚙️', conveyor_belt: '📦', cnc_machine: '🔩', assembly_station: '🔧', quality_control: '🔍', warehouse_rack: '📚',
        storage_rack: '📚', picking_zone: '🚜', reception_dock: '📥', shipping_dock: '📤', conveyor: '📦', sorter: '🔄',
    };
    return icons[type] || '⬛';
}

function hexRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}` : '99,149,255';
}
