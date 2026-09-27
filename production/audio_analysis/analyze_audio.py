#!/usr/bin/env python3
"""Local-only analysis of ハート泥棒.mp3; writes analysis.json."""
import json
import math
import subprocess
from pathlib import Path

import numpy as np
from scipy import fft, signal
from scipy.ndimage import uniform_filter1d


SOURCE = Path('media/audio/ハート泥棒.mp3')
OUT = Path(__file__).with_name('analysis.json')
SR = 48_000
CHANNELS = 2
HOP = 480                         # 10 ms onset analysis
NFFT = 2048
BIN_S = 0.1


def run_json(cmd):
    return json.loads(subprocess.check_output(cmd, text=True))


def dbfs(x):
    return 20.0 * np.log10(np.maximum(x, 1e-6))


def robust_z(x):
    med = np.median(x)
    mad = np.median(np.abs(x - med)) * 1.4826
    if mad < 1e-9:
        return x * 0.0
    return (x - med) / mad


def tempo_analysis(onset, duration):
    # Global autocorrelation of the 100 Hz spectral-flux envelope. This is a
    # tempo candidate generator, not a beat tracker trained on musical data.
    x = onset.astype(np.float64)
    x -= uniform_filter1d(x, size=201, mode='nearest')
    x -= x.mean()
    ac_n = 1 << int(math.ceil(math.log2(2 * len(x))))
    spec = fft.rfft(x, n=ac_n)
    ac = fft.irfft(spec * np.conjugate(spec), n=ac_n)[:len(x)]
    ac /= max(float(ac[0]), 1e-12)

    min_lag = int(round(60.0 / 200.0 / (HOP / SR)))
    max_lag = int(round(60.0 / 55.0 / (HOP / SR)))
    peaks, _ = signal.find_peaks(ac[min_lag:max_lag + 1], distance=2, prominence=0.002)
    peak_lags = [int(i + min_lag) for i in peaks]
    peak_lags.sort(key=lambda i: float(ac[i]), reverse=True)
    # Keep distinct tempo estimates, while retaining plausible half/double-time
    # readings since autocorrelation alone cannot disambiguate musical meter.
    selected_lags = []
    for lag in peak_lags:
        bpm = 60.0 / (lag * HOP / SR)
        if 55 <= bpm <= 200 and all(abs(60.0 / (old * HOP / SR) - bpm) > 2.5 for old in selected_lags):
            selected_lags.append(lag)
        if len(selected_lags) >= 6:
            break

    onset = np.asarray(onset, dtype=np.float64)
    frames = np.arange(len(onset), dtype=np.float64)
    candidates = []
    for lag in selected_lags:
        period_frames = float(lag)
        period_s = period_frames * HOP / SR
        phases = np.arange(0.0, period_frames, 1.0)
        phase_scores = []
        for phase in phases:
            beat_ix = np.arange(phase, len(onset), period_frames)
            idx = np.clip(np.rint(beat_ix).astype(int), 0, len(onset) - 1)
            phase_scores.append(float(np.mean(onset[idx])) if len(idx) else 0.0)
        phase_scores = np.asarray(phase_scores)
        best_phase_frames = int(np.argmax(phase_scores))
        best = float(phase_scores[best_phase_frames])
        phase_median = float(np.median(phase_scores))
        phase_p95 = float(np.percentile(phase_scores, 95))
        onset_p95 = float(np.percentile(onset, 95))
        contrast = max(0.0, (best - phase_median) / max(onset_p95 - phase_median, 1e-9))
        ac_strength = max(0.0, float(ac[lag]))
        # A raw periodicity score describes the strength of the evidence for a
        # period; final grid confidence is reduced when another tempo is close.
        evidence_score = float(np.clip(0.55 * ac_strength + 0.45 * contrast, 0, 1))
        candidates.append({
            'bpm': round(60.0 / period_s, 3),
            'period_s': round(period_s, 5),
            'autocorrelation_strength': round(ac_strength, 4),
            'phase_contrast': round(contrast, 4),
            'period_evidence_score_0_to_1': round(evidence_score, 3),
            'phase_s': round(best_phase_frames * HOP / SR, 3),
            'grid_onset_mean': round(best, 5),
            'grid_tick_count': int(math.ceil(max(0.0, duration - best_phase_frames * HOP / SR) / period_s)),
        })
    candidates.sort(key=lambda c: (c['period_evidence_score_0_to_1'], c['autocorrelation_strength']), reverse=True)
    if not candidates:
        return {'candidates': [], 'selected_candidate_index': None, 'beat_times_s': []}
    best = candidates[0]
    period = best['period_s']
    phase = best['phase_s']
    ticks = np.arange(phase, duration, period, dtype=float)
    second_score = candidates[1]['period_evidence_score_0_to_1'] if len(candidates) > 1 else 0.0
    relative_margin = max(0.0, (best['period_evidence_score_0_to_1'] - second_score) / max(best['period_evidence_score_0_to_1'], 1e-9))
    grid_confidence = float(np.clip(0.5 * best['period_evidence_score_0_to_1'] + 0.5 * relative_margin, 0, 1))
    for candidate in candidates:
        candidate_period = candidate['period_s']
        candidate_phase = candidate['phase_s']
        candidate_ticks = np.arange(candidate_phase, duration, candidate_period, dtype=float)
        candidate['beat_times_s'] = [round(float(t), 4) for t in candidate_ticks]
    return {
        'candidates': candidates,
        'selected_candidate_index': 0,
        'selected_bpm': best['bpm'],
        'selected_period_s': best['period_s'],
        'grid_phase_s': best['phase_s'],
        'grid_confidence_0_to_1': round(grid_confidence, 3),
        'selected_candidate_relative_margin_0_to_1': round(relative_margin, 3),
        'beat_times_s': [round(float(t), 4) for t in ticks],
        'interpretation_note': '候補はスペクトルフラックス自己相関と位相整列で選定。信頼度は周期証拠スコアと最有力候補との差を組み合わせた経験的値で確率ではない。倍/半テンポや代替周期は一意に決められないため各候補の拍列を併記。',
    }


