/**
 * bedroom-viewer.mjs — 文献笔记初始页 3D 卧室查看器
 * ────────────────────────────────────────────────────────────
 * 视角固定在卧室内部中心点；鼠标拖拽 / 触屏滑动即绕该点做球形环顾
 * （只转视角、不移动位置、不缩放平移），灯光与背景统一为站点钴蓝色调。
 * 由 esbuild 打包为 public/3d/bedroom.js（自包含，无运行时外链）。
 * ────────────────────────────────────────────────────────────
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 与站点色卡对齐的主题：[主色, 天光浅色, 深色]，默认钴蓝
const PALETTES = {
  cobalt: [0x2563eb, 0x93c5fd, 0x1e3a5f],
  neko: [0x35bfab, 0xeddd62, 0x166056],
  graphite: [0x4f46e5, 0x818cf8, 0x312e81],
  citrus: [0xea580c, 0xfdba74, 0x9a3412],
  teal: [0x0d9488, 0x5eead4, 0x134e4a],
  damson: [0xbe185d, 0xf472b6, 0x500724],
  lavender: [0x7c3aed, 0xc4b5fd, 0x3b0764],
  terracotta: [0xb84a2d, 0xf3d1be, 0x7c2d12],
};
function shade(hex, factor) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(factor);
  return c.getHex();
}
function resolveThemeKey() {
  let key = (location.hash || '#cobalt').replace('#', '');
  if (!PALETTES[key]) {
    try {
      const parentTheme = parent.document.documentElement.getAttribute('data-theme');
      if (parentTheme && PALETTES[parentTheme]) key = parentTheme;
    } catch { /* 跨域时忽略 */ }
  }
  return PALETTES[key] ? key : 'cobalt';
}
let themeKey = resolveThemeKey();
let theme = PALETTES[themeKey];

const canvas = document.getElementById('scene');
const loading = document.getElementById('loading');
const errorBox = document.getElementById('error');
const errorText = document.getElementById('error-text');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color(shade(theme[2], 0.55));
scene.fog = new THREE.Fog(shade(theme[2], 0.55), 18, 60);

const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 200);
camera.rotation.order = 'YXZ'; // 第一人称球形环顾：先偏航(yaw)再俯仰(pitch)

// ── 主题灯光组：冷色天光 + 深色地面反弹 + 柔和主光，保留模型原有材质质感 ──
const hemi = new THREE.HemisphereLight(theme[1], theme[2], 1.05);
scene.add(hemi);
const ambient = new THREE.AmbientLight(0x6f8fc7, 0.48);
scene.add(ambient);
const key = new THREE.DirectionalLight(0xdce8ff, 1.15);
key.position.set(4, 9, 6);
scene.add(key);
const fill = new THREE.DirectionalLight(theme[0], 0.35);
fill.position.set(-6, 3, -4);
scene.add(fill);

// 父页面切换主题时同步灯光与背景色调
function applyTheme(key) {
  if (!PALETTES[key]) return;
  themeKey = key;
  theme = PALETTES[key];
  const bg = shade(theme[2], 0.55);
  scene.background = new THREE.Color(bg);
  scene.fog.color.setHex(bg);
  hemi.color.setHex(theme[1]);
  hemi.groundColor.setHex(theme[2]);
  fill.color.setHex(theme[0]);
}
window.addEventListener('message', (e) => {
  if (e.data?.type === 'le-theme') applyTheme(e.data.theme);
});

// ── 第一人称球形环顾控制（鼠标拖拽 / 单指滑动 / 方向键，带惯性）──
const look = {
  yaw: 0,
  pitch: 0,
  vYaw: 0,
  vPitch: 0,
  dragging: false,
  lastX: 0,
  lastY: 0,
};
const PITCH_LIMIT = THREE.MathUtils.degToRad(84);
const SENS = 0.0042;

function applyLook() {
  look.yaw += look.vYaw;
  look.pitch += look.vPitch;
  look.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, look.pitch));
  camera.rotation.set(look.pitch, look.yaw, 0);
  if (!look.dragging) {
    look.vYaw *= 0.93;
    look.vPitch *= 0.93;
    if (Math.abs(look.vYaw) < 1e-5) look.vYaw = 0;
    if (Math.abs(look.vPitch) < 1e-5) look.vPitch = 0;
  }
}

