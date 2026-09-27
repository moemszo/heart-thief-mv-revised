import json
from pathlib import Path
P=Path(__file__).parent
shots=[]
def add(t,kind,**kw):shots.append(dict(start=t,kind=kind,transition='cut',**kw))
add(0,'object_v2',prop='prop_pinky_ring',side='center',size=500,dark=True,quiet=True)
add(1.04,'title',transitionDuration=.1)
add(2.24,'hands_v2',actor='character_a_charm',prop='prop_pinky_ring',dark=True,scale='insert')
add(5.04,'object_v2',prop='prop_pinky_ring',side='right',dark=True,size=680)
add(6.90,'bust_v2',actor='character_a_charm',side='left',color='#8165CC',dark=True,scale='upper')
add(8.72,'object_v2',prop='prop_love_charm',side='left',dark=True,size=600,quiet=True)
add(10.04,'empty_v2',bg='bg_verse_ring_charm',prop='prop_love_charm',quiet=True,transitionDuration=.5)
add(12.0,'face_v2',actor='character_a_phone_check',side='right',dark=True,quiet=True,scale='face')
add(13.98,'bust_v2',actor='character_b_heartthief',side='left',dark=True,color='#FF766E',scale='upper')
add(16.14,'face_v2',actor='character_b_heartthief',side='left',color='#FFE679',scale='face')
add(18.36,'bust_v2',actor='character_a_wait',side='right',dark=True,color='#3EE1E8',scale='upper')
add(20.22,'hands_v2',actor='character_a_charm',dark=True,scale='insert')
add(21.66,'heart_v2',dark=True,side='right',size=360)
add(22.50,'bust_v2',actor='character_a_peace',side='left',dark=True,color='#3EE1E8',scale='upper')
add(24.7,'face_v2',actor='character_a_charm',side='left',dark=True,scale='face')
add(26.16,'empty_v2',bg='bg_prechorus_wait',quiet=True,transitionDuration=.1)
add(27.34,'heart_v2',dark=True,size=210)
add(27.82,'heart_v2',dark=True,orbit=True,size=730,subtitleMode='center')
add(30.30,'bust_v2',actor='character_b_heartthief',side='right',dark=True,scale='upper')
add(32.10,'face_v2',actor='character_b_heartthief',side='left',color='#FFE679',scale='face')
add(33.72,'hands_v2',actor='character_b_heartthief',dark=True,scale='insert')
add(35.40,'silhouette_v2',side='left',dark=True,scale='upper')
add(37.26,'heart_v2',dark=True,side='left',size=590)
add(38.94,'object_v2',prop='prop_bitten_apple',side='right',dark=True,size=610)
add(40.65,'eyes_v2',actor='character_b_heartthief',scale='eyes',subtitleMode='bottom')
add(42.72,'chorus',variant=2,transitionDuration=.1,scale='wide')
add(44.6,'duet_v2',actors=['character_a_apple','character_b_apple'],scale='upper')
add(46.98,'object_v2',prop='prop_love_charm',side='center',size=640,dark=True)
add(48.85,'hands_v2',actor='character_a_charm',prop='prop_pinky_ring',dark=True,scale='insert')
add(50.70,'silhouette_v2',actor='silhouette_a_cheer_black',side='left',dark=True,scale='upper')
add(52.54,'object_v2',prop='prop_bitten_apple',side='center',size=760,color='#FF766E')
add(54.4,'empty_v2',bg='bg_social_night',dark=True,quiet=True)
add(57.26,'notifications_v2',dark=True)
add(60.78,'bust_v2',actor='character_a_phone_check',side='left',dark=True,color='#8165CC',quiet=True,scale='upper')
add(63.0,'face_v2',actor='character_a_phone_check',side='left',dark=True,quiet=True,scale='face')
add(64.8,'notifications_v2',dark=True)
add(67.6,'empty_v2',bg='bg_social_night',quiet=True,transitionDuration=.4)
add(69.7,'face_v2',actor='character_a_phone_check',side='right',dark=True,quiet=True,scale='face')
add(72.56,'bust_v2',actor='character_a_phone_check',side='left',dark=True,quiet=True,scale='upper')
add(75.82,'empty_v2',bg='bg_prechorus_wait',quiet=True)
add(76.48,'object_v2',prop='prop_love_charm',side='right',dark=True,quiet=True,size=470)
add(79.7,'face_v2',actor='character_a_charm',side='right',dark=True,quiet=True,scale='face')
add(81.44,'heart_v2',dark=True,orbit=True,size=860,subtitleMode='center')
add(83.8,'bust_v2',actor='character_b_point',side='right',dark=True,scale='upper')
add(85.76,'face_v2',actor='character_b_heartthief',side='left',color='#3EE1E8',scale='face')
add(87.5,'bust_v2',actor='character_b_heartthief',side='left',dark=True,scale='upper')
add(89.14,'silhouette_v2',actor='silhouette_a_cheer_black',side='right',dark=True,scale='upper')
add(91.0,'heart_v2',dark=True,side='right',size=540,orbit=False)
add(92.76,'object_v2',prop='prop_bitten_apple',side='left',dark=True,size=710)
add(94.5,'face_v2',actor='character_b_apple',side='left',dark=True,scale='face')
add(96.52,'chorus',variant=0,scale='wide')
add(98.62,'duet_v2',actors=['character_a_peace','character_b_heartthief'],scale='upper')
add(100.45,'eyes_v2',actor='character_b_heartthief',scale='eyes')
add(101.38,'eyes_v2',actor='character_a_phone_check',scale='eyes')
add(102.3,'object_v2',prop='prop_pinky_ring',side='center',size=770,dark=True)
add(104.16,'duet_v2',actors=['character_a_apple','character_b_apple'],scale='upper')
add(106.02,'heart_v2',dark=True,orbit=True,size=650)
add(107.88,'silhouette_v2',actor='silhouette_b_dance_black',side='left',dark=True,scale='upper')
add(109.74,'empty_v2',bg='bg_chorus_heartstage',quiet=True,dark=False)
add(112.08,'outro')
free={'object_v2','heart_v2','empty_v2','notifications_v2','outro'}
for i,s in enumerate(shots):
 s['end']=shots[i+1]['start'] if i+1<len(shots) else 118.8
 s['characterFree']=s['kind'] in free
 if s['transitionDuration'] if 'transitionDuration' in s else False:s['transition']='fade' if s.get('quiet') else 'cut'
 side=s.get('side','right')
 s['subtitle']={'x':970 if side=='left' else 15,'y':215,'w':950,'h':534}
 if s.get('subtitleMode')=='center':s['subtitle']={'x':80,'y':105,'w':1760,'h':990}
 if s.get('subtitleMode')=='bottom':s['subtitle']={'x':430,'y':570,'w':1060,'h':596}
 if s['kind']=='notifications_v2':s['subtitle']={'x':10,'y':250,'w':1030,'h':579}
 if s['kind']=='empty_v2':s['subtitle']={'x':70,'y':250,'w':1120,'h':630}
 if s.get('quiet') and s['kind'] in {'face_v2','bust_v2','object_v2'}:s['subtitle']['w']=850;s['subtitle']['h']=478
 if s['kind']=='face_v2' and side=='left':s['subtitle']={'x':1100,'y':250,'w':800,'h':450}
 s['id']=i+1
(P/'timeline.json').write_text(json.dumps({'bpm':129.3,'beat_offset':.108,'duration':118.8,'shots':shots},ensure_ascii=False,indent=2))
metrics={'shots':len(shots),'character_free_seconds':round(sum(s['end']-s['start'] for s in shots if s['characterFree']),2),'closeup_seconds':round(sum(s['end']-s['start'] for s in shots if s.get('scale') in {'upper','face','eyes','insert'}),2),'wide_seconds':round(sum(s['end']-s['start'] for s in shots if s.get('scale')=='wide'),2)}
(P/'metrics.json').write_text(json.dumps(metrics,indent=2));print(metrics)
