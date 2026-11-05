import json, os, sys, urllib.request, urllib.parse
from pyproj import Transformer
T = Transformer.from_crs(4326, 2100, always_xy=True)
EPSX = "https://sdigmap.tee.gov.gr/mapping/rest/services/UDM/UDM_SERVICE_POLEODOMIKI_PLIROFORIA/MapServer/6/query"
KT = "https://services-eu1.arcgis.com/40tFGWzosjaLJpmn/arcgis/rest/services/GEOTEMAXIA_LEITOURGOUN_ON_gdb/FeatureServer/0/query"
FN = "https://%s.supabase.co/functions/v1/oroi-domisis" % os.environ["REF"]
H = {"User-Agent": "HEXIS-APP/1.0 (hexis-app.gr)", "Referer": "https://sdigmap.tee.gov.gr/sdmquery/public/"}
def post(url, data, headers):
    r = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(r, timeout=90) as f: return f.read()
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=60) as f: return f.read()
places = {"katouna_lefkadas": (20.7155, 38.7905), "katouna_xiromerou": (21.1170, 38.7830)}
os.makedirs("out", exist_ok=True)
log = open("out/ot_summary.txt", "w")
def P(*a): s = " ".join(str(x) for x in a); print(s); log.write(s + "\n")
for name, (lon, lat) in ({} if os.environ.get("POINT") else places).items():
    x, y = T.transform(lon, lat); d = 2500
    env = "%.1f,%.1f,%.1f,%.1f" % (x - d, y - d, x + d, y + d)
    body = urllib.parse.urlencode({"geometry": env, "geometryType": "esriGeometryEnvelope", "inSR": "2100", "outSR": "2100", "spatialRel": "esriSpatialRelIntersects", "outFields": "OT_NUM,FEK", "returnGeometry": "true", "resultRecordCount": "2000", "f": "json"}).encode()
    try: j = json.loads(post(EPSX, body, dict(H, **{"Content-Type": "application/x-www-form-urlencoded"})))
    except Exception as e: P(name, "EPSX error", e); continue
    fs = [f for f in j.get("features", []) if f.get("geometry", {}).get("rings")]
    P(name, "center", round(x, 1), round(y, 1), "OT features", len(fs), "FEK", sorted(set(str(f["attributes"].get("FEK")) for f in fs))[:8])
    if not fs: continue
    def cen(f):
        r = f["geometry"]["rings"][0]; return (sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r))
    fs.sort(key=lambda f: (cen(f)[0] - x) ** 2 + (cen(f)[1] - y) ** 2)
    found = 0
    for f in fs[:12]:
        cx, cy = cen(f)
        q = urllib.parse.urlencode({"f": "json", "where": "1=1", "geometry": "%.2f,%.2f" % (cx, cy), "geometryType": "esriGeometryPoint", "inSR": "2100", "spatialRel": "esriSpatialRelIntersects", "outFields": "KAEK", "returnGeometry": "false"})
        try: k = json.loads(get(KT + "?" + q)).get("features", [])
        except Exception as e: P(" kt err", e); continue
        if not k: continue
        K = k[0]["attributes"]["KAEK"]
        P(" OT", f["attributes"].get("OT_NUM"), "FEK", f["attributes"].get("FEK"), "vertices", len(f["geometry"]["rings"][0]), "KAEK", K)
        hh = {"Content-Type": "application/json", "x-hx-selftest": os.environ["KEY"]}
        for act in ("lisp", "lisp_extract"):
            try:
                t = post(FN, json.dumps({"action": act, "kaek": K}).encode(), hh).decode()
                open("out/%s_%s_%s.txt" % (name, act, K), "w").write(t)
                P("  ", act, len(t), "B", "HX_OT lines", t.count("G=HX_OT|"), [l for l in t.splitlines() if l.startswith(("OT=", "KATASTASI=", "ERR", "MSG"))][:3])
            except Exception as e: P("  ", act, "error", e)
        found += 1
        if found >= 2: break
pt = os.environ.get("POINT")
if pt:
    q = urllib.parse.urlencode({"f": "json", "where": "1=1", "geometry": pt, "geometryType": "esriGeometryPoint", "inSR": "2100", "spatialRel": "esriSpatialRelIntersects", "outFields": "KAEK", "returnGeometry": "false"})
    k = json.loads(get(KT + "?" + q)).get("features", [])
    K = k[0]["attributes"]["KAEK"] if k else ""
    P("POINT", pt, "KAEK", K)
    hh = {"Content-Type": "application/json", "x-hx-selftest": os.environ["KEY"]}
    for act in ("lisp", "lisp_extract"):
        try:
            t = post(FN, json.dumps({"action": act, "kaek": K}).encode(), hh).decode()
            open("out/point_%s.txt" % act, "w").write(t)
            P("  ", act, len(t), "B", "HX_OT lines", t.count("G=HX_OT|"), [l for l in t.splitlines() if l.startswith(("OT=", "KATASTASI=", "ERR", "MSG"))][:3])
        except Exception as e: P("  ", act, "error", e)
log.close()
