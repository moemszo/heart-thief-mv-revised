// @exec: {"yield_time_ms": 120000, "max_output_tokens": 1000}
const r = await tools.image_gen__imagegen({
  referenced_image_paths: ["assets/final/silhouette_a_neutral_black.png"],
  transparent_background: true,
  prompt: "Strictly recreate the exact character silhouette shape from the reference image as a clean compositing asset. Preserve the same pose, proportions, hair outline, accessories silhouette, placement, and canvas framing. Fill every pixel of the character silhouette with uniform pure opaque white (#FFFFFF), alpha 255. Keep everything outside the silhouette fully transparent (alpha 0). No gray, no black, no outlines, no glow, no shadow, no gradients, no extra marks, no checkerboard, no background. The whole visible subject must be a solid white silhouette, easy to see on a dark background. Keep the original portrait canvas and centered full-body figure."
});
generatedImage(r);
text("Generated one white silhouette edit.");
