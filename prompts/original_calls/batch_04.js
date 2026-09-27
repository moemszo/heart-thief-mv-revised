// @exec: {"yield_time_ms": 120000, "max_output_tokens": 1500}
const outDir="[LOCAL_WORKSPACE]/outputs/proseka_mv_assets";
const specs=[
  {id:"a_peace", char:"A", design:"very long midnight-navy twin ponytails with cyan and hot-pink streaks, violet-magenta eyes, star hair clips, cyan-and-magenta cropped stage jacket over a dark top, layered asymmetric skirt over black safety shorts, striped thigh-high on one leg and bright leg warmer on the other, fingerless gloves, chunky high-top sneakers", pose:"full-body lively peace sign toward the viewer, V-sign hand beside one eye, slight forward lean, cheerful confident smile"},
  {id:"a_cheer", char:"A", design:"very long midnight-navy twin ponytails with cyan and hot-pink streaks, violet-magenta eyes, star hair clips, cyan-and-magenta cropped stage jacket over a dark top, layered asymmetric skirt over black safety shorts, striped thigh-high on one leg and bright leg warmer on the other, fingerless gloves, chunky high-top sneakers", pose:"full-body ecstatic cheer with both arms high overhead, mouth open in a joyful shout, dynamic but readable stance"},
  {id:"b_peace", char:"B", design:"short tousled coral-orange bob with lime-yellow underlayer, one small side ponytail tied with a teal ribbon, amber eyes, lemon-yellow cropped bomber with teal panels over a deep teal top, coral-magenta shorts with utility belt, one dark legging and one striped knee sock, wrist cuffs, chunky teal-and-coral sneakers", pose:"full-body lively peace sign toward the viewer, V-sign hand beside one eye, slight forward lean, playful wink and smile"},
  {id:"b_cheer", char:"B", design:"short tousled coral-orange bob with lime-yellow underlayer, one small side ponytail tied with a teal ribbon, amber eyes, lemon-yellow cropped bomber with teal panels over a deep teal top, coral-magenta shorts with utility belt, one dark legging and one striped knee sock, wrist cuffs, chunky teal-and-coral sneakers", pose:"full-body excited 'waaa!' reaction, both hands raised beside her cheeks, wide sparkling eyes and joyful open-mouth shout"}
];
const results=await Promise.all(specs.map(async s=>{
  const n=s.char.toLowerCase();
  const prompt=`Use case: stylized-concept
Asset type: transparent full-body anime MV character pose cutout
Input images: Image 1 is the authoritative design sheet for Character ${s.char}; Image 2 is the same character's turnaround reference.
Primary request: Draw the exact same original adult female character as in the reference images, in this pose: ${s.pose}.
Subject: ${s.design}.
Style/medium: match the reference's polished Japanese 2D anime game illustration, confident clean line art, crisp cel shading, vivid colors.
Composition/framing: one character only, full body centered, head and both shoes fully visible, generous transparent margin, pose silhouette clearly readable.
Scene/backdrop: no scene, no background, genuinely transparent alpha.
Constraints: preserve identity, face, hairstyle, proportions, costume, colors, accessories, and shoes exactly from the references; standalone cutout; no ground plane, cast shadow, text, frame, or watermark.
Avoid: extra people, outfit changes, cropped hands or feet, props.`;
  const r=await tools.image_gen__imagegen({prompt,referenced_image_paths:[`${outDir}/character_${n}_design.png`,`${outDir}/character_${n}_turnaround.png`],transparent_background:true});
  return {id:s.id,result:r};
}));
for(const {id,result} of results){text(id);generatedImage(result);}
