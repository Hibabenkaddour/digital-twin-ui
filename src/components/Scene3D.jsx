import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useRef, useMemo, useState, useCallback } from 'react';
import * as THREE from 'three';
import useTwinStore, { DOMAINS } from '../store/useTwinStore';

const STATUS_COLORS = { green: '#10d98d', orange: '#f59e0b', red: '#ef4444' };

// Height (in world units) between floor levels.
// Components max out at ~8 units tall + we add 6 units clearance.
const FLOOR_HEIGHT = 14;

// Per-floor accent colours for the slab border + label
const FLOOR_ACCENT = [
    '#4865f2', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
    '#84cc16', '#64748b',
];

// ─── Domain-Specific Shape Libraries ─────────────────────────────────────────
function ShapeTerminal({ w, d, h, color }) {
    return (
        <group>
            <mesh position={[0, h * 0.35, 0]} castShadow>
                <boxGeometry args={[w * 0.95, h * 0.7, d * 0.95]} />
                <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
            </mesh>
            <mesh position={[0, h * 0.74, 0]} castShadow>
                <boxGeometry args={[w, h * 0.08, d]} />
                <meshStandardMaterial color={color} roughness={0.2} metalness={0.6} />
            </mesh>
            {[-0.3, 0, 0.3].map((offset, i) => (
                <mesh key={i} position={[offset * w * 0.6, h * 0.3, d * 0.48]} castShadow>
                    <boxGeometry args={[w * 0.18, h * 0.5, 0.15]} />
                    <meshStandardMaterial color="#6ab4f5" roughness={0.05} metalness={0.9} transparent opacity={0.7} />
                </mesh>
            ))}
            {[[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]].map(([cx, cz], i) => (
                <mesh key={i} position={[cx * w, h * 0.35, cz * d]} castShadow>
                    <cylinderGeometry args={[0.25, 0.25, h * 0.7, 8]} />
                    <meshStandardMaterial color="#c0cfe0" roughness={0.4} metalness={0.3} />
                </mesh>
            ))}
        </group>
    );
}

