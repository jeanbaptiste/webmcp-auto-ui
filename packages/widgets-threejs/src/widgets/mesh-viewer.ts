// ---------------------------------------------------------------------------
// Mesh Viewer widget — Display 3D mesh from vertices/faces JSON
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

interface MeshViewerData {
  title?: string;
  vertices: number[];
  faces: number[];
  color?: string;
  wireframe?: boolean;
  flatShading?: boolean;
  autoCenter?: boolean;
}

export function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): () => void {
  const d = data as unknown as MeshViewerData;
  const meshColor = d.color ?? '#6688cc';
  const flatShading = d.flatShading !== false;
  const autoCenter = d.autoCenter !== false;

  // --- Title ---
  if (d.title) {
    const h = document.createElement('div');
    h.textContent = d.title;
    h.style.cssText =
      'font-weight:600;font-size:14px;padding:4px 0;color:#e0e0e0;text-align:center;';
    container.appendChild(h);
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;aspect-ratio:4/3;min-height:300px;position:relative;';
  container.appendChild(wrapper);

  // --- Build geometry ---
  const geo = new THREE.BufferGeometry();

  const vertexArray = new Float32Array(d.vertices);
  geo.setAttribute('position', new THREE.BufferAttribute(vertexArray, 3));

  const indexArray = d.faces.length > 65535
    ? new Uint32Array(d.faces)
    : new Uint16Array(d.faces);
  geo.setIndex(new THREE.BufferAttribute(indexArray, 1));

  geo.computeVertexNormals();

  if (autoCenter) {
    geo.computeBoundingBox();
    geo.center();
  }

  // Compute bounding sphere for camera placement
  geo.computeBoundingSphere();
  const bsRadius = geo.boundingSphere?.radius ?? 1;

  // --- Material ---
  const mat = new THREE.MeshPhongMaterial({
    color: meshColor,
    flatShading,
    side: THREE.DoubleSide,
    shininess: 40,
  });
  const mesh = new THREE.Mesh(geo, mat);

  // --- Scene ---
  const scene = new THREE.Scene();
  scene.add(mesh);

  // Wireframe overlay
  if (d.wireframe) {
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    });
    const wireMesh = new THREE.Mesh(geo, wireMat);
    scene.add(wireMesh);
  }

  // Lighting
  scene.add(new THREE.AmbientLight(0x606080, 1.2));
  const d1 = new THREE.DirectionalLight(0xffffff, 1.0);
  d1.position.set(bsRadius * 2, bsRadius * 3, bsRadius * 2);
  scene.add(d1);
  const d2 = new THREE.DirectionalLight(0x8888cc, 0.4);
  d2.position.set(-bsRadius * 2, -bsRadius, -bsRadius * 2);
  scene.add(d2);

  // Camera
  const camera = new THREE.PerspectiveCamera(50, 1, bsRadius * 0.01, bsRadius * 20);
  camera.position.set(bsRadius * 1.8, bsRadius * 1.2, bsRadius * 1.8);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  wrapper.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  // --- Resize ---
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

  // --- Animation ---
  let running = true;
  let animId = 0;
  function animate() {
    if (!running) return;
    animId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // --- Cleanup ---
  return () => {
    running = false;
    cancelAnimationFrame(animId);
    ro.disconnect();
    controls.dispose();
    renderer.dispose();
    geo.dispose();
    mat.dispose();
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        // geo already disposed above — only dispose extra materials
        if (obj.material !== mat) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      }
    });
    renderer.domElement.remove();
  };
}
