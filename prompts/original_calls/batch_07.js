// @exec: {"yield_time_ms": 120000, "max_output_tokens": 1800}
const d="[LOCAL_WORKSPACE]/outputs/proseka_mv_assets";
const characters={
 A:"Character A, the same original adult woman from Images 1 and 2: very long midnight-navy twin ponytails with cyan and hot-pink streaks, violet-magenta eyes, star clips, cyan-magenta stage jacket, dark top, layered skirt over black shorts, striped thigh-high and pink leg warmer, fingerless gloves, chunky high-top sneakers.",
 B:"Character B, the same original adult woman from Images 1 and 2: short coral-orange bob with lime-yellow underlayer and teal-ribbon side ponytail, amber eyes, yellow bomber with teal panels, deep teal top, coral-magenta shorts and utility belt, one dark legging and one striped knee sock, wrist cuffs, chunky teal-coral sneakers."
};
const tasks=[
 ["character_a_apple", "A", "Both reference images define Character A; Image 3 is the exact bitten-apple prop to include.", "The exact same Character A takes one small bite from the glossy red apple in Image 3, holding it near her mouth, a delighted playful expression; clearly show one small bite mark." ,[`${d}/character_a_design.png`,`${d}/character_a_turnaround.png`,`${d}/prop_bitten_apple.png`]],
 ["character_b_apple", "B", "Both reference images define Character B; Image 3 is the exact bitten-apple prop to include.", "The exact same Character B takes one small bite from the glossy red apple in Image 3, holding it near her mouth, a delighted playful expression; clearly show one small bite mark." ,[`${d}/character_b_design.png`,`${d}/character_b_turnaround.png`,`${d}/prop_bitten_apple.png`]],
 ["character_a_phone_check", "A", "Images 1 and 2 define Character A; Image 3 is the exact original fictional story-phone prop to include.", "Character A checks the phone in Image 3, shoulders slightly hunched, worried eyes fixed on the many heart reactions, one hand near her chest, conveying insecurity about the rising likes." ,[`${d}/character_a_design.png`,`${d}/character_a_turnaround.png`,`${d}/prop_generic_story_phone.png`]],
 ["character_a_wait", "A", "Both reference images define Character A.", "Character A leans toward the viewer with one palm raised in a clear 'wait' gesture and points to herself with the other hand, determined but hurt expression, as if asking for her turn." ,[`${d}/character_a_design.png`,`${d}/character_a_turnaround.png`]]
];
const results=await Promise.all(tasks.map(async([id,ch,input,pose,refs])=>{
 const prompt=`Use case: stylized-concept
Asset type: transparent full-body anime MV character cutout
Input images: ${input}
Primary request: Draw the exact same character as the references in this pose: ${pose}
Subject: ${characters[ch]}
Style/medium: match the references' polished Japanese 2D anime game illustration, crisp clean line art, cel shading, vivid colors.
Composition/framing: one character only, full-body centered, face, both hands and both shoes visible, generous clear margin.
Scene/backdrop: no scene or background, genuine transparent alpha.
Constraints: keep identity, face, hair, proportions, outfit, colors, accessories, and shoes fixed to the references; standalone cutout; no ground plane, no shadow, no frame, no text, no watermark.
Avoid: extra people, redesign, cropped hands or feet, unrelated props.`;
 return {id,result:await tools.image_gen__imagegen({prompt,referenced_image_paths:refs,transparent_background:true})};
}));
for(const {id,result} of results){text(id);generatedImage(result);}