function ShapeGate({ w, d, h, color }) {
    return (
        <group>
            <mesh position={[0, h * 0.4, 0]} castShadow>
                <boxGeometry args={[w * 0.55, h * 0.8, d * 0.9]} />
                <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
            </mesh>
            <mesh position={[w * 0.3, h * 0.38, 0]} rotation={[0, 0, 0]} castShadow>
                <cylinderGeometry args={[0.3, 0.3, w * 0.6, 10]} rotation={[0, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#7a8fa6" roughness={0.4} metalness={0.5} />
            </mesh>
            <mesh position={[w * 0.6, h * 0.38, 0]} castShadow>
                <sphereGeometry args={[0.4, 12, 12]} />
                <meshStandardMaterial color="#4e6a80" roughness={0.3} metalness={0.6} />
            </mesh>
            <mesh position={[0, h * 0.88, 0]} castShadow>
                <boxGeometry args={[0.8, 0.4, 0.1]} />
                <meshStandardMaterial color="#1e3a5f" roughness={0.5} />
            </mesh>
        </group>
    );
}

function ShapeRunway({ w, d, h, color }) {
    return (
        <group>
            <mesh position={[0, h * 0.15, 0]} castShadow>
                <boxGeometry args={[w * 0.98, h * 0.3, d * 0.98]} />
                <meshStandardMaterial color="#1a1f2e" roughness={0.95} metalness={0.05} />
            </mesh>
            {Array.from({ length: 6 }).map((_, i) => (
                <mesh key={i} position={[(i - 2.5) * (w / 6.5), h * 0.31, 0]} castShadow>
                    <boxGeometry args={[w * 0.07, 0.05, 0.25]} />
                    <meshStandardMaterial color="#f0f0cc" roughness={0.8} />
                </mesh>
            ))}
            {[-0.48, 0.48].map((side, j) =>
                Array.from({ length: 5 }).map((_, i) => (
                    <mesh key={`${j}-${i}`} position={[(i - 2) * (w / 5), h * 0.32, side * d]}>
                        <sphereGeometry args={[0.12, 6, 6]} />
                        <meshStandardMaterial color="#f5d020" emissive="#f5d020" emissiveIntensity={0.8} />
                    </mesh>
                ))
            )}
        </group>
    );
}

function ShapeCheckinDesk({ w, d, h, color }) {
    return (
        <group>
            <mesh position={[0, h * 0.38, 0]} castShadow>
                <boxGeometry args={[w * 0.95, h * 0.75, d * 0.5]} />
                <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
            </mesh>
            <mesh position={[0, h * 0.77, d * 0.1]} castShadow>
                <boxGeometry args={[w * 0.97, 0.1, d * 0.7]} />
                <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.5} />
            </mesh>
            {[-0.3, 0, 0.3].map((ox, i) => (
                <mesh key={i} position={[ox * w, h * 1.05, d * 0.05]} castShadow>
                    <boxGeometry args={[0.4, 0.3, 0.06]} />
                    <meshStandardMaterial color="#0d1117" roughness={0.1} metalness={0.8} emissive="#1a3a6e" emissiveIntensity={0.3} />
                </mesh>
            ))}
        </group>
    );
}

function ShapeSecurityZone({ w, d, h, color }) {
    return (
        <group>
            <mesh position={[0, h * 0.1, 0]} castShadow>
                <boxGeometry args={[w * 0.95, h * 0.2, d * 0.95]} />
                <meshStandardMaterial color="#2d3748" roughness={0.8} metalness={0.1} />
            </mesh>
            <mesh position={[-w * 0.18, h * 0.55, 0]} castShadow>
                <boxGeometry args={[0.25, h * 0.9, 0.25]} />
                <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
            </mesh>
            <mesh position={[w * 0.18, h * 0.55, 0]} castShadow>
                <boxGeometry args={[0.25, h * 0.9, 0.25]} />
                <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
            </mesh>
            <mesh position={[0, h, 0]} castShadow>
                <boxGeometry args={[w * 0.38, 0.22, 0.22]} />
                <meshStandardMaterial color={color} roughness={0.2} metalness={0.7} />
            </mesh>
            <mesh position={[w * 0.35, h * 0.2, 0]} castShadow>
                <boxGeometry args={[w * 0.4, 0.25, d * 0.35]} />
                <meshStandardMaterial color="#1a2035" roughness={0.6} metalness={0.3} />
            </mesh>
        </group>
    );
}

function ShapeBaggageClaim({ w, d, h, color }) {
    return (
        <group>
            <mesh position={[0, h * 0.1, 0]} castShadow>
                <cylinderGeometry args={[Math.min(w, d) * 0.48, Math.min(w, d) * 0.5, h * 0.2, 32]} />
                <meshStandardMaterial color="#374151" roughness={0.8} metalness={0.2} />
            </mesh>
            <mesh position={[0, h * 0.28, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <torusGeometry args={[Math.min(w, d) * 0.36, 0.3, 8, 32]} />
                <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} />
            </mesh>
            {[0, Math.PI * 0.6, Math.PI * 1.2].map((angle, i) => (
                <mesh key={i} position={[Math.cos(angle) * Math.min(w, d) * 0.36, h * 0.42, Math.sin(angle) * Math.min(w, d) * 0.36]} castShadow>
                    <boxGeometry args={[0.45, 0.3, 0.3]} />
                    <meshStandardMaterial color={['#ef4444', '#3b82f6', '#10b981'][i]} roughness={0.6} />
                </mesh>
            ))}
        </group>
    );
}

function ShapeHydraulicPress({ w, d, h, color }) {
    return (
        <group>
            <mesh position={[0, h * 0.18, 0]} castShadow>
                <boxGeometry args={[w * 0.9, h * 0.36, d * 0.9]} />
                <meshStandardMaterial color="#374151" roughness={0.4} metalness={0.6} />
            </mesh>
            {[-0.36, 0.36].map((ox, i) => (
                <mesh key={i} position={[ox * w, h * 0.6, 0]} castShadow>
                    <boxGeometry args={[0.3, h * 0.9, 0.3]} />
                    <meshStandardMaterial color="#4b5563" roughness={0.3} metalness={0.7} />
                </mesh>
            ))}
            <mesh position={[0, h * 1.07, 0]} castShadow>
                <boxGeometry args={[w * 0.78, 0.35, 0.35]} />
                <meshStandardMaterial color="#4b5563" roughness={0.3} metalness={0.7} />
            </mesh>
            <mesh position={[0, h * 0.82, 0]} castShadow>
                <cylinderGeometry args={[0.28, 0.28, h * 0.5, 16]} />
                <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} />
            </mesh>
            <mesh position={[0, h * 0.5, 0]} castShadow>
                <boxGeometry args={[w * 0.65, 0.2, d * 0.65]} />
                <meshStandardMaterial color="#6b7280" roughness={0.4} metalness={0.5} />
            </mesh>
        </group>
    );
}

function ShapeConveyor({ w, d, h, color }) {
    return (
        <group>
            <mesh position={[0, h * 0.3, 0]} castShadow>
                <boxGeometry args={[w * 0.96, h * 0.6, d * 0.6]} />
                <meshStandardMaterial color="#1f2937" roughness={0.8} metalness={0.1} />
            </mesh>
            <mesh position={[0, h * 0.62, 0]} castShadow>
                <boxGeometry args={[w * 0.96, 0.08, d * 0.58]} />
                <meshStandardMaterial color={color} roughness={0.7} metalness={0.2} />
            </mesh>
            {[-0.46, 0.46].map((ox, i) => (
                <mesh key={i} position={[ox * w, h * 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[d * 0.3, d * 0.3, d * 0.7, 16]} />
                    <meshStandardMaterial color={color} roughness={0.3} metalness={0.7} />
                </mesh>
            ))}
            {[-0.32, 0.32].map((oz, i) => (
                <mesh key={i} position={[0, h * 0.3, oz * d]} castShadow>
                    <boxGeometry args={[w * 0.95, 0.1, 0.1]} />
                    <meshStandardMaterial color="#6b7280" roughness={0.4} metalness={0.5} />
                </mesh>
            ))}
        </group>
    );
}

function ShapeCncMachine({ w, d, h, color }) {
    return (
        <group>
            <mesh position={[0, h * 0.38, 0]} castShadow>
                <boxGeometry args={[w * 0.85, h * 0.75, d * 0.85]} />
                <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
            </mesh>
            <mesh position={[0, h * 0.84, 0]} castShadow>
                <cylinderGeometry args={[0.22, 0.22, h * 0.35, 12]} />
                <meshStandardMaterial color="#9ca3af" roughness={0.2} metalness={0.9} />
            </mesh>
            <mesh position={[0, h * 0.6, 0]} castShadow>
                <coneGeometry args={[0.28, 0.5, 8]} />
                <meshStandardMaterial color="#d1d5db" roughness={0.15} metalness={0.95} />
            </mesh>
            <mesh position={[w * 0.44, h * 0.55, 0]} castShadow>
                <boxGeometry args={[0.12, 0.5, 0.6]} />
                <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.3} emissive="#0f2040" emissiveIntensity={0.4} />
            </mesh>
        </group>
    );
}

function ShapeAssemblyStation({ w, d, h, color }) {
    return (
        <group>
            <mesh position={[0, h * 0.55, 0]} castShadow>
                <boxGeometry args={[w * 0.9, 0.15, d * 0.9]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.3} />
            </mesh>
            {[[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].map(([lx, lz], i) => (
                <mesh key={i} position={[lx * w, h * 0.27, lz * d]} castShadow>
                    <boxGeometry args={[0.18, h * 0.54, 0.18]} />
                    <meshStandardMaterial color="#64748b" roughness={0.4} metalness={0.4} />
                </mesh>
            ))}
            <mesh position={[w * 0.25, h * 0.7, 0]} castShadow>
                <boxGeometry args={[0.12, h * 0.4, 0.12]} />
                <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} />
            </mesh>
            <mesh position={[w * 0.25, h * 0.9, d * 0.25]} castShadow>
                <sphereGeometry args={[0.22, 10, 10]} />
                <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} emissive={color} emissiveIntensity={0.2} />
            </mesh>
        </group>
    );
}

