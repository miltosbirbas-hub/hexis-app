# Έλεγχος dem-z ?g= (κάναβος για ισοϋψείς) έναντι GDAL, σε περιοχή που περνά όριο πλακιδίων, και ?n= (EGM2008)
import base64, json, time, urllib.request, numpy as np, rasterio
from pyproj import Transformer
FN = 'https://oucqqudfdimccgowvpqp.supabase.co/functions/v1/dem-z'
def get(q):
    t = time.time()
    with urllib.request.urlopen(FN + '?' + q, timeout=120) as r: j = json.load(r)
    return j, time.time() - t
def gd(lon, lat):
    la, lo = int(np.floor(lat)), int(np.floor(lon))
    n = f'Copernicus_DSM_COG_10_N{la:02d}_00_E{lo:03d}_00_DEM'
    try:
        with rasterio.open(f'https://copernicus-dem-30m.s3.amazonaws.com/{n}/{n}.tif') as ds: return float(list(ds.sample([(lon, lat)]))[0][0])
    except Exception: return 0.0
for q in ('g=20.98,38.98,21.02,39.02', 'g=20.55,38.60,20.80,38.85'):
    j, dt = get(q); w, h = j['w'], j['h']
    a = np.frombuffer(base64.b64decode(j['b64']), dtype='<i2').reshape(h, w)
    holes = int((a == -32768).sum())
    rng = np.random.default_rng(1); diffs = []
    for _ in range(80):
        r, c = rng.integers(h), rng.integers(w)
        lon, lat = j['lon0'] + c * j['d'], j['lat0'] - r * j['d']
        diffs.append(a[r, c] / 10 - gd(lon, lat))
    d = np.abs(diffs)
    print(q, f'w={w} h={h} βήμα={j["d"]*3600:.0f}″ χρόνος={dt:.1f}s τρύπες={holes} · διαφορά με GDAL: διάμεσο {np.median(d):.2f} max {d.max():.2f} · Z {a[a>-32768].min()/10:.0f}…{a.max()/10:.0f} m')
j, dt = get('n=20.66,38.70'); print('EGM2008 N στη Λευκάδα', j, f'{dt:.1f}s')
t = Transformer.from_crs('EPSG:4979', 'EPSG:4326+3855', always_xy=True)
try: print('pyproj EGM2008 έλεγχος: h=100 → H', t.transform(20.66, 38.70, 100))
except Exception as e: print('pyproj', e)
