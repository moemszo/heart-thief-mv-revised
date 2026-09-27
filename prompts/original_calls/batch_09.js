// @exec: {"yield_time_ms": 120000, "max_output_tokens": 2000}
const d="[LOCAL_WORKSPACE]/outputs/proseka_mv_assets";
const edits=[
  ["phone_high_angle", "assets/references/user_reference_01.png",
`Use case: precise-object-edit
Asset type: isolated transparent social-story phone prop
Input images: Image 1 is the exact target phone and fictional story UI to preserve; Image 2 is the authoritative Character B identity reference.
Primary request: Redraw the same single smartphone asset from Image 1 from a clear high-angle overhead viewpoint, looking down from above at roughly 35 degrees. Tilt the phone diagonally in perspective so the top edge recedes and the lower edge is nearer, while keeping the full device and its screen visible. Keep Character B's story portrait and the original generic heart/avatar interface recognizable and unchanged in content.
Style/medium: preserve the clean anime MV illustration; reduce the overly glossy, synthetic AI-rendered look with restrained highlights, matte dark frame, simple coherent geometry and tidy UI shapes.
Composition/framing: one isolated complete phone, transparent margins, no hand or desk.
Scene/backdrop: no background, genuine transparent alpha.
Constraints: change camera angle and polish only; preserve phone, B identity, story content and fictional UI; no platform name, logo, readable text, watermark or extra objects.
Avoid: front-on flat view, heavy bloom, metallic over-rendering, copied trademark interface.`],
  ["character_b_apple_look", "assets/references/user_reference_02.png",
`Use case: identity-preserve
Asset type: transparent full-body anime character pose cutout
Input images: Image 1 is the exact target pose; Image 2 is the authoritative design sheet for Character B.
Primary request: Keep this exact same Character B eating the same red apple in the same full-body pose and composition. Change only her head angle and eye direction so she is clearly looking down at the apple near her mouth, not at the viewer. Turn her face slightly toward the apple and soften the expression into a natural pleased smile.
Style/medium: preserve the polished Japanese 2D anime game illustration and exact established character design.
Composition/framing: full figure visible, same scale and pose, transparent margin.
Scene/backdrop: no background, preserve genuine transparent alpha.
Constraints: preserve Character B's coral bob, lime underlayer, teal ribbon, amber eyes, yellow-and-teal jacket, shorts, leggings, socks, shoes, apple, body pose and framing; change only head/eye direction and slight expression.
Avoid: eye contact with camera, redesign, added background, text, watermark.`],
  ["character_a_wait_lookaway", `${d}/character_a_wait.png`,
`Use case: identity-preserve
Asset type: transparent full-body anime character pose cutout
Input images: Image 1 is the exact target pose; Image 2 is the authoritative design sheet for Character A.
Primary request: Keep this exact same Character A in the raised-palm 'wait, it's my turn' gesture. Turn her head and eyes about 30 degrees to her left so she looks toward an off-screen person, not at the camera. Let the expression feel hurt and insistent.
Style/medium: preserve the polished Japanese 2D anime game illustration and exact character design.
Composition/framing: preserve full-body framing, pose, scale and transparent margin.
Scene/backdrop: no background, genuine transparent alpha.
Constraints: change only head orientation, gaze and subtle expression; keep hair, clothes, colors, accessories and hand gesture fixed.
Avoid: looking into the camera, redesign, extra objects, background, text, watermark.`],
  ["character_b_dance_lookaway", `${d}/character_b_dance.png`,
`Use case: identity-preserve
Asset type: transparent full-body anime character pose cutout
Input images: Image 1 is the exact target dance pose; Image 2 is the authoritative design sheet for Character B.
Primary request: Preserve Character B and the exact dynamic dance step. Turn her face into a three-quarter side view and direct her eyes toward a point off-screen to her right, as if following another dancer across the stage; do not look at the viewer.
Style/medium: preserve the polished Japanese 2D anime game illustration and exact character design.
Composition/framing: keep entire body, same scale, pose and transparent margin.
Scene/backdrop: no background, genuine transparent alpha.
Constraints: change only head orientation and eye line; keep hairstyle, costume, colors, accessories, body movement and framing.
Avoid: direct camera gaze, redesign, extra objects, background, text, watermark.`]
];
const results=await Promise.all(edits.map(async([id,target,prompt])=>{
 const refs=id==="phone_high_angle"?[target,`${d}/character_b_design.png`]:
 id==="character_b_apple_look"?[target,`${d}/character_b_design.png`]:
 id==="character_a_wait_lookaway"?[target,`${d}/character_a_design.png`]:
 [target,`${d}/character_b_design.png`];
 return {id,result:await tools.image_gen__imagegen({prompt,referenced_image_paths:refs,transparent_background:true})};
}));
for(const {id,result} of results){text(id);generatedImage(result);}
