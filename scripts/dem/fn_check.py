# Έλεγχος της Edge Function dem-z: ίδιες τιμές με rasterio (GDAL) στα ίδια σημεία, και ακρίβεια
# της τελικής μεθόδου (DEM + διάμεση διόρθωση από τα 3 τριγωνομετρικά του TIN) μέσω της function.
import csv, json, math, time, urllib.request
import numpy as np, rasterio
from pyproj import Transformer
from scipy.spatial import Delaunay
FN = 'https://oucqqudfdimccgowvpqp.supabase.co/functions/v1/dem-z'
R = list(csv.DictReader(open('ktimatologio/trig.csv')))
P = np.array([[float(r['X']), float(r['Y'])] for r in R]); H = np.array([float(r['H']) for r in R])
LON, LAT = Transformer.from_crs(2100, 4326, always_xy=True).transform(P[:, 0], P[:, 1])
def fn(ii):
    q = ';'.join(f'{LON[i]:.7f},{LAT[i]:.7f}' for i in ii)
    req = urllib.request.Request(FN + '?p=' + q, headers={'Origin': 'https://hexis-app.gr'})
    for k in range(4):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                if k == 0 and ii[0] == ii0[0]: print('ACAO', r.headers.get('Access-Control-Allow-Origin'))
                return json.load(r)['z']
        except Exception as e: err = e; time.sleep(3)
    print('fn ERR', err); return [None] * len(ii)
url = 'https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N38_00_E020_00_DEM/Copernicus_DSM_COG_10_N38_00_E020_00_DEM.tif'
with rasterio.open(url) as ds: print('tags', ds.tags(), ds.transform, ds.width, ds.dtypes, ds.block_shapes, ds.profile.get('compress'))
rng = np.random.default_rng(11); idx = rng.choice(len(P), 900, replace=False)
mask = np.ones(len(P), bool); mask[idx] = False; base = np.where(mask)[0]; tri = Delaunay(P[base])
s = tri.find_simplex(P[idx]); ok = s >= 0; idx, s = idx[ok], s[ok]; V = base[tri.simplices[s]]
emax = np.max([np.hypot(*(P[V[:, i]] - P[V[:, (i+1) % 3]]).T) for i in range(3)], axis=0); k = emax < 15000; idx, V = idx[k], V[k]
D = {}
ii0 = [int(i) for i in idx[:4]]
t0 = time.time()
for j in range(len(idx)):
    ii = [int(idx[j])] + [int(v) for v in V[j]]
    z = fn(ii)
    for i, v in zip(ii, z): D[i] = v
print('κλήσεις', len(idx), 'μέσος χρόνος κλήσης', round((time.time() - t0) / len(idx), 2), 's')
# σύγκριση με rasterio (GDAL) για 150 σημεία
def gd(i):
    la, lo = math.floor(LAT[i]), math.floor(LON[i])
    n = f'Copernicus_DSM_COG_10_N{la:02d}_00_E{lo:03d}_00_DEM'
    with rasterio.open(f'https://copernicus-dem-30m.s3.amazonaws.com/{n}/{n}.tif') as ds:
        return list(ds.sample([(LON[i], LAT[i])]))[0][0]
cmp = [(D[int(i)], gd(int(i))) for i in idx[:150] if D.get(int(i)) is not None]
d = np.array([a - b for a, b in cmp]); print('function − GDAL(πλησιέστερο εικονοστοιχείο): διάμεσο', np.median(d), 'διάμεσο|d|', np.median(abs(d)), 'max|d|', abs(d).max())
e1, e2 = [], []
for j, i in enumerate(idx):
    i = int(i); vs = [int(v) for v in V[j]]
    if D.get(i) is None or any(D.get(v) is None for v in vs): continue
    corr = np.median([H[v] - D[v] for v in vs])
    e1.append(D[i] - H[i]); e2.append(D[i] + corr - H[i])
for nm, e in (('function σκέτο', e1), ('function + διάμεση διόρθωση 3', e2)):
    e = np.array(e); a = abs(e); print(f'{nm:32s} n={len(e)} διάμεσο|e|={np.median(a):.2f} p90={np.percentile(a,90):.2f} μέση={e.mean():+.2f}')
