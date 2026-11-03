# Probe v5: web map της δημόσιας εφαρμογής ΕΨΧ → επίπεδα → ερώτημα σημείου σε δείγματα
import json, os, re, sys, urllib.request, urllib.parse, ssl
from pyproj import Transformer
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
H={"User-Agent":"Mozilla/5.0 HEXIS-probe","Referer":"https://sdigmap.tee.gov.gr/sdmquery/public/","Origin":"https://sdigmap.tee.gov.gr"}
def getj(url, t=60):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=t, context=ctx) as r:
            tx=r.read().decode("utf-8","replace")
        try: return r.status, json.loads(tx)
        except: return r.status, {"_text":tx[:800]}
    except Exception as e: return 0, {"_err":repr(e)}
P="https://sdigmap.tee.gov.gr/portal/sharing/rest/content/items/"
rep={}
st,wm=getj(P+"908c40e730a14af49a67f5ee642516a7/data?f=json"); rep["item_data_status"]=st
st,it=getj(P+"908c40e730a14af49a67f5ee642516a7?f=json"); rep["item"]={k:it.get(k) for k in ("title","type","access","snippet")} if isinstance(it,dict) else it
layers=[]
def walk(L, pre=""):
    for l in L or []:
        layers.append({"title":pre+str(l.get("title")),"url":l.get("url"),"itemId":l.get("itemId"),"type":l.get("layerType")})
        if l.get("layers"): walk(l["layers"], pre+str(l.get("title"))+" / ")
if isinstance(wm,dict):
    walk(wm.get("operationalLayers"))
    rep["wm_keys"]=list(wm.keys())[:30]
    if not layers: rep["wm_raw"]=json.dumps(wm,ensure_ascii=False)[:20000]
rep["layers"]=layers
# υπο-επίπεδα κάθε υπηρεσίας
svc={}
for l in layers:
    u=l.get("url")
    if not u: continue
    base=re.sub(r'/\d+$','',u)
    if base in svc: continue
    st,d=getj(base+"?f=json"); svc[base]={"st":st,"layers":[(x.get("id"),x.get("name")) for x in (d.get("layers") or [])] if isinstance(d,dict) else None,"err":(d.get("error") if isinstance(d,dict) else None)}
rep["services"]=svc
tr=Transformer.from_crs("EPSG:4326","EPSG:2100",always_xy=True)
PTS={"athina_kolonaki":(23.7405,37.9775),"thess":(22.9407,40.6327),"lefkada_poli":(20.7069,38.8320),"agrinio":(21.4078,38.6214),
     "nydri":(20.7086,38.7078),"karya_lef":(20.6544,38.7710),"ektos_lef":(20.6700,38.7400),"patra":(21.7346,38.2466)}
q={}
for name,(lon,lat) in PTS.items():
    x,y=tr.transform(lon,lat); q[name]={"egsa":[round(x,1),round(y,1)]}
    for base,info in svc.items():
        for lid,lname in (info.get("layers") or [])[:40]:
            params={"geometry":f"{x},{y}","geometryType":"esriGeometryPoint","inSR":"2100","spatialRel":"esriSpatialRelIntersects","outFields":"*","returnGeometry":"false","f":"json"}
            st,d=getj(f"{base}/{lid}/query?"+urllib.parse.urlencode(params),30)
            if isinstance(d,dict) and d.get("features"):
                q[name][f"{base.split('/rest/services/')[-1]}/{lid} {lname}"]=[f.get("attributes") for f in d["features"][:3]]
            elif isinstance(d,dict) and d.get("error") and name=="athina_kolonaki":
                q[name][f"ERR {base.split('/rest/services/')[-1]}/{lid}"]=d["error"]
json.dump(rep,open(OUT+"/report5.json","w"),ensure_ascii=False,indent=1)
json.dump(q,open(OUT+"/query5.json","w"),ensure_ascii=False,indent=1)
print("layers",len(layers),"services",len(svc))
