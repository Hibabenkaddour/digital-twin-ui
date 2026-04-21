import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import useTwinStore, { DOMAINS } from '../store/useTwinStore';

const STATUS_COLORS = { green: '#10d98d', orange: '#f59e0b', red: '#ef4444' };

// ─── Domain Shapes ───────────────────────────────────────────────────────────
function ShapeTerminal({ w, d, h, color }) {
  return (
    <group>
      <mesh position={[0, h * 0.35, 0]} castShadow><boxGeometry args={[w * 0.95, h * 0.7, d * 0.95]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.4} /></mesh>
      <mesh position={[0, h * 0.74, 0]} castShadow><boxGeometry args={[w, h * 0.08, d]} /><meshStandardMaterial color={color} roughness={0.2} metalness={0.6} /></mesh>
      {[-0.3, 0, 0.3].map((o, i) => <mesh key={i} position={[o * w * 0.6, h * 0.3, d * 0.48]} castShadow><boxGeometry args={[w * 0.18, h * 0.5, 0.15]} /><meshStandardMaterial color="#6ab4f5" roughness={0.05} metalness={0.9} transparent opacity={0.7} /></mesh>)}
      {[[-0.45,-0.45],[0.45,-0.45],[-0.45,0.45],[0.45,0.45]].map(([cx,cz],i) => <mesh key={i} position={[cx*w, h*0.35, cz*d]} castShadow><cylinderGeometry args={[0.25,0.25,h*0.7,8]} /><meshStandardMaterial color="#c0cfe0" roughness={0.4} metalness={0.3} /></mesh>)}
    </group>
  );
}

function ShapeGate({ w, d, h, color }) {
  return (
    <group>
      <mesh position={[0, h*0.4, 0]} castShadow><boxGeometry args={[w*0.55, h*0.8, d*0.9]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.4} /></mesh>
      <mesh position={[w*0.3, h*0.38, 0]} castShadow><cylinderGeometry args={[0.3,0.3,w*0.6,10]} rotation={[0,0,Math.PI/2]} /><meshStandardMaterial color="#7a8fa6" roughness={0.4} metalness={0.5} /></mesh>
      <mesh position={[w*0.6, h*0.38, 0]} castShadow><sphereGeometry args={[0.4,12,12]} /><meshStandardMaterial color="#4e6a80" roughness={0.3} metalness={0.6} /></mesh>
    </group>
  );
}

function ShapeRunway({ w, d, h, color }) {
  return (
    <group>
      <mesh position={[0, h*0.15, 0]} castShadow><boxGeometry args={[w*0.98, h*0.3, d*0.98]} /><meshStandardMaterial color="#1a1f2e" roughness={0.95} metalness={0.05} /></mesh>
      {Array.from({length:6}).map((_,i) => <mesh key={i} position={[(i-2.5)*(w/6.5), h*0.31, 0]} castShadow><boxGeometry args={[w*0.07,0.05,0.25]} /><meshStandardMaterial color="#f0f0cc" roughness={0.8} /></mesh>)}
    </group>
  );
}

function ShapeCheckinDesk({ w, d, h, color }) {
  return (
    <group>
      <mesh position={[0, h*0.38, 0]} castShadow><boxGeometry args={[w*0.95, h*0.75, d*0.5]} /><meshStandardMaterial color={color} roughness={0.4} metalness={0.2} /></mesh>
      <mesh position={[0, h*0.77, d*0.1]} castShadow><boxGeometry args={[w*0.97, 0.1, d*0.7]} /><meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.5} /></mesh>
      {[-0.3,0,0.3].map((ox,i) => <mesh key={i} position={[ox*w, h*1.05, d*0.05]} castShadow><boxGeometry args={[0.4,0.3,0.06]} /><meshStandardMaterial color="#0d1117" roughness={0.1} metalness={0.8} emissive="#1a3a6e" emissiveIntensity={0.3} /></mesh>)}
    </group>
  );
}

