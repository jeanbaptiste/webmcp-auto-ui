// @ts-nocheck
// ---------------------------------------------------------------------------
// Wireframe Viewer widget — Display geometry as wireframe
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const shape = d.shape ?? 'sphere';
  const color = d.color ?? '#44aaff';
  const scale = d.scale ?? 1;
  const segments = d.segments ?? 32;

  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText = 'font-weight:600;font-size:14px;padding:4px 0;color:#e0e0e0;text-align:center;';
    container.appendChild(h);
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;aspect-ratio:4/3;min-height:300px;position:relative;';
  container.appendChild(wrapper);

  let geo: any;
  switch (shape) {
    case 'box': geo = new THREE.BoxGeometry(scale, scale, scale, segments, segments, segments); break;
    case 'torus': geo = new THREE.TorusGeometry(scale, scale * 0.4, segments, segments * 2); break;
    case 'torusKnot': geo = new THREE.TorusKnotGeometry(scale, scale * 0.3, segments * 4, segments); break;
    case 'cylinder': geo = new THREE.CylinderGeometry(scale * 0.5, scale * 0.5, scale * 1.5, segments); break;
    case 'cone': geo = new THREE.ConeGeometry(scale, scale * 2, segments); break;
    case 'icosahedron': geo = new THREE.IcosahedronGeometry(scale, Math.min(segments, 5)); break;
    case 'dodecahedron': geo = new THREE.DodecahedronGeometry(scale, Math.min(segments, 3)); break;
    default: geo = new THREE.SphereGeometry(scale, segments, segments); break;
  }

  // If custom vertices/faces provided
  if (d.vertices && d.faces) {
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(d.vertices), 3));
    const faces = d.faces;
    geo.setIndex(new THREE.BufferAttribute(faces.length > 65535 ? new Uint32Array(faces) : new Uint16Array(faces), 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
  }

  const mat = new THREE.MeshBasicMaterial({ color, wireframe: true });
  const mesh = new THREE.Mesh(geo, mat);

  const scene = new THREE.Scene();
  scene.add(mesh);

  geo.computeBoundingSphere();
  const bsRadius = geo.boundingSphere?.radius ?? 1;

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, bsRadius * 20);
  camera.position.set(bsRadius * 2, bsRadius * 1.5, bsRadius * 2);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  wrapper.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = d.autoRotate !== false;
  controls.autoRotateSpeed = 1.0;

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
    geo.dispose();
    mat.dispose();
    renderer.domElement.remove();
  };
}
