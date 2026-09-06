/* ═══════════════════════════════════════════════════════════════
   恐龙快跑 — 四种玩法横屏小游戏
   休闲(跑酷) / 上手(迷宫) / 入坑(平台跳跃) / 专家(传送迷岛)
   ═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';

/* ─── Constants ─── */
const W = 1600, H = 900;
const DINO_URL = 'images/小恐龙-removebg-preview.png?v=20260828l';
const BGM_URL = 'bgm/white-cat.mp3';
const GROUND_Y = 820;
const GRAVITY = 0.5;

// Maze dimensions (landscape)
const MAZE_COLS = 32, MAZE_ROWS = 18, CELL = 46;
const MAZE_W = MAZE_COLS * CELL, MAZE_H = MAZE_ROWS * CELL;
const MAZE_OX = (W - MAZE_W) / 2, MAZE_OY = (H - MAZE_H) / 2;

// roundRect polyfill
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    this.moveTo(x + r[0], y);
    this.arcTo(x + w, y, x + w, y + h, r[1]);
    this.arcTo(x + w, y + h, x, y + h, r[2]);
    this.arcTo(x, y + h, x, y, r[3]);
    this.arcTo(x, y, x + w, y, r[0]);
    this.closePath();
    return this;
  };
}

/* ─── DOM ─── */
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const confettiC = $('confetti-canvas'), cctx = confettiC.getContext('2d');
const loadingEl = $('loading'), progressEl = $('loading-progress'), loadingText = $('loading-text');
const startScreen = $('startscreen');
const casualPopup = $('casual-popup');
const levelPopup = $('level-popup');
const pausePopup = $('pause-popup');
const gameOverScreen = $('gameover');
const scoreEl = $('score'), scoreCurrent = $('score-current'), scoreTarget = $('score-target');
const shieldBadge = $('shield-badge'), shieldCountEl = $('shield-count');
const levelIndicator = $('level-indicator'), levelNameEl = $('level-name');
const topCtrls = $('top-controls');
const soundBtn = $('sound-toggle'), flightBtn = $('btn-flight'), pauseBtn = $('btn-pause');
const mobileCtrls = $('mobile-controls');
const resultIcon = $('result-icon'), resultTitle = $('result-title'), resultMsg = $('result-msg');
const finalScoreEl = $('final-score'), finalTargetEl = $('final-target'), scoreBox = $('result-score-box');
const targetInput = $('target-score-input');

/* ─── I18N ─── */
const I18N = {
  zh: {
    loading: '加载中…', rotate_hint: '请横屏使用', game_title: '恐龙快跑',
    game_subtitle: '四种玩法 · 横屏冒险',
    mode_casual: '休闲', mode_casual_desc: '横版跑酷',
    mode_novice: '上手', mode_novice_desc: '空中迷宫',
    mode_hooked: '入坑', mode_hooked_desc: '平台跳跃',
    mode_expert: '专家', mode_expert_desc: '传送迷岛',
    hint_keyboard: '⌨️ 方向键/WASD', hint_space: '空格跳跃', hint_touch: '📱 触屏摇杆',
    target_score: '目标分数', target_hint: '设置你的挑战目标',
    start_game: '开始游戏', back: '返回', back_home: '返回首页', play_again: '再来一次',
    paused: '已暂停', resume: '继续', quit_to_menu: '返回首页',
    victory: '通关！', game_over: '游戏结束', final_score: '本次得分',
    score_label: '分数', flight_label: ' · 飞翔中', score_pop: '+1',
    shield_pop: '护盾!', shield_pop_multi: '护盾 x{n}!',
    victory_msg: '太棒了！达成 {target} 分目标，{diff}通关！',
    defeat_msg_near: '还差 {diff} 分，再接再厉！', defeat_msg: '别灰心，再来一局！',
    select_level: '选择关卡', maze_desc: '穿越迷宫，躲避刺猬和蝙蝠，到达右下角热气球',
    platformer_desc: '跳跃闯关，穿越管道，登上终点热气球',
    portal_desc: '利用传送门和跳床，到达右上角热气球',
    level_n: '第 {n} 关', casual_desc: '横版跑酷：躲避刺猬和蝙蝠，吃圣女果获得护盾',
    flight: '飞行', mode_casual_settings: '休闲模式',
    victory_maze: '成功走出迷宫！', victory_plat: '登上热气球，飞走啦！', victory_portal: '传送成功，完美通关！',
  },
  en: {
    loading: 'Loading…', rotate_hint: 'Please rotate', game_title: 'Dino Dash',
    game_subtitle: '4 Modes · Landscape Adventure',
    mode_casual: 'Casual', mode_casual_desc: 'Runner',
    mode_novice: 'Novice', mode_novice_desc: 'Maze',
    mode_hooked: 'Hooked', mode_hooked_desc: 'Platformer',
    mode_expert: 'Expert', mode_expert_desc: 'Portals',
    hint_keyboard: '⌨️ Arrows / WASD', hint_space: 'Space to jump', hint_touch: '📱 Touch joystick',
    target_score: 'Target Score', target_hint: 'Set your goal',
    start_game: 'Start', back: 'Back', back_home: 'Home', play_again: 'Play Again',
    paused: 'Paused', resume: 'Resume', quit_to_menu: 'Quit to Menu',
    victory: 'Victory!', game_over: 'Game Over', final_score: 'Score',
    score_label: 'Score', flight_label: ' · Flying', score_pop: '+1',
    shield_pop: 'Shield!', shield_pop_multi: 'Shield x{n}!',
    victory_msg: 'Great! {target} points in {diff}!',
    defeat_msg_near: '{diff} points to go!', defeat_msg: 'Try again!',
    select_level: 'Select Level', maze_desc: 'Navigate the maze, avoid hedgehogs & bats, reach the balloon',
    platformer_desc: 'Jump through pipes, reach the hot air balloon',
    portal_desc: 'Use portals & trampolines to reach the balloon',
    level_n: 'Level {n}', casual_desc: 'Runner: dodge hedgehogs & bats, collect tomatoes for shields',
    flight: 'Fly', mode_casual_settings: 'Casual Mode',
    victory_maze: 'You escaped the maze!', victory_plat: 'Balloon escape!', victory_portal: 'Portal master!',
  },
  fr: {
    loading: 'Chargement…', rotate_hint: 'Mode paysage', game_title: 'Dino Dash',
    game_subtitle: '4 Modes · Aventure',
    mode_casual: 'Décontracté', mode_casual_desc: 'Course',
    mode_novice: 'Novice', mode_novice_desc: 'Labyrinthe',
    mode_hooked: 'Captivant', mode_hooked_desc: 'Plateformes',
    mode_expert: 'Expert', mode_expert_desc: 'Portails',
    hint_keyboard: '⌨️ Flèches / WASD', hint_space: 'Espace pour sauter', hint_touch: '📱 Joystick tactile',
    target_score: 'Objectif', target_hint: 'Définissez votre but',
    start_game: 'Commencer', back: 'Retour', back_home: 'Accueil', play_again: 'Rejouer',
    paused: 'Pause', resume: 'Reprendre', quit_to_menu: 'Menu',
    victory: 'Victoire !', game_over: 'Fin du jeu', final_score: 'Score',
    score_label: 'Score', flight_label: ' · En vol', score_pop: '+1',
    shield_pop: 'Bouclier !', shield_pop_multi: 'Bouclier x{n} !',
    victory_msg: 'Bravo ! {target} points en {diff} !',
    defeat_msg_near: 'Plus que {diff} points !', defeat_msg: 'Réessayez !',
    select_level: 'Niveau', maze_desc: 'Traversez le labyrinthe, évitez hérissons et chauves-souris',
    platformer_desc: 'Sautez à travers les tuyaux, atteignez la montgolfière',
    portal_desc: 'Utilisez portails et trampolines',
    level_n: 'Niveau {n}', casual_desc: 'Course : évitez les obstacles, collectez des tomates',
    flight: 'Vol', mode_casual_settings: 'Mode Décontracté',
    victory_maze: 'Tu as réussi !', victory_plat: 'Montgolfière !', victory_portal: 'Maître des portails !',
  },
  de: {
    loading: 'Laden…', rotate_hint: 'Querformat', game_title: 'Dino Dash',
    game_subtitle: '4 Modi · Abenteuer',
    mode_casual: 'Gelegenheit', mode_casual_desc: 'Runner',
    mode_novice: 'Anfänger', mode_novice_desc: 'Labyrinth',
    mode_hooked: 'Fesselnd', mode_hooked_desc: 'Plattformer',
    mode_expert: 'Experte', mode_expert_desc: 'Portale',
    hint_keyboard: '⌨️ Pfeile / WASD', hint_space: 'Leertaste zum Springen', hint_touch: '📱 Touch-Joystick',
    target_score: 'Zielpunktzahl', target_hint: 'Ziel setzen',
    start_game: 'Start', back: 'Zurück', back_home: 'Startseite', play_again: 'Nochmal',
    paused: 'Pausiert', resume: 'Weiter', quit_to_menu: 'Menü',
    victory: 'Sieg!', game_over: 'Spiel vorbei', final_score: 'Punktzahl',
    score_label: 'Punkte', flight_label: ' · Fliegt', score_pop: '+1',
    shield_pop: 'Schild!', shield_pop_multi: 'Schild x{n}!',
    victory_msg: 'Geschafft! {target} Punkte im {diff}!',
    defeat_msg_near: 'Noch {diff} Punkte!', defeat_msg: 'Versuch es nochmal!',
    select_level: 'Level wählen', maze_desc: 'Navigiere durch das Labyrinth, erreiche den Ballon',
    platformer_desc: 'Springe durch Röhren zum Heißluftballon',
    portal_desc: 'Nutze Portale und Trampoline',
    level_n: 'Level {n}', casual_desc: 'Runner: Hindernissen ausweichen, Tomaten sammeln',
    flight: 'Fliegen', mode_casual_settings: 'Gelegenheitsmodus',
    victory_maze: 'Du hast es geschafft!', victory_plat: 'Heißluftballon!', victory_portal: 'Portal-Meister!',
  }
};
let lang = 'zh';
function t(key, params) {
  let s = (I18N[lang] && I18N[lang][key]) || I18N.zh[key] || key;
  if (params) for (const k in params) s = s.replace('{' + k + '}', params[k]);
  return s;
}
function applyLanguage(l) {
  lang = l;
  document.documentElement.lang = l === 'zh' ? 'zh-CN' : l;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (I18N[l][k]) el.textContent = I18N[l][k];
  });
  document.querySelectorAll('.lang-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === l));
  document.documentElement.style.setProperty('--flight-label', '"' + t('flight_label') + '"');
  try { localStorage.setItem('dino_lang', l); } catch (e) {}
}

/* ─── State ─── */
let gameState = 'loading'; // loading, start, playing, paused, over
let mode = null, levelIdx = 0, handler = null;
let score = 0, targetScore = 10, shields = 0;
let careMode = false;
let bgm = null, bgmPlaying = false, bgmEnabled = true;
let dinoImg = new Image();
let hedgehogImg = new Image();
// 星露谷风格新素材
let batImg = new Image();
let tomatoImg = new Image();
let balloonImg = new Image();
let platformImg = new Image();
let portalImg = new Image();
let islandImg = new Image();
let piranhaImg = new Image();
let koopaImg = new Image();
let hedgehogNewImg = new Image();
let bgStartImg = new Image();
let bgCasualImg = new Image();
let popups = [];
let confettiParts = [];
let particles = [];
let screenShake = 0;
let animFrame = null;
let lastTime = 0;

/* ─── Canvas resize ─── */
function resize() {
  canvas.width = W; canvas.height = H;
  confettiC.width = W; confettiC.height = H;
  const vw = window.innerWidth, vh = window.innerHeight;
  const sc = Math.min(vw / W, vh / H);
  const cw = Math.round(W * sc), ch = Math.round(H * sc);
  [canvas, confettiC].forEach(c => {
    c.style.width = cw + 'px'; c.style.height = ch + 'px';
    c.style.left = (vw - cw) / 2 + 'px'; c.style.top = (vh - ch) / 2 + 'px';
  });
}
window.addEventListener('resize', resize);

/* ─── Audio ─── */
function initBGM() {
  bgm = new Audio(BGM_URL);
  bgm.loop = true; bgm.volume = 0.4;
}
function playBGM() {
  if (!bgm || !bgmEnabled) return;
  bgm.play().then(() => { bgmPlaying = true; updateSoundIcon(); }).catch(() => {});
}
function stopBGM() {
  if (!bgm) return;
  bgm.pause(); bgmPlaying = false; updateSoundIcon();
}
function toggleBGM() {
  bgmEnabled = !bgmEnabled;
  if (bgmEnabled) playBGM(); else stopBGM();
  try { localStorage.setItem('dino_bgm', bgmEnabled ? '1' : '0'); } catch (e) {}
}
function updateSoundIcon() {
  if (bgmEnabled) {
    soundBtn.classList.remove('top-btn--muted');
  } else {
    soundBtn.classList.add('top-btn--muted');
  }
}

/* ─── Input ─── */
const keys = {};
let moveX = 0, moveY = 0, jumpQueued = false;
let joyId = null, joyOX = 0, joyOY = 0, joyDX = 0, joyDY = 0;
let joyEl = null, nubEl = null;
let joyMode = 'horizontal'; // 'horizontal' or 'full'

function onKeyDown(e) {
  keys[e.code] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveX = -1;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') moveX = 1;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') { moveY = -1; if (handler && handler.onJump) handler.onJump(); }
  if (e.code === 'ArrowDown' || e.code === 'KeyS') moveY = 1;
  if (e.code === 'Space' && handler && handler.onJump) { e.preventDefault(); handler.onJump(); }
  if (e.code === 'KeyF' && gameState === 'playing' && mode === 'casual' && handler && handler.activateFlight) { handler.activateFlight(); }
  if (e.code === 'Escape' && gameState === 'playing') pauseGame();
  else if (e.code === 'Escape' && gameState === 'paused') resumeGame();
}
function onKeyUp(e) {
  keys[e.code] = false;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveX = (keys['ArrowRight'] || keys['KeyD']) ? 1 : 0;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') moveX = (keys['ArrowLeft'] || keys['KeyA']) ? -1 : 0;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') moveY = (keys['ArrowDown'] || keys['KeyS']) ? 1 : 0;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') moveY = (keys['ArrowUp'] || keys['KeyW']) ? -1 : 0;
  if ((e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') && handler && handler.onJumpRelease) handler.onJumpRelease();
}
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);

function isLeftHalf(cx) { return cx < window.innerWidth / 2; }
function createJoy(x, y) {
  joyEl = document.createElement('div'); joyEl.className = 'joystick-base';
  joyEl.style.left = x + 'px'; joyEl.style.top = y + 'px';
  nubEl = document.createElement('div'); nubEl.className = 'joystick-nub';
  joyEl.appendChild(nubEl); document.body.appendChild(joyEl);
}
function destroyJoy() { if (joyEl) { joyEl.remove(); joyEl = null; nubEl = null; } }
function updateJoy(dx, dy) {
  const max = 40;
  const len = Math.sqrt(dx * dx + dy * dy);
  const cl = len > max ? max / len : 1;
  const nx = dx * cl, ny = dy * cl;
  if (nubEl) nubEl.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
  const dead = 12;
  if (joyMode === 'full') {
    moveX = Math.abs(nx) > dead ? (nx > 0 ? 1 : -1) : (keys['ArrowLeft']||keys['KeyA'] ? -1 : keys['ArrowRight']||keys['KeyD'] ? 1 : 0);
    moveY = Math.abs(ny) > dead ? (ny > 0 ? 1 : -1) : 0;
  } else {
    moveX = Math.abs(nx) > dead ? (nx > 0 ? 1 : -1) : (keys['ArrowLeft']||keys['KeyA'] ? -1 : keys['ArrowRight']||keys['KeyD'] ? 1 : 0);
  }
  joyDX = nx; joyDY = ny;
}

mobileCtrls.addEventListener('pointerdown', e => {
  if (gameState !== 'playing') return;
  e.preventDefault();
  if (isLeftHalf(e.clientX)) {
    if (joyId !== null) return;
    joyId = e.pointerId; joyOX = e.clientX; joyOY = e.clientY;
    createJoy(e.clientX, e.clientY); updateJoy(0, 0);
    mobileCtrls.setPointerCapture(e.pointerId);
  } else {
    if (handler && handler.onJump) handler.onJump();
  }
});
mobileCtrls.addEventListener('pointermove', e => {
  if (e.pointerId !== joyId) return;
  e.preventDefault();
  updateJoy(e.clientX - joyOX, e.clientY - joyOY);
});
function endJoy(e) {
  if (e.pointerId !== joyId) return;
  joyId = null; moveX = 0; moveY = 0; joyDX = 0; joyDY = 0;
  destroyJoy();
}
mobileCtrls.addEventListener('pointerup', endJoy);
mobileCtrls.addEventListener('pointercancel', endJoy);

/* ─── Drawing primitives ─── */
// 全局动画时钟
let _dinoAnimTime = 0;
function _dinoTick() { _dinoAnimTime = performance.now() / 1000; }

/**
 * 绘制橙色恐龙（骑滑板车）
 * @param {number} x,y,w,h - 位置和尺寸
 * @param {string} facing - 'left' | 'right'
 * @param {number} squash - 弹性值（由弹簧物理驱动，正=压缩，负=拉伸）
 * @param {object} opts - { moving: bool, onGround: bool, speed: number }
 */
