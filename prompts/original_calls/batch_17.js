// @exec: {"yield_time_ms": 120000, "max_output_tokens": 1200}
const jobs = [
  ["white_a_cheer", "assets/final/silhouette_a_cheer_black.png"],
  ["white_b_neutral", "assets/final/silhouette_b_neutral_black.png"],
  ["white_b_dance", "assets/final/silhouette_b_dance_black.png"]
];
const results = await Promise.all(jobs.map(async ([name, path]) => {
  const r = await tools.image_gen__imagegen({
    referenced_image_paths: [path],
    transparent_background: true,
    prompt: "Create a plain matte white cutout asset from the reference. Keep its exact character silhouette outline, pose, body proportions, hair, accessories and framing. Make the full visible silhouette uniformly opaque pure white (#FFFFFF), a flat 2D vector-like shape with only a clean anti-aliased edge. Everything outside the silhouette must be fully transparent. No glow, no halo, no bloom, no rim light, no lighting, no shadow, no stroke, no gradients, no texture, no grey pixels, no black pixels, no background. This must look like a white paper cutout, not a luminous figure. Keep the original portrait canvas."
  });
  return [name, r];
}));
for (const [name, r] of results) {
  text(name);
  generatedImage(r);
}
