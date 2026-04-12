// @ts-nocheck
// ---------------------------------------------------------------------------
// Point Cloud widget — Large point cloud with color mapping
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const points = d.points ?? [];
  const pointSize = d.pointSize ?? 0.02;
  const defaultColor = d.color ?? '#44aaff';

  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText = 'font-weight:600;font-size:14px;padding:4px 0;color:#e0e0e0;text-align:center;';
    container.appendChild(h);
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;aspect-ratio:4/3;min-height:300px;position:relative;';
  container.appendChild(wrapper);

  const positions = new Float32Array(points.length * 3);
  const colors = new Float32Array(points.length * 3);
  const defColor = new THREE.Color(defaultColor);
  let maxRange = 1;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    positions[i * 3] = p.x ?? 0;
    positions[i * 3 + 1] = p.y ?? 0;
    positions[i * 3 + 2] = p.z ?? 0;
    maxRange = Math.max(maxRange, Math.abs(p.x ?? 0), Math.abs(p.y ?? 0), Math.abs(p.z ?? 0));
    const c = p.color ? new THREE.Color(p.color) : defColor;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({ size: pointSize * maxRange, vertexColors: true, sizeAttenuation: true });
  const cloud = new THREE.Points(geo, mat);

  const scene = new THREE.Scene();
  scene.add(cloud);

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
    geo.dispose();
    mat.dispose();
    renderer.domElement.remove();
  };
}
