// @ts-nocheck
// ---------------------------------------------------------------------------
// Pie Chart 3D widget — Extruded 3D pie/donut chart
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const slices = d.slices ?? [];
  const radius = d.radius ?? 2;
  const height = d.height ?? 0.5;
  const innerRadius = d.innerRadius ?? 0;
  const palette = ['#4488ff', '#44cc88', '#ff8844', '#ff4488', '#aa44ff', '#44dddd', '#dddd44', '#ff6666'];

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
  scene.add(new THREE.AmbientLight(0x606070, 1.2));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(3, 5, 3);
  scene.add(dirLight);

  const total = slices.reduce((sum: number, s: any) => sum + (s.value ?? 0), 0) || 1;
  let startAngle = 0;

  for (let i = 0; i < slices.length; i++) {
    const s = slices[i];
    const angle = (s.value / total) * Math.PI * 2;
    const color = s.color ?? palette[i % palette.length];

    const shape = new THREE.Shape();
    const segments = 32;
    if (innerRadius > 0) {
      shape.moveTo(Math.cos(startAngle) * innerRadius, Math.sin(startAngle) * innerRadius);
      for (let j = 0; j <= segments; j++) {
        const a = startAngle + (j / segments) * angle;
        shape.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
      }
      for (let j = segments; j >= 0; j--) {
        const a = startAngle + (j / segments) * angle;
        shape.lineTo(Math.cos(a) * innerRadius, Math.sin(a) * innerRadius);
      }
    } else {
      shape.moveTo(0, 0);
      for (let j = 0; j <= segments; j++) {
        const a = startAngle + (j / segments) * angle;
        shape.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
      }
      shape.lineTo(0, 0);
    }

    const extrudeSettings = { depth: height, bevelEnabled: false };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mat = new THREE.MeshPhongMaterial({ color, shininess: 30 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    scene.add(mesh);

    startAngle += angle;
  }

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(radius * 1.5, radius * 2, radius * 1.5);
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