function ShapeSecurityZone({ w, d, h, color }) {
  return (
    <group>
      <mesh position={[0, h*0.1, 0]} castShadow><boxGeometry args={[w*0.95, h*0.2, d*0.95]} /><meshStandardMaterial color="#2d3748" roughness={0.8} metalness={0.1} /></mesh>
      <mesh position={[-w*0.18, h*0.55, 0]} castShadow><boxGeometry args={[0.25, h*0.9, 0.25]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.5} /></mesh>
      <mesh position={[w*0.18, h*0.55, 0]} castShadow><boxGeometry args={[0.25, h*0.9, 0.25]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.5} /></mesh>
      <mesh position={[0, h, 0]} castShadow><boxGeometry args={[w*0.38, 0.22, 0.22]} /><meshStandardMaterial color={color} roughness={0.2} metalness={0.7} /></mesh>
    </group>
  );
}

function ShapeBaggageClaim({ w, d, h, color }) {
  return (
    <group>
      <mesh position={[0, h*0.1, 0]} castShadow><cylinderGeometry args={[Math.min(w,d)*0.48, Math.min(w,d)*0.5, h*0.2, 32]} /><meshStandardMaterial color="#374151" roughness={0.8} metalness={0.2} /></mesh>
      <mesh position={[0, h*0.28, 0]} rotation={[Math.PI/2, 0, 0]} castShadow><torusGeometry args={[Math.min(w,d)*0.36, 0.3, 8, 32]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.6} /></mesh>
    </group>
  );
}

function ShapeHydraulicPress({ w, d, h, color }) {
  return (
    <group>
      <mesh position={[0, h*0.18, 0]} castShadow><boxGeometry args={[w*0.9, h*0.36, d*0.9]} /><meshStandardMaterial color="#374151" roughness={0.4} metalness={0.6} /></mesh>
      {[-0.36, 0.36].map((ox,i) => <mesh key={i} position={[ox*w, h*0.6, 0]} castShadow><boxGeometry args={[0.3, h*0.9, 0.3]} /><meshStandardMaterial color="#4b5563" roughness={0.3} metalness={0.7} /></mesh>)}
      <mesh position={[0, h*1.07, 0]} castShadow><boxGeometry args={[w*0.78, 0.35, 0.35]} /><meshStandardMaterial color="#4b5563" roughness={0.3} metalness={0.7} /></mesh>
      <mesh position={[0, h*0.82, 0]} castShadow><cylinderGeometry args={[0.28, 0.28, h*0.5, 16]} /><meshStandardMaterial color={color} roughness={0.2} metalness={0.8} /></mesh>
    </group>
  );
}

function ShapeConveyor({ w, d, h, color }) {
  return (
    <group>
      <mesh position={[0, h*0.3, 0]} castShadow><boxGeometry args={[w*0.96, h*0.6, d*0.6]} /><meshStandardMaterial color="#1f2937" roughness={0.8} metalness={0.1} /></mesh>
      <mesh position={[0, h*0.62, 0]} castShadow><boxGeometry args={[w*0.96, 0.08, d*0.58]} /><meshStandardMaterial color={color} roughness={0.7} metalness={0.2} /></mesh>
      {[-0.46,0.46].map((ox,i) => <mesh key={i} position={[ox*w, h*0.3, 0]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[d*0.3, d*0.3, d*0.7, 16]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.7} /></mesh>)}
    </group>
  );
}

function ShapeCncMachine({ w, d, h, color }) {
  return (
    <group>
      <mesh position={[0, h*0.38, 0]} castShadow><boxGeometry args={[w*0.85, h*0.75, d*0.85]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.5} /></mesh>
      <mesh position={[0, h*0.84, 0]} castShadow><cylinderGeometry args={[0.22, 0.22, h*0.35, 12]} /><meshStandardMaterial color="#9ca3af" roughness={0.2} metalness={0.9} /></mesh>
      <mesh position={[0, h*0.6, 0]} castShadow><coneGeometry args={[0.28, 0.5, 8]} /><meshStandardMaterial color="#d1d5db" roughness={0.15} metalness={0.95} /></mesh>
    </group>
  );
}

function ShapeAssemblyStation({ w, d, h, color }) {
  return (
    <group>
      <mesh position={[0, h*0.55, 0]} castShadow><boxGeometry args={[w*0.9, 0.15, d*0.9]} /><meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.3} /></mesh>
      {[[-0.4,-0.4],[0.4,-0.4],[-0.4,0.4],[0.4,0.4]].map(([lx,lz],i) => <mesh key={i} position={[lx*w, h*0.27, lz*d]} castShadow><boxGeometry args={[0.15, h*0.54, 0.15]} /><meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.4} /></mesh>)}
      <mesh position={[0, h*0.66, 0]} castShadow><boxGeometry args={[w*0.35, 0.2, d*0.35]} /><meshStandardMaterial color={color} roughness={0.4} metalness={0.3} /></mesh>
    </group>
  );
}

