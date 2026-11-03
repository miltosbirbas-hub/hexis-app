// Έλεγχος γεωαναφοράς του ΦΕΚ 53Δ/1963: tags + επισκόπηση + θέση του γεωτεμαχίου
import { fromUrl } from "geotiff";
import fs from "fs";
const KT = "https://services-eu1.arcgis.com/40tFGWzosjaLJpmn/arcgis/rest/services/GEOTEMAXIA_LEITOURGOUN_ON_gdb/FeatureServer/0/query";
const g = await (await fetch(KT + "?f=json&where=KAEK%3D%27190110913003%27&outSR=2100&returnGeometry=true&outFields=KAEK")).json();
const r = g.features[0].geometry.rings[0]; const x = r.reduce((a, p) => a + p[0], 0) / r.length, y = r.reduce((a, p) => a + p[1], 0) / r.length;
const u = "https://sdigmap.tee.gov.gr/_Digitize_LOW/2_GEOREF_EGSA_LOW/004310FS000053-1963E.tif";
const t = await fromUrl(u, { allowFullFile: false }); const im = await t.getImage(); const fd = im.fileDirectory;
const W = im.getWidth(), H = im.getHeight();
const out = { x, y, W, H, scale: fd.ModelPixelScale, tie: fd.ModelTiepoint, trans: fd.ModelTransformation, origin: im.getOrigin(), res: im.getResolution(), bbox: im.getBoundingBox(), geokeys: im.getGeoKeys() };
const ov = await im.readRGB({ width: 120, height: Math.round(120 * H / W), interleave: true });
const oh = Math.round(120 * H / W); let rows = [];
for (let j = 0; j < oh; j += 4) { let line = ""; for (let i = 0; i < 120; i += 2) { const k = (j * 120 + i) * 3; const v = (ov[k] + ov[k + 1] + ov[k + 2]) / 3; line += v < 20 ? "#" : v < 150 ? "+" : "."; } rows.push(line); }
out.overview = rows;
const [ox, oy] = im.getOrigin(), [rx, ry] = im.getResolution();
out.parcelPx = [(x - ox) / rx, (oy - y) / Math.abs(ry)];
fs.mkdirSync("out", { recursive: true }); fs.writeFileSync("out/tif_test.json", JSON.stringify(out, null, 1));
