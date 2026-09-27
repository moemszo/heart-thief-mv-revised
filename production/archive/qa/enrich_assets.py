from pathlib import Path
import json

path=Path('work/asset_audit/assets.json')
j=json.loads(path.read_text(encoding='utf-8'))
for a in j['assets']:
    name=a['file']
    cat=a['category']
    alpha=a['alpha']
    b=a['effective_subject_bounds_alpha_ge_16']
    guidance=a['scale_and_crop_guidance']
    notes=[]
    if cat == 'background':
        w,h=a['width'],a['height']
        s=max(1920/w,1080/h)
        guidance['cover_scale_for_1920x1080']=round(s,5)
        guidance['cover_crop_pixels_source_approx']={
            'horizontal_total':round(w-1920/s,2),
            'vertical_total':round(h-1080/s,2),
        }
        guidance['transparent_crop']='透過素材ではない。背景の全画面構図を維持してcoverする。'
        notes.append('不透明な16:9背景プレート。1920x1080へのcover拡大は約1.148xで、切り落としはほぼない。')
        if name == 'bg_social_night.png':
            notes.append('俯瞰のフラットレイ構図。全身キャラを立たせず、スマホ/小物の寄りや俯瞰カットに合わせる。')
        elif name == 'bg_chorus_heartstage.png':
            notes.append('正面のハートステージ。歌唱者を中央軸に置くヒーローショット向き。')
        elif name == 'bg_prechorus_wait.png':
            notes.append('舞台袖を斜めに見る構図。待つ人物は画面端に置くと視線と奥行きが合う。')
        elif name == 'bg_verse_ring_charm.png':
            notes.append('正面性の強いリング状ステージ。リング/お守りのインサートや二人の立ち位置に使いやすい。')
    elif name in ('character_a_design.png','character_b_design.png','character_a_turnaround.png','character_b_turnaround.png'):
        guidance['transparent_crop']='透過素材ではない。白背景の設定/ターンアラウンド参照シートとして全体を保持する。'
        notes.append('不透明な白背景の設定/ターンアラウンド参照シート。動画の人物切り抜き素材としては使わない。')
    elif name.endswith('_white_blackbg.png'):
        guidance['transparent_crop']='透過素材ではない。黒を抜くScreen合成を使い、白い形だけを重ねる。'
        notes.append('不透明な黒背景に白いシルエット。黒を抜くScreen合成で使用する。')
    elif cat == 'silhouette':
        notes.append('透明PNG上の黒シルエット。暗い背景では形が沈むため、明るい背景または明るい差し色の上に配置する。')
        guidance['recommended_blend']='Normal alpha over a light or sufficiently colored background.'
    elif cat in ('character_a','character_b'):
        notes.append('白/濃色へのRGBA合成で輪郭は概ねクリーン。目立つ白マットや背景残りは見えず、alpha=0領域の隠れRGBは合成に出ない。')
        if b and b['height']:
            guidance['scale_for_90pct_of_1080p_frame_height']=round((1080*0.90)/b['height'],4)
            guidance['scale_for_100pct_of_1080p_frame_height']=round(1080/b['height'],4)
        if name == 'character_a_phone_check.png':
            notes.append('スマホのB写真と浮遊ハートもalpha>=16範囲に含む。目線はスマホ側。')
        elif name == 'character_a_apple.png':
            notes.append('りんごを顔の近くに持つ。物を見せるインサートにつなぎやすい。')
        elif name == 'character_a_wait.png':
            notes.append('画面外へ手を伸ばすリアクション。スマホを見る場面とは目線が切り替わる。')
        elif name == 'character_b_heartthief.png':
            notes.append('周囲のハートも人物範囲に含む。ハートを残す構図ではalpha>=16境界に余白を取る。')
        elif name == 'character_b_dance.png':
            notes.append('対角線の強いダンス姿勢で、顔は画面右上寄り。正面目線のポーズとの直結は避けるか動きでつなぐ。')
        elif name == 'character_b_point.png':
            notes.append('指差しと目線が視聴者側を向く正面ポーズ。Bのダンス姿勢とは視線方向が異なる。')
        if b and b['height'] and (b['x'] == 0 or b['y'] == 0 or b['x']+b['width'] == a['width'] or b['y']+b['height'] == a['height']):
            notes.append('alpha>=16の有効範囲がキャンバス端に接する。接する側を内側へ切らない。')
    elif cat == 'prop':
        notes.append('透明PNG。alpha>=16の小物/きらめき範囲を使い、輪郭の柔らかい部分を含めて拡大縮小する。')
        guidance['recommended_scale']='用途ごとに画面内の見せたい大きさを決める。人物と同じ1.0x上限を当てはめず、source boundsから出力pxを計算する。'
    else:
        notes.append('原寸とalpha範囲を確認して配置する。')
    # Use more precise category-specific guidance in preference to generic boilerplate.
    a['composition_notes']=notes
    if cat in ('character_a','character_b','prop') or (cat == 'silhouette' and alpha['has_alpha_channel_or_transparency']):
        guidance['transparent_crop']='alpha>=16のbboxを基準に各辺3-5%の余白を加える。alpha>=128で切ると細い髪先、縁、柔らかな効果を欠く場合がある。'
    elif cat == 'silhouette' and name.endswith('_white_blackbg.png'):
        guidance['transparent_crop']='透過素材ではない。黒背景を通常のクロップで切り抜かずScreen合成を使う。'
    a['scale_and_crop_guidance']=guidance

j['visual_review']={
  'design_consistency': 'Aは紺のツインテール、シアン/マゼンタの星アクセントと黒/紫衣装。Bはコーラル系の短髪に青緑の結び飾り、黄/青緑ジャケットとコーラル色のショーツ。設定シートと各ポーズの配色/衣装に大きな逸脱は見えない。',
  'gaze_and_pose': '目線の切り替えが意図的に異なる。A_phone_checkはスマホへ、A_waitは画面外へ反応する目線。B_danceは上げた手の方向へ顔を向け、B_pointは視聴者を指す正面目線。ここを連続動作に見せる場合は向きの変化を一拍/カットでつなぐ。',
  'alpha_composite_verdict': '20点のalpha付き素材を白/暗色に合成。人物/小物/黒シルエットに目立つ背景残りや白縁なし。元PNGを直接プレビューした場合の色つき領域はalpha=0画素に保持された隠れRGBを含むが、通常のRGBA合成では表示されない。alpha>=1のみの外縁画素はごく薄く、alpha>=16 bbox基準で配置する。',
  'major_visual_issues': 'キャラA/Bのデザイン一貫性に大きな問題なし。pose間の目線・体の向きは意図的な差として扱う。',
  'manual_visual_qa': '白/暗色合成コンタクト2枚を表示して目視。元PNGを変更せず、別個にcharacter_a_phone_checkを原寸の白/暗色合成でも確認。',
}
j['summary']['general_scale_guidance']='1080pで全身キャラを縦画面高の約90%に収める場合、alpha>=16有効高さに対しておおむね0.64-0.66x。切り抜き輪郭を保つため、クリーンさ重視ならsource pixel 1:1を拡大上限の目安にする。1920x1080背景は1672x941から約1.148x cover。キャラはalpha>=16 bbox+3-5%余白、背景はfull canvasを基準に構図調整。'
path.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('enriched',len(j['assets']),'assets')
for a in j['assets']:
 if a['category'] in ('character_a','character_b'):
  s=a['scale_and_crop_guidance'].get('scale_for_90pct_of_1080p_frame_height')
  if s is not None: print(a['file'],s,a['effective_subject_bounds_alpha_ge_16'])