def fine_tempo_scan(onset, duration):
    """Dense phase-optimized fit for the requested 126--132 BPM region."""
    hop_s = HOP / SR
    x = np.asarray(onset, dtype=np.float64)
    # Remove broad section loudness changes so the score reflects recurring
    # transient positions rather than merely a louder section.
    x = x - uniform_filter1d(x, size=201, mode='nearest')
    x = (x - np.mean(x)) / max(float(np.std(x)), 1e-9)
    bpm_values = np.round(np.arange(126.0, 132.0001, 0.01), 2)
    scores = np.full(len(bpm_values), -1e9, dtype=float)
    phases = np.zeros(len(bpm_values), dtype=float)
    for i, bpm in enumerate(bpm_values):
        period_s = 60.0 / bpm
        period_frames = period_s / hop_s
        phase_grid_s = np.arange(0.0, period_s, 0.003)
        n_beats = int(duration / period_s)
        beat_numbers = np.arange(n_beats, dtype=float)
        best_score = -1e9
        best_phase_s = 0.0
        for phase_s in phase_grid_s:
            positions = (phase_s + beat_numbers * period_s) / hop_s
            values = np.interp(positions, np.arange(len(x)), x)
            score = float(np.mean(values))
            if score > best_score:
                best_score = score
                best_phase_s = float(phase_s)
        scores[i] = best_score
        phases[i] = best_phase_s
    peak_ix, _ = signal.find_peaks(scores, distance=8)
    top_ix = sorted(peak_ix, key=lambda i: scores[i], reverse=True)[:10]
    best_ix = int(np.argmax(scores))
    best_bpm = float(bpm_values[best_ix])
    best_period = 60.0 / best_bpm
    best_phase = float(phases[best_ix])
    ticks = np.arange(best_phase, duration, best_period)
    second_local = max((scores[i] for i in top_ix if i != best_ix), default=-1e9)
    local_margin = float((scores[best_ix] - second_local) / max(abs(scores[best_ix]), 1e-9))

    def exact_candidate(target):
        idx = int(np.argmin(np.abs(bpm_values - target)))
        return {
            'requested_bpm': float(target),
            'nearest_scanned_bpm': float(bpm_values[idx]),
            'best_phase_s': round(float(phases[idx]), 4),
            'grid_score_z': round(float(scores[idx]), 5),
            'score_rank': int(1 + np.sum(scores > scores[idx])),
        }

    return {
        'method': '10 ms spectral-flux sequence; 2.01 s moving-average trend removed; evaluate beat-grid sample mean after phase optimization in 3 ms phase steps. Scores are z-scaled onset units, not probabilities.',
        'scan_range_bpm': [126.0, 132.0],
        'scan_step_bpm': 0.01,
        'best_bpm': round(best_bpm, 3),
        'best_period_s': round(best_period, 7),
        'best_phase_s': round(best_phase, 4),
        'best_grid_score_z': round(float(scores[best_ix]), 5),
        'margin_to_second_local_peak_fraction': round(local_margin, 4),
        'precision_note': '129.78 BPMの次点ピークも近く、129.30一点への精密確定はできない。一方129.03および130.43の直接比較では129.30の一致度が上。',
        'best_grid_times_s': [round(float(t), 4) for t in ticks],
        'compare_candidates': [exact_candidate(129.032), exact_candidate(130.435)],
        'top_local_maxima': [
            {'bpm': float(bpm_values[i]), 'phase_s': round(float(phases[i]), 4), 'grid_score_z': round(float(scores[i]), 5)}
            for i in top_ix
        ],
        'scan_curve': {
            'bpm_values': [float(v) for v in bpm_values],
            'phase_optimized_grid_score_z': [round(float(v), 5) for v in scores],
            'best_phase_s': [round(float(v), 4) for v in phases],
        },
        'confidence_note': '僅比較 onsets 對等間隔grid的相対適合度。歌唱/シンコペーション、サビの密度差、拍子解釈で最高点が変わり得るため確率ではない。',
    }