function ShapeQualityControl({ w, d, h, color }) {
  return (
    <group>
      <mesh position={[0, h*0.2, 0]} castShadow><boxGeometry args={[w*0.9, h*0.4, d*0.9]} /><meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.4} /></mesh>
      <mesh position={[0, h*0.42, 0]} castShadow><boxGeometry args={[w*0.88, 0.08, d*0.88]} /><meshStandardMaterial color="#0d9488" roughness={0.1} metalness={0.8} emissive="#0d9488" emissiveIntensity={0.2} /></mesh>
      <mesh position={[0, h*1.22, 0]} castShadow><sphereGeometry args={[0.2,12,12]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} /></mesh>
    </group>
  );
}

function ShapeWarehouseRack({ w, d, h, color }) {
  return (
    <group>
      {[-0.46,0.46].map((ox,i) => <mesh key={i} position={[ox*w, h*0.5, 0]} castShadow><boxGeometry args={[0.18, h, d*0.9]} /><meshStandardMaterial color="#374151" roughness={0.5} metalness={0.5} /></mesh>)}
      {[0.15,0.42,0.7,0.95].map((fy,i) => <mesh key={i} position={[0, h*fy, 0]} castShadow><boxGeometry args={[w*0.88, 0.1, d*0.85]} /><meshStandardMaterial color={i%2===0 ? '#4b5563' : '#374151'} roughness={0.5} metalness={0.4} /></mesh>)}
    </group>
  );
}

function ShapePickingZone({ w, d, h, color }) {
  return (
    <group>
      <mesh position={[0, h*0.07, 0]} castShadow><boxGeometry args={[w*0.97, h*0.14, d*0.97]} /><meshStandardMaterial color="#1a1f2e" roughness={0.9} metalness={0.05} /></mesh>
      <mesh position={[w*0.18, h*0.35, d*0.1]} castShadow><boxGeometry args={[0.6, 0.5, 0.8]} /><meshStandardMaterial color="#f59e0b" roughness={0.5} metalness={0.3} /></mesh>
    </group>
  );
}

function ShapeReceptionDock({ w, d, h, color }) {
  return (
    <group>
      <mesh position={[0, h*0.4, -d*0.15]} castShadow><boxGeometry args={[w*0.94, h*0.8, d*0.65]} /><meshStandardMaterial color={color} roughness={0.4} metalness={0.3} /></mesh>
      <mesh position={[0, h*0.06, d*0.3]} rotation={[0.25,0,0]} castShadow><boxGeometry args={[w*0.7, 0.12, d*0.4]} /><meshStandardMaterial color="#374151" roughness={0.8} metalness={0.2} /></mesh>
    </group>
  );
}

function ShapeShippingDock({ w, d, h, color }) {
  return (
    <group>
      <mesh position={[0, h*0.4, 0]} castShadow><boxGeometry args={[w*0.94, h*0.8, d*0.94]} /><meshStandardMaterial color={color} roughness={0.4} metalness={0.3} /></mesh>
      {[-0.28,0,0.28].map((ox,i) => <mesh key={i} position={[ox*w, h*0.28, d*0.48]}><boxGeometry args={[w*0.2, h*0.45, 0.1]} /><meshStandardMaterial color="#0f172a" roughness={0.6} /></mesh>)}
    </group>
  );
}

function ShapeSorter({ w, d, h, color }) {
  return (
    <group>
      <mesh position={[0, h*0.15, 0]} castShadow><cylinderGeometry args={[Math.min(w,d)*0.42, Math.min(w,d)*0.45, h*0.3, 20]} /><meshStandardMaterial color="#374151" roughness={0.5} metalness={0.4} /></mesh>
      <mesh position={[0, h*0.55, 0]} castShadow><coneGeometry args={[Math.min(w,d)*0.3, h*0.7, 16]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.5} /></mesh>
    </group>
  );
}

