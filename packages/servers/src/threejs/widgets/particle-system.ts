// @ts-nocheck
// ---------------------------------------------------------------------------
// Particle System widget — Animated particle emitter
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const count = d.count ?? 2000;
  const color = d.color ?? '#ff8844';
  const spread = d.spread ?? 5;
  const speed = d.speed ?? 1;
  const size = d.particleSize ?? 0.05;
  const emitPattern = d.pattern ?? 'fountain'; // fountain, explosion, vortex

  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText = 'font-weight:600;font-size:14px;padding:4px 0;color:#1a1a1a;text-align:center;text-shadow:0 0 3px rgba(255,255,255,0.9);';
    container.appendChild(h);
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;aspect-ratio:4/3;min-height:300px;position:relative;';
  container.appendChild(wrapper);

  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const lifetimes = new Float32Array(count);

  function resetParticle(i: number) {
    if (emitPattern === 'explosion') {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const v = Math.random() * speed * 2;
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * v;
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * v;
      velocities[i * 3 + 2] = Math.cos(phi) * v;
    } else if (emitPattern === 'vortex') {
      const angle = Math.random() * Math.PI * 2;
      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = (Math.random() - 0.3) * speed;
      velocities[i * 3 + 2] = Math.sin(angle) * speed;
    } else { // fountain
      velocities[i * 3] = (Math.random() - 0.5) * spread * 0.3;
      velocities[i * 3 + 1] = Math.random() * speed * 3 + speed;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.3;
    }
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
    lifetimes[i] = Math.random() * 3;
  }

  for (let i = 0; i < count; i++) resetParticle(i);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({ color, size, sizeAttenuation: true, transparent: true, opacity: 0.8 });
  const particles = new THREE.Points(geo, mat);

  const scene = new THREE.Scene();
  scene.add(particles);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, spread * 20);
  camera.position.set(spread * 1.5, spread * 1.2, spread * 1.5);
  camera.lookAt(0, spread * 0.3, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  wrapper.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, spread * 0.3, 0);

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
  const gravity = emitPattern === 'fountain' ? -2 : 0;
  function animate() {
    if (!running) return;
    animId = requestAnimationFrame(animate);
    const dt = 0.016;
    for (let i = 0; i < count; i++) {
      lifetimes[i] -= dt;
      if (lifetimes[i] <= 0) { resetParticle(i); continue; }
      positions[i * 3] += velocities[i * 3] * dt;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
      velocities[i * 3 + 1] += gravity * dt;
      if (emitPattern === 'vortex') {
        const x = positions[i * 3], z = positions[i * 3 + 2];
        const angle = Math.atan2(z, x) + dt * speed;
        const r = Math.sqrt(x * x + z * z);
        velocities[i * 3] = -Math.sin(angle) * speed;
        velocities[i * 3 + 2] = Math.cos(angle) * speed;
      }
    }
    geo.attributes.position.needsUpdate = true;
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
    geo.dispose();
    mat.dispose();
    renderer.domElement.remove();
  };
}
