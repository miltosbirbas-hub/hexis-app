/* HEXIS-APP · ΔΙΑΓΡΑΜΜΑ ΚΑΛΥΨΗΣ — σύνθεση φύλλου 1:100 (στοιχεία σε mm χαρτιού, y προς τα πάνω)
 * Από το ίδιο σύνολο στοιχείων βγαίνουν η προεπισκόπηση, το PDF και το DXF.
 * Στήλες: ΦΩΤΟΡΕΑΛΙΣΤΙΚΕΣ ΕΙΚΟΝΕΣ | ΟΨΕΙΣ-ΤΟΜΕΣ | ΟΡΟΙ ΔΟΜΗΣΗΣ | ΕΜΒΑΔΟΜΕΤΡΗΣΕΙΣ | ΤΟΠΟΓΡΑΦΙΚΟ ΔΙΑΓΡΑΜΜΑ | ΠΙΝΑΚΕΣ ΣΥΝΤΕΤΑΓΜΕΝΩΝ + πινακίδα
 * Περιεχόμενο κατά άρθ. 325 ν.5306/2026 (πρώην άρθ. 39 παρ. 3 ν.4495/2017) και υποδείγματα ΥΠΕΝ (εγκύκλιος 135179/4495/2022).
 */
(function (root) {
  'use strict';
  var K = root.KalEngine || (typeof require !== 'undefined' ? require('./kalypsi-engine.js') : null);
  var SC = 10; // 1:100 → 10 mm χαρτιού ανά μέτρο
  var HEAD = 17, MG = 6;
  var COL = { line: '#1f2937', plot: '#1d4ed8', cov: '#c81e1e', fyt: '#16a34a', pras: '#65a30d', pool: '#0891b2', dist: '#b45309', frame: '#111827' };
  var SPC = { H: '#f59e0b', X: '#38bdf8', K: '#8b5cf6', I: '#a78bfa', A: '#c4b5fd', F: '#14b8a6', P: '#94a3b8' };
  var SPL = { H: 'Η/Χ', X: 'ΕΞΩΣΤΗΣ', K: 'ΚΛΙΜ/ΣΙΟ', I: 'ΚΛΙΜ/ΣΙΟ', A: 'ΑΝ. ΚΛΙΜ.', F: 'ΦΩΤ/ΓΟΣ', P: 'Η-Μ/ΣΤΑΘΜ.' };

  function hatchLines(pts, sp, angDeg) {
    var a = (angDeg == null ? 45 : angDeg) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    // στροφή ώστε οι γραμμές να γίνουν οριζόντιες
    var R = pts.map(function (p) { return [p[0] * ca + p[1] * sa, -p[0] * sa + p[1] * ca]; });
    var y0 = 1e30, y1 = -1e30; R.forEach(function (p) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    var out = [], n = R.length;
    for (var y = Math.ceil(y0 / sp) * sp; y <= y1; y += sp) {
      var xs = [];
      for (var i = 0; i < n; i++) { var p = R[i], q = R[(i + 1) % n]; if ((p[1] > y) !== (q[1] > y)) xs.push(p[0] + (y - p[1]) * (q[0] - p[0]) / (q[1] - p[1])); }
      xs.sort(function (u, v) { return u - v; });
      for (var k = 0; k + 1 < xs.length; k += 2) {
        var A = [xs[k], y], B = [xs[k + 1], y];
        out.push([[A[0] * ca - A[1] * sa, A[0] * sa + A[1] * ca], [B[0] * ca - B[1] * sa, B[0] * sa + B[1] * ca]]);
      }
    }
    return out;
  }
  // τοποθέτηση ορθογωνίων σε υποστήλες ύψους av (από πάνω προς τα κάτω)
  function pack(items, av, gap) {
    var cols = [], cur = null;
    items.forEach(function (it) {
      if (!cur || (cur.h + it.h > av && cur.items.length)) { cur = { w: 0, h: 0, items: [] }; cols.push(cur); }
      it.dy = cur.h; cur.items.push(it); cur.h += it.h + gap; cur.w = Math.max(cur.w, it.w);
    });
    var x = 0; cols.forEach(function (c) { c.x = x; x += c.w + gap; c.items.forEach(function (it) { it.dx = c.x + (c.w - it.w) / 2; }); });
    return { cols: cols, w: Math.max(0, x - gap) };
  }
  function wrap(text, maxW, size, bold, measure) {
    if (measure(text, size, bold) <= maxW) return [text];
    var words = text.split(' '), out = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (measure(t, size, bold) > maxW && cur) { out.push(cur); cur = w; } else cur = t; });
    if (cur) out.push(cur);
    return out;
  }

  /* in: { D, topo:{cl,plot,cov[],fyt[],pras[],pool[]}, plans:[{cl, name, lines[]}], secs:[cl...], R, A, tpl, P, photos[{w,h,src}], measure, H0 } */
  function planTitle(n) {
    var u = String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    if (/^ΚΑΤΟΨΗ/.test(u)) return u;
    var G = [[/ΥΠΟΣΚΑΦΟ$/, 'ΥΠΟΣΚΑΦΟΥ'], [/ΥΠΟΓΕΙΟ$/, 'ΥΠΟΓΕΙΟΥ'], [/ΙΣΟΓΕΙΟ$/, 'ΙΣΟΓΕΙΟΥ'], [/ΗΜΙΟΡΟΦΟΣ$/, 'ΗΜΙΟΡΟΦΟΥ'], [/ΟΡΟΦΟΣ$/, 'ΟΡΟΦΟΥ'], [/ΣΟΦΙΤΑ$/, 'ΣΟΦΙΤΑΣ'], [/ΠΑΤΑΡΙ$/, 'ΠΑΤΑΡΙΟΥ'], [/ΔΩΜΑ$/, 'ΔΩΜΑΤΟΣ'], [/ΣΤΕΓΗ$/, 'ΣΤΕΓΗΣ']];
    for (var i = 0; i < G.length; i++) if (G[i][0].test(u)) { u = u.replace(G[i][0], G[i][1]); break; }
    return 'ΚΑΤΟΨΗ ' + u;
  }
  function build(I) {
    var D = I.D, prims = [], measure = I.measure || function (t, s) { return String(t).length * s * 0.62; };
    function pl(pts, o) { prims.push(Object.assign({ t: 'pl', pts: pts, closed: false, w: 0.18, c: COL.line, ly: 'KAL_PLAISIO' }, o || {})); }
    function tx(x, y, s, h, o) { if (s === '' || s == null) return; prims.push(Object.assign({ t: 'tx', x: x, y: y, s: String(s), h: h, al: 'l', rot: 0, b: false, c: '#111827', ly: 'KAL_KEIMENA' }, o || {})); }
    function rect(x0, y0, x1, y1, o) { pl([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], Object.assign({ closed: true }, o || {})); }
    function fill(pts, c, a, ly) { prims.push({ t: 'fill', pts: pts, c: c, a: a, ly: ly }); }
    function hatch(pts, sp, c, ly) { prims.push({ t: 'hatch', pts: pts, sp: sp, c: c, ly: ly }); }

    // ---- περιεχόμενα μοντέλου ----
    function clBB(cl, grow) { return K.bbGrow(cl.bb, grow); }
    var topoCl = I.topo && I.topo.cl != null ? I.cls[I.topo.cl] : null;
    var topoBB = topoCl ? clBB(topoCl, 2) : null;
    var planItems = (I.plans || []).map(function (p) {
      var cl = I.cls[p.cl], bb = clBB(cl, 1.5), pw = Math.max((bb[2] - bb[0]) * SC, 60), maxL = Math.max(pw, 130), lines = [];
      (p.lines || []).forEach(function (s) { wrap(s, maxL, 2.5, false, measure).forEach(function (w, k) { lines.push((k ? '   ' : '') + w); }); });
      var lw = 0; lines.forEach(function (s) { lw = Math.max(lw, measure(s, 2.5, false)); });
      return { kind: 'plan', p: p, cl: cl, bb: bb, w: Math.max(pw, lw), pw: pw, h: (bb[3] - bb[1]) * SC + 8 + lines.length * 4.2 + 4, lines: lines };
    });
    var secItems = (I.secs || []).map(function (ci) { var cl = I.cls[ci], bb = clBB(cl, 1); return { kind: 'sec', cl: cl, bb: bb, w: (bb[2] - bb[0]) * SC, h: (bb[3] - bb[1]) * SC + 4 }; });
    // όροι — κείμενο υποδείγματος
    var TS = { h1: 4.0, h2: 3.0, n: 2.6 }, maxTW = 250;
    var tlines = [];
    (I.tpl || []).forEach(function (l) {
      var s = TS[l.s] || 2.6, b = !!l.b || l.s === 'h1';
      if (!l.t) { tlines.push({ t: '', s: s, b: b, lh: s * 1.1 }); return; }
      wrap(l.t, maxTW, s, b, measure).forEach(function (w, k) { tlines.push({ t: (k ? '   ' : '') + w, s: s, b: b, lh: s * 1.55, center: l.center, red: /ΥΠΕΡΒΑΣΗ/.test(w) }); });
    });
    var tW = 0; tlines.forEach(function (l) { tW = Math.max(tW, measure(l.t, l.s, l.b)); });
    var tH = 0; tlines.forEach(function (l) { tH += l.lh; });

    // ---- ύψος φύλλου ----
    var need = 0;
    if (topoBB) need = Math.max(need, (topoBB[3] - topoBB[1]) * SC);
    planItems.concat(secItems).forEach(function (it) { need = Math.max(need, it.h); });
    var H0 = I.H0 && I.H0 !== 'auto' ? +I.H0 : ([594, 841, 1189].filter(function (v) { return v - HEAD - 2 * MG >= need; })[0] || 1189);
    var av = H0 - HEAD - 2 * MG, warn = [];
    if (need > av) warn.push('Σε 1:100 κάποιο σχέδιο είναι ψηλότερο από το φύλλο (' + H0 + ' mm) και βγαίνει έξω από το πλαίσιο.');

    var secPack = pack(secItems, av, 10), planPack = pack(planItems, av, 10);
    // όροι σε υποστήλες αν δεν χωράνε
    var tcols = [[]], th = 0;
    tlines.forEach(function (l) { if (th + l.lh > av && tcols[tcols.length - 1].length) { tcols.push([]); th = 0; } tcols[tcols.length - 1].push(l); th += l.lh; });
    // πίνακες συντεταγμένων
    var tabs = [];
    function ptsOf(id) { return D.ents[id].pts; }
    if (I.topo) {
      var k = 0, rowsK = [];
      (I.topo.cov || []).forEach(function (id) { ptsOf(id).forEach(function (p) { k++; rowsK.push(['K' + k, p[0], p[1]]); }); });
      if (rowsK.length) tabs.push({ title: ['ΣΥΝΤΕΤΑΓΜΕΝΕΣ ΚΟΡΥΦΩΝ', 'ΠΕΡΙΓΡΑΜΜΑΤΟΣ ΚΤΙΡΙΟΥ'], rows: rowsK });
      var kp = 0, rowsP = [];
      (I.topo.pool || []).forEach(function (id) { ptsOf(id).forEach(function (p) { kp++; rowsP.push(['Π' + kp, p[0], p[1]]); }); });
      if (rowsP.length) tabs.push({ title: ['ΣΥΝΤΕΤΑΓΜΕΝΕΣ ΚΟΡΥΦΩΝ', 'ΚΟΛΥΜΒΗΤΙΚΗΣ ΔΕΞΑΜΕΝΗΣ'], rows: rowsP });
      if (I.topo.plot != null) {
        var labs = I.plotLabels || [], rowsO = ptsOf(I.topo.plot).map(function (p, i) { return [labs[i] || String(i + 1), p[0], p[1]]; });
        tabs.push({ title: ['ΣΥΝΤΕΤΑΓΜΕΝΕΣ ΚΟΡΥΦΩΝ', I.A.mode === 2 ? 'ΓΗΠΕΔΟΥ' : 'ΟΙΚΟΠΕΔΟΥ'], rows: rowsO });
      }
    }
    var TBW = 92, nbMax = 1; tabs.forEach(function (t) { nbMax = Math.max(nbMax, Math.ceil(t.rows.length / 30)); });
    var synW = Math.max(200, nbMax * (TBW + 4) - 4 + 2 * MG);
    // φωτορεαλιστικά
    var photoW = 190, phItems = (I.photos || []).map(function (p) { return { p: p, w: photoW, h: photoW * p.h / p.w }; });
    var phPack = pack(phItems, av, 6);

    var cols = [];
    cols.push({ id: 'foto', t: 'ΦΩΤΟΡΕΑΛΙΣΤΙΚΕΣ ΕΙΚΟΝΕΣ', sc: false, w: Math.max(200, phPack.w + 2 * MG) });
    if (secItems.length) cols.push({ id: 'sec', t: 'ΟΨΕΙΣ-ΤΟΜΕΣ', sc: true, w: Math.max(240, secPack.w + 2 * MG) });
    cols.push({ id: 'oroi', t: 'ΟΡΟΙ ΔΟΜΗΣΗΣ', sc: false, w: Math.max(160, tcols.length * (tW + 8) + 2 * MG) });
    if (planItems.length) cols.push({ id: 'emb', t: 'ΕΜΒΑΔΟΜΕΤΡΗΣΕΙΣ', sc: true, w: Math.max(200, planPack.w + 2 * MG) });
    if (topoBB) cols.push({ id: 'topo', t: 'ΤΟΠΟΓΡΑΦΙΚΟ ΔΙΑΓΡΑΜΜΑ ΔΙΑΜΟΡΦΩΣΕΩΝ ΚΑΙ ΦΥΤΕΥΣΕΩΝ', sc: true, w: Math.max(260, (topoBB[2] - topoBB[0]) * SC + 2 * MG) });
    cols.push({ id: 'syn', t: 'ΠΙΝΑΚΕΣ ΣΥΝΤΕΤΑΓΜΕΝΩΝ', sc: false, w: synW });
    var W = 0; cols.forEach(function (c) { c.x = W; W += c.w; });

    // ---- πλαίσιο & κεφαλίδες ----
    rect(0, 0, W, H0, { w: 0.5, c: COL.frame });
    pl([[0, H0 - HEAD], [W, H0 - HEAD]], { w: 0.25, c: COL.frame });
    cols.forEach(function (c, i) {
      if (i) pl([[c.x, 0], [c.x, H0]], { w: 0.25, c: COL.frame });
      tx(c.x + 4, H0 - (c.sc ? 6.6 : 9.6), c.t, 4.6, { b: true });
      if (c.sc) tx(c.x + 4, H0 - 13.4, 'κλίμακα 1/100', 4.0);
    });
    var top = H0 - HEAD - MG;
    var topoXf = null;

    // ---- σχεδίαση cluster με μετασχηματισμό ----
    function drawCl(cl, bb, ox, oy, extra) {
      var xf = function (p) { return [(p[0] - bb[0]) * SC + ox, (p[1] - bb[1]) * SC + oy]; };
      var skip = (extra && extra.skip) || {};
      cl.ents.forEach(function (i) { var e = D.ents[i]; if (skip[i]) return; pl(e.pts.map(xf), { closed: e.closed, w: 0.18, c: COL.line, ly: e.layer, src: true }); });
      cl.texts.forEach(function (i) { var t = D.texts[i]; if (extra && extra.noTitle && /ΚΑΤΟΨ|ΚΑΛΥΨΗ ΟΡΟΦ/.test(t.n || '')) return; var p = xf([t.x, t.y]); tx(p[0], p[1], t.text, Math.max(0.8, t.h * SC), { rot: t.rot || 0, ly: t.layer, src: true }); });
      (I.extraEnts || []).forEach(function (e) { if (e.cl === cl.id) pl(e.pts.map(xf), { closed: true, w: 0.25, c: '#7c3aed', ly: 'KAL_SXEDIO' }); });
      return xf;
    }

    cols.forEach(function (c) {
      var x0 = c.x + MG;
      if (c.id === 'foto') {
        if (!phItems.length) { tx(c.x + c.w / 2, H0 / 2, 'Ενδεικτική τρισδιάστατη απεικόνιση', 3.2, { al: 'c', c: '#6b7280' }); tx(c.x + c.w / 2, H0 / 2 - 6, '(άρθ. 325 περ. η ν.5306/2026)', 2.6, { al: 'c', c: '#6b7280' }); }
        phPack.cols.forEach(function (sc) { sc.items.forEach(function (it) { var y = top - it.dy - it.h; prims.push({ t: 'img', x: x0 + it.dx, y: y, w: it.w, h: it.h, src: it.p.src, fmt: it.p.fmt, ly: 'KAL_EIKONES' }); rect(x0 + it.dx, y, x0 + it.dx + it.w, y + it.h, { w: 0.18, c: '#9ca3af', ly: 'KAL_EIKONES' }); }); });
      }
      if (c.id === 'sec') {
        secPack.cols.forEach(function (sc) { sc.items.forEach(function (it) { drawCl(it.cl, it.bb, x0 + it.dx, top - it.dy - it.h + 4, null); }); });
      }
      if (c.id === 'oroi') {
        var cx = x0;
        tcols.forEach(function (col) {
          var y = top;
          col.forEach(function (l) { y -= l.lh; if (l.t) tx(l.center ? cx + tW / 2 : cx, y, l.t, l.s, { b: l.b, al: l.center ? 'c' : 'l', c: l.red ? '#b91c1c' : '#111827', ly: 'KAL_OROI' }); });
          cx += tW + 8;
        });
      }
      if (c.id === 'emb') {
        planPack.cols.forEach(function (sc) {
          sc.items.forEach(function (it) {
            var ox = x0 + it.dx, ybot = top - it.dy - (it.bb[3] - it.bb[1]) * SC;
            var outl = {}; (it.p.outline || []).forEach(function (i) { outl[i] = 1; });
            var xf = drawCl(it.cl, it.bb, ox, ybot, { noTitle: true });
            (it.p.spaces || []).forEach(function (s) {
              var pts = (s.pts || D.ents[s.id].pts).map(xf);
              fill(pts, SPC[s.code] || '#cbd5e1', 0.35, 'KAL_XOROI');
              var wp = s.pts || D.ents[s.id].pts, cc = K.cent(pts), a = K.area(wp);
              // αν υπάρχει ήδη όνομα χώρου μέσα στο πολύγωνο, το Ε= μπαίνει ακριβώς από κάτω του
              var own = null; it.cl.texts.forEach(function (ti) { var t = D.texts[ti]; if (!own && K.pip([t.x, t.y], wp)) own = t; });
              var lab = (s.lbl ? '' : (SPL[s.code] || s.code) + '  ') + 'Ε=' + K.gr(a) + ' Μ²';
              if (own) { var tw = measure(own.text, own.h * SC, false), q = xf([own.x, own.y]); tx(q[0] + tw / 2, q[1] - own.h * SC * 1.25 - 2.0, lab, 2.0, { al: 'c', b: true, ly: 'KAL_XOROI' }); }
              else tx(cc[0], cc[1] - 1.0, lab, 2.0, { al: 'c', b: true, ly: 'KAL_XOROI' });
            });
            (it.p.outline || []).forEach(function (i) { pl(D.ents[i].pts.map(xf), { closed: true, w: 0.5, c: COL.cov, ly: 'KAL_PERIGRAMMATA', pdfOnly: true }); });
            tx(ox + (it.bb[2] - it.bb[0]) * SC / 2, ybot - 5, planTitle(it.p.name), 3.1, { al: 'c', b: true, ly: 'KAL_EMBADA' });
            var ly = ybot - 10;
            it.lines.forEach(function (s) { tx(ox, ly, s, 2.5, { ly: 'KAL_EMBADA' }); ly -= 4.2; });
          });
        });
      }
      if (c.id === 'topo') {
        var bb = topoBB, ox = c.x + (c.w - (bb[2] - bb[0]) * SC) / 2, oy = (H0 - HEAD) / 2 - (bb[3] - bb[1]) * SC / 2;
        var xf = drawCl(topoCl, bb, ox, oy, null);
        topoXf = { bb: bb, ox: ox, oy: oy };
        var T = I.topo;
        (T.fyt || []).forEach(function (id) { fill(D.ents[id].pts.map(xf), COL.fyt, 0.28, 'KAL_FYTEYSH'); });
        (T.pras || []).forEach(function (id) { fill(D.ents[id].pts.map(xf), COL.pras, 0.22, 'KAL_PRASIA'); });
        (T.pool || []).forEach(function (id) { fill(D.ents[id].pts.map(xf), COL.pool, 0.3, 'KAL_PISINA'); });
        (T.cov || []).forEach(function (id) { var p = D.ents[id].pts.map(xf); hatch(p, 2.0, COL.cov, 'KAL_KALYPSI'); pl(p, { closed: true, w: 0.5, c: COL.cov, ly: 'KAL_KALYPSI', pdfOnly: true }); });
        if (T.plot != null) pl(D.ents[T.plot].pts.map(xf), { closed: true, w: 0.6, c: COL.plot, ly: 'TOPO_PROP', pdfOnly: true });
        // κορυφές Κ
        var kk = 0;
        (T.cov || []).forEach(function (id) {
          var P = D.ents[id].pts, cc = K.cent(P);
          P.forEach(function (p) { kk++; var a = Math.atan2(p[1] - cc[1], p[0] - cc[0]), q = xf(p); tx(q[0] + Math.cos(a) * 3.2, q[1] + Math.sin(a) * 3.2 - 1, 'K' + kk, 2.5, { al: 'c', b: true, c: COL.cov, ly: 'KAL_KORYFES' }); });
        });
        // ελάχιστες αποστάσεις ανά πλευρά
        (I.R.edges || []).forEach(function (e) {
          if (!e.seg || e.d < 0.05) return;
          var a = xf(e.seg[0]), b = xf(e.seg[1]); pl([a, b], { w: 0.25, c: COL.dist, ly: 'KAL_APOSTASEIS' });
          var ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
          var lab = (e.kind === 'rear' ? 'Δπρ=' : e.kind === 'front' ? 'πρόσωπο ' : 'δπρ=') + K.gr(e.d);
          tx((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 1.2, lab, 2.2, { al: 'c', rot: ang, c: COL.dist, ly: 'KAL_APOSTASEIS' });
        });
        (T.fronts || []).forEach(function (k) { var P = D.ents[T.plot].pts, a = xf(P[k]), b = xf(P[(k + 1) % P.length]); pl([a, b], { w: 0.9, c: '#f97316', ly: 'KAL_PROSOPO', pdfOnly: true }); });
      }
      if (c.id === 'syn') {
        var y = top;
        tabs.forEach(function (t) {
          var nb = Math.ceil(t.rows.length / 30), hr = 5.2;
          t.title.forEach(function (s, k) { tx(x0 + (nb * (TBW + 4) - 4) / 2, y - 4.6 - k * 5.2, s, 4.0, { al: 'c', b: true, ly: 'KAL_PINAKES' }); });
          y -= 5.2 * t.title.length + 3;
          var ybl = y;
          for (var b = 0; b < nb; b++) {
            var rows = t.rows.slice(b * 30, (b + 1) * 30), bx = x0 + b * (TBW + 4), w1 = 14, w2 = 39, w3 = TBW - w1 - w2;
            var hh = hr * (rows.length + 1);
            rect(bx, ybl - hh, bx + TBW, ybl, { w: 0.25, ly: 'KAL_PINAKES' });
            pl([[bx + w1, ybl], [bx + w1, ybl - hh]], { w: 0.18, ly: 'KAL_PINAKES' }); pl([[bx + w1 + w2, ybl], [bx + w1 + w2, ybl - hh]], { w: 0.18, ly: 'KAL_PINAKES' });
            pl([[bx, ybl - hr], [bx + TBW, ybl - hr]], { w: 0.18, ly: 'KAL_PINAKES' });
            tx(bx + w1 / 2, ybl - hr + 1.5, 'i', 3.0, { al: 'c', b: true, ly: 'KAL_PINAKES' });
            tx(bx + w1 + w2 / 2, ybl - hr + 1.5, 'X (m)', 3.0, { al: 'c', b: true, ly: 'KAL_PINAKES' });
            tx(bx + w1 + w2 + w3 / 2, ybl - hr + 1.5, 'Y (m)', 3.0, { al: 'c', b: true, ly: 'KAL_PINAKES' });
            rows.forEach(function (r, j) {
              var yy = ybl - hr * (j + 2) + 1.5;
              tx(bx + w1 / 2, yy, r[0], 3.0, { al: 'c', ly: 'KAL_PINAKES' });
              tx(bx + w1 + w2 / 2, yy, r[1].toFixed(3), 3.0, { al: 'c', ly: 'KAL_PINAKES' });
              tx(bx + w1 + w2 + w3 / 2, yy, r[2].toFixed(3), 3.0, { al: 'c', ly: 'KAL_PINAKES' });
            });
            y = Math.min(y, ybl - hh);
          }
          y -= 8;
        });
        // πινακίδα (υπόδειγμα ΥΠΕΝ)
        var P = I.P || {}, bx1 = c.x + MG, bx2 = c.x + c.w - MG, byTop = Math.min(y - 4, 330), byBot = MG;
        if (byTop - byBot < 210) byTop = byBot + 210;
        rect(bx1, byBot, bx2, byTop, { w: 0.5, ly: 'KAL_PINAKIDA' });
        var rowsT = [
          ['ΕΡΓΟΔΟΤΗΣ:', P.ergodotis || '', 14], ['ΕΡΓΟ:', P.ergo || '', 20], ['ΘΕΣΗ:', (P.thesi || '') + (P.kaek ? '\nΚΑΕΚ ' + P.kaek : ''), 18],
          ['ΜΕΛΕΤΗΤΕΣ', '', 8], ['Αρχιτεκτονική Μελέτη:', P.meletitis || '', 22], ['ΜΕΛΕΤΗ:', 'ΑΡΧΙΤΕΚΤΟΝΙΚΑ', 10],
          ['ΣΧΕΔΙΟ:', 'ΔΙΑΓΡΑΜΜΑ ΚΑΛΥΨΗΣ', 14], ['ΚΛΙΜΑΚΑ ΣΧΕΔΙΟΥ:', '1/100', 10]
        ];
        var yy = byTop;
        rowsT.forEach(function (r) {
          var hgt = r[2]; yy -= hgt;
          pl([[bx1, yy], [bx2, yy]], { w: 0.25, ly: 'KAL_PINAKIDA' });
          tx(bx1 + 3, yy + hgt - 4.4, r[0], 3.0, { ly: 'KAL_PINAKIDA' });
          String(r[1]).split('\n').forEach(function (s, k) { tx(bx1 + (r[0].length > 12 ? 52 : 34), yy + hgt - 4.6 - k * 5, s, r[0] === 'ΣΧΕΔΙΟ:' ? 4.4 : 3.4, { b: true, ly: 'KAL_PINAKIDA' }); });
          if (r[0] === 'ΣΧΕΔΙΟ:') { tx(bx2 - 3, yy + hgt - 4.4, 'ΑΡΙΘΜΟΣ ΣΧΕΔΙΟΥ', 2.6, { al: 'r', ly: 'KAL_PINAKIDA' }); tx(bx2 - 3, yy + 2.4, P.arSxediou || 'Δ_01', 4.0, { al: 'r', b: true, ly: 'KAL_PINAKIDA' }); }
        });
        // σφραγίδα / έλεγχος / ημερομηνία
        var ys = byBot + 12, mid = (bx1 + bx2) / 2;
        pl([[mid, yy], [mid, ys]], { w: 0.25, ly: 'KAL_PINAKIDA' });
        tx(bx1 + 3, yy - 4.4, 'ΣΦΡΑΓΙΔΑ:', 3.0, { ly: 'KAL_PINAKIDA' });
        tx(mid + 3, yy - 4.4, 'ΕΛΕΓΧΟΣ:', 3.0, { ly: 'KAL_PINAKIDA' });
        pl([[bx1, ys], [bx2, ys]], { w: 0.25, ly: 'KAL_PINAKIDA' });
        tx(bx1 + 3, byBot + 4.2, 'ΗΜΕΡΟΜΗΝΙΑ:', 3.0, { ly: 'KAL_PINAKIDA' });
        tx(bx2 - 3, byBot + 4.2, P.date || '', 3.4, { al: 'r', b: true, ly: 'KAL_PINAKIDA' });
      }
    });
    tx(3, 2.2, 'HEXIS-APP Διάγραμμα Κάλυψης · powered by BRB Development ΚΑΤΑΣΚΕΥΑΣΤΙΚΗ ΜΟΝ. Ι.Κ.Ε. · ' + ((I.P && I.P.date) || ''), 1.8, { c: '#6b7280', ly: 'KAL_PLAISIO' });
    return { W: W, H: H0, prims: prims, cols: cols, topoXf: topoXf, warn: warn };
  }

  /* ---------------- DXF από το φύλλο: μοντέλο σε μέτρα, το τοπογραφικό στις πραγματικές του συντεταγμένες ---------------- */
  function toDxf(sheet, Dxf2000) {
    var t = sheet.topoXf, dx = 0, dy = 0;
    if (t) { dx = t.bb[0] - t.ox / SC; dy = t.bb[1] - t.oy / SC; }
    var M = function (p) { return [p[0] / SC + dx, p[1] / SC + dy]; };
    var spec = { polys: [], texts: [], hatches: [], layers: {} };
    var LC = { KAL_PLAISIO: 7, KAL_KEIMENA: 7, KAL_OROI: 7, KAL_KALYPSI: 1, KAL_XOROI: 30, KAL_FYTEYSH: 3, KAL_PRASIA: 82, KAL_PISINA: 4, KAL_APOSTASEIS: 30, KAL_KORYFES: 1, KAL_PINAKES: 7, KAL_PINAKIDA: 7, KAL_EMBADA: 7, KAL_EIKONES: 8, KAL_SXEDIO: 6, KAL_PERIGRAMMATA: 1, KAL_PROSOPO: 30 };
    function L(n) { n = String(n || '0').replace(/[<>\/\\":;?*|=,]/g, '_'); if (!spec.layers[n]) spec.layers[n] = { color: LC[n] || 7 }; return n; }
    sheet.prims.forEach(function (p) {
      if (p.pdfOnly) return;
      if (p.t === 'pl') { var o = { layer: L(p.ly), pts: p.pts.map(M), closed: !!p.closed }; if (p.w >= 0.35) o.lw = Math.round(p.w * 100); spec.polys.push(o); }
      else if (p.t === 'tx') { var q = M([p.x, p.y]); spec.texts.push({ layer: L(p.ly), x: q[0], y: q[1], text: p.s, h: p.h / SC, rot: p.rot || 0, align: p.al === 'c' ? 'center' : p.al === 'r' ? 'right' : undefined }); }
      else if (p.t === 'hatch') spec.hatches.push({ layer: L(p.ly), pts: p.pts.map(M), pattern: true, angle: 45, spacing: p.sp / SC });
      else if (p.t === 'fill') spec.hatches.push({ layer: L(p.ly), pts: p.pts.map(M), transparency: 70 });
      else if (p.t === 'img') { var a = M([p.x, p.y]), b = M([p.x + p.w, p.y + p.h]); spec.polys.push({ layer: L('KAL_EIKONES'), pts: [a, [b[0], a[1]], b, [a[0], b[1]]], closed: true }); spec.texts.push({ layer: L('KAL_EIKONES'), x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, text: 'Εικόνα (στο PDF)', h: 0.4, align: 'center' }); }
    });
    return Dxf2000.build(spec, { prune: true, insunits: 6 });
  }

  var api = { build: build, toDxf: toDxf, hatchLines: hatchLines, SC: SC };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KalSheet = api;
})(typeof window !== 'undefined' ? window : globalThis);
