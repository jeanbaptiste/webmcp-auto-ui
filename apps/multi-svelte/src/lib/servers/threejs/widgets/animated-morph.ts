// @ts-nocheck
// ---------------------------------------------------------------------------
// Animated Morph widget — Shape morphing between geometries
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const fromShape = d.fromShape ?? 'sphere';
  const toShape = d.toShape ?? 'box';
  const color = d.color ?? '#44aaff';
  const speed = d.speed ?? 1;
  const scale = d.scale ?? 1;

  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText = 'font-weight:600;font-size:14px;padding:4px 0;color:#e0e0e0;text-align:center;';
    container.appendChild(h);
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;aspect-ratio:4/3;min-height:300px;position:relative;';
  container.appendChild(wrapper);

  function makeGeo(shape: string, s: number, detail: number) {
    switch (shape) {
      case 'box': return new THREE.BoxGeometry(s, s, s, detail, detail, detail);
      case 'torus': return new THREE.TorusGeometry(s * 0.7, s * 0.3, detail, detail * 2);
      case 'torusKnot': return new THREE.TorusKnotGeometry(s * 0.6, s * 0.2, detail * 4, detail);
      case 'cone': return new THREE.ConeGeometry(s * 0.7, s * 1.5, detail);
      case 'cylinder': return new THREE.CylinderGeometry(s * 0.5, s * 0.5, s * 1.5, detail);
      case 'icosahedron': return new THREE.IcosahedronGeometry(s, Math.min(detail, 4));
      case 'dodecahedron': return new THREE.DodecahedronGeometry(s, Math.min(detail, 3));
      default: return new THREE.SphereGeometry(s, detail, detail);
    }
  }

  const detail = 16;
  const geo1 = makeGeo(fromShape, scale, detail);
  const geo2 = makeGeo(toShape, scale, detail);

  // We'll interpolate vertex positions — need same vertex count
  // Use sphere as base with enough vertices, store both target positions
  const baseGeo = new THREE.SphereGeometry(scale, detail, detail);
  const vertexCount = baseGeo.attributes.position.count;

  const pos1 = new Float32Array(vertexCount * 3);
  const pos2 = new Float32Array(vertexCount * 3);
  const srcPos1 = geo1.attributes.position;
  const srcPos2 = geo2.attributes.position;

  for (let i = 0; i < vertexCount; i++) {
    const i1 = i % srcPos1.count;
    const i2 = i % srcPos2.count;
    pos1[i * 3] = srcPos1.getX(i1); pos1[i * 3 + 1] = srcPos1.getY(i1); pos1[i * 3 + 2] = srcPos1.getZ(i1);
    pos2[i * 3] = srcPos2.getX(i2); pos2[i * 3 + 1] = srcPos2.getY(i2); pos2[i * 3 + 2] = srcPos2.getZ(i2);
  }

  const mat = new THREE.MeshPhongMaterial({ color, shininess: 40, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(baseGeo, mat);

  const scene = new THREE.Scene();
  scene.add(mesh);
  scene.add(new THREE.AmbientLight(0x606080, 1.2));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(3, 5, 3);
  scene.add(dirLight);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(scale * 3, scale * 2, scale * 3);
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
  let time = 0;
  function animate() {
    if (!running) return;
    animId = requestAnimationFrame(animate);
    time += 0.016 * speed;
    const t = (Math.sin(time) + 1) * 0.5; // 0..1 oscillation
    const positions = baseGeo.attributes.position;
    for (let i = 0; i < vertexCount; i++) {
      positions.setXYZ(i,
        pos1[i * 3] * (1 - t) + pos2[i * 3] * t,
        pos1[i * 3 + 1] * (1 - t) + pos2[i * 3 + 1] * t,
        pos1[i * 3 + 2] * (1 - t) + pos2[i * 3 + 2] * t,
      );
    }
    positions.needsUpdate = true;
    baseGeo.computeVertexNormals();
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
    baseGeo.dispose(); geo1.dispose(); geo2.dispose(); mat.dispose();
    renderer.domElement.remove();
  };
}