function ShapeQualityControl({ w, d, h, color }) {
    return (
        <group>
            <mesh position={[0, h * 0.3, 0]} castShadow>
                <boxGeometry args={[w * 0.9, h * 0.6, d * 0.9]} />
                <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
            </mesh>
            <mesh position={[0, h * 0.64, 0]} castShadow>
                <cylinderGeometry args={[Math.min(w, d) * 0.22, Math.min(w, d) * 0.22, h * 0.08, 24]} />
                <meshStandardMaterial color="#d1d5db" roughness={0.2} metalness={0.8} />
            </mesh>
            {[0, Math.PI / 2].map((ang, i) => (
                <mesh key={i} position={[Math.cos(ang) * w * 0.28, h * 0.72, Math.sin(ang) * d * 0.28]} castShadow>
                    <boxGeometry args={[0.12, h * 0.08, 0.12]} />
                    <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.5} />
                </mesh>
            ))}
            <mesh position={[w * 0.3, h * 0.5, 0]} castShadow>
                <boxGeometry args={[0.1, 0.35, 0.5]} />
                <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.5} emissive="#1e3a5f" emissiveIntensity={0.5} />
            </mesh>
        </group>
    );
}

function ShapeWarehouseRack({ w, d, h, color }) {
    return (
        <group>
            {[-0.44, 0.44].map((ox, i) => (
                <mesh key={i} position={[ox * w, h * 0.5, 0]} castShadow>
                    <boxGeometry args={[0.18, h, 0.18]} />
                    <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.5} />
                </mesh>
            ))}
            {[0.15, 0.45, 0.75].map((fy, i) => (
                <mesh key={i} position={[0, h * fy, 0]} castShadow>
                    <boxGeometry args={[w * 0.92, 0.12, d * 0.9]} />
                    <meshStandardMaterial color="#4b5563" roughness={0.5} metalness={0.4} />
                </mesh>
            ))}
            {[0.28, 0.58].map((fy, i) => (
                <mesh key={i} position={[w * 0.1, h * fy, 0]} castShadow>
                    <boxGeometry args={[w * 0.55, 0.1, d * 0.55]} />
                    <meshStandardMaterial color={color} roughness={0.6} metalness={0.2} />
                </mesh>
            ))}
        </group>
    );
}

function ShapePickingZone({ w, d, h, color }) {
    return (
        <group>
            <mesh position={[0, h * 0.12, 0]} receiveShadow>
                <boxGeometry args={[w * 0.95, h * 0.24, d * 0.95]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.7} metalness={0.05} />
            </mesh>
            <mesh position={[-w * 0.2, h * 0.58, 0]} castShadow>
                <boxGeometry args={[w * 0.25, h * 0.7, 0.35]} />
                <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
            </mesh>
            {[0.05, 0.3, 0.55].map((fy, i) => (
                <mesh key={i} position={[-w * 0.2, h * (0.27 + fy * 0.5), 0.2]} castShadow>
                    <boxGeometry args={[w * 0.22, 0.08, 0.3]} />
                    <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.3} />
                </mesh>
            ))}
            <mesh position={[w * 0.2, h * 0.3, 0]} castShadow rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.28, 0.35, w * 0.35, 8]} />
                <meshStandardMaterial color="#f59e0b" roughness={0.4} metalness={0.4} />
            </mesh>
        </group>
    );
}

