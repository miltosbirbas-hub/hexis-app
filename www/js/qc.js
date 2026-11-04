// HEXIS PAD — Συνεχής ποιοτικός έλεγχος RTK (QC)
// Βάση: NOAA/NGS «User Guidelines for Single Base Real Time GNSS Positioning» (Henning, v2.1) — κλάσεις RT1–RT4,
// ISO 17123-8 (έλεγχος οργάνων GNSS RTK στο πεδίο), καλή πρακτική ελέγχου σε γνωστά σημεία και ανεξάρτητων επαναμετρήσεων.
(function (g) {
  'use strict';

  // Οι τιμές ακρίβειας (h95, v95) είναι στο 95%. Τα όρια RMS ελέγχονται στα σ (68%) της GST.
  const CLASSES = {
    RT1: { name: 'RT1 · Δίκτυο / στάσεις', h95: 0.02, v95: 0.04, pdop: 2.0, sats: 7, rms: 0.010, epochs: 180, fixTime: 30, age: 5, base: 10 },
    RT2: { name: 'RT2 · Τοπογραφικό ακριβείας', h95: 0.04, v95: 0.05, pdop: 3.0, sats: 6, rms: 0.015, epochs: 12, fixTime: 20, age: 5, base: 15 },
    RT3: { name: 'RT3 · Τοπογραφικό / χάραξη', h95: 0.06, v95: 0.08, pdop: 4.0, sats: 5, rms: 0.030, epochs: 15, fixTime: 10, age: 10, base: 20 },
    RT4: { name: 'RT4 · Γρήγορη αποτύπωση / GIS', h95: 0.20, v95: 0.30, pdop: 6.0, sats: 5, rms: 0.050, epochs: 10, fixTime: 5, age: 15, base: 99 },
  };

  function Monitor() {
    this.cls = 'RT3'; this.custom = null;
    this.fixSince = null; this.lastFix = null; this.losses = 0; this.jumps = 0; this.events = [];
    this.prev = null; this.prev2 = null; this.suspectUntil = 0;
  }
  Monitor.prototype.lim = function () { return Object.assign({}, CLASSES[this.cls] || CLASSES.RT3, this.custom || {}); };
  Monitor.prototype.log = function (t, msg) { this.events.unshift({ t: Date.now(), type: t, msg }); if (this.events.length > 60) this.events.pop(); };

  // Καλείται σε κάθε GGA με {E,N,Z, fix, sh, sv, pdop, sats, age, t}
  Monitor.prototype.epoch = function (e) {
    const now = e.t || Date.now();
    const isFix = e.fix === 'fix';
    if (isFix) {
      if (!this.fixSince) { this.fixSince = now; this.log('fix', 'Απόκτηση FIX'); }
      // Ανίχνευση «άλματος» (πιθανό λάθος fix): σύγκριση με προβλεπόμενη θέση από την ταχύτητα
      // Έλεγχος μόνο όταν η ράβδος ήταν ακίνητη (αλλιώς η κίνηση του χειριστή μοιάζει με άλμα)
      if (this.prev && this.prev.fix === 'fix' && this.prev2 && this.prev2.fix === 'fix') {
        const dt = (now - this.prev.t) / 1000, dt2 = (this.prev.t - this.prev2.t) / 1000;
        const vPrev = dt2 > 0 ? Math.hypot(this.prev.E - this.prev2.E, this.prev.N - this.prev2.N) / dt2 : 99;
        if (dt > 0 && dt < 3 && vPrev < 0.15) {
          const sig = Math.max(0.01, e.sh || 0.01);
          const dH = Math.hypot(e.E - this.prev.E, e.N - this.prev.N);
          const dV = (e.Z != null && this.prev.Z != null) ? Math.abs(e.Z - this.prev.Z) : 0;
          const thH = Math.max(0.25, 8 * sig), thV = Math.max(0.25, 8 * Math.max(0.015, e.sv || 0.02));
          if (dV > thV && dH < 0.10 || dH > thH && dH / dt > 1.2) {
            this.jumps++; this.suspectUntil = now + 15000; this.fixSince = now;
            this.log('jump', `Άλμα θέσης ${dH.toFixed(3)} m / ${dV.toFixed(3)} m σε FIX ενώ η ράβδος ήταν ακίνητη — πιθανό λάθος επίλυση, επανεκκίνηση χρόνου FIX`);
          }
        }
      }
    } else {
      if (this.fixSince) { this.losses++; this.log('loss', 'Απώλεια FIX → ' + (e.fix || 'none').toUpperCase()); }
      this.fixSince = null;
    }
    this.prev2 = this.prev; this.prev = Object.assign({}, e, { t: now });
    return this.live(e, now);
  };

  // Ζωντανή αξιολόγηση της τρέχουσας εποχής
  Monitor.prototype.live = function (e, now) {
    now = now || Date.now();
    const L = this.lim();
    const fixAge = this.fixSince ? (now - this.fixSince) / 1000 : 0;
    const c = [
      chk('Λύση', e.fix === 'fix' ? 'FIX' : (e.fix || '—').toUpperCase(), 'FIX', e.fix === 'fix'),
      chk('Χρόνος σε FIX', fixAge.toFixed(0) + ' s', '≥ ' + L.fixTime + ' s', fixAge >= L.fixTime, true),
      chk('σH (1σ)' + (e.sEst ? ' εκτ.' : ''), (e.sEst ? '~' : '') + f(e.sh), '≤ ' + L.rms.toFixed(3), e.sh == null ? null : e.sh <= L.rms, !!e.sEst),
      chk('σV (1σ)' + (e.sEst ? ' εκτ.' : ''), (e.sEst ? '~' : '') + f(e.sv), '≤ ' + (L.rms * 2).toFixed(3), e.sv == null ? null : e.sv <= L.rms * 2, !!e.sEst),
      chk('PDOP', e.pdop != null ? e.pdop.toFixed(1) : '—', '≤ ' + L.pdop.toFixed(1), e.pdop == null ? null : e.pdop <= L.pdop),
      chk('Δορυφόροι', e.sats != null ? e.sats : '—', '≥ ' + L.sats, e.sats >= L.sats),
      chk('Ηλικία διορθώσεων', e.age != null ? e.age.toFixed(1) + ' s' : '—', '≤ ' + L.age + ' s', e.age == null ? null : e.age <= L.age),
      chk('Άλμα θέσης', now < this.suspectUntil ? 'ΝΑΙ (πρόσφατο)' : 'όχι', 'όχι', now >= this.suspectUntil),
    ];
    return summarize(c);
  };

  function chk(name, val, lim, ok, soft) { return { name, val: String(val), lim, ok, soft: !!soft }; }
  function f(v) { return v == null ? '—' : v.toFixed(3); }
  function summarize(c) {
    let level = 'ok';
    c.forEach(x => { if (x.lim === '') return; if (x.ok === false) level = (x.soft && level === 'ok') ? 'warn' : 'fail'; else if (x.ok === null && level === 'ok') level = 'warn'; });
    return { level, checks: c };
  }

  // Αξιολόγηση συνόλου εποχών μιας μέτρησης (μέσος όρος + διασπορά)
  Monitor.prototype.evaluate = function (eps, opts) {
    opts = opts || {};
    const L = this.lim();
    const n = eps.length;
    const m = { E: 0, N: 0, Z: 0 }; let nz = 0;
    eps.forEach(p => { m.E += p.E; m.N += p.N; if (p.Z != null) { m.Z += p.Z; nz++; } });
    m.E /= n; m.N /= n; m.Z = nz ? m.Z / nz : null;
    let sE = 0, sN = 0, sZ = 0, maxH = 0, maxV = 0;
    eps.forEach(p => {
      sE += (p.E - m.E) ** 2; sN += (p.N - m.N) ** 2; if (p.Z != null && m.Z != null) sZ += (p.Z - m.Z) ** 2;
      maxH = Math.max(maxH, Math.hypot(p.E - m.E, p.N - m.N)); if (p.Z != null && m.Z != null) maxV = Math.max(maxV, Math.abs(p.Z - m.Z));
    });
    const k = n > 1 ? n - 1 : 1;
    const stdH = Math.sqrt((sE + sN) / k), stdV = Math.sqrt(sZ / k);
    const worst = (key) => eps.reduce((a, p) => (p[key] != null && p[key] > a ? p[key] : a), 0);
    const nonFix = eps.filter(p => p.fix !== 'fix').length;
    const c = [
      chk('Εποχές', n, '≥ ' + (opts.epochs || 1), n >= (opts.epochs || 1)),
      chk('Μη-FIX εποχές', nonFix, '0', nonFix === 0),
      chk('Διασπορά Οριζ. (std)', f(stdH), '≤ ' + L.rms.toFixed(3), n < 2 ? null : stdH <= L.rms),
      chk('Διασπορά Κατ. (std)', f(stdV), '≤ ' + (L.rms * 2).toFixed(3), n < 2 || m.Z == null ? null : stdV <= L.rms * 2),
      chk('Μέγ. απόκλιση Οριζ.', f(maxH), '≤ ' + (L.h95 / 2).toFixed(3), n < 2 ? null : maxH <= L.h95 / 2),
      chk('Μέγ. απόκλιση Κατ.', f(maxV), '≤ ' + (L.v95 / 2).toFixed(3), n < 2 || m.Z == null ? null : maxV <= L.v95 / 2),
      chk('Χειρότερο σH', f(worst('sh')), '≤ ' + L.rms.toFixed(3), eps.some(p => p.sh != null) ? worst('sh') <= L.rms : null),
      chk('Χειρότερο PDOP', worst('pdop') ? worst('pdop').toFixed(1) : '—', '≤ ' + L.pdop.toFixed(1), eps.some(p => p.pdop != null) ? worst('pdop') <= L.pdop : null),
      chk('Ελάχ. δορυφόροι', eps.reduce((a, p) => Math.min(a, p.sats || 99), 99), '≥ ' + L.sats, eps.every(p => (p.sats || 0) >= L.sats)),
      chk('Χρόνος σε FIX στην έναρξη', (opts.fixAge || 0).toFixed(0) + ' s', '≥ ' + L.fixTime + ' s', (opts.fixAge || 0) >= L.fixTime, true),
      chk('Άλματα κατά τη μέτρηση', opts.jumps || 0, '0', !(opts.jumps > 0)),
    ];
    const s = summarize(c);
    return Object.assign(s, { mean: m, stdH, stdV, maxH, maxV, n, cls: this.cls,
      hrms: Math.max(stdH, eps.reduce((a, p) => a + (p.sh || 0), 0) / n),
      vrms: Math.max(stdV, eps.reduce((a, p) => a + (p.sv || 0), 0) / n) });
  };

  // Έλεγχος σε γνωστό σημείο ή σύγκριση δύο ανεξάρτητων μετρήσεων
  Monitor.prototype.compare = function (meas, known, label) {
    const L = this.lim();
    const dE = meas.E - known.E, dN = meas.N - known.N, dH = Math.hypot(dE, dN);
    const dZ = (meas.Z != null && known.Z != null) ? meas.Z - known.Z : null;
    // δύο ανεξάρτητες μετρήσεις: ανοχή √2 × ακρίβεια κλάσης
    const kf = label === 'dup' ? Math.SQRT2 : 1;
    const c = [
      chk('ΔX', f(dE), '', null), chk('ΔY', f(dN), '', null),
      chk('Οριζόντια διαφορά', f(dH), '≤ ' + (L.h95 * kf).toFixed(3), dH <= L.h95 * kf),
      chk('Υψομετρική διαφορά', f(dZ), '≤ ' + (L.v95 * kf).toFixed(3), dZ == null ? null : Math.abs(dZ) <= L.v95 * kf),
    ];
    return Object.assign(summarize(c.filter(x => x.ok !== null || x.lim === '')), { dE, dN, dZ, dH });
  };

  g.HQC = { CLASSES, Monitor };
})(window);
