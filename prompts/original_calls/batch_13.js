// @exec: {"yield_time_ms": 120000, "max_output_tokens": 2000}
const d="[LOCAL_WORKSPACE]/outputs/proseka_mv_assets";
const items=[
 ["silhouette_a_neutral_white","silhouette_a_neutral_black.png","character_a_design.png"],
 ["silhouette_a_cheer_white","silhouette_a_cheer_black.png","character_a_design.png"],
 ["silhouette_b_neutral_white","silhouette_b_neutral_black.png","character_b_design.png"],
 ["silhouette_b_dance_white","silhouette_b_dance_black.png","character_b_design.png"]
];
const results=await Promise.all(items.map(async([id,black,design])=>{
 const prompt=`Use case: precise-object-edit
Asset type: transparent pure-white character silhouette cutout
Input images: Image 1 is the exact black silhouette to recolor; Image 2 is only a design reference for the character identity.
Primary request: Change only the filled figure in Image 1 from solid black to solid pure white (#FFFFFF). Preserve the exact same outer silhouette, pose, scale, placement, and transparent margins. Keep the same alpha transparency outside the figure.
Style/medium: flat clean silhouette cutout.
Constraints: figure fill must be uniformly pure white with no face, costume details, gradients, gray, colored outline, glow or shadow; background remains genuinely transparent.
Avoid: changing the contour, pose, proportions or canvas; no text or watermark.`;
 const result=await tools.image_gen__imagegen({prompt,referenced_image_paths:[`${d}/${black}`,`${d}/${design}`],transparent_background:true});
 return {id,result};
}));
for(const {id,result} of results){text(id);generatedImage(result);}
