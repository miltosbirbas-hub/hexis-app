#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HEXIS — Μαζική φόρτωση ΟΛΩΝ των περιφερειών από έναν φάκελο.

Στήσιμο:
  1. Κατέβασε από το data.gov.gr τα zip όλων των περιφερειών (Γεωτεμάχια Λειτουργούντος Κτηματολογίου)
  2. Ξεζίπαρέ τα ΟΛΑ μέσα σε έναν φάκελο, π.χ. C:\kaek\  (ένας υποφάκελος Periferia_XXX_YYYYMMDD ανά περιφέρεια)
  3. Τρέξε:
     python load_all.py "C:\kaek" --dsn "postgresql://postgres:ΚΩΔΙΚΟΣ@db.oucqqudfdimccgowvpqp.supabase.co:5432/postgres"

Βρίσκει μόνο του τα .shp, αναγνωρίζει την περιφέρεια από το όνομα φακέλου, βάζει --simplify 1.5
στις μεγάλες (Αττική, Κ. Μακεδονία), και τα τρέχει ένα-ένα με το load_kaek.py (πρέπει να είναι
στον ίδιο φάκελο με αυτό το script). Όσα έχουν ήδη φορτωθεί απλώς ενημερώνονται (upsert).
"""
import argparse, os, re, subprocess, sys, time, unicodedata

REGIONS = [  # (μοτίβα στο όνομα φακέλου/αρχείου, ελληνικό όνομα, extra args)
    (("attik",),                                   "ΑΤΤΙΚΗ",                 ["--simplify","1.5"]),
    (("stereas","sterea"),                         "ΣΤΕΡΕΑ ΕΛΛΑΔΑ",          []),
    (("ipeir","epir"),                             "ΗΠΕΙΡΟΣ",                []),
    (("thessal",),                                 "ΘΕΣΣΑΛΙΑ",               []),
    (("pelopon",),                                 "ΠΕΛΟΠΟΝΝΗΣΟΣ",           []),
    (("kentrikis_makedonias","kentrikis-makedonias","kentriki_makedonia"), "ΚΕΝΤΡΙΚΗ ΜΑΚΕΔΟΝΙΑ", ["--simplify","1.5"]),
    (("dytikis_makedonias","ditikis_makedonias"),  "ΔΥΤΙΚΗ ΜΑΚΕΔΟΝΙΑ",       []),
    (("anatolikis","thrakis","thraki"),            "ΑΝ. ΜΑΚΕΔΟΝΙΑ - ΘΡΑΚΗ",  []),
    (("kritis","kriti","crete"),                   "ΚΡΗΤΗ",                  []),
    (("voreiou_aigaiou","voreio_aigaio"),          "ΒΟΡΕΙΟ ΑΙΓΑΙΟ",          []),
    (("notiou_aigaiou","notio_aigaio"),            "ΝΟΤΙΟ ΑΙΓΑΙΟ",           []),
    (("ionion","ionio"),                           "ΙΟΝΙΑ ΝΗΣΙΑ",            []),
    (("dytikis_elladas","ditikis_elladas"),        "ΔΥΤΙΚΗ ΕΛΛΑΔΑ",          []),
]

def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii","ignore").decode().lower()
    return re.sub(r"[^a-z0-9_]+","_", s)

def region_for(path):
    key = norm(path)
    for pats, name, extra in REGIONS:
        if any(p in key for p in pats):
            return name, extra
    return None, []

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root", help="Φάκελος που περιέχει τους υποφακέλους Periferia_*")
    ap.add_argument("--dsn", required=True)
    ap.add_argument("--only", help="Φόρτωσε μόνο περιφέρειες που το όνομά τους περιέχει αυτό (π.χ. attik)")
    a = ap.parse_args()

    here = os.path.dirname(os.path.abspath(__file__))
    loader = os.path.join(here, "load_kaek.py")
    if not os.path.exists(loader):
        sys.exit("Δεν βρέθηκε το load_kaek.py δίπλα στο load_all.py")

    jobs = []
    for dirpath, _, files in os.walk(a.root):
        for f in files:
            if f.lower().endswith(".shp"):
                full = os.path.join(dirpath, f)
                name, extra = region_for(full)
                if name is None:
                    print(f"⚠ Άγνωστη περιφέρεια, παραλείπεται: {full}")
                    continue
                if a.only and a.only.lower() not in norm(full):
                    continue
                jobs.append((name, full, extra))
    # μοναδικά ανά περιφέρεια (κράτα το πρώτο .shp κάθε περιφέρειας)
    seen, uniq = set(), []
    for name, full, extra in jobs:
        if name in seen: continue
        seen.add(name); uniq.append((name, full, extra))

    if not uniq:
        sys.exit("Δεν βρέθηκαν shapefiles περιφερειών στον φάκελο.")
    print("Θα φορτωθούν με τη σειρά:")
    for i,(name, full, extra) in enumerate(uniq,1):
        print(f"  {i}. {name}  ←  {full}" + (f"  {' '.join(extra)}" if extra else ""))
    print()

    t0 = time.time(); ok, fail = [], []
    for i,(name, full, extra) in enumerate(uniq,1):
        print(f"\n========== [{i}/{len(uniq)}] {name} ==========")
        cmd = [sys.executable, loader, full, "--region", name, "--dsn", a.dsn] + extra
        r = subprocess.run(cmd)
        (ok if r.returncode==0 else fail).append(name)
        if r.returncode != 0:
            print(f"✖ Απέτυχε: {name} — συνεχίζω με την επόμενη.")
    print(f"\n===== ΤΕΛΟΣ σε {int((time.time()-t0)/60)} λεπτά =====")
    print("Φορτώθηκαν:", ", ".join(ok) or "—")
    if fail: print("ΑΠΕΤΥΧΑΝ (ξανατρέξε μόνο αυτές με --only):", ", ".join(fail))

if __name__ == "__main__":
    main()
