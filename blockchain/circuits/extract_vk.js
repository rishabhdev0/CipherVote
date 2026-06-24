const fs=require("fs"),path=require("path");
const vk=JSON.parse(fs.readFileSync(path.join(__dirname,"build/verification_key.json"),"utf8"));
if(vk.nPublic!==5)throw new Error(`Expected 5 public inputs, got ${vk.nPublic}`);
if(!Array.isArray(vk.IC)||vk.IC.length!==6)throw new Error(`Expected 6 IC points, got ${vk.IC?.length}`);
const params={
  alpha:[vk.vk_alpha_1[0],vk.vk_alpha_1[1]],
  beta:[[vk.vk_beta_2[0][1],vk.vk_beta_2[0][0]],[vk.vk_beta_2[1][1],vk.vk_beta_2[1][0]]],
  gamma:[[vk.vk_gamma_2[0][1],vk.vk_gamma_2[0][0]],[vk.vk_gamma_2[1][1],vk.vk_gamma_2[1][0]]],
  delta:[[vk.vk_delta_2[0][1],vk.vk_delta_2[0][0]],[vk.vk_delta_2[1][1],vk.vk_delta_2[1][0]]],
  ic:vk.IC.map(p=>[p[0],p[1]]),nPublic:vk.nPublic
};
fs.writeFileSync(path.join(__dirname,"build/vk_params.json"),JSON.stringify(params,null,2));
console.log("✅ vk_params.json saved");
