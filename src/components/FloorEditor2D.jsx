import { useState, useRef, useCallback } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';

const SECTION_ALPHA = 0.13;

function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [72, 101, 242];
}

export default function FloorEditor2D({
    floor, sections = [], components = [], buildingColor = '#4865f2',
    activeSection, onSelectSection,
    onMoveComponent, onRemoveComponent, onRotateComponent,
    onAddComponent, dragComponent, // { type, bp } being dragged from palette
    onCellClick, // for section drawing
    sectionDrawMode, drawPreview, // { col, row, w, h }
}) {
    const CELL = 36;
    const cols = floor?.gridCols || 10;
    const rows = floor?.gridRows || 8;

    const [selectedComp, setSelectedComp] = useState(null);
    const [dragging, setDragging] = useState(null); // { compId, offsetCol, offsetRow }
    const [dragPos, setDragPos] = useState(null);
    const [dropPreview, setDropPreview] = useState(null);
    const gridRef = useRef(null);

    const getCell = useCallback((e) => {
        const rect = gridRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const col = Math.floor((e.clientX - rect.left) / CELL);
        const row = Math.floor((e.clientY - rect.top) / CELL);
        if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
        return { col, row };
    }, [cols, rows, CELL]);

    const handleGridMouseMove = useCallback((e) => {
        const cell = getCell(e);
        if (!cell) return;
        if (dragging) {
            const newCol = Math.max(0, Math.min(cols - dragging.w, cell.col - dragging.offsetCol));
            const newRow = Math.max(0, Math.min(rows - dragging.h, cell.row - dragging.offsetRow));
            setDropPreview({ col: newCol, row: newRow, w: dragging.w, h: dragging.h, color: dragging.color });
        } else if (dragComponent) {
            const [w, h] = dragComponent.bp.gridSize;
            const nc = Math.max(0, Math.min(cols - w, cell.col));
            const nr = Math.max(0, Math.min(rows - h, cell.row));
            setDropPreview({ col: nc, row: nr, w, h, color: dragComponent.bp.color });
        }
    }, [dragging, dragComponent, getCell, cols, rows]);

    const handleGridMouseUp = useCallback((e) => {
        const cell = getCell(e);
        if (dragging && cell && onMoveComponent) {
            const newCol = Math.max(0, Math.min(cols - dragging.w, cell.col - dragging.offsetCol));
            const newRow = Math.max(0, Math.min(rows - dragging.h, cell.row - dragging.offsetRow));
            onMoveComponent(dragging.compId, newCol, newRow);
        } else if (dragComponent && cell && onAddComponent) {
            const [w, h] = dragComponent.bp.gridSize;
            const nc = Math.max(0, Math.min(cols - w, cell.col));
            const nr = Math.max(0, Math.min(rows - h, cell.row));
            // Find section that contains this cell
            const sec = sections.find(s => nc >= s.col && nc < s.col + s.w && nr >= s.row && nr < s.row + s.h);
            onAddComponent(dragComponent.type, { col: nc, row: nr, sectionId: sec?.id || null });
        } else if (cell && onCellClick) {
            onCellClick(cell);
        }
        setDragging(null);
        setDropPreview(null);
    }, [dragging, dragComponent, getCell, onMoveComponent, onAddComponent, onCellClick, cols, rows, sections]);

    const handleCompMouseDown = useCallback((e, comp) => {
        e.stopPropagation();
        setSelectedComp(comp.id);
        const cell = getCell(e);
        if (cell) setDragging({ compId: comp.id, offsetCol: cell.col - comp.col, offsetRow: cell.row - comp.row, w: comp.gridSize[0], h: comp.gridSize[1], color: comp.color });
    }, [getCell]);

    const W = cols * CELL; const H = rows * CELL;

    return (
        <div style={{ position: 'relative', display: 'inline-block', userSelect: 'none' }}>
            <svg width={W} height={H} ref={gridRef}
                style={{ display: 'block', cursor: dragging || dragComponent ? 'grabbing' : sectionDrawMode ? 'crosshair' : 'default', borderRadius: '8px', border: '1px solid var(--border)' }}
                onMouseMove={handleGridMouseMove}
                onMouseUp={handleGridMouseUp}
                onMouseLeave={() => { setDragging(null); setDropPreview(null); }}>

                {/* Background */}
                <rect width={W} height={H} fill="#0a0e1a" rx={8} />

                {/* Grid lines */}
                {Array.from({ length: cols + 1 }).map((_, i) => (
                    <line key={`v${i}`} x1={i * CELL} y1={0} x2={i * CELL} y2={H} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                ))}
                {Array.from({ length: rows + 1 }).map((_, i) => (
                    <line key={`h${i}`} x1={0} y1={i * CELL} x2={W} y2={i * CELL} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                ))}
                {/* Corner dots */}
                {Array.from({ length: cols }).map((_, ci) => Array.from({ length: rows }).map((_, ri) => (
                    <circle key={`d${ci}-${ri}`} cx={ci * CELL + CELL / 2} cy={ri * CELL + CELL / 2} r={1} fill="rgba(255,255,255,0.04)" />
                )))}

                {/* Section backgrounds */}
                {sections.map(sec => {
                    const [r, g, b] = hexToRgb(sec.color);
                    const isActive = activeSection === sec.id;
                    return (
                        <g key={sec.id} onClick={() => onSelectSection?.(sec.id)} style={{ cursor: 'pointer' }}>
                            <rect x={sec.col * CELL} y={sec.row * CELL} width={sec.w * CELL} height={sec.h * CELL}
                                fill={`rgba(${r},${g},${b},${isActive ? 0.18 : SECTION_ALPHA})`}
                                stroke={sec.color} strokeWidth={isActive ? 2 : 1} strokeOpacity={isActive ? 0.9 : 0.5}
                                rx={4} style={{ transition: 'all 0.2s' }} />
                            {/* Section label */}
                            <text x={sec.col * CELL + 8} y={sec.row * CELL + 16} fontSize={10} fontWeight={700} fill={sec.color} opacity={0.85} style={{ pointerEvents: 'none' }}>
                                {sec.name}
                            </text>
                            {/* Mini stats */}
                            {components.filter(c => c.sectionId === sec.id).length > 0 && (
                                <text x={sec.col * CELL + 8} y={sec.row * CELL + 28} fontSize={8} fill={sec.color} opacity={0.5} style={{ pointerEvents: 'none' }}>
                                    {components.filter(c => c.sectionId === sec.id).length} items
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Section draw preview */}
                {sectionDrawMode && drawPreview && drawPreview.w > 0 && drawPreview.h > 0 && (
                    <rect x={drawPreview.col * CELL} y={drawPreview.row * CELL} width={drawPreview.w * CELL} height={drawPreview.h * CELL}
                        fill="rgba(72,101,242,0.12)" stroke="#4865f2" strokeWidth={2} strokeDasharray="6 3" rx={4} />
                )}

                {/* Component drop preview */}
                {dropPreview && (
                    <rect x={dropPreview.col * CELL + 2} y={dropPreview.row * CELL + 2} width={dropPreview.w * CELL - 4} height={dropPreview.h * CELL - 4}
                        fill={`rgba(${hexToRgb(dropPreview.color).join(',')},0.2)`} stroke={dropPreview.color} strokeWidth={2} strokeDasharray="5 3" rx={4} opacity={0.8} />
                )}

                {/* Components */}
                {components.map(comp => {
                    const [cw, ch] = comp.gridSize;
                    const isSel = selectedComp === comp.id;
                    const [r, g, b] = hexToRgb(comp.color);
                    const isDragged = dragging?.compId === comp.id;
                    return (
                        <g key={comp.id} transform={`translate(${comp.col * CELL},${comp.row * CELL})`}
                            style={{ cursor: 'grab', opacity: isDragged ? 0.3 : 1 }}
                            onMouseDown={e => handleCompMouseDown(e, comp)}
                            onClick={e => { e.stopPropagation(); setSelectedComp(isSel ? null : comp.id); }}>
                            <rect width={cw * CELL - 3} height={ch * CELL - 3} x={1.5} y={1.5}
                                fill={`rgba(${r},${g},${b},0.22)`}
                                stroke={comp.color} strokeWidth={isSel ? 2.5 : 1.5}
                                rx={5} />
                            {/* Icon */}
                            <text x={cw * CELL / 2} y={ch * CELL / 2 - 3} textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(18, Math.min(cw, ch) * CELL / 2.2)}>
                                {comp.icon || '⬛'}
                            </text>
                            {/* Label */}
                            {(cw >= 2 || ch >= 2) && (
                                <text x={cw * CELL / 2} y={ch * CELL - 7} textAnchor="middle" fontSize={9} fontWeight={600} fill={comp.color} opacity={0.85}>
                                    {comp.name.length > 12 ? comp.name.slice(0, 11) + '…' : comp.name}
                                </text>
                            )}
                            {/* Selection ring */}
                            {isSel && <rect width={cw * CELL - 1} height={ch * CELL - 1} x={0.5} y={0.5} fill="none" stroke={comp.color} strokeWidth={2} strokeDasharray="5 3" rx={6} opacity={0.7} />}
                        </g>
                    );
                })}
            </svg>

            {/* Floating action bar for selected component */}
            {selectedComp && (() => {
                const comp = components.find(c => c.id === selectedComp);
                if (!comp) return null;
                return (
                    <div style={{ position: 'absolute', left: comp.col * CELL, top: comp.row * CELL - 34, display: 'flex', gap: '4px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 6px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', zIndex: 20 }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-1)', paddingRight: '6px', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>{comp.name}</span>
                        <button onClick={() => onRotateComponent?.(comp.id)} title="Rotate" style={{ padding: '3px 5px', borderRadius: '5px', background: 'rgba(72,101,242,0.1)', border: '1px solid rgba(72,101,242,0.25)', cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
                            <RotateCcw size={11} />
                        </button>
                        <button onClick={() => { onRemoveComponent?.(comp.id); setSelectedComp(null); }} title="Delete" style={{ padding: '3px 5px', borderRadius: '5px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={11} />
                        </button>
                    </div>
                );
            })()}
        </div>
    );
}
