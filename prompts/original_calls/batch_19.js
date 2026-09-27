// @exec: {"yield_time_ms": 120000, "max_output_tokens": 1000}
const r = await tools.image_gen__imagegen({
  referenced_image_paths: [
    "assets/final/silhouette_a_neutral_black.png",
    "assets/final/character_a_design.png"
  ],
  transparent_background: false,
  prompt: "A production-ready silhouette plate, portrait canvas, exact full-body pose and framing from reference one; same long twin-tail anime woman outline from reference two. Show her as a single matte, perfectly solid pure-white cutout shape against a perfectly uniform pure-black background. No glow, no halo, no rim light, no gradients, no texture, no shadow, no facial features, no interior details, no text. Crisp clean edge. The white figure should be clearly visible, centered, full body."
});
generatedImage(r);
text("Generated a white silhouette on black for compositing.");
