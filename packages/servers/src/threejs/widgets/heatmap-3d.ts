// @ts-nocheck
// ---------------------------------------------------------------------------
// Heatmap 3D widget — 3D elevated heatmap (bars or pillars for each cell)
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const values = d.values ?? [];
  const rows = d.rows ?? values.length;
  const cols = d.cols ?? (values[0]?.length ?? 0);
  const colorLow = d.colorLow ?? '#000066';
  const colorHigh = d.colorHigh ?? '#ff4400';
  const heightScale = d.heightScale ?? 1;

  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText = 'font-weight:600;font-size:14px;padding:4px 0;color:#1a1a1a;text-align:center;text-shadow:0 0 3px rgba(255,255,255,0.9);';
    container.appendChild(h);
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;aspect-ratio:4/3;min-height:300px;position:relative;';
  container.appendChild(wrapper);

  // Find range
  let minV = Infinity, maxV = -Infinity;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = values[r]?.[c] ?? 0;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
  }
  const rangeV = maxV - minV || 1;

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0x606070, 1.0));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(cols, maxV * heightScale * 3, rows);
  scene.add(dirLight);

  const cLow = new THREE.Color(colorLow);
  const cHigh = new THREE.Color(colorHigh);
  const boxGeo = new THREE.BoxGeometry(0.9, 1, 0.9);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = values[r]?.[c] ?? 0;
      const norm = (v - minV) / rangeV;
      const height = Math.max(norm * heightScale * 3, 0.05);
      const color = new THREE.Color().lerpColors(cLow, cHigh, norm);
      const mat = new THREE.MeshPhongMaterial({ color });
      const mesh = new THREE.Mesh(boxGeo, mat);
      mesh.scale.y = height;
      mesh.position.set(c - cols / 2, height / 2, r - rows / 2);
      scene.add(mesh);
    }
  }

  const maxDim = Math.max(rows, cols);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, maxDim * 10);
  camera.position.set(maxDim * 0.8, maxDim * 0.7, maxDim * 0.8);
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
    boxGeo.dispose();
    scene.traverse((obj: any) => {
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
        else obj.material.dispose();
      }
    });
    renderer.domElement.remove();
  };
}
