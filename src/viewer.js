// Vista 3D: parallelepipedo L × P × H con i controlli del PROJECT.md
// (reset, X-ray, rotazione per asse, rotazione automatica, schermo intero, sfondo).
// Unità della scena: millimetri. L lungo X, H lungo Y, P lungo Z.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const CARDBOARD = 0xd8c3a5;
const EDGE = 0x3a3128;
const ROTATE_MS = 350;

export function createViewer(container, canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0); // lo sfondo lo decide il CSS del contenitore

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 10000);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(1, 1.4, 1.2);
  scene.add(key);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.2;
  controls.screenSpacePanning = true;

  // Il gruppo contiene il solido: le rotazioni per asse agiscono su di lui,
  // la rotazione automatica e il mouse/touch agiscono sulla camera.
  const group = new THREE.Group();
  scene.add(group);
  const axes = new THREE.AxesHelper(1);
  scene.add(axes);

  const material = new THREE.MeshStandardMaterial({ color: CARDBOARD, roughness: 0.85, metalness: 0 });
  const edgeMaterial = new THREE.LineBasicMaterial({ color: EDGE });
  let mesh = null;
  let edges = null;
  let size = { L: 1, P: 1, H: 1 };
  let xray = false;
  let anim = null;

  function setDimensions({ L, P, H }) {
    size = { L, P, H };
    if (mesh) {
      group.remove(mesh, edges);
      mesh.geometry.dispose();
      edges.geometry.dispose();
    }
    const geometry = new THREE.BoxGeometry(L, H, P);
    mesh = new THREE.Mesh(geometry, material);
    edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMaterial);
    group.add(mesh, edges);
    const r = Math.max(L, P, H);
    axes.scale.setScalar(r * 0.75);
    resetView();
  }

  function fitCamera() {
    const radius = 0.5 * Math.hypot(size.L, size.P, size.H);
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const dist = (radius / Math.sin(Math.min(vFov, hFov) / 2)) * 1.15;
    const dir = new THREE.Vector3(1, 0.7, 1.4).normalize();
    camera.position.copy(dir.multiplyScalar(dist));
    camera.near = dist / 100;
    camera.far = dist * 100;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.minDistance = radius * 1.05;
    controls.maxDistance = dist * 6;
    controls.update();
  }

  function resetView() {
    anim = null;
    group.quaternion.identity();
    fitCamera();
  }

  function setXray(on) {
    xray = on;
    material.transparent = on;
    material.opacity = on ? 0.22 : 1;
    material.depthWrite = !on;
    material.side = on ? THREE.DoubleSide : THREE.FrontSide;
    material.needsUpdate = true;
    edgeMaterial.depthTest = !on; // in X-ray gli spigoli nascosti restano visibili
    edgeMaterial.needsUpdate = true;
    return xray;
  }

  // Rotazione di 90° attorno a un asse del mondo, animata.
  function rotate(axis, dir) {
    const vec = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) }[axis];
    if (!vec) return;
    const from = anim ? anim.to.clone() : group.quaternion.clone();
    const step = new THREE.Quaternion().setFromAxisAngle(vec, (dir * Math.PI) / 2);
    anim = { from, to: step.multiply(from), start: performance.now() };
  }

  function setAutoRotate(on) {
    controls.autoRotate = on;
    return on;
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  new ResizeObserver(resize).observe(container);
  resize();

  renderer.setAnimationLoop((now) => {
    if (anim) {
      const t = Math.min(1, (now - anim.start) / ROTATE_MS);
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      group.quaternion.slerpQuaternions(anim.from, anim.to, e);
      if (t === 1) anim = null;
    }
    controls.update();
    renderer.render(scene, camera);
  });

  return { setDimensions, resetView, setXray, rotate, setAutoRotate, resize, isXray: () => xray };
}
