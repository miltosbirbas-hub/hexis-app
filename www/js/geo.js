// HEXIS PAD — συστήματα συντεταγμένων και γεωμετρία
(function (g) {
  'use strict';
  // Έτοιμα συστήματα ανά χώρα. Σε όλα μπορεί να μπει και δικό σου proj4 + τοπική προσαρμογή (calibration).
  const CRS = {
    'EGSA87_HEPOS': { name: 'Ελλάδα · ΕΓΣΑ87 — επίσημο μοντέλο HEPOS (HTRS07, κάνναβος 2 km)', def: '+proj=tmerc +lat_0=0 +lon_0=24 +k=0.9996 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs', hepos: true },
    'EGSA87': { name: 'Ελλάδα · ΕΓΣΑ87 — 3 παράμετροι (EPSG:2100, προσεγγιστικό)', def: '+proj=tmerc +lat_0=0 +lon_0=24 +k=0.9996 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=-199.87,74.79,246.62,0,0,0,0 +units=m +no_defs' },
    'CY_LTM': { name: 'Κύπρος · CGRS93 / LTM (EPSG:6312)', def: '+proj=tmerc +lat_0=0 +lon_0=33 +k=0.99995 +x_0=200000 +y_0=-3500000 +ellps=GRS80 +towgs84=8.846,-4.394,-1.122,-0.00237,-0.146528,0.130428,0.783926 +units=m +no_defs' },
    'AL_TM': { name: 'Αλβανία · KRGJSH-2010 / Albanian TM 2010 (EPSG:6962)', def: '+proj=tmerc +lat_0=0 +lon_0=20 +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs' },
    'UK_BNG': { name: 'Ην. Βασίλειο · British National Grid (EPSG:27700)', def: '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs' },
    'FR_L93': { name: 'Γαλλία · RGF93 / Lambert-93 (EPSG:2154)', def: '+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs' },
    'NL_RD': { name: 'Ολλανδία · Amersfoort / RD New (EPSG:28992)', def: '+proj=sterea +lat_0=52.1561605555556 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs' },
    'ETRS_UTM32': { name: 'Ευρώπη · ETRS89 / UTM 32N (EPSG:25832 — DE, IT, AT…)', def: '+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs' },
    'ETRS_UTM33': { name: 'Ευρώπη · ETRS89 / UTM 33N (EPSG:25833)', def: '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs' },
    'ETRS_UTM34': { name: 'Ευρώπη · ETRS89 / UTM 34N (EPSG:25834)', def: '+proj=utm +zone=34 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs' },
    'ETRS_UTM35': { name: 'Ευρώπη · ETRS89 / UTM 35N (EPSG:25835)', def: '+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs' },
    'UTM_AUTO': { name: 'Παγκόσμιο · WGS84 / UTM (αυτόματη ζώνη)', def: null },
  };
  const WGS = '+proj=longlat +datum=WGS84 +no_defs';
  let current = 'EGSA87_HEPOS', customDef = '';

  let utmZone = null, calib = null; // calib: {a,b,tx,ty,dz} E'=a*E-b*N+tx, N'=b*E+a*N+ty
  function def() {
    if (current === 'CUSTOM') return customDef || CRS.EGSA87.def;
    if (current === 'UTM_AUTO') {
      const z = utmZone || 34, south = utmSouth ? ' +south' : '';
      return '+proj=utm +zone=' + z + south + ' +datum=WGS84 +units=m +no_defs';
    }
    return (CRS[current] || CRS.EGSA87).def;
  }
  let utmSouth = false;
  function setCRS(key, custom) { current = key; customDef = custom || ''; utmZone = null; }
  function setCalib(c) { calib = c && c.a != null ? c : null; }
  function getCalib() { return calib; }
  function crsName() {
    if (current === 'CUSTOM') return 'Custom proj4';
    if (current === 'UTM_AUTO') return 'WGS84 / UTM ' + (utmZone || '?') + (utmSouth ? 'S' : 'N');
    return (CRS[current] || CRS.EGSA87).name;
  }
  function validDef(d) { try { proj4(WGS, d, [24, 38]); return true; } catch (e) { return false; } }

  // lat, lon (μοίρες) -> {E, N}  (με τοπική προσαρμογή αν υπάρχει)
  function isHepos() { return current === 'EGSA87_HEPOS'; }
  function rawGrid(lat, lon, h) {
    if (isHepos() && g.HHEPOS) { if (!HHEPOS.ready()) HHEPOS.load(); const r = HHEPOS.toEGSA(lat, lon, h || 0); lastGridOk = r.grid !== false; return { E: r.E, N: r.N }; }
    if (current === 'UTM_AUTO' && utmZone == null) { utmZone = Math.floor((lon + 180) / 6) + 1; utmSouth = lat < 0; }
    const p = proj4(WGS, def(), [lon, lat]);
    return { E: p[0], N: p[1] };
  }
  let lastGridOk = true;
  function toGrid(lat, lon, h) {
    const r = rawGrid(lat, lon, h);
    if (!calib) return r;
    return { E: calib.a * r.E - calib.b * r.N + calib.tx, N: calib.b * r.E + calib.a * r.N + calib.ty };
  }
  function toLL(E, N) {
    if (calib) { // αντίστροφος μετασχηματισμός ομοιότητας
      const x = E - calib.tx, y = N - calib.ty, d = calib.a * calib.a + calib.b * calib.b;
      E = (calib.a * x + calib.b * y) / d; N = (-calib.b * x + calib.a * y) / d;
    }
    if (isHepos() && g.HHEPOS) { const r = HHEPOS.fromEGSA(E, N, 0); return { lat: r.lat, lon: r.lon }; }
    const p = proj4(def(), WGS, [E, N]);
    return { lat: p[1], lon: p[0] };
  }
  function heightShift() { return calib && calib.dz ? calib.dz : 0; }

  // Τοπική προσαρμογή: ζεύγη {raw:{E,N,Z}, known:{E,N,Z}} -> 4 παραμέτρων ομοιότητα + μέση μετάθεση ύψους
  function solveCalib(pairs, useScale) {
    const n = pairs.length;
    if (n < 1) return null;
    let mx = 0, my = 0, Mx = 0, My = 0;
    pairs.forEach(p => { mx += p.raw.E; my += p.raw.N; Mx += p.known.E; My += p.known.N; });
    mx /= n; my /= n; Mx /= n; My /= n;
    let a = 1, b = 0;
    if (n >= 2) {
      let sxx = 0, sab = 0, sba = 0;
      pairs.forEach(p => {
        const x = p.raw.E - mx, y = p.raw.N - my, X = p.known.E - Mx, Y = p.known.N - My;
        sxx += x * x + y * y; sab += x * X + y * Y; sba += x * Y - y * X;
      });
      a = sab / sxx; b = sba / sxx;
      if (!useScale) { const s = Math.hypot(a, b); a /= s; b /= s; }
    }
    const tx = Mx - (a * mx - b * my), ty = My - (b * mx + a * my);
    let dz = 0, nz = 0;
    pairs.forEach(p => { if (p.raw.Z != null && p.known.Z != null) { dz += p.known.Z - p.raw.Z; nz++; } });
    dz = nz ? dz / nz : 0;
    const res = pairs.map(p => {
      const E = a * p.raw.E - b * p.raw.N + tx, N = b * p.raw.E + a * p.raw.N + ty;
      return { name: p.name, dE: p.known.E - E, dN: p.known.N - N, dZ: (p.raw.Z != null && p.known.Z != null) ? p.known.Z - (p.raw.Z + dz) : null };
    });
    return { a, b, tx, ty, dz, scale: Math.hypot(a, b), rot: Math.atan2(b, a) * 180 / Math.PI, residuals: res, n };
  }

  // Σύγκλιση μεσημβρινών (μοίρες) — για διόρθωση μαγνητικού/γεωγραφικού αζιμουθίου σε καννάβου
  function convergence(lat, lon) {
    const a = toGrid(lat, lon), b = toGrid(lat + 0.0005, lon);
    return Math.atan2(b.E - a.E, b.N - a.N) * 180 / Math.PI;
  }

  function dist(a, b) { return Math.hypot(b.E - a.E, b.N - a.N); }
  // Αζιμούθιο από βορρά δεξιόστροφα (μοίρες 0..360)
  function azimuth(a, b) { let t = Math.atan2(b.E - a.E, b.N - a.N) * 180 / Math.PI; return (t + 360) % 360; }

  // Χιλιομέτρηση / κάθετη απόσταση σημείου από πολυγραμμή
  // επιστρέφει {station, offset(+δεξιά), seg, foot{E,N}, z}
  function stationOffset(pts, p) {
    let best = null, acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b.E - a.E, dy = b.N - a.N, L2 = dx * dx + dy * dy;
      if (L2 === 0) continue;
      let t = ((p.E - a.E) * dx + (p.N - a.N) * dy) / L2;
      const tc = Math.max(0, Math.min(1, t));
      const fx = a.E + tc * dx, fy = a.N + tc * dy;
      const d = Math.hypot(p.E - fx, p.N - fy);
      const L = Math.sqrt(L2);
      if (!best || d < best.d) {
        const cross = (dx * (p.N - a.N) - dy * (p.E - a.E)) / L; // + αριστερά
        const za = a.Z, zb = b.Z;
        best = {
          d, seg: i, station: acc + tc * L, offset: -cross,
          foot: { E: fx, N: fy }, t: tc, outside: t < 0 || t > 1,
          z: (za != null && zb != null) ? za + tc * (zb - za) : null,
          dir: Math.atan2(dx, dy) * 180 / Math.PI,
        };
      }
      acc += L;
    }
    if (best) best.length = acc;
    return best;
  }

  function pointAtStation(pts, st, off) {
    let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const L = Math.hypot(b.E - a.E, b.N - a.N);
      if (L === 0) continue;
      if (st <= acc + L || i === pts.length - 2) {
        const t = (st - acc) / L;
        const ux = (b.E - a.E) / L, uy = (b.N - a.N) / L;
        return {
          E: a.E + t * (b.E - a.E) + uy * off,
          N: a.N + t * (b.N - a.N) - ux * off,
          Z: (a.Z != null && b.Z != null) ? a.Z + t * (b.Z - a.Z) : null,
        };
      }
      acc += L;
    }
    return null;
  }

  function fmt(v, d) { return (v == null || isNaN(v)) ? '—' : v.toFixed(d == null ? 3 : d); }
  function fmtAz(deg) {
    const d = ((deg % 360) + 360) % 360;
    return d.toFixed(1) + '°';
  }

  g.HGEO = { isHepos, gridOk: () => lastGridOk, CRS, setCRS, setCalib, getCalib, solveCalib, rawGrid, heightShift, validDef, crsName, toGrid, toLL, convergence, dist, azimuth, stationOffset, pointAtStation, fmt, fmtAz };
})(window);
