// @exec: {"yield_time_ms": 120000, "max_output_tokens": 1000}
const r = await tools.image_gen__imagegen({
  referenced_image_paths: [
    "assets/final/silhouette_a_cheer_black.png",
    "assets/final/character_a_design.png"
  ],
  transparent_background: true,
  prompt: "Create a clean white character silhouette asset for compositing in an anime music video. Use the first reference for the exact pose and framing; use the second reference only for this character's hairstyle and outfit outline. Render the complete character as one solid opaque pure-white (#FFFFFF) shape, without facial features or interior detail. Everything outside the shape is transparent. Full-body portrait, preserve the raised cheer pose. No background, no letters."
});
generatedImage(r);
text("Generated a white cheer silhouette test.");
