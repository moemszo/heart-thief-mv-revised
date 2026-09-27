// Renders the lyric subtitles with JIZURA (https://852wa.github.io/JIZURA/) itself.
// The site is loaded in headless Chromium from a local copy of its public repository (github.com/852wa/JIZURA),
// the song and the project JSON are loaded through the page's own file inputs, and every frame is drawn by
// JIZURA's renderer in its transparent mode — the same path as 「書き出し → 透過PNG（ZIP・背景なし）」.
//
//   JIZURA_DIR=/path/to/JIZURA node production/v3/jizura_export.cjs --out=renders/v3/lyrics [--times=3,30] [--start=0 --duration=118.8]
//
// Needs Playwright with Chromium (NODE_PATH pointing at a global install is fine).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const opts = Object.fromEntries(process.argv.slice(2).map(s => s.replace(/^--/, '').split('=')));
const JZ = process.env.JIZURA_DIR;
if (!JZ || !fs.existsSync(path.join(JZ, 'index.html'))) throw new Error('Set JIZURA_DIR to a clone of github.com/852wa/JIZURA');
const PROJECT = path.resolve(ROOT, opts.project || 'subtitles/ハート泥棒_字幕_v3.jizura.json');
const AUDIO = path.resolve(ROOT, 'media/audio/ハート泥棒.mp3');
const OUT = path.resolve(ROOT, opts.out || 'renders/v3/lyrics');
const FPS = 30;
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;   // Google Fonts
  const browser = await chromium.launch({ proxy, args: ['--ignore-certificate-errors'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.route('http://jizura.local/**', r => {
    const u = new URL(r.request().url());
    r.fulfill({ path: path.join(JZ, decodeURIComponent(u.pathname)) });
  });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto('http://jizura.local/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.J && J.ui && J.uiApi);

  // 曲を読み込む → プロジェクトを開く, through the page's own handlers (the project restores timing.snap=false,
  // which loading a song turns on)
  await page.route('http://files.local/song.mp3', r => r.fulfill({ path: AUDIO, contentType: 'audio/mpeg' }));
  await page.route('http://files.local/project.json', r => r.fulfill({ path: PROJECT, contentType: 'application/json' }));
  const an = await page.evaluate(async () => {
    const blob = await (await fetch('http://files.local/song.mp3')).blob();
    if (!(await J.uiApi.loadAudioFile(new File([blob], 'ハート泥棒.mp3', { type: 'audio/mpeg' })))) throw new Error('song not loaded');
    const pj = await (await fetch('http://files.local/project.json')).blob();
    const dt = new DataTransfer(); dt.items.add(new File([pj], 'project.jizura.json', { type: 'application/json' }));
    const input = document.getElementById('fileProject'); input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return document.getElementById('audioName').textContent;
  });
  console.log('audio:', an);
  await page.waitForFunction(() => J.ui.project.seed === 51820, null, { timeout: 30000 });
  await page.waitForTimeout(1000);

  const info = await page.evaluate(async () => {
    const S = J.ui;
    S.plan = J.plan(S.project, S.audio);
    // the compositor draws its own title card and instrumental breaks: keep only the lyric cuts
    S.plan.cuts = S.plan.cuts.filter(c => c.layout !== 'title' && c.layout !== 'interlude');
    await J.ensureFonts(S.project.lyrics + (S.project.title || ''), J.fontsOfPlan(S.plan));
    await document.fonts.ready;
    const [w, h] = J.outputSize(S.project);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    window.__jz = { cv, ctx: cv.getContext('2d'), R: new J.Renderer(), scale: w / S.plan.W };
    return {
      w, h, duration: S.plan.duration, fps: S.plan.fps, style: S.plan.style.name,
      cuts: S.plan.cuts.map(c => ({ line: c.line, text: c.text, start: +c.start.toFixed(2), end: +c.end.toFixed(2), layout: c.layout, enter: c.enter, hold: c.hold, exit: c.exit, treat: c.treat, cam: c.cam })),
    };
  });
  fs.writeFileSync(path.join(OUT, 'plan.json'), JSON.stringify(info, null, 1));
  console.log(`JIZURA plan: ${info.cuts.length} cuts, ${info.duration.toFixed(2)} s, ${info.w}x${info.h}, style ${info.style}`);

  const frameAt = t => page.evaluate(async t => {
    const z = window.__jz;
    z.ctx.clearRect(0, 0, z.cv.width, z.cv.height);
    z.R.frame(z.ctx, J.ui.plan, t, { scale: z.scale, transparent: true });
    const blob = await new Promise(r => z.cv.toBlob(r, 'image/png'));
    const u8 = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }, t);

  if (opts.times) {
    for (const t of opts.times.split(',').map(Number)) fs.writeFileSync(path.join(OUT, `still_${t.toFixed(2)}.png`), Buffer.from(await frameAt(t), 'base64'));
  } else {
    const start = Number(opts.start || 0), dur = Number(opts.duration || 118.8);
    const n = Math.round(dur * FPS), f0 = Math.round(start * FPS);
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      const f = f0 + i;
      fs.writeFileSync(path.join(OUT, `f${String(f).padStart(5, '0')}.png`), Buffer.from(await frameAt(f / FPS), 'base64'));
      if (i % 300 === 0) console.log(`frame ${f} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
