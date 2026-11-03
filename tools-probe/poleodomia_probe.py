# Probe v4: διαμόρφωση της δημόσιας εφαρμογής ΕΨΧ (portal, items, feature services)
import json, os, re, sys, urllib.request, urllib.parse, ssl
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
def get(url, t=60):
    try:
        req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0 HEXIS-probe","Referer":"https://sdigmap.tee.gov.gr/sdmquery/public/"})
        with urllib.request.urlopen(req, timeout=t, context=ctx) as r:
            return r.status, r.read().decode("utf-8","replace")
    except Exception as e:
        return 0, "ERR "+repr(e)
B="https://sdigmap.tee.gov.gr/sdmquery/public/"
rep={}
for f in ["env.js","init.js","config.json","index.html"]:
    st,tx=get(B+f); rep[f]=[st,tx[:16000]]
# εντοπισμός portal και app id
alltx=" ".join(v[1] for v in rep.values())
portals=set(re.findall(r'https?://[A-Za-z0-9.\-]+/(?:portal|arcgis|server)[A-Za-z0-9_/\-]*', alltx))
rep["portals"]=sorted(portals)
cfg=None
try: cfg=json.loads(rep["config.json"][1])
except: pass
svc=set()
def scan(o):
    if isinstance(o,dict):
        for k,v in o.items(): scan(v)
    elif isinstance(o,list):
        for v in o: scan(v)
    elif isinstance(o,str) and re.search(r'(MapServer|FeatureServer|ImageServer|SceneServer|/rest/services|itemId)',o): svc.add(o[:300])
if cfg: scan(cfg)
rep["cfg_services"]=sorted(svc)[:300]
# δοκίμασε κάθε portal για rest/services
for p in list(portals)[:6]:
    root=p.split("/rest")[0]
    for u in [root+"/rest/services?f=json", root+"/sharing/rest/portals/self?f=json"]:
        st,tx=get(u); rep["probe "+u]=[st,tx[:3000]]
json.dump(rep, open(OUT+"/report4.json","w"), ensure_ascii=False, indent=1)
print("ok")
