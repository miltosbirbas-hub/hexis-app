# Έλεγχος ακρίβειας μοντέλων εδάφους (DEM) έναντι των υψομέτρων των τριγωνομετρικών ΓΥΣ.
# A) AWS Terrain Tiles (terrarium, Joerd/EU-DEM) z13   B) Copernicus GLO-30 (COG στο AWS)
# Για κάθε DEM: σφάλμα σκέτου DEM και σφάλμα DEM + διόρθωση από τα 3 τριγωνομετρικά του TIN (χωρίς το ίδιο το σημείο).
import csv, io, math, sys, urllib.request, concurrent.futures as cf
import numpy as np
from PIL import Image
from pyproj import Transformer
from scipy.spatial import Delaunay
import rasterio
from rasterio.windows import Window

R = [r for r in csv.DictReader(open('ktimatologio/trig.csv'))]
P = np.array([[float(r['X']), float(r['Y'])] for r in R]); H = np.array([float(r['H']) for r in R])
tr = Transformer.from_crs(2100, 4326, always_xy=True)
LON, LAT = tr.transform(P[:, 0], P[:, 1])

rng = np.random.default_rng(7); idx = rng.choice(len(P), 1200, replace=False)
mask = np.ones(len(P), bool); mask[idx] = False
base = np.where(mask)[0]; tri = Delaunay(P[base])
s = tri.find_simplex(P[idx]); ok = s >= 0; idx = idx[ok]; s = s[ok]
T = tri.transform[s]; b = np.einsum('ijk,ik->ij', T[:, :2], P[idx] - T[:, 2]); bc = np.c_[b, 1 - b.sum(1)]
V = base[tri.simplices[s]]                       # 3 κορυφές (δείκτες στο R)
emax = np.max([np.hypot(*(P[V[:, i]] - P[V[:, (i+1) % 3]]).T) for i in range(3)], axis=0)
keep = emax < 15000; idx, bc, V = idx[keep], bc[keep], V[keep]
need = sorted(set(idx.tolist()) | set(V.ravel().tolist()))
print('σημεία ελέγχου', len(idx), '· σημεία με DEM', len(need), flush=True)

def hdr(url):
    req = urllib.request.Request(url, method='GET', headers={'Origin': 'https://hexis-app.gr', 'Range': 'bytes=0-15'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print('CORS', url.split('/')[2], r.status, 'ACAO=', r.headers.get('Access-Control-Allow-Origin'), 'ACAH=', r.headers.get('Access-Control-Expose-Headers'))
    except Exception as e: print('CORS', url, 'ERR', e)

# ---------- A) terrarium ----------
Z = 13
def tilexy(lon, lat, z):
    n = 2 ** z; x = (lon + 180) / 360 * n; la = math.radians(lat)
    y = (1 - math.log(math.tan(la) + 1 / math.cos(la)) / math.pi) / 2 * n
    return x, y
tiles = {}
def get_tile(k):
    z, x, y = k
    url = f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
    for _ in range(3):
        try:
            with urllib.request.urlopen(url, timeout=60) as r: im = np.asarray(Image.open(io.BytesIO(r.read())).convert('RGB')).astype(np.float64)
            return k, im[:, :, 0] * 256 + im[:, :, 1] + im[:, :, 2] / 256 - 32768
        except Exception as e: err = e
    return k, None
hdr('https://s3.amazonaws.com/elevation-tiles-prod/terrarium/13/4562/3165.png')
keys = set()
for i in need:
    x, y = tilexy(LON[i], LAT[i], Z); keys.add((Z, int(x), int(y)))
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1): pass
with cf.ThreadPoolExecutor(32) as ex:
    for k, a in ex.map(get_tile, keys): tiles[k] = a
def dem_a(i):
    x, y = tilexy(LON[i], LAT[i], Z); px, py = (x - int(x)) * 256 - .5, (y - int(y)) * 256 - .5
    a = tiles.get((Z, int(x), int(y)))
    if a is None: return np.nan
    x0, y0 = int(math.floor(px)), int(math.floor(py)); fx, fy = px - x0, py - y0
    x0 = min(max(x0, 0), 254); y0 = min(max(y0, 0), 254)
    return a[y0, x0] * (1-fx) * (1-fy) + a[y0, x0+1] * fx * (1-fy) + a[y0+1, x0] * (1-fx) * fy + a[y0+1, x0+1] * fx * fy
DA = np.full(len(P), np.nan)
for i in need: DA[i] = dem_a(i)
print('terrarium tiles', len(keys), flush=True)

# ---------- B) Copernicus GLO-30 ----------
def cop_name(lat, lon):
    la, lo = math.floor(lat), math.floor(lon)
    n = f"Copernicus_DSM_COG_10_{'N' if la>=0 else 'S'}{abs(la):02d}_00_{'E' if lo>=0 else 'W'}{abs(lo):03d}_00_DEM"
    return f'https://copernicus-dem-30m.s3.amazonaws.com/{n}/{n}.tif'
hdr(cop_name(38.7, 20.7))
DB = np.full(len(P), np.nan)
groups = {}
for i in need: groups.setdefault(cop_name(LAT[i], LON[i]), []).append(i)
def do_group(item):
    url, ii = item; out = []
    try:
        with rasterio.open(url) as ds:
            for i in ii:
                r, c = ds.index(LON[i], LAT[i], op=float); r -= .5; c -= .5
                r0, c0 = int(math.floor(r)), int(math.floor(c))
                w = ds.read(1, window=Window(c0, r0, 2, 2), boundless=True, fill_value=np.nan).astype(float)
                fr, fc = r - r0, c - c0
                v = w[0,0]*(1-fr)*(1-fc) + w[0,1]*(1-fr)*fc + w[1,0]*fr*(1-fc) + w[1,1]*fr*fc
                out.append((i, v))
    except Exception as e: print('cop ERR', url[-60:], e)
    return out
with cf.ThreadPoolExecutor(16) as ex:
    for out in ex.map(do_group, groups.items()):
        for i, v in out: DB[i] = v
print('copernicus tiles', len(groups), flush=True)

def stats(name, e):
    e = e[np.isfinite(e)]; a = np.abs(e)
    print(f'{name:38s} n={len(e):5d}  διάμεσο|e|={np.median(a):6.2f}  p90={np.percentile(a,90):7.2f}  μέση(e)={e.mean():+6.2f}  RMSE={math.sqrt((e**2).mean()):7.2f}')
tin = (H[V] * bc).sum(1)
stats('μόνο τριγωνομετρικά (TIN)', tin - H[idx])
for nm, D in (('AWS terrarium z13 (EU-DEM)', DA), ('Copernicus GLO-30', DB)):
    raw = D[idx] - H[idx]; stats(nm + ' σκέτο', raw)
    d = H[V] - D[V]
    stats(nm + ' + διόρθωση TIN', D[idx] + (d * bc).sum(1) - H[idx])
    stats(nm + ' + διάμεση διόρθωση 3', D[idx] + np.median(d, 1) - H[idx])
    # διόρθωση μόνο της σταθερής απόκλισης (bias) περιοχής
    for lo, hi in ((0, 200), (200, 600), (600, 1200), (1200, 3000)):
        m = (H[idx] >= lo) & (H[idx] < hi); stats(f'   σκέτο, H {lo}-{hi} m', raw[m])
