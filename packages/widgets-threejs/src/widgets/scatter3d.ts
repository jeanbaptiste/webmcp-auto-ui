// ---------------------------------------------------------------------------
// Scatter3D widget — 3D scatter plot with labeled axes
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

interface ScatterPoint {
  x: number;
  y: number;
  z: number;
  color?: string;
  size?: number;
  label?: string;
}

interface ScatterData {
  title?: string;
  points: ScatterPoint[];
  axes?: { x?: string; y?: string; z?: string };
  gridColor?: string;
}

/** Create a text sprite for axis labels. */
function makeTextSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 256;
  canvas.height = 64;
  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.2, 0.3, 1);
  return sprite;
}

/** Create axis lines + labels. */
function createAxes(
  scene: THREE.Scene,
  range: number,
  labels: { x?: string; y?: string; z?: string },
  gridColor: string,
): void {
  const axisLen = range * 1.2;
  const mat = new THREE.LineBasicMaterial({ color: gridColor });

  // X axis
  const xGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(axisLen, 0, 0),
  ]);
  scene.add(new THREE.Line(xGeo, mat));
  if (labels.x) {
    const s = makeTextSprite(labels.x, '#ff6666');
    s.position.set(axisLen + 0.3, 0, 0);
    scene.add(s);
  }

  // Y axis
  const yGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, axisLen, 0),
  ]);
  scene.add(new THREE.Line(yGeo, mat));
  if (labels.y) {
    const s = makeTextSprite(labels.y, '#66ff66');
    s.position.set(0, axisLen + 0.3, 0);
    scene.add(s);
  }

  // Z axis
  const zGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, axisLen),
  ]);
  scene.add(new THREE.Line(zGeo, mat));
  if (labels.z) {
    const s = makeTextSprite(labels.z, '#6666ff');
    s.position.set(0, 0, axisLen + 0.3);
    scene.add(s);
  }

  // Grid on XZ plane
  const gridHelper = new THREE.GridHelper(range * 2, 10, gridColor, gridColor);
  gridHelper.material.opacity = 0.2;
  gridHelper.material.transparent = true;
  gridHelper.position.set(range, 0, range);
  scene.add(gridHelper);
}

export function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): () => void {
  const d = data as unknown as ScatterData;
  const gridColor = d.gridColor ?? '#333333';

  // --- Title ---
  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText =
      'font-weight:600;font-size:14px;padding:4px 0;color:#e0e0e0;text-align:center;';
    container.appendChild(h);
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;aspect-ratio:4/3;min-height:300px;position:relative;';
  container.appendChild(wrapper);

  // --- Compute data range for normalization ---
  let maxRange = 1;
  for (const p of d.points) {
    maxRange = Math.max(maxRange, Math.abs(p.x), Math.abs(p.y), Math.abs(p.z));
  }

  // --- Scene ---
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0x606070, 1.5));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 8, 5);
  scene.add(dirLight);

  // Axes
  createAxes(scene, maxRange, d.axes ?? {}, gridColor);

  // Points — use instanced mesh for performance
  const pointGeo = new THREE.SphereGeometry(1, 10, 8);
  const defaultColor = new THREE.Color('#4488ff');
  const dummy = new THREE.Object3D();
  const instanceColors: number[] = [];

  // Group by color for instanced rendering
  const colorGroups = new Map<string, { positions: THREE.Vector3[]; size: number }>();

  for (const p of d.points) {
    const key = p.color ?? '#4488ff';
    if (!colorGroups.has(key)) colorGroups.set(key, { positions: [], size: p.size ?? 0.05 });
    colorGroups.get(key)!.positions.push(new THREE.Vector3(p.x, p.y, p.z));
  }

  // Simple approach: create individual meshes (fine for <2000 points)
  for (const p of d.points) {
    const size = p.size ?? 0.05;
    const geo = new THREE.SphereGeometry(size * maxRange * 0.5, 10, 8);
    const mat = new THREE.MeshPhongMaterial({ color: p.color ?? '#4488ff' });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(p.x, p.y, p.z);
    scene.add(mesh);
  }

  // Camera
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, maxRange * 20);
  camera.position.set(maxRange * 1.5, maxRange * 1.2, maxRange * 1.5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  wrapper.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  // --- Resize ---
  function resize() {
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight || w * 0.75;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(wrapper);
  resize();

  // --- Animation ---
  let running = true;
  let animId = 0;
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
      if (obj instanceof THREE.Sprite) {
        obj.material.map?.dispose();
        obj.material.dispose();
      }
    });
    renderer.domElement.remove();
  };
}