canvas.style.touchAction = 'none'; // 触屏滑动不带动页面滚动
canvas.addEventListener('pointerdown', (e) => {
  look.dragging = true;
  look.lastX = e.clientX;
  look.lastY = e.clientY;
  look.vYaw = 0;
  look.vPitch = 0;
  canvas.setPointerCapture?.(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!look.dragging) return;
  const dx = e.clientX - look.lastX;
  const dy = e.clientY - look.lastY;
  look.lastX = e.clientX;
  look.lastY = e.clientY;
  look.yaw -= dx * SENS;
  look.pitch -= dy * SENS;
  look.vYaw = -dx * SENS;
  look.vPitch = -dy * SENS;
});
const endDrag = (e) => {
  look.dragging = false;
  if (e?.pointerId !== undefined) canvas.releasePointerCapture?.(e.pointerId);
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('pointerleave', endDrag);
// 固定在房间中心：禁用滚轮缩放与右键平移
canvas.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
  const step = 0.045;
  if (e.key === 'ArrowLeft') look.vYaw = step;
  else if (e.key === 'ArrowRight') look.vYaw = -step;
  else if (e.key === 'ArrowUp') look.vPitch = step;
  else if (e.key === 'ArrowDown') look.vPitch = -step;
});

// ── 加载卧室模型，相机落在包围盒中心 ──
const loader = new GLTFLoader();
let mixer = null;

// 在层级中找最大的近地面水平片（地板），用它的包围盒确定“室内” footprint；
// 比直接用整体包围盒更稳：整体盒可能被外墙/挑檐等延伸网格拉偏
function findInteriorFootprint(root) {
  let best = null;
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry) return;
    obj.geometry.computeBoundingBox();
    if (!obj.geometry.boundingBox) return;
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const flat = size.y < 0.12;                       // 近水平薄片
    const nearFloor = box.min.y < 0.25;              // 贴近地面
    const area = size.x * size.z;
    if (flat && nearFloor && area > 1 && (!best || area > best.area)) {
      best = { box, area };
    }
  });
  return best?.box ?? new THREE.Box3().setFromObject(root);
}

function placeAtInteriorCenter(root) {
  root.updateMatrixWorld(true);
  const whole = new THREE.Box3().setFromObject(root);
  const foot = findInteriorFootprint(root);
  const footCenter = foot.getCenter(new THREE.Vector3());
  const footSize = foot.getSize(new THREE.Vector3());
  const wholeSize = whole.getSize(new THREE.Vector3());
  // 水平位置取室内地面中心；纵向取自然站立视高（约 1.55m，小房间按比例收）
  const eyeY = whole.min.y + Math.min(1.55, wholeSize.y * 0.5);
  camera.position.set(footCenter.x, eyeY, footCenter.z);
  // 依据房间尺度校准雾与裁剪面，避免大尺度模型被雾吞掉
  const span = Math.max(wholeSize.x, wholeSize.y, wholeSize.z);
  scene.fog.near = span * 1.2;
  scene.fog.far = span * 6;
  camera.far = Math.max(200, span * 20);
  camera.updateProjectionMatrix();
  applyLook();
}

loader.load(
  './bedroom.glb',
  (gltf) => {
    const root = gltf.scene;
    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.frustumCulled = true;
        // 统一校正色彩空间，避免贴图发灰
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (!m) continue;
          if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
          m.needsUpdate = true;
        }
      }
    });
    scene.add(root);
    if (gltf.animations?.length) {
      mixer = new THREE.AnimationMixer(root);
      gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
    }
    placeAtInteriorCenter(root);
    loading.hidden = true;
  },
  (xhr) => {
    if (xhr.total) {
      const pct = Math.round((xhr.loaded / xhr.total) * 100);
      loading.textContent = `正在载入卧室场景 ${pct}%`;
    }
  },
  (err) => {
    console.error(err);
    loading.hidden = true;
    errorBox.hidden = false;
    errorText.textContent = '卧室模型加载失败，请检查网络后刷新页面。';
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

// ── 渲染循环；iframe 不可见时暂停以省电 ──
const clock = new THREE.Clock();
let paused = false;
document.addEventListener('visibilitychange', () => { paused = document.hidden; });

function tick() {
  requestAnimationFrame(tick);
  if (paused) return;
  const dt = clock.getDelta();
  mixer?.update(dt);
  applyLook();
  renderer.render(scene, camera);
}
tick();
