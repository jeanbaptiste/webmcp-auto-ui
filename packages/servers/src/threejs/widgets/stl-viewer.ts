// @ts-nocheck
// ---------------------------------------------------------------------------
// STL Viewer widget — View STL-like mesh from triangles array
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const d = data as any;
  const triangles = d.triangles ?? [];
  const color = d.color ?? '#8899bb';
  const wireframe = d.wireframe === true;

  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText = 'font-weight:600;font-size:14px;padding:4px 0;color:#e0e0e0;text-align:center;';
    container.appendChild(h);
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;aspect-ratio:4/3;min-height:300px;position:relative;';
  container.appendChild(wrapper);

  // Build geometry from triangles: each triangle is [[x,y,z],[x,y,z],[x,y,z]]
  // Or from flat vertices array
  let geo: any;
  if (d.vertices) {
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(d.vertices), 3));
    if (d.faces) {
      const faces = d.faces;
      geo.setIndex(new THREE.BufferAttribute(faces.length > 65535 ? new Uint32Array(faces) : new Uint16Array(faces), 1));
    }
  } else {
    const verts: number[] = [];
    for (const tri of triangles) {
      for (const v of tri) {
        verts.push(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0);
      }
    }
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  }
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.center();
  geo.computeBoundingSphere();
  const bsRadius = geo.boundingSphere?.radius ?? 1;

  const mat = new THREE.MeshPhongMaterial({ color, flatShading: true, side: THREE.DoubleSide, shininess: 40 });
  const mesh = new THREE.Mesh(geo, mat);

  const scene = new THREE.Scene();
  scene.add(mesh);

  if (wireframe) {
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.15 });
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
