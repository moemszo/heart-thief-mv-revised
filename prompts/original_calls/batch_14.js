// @exec: {"yield_time_ms": 120000, "max_output_tokens": 1600}
const d="[LOCAL_WORKSPACE]/outputs/proseka_mv_assets";
const names=["a_neutral","a_cheer","b_neutral","b_dance"];
const results=await Promise.all(names.map(async key=>{
 const prompt=`Use case: precise-object-edit
Asset type: exact transparent white silhouette cutout
Input images: Image 1 is the sole exact silhouette target.
Primary request: Recolor only the existing character silhouette from black to pure white (#FFFFFF). Preserve its exact pose, outer contour, proportions, orientation, size, position, and every transparent pixel of the original image.
Style/medium: flat, uniform, solid silhouette.
Composition/framing: pixel-aligned to the input, same full-body crop and margins.
Scene/backdrop: transparent alpha everywhere outside the figure.
Constraints: change only the figure's fill color; no interior details, no outline, no gradient, no shadow, no halo, no background, no text, no watermark.
Avoid: altering pose or silhouette in any way.`;
 const result=await tools.image_gen__imagegen({prompt,referenced_image_paths:[`${d}/silhouette_${key}_black.png`],transparent_background:true});
 return {id:`silhouette_${key}_white`,result};
}));
for(const {id,result} of results){text(id);generatedImage(result);}
