// @ts-nocheck
// ---------------------------------------------------------------------------
// Bar Chart 3D widget — 3D bar chart with labeled ground plane
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const bw = d.barWidth ?? 0.6;
  const bd = d.barDepth ?? 0.6;
  const palette = d.palette ?? ['#4488ff', '#44cc88', '#ff8844', '#ff4488', '#aa44ff', '#44dddd', '#dddd44', '#ff6666'];

  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText = 'font-weight:600;font-size:14px;padding:4px 0;color:#e0e0e0;text-align:center;';
    container.appendChild(h);
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;aspect-ratio:4/3;min-height:300px;position:relative;';
  container.appendChild(wrapper);

  const bars = d.bars ?? [];
  const uniqueLabels: string[] = [];
  let maxRow = 0, maxValue = 0;
  for (const bar of bars) {
    if (!uniqueLabels.includes(bar.label)) uniqueLabels.push(bar.label);
    maxRow = Math.max(maxRow, bar.row ?? 0);
    maxValue = Math.max(maxValue, Math.abs(bar.value));
  }
  if (maxValue === 0) maxValue = 1;
  const spacing = 1.2;

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0x606070, 1.2));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(uniqueLabels.length, maxValue * 2, (maxRow + 1) * 2);
  scene.add(dirLight);

  // Ground
  const groundGeo = new THREE.PlaneGeometry(uniqueLabels.length * spacing + 1, (maxRow + 1) * spacing + 1);
  const groundMat = new THREE.MeshPhongMaterial({ color: 0x1a1a2e, side: THREE.DoubleSide });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((uniqueLabels.length - 1) * spacing * 0.5, 0, maxRow * spacing * 0.5);
  scene.add(ground);

  // Bars
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const labelIdx = uniqueLabels.indexOf(bar.label);
    const row = bar.row ?? 0;
    const height = Math.max(bar.value, 0.01);
    const color = bar.color ?? palette[i % palette.length];
    const barGeo = new THREE.BoxGeometry(bw, height, bd);
    const barMat = new THREE.MeshPhongMaterial({ color, shininess: 30 });
    const barMesh = new THREE.Mesh(barGeo, barMat);
    barMesh.position.set(labelIdx * spacing, height / 2, row * spacing);
    scene.add(barMesh);
  }

  // Labels
  for (let i = 0; i < uniqueLabels.length; i++) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256; canvas.height = 64;
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(uniqueLabels[i], 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const spMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(spMat);
    sprite.scale.set(1.0, 0.25, 1);
    sprite.position.set(i * spacing, -0.3, -0.5);
    scene.add(sprite);
  }

  const extent = Math.max(uniqueLabels.length * spacing, maxValue, (maxRow + 1) * spacing);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, extent * 20);
  camera.position.set(extent * 0.8, extent * 0.7, extent * 1.0);
  camera.lookAt((uniqueLabels.length - 1) * spacing * 0.5, maxValue * 0.3, maxRow * spacing * 0.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  wrapper.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set((uniqueLabels.length - 1) * spacing * 0.5, maxValue * 0.3, maxRow * spacing * 0.5);

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
