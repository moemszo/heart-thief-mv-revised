// @exec: {"yield_time_ms": 120000, "max_output_tokens": 1200}
const items = [
  ["A", "assets/final/character_a_design.png", `Use case: stylized-concept
Asset type: four-view turnaround character sheet
Input images: Image 1 is the authoritative design for Character A: the original adult woman with very long midnight-navy twin ponytails, cyan and hot-pink streaks, violet-magenta eyes, star clips, cyan-magenta jacket, dark top, layered asymmetrical skirt over black shorts, striped thigh-high, bright leg warmer, fingerless gloves, and chunky high-tops.
Primary request: Draw this exact same character in four full-body standing views: front, left profile, right profile, back. Same scale and relaxed neutral pose across views.
Style/medium: match Image 1, polished Japanese 2D anime game art, confident clean lines, crisp cel shading.
Composition/framing: four evenly spaced views across one horizontal sheet, head and shoes fully visible, arms slightly separated from torso.
Scene/backdrop: plain warm-white opaque model-sheet background.
Constraints: one character only; lock identity and every design feature to Image 1; no text or labels.
Avoid: redesign, other characters, props, scenery, cropped feet, watermark.`],
  ["B", "assets/final/character_b_design.png", `Use case: stylized-concept
Asset type: four-view turnaround character sheet
Input images: Image 1 is the authoritative design for Character B: the original adult woman with a short tousled coral-orange bob, lime-yellow underlayer, one side ponytail with teal ribbon, amber eyes, lemon-yellow bomber with teal panels, deep teal top, coral-magenta shorts and utility belt, one dark legging and one striped knee sock, wrist cuffs, and chunky teal-coral sneakers.
Primary request: Draw this exact same character in four full-body standing views: front, left profile, right profile, back. Same scale and relaxed neutral pose across views.
Style/medium: match Image 1, polished Japanese 2D anime game art, confident clean lines, crisp cel shading.
Composition/framing: four evenly spaced views across one horizontal sheet, head and shoes fully visible, arms slightly separated from torso.
Scene/backdrop: plain warm-white opaque model-sheet background.
Constraints: one character only; lock identity and every design feature to Image 1; no text or labels.
Avoid: redesign, other characters, props, scenery, cropped feet, watermark.`]
];
const results = await Promise.all(items.map(async ([id,path,prompt]) => ({id, result: await tools.image_gen__imagegen({prompt, referenced_image_paths:[path], transparent_background:false})})));
for (const {id,result} of results) {
  text(`Character ${id} corrected turnaround`);
  generatedImage(result);
}