function ShapeReceptionDock({ w, d, h, color }) {
    return (
        <group>
            <mesh position={[0, h * 0.15, 0]} castShadow>
                <boxGeometry args={[w * 0.96, h * 0.3, d * 0.96]} />
                <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.2} />
            </mesh>
            <mesh position={[0, h * 0.32, -d * 0.38]} castShadow>
                <boxGeometry args={[w * 0.9, h * 0.06, 0.18]} />
                <meshStandardMaterial color="#1e40af" roughness={0.5} metalness={0.4} />
            </mesh>
            {[-0.28, 0, 0.28].map((ox, i) => (
                <mesh key={i} position={[ox * w, h * 0.06, d * 0.49]} castShadow>
                    <boxGeometry args={[w * 0.17, 0.18, 0.2]} />
                    <meshStandardMaterial color="#1d4ed8" roughness={0.7} metalness={0.1} />
                </mesh>
            ))}
        </group>
    );
}

function ShapeShippingDock({ w, d, h, color }) {
    return (
        <group>
            <mesh position={[0, h * 0.15, 0]} castShadow>
                <boxGeometry args={[w * 0.96, h * 0.3, d * 0.96]} />
                <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.2} />
            </mesh>
            <mesh position={[0, h * 0.32, -d * 0.38]} castShadow>
                <boxGeometry args={[w * 0.9, h * 0.06, 0.18]} />
                <meshStandardMaterial color="#16a34a" roughness={0.5} metalness={0.4} />
            </mesh>
            {[-0.28, 0, 0.28].map((ox, i) => (
                <mesh key={i} position={[ox * w, h * 0.06, d * 0.49]} castShadow>
                    <boxGeometry args={[w * 0.17, 0.18, 0.2]} />
                    <meshStandardMaterial color="#15803d" roughness={0.7} metalness={0.1} />
                </mesh>
            ))}
        </group>
    );
}

function ShapeSorter({ w, d, h, color }) {
    return (
        <group>
            <mesh position={[0, h * 0.15, 0]} castShadow>
                <cylinderGeometry args={[Math.min(w, d) * 0.42, Math.min(w, d) * 0.45, h * 0.3, 20]} />
                <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.4} />
            </mesh>
            <mesh position={[0, h * 0.55, 0]} castShadow>
                <coneGeometry args={[Math.min(w, d) * 0.3, h * 0.7, 16]} />
                <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
            </mesh>
            {[0, Math.PI * 0.67, Math.PI * 1.33].map((angle, i) => (
                <mesh key={i} position={[Math.cos(angle) * Math.min(w, d) * 0.32, h * 0.35, Math.sin(angle) * Math.min(w, d) * 0.32]} castShadow>
                    <boxGeometry args={[0.15, 0.12, Math.min(w, d) * 0.28]} />
                    <meshStandardMaterial color="#6366f1" roughness={0.3} metalness={0.6} />
                </mesh>
            ))}
        </group>
    );
}

// ─── Universal AI-Generated Shape Renderer ────────────────────────────────────
function PartMesh({ part, w, h, d, fallbackColor }) {
    const pos = part.pos || [0, 0, 0];
    const rot = part.rot || [0, 0, 0];
    const clr = part.color || fallbackColor;
    const metal = part.metalness ?? 0.5;
    const rough = part.roughness ?? 0.3;
    const emClr = part.emissive || null;
    const emInt = part.emissiveIntensity ?? (emClr ? 0.6 : 0);
    const op = part.opacity ?? 1;
    const geo = part.geo || 'box';
    const s = part.size || [0.5, 0.5, 0.5];

    let geoArgs;
    switch (geo) {
        case 'cylinder': geoArgs = [s[0] * Math.min(w, d), (s[1] ?? s[0]) * Math.min(w, d), (s[2] ?? 0.5) * h, s[3] ?? 16]; break;
        case 'sphere':   geoArgs = [s[0] * Math.min(w, d), s[1] ?? 24, s[2] ?? 24]; break;
        case 'cone':     geoArgs = [s[0] * Math.min(w, d), (s[1] ?? 0.5) * h, s[2] ?? 16]; break;
        case 'torus':    geoArgs = [s[0] * Math.min(w, d), (s[1] ?? 0.05) * Math.min(w, d), s[2] ?? 8, s[3] ?? 24]; break;
        default:         geoArgs = [s[0] * w, (s[1] ?? s[0]) * h, (s[2] ?? s[0]) * d]; break;
    }

    const geoElement = (() => {
        switch (geo) {
            case 'cylinder': return <cylinderGeometry args={geoArgs} />;
            case 'sphere':   return <sphereGeometry args={geoArgs} />;
            case 'cone':     return <coneGeometry args={geoArgs} />;
            case 'torus':    return <torusGeometry args={geoArgs} />;
            default:         return <boxGeometry args={geoArgs} />;
        }
    })();

    return (
        <mesh position={[pos[0] * w, pos[1] * h, pos[2] * d]} rotation={rot.map(r => r * Math.PI / 180)} castShadow>
            {geoElement}
            <meshStandardMaterial color={clr} roughness={rough} metalness={metal}
                {...(emClr ? { emissive: emClr, emissiveIntensity: emInt } : {})}
                {...(op < 1 ? { transparent: true, opacity: op } : {})} />
        </mesh>
    );
}

