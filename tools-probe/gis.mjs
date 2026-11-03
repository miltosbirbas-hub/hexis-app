// Προσωρινός έλεγχος δημοτικών GIS (πολεοδομικά δεδομένα) — αποτελέσματα στον κλάδο probe-out
import fs from "fs";
fs.mkdirSync("out", { recursive: true });
const UA = { headers: { "User-Agent": "Mozilla/5.0 HEXIS-APP probe", "Referer": "https://hexis-app.gr/" } };
const res = {};
async function get(name, url, n = 6000) {
  try { const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 25000);
    const r = await fetch(url, { ...UA, signal: ctl.signal, redirect: "follow" }); clearTimeout(t);
    const tx = await r.text(); res[name] = { url, status: r.status, final: r.url, ct: r.headers.get("content-type"), acao: r.headers.get("access-control-allow-origin"), body: tx.slice(0, n) };
    return tx;
  } catch (e) { res[name] = { url, err: String(e) }; return ""; }
}
const links = (html) => [...new Set((html.match(/https?:\/\/[^"'\s<>()]+/g) || []).filter((u) => /rest\/services|geoserver|wms|wfs|arcgis|MapServer|ows|gis/i.test(u)))].slice(0, 60);
// Πάτρα (ArcGIS)
await get("patra_root", "https://gissrvweb.geopatras.gr/webpoleod/rest/services?f=json");
await get("patra_rym", "https://gissrvweb.geopatras.gr/webpoleod/rest/services/poleod/%CE%A1%CE%A5%CE%9C%CE%9F%CE%A4%CE%9F%CE%9C%CE%99%CE%91/MapServer?f=json", 20000);
await get("patra_poleod", "https://gissrvweb.geopatras.gr/webpoleod/rest/services/poleod?f=json");
// Αθήνα (GeoNode)
for (const [n, u] of [["ath_home", "https://gis.cityofathens.gr/"], ["ath_layers", "https://gis.cityofathens.gr/api/v2/datasets?page_size=100"], ["ath_layers_v1", "https://gis.cityofathens.gr/api/layers/?limit=200"], ["ath_wfs", "https://gis.cityofathens.gr/geoserver/ows?service=WFS&version=2.0.0&request=GetCapabilities"], ["ath_map287", "http://gis.cityofathens.gr/maps/287"]]) await get(n, u, 30000);
// Λάρισα
const lar = await get("lar_app", "https://gis.larissa-dimos.gr/poleodom/", 20000);
res.lar_links = links(lar);
for (const [n, u] of [["lar_rest", "https://gis.larissa-dimos.gr/arcgis/rest/services?f=json"], ["lar_rest2", "https://gis.larissa-dimos.gr/server/rest/services?f=json"], ["lar_geoserver", "https://gis.larissa-dimos.gr/geoserver/ows?service=WMS&request=GetCapabilities"]]) await get(n, u);
// Ρέθυμνο, Ηράκλειο, Χανιά, Θεσσαλονίκη, Βόλος, Ιωάννινα
for (const [n, u] of [["reth", "https://www.rethymno.gr/e-services/gis"], ["dreth", "https://www.dreth.gr/%CE%B3%CE%B5%CF%89%CE%B3%CF%81%CE%B1%CF%86%CE%B9%CE%BA%CF%8C-%CF%83%CF%8D%CF%83%CF%84%CE%B7%CE%BC%CE%B1-gis/"], ["her", "https://smartcity.heraklion.gr/?p=411"], ["avmap", "https://www.avmap.gr/gis-poleodomias/"], ["mygis", "https://mygis.gr/"]]) { const h = await get(n, u, 3000); res[n + "_links"] = links(h); }
for (const [n, u] of [["thes1", "https://gis.thessaloniki.gr/arcgis/rest/services?f=json"], ["thes2", "https://gis.thessaloniki.gr/"], ["her_gis", "https://gis.heraklion.gr/"], ["chania_gis", "https://gis.chania.gr/"], ["volos_gis", "https://gis.volos.gr/"], ["ioa_gis", "https://gis.ioannina.gr/"], ["terra", "https://mapsrv16.terra.gr/server/rest/services/EniaiosPsifiakosChartis?f=json"], ["epol", "http://gis.epoleodomia.gov.gr/arcgis/rest/services?f=json"]]) { const h = await get(n, u, 3000); res[n + "_links"] = links(h); }
fs.writeFileSync("out/gis.json", JSON.stringify(res, null, 1));
