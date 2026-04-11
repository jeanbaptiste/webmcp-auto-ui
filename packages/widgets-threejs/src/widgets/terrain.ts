// ---------------------------------------------------------------------------
// Terrain widget — 3D heightmap with altitude-based coloring
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

interface TerrainData {
  title?: string;
  heights: number[];
  width: number;
  depth: number;
  heightScale?: number;
  colorStops?: [number, string][];
  wireframe?: boolean;
}

const DEFAULT_STOPS: [number, string][] = [
  [0.0, '#2d6a1e'],  // green (low)
  [0.3, '#5a8c2a'],  // light green
  [0.5, '#8b6914'],  // brown
  [0.7, '#a0845c'],  // light brown
  [0.85, '#c8c0b0'], // grey
  [1.0, '#ffffff'],   // white (high)
];

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(a, b, t);
}

function heightToColor(
  normalizedH: number,
  stops: [number, string][],
): THREE.Color {
  const h = Math.max(0, Math.min(1, normalizedH));
  for (let i = 1; i < stops.length; i++) {
    if (h <= stops[i][0]) {
      const t = (h - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      return lerpColor(
        new THREE.Color(stops[i - 1][1]),
        new THREE.Color(stops[i][1]),
        t,
      );
    }
  }
  return new THREE.Color(stops[stops.length - 1][1]);
}

export function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): () => void {
  const d = data as unknown as TerrainData;
  const { heights, width, depth } = d;
  const hScale = d.heightScale ?? 1;
  const stops = (d.colorStops as [number, string][] | undefined) ?? DEFAULT_STOPS;

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

  // --- Height range ---
  let minH = Infinity;
  let maxH = -Infinity;
  for (const v of heights) {
    if (v < minH) minH = v;
    if (v > maxH) maxH = v;
  }
  const rangeH = maxH - minH || 1;

  // --- Geometry ---
  const geo = new THREE.PlaneGeometry(
    width - 1,
    depth - 1,
    width - 1,
    depth - 1,
  );
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const row = Math.floor(i / width);
    const col = i % width;
    const idx = row * width + col;
    const h = (heights[idx] ?? 0) * hScale;
    pos.setY(i, h);

    const norm = (heights[idx] - minH) / rangeH;
    const c = heightToColor(norm, stops);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshPhongMaterial({
    vertexColors: true,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);

  // Center mesh
  mesh.position.set(-(width - 1) / 2, 0, 0);

  // --- Scene ---
  const scene = new THREE.Scene();
  scene.add(mesh);

  if (d.wireframe) {
    const wireGeo = geo.clone();
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    wireMesh.position.copy(mesh.position);
    scene.add(wireMesh);
  }

  // Lighting
  scene.add(new THREE.AmbientLight(0x606070, 1.2));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(width, maxH * hScale * 3, depth);
  scene.add(dirLight);

  // Camera
  const maxDim = Math.max(width, depth);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, maxDim * 10);
  camera.position.set(maxDim * 0.6, maxDim * 0.5, maxDim * 0.8);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  wrapper.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);

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
    });
    renderer.domElement.remove();
  };
}