function ShapeCustom({ w, d, h, color, mesh3D }) {
    const m = mesh3D || {};
    const parts = m.parts;
    if (parts && Array.isArray(parts) && parts.length > 0) {
        return <group>{parts.map((part, i) => <PartMesh key={i} part={part} w={w} h={h} d={d} fallbackColor={color} />)}</group>;
    }
    return (
        <group>
            <mesh position={[0, h * 0.45, 0]} castShadow>
                <boxGeometry args={[w * 0.88, h * 0.9, d * 0.88]} />
                <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} emissive={color} emissiveIntensity={0.08} />
            </mesh>
            <mesh position={[0, h * 0.93, 0]} castShadow>
                <boxGeometry args={[w * 0.94, h * 0.08, d * 0.94]} />
                <meshStandardMaterial color={color} roughness={0.15} metalness={0.8} emissive={color} emissiveIntensity={0.25} transparent opacity={0.35} />
            </mesh>
        </group>
    );
}

// ─── Shape Dispatcher ─────────────────────────────────────────────────────────
function DomainShape({ type, w, d, h, color, mesh3D }) {
    const props = { w, d, h, color };
    if (type?.startsWith('custom_')) return <ShapeCustom {...props} mesh3D={mesh3D} />;
    switch (type) {
        case 'terminal':        return <ShapeTerminal {...props} />;
        case 'gate':            return <ShapeGate {...props} />;
        case 'runway':          return <ShapeRunway {...props} />;
        case 'checkin_desk':    return <ShapeCheckinDesk {...props} />;
        case 'security_zone':   return <ShapeSecurityZone {...props} />;
        case 'baggage_claim':   return <ShapeBaggageClaim {...props} />;
        case 'hydraulic_press': return <ShapeHydraulicPress {...props} />;
        case 'conveyor_belt':
        case 'conveyor':        return <ShapeConveyor {...props} />;
        case 'cnc_machine':     return <ShapeCncMachine {...props} />;
        case 'assembly_station': return <ShapeAssemblyStation {...props} />;
        case 'quality_control': return <ShapeQualityControl {...props} />;
        case 'warehouse_rack':
        case 'storage_rack':    return <ShapeWarehouseRack {...props} />;
        case 'picking_zone':    return <ShapePickingZone {...props} />;
        case 'reception_dock':  return <ShapeReceptionDock {...props} />;
        case 'shipping_dock':   return <ShapeShippingDock {...props} />;
        case 'sorter':          return <ShapeSorter {...props} />;
        default:
            return (
                <mesh position={[0, h / 2, 0]} castShadow>
                    <boxGeometry args={[w * 0.9, h, d * 0.9]} />
                    <meshStandardMaterial color={color} roughness={0.4} metalness={0.4} />
                </mesh>
            );
    }
}

