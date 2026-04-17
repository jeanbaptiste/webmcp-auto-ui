// @ts-nocheck
// ---------------------------------------------------------------------------
// Force Graph 3D widget — 3D force-directed graph
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const nodes = d.nodes ?? [];
  const links = d.links ?? [];
  const nodeSize = d.nodeSize ?? 0.15;
  const linkColor = d.linkColor ?? '#555555';

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
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 8, 5);
  scene.add(dirLight);

  // Simple force simulation: random initial positions, then spring iterations
  const nodePositions: THREE.Vector3[] = nodes.map(() =>
    new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5)
  );

  // Run simple force layout (spring + repulsion)
  for (let iter = 0; iter < 100; iter++) {
    // Repulsion
    for (let i = 0; i < nodePositions.length; i++) {
      for (let j = i + 1; j < nodePositions.length; j++) {
        const diff = new THREE.Vector3().subVectors(nodePositions[i], nodePositions[j]);
        const dist = diff.length() || 0.01;
        const force = 0.5 / (dist * dist);
        diff.normalize().multiplyScalar(force);
        nodePositions[i].add(diff);
        nodePositions[j].sub(diff);
      }
    }
    // Attraction (links)
    for (const link of links) {
      const s = link.source ?? 0;
      const t = link.target ?? 0;
      if (nodePositions[s] && nodePositions[t]) {
        const diff = new THREE.Vector3().subVectors(nodePositions[t], nodePositions[s]);
        const dist = diff.length() || 0.01;
        const force = (dist - 1.5) * 0.05;
        diff.normalize().multiplyScalar(force);
        nodePositions[s].add(diff);
        nodePositions[t].sub(diff);
      }
    }
  }

  // Render nodes
  const sphereGeo = new THREE.SphereGeometry(nodeSize, 12, 8);
  for (let i = 0; i < nodes.length; i++) {
    const color = nodes[i].color ?? '#4488ff';
    const mat = new THREE.MeshPhongMaterial({ color });
    const mesh = new THREE.Mesh(sphereGeo, mat);
    mesh.position.copy(nodePositions[i]);
    scene.add(mesh);
  }

  // Render links
  const lineMat = new THREE.LineBasicMaterial({ color: linkColor, transparent: true, opacity: 0.6 });
  for (const link of links) {
    const s = link.source ?? 0;
    const t = link.target ?? 0;
    if (nodePositions[s] && nodePositions[t]) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints([nodePositions[s], nodePositions[t]]);
      scene.add(new THREE.Line(lineGeo, lineMat));
    }
  }

  let maxRange = 1;
  for (const p of nodePositions) {
    maxRange = Math.max(maxRange, p.length());
  }

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, maxRange * 20);
  camera.position.set(maxRange * 1.5, maxRange * 1.0, maxRange * 1.5);
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
    sphereGeo.dispose();
    lineMat.dispose();
    scene.traverse((obj: any) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material && obj.material !== lineMat) {
        if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
        else obj.material.dispose();
      }
    });
    renderer.domElement.remove();
  };
}
