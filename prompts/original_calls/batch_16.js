// @exec: {"yield_time_ms": 120000, "max_output_tokens": 1000}
const r = await tools.image_gen__imagegen({
  referenced_image_paths: ["assets/final/silhouette_a_neutral_black.png"],
  transparent_background: true,
  prompt: "Make a plain flat matte cutout asset, like a binary vector mask, not a poster or illustration. Preserve the exact full-body silhouette outline and pose in the reference. The character shape itself is a single flat solid white fill (#FFFFFF); outside the character is fully transparent. Crisp clean contour with only minimal 1-pixel antialiasing at edges. No lighting, no glow, no halo, no bloom, no rim light, no shadow, no stroke, no gradients, no texture, no background. Do not make the white figure luminous. Transparent alpha must be zero everywhere outside the silhouette and fully opaque inside. Same portrait framing and proportions."
});
generatedImage(r);
text("Generated a flat white matte silhouette.");
