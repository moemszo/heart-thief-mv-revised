// ハート泥棒 MV — v3 compositor.
// 2.5D layered shots (background depth of field, parallax camera, rim-lit characters, stage light, particles),
// edits cut on the song's kicks, photographic finishing (bloom, grade, vignette, grain), and the JIZURA lyric
// layer (transparent frames from production/v3/jizura_export.cjs) placed per line in the free part of the frame.
//
//   node production/v3/render.cjs --lyrics=renders/v3/lyrics [--start=0 --duration=118.8] [--out=renders/v3/part.mp4]
//   node production/v3/render.cjs --lyrics=... --stills=3,30,60 [--stilldir=renders/v3/stills]
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { once } = require('events');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

const ROOT = path.resolve(__dirname, '../..');
const A = f => path.join(ROOT, 'assets/final', f + '.png');
const opts = Object.fromEntries(process.argv.slice(2).map(s => s.replace(/^--/, '').split('=')));
const W = 1920, H = 1080, FPS = 30, CX = W / 2, CY = H / 2;
const SONG = 118.8;
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const LYR = opts.lyrics ? path.resolve(ROOT, opts.lyrics) : null;
GlobalFonts.registerFromPath(path.join(ROOT, 'assets/fonts/MochiyPopOne-Regular.ttf'), 'Mochiy Pop One');
GlobalFonts.registerFromPath(path.join(ROOT, 'assets/fonts/NotoSansJP.ttf'), 'Noto Sans JP');

/* ---------- math ---------- */
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = u => { u = clamp(u); return u * u * (3 - 2 * u); };
const inOut = u => { u = clamp(u); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const outCubic = u => 1 - Math.pow(1 - clamp(u), 3);
const outExpo = u => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(u)));
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); };

/* ---------- music ---------- */
const BEATS = JSON.parse(fs.readFileSync(path.join(__dirname, 'beats.json'), 'utf8'));
const KICKS = BEATS.kicks;
function lastKick(t) { let lo = 0, hi = KICKS.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (KICKS[m] <= t) { r = m; lo = m + 1; } else hi = m - 1; } return r; }
const kickPulse = t => { const i = lastKick(t); return i < 0 ? 0 : Math.exp(-(t - KICKS[i]) * 9); };
const energy = t => BEATS.energy[clamp(Math.round(t * FPS), 0, BEATS.energy.length - 1)] || 0;
// snap an edit point to the nearest kick within 0.12 s
const snap = t => { const i = lastKick(t); let best = t, d = 0.12; for (const k of [KICKS[i], KICKS[i + 1]]) if (k != null && Math.abs(k - t) < d) { d = Math.abs(k - t); best = k; } return best; };

/* ---------- assets ---------- */
const TEX = {};
const mk = (w, h) => createCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
function blurred(src, px, scale = 1) {                    // blurred copy (optionally at reduced size)
  const c = mk(src.width * scale, src.height * scale), x = c.getContext('2d');
  x.filter = `blur(${px * scale}px)`; x.drawImage(src, 0, 0, c.width, c.height); x.filter = 'none';
  return c;
}
function tinted(src, color, alphaMul = 1) {
  const c = mk(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.globalAlpha = alphaMul; x.fillRect(0, 0, c.width, c.height);
  return c;
}
async function loadCut(id, { lumaKey = false } = {}) {
  const img = await loadImage(A(id));
  const c = mk(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
  if (lumaKey) {                                           // white silhouette on black → white with alpha
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) { const l = (p[i] + p[i + 1] + p[i + 2]) / 3; p[i + 3] = Math.round(255 * clamp((l - 10) / 235)); p[i] = p[i + 1] = p[i + 2] = 255; }
    x.putImageData(d, 0, 0);
  } else {
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;       // tighten the soft matte fringe
    for (let i = 3; i < p.length; i += 4) p[i] = Math.round(255 * Math.pow(p[i] / 255, 1.25));
    x.putImageData(d, 0, 0);
  }
  return c;
}
async function loadAssets() {
  for (const b of ['verse_ring_charm', 'prechorus_wait', 'chorus_heartstage', 'social_night']) {
    const img = await loadImage(A('bg_' + b));
    // cover 1920x1080 with 12% overscan for camera moves, resampled once in high quality
    const c = mk(W * 1.12, H * 1.12), x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height);
    TEX['bg_' + b] = { sharp: c, soft: blurred(c, 7, 0.5), deep: blurred(c, 22, 0.25) };
  }
  const cuts = ['character_a_apple', 'character_a_charm', 'character_a_cheer', 'character_a_peace', 'character_a_phone_check', 'character_a_wait',
    'character_b_apple', 'character_b_cheer', 'character_b_dance', 'character_b_heartthief', 'character_b_peace', 'character_b_point',
    'prop_bitten_apple', 'prop_generic_story_phone', 'prop_love_charm', 'prop_pinky_ring',
    'silhouette_a_neutral_black', 'silhouette_b_neutral_black', 'silhouette_a_cheer_black', 'silhouette_b_dance_black'];
  for (const id of cuts) TEX[id] = { img: await loadCut(id) };
  for (const id of ['silhouette_a_cheer_white_blackbg', 'silhouette_a_peace_white_blackbg', 'silhouette_b_dance_white_blackbg', 'silhouette_b_peace_white_blackbg'])
    TEX[id] = { img: await loadCut(id, { lumaKey: true }) };
  for (const t of Object.values(TEX)) if (t.img) {
    t.glow = blurred(t.img, 14, 0.25);                     // alpha halo for rim light (quarter res)
    t.soft = blurred(t.img, 10, 0.5);                      // defocused copy for foreground / out-of-focus use
    t.tints = {};
  }
  // sprites
  const bokeh = mk(256, 256), bx = bokeh.getContext('2d');
  const g = bx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.55, 'rgba(255,255,255,0.55)'); g.addColorStop(0.8, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  bx.fillStyle = g; bx.fillRect(0, 0, 256, 256);
  TEX.bokeh = bokeh;
  const glint = mk(256, 256), gx = glint.getContext('2d');
  const gg = gx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(0.12, 'rgba(255,255,255,0.6)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
  gx.fillStyle = gg; gx.fillRect(0, 0, 256, 256);
  gx.globalCompositeOperation = 'lighter';
  for (const [w, h] of [[256, 6], [6, 256]]) { const lg = gx.createLinearGradient(0, 0, w > h ? 256 : 0, w > h ? 0 : 256); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.95)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); gx.fillStyle = lg; gx.fillRect(128 - w / 2, 128 - h / 2, w, h); }
  TEX.glint = glint;
  const heart = mk(128, 128), hx = heart.getContext('2d');
  hx.fillStyle = '#fff'; hx.beginPath(); hx.moveTo(64, 112);
  hx.bezierCurveTo(10, 72, 0, 40, 22, 22); hx.bezierCurveTo(40, 6, 60, 16, 64, 34); hx.bezierCurveTo(68, 16, 88, 6, 106, 22); hx.bezierCurveTo(128, 40, 118, 72, 64, 112); hx.fill();
  TEX.heart = heart; TEX.heartSoft = blurred(heart, 6);
  // vignette and grain
  const vig = mk(W, H), vx = vig.getContext('2d');
  const vg = vx.createRadialGradient(CX, CY * 1.05, H * 0.35, CX, CY, H * 1.02);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(8,2,20,0.62)');
  vx.fillStyle = vg; vx.fillRect(0, 0, W, H); TEX.vignette = vig;
  TEX.grain = [];
  for (let k = 0; k < 4; k++) {
    const gc = mk(W / 2, H / 2), gx2 = gc.getContext('2d'), d = gx2.createImageData(gc.width, gc.height);
    for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (hash(i * 0.37 + k * 911) - 0.5) * 90; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    gx2.putImageData(d, 0, 0); TEX.grain.push(gc);
  }
}
const tintOf = (t, key, color) => (t.tints[key + color] || (t.tints[key + color] = tinted(t[key], color)));

/* ---------- palette ---------- */
const P = { pink: '#FF4FA8', hot: '#FF2E88', cyan: '#35E6FF', violet: '#8C5CFF', gold: '#FFD36E', white: '#FFFFFF', night: '#140A2E', red: '#FF3048', lime: '#C9FF4F' };

