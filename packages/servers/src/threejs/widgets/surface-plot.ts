// @ts-nocheck
// ---------------------------------------------------------------------------
// Surface Plot widget — 3D surface from a grid of Z values
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const zValues = d.zValues ?? [];
  const rows = d.rows ?? zValues.length;
  const cols = d.cols ?? (zValues[0]?.length ?? 0);
  const colorLow = d.colorLow ?? '#0000ff';
  const colorHigh = d.colorHigh ?? '#ff0000';

  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText = 'font-weight:600;font-size:14px;padding:4px 0;color:#1a1a1a;text-align:center;text-shadow:0 0 3px rgba(255,255,255,0.9);';
    container.appendChild(h);
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;aspect-ratio:4/3;min-height:300px;position:relative;';
  container.appendChild(wrapper);

  // Flatten z values and find range
  const flat: number[] = [];
  let minZ = Infinity, maxZ = -Infinity;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = zValues[r]?.[c] ?? 0;
      flat.push(v);
      if (v < minZ) minZ = v;
      if (v > maxZ) maxZ = v;
    }
  }
  const rangeZ = maxZ - minZ || 1;

  const geo = new THREE.PlaneGeometry(cols - 1, rows - 1, cols - 1, rows - 1);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cLow = new THREE.Color(colorLow);
  const cHigh = new THREE.Color(colorHigh);

  for (let i = 0; i < pos.count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const z = flat[row * cols + col] ?? 0;
    pos.setY(i, z);
    const t = (z - minZ) / rangeZ;
    const c = new THREE.Color().lerpColors(cLow, cHigh, t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshPhongMaterial({ vertexColors: true, side: THREE.DoubleSide, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(-(cols - 1) / 2, 0, 0);

  const scene = new THREE.Scene();
  scene.add(mesh);
  scene.add(new THREE.AmbientLight(0x606070, 1.2));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(cols, maxZ * 3, rows);
  scene.add(dirLight);

  const maxDim = Math.max(cols, rows);
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
