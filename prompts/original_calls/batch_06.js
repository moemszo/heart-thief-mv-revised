// @exec: {"yield_time_ms": 120000, "max_output_tokens": 1600}
const d="[LOCAL_WORKSPACE]/outputs/proseka_mv_assets";
const assets=[
  ["apple_prop",`Use case: stylized-concept
Asset type: transparent isolated MV prop
Input images: Image 1 is the style reference for the original anime game artwork.
Primary request: One glossy bright-red apple, three-quarter view, with one small clean bite mark, a short brown stem and one fresh green leaf.
Style/medium: match the reference's polished Japanese 2D anime game illustration, crisp line work, cel-shaded highlights, saturated but clean color.
Composition/framing: single centered apple, no hand, isolated, clear silhouette, generous transparent margin.
Scene/backdrop: no background, genuine transparent alpha.
Constraints: standalone prop; no plate, no text, no watermark.`],
  ["pinky_ring",`Use case: stylized-concept
Asset type: transparent isolated lyric prop
Input images: Image 1 is the style and palette reference for the original character artwork.
Primary request: One delicate silver pinky ring as a separate prop, thin polished band with a tiny pink heart stone and small cyan glint, a few restrained sparkle marks to suggest a love charm.
Style/medium: polished Japanese 2D anime game illustration, crisp line art and cel-shaded highlights, consistent with Image 1.
Composition/framing: one ring shown large in three-quarter view, centered, no hand, readable small accessory design.
Scene/backdrop: no background, genuine transparent alpha.
Constraints: original design, standalone prop, no lettering, brand, or watermark.`],
  ["love_charm",`Use case: stylized-concept
Asset type: transparent isolated lyric prop
Input images: Image 1 is the style and palette reference for the original character artwork.
Primary request: One small handmade love-charm talisman for a playful romance MV: a soft pink heart-shaped fabric charm tied with a teal and magenta cord, a tiny star bead and a subtle stitched heart. Cute and original, no religious or real-world emblem.
Style/medium: polished Japanese 2D anime game illustration, crisp line art, cel shading, colors coordinated with Image 1.
Composition/framing: one centered charm, front three-quarter view, no hand, isolated with generous transparent margin.
Scene/backdrop: no background, genuine transparent alpha.
Constraints: no letters, no brand, no watermark.`],
  ["story_phone",`Use case: stylized-concept
Asset type: transparent original fictional social-story phone prop
Input images: Image 1 and Image 2 are the authoritative identity references for Character B, the coral-orange bob-haired adult woman.
Primary request: A modern dark charcoal smartphone shown upright, front view, with an original fictional social-story screen. The main story picture on the screen shows the exact same Character B smiling confidently in her established costume. Invent a clearly original generic interface: a few abstract avatar circles, short progress dashes, simple heart reaction symbols, and a vertical stack of small like-heart marks suggesting a rising like count. Use shapes only, no readable text or numbers.
Style/medium: match the polished Japanese 2D anime game illustration in the references; crisp clean UI shapes, vivid teal/coral/magenta accents.
Composition/framing: single complete phone centered, entire device visible, screen legible, isolated cutout.
Scene/backdrop: no background, genuine transparent alpha.
Constraints: UI is entirely fictional and original; do not use Instagram name, logo, trademark icon, exact layout, or recognizable platform screen; no extra people outside the story image; no watermark.`]
];
const results=await Promise.all(assets.map(async([id,prompt],i)=>{
 const refs=id==="story_phone"?[`${d}/character_b_design.png`,`${d}/character_b_turnaround.png`]:[`${d}/character_a_design.png`];
 return {id,result:await tools.image_gen__imagegen({prompt,referenced_image_paths:refs,transparent_background:true})};
}));
for(const {id,result} of results){text(id);generatedImage(result);}
