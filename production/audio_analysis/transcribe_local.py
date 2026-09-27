#!/usr/bin/env python3
"""Offline ASR using a locally cached faster-whisper model."""
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT / '.venv/lib/python3.12/site-packages'))

from faster_whisper import WhisperModel

SOURCE = Path('media/audio/ハート泥棒.mp3')
MODEL = Path(os.environ.get(
    'WHISPER_MODEL_DIR',
    '[LOCAL_HOME]/.cache/huggingface/hub/models--Systran--faster-whisper-medium/snapshots/08e178d48790749d25932bbc082711ddcfdfbc4f',
))


def norm(s):
    return re.sub(r'[^\wぁ-んァ-ン一-龯ー]', '', s).casefold()


def main():
    os.environ['HF_HUB_OFFLINE'] = '1'
    model = WhisperModel(str(MODEL), device='cpu', compute_type='int8', cpu_threads=6, num_workers=1)
    segments, info = model.transcribe(
        str(SOURCE),
        language='ja',
        beam_size=5,
        word_timestamps=True,
        condition_on_previous_text=False,
        vad_filter=False,
        temperature=0.0,
    )
    raw_segments = []
    all_words = []
    for s in segments:
        words = []
        for w in s.words or []:
            item = {
                'start_s': round(float(w.start), 3),
                'end_s': round(float(w.end), 3),
                'text': w.word,
                'probability': round(float(w.probability), 4),
            }
            words.append(item)
            all_words.append(item)
        raw_segments.append({
            'start_s': round(float(s.start), 3),
            'end_s': round(float(s.end), 3),
            'text': s.text,
            'avg_logprob': round(float(s.avg_logprob), 4),
            'no_speech_prob': round(float(s.no_speech_prob), 4),
            'words': words,
        })

    # Compare ASR word strings with the untimed lyrics embedded in the file.
    analysis_path = ROOT / 'analysis.json'
    analysis = json.loads(analysis_path.read_text(encoding='utf-8'))
    embedded = analysis['source'].get('embedded_lyrics_plain_text') or ''
    lyric_lines = []
    current_section = None
    for raw_line in embedded.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith('[') and line.endswith(']'):
            current_section = line[1:-1]
        else:
            lyric_lines.append({'section': current_section, 'text': line})

    normalized_words = [norm(w['text']) for w in all_words]
    matches = []
    cursor = 0
    for line_index, line in enumerate(lyric_lines):
        target = norm(line['text'])
        if not target:
            continue
        found = False
        for i in range(cursor, len(all_words)):
            combined = ''
            for j in range(i, min(i + 15, len(all_words))):
                combined += normalized_words[j]
                if combined == target:
                    probs = [all_words[k]['probability'] for k in range(i, j + 1)]
                    matches.append({
                        'embedded_line_index': line_index,
                        'section_label_from_metadata': line['section'],
                        'lyric_text_from_metadata': line['text'],
                        'start_s': all_words[i]['start_s'],
                        'end_s': all_words[j]['end_s'],
                        'matched_asr_words': [all_words[k]['text'] for k in range(i, j + 1)],
                        'mean_word_probability': round(sum(probs) / len(probs), 4),
                        'evidence': 'ASRの隣接word timestamp列が埋め込み歌詞行と正規化後に完全一致。',
                    })
                    cursor = j + 1
                    found = True
                    break
                if len(combined) >= len(target) or len(combined) > len(target) + 2:
                    break
            if found:
                break

    section_groups = [
        ('Verse', 0, 1),
        ('Pre-chorus', 2, 2),
        ('Chorus', 3, 4),
        ('Verse 2', 5, 6),
        ('Pre-chorus', 7, 7),
        ('Chorus', 8, 11),
    ]
    section_candidates = []
    for label, first, last in section_groups:
        group = raw_segments[first:last + 1]
        section_candidates.append({
            'section_label_from_embedded_lyrics_order': label,
            'start_s': group[0]['start_s'],
            'last_recognized_speech_end_s': group[-1]['end_s'],
            'asr_segment_indices_zero_based': list(range(first, last + 1)),
            'asr_text_evidence': ' '.join(item['text'] for item in group),
            'timing_note': 'Whisper segment boundary。個々の歌詞音素の開始時刻ではなく、歌唱区間/セクション開始候補。',
        })
    non_transcribed_intervals = []
    cursor_s = 0.0
    for s in raw_segments:
        if s['start_s'] - cursor_s >= 0.75:
            non_transcribed_intervals.append({'start_s': round(cursor_s, 3), 'end_s': s['start_s'], 'duration_s': round(s['start_s'] - cursor_s, 3)})
        cursor_s = max(cursor_s, s['end_s'])
    if info.duration - cursor_s >= 0.75:
        non_transcribed_intervals.append({'start_s': round(cursor_s, 3), 'end_s': round(float(info.duration), 3), 'duration_s': round(float(info.duration) - cursor_s, 3)})

    feature_data = analysis['features_100ms']
    outro_indices = [i for i, t in enumerate(feature_data['time_s']) if 96.5 <= t <= 116.5]
    outro_rms = [feature_data['rms_dbfs'][i] for i in outro_indices]
    outro_rms_median = sorted(outro_rms)[len(outro_rms) // 2] if outro_rms else None

    analysis['lyrics_asr_local'] = {
        'runtime': 'faster-whisper 1.2.1 / CTranslate2 4.8.2, local CPU int8',
        'model': f'Systran/{MODEL.parents[1].name.split("--")[-1]} (既存Hugging Face cache snapshot; HF_HUB_OFFLINE=1)',
        'language': info.language,
        'language_probability': round(float(info.language_probability), 4),
        'audio_duration_s_reported_by_asr': round(float(info.duration), 3),
        'prompt': None,
        'decoding': {'beam_size': 5, 'temperature': 0.0, 'word_timestamps': True, 'condition_on_previous_text': False, 'vad_filter': False},
        'note': '歌唱音声のASRは誤認識・省略があり得る。raw segment/word時刻はモデル出力。埋め込み歌詞行との完全一致だけを歌詞タイミング候補に採用し、未一致行に推測時刻は付与しない。',
        'embedded_lyric_lines': lyric_lines,
        'exact_line_matches': matches,
        'section_timing_candidates': section_candidates,
        'non_transcribed_intervals': non_transcribed_intervals,
        'non_transcribed_outro_acoustic_evidence': {
            'interval_s': [96.5, 116.5],
            'median_overall_rms_dbfs': outro_rms_median,
            'note': 'ASRに歌詞セグメントがなく、区間中の音量は維持。無音ではなくインストゥルメンタルのアウトロ候補。末尾約1秒で-60 dBFSを下回る。',
        },
        'segments': raw_segments,
    }
    analysis_path.write_text(json.dumps(analysis, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({
        'language': info.language,
        'language_probability': float(info.language_probability),
        'duration_s': float(info.duration),
        'segment_count': len(raw_segments),
        'word_count': len(all_words),
        'exact_lyric_line_matches': matches,
        'asr_segments': [{'start_s': s['start_s'], 'end_s': s['end_s'], 'text': s['text'], 'avg_logprob': s['avg_logprob']} for s in raw_segments],
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