def boundary_candidates(feature_curves, times, duration):
    # Compare robustly scaled 4 s windows before/after each 0.1 s candidate.
    curves = [np.asarray(v, dtype=float) for v in feature_curves]
    standardized = [robust_z(v) for v in curves]
    radius = int(round(4.0 / BIN_S))
    scores = np.zeros(len(times), dtype=float)
    deltas = np.zeros((len(times), len(curves)), dtype=float)
    for i in range(radius, len(times) - radius):
        for j, arr in enumerate(standardized):
            before = np.median(arr[i - radius:i])
            after = np.median(arr[i:i + radius])
            deltas[i, j] = after - before
        scores[i] = float(np.linalg.norm(deltas[i])) / math.sqrt(len(curves))
    search = scores.copy()
    search[:radius] = 0
    search[len(times) - radius:] = 0
    peaks, props = signal.find_peaks(search, distance=int(4 / BIN_S), prominence=0.15)
    ranked = sorted(peaks, key=lambda i: scores[i], reverse=True)[:15]
    peak_details = []
    for i in ranked:
        peak_details.append({
            'time_s': round(float(times[i]), 1),
            'change_score_robust_z': round(float(scores[i]), 3),
            'feature_delta_robust_z': {
                'overall_rms': round(float(deltas[i, 0]), 3),
                'low_frequency_rms': round(float(deltas[i, 1]), 3),
                'onset_strength': round(float(deltas[i, 2]), 3),
            },
            'evidence': '前後4秒間の特徴量中央値の差。上昇/下降は delta の符号を示す。音楽的セクション名との対応は未確定。',
        })
    return {
        'method': '0.1秒特徴量を中央値/MADで標準化し、各時刻の前後4秒の中央値差を計算。4秒間隔で局所ピーク抽出。',
        'candidates': peak_details,
        'note': '候補は音響上の展開変化。歌詞セクション名や小節頭を確定したものではない。',
    }


