# Εικονίδιο «Όροι Δόμησης»: απόσπασμα πολεοδομικού χάρτη (ΕΨΧ) γύρω από την Πλάκα
import os, sys, urllib.request, urllib.parse, ssl
from pyproj import Transformer
OUT=sys.argv[1]; os.makedirs(OUT,exist_ok=True)
ctx=ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
tr=Transformer.from_crs("EPSG:4326","EPSG:2100",always_xy=True)
B="https://sdigmap.tee.gov.gr/mapping/rest/services/UDM/UDM_SERVICE_POLEODOMIKI_PLIROFORIA/MapServer/export?"
spots={"plaka":(23.7298,37.9727),"syntagma":(23.7350,37.9755),"kolonaki":(23.7405,37.9775),"psyrri":(23.7240,37.9785),"thiseio":(23.7205,37.9755)}
for name,(lon,lat) in spots.items():
    x,y=tr.transform(lon,lat)
    for half in (150,250,400):
        for lay in ("show:6,11,12","show:6,11,12,22"):
            q={"bbox":f"{x-half},{y-half},{x+half},{y+half}","bboxSR":"2100","imageSR":"2100","size":"512,512","format":"png32","transparent":"false","layers":lay,"dpi":"96","f":"image"}
            try:
                req=urllib.request.Request(B+urllib.parse.urlencode(q),headers={"User-Agent":"Mozilla/5.0 HEXIS"})
                b=urllib.request.urlopen(req,timeout=60,context=ctx).read()
                open(f"{OUT}/{name}_{half}_{len(lay)}.png","wb").write(b); print(name,half,lay,len(b))
            except Exception as e: print(name,half,e)
