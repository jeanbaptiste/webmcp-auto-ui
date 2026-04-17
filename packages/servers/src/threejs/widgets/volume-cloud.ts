// @ts-nocheck
// ---------------------------------------------------------------------------
// Volume Cloud widget — Volumetric point cloud with density mapping
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const points = d.points ?? [];
  const density = d.density ?? 1000;
  const colorLow = d.colorLow ?? '#0044aa';
  const colorHigh = d.colorHigh ?? '#ff4400';
  const size = d.pointSize ?? 0.03;
  const bounds = d.bounds ?? { x: 5, y: 5, z: 5 };

  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText = 'font-weight:600;font-size:14px;padding:4px 0;color:#1a1a1a;text-align:center;text-shadow:0 0 3px rgba(255,255,255,0.9);';
    container.appendChild(h);
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;aspect-ratio:4/3;min-height:300px;position:relative;';
  container.appendChild(wrapper);

  // Generate points if not provided
  const allPoints = points.length > 0 ? points : Array.from({ length: density }, () => ({
    x: (Math.random() - 0.5) * bounds.x * 2,
    y: (Math.random() - 0.5) * bounds.y * 2,
    z: (Math.random() - 0.5) * bounds.z * 2,
    value: Math.random(),
  }));

  const positions = new Float32Array(allPoints.length * 3);
  const colors = new Float32Array(allPoints.length * 3);
  const cLow = new THREE.Color(colorLow);
  const cHigh = new THREE.Color(colorHigh);

  for (let i = 0; i < allPoints.length; i++) {
    const p = allPoints[i];
    positions[i * 3] = p.x ?? 0;
    positions[i * 3 + 1] = p.y ?? 0;
    positions[i * 3 + 2] = p.z ?? 0;
    const t = p.value ?? 0.5;
    const c = new THREE.Color().lerpColors(cLow, cHigh, t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({ size, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.7 });
  const cloud = new THREE.Points(geo, mat);

  const scene = new THREE.Scene();
  scene.add(cloud);

  const maxBound = Math.max(bounds.x, bounds.y, bounds.z);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, maxBound * 20);
  camera.position.set(maxBound * 2, maxBound * 1.5, maxBound * 2);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  wrapper.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = d.autoRotate === true;
  controls.autoRotateSpeed = 0.5;

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