// ─── Component Mesh (floor-aware) ─────────────────────────────────────────────
function ComponentMesh({ component, kpis, cellSize, selected, hovered, onSelect, onHover, onMove }) {
    const [cw, ch] = component.gridSize;
    const floorY = (component.floor ?? 0) * FLOOR_HEIGHT;
    const worldX = component.col * cellSize + (cw * cellSize) / 2;
    const worldZ = component.row * cellSize + (ch * cellSize) / 2;
    const isRotated = (component.rotation || 0) % 180 !== 0;
    const intrinsicCw = isRotated ? ch : cw;
    const intrinsicCh = isRotated ? cw : ch;

    const w = cw * cellSize - 0.5;
    const d = ch * cellSize - 0.5;
    const localW = intrinsicCw * cellSize - 0.5;
    const localD = intrinsicCh * cellSize - 0.5;
    const h = Math.max(1.5, Math.min(intrinsicCh * cellSize * 0.55, 8));

    const { selectedDomain } = useTwinStore();
    const kpi = kpis.find(k => component.kpiIds?.includes(k.id));
    const statusColor = kpi ? STATUS_COLORS[kpi.status] : (component.color || '#4865f2');

    const groupRef = useRef();
    const glowRef = useRef();
    const isDragging = useRef(false);
    // Drag plane lives at this floor's Y level
    const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY));
    const dragOffset = useRef(new THREE.Vector3());
    const { camera, gl } = useThree();

    useFrame((state) => {
        if (!groupRef.current) return;
        if (kpi && kpi.status !== 'green') {
            const t = state.clock.elapsedTime;
            const interactionType = kpi.interaction || 'pulse';
            const pulseVal = 0.05 + Math.max(0, Math.sin(t * 4)) * 0.4;
            groupRef.current.traverse(child => {
                if (child.isMesh && child.material && child !== glowRef.current && !child.name?.includes('shadow')) {
                    if (child.material.emissiveIntensity !== undefined) {
                        if (interactionType === 'pulse') {
                            child.material.emissive = new THREE.Color(statusColor);
                            child.material.emissiveIntensity = pulseVal;
                        } else if (interactionType === 'transition') {
                            child.material.emissive = new THREE.Color(statusColor);
                            child.material.emissiveIntensity = 0.25;
                        } else if (interactionType === 'glow') {
                            child.material.emissiveIntensity = 0;
                        }
                    }
                }
            });
            if (interactionType === 'glow' && glowRef.current) {
                glowRef.current.visible = true;
                glowRef.current.material.opacity = 0.4 + Math.sin(t * 2) * 0.2;
            } else if (glowRef.current && !selected) {
                glowRef.current.visible = false;
            }
        } else {
            if (glowRef.current && !selected) glowRef.current.visible = false;
            groupRef.current.traverse(child => {
                if (child.isMesh && child.material && child !== glowRef.current) {
                    if (child.material.emissiveIntensity !== undefined) child.material.emissiveIntensity = 0;
                }
            });
        }
    });

    const handlePointerDown = useCallback((e) => {
        if (e.ctrlKey || e.metaKey) {
            e.stopPropagation();
            isDragging.current = true;
            gl.domElement.style.cursor = 'grabbing';
            // Reset drag plane to this floor's Y
            dragPlane.current.constant = -floorY;
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(e.pointer, camera);
            const intersect = new THREE.Vector3();
            raycaster.ray.intersectPlane(dragPlane.current, intersect);
            dragOffset.current.set(worldX - intersect.x, 0, worldZ - intersect.z);
        } else {
            onSelect(component.id);
        }
    }, [worldX, worldZ, floorY, camera, gl]);

    const handlePointerMove = useCallback((e) => {
        if (!isDragging.current) return;
        e.stopPropagation();
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(e.pointer, camera);
        const intersect = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane.current, intersect);
        const newX = intersect.x + dragOffset.current.x;
        const newZ = intersect.z + dragOffset.current.z;
        const snappedCol = Math.round((newX - (cw * cellSize) / 2) / cellSize);
        const snappedRow = Math.round((newZ - (ch * cellSize) / 2) / cellSize);
        if (groupRef.current) {
            groupRef.current.position.x = snappedCol * cellSize + (cw * cellSize) / 2;
            groupRef.current.position.z = snappedRow * cellSize + (ch * cellSize) / 2;
        }
    }, [camera, cw, ch, cellSize]);

    const handlePointerUp = useCallback((e) => {
        if (!isDragging.current) return;
        isDragging.current = false;
        gl.domElement.style.cursor = 'default';
        if (groupRef.current) {
            const col = Math.round((groupRef.current.position.x - (cw * cellSize) / 2) / cellSize);
            const row = Math.round((groupRef.current.position.z - (ch * cellSize) / 2) / cellSize);
            onMove(component.id, col, row);
        }
    }, [cw, ch, cellSize]);

    return (
        <group
            ref={groupRef}
            position={[worldX, floorY, worldZ]}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerOver={(e) => { e.stopPropagation(); onHover(component.id); if (!isDragging.current) document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { onHover(null); if (!isDragging.current) document.body.style.cursor = 'default'; }}
        >
            {/* Shadow base */}
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[w, d]} />
                <meshStandardMaterial color="#000" opacity={0.15} transparent depthWrite={false} />
            </mesh>
            {/* Domain shape */}
            <group rotation={[0, THREE.MathUtils.degToRad(-(component.rotation || 0)), 0]}>
                <DomainShape type={component.type} w={localW} d={localD} h={h} color={statusColor} mesh3D={component.mesh3D} />
            </group>
            {/* Glow / selection outline */}
            <mesh ref={glowRef} position={[0, h * 0.5, 0]} visible={selected}>
                <boxGeometry args={[w * 1.08, h * 1.05, d * 1.08]} />
                <meshBasicMaterial color={selected ? '#4865f2' : statusColor} wireframe={selected} opacity={0.35} transparent depthWrite={false} />
            </mesh>
            {/* KPI status ring */}
            {kpi && (
                <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[Math.max(w, d) * 0.42, Math.max(w, d) * 0.42 + 0.3, 32]} />
                    <meshBasicMaterial color={statusColor} opacity={selected ? 0.9 : 0.5} transparent />
                </mesh>
            )}
            {/* Label */}
            <Text position={[0, h + 1.0, 0]} fontSize={0.75} color={selected ? '#4865f2' : '#94a3c8'} anchorX="center" anchorY="bottom" maxWidth={w}>
                {component.isCustom ? `${component.icon || '✨'} ${component.name}` : component.name}
            </Text>
            {component.isCustom && (
                <Text position={[0, h + 0.2, 0]} fontSize={0.45} color="#a855f7" anchorX="center" anchorY="bottom" maxWidth={w}>AI Generated</Text>
            )}
            {kpi && (
                <Text position={[0, h + 2.1, 0]} fontSize={0.65} color={statusColor} anchorX="center" anchorY="bottom">
                    {`${typeof kpi.value === 'number' ? kpi.value.toFixed(1) : kpi.value} ${kpi.unit}`}
                </Text>
            )}
            {hovered && !selected && (
                <Text position={[0, -0.5, 0]} fontSize={0.45} color="#4865f2" anchorX="center" anchorY="top" opacity={0.7}>Ctrl+drag to move</Text>
            )}
        </group>
    );
}

