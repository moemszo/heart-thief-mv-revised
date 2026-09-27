"""Per-frame audio envelopes and kick onsets for the v3 renderer (30 fps)."""
import json, subprocess, sys
import numpy as np

FFMPEG = sys.argv[1] if len(sys.argv) > 1 else 'ffmpeg'
SR, FPS = 24000, 30
raw = subprocess.run([FFMPEG, '-v', 'error', '-i', 'media/audio/ハート泥棒.mp3', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                     check=True, capture_output=True).stdout
x = np.frombuffer(raw, np.float32)
dur = len(x) / SR
hop, win = SR // 200, 1024                       # 5 ms hop
n = (len(x) - win) // hop
frames = np.lib.stride_tricks.as_strided(x, (n, win), (x.strides[0] * hop, x.strides[0]))
spec = np.abs(np.fft.rfft(frames * np.hanning(win), axis=1))
freqs = np.fft.rfftfreq(win, 1 / SR)
def band(lo, hi):
    return np.log1p(spec[:, (freqs >= lo) & (freqs < hi)].sum(1) * 10)
low, high = band(30, 150), band(2000, 9000)
def flux(b):
    f = np.maximum(0, np.diff(b, prepend=b[0]))
    return f / (np.percentile(f, 99.5) + 1e-9)
kf, hf = flux(low), flux(high)
t = np.arange(n) * hop / SR
# kick peaks: local maxima of low-band flux above an adaptive threshold, >= 0.2 s apart
kicks = []
thr = np.convolve(kf, np.ones(200) / 200, 'same') * 1.8 + 0.18
for i in range(2, n - 2):
    if kf[i] > thr[i] and kf[i] == kf[i - 2:i + 3].max():
        if not kicks or t[i] - kicks[-1] > 0.2:
            kicks.append(round(float(t[i]), 3))
# frame envelopes
nf = int(round(dur * FPS))
rms = np.sqrt(np.convolve(x ** 2, np.ones(SR // FPS) / (SR // FPS), 'same'))
env = np.array([rms[min(len(rms) - 1, int((k + 0.5) / FPS * SR))] for k in range(nf)])
env = np.convolve(env, np.ones(9) / 9, 'same'); env = env / np.percentile(env, 98)
hi_env = np.array([hf[min(n - 1, int((k + 0.5) / FPS * 200))] for k in range(nf)])
json.dump({'fps': FPS, 'duration': dur, 'kicks': kicks,
           'energy': [round(float(v), 3) for v in np.clip(env, 0, 1.5)],
           'hats': [round(float(v), 3) for v in np.clip(hi_env, 0, 2)]},
          open('production/v3/beats.json', 'w'))
k = np.array(kicks); d = np.diff(k)
print('duration', dur, 'kicks', len(kicks), 'median gap', np.median(d))
bp = 60 / 129.3
ph = ((k - 0.108) / bp) % 1
print('phase vs 129.3 grid hist', np.histogram(ph, bins=8, range=(0, 1))[0])
print(kicks[:40])
