// @ts-nocheck
// ---------------------------------------------------------------------------
// Terrain widget — 3D heightmap with altitude-based coloring
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const heights = d.heights ?? [];
  const width = d.width ?? Math.ceil(Math.sqrt(heights.length));
  const depth = d.depth ?? Math.ceil(heights.length / width);
  const hScale = d.heightScale ?? 1;
  const stops: [number, string][] = d.colorStops ?? [
    [0.0, '#2d6a1e'], [0.3, '#5a8c2a'], [0.5, '#8b6914'],
    [0.7, '#a0845c'], [0.85, '#c8c0b0'], [1.0, '#ffffff'],
  ];

  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText = 'font-weight:600;font-size:14px;padding:4px 0;color:#1a1a1a;text-align:center;text-shadow:0 0 3px rgba(255,255,255,0.9);';
    container.appendChild(h);
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;aspect-ratio:4/3;min-height:300px;position:relative;';
  container.appendChild(wrapper);

  let minH = Infinity, maxH = -Infinity;
  for (const v of heights) { if (v < minH) minH = v; if (v > maxH) maxH = v; }
  const rangeH = maxH - minH || 1;

  function heightToColor(norm: number) {
    const h = Math.max(0, Math.min(1, norm));
    for (let i = 1; i < stops.length; i++) {
      if (h <= stops[i][0]) {
        const t = (h - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
        return new THREE.Color(stops[i - 1][1]).lerp(new THREE.Color(stops[i][1]), t);
      }
    }
    return new THREE.Color(stops[stops.length - 1][1]);
  }

  const geo = new THREE.PlaneGeometry(width - 1, depth - 1, width - 1, depth - 1);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const row = Math.floor(i / width);
    const col = i % width;
    const idx = row * width + col;
    const hVal = (heights[idx] ?? 0) * hScale;
    pos.setY(i, hVal);
    const norm = (heights[idx] - minH) / rangeH;
    const c = heightToColor(norm);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(-(width - 1) / 2, 0, 0);

  const scene = new THREE.Scene();
  scene.add(mesh);
  scene.add(new THREE.AmbientLight(0x606070, 1.2));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(width, maxH * hScale * 3, depth);
  scene.add(dirLight);

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

  let running = true;
  let animId = 0;
  function animate() {
    if (!running) return;
    animId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  return () => {
    running = false;
    cancelAnimationFrame(animId);
    ro.disconnect();
    controls.dispose();
    renderer.dispose();
    scene.traverse((obj: any) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
        else obj.material.dispose();
      }
    });
    renderer.domElement.remove();
  };
}
