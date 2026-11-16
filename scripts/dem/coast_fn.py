# Δοκιμή dem-z στην ακτογραμμή: σημεία στη μέση ανάμεσα σε εικονοστοιχείο θάλασσας και ξηράς (πραγματικό Z ≈ 0–2 m)
import json, time, urllib.request, numpy as np, rasterio
FN = 'https://oucqqudfdimccgowvpqp.supabase.co/functions/v1/dem-z'
u = 'https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N38_00_E020_00_DEM/Copernicus_DSM_COG_10_N38_00_E020_00_DEM.tif'
with rasterio.open(u) as ds: A = ds.read(1); T = ds.transform
rng = np.random.default_rng(3); pts = []
rr, cc = np.where((A[1:-1, 1:-1] == 0) & (A[1:-1, 2:] != 0)); rr += 1; cc += 1
for k in rng.choice(len(rr), 300, replace=False):
    r, c = rr[k], cc[k]
    for f in (0.25, 0.5, 0.75):                  # από θάλασσα (0) προς ξηρά (1) μέσα στο ένα εικονοστοιχείο
        lo, la = T * (c + 0.5 + f, r + 0.5); pts.append((lo, la, f, A[r, c + 1]))
def call(chunk):
    q = ';'.join(f'{lo:.7f},{la:.7f}' for lo, la, *_ in chunk)
    for _ in range(4):
        try:
            with urllib.request.urlopen(FN + '?p=' + q, timeout=90) as r: return json.load(r)
        except Exception as e: err = e; time.sleep(3)
    print('ERR', err); return None
out = []
for i in range(0, len(pts), 12):
    j = call(pts[i:i+12])
    if j: out += list(zip(pts[i:i+12], j['z'], j.get('f', [])))
for f in (0.25, 0.5, 0.75):
    z = np.array([q[1] for q in out if q[0][2] == f and q[1] is not None]); fl = [q[2] for q in out if q[0][2] == f]
    print(f'θέση {f}: n={len(z)} διάμεσο Z={np.median(z):.2f} p90={np.percentile(z,90):.2f} · θάλασσα {fl.count("s")} ακτή {fl.count("c")} ξηρά {fl.count("")}')
land = np.array([q[0][3] for q in out]); print('τιμή 1ου εικονοστοιχείου ξηράς: διάμεσο', np.median(land))
j = call([(20.30, 38.70, 0, 0), (20.66, 38.70, 0, 0)]); print('ανοιχτή θάλασσα / βουνό Λευκάδας:', j)
# ακριβώς στα κέντρα εικονοστοιχείων ξηράς: πρέπει να δίνει την ίδια τιμή με το GDAL
k = rng.choice(len(rr), 60, replace=False); cen = []
for q in k:
    r, c = rr[q], cc[q] + 3
    if A[r, c] != 0: lo, la = T * (c + 0.5, r + 0.5); cen.append((lo, la, A[r, c]))
got = []
for i in range(0, len(cen), 12):
    jj = call(cen[i:i+12]); got += [(z, v[2]) for z, v in zip(jj['z'], cen[i:i+12])] if jj else []
d = np.array([a - b for a, b in got if a is not None]); print('κέντρα εικονοστοιχείων: function − GDAL διάμεσο|d|', np.median(abs(d)), 'max', abs(d).max())
