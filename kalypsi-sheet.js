/* HEXIS-APP · ΔΙΑΓΡΑΜΜΑ ΚΑΛΥΨΗΣ — σύνθεση φύλλου 1:100 (στοιχεία σε mm χαρτιού, y προς τα πάνω)
 * Από το ίδιο σύνολο στοιχείων βγαίνουν η προεπισκόπηση, το PDF και το DXF.
 * Διάταξη κατά τα Υποδείγματα 1 (εντός σχεδίου / οικισμοί) και 2 (εκτός σχεδίου) της εγκυκλίου ΥΠΕΝ 135179/4495/2022.
 * Περιεχόμενο κατά άρθ. 325 ν.5306/2026 (πρώην άρθ. 39 παρ. 3 ν.4495/2017) και υποδείγματα ΥΠΕΝ (εγκύκλιος 135179/4495/2022).
 */
(function (root) {
  'use strict';
  var K = root.KalEngine || (typeof require !== 'undefined' ? require('./kalypsi-engine.js') : null);
  var SC = 10; // 1:100 → 10 mm χαρτιού ανά μέτρο
  var HEAD = 17, MG = 6;
  var COL = { line: '#1f2937', plot: '#1d4ed8', cov: '#c81e1e', fyt: '#16a34a', pras: '#65a30d', pool: '#0891b2', dist: '#b45309', frame: '#111827' };
  var SPC = { H: '#f59e0b', X: '#38bdf8', K: '#8b5cf6', I: '#a78bfa', A: '#c4b5fd', F: '#14b8a6', P: '#94a3b8', E: '#0284c7', Y: '#cbd5e1', L: '#6366f1' };
  var SPL = { H: 'Η/Χ', X: 'ΕΞΩΣΤΗΣ', K: 'ΚΛΙΜ/ΣΙΟ', I: 'ΚΛΙΜ/ΣΙΟ', A: 'ΑΝ. ΚΛΙΜ.', F: 'ΦΩΤ/ΓΟΣ', P: 'Η-Μ/ΣΤΑΘΜ.', E: 'ΕΡΚΕΡ', Y: 'ΠΥΛΩΤΗ', L: 'ΑΝΕΛΚ.' };

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
  // περιοχές υποδειγμάτων ΥΠΕΝ (κλάσματα του πλαισίου: x0, y0 από πάνω, x1, y1)
  var TPL = {
    1: { name: 'ΥΠΟΔΕΙΓΜΑ 1: ΕΝΤΟΣ ΕΓΚΕΚΡΙΜΕΝΟΥ ΣΧΕΔΙΟΥ ΚΑΙ ΕΝΤΟΣ ΟΡΙΩΝ ΝΟΜΙΜΩΣ ΥΦΙΣΤΑΜΕΝΩΝ ΟΙΚΙΣΜΩΝ',
      sizes: [[1682, 705], [2000, 841], [2830, 1189]],
      R: { ideato: [0, 0, 0.2846, 0.3153, 'ΙΔΕΑΤΟ ΣΤΕΡΕΟ'], opseis: [0.2846, 0, 0.7862, 0.3153, 'ΣΧΗΜΑΤΙΚΕΣ ΟΨΕΙΣ'], erker: [0.7862, 0, 0.8795, 0.3153, 'ΕΛΕΓΧΟΣ ΕΡΚΕΡ'],
        text: [0.8795, 0, 1, 0.6098, null], title: [0.8795, 0.6098, 1, 1, null], topo: [0, 0.3153, 0.241, 1, 'ΔΙΑΜΟΡΦΩΣΗ ΠΕΡΙΒΑΛΛΟΝΤΟΣ ΧΩΡΟΥ'],
        plans: [0.241, 0.3153, 0.8795, 0.6834, 'ΚΑΤΟΨΕΙΣ'], view3d: [0.241, 0.6834, 0.4169, 1, '3D ΑΠΕΙΚΟΝΙΣΗ'], tomes: [0.4169, 0.6834, 0.8795, 1, 'ΣΧΗΜΑΤΙΚΕΣ ΤΟΜΕΣ'] } },
    2: { name: 'ΥΠΟΔΕΙΓΜΑ 2: ΕΚΤΟΣ ΕΓΚΕΚΡΙΜΕΝΟΥ ΣΧΕΔΙΟΥ ΚΑΙ ΕΚΤΟΣ ΟΡΙΩΝ ΝΟΜΙΜΩΣ ΥΦΙΣΤΑΜΕΝΩΝ ΠΡΟ ΤΟΥ ΕΤΟΥΣ 1923 ΟΙΚΙΣΜΩΝ',
      sizes: [[1189, 841], [1682, 1189]],
      R: { topo: [0, 0, 0.292, 1, 'ΔΙΑΜΟΡΦΩΣΗ ΠΕΡΙΒΑΛΛΟΝΤΟΣ ΧΩΡΟΥ'], plans: [0.292, 0, 0.544, 1, 'ΚΑΤΟΨΕΙΣ'], opseis: [0.544, 0, 0.807, 0.765, 'ΣΧΗΜΑΤΙΚΕΣ ΟΨΕΙΣ'],
        tomes: [0.544, 0.765, 0.807, 1, 'ΣΧΗΜΑΤΙΚΗ ΤΟΜΗ'], view3d: [0.807, 0, 1, 0.16, '3D ΑΠΕΙΚΟΝΙΣΗ'], text: [0.807, 0.16, 1, 0.67, null], title: [0.807, 0.67, 1, 1, null] } }
  };
  var SCALES = [100, 200, 250, 500, 1000];
  var RH = 9; // ύψος κεφαλίδας περιοχής (mm)
  function spaced(t) { return String(t).split('').join(' ').replace(/ {3}/g, '   '); }
  // αποκοπή τμήματος σε ορθογώνιο (Liang-Barsky)
  function clipSeg(a, b, r) {
    var t0 = 0, t1 = 1, dx = b[0] - a[0], dy = b[1] - a[1], p = [-dx, dx, -dy, dy], q = [a[0] - r[0], r[2] - a[0], a[1] - r[1], r[3] - a[1]];
    for (var i = 0; i < 4; i++) { if (p[i] === 0) { if (q[i] < 0) return null; } else { var t = q[i] / p[i]; if (p[i] < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; } } }
    return [[a[0] + t0 * dx, a[1] + t0 * dy], [a[0] + t1 * dx, a[1] + t1 * dy]];
  }
  function clipPoly(pts, closed, r) {
    var inside = pts.every(function (p) { return p[0] >= r[0] && p[0] <= r[2] && p[1] >= r[1] && p[1] <= r[3]; });
    if (inside) return [{ pts: pts, closed: closed }];
    var out = [], cur = null, n = pts.length, m = closed ? n : n - 1;
    for (var i = 0; i < m; i++) {
      var s = clipSeg(pts[i], pts[(i + 1) % n], r); if (!s) { cur = null; continue; }
      if (cur && Math.abs(cur[cur.length - 1][0] - s[0][0]) < 1e-9 && Math.abs(cur[cur.length - 1][1] - s[0][1]) < 1e-9) cur.push(s[1]);
      else { cur = [s[0], s[1]]; out.push({ pts: cur, closed: false }); }
    }
    return out;
  }

  /* in: { D, cls, topo, plans:[{cl,name,outline,spaces,lines}], secs:[cl], elevs:[cl], R, A, tpl, P, photos, measure, H0:'auto'|index, topoScale:'auto'|den, tplNo } */
  function build(I) {
    var D = I.D, measure = I.measure || function (t, s) { return String(t).length * s * 0.62; };
    var no = I.tplNo || (I.A && I.A.mode === 2 ? 2 : 1), T = TPL[no];
    var sizes = T.sizes, best = null;
    var forced = I.H0 != null && I.H0 !== 'auto' ? Math.min(+I.H0, sizes.length - 1) : null;
    for (var si = 0; si < sizes.length; si++) {
      if (forced != null && si !== forced) continue;
      var r = compose(I, T, no, sizes[si][0], sizes[si][1], measure);
      if (forced != null || r.ok || si === sizes.length - 1) { best = r; break; }
      if (!best || r.score < best.score) best = r;
    }
    return best;
  }
  function compose(I, T, no, W, H, measure) {
    var D = I.D, prims = [], warn = [], score = 0;
    function pl(pts, o) { prims.push(Object.assign({ t: 'pl', pts: pts, closed: false, w: 0.18, c: COL.line, ly: 'KAL_PLAISIO' }, o || {})); }
    function tx(x, y, s, h, o) { if (s === '' || s == null) return; prims.push(Object.assign({ t: 'tx', x: x, y: y, s: String(s), h: h, al: 'l', rot: 0, b: false, c: '#111827', ly: 'KAL_KEIMENA' }, o || {})); }
    function rect(x0, y0, x1, y1, o) { pl([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], Object.assign({ closed: true }, o || {})); }
    function fill(pts, c, a, ly, o) { prims.push(Object.assign({ t: 'fill', pts: pts, c: c, a: a, ly: ly }, o || {})); }
    function hatch(pts, sp, c, ly, o) { prims.push(Object.assign({ t: 'hatch', pts: pts, sp: sp, c: c, ly: ly }, o || {})); }
    var M0 = 8, FX = M0, FY = M0, FW = W - 2 * M0, FH = H - 2 * M0;
    var RG = {};
    Object.keys(T.R).forEach(function (k) { var f = T.R[k]; RG[k] = { x0: FX + f[0] * FW, x1: FX + f[2] * FW, y1: FY + (1 - f[1]) * FH, y0: FY + (1 - f[3]) * FH, t: f[4] }; });
    rect(0, 0, W, H, { w: 0.35, c: '#9ca3af' });
    rect(FX, FY, FX + FW, FY + FH, { w: 0.6, c: COL.frame });
    // πλαίσια & κεφαλίδες περιοχών
    Object.keys(RG).forEach(function (k) { var g = RG[k]; rect(g.x0, g.y0, g.x1, g.y1, { w: 0.35, c: COL.frame });
      if (g.t) { pl([[g.x0, g.y1 - RH], [g.x1, g.y1 - RH]], { w: 0.25, c: COL.frame }); tx((g.x0 + g.x1) / 2, g.y1 - RH + 2.6, spaced(g.t), 3.6, { al: 'c', b: true }); } });
    function inner(g) { return { x0: g.x0 + 4, x1: g.x1 - 4, y0: g.y0 + 4, y1: g.y1 - (g.t ? RH : 0) - 4 }; }
    var used = {};
    function scaleLabel(g, den) { if (g && den) { used[den] = 1; tx(g.x1 - 3, g.y1 - RH + 2.6, 'κλ. 1/' + den, 2.6, { al: 'r' }); } }

    // σχεδίαση cluster: κ = mm ανά μέτρο, περιοχή αποκοπής σε μέτρα (προαιρετικά)
    function drawCl(cl, bb, ox, oy, k, o) {
      o = o || {};
      var xf = function (p) { return [(p[0] - bb[0]) * k + ox, (p[1] - bb[1]) * k + oy]; };
      var clip = o.clip;
      cl.ents.forEach(function (i) { var e = D.ents[i]; if (e.extra) return;
        (clip ? clipPoly(e.pts, e.closed, clip) : [{ pts: e.pts, closed: e.closed }]).forEach(function (q) { pl(q.pts.map(xf), { closed: q.closed, w: 0.18, c: COL.line, ly: e.layer, src: true, topo: !!o.topo }); }); });
      cl.texts.forEach(function (i) { var t = D.texts[i];
        if (o.noTitle && (/ΚΑΤΟΨ|ΚΑΛΥΨΗ ΟΡΟΦ/.test(t.n || '') || /^\d{12}$/.test(String(t.text).trim()))) return;
        if (clip && (t.x < clip[0] || t.x > clip[2] || t.y < clip[1] || t.y > clip[3])) return;
        var p = xf([t.x, t.y]); tx(p[0], p[1], t.text, Math.min(o.maxTx || 3.5, Math.max(o.minTx || 0.9, t.h * k)), { rot: t.rot || 0, ly: t.layer, src: true, topo: !!o.topo }); });
      return xf;
    }
    // διάταξη αντικειμένων (σε σειρές) σε περιοχή με την πρώτη κλίμακα που χωρά
    function fitRow(g, items, prefer) {
      var r = inner(g), aw = r.x1 - r.x0, ah = r.y1 - r.y0, gap = 8;
      for (var si = 0; si < SCALES.length; si++) {
        var den = SCALES[si]; if (den < (prefer || 100)) continue; var k = 1000 / den;
        var rows = [], cur = null, ok = true;
        items.forEach(function (it) {
          var w = Math.max(it.mw * k, it.tw || 0), h = it.mh * k + (it.th || 0);
          if (w > aw || h > ah) ok = false;
          if (!cur || cur.w + gap + w > aw) { cur = { w: 0, h: 0, its: [] }; rows.push(cur); }
          it._w = w; it._h = h; it._x = cur.w + (cur.its.length ? gap : 0); cur.w = it._x + w; cur.h = Math.max(cur.h, h); cur.its.push(it);
        });
        var th = 0; rows.forEach(function (rw, j) { th += rw.h + (j ? gap : 0); });
        if (ok && th <= ah) {
          var y = r.y1; rows.forEach(function (rw) { var x = r.x0 + (aw - rw.w) / 2; rw.its.forEach(function (it) { it._ox = x + it._x; it._top = y; }); y -= rw.h + gap; });
          return { den: den, k: k };
        }
      }
      return null;
    }

    var R = I.R, A = I.A, KS = 'KAL_KEIMENA';
    // ---------- ΚΑΤΟΨΕΙΣ ----------
    if (RG.plans) {
      var g = RG.plans, items = (I.plans || []).map(function (p) {
        var cl = I.cls[p.cl], bb = K.bbGrow(cl.bb, 0.8), lines = [], maxL = 120;
        (p.lines || []).forEach(function (s) { wrap(s, maxL, 2.1, false, measure).forEach(function (w, k) { lines.push((k ? '   ' : '') + w); }); });
        var lw = 0; lines.forEach(function (s) { lw = Math.max(lw, measure(s, 2.1, false)); });
        return { p: p, cl: cl, bb: bb, mw: bb[2] - bb[0], mh: bb[3] - bb[1], tw: Math.max(lw, measure(planTitle(p.name), 2.8, true)), th: 7 + lines.length * 3.5 + 2, lines: lines };
      });
      if (items.length) {
        var f = fitRow(g, items, 100);
        if (!f) { warn.push('Οι κατόψεις δεν χωράνε ούτε σε 1:1000 — λιγότερα σχέδια ή μεγαλύτερο φύλλο.'); score += 100; }
        else {
          if (f.den > 100) { score += f.den / 100; warn.push('Κατόψεις σε κλίμακα 1/' + f.den + ' για να χωρέσουν στη θέση του υποδείγματος.'); }
          scaleLabel(g, f.den);
          items.forEach(function (it) {
            var ox = it._ox + (it._w - it.mw * f.k) / 2, oy = it._top - it.mh * f.k;
            var xf = drawCl(it.cl, it.bb, ox, oy, f.k, { noTitle: true });
            (it.p.spaces || []).forEach(function (s) {
              var wp = s.pts || D.ents[s.id].pts, pts = wp.map(xf); fill(pts, SPC[s.code] || '#cbd5e1', 0.35, 'KAL_XOROI');
              var cc = K.cent(pts); tx(cc[0], cc[1] - 0.8, (SPL[s.code] || s.code) + ' Ε=' + K.gr(K.area(wp)), Math.max(1.4, 1.8 * f.k / 10), { al: 'c', b: true, ly: 'KAL_XOROI' });
            });
            (it.p.outline || []).forEach(function (i) { pl(D.ents[i].pts.map(xf), { closed: true, w: 0.45, c: COL.cov, ly: 'KAL_PERIGRAMMATA', pdfOnly: true }); });
            var tx0 = it._ox, ty = oy - 4.5;
            tx(tx0, ty, planTitle(it.p.name), 2.8, { b: true, ly: 'KAL_EMBADA' }); ty -= 4.2;
            it.lines.forEach(function (s) { tx(tx0, ty, s, 2.1, { ly: 'KAL_EMBADA' }); ty -= 3.5; });
          });
        }
      } else tx((g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2, 'Δεν ορίστηκαν κατόψεις', 3, { al: 'c', c: '#6b7280' });
    }
    // ---------- ΤΟΜΕΣ / ΟΨΕΙΣ ----------
    function drawSet(g, ids, empty) {
      if (!g) return;
      var items = (ids || []).map(function (ci) { var cl = I.cls[ci], bb = K.bbGrow(cl.bb, 0.6); return { cl: cl, bb: bb, mw: bb[2] - bb[0], mh: bb[3] - bb[1], tw: 0, th: 2 }; });
      if (!items.length) { tx((g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2 - RH / 2, empty, 2.8, { al: 'c', c: '#6b7280' }); return; }
      var f = fitRow(g, items, 100);
      if (!f) { warn.push('Οι ' + g.t.toLowerCase() + ' δεν χωράνε.'); score += 100; return; }
      if (f.den > 100) { score += f.den / 100; warn.push(g.t + ' σε κλίμακα 1/' + f.den + '.'); }
      scaleLabel(g, f.den);
      items.forEach(function (it) { drawCl(it.cl, it.bb, it._ox + (it._w - it.mw * f.k) / 2, it._top - it.mh * f.k, f.k, {}); });
    }
    drawSet(RG.opseis, I.elevs, 'Δεν ανέβηκαν όψεις — γράψε στο DXF «ΝΟΤΙΑ ΟΨΗ» κ.λπ.');
    drawSet(RG.tomes, I.secs, 'Δεν ανέβηκαν τομές — γράψε στο DXF «ΤΟΜΗ Α-Α» κ.λπ.');
    // ---------- ΔΙΑΜΟΡΦΩΣΗ ΠΕΡΙΒΑΛΛΟΝΤΟΣ ΧΩΡΟΥ ----------
    var topoXf = null, egsa = [];
    if (RG.topo) {
      var g = RG.topo, r = inner(g), Tp = I.topo || {}, cl = Tp.cl != null ? I.cls[Tp.cl] : null;
      // πίνακες συντεταγμένων
      var tabs = [];
      function ptsOf(id) { return D.ents[id] ? D.ents[id].pts : []; }
      if (cl && Tp.plot != null) { var labs = I.plotLabels || []; tabs.push({ t: ['ΣΥΝΤΕΤΑΓΜΕΝΕΣ ΚΟΡΥΦΩΝ', (A.mode === 2 ? 'ΓΗΠΕΔΟΥ' : 'ΟΙΚΟΠΕΔΟΥ') + ' ΕΓΣΑ87'], rows: ptsOf(Tp.plot).map(function (p, i) { return [labs[i] || String(i + 1), p[0], p[1]]; }) }); }
      var kk = 0, rk = []; (Tp.cov || []).forEach(function (id) { ptsOf(id).forEach(function (p) { kk++; rk.push(['K' + kk, p[0], p[1]]); }); }); if (rk.length) tabs.push({ t: ['ΣΥΝΤΕΤΑΓΜΕΝΕΣ ΚΟΡΥΦΩΝ', 'ΚΤΙΡΙΟΥ ΕΓΣΑ87'], rows: rk });
      var kp = 0, rp = []; (Tp.pool || []).forEach(function (id) { ptsOf(id).forEach(function (p) { kp++; rp.push(['Π' + kp, p[0], p[1]]); }); }); if (rp.length) tabs.push({ t: ['ΣΥΝΤΕΤΑΓΜΕΝΕΣ ΚΟΡΥΦΩΝ', 'ΚΟΛΥΜΒ. ΔΕΞΑΜΕΝΗΣ ΕΓΣΑ87'], rows: rp });
      var TBW = 66, hr = 3.6, blocks = [];
      tabs.forEach(function (t) { for (var b = 0; b * 30 < t.rows.length; b++) blocks.push({ t: b ? null : t.t, rows: t.rows.slice(b * 30, b * 30 + 30) }); });
      var tabH = 0, tabsBox = null;
      if (blocks.length) {
        if (no === 1) { var perRow = Math.max(1, Math.floor((r.x1 - r.x0 + 3) / (TBW + 3))), nRows = Math.ceil(blocks.length / perRow), maxRows = 0; blocks.forEach(function (b) { maxRows = Math.max(maxRows, b.rows.length); });
          tabH = nRows * ((maxRows + 1) * hr + 8.5) + 2; tabsBox = { x0: r.x0, y1: r.y0 + tabH, perRow: perRow, maxRows: maxRows }; }
        else { var hh = 0; blocks.forEach(function (b) { hh += (b.rows.length + 1) * hr + (b.t ? 8.5 : 2) + 3; }); tabsBox = { col: true, x1: r.x1, y1: r.y0 + hh, h: hh }; }
      }
      var dr = { x0: r.x0, x1: no === 2 && tabsBox ? r.x1 - TBW - 4 : r.x1, y0: r.y0 + (no === 1 ? tabH : 0) + 2, y1: r.y1 };
      if (cl) {
        // περιοχή: οικόπεδο και γύρω του (όμορα, δρόμος), όχι όλο το Ο.Τ.
        var pb = Tp.plot != null && D.ents[Tp.plot] ? D.ents[Tp.plot].bb : cl.bb;
        (Tp.cov || []).forEach(function (id) { if (D.ents[id]) pb = K.bbUnion(pb, D.ents[id].bb); });
        var mg = Math.max(6, 0.35 * Math.max(pb[2] - pb[0], pb[3] - pb[1]));
        var clip = K.bbGrow(pb, mg); clip = [Math.max(clip[0], cl.bb[0] - 1), Math.max(clip[1], cl.bb[1] - 1), Math.min(clip[2], cl.bb[2] + 1), Math.min(clip[3], cl.bb[3] + 1)];
        var mw = clip[2] - clip[0], mh = clip[3] - clip[1], aw = dr.x1 - dr.x0, ah = dr.y1 - dr.y0, den = null;
        var forced = I.topoScale && I.topoScale !== 'auto' ? +I.topoScale : null;
        if (forced) den = forced; else for (var si = 0; si < SCALES.length; si++) { var kq = 1000 / SCALES[si]; if (mw * kq <= aw && mh * kq <= ah) { den = SCALES[si]; break; } }
        if (!den) { den = 1000; warn.push('Το τοπογραφικό δεν χωρά ούτε σε 1/1000.'); }
        var k = 1000 / den; if (forced && (mw * k > aw || mh * k > ah)) warn.push('Σε 1/' + den + ' το τοπογραφικό βγαίνει έξω από τη θέση του — διάλεξε «Αυτόματη» κλίμακα.');
        scaleLabel(g, den);
        var ox = dr.x0 + (aw - mw * k) / 2, oy = dr.y0 + (ah - mh * k) / 2;
        var xf = drawCl(cl, clip, ox, oy, k, { clip: clip, topo: true, minTx: 1.2 });
        // δρόμοι / Ο.Τ. / όμορα που σχεδιάστηκαν χωριστά: όσα πέφτουν στην περιοχή, κομμένα στα όριά της
        (I.cls || []).forEach(function (o) { if (o === cl || (o.kind !== 'other' && o.kind !== 'ignore')) return; var b = o.bb; if (b[2] < clip[0] || b[0] > clip[2] || b[3] < clip[1] || b[1] > clip[3]) return; drawCl(o, clip, ox, oy, k, { clip: clip, topo: true, minTx: 1.2 }); });
        topoXf = { bb: clip, ox: ox, oy: oy, k: k, den: den };
        (Tp.fyt || []).forEach(function (id) { if (D.ents[id]) fill(D.ents[id].pts.map(xf), COL.fyt, 0.28, 'KAL_FYTEYSH', { topo: true }); });
        (Tp.pras || []).forEach(function (id) { if (D.ents[id]) fill(D.ents[id].pts.map(xf), COL.pras, 0.22, 'KAL_PRASIA', { topo: true }); });
        (Tp.pool || []).forEach(function (id) { if (D.ents[id]) fill(D.ents[id].pts.map(xf), COL.pool, 0.3, 'KAL_PISINA', { topo: true }); });
        (Tp.cov || []).forEach(function (id) { if (!D.ents[id]) return; var p = D.ents[id].pts.map(xf); hatch(p, 2.0, COL.cov, 'KAL_KALYPSI', { topo: true }); pl(p, { closed: true, w: 0.5, c: COL.cov, ly: 'KAL_KALYPSI', topo: true }); });
        if (Tp.plot != null && D.ents[Tp.plot]) pl(D.ents[Tp.plot].pts.map(xf), { closed: true, w: 0.6, c: COL.plot, ly: 'TOPO_PROP', pdfOnly: true });
        var kn = 0; (Tp.cov || []).forEach(function (id) { if (!D.ents[id]) return; var P = D.ents[id].pts, cc = K.cent(P); P.forEach(function (p) { kn++; var a = Math.atan2(p[1] - cc[1], p[0] - cc[0]), q = xf(p); tx(q[0] + Math.cos(a) * 2.6, q[1] + Math.sin(a) * 2.6 - 0.8, 'K' + kn, 2.0, { al: 'c', b: true, c: COL.cov, ly: 'KAL_KORYFES', topo: true }); }); });
        (R.edges || []).forEach(function (e) {
          if (!e.seg || e.d < 0.05) return;
          var a = xf(e.seg[0]), b = xf(e.seg[1]); pl([a, b], { w: 0.25, c: COL.dist, ly: 'KAL_APOSTASEIS', topo: true });
          var ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
          tx((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 1.0, (e.kind === 'rear' ? 'Δπρ=' : e.kind === 'front' ? '' : 'δπρ=') + K.gr(e.d), 1.9, { al: 'c', rot: ang, c: COL.dist, ly: 'KAL_APOSTASEIS', topo: true });
        });
        (Tp.fronts || []).forEach(function (q) { var P = D.ents[Tp.plot].pts, a = xf(P[q]), b = xf(P[(q + 1) % P.length]); pl([a, b], { w: 0.9, c: '#f97316', ly: 'KAL_PROSOPO', pdfOnly: true }); });
        // αντίγραφο στις πραγματικές συντεταγμένες για το DXF
        cl.ents.forEach(function (i) { var e = D.ents[i]; if (!e.extra) egsa.push({ layer: e.layer, pts: e.pts, closed: e.closed }); });
        (Tp.cov || []).forEach(function (id) { if (D.ents[id]) egsa.push({ layer: 'KAL_KALYPSI', pts: D.ents[id].pts, closed: true }); });
      } else tx((dr.x0 + dr.x1) / 2, (dr.y0 + dr.y1) / 2, 'Δεν ορίστηκε τοπογραφικό', 3, { al: 'c', c: '#6b7280' });
      // σχεδίαση πινάκων
      function table(bx, ytop, b) {
        var y = ytop;
        if (b.t) { b.t.forEach(function (s, j) { tx(bx + TBW / 2, y - 3.2 - j * 3.4, s, 2.4, { al: 'c', b: true, ly: 'KAL_PINAKES' }); }); y -= 8.5; } else y -= 2;
        var hh = hr * (b.rows.length + 1), w1 = 10, w2 = 28;
        rect(bx, y - hh, bx + TBW, y, { w: 0.25, ly: 'KAL_PINAKES' });
        pl([[bx + w1, y], [bx + w1, y - hh]], { w: 0.18, ly: 'KAL_PINAKES' }); pl([[bx + w1 + w2, y], [bx + w1 + w2, y - hh]], { w: 0.18, ly: 'KAL_PINAKES' }); pl([[bx, y - hr], [bx + TBW, y - hr]], { w: 0.18, ly: 'KAL_PINAKES' });
        tx(bx + w1 / 2, y - hr + 1.0, 'Α/Α', 2.1, { al: 'c', b: true, ly: 'KAL_PINAKES' }); tx(bx + w1 + w2 / 2, y - hr + 1.0, 'X', 2.1, { al: 'c', b: true, ly: 'KAL_PINAKES' }); tx(bx + w1 + w2 + (TBW - w1 - w2) / 2, y - hr + 1.0, 'Y', 2.1, { al: 'c', b: true, ly: 'KAL_PINAKES' });
        b.rows.forEach(function (rw, j) { var yy = y - hr * (j + 2) + 1.0; tx(bx + w1 / 2, yy, rw[0], 2.1, { al: 'c', ly: 'KAL_PINAKES' }); tx(bx + w1 + w2 / 2, yy, rw[1].toFixed(3), 2.1, { al: 'c', ly: 'KAL_PINAKES' }); tx(bx + w1 + w2 + (TBW - w1 - w2) / 2, yy, rw[2].toFixed(3), 2.1, { al: 'c', ly: 'KAL_PINAKES' }); });
        return y - hh;
      }
      if (blocks.length && tabsBox) {
        if (!tabsBox.col) { var rowY = tabsBox.y1; for (var bi = 0; bi < blocks.length; bi += tabsBox.perRow) { var row = blocks.slice(bi, bi + tabsBox.perRow), totW = row.length * (TBW + 3) - 3, bx = r.x0 + (r.x1 - r.x0 - totW) / 2, low = rowY; row.forEach(function (b, j) { low = Math.min(low, table(bx + j * (TBW + 3), rowY, b)); }); rowY = low - 3; } }
        else { var yy = r.y0 + tabsBox.h, bx2 = r.x1 - TBW; blocks.forEach(function (b) { yy = table(bx2, yy, b) - 3; }); }
      }
    }
    // ---------- ΙΔΕΑΤΟ ΣΤΕΡΕΟ (σχηματικό) ----------
    if (RG.ideato) {
      var g = RG.ideato, r = inner(g), Hh = R.Hm || R.Hu || 0, Pw = A.P || 0;
      if (A.mode === 1 && Hh > 0) {
        var vs = Pw > 0 ? Math.max(1.5 * Pw, 7.5) : null, fr = null; (R.edges || []).forEach(function (e) { if (e.kind === 'front' && (fr == null || e.d < fr)) fr = e.d; }); fr = fr || 0;
        var dep = 12, tot = (Pw || 8) + fr + dep + 4, top = Math.max(Hh + (R.sx && R.sx.roof || 0), vs || 0) + 3, den = null;
        for (var si = 0; si < SCALES.length; si++) { var kq = 1000 / SCALES[si]; if (tot * kq <= r.x1 - r.x0 && top * kq <= r.y1 - r.y0 - 10) { den = SCALES[si]; break; } }
        den = den || 1000; var k = 1000 / den, ox = r.x0 + 4, oy = r.y0 + 10, X = function (m) { return ox + m * k; }, Y = function (m) { return oy + m * k; };
        var xr = (Pw || 8), xb = xr + fr; scaleLabel(g, den);
        pl([[X(0), Y(0)], [X(tot), Y(0)]], { w: 0.35, ly: 'KAL_IDEATO' });
        tx(X(xr / 2), Y(0) - 3.5, 'ΟΔΟΣ ' + (Pw ? 'Π=' + K.gr(Pw) + ' μ.' : '(δώσε Π στο βήμα 1)'), 2.0, { al: 'c', ly: 'KAL_IDEATO' });
        rect(X(xb), Y(0), X(xb + dep), Y(Hh), { w: 0.35, ly: 'KAL_IDEATO' }); hatch([[X(xb), Y(0)], [X(xb + dep), Y(0)], [X(xb + dep), Y(Hh)], [X(xb), Y(Hh)]], 2.5, '#9ca3af', 'KAL_IDEATO');
        pl([[X(xr), Y(0)], [X(xr), Y(top)]], { w: 0.18, c: '#6b7280', ly: 'KAL_IDEATO' }); tx(X(xr) - 1, Y(top) - 3, 'Ρ.Γ.', 1.8, { al: 'r', ly: 'KAL_IDEATO' });
        if (vs) { var run = Math.min(dep + 2, (top - vs) * 1.5); pl([[X(xb), Y(0)], [X(xb), Y(vs)], [X(xb + run), Y(vs + run / 1.5)]], { w: 0.5, c: '#dc2626', ly: 'KAL_IDEATO' }); tx(X(xb) - 1.2, Y(vs) - 1, '1,5Π=' + K.gr(vs) + ' μ.', 2.0, { al: 'r', c: '#dc2626', ly: 'KAL_IDEATO' }); }
        tx(X(xb + dep) + 1.5, Y(Hh) - 1, 'Η=' + K.gr(Hh) + ' μ.', 2.0, { ly: 'KAL_IDEATO' });
        tx(r.x0, r.y0 + 2, 'άρθ. 210 παρ. 5, 7 ν.5306/2026 — κατακόρυφο επίπεδο 1,5Π (≥ 7,50 μ.) και κεκλιμένο 1:1,50', 2.0, { c: '#4b5563', ly: 'KAL_IDEATO' });
      } else tx((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, A.mode === 1 ? 'Χρειάζεται ύψος κτιρίου (τομές ή βήμα 5)' : 'Δεν εφαρμόζεται (άρθ. 196)', 2.8, { al: 'c', c: '#6b7280' });
    }
    // ---------- ΕΛΕΓΧΟΣ ΕΡΚΕΡ ----------
    if (RG.erker) {
      var g = RG.erker, r = inner(g), y = r.y1 - 3, any = false;
      (R.lv || []).forEach(function (l) { l.sp.forEach(function (sp) { if (sp.code !== 'E') return; any = true; tx(r.x0, y, l.name + ': έρκερ Ε=' + K.gr(sp.a) + ' Μ²', 2.2, { ly: 'KAL_ERKER' }); y -= 3.8; }); });
      if (!any) { tx(r.x0, y, 'Δεν υπάρχουν κλειστοί εξώστες (έρκερ).', 2.2, { ly: 'KAL_ERKER' }); y -= 3.8; }
      wrap('Οι κλειστοί εξώστες μετρούν στη δόμηση και δεν μετρούν στην κάλυψη (άρθ. 207 παρ. 4β ν.5306/2026)· προεξοχή και πλάτος κατά άρθ. 211.', r.x1 - r.x0, 2.0, false, measure).forEach(function (s) { y -= 1; tx(r.x0, y, s, 2.0, { c: '#4b5563', ly: 'KAL_ERKER' }); y -= 3.2; });
    }
    // ---------- 3D ----------
    if (RG.view3d) {
      var g = RG.view3d, r = inner(g), ph = I.photos || [];
      if (!ph.length) tx((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, 'Ενδεικτική τρισδιάστατη απεικόνιση (άρθ. 325 ν.5306/2026)', 2.4, { al: 'c', c: '#6b7280' });
      else {
        var n = ph.length, aw = r.x1 - r.x0, ah = r.y1 - r.y0, bestL = null;
        for (var c2 = 1; c2 <= n; c2++) { var rws = Math.ceil(n / c2), cw = (aw - (c2 - 1) * 3) / c2, chh = (ah - (rws - 1) * 3) / rws, sz = 0; ph.forEach(function (p) { var s2 = Math.min(cw / p.w, chh / p.h); sz += s2 * s2 * p.w * p.h; }); if (!bestL || sz > bestL.sz) bestL = { c: c2, rws: rws, cw: cw, chh: chh, sz: sz }; }
        ph.forEach(function (p, i) { var cx = i % bestL.c, cy = Math.floor(i / bestL.c), s2 = Math.min(bestL.cw / p.w, bestL.chh / p.h), w = p.w * s2, h = p.h * s2, x = r.x0 + cx * (bestL.cw + 3) + (bestL.cw - w) / 2, y = r.y1 - cy * (bestL.chh + 3) - (bestL.chh + h) / 2;
          prims.push({ t: 'img', x: x, y: y, w: w, h: h, src: p.src, fmt: p.fmt, ly: 'KAL_EIKONES' }); rect(x, y, x + w, y + h, { w: 0.18, c: '#9ca3af', ly: 'KAL_EIKONES' }); });
      }
    }
    // ---------- ΚΕΙΜΕΝΑ (όροι, εμβαδομέτρηση, γενικά στοιχεία, υπεύθυνη δήλωση) ----------
    if (RG.text) {
      var g = RG.text, r = inner(g), aw = r.x1 - r.x0, ah = r.y1 - r.y0, fit = null;
      for (var fk = 1.8; fk >= 0.5; fk -= 0.05) {
        var TS = { h1: 3.0 * fk, h2: 2.4 * fk, n: 2.0 * fk }, L2 = [], hsum = 0;
        (I.tpl || []).forEach(function (l) { var s2 = TS[l.s] || TS.n, b = !!l.b || l.s === 'h1'; if (!l.t) { L2.push({ t: '', s: s2, lh: s2 * 0.8 }); hsum += s2 * 0.8; return; } wrap(l.t, aw, s2, b, measure).forEach(function (w, j) { L2.push({ t: (j ? '  ' : '') + w, s: s2, b: b, lh: s2 * 1.45, center: l.center, red: /ΥΠΕΡΒΑΣΗ/.test(w), h1: l.s === 'h1' }); hsum += s2 * 1.45; }); });
        if (hsum <= ah) { fit = L2; break; }
        fit = L2;
      }
      var yy = r.y1; fit.forEach(function (l) { yy -= l.lh; if (l.t && yy > r.y0 - 2) tx(l.center ? (r.x0 + r.x1) / 2 : r.x0, yy, l.t, l.s, { b: l.b, al: l.center ? 'c' : 'l', c: l.red ? '#b91c1c' : '#111827', ly: 'KAL_OROI' }); });
      if (yy < r.y0 - 2) { warn.push('Τα κείμενα δεν χωράνε ολόκληρα στη θέση του υποδείγματος — μεγαλύτερο φύλλο.'); score += 50; }
    }
    // ---------- ΠΙΝΑΚΙΔΑ ----------
    if (RG.title) {
      var g = RG.title, P = I.P || {}, x0 = g.x0 + 3, x1 = g.x1 - 3, gh = g.y1 - g.y0, y = g.y1 - 4;
      wrap(T.name, x1 - x0, 2.6, true, measure).forEach(function (s) { y -= 3.6; tx(x1, y, s, 2.6, { al: 'r', b: true, ly: 'KAL_PINAKIDA' }); });
      y -= 4; pl([[g.x0, y], [g.x1, y]], { w: 0.25, ly: 'KAL_PINAKIDA' });
      var rowsT = [['ΕΡΓΟΔΟΤΗΣ:', P.ergodotis || ''], ['ΕΡΓΟ:', P.ergo || ''], ['ΘΕΣΗ:', (P.thesi || '') + (P.kaek ? ' · ΚΑΕΚ ' + P.kaek : '')], ['ΜΕΛΕΤΗΤΕΣ', ''], ['Αρχιτεκτονική Μελέτη:', P.meletitis || '']];
      var lab = 30, vw = x1 - x0 - lab;
      rowsT.forEach(function (rw) { var vl = rw[1] ? wrap(String(rw[1]), vw, 2.6, true, measure) : ['']; var hh = Math.max(7, vl.length * 3.6 + 3.5); y -= hh; tx(x0, y + hh - 4, rw[0], 2.2, { ly: 'KAL_PINAKIDA' }); vl.forEach(function (s, j) { tx(x0 + lab, y + hh - 4 - j * 3.6, s, 2.6, { b: true, ly: 'KAL_PINAKIDA' }); }); pl([[g.x0, y], [g.x1, y]], { w: 0.18, ly: 'KAL_PINAKIDA' }); });
      y -= 9; tx(x0, y + 5, 'ΜΕΛΕΤΗ:', 2.2, { ly: 'KAL_PINAKIDA' }); tx(x1, y + 5, 'ΑΡΧΙΤΕΚΤΟΝΙΚΑ', 2.6, { al: 'r', b: true, ly: 'KAL_PINAKIDA' });
      y -= 9; tx(x0, y + 5, 'ΣΧΕΔΙΟ:', 2.2, { ly: 'KAL_PINAKIDA' }); tx(x0 + lab, y + 4.5, 'ΔΙΑΓΡΑΜΜΑ ΚΑΛΥΨΗΣ', 3.2, { b: true, ly: 'KAL_PINAKIDA' }); tx(x1, y + 7.5, 'ΑΡΙΘΜΟΣ ΣΧΕΔΙΟΥ', 1.8, { al: 'r', ly: 'KAL_PINAKIDA' }); tx(x1, y + 2.5, P.arSxediou || 'Α_00', 3.0, { al: 'r', b: true, ly: 'KAL_PINAKIDA' });
      pl([[g.x0, y], [g.x1, y]], { w: 0.25, ly: 'KAL_PINAKIDA' });
      y -= 8; tx(x0, y + 3, 'ΚΛΙΜΑΚΑ ΣΧΕΔΙΟΥ:', 2.2, { ly: 'KAL_PINAKIDA' }); tx(x1, y + 3, (Object.keys(used).map(Number).sort(function (a, b) { return a - b; }).map(function (d) { return '1/' + d; }).join(' · ')) || '1/100', 2.4, { al: 'r', ly: 'KAL_PINAKIDA' });
      pl([[g.x0, y], [g.x1, y]], { w: 0.25, ly: 'KAL_PINAKIDA' });
      var mid = (g.x0 + g.x1) / 2, ys = g.y0 + 9; pl([[mid, y], [mid, ys]], { w: 0.25, ly: 'KAL_PINAKIDA' });
      tx(x0, y - 4, 'ΣΦΡΑΓΙΔΑ:', 2.2, { ly: 'KAL_PINAKIDA' }); tx(mid + 3, y - 4, 'ΕΛΕΓΧΟΣ:', 2.2, { ly: 'KAL_PINAKIDA' });
      pl([[g.x0, ys], [g.x1, ys]], { w: 0.25, ly: 'KAL_PINAKIDA' }); tx(x0, g.y0 + 3, 'ΗΜΕΡΟΜΗΝΙΑ:', 2.2, { ly: 'KAL_PINAKIDA' }); tx(x1, g.y0 + 3, P.date || '', 2.6, { al: 'r', b: true, ly: 'KAL_PINAKIDA' });
      if (y - ys < 20) { warn.push('Η πινακίδα είναι στενή σε αυτό το μέγεθος φύλλου.'); }
    }
    tx(FX, 2.4, 'HEXIS-APP Διάγραμμα Κάλυψης · powered by BRB Development ΚΑΤΑΣΚΕΥΑΣΤΙΚΗ ΜΟΝ. Ι.Κ.Ε. · ' + ((I.P && I.P.date) || ''), 1.8, { c: '#6b7280', ly: 'KAL_PLAISIO' });
    return { W: W, H: H, prims: prims, cols: Object.keys(RG), topoXf: topoXf, egsa: egsa, warn: warn, ok: score < 1, score: score, tpl: no };
  }

  /* ---------------- DXF από το φύλλο: μοντέλο σε μέτρα, το τοπογραφικό στις πραγματικές του συντεταγμένες ---------------- */
  function toDxf(sheet, Dxf2000) {
    var t = sheet.topoXf, dx = 0, dy = 0, kk = SC;
    // αν το τοπογραφικό είναι σε 1:100, όλο το φύλλο μπαίνει έτσι ώστε το τοπογραφικό να κάθεται στο ΕΓΣΑ87
    var align = t && Math.abs(t.k - SC) < 1e-9;
    if (align) { dx = t.bb[0] - t.ox / SC; dy = t.bb[1] - t.oy / SC; }
    var M = function (p) { return [p[0] / kk + dx, p[1] / kk + dy]; };
    var spec = { polys: [], texts: [], hatches: [], layers: {} };
    var LC = { KAL_PLAISIO: 7, KAL_KEIMENA: 7, KAL_OROI: 7, KAL_KALYPSI: 1, KAL_XOROI: 30, KAL_FYTEYSH: 3, KAL_PRASIA: 82, KAL_PISINA: 4, KAL_APOSTASEIS: 30, KAL_KORYFES: 1, KAL_PINAKES: 7, KAL_PINAKIDA: 7, KAL_EMBADA: 7, KAL_EIKONES: 8, KAL_SXEDIO: 6, KAL_PERIGRAMMATA: 1, KAL_PROSOPO: 30, KAL_IDEATO: 1, KAL_ERKER: 7, KAL_EGSA87: 5 };
    function L(n) { n = String(n || '0').replace(/[<>\/\\":;?*|=,]/g, '_'); if (!spec.layers[n]) spec.layers[n] = { color: LC[n] || 7 }; return n; }
    sheet.prims.forEach(function (p) {
      if (p.pdfOnly) return;
      if (p.t === 'pl') { var o = { layer: L(p.ly), pts: p.pts.map(M), closed: !!p.closed }; if (p.w >= 0.35) o.lw = Math.round(p.w * 100); spec.polys.push(o); }
      else if (p.t === 'tx') { var q = M([p.x, p.y]); spec.texts.push({ layer: L(p.ly), x: q[0], y: q[1], text: p.s, h: p.h / kk, rot: p.rot || 0, align: p.al === 'c' ? 'center' : p.al === 'r' ? 'right' : undefined }); }
      else if (p.t === 'hatch') spec.hatches.push({ layer: L(p.ly), pts: p.pts.map(M), pattern: true, angle: 45, spacing: p.sp / kk });
      else if (p.t === 'fill') spec.hatches.push({ layer: L(p.ly), pts: p.pts.map(M), transparency: 70 });
      else if (p.t === 'img') { var a = M([p.x, p.y]), b = M([p.x + p.w, p.y + p.h]); spec.polys.push({ layer: L('KAL_EIKONES'), pts: [a, [b[0], a[1]], b, [a[0], b[1]]], closed: true }); spec.texts.push({ layer: L('KAL_EIKONES'), x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, text: 'Εικόνα (στο PDF)', h: 0.4, align: 'center' }); }
    });
    // τοπογραφικό σε άλλη κλίμακα: επιπλέον αντίγραφο στις πραγματικές συντεταγμένες ΕΓΣΑ87
    if (!align && sheet.egsa && sheet.egsa.length) sheet.egsa.forEach(function (e) { spec.polys.push({ layer: L(e.layer === 'KAL_KALYPSI' ? 'KAL_KALYPSI' : 'KAL_EGSA87'), pts: e.pts, closed: e.closed }); });
    return Dxf2000.build(spec, { prune: true, insunits: 6 });
  }

  var api = { build: build, toDxf: toDxf, hatchLines: hatchLines, SC: SC, TPL: TPL };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KalSheet = api;
})(typeof window !== 'undefined' ? window : globalThis);
