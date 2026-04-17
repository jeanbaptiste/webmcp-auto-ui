// @ts-nocheck
// ---------------------------------------------------------------------------
// Skybox Panorama widget — Procedural sky/environment with gradient
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const topColor = d.topColor ?? '#000022';
  const bottomColor = d.bottomColor ?? '#001144';
  const horizonColor = d.horizonColor ?? '#ff6600';
  const starCount = d.starCount ?? 500;
  const showGround = d.showGround !== false;

  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText = 'font-weight:600;font-size:14px;padding:4px 0;color:#1a1a1a;text-align:center;text-shadow:0 0 3px rgba(255,255,255,0.9);';
    container.appendChild(h);
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;aspect-ratio:16/9;min-height:300px;position:relative;';
  container.appendChild(wrapper);

  const scene = new THREE.Scene();

  // Sky dome with gradient
  const skyGeo = new THREE.SphereGeometry(50, 32, 32);
  const skyVertices = skyGeo.attributes.position;
  const skyColors = new Float32Array(skyVertices.count * 3);
  const cTop = new THREE.Color(topColor);
  const cHorizon = new THREE.Color(horizonColor);
  const cBottom = new THREE.Color(bottomColor);

  for (let i = 0; i < skyVertices.count; i++) {
    const y = skyVertices.getY(i) / 50; // -1 to 1
    let color: THREE.Color;
    if (y > 0) {
      color = new THREE.Color().lerpColors(cHorizon, cTop, y);
    } else {
      color = new THREE.Color().lerpColors(cHorizon, cBottom, -y);
    }
    skyColors[i * 3] = color.r;
    skyColors[i * 3 + 1] = color.g;
    skyColors[i * 3 + 2] = color.b;
  }
  skyGeo.setAttribute('color', new THREE.BufferAttribute(skyColors, 3));
  const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // Stars
  if (starCount > 0) {
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 45;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 0.2, sizeAttenuation: true });
    scene.add(new THREE.Points(starGeo, starMat));
  }

  // Ground plane
  if (showGround) {
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshPhongMaterial({ color: 0x111111, side: THREE.DoubleSide });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    scene.add(ground);
  }

  scene.add(new THREE.AmbientLight(0x404040, 0.5));

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.set(0, 2, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  wrapper.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enableZoom = false;
  controls.autoRotate = d.autoRotate === true;
  controls.autoRotateSpeed = 0.3;

  function resize() {
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight || w * (9 / 16);
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
