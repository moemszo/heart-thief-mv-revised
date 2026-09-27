from pathlib import Path
import json
p=json.load(open('[LOCAL_DOWNLOADS]/ハート泥棒.jizura.json'))
p.update(style='noir',mood=None,keyBg='black',aspect='16:9',res=1080,fps=30,includeAudio=False,centerFree=False,typeset=False,unify=True,wa=False,horror=False,extra=False,seed=271027)
p['fx'].update(motion=.42,glitch=0,chroma=0,decor=0,density=.2,texture=0,flash=False,bgSwitch=0,koma=0,onTwos=False,hud='off')
p['timing'].update(bpm=129.3,offset=0,snap=False,tail=.1,lineTimes={},lineScale=1)
recipes=[
 ('center','outlineFill','shimmer','blur'),('center','blur','still','blur'),('center','fadeStagger','still','blur'),('center','trackIn','breathe','blur'),
 ('center','knWordSlam','still','shrink'),('center','type','pulse','shrink'),('center','pop','heartbeat','zoomFar'),('center','trackIn','still','blur'),('center','assemble','wave','drift'),('center','pop','still','shrink'),
 None,
 ('notification','slideR','still','slideOutL'),('center','type','still','blur'),('center','pop','knWordPulse','shrink'),('center','blur','still','blur'),('center','fadeStagger','still','blur'),('center','type','still','blur'),('center','knWordSlam','heartbeat','zoomFar'),('center','outlineFill','still','blur'),('center','assemble','pulse','drift'),('center','pop','still','shrink'),None]
p['overrides']={str(i):dict(cuts=1,layout=r[0],enter=r[1],hold=r[2],exit=r[3],treat='none',decor=[],bg='none') for i,r in enumerate(recipes) if r}
p['locks']={}
for category in ['cam','trans']:
 for k in p['enabled'][category]:p['enabled'][category][k]=False
out=Path('outputs/heart_thief_mv_v2/ハート泥棒_字幕.jizura.json');out.write_text(json.dumps(p,ensure_ascii=False,indent=2))
Path('outputs/heart_thief_mv_v2/ハート泥棒_歌詞タイミング.lrc').write_text(p['lyrics'])
print(out.resolve())
