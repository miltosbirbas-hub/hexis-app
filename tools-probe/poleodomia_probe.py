# Probe v2: e-Πολεοδομία (εφαρμογή v11 + WMS/WFS) και ΥΠΕΝ mapsportal (πλήρης λίστα επιπέδων).
import json, os, re, sys, urllib.request, urllib.parse, ssl
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
def get(url, t=60):
    try:
        req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0 HEXIS-probe"})
        with urllib.request.urlopen(req, timeout=t, context=ctx) as r:
            return r.status, r.read().decode("utf-8","replace")
    except Exception as e:
        return 0, "ERR "+repr(e)
rep = {}
# 1) εφαρμογή v11: βρες URL υπηρεσιών μέσα στα js/config
st, idx = get("http://gis.epoleodomia.gov.gr/v11/index.html"); rep["v11_index"] = [st, idx[:4000]]
srcs = set(re.findall(r'(?:src|href)=["\']([^"\']+\.(?:js|json|xml))', idx))
urls = set()
for s in list(srcs)[:40]:
    u = urllib.parse.urljoin("http://gis.epoleodomia.gov.gr/v11/index.html", s)
    st, tx = get(u)
    for m in re.findall(r'https?://[^\s"\'<>]+(?:MapServer|FeatureServer|WMSServer|WFSServer|wms|wfs|geoserver)[^\s"\'<>]*', tx, re.I): urls.add(m)
    if "config" in s.lower(): rep["cfg_"+s] = [st, tx[:20000]]
for cfg in ["config.json","config.xml","js/config.js","appconfig.json"]:
    st, tx = get("http://gis.epoleodomia.gov.gr/v11/"+cfg)
    if st==200: rep["try_"+cfg] = tx[:20000]
    for m in re.findall(r'https?://[^\s"\'<>]+(?:MapServer|FeatureServer|WMSServer|WFSServer|wms|wfs)[^\s"\'<>]*', tx, re.I): urls.add(m)
rep["service_urls"] = sorted(urls)
# 2) WMS/WFS GetCapabilities στα γνωστά endpoints
for name,u in {"wms_second":"http://gis.epoleodomia.gov.gr/arcgis/services/wms_secondlevel/wms_secondlevel/MapServer/WMSServer?request=GetCapabilities&service=WMS",
               "wfs_ot":"http://gis.epoleodomia.gov.gr/arcgis/services/Rimotomika_Sxedia_Poleod_Meletes/OikodomikaTetragona/MapServer/WFSServer?request=GetCapabilities&service=WFS",
               "rest_ot":"http://gis.epoleodomia.gov.gr/arcgis/rest/services/Rimotomika_Sxedia_Poleod_Meletes/OikodomikaTetragona/MapServer?f=pjson"}.items():
    st, tx = get(u); rep[name] = [st, len(tx)]
    open(f"{OUT}/{name}.txt","w").write(tx[:300000])
# 3) mapsportal: πλήρης λίστα
st, tx = get("https://mapsportal.ypen.gr/geoserver/wfs?service=WFS&version=2.0.0&request=GetCapabilities", 120)
names = re.findall(r'<Name>([^<]*)</Name>\s*<Title>([^<]*)</Title>', tx)
open(f"{OUT}/mapsportal_layers.txt","w").write("\n".join(n+" | "+t for n,t in names))
rep["mapsportal_count"] = len(names)
json.dump(rep, open(f"{OUT}/report.json","w"), ensure_ascii=False, indent=1)
print(json.dumps({k:(v if not isinstance(v,list) or len(str(v))<300 else str(v)[:300]) for k,v in rep.items()}, ensure_ascii=False)[:3000])
