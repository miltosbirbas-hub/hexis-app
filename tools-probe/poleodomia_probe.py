# Probe v3: Ενιαίος Ψηφιακός Χάρτης ΤΕΕ (δημόσια εφαρμογή) — ποιες δημόσιες υπηρεσίες χαρτών χρησιμοποιεί.
import json, os, re, sys, urllib.request, urllib.parse, ssl
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
def get(url, t=60):
    try:
        req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0 HEXIS-probe"})
        with urllib.request.urlopen(req, timeout=t, context=ctx) as r:
            return r.status, r.geturl(), r.read().decode("utf-8","replace")
    except Exception as e:
        return 0, url, "ERR "+repr(e)
rep = {}; urls=set()
RX = r'["\'](https?://[^"\'\s]+|/[A-Za-z0-9_\-/]*(?:geoserver|wms|wfs|ows|api|rest|query|service)[A-Za-z0-9_\-/.?=&]*)["\']'
for start in ["https://sdigmap.tee.gov.gr/sdmquery/public/","https://sdigmap.tee.gov.gr/sdmquery/public"]:
    st, fin, html = get(start); rep[start]=[st,fin,html[:3000]]
    if st!=200: continue
    js = set(re.findall(r'<script[^>]+src=["\']([^"\']+)', html))
    for s in js:
        u = urllib.parse.urljoin(fin, s); st2, f2, tx = get(u)
        rep.setdefault("js",[]).append([u,st2,len(tx)])
        for m in re.findall(RX, tx, re.I):
            if re.search(r'geoserver|wms|wfs|ows|/api|rest|query|mapserver|featureserver', m, re.I): urls.add(m)
    break
rep["urls"] = sorted(urls)[:400]
for path in ["/geoserver/ows?service=WMS&request=GetCapabilities","/geoserver/wms?service=WMS&request=GetCapabilities","/geoserver/wfs?service=WFS&request=GetCapabilities"]:
    st, fin, tx = get("https://sdigmap.tee.gov.gr"+path); rep[path]=[st,fin,len(tx),tx[:1500]]
    if st==200: open(OUT+"/caps_"+re.sub(r'\W','_',path)[:40]+".xml","w").write(tx[:2000000])
json.dump(rep, open(OUT+"/report3.json","w"), ensure_ascii=False, indent=1)
print(len(urls))