/* ---------- scene drawing ---------- */
// camera: zoom about the frame centre plus pan; each layer follows it scaled by its depth (parallax)
function camAt(cam, u) {
  const e = (cam.ease || inOut)(u);
  return { z: lerp(cam.z0 ?? 1, cam.z1 ?? cam.z0 ?? 1, e), x: lerp(cam.x0 || 0, cam.x1 ?? cam.x0 ?? 0, e), y: lerp(cam.y0 || 0, cam.y1 ?? cam.y0 ?? 0, e), r: lerp(cam.r0 || 0, cam.r1 ?? cam.r0 ?? 0, e) };
}
function withDepth(g, cam, depth, fn) {
  const z = 1 + (cam.z - 1) * depth;
  g.save(); g.translate(CX + cam.x * depth, CY + cam.y * depth); g.rotate(cam.r * depth); g.scale(z, z); g.translate(-CX, -CY); fn(); g.restore();
}
function drawBg(g, S, cam) {
  if (S.bg === 'grad') return drawGraphicBg(g, S, cam);
  if (S.bg === 'black') { g.fillStyle = '#07030F'; g.fillRect(0, 0, W, H); return; }
  const T = TEX['bg_' + S.bg], img = S.blur === 2 ? T.deep : S.blur === 1 ? T.soft : T.sharp;
  withDepth(g, cam, S.bgDepth ?? 0.45, () => {
    g.save(); g.translate(CX + (S.bgX || 0), CY + (S.bgY || 0)); const s = S.bgScale || 1; g.scale(s, s);
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, -W * 0.56, -H * 0.56, W * 1.12, H * 1.12); g.restore();
  });
  const dim = S.dim ?? (S.bg === 'chorus_heartstage' ? (S.blur ? 0.22 : 0.12) : 0);
  if (dim) { g.fillStyle = `rgba(10,4,26,${dim})`; g.fillRect(0, 0, W, H); }
}
function drawGraphicBg(g, S, cam) {
  const [c1, c2] = S.colors || [P.hot, P.violet];
  const gr = g.createRadialGradient(CX, CY, 50, CX, CY, W * 0.75);
  gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // slow rotating rays
  g.save(); g.translate(CX + cam.x * 0.3, CY + cam.y * 0.3); g.rotate(S.t * 0.12); g.globalAlpha = 0.14; g.fillStyle = '#fff';
  for (let i = 0; i < 16; i++) { g.rotate(Math.PI / 8); g.beginPath(); g.moveTo(0, 0); g.lineTo(W, -90); g.lineTo(W, 90); g.fill(); }
  g.restore();
}
// place a cut-out so that source pixel `focus` lands on screen point `at`, `s` screen px per source px
function drawCut(g, L, cam, t) {
  const T = TEX[L.id]; if (!T) throw new Error('missing ' + L.id);
  const img = L.defocus ? T.soft : T.img, k = L.defocus ? 2 : 1;
  const s = L.s || 1, [fx, fy] = L.focus || [T.img.width / 2, T.img.height / 2];
  const bob = L.bob ? Math.sin(t * (L.bobF || 1.6) + (L.phase || 0)) * L.bob : 0;
  const sway = L.sway ? Math.sin(t * 1.1 + (L.phase || 0)) * L.sway : 0;
  const punch = L.punch ? 1 + kickPulse(t) * L.punch : 1;
  withDepth(g, cam, L.depth ?? 1, () => {
    g.save();
    g.translate(L.at[0] + (L.dx || 0), L.at[1] + (L.dy || 0) + bob); g.rotate((L.rot || 0) + sway); g.scale((L.flip ? -1 : 1) * s * punch, s * punch);
    g.globalAlpha = L.alpha ?? 1;
    if (L.rim) {                                          // coloured halo behind the figure = rim light / neon aura
      g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha *= 0.55 * (L.rimA ?? 0.85) * (0.85 + 0.3 * kickPulse(t));
      const gl = tintOf(T, 'glow', L.rim);
      g.drawImage(gl, -fx, -fy, T.img.width, T.img.height); g.restore();
    }
    if (L.shadow) {                                       // soft contact shadow cast onto the background
      g.save(); g.globalAlpha *= 0.45; g.drawImage(tintOf(T, 'glow', '#0A0418'), -fx + 26, -fy + 30, T.img.width, T.img.height); g.restore();
    }
    g.imageSmoothingQuality = 'high';
    const src = L.tint ? tintOf(T, L.defocus ? 'soft' : 'img', L.tint) : img;
    g.drawImage(src, -fx, -fy, T.img.width, T.img.height);
    if (L.light) {                                        // coloured key light washing over the figure
      g.globalCompositeOperation = 'source-atop';
    }
    g.restore();
  });
  void k;
}
// stage beams from above
function drawBeams(g, t, cam, { n = 6, colors = [P.pink, P.cyan], alpha = 0.22, y = -60, spread = 0.9 } = {}) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x0 = W * (0.1 + 0.8 * i / Math.max(1, n - 1)) + cam.x * 0.4;
    const ang = Math.sin(t * (0.5 + 0.13 * i) + i * 1.7) * 0.45 * spread + (i - (n - 1) / 2) * 0.05;
    const len = H * 1.6, wdt = 180 + 60 * hash(i);
    g.save(); g.translate(x0, y + cam.y * 0.4); g.rotate(ang);
    const lg = g.createLinearGradient(0, 0, 0, len); const c = colors[i % colors.length];
    lg.addColorStop(0, c); lg.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = alpha * (0.7 + 0.6 * kickPulse(t + i * 0.05));
    g.fillStyle = lg; g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.lineTo(wdt, len); g.lineTo(-wdt, len); g.fill();
    g.restore();
  }
  g.restore();
}
// defocused light orbs, drifting (depth > 1 = in front of the subject)
function drawBokeh(g, t, cam, { n = 18, seed = 1, colors = [P.pink, P.cyan, P.gold], size = [30, 120], alpha = 0.35, depth = 0.6, drift = 14 } = {}) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const h1 = hash(seed * 31 + i), h2 = hash(seed * 57 + i * 3.1), h3 = hash(seed * 13 + i * 7.7);
    const r = lerp(size[0], size[1], h3);
    const x = ((h1 * (W + 400) + t * drift * (0.4 + h2) + cam.x * depth) % (W + 400) + W + 400) % (W + 400) - 200;
    const y = h2 * H + Math.sin(t * 0.6 + i) * 18 + cam.y * depth;
    g.globalAlpha = alpha * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.1) ** 2);
    g.drawImage(tintOf({ tints: TEX.bokehT || (TEX.bokehT = {}), img: TEX.bokeh }, 'img', colors[i % colors.length]), x - r, y - r, r * 2, r * 2);
  }
  g.restore();
}
// twinkling star glints
function drawGlints(g, t, { n = 14, seed = 3, area = [0, 0, W, H], size = 60, color = '#FFFFFF', alpha = 0.9 } = {}) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const ph = (t * (0.6 + hash(seed + i * 9) * 0.8) + hash(seed + i)) % 1;
    const a = Math.sin(ph * Math.PI) ** 3; if (a < 0.02) continue;
    const x = area[0] + hash(seed * 7 + i * 1.3 + Math.floor(t * 0.5 + hash(i))) * area[2], y = area[1] + hash(seed * 11 + i * 2.9 + Math.floor(t * 0.5 + hash(i))) * area[3];
    const s = size * (0.4 + 0.8 * hash(seed + i * 5)) * (0.6 + 0.4 * a);
    g.globalAlpha = alpha * a; g.save(); g.translate(x, y); g.rotate(ph * 0.8);
    g.drawImage(color === '#FFFFFF' ? TEX.glint : tintOf({ tints: TEX.glintT || (TEX.glintT = {}), img: TEX.glint }, 'img', color), -s / 2, -s / 2, s, s); g.restore();
  }
  g.restore();
}
// floating hearts / confetti
function drawHearts(g, t, cam, { n = 16, seed = 5, colors = [P.pink, P.hot, P.white], size = [18, 60], rise = 90, alpha = 0.9, depth = 1.1, soft = false } = {}) {
  g.save();
  for (let i = 0; i < n; i++) {
    const h1 = hash(seed + i * 1.7), h2 = hash(seed + i * 4.3), sz = lerp(size[0], size[1], hash(seed + i * 8.1));
    const y = ((H + 200) - ((t * rise * (0.6 + h2) + h1 * (H + 200)) % (H + 200))) - 100 + cam.y * depth;
    const x = h2 * W + Math.sin(t * 1.4 + i) * 40 + cam.x * depth;
    g.globalAlpha = alpha * clamp(y / 200) * clamp((H + 100 - y) / 200);
    g.save(); g.translate(x, y); g.rotate(Math.sin(t * 2 + i) * 0.35);
    g.drawImage(tintOf({ tints: TEX.heartT || (TEX.heartT = {}), img: soft ? TEX.heartSoft : TEX.heart }, 'img', colors[i % colors.length]), -sz / 2, -sz / 2, sz, sz);
    g.restore();
  }
  g.restore();
}
function drawConfetti(g, t, cam, { n = 60, seed = 9, colors = [P.pink, P.cyan, P.gold, P.white, P.lime], fall = 160 } = {}) {
  g.save();
  for (let i = 0; i < n; i++) {
    const h1 = hash(seed + i * 2.3), h2 = hash(seed + i * 5.9), h3 = hash(seed + i * 1.1);
    const y = ((t * fall * (0.6 + h2) + h1 * (H + 100)) % (H + 100)) - 50 + cam.y * 1.2;
    const x = h3 * W + Math.sin(t * 2 + i) * 50 + cam.x * 1.2;
    g.save(); g.translate(x, y); g.rotate(t * (2 + h2 * 4) + i); g.scale(1, Math.sin(t * 5 + i));
    g.fillStyle = colors[i % colors.length]; g.globalAlpha = 0.9; g.fillRect(-9, -5, 18, 10); g.restore();
  }
  g.restore();
}
// soft coloured light pooling from a side (key light / light leak)
function drawLeak(g, t, { x = W, y = 0, r = 900, color = P.pink, alpha = 0.35 } = {}) {
  g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = alpha;
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
}
function drawSpot(g, { x = CX, y = -40, w = 520, alpha = 0.5, color = '#FFE9F5' } = {}) {
  g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = alpha;
  const lg = g.createLinearGradient(0, y, 0, H); lg.addColorStop(0, color); lg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = lg; g.beginPath(); g.moveTo(x - 50, y); g.lineTo(x + 50, y); g.lineTo(x + w, H); g.lineTo(x - w, H); g.fill();
  const pool = g.createRadialGradient(x, H * 0.93, 0, x, H * 0.93, w * 1.1); pool.addColorStop(0, color); pool.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = alpha * 0.6; g.fillStyle = pool; g.fillRect(0, H * 0.6, W, H * 0.4);
  g.restore();
}
function grade(g, S) {                                    // per-scene colour grade
  const gr = S.grade; if (!gr) return;
  g.save();
  if (gr.soft) { g.globalCompositeOperation = 'soft-light'; g.globalAlpha = gr.softA ?? 0.4; g.fillStyle = gr.soft; g.fillRect(0, 0, W, H); }
  if (gr.mult) { g.globalCompositeOperation = 'multiply'; g.globalAlpha = gr.multA ?? 0.3; g.fillStyle = gr.mult; g.fillRect(0, 0, W, H); }
  if (gr.desat) { g.globalCompositeOperation = 'saturation'; g.globalAlpha = gr.desat; g.fillStyle = '#808080'; g.fillRect(0, 0, W, H); }
  g.restore();
}
function drawPanel(g, cam, t, L) {                        // a rounded frame (phone screen / split panel) with a figure inside
  withDepth(g, cam, L.depth ?? 1, () => {
    const [x, y, w, h] = L.rect, r = L.radius ?? 36;
    g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(L.rot || 0); g.translate(-(x + w / 2), -(y + h / 2));
    g.save(); g.shadowColor = 'rgba(5,0,20,0.6)'; g.shadowBlur = 40; g.shadowOffsetY = 18; g.fillStyle = L.fill || '#1C1238';
    g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); g.restore();
    g.save(); g.beginPath(); g.roundRect(x, y, w, h, r); g.clip();
    if (L.fill2) { const lg = g.createLinearGradient(x, y, x + w, y + h); lg.addColorStop(0, L.fill); lg.addColorStop(1, L.fill2); g.fillStyle = lg; g.fillRect(x, y, w, h); }
    for (const c of L.inner || []) drawCut(g, c, { z: 1, x: 0, y: 0, r: 0 }, t);
    g.restore();
    g.lineWidth = L.stroke ?? 6; g.strokeStyle = L.border || 'rgba(255,255,255,0.9)'; g.beginPath(); g.roundRect(x, y, w, h, r); g.stroke();
    g.restore();
  });
}

