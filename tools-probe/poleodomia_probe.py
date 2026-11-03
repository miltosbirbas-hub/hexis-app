# Probe e-Πολεοδομίας (ΥΠΕΝ): λίστα υπηρεσιών + identify σε δείγματα σημείων. Τρέχει στο GitHub Actions.
import json, os, sys, urllib.request, urllib.parse, ssl
from pyproj import Transformer
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
def get(url, t=40):
    try:
        req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0 HEXIS-probe"})
        with urllib.request.urlopen(req, timeout=t, context=ctx) as r:
            b = r.read(); return r.status, b.decode("utf-8","replace")
    except Exception as e:
        return 0, "ERR "+repr(e)
log = {}
BASES = ["http://gis.epoleodomia.gov.gr/arcgis/rest/services", "https://gis.epoleodomia.gov.gr/arcgis/rest/services"]
root = None
for B in BASES:
    st, tx = get(B+"?f=pjson"); log[B] = [st, tx[:3000]]
    if st==200 and tx.strip().startswith("{"): root = B; break
services = []
if root:
    j = json.loads(log[root][1]) if len(log[root][1])<3000 else json.loads(get(root+"?f=pjson")[1])
    def walk(folder):
        st, tx = get(root+("/"+folder if folder else "")+"?f=pjson")
        try: d = json.loads(tx)
        except: return
        for s in d.get("services",[]): services.append(s)
        for f in d.get("folders",[]): 
            if not folder: walk(f)
    walk("")
detail = {}
for s in services:
    u = f"{root}/{s['name']}/{s['type']}?f=pjson"
    st, tx = get(u)
    try:
        d = json.loads(tx); detail[s['name']+"/"+s['type']] = {"layers":[(l.get("id"),l.get("name")) for l in d.get("layers",[])], "sr":d.get("spatialReference")}
    except: detail[s['name']+"/"+s['type']] = {"err":tx[:300]}
tr = Transformer.from_crs("EPSG:4326","EPSG:2100",always_xy=True)
PTS = {"athina_syntagma":(23.7348,37.9755),"thess_center":(22.9407,40.6327),"lefkada_poli":(20.7069,38.8320),
       "agrinio":(21.4078,38.6214),"nydri":(20.7086,38.7078),"lefkada_village_karya":(20.6544,38.7710),
       "ektos_sxediou_lefkada":(20.6700,38.7400),"patra":(21.7346,38.2466),"kalamata":(22.1142,37.0389)}
ident = {}
for name,(lon,lat) in PTS.items():
    x,y = tr.transform(lon,lat); ident[name] = {"egsa":[round(x,1),round(y,1)]}
    for s in services:
        if s["type"]!="MapServer": continue
        q = {"geometry":f"{x},{y}","geometryType":"esriGeometryPoint","sr":"2100","layers":"all","tolerance":"3",
             "mapExtent":f"{x-500},{y-500},{x+500},{y+500}","imageDisplay":"400,400,96","returnGeometry":"false","f":"json"}
        st, tx = get(f"{root}/{s['name']}/MapServer/identify?"+urllib.parse.urlencode(q), 30)
        try:
            d = json.loads(tx); res = d.get("results",[])
            if res: ident[name][s["name"]] = [{"layer":r.get("layerName"),"attr":r.get("attributes")} for r in res[:12]]
        except: ident[name][s["name"]] = "ERR "+tx[:200]
json.dump({"root":root,"log":log,"services":services,"detail":detail}, open(OUT+"/services.json","w"), ensure_ascii=False, indent=1)
json.dump(ident, open(OUT+"/identify.json","w"), ensure_ascii=False, indent=1)
# ΥΠΕΝ mapsportal WFS
st, tx = get("https://mapsportal.ypen.gr/geoserver/wfs?service=WFS&request=GetCapabilities", 60)
open(OUT+"/mapsportal_caps.xml","w").write(tx[:400000])
print("root", root, "services", len(services))
