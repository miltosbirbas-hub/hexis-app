/* HEXIS-APP · ΔΙΑΓΡΑΜΜΑ ΚΑΛΥΨΗΣ — μηχανή (αναγνώριση DXF, κανόνες ν.5306/2026, κείμενο υποδείγματος ΥΠΕΝ)
 * Χωρίς DOM: δοκιμάζεται και σε node. powered by BRB Development ΚΑΤΑΣΚΕΥΑΣΤΙΚΗ ΜΟΝ. Ι.Κ.Ε.
 *
 * Πηγές κανόνων (ίδιες με την εφαρμογή Νομοθεσία του HEXIS-APP):
 *  - ν.5306/2026 «Κώδικας Χωροταξίας και Πολεοδομίας» (ΦΕΚ Α' 88/08.06.2026): άρθ. 197, 198, 206, 207, 208, 209, 210,
 *    211, 212, 221, 222, 223, 251, 325 (ΝΟΚ ν.4067/2012 κωδικοποιημένος στα άρθ. 195-225)
 *  - Κτιριοδομικός Κανονισμός, ΥΑ ΥΠΕΝ/ΔΑΟΚΑ/66006/2360 (ΦΕΚ Β' 3985/2023), τροπ. ΦΕΚ Β' 6995/2025
 *  - Εγκύκλιος ΥΠΕΝ/ΔΑΟΚΑ/135179/4495/20.12.2022 «Έγκριση διαγράμματος κάλυψης...» + Υποδείγματα 1 (εντός) και 2 (εκτός)
 */
