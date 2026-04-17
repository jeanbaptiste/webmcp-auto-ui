// @ts-nocheck
// ---------------------------------------------------------------------------
// Tree Map 3D widget — 3D treemap with extruded blocks
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const items = d.items ?? [];
  const palette = d.palette ?? ['#4488ff', '#44cc88', '#ff8844', '#ff4488', '#aa44ff', '#44dddd', '#dddd44', '#ff6666'];
  const maxHeight = d.maxHeight ?? 3;
  const gap = d.gap ?? 0.05;

  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText = 'font-weight:600;font-size:14px;padding:4px 0;color:#1a1a1a;text-align:center;text-shadow:0 0 3px rgba(255,255,255,0.9);';
    container.appendChild(h);
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;aspect-ratio:4/3;min-height:300px;position:relative;';
  container.appendChild(wrapper);

  // Simple squarified treemap layout
  const total = items.reduce((s: number, it: any) => s + (it.value ?? 0), 0) || 1;
  const sorted = [...items].sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0));

  // Layout in a square
  const layoutSize = 10;
  const rects: { x: number; z: number; w: number; d: number; value: number; label: string; color: string }[] = [];
  let x = 0, z = 0, rowHeight = 0, rowWidth = layoutSize;
  let remaining = total;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const area = ((item.value ?? 0) / total) * layoutSize * layoutSize;
    const w = Math.min(area / Math.max(rowHeight || 1, 0.1), rowWidth);
    const d = area / Math.max(w, 0.01);

    if (x + w > layoutSize + 0.01) {
      x = 0;
      z += rowHeight + gap;
      rowHeight = 0;
    }

    rowHeight = Math.max(rowHeight, d);
    rects.push({
      x, z, w: Math.max(w - gap, 0.1), d: Math.max(d - gap, 0.1),
      value: item.value ?? 0,
      label: item.label ?? '',
      color: item.color ?? palette[i % palette.length],
    });
    x += w + gap;
  }

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0x606070, 1.0));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(layoutSize, maxHeight * 3, layoutSize);
  scene.add(dirLight);

  const maxVal = Math.max(...items.map((it: any) => it.value ?? 0), 1);

  for (const rect of rects) {
    const height = (rect.value / maxVal) * maxHeight;
    const geo = new THREE.BoxGeometry(rect.w, Math.max(height, 0.05), rect.d);
    const mat = new THREE.MeshPhongMaterial({ color: rect.color, shininess: 30 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(rect.x + rect.w / 2 - layoutSize / 2, height / 2, rect.z + rect.d / 2 - layoutSize / 2);
    scene.add(mesh);
  }

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, layoutSize * 10);
  camera.position.set(layoutSize * 0.8, layoutSize * 0.6, layoutSize * 0.8);
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