/* ---------- title ---------- */
function drawTitle(g, t, a, { y = CY, size = 190, sub = true } = {}) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${size}px "Mochiy Pop One"`;
  const txt = 'ハート泥棒';
  const flick = 0.9 + 0.1 * Math.sin(t * 23) * Math.sin(t * 7);
  for (const [c, b, al] of [[P.hot, 60, 0.9], [P.pink, 26, 0.9], [P.cyan, 8, 0.5]]) { g.save(); g.shadowColor = c; g.shadowBlur = b; g.fillStyle = c; g.globalAlpha = a * al * flick; g.fillText(txt, CX, y); g.restore(); }
  g.lineWidth = 7; g.strokeStyle = '#FFE3F2'; g.strokeText(txt, CX, y);
  g.fillStyle = '#FFFFFF'; g.fillText(txt, CX, y);
  if (sub) {
    g.font = '600 34px "Noto Sans JP"'; g.fillStyle = '#FFFFFF'; g.globalAlpha = a * 0.9;
    const s = 'H E A R T   T H I E F';
    g.shadowColor = P.cyan; g.shadowBlur = 16; g.fillText(s, CX, y + size * 0.72);
    g.shadowBlur = 0; g.fillStyle = P.cyan; g.fillRect(CX - 300, y + size * 0.72 - 2 + 34, 600 * clamp(a * 1.2), 3);
  }
  g.restore();
}

/* ---------- characters: face points (source px) ---------- */
const FACE = {
  character_a_apple: [470, 200], character_a_charm: [465, 200], character_a_cheer: [580, 225], character_a_peace: [385, 195],
  character_a_phone_check: [460, 170], character_a_wait: [410, 155],
  character_b_apple: [460, 135], character_b_cheer: [430, 130], character_b_dance: [540, 135], character_b_heartthief: [430, 115],
  character_b_peace: [460, 125], character_b_point: [440, 130],
};
// framings: full body / knee / waist / chest / face
function fr(id, kind, at, extra = {}) {
  const f = FACE[id], S = { full: 0.66, knee: 0.95, waist: 1.18, chest: 1.42, face: 1.62 }[kind];
  // put the face on a thirds line: `at` is where the face goes on screen
  return Object.assign({ id, focus: f, at, s: S, depth: 1, bob: kind === 'full' ? 6 : 4, rim: P.pink }, extra);
}

/* ---------- lyric placement ---------- */
// per JIZURA line: target zone and scale limits. Zones are [x, y, w, h] on screen.
const Z = { right: [1040, 250, 800, 560], left: [80, 250, 800, 560], lower: [160, 740, 1600, 280], upper: [160, 60, 1600, 300], center: [260, 300, 1400, 480], lowerR: [900, 700, 950, 330], lowerL: [70, 700, 950, 330] };
let LINEBOX = {};                                        // measured text boxes (lyric_boxes.json)

/* ---------- the edit ---------- */
// Every shot: [start, end, scene]. `lz` = lyric zone for this shot. Transitions are named on the incoming shot.
const SH = [];
function shot(t0, t1, S) { SH.push(Object.assign({ t0: snap(t0), t1: snap(t1) }, S)); }
const AF = (id, kind, at, e) => fr(id, kind, at, Object.assign({ rim: P.cyan }, e));
const BF = (id, kind, at, e) => fr(id, kind, at, Object.assign({ rim: P.pink }, e));
const PROP = (id, at, s, e = {}) => Object.assign({ id, at, s, depth: 1.05, rim: P.pink, rimA: 0.7 }, e);
const RING = [627, 608], CHARM = [662, 560], APPLE = [625, 623], PHONE = [523, 764];

function buildEdit() {
  SH.length = 0;
  // ---- intro / title
  shot(0, 2.24, { bg: 'verse_ring_charm', blur: 2, dim: 0.45, cam: { z0: 1.12, z1: 1.0 }, title: true,
    layers: [PROP('prop_pinky_ring', [CX, 560], 0.62, { rot: -0.2, sway: 0.05, rimA: 0.9 })], fx: ['bokehBig', 'glints'], grade: { soft: P.violet, softA: 0.35 }, tin: 'fadeIn' });
  // ---- verse 1
  shot(2.24, 4.55, { bg: 'verse_ring_charm', blur: 2, cam: { z0: 1.0, z1: 1.08, x0: 20, x1: -30 }, lz: 'lower',
    layers: [PROP('prop_pinky_ring', [760, 470], 0.95, { rot: -0.15, sway: 0.04, rimA: 0.85 })], fx: ['bokeh', 'glints'], grade: { soft: P.pink, softA: 0.25 }, tin: 'flash' });
  shot(4.55, 6.9, { bg: 'verse_ring_charm', blur: 1, cam: { z0: 1.06, z1: 1.0, y0: 20, y1: -10 }, lz: 'lower',
    layers: [AF('character_a_charm', 'waist', [1180, 300])], fx: ['bokeh', 'leakR'], grade: { soft: P.pink, softA: 0.2 } });
  shot(6.9, 8.5, { bg: 'verse_ring_charm', blur: 2, cam: { z0: 1.0, z1: 1.1 }, lz: 'right',
    layers: [PROP('prop_love_charm', [640, 470], 0.72, { rot: 0.1, sway: 0.12, rim: P.cyan })], fx: ['bokeh', 'glints', 'heartsSoft'], grade: { soft: P.pink, softA: 0.25 } });
  shot(8.5, 10.04, { bg: 'verse_ring_charm', blur: 0, cam: { z0: 1.0, z1: 1.06, x0: -30, x1: 20 }, lz: 'right',
    layers: [AF('character_a_charm', 'full', [620, 190], { shadow: true })], fx: ['bokeh', 'leakL'], grade: { soft: P.pink, softA: 0.2 } });
  shot(10.04, 12.0, { bg: 'verse_ring_charm', blur: 1, dim: 0.25, cam: { z0: 1.04, z1: 1.0 }, lz: 'lower',
    layers: [AF('character_a_wait', 'chest', [1250, 360], { rim: P.violet, rimA: 0.6 })], fx: ['bokehDim'], grade: { soft: '#5A6BFF', softA: 0.3, desat: 0.25 }, tin: 'dip' });
  shot(12.0, 13.98, { bg: 'verse_ring_charm', blur: 2, dim: 0.35, cam: { z0: 1.0, z1: 1.12, r0: 0.02, r1: -0.02 }, lz: 'lower',
    layers: [PROP('prop_love_charm', [CX, 430], 0.62, { rot: 0.5, sway: 0.03, rim: P.violet, rimA: 0.4, dy: 0 })], fx: ['bokehDim', 'charmFall'], grade: { soft: '#5A6BFF', softA: 0.35, desat: 0.35 } });
  shot(13.98, 16.1, { bg: 'verse_ring_charm', blur: 1, cam: { z0: 1.0, z1: 1.07, x0: 30, x1: -20 }, lz: 'left',
    layers: [BF('character_b_peace', 'waist', [1330, 300], { rim: P.gold })], fx: ['bokeh', 'hearts', 'leakR'], grade: { soft: P.gold, softA: 0.2 }, tin: 'flash' });
  shot(16.1, 18.36, { bg: 'chorus_heartstage', blur: 2, cam: { z0: 1.0, z1: 1.05 }, lz: 'upper',
    layers: [BF('character_b_cheer', 'knee', [1180, 450], { rim: P.gold }), Object.assign({ id: 'silhouette_a_neutral_black', focus: [520, 300], at: [430, 520], s: 1.25, depth: 1.5, defocus: true, alpha: 0.95 })],
    fx: ['bokeh', 'beamsSoft'], grade: { soft: P.violet, softA: 0.3 } });
  // ---- pre-chorus 1
  shot(18.36, 20.25, { bg: 'prechorus_wait', blur: 0, cam: { z0: 1.0, z1: 1.08 }, lz: 'right',
    layers: [AF('character_a_wait', 'full', [640, 200], { shadow: true, rim: P.cyan })], fx: ['spot', 'dust'], grade: { soft: P.violet, softA: 0.3 }, tin: 'whip' });
  shot(20.25, 22.5, { bg: 'prechorus_wait', blur: 2, cam: { z0: 1.0, z1: 1.1, x0: 0, x1: -40 }, lz: 'left',
    layers: [AF('character_a_wait', 'face', [1260, 400], { rim: P.cyan })], fx: ['dust', 'leakR'], grade: { soft: P.violet, softA: 0.3 } });
  shot(22.5, 24.35, { bg: 'prechorus_wait', blur: 1, cam: { z0: 1.12, z1: 1.0, ease: outExpo }, lz: 'right',
    layers: [AF('character_a_peace', 'waist', [700, 300], { rim: P.pink, punch: 0.015 })], fx: ['spot', 'dust', 'glints'], grade: { soft: P.pink, softA: 0.25 }, tin: 'flash' });
  shot(24.35, 26.1, { bg: 'prechorus_wait', blur: 1, cam: { z0: 1.0, z1: 1.06 }, lz: 'left',
    layers: [{ id: 'silhouette_b_dance_white_blackbg', focus: [512, 700], at: [1300, 560], s: 0.72, depth: 1, rim: P.pink, rimA: 1, tint: '#FFE6F4' }], fx: ['spotR', 'beamsSoft'], grade: { soft: P.pink, softA: 0.3 } });
  // build: one beat per image, zooming harder
  const build = [['prop_pinky_ring', null], ['character_a_wait', 'face'], ['prop_love_charm', null], ['character_b_heartthief', 'face']];
  const bt = [26.1, 26.52, 26.96, 27.4, 27.82];
  build.forEach(([id, kind], i) => shot(bt[i], bt[i + 1], { bg: i % 2 ? 'prechorus_wait' : 'chorus_heartstage', blur: 2, dim: 0.2, lz: 'left',
    cam: { z0: 1.0 + i * 0.04, z1: 1.12 + i * 0.05, ease: outCubic },
    layers: [kind ? (id.includes('_a_') ? AF : BF)(id, kind, [1250, 420]) : PROP(id, [1250, 520], 0.6, { rot: i * 0.2 })], fx: ['beams'], grade: { soft: P.hot, softA: 0.3 }, tin: i ? 'cut' : 'flash' }));
  // ---- chorus 1
  chorus(27.82, 1);
  // ---- interlude (dance break)
  shot(42.72, 45.5, { bg: 'chorus_heartstage', blur: 0, cam: { z0: 1.12, z1: 1.0, y0: 60, y1: 0, ease: outCubic }, lz: 'none',
    layers: [AF('character_a_cheer', 'full', [650, 210], { shadow: true, punch: 0.01 }), BF('character_b_cheer', 'full', [1270, 215], { shadow: true, punch: 0.01, flip: true, focus: [1024 - 430, 130] })],
    fx: ['beams', 'confetti', 'bokeh'], grade: { soft: P.violet, softA: 0.2 }, tin: 'flash' });
  shot(45.5, 47.35, { bg: 'chorus_heartstage', blur: 2, cam: { z0: 1.0, z1: 1.1, r0: -0.04, r1: 0.03 }, lz: 'none',
    layers: [BF('character_b_dance', 'knee', [980, 330], { punch: 0.02 })], fx: ['beams', 'strobe', 'bokeh'], grade: { soft: P.hot, softA: 0.25 }, tin: 'whip' });
  shot(47.35, 49.2, { bg: 'chorus_heartstage', blur: 2, cam: { z0: 1.1, z1: 1.0, r0: 0.03, r1: -0.03 }, lz: 'none',
    layers: [AF('character_a_peace', 'knee', [920, 320], { punch: 0.02 })], fx: ['beams', 'strobe', 'bokeh'], grade: { soft: P.cyan, softA: 0.2 }, tin: 'whip' });
  shot(49.2, 51.1, { bg: 'grad', colors: [P.hot, '#3A0F6E'], cam: { z0: 1.0, z1: 1.05 }, lz: 'none',
    layers: [], panels: 'split', fx: ['confetti'], tin: 'flash' });
  shot(51.1, 53.0, { bg: 'grad', colors: ['#27D8F0', '#241060'], cam: { z0: 1.05, z1: 1.0 }, lz: 'none',
    layers: [
      { id: 'silhouette_a_cheer_white_blackbg', focus: [512, 760], at: [560, 560], s: 0.66, rim: P.hot, rimA: 1, punch: 0.03, tint: '#FFFFFF' },
      { id: 'silhouette_b_dance_white_blackbg', focus: [512, 760], at: [1360, 560], s: 0.66, rim: P.hot, rimA: 1, punch: 0.03, tint: '#FFFFFF' }],
    fx: ['strobe', 'hearts'], tin: 'cut' });
  shot(53.0, 55.2, { bg: 'chorus_heartstage', blur: 1, cam: { z0: 1.0, z1: 1.08, x0: -40, x1: 40 }, lz: 'none',
    layers: [BF('character_b_cheer', 'waist', [960, 330], { punch: 0.015 })], fx: ['beams', 'confetti'], grade: { soft: P.gold, softA: 0.2 }, tin: 'whip' });
  shot(55.2, 57.26, { bg: 'social_night', blur: 1, dim: 0.2, cam: { z0: 1.0, z1: 1.18, ease: inOut }, lz: 'none',
    layers: [AF('character_a_phone_check', 'knee', [860, 330], { rim: P.cyan })], fx: ['bokehNight', 'phoneGlow'], grade: { soft: '#3B5BFF', softA: 0.35 }, tin: 'dip' });
  // ---- verse 2 (the phone, night)
  shot(57.26, 59.0, { bg: 'social_night', blur: 2, cam: { z0: 1.0, z1: 1.08, r0: -0.03, r1: 0.0 }, lz: 'left',
    layers: [PROP('prop_generic_story_phone', [1320, 540], 0.62, { rot: 0.08, sway: 0.02, rim: P.cyan })], fx: ['bokehNight', 'heartsUp'], grade: { soft: '#3B5BFF', softA: 0.3 }, tin: 'zoom' });
  shot(59.0, 60.78, { bg: 'social_night', blur: 1, dim: 0.15, cam: { z0: 1.04, z1: 1.0, x0: 30, x1: 0 }, lz: 'right',
    layers: [AF('character_a_phone_check', 'chest', [640, 360], { rim: P.cyan })], fx: ['bokehNight', 'phoneGlow'], grade: { soft: '#3B5BFF', softA: 0.3 } });
  shot(60.78, 62.8, { bg: 'social_night', blur: 2, cam: { z0: 1.0, z1: 1.12 }, lz: 'right',
    layers: [], panels: 'phoneB', fx: ['bokehNight', 'heartsUp'], grade: { soft: '#3B5BFF', softA: 0.3 }, tin: 'whip' });
  shot(62.8, 64.8, { bg: 'social_night', blur: 2, dim: 0.2, cam: { z0: 1.08, z1: 1.0 }, lz: 'left',
    layers: [AF('character_a_phone_check', 'face', [1250, 420], { rim: P.cyan })], fx: ['bokehNight', 'phoneGlow'], grade: { soft: '#3B5BFF', softA: 0.3 } });
  shot(64.8, 67.6, { bg: 'social_night', blur: 2, cam: { z0: 1.0, z1: 1.06 }, lz: 'lower',
    layers: [], panels: 'likes', fx: ['heartsMany'], grade: { soft: P.pink, softA: 0.25 }, tin: 'flash' });
  shot(67.6, 70.0, { bg: 'social_night', blur: 2, dim: 0.35, cam: { z0: 1.0, z1: 1.1 }, lz: 'right',
    layers: [AF('character_a_wait', 'waist', [560, 310], { rim: '#5A6BFF', rimA: 0.5 })], fx: ['glitch'], grade: { soft: '#2A3BFF', softA: 0.4, desat: 0.45 }, tin: 'glitch' });
  shot(70.0, 72.56, { bg: 'social_night', blur: 2, dim: 0.5, cam: { z0: 1.0, z1: 1.14, x0: 0, x1: 30 }, lz: 'left',
    layers: [AF('character_a_wait', 'face', [1240, 420], { rim: '#5A6BFF', rimA: 0.5 })], fx: ['glitch'], grade: { soft: '#2A3BFF', softA: 0.4, desat: 0.5 }, tin: 'glitch' });
  // ---- pre-chorus 2
  shot(72.56, 74.6, { bg: 'prechorus_wait', blur: 0, dim: 0.25, cam: { z0: 1.0, z1: 1.05 }, lz: 'upper',
    layers: [{ id: 'silhouette_a_neutral_black', focus: [512, 1500], at: [CX, 1010], s: 0.5, depth: 1, rim: P.cyan, rimA: 0.9 }], fx: ['spotC', 'dust'], grade: { soft: P.violet, softA: 0.35 }, tin: 'dip' });
  shot(74.6, 76.48, { bg: 'prechorus_wait', blur: 1, cam: { z0: 1.04, z1: 1.0, x0: -20, x1: 20 }, lz: 'right',
    layers: [AF('character_a_wait', 'knee', [650, 300], { rim: P.cyan })], fx: ['spot', 'dust'], grade: { soft: P.violet, softA: 0.3 } });
  shot(76.48, 78.6, { bg: 'prechorus_wait', blur: 2, cam: { z0: 1.0, z1: 1.08 }, lz: 'right',
    layers: [AF('character_a_charm', 'chest', [560, 360], { rim: P.pink })], fx: ['leakL', 'glints', 'dust'], grade: { soft: P.pink, softA: 0.3 }, tin: 'flash' });
  shot(78.6, 80.2, { bg: 'prechorus_wait', blur: 2, cam: { z0: 1.0, z1: 1.14, ease: inOut }, lz: 'right',
    layers: [PROP('prop_love_charm', [680, 480], 0.72, { rot: -0.1, sway: 0.1, rim: P.hot, rimA: 1, punch: 0.04 })], fx: ['glints', 'heartsSoft'], grade: { soft: P.pink, softA: 0.35 } });
  const bt2 = [80.2, 80.51, 80.82, 81.13, 81.44];
  [['character_a_charm', 'face'], ['prop_pinky_ring', null], ['character_b_peace', 'face'], ['prop_bitten_apple', null]].forEach(([id, kind], i) => shot(bt2[i], bt2[i + 1], {
    bg: i % 2 ? 'chorus_heartstage' : 'prechorus_wait', blur: 2, dim: 0.15, lz: 'right', cam: { z0: 1.0 + i * 0.05, z1: 1.14 + i * 0.05, ease: outCubic },
    layers: [kind ? (id.includes('_a_') ? AF : BF)(id, kind, [680, 420]) : PROP(id, [680, 520], 0.6, { rot: -i * 0.15 })], fx: ['beams'], grade: { soft: P.hot, softA: 0.3 }, tin: i ? 'cut' : 'flash' }));
  // ---- chorus 2
  chorus(81.44, 2);
  // ---- outro: dance break to the end card
  shot(96.52, 99.0, { bg: 'chorus_heartstage', blur: 0, cam: { z0: 1.15, z1: 1.0, ease: outCubic }, lz: 'none',
    layers: [AF('character_a_cheer', 'full', [640, 210], { shadow: true, punch: 0.012 }), BF('character_b_dance', 'full', [1290, 220], { shadow: true, punch: 0.012 })],
    fx: ['beams', 'confetti', 'bokeh'], grade: { soft: P.violet, softA: 0.2 }, tin: 'flash' });
  shot(99.0, 100.85, { bg: 'chorus_heartstage', blur: 2, cam: { z0: 1.0, z1: 1.1, r0: 0.04, r1: -0.02 }, lz: 'none',
    layers: [BF('character_b_point', 'waist', [960, 320], { punch: 0.02 })], fx: ['beams', 'strobe', 'bokeh'], grade: { soft: P.hot, softA: 0.25 }, tin: 'whip' });
  shot(100.85, 102.7, { bg: 'chorus_heartstage', blur: 2, cam: { z0: 1.1, z1: 1.0, r0: -0.04, r1: 0.02 }, lz: 'none',
    layers: [AF('character_a_cheer', 'knee', [960, 330], { punch: 0.02 })], fx: ['beams', 'strobe', 'bokeh'], grade: { soft: P.cyan, softA: 0.2 }, tin: 'whip' });
  shot(102.7, 104.6, { bg: 'grad', colors: ['#FF7A3D', '#5A0F6E'], cam: { z0: 1.0, z1: 1.05 }, lz: 'none', layers: [], panels: 'split2', fx: ['confetti'], tin: 'flash' });
  shot(104.6, 106.5, { bg: 'grad', colors: [P.hot, '#241060'], cam: { z0: 1.05, z1: 1.0 }, lz: 'none',
    layers: [
      { id: 'silhouette_a_peace_white_blackbg', focus: [512, 760], at: [560, 560], s: 0.66, rim: P.cyan, rimA: 1, punch: 0.03, tint: '#FFFFFF' },
      { id: 'silhouette_b_peace_white_blackbg', focus: [512, 760], at: [1360, 560], s: 0.66, rim: P.cyan, rimA: 1, punch: 0.03, tint: '#FFFFFF' }],
    fx: ['strobe', 'hearts'], tin: 'cut' });
  shot(106.5, 108.35, { bg: 'verse_ring_charm', blur: 2, cam: { z0: 1.0, z1: 1.12 }, lz: 'none',
    layers: [PROP('prop_pinky_ring', [CX, 500], 0.9, { rot: 0.1, sway: 0.06, rimA: 1, punch: 0.03 })], fx: ['glints', 'bokeh'], grade: { soft: P.pink, softA: 0.25 }, tin: 'whip' });
  shot(108.35, 110.2, { bg: 'chorus_heartstage', blur: 1, cam: { z0: 1.08, z1: 1.0 }, lz: 'none',
    layers: [BF('character_b_heartthief', 'waist', [960, 320], { punch: 0.015 })], fx: ['beams', 'hearts'], grade: { soft: P.pink, softA: 0.2 }, tin: 'flash' });
  shot(110.2, 112.1, { bg: 'chorus_heartstage', blur: 1, cam: { z0: 1.0, z1: 1.08 }, lz: 'none',
    layers: [AF('character_a_peace', 'waist', [960, 320], { punch: 0.015 })], fx: ['beams', 'glints'], grade: { soft: P.cyan, softA: 0.2 }, tin: 'whip' });
  shot(112.1, 114.6, { bg: 'chorus_heartstage', blur: 0, cam: { z0: 1.0, z1: 1.08, y0: 0, y1: -20 }, lz: 'none',
    layers: [AF('character_a_peace', 'full', [690, 215], { shadow: true, punch: 0.01 }), BF('character_b_heartthief', 'full', [1240, 215], { shadow: true, punch: 0.01 })],
    fx: ['beams', 'confetti', 'bokeh', 'hearts'], grade: { soft: P.violet, softA: 0.15 }, tin: 'flash' });
  shot(114.6, SONG, { bg: 'chorus_heartstage', blur: 2, dim: 0.35, cam: { z0: 1.0, z1: 1.1, ease: t => t }, lz: 'none', endcard: true,
    layers: [], fx: ['bokehBig', 'glints', 'heartsSoft'], grade: { soft: P.violet, softA: 0.35 }, tin: 'xfade' });
  SH[0].t0 = 0; SH[SH.length - 1].t1 = SONG;
  for (let i = 1; i < SH.length; i++) SH[i].t0 = SH[i - 1].t1;   // contiguous after snapping
}
function chorus(t, k) {
  const two = k === 2;
  shot(t, t + 2.15, { bg: 'chorus_heartstage', blur: 0, cam: { z0: 1.25, z1: 1.0, y0: -120, y1: 0, ease: outExpo }, lz: 'lower',
    layers: two ? [BF('character_b_heartthief', 'full', [1150, 170], { shadow: true, punch: 0.012 }), AF('character_a_cheer', 'full', [620, 200], { shadow: true, punch: 0.012, alpha: 1 })]
      : [BF('character_b_heartthief', 'full', [CX, 170], { shadow: true, punch: 0.012 })],
    fx: ['beams', 'confetti', 'bokeh', 'hearts'], grade: { soft: P.violet, softA: 0.15 }, tin: 'flashBig' });
  shot(t + 2.15, t + 4.28, { bg: 'chorus_heartstage', blur: 2, cam: { z0: 1.0, z1: 1.08, x0: 40, x1: -40 }, lz: 'left',
    layers: [BF('character_b_heartthief', two ? 'chest' : 'waist', [1250, 330], { punch: 0.02 })], fx: ['beams', 'hearts', 'bokeh'], grade: { soft: P.pink, softA: 0.2 }, tin: 'whip' });
  shot(t + 4.28, t + 6.0, { bg: 'chorus_heartstage', blur: 2, cam: { z0: 1.06, z1: 1.0, r0: 0.03, r1: 0 }, lz: 'left',
    layers: [BF('character_b_peace', 'face', [1270, 400], { rim: P.gold, punch: 0.015 })], fx: ['glints', 'heartsSoft', 'leakR'], grade: { soft: P.gold, softA: 0.2 }, tin: 'flash' });
  shot(t + 6.0, t + 7.58, { bg: 'chorus_heartstage', blur: 1, cam: { z0: 1.0, z1: 1.12, r0: -0.06, r1: -0.03, ease: outCubic }, lz: 'right',
    layers: [BF(two ? 'character_b_point' : 'character_b_point', 'waist', [700, 320], { punch: 0.03 })], fx: ['beams', 'bokeh'], grade: { soft: P.hot, softA: 0.25 }, tin: 'zoom' });
  // みんなを惑わす — the crowd under her spell
  shot(t + 7.58, t + 9.35, { bg: 'chorus_heartstage', blur: 1, dim: 0.1, cam: { z0: 1.0, z1: 1.06, y0: 30, y1: 0 }, lz: 'upper', crowd: true,
    layers: [BF('character_b_cheer', 'knee', [CX, 520], { s: 0.62, punch: 0.02, rim: P.gold })], fx: ['beams', 'heartsUp'], grade: { soft: P.violet, softA: 0.2 }, tin: 'flash' });
  shot(t + 9.35, t + 11.12, { bg: 'chorus_heartstage', blur: 2, cam: { z0: 1.0, z1: 1.1, x0: -60, x1: 60 }, lz: 'right',
    layers: [BF('character_b_dance', 'knee', [720, 330], { punch: 0.02 })], fx: ['beams', 'strobe', 'bokeh'], grade: { soft: P.hot, softA: 0.2 }, tin: 'whip' });
  // 罪な人 — the bitten apple
  shot(t + 11.12, t + 13.0, { bg: 'chorus_heartstage', blur: 2, dim: 0.55, cam: { z0: 1.0, z1: 1.1 }, lz: 'right',
    layers: [PROP('prop_bitten_apple', [640, 540], 0.66, { rot: -0.12, sway: 0.05, rim: P.red, rimA: 1, punch: 0.03 })], fx: ['glints', 'leakRed'], grade: { mult: '#FF3060', multA: 0.25 }, tin: 'flash' });
  shot(t + 13.0, t + 14.9, two ? { bg: 'grad', colors: ['#FF3060', '#2A0A40'], cam: { z0: 1.0, z1: 1.05 }, lz: 'lower', panels: 'apples', layers: [], fx: ['heartsSoft'], tin: 'whip' }
    : { bg: 'chorus_heartstage', blur: 2, dim: 0.2, cam: { z0: 1.1, z1: 1.0 }, lz: 'left', layers: [BF('character_b_apple', 'chest', [1260, 360], { rim: P.red, punch: 0.02 })], fx: ['leakRed', 'glints'], grade: { mult: '#FF3060', multA: 0.15 }, tin: 'whip' });
}

/* ---------- panels (graphic compositions) ---------- */
function drawPanels(g, S, cam, t) {
  if (S.panels === 'split' || S.panels === 'split2') {
    const two = S.panels === 'split2';
    const slide = outExpo((t - S.t0) / 0.5);
    drawPanel(g, cam, t, { rect: [120 - (1 - slide) * 900, 150, 800, 780], rot: -0.04, fill: '#26D6F0', fill2: '#3A2BD0', depth: 0.9,
      inner: [AF(two ? 'character_a_peace' : 'character_a_cheer', 'waist', [520, 390], { rim: P.white, rimA: 0.6, punch: 0.02 })] });
    drawPanel(g, cam, t, { rect: [1000 + (1 - slide) * 900, 150, 800, 780], rot: 0.04, fill: '#FF4FA8', fill2: '#FFB23D', depth: 0.9,
      inner: [BF(two ? 'character_b_heartthief' : 'character_b_cheer', 'waist', [1400, 390], { rim: P.white, rimA: 0.6, punch: 0.02 })] });
  } else if (S.panels === 'phoneB') {                      // her story, seen on the phone
    const u = (t - S.t0) / (S.t1 - S.t0);
    drawPanel(g, cam, t, { rect: [470, 70, 520, 940], radius: 60, rot: -0.05 + 0.02 * u, fill: '#FFE3F0', fill2: '#FFC0DE', border: '#101018', stroke: 16, depth: 1,
      inner: [BF('character_b_peace', 'chest', [735, 380], { rim: P.gold, rimA: 0.5, bob: 0 })] });
    g.save(); withDepth(g, cam, 1, () => { g.translate(730, 540); g.rotate(-0.05 + 0.02 * u); g.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 3; i++) { g.globalAlpha = i === 0 ? 1 : 0.45; g.fillRect(-240 + i * 165, -445, 150, 7); } }); g.restore();
  } else if (S.panels === 'likes') {                       // likes pile up — a grid of her posts
    const u = (t - S.t0) / (S.t1 - S.t0);
    const ids = ['character_b_peace', 'character_b_cheer', 'character_b_heartthief', 'character_b_apple', 'character_b_point'];
    for (let i = 0; i < 5; i++) {
      const a = outCubic(clamp((t - S.t0 - i * 0.18) / 0.4));
      const x = 90 + i * 360, y = 170 + (i % 2) * 70 - (1 - a) * 80;
      g.save(); g.globalAlpha = a;
      drawPanel(g, cam, t, { rect: [x, y, 320, 480], radius: 30, rot: (i - 2) * 0.03, fill: ['#FFE3F0', '#E3F7FF', '#FFF4D6', '#FFE3F0', '#E3F7FF'][i], border: '#FFFFFF', stroke: 10, depth: 0.9 + i * 0.03,
        inner: [BF(ids[i], 'chest', [x + 160, y + 150], { s: 0.9, rim: P.pink, rimA: 0.3, bob: 0 })] });
      // heart + count badge
      withDepth(g, cam, 0.9 + i * 0.03, () => {
        g.fillStyle = P.hot; g.beginPath(); g.roundRect(x + 30, y + 400, 180, 54, 27); g.fill();
        g.drawImage(TEX.heart, x + 42, y + 410, 34, 34);
        g.fillStyle = '#fff'; g.font = '700 30px "Noto Sans JP"'; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillText(String(Math.floor(lerp(12, [2480, 5130, 9870, 3310, 7020][i], outCubic(u)))), x + 86, y + 428);
      });
      g.restore();
    }
  } else if (S.panels === 'apples') {
    drawPanel(g, cam, t, { rect: [140, 160, 780, 760], rot: -0.035, fill: '#3A0F4E', fill2: '#12062A', depth: 0.9, border: P.cyan,
      inner: [AF('character_a_apple', 'chest', [530, 400], { rim: P.red, rimA: 0.7 })] });
    drawPanel(g, cam, t, { rect: [1000, 160, 780, 760], rot: 0.035, fill: '#4E0F2A', fill2: '#12062A', depth: 0.9, border: P.pink,
      inner: [BF('character_b_apple', 'chest', [1390, 400], { rim: P.red, rimA: 0.7 })] });
  }
  if (S.crowd) {                                          // rows of silhouettes, heads bobbing to the kick, lit from the stage
    const ids = ['silhouette_a_neutral_black', 'silhouette_b_neutral_black', 'silhouette_a_cheer_black', 'silhouette_b_dance_black'];
    for (let row = 0; row < 2; row++) for (let i = 0; i < 9; i++) {
      const id = ids[(i + row * 2) % 4], x = -60 + i * 250 + row * 125 + Math.sin(t * 2 + i) * 6;
      const hop = kickPulse(t + i * 0.03) * 18;
      drawCut(g, { id, focus: [512, 300], at: [x, 900 + row * 140 - hop], s: 0.55 + row * 0.12, depth: 1.2 + row * 0.2, defocus: row === 1, tint: row ? '#0B0418' : '#1A0A30', rim: row ? null : P.pink, rimA: 0.6 }, cam, t);
    }
  }
}

/* ---------- effects ---------- */
function drawFx(g, S, cam, t, when) {
  for (const f of S.fx || []) {
    if (when === 'back') {
      if (f === 'beams') drawBeams(g, t, cam, { n: 7, alpha: 0.2 + energy(t) * 0.08 });
      if (f === 'beamsSoft') drawBeams(g, t, cam, { n: 5, alpha: 0.12, spread: 0.5 });
      if (f === 'spot') drawSpot(g, { x: 640 + cam.x * 0.3, alpha: 0.45 });
      if (f === 'spotR') drawSpot(g, { x: 1300 + cam.x * 0.3, alpha: 0.4, color: '#FFD0EA' });
      if (f === 'spotC') drawSpot(g, { x: CX, alpha: 0.55, w: 420 });
      if (f === 'bokeh') drawBokeh(g, t, cam, { n: 16, seed: 2, alpha: 0.3 });
      if (f === 'bokehDim') drawBokeh(g, t, cam, { n: 12, seed: 4, alpha: 0.18, colors: ['#7A8CFF', P.violet] });
      if (f === 'bokehNight') drawBokeh(g, t, cam, { n: 18, seed: 6, alpha: 0.28, colors: ['#4F7BFF', P.cyan, P.pink] });
      if (f === 'bokehBig') drawBokeh(g, t, cam, { n: 14, seed: 8, alpha: 0.32, size: [60, 200], drift: 8 });
      if (f === 'phoneGlow') drawLeak(g, t, { x: 520, y: 520, r: 700, color: '#3FA9FF', alpha: 0.3 });
    } else {
      if (f === 'glints') drawGlints(g, t, { n: 12, seed: Math.floor(S.t0 * 10) });
      if (f === 'dust') drawBokeh(g, t, cam, { n: 40, seed: 12, alpha: 0.45, size: [2, 7], colors: ['#FFFFFF', '#FFD9EE'], depth: 1.3, drift: 10 });
      if (f === 'hearts') drawHearts(g, t, cam, { n: 14, seed: Math.floor(S.t0) });
      if (f === 'heartsSoft') drawHearts(g, t, cam, { n: 12, seed: Math.floor(S.t0) + 2, alpha: 0.6, soft: true, size: [30, 90], rise: 50 });
      if (f === 'heartsUp') drawHearts(g, t, cam, { n: 20, seed: Math.floor(S.t0) + 4, rise: 150, size: [16, 44] });
      if (f === 'heartsMany') drawHearts(g, t, cam, { n: 40, seed: 77, rise: 220, size: [14, 50] });
      if (f === 'confetti') drawConfetti(g, t, cam, { seed: Math.floor(S.t0) });
      if (f === 'leakR') drawLeak(g, t, { x: W + 100, y: 100, color: P.pink, alpha: 0.35 });
      if (f === 'leakL') drawLeak(g, t, { x: -100, y: 200, color: P.cyan, alpha: 0.3 });
      if (f === 'leakRed') drawLeak(g, t, { x: 0, y: H, r: 1100, color: '#FF2040', alpha: 0.35 });
      if (f === 'charmFall') drawGlints(g, t, { n: 5, seed: 41, area: [700, 200, 520, 600], size: 40, alpha: 0.4 });
      if (f === 'strobe') { const p = kickPulse(t); if (p > 0.55) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (p - 0.55) * 0.35; g.fillStyle = '#FFE6F6'; g.fillRect(0, 0, W, H); g.restore(); } }
    }
  }
}

/* ---------- a whole shot ---------- */
function drawShot(g, S, t) {
  const u = clamp((t - S.t0) / (S.t1 - S.t0));
  const cam = camAt(S.cam || {}, u);
  const pk = /chorus/.test(S.bg) || S.bg === 'grad' ? kickPulse(t) * 0.006 : 0;   // tiny beat breathing on the camera
  cam.z += pk;
  S.t = t;
  drawBg(g, S, cam);
  drawFx(g, S, cam, t, 'back');
  for (const L of S.layers || []) if ((L.depth ?? 1) < 1.2) drawCut(g, L, cam, t);
  drawPanels(g, S, cam, t);
  for (const L of S.layers || []) if ((L.depth ?? 1) >= 1.2) drawCut(g, L, cam, t);
  drawFx(g, S, cam, t, 'front');
  if (S.title) {                                          // title reveal over the intro
    const a = smooth((t - 0.25) / 0.6) * (1 - smooth((t - 1.85) / 0.35));
    drawTitle(g, t, a, { y: CY - 10 });
  }
  if (S.endcard) {
    const a = smooth((t - S.t0 - 0.4) / 0.9);
    drawTitle(g, t, a, { y: CY - 30, size: 170 });
  }
  grade(g, S);
}

/* ---------- frame ---------- */
const frameCv = mk(W, H), fg = frameCv.getContext('2d');
const tmpA = mk(W, H), ta = tmpA.getContext('2d');
const small = mk(W / 4, H / 4), sm = small.getContext('2d');
const small2 = mk(W / 4, H / 4), sm2 = small2.getContext('2d');
const shotAt = t => SH.find(s => t >= s.t0 && t < s.t1) || SH[SH.length - 1];

function motionBlur(g, src, dx, dy, dz = 0, n = 8) {       // directional / zoom smear by averaging offset copies
  g.save(); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 / n;
  for (let i = 0; i < n; i++) { const k = i / (n - 1) - 0.5, z = 1 + dz * k; g.setTransform(z, 0, 0, z, CX - CX * z + dx * k, CY - CY * z + dy * k); g.drawImage(src, 0, 0); }
  g.restore(); g.setTransform(1, 0, 0, 1, 0, 0);
}
function renderPicture(t) {
  const S = shotAt(t), i = SH.indexOf(S), next = SH[i + 1];
  const dIn = t - S.t0, dOut = next ? next.t0 - t : 9;
  ta.setTransform(1, 0, 0, 1, 0, 0); ta.globalAlpha = 1; ta.globalCompositeOperation = 'source-over';
  drawShot(ta, S, t);
  fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalAlpha = 1; fg.globalCompositeOperation = 'source-over';
  const WH = 0.14;
  if ((S.tin === 'whip' && dIn < WH) || (next && next.tin === 'whip' && dOut < WH)) {
    const k = S.tin === 'whip' && dIn < WH ? 1 - dIn / WH : 1 - dOut / WH, dir = S.tin === 'whip' && dIn < WH ? -1 : 1;
    fg.save(); fg.translate(dir * k * 160, 0); fg.drawImage(tmpA, 0, 0); fg.restore();
    ta.drawImage(frameCv, 0, 0); motionBlur(fg, tmpA, 420 * k, 0, 0, 10);
  } else if ((S.tin === 'zoom' && dIn < 0.18) || (next && next.tin === 'zoom' && dOut < 0.18)) {
    const k = S.tin === 'zoom' && dIn < 0.18 ? 1 - dIn / 0.18 : 1 - dOut / 0.18;
    motionBlur(fg, tmpA, 0, 0, 0.35 * k, 10);
  } else if (S.tin === 'xfade' && dIn < 0.8) {
    const prev = SH[i - 1]; drawShot(fg, prev, t); fg.globalAlpha = smooth(dIn / 0.8); fg.drawImage(tmpA, 0, 0); fg.globalAlpha = 1;
  } else fg.drawImage(tmpA, 0, 0);
  // glitch: RGB-split slices around the cut and on kicks
  if (S.fx && S.fx.includes('glitch')) {
    const p = kickPulse(t), on = dIn < 0.2 || p > 0.75 || hash(Math.floor(t * 12)) > 0.9;
    if (on) {
      ta.setTransform(1, 0, 0, 1, 0, 0); ta.drawImage(frameCv, 0, 0);
      for (let k = 0; k < 7; k++) { const y = hash(Math.floor(t * 30) + k * 3) * H, h = 20 + hash(k + t) * 90, dx = (hash(k * 7 + Math.floor(t * 30)) - 0.5) * 120; fg.drawImage(tmpA, 0, y, W, h, dx, y, W, h); }
      fg.save(); fg.globalCompositeOperation = 'screen'; fg.globalAlpha = 0.35; fg.drawImage(tintOf({ tints: {}, img: tmpA }, 'img', '#FF2060'), 12, 0); fg.drawImage(tintOf({ tints: {}, img: tmpA }, 'img', '#20E0FF'), -12, 0); fg.restore();
    }
  }
  // flashes / dips at cuts
  const fl = S.tin === 'flashBig' ? 0.5 : S.tin === 'flash' ? 0.3 : 0;
  if (fl && dIn < fl) { fg.save(); fg.globalCompositeOperation = 'lighter'; fg.globalAlpha = Math.pow(1 - dIn / fl, 2) * (S.tin === 'flashBig' ? 1 : 0.75); fg.fillStyle = '#FFF0FA'; fg.fillRect(0, 0, W, H); fg.restore(); }
  if (next && (next.tin === 'flashBig') && dOut < 0.25) { fg.save(); fg.globalCompositeOperation = 'lighter'; fg.globalAlpha = Math.pow(1 - dOut / 0.25, 2) * 0.6; fg.fillStyle = '#FFF0FA'; fg.fillRect(0, 0, W, H); fg.restore(); }
  if (S.tin === 'dip' && dIn < 0.3) { fg.fillStyle = `rgba(5,2,14,${1 - dIn / 0.3})`; fg.fillRect(0, 0, W, H); }
  if (next && next.tin === 'dip' && dOut < 0.25) { fg.fillStyle = `rgba(5,2,14,${1 - dOut / 0.25})`; fg.fillRect(0, 0, W, H); }
  return S;
}

/* ---------- lyrics ---------- */
const LINES = JSON.parse(fs.readFileSync(path.join(__dirname, 'lyric_lines.json'), 'utf8'));
function lyricPlacement(t, S) {
  const L = LINES.find(l => t >= l.start - 0.05 && t < l.end + 0.9);
  if (!L) return null;
  const zoneName = S.lz === 'none' ? 'lower' : (S.lz || 'lower');
  const box = LINEBOX[L.line]; if (!box) return { x: 0, y: 0, s: 1, line: L };
  const z = Z[zoneName];
  const s = Math.min(1, z[2] / box[2], z[3] / box[3]);
  const cx = box[0] + box[2] / 2, cy = box[1] + box[3] / 2;
  return { s, x: z[0] + z[2] / 2 - cx * s, y: z[1] + z[3] / 2 - cy * s, line: L };
}
async function drawLyrics(g, f, S, t) {
  if (!LYR) return;
  const file = path.join(LYR, `f${String(f).padStart(5, '0')}.png`); if (!fs.existsSync(file)) return;
  const pl = lyricPlacement(t, S); if (!pl) return;
  const img = await loadImage(file);
  const L = pl.line, box = LINEBOX[L.line];
  if (box) {                                              // soft dark scrim under the words
    const a = smooth((t - L.start + 0.1) / 0.35) * (1 - smooth((t - L.end - 0.2) / 0.5));
    const cx = pl.x + (box[0] + box[2] / 2) * pl.s, cy = pl.y + (box[1] + box[3] / 2) * pl.s;
    g.save(); g.translate(cx, cy); g.scale(box[2] * pl.s * 0.62, box[3] * pl.s * 0.85);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, 'rgba(14,4,32,0.62)'); gr.addColorStop(0.6, 'rgba(14,4,32,0.4)'); gr.addColorStop(1, 'rgba(14,4,32,0)');
    g.globalAlpha = a; g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore();
  }
  g.save(); g.setTransform(pl.s, 0, 0, pl.s, pl.x, pl.y);
  g.shadowColor = 'rgba(12,2,30,0.85)'; g.shadowBlur = 26; g.shadowOffsetY = 6;          // lift the text off the picture
  g.drawImage(img, 0, 0);
  g.restore();
}

/* ---------- finishing ---------- */
function contrast(g, amount) {                           // overlay the picture on itself: deeper shadows, richer mids
  ta.setTransform(1, 0, 0, 1, 0, 0); ta.globalAlpha = 1; ta.globalCompositeOperation = 'copy'; ta.drawImage(frameCv, 0, 0); ta.globalCompositeOperation = 'source-over';
  g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = amount; g.drawImage(tmpA, 0, 0); g.restore();
}
function finish(g, t, f) {
  // bloom
  sm.clearRect(0, 0, small.width, small.height); sm.drawImage(frameCv, 0, 0, small.width, small.height);
  sm2.clearRect(0, 0, small.width, small.height); sm2.filter = 'blur(10px)'; sm2.drawImage(small, 0, 0); sm2.filter = 'none';
  g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.16 + energy(t) * 0.06; g.imageSmoothingQuality = 'high'; g.drawImage(small2, 0, 0, W, H); g.restore();
  g.drawImage(TEX.vignette, 0, 0);
  g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.05; g.drawImage(TEX.grain[f % 4], 0, 0, W, H); g.restore();
  if (t < 0.5) { g.fillStyle = `rgba(0,0,0,${1 - smooth(t / 0.5)})`; g.fillRect(0, 0, W, H); }
  if (t > SONG - 1.4) { g.fillStyle = `rgba(0,0,0,${smooth((t - (SONG - 1.4)) / 1.2)})`; g.fillRect(0, 0, W, H); }
}
async function renderFrame(f) {
  const t = f / FPS;
  const S = renderPicture(t);
  contrast(fg, 0.32);
  await drawLyrics(fg, f, S, t);
  finish(fg, t, f);
  return frameCv;
}

/* ---------- main ---------- */
async function main() {
  const bf = path.join(__dirname, 'lyric_boxes.json');
  if (fs.existsSync(bf)) LINEBOX = JSON.parse(fs.readFileSync(bf, 'utf8'));
  await loadAssets();
  buildEdit();
  fs.writeFileSync(path.join(__dirname, 'edit.json'), JSON.stringify(SH.map(s => ({ start: +s.t0.toFixed(3), end: +s.t1.toFixed(3), bg: s.bg, layers: (s.layers || []).map(l => l.id), panels: s.panels || null, lyricZone: s.lz || 'lower', transition: s.tin || 'cut' })), null, 1));
  if (opts.stills) {
    const dir = path.resolve(ROOT, opts.stilldir || 'renders/v3/stills'); fs.mkdirSync(dir, { recursive: true });
    const times = opts.stills === 'shots' ? SH.map(s => (s.t0 + s.t1) / 2) : opts.stills.split(',').map(Number);
    for (const t of times) { const cv = await renderFrame(Math.round(t * FPS)); fs.writeFileSync(path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.jpg`), cv.toBuffer('image/jpeg', 92)); }
    console.log(`${times.length} stills → ${dir}`); return;
  }
  const start = Number(opts.start || 0), dur = Number(opts.duration || SONG);
  const f0 = Math.round(start * FPS), n = Math.min(Math.round(dur * FPS), Math.round(SONG * FPS) - f0);
  const out = path.resolve(ROOT, opts.out || 'renders/v3/picture.mkv'); fs.mkdirSync(path.dirname(out), { recursive: true });
  // mezzanine: near-lossless x264 4:4:4 so the final encode starts from clean pixels
  const ff = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', 'pipe:0',
    '-c:v', 'libx264', '-preset', 'veryfast', '-qp', '4', '-pix_fmt', 'yuv444p', out], { stdio: ['pipe', 'ignore', 'inherit'] });
  const clock = Date.now();
  for (let i = 0; i < n; i++) {
    const cv = await renderFrame(f0 + i);
    if (!ff.stdin.write(cv.data())) await once(ff.stdin, 'drain');
    if (i % 150 === 0) console.log(`[${start}] frame ${f0 + i} ${((i + 1) / ((Date.now() - clock) / 1000)).toFixed(1)} fps`);
  }
  ff.stdin.end(); const [code] = await once(ff, 'close'); if (code) throw new Error('ffmpeg failed ' + code);
  console.log(`done ${out} ${n} frames in ${((Date.now() - clock) / 1000).toFixed(0)} s`);
}
main().catch(e => { console.error(e); process.exit(1); });
