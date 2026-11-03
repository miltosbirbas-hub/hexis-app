# Probe: υπόβαθρα ΕΨΧ για απόσπασμα (export σε ΕΓΣΑ87, GEOREF tif, γεωμετρίες γραμμών, CORS)
import json, os, sys, urllib.request, urllib.parse, ssl, io
OUT=sys.argv[1]; os.makedirs(OUT,exist_ok=True)
ctx=ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
def get(url, t=90, head=False, extra=None):
    h={"User-Agent":"Mozilla/5.0 HEXIS-probe","Origin":"https://hexis-app.gr"}; h.update(extra or {})
    req=urllib.request.Request(url, headers=h, method="HEAD" if head else "GET")
    try:
        with urllib.request.urlopen(req, timeout=t, context=ctx) as r:
            return r.status, dict(r.headers), (b"" if head else r.read())
    except Exception as e: return 0, {"err":repr(e)}, b""
B="https://sdigmap.tee.gov.gr/mapping/rest/services/UDM/"
rep={}
x,y=209179.9,4296394.6   # Πηγαδισάνοι
x2,y2=274177.6,4277664.2 # Αγρίνιο
for name,(cx,cy) in {"karya":(x,y),"agrinio":(x2,y2)}.items():
    bb=[cx-120,cy-90,cx+120,cy+90]
    for svc in ["UDM_SERVICE_POLEODOMIKI_PLIROFORIA","UDM_SERVICE_SXEDIA_DOCS"]:
        q={"bbox":",".join(map(str,bb)),"bboxSR":"2100","imageSR":"2100","size":"1600,1200","format":"png32","transparent":"false","dpi":"96","f":"json"}
        if svc.endswith("PLIROFORIA"): q["layers"]="show:3,4,6,10,11,12,13"
        st,h,b=get(B+svc+"/MapServer/export?"+urllib.parse.urlencode(q))
        rep[f"export_{name}_{svc}"]=[st,b[:600].decode("utf-8","replace")]
        q["f"]="image"; st,h,b=get(B+svc+"/MapServer/export?"+urllib.parse.urlencode(q))
        rep[f"exportimg_{name}_{svc}"]=[st,h.get("Content-Type"),len(b),h.get("Access-Control-Allow-Origin")]
        if b: open(f"{OUT}/exp_{name}_{svc}.png","wb").write(b)
    # γεωμετρίες γραμμών
    env=json.dumps({"xmin":bb[0],"ymin":bb[1],"xmax":bb[2],"ymax":bb[3],"spatialReference":{"wkid":2100}})
    for lid in [3,4,6,10,11,12,13,22]:
        qq={"geometry":env,"geometryType":"esriGeometryEnvelope","inSR":"2100","outSR":"2100","spatialRel":"esriSpatialRelIntersects","outFields":"*","returnGeometry":"true","f":"json"}
        st,h,b=get(B+"UDM_SERVICE_POLEODOMIKI_PLIROFORIA/MapServer/"+str(lid)+"/query?"+urllib.parse.urlencode(qq))
        try:
            d=json.loads(b); fs=d.get("features",[])
            rep[f"q_{name}_{lid}"]={"n":len(fs),"gtype":d.get("geometryType"),"fields":[f.get("name") for f in d.get("fields",[])][:30],
              "sample":fs[0]["attributes"] if fs else None,"cors":h.get("Access-Control-Allow-Origin"),"err":d.get("error")}
        except Exception as e: rep[f"q_{name}_{lid}"]=str(e)
    # GEOREF tif
    qq={"geometry":f"{cx},{cy}","geometryType":"esriGeometryPoint","inSR":"2100","spatialRel":"esriSpatialRelIntersects","outFields":"*","returnGeometry":"false","f":"json"}
    st,h,b=get(B+"UDM_SERVICE_SXEDIA_DOCS/MapServer/0/query?"+urllib.parse.urlencode(qq))
    docs=json.loads(b).get("features",[])
    rep[f"docs_{name}"]=[f["attributes"] for f in docs]
    for f in docs[:3]:
        u=f["attributes"].get("GEOREF_DIAGRAM_URL")
        if not u: continue
        st,h,_=get(u,head=True); rep["head "+u]=[st,h.get("Content-Length"),h.get("Content-Type"),h.get("Access-Control-Allow-Origin")]
        st,h,b=get(u,t=180)
        if b:
            try:
                import tifffile
                with tifffile.TiffFile(io.BytesIO(b)) as tf:
                    pg=tf.pages[0]; tags={t.name:(str(t.value)[:300]) for t in pg.tags.values()}
                    rep["tif "+u]={"bytes":len(b),"shape":pg.shape,"dtype":str(pg.dtype),"compression":str(pg.compression),"photometric":str(pg.photometric),"tags":tags,"pages":len(tf.pages)}
            except Exception as e: rep["tif "+u]={"bytes":len(b),"err":repr(e)}
            # tfw / aux sidecars
            for ext in [".tfw",".TFW",".tif.aux.xml",".prj"]:
                su=u[:-4]+ext if not ext.startswith(".tif.") else u+ext[4:]
                st2,h2,b2=get(su,t=30); rep["side "+su]=[st2,b2[:300].decode("utf-8","replace")]
json.dump(rep,open(OUT+"/rep.json","w"),ensure_ascii=False,indent=1,default=str)
print("ok")
