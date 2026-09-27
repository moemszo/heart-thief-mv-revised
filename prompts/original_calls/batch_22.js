// @exec: {"yield_time_ms": 120000, "max_output_tokens": 1200}
const jobs = [
  ["white_a_peace_plate", [
    "assets/final/character_a_peace.png",
    "assets/final/character_a_design.png"
  ]],
  ["white_a_cheer_plate", [
    "assets/final/character_a_cheer.png",
    "assets/final/character_a_design.png"
  ]],
  ["white_b_peace_plate", [
    "assets/final/character_b_peace.png",
    "assets/final/character_b_design.png"
  ]],
  ["white_b_dance_plate", [
    "assets/final/character_b_dance.png",
    "assets/final/character_b_design.png"
  ]]
];
const results = await Promise.all(jobs.map(async ([name, refs]) => {
  const r = await tools.image_gen__imagegen({
    referenced_image_paths: refs,
    transparent_background: false,
    prompt: "Create a production-ready full-body white silhouette plate on a perfectly uniform solid black background. The first reference determines the exact pose and gaze; the second determines character identity and outfit outline only. Preserve the pose clearly and do not substitute a different pose. Fill the whole character uniformly pure white with no facial features or internal details. Flat matte shape, crisp edge, no glow, no halo, no rim light, no shadows, no texture, no text. Center the entire character on the portrait canvas."
  });
  return [name, r];
}));
for (const [name, r] of results) {
  text(name);
  generatedImage(r);
}
