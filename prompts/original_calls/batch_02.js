// @exec: {"yield_time_ms": 120000, "max_output_tokens": 1200}
const items = [
  ["A", "assets/final/character_a_design.png", `Use case: stylized-concept
Asset type: four-view character turnaround sheet for the same original adult female rhythm-game MV character.
Input images: Image 1 is the authoritative character design reference. Match her exact face, very long midnight-navy twin ponytails with cyan and hot-pink streaks, violet-magenta eyes, star clips, cyan-and-magenta cropped stage jacket, dark fitted top, layered asymmetric skirt over black safety shorts, striped thigh-high, bright leg warmer, fingerless gloves, and chunky high-top sneakers.
Primary request: Create a clean production turnaround sheet showing this exact same woman in four separate full-body standing views, all at identical scale: front view, left profile, right profile, back view. Keep anatomy and outfit construction consistent between views.
Style/medium: match the reference's polished contemporary Japanese 2D anime game illustration, clean line art and crisp cel shading.
Composition/framing: four evenly spaced full-body views on one horizontal sheet, head to shoes fully visible, neutral relaxed stance with arms slightly away from torso so costume reads clearly.
Scene/backdrop: plain warm-white opaque character-sheet background.
Constraints: one character only; adult woman; preserve identity, proportions, hair, clothing, colors, accessories, and shoes exactly from Image 1; no text or view labels.
Avoid: new costume parts, alternate hairstyle, redesign, props, scenery, watermark, cropped feet.`],
  ["B", "assets/final/character_b_design.png", `Use case: stylized-concept
Asset type: four-view character turnaround sheet for the same original adult female rhythm-game MV character.
Input images: Image 1 is the authoritative character design reference. Match her exact face, short tousled coral-orange bob with lime-yellow underlayer, single side ponytail with teal ribbon, amber eyes, lemon-yellow cropped bomber with teal panels, deep teal top, coral-magenta shorts with utility belt, one dark legging and one striped knee sock, wrist cuffs, and teal-and-coral chunky sneakers.
Primary request: Create a clean production turnaround sheet showing this exact same woman in four separate full-body standing views, all at identical scale: front view, left profile, right profile, back view. Keep anatomy and outfit construction consistent between views.
Style/medium: match the reference's polished contemporary Japanese 2D anime game illustration, clean line art and crisp cel shading.
Composition/framing: four evenly spaced full-body views on one horizontal sheet, head to shoes fully visible, neutral relaxed stance with arms slightly away from torso so costume reads clearly.
Scene/backdrop: plain warm-white opaque character-sheet background.
Constraints: one character only; adult woman; preserve identity, proportions, hair, clothing, colors, accessories, and shoes exactly from Image 1; no text or view labels.
Avoid: new costume parts, alternate hairstyle, redesign, props, scenery, watermark, cropped feet.`]
];
const results = await Promise.all(items.map(async ([id,path,prompt]) => ({id, result: await tools.image_gen__imagegen({prompt, referenced_image_paths:[path], transparent_background:false})})));
for (const {id,result} of results) {
  text(`Character ${id} turnaround`);
  generatedImage(result);
}
