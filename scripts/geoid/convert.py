#!/usr/bin/env python3
"""Μετατροπή πλέγματος γεωειδούς GeoTIFF (PROJ-data) σε HXGD για το HEXIS PAD.

python3 convert.py in.tif out.bin
Μορφή HXGD: 'HXGD' | u32 1 | f64 lon0 | f64 lat0 | f64 dlon | f64 dlat | u32 nx | u32 ny | f32[nx*ny]
lon0/lat0 = κέντρο του πάνω-αριστερά κελιού, γραμμές βορράς→νότος, NaN = χωρίς τιμή.
"""
import re
import struct
import sys

import numpy as np
import tifffile


def geokeys(page):
    t = page.tags.get(34735)
    if not t:
        return {}
    v = list(t.value)
    out = {}
    for i in range(4, 4 + 4 * v[3], 4):
        key, loc, cnt, val = v[i:i + 4]
        if loc == 0:
            out[key] = val
    return out


def convert(src, dst):
    with tifffile.TiffFile(src) as tf:
        page = tf.pages[0]
        a = page.asarray()
        spp = page.samplesperpixel
        if a.ndim == 3:
            a = a[0] if (a.shape[0] == spp and page.planarconfig == 2) else a[..., 0]
        a = a.astype(np.float64)
        sx, sy = page.tags[33550].value[:2]
        tp = page.tags[33922].value
        i0, j0, X, Y = tp[0], tp[1], tp[3], tp[4]
        gk = geokeys(page)
        point = gk.get(1025, 1) == 2  # GTRasterTypeGeoKey: 1 = PixelIsArea, 2 = PixelIsPoint
        scale, offset, nodata = 1.0, 0.0, None
        md = page.tags.get(42112)
        if md:
            x = md.value
            m = re.search(r'<Item[^>]*role="scale"[^>]*>([^<]+)<', x)
            if m:
                scale = float(m.group(1))
            m = re.search(r'<Item[^>]*role="offset"[^>]*>([^<]+)<', x)
            if m:
                offset = float(m.group(1))
        nd = page.tags.get(42113)
        if nd:
            try:
                nodata = float(str(nd.value).strip('\x00 '))
            except ValueError:
                nodata = None
    ny, nx = a.shape
    bad = ~np.isfinite(a)
    if nodata is not None:
        bad |= a == nodata
    a = a * scale + offset
    a[bad] = np.nan
    lon0 = X - i0 * sx + (0 if point else sx / 2)
    lat0 = Y + j0 * sy - (0 if point else sy / 2)
    if lon0 > 180:
        lon0 -= 360
    with open(dst, 'wb') as f:
        f.write(b'HXGD' + struct.pack('<I4dII', 1, lon0, lat0, sx, sy, nx, ny))
        f.write(a.astype('<f4').tobytes())
    ok = np.isfinite(a)
    print(f'{src} → {dst}: {nx}×{ny}, lon0 {lon0:.5f} lat0 {lat0:.5f}, βήμα {sx * 60:.3f}′×{sy * 60:.3f}′, '
          f'N {np.nanmin(a):.3f}…{np.nanmax(a):.3f} m, τιμές {ok.mean() * 100:.0f}%, {"PixelIsPoint" if point else "PixelIsArea"}')


if __name__ == '__main__':
    convert(sys.argv[1], sys.argv[2])
