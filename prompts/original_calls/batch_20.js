// @exec: {"yield_time_ms": 120000, "max_output_tokens": 1000}
const r = await tools.image_gen__imagegen({
  referenced_image_paths: ["assets/iterations/generation_050.png"],
  transparent_background: true,
  prompt: "Keep the exact existing white character silhouette unchanged: same pose, outline, position, scale, and pure-white fill. Remove only the uniform black background so the outside becomes fully transparent. Do not add any glow, halo, shadow, edge light, gray pixels, or new details. Preserve a crisp matte white cutout on a transparent RGBA canvas."
});
generatedImage(r);
text("Attempted background removal for the white silhouette.");