function ShapeCustom({ w, d, h, color, mesh3D }) {
  const parts = mesh3D?.parts;
  if (parts && Array.isArray(parts) && parts.length > 0) {
    return (
      <group>
        {parts.map((part, i) => {
          const pos = part.pos || [0, 0, 0];
          const s   = part.size || [0.5, 0.5, 0.5];
          const geo = part.geo || 'box';
          let geoEl;
          if (geo === 'cylinder') geoEl = <cylinderGeometry args={[s[0]*Math.min(w,d), (s[1]??s[0])*Math.min(w,d), (s[2]??0.5)*h, s[3]??16]} />;
          else if (geo === 'sphere') geoEl = <sphereGeometry args={[s[0]*Math.min(w,d), s[1]??24, s[2]??24]} />;
          else if (geo === 'cone')   geoEl = <coneGeometry args={[s[0]*Math.min(w,d), (s[1]??0.5)*h, s[2]??16]} />;
          else geoEl = <boxGeometry args={[s[0]*w, (s[1]??s[0])*h, (s[2]??s[0])*d]} />;
          return (
            <mesh key={i} position={[pos[0]*w, pos[1]*h, pos[2]*d]} rotation={(part.rot||[0,0,0]).map(r=>r*Math.PI/180)} castShadow>
              {geoEl}
              <meshStandardMaterial color={part.color||color} roughness={part.roughness??0.3} metalness={part.metalness??0.5} {...(part.emissive?{emissive:part.emissive,emissiveIntensity:part.emissiveIntensity??0.6}:{})} {...(part.opacity<1?{transparent:true,opacity:part.opacity}:{})} />
            </mesh>
          );
        })}
      </group>
    );
  }
  return (
    <group>
      <mesh position={[0, h*0.45, 0]} castShadow><boxGeometry args={[w*0.88, h*0.9, d*0.88]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.5} /></mesh>
    </group>
  );
}

function DomainShape({ type, w, d, h, color, mesh3D }) {
  const props = { w, d, h, color };
  if (type?.startsWith('custom_')) return <ShapeCustom {...props} mesh3D={mesh3D} />;
  switch (type) {
    case 'terminal':       return <ShapeTerminal {...props} />;
    case 'gate':           return <ShapeGate {...props} />;
    case 'runway':         return <ShapeRunway {...props} />;
    case 'checkin_desk':   return <ShapeCheckinDesk {...props} />;
    case 'security_zone':  return <ShapeSecurityZone {...props} />;
    case 'baggage_claim':  return <ShapeBaggageClaim {...props} />;
    case 'hydraulic_press': return <ShapeHydraulicPress {...props} />;
    case 'conveyor_belt':
    case 'conveyor':       return <ShapeConveyor {...props} />;
    case 'cnc_machine':    return <ShapeCncMachine {...props} />;
    case 'assembly_station': return <ShapeAssemblyStation {...props} />;
    case 'quality_control':  return <ShapeQualityControl {...props} />;
    case 'warehouse_rack':
    case 'storage_rack':   return <ShapeWarehouseRack {...props} />;
    case 'picking_zone':   return <ShapePickingZone {...props} />;
    case 'reception_dock': return <ShapeReceptionDock {...props} />;
    case 'shipping_dock':  return <ShapeShippingDock {...props} />;
    case 'sorter':         return <ShapeSorter {...props} />;
    default: return <mesh position={[0, h/2, 0]} castShadow><boxGeometry args={[w*0.9, h, d*0.9]} /><meshStandardMaterial color={color} roughness={0.4} metalness={0.4} /></mesh>;
  }
}

