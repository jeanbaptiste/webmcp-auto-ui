// @ts-nocheck
// ---------------------------------------------------------------------------
// Axes Inspector widget — Interactive XYZ axes with grid and measurements
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const range = d.range ?? 5;
  const gridDivisions = d.gridDivisions ?? 10;
  const showLabels = d.showLabels !== false;
  const xLabel = d.xLabel ?? 'X';
  const yLabel = d.yLabel ?? 'Y';
  const zLabel = d.zLabel ?? 'Z';

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

  // Grid
  const gridHelper = new THREE.GridHelper(range * 2, gridDivisions, '#444444', '#222222');
  scene.add(gridHelper);

  // Axes with colors
  const axisConfigs = [
    { dir: new THREE.Vector3(1, 0, 0), color: '#ff4444', label: xLabel },
    { dir: new THREE.Vector3(0, 1, 0), color: '#44ff44', label: yLabel },
    { dir: new THREE.Vector3(0, 0, 1), color: '#4444ff', label: zLabel },
  ];

  for (const ax of axisConfigs) {
    const end = ax.dir.clone().multiplyScalar(range);
    const negEnd = ax.dir.clone().multiplyScalar(-range);
    const geo = new THREE.BufferGeometry().setFromPoints([negEnd, end]);
    const mat = new THREE.LineBasicMaterial({ color: ax.color, linewidth: 2 });
    scene.add(new THREE.Line(geo, mat));

    // Arrow head
    const coneGeo = new THREE.ConeGeometry(0.08, 0.3, 8);
    const coneMat = new THREE.MeshBasicMaterial({ color: ax.color });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.copy(end);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), ax.dir);
    scene.add(cone);

    // Label
    if (showLabels) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 128; canvas.height = 64;
      ctx.font = 'bold 32px sans-serif';
      ctx.fillStyle = ax.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ax.label, 64, 32);
      const tex = new THREE.CanvasTexture(canvas);
      const spMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(spMat);
      sprite.scale.set(0.8, 0.4, 1);
      sprite.position.copy(end.clone().add(ax.dir.clone().multiplyScalar(0.5)));
      scene.add(sprite);
    }

    // Tick marks
    for (let t = -range; t <= range; t++) {
      if (t === 0) continue;
      const tickPos = ax.dir.clone().multiplyScalar(t);
      const tickGeo = new THREE.SphereGeometry(0.03, 6, 4);
      const tickMat = new THREE.MeshBasicMaterial({ color: ax.color });
      const tick = new THREE.Mesh(tickGeo, tickMat);
      tick.position.copy(tickPos);
      scene.add(tick);
    }
  }

  // Optional objects to place in the scene
  const objects = d.objects ?? [];
  for (const obj of objects) {
    const pos = new THREE.Vector3(obj.x ?? 0, obj.y ?? 0, obj.z ?? 0);
    const geo = new THREE.SphereGeometry(obj.size ?? 0.15, 12, 8);
    const mat = new THREE.MeshPhongMaterial({ color: obj.color ?? '#ffaa00' });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
  }

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, range * 10);
  camera.position.set(range * 1.2, range * 0.8, range * 1.2);
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
        else { obj.material.map?.dispose(); obj.material.dispose(); }
      }
    });
    renderer.domElement.remove();
  };
}
