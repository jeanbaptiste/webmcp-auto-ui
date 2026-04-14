// @ts-nocheck
// ---------------------------------------------------------------------------
// Voxel Grid widget — Minecraft-style voxel display
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const voxels = d.voxels ?? [];
  const voxelSize = d.voxelSize ?? 1;
  const defaultColor = d.color ?? '#44aa88';

  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText = 'font-weight:600;font-size:14px;padding:4px 0;color:#e0e0e0;text-align:center;';
    container.appendChild(h);
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;aspect-ratio:4/3;min-height:300px;position:relative;';
  container.appendChild(wrapper);

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0x606070, 1.0));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(10, 15, 10);
  scene.add(dirLight);

  const boxGeo = new THREE.BoxGeometry(voxelSize * 0.95, voxelSize * 0.95, voxelSize * 0.95);
  let maxCoord = 1;

  for (const v of voxels) {
    const color = v.color ?? defaultColor;
    const mat = new THREE.MeshPhongMaterial({ color, shininess: 20 });
    const mesh = new THREE.Mesh(boxGeo, mat);
    mesh.position.set(v.x * voxelSize, v.y * voxelSize, v.z * voxelSize);
    scene.add(mesh);
    maxCoord = Math.max(maxCoord, Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
  }

  const extent = maxCoord * voxelSize;
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, extent * 20);
  camera.position.set(extent * 1.8, extent * 1.5, extent * 1.8);
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
    boxGeo.dispose();
    scene.traverse((obj: any) => {
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
        else obj.material.dispose();
      }
    });
    renderer.domElement.remove();
  };
}
