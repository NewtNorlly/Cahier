/**
 * desk-viewer.mjs — 文献笔记首页 3D 场景查看器
 * ────────────────────────────────────────────────────────────
 * 外置物体环绕查看：OrbitControls，缓慢自转（拖拽时暂停、闲置后恢复），
 * 禁止平移、限制俯仰与缩放。模型异步加载，就绪后淡入，无加载遮罩与提示文字。
 * 中性灯光与背景，不随站点明暗主题切换。
 * 由 esbuild 打包为 public/3d/desk.js（自包含，无运行时外链）。
 * ────────────────────────────────────────────────────────────
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('scene');
const errorBox = document.getElementById('error');
const errorText = document.getElementById('error-text');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
// 透明背景，让 HTML 层的柔和渐变底透出
scene.background = null;

const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 200);

// ── 中性灯光：柔和天光 + 主光（投影）+ 补光 ──
const hemi = new THREE.HemisphereLight(0xf5f7fa, 0xe2e6ea, 1.15);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff8f0, 1.25);
key.position.set(4, 6, 5);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.bias = -0.0004;
scene.add(key);
const fill = new THREE.DirectionalLight(0xc8d8e8, 0.5);
fill.position.set(-5, 3, -4);
scene.add(fill);

// 接触阴影平面（透明，仅承接柔和阴影）
const shadowMat = new THREE.ShadowMaterial({ opacity: 0.16 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), shadowMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ── 环绕控制：禁平移、限俯仰不翻底、阻尼惯性、缓慢自转 ──
const controls = new OrbitControls(camera, canvas);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minPolarAngle = THREE.MathUtils.degToRad(10);
controls.maxPolarAngle = THREE.MathUtils.degToRad(85);
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
let resumeTimer = null;
controls.addEventListener('start', () => {
  controls.autoRotate = false;
  if (resumeTimer) clearTimeout(resumeTimer);
});
controls.addEventListener('end', () => {
  if (resumeTimer) clearTimeout(resumeTimer);
  resumeTimer = setTimeout(() => { controls.autoRotate = true; }, 2600);
});
canvas.style.touchAction = 'none';

// ── 异步加载模型：就绪后淡入，无加载进度提示；超时保护避免极端网络下一直空白 ──
const loader = new GLTFLoader();
let modelLoaded = false;

// 超时保护：15秒未加载完成则强制显示画布（至少可见空场景与背景）
const loadTimeout = setTimeout(() => {
  if (!modelLoaded) {
    console.warn('3D model loading timeout, showing canvas anyway');
    canvas.classList.add('is-ready');
  }
}, 15000);

loader.load(
  './still_life.glb',
  (gltf) => {
    modelLoaded = true;
    clearTimeout(loadTimeout);
    const root = gltf.scene;
    root.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // 水平居中、底部归零
    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y -= box.min.y;
    root.updateMatrixWorld(true);

    root.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (!m) continue;
        // 顶点色支持
        if (obj.geometry?.attributes?.color) m.vertexColors = true;
        m.needsUpdate = true;
      }
    });
    scene.add(root);

    // 按模型整体跨度自动定相机距离/裁剪面/阴影范围
    const span = Math.max(size.x, size.y, size.z);
    const target = new THREE.Vector3(0, size.y * 0.45, 0);
    controls.target.copy(target);
    // 初始视角方向向量（从目标指向相机），保持不变
    const dirX = 1.25 * 0.85;  // = 1.0625
    const dirY = 0.8 - 0.45;   // = 0.35
    const dirZ = 1.25 * 1.15;  // = 1.4375
    // 初始距离缩到原来的 1/3，模型视觉上约 3 倍大；用户仍可滚轮自由缩放
    const INIT_SCALE = 1 / 3;
    camera.position.set(
      target.x + span * dirX * INIT_SCALE,
      target.y + span * dirY * INIT_SCALE,
      target.z + span * dirZ * INIT_SCALE,
    );
    camera.near = Math.max(span * 0.01, 0.005);
    camera.far = span * 60;
    controls.minDistance = span * 0.12;  // 允许用户继续放大到很近
    controls.maxDistance = span * 3.0;
    camera.updateProjectionMatrix();
    controls.update();

    key.shadow.camera.left = -span * 1.5;
    key.shadow.camera.right = span * 1.5;
    key.shadow.camera.top = span * 1.5;
    key.shadow.camera.bottom = -span * 1.5;
    key.shadow.camera.updateProjectionMatrix();

    // 模型就绪：淡入画布
    requestAnimationFrame(() => {
      canvas.classList.add('is-ready');
    });
  },
  undefined,
  (err) => {
    modelLoaded = true;
    clearTimeout(loadTimeout);
    console.error(err);
    canvas.classList.add('is-ready'); // 至少显示背景
    errorBox.hidden = false;
    errorText.textContent = '3D 模型加载失败，请检查网络后刷新页面。';
  },
);

// ── 尺寸自适应 ──
function resize() {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
new ResizeObserver(resize).observe(canvas);
resize();

// ── 渲染循环；iframe 不可见时暂停省电 ──
let paused = false;
document.addEventListener('visibilitychange', () => { paused = document.hidden; });
function tick() {
  requestAnimationFrame(tick);
  if (paused) return;
  controls.update();
  renderer.render(scene, camera);
}
tick();
