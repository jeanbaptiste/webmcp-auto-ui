// @ts-nocheck
// ---------------------------------------------------------------------------
// Shadow Scene widget — Scene with realistic shadows
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const objects = d.objects ?? [
    { shape: 'sphere', x: 0, y: 1, z: 0, color: '#4488ff', size: 1 },
    { shape: 'box', x: 2, y: 0.5, z: 1, color: '#ff4488', size: 1 },
    { shape: 'cone', x: -2, y: 0.75, z: -1, color: '#44cc88', size: 1 },
  ];
  const groundColor = d.groundColor ?? '#222233';
  const lightColor = d.lightColor ?? '#ffffff';

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
  scene.add(new THREE.AmbientLight(0x404060, 0.6));

  // Directional light with shadows
  const dirLight = new THREE.DirectionalLight(lightColor, 1.5);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -10;
  dirLight.shadow.camera.right = 10;
  dirLight.shadow.camera.top = 10;
  dirLight.shadow.camera.bottom = -10;
  scene.add(dirLight);

  // Ground
  const groundGeo = new THREE.PlaneGeometry(20, 20);
  const groundMat = new THREE.MeshPhongMaterial({ color: groundColor });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  let maxExtent = 3;
  for (const obj of objects) {
    const s = obj.size ?? 1;
    let geo: any;
    switch (obj.shape) {
      case 'box': geo = new THREE.BoxGeometry(s, s, s); break;
      case 'cone': geo = new THREE.ConeGeometry(s * 0.5, s * 1.5, 16); break;
      case 'cylinder': geo = new THREE.CylinderGeometry(s * 0.4, s * 0.4, s * 1.5, 16); break;
      case 'torus': geo = new THREE.TorusGeometry(s * 0.6, s * 0.2, 16, 32); break;
      default: geo = new THREE.SphereGeometry(s * 0.5, 24, 16); break;
    }
    const mat = new THREE.MeshPhongMaterial({ color: obj.color ?? '#4488ff', shininess: 40 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(obj.x ?? 0, obj.y ?? s * 0.5, obj.z ?? 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    maxExtent = Math.max(maxExtent, Math.abs(obj.x ?? 0) + s, Math.abs(obj.z ?? 0) + s);
  }

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, maxExtent * 10);
  camera.position.set(maxExtent * 1.2, maxExtent * 0.8, maxExtent * 1.2);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
