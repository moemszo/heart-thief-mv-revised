// @exec: {"yield_time_ms": 120000, "max_output_tokens": 1000}
const target="assets/references/user_reference_03.png";
const design="assets/final/character_b_design.png";
const prompt=`Use case: precise-object-edit
Asset type: isolated transparent social-story smartphone MV prop
Input images: Image 1 is the exact target phone and fictional social-story layout; Image 2 is the authoritative Character B design reference.
Primary request: Preserve Image 1's tilted three-quarter smartphone view and overall custom story interface. Redraw only the large portrait photo inside the screen so the exact same Character B is clearly photographed from above: camera high above her looking down at a 35-45 degree angle, top of her coral-orange hair visible, shoulders foreshortened, her face turned slightly aside with her eyes looking away from the lens. The shot should read immediately as a high-angle photo of B inside a story post.
Style/medium: clean, polished 2D Japanese anime game illustration; reduce the synthetic AI gloss with natural line weight, restrained highlights, simple coherent phone geometry, and controlled cel shading.
Composition/framing: keep the whole phone fully visible, same diagonal perspective as Image 1, screen contents clear; isolated device with transparent margin.
Scene/backdrop: no background, preserve genuine transparent alpha.
Constraints: preserve exact phone frame, custom fictional social UI, B's identity, hair, outfit and palette; no hand, desk, other characters, platform name, logo, readable text, or watermark.
Avoid: flat front-on phone; ordinary eye-level portrait; camera-looking selfie; hyper-glossy 3D rendering; copied trademark interface.`;
const r=await tools.image_gen__imagegen({prompt,referenced_image_paths:[target,design],transparent_background:true});
generatedImage(r);
