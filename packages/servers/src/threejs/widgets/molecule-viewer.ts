// @ts-nocheck
// ---------------------------------------------------------------------------
// Molecule Viewer widget — Ball-and-stick molecular visualization
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const atoms = d.atoms ?? [];
  const bonds = d.bonds ?? [];
  const atomScale = d.atomScale ?? 0.3;
  const bondRadius = d.bondRadius ?? 0.05;

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
  scene.add(new THREE.AmbientLight(0x606080, 1.2));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(5, 8, 5);
  scene.add(dirLight);

  // Element color map
  const elementColors: Record<string, string> = {
    H: '#ffffff', C: '#333333', N: '#3333ff', O: '#ff3333',
    S: '#ffcc00', P: '#ff8800', F: '#00ff00', Cl: '#00cc00',
    Br: '#882200', I: '#440088', ...d.elementColors,
  };

  const atomPositions: THREE.Vector3[] = [];
  let maxRange = 1;

  // Atoms
  for (const atom of atoms) {
    const pos = new THREE.Vector3(atom.x ?? 0, atom.y ?? 0, atom.z ?? 0);
    atomPositions.push(pos);
    maxRange = Math.max(maxRange, pos.length());
    const radius = (atom.radius ?? atomScale) * (atom.element === 'H' ? 0.6 : 1);
    const color = atom.color ?? elementColors[atom.element] ?? '#888888';
    const geo = new THREE.SphereGeometry(radius, 16, 12);
    const mat = new THREE.MeshPhongMaterial({ color, shininess: 40 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
  }

  // Bonds (cylinders)
  for (const bond of bonds) {
    const from = atomPositions[bond.from ?? 0];
    const to = atomPositions[bond.to ?? 0];
    if (!from || !to) continue;
    const dir = new THREE.Vector3().subVectors(to, from);
    const length = dir.length();
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const geo = new THREE.CylinderGeometry(bondRadius, bondRadius, length, 8);
    const mat = new THREE.MeshPhongMaterial({ color: bond.color ?? '#666666' });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    scene.add(mesh);
  }

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, maxRange * 20);
  camera.position.set(maxRange * 2, maxRange * 1.5, maxRange * 2);
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