// ─── Component Mesh ─────────────────────────────────────────────────────────
function ComponentMesh({ component, kpis, cellSize, selected, hovered, onSelect, onHover, onMove }) {
  const [cw, ch] = component.gridSize;
  const worldX = component.col * cellSize + (cw * cellSize) / 2;
  const worldZ = component.row * cellSize + (ch * cellSize) / 2;
  const w = cw * cellSize - 0.5;
  const d = ch * cellSize - 0.5;
  const h = Math.max(1.5, Math.min(ch * cellSize * 0.55, 8));

  const kpi = kpis.find(k => component.kpiIds?.includes(k.id));
  const statusColor = kpi ? STATUS_COLORS[kpi.status] : (component.color || '#4865f2');

  const groupRef    = useRef();
  const isDragging  = useRef(false);
  const dragPlane   = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset  = useRef(new THREE.Vector3());
  const { camera, gl } = useThree();

  useFrame((state) => {
    if (!groupRef.current) return;
    if (kpi && kpi.status !== 'green') {
      const t = state.clock.elapsedTime;
      groupRef.current.traverse(child => {
        if (child.isMesh && child.material && child.material.emissiveIntensity !== undefined) {
          child.material.emissive = new THREE.Color(statusColor);
          child.material.emissiveIntensity = 0.05 + Math.max(0, Math.sin(t * 4)) * 0.35;
        }
      });
    }
  });

  const handlePointerDown = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.stopPropagation();
      isDragging.current = true;
      gl.domElement.style.cursor = 'grabbing';
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(e.pointer, camera);
      const intersect = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlane.current, intersect);
      dragOffset.current.set(worldX - intersect.x, 0, worldZ - intersect.z);
    } else {
      onSelect(component.id);
    }
  }, [worldX, worldZ, camera, gl]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current) return;
    e.stopPropagation();
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(e.pointer, camera);
    const intersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane.current, intersect);
    const snappedCol = Math.round((intersect.x + dragOffset.current.x - (cw * cellSize) / 2) / cellSize);
    const snappedRow = Math.round((intersect.z + dragOffset.current.z - (ch * cellSize) / 2) / cellSize);
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
    <group ref={groupRef} position={[worldX, 0, worldZ]}
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
      onPointerOver={e => { e.stopPropagation(); onHover(component.id); if (!isDragging.current) document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { onHover(null); if (!isDragging.current) document.body.style.cursor = 'default'; }}
    >
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#000" opacity={0.12} transparent depthWrite={false} />
      </mesh>

      <group rotation={[0, THREE.MathUtils.degToRad(-(component.rotation || 0)), 0]}>
        <DomainShape type={component.type} w={w} d={d} h={h} color={statusColor} mesh3D={component.mesh3D} />
      </group>

      <mesh position={[0, h*0.5, 0]} visible={selected}>
        <boxGeometry args={[w*1.08, h*1.05, d*1.08]} />
        <meshBasicMaterial color="#4865f2" wireframe opacity={0.35} transparent depthWrite={false} />
      </mesh>

      {kpi && (
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[Math.max(w,d)*0.42, Math.max(w,d)*0.42+0.3, 32]} />
          <meshBasicMaterial color={statusColor} opacity={selected ? 0.9 : 0.5} transparent />
        </mesh>
      )}

      <Text position={[0, h+1.0, 0]} fontSize={0.75} color={selected ? '#4865f2' : '#94a3c8'} anchorX="center" anchorY="bottom" maxWidth={w}>
        {component.name}
      </Text>
      {kpi && (
        <Text position={[0, h+2.1, 0]} fontSize={0.65} color={statusColor} anchorX="center" anchorY="bottom">
          {`${typeof kpi.value==='number' ? kpi.value.toFixed(1) : kpi.value} ${kpi.unit}`}
        </Text>
      )}
    </group>
  );
}

// ─── Connection Arc ──────────────────────────────────────────────────────────
function ConnectionArc({ connection, components, cellSize }) {
  const src = components.find(c => c.id === connection.sourceId);
  const tgt = components.find(c => c.id === connection.targetId);
  if (!src || !tgt) return null;

  const [sw, sh] = src.gridSize, [tw, th] = tgt.gridSize;
  const sx = src.col*cellSize+(sw*cellSize)/2, sz = src.row*cellSize+(sh*cellSize)/2;
  const tx = tgt.col*cellSize+(tw*cellSize)/2, tz = tgt.row*cellSize+(th*cellSize)/2;
  const color = STATUS_COLORS[connection.flowStatus] || '#4865f2';

  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(sx, 1.8, sz),
    new THREE.Vector3((sx+tx)/2, 4+Math.hypot(tx-sx,tz-sz)*0.06, (sz+tz)/2),
    new THREE.Vector3(tx, 1.8, tz),
  ]), [sx, sz, tx, tz]);

  const tubeRef = useRef();
  useFrame(s => { if (tubeRef.current?.material) tubeRef.current.material.emissiveIntensity = 0.4+Math.sin(s.clock.elapsedTime*2)*0.2; });

  return (
    <mesh ref={tubeRef}>
      <tubeGeometry args={[curve, 24, 0.13, 8, false]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.1} metalness={0.4} transparent opacity={0.9} />
    </mesh>
  );
}

