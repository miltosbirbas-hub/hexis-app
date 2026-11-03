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
st,cfg=getj("https://sdigmap.tee.gov.gr/sdmquery/public/config.json")
cfgtxt=json.dumps(cfg,ensure_ascii=False)
open(OUT+"/config.json","w").write(cfgtxt)
ids=[]
mp=(cfg.get("map") or {}) if isinstance(cfg,dict) else {}
if mp.get("itemId"): ids.append(mp["itemId"])
ids+= [i for i in re.findall(r'"itemId"\s*:\s*"([0-9a-f]{32})"',cfgtxt) if i not in ids]
rep["ids"]=ids; rep["mapcfg"]=json.dumps(mp,ensure_ascii=False)[:3000]
wm={}
for iid in ids[:6]:
    st,it=getj(P+iid+"?f=json")
    rep.setdefault("items",[]).append({"id":iid,"st":st,"title":it.get("title") if isinstance(it,dict) else None,"type":it.get("type") if isinstance(it,dict) else None,"access":it.get("access") if isinstance(it,dict) else None})
    if isinstance(it,dict) and it.get("type")=="Web Map" and not wm:
        st,wm=getj(P+iid+"/data?f=json")
# επίσης url υπηρεσιών που αναφέρονται κατευθείαν στο config
rep["cfg_urls"]=sorted(set(re.findall(r'https?://[^"\s]+(?:MapServer|FeatureServer)[^"\s]*',cfgtxt)))[:80]
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
