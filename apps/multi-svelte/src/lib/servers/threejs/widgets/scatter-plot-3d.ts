// @ts-nocheck
// ---------------------------------------------------------------------------
// Scatter Plot 3D widget — 3D scatter plot with labeled axes
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const gridColor = d.gridColor ?? '#333333';

  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText = 'font-weight:600;font-size:14px;padding:4px 0;color:#e0e0e0;text-align:center;';
    container.appendChild(h);
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;aspect-ratio:4/3;min-height:300px;position:relative;';
  container.appendChild(wrapper);

  const points = d.points ?? [];
  let maxRange = 1;
  for (const p of points) {
    maxRange = Math.max(maxRange, Math.abs(p.x), Math.abs(p.y), Math.abs(p.z));
  }

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0x606070, 1.5));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 8, 5);
  scene.add(dirLight);

  // Axes
  const axisLen = maxRange * 1.2;
  const axisMat = new THREE.LineBasicMaterial({ color: gridColor });
  const axes = [
    [new THREE.Vector3(0, 0, 0), new THREE.Vector3(axisLen, 0, 0)],
    [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, axisLen, 0)],
    [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, axisLen)],
  ];
  for (const [a, b] of axes) {
    const g = new THREE.BufferGeometry().setFromPoints([a, b]);
    scene.add(new THREE.Line(g, axisMat));
  }

  // Axis labels
  const labels = d.axes ?? {};
  const labelColors = ['#ff6666', '#66ff66', '#6666ff'];
  const labelPositions = [new THREE.Vector3(axisLen + 0.3, 0, 0), new THREE.Vector3(0, axisLen + 0.3, 0), new THREE.Vector3(0, 0, axisLen + 0.3)];
  ['x', 'y', 'z'].forEach((axis, i) => {
    if (labels[axis]) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 256; canvas.height = 64;
      ctx.font = 'bold 28px sans-serif';
      ctx.fillStyle = labelColors[i];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[axis], 128, 32);
      const tex = new THREE.CanvasTexture(canvas);
      const spMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(spMat);
      sprite.scale.set(1.2, 0.3, 1);
      sprite.position.copy(labelPositions[i]);
      scene.add(sprite);
    }
  });

  // Grid
  const gridHelper = new THREE.GridHelper(maxRange * 2, 10, gridColor, gridColor);
  gridHelper.material.opacity = 0.2;
  gridHelper.material.transparent = true;
  gridHelper.position.set(maxRange, 0, maxRange);
  scene.add(gridHelper);

  // Points
  for (const p of points) {
    const size = p.size ?? 0.05;
    const pGeo = new THREE.SphereGeometry(size * maxRange * 0.5, 10, 8);
    const pMat = new THREE.MeshPhongMaterial({ color: p.color ?? '#4488ff' });
    const mesh = new THREE.Mesh(pGeo, pMat);
    mesh.position.set(p.x, p.y, p.z);
    scene.add(mesh);
  }

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, maxRange * 20);
  camera.position.set(maxRange * 1.5, maxRange * 1.2, maxRange * 1.5);
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
