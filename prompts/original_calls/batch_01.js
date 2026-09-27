// @exec: {"yield_time_ms": 120000, "max_output_tokens": 1200}
const prompts = [
  {
    key: "A",
    prompt: `Use case: stylized-concept
Asset type: original anime rhythm-game music video character design sheet, character A
Primary request: Create a polished full-body design sheet for one original adult female performer for a colorful Japanese rhythm-game music video. She is a lively, confident young woman with very long midnight-navy twin ponytails, unmistakable cyan and hot-pink hair streaks, sharp violet-magenta eyes, and small star hair clips. Her signature costume is a vivid cyan-and-magenta cropped stage jacket over a dark fitted top, layered asymmetric short skirt with clearly visible black safety shorts, one striped thigh-high and one bright leg warmer, fingerless gloves, and chunky high-top sneakers. Use bold, readable silhouette and small geometric star accents.
Style/medium: high-quality contemporary Japanese 2D anime game illustration, clean confident line art, crisp cel shading, saturated colors, detailed yet production-friendly design.
Composition/framing: one full-body character centered, standing neutral three-quarter front view, whole head and both shoes visible; add a few small color swatches and 2-3 accessory detail callouts around the figure, but no other people.
Scene/backdrop: plain warm-white design-board background, opaque.
Lighting/mood: bright soft studio light, energetic and polished.
Color palette: midnight navy, electric cyan, hot magenta, violet, small white highlights.
Constraints: original character only; adult woman; fully clothed; preserve the exact same face, hair, outfit, colors, and accessories for later reference. Keep a clean single-character model-sheet layout.
Avoid: existing franchise characters, recognizable logos, text, lettering, watermark, extra limbs, cropped shoes, complex scenery.`
  },
  {
    key: "B",
    prompt: `Use case: stylized-concept
Asset type: original anime rhythm-game music video character design sheet, character B
Primary request: Create a polished full-body design sheet for a second original adult female performer, visually distinct from a long twin-tailed counterpart. She has a short tousled coral-orange bob with a lime-yellow underlayer and one small side ponytail tied with a teal ribbon, warm amber eyes, and a playful, bold expression. Her signature costume is a lemon-yellow cropped bomber jacket with teal panels over a deep teal top, vivid coral-magenta shorts with a small utility belt, one opaque dark legging and one striped knee sock, wrist cuffs, and chunky teal-and-coral sneakers. Use broad color blocks and rounded lightning motifs, not stars.
Style/medium: high-quality contemporary Japanese 2D anime game illustration, clean confident line art, crisp cel shading, saturated colors, detailed yet production-friendly design.
Composition/framing: one full-body character centered, standing neutral three-quarter front view, whole head and both shoes visible; add a few small color swatches and 2-3 accessory detail callouts around the figure, but no other people.
Scene/backdrop: plain warm-white design-board background, opaque.
Lighting/mood: bright soft studio light, cheerful and punchy.
Color palette: coral orange, lemon yellow, lime, deep teal, small white highlights.
Constraints: original character only; adult woman; fully clothed; preserve the exact same face, hair, outfit, colors, and accessories for later reference. Make her silhouette and palette clearly different from the other character.
Avoid: existing franchise characters, recognizable logos, text, lettering, watermark, extra limbs, cropped shoes, complex scenery.`
  }
];
const results = await Promise.all(prompts.map(async p => ({key:p.key, result: await tools.image_gen__imagegen({prompt:p.prompt, transparent_background:false})})));
for (const {key,result} of results) {
  text(`Character ${key} design sheet`);
  for (const c of (result?.content ?? [])) {
    if (c.type === "image") generatedImage(c);
    else if (c.type === "text") text(c.text.slice(0,1200));
  }
}
