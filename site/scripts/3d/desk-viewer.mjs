/**
 * desk-viewer.mjs — 文献笔记首页 3D 书桌查看器
 * ────────────────────────────────────────────────────────────
 * 外置物体（非室内第一人称）：OrbitControls 环绕一张 L 型转角书桌，
 * 3/4 俯视、缓慢自转（拖拽时暂停、闲置后恢复）、禁止平移、限制俯仰与缩放。
 * 模型由 Desk.skp 经 openskp 导出为 desk.glb（毫米单位，这里 ×0.001 归一为米），
 * 桌面已在导出阶段改为天蓝 / 天青的明媚配色；白昼/暗夜随父页 data-theme 联动。
 * 由 esbuild 打包为 public/3d/desk.js（自包含，无运行时外链）。
 * ────────────────────────────────────────────────────────────
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 两套灯光氛围：白昼（明媚浅天蓝）/ 暗夜（深蓝灰、降亮转冷）
const THEMES = {
  cobalt: {
    bg: 0xe9f2fb,
    hemiSky: 0xf2f9ff, hemiGround: 0xe7eef6, hemiIntensity: 1.1,
    keyColor: 0xfff7ec, keyIntensity: 1.2,
    fillColor: 0xbcdcf2, fillIntensity: 0.45,
    exposure: 1.05,
    shadow: 0.14,
  },
  night: {
    bg: 0x0e1420,
    hemiSky: 0x5a6b8c, hemiGround: 0x141a26, hemiIntensity: 1.0,
    keyColor: 0xd2e4fb, keyIntensity: 1.05,
    fillColor: 0x3d5278, fillIntensity: 0.5,
    exposure: 1.1,
    shadow: 0.22,
  },
};
function resolveThemeKey() {
  let key = (location.hash || '#cobalt').replace('#', '');
  if (!THEMES[key]) {
    try {
      const t = parent.document.documentElement.getAttribute('data-theme');
      if (t && THEMES[t]) key = t;
    } catch { /* 跨域忽略 */ }
  }
  return THEMES[key] ? key : 'cobalt';
}
let themeKey = resolveThemeKey();
let T = THEMES[themeKey];

const canvas = document.getElementById('scene');
const loading = document.getElementById('loading');
const errorBox = document.getElementById('error');
const errorText = document.getElementById('error-text');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = T.exposure;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(T.bg);

const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 100);

// ── 灯光组：暖天光 + 柔和主光（投影）+ 冷补光 ──
const hemi = new THREE.HemisphereLight(T.hemiSky, T.hemiGround, T.hemiIntensity);
scene.add(hemi);
const key = new THREE.DirectionalLight(T.keyColor, T.keyIntensity);
key.position.set(3, 5, 4);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.bias = -0.0004;
scene.add(key);
const fill = new THREE.DirectionalLight(T.fillColor, T.fillIntensity);
fill.position.set(-4, 2.5, -3);
scene.add(fill);

// 接触阴影平面（透明，仅承接柔和阴影，让桌子“放得住”）
const shadowMat = new THREE.ShadowMaterial({ opacity: T.shadow });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), shadowMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ── 环绕控制：禁平移、限俯仰不翻底、阻尼惯性、缓慢自转 ──
const controls = new OrbitControls(camera, canvas);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minPolarAngle = THREE.MathUtils.degToRad(12);
controls.maxPolarAngle = THREE.MathUtils.degToRad(84);
controls.autoRotate = true;
controls.autoRotateSpeed = 0.55;
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

function applyTheme(k) {
  if (!THEMES[k]) return;
  themeKey = k;
  T = THEMES[k];
  scene.background = new THREE.Color(T.bg);
  hemi.color.setHex(T.hemiSky);
  hemi.groundColor.setHex(T.hemiGround);
  hemi.intensity = T.hemiIntensity;
  key.color.setHex(T.keyColor);
  key.intensity = T.keyIntensity;
  fill.color.setHex(T.fillColor);
  fill.intensity = T.fillIntensity;
  renderer.toneMappingExposure = T.exposure;
  shadowMat.opacity = T.shadow;
}
window.addEventListener('message', (e) => {
  if (e.data?.type === 'le-theme') applyTheme(e.data.theme);
});

// ── 加载书桌：毫米 → 米，水平居中、底部落在 y=0；按跨度取景 ──
const loader = new GLTFLoader();
loader.load(
  './desk.glb',
  (gltf) => {
    const root = gltf.scene;
    root.updateMatrixWorld(true);
    // 先按毫米整体缩放到米
    const MM = 0.001;
    root.scale.setScalar(MM);
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
        // trimesh 导出的颜色在顶点色 COLOR_0 上，必须开启 vertexColors
        if (obj.geometry?.attributes?.color) m.vertexColors = true;
        // 镀铬/银件（mesh 名带 244_244 / 200_204）保留一点金属感，其余做干净微反光的哑光漆面
        const isMetal = /_244_244|_200_204/.test(obj.name || '');
        m.metalness = isMetal ? 0.55 : 0.08;
        m.roughness = isMetal ? 0.32 : 0.42;
        m.needsUpdate = true;
      }
    });
    scene.add(root);

    const span = Math.max(size.x, size.y, size.z);
    const target = new THREE.Vector3(0, size.y * 0.46, 0);
    controls.target.copy(target);
    const d = span * 1.18;
    camera.position.set(d * 0.92, span * 0.95, d * 1.18);
    camera.near = span * 0.05;
    camera.far = span * 40;
    controls.minDistance = span * 0.7;
    controls.maxDistance = span * 2.6;
    camera.updateProjectionMatrix();
    controls.update();
    // 阴影范围覆盖桌面
    key.shadow.camera.left = -span; key.shadow.camera.right = span;
    key.shadow.camera.top = span; key.shadow.camera.bottom = -span;
    key.shadow.camera.updateProjectionMatrix();

    loading.hidden = true;
  },
  (xhr) => {
    if (xhr.total) {
      const pct = Math.round((xhr.loaded / xhr.total) * 100);
      loading.textContent = `正在载入书桌 ${pct}%`;
    }
  },
  (err) => {
    console.error(err);
    loading.hidden = true;
    errorBox.hidden = false;
    errorText.textContent = '书桌模型加载失败，请检查网络后刷新页面。';
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