// ─── Connection Arc (floor-aware) ─────────────────────────────────────────────
function ConnectionArc({ connection, components, cellSize }) {
    const src = components.find(c => c.id === connection.sourceId);
    const tgt = components.find(c => c.id === connection.targetId);
    if (!src || !tgt) return null;

    const [sw, sh] = src.gridSize;
    const [tw, th] = tgt.gridSize;
    const sx = src.col * cellSize + (sw * cellSize) / 2;
    const sz = src.row * cellSize + (sh * cellSize) / 2;
    const tx = tgt.col * cellSize + (tw * cellSize) / 2;
    const tz = tgt.row * cellSize + (th * cellSize) / 2;
    const srcY = (src.floor ?? 0) * FLOOR_HEIGHT + 1.8;
    const tgtY = (tgt.floor ?? 0) * FLOOR_HEIGHT + 1.8;
    const peakY = Math.max(srcY, tgtY) + 4 + Math.hypot(tx - sx, tz - sz) * 0.06;
    const color = STATUS_COLORS[connection.flowStatus] || '#4865f2';

    const curve = useMemo(() => new THREE.CatmullRomCurve3([
        new THREE.Vector3(sx, srcY, sz),
        new THREE.Vector3((sx + tx) / 2, peakY, (sz + tz) / 2),
        new THREE.Vector3(tx, tgtY, tz),
    ]), [sx, sz, tx, tz, srcY, tgtY, peakY]);

    const tubeRef = useRef();
    useFrame(state => {
        if (tubeRef.current?.material)
            tubeRef.current.material.emissiveIntensity = 0.4 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    });

    return (
        <mesh ref={tubeRef}>
            <tubeGeometry args={[curve, 24, 0.13, 8, false]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.1} metalness={0.4} transparent opacity={0.9} />
        </mesh>
    );
}

// ─── Floor Slab ────────────────────────────────────────────────────────────────
function FloorSlab({ cols, rows, cellSz, yOffset, floorIndex, numFloors, totalW, totalD }) {
    const accent = FLOOR_ACCENT[floorIndex % FLOOR_ACCENT.length];

    const gridLines = useMemo(() => {
        const pts = [];
        for (let c = 0; c <= cols; c++) pts.push(c * cellSz, yOffset + 0.02, 0, c * cellSz, yOffset + 0.02, totalD);
        for (let r = 0; r <= rows; r++) pts.push(0, yOffset + 0.02, r * cellSz, totalW, yOffset + 0.02, r * cellSz);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        return geo;
    }, [cols, rows, cellSz, yOffset, totalW, totalD]);

    const borderLines = useMemo(() => {
        const y = yOffset + 0.05;
        const pts = new Float32Array([
            0, y, 0,        totalW, y, 0,
            totalW, y, 0,   totalW, y, totalD,
            totalW, y, totalD, 0, y, totalD,
            0, y, totalD,   0, y, 0,
        ]);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        return geo;
    }, [yOffset, totalW, totalD]);

    // Structural pillars between floors (only from floor 1+)
    const pillarHeight = FLOOR_HEIGHT;
    const pillarY = yOffset - pillarHeight / 2;
    const pillarPositions = [
        [0, totalD], [totalW, 0], [totalW, totalD],
        [totalW / 2, 0], [0, totalD / 2],
    ];

    return (
        <group>
            {/* Floor surface */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[totalW / 2, yOffset, totalD / 2]} receiveShadow>
                <planeGeometry args={[totalW, totalD]} />
                <meshStandardMaterial
                    color={floorIndex === 0 ? '#f0f4f8' : '#f7f8fb'}
                    roughness={0.95}
                    metalness={0.05}
                    transparent
                    opacity={numFloors > 1 ? 0.92 : 1}
                />
            </mesh>

            {/* Grid lines */}
            <lineSegments geometry={gridLines}>
                <lineBasicMaterial color="#94a3b8" opacity={0.6} transparent />
            </lineSegments>

            {/* Accent border */}
            <lineSegments geometry={borderLines}>
                <lineBasicMaterial color={accent} opacity={0.7} transparent />
            </lineSegments>

            {/* Floor label (shown on the front edge) */}
            <Text
                position={[-1.5, yOffset + 0.4, totalD / 2]}
                rotation={[0, Math.PI / 2, 0]}
                fontSize={1.1}
                color={accent}
                anchorX="center"
                anchorY="middle"
                fontWeight="bold"
            >
                {`L${floorIndex + 1}`}
            </Text>

            {/* Structural columns (only for upper floors) */}
            {floorIndex > 0 && pillarPositions.map(([px, pz], i) => (
                <mesh key={i} position={[px, pillarY, pz]} castShadow>
                    <boxGeometry args={[0.4, pillarHeight, 0.4]} />
                    <meshStandardMaterial color="#cbd5e1" roughness={0.6} metalness={0.3} transparent opacity={0.55} />
                </mesh>
            ))}
        </group>
    );
}

// ─── Particles ─────────────────────────────────────────────────────────────────
function Particles({ count = 40, spread, center }) {
    const geo = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = center[0] + (Math.random() - 0.5) * spread[0];
            pos[i * 3 + 1] = center[1] + Math.random() * spread[1];
            pos[i * 3 + 2] = center[2] + (Math.random() - 0.5) * spread[2];
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        return g;
    }, [count]);

    const mat = useMemo(() => new THREE.PointsMaterial({ color: '#4865f2', size: 0.2, transparent: true, opacity: 0.2, sizeAttenuation: true, depthWrite: false }), []);
    useFrame(s => { if (mat) mat.opacity = 0.12 + Math.sin(s.clock.elapsedTime * 0.5) * 0.08; });
    return <points geometry={geo} material={mat} />;
}