(function (root) {
  'use strict';

  /* ---------------- γεωμετρία ---------------- */
  function area(pts) { var s = 0, n = pts.length; for (var i = 0; i < n; i++) { var p = pts[i], q = pts[(i + 1) % n]; s += p[0] * q[1] - q[0] * p[1]; } return Math.abs(s / 2); }
  function cent(pts) {
    var a = 0, cx = 0, cy = 0, n = pts.length;
    for (var i = 0; i < n; i++) { var p = pts[i], q = pts[(i + 1) % n], c = p[0] * q[1] - q[0] * p[1]; a += c; cx += (p[0] + q[0]) * c; cy += (p[1] + q[1]) * c; }
    if (Math.abs(a) < 1e-9) { var sx = 0, sy = 0; pts.forEach(function (p) { sx += p[0]; sy += p[1]; }); return [sx / n, sy / n]; }
    return [cx / (3 * a), cy / (3 * a)];
  }
  function bbox(pts) { var b = [1e30, 1e30, -1e30, -1e30]; pts.forEach(function (p) { if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1]; if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1]; }); return b; }
  function bbUnion(a, b) { return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]; }
  function bbGrow(b, m) { return [b[0] - m, b[1] - m, b[2] + m, b[3] + m]; }
  function pip(p, pts) {
    var inn = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if (((yi > p[1]) !== (yj > p[1])) && (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi)) inn = !inn;
    }
    return inn;
  }
  function ptseg(p, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    if (l2 < 1e-12) return [a[0], a[1]];
    var t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2; t = Math.max(0, Math.min(1, t));
    return [a[0] + t * dx, a[1] + t * dy];
  }
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function dpoly(p, pts) { var d = 1e30; for (var i = 0; i < pts.length; i++) d = Math.min(d, dist(p, ptseg(p, pts[i], pts[(i + 1) % pts.length]))); return d; }
  function inside(pts, outer) { return pts.every(function (v) { return pip(v, outer) || dpoly(v, outer) < 0.05; }); }
  // ελάχιστη απόσταση ανάμεσα σε πλευρά (a,b) και πολύγωνο: σημεία (από, προς)
  function edgeMin(a, b, poly) {
    var best = null, bd = 1e30;
    poly.forEach(function (v) { var c = ptseg(v, a, b), d = dist(c, v); if (d < bd) { bd = d; best = [c, v]; } });
    for (var j = 0; j < poly.length; j++) {
      var u = poly[j], w = poly[(j + 1) % poly.length];
      [a, b].forEach(function (e) { var c = ptseg(e, u, w), d = dist(e, c); if (d < bd) { bd = d; best = [e, c]; } });
    }
    return { d: bd, seg: best };
  }

  /* ---------------- κείμενα ---------------- */
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[΄`´’']/g, "'").replace(/\s+/g, ' ').trim(); }
  function cleanMtext(s) {
    return String(s || '').replace(/\\P/g, ' ').replace(/\\[A-Za-z][^;\\{}]*;/g, '').replace(/\\[A-Za-z]/g, '').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
  }
  var EGSA = function (b) { return b[0] > 100000 && b[2] < 1100000 && b[1] > 3800000 && b[3] < 4700000; };

  /* ---------------- προετοιμασία DXF ---------------- */
  // parsed: έξοδος Dxf2000.parse → { ents:[{id,layer,pts,closed,bb,area}], texts:[{id,x,y,h,text,n,rot}] }
  function prepare(parsed) {
    var ents = [], texts = [];
    (parsed.polys || []).forEach(function (p) {
      var pts = p.pts.filter(function (q) { return isFinite(q[0]) && isFinite(q[1]); });
      if (pts.length < 2) return;
      var closed = !!p.closed;
      if (pts.length > 3 && dist(pts[0], pts[pts.length - 1]) < 1e-6) { pts = pts.slice(0, -1); closed = true; }
      var e = { id: ents.length, layer: String(p.layer || '0'), L: norm(p.layer), pts: pts, closed: closed && pts.length >= 3, bb: bbox(pts) };
      e.area = e.closed ? area(pts) : 0;
      ents.push(e);
    });
    (parsed.texts || []).forEach(function (t) {
      if (!isFinite(t.x) || !isFinite(t.y)) return;
      var tx = cleanMtext(t.text); if (!tx) return;
      texts.push({ id: texts.length, x: t.x, y: t.y, h: t.h || 0.25, rot: t.rot || 0, text: tx, n: norm(tx), layer: t.layer || '0' });
    });
    return { ents: ents, texts: texts };
  }

  /* ---------------- ομαδοποίηση σε σχέδια ---------------- */
  function cluster(D, gap) {
    gap = gap || 1.5;
    var n = D.ents.length, par = new Int32Array(n);
    for (var i = 0; i < n; i++) par[i] = i;
    function f(x) { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; }
    function u(a, b) { a = f(a); b = f(b); if (a !== b) par[b] = a; }
    var cell = Math.max(2, gap * 2), grid = new Map();
    D.ents.forEach(function (e) {
      var b = e.bb, w = b[2] - b[0], h = b[3] - b[1];
      if (w > 400 || h > 400) { e.huge = true; return; } // πλαίσια / γραμμές-σκουπίδια δεν ενώνουν σχέδια
      var x0 = Math.floor((b[0] - gap) / cell), x1 = Math.floor((b[2] + gap) / cell), y0 = Math.floor((b[1] - gap) / cell), y1 = Math.floor((b[3] + gap) / cell);
      if ((x1 - x0 + 1) * (y1 - y0 + 1) > 4000) { e.huge = true; return; }
      for (var gx = x0; gx <= x1; gx++) for (var gy = y0; gy <= y1; gy++) {
        var k = gx + ',' + gy, c = grid.get(k);
        if (c === undefined) grid.set(k, e.id); else u(c, e.id);
      }
    });
    var map = {}, cls = [];
    D.ents.forEach(function (e) {
      if (e.huge) return;
      var r = f(e.id), c = map[r];
      if (!c) { c = map[r] = { id: cls.length, ents: [], texts: [], bb: e.bb.slice() }; cls.push(c); }
      c.ents.push(e.id); c.bb = bbUnion(c.bb, e.bb); e.cl = c.id;
    });
    // κείμενα: στο σχέδιο που τα περιέχει, αλλιώς στο κοντινότερο (τίτλοι κάτω από τα σχέδια)
    D.texts.forEach(function (t) {
      var best = null, bd = 1e30;
      cls.forEach(function (c) {
        var b = c.bb, dx = Math.max(b[0] - t.x, 0, t.x - b[2]), dy = Math.max(b[1] - t.y, 0, t.y - b[3]), d = Math.hypot(dx, dy);
        if (d < bd) { bd = d; best = c; }
      });
      if (best && bd <= Math.max(6, 12 * t.h)) { best.texts.push(t.id); t.cl = best.id; }
    });
    // μικρά σκόρπια κομμάτια (π.χ. ένα βέλος βορρά) δεν είναι σχέδια
    cls.forEach(function (c) { c.small = c.ents.length < 3 && (c.bb[2] - c.bb[0]) < 3 && (c.bb[3] - c.bb[1]) < 3; });
    return cls;
  }

  /* ---------------- αναγνώριση είδους & ορόφου από τον τίτλο ---------------- */
  var ORD = { 'Α': 1, 'Β': 2, 'Γ': 3, 'Δ': 4, 'Ε': 5, 'ΣΤ': 6, 'Ζ': 7 };
  function levelFromText(n) {
    if (/ΥΠΟΣΚΑΦ/.test(n)) return { name: 'Υπόσκαφο', typ: 4, use: 1, ord: -0.5 };
    if (/ΥΠΟΓΕΙ/.test(n)) { var m0 = /(Β|2)'?\s*ΥΠΟΓΕΙ/.test(n); return { name: m0 ? "Β' Υπόγειο" : 'Υπόγειο', typ: 2, use: 1, ord: m0 ? -2 : -1 }; }
    if (/ΗΜΙΩΡΟΦ|ΠΑΤΑΡ|ΕΣΩΤΕΡΙΚΟΣ ΕΞΩΣΤ/.test(n)) return { name: 'Πατάρι', typ: 5, use: 0, ord: 0.5 };
    if (/ΙΣΟΓΕΙ/.test(n)) return { name: 'Ισόγειο', typ: 1, use: 0, ord: 0 };
    if (/ΣΟΦΙΤ/.test(n)) return { name: 'Σοφίτα', typ: 3, use: 0, ord: 50 };
    if (/ΔΩΜΑ|ΣΤΕΓΗ|ΣΤΕΓΗΣ/.test(n)) return { name: /ΣΤΕΓ/.test(n) ? 'Στέγη' : 'Δώμα', typ: 9, use: 0, ord: 60 };
    var m = /(^|[^Α-Ω])(ΣΤ|Α|Β|Γ|Δ|Ε|Ζ)'?\s*ΟΡΟΦ/.exec(n);
    if (m) return { name: m[2] + "' Όροφος", typ: 1, use: 0, ord: ORD[m[2]] || 1 };
    var m2 = /(\d)\s*(ΟΣ|Ο)?\s*ΟΡΟΦ/.exec(n);
    if (m2) { var k = +m2[1], L = ['', 'Α', 'Β', 'Γ', 'Δ', 'Ε', 'ΣΤ', 'Ζ'][k] || String(k); return { name: L + "' Όροφος", typ: 1, use: 0, ord: k }; }
    if (/ΠΡΩΤ.{0,3}ΟΡΟΦ/.test(n)) return { name: "Α' Όροφος", typ: 1, use: 0, ord: 1 };
    if (/ΔΕΥΤΕΡ.{0,3}ΟΡΟΦ/.test(n)) return { name: "Β' Όροφος", typ: 1, use: 0, ord: 2 };
    return null;
  }
  function recognize(D, cls) {
    cls.forEach(function (c) {
      var tx = c.texts.map(function (i) { return D.texts[i]; }).sort(function (a, b) { return b.h - a.h; });
      var kind = null, label = '', lev = null;
      // τοπογραφικό: TOPO_PROP / όρια / ΕΓΣΑ87
      var hasProp = c.ents.some(function (i) { return /^(TOPO_PROP|BOUND_)/.test(D.ents[i].L); });
      if (hasProp || EGSA(c.bb)) kind = 'topo';
      for (var k = 0; k < tx.length && !kind; k++) {
        var n = tx[k].n;
        if (/ΤΟΠΟΓΡΑΦ|ΔΙΑΜΟΡΦΩΣΗ ΠΕΡΙΒΑΛ|ΔΙΑΓΡΑΜΜΑ ΔΙΑΜΟΡΦ/.test(n)) { kind = 'topo'; label = tx[k].text; break; }
        if (/(^|\s)ΤΟΜΗ/.test(n)) { kind = 'section'; label = tx[k].text; break; }
        if (/(^|\s)ΟΨΗ|ΟΨΕΙΣ/.test(n)) { kind = 'elev'; label = tx[k].text; break; }
        var L = levelFromText(n);
        if (L && (/ΚΑΤΟΨ/.test(n) || tx[k].h >= 0.3 || n.length < 30)) { kind = L.typ === 9 ? 'roof' : 'plan'; lev = L; label = tx[k].text; break; }
      }
      if (!kind) kind = c.small ? 'ignore' : 'other';
      if (kind === 'topo' && !label) label = 'Τοπογραφικό';
      c.kind = kind; c.label = label || ''; c.level = lev;
      if (lev) c.level.h = lev.typ === 3 ? 2.0 : 3.2;
    });
    // ένα τοπογραφικό: το μεγαλύτερο
    var topos = cls.filter(function (c) { return c.kind === 'topo'; });
    if (topos.length > 1) {
      topos.sort(function (a, b) { return b.ents.length - a.ents.length; });
      topos.slice(1).forEach(function (c) { c.kind = 'other'; });
    }
    return cls;
  }

  /* ---------------- αναγνώριση στο τοπογραφικό ---------------- */
  function rx(s) { return new RegExp(s); }
  var LAY = {
    plot: /^(TOPO_PROP|BOUND_IMPL|BOUND_UNIMPL|KAL_OIKOPEDO)$|OIKOP|GHPED|ΟΙΚΟΠ|ΓΗΠΕΔ|PLOT/,
    build: /KTIR|KTHR|BUILD|WALL|TOIX|KATOP|PERIG|ΚΤΙΡ|ΚΤΗΡ|ΤΟΙΧ|ΚΑΤΟΨ|ΠΕΡΙΓ|KALYPS|ΚΑΛΥΨ/,
    fyt: /FYT|PRASIN|GREEN|KHP|ΦΥΤ|ΠΡΑΣΙΝ|ΚΗΠ|PLANT/,
    pras: /PRASIA|ΠΡΑΣΙΑ/,
    pool: /POOL|KOLYMB|ΚΟΛΥΜΒ|PISIN|ΠΙΣΙΝ/
  };
  var TXT = {
    build: /ΚΑΤΟΙΚΙΑ|ΚΤΙΡΙΟ|ΚΤΗΡΙΟ|ΚΤΙΣΜΑ|ΚΤΗΡΙΟ|ΟΙΚΙΑ|ΚΑΛΥΨΗ/,
    fyt: /ΦΥΤΕΥΣ|ΠΡΑΣΙΝΟ|ΚΗΠΟΣ|ΓΚΑΖΟΝ|ΦΥΤΕΜΕΝ/,
    pras: /ΠΡΑΣΙΑ/,
    pool: /ΚΟΛΥΜΒ|ΠΙΣΙΝΑ/
  };
  function closedIn(D, c) { return c.ents.map(function (i) { return D.ents[i]; }).filter(function (e) { return e.closed && e.area > 0.2; }); }
  function textIn(D, c, re, poly) {
    return c.texts.some(function (i) { var t = D.texts[i]; return re.test(t.n) && pip([t.x, t.y], poly.pts); });
  }
  function smallestContaining(cands, p, excl) {
    var best = null;
    cands.forEach(function (e) { if (excl && excl[e.id]) return; if (pip(p, e.pts) && (!best || e.area < best.area)) best = e; });
    return best;
  }
  function topoDetect(D, c) {
    var cs = closedIn(D, c), res = { plot: null, cov: [], fyt: [], pras: [], pool: [] };
    var pl = cs.filter(function (e) { return LAY.plot.test(e.L); }).sort(function (a, b) { return b.area - a.area; })[0];
    if (!pl) pl = cs.filter(function (e) { return e.area > 80; }).sort(function (a, b) { return b.area - a.area; })[0];
    if (!pl) return res;
    res.plot = pl.id;
    var inn = cs.filter(function (e) { return e.id !== pl.id && e.area < pl.area * 0.95 && inside(e.pts, pl.pts); });
    function pick(lay, txt) { return inn.filter(function (e) { return lay.test(e.L) || textIn(D, c, txt, e); }); }
    res.pool = pick(LAY.pool, TXT.pool).map(function (e) { return e.id; });
    res.pras = pick(LAY.pras, TXT.pras).map(function (e) { return e.id; });
    res.fyt = pick(LAY.fyt, TXT.fyt).filter(function (e) { return res.pras.indexOf(e.id) < 0; }).map(function (e) { return e.id; });
    var used = {}; res.pool.concat(res.pras, res.fyt).forEach(function (i) { used[i] = 1; });
    var b = inn.filter(function (e) { return !used[e.id] && e.area >= 4 && (LAY.build.test(e.L) || textIn(D, c, TXT.build, e)); });
    if (!b.length) b = inn.filter(function (e) { return !used[e.id] && e.area >= 15; });
    // μόνο τα εξωτερικά
    b.sort(function (x, y) { return y.area - x.area; });
    var keep = [];
    b.forEach(function (e) { var cc = cent(e.pts); if (!keep.some(function (k) { return pip(cc, k.pts); })) keep.push(e); });
    res.cov = keep.map(function (e) { return e.id; });
    return res;
  }

  /* ---------------- αναγνώριση σε κάτοψη ---------------- */
  var SP = [
    ['A', /ΑΝΟΙΚΤ.{0,4}ΚΛΙΜ|ΕΞΩΤΕΡ.{0,6}ΚΛΙΜ|ΑΝΟΙΧΤ.{0,4}ΚΛΙΜ/],
    ['K', /ΚΟΙΝΟΧΡ.{0,10}ΚΛΙΜ|ΚΛΙΜ.{0,14}ΚΟΙΝΟΧΡ/],
    ['I', /ΚΛΙΜΑΚ|ΣΚΑΛΑ/],
    ['H', /Η\/Χ|Η\.Χ\.?|ΗΜΙΥΠΑΙΘΡ|ΗΜΙΥΠ\/Χ|^Η\s?Χ$/],
    ['X', /ΕΞΩΣΤ|ΒΕΡΑΝΤ|ΜΠΑΛΚΟΝ/],
    ['F', /ΦΩΤΑΓ|ΑΙΘΡΙ|ΦΡΕΑΤ|ΑΓΩΓΟΣ ΑΕΡ|ΚΑΠΝΟΔ/],
    ['P', /ΣΤΑΘΜΕΥΣ|ΘΕΣΗ ΣΤΑΘΜ|ΓΚΑΡΑΖ|ΠΥΛΩΤ|ΜΗΧΑΝΟΣΤ|ΛΕΒΗΤΟΣΤ|Η\/Μ|ΔΕΞΑΜΕΝ|ΑΝΤΛΙΟΣΤ/]
  ];
  function planDetect(D, c) {
    var cs = closedIn(D, c).filter(function (e) { return e.area >= 1; });
    var res = { outline: [], spaces: [] };
    if (!cs.length) return res;
    cs.sort(function (a, b) { return b.area - a.area; });
    var cw = c.bb[2] - c.bb[0], chh = c.bb[3] - c.bb[1];
    var frame = /FRAME|PLAIS|ΠΛΑΙΣ|VPORT|VIEWPORT|DEFPOINTS/;
    var cand = cs.filter(function (e) { return !frame.test(e.L); });
    var out = cand[0];
    if (!out) return res;
    // κι άλλα κομμάτια του ίδιου ορόφου (π.χ. δύο πτέρυγες) που δεν περιέχονται
    var outs = [out];
    cand.slice(1).forEach(function (e) { if (e.area > out.area * 0.25 && !outs.some(function (o) { return pip(cent(e.pts), o.pts); }) && !textIn(D, c, /./, e)) outs.push(e); });
    res.outline = outs.map(function (e) { return e.id; });
    var excl = {}; outs.forEach(function (o) { excl[o.id] = 1; });
    var seen = {};
    c.texts.forEach(function (ti) {
      var t = D.texts[ti], code = null;
      for (var k = 0; k < SP.length; k++) if (SP[k][1].test(t.n)) { code = SP[k][0]; break; }
      if (!code) return;
      var e = smallestContaining(cs, [t.x, t.y], excl);
      if (!e || seen[e.id]) return;
      // ο χώρος δεν μπορεί να είναι όλο το περίγραμμα
      if (e.area > out.area * 0.8) return;
      seen[e.id] = 1;
      res.spaces.push({ id: e.id, code: code, lbl: true });
    });
    return res;
  }

  /* ---------------- κανόνες (ν.5306/2026) ---------------- */
  var CODE = {
    H: 'Ανοικτός ημιυπαίθριος', X: 'Ανοικτός εξώστης', K: 'Κοινόχρηστο κλιμακοστάσιο', I: 'Ιδιωτικό κλιμακοστάσιο',
    A: 'Ανοικτό κλιμακοστάσιο', F: 'Φωταγωγός / φρεάτιο / αίθριο', P: 'Στάθμευση / Η-Μ / πλατφόρμα οχήματος'
  };
  var TYP = { 1: 'Υπέργειο', 2: 'Υπόγειο', 3: 'Σοφίτα', 4: 'Υπόσκαφο', 5: 'Πατάρι', 9: 'Δώμα / στέγη' };
  function typText(t, u) {
    if (t === 2) return u === 2 ? 'Υπόγειο - στάθμευση/Η-Μ' : u === 3 ? 'Υπόγειο - κύρια χρήση' : 'Υπόγειο - βοηθητικό';
    if (t === 4) return u === 2 ? 'Υπόσκαφο - άλλη χρήση' : 'Υπόσκαφο - κατοικία';
    return TYP[t] || 'Υπέργειο';
  }
  function oikMax(E) { return E <= 200 ? E : (E < 700 ? 240 : 400); }
  function ektMax(E) { if (E < 4000) return null; if (E <= 8000) return 186 + (E - 4000) * 0.018; return Math.min(360, 258 + (E - 8000) * 0.009); }
  function hmax210(s) { if (!(s > 0)) return null; if (s <= 0.4) return 10.75; if (s <= 0.8) return 14; if (s <= 1.2) return 17.25; if (s <= 1.6) return 19.5; if (s <= 2.0) return 22.75; if (s <= 2.6) return 26; return null; }
  function rnd(x) { return Math.floor(x + 0.5); }
  function gr(v, d) { if (v == null || !isFinite(v)) return '....'; d = d == null ? 2 : d; return v.toFixed(d).replace('.', ','); }
  function grz(v) { if (v == null || !isFinite(v)) return '....'; var s = gr(v, 2); return s.replace(/,?0+$/, ''); }

  // A: { E, mode(1 σχέδιο, 2 εκτός, 3 οικισμός), sd, kp, cap, hmax, roofmax, so, plot, cov[{pts}], levels[{name,typ,use,h,outlines[pts],spaces[{code,pts}]}],
  //      H, roof, fytA, prasA, units, m2per, prov, akal, fronts[], plotPts, dists[] }
  function compute(A) {
    var R = { items: [], sug: [], lv: [] };
    var E = A.E, mode = A.mode;
    // επιτρεπόμενη δόμηση — από το εμβαδόν του τοπογραφικού
    var allow = null, allowTxt = '';
    if (mode === 1) { if (A.sd > 0) { allow = A.sd * E; allowTxt = 'Ε=Σ.Δ. x Εοικ.= ' + gr(A.sd) + ' x ' + gr(E) + ' = ' + gr(allow) + ' Μ2'; }
      if (allow != null && A.cap) { var c2 = oikMax(E); if (c2 < allow) { allow = c2; allowTxt += ' → όριο οικισμού <2.000 κατ.: ' + gr(c2) + ' Μ2'; } } }
    else if (mode === 3) { allow = oikMax(E); allowTxt = E <= 200 ? 'Ε=Εοικ. x 1,00 = ' + gr(allow) + ' Μ2 (γήπεδο έως 200 Μ2)' : 'Ε= ' + gr(allow) + ' Μ2 (' + (E < 700 ? 'γήπεδο 200-699,99 Μ2' : 'γήπεδο από 700 Μ2') + ')'; }
    else { allow = ektMax(E); allowTxt = allow == null ? 'γήπεδο κάτω από 4.000 Μ2 — μη άρτιο κατά κανόνα' : (E <= 8000 ? 'Ε=186,00 Μ2 + 0,018 x (Ε - 4.000) = ' : 'Ε=258,00 Μ2 + 0,009 x (Ε - 8.000), έως 360 = ') + gr(allow) + ' Μ2 (για χρήση κατοικία)'; }
    if (A.maxd > 0) { allow = allow == null ? A.maxd : Math.min(allow, A.maxd); allowTxt += (allowTxt ? ' · ' : '') + 'μέγιστη ' + gr(A.maxd) + ' Μ2'; }
    R.allow = allow; R.allowTxt = allowTxt;
    // κάλυψη
    var Sk = 0; A.cov.forEach(function (p) { Sk += area(p); });
    var kp = A.kp; if (mode === 3 && E < 200) kp = Math.max(kp, 70);
    var kpe = kp; if (mode === 1 && kp > 0 && kp * E / 100 < 120) kpe = Math.max(kp, 100 * Math.min(120, 0.7 * E) / E);
    var Ka = kpe > 0 ? E * kpe / 100 : null; if (mode === 2 && Ka != null && allow != null) Ka = Math.min(Ka, allow);
    R.Sk = Sk; R.kpe = kpe; R.Ka = Ka; R.pk = 100 * Sk / E;
    // επίπεδα
    var Dom = 0, HX = 0, Hh = 0, Pat = 0, acount = 0, b1 = false, entr = -1, Vr = 0;
    A.levels.forEach(function (L, j) { if (entr < 0 && L.typ === 1) entr = j; });
    A.levels.forEach(function (L, j) {
      var G = 0; L.outlines.forEach(function (p) { G += area(p); });
      var tot = G, ex = 0, hx = 0, h = 0, sp = [];
      L.spaces.forEach(function (s) {
        var a = area(s.pts), inn = L.outlines.some(function (o) { return pip(cent(s.pts), o); }), x = 0, nt = '';
        if (!inn) tot += a;
        if (s.code === 'H' || s.code === 'X') { hx += a; if (s.code === 'H') h += a; nt = 'όριο 40% / 20% στο σύνολο (206 παρ. 6α)'; }
        else if (s.code === 'K') { var lim = j === entr ? 40 : 30; x = Math.min(a, lim); nt = 'έως ' + lim + ' τ.μ. ανά επίπεδο (206 παρ. 6δ)'; }
        else if (s.code === 'I') { x = Math.min(a, 25); nt = 'έως 25 τ.μ. ανά επίπεδο (206 παρ. 6ε)'; }
        else if (s.code === 'A') { acount++; if (acount <= 2) { x = a; nt = 'έως 2 ανοικτά, στάθμη έως 7,50 μ. (206 παρ. 6στ)'; } else nt = '3ο ανοικτό κλιμακοστάσιο: μετρά'; }
        else if (s.code === 'F') { x = a; nt = a < 1.5 ? 'ως φρεάτιο Η/Μ· φωταγωγός θέλει 1,50 τ.μ. (206 παρ. 6η)' : 'δεν φωτίζει κύριους χώρους (206 παρ. 6η)'; }
        else if (s.code === 'P') { if (L.typ === 1) { x = Math.min(a, 25); nt = 'υπέργεια: μόνο πλατφόρμα ανελκυστήρα οχήματος έως 25 τ.μ. (206 κβ)'; } else { x = a; nt = 'υπόγεια στάθμευση / Η-Μ (206 παρ. 6θ)'; } }
        if (s.code !== 'H' && s.code !== 'X') ex += x;
        sp.push({ code: s.code, a: a, x: x, nt: nt, inn: inn });
      });
      var Lc = tot - ex - hx, cnt = Lc, nt = '';
      if (L.typ === 2) {
        if (L.use === 2) { cnt = 0; nt = 'στάθμευση / Η-Μ / νερό / πισίνα: δεν μετρά (206 παρ. 6θ)'; }
        else if (L.use === 3) { nt = 'κύρια χρήση: μετρά'; }
        else if (!b1) { b1 = true; cnt = Math.max(0, Lc - Sk); nt = 'ένας βοηθητικός υπόγειος έως την κάλυψη, οροφή έως 1,20 μ. από το έδαφος (206 παρ. 6ι)'; }
        else nt = '2ος βοηθητικός υπόγειος: μετρά';
      } else if (L.typ === 3) {
        var ug = null;
        for (var k = j - 1; k >= 0 && ug == null; k--) if (A.levels[k].typ === 1) { ug = 0; A.levels[k].outlines.forEach(function (p) { ug += area(p); }); }
        if (ug == null) A.levels.forEach(function (M) { if (ug == null && M.typ === 1) { ug = 0; M.outlines.forEach(function (p) { ug += area(p); }); } });
        if (ug != null && G <= 0.5 * ug + 0.005) { cnt = 0; nt = 'έως 1/2 του υποκείμενου ορόφου (' + gr(0.5 * ug) + ' τ.μ.) - δεν μετρά (206 ιδ)'; }
        else nt = ug != null ? 'ξεπερνά το 1/2 του υποκείμενου (' + gr(0.5 * ug) + ' τ.μ.) - μετρά' : 'χωρίς υποκείμενο όροφο - μετρά';
        L._ug = ug;
      } else if (L.typ === 4) { cnt = Lc * (L.use === 2 ? 0.8 : 0.5); nt = L.use === 2 ? 'υπόσκαφο άλλης χρήσης: εξαιρείται 20% (206 κγ)' : 'υπόσκαφο κατοικίας: εξαιρείται 50% (206 κγ)'; }
      else if (L.typ === 5) { Pat += Lc; cnt = 0; nt = 'πατάρι: δεν μετρά έως 25% της επιτρεπόμενης δόμησης (206 ιδ)'; }
      else if (L.typ === 9) { cnt = 0; nt = 'δώμα / στέγη: σχέδιο αναφοράς'; }
      if (L.typ === 1 || L.typ === 3) Vr += G * (L.h || 0);
      Dom += cnt; HX += hx; Hh += h;
      R.lv.push({ name: L.name, typ: L.typ, use: L.use, G: G, tot: tot, ex: ex, hx: hx, h: h, Lc: Lc, cnt: cnt, nt: nt, sp: sp, hgt: L.h, ug: L._ug });
    });
    var lim40 = allow != null ? 0.4 * allow : null, limH = allow != null ? 0.2 * allow : null;
    var HXc = allow != null ? Math.max(0, HX - lim40, Hh - limH) : 0;
    var okP = allow == null || Pat <= 0.25 * allow + 0.005;
    if (!okP) Dom += Pat;
    Dom += HXc;
    R.Dom = Dom; R.HX = HX; R.Hh = Hh; R.HXc = HXc; R.lim40 = lim40; R.limH = limH; R.Pat = Pat; R.okP = okP;
    // όγκος
    var Va = null, SO = null;
    if (mode !== 2 && allow != null && A.so > 0) { SO = A.so * allow / E; Va = E * SO; }
    else if (mode === 2 && A.so > 0) { SO = A.so; Va = E * SO; }
    R.Vr = Vr; R.Va = Va; R.SO = SO;
    // ύψος & αποστάσεις
    var hmax = A.hmax || (mode === 1 ? hmax210(A.sd) : 7.5), roofmax = A.roofmax;
    var low = mode !== 2 && A.H > 0 && A.H <= 8.5;
    var dreq = null, Dbig = null;
    if (mode !== 2 && A.H > 0) { dreq = low ? 2.5 : 2.5 + 0.05 * A.H; Dbig = low ? 2.5 : 3 + 0.1 * A.H; }
    if (mode === 2) dreq = 15;
    R.hmax = hmax; R.roofmax = roofmax; R.low = low; R.dreq = dreq; R.Dbig = Dbig;
    // αποστάσεις ανά πλευρά: πίσω (παράλληλες με το πρόσωπο), πλάγιες, πρόσωπο
    var P = A.plotPts, n = P ? P.length : 0, edges = [];
    if (n && A.cov.length) {
      for (var i = 0; i < n; i++) {
        var a = P[i], b = P[(i + 1) % n], best = null;
        A.cov.forEach(function (cp) { if (!inside(cp, P)) return; var r = edgeMin(a, b, cp); if (!best || r.d < best.d) best = r; });
        if (best) edges.push({ i: i, d: best.d, seg: best.seg, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) });
      }
      var fr = A.fronts || [];
      var fa = fr.map(function (k) { var a = P[k], b = P[(k + 1) % n]; return Math.atan2(b[1] - a[1], b[0] - a[0]); });
      edges.forEach(function (e) {
        if (fr.indexOf(e.i) >= 0) { e.kind = 'front'; return; }
        if (!fr.length) { e.kind = 'side'; return; }
        var par = fa.some(function (x) { var d = Math.abs(((e.ang - x) % Math.PI + Math.PI) % Math.PI); return Math.min(d, Math.PI - d) < Math.PI / 6; });
        e.kind = par ? 'rear' : 'side';
      });
    }
    R.edges = edges;
    function minOf(k) { var v = null, t = false; edges.forEach(function (e) { if (e.kind !== k) return; if (e.d < 0.05) { t = true; return; } v = v == null ? e.d : Math.min(v, e.d); }); return { v: v, touch: t }; }
    R.Drear = minOf('rear'); R.dside = minOf('side');
    R.dmin = null; edges.forEach(function (e) { if (e.kind !== 'front') R.dmin = R.dmin == null ? e.d : Math.min(R.dmin, e.d); });
    // φύτευση / δέντρα / στάθμευση (υπόδειγμα 1 — εντός σχεδίου & οικισμοί)
    if (mode !== 2) {
      var akReq = Ka != null ? (A.akal > 0 ? E - E * (kpe + 10) / 100 : E - Ka) : null;
      R.akReq = akReq; R.fytReq = akReq != null ? akReq * 2 / 3 : null; R.fytA = A.fytA;
      R.trPras = A.prasA > 0 ? rnd(A.prasA / 25) : 0; R.trRest = rnd((E - (A.prasA || 0)) / 200);
    }
    R.req = A.m2per > 0 ? Math.max(1, rnd(Dom / A.m2per)) : Math.max(0, Math.round(A.units || 0));
    R.prov = A.prov;
    return R;
  }

  /* ---------------- έλεγχοι με τεκμηρίωση (άρθρα) ---------------- */
  // κατάσταση: ok | fail | warn | info
  function checks(A, R) {
    var C = [];
    function add(grp, st, title, val, art, why) { C.push({ grp: grp, st: st, title: title, val: val, art: art, why: why || '' }); }
    var G = 'ydom', Y = 'dilosi', K = 'ktirio', M = 'amea';
    if (R.Ka != null) add(G, R.Sk <= R.Ka + 0.005 ? 'ok' : 'fail', 'Κάλυψη', gr(R.Sk) + ' τ.μ. (' + gr(R.pk) + '%) ' + (R.Sk <= R.Ka + 0.005 ? '≤' : '>') + ' επιτρεπόμενη ' + gr(R.Ka) + ' τ.μ. (' + grz(R.kpe) + '%)',
      A.mode === 2 ? 'ν.5306/2026 άρθ. 251 (πρώην άρθ. 32-33 ν.4759/2020)' : 'ν.5306/2026 άρθ. 207 (πρώην ΝΟΚ άρθ. 12)',
      R.kpe > A.kp + 0.001 ? 'Ισχύει η προσαύξηση έως 120 τ.μ. χωρίς υπέρβαση του 70% (άρθ. 207).' : '');
    else add(G, 'warn', 'Κάλυψη', 'δεν δόθηκε ποσοστό κάλυψης', 'ν.5306/2026 άρθ. 207', 'Συμπλήρωσε τους όρους δόμησης στο βήμα 1.');
    if (A.mode === 2 && R.allow != null) add(G, R.Sk <= R.allow + 0.005 ? 'ok' : 'fail', 'Κάλυψη ≤ μέγιστη δόμηση (εκτός σχεδίου)', gr(R.Sk) + ' ≤ ' + gr(R.allow) + ' τ.μ.', 'ν.5306/2026 άρθ. 251');
    if (R.Va != null) add(G, R.Vr <= R.Va + 0.5 ? 'ok' : 'fail', 'Όγκος', gr(R.Vr) + ' ' + (R.Vr <= R.Va + 0.5 ? '≤' : '>') + ' ' + gr(R.Va) + ' μ³ (Σ.Ο. ' + gr(R.SO, 3) + ')', 'ν.5306/2026 άρθ. 208 (πρώην ΝΟΚ άρθ. 13)', 'Ο όγκος υπολογίζεται από τα μικτά περιγράμματα υπέργειων επιπέδων x ύψος κάθε επιπέδου.');
    else add(G, 'warn', 'Όγκος', 'πραγματοποιούμενος ' + gr(R.Vr) + ' μ³ — δεν ορίστηκε Σ.Ο.', 'ν.5306/2026 άρθ. 208', 'Δώσε τον συντελεστή όγκου (5,00 ή 5,50 εντός σχεδίου, κατά τις διατάξεις εκτός).');
    if (A.mode === 2) {
      if (R.dmin != null) add(G, R.dmin >= 15 - 0.005 ? 'ok' : 'fail', 'Αποστάσεις από τα όρια', 'ελάχιστη ' + gr(R.dmin) + ' μ. — απαιτούνται 15,00 μ.', 'ν.5306/2026 άρθ. 251', R.dmin < 15 ? 'Για κατοικία σε γήπεδο που υπήρχε στις 15.4.1981, οι πλάγιες γίνονται 7,50 μ. αν δεν χωράει με 15 μ. — πλάτος κτιρίου έως 10 μ.' : '');
    } else if (R.Dbig != null) {
      var fr = (A.fronts || []).length;
      if (!fr) add(G, 'warn', 'Πλάγιες & οπίσθιες αποστάσεις', 'δεν ορίστηκαν πλευρές σε δρόμο — ελάχιστη απόσταση ' + gr(R.dmin) + ' μ. (δ=' + gr(R.dreq) + ', Δ=' + gr(R.Dbig) + ')', 'ν.5306/2026 άρθ. 198, 209', 'Στο βήμα 3 δείξε ποιες πλευρές βλέπουν σε δρόμο, για να ξεχωρίσουν οπίσθιο (Δ) και πλάγια (δ) όρια.');
      else {
        var okR = R.Drear.v == null || R.Drear.v >= R.Dbig - 0.005, okS = R.dside.v == null || R.dside.v >= R.dreq - 0.005;
        add(G, okR ? 'ok' : 'fail', 'Οπίσθια απόσταση Δ', (R.Drear.v != null ? gr(R.Drear.v) + ' μ.' : (R.Drear.touch ? 'σε επαφή' : '—')) + ' — απαιτούνται Δ=' + (R.low ? '2,50 (χαμηλό κτίριο)' : '3,00+0,10x' + gr(A.H) + '=' + gr(R.Dbig)) + ' μ.', 'ν.5306/2026 άρθ. 198, 209' + (R.low ? ', 221' : ''));
        add(G, okS ? 'ok' : 'fail', 'Πλάγιες αποστάσεις δ', (R.dside.v != null ? gr(R.dside.v) + ' μ.' : '—') + (R.dside.touch ? ' (και σε επαφή)' : '') + ' — απαιτούνται δ=' + (R.low ? '2,50 (χαμηλό κτίριο)' : '2,50+0,05x' + gr(A.H) + '=' + gr(R.dreq)) + ' μ.', 'ν.5306/2026 άρθ. 198, 209', R.dside.touch ? 'Η επαφή με πλάγιο όριο επιτρέπεται μόνο κατά τις περιπτώσεις του άρθ. 209 (τι υπάρχει στο όμορο).' : '');
      }
    }
    if (R.hmax) add(G, !(A.H > 0) ? 'warn' : (A.H <= R.hmax + 0.005 ? 'ok' : 'fail'), 'Ύψος', 'Η=' + gr(A.H) + ' μ.' + (A.roof > 0 ? ' + ' + gr(A.roof) + ' μ. στέγη' : '') + ' — μέγιστο ' + gr(R.hmax) + ' μ.' + (R.roofmax ? ' + ' + gr(R.roofmax) + ' μ. στέγη' : ''),
      A.mode === 1 ? 'ν.5306/2026 άρθ. 210' : A.mode === 2 ? 'ν.5306/2026 άρθ. 251' : 'ν.5306/2026 άρθ. 239', 'Το Η για τα Δ/δ είναι το ύψος στην πλήρη εξάντληση του ΣΔ, όπως στο διάγραμμα (άρθ. 198).');
    if (R.roofmax && A.roof > 0) add(G, A.roof <= R.roofmax + 0.005 ? 'ok' : 'fail', 'Στέγη', gr(A.roof) + ' μ. — έως ' + gr(R.roofmax) + ' μ.', A.mode === 2 ? 'ν.5306/2026 άρθ. 251' : 'ν.5306/2026 άρθ. 214 (πρώην ΝΟΚ άρθ. 19)');
    if (A.mode !== 1) { var nab = A.levels.filter(function (L) { return L.typ === 1; }).length; add(G, nab <= 2 ? 'ok' : 'fail', 'Αριθμός ορόφων', nab + ' υπέργειοι — έως 2', A.mode === 2 ? 'ν.5306/2026 άρθ. 251' : 'ν.5306/2026 άρθ. 239'); }
    if (A.mode !== 2) {
      if (A.fytA > 0 && R.fytReq != null) add(G, A.fytA >= R.fytReq - 0.005 ? 'ok' : 'fail', 'Φύτευση', gr(A.fytA) + ' τ.μ. — υποχρεωτική 2/3 x ' + gr(R.akReq) + ' = ' + gr(R.fytReq) + ' τ.μ.', 'ν.5306/2026 άρθ. 212 (πρώην ΝΟΚ άρθ. 17 παρ. 2α)');
      else add(G, 'warn', 'Φύτευση', 'δεν σημειώθηκαν φυτεμένες επιφάνειες — υποχρεωτικά ' + gr(R.fytReq) + ' τ.μ.', 'ν.5306/2026 άρθ. 212', 'Στο βήμα 3 κάνε κλικ στα πολύγωνα πρασίνου.');
      add(G, 'info', 'Δέντρα', (A.prasA > 0 ? R.trPras + ' στην πρασιά + ' : '') + R.trRest + ' στο οικόπεδο', 'Κτιριοδομικός άρθ. 19 · υπόδειγμα ΥΠΕΝ 1');
      add(G, A.prov >= R.req ? 'ok' : 'fail', 'Θέσεις στάθμευσης', A.prov + ' δεσμεύονται — απαιτούνται ' + R.req, 'υπόδειγμα ΥΠΕΝ 1 · κανονισμός στάθμευσης της περιοχής', 'Ο αριθμός θέσεων ανά τ.μ. ή ανά κατοικία ορίζεται από τις διατάξεις στάθμευσης της περιοχής.');
    }
    // υπεύθυνη δήλωση (μεγέθη ΣΔ — δεν τα ελέγχει η ΥΔΟΜ, εγκύκλιος 2022)
    if (R.allow != null) add(Y, R.Dom <= R.allow + 0.005 ? 'ok' : 'fail', 'Δόμηση', gr(R.Dom) + ' ' + (R.Dom <= R.allow + 0.005 ? '≤' : '>') + ' ' + gr(R.allow) + ' τ.μ.', 'ν.5306/2026 άρθ. 206 (πρώην ΝΟΚ άρθ. 11)', R.allowTxt);
    else add(Y, 'warn', 'Δόμηση', 'πραγματοποιούμενη ' + gr(R.Dom) + ' τ.μ. — δεν προκύπτει επιτρεπόμενη', 'ν.5306/2026 άρθ. 206', R.allowTxt);
    if (R.allow != null) {
      add(Y, R.HX <= R.lim40 + 0.005 ? 'ok' : 'fail', 'Ανοικτοί εξώστες + ημιυπαίθριοι', gr(R.HX) + ' ≤ 40% = ' + gr(R.lim40) + ' τ.μ.' + (R.HXc > 0.005 ? ' — μετρούν ' + gr(R.HXc) : ''), 'ν.5306/2026 άρθ. 206 παρ. 5, 6α');
      add(Y, R.Hh <= R.limH + 0.005 ? 'ok' : 'fail', 'Ανοικτοί ημιυπαίθριοι', gr(R.Hh) + ' ≤ 20% = ' + gr(R.limH) + ' τ.μ.', 'ν.5306/2026 άρθ. 206 παρ. 6α', 'Ημιυπαίθριος = ανοικτός τουλάχιστον στο 35% της περιμέτρου του (ορισμός ΝΟΚ).');
      if (R.Pat > 0) add(Y, R.okP ? 'ok' : 'fail', 'Πατάρι', gr(R.Pat) + ' ≤ 25% = ' + gr(0.25 * R.allow) + ' τ.μ.', 'ν.5306/2026 άρθ. 206 περ. ιδ');
    }
    R.lv.forEach(function (l) {
      if (l.typ === 3) add(Y, l.cnt > 0 ? 'warn' : 'ok', 'Σοφίτα «' + l.name + '»', gr(l.G) + ' τ.μ. — ' + l.nt, 'ν.5306/2026 άρθ. 206 περ. ιδ, 197 παρ. 81');
      l.sp.forEach(function (s) { if ((s.code === 'K' || s.code === 'I') && s.a > s.x + 0.005) add(Y, 'warn', 'Κλιμακοστάσιο «' + l.name + '»', gr(s.a) + ' τ.μ. — εξαιρούνται ' + gr(s.x) + ', μετρούν ' + gr(s.a - s.x), 'ν.5306/2026 άρθ. 206 παρ. 6δ-ε'); });
    });
    // Κτιριοδομικός — όσα ελέγχονται στη μελέτη
    add(K, 'info', 'Ελεύθερο ύψος', 'κύριοι χώροι ≥ 2,50 μ. · βοηθητικοί ≥ 2,20 μ. · κάτω από δοκούς ≥ 2,00 μ.', 'Κτιριοδομικός άρθ. 7');
    add(K, 'info', 'Κλίμακες', 'ελεύθερο πλάτος 1,20 μ. (0,90 σε κατοικίες έως 3 ορόφων, 0,60 εσωτερική ενιαίας κατοικίας) · 2υ+π = 0,60-0,66 μ. · ελεύθερο ύψος ≥ 2,20 μ.', 'Κτιριοδομικός άρθ. 11');
    add(K, 'info', 'Στηθαία', '≥ 1,00 μ. όπου το δάπεδο είναι πάνω από 1,00 μ. από τον περιβάλλοντα χώρο · διάκενα ≤ 0,25 / 0,15 μ.', 'Κτιριοδομικός άρθ. 13');
    add(K, 'info', 'Φυσικός φωτισμός & αερισμός', 'ανοίγματα ≥ 10% (έμμεσος 15%) · ανοιγόμενα ≥ 5% (έμμεσος 7%) του καθαρού εμβαδού κάθε κύριου χώρου', 'Κτιριοδομικός άρθ. 20-21');
    add(K, 'info', 'Προσπέλαση', 'αν η είσοδος απέχει > 30 μ. από την είσοδο του οικοπέδου: πλάτος ≥ 3,50 μ., ύψος ≥ 3,00 μ., κλίση ≤ 7% στα πρώτα 5 μ.', 'Κτιριοδομικός άρθ. 18');
    // ΑμεΑ
    add(M, 'info', 'Προσβασιμότητα', 'προσβάσιμες είσοδοι και κοινόχρηστοι χώροι, οριζόντια και κατακόρυφη προσβασιμότητα', 'ν.5306/2026 άρθ. 223 (ΝΟΚ 26) · Κτιριοδομικός άρθ. 25 · «Σχεδιάζοντας για Όλους»');
    add(M, 'info', 'Ράμπες', 'κλίση ≤ 5% (έως 8% σε μικρά μήκη) με πλατύσκαλα και χειρολισθήρες', 'ΥΑ ΥΠΕΝ/ΔΜΕΑΑΠ/124964/1561/2022');
    add(M, 'info', 'Αξιοποίηση', 'κατασκευές για ΑμεΑ επιτρέπονται μέσα στις αποστάσεις Δ/δ · ο χώρος αναμονής ΑμεΑ στο κοινόχρηστο κλιμακοστάσιο είναι μέσα στα 30/40 τ.μ. που δεν μετρούν', 'ν.5306/2026 άρθ. 211 παρ. 8, 206 παρ. 6δ');
    return C;
  }

  /* ---------------- προτάσεις εξοικονόμησης δόμησης ---------------- */
  function suggest(A, R) {
    var S = [];
    function sg(t, art, gain) { S.push({ t: t, art: art, gain: gain || 0 }); }
    var n1 = 0, top = null, has2 = false, has3 = false, has4 = false, hasK = false, hasA = false;
    R.lv.forEach(function (l) { if (l.typ === 1) { n1++; top = l.G; } if (l.typ === 2 && l.use === 1) has2 = true; if (l.typ === 3) has3 = true; if (l.typ === 4) has4 = true;
      l.sp.forEach(function (s) { if (s.code === 'K' || s.code === 'I') hasK = true; if (s.code === 'A') hasA = true; });
      if (l.typ === 2 && l.use === 1 && l.cnt > 0.005) sg('Το υπόγειο «' + l.name + '» ξεπερνά την κάλυψη κατά ' + gr(l.cnt) + ' τ.μ., που μετρούν. Αν το τμήμα αυτό γίνει στάθμευση, Η-Μ, δεξαμενή νερού ή πισίνα, δεν μετρά.', 'ν.5306/2026 άρθ. 206 παρ. 6θ-ι', l.cnt);
      if (l.typ === 2 && l.use === 3) sg('Το υπόγειο «' + l.name + '» κύριας χρήσης μετρά όλο (' + gr(l.cnt) + ' τ.μ.). Ως βοηθητικό (οροφή έως 1,20 μ. από το έδαφος) εξαιρείται έως ' + gr(Math.min(l.Lc, R.Sk)) + ' τ.μ.', 'ν.5306/2026 άρθ. 206 παρ. 6ι', Math.min(l.Lc, R.Sk));
      if (l.typ === 3 && l.cnt > 0.005 && l.ug) sg('Η σοφίτα «' + l.name + '» μετρά όλη (' + gr(l.cnt) + ' τ.μ.). Αν περιοριστεί στα ' + gr(0.5 * l.ug) + ' τ.μ. (1/2 του υποκείμενου ορόφου μαζί με τους τοίχους) δεν μετρά καθόλου.', 'ν.5306/2026 άρθ. 206 περ. ιδ', l.cnt);
      l.sp.forEach(function (s) { if ((s.code === 'K' || s.code === 'I') && s.a > s.x + 0.005) sg('Η σκάλα στο «' + l.name + '» ξεπερνά το όριο κατά ' + gr(s.a - s.x) + ' τ.μ. Με μικρότερο κλιμακοστάσιο (ή κοινόχρηστο, έως 30 / 40 τ.μ. στην είσοδο) τα τ.μ. αυτά γλιτώνονται.', 'ν.5306/2026 άρθ. 206 παρ. 6δ-ε', s.a - s.x); });
    });
    if (R.allow != null) {
      var rest = R.allow - R.Dom;
      if (rest > 0.5) sg('Υπόλοιπο δόμησης: ' + gr(rest) + ' τ.μ. ακόμη αξιοποιήσιμα.', 'ν.5306/2026 άρθ. 206', 0);
      else if (rest < -0.005) sg('Υπέρβαση δόμησης ' + gr(-rest) + ' τ.μ. — οι υπόλοιπες προτάσεις δείχνουν πού μπορεί να καλυφθεί.', 'ν.5306/2026 άρθ. 206', 0);
      var r40 = R.lim40 - R.HX, rH = Math.min(r40, R.limH - R.Hh);
      if (r40 > 0.5) sg('Ανοικτοί εξώστες και ημιυπαίθριοι: χωράνε ακόμη ' + gr(r40) + ' τ.μ. χωρίς να μετρήσουν' + (rH > 0.5 ? ' (από αυτά ημιυπαίθριοι έως ' + gr(rH) + ' τ.μ.)' : '') + '. Χώρος που θα ήταν κλειστός μπορεί να γίνει ανοικτός ημιυπαίθριος — ανοικτός στο 35% της περιμέτρου του.', 'ν.5306/2026 άρθ. 206 παρ. 6α', Math.max(0, rH));
      if (R.HXc > 0.005) sg('Οι ανοικτοί χώροι ξεπερνούν το όριο 40% / 20%: μετρούν ' + gr(R.HXc) + ' τ.μ. Μείωσέ τους κατά τόσο για να μη μετρούν.', 'ν.5306/2026 άρθ. 206 παρ. 5, 6α', R.HXc);
    }
    if (n1 >= 2 && !hasK && !hasA) sg('Δεν δηλώθηκε κλιμακοστάσιο: σε κάθε επίπεδο δεν μετρούν έως 25 τ.μ. ιδιωτικής σκάλας ή 30 τ.μ. κοινόχρηστης (40 στο επίπεδο εισόδου) — περίπου ' + gr(25 * n1) + ' τ.μ.', 'ν.5306/2026 άρθ. 206 παρ. 6δ-ε', 25 * n1);
    if (!hasA && A.H > 0 && A.H <= 7.5 && n1 >= 2) sg('Έως δύο ανοικτά κλιμακοστάσια που εξυπηρετούν στάθμη έως 7,50 μ. δεν μετρούν καθόλου — π.χ. εξωτερική σκάλα αντί για κλειστή.', 'ν.5306/2026 άρθ. 206 παρ. 6στ', 0);
    if (!has3 && top) sg('Σοφίτα κάτω από κεκλιμένη στέγη, έως ' + gr(0.5 * top) + ' τ.μ. (1/2 του υποκείμενου ορόφου), δεν μετρά. Δεν είναι όροφος και δεν γίνεται ανεξάρτητη ιδιοκτησία.', 'ν.5306/2026 άρθ. 206 περ. ιδ, 197 παρ. 81', 0.5 * top);
    if (!has2 && R.Sk > 0) sg('Ένας υπόγειος όροφος βοηθητικής χρήσης έως ' + gr(R.Sk) + ' τ.μ. (όσο η κάλυψη, οροφή έως 1,20 μ. από το έδαφος) δεν μετρά. Υπόγεια για στάθμευση, Η-Μ, νερό, ΑΠΕ ή πισίνα δεν μετρούν ανεξαρτήτως εμβαδού.', 'ν.5306/2026 άρθ. 206 παρ. 6θ-ι', R.Sk);
    if (!has4) sg('Σε επικλινές γήπεδο: υπόσκαφο τμήμα (μία όψη, χωρίς ίχνος στην κάτοψη, προσβάσιμη στέγη) μετρά μόνο κατά 50% για κατοικία (εξαίρεση 20% για άλλες χρήσεις).', 'ν.5306/2026 άρθ. 206 περ. κγ', 0);
    sg('Αίθρια, φωταγωγοί από 1,50 τ.μ., φρεάτια Η/Μ και επιφάνειες από εσοχές στο σώμα του κτιρίου δεν μετρούν — δεν μετρούν όμως ούτε για τον φωτισμό των κύριων χώρων.', 'ν.5306/2026 άρθ. 206 παρ. 6γ, 6η', 0);
    if (R.kpe > A.kp + 0.001) sg('Κάλυψη: ισχύει η προσαύξηση έως 120 τ.μ. (χωρίς υπέρβαση του 70%) — επιτρεπόμενη ' + grz(R.kpe) + '% αντί ' + grz(A.kp) + '%.', 'ν.5306/2026 άρθ. 207', 0);
    if (A.mode !== 2 && A.H > 8.5 && A.H <= 10) sg('Με ύψος έως 8,50 μ. (σήμερα ' + grz(A.H) + ' μ.) το κτίριο γίνεται χαμηλό: Δ = 2,50 μ. σταθερό αντί 3 + 0,10Η.', 'ν.5306/2026 άρθ. 221', 0);
    if (A.mode === 1) sg('Κίνητρα για κτίριο σχεδόν μηδενικής κατανάλωσης / περιβαλλοντικής αναβάθμισης (προσαύξηση ΣΔ ή ύψους): έλεγξε το ισχύον καθεστώς μετά τις αποφάσεις ΣτΕ — μπαίνουν σε χωριστό πεδίο «ειδικά στοιχεία έγκρισης».', 'ν.5306/2026 άρθ. 204, 222 · εγκύκλιος ΥΠΕΝ 2022', 0);
    sg('ΑμεΑ: ο χώρος αναμονής ΑμεΑ μέσα στο κοινόχρηστο κλιμακοστάσιο είναι μέσα στα 30 / 40 τ.μ. που δεν μετρούν, και οι κατασκευές για ΑμεΑ επιτρέπονται μέσα στις αποστάσεις Δ / δ.', 'ν.5306/2026 άρθ. 206 παρ. 6δ, 211 παρ. 8', 0);
    return S;
  }

  /* ---------------- κείμενο διαγράμματος — υπόδειγμα ΥΠΕΝ (εγκύκλιος 135179/4495/2022) ---------------- */
  // γραμμές: {t, s:'h1'|'h2'|'n', b:bold}
  function yTemplate(A, R, P) {
    var L = [];
    function h1(t) { L.push({ t: t, s: 'h1', b: true }); }
    function h2(t) { L.push({ t: t, s: 'h2' }); }
    function n(t, b) { L.push({ t: t, s: 'n', b: !!b }); }
    function gap() { L.push({ t: '', s: 'n' }); }
    function fl(c) { return c ? '' : '   ← ΥΠΕΡΒΑΣΗ'; }
    var ekt = A.mode === 2, oik = ekt ? 'γηπ' : 'οικ', Gh = ekt ? 'ΓΗΠΕΔΟΥ' : 'ΟΙΚΟΠΕΔΟΥ';
    h1('ΟΡΟΙ ΔΟΜΗΣΗΣ');
    h2('(όπως αναγράφονται στο τοπογραφικό διάγραμμα' + (P.rowsSrc ? ' — ' + P.rowsSrc : '') + ')');
    (P.rows || []).forEach(function (r) { n(r[0] + ': ' + r[1]); });
    gap();
    h1('ΕΜΒΑΔΟΜΕΤΡΗΣΗ');
    n('Εμβαδόν ' + (ekt ? 'γηπέδου' : 'οικοπέδου') + ' ' + (P.vlabels || '') + ': Ε= ' + gr(A.E) + ' Μ2');
    n('Το εμβαδόν υπολογίστηκε αναλυτικά από τις συντεταγμένες των κορυφών (ΕΓΣΑ87).');
    n('Το ' + (ekt ? 'γήπεδο' : 'οικόπεδο') + ' βρίσκεται στη/στο ' + (P.oikismos || '................') + ' Δήμου ' + (P.dimos || '..........') + ', ' +
      (A.mode === 1 ? 'εντός εγκεκριμένου σχεδίου' : A.mode === 3 ? 'εντός ορίων οικισμού' : 'εκτός σχεδίου και εκτός ορίων νομίμως υφιστάμενων προ του 1923 οικισμών'));
    n('και είναι άρτιο και οικοδομήσιμο (' + (P.artio || 'κατά κανόνα ή κατά παρέκκλιση') + ') σύμφωνα με τις ισχύουσες πολεοδομικές διατάξεις.');
    gap();
    h1('ΓΕΝΙΚΑ ΣΤΟΙΧΕΙΑ ' + Gh + ' - ΚΤΙΡΙΟΥ');
    h2('(που υπόκεινται σε έλεγχο της αρμόδιας Υ.ΔΟΜ)');
    n('ΕΠΙΤΡΕΠΟΜΕΝΗ ΚΑΛΥΨΗ: Ε=Ε' + oik + ' x Σ.Κ.= ' + gr(A.E) + ' x ' + grz(R.kpe) + '% = ' + gr(R.Ka) + ' Μ²' + (ekt && R.allow != null && R.Ka <= R.allow + 0.005 && A.E * R.kpe / 100 > R.allow ? ' (≤ μέγιστη δόμηση)' : ''));
    n('ΠΡΑΓΜΑΤΟΠΟΙΟΥΜΕΝΗ ΚΑΛΥΨΗ: Ε= ' + gr(R.Sk) + ' Μ² <= επιτρεπ. κάλυψη ' + gr(R.Ka) + ' Μ²' + fl(R.Ka == null || R.Sk <= R.Ka + 0.005));
    if (ekt) {
      n('ΥΠΟΛΟΓΙΣΜΟΣ ΟΓΚΟΥ ΚΤΙΡΙΟΥ', true);
      n('ΕΠΙΤΡΕΠΟΜΕΝΟΣ ΟΓΚΟΣ: V=Εγηπ. x Συντ. κατ\' όγκον εκμ/σης= ' + (R.Va != null ? gr(A.E) + ' x ' + gr(R.SO, 3) + ' = ' + gr(R.Va) : '....') + ' M³');
    } else {
      n('ΣΥΝΤΕΛΕΣΤΗΣ ΟΓΚΟΥ (άρθ. 13 παρ. 6α ν.4067/12 - άρθ. 208 ν.5306/26)', true);
      n('Σ.Ο= ' + gr(A.so) + ' x (επιτρεπ. δομ/ Εοικ)= ' + gr(A.so) + ' x (' + gr(R.allow) + ' / ' + gr(A.E) + ') = ' + gr(R.SO, 3));
      n('ΕΠΙΤΡΕΠΟΜΕΝΟΣ ΟΓΚΟΣ: V=Eοικ x Σ.Ο= ' + gr(R.Va) + ' M³');
    }
    n('ΠΡΑΓΜΑΤΟΠΟΙΟΥΜΕΝΟΣ ΟΓΚΟΣ: V= ' + gr(R.Vr) + ' Μ³ <= επιτρεπ. όγκο ' + gr(R.Va) + ' M³' + fl(R.Va == null || R.Vr <= R.Va + 0.5));
    n('ΠΛΑΓΙΕΣ ΑΠΟΣΤΑΣΕΙΣ', true);
    if (ekt) n('ΠΡΑΓΜΑΤΟΠΟΙΟΥΜΕΝΗ ΑΠΟΣΤΑΣΗ ΑΠΟ ΤΑ ΟΡΙΑ: πραγματ= ' + gr(R.dmin) + ' Μ >= 15,00 Μ' + fl(R.dmin == null || R.dmin >= 14.995));
    else {
      n('ΕΠΙΤΡΕΠΟΜΕΝΟ ΟΠΙΣΘΙΟ ΟΡΙΟ: Δ=' + (R.low ? '2,50 Μ (χαμηλό κτίριο, άρθ. 221 ν.5306/26)' : '3,00+0,10xHmax= 3,00+0,10x' + gr(A.H) + '= ' + gr(R.Dbig) + ' Μ'));
      n('ΕΠΙΤΡΕΠΟΜΕΝΟ ΠΛΑΓΙΟ ΟΡΙΟ: δ=' + (R.low ? '2,50 Μ' : '2,50+0,05xHmax= 2,50+0,05x' + gr(A.H) + '= ' + gr(R.dreq) + ' Μ'));
      var dr = R.Drear.v != null ? gr(R.Drear.v) : (R.Drear.touch ? 'σε επαφή' : '....'), ds = R.dside.v != null ? gr(R.dside.v) : (R.dside.touch ? 'σε επαφή' : '....');
      n('ΠΡΑΓΜΑΤΟΠΟΙΟΥΜΕΝΑ ΟΡΙΑ: Δπραγμ= ' + dr + ' Μ > Δ & δπραγμ= ' + ds + ' Μ > δ' + fl((R.Drear.v == null || R.Drear.v >= R.Dbig - 0.005) && (R.dside.v == null || R.dside.v >= R.dreq - 0.005)));
    }
    n('ΜΕΓΙΣΤΟ ΕΠΙΤΡΕΠΟΜΕΝΟ ΥΨΟΣ: Ηmax= ' + gr(R.hmax) + ' + ' + (R.roofmax ? gr(R.roofmax) : '....') + ' M ΣΤΕΓΗ (όπου προβλέπεται από τις διατάξεις της περιοχής ή από τη μελέτη βάσει ΝΟΚ)');
    n('ΠΡΑΓΜΑΤΟΠΟΙΟΥΜΕΝΟ ΥΨΟΣ: Η= ' + gr(A.H) + ' M + ' + gr(A.roof || 0) + ' M(ΣΤΕΓΗ) < Ηmax' + fl(!(A.H > 0) || !R.hmax || A.H <= R.hmax + 0.005));
    if (!ekt) {
      n('ΕΛΕΓΧΟΣ ΦΥΤΕΥΣΗΣ (άρθ. 17 παρ. 2α ν.4067/12 - άρθ. 212 ν.5306/26)', true);
      if (A.akal > 0) n('ΥΠΟΧΡΕΩΤΙΚΟΣ ΑΚΑΛΥΠΤΟΣ ΟΙΚΟΠΕΔΟΥ ΣΕ ΠΕΡΙΠΤΩΣΗ ΥΠΑΙΘΡΙΩΝ ΧΩΡΩΝ ΣΤΑΘΜΕΥΣΗΣ: Εοικ-[Εοικ x (Σ.Κ+10%)]= ' + gr(R.akReq) + ' Μ2');
      else n('ΥΠΟΧΡΕΩΤΙΚΟΣ ΑΚΑΛΥΠΤΟΣ ΟΙΚΟΠΕΔΟΥ: Εοικ-Επιτρεπ. Κάλυψη= ' + gr(A.E) + ' - ' + gr(R.Ka) + ' = ' + gr(R.akReq) + ' Μ2');
      n('ΥΠΟΧΡΕΩΤΙΚΗ ΦΥΤΕΥΣΗ: Ε=2/3 x (Υποχρεωτικός Ακάλυπτος)= ' + gr(R.fytReq) + ' Μ²');
      n('ΠΡΑΓΜΑΤΟΠΟΙΟΥΜΕΝΗ ΦΥΤΕΥΣΗ: Ε= ' + (A.fytA > 0 ? gr(A.fytA) : '....') + ' Μ2 > Υποχρεωτ. Φύτευσης ' + gr(R.fytReq) + ' Μ²' + fl(!(A.fytA > 0) || A.fytA >= R.fytReq - 0.005));
      n('ΑΠΑΙΤΟΥΜΕΝΑ ΔΕΝΤΡΑ:', true);
      n('ΕΜΒΑΔΟΝ ΠΡΑΣΙΑΣ: Ε= ' + (A.prasA > 0 ? gr(A.prasA) : '0,00') + ' M²');
      n('ΑΠΑΙΤΟΥΜΕΝΑ ΔΕΝΤΡΑ ΠΡΑΣΙΑΣ: Eπρασιάς/25= ' + gr((A.prasA || 0) / 25) + ' = (στρογγυλοποίηση) ' + R.trPras + ' ΔΕΝΤΡΑ');
      n('(Εοικ-Επρασ)/200= ' + gr((A.E - (A.prasA || 0)) / 200) + ' = (στρογγυλοποίηση) ' + R.trRest + ' ΔΕΝΤΡΑ');
      n('ΕΛΕΓΧΟΣ ΑΝΑΓΚΩΝ ΣΕ ΧΩΡΟΥΣ ΣΤΑΘΜΕΥΣΗΣ', true);
      n('ΑΠΑΙΤΟΥΜΕΝΕΣ ΘΕΣΕΙΣ ΣΤΑΘΜΕΥΣΗΣ: ' + (A.m2per > 0 ? '1 θέση στάθμευσης ανά ' + grz(A.m2per) + ' τμ επιφ. κτιρίου' : '1 θέση ανά κατοικία/διαμέρισμα') + ': ' + R.req + ' θέσεις στάθμευσης.');
    }
    gap();
    h1('ΥΠΕΥΘΥΝΗ ΔΗΛΩΣΗ [ΤΟΥ ΑΡΘ.8 ΤΟΥ Ν.1599/86 (Α\' 75)]');
    h2('κατ\' εφαρμογή της παρ.3, άρθρο 39, Ν.4495/17 (άρθ. 325 ν.5306/2026), όπως ισχύει');
    n('O/H παρακάτω υπογράφων/-ουσα μηχανικός δηλώνω ότι στο πλαίσιο της παρούσας μελέτης');
    n((P.ergo ? 'για ' + P.ergo + ' ' : '') + 'τα μεγέθη της επιτρεπόμενης και πραγματοποιούμενης δόμησης διαμορφώνονται ως εξής:');
    n('ΕΠΙΤΡΕΠΟΜΕΝΗ ΔΟΜΗΣΗ: ' + (R.allowTxt || '....'));
    n('ΠΡΑΓΜΑΤΟΠΟΙΟΥΜΕΝΗ ΔΟΜΗΣΗ: Ε= ' + gr(R.Dom) + ' M² <= επιτρεπ. δόμησης ' + gr(R.allow) + ' Μ2' + fl(R.allow == null || R.Dom <= R.allow + 0.005));
    n('ΕΛΕΓΧΟΣ ΗΜ/ΘΡΙΩΝ - ΕΞΩΣΤΩΝ (άρθ. 11 παρ. 6α ν.4067/12 - άρθ. 206 ν.5306/26)', true);
    n('ΕΠΙΤΡΕΠΟΜΕΝΟΙ ΕΞΩΣΤΕΣ & ΗΜ/ΘΡΙΟΙ: Ε=επιτρεπ. δόμηση x 0,40= ' + gr(R.lim40) + ' M²');
    n('ΕΠΙΤΡΕΠΟΜΕΝΟΙ ΗΜ/ΘΡΙΟΙ: Ε=επιτρεπ. δόμηση x 0,20= ' + gr(R.limH) + ' M²');
    n('ΠΡΑΓΜΑΤΟΠΟΙΟΥΜΕΝΟΙ ΗΜ/ΘΡΙΟΙ: Ε= ' + gr(R.Hh) + ' M² < Ε επιτρεπ. ημιυπ. χώρων' + fl(R.limH == null || R.Hh <= R.limH + 0.005));
    n('ΠΡΑΓΜΑΤΟΠΟΙΟΥΜΕΝΟΙ ΕΞΩΣΤΕΣ & ΗΜΙ/ΘΡΙΟΙ: Ε= ' + gr(R.HX) + ' Μ² < Ε επιτρεπ. εξωστών & ημιυπ. χωρ.' + fl(R.lim40 == null || R.HX <= R.lim40 + 0.005));
    if (!ekt) {
      n('ΑΠΑΙΤΟΥΜΕΝΕΣ ΕΠΙΦΑΝΕΙΕΣ ΑΝΑ ΧΡΗΣΗ ΓΙΑ ΤΟΝ ΥΠΟΛΟΓΙΣΜΟ ΤΩΝ ΘΕΣΕΩΝ ΣΤΑΘΜΕΥΣΗΣ', true);
      n(A.m2per > 0 ? 'πραγμ. δόμηση/' + grz(A.m2per) + ' τμ = ' + gr(R.Dom / A.m2per) + ' (στρογγυλοποίηση) ΑΡΑ ' + R.req + ' ΘΕΣΕΙΣ ΣΤΑΘΜΕΥΣΗΣ' : (A.units || 1) + ' κατοικία/ες: ' + R.req + ' ΘΕΣΕΙΣ ΣΤΑΘΜΕΥΣΗΣ');
      n('ΔΕΣΜΕΥΟΝΤΑΙ ' + A.prov + ' ΘΕΣΕΙΣ ΣΤΑΘΜΕΥΣΗΣ' + (A.akal > 0 ? ' (' + A.akal + ' ΣΤΟΝ ΑΚΑΛΥΠΤΟ)' : '') + fl(A.prov >= R.req));
    }
    if (R.Pat > 0) { n('ΕΛΕΓΧΟΣ ΠΑΤΑΡΙΟΥ (άρθ. 11 παρ. 6 περ. ιδ ν.4067/12 - άρθ. 206 ν.5306/26)', true); n('Επαταριού= ' + gr(R.Pat) + ' Μ2 <= 25% επιτρεπ. δόμησης= ' + gr(R.allow != null ? 0.25 * R.allow : null) + ' Μ2' + fl(R.okP)); }
    R.lv.forEach(function (l) { if (l.typ === 3) { n('ΕΛΕΓΧΟΣ ΣΟΦΙΤΑΣ «' + l.name + '» (άρθ. 206 περ. ιδ ν.5306/26)', true); n('Εσοφίτας= ' + gr(l.G) + ' Μ2 <= 1/2 υποκείμενου ορόφου= ' + gr(l.ug != null ? 0.5 * l.ug : null) + ' Μ2' + (l.cnt > 0 ? '   ← ΜΕΤΡΑ ΣΤΗ ΔΟΜΗΣΗ' : '')); } });
    n('Στην πραγματοποιούμενη δόμηση έχουν υπολογιστεί όλες οι κατασκευές, σύμφωνα με το άρθρο 11 του ν. 4067/2012 (Α΄ 79)');
    n('- άρθ. 206 ν.5306/2026 - όπως υπολογίζονται αναλυτικά στα επιμέρους περιγράμματα ορόφων και αποτελούν');
    n('αναπόσπαστο τμήμα της Υπεύθυνης Δήλωσης.');
    gap();
    L.push({ t: 'Ο/H ΔΗΛΩΝ/-ΟΥΣΑ', s: 'h1', b: false, center: true });
    return L;
  }
  // κείμενο εμβαδομέτρησης κάτω από κάθε κάτοψη (τελικά εμβαδά, χωρίς τριγωνισμούς — εγκύκλιος 2022)
  function levelBlock(l, isGround, Sk) {
    var N = String(l.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(), out = [];
    out.push('ΕΜΒΑΔΟΝ ' + N + (isGround ? ' = ΠΡΑΓΜΑΤ. ΚΑΛΥΨΗ' : '') + ': Ε= ' + gr(l.G) + ' Μ²');
    if ((l.typ === 1 || l.typ === 3) && l.hgt) out.push('ΟΓΚΟΣ ' + N + ': V=Ε x ύψος= ' + gr(l.G) + ' x ' + gr(l.hgt) + ' = ' + gr(l.G * l.hgt) + ' M³');
    var sums = {};
    l.sp.forEach(function (s) { sums[s.code] = (sums[s.code] || 0) + s.a; });
    var lab = { H: 'ΕΜΒΑΔΟΝ ΗΜΙΥΠΑΙΘΡΙΩΝ ΧΩΡΩΝ', X: 'ΕΜΒΑΔΟΝ ΕΞΩΣΤΩΝ', K: 'ΕΜΒΑΔΟΝ ΚΟΙΝΟΧΡΗΣΤΟΥ ΚΛΙΜΑΚΟΣΤΑΣΙΟΥ', I: 'ΕΜΒΑΔΟΝ ΚΛΙΜΑΚΟΣΤΑΣΙΟΥ', A: 'ΕΜΒΑΔΟΝ ΑΝΟΙΚΤΟΥ ΚΛΙΜΑΚΟΣΤΑΣΙΟΥ', F: 'ΕΜΒΑΔΟΝ ΦΩΤΑΓΩΓΩΝ / ΦΡΕΑΤΙΩΝ', P: 'ΕΜΒΑΔΟΝ ΣΤΑΘΜΕΥΣΗΣ / Η-Μ' };
    ['H', 'X', 'K', 'I', 'A', 'F', 'P'].forEach(function (k) { if (sums[k]) out.push(lab[k] + ': Ε= ' + gr(sums[k]) + ' Μ²'); });
    out.push('ΕΜΒΑΔΟΝ ' + N + ' (ΕΝΤΟΣ Σ.Δ.): Ε= ' + gr(l.cnt) + ' Μ²' + (l.nt && l.cnt !== l.Lc ? ' — ' + l.nt : ''));
    return out;
  }

  var api = {
    area: area, cent: cent, bbox: bbox, bbUnion: bbUnion, bbGrow: bbGrow, pip: pip, ptseg: ptseg, dist: dist, inside: inside, edgeMin: edgeMin,
    norm: norm, prepare: prepare, cluster: cluster, recognize: recognize, levelFromText: levelFromText, topoDetect: topoDetect, planDetect: planDetect,
    compute: compute, checks: checks, suggest: suggest, yTemplate: yTemplate, levelBlock: levelBlock,
    oikMax: oikMax, ektMax: ektMax, hmax210: hmax210, gr: gr, grz: grz, CODE: CODE, typText: typText, EGSA: EGSA
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KalEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