function drawDino(x, y, w, h, facing, squash, opts) {
  if (!dinoImg.complete) return;
  _dinoTick();
  const t = _dinoAnimTime;
  const sx = facing === 'left' ? -1 : 1;
  const o = opts || {};
  const moving = o.moving !== false;
  const onGround = o.onGround !== false;
  const speed = o.speed || 1;
  const vy = o.vy || 0;

  // ── 弹性：由弹簧物理驱动，范围自然 ──
  const sq = Math.max(-0.12, Math.min(0.10, squash || 0));

  // ── 跳跃阶段视觉（基于 vy 的缓入缓出）──
  // 上升(vy<0): 微前倾；顶点(|vy|<3): 舒展漂浮；下落(vy>5): 微后倾
  let jumpTilt = 0;
  if (!onGround) {
    if (vy < -3) jumpTilt = 0.035 * Math.min(1, (-vy - 3) / 8);      // 上升前倾
    else if (vy > 4) jumpTilt = -0.025 * Math.min(1, (vy - 4) / 8);  // 下落后倾
    // 顶点附近 |vy|<3: jumpTilt≈0，身体最舒展
  }
  // 顶点轻微"漂浮"感：y方向微小浮动
  const apexFloat = (!onGround && Math.abs(vy) < 4) ? Math.sin(t * 3) * h * 0.006 : 0;

  // ── 动画参数 ──
  // 跑动频率随速度变化，待机时缓慢呼吸
  const runFreq = moving ? (6 + speed * 2) : 2.2;
  const runAmp = moving ? (onGround ? h * 0.022 : 0) : h * 0.008;
  const bob = Math.sin(t * runFreq * Math.PI * 2) * runAmp;

  // 身体倾斜：跑动时微微前倾，空中时随跳跃阶段变化
  const baseTilt = moving ? 0.025 : 0;
  const tilt = baseTilt + jumpTilt + Math.sin(t * runFreq * Math.PI * 2) * 0.006;

  // 高频微颠簸（滑板车轮子在路面）
  const vibrate = (moving && onGround) ? Math.sin(t * 28) * h * 0.004 : 0;

  const drawW = w * (1 + sq * 0.12);
  const drawH = h * (1 - sq * 0.12);
  const dx = x + (w - drawW) / 2;
  const dy = y + (h - drawH) + bob + vibrate + apexFloat;

  ctx.save();
  ctx.translate(dx + drawW / 2, dy + drawH / 2);
  ctx.rotate(tilt * sx);
  ctx.scale(sx, 1);

  // 绘制橙色恐龙主体
  ctx.drawImage(dinoImg, -drawW / 2, -drawH / 2, drawW, drawH);

  // ── 眨眼（带渐变过渡）──
  const blinkCycle = t % 3.8;
  if (blinkCycle < 0.16) {
    const bp = blinkCycle / 0.16;
    // 用 smoothstep 让闭眼/睁眼更自然
    const eyeOpen = bp < 0.5 ? (1 - bp * 2) : ((bp - 0.5) * 2);
    if (eyeOpen < 0.85) {
      const lidH = drawH * 0.025 * (1 - eyeOpen);
      ctx.fillStyle = '#E07820';
      for (const ex of [drawW * 0.55, drawW * 0.69]) {
        ctx.beginPath();
        ctx.ellipse(ex - drawW / 2, -drawH * 0.255, drawW * 0.052, lidH, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ── 滑板车轮子转动（在轮子位置画旋转辐条）──
  if (moving && onGround) {
    const wheelR = drawH * 0.085;
    const wheelY = drawH * 0.37;
    const wheelSpin = t * (12 + speed * 6);
    // 前轮（右）和后轮（左）
    for (const wx of [drawW * 0.26, -drawW * 0.24]) {
      ctx.save();
      ctx.translate(wx, wheelY);
      ctx.rotate(wheelSpin);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * wheelR * 0.2, Math.sin(a) * wheelR * 0.2);
        ctx.lineTo(Math.cos(a) * wheelR * 0.75, Math.sin(a) * wheelR * 0.75);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ── 速度线（移动时在后方微妙呈现）──
  if (moving && onGround && speed > 0.5) {
    ctx.strokeStyle = 'rgba(100,180,255,0.20)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const off = Math.sin(t * 10 + i * 2.1) * 2.5;
      ctx.beginPath();
      ctx.moveTo(-drawW * 0.32 + off, drawH * 0.33 + i * 5);
      ctx.quadraticCurveTo(-drawW * 0.48, drawH * 0.35 + i * 5, -drawW * 0.56, drawH * 0.33 + i * 5 + off);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawShieldAura(x, y, w, h, frame) {
  ctx.save();
  const pulse = 0.85 + 0.15 * Math.sin(frame * 0.15);
  ctx.strokeStyle = `rgba(255,140,0,${0.6 * pulse})`;
  ctx.lineWidth = 3;
  ctx.shadowColor = 'rgba(255,100,0,0.8)';
  ctx.shadowBlur = 15 * pulse;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w * 0.65 * pulse, h * 0.6 * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  // fire particles
  for (let i = 0; i < 5; i++) {
    const a = frame * 0.08 + i * 1.25;
    const px = x + w / 2 + Math.cos(a) * w * 0.55;
    const py = y + h / 2 + Math.sin(a) * h * 0.5;
    ctx.fillStyle = `rgba(255,${100 + Math.random() * 100},0,0.7)`;
    ctx.beginPath(); ctx.arc(px, py, 2 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawHedgehog(x, y, w, h, frame, dir) {
  // 统一使用最新版刺猬图像
  if (hedgehogNewImg.complete && hedgehogNewImg.naturalWidth > 0) {
    ctx.save();
    const bob = Math.abs(Math.sin(frame * 0.18)) * 2;
    const d = dir || 1;
    if (d < 0) {
      ctx.translate(x + w, y - bob);
      ctx.scale(-1, 1);
      ctx.drawImage(hedgehogNewImg, 0, 0, w, h);
    } else {
      ctx.drawImage(hedgehogNewImg, x, y - bob, w, h);
    }
    ctx.restore();
    return;
  }
  // Fallback to old hedgehog image if new one not loaded
  if (hedgehogImg.complete && hedgehogImg.naturalWidth > 0) {
    ctx.save();
    ctx.drawImage(hedgehogImg, x, y, w, h);
    ctx.restore();
    return;
  }
  // Fallback canvas hedgehog
  ctx.save();
  ctx.translate(x + w / 2, y + h);
  const bob = Math.sin(frame * 0.2) * 1;
  ctx.fillStyle = '#8B6F47';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.35 + bob, w * 0.45, h * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5D4E37';
  for (let i = -3; i <= 3; i++) {
    const sx = i * w * 0.11;
    ctx.beginPath();
    ctx.moveTo(sx - 3, -h * 0.55 + bob);
    ctx.lineTo(sx, -h * 0.85 + bob);
    ctx.lineTo(sx + 3, -h * 0.55 + bob);
    ctx.fill();
  }
  ctx.fillStyle = '#A08060';
  ctx.beginPath();
  ctx.ellipse(w * 0.3, -h * 0.3 + bob, w * 0.18, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(w * 0.35, -h * 0.38 + bob, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(w * 0.46, -h * 0.25 + bob, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBat(x, y, w, h, frame) {
  if (batImg.complete && batImg.naturalWidth > 0) {
    ctx.save();
    const bob = Math.sin(frame * 0.08) * 2;
    const flap = Math.sin(frame * 0.35) * 0.08;
    ctx.translate(x + w / 2, y + h / 2 + bob);
    ctx.scale(1 + flap, 1 - flap * 0.5);
    ctx.globalAlpha = 0.95;
    ctx.drawImage(batImg, -w / 2, -h / 2, w, h);
    ctx.restore();
    return;
  }
  // Fallback canvas bat
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  const flap = Math.sin(frame * 0.35) * 0.45;
  const bob = Math.sin(frame * 0.08) * 2;
  ctx.translate(0, bob);
  // 翅膀 — 柔和的薰衣草紫
  const wingGrad = ctx.createLinearGradient(0, -h * 0.3, 0, h * 0.2);
  wingGrad.addColorStop(0, '#9B7FC7');
  wingGrad.addColorStop(1, '#7B5FA7');
  ctx.fillStyle = wingGrad;
  // 左翅
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.05);
  ctx.quadraticCurveTo(-w * 0.35, -h * 0.35 - flap * h * 0.25, -w * 0.48, h * 0.05);
  ctx.quadraticCurveTo(-w * 0.35, h * 0.02, -w * 0.2, h * 0.08);
  ctx.quadraticCurveTo(-w * 0.1, h * 0.04, 0, h * 0.05);
  ctx.closePath();
  ctx.fill();
  // 右翅
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.05);
  ctx.quadraticCurveTo(w * 0.35, -h * 0.35 - flap * h * 0.25, w * 0.48, h * 0.05);
  ctx.quadraticCurveTo(w * 0.35, h * 0.02, w * 0.2, h * 0.08);
  ctx.quadraticCurveTo(w * 0.1, h * 0.04, 0, h * 0.05);
  ctx.closePath();
  ctx.fill();
  // 身体 — 柔和的圆
  const bodyGrad = ctx.createRadialGradient(0, -h * 0.02, 2, 0, 0, w * 0.2);
  bodyGrad.addColorStop(0, '#8B6FB7');
  bodyGrad.addColorStop(1, '#6B4F97');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.16, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  // 耳朵 — 圆角小三角
  ctx.fillStyle = '#7B5FA7';
  ctx.beginPath();
  ctx.moveTo(-w * 0.08, -h * 0.18);
  ctx.quadraticCurveTo(-w * 0.12, -h * 0.32, -w * 0.04, -h * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.08, -h * 0.18);
  ctx.quadraticCurveTo(w * 0.12, -h * 0.32, w * 0.04, -h * 0.22);
  ctx.closePath();
  ctx.fill();
  // 眼睛 — 温柔的金色圆眼
  ctx.fillStyle = '#FFE082';
  ctx.beginPath(); ctx.arc(-w * 0.05, -h * 0.04, w * 0.035, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(w * 0.05, -h * 0.04, w * 0.035, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3E2723';
  ctx.beginPath(); ctx.arc(-w * 0.04, -h * 0.04, w * 0.018, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(w * 0.06, -h * 0.04, w * 0.018, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawTomato(x, y, size, frame) {
  if (tomatoImg.complete && tomatoImg.naturalWidth > 0) {
    ctx.save();
    const pulse = 0.94 + 0.06 * Math.sin(frame * 0.1);
    const bob = Math.sin(frame * 0.06) * 1.5;
    const cx = x + size / 2, cy = y + size / 2 + bob;
    // 柔和光晕
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.7);
    glow.addColorStop(0, 'rgba(255,107,107,0.2)');
    glow.addColorStop(1, 'rgba(255,107,107,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, size * 0.7 * pulse, 0, Math.PI * 2); ctx.fill();
    const s = size * pulse;
    ctx.drawImage(tomatoImg, cx - s / 2, cy - s / 2, s, s);
    ctx.restore();
    return;
  }
  ctx.save();
  const pulse = 0.94 + 0.06 * Math.sin(frame * 0.1);
  const cx = x + size / 2, cy = y + size / 2 + Math.sin(frame * 0.06) * 1.5;
  // 柔和光晕
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.7);
  glow.addColorStop(0, 'rgba(255,107,107,0.25)');
  glow.addColorStop(1, 'rgba(255,107,107,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, size * 0.7 * pulse, 0, Math.PI * 2); ctx.fill();
  // 番茄主体 — 温暖的渐变红
  const bodyGrad = ctx.createRadialGradient(cx - size * 0.08, cy - size * 0.1, size * 0.05, cx, cy, size * 0.42);
  bodyGrad.addColorStop(0, '#FF8A80');
  bodyGrad.addColorStop(0.5, '#FF6B6B');
  bodyGrad.addColorStop(1, '#E55555');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, size * 0.36 * pulse, size * 0.34 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();
  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.1, cy - size * 0.12, size * 0.09, size * 0.06, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // 叶子 — 柔和的星状
  ctx.fillStyle = '#66BB6A';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * 0.45 - 0.9;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * size * 0.1, cy - size * 0.28 + Math.sin(a) * size * 0.06);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.07, size * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 叶子中心
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath(); ctx.arc(cx, cy - size * 0.28, size * 0.035, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBalloon(x, y, frame) {
  if (balloonImg.complete && balloonImg.naturalWidth > 0) {
    ctx.save();
    const bob = Math.sin(frame * 0.04) * 6;
    const sway = Math.sin(frame * 0.025) * 3;
    const bw = 70, bh = 90;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(balloonImg, x + sway - bw / 2, y + bob - bh / 2, bw, bh);
    ctx.restore();
    return;
  }
  ctx.save();
  const bob = Math.sin(frame * 0.04) * 6;
  const sway = Math.sin(frame * 0.025) * 3;
  const by = y + bob;
  const bx = x + sway;
  // 气球主体 — 柔和的珊瑚粉渐变
  const grad = ctx.createRadialGradient(bx - 8, by - 22, 4, bx, by - 12, 32);
  grad.addColorStop(0, '#FFB3B3');
  grad.addColorStop(0.5, '#FF8A8A');
  grad.addColorStop(1, '#F06868');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(bx, by - 14, 26, 33, 0, 0, Math.PI * 2);
  ctx.fill();
  // 柔和高光
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(bx - 8, by - 22, 7, 12, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // 气球结
  ctx.fillStyle = '#E05555';
  ctx.beginPath();
  ctx.moveTo(bx - 3, by + 17); ctx.lineTo(bx + 3, by + 17); ctx.lineTo(bx, by + 24);
  ctx.closePath(); ctx.fill();
  // 绳子 — 柔和曲线
  ctx.strokeStyle = 'rgba(180,160,140,0.6)';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx, by + 24);
  ctx.quadraticCurveTo(bx + 6 + sway, by + 42, bx - 2 + sway * 0.5, by + 60);
  ctx.stroke();
  // 小篮子 — 温暖的藤编色
  const basketY = by + 58;
  ctx.fillStyle = '#D4A574';
  ctx.beginPath();
  ctx.roundRect(bx - 9, basketY, 18, 13, 3);
  ctx.fill();
  ctx.fillStyle = '#C49464';
  ctx.fillRect(bx - 9, basketY + 4, 18, 2);
  ctx.fillRect(bx - 9, basketY + 9, 18, 2);
  ctx.restore();
}

function drawPipe(x, y, w, h) {
  ctx.save();
  // 管道主体 — 柔和绿色渐变
  const bodyGrad = ctx.createLinearGradient(x, y, x + w, y);
  bodyGrad.addColorStop(0, '#5CB85C');
  bodyGrad.addColorStop(0.3, '#7DD87D');
  bodyGrad.addColorStop(0.7, '#5CB85C');
  bodyGrad.addColorStop(1, '#4A9E4A');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(x + 4, y, w - 8, h, 4);
  ctx.fill();
  // 管道顶部边缘
  const rimGrad = ctx.createLinearGradient(x, y, x, y + 18);
  rimGrad.addColorStop(0, '#8DE88D');
  rimGrad.addColorStop(1, '#5CB85C');
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.roundRect(x - 2, y, w + 4, 18, 6);
  ctx.fill();
  // 顶部内凹阴影
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 4, (w - 8) / 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // 柔和高光
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.roundRect(x + 8, y + 22, 4, h - 28, 2);
  ctx.fill();
  ctx.restore();
}

function drawPlatform(x, y, w, h) {
  // 小平台用星露谷风格图片，长地面用柔和程序化绘制
  if (platformImg.complete && platformImg.naturalWidth > 0 && w <= 220) {
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(platformImg, x, y, w, h);
    ctx.restore();
    return;
  }
  ctx.save();
  // 圆角柔和草地平台
  const r = Math.min(8, h / 2);
  // 泥土主体
  ctx.fillStyle = '#C49464';
  ctx.beginPath();
  ctx.roundRect(x, y + 10, w, h - 10, r);
  ctx.fill();
  // 泥土纹理
  ctx.fillStyle = '#B08454';
  for (let i = 0; i < w; i += 24) {
    ctx.beginPath();
    ctx.arc(x + i + 8, y + 18 + (i % 16), 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + i + 16, y + 28 + (i % 12), 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // 草皮顶部
  ctx.fillStyle = '#7CB342';
  ctx.beginPath();
  ctx.roundRect(x, y, w, 14, r);
  ctx.fill();
  // 草皮高光
  ctx.fillStyle = '#9CCC65';
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 1, w - 4, 5, 3);
  ctx.fill();
  // 草皮边缘柔和波浪
  ctx.fillStyle = '#689F38';
  for (let i = 0; i < w; i += 6) {
    ctx.beginPath();
    ctx.arc(x + i + 3, y + 12, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawIsland(x, y, w, h) {
  if (islandImg.complete && islandImg.naturalWidth > 0) {
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(islandImg, x, y, w, h);
    ctx.restore();
    return;
  }
  ctx.save();
  // grass top
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath();
  ctx.moveTo(x + 8, y);
  ctx.lineTo(x + w - 8, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + 8);
  ctx.lineTo(x + w, y + h - 12);
  ctx.quadraticCurveTo(x + w, y + h, x + w - 12, y + h);
  ctx.lineTo(x + 12, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - 12);
  ctx.lineTo(x, y + 8);
  ctx.quadraticCurveTo(x, y, x + 8, y);
  ctx.fill();
  // dirt body
  ctx.fillStyle = '#8B6F47';
  ctx.fillRect(x + 2, y + 10, w - 4, h - 14);
  // bottom rocks
  ctx.fillStyle = '#6B5235';
  ctx.beginPath();
  ctx.moveTo(x, y + h - 12);
  ctx.lineTo(x + 8, y + h); ctx.lineTo(x + w - 8, y + h); ctx.lineTo(x + w, y + h - 12);
  ctx.fill();
  // grass highlight
  ctx.fillStyle = '#66BB6A';
  ctx.fillRect(x + 4, y + 2, w - 8, 4);
  ctx.restore();
}

function drawPortal(x, y, r, frame) {
  if (portalImg.complete && portalImg.naturalWidth > 0) {
    ctx.save();
    const pulse = 0.95 + 0.05 * Math.sin(frame * 0.08);
    const s = r * 2.4 * pulse;
    ctx.globalAlpha = 0.92;
    ctx.drawImage(portalImg, x - s / 2, y - s / 2, s, s);
    ctx.restore();
    return;
  }
  ctx.save();
  // outer glow
  const g1 = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 1.3);
  g1.addColorStop(0, 'rgba(80,30,120,0.6)');
  g1.addColorStop(1, 'rgba(80,30,120,0)');
  ctx.fillStyle = g1;
  ctx.beginPath(); ctx.arc(x, y, r * 1.3, 0, Math.PI * 2); ctx.fill();
  // ring
  ctx.strokeStyle = '#9C27B0'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  // swirl
  ctx.strokeStyle = 'rgba(180,100,220,0.7)'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const off = frame * 0.04 + i * 2.1;
    for (let a = 0; a < Math.PI * 3; a += 0.2) {
      const rr = r * (0.9 - a / (Math.PI * 3) * 0.7);
      const px = x + Math.cos(a + off) * rr;
      const py = y + Math.sin(a + off) * rr;
      if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  // center
  ctx.fillStyle = '#1A0030';
  ctx.beginPath(); ctx.arc(x, y, r * 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawTrampoline(x, y, w) {
  ctx.save();
  // 支架腿 — 圆角
  ctx.strokeStyle = '#9E9E9E';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 12); ctx.lineTo(x + 4, y + 22);
  ctx.moveTo(x + w - 10, y + 12); ctx.lineTo(x + w - 4, y + 22);
  ctx.stroke();
  // 跳床面 — 柔和蓝色渐变椭圆
  const matGrad = ctx.createLinearGradient(x, y, x, y + 12);
  matGrad.addColorStop(0, '#64B5F6');
  matGrad.addColorStop(1, '#42A5F5');
  ctx.fillStyle = matGrad;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 6, w / 2, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // 跳床面高光
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 3, w / 2 - 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // 边缘弹簧装饰
  ctx.strokeStyle = '#BDBDBD';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const sx = x + 8 + i * (w - 16) / 3;
    ctx.beginPath();
    ctx.moveTo(sx, y + 10);
    ctx.lineTo(sx, y + 14);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStartPipe(x, y) {
  ctx.save();
  // 起始管道 — 柔和绿色
  const bodyGrad = ctx.createLinearGradient(x, y - 60, x + 50, y - 60);
  bodyGrad.addColorStop(0, '#5CB85C');
  bodyGrad.addColorStop(0.5, '#7DD87D');
  bodyGrad.addColorStop(1, '#4A9E4A');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(x, y - 60, 50, 60, 4);
  ctx.fill();
  // 顶部边缘
  ctx.fillStyle = '#8DE88D';
  ctx.beginPath();
  ctx.roundRect(x - 4, y - 68, 58, 14, 6);
  ctx.fill();
  // 内凹阴影
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(x + 25, y - 64, 21, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ─── Popups (floating score text) ─── */
function spawnPopup(x, y, text, color) {
  popups.push({ x: x, y: y, text: text, color: color, life: 50, vy: -2 });
}
function updatePopups() {
  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i];
    p.y += p.vy; p.life--;
    if (p.life <= 0) popups.splice(i, 1);
  }
}
function drawPopups() {
  ctx.save();
  ctx.font = 'bold 28px "Fredoka", sans-serif';
  ctx.textAlign = 'center';
  popups.forEach(p => {
    ctx.globalAlpha = Math.min(1, p.life / 25);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillText(p.text, p.x, p.y);
  });
  ctx.restore();
}

/* ─── Confetti ─── */
function spawnConfetti() {
  confettiParts = [];
  const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6B9D', '#B983FF'];
  for (let i = 0; i < 120; i++) {
    confettiParts.push({
      x: W / 2 + (Math.random() - 0.5) * 400,
      y: H / 2, vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 15 - 5,
      size: 6 + Math.random() * 8, color: colors[i % colors.length],
      rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.3,
      life: 180
    });
  }
}
function updateConfetti() {
  for (let i = confettiParts.length - 1; i >= 0; i--) {
    const p = confettiParts[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.rot += p.vr; p.life--;
    if (p.life <= 0) confettiParts.splice(i, 1);
  }
}
function drawConfetti() {
  cctx.clearRect(0, 0, W, H);
  confettiParts.forEach(p => {
    cctx.save(); cctx.translate(p.x, p.y); cctx.rotate(p.rot);
    cctx.globalAlpha = Math.min(1, p.life / 40);
    cctx.fillStyle = p.color;
    cctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    cctx.restore();
  });
}

/* ─── Particles & screen shake ─── */
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < (count || 10); i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 2 + Math.random() * 4;
    particles.push({
      x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2,
      life: 30 + Math.random() * 20, size: 3 + Math.random() * 4, color: color
    });
  }
}
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
  if (screenShake > 0) screenShake *= 0.85;
  if (screenShake < 0.5) screenShake = 0;
}
function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life / 20);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.life / 50), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}
function applyShake() {
  if (screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
  }
}

/* ─── 液态流体脉冲光效湖泊 ─── */
function drawPond(x, y, w, h, frame) {
  ctx.save();
  // 脉冲因子：周期性亮度变化
  const pulse = 0.82 + 0.18 * Math.sin(frame * 0.035);

  // 1. 水体主体（四层渐变，液态深邃感）
  const waterGrad = ctx.createLinearGradient(0, y, 0, y + h);
  waterGrad.addColorStop(0, `rgba(130, 210, 255, ${0.78 * pulse})`);
  waterGrad.addColorStop(0.25, `rgba(70, 170, 235, ${0.82 * pulse})`);
  waterGrad.addColorStop(0.6, `rgba(35, 120, 205, ${0.88 * pulse})`);
  waterGrad.addColorStop(1, `rgba(18, 75, 155, ${0.92 * pulse})`);
  ctx.fillStyle = waterGrad;
  ctx.fillRect(x, y, w, h);

  // 2. 水面脉冲发光边缘（光晕）
  const glowGrad = ctx.createLinearGradient(0, y - 10, 0, y + 14);
  glowGrad.addColorStop(0, 'rgba(160, 230, 255, 0)');
  glowGrad.addColorStop(0.5, `rgba(160, 230, 255, ${0.45 * pulse})`);
  glowGrad.addColorStop(1, 'rgba(160, 230, 255, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(x - 4, y - 10, w + 8, 24);

  // 3. 三层波纹（不同频率/振幅/速度，液态流体感）
  for (let layer = 0; layer < 3; layer++) {
    const amp = 1.8 + layer * 1.4;
    const freq = 0.035 + layer * 0.018;
    const speed = 1.8 + layer * 0.7;
    const alpha = 0.55 - layer * 0.14;
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let wx = x; wx <= x + w; wx += 3) {
      const wy = y + 2 + layer * 4 + Math.sin((wx + frame * speed) * freq) * amp;
      if (wx === x) ctx.moveTo(wx, wy);
      else ctx.lineTo(wx, wy);
    }
    ctx.stroke();
  }

  // 4. 波光粼粼高光闪烁（确定性伪随机）
  const sparkleCount = Math.floor(w / 28);
  for (let i = 0; i < sparkleCount; i++) {
    const sx = x + 8 + ((i * 53 + frame * 0.4) % (w - 16));
    const sy = y + 5 + ((i * 29) % 18);
    const twinkle = 0.5 + 0.5 * Math.sin(frame * 0.12 + i * 1.9);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.65 * twinkle * pulse})`;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 2.5 + twinkle * 2, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. 水下脉冲光柱（三道，缓慢摆动）
  for (let i = 0; i < 3; i++) {
    const lx = x + w * (0.18 + i * 0.32) + Math.sin(frame * 0.018 + i * 1.2) * 25;
    const beamGrad = ctx.createLinearGradient(lx, y, lx, y + h);
    beamGrad.addColorStop(0, `rgba(190, 235, 255, ${0.18 * pulse})`);
    beamGrad.addColorStop(0.6, `rgba(190, 235, 255, ${0.06 * pulse})`);
    beamGrad.addColorStop(1, 'rgba(190, 235, 255, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(lx - 18, y);
    ctx.lineTo(lx + 18, y);
    ctx.lineTo(lx + 45, y + h);
    ctx.lineTo(lx - 45, y + h);
    ctx.closePath();
    ctx.fill();
  }

  // 6. 上升气泡（确定性循环）
  for (let i = 0; i < 6; i++) {
    const bx = x + 12 + ((i * 71 + frame * 0.25) % (w - 24));
    const by = y + h - ((frame * 0.7 + i * 35) % h);
    const br = 1.2 + (i % 3) * 0.8;
    ctx.fillStyle = `rgba(210, 245, 255, ${0.45 * pulse})`;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.65 * pulse})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // 7. 水底柔光反射
  const bottomGlow = ctx.createRadialGradient(x + w / 2, y + h, 5, x + w / 2, y + h, w * 0.6);
  bottomGlow.addColorStop(0, `rgba(100, 180, 255, ${0.15 * pulse})`);
  bottomGlow.addColorStop(1, 'rgba(100, 180, 255, 0)');
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(x, y + h * 0.5, w, h * 0.5);

  ctx.restore();
}

/* ─── Shared clouds — 柔和棉花糖云 ─── */
function drawClouds(offset, alpha) {
  ctx.save();
  ctx.globalAlpha = (alpha || 0.8) * 0.85;
  for (let i = 0; i < 6; i++) {
    const cx = ((i * 360 - offset * 0.12) % (W + 400) + W + 400) % (W + 400) - 200;
    const cy = 45 + (i % 3) * 60 + Math.sin(offset * 0.01 + i) * 4;
    // 柔和渐变云
    const cg = ctx.createRadialGradient(cx + 25, cy, 5, cx + 25, cy, 55);
    cg.addColorStop(0, 'rgba(255,255,255,0.95)');
    cg.addColorStop(0.6, 'rgba(255,255,255,0.7)');
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.arc(cx + 24, cy - 12, 24, 0, Math.PI * 2);
    ctx.arc(cx + 48, cy, 26, 0, Math.PI * 2);
    ctx.arc(cx + 22, cy + 8, 22, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ─── Collision util ─── */
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/* ─── Shield helpers ─── */
function addShield() {
  shields++;
  shieldBadge.hidden = false;
  shieldCountEl.textContent = shields;
}
function useShield() {
  if (shields > 0) { shields--; shieldCountEl.textContent = shields; if (shields === 0) shieldBadge.hidden = true; return true; }
  return false;
}
function resetShields() {
  shields = 0; shieldBadge.hidden = true; shieldCountEl.textContent = 0;
}

/* ═══════════════════════════════════════════════════════════════
   MAZE GENERATION (Novice mode)
   ═══════════════════════════════════════════════════════════════ */

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// 起点安全大厅：cols 0~3, rows 1~3（4×3 开放区域）
const MAZE_START_W = 4, MAZE_START_H = 3;
const MAZE_START_X0 = 0, MAZE_START_Y0 = 1;

// 每关终点位置（多样化：不固定在右下角）
// gx,gy 为终点在边界上的格子坐标
const MAZE_GOALS = [
  { gx: MAZE_COLS - 1, gy: MAZE_ROWS - 2 },  // L1 右下
  { gx: MAZE_COLS - 1, gy: 2 },                // L2 右上
  { gx: 0, gy: MAZE_ROWS - 2 },                // L3 左下
  { gx: MAZE_COLS - 1, gy: Math.floor(MAZE_ROWS / 2) },  // L4 右中
  { gx: MAZE_COLS - 2, gy: MAZE_ROWS - 3 },    // L5 右下偏中（原左中太近）
  { gx: Math.floor(MAZE_COLS / 2), gy: MAZE_ROWS - 1 },  // L6 底部中间
  { gx: MAZE_COLS - 1, gy: MAZE_ROWS - 3 },    // L7 右下偏上
  { gx: MAZE_COLS - 1, gy: 3 },                  // L8 右上偏下
  { gx: 0, gy: MAZE_ROWS - 3 },                  // L9 左下偏上
  { gx: Math.floor(MAZE_COLS / 2) + 4, gy: 0 }, // L10 顶部偏右
];

function _inStartChamber(gx, gy) {
  return gx >= MAZE_START_X0 && gx < MAZE_START_X0 + MAZE_START_W &&
         gy >= MAZE_START_Y0 && gy < MAZE_START_Y0 + MAZE_START_H;
}

// 根据终点位置计算出口大厅矩形（终点内侧 3×3 区域）
function _getExitRect(goalGX, goalGY) {
  if (goalGX >= MAZE_COLS - 1) {
    // 右边界：大厅在左侧
    return { x0: MAZE_COLS - 4, y0: Math.max(1, goalGY - 1), w: 4, h: Math.min(3, MAZE_ROWS - 2 - Math.max(1, goalGY - 1)) };
  } else if (goalGX <= 0) {
    // 左边界：大厅在右侧
    return { x0: 0, y0: Math.max(1, goalGY - 1), w: 4, h: Math.min(3, MAZE_ROWS - 2 - Math.max(1, goalGY - 1)) };
  } else if (goalGY >= MAZE_ROWS - 1) {
    // 底部：大厅在上方
    return { x0: Math.max(1, goalGX - 1), y0: MAZE_ROWS - 4, w: Math.min(3, MAZE_COLS - 2 - Math.max(1, goalGX - 1)), h: 4 };
  } else {
    // 顶部：大厅在下方
    return { x0: Math.max(1, goalGX - 1), y0: 0, w: Math.min(3, MAZE_COLS - 2 - Math.max(1, goalGX - 1)), h: 4 };
  }
}
function _inExitChamber(gx, gy, exitRect) {
  return gx >= exitRect.x0 && gx < exitRect.x0 + exitRect.w &&
         gy >= exitRect.y0 && gy < exitRect.y0 + exitRect.h;
}
// 距起点的曼哈顿距离（用于安全区判定）
function _distFromStart(gx, gy) {
  return Math.abs(gx - (MAZE_START_X0 + 1)) + Math.abs(gy - (MAZE_START_Y0 + 1));
}

function generateMaze(seed, goalGX, goalGY) {
  const rng = mulberry32(seed);
  const grid = [];
  for (let y = 0; y < MAZE_ROWS; y++) { grid[y] = []; for (let x = 0; x < MAZE_COLS; x++) grid[y][x] = 1; }
  const exitRect = _getExitRect(goalGX, goalGY);

  // ── 1. DFS carving 从起点大厅右侧开始 ──
  function carve(x, y) {
    grid[y][x] = 0;
    const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]];
    for (let i = dirs.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [dirs[i], dirs[j]] = [dirs[j], dirs[i]]; }
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx > MAZE_START_W - 1 && nx < MAZE_COLS - 1 && ny > 0 && ny < MAZE_ROWS - 1 && grid[ny][nx] === 1) {
        grid[y + dy / 2][x + dx / 2] = 0; carve(nx, ny);
      }
    }
  }
  carve(MAZE_START_W, MAZE_START_Y0 + 1);
  carve(MAZE_START_W, MAZE_START_Y0);

  // ── 2. 开挖起点安全大厅 ──
  for (let y = MAZE_START_Y0; y < MAZE_START_Y0 + MAZE_START_H; y++)
    for (let x = MAZE_START_X0; x < MAZE_START_X0 + MAZE_START_W; x++) grid[y][x] = 0;
  grid[MAZE_START_Y0][MAZE_START_W] = 0;
  grid[MAZE_START_Y0 + 1][MAZE_START_W] = 0;
  grid[MAZE_START_Y0 + 2][MAZE_START_W] = 0;

  // ── 3. 开挖出口大厅（根据终点位置）──
  for (let y = exitRect.y0; y < exitRect.y0 + exitRect.h && y < MAZE_ROWS - 1; y++)
    for (let x = exitRect.x0; x < exitRect.x0 + exitRect.w && x < MAZE_COLS - 1; x++) grid[y][x] = 0;

  // 开挖终点边界开口（2格高）
  grid[goalGY][goalGX] = 0;
  if (goalGY > 0 && goalGY < MAZE_ROWS - 1) grid[goalGY + 1] && (grid[goalGY + 1][goalGX] = 0);
  if (goalGY > 1) grid[goalGY - 1][goalGX] = 0;

  // 确保终点连通：从终点贪心寻路到起点大厅，逐格打通
  let cx = goalGX, cy = goalGY;
  const targetX = MAZE_START_X0 + MAZE_START_W;
  const targetY = MAZE_START_Y0 + 1;
  for (let step = 0; step < 120; step++) {
    if (cx >= 0 && cx < MAZE_COLS && cy >= 0 && cy < MAZE_ROWS) grid[cy][cx] = 0;
    // 到达起点大厅边界则停止
    if (cx <= targetX && cy >= MAZE_START_Y0 && cy < MAZE_START_Y0 + MAZE_START_H) break;
    // 贪心往起点方向：优先移动距离更大的轴
    const dx = targetX - cx;
    const dy = targetY - cy;
    if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
      cx += dx > 0 ? 1 : -1;
    } else if (dy !== 0) {
      cy += dy > 0 ? 1 : -1;
    } else {
      break;
    }
  }

  // ── 4. 随机打通内墙，制造环路 ──
  const loopCount = 10 + Math.floor(rng() * 6);
  for (let i = 0; i < loopCount; i++) {
    const lx = 2 + Math.floor(rng() * (MAZE_COLS - 4));
    const ly = 2 + Math.floor(rng() * (MAZE_ROWS - 4));
    if (_inStartChamber(lx, ly) || _inExitChamber(lx, ly, exitRect)) continue;
    if (grid[ly][lx] === 1) {
      const hOpen = grid[ly][lx - 1] === 0 && grid[ly][lx + 1] === 0;
      const vOpen = grid[ly - 1] && grid[ly - 1][lx] === 0 && grid[ly + 1] && grid[ly + 1][lx] === 0;
      if (hOpen || vOpen) grid[ly][lx] = 0;
    }
  }

  return grid;
}

function buildMazeEntities(grid, seed, goalGX, goalGY) {
  const rng = mulberry32(seed + 1000);
  const exitRect = _getExitRect(goalGX, goalGY);
  const hedgehogs = [], bats = [], tomatoes = [];
  const SAFE_DIST = 7; // 距起点 7 格内不放置敌人

  // ── 刺猬：只在距起点足够远的长走廊里生成 ──
  function tryAddHedgehog(gx, gy, range, axis) {
    if (_distFromStart(gx, gy) < SAFE_DIST) return;
    if (_inExitChamber(gx, gy, exitRect)) return;
    hedgehogs.push({ gx, gy, dir: 1, range: Math.max(2, range - 2), axis });
  }
  // 水平走廊
  for (let y = 1; y < MAZE_ROWS - 1; y++) {
    let run = 0, runStart = 0;
    for (let x = 0; x < MAZE_COLS; x++) {
      if (grid[y][x] === 0) { if (run === 0) runStart = x; run++; }
      else { if (run >= 5 && rng() < 0.35) tryAddHedgehog(runStart + 2, y, run, 'h'); run = 0; }
    }
    if (run >= 5 && rng() < 0.35) tryAddHedgehog(runStart + 2, y, run, 'h');
  }
  // 垂直走廊
  for (let x = 1; x < MAZE_COLS - 1; x++) {
    let run = 0, runStart = 0;
    for (let y = 0; y < MAZE_ROWS; y++) {
      if (grid[y][x] === 0) { if (run === 0) runStart = y; run++; }
      else { if (run >= 5 && rng() < 0.3) tryAddHedgehog(x, runStart + 2, run, 'v'); run = 0; }
    }
    if (run >= 5 && rng() < 0.3) tryAddHedgehog(x, runStart + 2, run, 'v');
  }
  // 限制刺猬总数（随关卡递增）
  const maxHedgehogs = Math.min(7, 3 + Math.floor(levelIdx * 0.5));
  while (hedgehogs.length > maxHedgehogs) hedgehogs.splice(Math.floor(rng() * hedgehogs.length), 1);

  // ── 蝙蝠：放在迷宫中后段，不在起点附近 ──
  const batCount = 1 + Math.min(2, Math.floor(levelIdx / 3));
  for (let i = 0; i < batCount; i++) {
    const bx = MAZE_COLS * 0.35 + i * (MAZE_COLS * 0.25) + rng() * 3;
    const by = 3 + rng() * (MAZE_ROWS - 6);
    bats.push({
      x: MAZE_OX + CELL * bx, y: MAZE_OY + CELL * by,
      vx: (1.2 + rng() * 0.6) * (rng() < 0.5 ? 1 : -1),
      vy: (0.8 + rng() * 0.5) * (rng() < 0.5 ? 1 : -1),
      w: 38, h: 28, frame: 0
    });
  }

  // ── 番茄（护盾）──
  // 1. 起点大厅固定放一个（保证开局有护盾）
  tomatoes.push({ gx: MAZE_START_X0 + 2, gy: MAZE_START_Y0 + 1, collected: false });
  // 2. 死胡同里放番茄
  for (let y = 1; y < MAZE_ROWS - 1; y++) {
    for (let x = 1; x < MAZE_COLS - 1; x++) {
      if (grid[y][x] !== 0) continue;
      if (_inStartChamber(x, y)) continue;
      let neighbors = 0;
      if (grid[y - 1][x] === 0) neighbors++;
      if (grid[y + 1][x] === 0) neighbors++;
      if (grid[y][x - 1] === 0) neighbors++;
      if (grid[y][x + 1] === 0) neighbors++;
      if (neighbors === 1 && rng() < 0.7) tomatoes.push({ gx: x, gy: y, collected: false });
    }
  }
  // 3. 交叉路口随机放
  for (let y = 3; y < MAZE_ROWS - 3; y += 3) {
    for (let x = 5; x < MAZE_COLS - 3; x += 4) {
      if (grid[y][x] === 0 && !_inStartChamber(x, y) && !_inExitChamber(x, y, exitRect) && rng() < 0.25) {
        tomatoes.push({ gx: x, gy: y, collected: false });
      }
    }
  }
  // 限制总数（至少 3 个）
  const maxTomatoes = Math.min(8, 4 + Math.floor(levelIdx * 0.4));
  while (tomatoes.length > maxTomatoes) {
    // 保留起点的那个（index 0）
    const idx = 1 + Math.floor(rng() * (tomatoes.length - 1));
    tomatoes.splice(idx, 1);
  }
  if (tomatoes.length < 3) tomatoes.push({ gx: Math.floor(MAZE_COLS / 2), gy: Math.floor(MAZE_ROWS / 2), collected: false });

  return { hedgehogs, bats, tomatoes };
}

/* ═══════════════════════════════════════════════════════════════
   PLATFORMER LEVELS (Hooked mode)
   ═══════════════════════════════════════════════════════════════ */
const HOOKED_LEVELS = [
  // L1 经典开场：平地+1刺猬+问号块+2矮管道（致敬马里奥1-1开头）
  [3200,
    [[0,820,3200]],
    [[900,628,144,'grass'],[1400,628,144,'grass']],
    [[1800,96,0],[2200,144,0]],
    [[600,'hedgehog',100]],
    [],
    [[950,570],[1450,570],[2500,760]],
    [3000,720],
    [[500,628,'question',1],[800,628,'brick',2]],
    []],
  // L2 管道渐进+第一个坑+乌龟+食人花
  [3600,
    [[0,820,1400],[1520,820,800],[2400,820,1200]],
    [[600,628,144,'grass'],[1000,436,192,'brick'],[1900,628,144,'grass'],[2600,628,144,'grass']],
    [[1200,96,0],[1600,144,1],[2000,192,0],[2800,96,0]],
    [[400,'koopa',100],[1700,'hedgehog',80],[2500,'koopa',100]],
    [[1100,500,80]],
    [[650,570],[1050,380],[1950,570],[2650,570],[3000,760]],
    [3400,720],
    [[300,628,'question',1],[700,628,'brick',3],[1000,436,'question',1],[1800,628,'brick',2],[2700,628,'question',1]],
    []],
  // L3 双层砖块区+多敌人+第二个坑
  [4000,
    [[0,820,1600],[1720,820,600],[2400,820,1600]],
    [[500,628,192,'brick'],[900,436,384,'brick'],[1500,628,144,'grass'],[2000,436,192,'brick'],[2600,628,192,'grass'],[3000,436,192,'brick']],
    [[1300,144,0],[1800,192,1],[2300,144,0],[2800,96,0],[3200,192,1]],
    [[300,'hedgehog',100],[700,'koopa',80],[1100,'hedgehog',60],[1900,'koopa',100],[2500,'hedgehog',80],[2900,'koopa',80]],
    [[800,350,100],[1600,350,80],[2400,350,100]],
    [[550,570],[950,380],[1000,380],[1050,380],[1550,570],[2050,380],[2650,570],[3050,380],[3500,760]],
    [3800,720],
    [[400,628,'brick',2],[600,628,'question',1],[900,436,'brick',4],[950,436,'question',1],[1400,628,'question',1],[1900,436,'brick',2],[2000,436,'question',1],[2500,628,'brick',3],[2900,436,'question',1],[3300,628,'brick',2]],
    []],
  // L4 楼梯区：上上下下的阶梯+食人花+蝙蝠
  [4200,
    [[0,820,800],[800,772,100],[900,724,100],[1000,676,100],[1100,628,200],[1300,676,100],[1400,724,100],[1500,772,100],[1600,820,800],[2400,772,100],[2500,724,100],[2600,676,100],[2700,628,100],[2800,580,100],[2900,532,100],[3000,484,100],[3100,436,200],[3300,820,900]],
    [[1800,628,144,'grass'],[2100,436,192,'brick']],
    [[700,96,1],[1700,144,0],[2200,192,1],[3400,96,0]],
    [[500,'hedgehog',80],[1200,'koopa',60],[1900,'hedgehog',80],[2300,'koopa',60],[3500,'hedgehog',100]],
    [[1000,550,80],[1800,480,100],[2600,400,80],[3400,500,100]],
    [[1850,570],[2150,380],[3600,760],[3800,760]],
    [4000,720],
    [[400,628,'question',1],[1500,628,'brick',2],[1800,628,'question',1],[2000,436,'brick',3],[2100,436,'question',1],[3400,628,'brick',2],[3600,628,'question',1]],
    []],
  // L5 多坑+长砖排+混合敌人+池塘
  [4400,
    [[0,820,1000],[1120,820,500],[1700,820,700],[2500,820,400],[3000,820,1400]],
    [[300,628,144,'grass'],[700,436,384,'brick'],[1300,628,144,'grass'],[1800,436,288,'brick'],[2200,628,144,'grass'],[2700,436,192,'brick'],[3200,628,192,'grass'],[3600,436,192,'brick']],
    [[500,96,0],[900,144,1],[1400,192,0],[1900,144,1],[2400,96,0],[2900,192,1],[3400,144,0],[3800,96,1]],
    [[200,'koopa',100],[600,'hedgehog',80],[1000,'koopa',60],[1500,'hedgehog',80],[2000,'koopa',80],[2300,'hedgehog',60],[2800,'koopa',80],[3300,'hedgehog',100],[3700,'koopa',80]],
    [[600,350,100],[1200,480,80],[1700,350,100],[2300,350,80],[2900,350,100],[3500,350,80]],
    [[350,570],[750,380],[800,380],[850,380],[1350,570],[1850,380],[1900,380],[2250,570],[2750,380],[3250,570],[3650,380],[4000,760]],
    [4200,720],
    [[200,628,'brick',2],[400,628,'question',1],[700,436,'brick',5],[750,436,'question',1],[1200,628,'question',1],[1700,436,'brick',3],[1800,436,'question',1],[2100,628,'brick',2],[2600,436,'question',1],[2700,436,'brick',2],[3100,628,'brick',3],[3200,628,'question',1],[3500,436,'brick',2],[3600,436,'question',1],[3900,628,'brick',2]],
    [[1050,70],[1620,80],[2420,80]]],
  // L6 复杂组合+高管道+池塘+多食人花
  [4600,
    [[0,820,1200],[1300,820,500],[1900,820,600],[2600,820,400],[3100,820,1500]],
    [[400,628,144,'grass'],[800,436,288,'brick'],[1400,628,144,'grass'],[1700,436,192,'brick'],[2000,628,192,'grass'],[2300,436,288,'brick'],[2700,628,144,'grass'],[3000,436,192,'brick'],[3300,628,192,'grass'],[3700,436,288,'brick']],
    [[600,96,1],[1000,192,0],[1500,144,1],[1850,240,0],[2200,192,1],[2500,144,0],[2900,96,1],[3200,192,1],[3600,144,0],[4000,96,1]],
    [[300,'hedgehog',100],[700,'koopa',80],[1100,'hedgehog',60],[1450,'koopa',80],[1800,'hedgehog',60],[2100,'koopa',80],[2400,'hedgehog',60],[2800,'koopa',80],[3150,'hedgehog',80],[3500,'koopa',80],[3900,'hedgehog',100]],
    [[500,350,100],[900,300,80],[1300,480,100],[1700,300,80],[2100,350,100],[2500,300,80],[2900,350,100],[3300,300,80],[3700,350,100]],
    [[450,570],[850,380],[900,380],[1450,570],[1750,380],[2050,570],[2350,380],[2400,380],[2750,570],[3050,380],[3350,570],[3750,380],[3800,380],[4200,760]],
    [4400,720],
    [[300,628,'question',1],[500,628,'brick',2],[800,436,'brick',3],[850,436,'question',1],[1300,628,'brick',2],[1400,628,'question',1],[1700,436,'question',1],[1900,628,'brick',3],[2000,628,'question',1],[2300,436,'brick',3],[2400,436,'question',1],[2700,628,'question',1],[2900,436,'brick',2],[3000,436,'question',1],[3200,628,'brick',3],[3300,628,'question',1],[3600,436,'brick',3],[3700,436,'question',1],[4100,628,'brick',2],[4200,628,'question',1]],
    [[1220,80],[1820,80],[2520,80],[3020,80]]],
  // L7 全机制挑战：长楼梯+多坑+全敌人类型
  [4800,
    [[0,820,600],[600,772,80],[680,724,80],[760,676,80],[840,628,80],[920,580,80],[1000,532,80],[1080,484,80],[1160,436,200],[1360,484,80],[1440,532,80],[1520,580,80],[1600,628,80],[1680,676,80],[1760,724,80],[1840,772,80],[1920,820,500],[2500,820,500],[3100,820,400],[3600,820,1200]],
    [[2100,628,144,'grass'],[2300,436,192,'brick'],[2700,628,144,'grass'],[2900,436,192,'brick'],[3300,628,192,'grass'],[3700,436,288,'brick'],[4100,628,144,'grass']],
    [[500,96,1],[2000,144,0],[2400,192,1],[2800,144,0],[3200,96,1],[3500,192,1],[3900,144,0],[4300,96,1]],
    [[300,'koopa',80],[700,'hedgehog',60],[1200,'koopa',60],[1500,'hedgehog',60],[2000,'koopa',80],[2200,'hedgehog',60],[2600,'koopa',80],[2850,'hedgehog',60],[3200,'koopa',80],[3400,'hedgehog',60],[3800,'koopa',80],[4000,'hedgehog',80],[4400,'koopa',100]],
    [[400,350,80],[800,400,60],[1200,300,80],[1600,400,60],[2000,350,80],[2400,300,80],[2800,350,80],[3200,300,80],[3600,350,80],[4000,300,80]],
    [[2150,570],[2350,380],[2750,570],[2950,380],[3350,570],[3750,380],[3800,380],[4150,570],[4500,760]],
    [4600,720],
    [[200,628,'question',1],[400,628,'brick',2],[1900,628,'brick',2],[2000,628,'question',1],[2200,436,'brick',2],[2300,436,'question',1],[2600,628,'question',1],[2800,436,'brick',2],[2900,436,'question',1],[3200,628,'brick',3],[3300,628,'question',1],[3600,436,'brick',3],[3700,436,'question',1],[4000,628,'brick',2],[4100,628,'question',1],[4400,628,'brick',2]],
    [[2430,70],[3020,80]]],
  // L8 最终关：超长楼梯到终点+全机制
  [5000,
    [[0,820,800],[900,820,400],[1400,820,300],[1800,820,500],[2400,820,300],[2800,820,400],[3300,820,200],[3500,772,80],[3580,724,80],[3660,676,80],[3740,628,80],[3820,580,80],[3900,532,80],[3980,484,80],[4060,436,80],[4140,388,80],[4220,340,80],[4300,292,200],[4500,820,500]],
    [[500,628,144,'grass'],[1000,436,288,'brick'],[1500,628,144,'grass'],[1900,436,192,'brick'],[2200,628,144,'grass'],[2500,436,192,'brick'],[2900,628,144,'grass'],[3100,436,192,'brick']],
    [[700,96,1],[1100,192,0],[1600,144,1],[2000,192,1],[2300,144,0],[2600,192,1],[3000,144,0],[3200,96,1]],
    [[400,'hedgehog',100],[800,'koopa',80],[1200,'hedgehog',60],[1550,'koopa',80],[1850,'hedgehog',60],[2100,'koopa',80],[2400,'hedgehog',60],[2700,'koopa',80],[2950,'hedgehog',80],[3150,'koopa',60],[4600,'hedgehog',100]],
    [[600,350,100],[1000,300,80],[1400,480,100],[1800,300,80],[2200,350,100],[2600,300,80],[3000,350,100],[3400,300,80]],
    [[550,570],[1050,380],[1100,380],[1550,570],[1950,380],[2250,570],[2550,380],[2950,570],[3150,380],[4700,760],[4800,760]],
    [4900,720],
    [[300,628,'question',1],[500,628,'brick',2],[900,436,'brick',3],[1000,436,'question',1],[1400,628,'question',1],[1700,436,'brick',2],[1800,436,'question',1],[2100,628,'brick',2],[2200,628,'question',1],[2400,436,'brick',2],[2500,436,'question',1],[2800,628,'question',1],[3000,436,'brick',2],[3100,436,'question',1],[4550,628,'brick',3],[4650,628,'question',1]],
    [[820,80],[1320,80],[1720,80],[2320,80],[2720,80],[3220,80]]],
];

function buildGround(pits, levelW) {
  const segs = []; let x = 0;
  const sorted = [...pits].sort((a, b) => a[0] - b[0]);
  for (const [ps, pe] of sorted) { if (ps > x) segs.push([x, ps - x]); x = pe; }
  if (x < levelW) segs.push([x, levelW - x]);
  return segs;
}

/* ═══════════════════════════════════════════════════════════════
   PORTAL LEVELS (Expert mode)
   Each: [islands, trampolines, portals(pairs), bats, balloon[x,y]]
   islands: [x,y,w], trampolines: [x,y] (on island), portals: [[x1,y1],[x2,y2]]
   ═══════════════════════════════════════════════════════════════ */
const EXPERT_LEVELS = [
  // L1 教学：2层+1电梯，无敌人
  [1800,
    [[0,820,1700,100],[600,560,500,80]],
    [],
    [],
    [],
    [[750,510],[950,510]],
    [1500,480],
    [],
    [[300,820,560,70]]],
  // L2：2层+电梯+蝙蝠+乌龟
  [2000,
    [[0,820,1900,100],[500,560,400,80],[1100,560,400,80]],
    [[400,720,100,0]],
    [[1200,560,'koopa',100]],
    [[350,680,80]],
    [[650,510],[1250,510]],
    [1700,480],
    [[800,700,'question',1]],
    [[250,820,560,70]]],
  // L3：3层+2电梯+食人花+刺猬
  [2200,
    [[0,820,2100,100],[400,560,350,80],[1000,560,350,80],[700,300,400,80]],
    [[300,720,100,1],[900,720,100,0]],
    [[500,560,'hedgehog',80],[1100,560,'koopa',80]],
    [[280,680,60],[1050,400,70]],
    [[550,510],[1100,510],[850,250]],
    [1900,220],
    [[600,700,'brick',2],[1200,700,'question',1]],
    [[200,820,560,70],[1050,560,300,70]]],
  // L4：3层+管道阵+乌龟刺猬+砖块
  [2400,
    [[0,820,2300,100],[350,560,400,80],[950,560,400,80],[1550,560,400,80],[650,300,400,80],[1250,300,400,80]],
    [[500,720,100,1],[1100,720,100,1],[1700,720,100,0]],
    [[450,560,'koopa',100],[1050,560,'hedgehog',100],[1650,560,'koopa',100]],
    [[250,680,60],[700,400,80],[1300,400,80]],
    [[500,510],[1100,510],[1700,510],[800,250],[1400,250]],
    [2150,220],
    [[400,700,'brick',3],[1000,700,'question',1],[1600,700,'brick',2],[750,440,'question',1],[1350,440,'brick',2]],
    [[180,820,560,70],[1050,560,300,70]]],
  // L5：3层+多电梯+食人花群+蝙蝠
  [2600,
    [[0,820,2500,100],[300,560,350,80],[800,560,350,80],[1300,560,350,80],[1800,560,350,80],[550,300,350,80],[1050,300,350,80],[1550,300,350,80]],
    [[650,720,100,1],[1150,720,100,1],[1650,720,100,0]],
    [[400,560,'hedgehog',80],[900,560,'koopa',80],[1400,560,'hedgehog',80],[1900,560,'koopa',80]],
    [[220,680,60],[600,400,70],[1100,400,70],[1600,400,70]],
    [[400,510],[900,510],[1400,510],[1900,510],[700,250],[1200,250],[1700,250]],
    [2350,220],
    [[350,700,'question',1],[850,700,'brick',3],[1350,700,'question',1],[1850,700,'brick',2],[600,440,'brick',2],[1100,440,'question',1],[1600,440,'brick',2]],
    [[150,820,560,70],[850,560,300,70],[1350,560,300,70],[1850,560,300,70]]],
  // L6：3层+电梯+管道+全敌人
  [2800,
    [[0,820,2700,100],[250,560,300,80],[700,560,300,80],[1150,560,300,80],[1600,560,300,80],[2050,560,300,80],[475,300,300,80],[925,300,300,80],[1375,300,300,80],[1825,300,300,80]],
    [[400,720,100,1],[850,720,100,1],[1300,720,100,0],[1750,720,100,1],[2200,720,100,0]],
    [[350,560,'koopa',80],[800,560,'hedgehog',80],[1250,560,'koopa',80],[1700,560,'hedgehog',80],[2150,560,'koopa',80]],
    [[200,680,60],[550,400,70],[1000,400,70],[1450,400,70],[1900,400,70]],
    [[350,510],[800,510],[1250,510],[1700,510],[2150,510],[625,250],[1075,250],[1525,250],[1975,250]],
    [2550,220],
    [[300,700,'brick',2],[750,700,'question',1],[1200,700,'brick',3],[1650,700,'question',1],[2100,700,'brick',2],[525,440,'question',1],[975,440,'brick',2],[1425,440,'question',1],[1875,440,'brick',2]],
    [[130,820,560,70],[750,560,300,70],[1200,560,300,70],[1650,560,300,70],[2100,560,300,70]]],
  // L7：高难3层+多电梯
  [3000,
    [[0,820,2900,100],[200,560,280,80],[600,560,280,80],[1000,560,280,80],[1400,560,280,80],[1800,560,280,80],[2200,560,280,80],[400,300,280,80],[800,300,280,80],[1200,300,280,80],[1600,300,280,80],[2000,300,280,80]],
    [[350,720,100,1],[750,720,100,0],[1150,720,100,1],[1550,720,100,0],[1950,720,100,1],[2350,720,100,0]],
    [[300,560,'hedgehog',70],[700,560,'koopa',70],[1100,560,'hedgehog',70],[1500,560,'koopa',70],[1900,560,'hedgehog',70],[2300,560,'koopa',70]],
    [[170,680,60],[500,400,70],[900,400,70],[1300,400,70],[1700,400,70],[2100,400,70]],
    [[300,510],[700,510],[1100,510],[1500,510],[1900,510],[2300,510],[540,250],[940,250],[1340,250],[1740,250],[2140,250]],
    [2750,220],
    [[250,700,'question',1],[650,700,'brick',2],[1050,700,'question',1],[1450,700,'brick',2],[1850,700,'question',1],[2250,700,'brick',2],[450,440,'brick',2],[850,440,'question',1],[1250,440,'brick',2],[1650,440,'question',1],[2050,440,'brick',2]],
    [[100,820,560,70],[650,560,300,70],[1050,560,300,70],[1450,560,300,70],[1850,560,300,70],[2250,560,300,70]]],
  // L8：极限3层
  [3200,
    [[0,820,3100,100],[160,560,240,80],[520,560,240,80],[880,560,240,80],[1240,560,240,80],[1600,560,240,80],[1960,560,240,80],[2320,560,240,80],[2680,560,240,80],[340,300,240,80],[700,300,240,80],[1060,300,240,80],[1420,300,240,80],[1780,300,240,80],[2140,300,240,80],[2500,300,240,80]],
    [[280,720,100,1],[640,720,100,1],[1000,720,100,0],[1360,720,100,1],[1720,720,100,0],[2080,720,100,1],[2440,720,100,0],[2800,720,100,1]],
    [[220,560,'koopa',70],[580,560,'hedgehog',70],[940,560,'koopa',70],[1300,560,'hedgehog',70],[1660,560,'koopa',70],[2020,560,'hedgehog',70],[2380,560,'koopa',70],[2740,560,'hedgehog',70]],
    [[130,680,60],[460,400,70],[820,400,70],[1180,400,70],[1540,400,70],[1900,400,70],[2260,400,70],[2620,400,70]],
    [[220,510],[580,510],[940,510],[1300,510],[1660,510],[2020,510],[2380,510],[2740,510],[460,250],[820,250],[1180,250],[1540,250],[1900,250],[2260,250],[2620,250]],
    [2950,220],
    [[200,700,'brick',2],[560,700,'question',1],[920,700,'brick',2],[1280,700,'question',1],[1640,700,'brick',2],[2000,700,'question',1],[2360,700,'brick',2],[2720,700,'question',1],[400,440,'question',1],[760,440,'brick',2],[1120,440,'question',1],[1480,440,'brick',2],[1840,440,'question',1],[2200,440,'brick',2],[2560,440,'question',1]],
    [[70,820,560,70],[580,560,300,70],[940,560,300,70],[1300,560,300,70],[1660,560,300,70],[2020,560,300,70],[2380,560,300,70],[2740,560,300,70]]],
  // L9：终极挑战
  [3400,
    [[0,820,3300,100],[140,560,220,80],[480,560,220,80],[820,560,220,80],[1160,560,220,80],[1500,560,220,80],[1840,560,220,80],[2180,560,220,80],[2520,560,220,80],[2860,560,220,80],[310,300,220,80],[650,300,220,80],[990,300,220,80],[1330,300,220,80],[1670,300,220,80],[2010,300,220,80],[2350,300,220,80],[2690,300,220,80]],
    [[260,720,100,1],[600,720,100,0],[940,720,100,1],[1280,720,100,0],[1620,720,100,1],[1960,720,100,0],[2300,720,100,1],[2640,720,100,0],[2980,720,100,1]],
    [[200,560,'hedgehog',60],[540,560,'koopa',60],[880,560,'hedgehog',60],[1220,560,'koopa',60],[1560,560,'hedgehog',60],[1900,560,'koopa',60],[2240,560,'hedgehog',60],[2580,560,'koopa',60],[2920,560,'hedgehog',60]],
    [[110,680,60],[400,400,70],[740,400,70],[1080,400,70],[1420,400,70],[1760,400,70],[2100,400,70],[2440,400,70],[2780,400,70]],
    [[200,510],[540,510],[880,510],[1220,510],[1560,510],[1900,510],[2240,510],[2580,510],[2920,510],[400,250],[740,250],[1080,250],[1420,250],[1760,250],[2100,250],[2440,250],[2780,250]],
    [3150,220],
    [[180,700,'question',1],[520,700,'brick',2],[860,700,'question',1],[1200,700,'brick',2],[1540,700,'question',1],[1880,700,'brick',2],[2220,700,'question',1],[2560,700,'brick',2],[2900,700,'question',1],[360,440,'brick',2],[700,440,'question',1],[1040,440,'brick',2],[1380,440,'question',1],[1720,440,'brick',2],[2060,440,'question',1],[2400,440,'brick',2],[2740,440,'question',1]],
    [[60,820,560,70],[540,560,300,70],[880,560,300,70],[1220,560,300,70],[1560,560,300,70],[1900,560,300,70],[2240,560,300,70],[2580,560,300,70],[2920,560,300,70]]],
  // L10：最终考验
  [3600,
    [[0,820,3500,100],[120,560,200,80],[440,560,200,80],[760,560,200,80],[1080,560,200,80],[1400,560,200,80],[1720,560,200,80],[2040,560,200,80],[2360,560,200,80],[2680,560,200,80],[3000,560,200,80],[280,300,200,80],[600,300,200,80],[920,300,200,80],[1240,300,200,80],[1560,300,200,80],[1880,300,200,80],[2200,300,200,80],[2520,300,200,80],[2840,300,200,80]],
    [[240,720,100,1],[560,720,100,1],[880,720,100,0],[1200,720,100,1],[1520,720,100,0],[1840,720,100,1],[2160,720,100,0],[2480,720,100,1],[2800,720,100,0],[3120,720,100,1]],
    [[180,560,'koopa',60],[500,560,'hedgehog',60],[820,560,'koopa',60],[1140,560,'hedgehog',60],[1460,560,'koopa',60],[1780,560,'hedgehog',60],[2100,560,'koopa',60],[2420,560,'hedgehog',60],[2740,560,'koopa',60],[3060,560,'hedgehog',60]],
    [[90,680,60],[360,400,70],[680,400,70],[1000,400,70],[1320,400,70],[1640,400,70],[1960,400,70],[2280,400,70],[2600,400,70],[2920,400,70]],
    [[180,510],[500,510],[820,510],[1140,510],[1460,510],[1780,510],[2100,510],[2420,510],[2740,510],[3060,510],[360,250],[680,250],[1000,250],[1320,250],[1640,250],[1960,250],[2280,250],[2600,250],[2920,250]],
    [3350,220],
    [[160,700,'brick',2],[480,700,'question',1],[800,700,'brick',2],[1120,700,'question',1],[1440,700,'brick',2],[1760,700,'question',1],[2080,700,'brick',2],[2400,700,'question',1],[2720,700,'brick',2],[3040,700,'question',1],[320,440,'question',1],[640,440,'brick',2],[960,440,'question',1],[1280,440,'brick',2],[1600,440,'question',1],[1920,440,'brick',2],[2240,440,'question',1],[2560,440,'brick',2],[2880,440,'question',1]],
    [[50,820,560,70],[500,560,300,70],[820,560,300,70],[1140,560,300,70],[1460,560,300,70],[1780,560,300,70],[2100,560,300,70],[2420,560,300,70],[2740,560,300,70],[3060,560,300,70]]],
];

/* ═══════════════════════════════════════════════════════════════
   CASUAL MODE — Runner
   ═══════════════════════════════════════════════════════════════ */
const CasualMode = {
  dino: null, obstacles: [], tomatoes: [], speed: 4, baseSpeed: 4,
  spawnTimer: 0, tomTimer: 0, frame: 0, flying: false, flyTimer: 0, flyCD: 0,
  cameraX: 0, gameOver: false, won: false, bgOffset: 0, vx: 0, jumpHeld: false,

  init() {
    this.dino = { x: 150, y: GROUND_Y - 155, w: 130, h: 155, vy: 0, jumping: false, squash: 0, squashVel: 0, facing: 'right' };
    this.obstacles = []; this.tomatoes = [];
    this.speed = this.baseSpeed = 4;
    this.spawnTimer = 90; this.tomTimer = 200; this.frame = 0;
    this.flying = false; this.flyTargetY = 180;
    this.cameraX = 0; this.gameOver = false; this.won = false;
    this.vx = 0; this.jumpHeld = false;
    score = 0; resetShields();
    scoreEl.hidden = false; levelIndicator.hidden = true;
    flightBtn.hidden = false;
    scoreCurrent.textContent = 0; scoreTarget.textContent = targetScore;
    joyMode = 'horizontal';
  },

  onJump() {
    if (this.gameOver) return;
    if (this.flying) return;
    if (!this.dino.jumping) {
      this.dino.vy = -15.5; this.dino.jumping = true;
      this.dino.squashVel = -0.10; // 弹簧冲量：起跳拉伸
      this.jumpHeld = true;
    }
  },

  onJumpRelease() { this.jumpHeld = false; },

  activateFlight() {
    if (this.gameOver) return;
    if (this.flying) {
      // 取消飞行：掉到地面
      this.flying = false;
      this.dino.jumping = true;
      this.dino.vy = 3;
      spawnParticles(this.dino.x + this.dino.w / 2, this.dino.y + this.dino.h / 2, '#1989fa', 10);
      playSfx('coin');
    } else {
      // 进入飞行：升到固定高度悬浮，只能左右移动
      this.flying = true;
      this.dino.jumping = false;
      this.dino.vy = 0;
      this.flyTargetY = 180; // 悬浮在上空的目标高度
      spawnParticles(this.dino.x + this.dino.w / 2, this.dino.y + this.dino.h / 2, '#1989fa', 18);
      spawnPopup(this.dino.x + this.dino.w / 2, this.dino.y - 10, t('flight'), '#1989fa');
      playSfx('coin');
    }
  },

  spawnObstacle() {
    const isBat = Math.random() < 0.35;
    if (isBat) {
      const y = 400 + Math.random() * 200;
      this.obstacles.push({ type: 'bat', x: W + 50, y: y, w: 90, h: 70, vx: -this.speed, frame: 0 });
    } else {
      const h = 50 + Math.random() * 18;
      this.obstacles.push({ type: 'hedgehog', x: W + 50, y: GROUND_Y - h, w: 75, h: h, vx: -this.speed, frame: 0 });
    }
  },

  spawnTomato() {
    const y = 380 + Math.random() * 240;
    this.tomatoes.push({ x: W + 30, y: y, size: 60, vx: -this.speed, collected: false, frame: 0 });
  },

  update() {
    if (this.gameOver) return;
    this.frame++;
    this.speed = this.baseSpeed + this.frame * 0.0008;
    this.bgOffset = (this.bgOffset + this.speed) % 1600;

    // Flight — 切换式悬浮：固定在上空，只能左右移动，再按一次落地
    if (this.flying) {
      // 平滑升到悬浮目标高度
      const targetY = this.flyTargetY || 180;
      this.dino.y += (targetY - this.dino.y) * 0.12;
      if (Math.abs(this.dino.y - targetY) < 0.5) this.dino.y = targetY;
      this.dino.vy = 0;
      this.dino.jumping = false;
      // 悬浮时轻微上下浮动效果
      this.dino.y += Math.sin(this.frame * 0.06) * 1.5;
    } else {
      // Variable jump gravity (Mario-style): lower gravity while ascending and holding jump
      // 调低重力增强滞空感，按住跳跃键时上升更轻盈
      const grav = (this.dino.vy < 0 && this.jumpHeld) ? 0.18 : 0.42;
      this.dino.vy += grav;
      if (this.dino.vy > 16) this.dino.vy = 16; // terminal velocity
      this.dino.y += this.dino.vy;
      if (this.dino.y >= GROUND_Y - this.dino.h) {
        this.dino.y = GROUND_Y - this.dino.h;
        if (this.dino.jumping) { this.dino.squashVel = 0.08; } // 弹簧冲量：落地压缩
        this.dino.vy = 0; this.dino.jumping = false;
      }
    }
    // 飞行按钮状态反馈：飞行中高亮
    flightBtn.style.opacity = this.flying ? '1' : '0.85';
    flightBtn.style.transform = this.flying ? 'scale(1.15)' : 'scale(1)';
    flightBtn.style.boxShadow = this.flying ? '0 0 16px rgba(25,137,250,0.6)' : 'none';

    // Smooth horizontal movement (acceleration/deceleration)
    const targetVx = moveX * 5;
    this.vx += (targetVx - this.vx) * 0.2;
    this.dino.x += this.vx;
    if (moveX < 0) this.dino.facing = 'left';
    else if (moveX > 0) this.dino.facing = 'right';
    this.dino.x = Math.max(50, Math.min(450, this.dino.x));

    // 弹簧物理：squash 自然振荡衰减
    this.dino.squashVel += -this.dino.squash * 0.18 - this.dino.squashVel * 0.80;
    this.dino.squash += this.dino.squashVel;
    if (Math.abs(this.dino.squash) < 0.001 && Math.abs(this.dino.squashVel) < 0.001) {
      this.dino.squash = 0; this.dino.squashVel = 0;
    }

    // Spawn
    this.spawnTimer--;
    if (this.spawnTimer <= 0) {
      this.spawnObstacle();
      this.spawnTimer = Math.max(55, 100 - this.frame * 0.008);
    }
    this.tomTimer--;
    if (this.tomTimer <= 0) { this.spawnTomato(); this.tomTimer = 250 + Math.random() * 200; }

    // Update obstacles
    const dinoBox = { x: this.dino.x + 40, y: this.dino.y + 30, w: this.dino.w - 80, h: this.dino.h - 50 };
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.x += o.vx; o.vx = -this.speed; o.frame++;
      const oBox = { x: o.x + 8, y: o.y + 4, w: o.w - 16, h: o.h - 8 };
      if (!o.passed && o.x + o.w < this.dino.x) {
        o.passed = true;
        if (o.type === 'hedgehog' && !this.flying) {
          score++; scoreCurrent.textContent = score;
          spawnPopup(o.x + o.w / 2, o.y - 10, t('score_pop'), '#07c160');
          spawnParticles(o.x + o.w / 2, o.y + o.h / 2, '#07c160', 6);
          if (score >= targetScore) { this.won = true; this.endGame('victory'); return; }
        }
      }
      if (!this.flying && aabb(dinoBox, oBox)) {
        if (useShield()) {
          spawnPopup(this.dino.x + this.dino.w / 2, this.dino.y, t('shield_pop'), '#ff6a00');
          spawnParticles(o.x + o.w / 2, o.y + o.h / 2, '#ff6a00', 12);
          screenShake = 8;
          this.obstacles.splice(i, 1);
        } else {
          screenShake = 15;
          spawnParticles(this.dino.x + this.dino.w / 2, this.dino.y + this.dino.h / 2, '#e64340', 15);
          this.endGame('defeat'); return;
        }
      }
      if (o.x + o.w < -100) this.obstacles.splice(i, 1);
    }

    // Update tomatoes
    for (let i = this.tomatoes.length - 1; i >= 0; i--) {
      const tm = this.tomatoes[i];
      tm.x += tm.vx; tm.vx = -this.speed; tm.frame++;
      const tmBox = { x: tm.x, y: tm.y, w: tm.size, h: tm.size };
      if (!tm.collected && (this.flying || aabb(dinoBox, tmBox))) {
        tm.collected = true; addShield();
        spawnPopup(tm.x + tm.size / 2, tm.y, shields > 1 ? t('shield_pop_multi', { n: shields }) : t('shield_pop'), '#ff6a00');
        spawnParticles(tm.x + tm.size / 2, tm.y + tm.size / 2, '#ff4444', 10);
        this.tomatoes.splice(i, 1); continue;
      }
      if (tm.x + tm.size < -100) this.tomatoes.splice(i, 1);
    }
    updatePopups();
  },

  endGame(result) {
    this.gameOver = true;
    endGame(result);
  },

  render() {
    ctx.save();
    applyShake();
    // Sky gradient — 星露谷柔和清晨
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#A8D8EA');
    sky.addColorStop(0.4, '#C5E8F5');
    sky.addColorStop(0.75, '#E8F4EC');
    sky.addColorStop(1, '#F5F0E1');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // 柔和远山剪影
    ctx.fillStyle = 'rgba(180,200,210,0.4)';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y - 60);
    for (let x = 0; x <= W; x += 80) {
      ctx.quadraticCurveTo(x + 40, GROUND_Y - 100 - Math.sin(x * 0.01) * 20, x + 80, GROUND_Y - 60);
    }
    ctx.lineTo(W, GROUND_Y); ctx.lineTo(0, GROUND_Y); ctx.closePath();
    ctx.fill();
    drawClouds(this.bgOffset, 0.6);

    // Ground — 柔和草地
    const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    groundGrad.addColorStop(0, '#9CCC65');
    groundGrad.addColorStop(0.15, '#8BC34A');
    groundGrad.addColorStop(1, '#7CB342');
    ctx.fillStyle = groundGrad; ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    // 草地顶部柔和波浪
    ctx.fillStyle = '#AED581';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= W; x += 12) {
      ctx.lineTo(x, GROUND_Y - 2 + Math.sin((x + this.bgOffset) * 0.05) * 2);
    }
    ctx.lineTo(W, GROUND_Y + 6); ctx.lineTo(0, GROUND_Y + 6); ctx.closePath();
    ctx.fill();
    // 草地纹理小点
    ctx.fillStyle = 'rgba(104,159,56,0.3)';
    for (let i = 0; i < W; i += 35) {
      const gx = ((i - this.bgOffset * 0.8) % W + W) % W;
      ctx.beginPath();
      ctx.arc(gx, GROUND_Y + 18 + (i % 20), 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Obstacles
    this.obstacles.forEach(o => {
      if (o.type === 'hedgehog') drawHedgehog(o.x, o.y, o.w, o.h, o.frame);
      else drawBat(o.x, o.y, o.w, o.h, o.frame);
    });
    // Tomatoes
    this.tomatoes.forEach(tm => drawTomato(tm.x, tm.y, tm.size, tm.frame));
    // Dino
    if (this.flying) {
      ctx.save(); ctx.fillStyle = '#1989fa';
      ctx.beginPath();
      ctx.moveTo(this.dino.x + 20, this.dino.y + this.dino.h - 20);
      ctx.lineTo(this.dino.x + this.dino.w - 20, this.dino.y + this.dino.h - 40);
      ctx.lineTo(this.dino.x + this.dino.w - 60, this.dino.y + this.dino.h - 10);
      ctx.fill();
      ctx.restore();
    }
    drawDino(this.dino.x, this.dino.y, this.dino.w, this.dino.h, this.dino.facing, this.dino.squash,
      { moving: true, onGround: !this.dino.jumping && !this.flying, speed: this.speed / 4, vy: this.dino.vy });
    if (shields > 0) drawShieldAura(this.dino.x + 40, this.dino.y + 30, this.dino.w - 80, this.dino.h - 50, this.frame);
    drawParticles();
    drawPopups();
    ctx.restore();
  },

  cleanup() { flightBtn.hidden = true; }
};

/* ═══════════════════════════════════════════════════════════════
   NOVICE MODE — Maze
   ═══════════════════════════════════════════════════════════════ */
const NoviceMode = {
  grid: null, dino: null, hedgehogs: [], bats: [], tomatoes: [],
  frame: 0, gameOver: false, won: false, goalGX: 0, goalGY: 0,

  init() {
    const goal = MAZE_GOALS[levelIdx % MAZE_GOALS.length];
    this.grid = generateMaze(levelIdx * 7 + 42, goal.gx, goal.gy);
    const ents = buildMazeEntities(this.grid, levelIdx * 7 + 42, goal.gx, goal.gy);
    this.hedgehogs = ents.hedgehogs.map(h => ({
      ...h, x: MAZE_OX + h.gx * CELL + 3, y: MAZE_OY + h.gy * CELL + 3,
      w: CELL - 6, h: CELL - 6, startGX: h.gx, startGY: h.gy, progress: 0
    }));
    this.bats = ents.bats;
    this.tomatoes = ents.tomatoes.map(t => ({
      ...t, x: MAZE_OX + t.gx * CELL + 6, y: MAZE_OY + t.gy * CELL + 6,
      size: CELL - 12, frame: 0
    }));
    // 恐龙放在起点大厅中央（col=1, row=2）
    this.dino = { x: MAZE_OX + CELL + 6, y: MAZE_OY + CELL * 2 + 4, w: CELL - 12, h: CELL - 10, facing: 'right' };
    this.frame = 0; this.gameOver = false; this.won = false;
    this.goalGX = goal.gx; this.goalGY = goal.gy;
    resetShields();
    scoreEl.hidden = true;
    levelIndicator.hidden = false;
    levelNameEl.textContent = t('level_n', { n: levelIdx + 1 });
    joyMode = 'full';
  },

  canMoveTo(nx, ny) {
    const d = this.dino;
    const corners = [
      [nx + 2, ny + 2], [nx + d.w - 2, ny + 2],
      [nx + 2, ny + d.h - 2], [nx + d.w - 2, ny + d.h - 2]
    ];
    for (const [px, py] of corners) {
      const gx = Math.floor((px - MAZE_OX) / CELL);
      const gy = Math.floor((py - MAZE_OY) / CELL);
      if (gx < 0 || gx >= MAZE_COLS || gy < 0 || gy >= MAZE_ROWS) return false;
      if (this.grid[gy][gx] === 1) return false;
    }
    return true;
  },

  onJump() { /* maze has no jump */ },

  update() {
    if (this.gameOver) return;
    this.frame++;
    const speed = 4;
    const d = this.dino;
    let dx = 0, dy = 0;
    if (moveX < 0 || keys['ArrowLeft'] || keys['KeyA']) { dx = -speed; d.facing = 'left'; }
    if (moveX > 0 || keys['ArrowRight'] || keys['KeyD']) { dx = speed; d.facing = 'right'; }
    if (moveY < 0 || keys['ArrowUp'] || keys['KeyW']) dy = -speed;
    if (moveY > 0 || keys['ArrowDown'] || keys['KeyS']) dy = speed;
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
    if (dx !== 0 && this.canMoveTo(d.x + dx, d.y)) d.x += dx;
    if (dy !== 0 && this.canMoveTo(d.x, d.y + dy)) d.y += dy;

    // Update hedgehogs
    this.hedgehogs.forEach(h => {
      h.progress += 0.015 * h.dir;
      if (h.progress >= h.range - 1) { h.progress = h.range - 1; h.dir = -1; }
      if (h.progress <= 0) { h.progress = 0; h.dir = 1; }
      if (h.axis === 'h') { h.x = MAZE_OX + (h.startGX + h.progress) * CELL + 3; }
      else { h.y = MAZE_OY + (h.startGY + h.progress) * CELL + 3; }
    });

    // Update bats
    this.bats.forEach(b => {
      b.x += b.vx; b.y += b.vy; b.frame = (b.frame || 0) + 1;
      if (b.x < MAZE_OX + 10 || b.x + b.w > MAZE_OX + MAZE_W - 10) b.vx *= -1;
      if (b.y < MAZE_OY + 10 || b.y + b.h > MAZE_OY + MAZE_H - 10) b.vy *= -1;
    });

    // Tomato collection
    const dBox = { x: d.x, y: d.y, w: d.w, h: d.h };
    for (let i = this.tomatoes.length - 1; i >= 0; i--) {
      const tm = this.tomatoes[i];
      tm.frame++;
      if (aabb(dBox, { x: tm.x, y: tm.y, w: tm.size, h: tm.size })) {
        addShield();
        spawnPopup(tm.x + tm.size / 2, tm.y, shields > 1 ? t('shield_pop_multi', { n: shields }) : t('shield_pop'), '#ff6a00');
        spawnParticles(tm.x + tm.size / 2, tm.y + tm.size / 2, '#ff4444', 8);
        this.tomatoes.splice(i, 1);
      }
    }

    // Hedgehog collision
    for (let i = this.hedgehogs.length - 1; i >= 0; i--) {
      const h = this.hedgehogs[i];
      if (aabb(dBox, h)) {
        if (useShield()) {
          spawnPopup(d.x + d.w / 2, d.y, t('shield_pop'), '#ff6a00');
          spawnParticles(h.x + h.w / 2, h.y + h.h / 2, '#ff6a00', 10);
          screenShake = 6;
          this.hedgehogs.splice(i, 1);
        }
        else { screenShake = 12; spawnParticles(d.x + d.w / 2, d.y + d.h / 2, '#e64340', 12); this.endGame('defeat'); return; }
      }
    }
    // Bat collision
    for (let i = this.bats.length - 1; i >= 0; i--) {
      const b = this.bats[i];
      if (aabb(dBox, b)) {
        if (useShield()) {
          spawnPopup(d.x + d.w / 2, d.y, t('shield_pop'), '#ff6a00');
          spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#ff6a00', 10);
          screenShake = 6;
          this.bats.splice(i, 1);
        }
        else { screenShake = 12; spawnParticles(d.x + d.w / 2, d.y + d.h / 2, '#e64340', 12); this.endGame('defeat'); return; }
      }
    }

    // Goal check
    const gx = Math.floor((d.x + d.w / 2 - MAZE_OX) / CELL);
    const gy = Math.floor((d.y + d.h / 2 - MAZE_OY) / CELL);
    if (gx === this.goalGX && gy === this.goalGY) {
      spawnParticles(d.x + d.w / 2, d.y + d.h / 2, '#07c160', 20);
      this.won = true; this.endGame('victory'); return;
    }
    updatePopups();
  },

  endGame(result) { this.gameOver = true; endGame(result); },

  render() {
    ctx.save();
    applyShake();
    // Background — 柔和晨雾
    const mazeBg = ctx.createLinearGradient(0, 0, 0, H);
    mazeBg.addColorStop(0, '#E8F0E8');
    mazeBg.addColorStop(1, '#F5F0E1');
    ctx.fillStyle = mazeBg; ctx.fillRect(0, 0, W, H);
    drawClouds(this.frame * 0.5, 0.4);
    // Maze area background
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.roundRect(MAZE_OX - 6, MAZE_OY - 6, MAZE_W + 12, MAZE_H + 12, 12);
    ctx.fill();
    // Walls — 柔和苔藓绿石墙
    for (let y = 0; y < MAZE_ROWS; y++) {
      for (let x = 0; x < MAZE_COLS; x++) {
        if (this.grid[y][x] === 1) {
          const wx = MAZE_OX + x * CELL, wy = MAZE_OY + y * CELL;
          // 墙体主体
          ctx.fillStyle = '#8FA88B';
          ctx.beginPath();
          ctx.roundRect(wx + 1, wy + 1, CELL - 2, CELL - 2, 6);
          ctx.fill();
          // 顶部高光
          ctx.fillStyle = '#A8C0A3';
          ctx.beginPath();
          ctx.roundRect(wx + 2, wy + 2, CELL - 4, CELL / 2 - 3, 5);
          ctx.fill();
          // 微妙纹理点
          ctx.fillStyle = 'rgba(100,120,95,0.2)';
          ctx.beginPath();
          ctx.arc(wx + CELL * 0.3, wy + CELL * 0.65, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(wx + CELL * 0.7, wy + CELL * 0.75, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // Goal (balloon at bottom-right)
    drawBalloon(MAZE_OX + this.goalGX * CELL + CELL / 2, MAZE_OY + this.goalGY * CELL - 10, this.frame);
    // Start marker (安全大厅)
    ctx.fillStyle = 'rgba(7,193,96,0.18)';
    ctx.fillRect(MAZE_OX + MAZE_START_X0 * CELL, MAZE_OY + MAZE_START_Y0 * CELL,
      MAZE_START_W * CELL, MAZE_START_H * CELL);
    ctx.strokeStyle = 'rgba(7,193,96,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(MAZE_OX + MAZE_START_X0 * CELL + 1, MAZE_OY + MAZE_START_Y0 * CELL + 1,
      MAZE_START_W * CELL - 2, MAZE_START_H * CELL - 2);
    ctx.setLineDash([]);
    // Tomatoes
    this.tomatoes.forEach(tm => drawTomato(tm.x, tm.y, tm.size, tm.frame));
    // Hedgehogs
    this.hedgehogs.forEach(h => drawHedgehog(h.x, h.y, h.w, h.h, this.frame));
    // Bats
    this.bats.forEach(b => drawBat(b.x, b.y, b.w, b.h, this.frame));
    // Dino
    const mazeMoving = (moveX !== 0 || moveY !== 0 || keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowLeft'] || keys['ArrowRight'] ||
      keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD']);
    drawDino(this.dino.x, this.dino.y, this.dino.w, this.dino.h, this.dino.facing, 0,
      { moving: mazeMoving, onGround: true, speed: 1 });
    if (shields > 0) drawShieldAura(this.dino.x, this.dino.y, this.dino.w, this.dino.h, this.frame);
    drawParticles();
    drawPopups();
    ctx.restore();
  },

  cleanup() {}
};

/* ═══════════════════════════════════════════════════════════════
   HOOKED MODE — Platformer
   ═══════════════════════════════════════════════════════════════ */
const HookedMode = {
  level: null, ground: [], plats: [], pipes: [], enemies: [], bats: [], tomatoes: [],
  blocks: [], ponds: [], piranhas: [],
  dino: null, cameraX: 0, frame: 0, gameOver: false, won: false, levelW: 0, balloon: null,
  jumpHeld: false,

  init(levelIdx) {
    const L = HOOKED_LEVELS[levelIdx % HOOKED_LEVELS.length];
    this.levelW = L[0];
    this.ground = L[1].map(g => ({ x: g[0], y: g[1], w: g[2] }));
    this.plats = L[2].map(p => ({ x: p[0], y: p[1], w: p[2], type: p[3] || 'grass' }));
    this.pipes = L[3].map(p => ({ x: p[0], y: GROUND_Y - p[1], w: 50, h: p[1], hasPiranha: p[2] || 0 }));
    this.enemies = L[4].map(e => ({ x: e[0], y: GROUND_Y - (e[0] === 'koopa' ? 56 : 54), type: e[1], w: e[1] === 'koopa' ? 60 : 56, h: e[1] === 'koopa' ? 56 : 54, range: e[2], startX: e[0], dir: 1, frame: 0 })).filter(e => e.startX > 400);
    this.bats = L[5].map(b => ({ x: b[0], y: b[1], w: 72, h: 54, range: b[2], startX: b[0], dir: 1, frame: 0 })).filter(b => b.startX > 400);
    this.tomatoes = L[6].map(t => ({ x: t[0], y: t[1], size: 50, collected: false, frame: 0 }));
    this.balloon = { x: L[7][0], y: Math.max(340, L[7][1]) };
    this.blocks = (L[8] || []).map(b => ({ x: b[0], y: b[1], type: b[2], count: b[3] || 1, size: 48, used: false, hitFrame: 0 }));
    this.ponds = (L[9] || []).map(p => ({ x: p[0], w: p[1], y: GROUND_Y - 8 }));
    // Piranha plants from pipes
    this.piranhas = this.pipes.filter(p => p.hasPiranha).map(p => ({ x: p.x, y: p.y, w: 50, h: 80, emerge: 0, dir: 1, frame: 0 }));
    this.dino = { x: 100, y: GROUND_Y - 84, w: 70, h: 84, vx: 0, vy: 0, onGround: false, facing: 'right', squash: 0, squashVel: 0 };
    this.cameraX = 0; this.frame = 0; this.gameOver = false; this.won = false; this.jumpHeld = false;
    resetShields();
    scoreEl.hidden = true;
    levelIndicator.hidden = false;
    levelNameEl.textContent = t('level_n', { n: levelIdx + 1 });
    joyMode = 'horizontal';
  },

  onGroundAt(x, y) {
    for (const g of this.ground) {
      if (x >= g.x && x <= g.x + g.w && Math.abs(y - g.y) < 4) return g.y;
    }
    return null;
  },

  jump() {
    const d = this.dino;
    if (d.onGround) { d.vy = -12; d.onGround = false; d.squashVel = -0.1; playSfx('jump'); }
  },

  onJump() { if (this.gameOver) return; this.jumpHeld = true; this.jump(); },
  onJumpRelease() { this.jumpHeld = false; },

  update() {
    if (this.gameOver) return;
    this.frame++;
    const d = this.dino;
    const targetVx = (moveX < 0 || keys['ArrowLeft'] || keys['KeyA']) ? -4.5 :
                     (moveX > 0 || keys['ArrowRight'] || keys['KeyD']) ? 4.5 : 0;
    d.vx += (targetVx - d.vx) * 0.22;
    if (d.vx < -0.5) d.facing = 'left';
    else if (d.vx > 0.5) d.facing = 'right';
    // Pond slowdown
    let inPond = false;
    for (const p of this.ponds) {
      if (d.x + d.w > p.x && d.x < p.x + p.w && d.y + d.h > p.y) { inPond = true; break; }
    }
    const speedMul = inPond ? 0.5 : 1;
    d.vx *= speedMul;
    const grav = (d.vy < 0 && this.jumpHeld) ? 0.28 : 0.55;
    d.vy += grav * (inPond ? 0.6 : 1);
    if (d.vy > 14) d.vy = 14;

    d.x += d.vx;
    d.x = Math.max(0, Math.min(this.levelW - d.w, d.x));
    // Pipe horizontal collision
    this.pipes.forEach(p => {
      if (aabb(d, p)) {
        if (d.vx > 0) d.x = p.x - d.w;
        else if (d.vx < 0) d.x = p.x + p.w;
      }
    });
    // Block horizontal collision
    this.blocks.forEach(b => {
      for (let i = 0; i < b.count; i++) {
        const bx = b.x + i * b.size;
        const bb = { x: bx, y: b.y, w: b.size, h: b.size };
        if (aabb(d, bb)) {
          if (d.vx > 0) d.x = bb.x - d.w;
          else if (d.vx < 0) d.x = bb.x + bb.w;
        }
      }
    });

    const wasOnGround = d.onGround;
    d.y += d.vy;
    d.onGround = false;

    // Ground collision (varied height)
    for (const g of this.ground) {
      if (d.vy >= 0 && d.x + d.w > g.x + 2 && d.x < g.x + g.w - 2 &&
          d.y + d.h >= g.y && d.y + d.h <= g.y + 20) {
        d.y = g.y - d.h; d.vy = 0; d.onGround = true;
      }
    }
    // Platform collision
    this.plats.forEach(p => {
      if (d.vy >= 0 && d.x + d.w > p.x + 4 && d.x < p.x + p.w - 4 &&
          d.y + d.h >= p.y && d.y + d.h <= p.y + 18) {
        d.y = p.y - d.h; d.vy = 0; d.onGround = true;
      }
    });
    // Pipe top collision
    this.pipes.forEach(p => {
      if (d.vy >= 0 && d.x + d.w > p.x + 4 && d.x < p.x + p.w - 4 &&
          d.y + d.h >= p.y && d.y + d.h <= p.y + 16) {
        d.y = p.y - d.h; d.vy = 0; d.onGround = true;
      }
    });
    // Block collision (top and bottom)
    this.blocks.forEach(b => {
      for (let i = 0; i < b.count; i++) {
        const bx = b.x + i * b.size;
        // Top landing
        if (d.vy >= 0 && d.x + d.w > bx + 2 && d.x < bx + b.size - 2 &&
            d.y + d.h >= b.y && d.y + d.h <= b.y + 16) {
          d.y = b.y - d.h; d.vy = 0; d.onGround = true;
        }
        // Bottom hit (question block)
        if (d.vy < 0 && b.type === 'question' && !b.used &&
            d.x + d.w > bx + 2 && d.x < bx + b.size - 2 &&
            d.y <= b.y + b.size && d.y >= b.y + b.size - 12) {
          d.y = b.y + b.size; d.vy = 0; b.used = true; b.hitFrame = 10;
          addShield();
          spawnPopup(bx + b.size / 2 - this.cameraX, b.y - 10, shields > 1 ? t('shield_pop_multi', { n: shields }) : t('shield_pop'), '#ffd700');
          spawnParticles(bx + b.size / 2, b.y + b.size / 2, '#ffd700', 10);
          playSfx('coin');
        }
        // Bottom hit (brick block - just bump)
        if (d.vy < 0 && b.type === 'brick' &&
            d.x + d.w > bx + 2 && d.x < bx + b.size - 2 &&
            d.y <= b.y + b.size && d.y >= b.y + b.size - 12) {
          d.y = b.y + b.size; d.vy = 0; b.hitFrame = 6;
        }
      }
    });
    // Decrement hit frames
    this.blocks.forEach(b => { if (b.hitFrame > 0) b.hitFrame--; });

    if (d.onGround && !wasOnGround) d.squashVel = 0.08;
    d.squashVel += -d.squash * 0.18 - d.squashVel * 0.80;
    d.squash += d.squashVel;
    if (Math.abs(d.squash) < 0.001 && Math.abs(d.squashVel) < 0.001) { d.squash = 0; d.squashVel = 0; }

    this.cameraX = Math.max(0, Math.min(this.levelW - W, d.x - W / 3));

    // Enemies (hedgehog + koopa)
    this.enemies.forEach(e => {
      e.x += e.dir * (e.type === 'koopa' ? 1.8 : 1.5);
      e.frame++;
      // Stay on ground
      const gy = this.onGroundAt(e.x + e.w / 2, GROUND_Y);
      if (gy !== null) e.y = gy - e.h;
      if (e.x > e.startX + e.range) e.dir = -1;
      if (e.x < e.startX - e.range) e.dir = 1;
    });
    // Bats
    this.bats.forEach(b => { b.x += b.dir * 2; b.frame++;
      if (b.x > b.startX + b.range) b.dir = -1; if (b.x < b.startX - b.range) b.dir = 1; });
    // Piranhas
    this.piranhas.forEach(p => {
      p.frame++;
      // Emerge and retract cycle
      const cycle = (p.frame % 180) / 180;
      if (cycle < 0.3) p.emerge = cycle / 0.3;
      else if (cycle < 0.6) p.emerge = 1;
      else if (cycle < 0.8) p.emerge = 1 - (cycle - 0.6) / 0.2;
      else p.emerge = 0;
    });

    const dBox = { x: d.x + 5, y: d.y + 4, w: d.w - 10, h: d.h - 8 };
    // Tomatoes
    for (let i = this.tomatoes.length - 1; i >= 0; i--) {
      const tm = this.tomatoes[i]; tm.frame++;
      if (aabb(dBox, { x: tm.x, y: tm.y, w: tm.size, h: tm.size })) {
        addShield();
        spawnPopup(tm.x + tm.size / 2 - this.cameraX, tm.y, shields > 1 ? t('shield_pop_multi', { n: shields }) : t('shield_pop'), '#ff6a00');
        spawnParticles(tm.x + tm.size / 2, tm.y + tm.size / 2, '#ff4444', 8);
        this.tomatoes.splice(i, 1);
      }
    }
    // Enemies collision
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (aabb(dBox, { x: e.x + 4, y: e.y + 4, w: e.w - 8, h: e.h - 8 })) {
        if (useShield()) { spawnPopup(d.x + d.w / 2 - this.cameraX, d.y, t('shield_pop'), '#ff6a00');
          spawnParticles(e.x + e.w / 2, e.y + e.h / 2, '#ff6a00', 10); screenShake = 6; this.enemies.splice(i, 1); }
        else { screenShake = 12; spawnParticles(d.x + d.w / 2, d.y + d.h / 2, '#e64340', 12); this.endGame('defeat'); return; }
      }
    }
    // Bats collision
    for (let i = this.bats.length - 1; i >= 0; i--) {
      const b = this.bats[i];
      if (aabb(dBox, { x: b.x + 4, y: b.y + 4, w: b.w - 8, h: b.h - 8 })) {
        if (useShield()) { spawnPopup(d.x + d.w / 2 - this.cameraX, d.y, t('shield_pop'), '#ff6a00');
          spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#ff6a00', 10); screenShake = 6; this.bats.splice(i, 1); }
        else { screenShake = 12; spawnParticles(d.x + d.w / 2, d.y + d.h / 2, '#e64340', 12); this.endGame('defeat'); return; }
      }
    }
    // Piranha collision
    for (const p of this.piranhas) {
      if (p.emerge > 0.3 && aabb(dBox, { x: p.x + 8, y: p.y - p.h * p.emerge, w: p.w - 16, h: p.h * p.emerge })) {
        if (useShield()) { spawnPopup(d.x + d.w / 2 - this.cameraX, d.y, t('shield_pop'), '#ff6a00'); screenShake = 6; }
        else { screenShake = 12; spawnParticles(d.x + d.w / 2, d.y + d.h / 2, '#e64340', 12); this.endGame('defeat'); return; }
      }
    }
    // Fall death
    if (d.y > H + 80) { screenShake = 10; this.endGame('defeat'); return; }
    // Goal
    if (aabb(dBox, { x: this.balloon.x - 20, y: this.balloon.y - 20, w: 60, h: 80 })) {
      spawnParticles(this.balloon.x, this.balloon.y, '#07c160', 20);
      this.won = true; this.endGame('victory'); return;
    }
    updatePopups();
  },

  render() {
    const cam = this.cameraX;
    const d = this.dino;
    ctx.save();
    applyShake();
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#87CEEB'); sky.addColorStop(0.5, '#B0E0E6'); sky.addColorStop(1, '#98D8C8');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    drawClouds(this.frame * 0.3, 0.1);
    // Distant hills
    ctx.fillStyle = 'rgba(134, 196, 134, 0.4)';
    for (let i = 0; i < 6; i++) {
      const hx = (i * 400 - cam * 0.2) % (W + 400) - 200;
      ctx.beginPath();
      ctx.ellipse(hx, GROUND_Y + 20, 200, 120, 0, Math.PI, 0);
      ctx.fill();
    }

    // Ponds (液态流体脉冲光效)
    this.ponds.forEach(p => drawPond(p.x - cam, p.y, p.w, GROUND_Y + 40 - p.y, this.frame));

    // Ground (varied height)
    this.ground.forEach(g => drawGrassPlatform(g.x - cam, g.y, g.w, GROUND_Y + 60 - g.y));

    // Piranhas (先画食人花，管道后画，盖住茎部消除残影)
    this.piranhas.forEach(p => drawPiranha(p.x - cam, p.y, p.w, p.h, p.frame, p.emerge));

    // Pipes (后画管道，覆盖食人花下半部分)
    this.pipes.forEach(p => drawPipe(p.x - cam, p.y, p.w, p.h));

    // Platforms
    this.plats.forEach(p => {
      if (p.type === 'brick') {
        for (let bx = p.x; bx < p.x + p.w; bx += 48) {
          drawBrickBlock(bx - cam, p.y, Math.min(48, p.x + p.w - bx));
        }
      } else {
        drawGrassPlatform(p.x - cam, p.y, p.w, 24);
      }
    });

    // Blocks (bricks and question)
    this.blocks.forEach(b => {
      const yOff = b.hitFrame > 0 ? -4 : 0;
      for (let i = 0; i < b.count; i++) {
        const bx = b.x + i * b.size;
        if (b.type === 'brick') drawBrickBlock(bx - cam, b.y + yOff, b.size);
        else drawQuestionBlock(bx - cam, b.y + yOff, b.size, this.frame, b.used);
      }
    });

    // Balloon
    drawBalloon(this.balloon.x - cam + 20, this.balloon.y, this.frame);

    // Tomatoes
    this.tomatoes.forEach(tm => drawTomato(tm.x - cam, tm.y, tm.size, tm.frame));

    // Enemies
    this.enemies.forEach(e => {
      if (e.type === 'koopa') drawKoopa(e.x - cam, e.y, e.w, e.h, e.frame, e.dir);
      else drawNewHedgehog(e.x - cam, e.y, e.w, e.h, e.frame, e.dir);
    });

    // Bats
    this.bats.forEach(b => drawBat(b.x - cam, b.y, b.w, b.h, b.frame));

    // Dino
    drawDino(d.x - cam, d.y, d.w, d.h, d.facing, d.squash,
      { moving: Math.abs(d.vx) > 0.5, onGround: d.onGround, speed: Math.abs(d.vx) / 4.5, vy: d.vy });
    if (shields > 0) drawShieldAura(d.x - cam + 5, d.y + 4, d.w - 10, d.h - 8, this.frame);

    drawParticles();
    drawPopups();
    ctx.restore();
  },

  endGame(result) { this.gameOver = true; endGame(result); },
  cleanup() {}
};




/* ═══════════════════════════════════════════════════════════════
   EXPERT MODE — Multi-Layer Mario (多层马里奥)
   ═══════════════════════════════════════════════════════════════ */
const ExpertMode = {
  layers: [], pipes: [], elevators: [], enemies: [], bats: [], tomatoes: [],
  blocks: [], piranhas: [],
  dino: null, cameraX: 0, frame: 0, gameOver: false, won: false, levelW: 0, balloon: null,
  jumpHeld: false,

  init(levelIdx) {
    const L = EXPERT_LEVELS[levelIdx % EXPERT_LEVELS.length];
    this.levelW = L[0];
    this.layers = L[1].map(l => ({ x: l[0], y: l[1], w: l[2], h: l[3] || 80 }));
    this.pipes = L[2].map(p => ({ x: p[0], y: p[1], w: 50, h: p[2], hasPiranha: p[3] || 0 }));
    this.enemies = L[3].map(e => ({ x: e[0], y: e[1], type: e[2], w: e[2] === 'koopa' ? 56 : 52, h: e[2] === 'koopa' ? 52 : 50, range: e[3], startX: e[0], dir: 1, frame: 0, layerY: e[1] })).filter(e => e.startX > 400);
    this.bats = L[4].map(b => ({ x: b[0], y: b[1], w: 68, h: 50, range: b[2], startX: b[0], dir: 1, frame: 0 })).filter(b => b.startX > 400);
    this.tomatoes = L[5].map(t => ({ x: t[0], y: t[1], size: 46, collected: false, frame: 0 }));
    this.balloon = { x: L[6][0], y: Math.max(600, L[6][1]) };
    this.blocks = (L[7] || []).map(b => ({ x: b[0], y: b[1], type: b[2], count: b[3] || 1, size: 44, used: false, hitFrame: 0 }));
    this.elevators = (L[8] || []).map(e => ({ x: e[0], y: e[1], y0: e[1], y1: e[2], w: e[3], h: 14, state: 'idle', timer: 0 }));
    this.piranhas = this.pipes.filter(p => p.hasPiranha).map(p => ({ x: p.x, y: p.y, w: 50, h: 70, emerge: 0, frame: 0 }));
    this.dino = { x: 100, y: 740, w: 64, h: 76, vx: 0, vy: 0, onGround: false, facing: 'right', squash: 0, squashVel: 0 };
    this.cameraX = 0; this.frame = 0; this.gameOver = false; this.won = false; this.jumpHeld = false;
    resetShields();
    scoreEl.hidden = true;
    levelIndicator.hidden = false;
    levelNameEl.textContent = t('level_n', { n: levelIdx + 1 });
    joyMode = 'horizontal';
  },

  jump() {
    const d = this.dino;
    if (d.onGround) { d.vy = -11; d.onGround = false; d.squashVel = -0.1; playSfx('jump'); }
  },

  onJump() { if (this.gameOver) return; this.jumpHeld = true; this.jump(); },
  onJumpRelease() { this.jumpHeld = false; },

  update() {
    if (this.gameOver) return;
    this.frame++;
    const d = this.dino;
    const targetVx = (moveX < 0 || keys['ArrowLeft'] || keys['KeyA']) ? -4.2 :
                     (moveX > 0 || keys['ArrowRight'] || keys['KeyD']) ? 4.2 : 0;
    d.vx += (targetVx - d.vx) * 0.22;
    if (d.vx < -0.5) d.facing = 'left';
    else if (d.vx > 0.5) d.facing = 'right';
    const grav = (d.vy < 0 && this.jumpHeld) ? 0.26 : 0.52;
    d.vy += grav;
    if (d.vy > 14) d.vy = 14;

    // Update elevators FIRST
    let ridingElevator = null;
    this.elevators.forEach(el => {
      const prevY = el.y;
      if (el.state === 'idle') {
        if (d.vy >= 0 && d.x + d.w > el.x + 4 && d.x < el.x + el.w - 4 &&
            d.y + d.h >= el.y - 2 && d.y + d.h <= el.y + 12) el.state = 'rising';
      } else if (el.state === 'rising') {
        el.y -= 1.8;
        if (el.y <= el.y1) { el.y = el.y1; el.state = 'top'; el.timer = 150; }
      } else if (el.state === 'top') {
        el.timer--;
        if (el.timer <= 0) el.state = 'descending';
      } else if (el.state === 'descending') {
        el.y += 1.8;
        if (el.y >= el.y0) { el.y = el.y0; el.state = 'idle'; }
      }
      if (d.vy >= 0 && d.x + d.w > el.x + 4 && d.x < el.x + el.w - 4 &&
          d.y + d.h >= prevY - 4 && d.y + d.h <= prevY + 14) {
        d.y += (el.y - prevY);
        ridingElevator = el;
      }
    });

    d.x += d.vx;
    d.x = Math.max(0, Math.min(this.levelW - d.w, d.x));
    // Pipe horizontal collision
    this.pipes.forEach(p => {
      if (aabb(d, p)) {
        if (d.vx > 0) d.x = p.x - d.w;
        else if (d.vx < 0) d.x = p.x + p.w;
      }
    });
    // Block horizontal collision
    this.blocks.forEach(b => {
      for (let i = 0; i < b.count; i++) {
        const bx = b.x + i * b.size;
        const bb = { x: bx, y: b.y, w: b.size, h: b.size };
        if (aabb(d, bb)) {
          if (d.vx > 0) d.x = bb.x - d.w;
          else if (d.vx < 0) d.x = bb.x + bb.w;
        }
      }
    });

    const wasOnGround = d.onGround;
    d.y += d.vy;
    d.onGround = false;

    // Layer (thick grass platform) collision
    this.layers.forEach(l => {
      if (d.vy >= 0 && d.x + d.w > l.x + 4 && d.x < l.x + l.w - 4 &&
          d.y + d.h >= l.y && d.y + d.h <= l.y + 20) {
        d.y = l.y - d.h; d.vy = 0; d.onGround = true;
      }
    });
    // Elevator collision
    if (!ridingElevator) {
      this.elevators.forEach(el => {
        if (d.vy >= 0 && d.x + d.w > el.x + 4 && d.x < el.x + el.w - 4 &&
            d.y + d.h >= el.y && d.y + d.h <= el.y + 14 && d.y + d.h - d.vy < el.y + 4) {
          d.y = el.y - d.h; d.vy = 0; d.onGround = true;
        }
      });
    } else { d.onGround = true; d.vy = 0; }
    // Pipe top collision
    this.pipes.forEach(p => {
      if (d.vy >= 0 && d.x + d.w > p.x + 4 && d.x < p.x + p.w - 4 &&
          d.y + d.h >= p.y && d.y + d.h <= p.y + 16) {
        d.y = p.y - d.h; d.vy = 0; d.onGround = true;
      }
    });
    // Block collision
    this.blocks.forEach(b => {
      for (let i = 0; i < b.count; i++) {
        const bx = b.x + i * b.size;
        if (d.vy >= 0 && d.x + d.w > bx + 2 && d.x < bx + b.size - 2 &&
            d.y + d.h >= b.y && d.y + d.h <= b.y + 16) {
          d.y = b.y - d.h; d.vy = 0; d.onGround = true;
        }
        if (d.vy < 0 && b.type === 'question' && !b.used &&
            d.x + d.w > bx + 2 && d.x < bx + b.size - 2 &&
            d.y <= b.y + b.size && d.y >= b.y + b.size - 12) {
          d.y = b.y + b.size; d.vy = 0; b.used = true; b.hitFrame = 10;
          addShield();
          spawnPopup(bx + b.size / 2 - this.cameraX, b.y - 10, shields > 1 ? t('shield_pop_multi', { n: shields }) : t('shield_pop'), '#ffd700');
          spawnParticles(bx + b.size / 2, b.y + b.size / 2, '#ffd700', 10);
          playSfx('coin');
        }
        if (d.vy < 0 && b.type === 'brick' &&
            d.x + d.w > bx + 2 && d.x < bx + b.size - 2 &&
            d.y <= b.y + b.size && d.y >= b.y + b.size - 12) {
          d.y = b.y + b.size; d.vy = 0; b.hitFrame = 6;
        }
      }
    });
    this.blocks.forEach(b => { if (b.hitFrame > 0) b.hitFrame--; });

    if (d.onGround && !wasOnGround) d.squashVel = 0.08;
    d.squashVel += -d.squash * 0.18 - d.squashVel * 0.80;
    d.squash += d.squashVel;
    if (Math.abs(d.squash) < 0.001 && Math.abs(d.squashVel) < 0.001) { d.squash = 0; d.squashVel = 0; }

    this.cameraX = Math.max(0, Math.min(this.levelW - W, d.x - W / 3));

    // Enemies
    this.enemies.forEach(e => {
      e.x += e.dir * (e.type === 'koopa' ? 1.6 : 1.3);
      e.frame++;
      // Stay on layer
      e.y = e.layerY - e.h;
      if (e.x > e.startX + e.range) e.dir = -1;
      if (e.x < e.startX - e.range) e.dir = 1;
    });
    // Bats
    this.bats.forEach(b => { b.x += b.dir * 1.8; b.frame++;
      if (b.x > b.startX + b.range) b.dir = -1; if (b.x < b.startX - b.range) b.dir = 1; });
    // Piranhas
    this.piranhas.forEach(p => {
      p.frame++;
      const cycle = (p.frame % 180) / 180;
      if (cycle < 0.3) p.emerge = cycle / 0.3;
      else if (cycle < 0.6) p.emerge = 1;
      else if (cycle < 0.8) p.emerge = 1 - (cycle - 0.6) / 0.2;
      else p.emerge = 0;
    });

    const dBox = { x: d.x + 5, y: d.y + 4, w: d.w - 10, h: d.h - 8 };
    // Tomatoes
    for (let i = this.tomatoes.length - 1; i >= 0; i--) {
      const tm = this.tomatoes[i]; tm.frame++;
      if (aabb(dBox, { x: tm.x, y: tm.y, w: tm.size, h: tm.size })) {
        addShield();
        spawnPopup(tm.x + tm.size / 2 - this.cameraX, tm.y, shields > 1 ? t('shield_pop_multi', { n: shields }) : t('shield_pop'), '#ff6a00');
        spawnParticles(tm.x + tm.size / 2, tm.y + tm.size / 2, '#ff4444', 8);
        this.tomatoes.splice(i, 1);
      }
    }
    // Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (aabb(dBox, { x: e.x + 4, y: e.y + 4, w: e.w - 8, h: e.h - 8 })) {
        if (useShield()) { spawnPopup(d.x + d.w / 2 - this.cameraX, d.y, t('shield_pop'), '#ff6a00');
          spawnParticles(e.x + e.w / 2, e.y + e.h / 2, '#ff6a00', 10); screenShake = 6; this.enemies.splice(i, 1); }
        else { screenShake = 12; spawnParticles(d.x + d.w / 2, d.y + d.h / 2, '#e64340', 12); this.endGame('defeat'); return; }
      }
    }
    // Bats
    for (let i = this.bats.length - 1; i >= 0; i--) {
      const b = this.bats[i];
      if (aabb(dBox, { x: b.x + 4, y: b.y + 4, w: b.w - 8, h: b.h - 8 })) {
        if (useShield()) { spawnPopup(d.x + d.w / 2 - this.cameraX, d.y, t('shield_pop'), '#ff6a00');
          spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#ff6a00', 10); screenShake = 6; this.bats.splice(i, 1); }
        else { screenShake = 12; spawnParticles(d.x + d.w / 2, d.y + d.h / 2, '#e64340', 12); this.endGame('defeat'); return; }
      }
    }
    // Piranhas
    for (const p of this.piranhas) {
      if (p.emerge > 0.3 && aabb(dBox, { x: p.x + 8, y: p.y - p.h * p.emerge, w: p.w - 16, h: p.h * p.emerge })) {
        if (useShield()) { spawnPopup(d.x + d.w / 2 - this.cameraX, d.y, t('shield_pop'), '#ff6a00'); screenShake = 6; }
        else { screenShake = 12; spawnParticles(d.x + d.w / 2, d.y + d.h / 2, '#e64340', 12); this.endGame('defeat'); return; }
      }
    }
    // Fall death
    if (d.y > H + 80) { screenShake = 10; this.endGame('defeat'); return; }
    // Goal
    if (aabb(dBox, { x: this.balloon.x - 20, y: this.balloon.y - 20, w: 60, h: 80 })) {
      spawnParticles(this.balloon.x, this.balloon.y, '#07c160', 20);
      this.won = true; this.endGame('victory'); return;
    }
    updatePopups();
  },

  render() {
    const cam = this.cameraX;
    const d = this.dino;
    ctx.save();
    applyShake();
    // Sky — dusk
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#2D1B4E'); sky.addColorStop(0.4, '#4A2C6D'); sky.addColorStop(0.7, '#6B3F8F'); sky.addColorStop(1, '#8B5FA8');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 35; i++) {
      const sx = (i * 157 + 40) % W, sy = (i * 73 + 20) % (H * 0.5);
      const tw = 0.4 + 0.6 * Math.sin(this.frame * 0.04 + i);
      ctx.globalAlpha = tw * 0.7;
      ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    drawClouds(this.frame * 0.25, 0.08);

    // Layers (thick grass platforms)
    this.layers.forEach(l => drawGrassPlatform(l.x - cam, l.y, l.w, l.h));

    // Piranhas (先画食人花，管道后画，盖住茎部消除残影)
    this.piranhas.forEach(p => drawPiranha(p.x - cam, p.y, p.w, p.h, p.frame, p.emerge));

    // Pipes (后画管道，覆盖食人花下半部分)
    this.pipes.forEach(p => drawPipe(p.x - cam, p.y, p.w, p.h));

    // Blocks
    this.blocks.forEach(b => {
      const yOff = b.hitFrame > 0 ? -4 : 0;
      for (let i = 0; i < b.count; i++) {
        const bx = b.x + i * b.size;
        if (b.type === 'brick') drawBrickBlock(bx - cam, b.y + yOff, b.size);
        else drawQuestionBlock(bx - cam, b.y + yOff, b.size, this.frame, b.used);
      }
    });

    // Elevators
    this.elevators.forEach(el => {
      ctx.save();
      const eg = ctx.createLinearGradient(el.x - cam, el.y, el.x - cam, el.y + el.h);
      eg.addColorStop(0, '#FFB74D'); eg.addColorStop(1, '#F57C00');
      ctx.fillStyle = eg;
      ctx.beginPath(); ctx.roundRect(el.x - cam, el.y, el.w, el.h, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.roundRect(el.x - cam + 3, el.y + 1, el.w - 6, 4, 2); ctx.fill();
      if (el.state === 'idle') {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        const ay = el.y - 8 + Math.sin(this.frame * 0.1) * 2;
        ctx.beginPath();
        ctx.moveTo(el.x - cam + el.w / 2, ay - 4);
        ctx.lineTo(el.x - cam + el.w / 2 - 5, ay + 2);
        ctx.lineTo(el.x - cam + el.w / 2 + 5, ay + 2);
        ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(200,200,200,0.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(el.x - cam + 6, el.y); ctx.lineTo(el.x - cam + 6, el.y1 - 20);
      ctx.moveTo(el.x - cam + el.w - 6, el.y); ctx.lineTo(el.x - cam + el.w - 6, el.y1 - 20);
      ctx.stroke();
      ctx.restore();
    });

    // Balloon
    drawBalloon(this.balloon.x - cam + 20, this.balloon.y, this.frame);

    // Tomatoes
    this.tomatoes.forEach(tm => drawTomato(tm.x - cam, tm.y, tm.size, tm.frame));

    // Enemies
    this.enemies.forEach(e => {
      if (e.type === 'koopa') drawKoopa(e.x - cam, e.y, e.w, e.h, e.frame, e.dir);
      else drawNewHedgehog(e.x - cam, e.y, e.w, e.h, e.frame, e.dir);
    });

    // Bats
    this.bats.forEach(b => drawBat(b.x - cam, b.y, b.w, b.h, b.frame));

    // Dino
    drawDino(d.x - cam, d.y, d.w, d.h, d.facing, d.squash,
      { moving: Math.abs(d.vx) > 0.5, onGround: d.onGround, speed: Math.abs(d.vx) / 4.2, vy: d.vy });
    if (shields > 0) drawShieldAura(d.x - cam + 5, d.y + 4, d.w - 10, d.h - 8, this.frame);

    drawParticles();
    drawPopups();
    ctx.restore();
  },

  endGame(result) { this.gameOver = true; endGame(result); },
  cleanup() {}
};




/* ─── New Enemy Draw Functions ─── */

function drawPiranha(x, y, w, h, frame, emerge) {
  // emerge: 0 (hidden in pipe) to 1 (fully out)
  if (piranhaImg.complete && piranhaImg.naturalWidth > 0) {
    ctx.save();
    const eh = h * emerge;
    // Clip to pipe opening area
    ctx.beginPath();
    ctx.rect(x - 5, y - h, w + 10, h + 20);
    ctx.clip();
    const bob = Math.sin(frame * 0.1) * 2;
    ctx.drawImage(piranhaImg, x, y - eh + bob, w, h);
    ctx.restore();
    return;
  }
  // Fallback: draw a simple piranha
  ctx.save();
  const eh = h * emerge;
  ctx.beginPath();
  ctx.rect(x, y - h, w, h);
  ctx.clip();
  // Stem
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(x + w * 0.35, y - eh * 0.6, w * 0.3, eh * 0.6);
  // Head
  const hy = y - eh;
  ctx.fillStyle = '#E53935';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, hy + h * 0.25, w * 0.45, h * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // White spots
  ctx.fillStyle = '#FFCDD2';
  ctx.beginPath(); ctx.arc(x + w * 0.3, hy + h * 0.15, w * 0.08, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + w * 0.65, hy + h * 0.2, w * 0.06, 0, Math.PI * 2); ctx.fill();
  // Mouth
  ctx.fillStyle = '#B71C1C';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, hy + h * 0.35, w * 0.25, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawKoopa(x, y, w, h, frame, dir) {
  if (koopaImg.complete && koopaImg.naturalWidth > 0) {
    ctx.save();
    const bob = Math.abs(Math.sin(frame * 0.2)) * 2;
    if (dir < 0) {
      ctx.translate(x + w, y - bob);
      ctx.scale(-1, 1);
      ctx.drawImage(koopaImg, 0, 0, w, h);
    } else {
      ctx.drawImage(koopaImg, x, y - bob, w, h);
    }
    ctx.restore();
    return;
  }
  // Fallback turtle
  ctx.save();
  const bob = Math.abs(Math.sin(frame * 0.2)) * 2;
  // Shell
  ctx.fillStyle = '#43A047';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.45 - bob, w * 0.42, h * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  // Shell rim
  ctx.fillStyle = '#FFC107';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.55 - bob, w * 0.45, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head
  const hx = dir > 0 ? x + w * 0.75 : x + w * 0.25;
  ctx.fillStyle = '#81C784';
  ctx.beginPath();
  ctx.ellipse(hx, y + h * 0.35 - bob, w * 0.18, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eye
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(hx + (dir > 0 ? 3 : -3), y + h * 0.32 - bob, 2, 0, Math.PI * 2); ctx.fill();
  // Feet
  ctx.fillStyle = '#FFAB91';
  const footOff = Math.sin(frame * 0.3) * 3;
  ctx.beginPath(); ctx.ellipse(x + w * 0.3, y + h * 0.85 - bob + footOff, w * 0.1, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + w * 0.7, y + h * 0.85 - bob - footOff, w * 0.1, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawNewHedgehog(x, y, w, h, frame, dir) {
  if (hedgehogNewImg.complete && hedgehogNewImg.naturalWidth > 0) {
    ctx.save();
    const bob = Math.abs(Math.sin(frame * 0.18)) * 2;
    if (dir < 0) {
      ctx.translate(x + w, y - bob);
      ctx.scale(-1, 1);
      ctx.drawImage(hedgehogNewImg, 0, 0, w, h);
    } else {
      ctx.drawImage(hedgehogNewImg, x, y - bob, w, h);
    }
    ctx.restore();
    return;
  }
  // Fallback
  ctx.save();
  const bob = Math.abs(Math.sin(frame * 0.18)) * 2;
  // Body (spines)
  ctx.fillStyle = '#8D6E63';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.5 - bob, w * 0.45, h * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Spikes
  ctx.fillStyle = '#6D4C41';
  for (let i = 0; i < 8; i++) {
    const sx = x + w * 0.15 + i * w * 0.1;
    const sy = y + h * 0.25 - bob;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - 4, sy + 12);
    ctx.lineTo(sx + 4, sy + 12);
    ctx.closePath(); ctx.fill();
  }
  // Face
  ctx.fillStyle = '#FFCCBC';
  ctx.beginPath();
  ctx.ellipse(x + (dir > 0 ? w * 0.7 : w * 0.3), y + h * 0.5 - bob, w * 0.22, h * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eye
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(x + (dir > 0 ? w * 0.75 : w * 0.25), y + h * 0.45 - bob, 2.5, 0, Math.PI * 2); ctx.fill();
  // Nose
  ctx.fillStyle = '#5D4037';
  ctx.beginPath(); ctx.arc(x + (dir > 0 ? w * 0.88 : w * 0.12), y + h * 0.55 - bob, 2, 0, Math.PI * 2); ctx.fill();
  // Feet
  ctx.fillStyle = '#FFAB91';
  const footOff = Math.sin(frame * 0.25) * 2;
  ctx.beginPath(); ctx.ellipse(x + w * 0.35, y + h * 0.9 - bob + footOff, w * 0.08, h * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + w * 0.65, y + h * 0.9 - bob - footOff, w * 0.08, h * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBrickBlock(x, y, size) {
  // Classic Mario brick block
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x, y + size);
  grad.addColorStop(0, '#C62828');
  grad.addColorStop(1, '#8E0000');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, size, size);
  // Brick pattern
  ctx.strokeStyle = '#5D0000';
  ctx.lineWidth = 2;
  const bh = size / 4;
  for (let row = 0; row < 4; row++) {
    const by = y + row * bh;
    ctx.beginPath();
    ctx.moveTo(x, by); ctx.lineTo(x + size, by);
    ctx.stroke();
    const offset = (row % 2) * (size / 4);
    ctx.beginPath();
    ctx.moveTo(x + offset, by); ctx.lineTo(x + offset, by + bh);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + offset + size / 2, by); ctx.lineTo(x + offset + size / 2, by + bh);
    ctx.stroke();
  }
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x + 2, y + 2, size - 4, 4);
  ctx.restore();
}

function drawQuestionBlock(x, y, size, frame, used) {
  ctx.save();
  if (used) {
    ctx.fillStyle = '#795548';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
  } else {
    const pulse = 0.9 + 0.1 * Math.sin(frame * 0.1);
    const grad = ctx.createLinearGradient(x, y, x, y + size);
    grad.addColorStop(0, '#FFD54F');
    grad.addColorStop(0.5, '#FFB300');
    grad.addColorStop(1, '#FF8F00');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, size, size);
    // Border
    ctx.strokeStyle = '#E65100';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    // Question mark
    ctx.fillStyle = '#FFF8E1';
    ctx.font = `bold ${Math.floor(size * 0.55)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', x + size / 2, y + size / 2 + 2);
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x + 3, y + 3, size * 0.3, 4);
  }
  ctx.restore();
}

function drawGrassPlatform(x, y, w, h) {
  // 精致土壤平台：圆角、多层纹理、小石头、草根、柔和草地
  ctx.save();
  const radius = Math.min(8, h * 0.15);

  // ── 土壤主体（多层渐变，模拟真实土壤层次）──
  const dirtGrad = ctx.createLinearGradient(x, y, x, y + h);
  dirtGrad.addColorStop(0, '#A1887F');   // 表层浅土
  dirtGrad.addColorStop(0.15, '#8D6E63'); // 中层
  dirtGrad.addColorStop(0.6, '#6D4C41');  // 深层
  dirtGrad.addColorStop(1, '#4E342E');    // 底部深色
  ctx.fillStyle = dirtGrad;
  ctx.beginPath();
  ctx.roundRect(x, y + 10, w, h - 10, radius);
  ctx.fill();

  // ── 土壤纹理：随机小石头颗粒（用确定性伪随机，避免闪烁）──
  for (let i = 0; i < Math.floor(w / 18); i++) {
    const sx = x + 8 + ((i * 37 + Math.floor(y)) % Math.max(1, w - 16));
    const sy = y + 22 + ((i * 23 + 5) % Math.max(1, h - 30));
    const sr = 1 + (i % 3) * 0.6;
    // 石头底色
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 土壤纹理：水平层理线（模拟沉积层）──
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  for (let ly = y + 28; ly < y + h - 6; ly += 14) {
    ctx.beginPath();
    ctx.moveTo(x + 6, ly);
    for (let lx = x + 6; lx < x + w - 6; lx += 20) {
      ctx.quadraticCurveTo(lx + 10, ly + (lx % 40 < 20 ? 1 : -1), lx + 20, ly);
    }
    ctx.stroke();
  }

  // ── 草根（从草地向下延伸的细根）──
  ctx.strokeStyle = 'rgba(121,85,72,0.4)';
  ctx.lineWidth = 1;
  for (let rx = x + 6; rx < x + w - 6; rx += 22) {
    const rootLen = 8 + (rx % 15);
    ctx.beginPath();
    ctx.moveTo(rx, y + 12);
    ctx.quadraticCurveTo(rx + 2, y + 12 + rootLen * 0.5, rx + (rx % 3 === 0 ? 3 : -2), y + 12 + rootLen);
    ctx.stroke();
  }

  // ── 草地顶部（柔和渐变 + 圆角）──
  const grassGrad = ctx.createLinearGradient(x, y, x, y + 18);
  grassGrad.addColorStop(0, '#81C784');   // 顶部亮绿
  grassGrad.addColorStop(0.5, '#66BB6A');  // 中层
  grassGrad.addColorStop(1, '#4CAF50');    // 底部深绿
  ctx.fillStyle = grassGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 18, [radius, radius, 0, 0]);
  ctx.fill();

  // ── 草地与土壤的柔和过渡带 ──
  const transitionGrad = ctx.createLinearGradient(x, y + 14, x, y + 22);
  transitionGrad.addColorStop(0, 'rgba(76,175,80,0.6)');
  transitionGrad.addColorStop(1, 'rgba(141,110,99,0)');
  ctx.fillStyle = transitionGrad;
  ctx.fillRect(x, y + 14, w, 8);

  // ── 草叶（自然不规则高度，微弯）──
  for (let gx = x + 3; gx < x + w - 3; gx += 7) {
    const bladeH = 4 + ((gx * 7 + Math.floor(y)) % 5);
    const bend = (gx % 3 === 0) ? 1.5 : (gx % 3 === 1 ? -1 : 0);
    ctx.fillStyle = gx % 2 === 0 ? '#A5D6A7' : '#81C784';
    ctx.beginPath();
    ctx.moveTo(gx, y + 2);
    ctx.quadraticCurveTo(gx + bend, y - bladeH * 0.5, gx + bend * 0.5, y - bladeH);
    ctx.quadraticCurveTo(gx + bend * 1.5, y - bladeH * 0.5, gx + 3, y + 2);
    ctx.closePath();
    ctx.fill();
  }

  // ── 顶部高光（柔和阳光感）──
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 1, w - 4, 3, 2);
  ctx.fill();

  // ── 底部边缘（圆角 + 深色阴影）──
  ctx.fillStyle = '#3E2723';
  ctx.beginPath();
  ctx.roundRect(x, y + h - 4, w, 4, [0, 0, radius, radius]);
  ctx.fill();

  // ── 左侧柔和阴影（立体感）──
  const sideShade = ctx.createLinearGradient(x, y, x + 10, y);
  sideShade.addColorStop(0, 'rgba(0,0,0,0.15)');
  sideShade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sideShade;
  ctx.fillRect(x, y + 10, 10, h - 14);

  ctx.restore();
}

/* ─── Simple SFX ─── */
let _audioCtx = null;
function playSfx(type) {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    const now = ctx.currentTime;
    if (type === 'jump') {
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'coin') {
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.setValueAtTime(1200, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
    } else {
      osc.frequency.setValueAtTime(300, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    }
  } catch(e) {}
}

/* ═══════════════════════════════════════════════════════════════
   GAME FLOW
   ═══════════════════════════════════════════════════════════════ */
function showOverlay(el) { el.hidden = false; }
function hideOverlay(el) { el.hidden = true; }

function showStartScreen() {
  gameState = 'start';
  stopBGM();
  hideOverlay(casualPopup); hideOverlay(levelPopup); hideOverlay(pausePopup); hideOverlay(gameOverScreen);
  showOverlay(startScreen);
  scoreEl.hidden = true; levelIndicator.hidden = true; topCtrls.style.display = 'none';
  mobileCtrls.style.display = 'none'; flightBtn.hidden = true;
  ctx.clearRect(0, 0, W, H);
  cctx.clearRect(0, 0, W, H); confettiParts = [];
  particles = []; popups = []; screenShake = 0;
  destroyJoy();
}

function showCasualPopup() {
  hideOverlay(startScreen); showOverlay(casualPopup);
}

function showLevelPopup(modeKey) {
  mode = modeKey;
  let title, desc, count;
  if (modeKey === 'novice') { title = t('mode_novice') + ' · ' + t('select_level'); desc = t('maze_desc'); count = 10; }
  else if (modeKey === 'hooked') { title = t('mode_hooked') + ' · ' + t('select_level'); desc = t('platformer_desc'); count = 10; }
  else { title = t('mode_expert') + ' · ' + t('select_level'); desc = t('portal_desc'); count = 10; }
  $('level-popup-title').textContent = title;
  $('level-popup-desc').textContent = desc;
  const grid = $('level-grid');
  grid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const btn = document.createElement('button');
    btn.className = 'level-btn';
    btn.textContent = i + 1;
    btn.addEventListener('click', () => startGame(modeKey, i));
    grid.appendChild(btn);
  }
  hideOverlay(startScreen); showOverlay(levelPopup);
}

function startGame(modeKey, lvl) {
  mode = modeKey; levelIdx = lvl || 0;
  hideOverlay(startScreen); hideOverlay(casualPopup); hideOverlay(levelPopup);
  hideOverlay(pausePopup); hideOverlay(gameOverScreen);
  topCtrls.style.display = 'flex'; mobileCtrls.style.display = 'block';
  flightBtn.hidden = modeKey !== 'casual';
  if (modeKey === 'casual') {
    targetScore = parseInt(targetInput.value, 10) || 10;
    handler = CasualMode;
  } else if (modeKey === 'novice') handler = NoviceMode;
  else if (modeKey === 'hooked') handler = HookedMode;
  else handler = ExpertMode;
  handler.init(levelIdx);
  gameState = 'playing';
  playBGM();
}

function pauseGame() {
  if (gameState !== 'playing') return;
  gameState = 'paused'; stopBGM(); showOverlay(pausePopup);
}
function resumeGame() {
  if (gameState !== 'paused') return;
  gameState = 'playing'; hideOverlay(pausePopup); playBGM();
}
function quitToMenu() {
  gameState = 'start';
  if (handler && handler.cleanup) handler.cleanup();
  handler = null;
  hideOverlay(pausePopup); hideOverlay(gameOverScreen);
  showStartScreen();
}

function endGame(result) {
  gameState = 'over';
  stopBGM();
  destroyJoy();
  if (handler && handler.cleanup) handler.cleanup();

  finalScoreEl.textContent = score;
  finalTargetEl.textContent = targetScore;

  if (result === 'victory') {
    resultIcon.textContent = '🏆';
    resultTitle.textContent = t('victory');
    resultTitle.className = 'result-title victory';
    gameOverScreen.querySelector('.wx-card--result').classList.add('wx-card--victory');
    gameOverScreen.querySelector('.wx-card--result').classList.remove('wx-card--defeat');
    if (mode === 'casual') resultMsg.textContent = t('victory_msg', { target: targetScore, diff: t('mode_casual') });
    else if (mode === 'novice') resultMsg.textContent = t('victory_maze');
    else if (mode === 'hooked') resultMsg.textContent = t('victory_plat');
    else resultMsg.textContent = t('victory_portal');
    finalScoreEl.classList.add('highlight');
    scoreBox.style.display = mode === 'casual' ? '' : 'none';
    spawnConfetti();
  } else {
    resultIcon.textContent = '💥';
    resultTitle.textContent = t('game_over');
    resultTitle.className = 'result-title defeat';
    gameOverScreen.querySelector('.wx-card--result').classList.add('wx-card--defeat');
    gameOverScreen.querySelector('.wx-card--result').classList.remove('wx-card--victory');
    if (mode === 'casual') {
      const remaining = targetScore - score;
      resultMsg.textContent = remaining > 0 ? t('defeat_msg_near', { diff: remaining }) : t('defeat_msg');
      scoreBox.style.display = '';
    } else {
      resultMsg.textContent = t('defeat_msg');
      scoreBox.style.display = 'none';
    }
    finalScoreEl.classList.remove('highlight');
  }
  showOverlay(gameOverScreen);
  scoreEl.hidden = true; levelIndicator.hidden = true;
  topCtrls.style.display = 'none'; mobileCtrls.style.display = 'none'; flightBtn.hidden = true;
}

function restartGame() {
  startGame(mode, levelIdx);
}

/* ═══════════════════════════════════════════════════════════════
   MAIN LOOP
   ═══════════════════════════════════════════════════════════════ */
function loop(ts) {
  if (gameState === 'playing' && handler) {
    handler.update();
    updateParticles();
    ctx.clearRect(0, 0, W, H);
    handler.render();
  }
  if (confettiParts.length > 0) { updateConfetti(); drawConfetti(); }
  else cctx.clearRect(0, 0, W, H);
  animFrame = requestAnimationFrame(loop);
}

/* ═══════════════════════════════════════════════════════════════
   UI EVENTS
   ═══════════════════════════════════════════════════════════════ */
// Mode buttons
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const m = btn.dataset.mode;
    if (m === 'casual') showCasualPopup();
    else showLevelPopup(m);
  });
});

// Back buttons
document.querySelectorAll('.modal-back').forEach(btn => {
  btn.addEventListener('click', () => {
    hideOverlay(casualPopup); hideOverlay(levelPopup);
    showOverlay(startScreen);
  });
});

// Start casual
$('start-casual').addEventListener('click', () => startGame('casual', 0));

// Score stepper
$('score-minus').addEventListener('click', () => {
  let v = parseInt(targetInput.value, 10) || 10;
  targetInput.value = Math.max(1, v - 1);
});
$('score-plus').addEventListener('click', () => {
  let v = parseInt(targetInput.value, 10) || 10;
  targetInput.value = Math.min(999, v + 1);
});
targetInput.addEventListener('change', () => {
  let v = parseInt(targetInput.value, 10);
  if (isNaN(v) || v < 1) targetInput.value = 10;
  else if (v > 999) targetInput.value = 999;
});

// Top controls
soundBtn.addEventListener('click', toggleBGM);
flightBtn.addEventListener('click', () => {
  if (gameState === 'playing' && mode === 'casual' && handler && handler.activateFlight) {
    handler.activateFlight();
  }
});
pauseBtn.addEventListener('click', () => { if (gameState === 'playing') pauseGame(); });

// Pause popup
$('btn-resume').addEventListener('click', resumeGame);
$('btn-quit').addEventListener('click', quitToMenu);

// Game over
$('restart').addEventListener('click', restartGame);
$('btn-home').addEventListener('click', quitToMenu);

// Language
document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
});

/* ═══════════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════════ */
function init() {
  resize();
  initBGM();
  updateSoundIcon();

  // Load preferences
  try {
    const sl = localStorage.getItem('dino_lang');
    if (sl && I18N[sl]) applyLanguage(sl); else applyLanguage('zh');
    const sb = localStorage.getItem('dino_bgm');
    if (sb !== null) bgmEnabled = sb === '1';
    updateSoundIcon();
  } catch (e) { applyLanguage('zh'); }

  // Load all game images
  let loadDone = false;
  const allImgs = [
    { img: dinoImg, url: DINO_URL },
    { img: hedgehogImg, url: 'images/刺猬-removebg-preview.png?v=20260828l' },
    { img: batImg, url: 'images/bat.png?v=20260828l' },
    { img: tomatoImg, url: 'images/tomato.png?v=20260828l' },
    { img: balloonImg, url: 'images/balloon.png?v=20260828l' },
    { img: platformImg, url: 'images/platform.png?v=20260828l' },
    { img: portalImg, url: 'images/portal.png?v=20260828l' },
    { img: islandImg, url: 'images/island.png?v=20260828l' },
    { img: piranhaImg, url: 'images/piranha.png?v=20260828l' },
    { img: koopaImg, url: 'images/koopa.png?v=20260828l' },
    { img: hedgehogNewImg, url: 'images/hedgehog_new.png?v=20260828l' },
    { img: bgStartImg, url: 'images/bg_start.png?v=20260828l' },
    { img: bgCasualImg, url: 'images/bg_casual.png?v=20260828l' },
  ];

  let loaded = 0;
  function onOneLoaded() {
    loaded++;
    const pct = Math.min(100, Math.round(loaded / allImgs.length * 100));
    progressEl.style.transform = 'scaleX(' + (pct / 100) + ')';
    loadingText.textContent = t('loading') + ' ' + pct + '%';
    if (loaded >= allImgs.length) finishLoad();
  }
  function finishLoad() {
    if (loadDone) return;
    loadDone = true;
    progressEl.style.transform = 'scaleX(1)';
    loadingText.textContent = t('loading') + ' 100%';
    setTimeout(() => {
      loadingEl.classList.add('hidden');
      setTimeout(() => { loadingEl.style.display = 'none'; }, 350);
      gameState = 'start';
      showOverlay(startScreen);
      animFrame = requestAnimationFrame(loop);
    }, 300);
  }
  allImgs.forEach(({ img, url }) => { img.onload = onOneLoaded; img.onerror = onOneLoaded; img.src = url; });
  setTimeout(finishLoad, 5000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
