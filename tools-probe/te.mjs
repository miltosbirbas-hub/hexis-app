import fs from "fs";
fs.mkdirSync("out",{recursive:true});
const B="https://sdigmap.tee.gov.gr/mapping/rest/services";
const H={headers:{"Referer":"https://hexis-app.gr/","Origin":"https://hexis-app.gr"}};
const out={};
async function j(u){ try{ const r=await fetch(u,H); const t=await r.text(); try{return JSON.parse(t)}catch{return {raw:t.slice(0,800),status:r.status}} }catch(e){return {err:String(e)}} }
out.root=await j(B+"?f=json");
out.udm=await j(B+"/UDM?f=json");
for(const f of (out.root.folders||[])) if(f!=="UDM") out["folder_"+f]=await j(B+"/"+f+"?f=json");
// όλα τα layers κάθε υπηρεσίας UDM
out.layers={};
for(const s of (out.udm.services||[])){ const d=await j(`${B}/${s.name}/${s.type}?f=json`); out.layers[s.name]=(d.layers||[]).map(l=>l.id+":"+l.name).concat((d.tables||[]).map(t=>"T"+t.id+":"+t.name)); }
// γεωτεμάχιο
const kt=await j("https://services-eu1.arcgis.com/40tFGWzosjaLJpmn/arcgis/rest/services/GEOTEMAXIA_LEITOURGOUN_ON_gdb/FeatureServer/0/query?where=KAEK%3D%27050115303002%27&outFields=*&returnGeometry=true&outSR=2100&f=json");
out.kt=kt;
const r=kt.features&&kt.features[0]&&kt.features[0].geometry.rings[0];
if(r){ const xs=r.map(p=>p[0]),ys=r.map(p=>p[1]); const env=`${Math.min(...xs)-60},${Math.min(...ys)-60},${Math.max(...xs)+60},${Math.max(...ys)+60}`; out.env=env;
  const q=(svc,l)=>j(`${B}/UDM/${svc}/MapServer/${l}/query?geometry=${env}&geometryType=esriGeometryEnvelope&inSR=2100&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json`);
  out.q={};
  for(const [svc,ls] of Object.entries(out.layers)){ for(const l of ls){ const id=l.split(":")[0]; if(id.startsWith("T")) continue; const d=await q(svc.replace(/^UDM\//,""),id); if(d.features&&d.features.length) out.q[svc+"/"+l]=d.features.slice(0,8).map(f=>f.attributes); else if(d.error) out.q[svc+"/"+l]={error:d.error.message}; } }
}
fs.writeFileSync("out/te.json",JSON.stringify(out,null,1));
