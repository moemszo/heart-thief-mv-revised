from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib, json, math

ROOT = Path('outputs/proseka_mv_assets')
OUT = Path('work/asset_audit')
files = sorted(ROOT.glob('*.png'))

font = ImageFont.load_default()

def bbox_for(mask):
    return list(mask.getbbox()) if mask.getbbox() else None

def classify(name):
    if name.startswith('character_a_'): return 'character_a'
    if name.startswith('character_b_'): return 'character_b'
    if name.startswith('prop_'): return 'prop'
    if name.startswith('bg_'): return 'background'
    if name.startswith('silhouette_'): return 'silhouette'
    return 'other'

def alpha_info(img):
    has_alpha = ('A' in img.getbands()) or ('transparency' in img.info)
    rgba = img.convert('RGBA')
    a = rgba.getchannel('A')
    extrema = a.getextrema()
    hist = a.histogram()
    total = img.width * img.height
    levels = [1, 16, 64, 128, 192, 224, 250]
    bboxes = {}
    counts = {}
    for t in levels:
        m = a.point(lambda x, t=t: 255 if x >= t else 0)
        bboxes[str(t)] = bbox_for(m)
        counts[str(t)] = sum(hist[t:])
    return {
        'has_alpha_channel_or_transparency': bool(has_alpha),
        'alpha_min_max': list(extrema),
        'alpha_zero_pixels': hist[0],
        'alpha_nonzero_pixels': total - hist[0],
        'alpha_nonzero_percent': round((total - hist[0]) / total * 100, 4),
        'alpha_counts_at_or_above': counts,
        'alpha_bbox_at_or_above': bboxes,
        'opaque_core_bbox': bboxes['128'],
        'soft_fringe_bbox': bboxes['16'],
    }

def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024), b''):
            h.update(chunk)
    return h.hexdigest()

assets=[]
for p in files:
    img=Image.open(p)
    img.load()
    alpha=alpha_info(img)
    w,h=img.size
    subject=alpha['soft_fringe_bbox'] if alpha['has_alpha_channel_or_transparency'] else [0,0,w,h]
    core=alpha['opaque_core_bbox'] if alpha['has_alpha_channel_or_transparency'] else [0,0,w,h]
    if subject is None: subject=[0,0,0,0]
    if core is None: core=[0,0,0,0]
    x0,y0,x1,y1=subject
    cx0,cy0,cx1,cy1=core
    sw,sh=x1-x0,y1-y0
    c_w,c_h=cx1-cx0,cy1-cy0
    full_canvas = not alpha['has_alpha_channel_or_transparency'] or subject == [0,0,w,h]
    # Conservative native-pixel guidance; actual renderer scale can be calculated from chosen project resolution.
    asset={
       'file': p.name,
       'sha256': sha(p),
       'category': classify(p.name),
       'mode': img.mode,
       'width': w,
       'height': h,
       'aspect_ratio': round(w/h, 5),
       'alpha': alpha,
       'effective_subject_bounds_alpha_ge_16': {'x':x0,'y':y0,'width':sw,'height':sh} if sw and sh else None,
       'opaque_core_bounds_alpha_ge_128': {'x':cx0,'y':cy0,'width':c_w,'height':c_h} if c_w and c_h else None,
       'subject_occupancy_percent_canvas': {'width':round(sw/w*100,2) if w else 0,'height':round(sh/h*100,2) if h else 0},
       'composition_notes': [],
       'scale_and_crop_guidance': {
           'native_scale': '1.0x means source pixels map 1:1 to output pixels; avoid exceeding 1.0x for clean edges unless the final shot is intentionally soft/blurred.',
           'transparent_crop': 'Crop to alpha>=16 subject bounds only with 3-5% padding on every side; keep soft alpha fringe and hair/accessory tips.',
           'full_canvas': bool(full_canvas),
       }
    }
    if alpha['has_alpha_channel_or_transparency']:
        if alpha['alpha_bbox_at_or_above']['1'] != alpha['alpha_bbox_at_or_above']['16']:
            asset['composition_notes'].append('Very low-alpha pixels extend beyond the alpha>=16 soft-fringe bounds; inspect before tight cropping.')
        if alpha['alpha_bbox_at_or_above']['16'] != alpha['alpha_bbox_at_or_above']['128']:
            asset['composition_notes'].append('Soft translucent fringe/shadow extends outside the opaque core; do not crop to alpha>=128.')
        if subject and (x0==0 or y0==0 or x1==w or y1==h):
            asset['composition_notes'].append('Visible alpha>=16 touches canvas edge; do not crop inward at that edge.')
    else:
        asset['composition_notes'].append('No usable transparency: preserve image background or use an appropriate key/blend mode; white-on-black silhouettes require Screen blend.')
    assets.append(asset)

