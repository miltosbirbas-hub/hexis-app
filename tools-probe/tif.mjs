// Έλεγχος μορφής του σαρωμένου διαγράμματος για το ΚΑΕΚ 190110913003 (ΦΕΚ 53Δ/1963)
import { fromUrl } from "geotiff";
import fs from "fs";
const KT = "https://services-eu1.arcgis.com/40tFGWzosjaLJpmn/arcgis/rest/services/GEOTEMAXIA_LEITOURGOUN_ON_gdb/FeatureServer/0/query";
const g = await (await fetch(KT + "?f=json&where=KAEK%3D%27190110913003%27&outSR=2100&returnGeometry=true&outFields=KAEK")).json();
const r = g.features[0].geometry.rings[0]; const x = r.reduce((a, p) => a + p[0], 0) / r.length, y = r.reduce((a, p) => a + p[1], 0) / r.length;
const D = "https://sdigmap.tee.gov.gr/mapping/rest/services/UDM/UDM_SERVICE_SXEDIA_DOCS/MapServer/0/query";
const d = await (await fetch(D + `?f=json&geometry=${x},${y}&geometryType=esriGeometryPoint&inSR=2100&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false`)).json();
const out = { x, y, docs: [] };
for (const f of d.features.filter(f=>/^53Δ\/1963/.test(f.attributes.FEK||'')).concat(d.features.slice(0,1))) {
  const a = f.attributes, u = a.GEOREF_DIAGRAM_URL; if (!u) continue;
  try {
    const t = await fromUrl(u, { allowFullFile: false }); const im = await t.getImage(); const fd = im.fileDirectory;
    const rec = { fek: a.FEK, scale: a.INIT_DIAGR_SCALE_DENOMINATOR, url: u, w: im.getWidth(), h: im.getHeight(), bps: fd.BitsPerSample, spp: fd.SamplesPerPixel, photometric: fd.PhotometricInterpretation, compression: fd.Compression, colormap: !!fd.ColorMap, extra: fd.ExtraSamples, res: im.getResolution(), origin: im.getOrigin(), images: await t.getImageCount() };
    const [ox, oy] = im.getOrigin(), [rx, ry] = im.getResolution();
    const cx = Math.round((x - ox) / rx), cy = Math.round((oy - y) / Math.abs(ry));
    const win = [Math.max(0, cx - 200), Math.max(0, cy - 200), Math.min(im.getWidth(), cx + 200), Math.min(im.getHeight(), cy + 200)];
    try { const rgb = await im.readRGB({ window: win, width: 100, height: 100, interleave: true }); let s = 0, mx = 0; for (const v of rgb) { s += v; if (v > mx) mx = v; } rec.rgbMean = s / rgb.length; rec.rgbMax = mx; } catch (e) { rec.rgbErr = String(e); }
    try { const ras = await im.readRasters({ window: win, width: 100, height: 100, samples: [0], interleave: true }); let s = 0, mx = 0, mn = 1e9; for (const v of ras) { s += v; if (v > mx) mx = v; if (v < mn) mn = v; } rec.rawMean = s / ras.length; rec.rawMax = mx; rec.rawMin = mn; } catch (e) { rec.rawErr = String(e); }
    out.docs.push(rec);
  } catch (e) { out.docs.push({ fek: a.FEK, url: u, err: String(e) }); }
}
fs.mkdirSync("out", { recursive: true }); fs.writeFileSync("out/tif_test.json", JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
