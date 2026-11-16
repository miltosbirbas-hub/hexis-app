# Διάγνωση στις ακτές: τι τιμές έχει το GLO-30 στη θάλασσα και στα πρώτα εικονοστοιχεία ξηράς,
# και πόσο μεγάλη είναι η «διόρθωση» H−DEM στα τριγωνομετρικά (κορυφές) — Ιόνιο / Λευκάδα.
import csv, math, numpy as np, rasterio
from pyproj import Transformer
u = 'https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N38_00_E020_00_DEM/Copernicus_DSM_COG_10_N38_00_E020_00_DEM.tif'
with rasterio.open(u) as ds:
    A = ds.read(1).astype(float); T = ds.transform
print('μηδενικά (θάλασσα=0;)', round((A == 0).mean(), 3), ' ελάχιστο', A.min(), ' τιμές -1..1 εκτός 0:', int(((A > -1) & (A < 1) & (A != 0)).sum()))
sea = A == 0
land = ~sea
nb = np.zeros_like(sea)
nb[1:, :] |= sea[:-1, :]; nb[:-1, :] |= sea[1:, :]; nb[:, 1:] |= sea[:, :-1]; nb[:, :-1] |= sea[:, 1:]
first = land & nb
v = A[first]; print('1ο εικονοστοιχείο ξηράς δίπλα σε θάλασσα: n', v.size, 'διάμεσο', np.median(v), 'p10', np.percentile(v, 10), 'p90', np.percentile(v, 90))
# 2ο δακτύλιος
nb2 = np.zeros_like(first); nb2[1:, :] |= first[:-1, :]; nb2[:-1, :] |= first[1:, :]; nb2[:, 1:] |= first[:, :-1]; nb2[:, :-1] |= first[:, 1:]
sec = land & nb2 & ~first; v2 = A[sec]; print('2ο εικονοστοιχείο ξηράς: διάμεσο', np.median(v2), 'p10', np.percentile(v2, 10), 'p90', np.percentile(v2, 90))
R = list(csv.DictReader(open('ktimatologio/trig.csv')))
tr = Transformer.from_crs(2100, 4326, always_xy=True); d = []; hh = []
for r in R:
    lo, la = tr.transform(float(r['X']), float(r['Y']))
    if not (20 <= lo < 21 and 38 <= la < 39): continue
    c, rr = ~T * (lo, la); c -= .5; rr -= .5; c0, r0 = int(c), int(rr)
    if c0 < 0 or r0 < 0 or c0 > 3598 or r0 > 3598: continue
    fc, fr = c - c0, rr - r0; w = A[r0:r0+2, c0:c0+2]
    z = w[0,0]*(1-fc)*(1-fr) + w[0,1]*fc*(1-fr) + w[1,0]*(1-fc)*fr + w[1,1]*fc*fr
    d.append(float(r['H']) - z); hh.append(float(r['H']))
d = np.array(d); hh = np.array(hh)
print('διόρθωση H−DEM στα τριγωνομετρικά του φύλλου: n', d.size, 'διάμεσο', round(np.median(d), 2), 'p10', round(np.percentile(d, 10), 2), 'p90', round(np.percentile(d, 90), 2))
for lo, hi in ((0, 50), (50, 200), (200, 600), (600, 3000)):
    m = (hh >= lo) & (hh < hi)
    if m.any(): print(f'  H {lo}-{hi}: n {m.sum()} διάμεσο {np.median(d[m]):.2f}')
