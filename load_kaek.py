#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HEXIS — Φόρτωση γεωτεμαχίων ΚΑΕΚ από shapefile (data.gov.gr / Ελληνικό Κτηματολόγιο)
σε πίνακα Supabase (public.kaek_parcels).

Χρήση:
  pip install pyshp pyproj shapely psycopg2-binary
  python load_kaek.py PARCELS.shp --region "ΑΤΤΙΚΗ" \
      --dsn "postgresql://postgres:ΚΩΔΙΚΟΣ@db.oucqqudfdimccgowvpqp.supabase.co:5432/postgres"

Επιλογές:
  --simplify 0.5     ανοχή απλοποίησης σε μέτρα (ΕΓΣΑ'87). 0 = χωρίς απλοποίηση
  --centroid-only    αποθήκευση μόνο κεντροειδούς (χωρίς πολύγωνο) — ελάχιστος όγκος DB
  --batch 500        μέγεθος batch upsert
"""
import argparse, json, sys, time
import shapefile
from pyproj import Transformer
from shapely.geometry import shape, mapping
from shapely.ops import transform as shp_transform
import psycopg2
from psycopg2.extras import execute_values

T = Transformer.from_crs("EPSG:2100", "EPSG:4326", always_xy=True)

def rnd(x, n=7): return round(x, n)

def to_wgs(geom2100):
    return shp_transform(lambda x, y, z=None: T.transform(x, y), geom2100)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("shp")
    ap.add_argument("--region", required=True)
    ap.add_argument("--dsn", required=True)
    ap.add_argument("--simplify", type=float, default=0.5)
    ap.add_argument("--centroid-only", action="store_true")
    ap.add_argument("--batch", type=int, default=500)
    a = ap.parse_args()

    # Άνοιγμα shapefile με ελληνικά encodings
    sf = None
    for enc in ("utf-8", "cp1253", "iso-8859-7", "latin1"):
        try:
            sf = shapefile.Reader(a.shp, encoding=enc)
            _ = [f[0] for f in sf.fields[1:]]
            break
        except Exception:
            sf = None
    if sf is None:
        sys.exit("Αδύνατο το άνοιγμα του shapefile.")

    fields = [f[0] for f in sf.fields[1:]]
    kidx = next((i for i, f in enumerate(fields) if "KAEK" in f.upper()), None)
    if kidx is None:
        sys.exit(f"Δεν βρέθηκε πεδίο ΚΑΕΚ. Πεδία: {fields}")
    print(f"Πεδίο ΚΑΕΚ: {fields[kidx]} | Εγγραφές: {len(sf)} | Περιοχή: {a.region}")

    con = psycopg2.connect(a.dsn)
    con.autocommit = False
    cur = con.cursor()
    sql = """insert into public.kaek_parcels (kaek, region, lat, lon, area_m2, geojson)
             values %s
             on conflict (kaek) do update set region=excluded.region, lat=excluded.lat,
               lon=excluded.lon, area_m2=excluded.area_m2, geojson=excluded.geojson"""

    rows, n, skipped, t0 = [], 0, 0, time.time()
    for sr in sf.iterShapeRecords():
        kaek = str(sr.record[kidx]).strip().replace(" ", "")
        base = kaek.split("/")[0]
        if len(base) < 12 or not base[:12].isdigit():
            skipped += 1
            continue
        base = base[:12]
        try:
            g = shape(sr.shape.__geo_interface__)
            if g.is_empty:
                skipped += 1; continue
            if not g.is_valid:
                g = g.buffer(0)
            area = g.area
            c = g.centroid
            lon, lat = T.transform(c.x, c.y)
            gj = None
            if not a.centroid_only:
                gs = g.simplify(a.simplify, preserve_topology=True) if a.simplify > 0 else g
                gw = to_wgs(gs)
                m = mapping(gw)
                # συμπίεση: στρογγυλοποίηση συντεταγμένων στα 7 δεκαδικά (~1 cm)
                def rr(coords):
                    if isinstance(coords[0], (int, float)):
                        return [rnd(coords[0]), rnd(coords[1])]
                    return [rr(c2) for c2 in coords]
                m["coordinates"] = rr(list(m["coordinates"]))
                gj = json.dumps(m, separators=(",", ":"))
            rows.append((base, a.region, rnd(lat), rnd(lon), round(area, 1), gj))
        except Exception:
            skipped += 1
            continue
        if len(rows) >= a.batch:
            execute_values(cur, sql, rows, page_size=a.batch)
            con.commit()
            n += len(rows); rows = []
            if n % 50000 < a.batch:
                print(f"  {n} εγγραφές… ({n/(time.time()-t0):.0f}/s)")
    if rows:
        execute_values(cur, sql, rows, page_size=a.batch)
        con.commit(); n += len(rows)
    cur.close(); con.close()
    print(f"ΟΚ: {n} γεωτεμάχια ({skipped} παραλείφθηκαν) σε {time.time()-t0:.0f}s")

if __name__ == "__main__":
    main()
