// @exec: {"yield_time_ms": 120000, "max_output_tokens": 1200}
const jobs = [
  ["white_a_cheer_plate", [
    "assets/final/silhouette_a_cheer_black.png",
    "assets/final/character_a_design.png"
  ]],
  ["white_b_neutral_plate", [
    "assets/final/silhouette_b_neutral_black.png",
    "assets/final/character_b_design.png"
  ]],
  ["white_b_dance_plate", [
    "assets/final/silhouette_b_dance_black.png",
    "assets/final/character_b_design.png"
  ]]
];
const results = await Promise.all(jobs.map(async ([name, refs]) => {
  const r = await tools.image_gen__imagegen({
    referenced_image_paths: refs,
    transparent_background: false,
    prompt: "A production-ready silhouette plate, portrait canvas, exact full-body pose and framing from the first reference; use the second reference only for hairstyle and outfit outline. Show the character as one matte solid pure-white cutout shape against a perfectly uniform pure-black background. No glow, halo, rim light, gradients, texture, shadow, facial features, interior details, or text. Crisp clean edge, centered, full body."
  });
  return [name, r];
}));
for (const [name, r] of results) {
  text(name);
  generatedImage(r);
}
