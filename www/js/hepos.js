// HEXIS PAD — επίσημο μοντέλο μετασχηματισμού HEPOS (HTRS07) ↔ ΕΓΣΑ87
// Κτηματολόγιο Α.Ε. / ΤΑΤΜ ΑΠΘ (Κωτσάκης, Κατσάμπαλος, Γιαννίου, 2008):
// 3Δ ομοιότητα 7 παραμέτρων (εξ. 1) + κάνναβοι διορθώσεων δΕ, δΝ 2 km (TM07, διγραμμική παρεμβολή).
// Καστελόριζο: 3 μεταθέσεις, TM87 με λ0 = 27°.
(function (g) {
  'use strict';
  const a = 6378137.0, f = 1 / 298.257222101, e2 = f * (2 - f);
  const AS = Math.PI / 180 / 3600;
  const P = { tx: 203.437, ty: -73.461, tz: -243.594, ex: -0.170 * AS, ey: -0.060 * AS, ez: -0.151 * AS, ds: -0.294e-6 };
  const KAST = { tx: -5.020, ty: -19.885, tz: -12.244 };
  const GRID = { e0: 41600.0, n0: 1845619.0, step: 2000, nx: 422, ny: 408 };
  const LL = '+proj=longlat +ellps=GRS80 +no_defs';
  const TM87 = '+proj=tmerc +lat_0=0 +lon_0=24 +k=0.9996 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs';
  const TM07 = '+proj=tmerc +lat_0=0 +lon_0=24 +k=0.9996 +x_0=500000 +y_0=-2000000 +ellps=GRS80 +units=m +no_defs';
  const TM87K = '+proj=tmerc +lat_0=0 +lon_0=27 +k=0.9996 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs';
  let dE = null, dN = null, loading = null;

  function toXYZ(lat, lon, h) {
    const p = lat * Math.PI / 180, l = lon * Math.PI / 180, s = Math.sin(p), c = Math.cos(p);
    const Nn = a / Math.sqrt(1 - e2 * s * s);
    return [(Nn + h) * c * Math.cos(l), (Nn + h) * c * Math.sin(l), (Nn * (1 - e2) + h) * s];
  }
  function fromXYZ(X, Y, Z) {
    const lon = Math.atan2(Y, X), pp = Math.hypot(X, Y);
    let lat = Math.atan2(Z, pp * (1 - e2)), h = 0;
    for (let i = 0; i < 10; i++) {
      const s = Math.sin(lat), Nn = a / Math.sqrt(1 - e2 * s * s);
      h = pp / Math.cos(lat) - Nn;
      lat = Math.atan2(Z, pp * (1 - e2 * Nn / (Nn + h)));
    }
    return { lat: lat * 180 / Math.PI, lon: lon * 180 / Math.PI, h };
  }
  // εξ. (1) / (2): X' = X + t + R·X, R = [[δs, εz, −εy], [−εz, δs, εx], [εy, −εx, δs]] (στην (2) με αντίθετα πρόσημα)
  function helmert(v, k) {
    const [X, Y, Z] = v, tx = k * P.tx, ty = k * P.ty, tz = k * P.tz, ex = k * P.ex, ey = k * P.ey, ez = k * P.ez, ds = k * P.ds;
    return [X + tx + ds * X + ez * Y - ey * Z, Y + ty - ez * X + ds * Y + ex * Z, Z + tz + ey * X - ex * Y + ds * Z];
  }
  function grid(E07, N07) {
    if (!dE) return null;
    const gx = (E07 - GRID.e0) / GRID.step, gy = (N07 - GRID.n0) / GRID.step;
    const i = Math.floor(gx), j = Math.floor(gy);
    if (i < 0 || j < 0 || i >= GRID.nx - 1 || j >= GRID.ny - 1) return null;
    const fx = gx - i, fy = gy - j, k = j * GRID.nx + i;
    const bi = arr => (arr[k] * (1 - fx) * (1 - fy) + arr[k + 1] * fx * (1 - fy) + arr[k + GRID.nx] * (1 - fx) * fy + arr[k + GRID.nx + 1] * fx * fy) / 10000; // 0.01 cm → m
    return { dE: bi(dE), dN: bi(dN) };
  }
  const isKast = (lat, lon) => lon > 29.4 && lon < 29.7 && lat > 36.05 && lat < 36.2;

  // HTRS07 (φ, λ, h) → ΕΓΣΑ87 (E, N) · επιστρέφει και h (ΕΓΣΑ87, μόνο προσεγγιστικό ±1 m κατά το Κτηματολόγιο)
  function toEGSA(lat, lon, h) {
    h = h || 0;
    if (isKast(lat, lon)) {
      const v = toXYZ(lat, lon, h), r = fromXYZ(v[0] + KAST.tx, v[1] + KAST.ty, v[2] + KAST.tz);
      const p = proj4(LL, TM87K, [r.lon, r.lat]); return { E: p[0], N: p[1], h: r.h, grid: 'kast' };
    }
    const r = fromXYZ(...helmert(toXYZ(lat, lon, h), 1));
    const p = proj4(LL, TM87, [r.lon, r.lat]);
    const q = proj4(LL, TM07, [lon, lat]);
    const c = grid(q[0], q[1]);
    return c ? { E: p[0] + c.dE, N: p[1] + c.dN, h: r.h, grid: true } : { E: p[0], N: p[1], h: r.h, grid: false };
  }
  // ΕΓΣΑ87 (E, N, h) → HTRS07 (φ, λ)
  function fromEGSA(E, N, h, kast) {
    h = h || 0;
    if (kast) {
      const ll = proj4(TM87K, LL, [E, N]); const v = toXYZ(ll[1], ll[0], h);
      const r = fromXYZ(v[0] - KAST.tx, v[1] - KAST.ty, v[2] - KAST.tz); return { lat: r.lat, lon: r.lon, h: r.h };
    }
    const ll = proj4(TM87, LL, [E, N]);
    const r = fromXYZ(...helmert(toXYZ(ll[1], ll[0], h), -1));
    const q = proj4(LL, TM07, [r.lon, r.lat]);
    const c = grid(q[0], q[1]);
    const E07 = q[0] - (c ? c.dE : 0), N07 = q[1] - (c ? c.dN : 0);
    const o = proj4(TM07, LL, [E07, N07]);
    return { lat: o[1], lon: o[0], h: r.h, grid: !!c };
  }

  function load(base) {
    if (dE) return Promise.resolve(true);
    if (loading) return loading;
    loading = fetch((base || '') + 'lib/hepos_grid_2km_v1.bin').then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(buf => { const n = GRID.nx * GRID.ny; const all = new Int16Array(buf); dE = all.subarray(0, n); dN = all.subarray(n, 2 * n); return true; })
      .catch(e => { console.warn('HEPOS grid', e); loading = null; return false; });
    return loading;
  }
  // για Node / δοκιμές
  function setGrid(buf) { const n = GRID.nx * GRID.ny; const all = new Int16Array(buf); dE = all.subarray(0, n); dN = all.subarray(n, 2 * n); }

  g.HHEPOS = { toEGSA, fromEGSA, load, setGrid, ready: () => !!dE, toXYZ, fromXYZ };
})(typeof window !== 'undefined' ? window : globalThis);