// ─── Floor ──────────────────────────────────────────────────────────────────
function Floor({ cols, rows, cellSz }) {
  const totalW = cols * cellSz, totalD = rows * cellSz;
  const gridLines = useMemo(() => {
    const pts = [];
    for (let c = 0; c <= cols; c++) pts.push(c*cellSz, 0.02, 0, c*cellSz, 0.02, totalD);
    for (let r = 0; r <= rows; r++) pts.push(0, 0.02, r*cellSz, totalW, 0.02, r*cellSz);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [cols, rows, cellSz]);

  const borderLines = useMemo(() => {
    const pts = new Float32Array([0,0.05,0, totalW,0.05,0, totalW,0.05,0, totalW,0.05,totalD, totalW,0.05,totalD, 0,0.05,totalD, 0,0.05,totalD, 0,0.05,0]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [totalW, totalD]);

  return (
    <group>
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[totalW/2, 0, totalD/2]} receiveShadow>
        <planeGeometry args={[totalW, totalD]} />
        <meshStandardMaterial color="#f0f4f8" roughness={0.95} metalness={0.05} />
      </mesh>
      <lineSegments geometry={gridLines}><lineBasicMaterial color="#94a3b8" opacity={0.8} transparent /></lineSegments>
      <lineSegments geometry={borderLines}><lineBasicMaterial color="#4865f2" /></lineSegments>
    </group>
  );
}

// ─── Scene Background ────────────────────────────────────────────────────────
function SceneBackground() {
  const { scene } = useThree();
  useMemo(() => { scene.background = new THREE.Color('#f4f5f7'); }, [scene]);
  return null;
}

// ─── Camera Controller for preset views ─────────────────────────────────────
function CameraController({ cameraView, cx, cz }) {
  const { camera } = useThree();
  const controlsRef = useRef();

  const presets = useMemo(() => ({
    isometric: { pos: [cx + 42, 40, cz + 42], target: [cx, 0, cz] },
    top:       { pos: [cx, 85, cz + 0.001],   target: [cx, 0, cz] },
    front:     { pos: [cx, 20, cz + 80],       target: [cx, 0, cz] },
    free:      { pos: [cx + 25, 28, cz + 58],  target: [cx, 0, cz] },
  }), [cx, cz]);

  useEffect(() => {
    const preset = presets[cameraView] || presets.isometric;
    camera.position.set(...preset.pos);
    if (controlsRef.current) {
      controlsRef.current.target.set(...preset.target);
      controlsRef.current.update();
    }
  }, [cameraView, presets]);

  return (
    <OrbitControls
      ref={controlsRef}
      target={[cx, 0, cz]}
      enableDamping dampingFactor={0.06}
      minDistance={8} maxDistance={250}
      maxPolarAngle={Math.PI / 2.05}
    />
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function Scene3D({ cameraView = 'isometric' }) {
  const { components, connections, kpis, gridCols, gridRows, cellSize, selectedComponentId, hoveredComponentId, selectComponent, hoverComponent, moveComponent } = useTwinStore();
  const cols = gridCols || 10, rows = gridRows || 8, cs = cellSize || 6;
  const cx = (cols * cs) / 2, cz = (rows * cs) / 2;

  return (
    <Canvas
      key={cameraView}
      shadows
      camera={{ position: [cx+42, 40, cz+42], fov: 45, near: 0.1, far: 1000 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => selectComponent(null)}
    >
      <SceneBackground />
      <fog attach="fog" args={['#f4f5f7', 130, 400]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[40,60,30]} intensity={1.2} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-cx-20} shadow-camera-right={cx+20} shadow-camera-top={cz+20} shadow-camera-bottom={-20} shadow-camera-far={250} />
      <hemisphereLight args={['#ffffff', '#e2e4e9', 0.6]} />
      <pointLight position={[cx,14,cz]} intensity={0.5} color="#4466dd" distance={160} />

      <Floor cols={cols} rows={rows} cellSz={cs} />

      {components.map(comp => (
        <ComponentMesh
          key={comp.id} component={comp} kpis={kpis} cellSize={cs}
          selected={selectedComponentId === comp.id} hovered={hoveredComponentId === comp.id}
          onSelect={selectComponent} onHover={hoverComponent} onMove={moveComponent}
        />
      ))}

      {connections.map(conn => (
        <ConnectionArc key={conn.id} connection={conn} components={components} cellSize={cs} />
      ))}

      <CameraController cameraView={cameraView} cx={cx} cz={cz} />
    </Canvas>
  );
}
