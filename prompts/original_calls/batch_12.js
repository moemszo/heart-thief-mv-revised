// @exec: {"yield_time_ms": 120000, "max_output_tokens": 1800}
const d="[LOCAL_WORKSPACE]/outputs/proseka_mv_assets";
const items=[
 ["silhouette_a_neutral_black","A","Image 1 is the authoritative Character A design; Image 2 is her four-view turnaround. Use the front-view body shape.",[`${d}/character_a_design.png`,`${d}/character_a_turnaround.png`],"neutral front-facing standing pose, arms relaxed slightly away from body, long twin ponytails clearly separated"],
 ["silhouette_a_cheer_black","A","Image 1 is the authoritative Character A design; Image 2 is her exact cheer pose reference.",[`${d}/character_a_design.png`,`${d}/character_a_cheer.png`],"same full-body cheer pose as Image 2, both arms raised, ponytails flowing"],
 ["silhouette_b_neutral_black","B","Image 1 is the authoritative Character B design; Image 2 is her four-view turnaround. Use the front-view body shape.",[`${d}/character_b_design.png`,`${d}/character_b_turnaround.png`],"neutral front-facing standing pose, arms relaxed slightly away from body, short bob and single side ponytail clearly outlined"],
 ["silhouette_b_dance_black","B","Image 1 is the authoritative Character B design; Image 2 is her exact side-looking dance pose reference.",[`${d}/character_b_design.png`,`${d}/character_b_dance.png`],"same dynamic dance pose as Image 2, side-facing head, one knee lifted, arms sweeping"]
];
const descriptions={
 A:"Character A's recognizable very long twin ponytails, jacket outline, short layered skirt, one tall sock and chunky sneakers.",
 B:"Character B's recognizable short bob, small side ponytail, cropped bomber outline, shorts, asymmetric legwear and chunky sneakers."
};
const results=await Promise.all(items.map(async([id,ch,input,refs,pose])=>{
 const prompt=`Use case: stylized-concept
Asset type: isolated transparent solid-black character silhouette
Input images: ${input}
Primary request: Make a single full-body silhouette of ${descriptions[ch]} in this pose: ${pose}.
Style/medium: clean graphic silhouette asset matching the original character design.
Composition/framing: centered single figure, full head to shoes visible, same scale and crop as the pose reference where applicable.
Scene/backdrop: no background, genuine transparent alpha.
Constraints: entire figure is one completely solid pure black shape (#000000), fully opaque; retain only the exterior contour and essential gaps between limbs/hair; no face, costume details, gradients, highlights, outline, shadow, ground, text, frame, or watermark.
Avoid: gray fills, facial features, scenery, extra people.`;
 return {id,result:await tools.image_gen__imagegen({prompt,referenced_image_paths:refs,transparent_background:true})};
}));
for(const {id,result} of results){text(id);generatedImage(result);}
