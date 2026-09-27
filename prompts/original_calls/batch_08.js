// @exec: {"yield_time_ms": 120000, "max_output_tokens": 1800}
const d="[LOCAL_WORKSPACE]/outputs/proseka_mv_assets";
const specs=[
  ["character_a_charm", "A", "Show the little finger near the viewer so a delicate heart-shaped pinky ring catches the light; her other hand holds the small love-charm talisman from Image 4. Give her a hopeful but slightly unsure expression, as if trying a love spell.", [`${d}/character_a_design.png`,`${d}/character_a_turnaround.png`,`${d}/prop_pinky_ring.png`,`${d}/prop_love_charm.png`]],
  ["character_b_heartthief", "B", "Give Character B a dazzling, confident heart-thief pose: warm mischievous smile, one eye softly winking, one hand near her lips and the other gracefully extended toward the viewer; add a few small floating pink heart sparkles around her.", [`${d}/character_b_design.png`,`${d}/character_b_turnaround.png`]],
  ["character_b_point", "B", "Character B points playfully toward the viewer, then gestures toward herself with the other hand, wearing an irresistible confident smile that feels teasing but friendly.", [`${d}/character_b_design.png`,`${d}/character_b_turnaround.png`]],
  ["character_b_dance", "B", "Character B in a dynamic full-body rhythm-game dance step, one knee lifted, one arm sweeping upward and the other extended sideways, joyful focused smile; keep the pose readable and balanced.", [`${d}/character_b_design.png`,`${d}/character_b_turnaround.png`]]
];
const desc={
 A:"Character A, the exact same original adult woman from the references: very long midnight-navy twin ponytails with cyan and hot-pink streaks, violet-magenta eyes, star clips, cyan-magenta stage jacket, dark top, layered skirt over black shorts, striped thigh-high and pink leg warmer, fingerless gloves, chunky high-tops.",
 B:"Character B, the exact same original adult woman from the references: short coral-orange bob with lime-yellow underlayer and teal-ribbon side ponytail, amber eyes, yellow bomber with teal panels, deep teal top, coral-magenta shorts and utility belt, one dark legging and one striped knee sock, wrist cuffs, chunky teal-coral sneakers."
};
const results=await Promise.all(specs.map(async([id,ch,pose,refs])=>{
 const prompt=`Use case: stylized-concept
Asset type: transparent full-body anime MV character pose cutout
Input images: Image 1 is the authoritative design sheet and Image 2 is the same character's turnaround. Additional references, if present, are isolated prop designs to match exactly.
Primary request: Draw ${desc[ch]} in this pose: ${pose}
Style/medium: match the references' polished Japanese 2D anime game illustration, crisp clean line art, cel shading, vivid but coordinated colors.
Composition/framing: one character only, centered full-body, entire head, hands and shoes visible; keep the pose silhouette clear with transparent margins.
Scene/backdrop: no scene or background, genuine transparent alpha.
Constraints: preserve identity, face, hairstyle, proportions, outfit, palette, accessories and shoes; use referenced props exactly; standalone cutout with no ground plane, no shadow, no text, no watermark.
Avoid: extra people, redesign, cropped limbs, unrelated props.`;
 return {id,result:await tools.image_gen__imagegen({prompt,referenced_image_paths:refs,transparent_background:true})};
}));
for(const {id,result} of results){text(id);generatedImage(result);}
