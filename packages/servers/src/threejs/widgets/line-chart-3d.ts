// @ts-nocheck
// ---------------------------------------------------------------------------
// Line Chart 3D widget — Multiple 3D line series in space
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const series = d.series ?? [];
  const palette = ['#4488ff', '#44cc88', '#ff8844', '#ff4488', '#aa44ff', '#44dddd'];

  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText = 'font-weight:600;font-size:14px;padding:4px 0;color:#1a1a1a;text-align:center;text-shadow:0 0 3px rgba(255,255,255,0.9);';
    container.appendChild(h);
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;aspect-ratio:4/3;min-height:300px;position:relative;';
  container.appendChild(wrapper);

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0x606070, 1.5));

  let maxRange = 1;

  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    const points = (s.points ?? []).map((p: any) => new THREE.Vector3(p.x ?? 0, p.y ?? 0, p.z ?? si * 2));
    for (const p of points) maxRange = Math.max(maxRange, Math.abs(p.x), Math.abs(p.y), Math.abs(p.z));
    const color = s.color ?? palette[si % palette.length];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
    scene.add(new THREE.Line(geo, mat));

    // Optional: add spheres at data points
    if (s.showPoints !== false) {
      const sphereGeo = new THREE.SphereGeometry(0.05 * maxRange, 8, 6);
      const sphereMat = new THREE.MeshBasicMaterial({ color });
      for (const p of points) {
        const mesh = new THREE.Mesh(sphereGeo, sphereMat);
        mesh.position.copy(p);
        scene.add(mesh);
      }
    }
  }

  // Axes
  const axisLen = maxRange * 1.2;
  const axisMat = new THREE.LineBasicMaterial({ color: '#444444' });
  for (const end of [new THREE.Vector3(axisLen, 0, 0), new THREE.Vector3(0, axisLen, 0), new THREE.Vector3(0, 0, axisLen)]) {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), end]);
    scene.add(new THREE.Line(g, axisMat));
  }

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, maxRange * 20);
  camera.position.set(maxRange * 1.5, maxRange * 1.2, maxRange * 1.5);
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
