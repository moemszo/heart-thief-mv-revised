// @exec: {"yield_time_ms": 120000, "max_output_tokens": 1600}
const d="[LOCAL_WORKSPACE]/outputs/proseka_mv_assets";
const bgs=[
 ["bg_verse_ring_charm",`Use case: stylized-concept
Asset type: 16:9 full-bleed anime music-video background, verse scene
Input images: Image 1 and Image 2 are palette and illustration-style references only; do not copy the characters.
Primary request: An original dreamy rehearsal studio for a playful love-spell verse: pastel rose, cyan and violet lighting; a large luminous ring-shaped light motif on the far wall; subtle heart and star-shaped bokeh; soft reflections on a clean floor. Keep the central foreground simple for character compositing.
Style/medium: polished Japanese 2D anime game background, crisp cel-painted shapes, saturated but controlled palette matching the reference characters.
Composition/framing: wide 16:9 landscape, eye-level establishing view, balanced depth, open center and clear lower third.
Lighting/mood: sparkling, hopeful, slightly mischievous.
Constraints: background only, no people, no legible text, logos, UI or watermark.`],
 ["bg_prechorus_wait",`Use case: stylized-concept
Asset type: 16:9 full-bleed anime music-video background, pre-chorus scene
Input images: Image 1 and Image 2 are palette and illustration-style references only; do not copy the characters.
Primary request: An empty stage wing just before a performance: deep indigo curtains, one warm spotlight spilling from the side onto a clear patch of floor, a few small heart-shaped lamps in the distance and one circular light suggesting a paused beat. Keep the foreground open for a character waiting to step forward.
Style/medium: polished Japanese 2D anime game background, clean graphic shapes and cel-painted lighting, coordinated rose/cyan/indigo palette.
Composition/framing: wide 16:9 landscape, slightly low viewpoint toward the stage entrance, clear center-left for character compositing.
Lighting/mood: held breath, anticipation, a little longing.
Constraints: background only, no people, no clocks with numbers, no legible text, logos, UI or watermark.`],
 ["bg_chorus_heartstage",`Use case: stylized-concept
Asset type: 16:9 full-bleed anime music-video background, chorus performance stage
Input images: Image 1 and Image 2 are palette and illustration-style references only; do not copy the characters.
Primary request: A high-energy original pop stage with giant concentric heart-shaped light rigs, vivid magenta and electric-cyan beams, lemon-yellow highlights, small star confetti and a reflective dance floor. Keep a generous clear space in the center so two character cutouts can be composited.
Style/medium: polished Japanese 2D anime game background, crisp 2D cel-painted environment, bold readable geometry, vivid coordinated colors.
Composition/framing: wide 16:9 landscape, dramatic low-angle stage view, bright heart rig above and open central performance area.
Lighting/mood: dazzling, playful, energetic and theatrical.
Constraints: background only, no people, instruments, logos, readable text or watermark.`],
 ["bg_social_night",`Use case: stylized-concept
Asset type: 16:9 full-bleed anime music-video background, second verse social-media scene
Input images: Image 1 and Image 2 are palette and illustration-style references only; do not copy the characters.
Primary request: A quiet late-night creative room seen from a clear overhead view: violet-blue desk and floor shapes, a pool of cool phone-like light near one edge, a few floating abstract story cards and small heart-reaction symbols drifting toward the margins, suggesting anxious scrolling and watching likes rise. Keep the middle open and uncluttered for a character overlay.
Style/medium: polished Japanese 2D anime game background, clean cel-painted shapes, coordinated cyan, magenta and indigo palette.
Composition/framing: wide 16:9 landscape, distinctly top-down overhead composition, clean center with visual details concentrated around the perimeter.
Lighting/mood: intimate, restless, bittersweet.
Constraints: entirely original generic social-media imagery; no phone device, no platform name or logo, no recognizable app layout, no readable text, no people, no watermark.`]
];
const refs=[`${d}/character_a_design.png`,`${d}/character_b_design.png`];
const results=await Promise.all(bgs.map(async([id,prompt])=>({id,result:await tools.image_gen__imagegen({prompt,referenced_image_paths:refs,transparent_background:false})})));
for(const {id,result} of results){text(id);generatedImage(result);}
