import json
from pathlib import Path
rows=[
(0,'intro',{}),(1.036,'title',{'transition':'iris'}),
(2.24,'ring',{}),(5.04,'ringmacro',{'transition':'iris'}),(6.90,'charm',{'transition':'fade'}),
(10.04,'portrait',{'actor':'character_a_wait','bg':'bg_verse_ring_charm','variant':1}),
(13.98,'portrait',{'actor':'character_b_heartthief','variant':0}),(16.14,'split',{'variant':0}),
(18.36,'wait',{'transition':'flash'}),(21.66,'detail',{'actor':'character_a_wait','variant':1}),
(22.5,'portrait',{'actor':'character_a_wait','variant':1}),
(24.70,'silhouettes',{'variant':1,'actor':'silhouette_b_neutral_black','other':'silhouette_a_neutral_black'}),
(26.5,'staccato',{'transitionDuration':.15}),
(27.82,'chorus',{'variant':0,'transition':'iris'}),
(30.3,'triptych',{'actors':['character_a_cheer','character_b_heartthief','character_b_point']}),
(32.1,'detail',{'actor':'character_b_heartthief','variant':0,'transitionDuration':.16}),
(33.72,'portrait',{'actor':'character_b_heartthief','bg':'bg_chorus_heartstage','variant':0}),
(35.4,'chorus',{'variant':1,'transition':'flash'}),(37.26,'staccato',{'variant':0}),
(38.94,'silhouettes',{'variant':0,'actor':'silhouette_b_peace_white_blackbg','other':'silhouette_a_neutral_black'}),
(40.32,'detail',{'actor':'character_b_apple','variant':1,'transition':'fade'}),
(42.72,'split',{'variant':0}),(45.12,'ringmacro',{'transition':'iris'}),
(46.98,'triptych',{'actors':['character_b_point','character_a_peace','character_b_cheer']}),
(49.76,'chorus',{'variant':2,'transition':'flash'}),
(52.54,'silhouettes',{'variant':1,'actor':'silhouette_b_dance_black','other':'silhouette_a_peace_white_blackbg'}),
(54.40,'phone',{'transition':'iris'}),
(57.26,'phone_macro',{}),(60.78,'social',{'transition':'fade'}),(64.8,'phone',{}),
(67.6,'anxiety',{'actor':'character_a_phone_check','variant':1,'transition':'fade'}),
(70.22,'detail',{'actor':'character_a_phone_check','bg':'bg_social_night','variant':1,'transition':'fade'}),
(72.56,'anxiety',{'actor':'character_a_wait','variant':0}),
(75.82,'portrait',{'actor':'character_a_charm','variant':1,'transition':'fade'}),
(78.65,'ringmacro',{'transition':'iris'}),(79.70,'staccato',{'variant':1,'transitionDuration':.15}),
(81.44,'chorus',{'variant':2,'transition':'iris'}),
(83.80,'triptych',{'actors':['character_a_peace','character_b_heartthief','character_b_dance']}),
(85.76,'detail',{'actor':'character_b_heartthief','variant':1,'transitionDuration':.16}),
(87.5,'portrait',{'actor':'character_b_heartthief','bg':'bg_chorus_heartstage','variant':0}),
(89.14,'chorus',{'variant':1,'transition':'flash'}),
(91.0,'silhouettes',{'variant':1,'actor':'silhouette_b_dance_black','other':'silhouette_a_peace_white_blackbg'}),
(92.76,'staccato',{'variant':0}),(94.50,'detail',{'actor':'character_b_heartthief','variant':0,'transition':'fade'}),
(96.52,'chorus',{'variant':0,'transition':'flash'}),
(99.08,'triptych',{'actors':['character_b_apple','character_a_peace','character_b_point']}),
(101.86,'silhouettes',{'variant':0,'actor':'silhouette_b_peace_white_blackbg','other':'silhouette_a_neutral_black'}),
(103.72,'split',{'actor':'character_a_apple','other':'character_b_apple','variant':0}),
(106.50,'ringmacro',{'transition':'iris'}),(108.36,'chorus',{'variant':1,'transition':'flash'}),
(110.22,'triptych',{'actors':['character_a_cheer','character_b_dance','character_a_peace']}),
(112.08,'outro',{'transition':'fade','transitionDuration':.65})]
shots=[]
for i,(start,kind,kw) in enumerate(rows):
 shots.append({'start':start,'end':rows[i+1][0] if i+1<len(rows) else 118.8,'kind':kind,'transition':'wipe',**kw})
d={'bpm':129.3,'beat_offset':.108,'status':'music-aligned-clean-picture','timing_basis':'Original audio, local ASR phrase boundaries and onset-grid analysis. Subtitle source website pending user URL.','shots':shots}
Path('work/mv/timeline.json').write_text(json.dumps(d,ensure_ascii=False,indent=2))
print('shots',len(shots))
