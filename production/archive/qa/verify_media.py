import json, subprocess
from pathlib import Path
import numpy as np

root=Path(__file__).resolve().parents[2]
movie=root/'outputs/heart_thief_mv_v2/ハート泥棒_MV_演出改訂版.mp4'
song=Path('[LOCAL_HOME]/Downloads/ハート泥棒.mp3')
ffmpeg='[LOCAL_HOME]/.local/bin/ffmpeg'
ffprobe='[LOCAL_HOME]/.local/bin/ffprobe'
probe=json.loads(subprocess.check_output([ffprobe,'-v','error','-show_format','-show_streams','-of','json',str(movie)]))
decoded=subprocess.run([ffmpeg,'-v','error','-i',str(movie),'-map','0:v:0','-map','0:a:0','-f','null','-'],capture_output=True)
def pcm(p):
 return np.frombuffer(subprocess.check_output([ffmpeg,'-v','error','-i',str(p),'-vn','-ac','1','-ar','8000','-t','118.8','-f','f32le','-']),dtype=np.float32)
a,b=pcm(song),pcm(movie)
n=min(len(a),len(b))
v=next(s for s in probe['streams'] if s['codec_type']=='video')
au=next(s for s in probe['streams'] if s['codec_type']=='audio')
report={
 'video':{k:v.get(k) for k in ['codec_name','width','height','r_frame_rate','nb_frames','start_time','duration']},
 'audio':{k:au.get(k) for k in ['codec_name','sample_rate','channels','start_time','duration']},
 'file_bytes':int(probe['format']['size']),
 'decode_exit':decoded.returncode,
 'decode_errors':decoded.stderr.decode(),
 'source_pcm_samples_8000hz':len(a),
 'output_pcm_samples_8000hz':len(b),
 'audio_zero_offset_correlation':float(np.corrcoef(a[:n],b[:n])[0,1]),
}
(Path(__file__).parent/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
if decoded.returncode or decoded.stderr or v['width']!=1920 or v['height']!=1080 or v['nb_frames']!='3564' or report['audio_zero_offset_correlation']<.99:
 raise SystemExit('Media verification requires attention')