def main():
    probe = run_json([
        'ffprobe', '-v', 'error', '-show_entries',
        'format=duration:format_tags:stream=codec_type,codec_name,sample_rate,channels,duration:stream_tags',
        '-of', 'json', str(SOURCE),
    ])
    audio_stream = next(s for s in probe['streams'] if s.get('codec_type') == 'audio')
    fmt = probe.get('format', {})
    tags = fmt.get('tags', {})
    ffprobe_duration = float(fmt['duration'])
    decoded = subprocess.run([
        'ffmpeg', '-v', 'error', '-i', str(SOURCE), '-map', '0:a:0',
        '-f', 'f32le', '-acodec', 'pcm_f32le', '-ar', str(SR), '-ac', str(CHANNELS), 'pipe:1',
    ], check=True, stdout=subprocess.PIPE).stdout
    pcm = np.frombuffer(decoded, dtype='<f4').reshape(-1, CHANNELS)
    sample_count = len(pcm)
    duration = sample_count / SR
    bin_samples = int(SR * BIN_S)
    if sample_count % bin_samples:
        raise RuntimeError('PCM sample count is not an integer number of 0.1 s bins')
    num_bins = sample_count // bin_samples
    times = np.arange(num_bins, dtype=float) * BIN_S
    rms = np.sqrt(np.mean(pcm.astype(np.float64).reshape(num_bins, bin_samples, CHANNELS) ** 2, axis=(1, 2)))

    sos = signal.butter(4, 150.0, btype='lowpass', fs=SR, output='sos')
    low = signal.sosfiltfilt(sos, pcm.astype(np.float32), axis=0)
    low_rms = np.sqrt(np.mean(low.astype(np.float64).reshape(num_bins, bin_samples, CHANNELS) ** 2, axis=(1, 2)))

    mono = np.mean(pcm, axis=1, dtype=np.float32)
    nframes = sample_count // HOP
    padded = np.pad(mono, (NFFT // 2, NFFT // 2))
    frame_view = np.lib.stride_tricks.sliding_window_view(padded, NFFT)[::HOP][:nframes]
    window = signal.windows.hann(NFFT, sym=False).astype(np.float32)
    magnitude = np.abs(fft.rfft(frame_view * window[None, :], axis=1)).astype(np.float32)
    log_magnitude = np.log1p(magnitude)
    flux = np.maximum(0.0, np.diff(log_magnitude, axis=0, prepend=log_magnitude[:1])).mean(axis=1)
    scale = max(float(np.percentile(flux, 99.5)), 1e-9)
    onset_100hz = np.clip(flux / scale, 0.0, 4.0)
    onset_mean = onset_100hz[:num_bins * 10].reshape(num_bins, 10).mean(axis=1)
    onset_peak = onset_100hz[:num_bins * 10].reshape(num_bins, 10).max(axis=1)
    tempo = tempo_analysis(onset_100hz, duration)
    tempo['fine_scan_126_to_132_bpm'] = fine_tempo_scan(onset_100hz, duration)
    fine = tempo['fine_scan_126_to_132_bpm']
    tempo['recommended_grid_126_to_132'] = {
        'bpm': fine['best_bpm'],
        'period_s': fine['best_period_s'],
        'phase_s': fine['best_phase_s'],
        'beat_times_s': fine['best_grid_times_s'],
        'relative_grid_score_z': fine['best_grid_score_z'],
        'confidence_note': fine['precision_note'],
    }

    # Acoustic transition candidates from the three requested signal families.
    sections = boundary_candidates([dbfs(rms), dbfs(low_rms), onset_mean], times, duration)

    threshold = 10 ** (-60.0 / 20.0)
    active_bins = np.flatnonzero(rms >= threshold)
    head_silence = float(times[active_bins[0]]) if len(active_bins) else duration
    tail_silence = float(max(0, num_bins - 1 - active_bins[-1]) * BIN_S) if len(active_bins) else duration
    absolute = np.max(np.abs(pcm), axis=1)
    first_nonzero = int(np.flatnonzero(absolute > 0)[0]) if np.any(absolute > 0) else sample_count
    last_nonzero = int(np.flatnonzero(absolute > 0)[-1]) if np.any(absolute > 0) else -1
    silence = {
        'threshold_dbfs': -60.0,
        'head_below_threshold_s_approx': round(head_silence, 3),
        'tail_below_threshold_s_approx': round(tail_silence, 3),
        'head_exact_zero_s': round(first_nonzero / SR, 6),
        'tail_exact_zero_s': round((sample_count - 1 - last_nonzero) / SR, 6),
        'definition': '先頭/末尾から、100 ms RMSが-60 dBFSを超える最初/最後の窓まで。exact_zeroは全chのPCM値が完全に0のサンプル数。',
    }

    result = {
        'schema_version': 1,
        'source': {
            'path': str(SOURCE),
            'title': tags.get('title'),
            'artist': tags.get('artist'),
            'ffprobe_codec': audio_stream.get('codec_name'),
            'ffprobe_sample_rate_hz': int(audio_stream.get('sample_rate', SR)),
            'ffprobe_channels': int(audio_stream.get('channels', CHANNELS)),
            'ffprobe_duration_s': ffprobe_duration,
            'embedded_lyrics_plain_text': tags.get('lyrics-eng'),
            'embedded_lyrics_timing': 'なし（通常テキスト。ここから歌詞時刻を割り当てていない）',
        },
        'validation': {
            'decoded_pcm_sample_rate_hz': SR,
            'decoded_pcm_channels': CHANNELS,
            'decoded_pcm_samples_per_channel': sample_count,
            'decoded_pcm_duration_s': round(duration, 9),
            'ffprobe_vs_pcm_duration_difference_s': round(duration - ffprobe_duration, 9),
            'sample_count_matches_ffprobe_duration': abs(duration - ffprobe_duration) <= 1.0 / SR,
        },
        'methodology': {
            'processing': 'ローカルffmpegでMP3を48 kHz stereo float PCMにデコード。RMSと150 Hz以下のlow-pass RMSは100 ms窓、スペクトルフラックスは10 ms hop/2048点Hann窓。',
            'onset_normalization': 'fluxを全曲99.5 percentileで除算、上限4。onset_strength_*はこの相対スケールで、絶対音量ではない。',
            'tempo_limitations': '自己相関は打楽器/伴奏の周期を示すが、拍の強拍位置や倍/半テンポ解釈を保証しない。候補と経験的信頼度を併記。',
        },
        'silence': silence,
        'tempo_and_beats': tempo,
        'section_boundary_candidates': sections,
        'features_100ms': {
            'interval_s': BIN_S,
            'time_s': [round(float(t), 1) for t in times],
            'rms_dbfs': [round(float(x), 2) for x in dbfs(rms)],
            'low_frequency_rms_dbfs_below_150hz': [round(float(x), 2) for x in dbfs(low_rms)],
            'onset_strength_mean': [round(float(x), 4) for x in onset_mean],
            'onset_strength_peak': [round(float(x), 4) for x in onset_peak],
        },
    }
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({
        'output': str(OUT),
        'decoded_duration_s': duration,
        'sample_count': sample_count,
        'silence': silence,
        'tempo': {k: tempo.get(k) for k in ['selected_bpm', 'grid_confidence_0_to_1', 'grid_phase_s']},
        'fine_tempo_scan': {k: tempo['fine_scan_126_to_132_bpm'].get(k) for k in ['best_bpm', 'best_phase_s', 'best_grid_score_z', 'compare_candidates', 'top_local_maxima']},
        'candidates': [{k: c.get(k) for k in ['bpm', 'period_s', 'autocorrelation_strength', 'phase_contrast', 'period_evidence_score_0_to_1', 'phase_s']} for c in tempo.get('candidates', [])[:6]],
        'section_candidates': sections['candidates'][:15],
        'feature_bins': num_bins,
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
