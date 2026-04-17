// @ts-nocheck
// ---------------------------------------------------------------------------
// Mesh Viewer widget — Display 3D mesh from vertices/faces JSON
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const meshColor = d.color ?? '#6688cc';
  const flatShading = d.flatShading !== false;
  const autoCenter = d.autoCenter !== false;

  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText = 'font-weight:600;font-size:14px;padding:4px 0;color:#1a1a1a;text-align:center;text-shadow:0 0 3px rgba(255,255,255,0.9);';
    container.appendChild(h);
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;aspect-ratio:4/3;min-height:300px;position:relative;';
  container.appendChild(wrapper);

  const geo = new THREE.BufferGeometry();
  const vertexArray = new Float32Array(d.vertices ?? []);
  geo.setAttribute('position', new THREE.BufferAttribute(vertexArray, 3));
  const faces = d.faces ?? [];
  const indexArray = faces.length > 65535 ? new Uint32Array(faces) : new Uint16Array(faces);
  geo.setIndex(new THREE.BufferAttribute(indexArray, 1));
  geo.computeVertexNormals();
  if (autoCenter) { geo.computeBoundingBox(); geo.center(); }
  geo.computeBoundingSphere();
  const bsRadius = geo.boundingSphere?.radius ?? 1;

  const mat = new THREE.MeshPhongMaterial({ color: meshColor, flatShading, side: THREE.DoubleSide, shininess: 40 });
  const mesh = new THREE.Mesh(geo, mat);

  const scene = new THREE.Scene();
  scene.add(mesh);

  if (d.wireframe) {
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.2 });
    scene.add(new THREE.Mesh(geo, wireMat));
  }

  scene.add(new THREE.AmbientLight(0x606080, 1.2));
  const d1 = new THREE.DirectionalLight(0xffffff, 1.0);
  d1.position.set(bsRadius * 2, bsRadius * 3, bsRadius * 2);
  scene.add(d1);
  const d2 = new THREE.DirectionalLight(0x8888cc, 0.4);
  d2.position.set(-bsRadius * 2, -bsRadius, -bsRadius * 2);
  scene.add(d2);

  const camera = new THREE.PerspectiveCamera(50, 1, bsRadius * 0.01, bsRadius * 20);
  camera.position.set(bsRadius * 1.8, bsRadius * 1.2, bsRadius * 1.8);
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