// ─── Scene Background ──────────────────────────────────────────────────────────
function SceneBackground() {
    const { scene } = useThree();
    useMemo(() => { scene.background = new THREE.Color('#f4f5f7'); }, [scene]);
    return null;
}

// ─── Main Export ───────────────────────────────────────────────────────────────
export default function Scene3D({ cameraView, viewFloor = null }) {
    const {
        components, connections, kpis, gridCols, gridRows, cellSize,
        selectedComponentId, hoveredComponentId, selectComponent, hoverComponent,
        activeView, moveComponent,
        numFloors,
    } = useTwinStore();

    const cols = gridCols || 10;
    const rows = gridRows || 8;
    const cs = cellSize || 6;
    const totalW = cols * cs;
    const totalD = rows * cs;
    const cx = totalW / 2;
    const cz = totalD / 2;

    // When isolating a single floor, only render that floor's slab + components
    const floorsToRender = viewFloor !== null
        ? [viewFloor]
        : Array.from({ length: numFloors }, (_, i) => i);

    const visibleComponents = viewFloor !== null
        ? components.filter(c => (c.floor ?? 0) === viewFloor)
        : components;

    // For single-floor view, connections on that floor only
    const visibleConnections = viewFloor !== null
        ? connections.filter(conn => {
            const src = components.find(c => c.id === conn.sourceId);
            const tgt = components.find(c => c.id === conn.targetId);
            return (src?.floor ?? 0) === viewFloor && (tgt?.floor ?? 0) === viewFloor;
          })
        : connections;

    const floorY = viewFloor !== null ? viewFloor * FLOOR_HEIGHT : 0;
    const totalHeight = (numFloors - 1) * FLOOR_HEIGHT + 10;

    // Camera presets — single-floor mode zooms to that floor's Y level
    const resolvedView = cameraView || activeView || 'isometric';
    const camPresets = viewFloor !== null ? {
        isometric: [cx + 36, floorY + 30, cz + 36],
        top:       [cx, floorY + 60, cz + 0.001],
        front:     [cx, floorY + 18, cz + 60],
        free:      [cx + 20, floorY + 22, cz + 50],
    } : {
        isometric: [cx + 42 + numFloors * 6, 40 + numFloors * 8, cz + 42 + numFloors * 6],
        top:       [cx, 85 + numFloors * FLOOR_HEIGHT * 0.7, cz + 0.001],
        front:     [cx, 20, cz + 80],
        free:      [cx + 25, 28 + numFloors * 5, cz + 58],
    };

    const orbitTarget = viewFloor !== null
        ? [cx, floorY + 2, cz]
        : [cx, totalHeight * 0.3, cz];

    return (
        <Canvas
            key={`${resolvedView}-${viewFloor}`}
            shadows
            camera={{ position: camPresets[resolvedView] || camPresets.isometric, fov: 45, near: 0.1, far: 1000 }}
            style={{ width: '100%', height: '100%' }}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            onPointerMissed={() => selectComponent(null)}
        >
            <SceneBackground />
            <fog attach="fog" args={['#f4f5f7', 130, 500]} />
            <ambientLight intensity={0.7} />
            <directionalLight
                position={[40, 60 + numFloors * FLOOR_HEIGHT * 0.5, 30]}
                intensity={1.2}
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-camera-left={-cx - 20}
                shadow-camera-right={cx + 20}
                shadow-camera-top={cz + 20}
                shadow-camera-bottom={-20}
                shadow-camera-far={400}
            />
            <hemisphereLight args={['#ffffff', '#e2e4e9', 0.6]} />
            <pointLight position={[cx, floorY + 14, cz]} intensity={0.5} color="#4466dd" distance={200} />

            {/* Render only the relevant floor slab(s) */}
            {floorsToRender.map(fi => (
                <FloorSlab
                    key={fi}
                    cols={cols}
                    rows={rows}
                    cellSz={cs}
                    yOffset={fi * FLOOR_HEIGHT}
                    floorIndex={fi}
                    numFloors={numFloors}
                    totalW={totalW}
                    totalD={totalD}
                />
            ))}

            <Particles
                count={40}
                spread={[totalW, viewFloor !== null ? 12 : 20 + totalHeight, totalD]}
                center={[cx, floorY + 6, cz]}
            />

            {visibleComponents.map(comp => (
                <ComponentMesh
                    key={comp.id}
                    component={comp}
                    kpis={kpis}
                    cellSize={cs}
                    selected={selectedComponentId === comp.id}
                    hovered={hoveredComponentId === comp.id}
                    onSelect={selectComponent}
                    onHover={hoverComponent}
                    onMove={moveComponent}
                />
            ))}

            {visibleConnections.map(conn => (
                <ConnectionArc key={conn.id} connection={conn} components={components} cellSize={cs} />
            ))}

            <OrbitControls
                target={orbitTarget}
                enableDamping
                dampingFactor={0.06}
                minDistance={8}
                maxDistance={400}
                maxPolarAngle={Math.PI / 2.05}
            />
        </Canvas>
    );
}
