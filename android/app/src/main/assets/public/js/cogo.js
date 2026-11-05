// HEXIS PAD — υπολογισμοί COGO (επέκταση, πύκνωση, δυσπρόσιτα, κλίσεις, επίπεδα, γωνίασμα)
(function (g) {
  'use strict';
  const D2R = Math.PI / 180;

  function unit(a, b) { const L = Math.hypot(b.E - a.E, b.N - a.N); return { ux: (b.E - a.E) / L, uy: (b.N - a.N) / L, L }; }
  function zAt(a, b, t) { return (a.Z != null && b.Z != null) ? a.Z + t * (b.Z - a.Z) : null; }

  // Επέκταση ευθείας A→B: απόσταση d μετά το B (αρνητική = πριν το A ως προς το A), πλευρική offset (+δεξιά)
  function extend(a, b, d, off, fromStart) {
    const { ux, uy, L } = unit(a, b);
    if (!L) return null;
    off = off || 0;
    const base = fromStart ? a : b;
    const s = fromStart ? -d : d;
    const t = fromStart ? -d / L : 1 + d / L;
    return { E: base.E + ux * s + uy * off, N: base.N + uy * s - ux * off, Z: zAt(a, b, t) };
  }

  // Πύκνωση A→B κάθε step (και προαιρετικά offset). Επιστρέφει λίστα σημείων με χιλιομέτρηση
  function densify(pts, step, off, includeVertices) {
    const out = [];
    off = off || 0;
    let acc = 0, next = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const { ux, uy, L } = unit(a, b);
      if (!L) continue;
      if (includeVertices && i > 0) out.push(mk(a, 0, ux, uy, acc, true));
      while (next <= acc + L + 1e-9) {
        const t = (next - acc) / L;
        out.push({
          E: a.E + ux * L * t + uy * off, N: a.N + uy * L * t - ux * off,
          Z: zAt(a, b, t), station: next,
        });
        next += step;
      }
      acc += L;
    }
    const last = pts[pts.length - 1];
    if (out.length && Math.abs(out[out.length - 1].station - acc) > 1e-6) {
      const p = pts[pts.length - 2], { ux, uy } = unit(p, last);
      out.push({ E: last.E + uy * off, N: last.N - ux * off, Z: last.Z, station: acc });
    }
    function mk(p, t, ux, uy, st) { return { E: p.E + uy * off, N: p.N - ux * off, Z: p.Z, station: st }; }
    out.sort((x, y) => x.station - y.station);
    return out;
  }

  // Σημείο από θέση + αζιμούθιο (καννάβου) + οριζόντια απόσταση + Δh
  function polar(p, azDeg, hd, dz) {
    return { E: p.E + hd * Math.sin(azDeg * D2R), N: p.N + hd * Math.cos(azDeg * D2R), Z: (p.Z != null && dz != null) ? p.Z + dz : (p.Z != null ? p.Z : null) };
  }

  // Τομή δύο αποστάσεων: από A απόσταση r1, από B απόσταση r2. side: 'L' ή 'R' ως προς A→B
  function distDist(a, b, r1, r2) {
    const d = Math.hypot(b.E - a.E, b.N - a.N);
    if (d === 0 || d > r1 + r2 || d < Math.abs(r1 - r2)) return null;
    const x = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, r1 * r1 - x * x));
    const ux = (b.E - a.E) / d, uy = (b.N - a.N) / d;
    const px = a.E + ux * x, py = a.N + uy * x;
    return {
      R: { E: px + uy * h, N: py - ux * h, Z: null },
      L: { E: px - uy * h, N: py + ux * h, Z: null },
    };
  }

  // Τομή δύο ευθειών (A1A2) x (B1B2) — π.χ. γωνία κτιρίου από δύο τοίχους
  function lineLine(a1, a2, b1, b2) {
    const d1x = a2.E - a1.E, d1y = a2.N - a1.N, d2x = b2.E - b1.E, d2y = b2.N - b1.N;
    const den = d1x * d2y - d1y * d2x;
    if (Math.abs(den) < 1e-12) return null;
    const t = ((b1.E - a1.E) * d2y - (b1.N - a1.N) * d2x) / den;
    const Z = (a1.Z != null && a2.Z != null) ? a1.Z + t * (a2.Z - a1.Z) : null;
    return { E: a1.E + t * d1x, N: a1.N + t * d1y, Z };
  }

  // Κλίση μεταξύ δύο σημείων
  function slope(a, b) {
    const hd = Math.hypot(b.E - a.E, b.N - a.N);
    if (a.Z == null || b.Z == null) return { hd, dz: null };
    const dz = b.Z - a.Z;
    const pct = hd ? dz / hd * 100 : null;
    return {
      hd, dz, sd: Math.hypot(hd, dz), pct, permil: pct != null ? pct * 10 : null,
      deg: Math.atan2(dz, hd) / D2R, ratio: dz ? hd / Math.abs(dz) : null,
      az: (Math.atan2(b.E - a.E, b.N - a.N) / D2R + 360) % 360,
    };
  }

  // Σχεδιαστικό επίπεδο δαπέδου
  //  mode 'slope': ref{E,N,Z}, slope% κατά αζιμούθιο az (καθοδικά προς az = αρνητικό), cross% κάθετα (δεξιά)
  //  mode '3pt' : τρία σημεία με Z
  function planeFromSlope(ref, az, slopePct, crossPct) {
    const ux = Math.sin(az * D2R), uy = Math.cos(az * D2R);
    const s1 = (slopePct || 0) / 100, s2 = (crossPct || 0) / 100;
    // z = Z0 + s1*(d·u) + s2*(d·r), r = δεξιά του u = (uy, -ux)
    return function (E, N) {
      const dx = E - ref.E, dy = N - ref.N;
      return ref.Z + s1 * (dx * ux + dy * uy) + s2 * (dx * uy - dy * ux);
    };
  }
  function planeFrom3(p1, p2, p3) {
    const ax = p2.E - p1.E, ay = p2.N - p1.N, az = p2.Z - p1.Z;
    const bx = p3.E - p1.E, by = p3.N - p1.N, bz = p3.Z - p1.Z;
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    if (Math.abs(nz) < 1e-12) return null;
    const f = function (E, N) { return p1.Z - (nx * (E - p1.E) + ny * (N - p1.N)) / nz; };
    // μέγιστη κλίση και διεύθυνση
    const gx = -nx / nz, gy = -ny / nz;
    f.maxSlopePct = Math.hypot(gx, gy) * 100;
    f.maxSlopeAz = (Math.atan2(gx, gy) / D2R + 360) % 360; // ανηφορική διεύθυνση
    return f;
  }

  // Γωνίασμα: θέση p ως προς βασική γραμμή A→B (χιλιομέτρηση από A, κάθετη +δεξιά)
  function baselineSO(a, b, p) {
    const { ux, uy, L } = unit(a, b);
    const dx = p.E - a.E, dy = p.N - a.N;
    return { station: dx * ux + dy * uy, offset: dx * uy - dy * ux, length: L };
  }
  function baselinePoint(a, b, st, off) {
    const { ux, uy } = unit(a, b);
    return { E: a.E + ux * st + uy * off, N: a.N + uy * st - ux * off, Z: a.Z };
  }
  // Γωνία στο κορυφή V μεταξύ VA και VB (μοίρες, 0..180)
  function angleAt(v, a, b) {
    const a1 = Math.atan2(a.E - v.E, a.N - v.N), a2 = Math.atan2(b.E - v.E, b.N - v.N);
    let d = Math.abs(a2 - a1) / D2R; if (d > 180) d = 360 - d; return d;
  }

  // Εμβαδόν/περίμετρος πολυγώνου
  function area(pts) {
    let A = 0, P = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      A += p.E * q.N - q.E * p.N; P += Math.hypot(q.E - p.E, q.N - p.N);
    }
    return { area: Math.abs(A) / 2, perimeter: P };
  }

  g.HCOGO = { extend, densify, polar, distDist, lineLine, slope, planeFromSlope, planeFrom3, baselineSO, baselinePoint, angleAt, area };
})(window);
