// @ts-nocheck
// ---------------------------------------------------------------------------
// Orbit Diagram widget — Planetary orbit visualization
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const orbits = d.orbits ?? [];
  const centralBody = d.centralBody ?? { radius: 0.3, color: '#ffcc00' };
  const animate3d = d.animate !== false;

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
  scene.add(new THREE.AmbientLight(0x404060, 1.0));
  const pointLight = new THREE.PointLight(0xffffff, 1.5, 100);
  pointLight.position.set(0, 0, 0);
  scene.add(pointLight);

  // Central body (star/sun)
  const sunGeo = new THREE.SphereGeometry(centralBody.radius, 32, 24);
  const sunMat = new THREE.MeshBasicMaterial({ color: centralBody.color });
  scene.add(new THREE.Mesh(sunGeo, sunMat));

  // Orbit rings and planets
  const planetMeshes: { mesh: THREE.Mesh; radius: number; speed: number; angle: number; inclination: number }[] = [];

  for (let i = 0; i < orbits.length; i++) {
    const o = orbits[i];
    const orbitRadius = o.radius ?? (i + 1) * 1.5;
    const color = o.color ?? '#4488ff';
    const planetRadius = o.planetRadius ?? 0.1;
    const speed = o.speed ?? 1 / (i + 1);
    const inclination = (o.inclination ?? 0) * (Math.PI / 180);

    // Orbit ring
    const curve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius, 0, 2 * Math.PI, false, 0);
    const ringPoints = curve.getPoints(64);
    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPoints.map(p => new THREE.Vector3(p.x, 0, p.y)));
    const ringMat = new THREE.LineBasicMaterial({ color: '#333355', transparent: true, opacity: 0.5 });
    const ring = new THREE.Line(ringGeo, ringMat);
    ring.rotation.x = inclination;
    scene.add(ring);

    // Planet
    const pGeo = new THREE.SphereGeometry(planetRadius, 16, 12);
    const pMat = new THREE.MeshPhongMaterial({ color, shininess: 20 });
    const pMesh = new THREE.Mesh(pGeo, pMat);
    const startAngle = Math.random() * Math.PI * 2;
    pMesh.position.set(Math.cos(startAngle) * orbitRadius, 0, Math.sin(startAngle) * orbitRadius);
    scene.add(pMesh);

    planetMeshes.push({ mesh: pMesh, radius: orbitRadius, speed, angle: startAngle, inclination });
  }

  let maxRadius = 1;
  for (const o of orbits) maxRadius = Math.max(maxRadius, o.radius ?? 1);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, maxRadius * 20);
  camera.position.set(maxRadius * 1.2, maxRadius * 1.5, maxRadius * 1.2);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  wrapper.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

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
  function animateLoop() {
    if (!running) return;
    animId = requestAnimationFrame(animateLoop);
    if (animate3d) {
      for (const p of planetMeshes) {
        p.angle += p.speed * 0.01;
        p.mesh.position.set(
          Math.cos(p.angle) * p.radius,
          Math.sin(p.inclination) * Math.sin(p.angle) * p.radius,
          Math.sin(p.angle) * p.radius * Math.cos(p.inclination)
        );
      }
    }
    controls.update();
    renderer.render(scene, camera);
  }
  animateLoop();

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
