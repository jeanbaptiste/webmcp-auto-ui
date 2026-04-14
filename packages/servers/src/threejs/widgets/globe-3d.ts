// @ts-nocheck
// ---------------------------------------------------------------------------
// Globe 3D widget — Interactive 3D Earth with points and arcs
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const R = d.radius ?? 1;
  const autoRotate = d.autoRotate !== false;

  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText = 'font-weight:600;font-size:14px;padding:4px 0;color:#e0e0e0;text-align:center;';
    container.appendChild(h);
  }

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

  scene.add(new THREE.AmbientLight(0x404060, 1.5));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(5, 3, 5);
  scene.add(dirLight);

  // Earth sphere
  const geo = new THREE.SphereGeometry(R, 64, 48);
  const mat = new THREE.MeshPhongMaterial({ color: 0x1a3a5c, emissive: 0x071222, shininess: 15, transparent: true, opacity: 0.92 });
  const earth = new THREE.Mesh(geo, mat);
  const wireGeo = new THREE.SphereGeometry(R * 1.001, 36, 18);
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x2a5a8c, wireframe: true, transparent: true, opacity: 0.12 });
  earth.add(new THREE.Mesh(wireGeo, wireMat));
  scene.add(earth);

  // Helper: lat/lon to 3D
  function latLonToVec3(lat: number, lon: number, r: number) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
  }

  // Points
  const pts = d.points ?? [];
  const positions: any[] = [];
  for (const p of pts) {
    const pos = latLonToVec3(p.lat, p.lon, R * 1.01);
    positions.push(pos);
    const pGeo = new THREE.SphereGeometry(p.size ?? 0.02, 12, 8);
    const pMat = new THREE.MeshBasicMaterial({ color: p.color ?? '#ff4444' });
    const pm = new THREE.Mesh(pGeo, pMat);
    pm.position.copy(pos);
    scene.add(pm);
  }

  // Arcs
  for (const arc of d.arcs ?? []) {
    if (positions[arc.from] && positions[arc.to]) {
      const from = positions[arc.from];
      const to = positions[arc.to];
      const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
      const dist = from.distanceTo(to);
      mid.normalize().multiplyScalar(R + dist * 0.4);
      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      const cGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(48));
      const cMat = new THREE.LineBasicMaterial({ color: arc.color ?? '#44aaff' });
      scene.add(new THREE.Line(cGeo, cMat));
    }
  }

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