# Split contacts: character poses together for A/B comparison; props, backgrounds, silhouettes separately.
char = [a for a in assets if a['category'] in ('character_a','character_b')]
other = [a for a in assets if a['category'] not in ('character_a','character_b')]
# Keep original lexical order (already sorted).

def contact_sheet(entries, outpath, title):
    cols, rows = 4, 4
    cell_w, cell_h = 460, 340
    sheet=Image.new('RGB',(cols*cell_w, 46+rows*cell_h),(232,234,238))
    d=ImageDraw.Draw(sheet)
    d.text((12,12), title, fill=(18,24,33), font=font)
    for i,a in enumerate(entries):
        p=ROOT/a['file']
        img=Image.open(p).convert('RGBA')
        col,row=i%cols,i//cols
        x,y=col*cell_w,46+row*cell_h
        d.rectangle((x+2,y+2,x+cell_w-2,y+cell_h-2),fill=(248,249,251),outline=(185,190,198),width=1)
        d.text((x+9,y+8),a['file'],fill=(20,25,31),font=font)
        top=y+28
        half_w=(cell_w-26)//2
        area_h=cell_h-40
        # Two separately composited previews, white and charcoal.
        for j,bg in enumerate(((255,255,255),(38,42,50))):
            bx=x+8+j*(half_w+10)
            panel=Image.new('RGBA',(half_w,area_h),bg+(255,))
            # Use contain. Composite with alpha over the designated background.
            preview=img.copy()
            preview.thumbnail((half_w-12,area_h-12),Image.Resampling.LANCZOS)
            px=(half_w-preview.width)//2
            py=(area_h-preview.height)//2
            panel.alpha_composite(preview,(px,py))
            sheet.paste(panel.convert('RGB'),(bx,top))
            if j==0:
                label='white'
            else:
                label='dark'
            ImageDraw.Draw(sheet).text((bx+4,top+area_h-15),label,fill=(130,130,130) if j==0 else (210,210,210),font=font)
    sheet.save(outpath,quality=95)

contact_sheet(char, OUT/'contact_characters.png', 'Proseka MV assets | characters A/B | split composites: white / dark')
contact_sheet(other, OUT/'contact_props_backgrounds_silhouettes.png', 'Proseka MV assets | props / backgrounds / silhouettes | split composites: white / dark')

# Write JSON after sheets; include analysis provenance and stable source hash list.
result={
  'source_directory': str(ROOT.resolve()),
  'source_png_count': len(files),
  'index_md_count_claim': 32,
  'audit_method': 'Pillow: opened and decoded each PNG, reported alpha threshold bboxes at >=1,16,64,128,192,224,250, SHA-256; contact previews composite RGBA on pure white and charcoal.',
  'coordinate_convention': 'bbox is [left, top, right, bottom), right/bottom exclusive; object bounds are source pixel coordinates.',
  'assets': assets,
  'summary': {
    'files_with_alpha': sum(1 for a in assets if a['alpha']['has_alpha_channel_or_transparency']),
    'opaque_files': sum(1 for a in assets if not a['alpha']['has_alpha_channel_or_transparency']),
    'character_files': len(char),
    'non_character_files': len(other),
    'contact_sheets': ['contact_characters.png','contact_props_backgrounds_silhouettes.png'],
    'general_scale_guidance': 'Keep character/prop layers at <=1.0x source raster scale for crisp line art. If larger in frame, use the larger source bounds or intentional soft treatment; never fill the full frame by cropping to the alpha>=128 core. Prefer alpha>=16 bbox + 3-5% padding. For opaque photo/painted backgrounds, use full-canvas contain/cover according to shot design; do not crop focal hearts, UI/phone, ring, or horizon without checking the contact and source.',
  }
}
(OUT/'assets.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result['summary'],ensure_ascii=False))
print('PNG hashes captured; source count =',len(files))
