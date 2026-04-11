// ---------------------------------------------------------------------------
// Globe widget — Interactive 3D Earth with points and arcs
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

interface GlobePoint {
  lat: number;
  lon: number;
  label?: string;
  color?: string;
  size?: number;
}

interface GlobeArc {
  from: number;
  to: number;
  color?: string;
}

interface GlobeData {
  title?: string;
  points?: GlobePoint[];
  arcs?: GlobeArc[];
  radius?: number;
  autoRotate?: boolean;
}

/** Convert lat/lon (degrees) to 3D position on a sphere. */
function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

/** Build a procedural Earth sphere (blue ocean, simplified continent outlines). */
function createEarthSphere(radius: number): THREE.Mesh {
  const geo = new THREE.SphereGeometry(radius, 64, 48);
  const mat = new THREE.MeshPhongMaterial({
    color: 0x1a3a5c,
    emissive: 0x071222,
    shininess: 15,
    transparent: true,
    opacity: 0.92,
  });
  const mesh = new THREE.Mesh(geo, mat);

  // Wireframe overlay for lat/lon grid
  const wireGeo = new THREE.SphereGeometry(radius * 1.001, 36, 18);
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x2a5a8c,
    wireframe: true,
    transparent: true,
    opacity: 0.12,
  });
  mesh.add(new THREE.Mesh(wireGeo, wireMat));

  return mesh;
}

/** Create a glowing point on the globe surface. */
function createPoint(pos: THREE.Vector3, color: string, size: number): THREE.Mesh {
  const geo = new THREE.SphereGeometry(size, 12, 8);
  const mat = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  return mesh;
}

/** Create a curved arc between two globe points. */
function createArc(
  from: THREE.Vector3,
  to: THREE.Vector3,
  color: string,
  radius: number,
): THREE.Line {
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const dist = from.distanceTo(to);
  mid.normalize().multiplyScalar(radius + dist * 0.4);

  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const points = curve.getPoints(48);
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
  return new THREE.Line(geo, mat);
}

export function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): () => void {
  const d = data as unknown as GlobeData;
  const R = d.radius ?? 1;
  const autoRotate = d.autoRotate !== false;

  // --- Title ---
  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText =
      'font-weight:600;font-size:14px;padding:4px 0;color:#e0e0e0;text-align:center;';
    container.appendChild(h);
  }

  // --- Three.js setup ---
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;aspect-ratio:1/1;min-height:300px;position:relative;';
  container.appendChild(wrapper);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 3.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  wrapper.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.autoRotate = autoRotate;
  controls.autoRotateSpeed = 0.8;
  controls.minDistance = 1.5;
  controls.maxDistance = 8;

  // Lighting
  scene.add(new THREE.AmbientLight(0x404060, 1.5));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(5, 3, 5);
  scene.add(dirLight);

  // Earth
  const earth = createEarthSphere(R);
  scene.add(earth);

  // Points
  const pts = d.points ?? [];
  const positions: THREE.Vector3[] = [];
  for (const p of pts) {
    const pos = latLonToVec3(p.lat, p.lon, R * 1.01);
    positions.push(pos);
    scene.add(createPoint(pos, p.color ?? '#ff4444', p.size ?? 0.02));
  }

  // Arcs
  for (const arc of d.arcs ?? []) {
    if (positions[arc.from] && positions[arc.to]) {
      scene.add(createArc(positions[arc.from], positions[arc.to], arc.color ?? '#44aaff', R));
    }
  }

  // --- Resize ---
  let animId = 0;
  function resize() {
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight || w;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(wrapper);
  resize();

  // --- Animation ---
  let running = true;
  function animate() {
    if (!running) return;
    animId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // --- Cleanup ---
  return () => {
    running = false;
    cancelAnimationFrame(animId);
    ro.disconnect();
    controls.dispose();
    renderer.dispose();
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
      if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    renderer.domElement.remove();
  };
}
