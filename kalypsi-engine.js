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
        if (c === undefined) grid.set(k, [e.id]);
        else { c.forEach(function (j) { var o = D.ents[j].bb; if (Math.max(o[0] - b[2], b[0] - o[2], o[1] - b[3], b[1] - o[3]) <= gap) u(j, e.id); }); c.push(e.id); }
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
    if (/ΠΥΛΩΤ|PILOTI/.test(n)) return { name: 'Πυλωτή (ισόγειο)', typ: 1, use: 0, ord: 0 };
    if (/ΣΟΦΙΤ/.test(n)) return { name: 'Σοφίτα', typ: 3, use: 0, ord: 50 };
    if (/ΔΩΜΑ|ΣΤΕΓΗ|ΣΤΕΓΗΣ/.test(n)) return { name: /ΣΤΕΓ/.test(n) ? 'Στέγη' : 'Δώμα', typ: 9, use: 0, ord: 60 };
    var m = /(^|[^Α-Ω])(ΣΤ|Α|Β|Γ|Δ|Ε|Ζ)'?\s*ΟΡΟΦ/.exec(n);
    if (m) return { name: m[2] + "' Όροφος", typ: 1, use: 0, ord: ORD[m[2]] || 1 };
    var m2 = /(\d)\s*(ΟΣ|ΟΥ|Ο)?\s*ΟΡΟΦ/.exec(n);
    if (m2) { var k = +m2[1], L = ['', 'Α', 'Β', 'Γ', 'Δ', 'Ε', 'ΣΤ', 'Ζ'][k] || String(k); return { name: L + "' Όροφος", typ: 1, use: 0, ord: k }; }
    if (/ΠΡΩΤ.{0,3}ΟΡΟΦ/.test(n)) return { name: "Α' Όροφος", typ: 1, use: 0, ord: 1 };
    if (/ΔΕΥΤΕΡ.{0,3}ΟΡΟΦ/.test(n)) return { name: "Β' Όροφος", typ: 1, use: 0, ord: 2 };
    if (/ΚΑΤΟΨ/.test(n) && /ΟΡΟΦ/.test(n)) return { name: 'Όροφος', typ: 1, use: 0, ord: 1 };
    if (/ΚΑΤΟΨ/.test(n) && !/ΘΕΜΕΛ|ΞΥΛΟΤΥΠ|ΟΠΛΙΣ|ΣΤΑΤΙΚ|ΗΛΕΚΤΡ|ΥΔΡΑΥΛ|ΑΠΟΧΕΤ|ΘΕΡΜΑΝ/.test(n)) return { name: 'Κάτοψη', typ: 1, use: 0, ord: 0 };
    return null;
  }
  // τίτλος σχεδίου; (κάτοψη ορόφου / τομή / όψη / τοπογραφικό)
  var TITLE = /ΚΑΤΟΨ|(^|\s)ΤΟΜΗ|(^|\s)ΟΨΗ|ΤΟΠΟΓΡΑΦ|ΔΙΑΓΡΑΜΜΑ ΔΙΑΜΟΡΦ/;
  function isTitle(t) { return TITLE.test(t.n) && t.n.length < 60; }
  // όταν πολλά σχέδια ενώθηκαν (π.χ. αντίγραφα του γεωτεμαχίου που εφάπτονται), χωρίζονται ανά τίτλο
  function split(D, cls) {
    var out = [];
    cls.forEach(function (c) {
      var T = c.texts.map(function (i) { return D.texts[i]; }).filter(isTitle);
      var seen = {}; T = T.filter(function (t) { var k = t.n + '@' + Math.round(t.x) + ',' + Math.round(t.y); if (seen[k]) return false; seen[k] = 1; return true; });
      if (T.length < 2) { out.push(c); return; }
      var anc = T.map(function (t) { var w = t.text.length * t.h * 0.6; return [t.al === 'center' ? t.x : t.x + w / 2, t.y]; });
      var ents = c.ents.map(function (i) { return D.ents[i]; });
      // α) «πλαίσιο» κάθε τίτλου: το μεγαλύτερο κλειστό πολύγωνο ακριβώς πάνω από τον τίτλο
      var box = T.map(function (t, k) {
        var a = anc[k], best = null;
        ents.forEach(function (e) { if (!e.closed || e.area < 4) return; var b = e.bb; if (a[0] < b[0] || a[0] > b[2]) return; var dy = b[1] - a[1]; if (dy < -1.5 || dy > 4) return; if (!best || e.area > best.area) best = e; });
        return best;
      });
      var grp = T.map(function () { return []; });
      ents.forEach(function (e) {
        var cc = [(e.bb[0] + e.bb[2]) / 2, (e.bb[1] + e.bb[3]) / 2], k = -1;
        for (var j = 0; j < T.length && k < 0; j++) if (box[j] && (box[j] === e || pip(cc, box[j].pts))) k = j;
        if (k < 0) { var bs = 1e30; anc.forEach(function (a, j) { var b = e.bb, dx = Math.max(0, b[0] - a[0], a[0] - b[2]), dy = b[1] - a[1], sc = 2 * dx + (dy >= -0.5 ? dy : 10 + 3 * Math.abs(dy)); if (sc < bs) { bs = sc; k = j; } }); }
        grp[k].push(e.id);
      });
      var made = [];
      grp.forEach(function (g, j) {
        if (!g.length) return;
        var bb = null; g.forEach(function (i) { bb = bb ? bbUnion(bb, D.ents[i].bb) : D.ents[i].bb.slice(); });
        made.push({ id: 0, ents: g, texts: [], bb: bb, small: false, _t: T[j] });
      });
      // κείμενα: στο κομμάτι που τα περιέχει ή στο πλησιέστερο
      c.texts.forEach(function (ti) { var t = D.texts[ti], best = null, bd = 1e30; made.forEach(function (m) { var b = m.bb, d = Math.hypot(Math.max(b[0] - t.x, 0, t.x - b[2]), Math.max(b[1] - t.y, 0, t.y - b[3])); if (m._t === t) d = -1; if (d < bd) { bd = d; best = m; } }); if (best) best.texts.push(ti); });
      made.forEach(function (m) { delete m._t; out.push(m); });
    });
    out.forEach(function (c, i) { c.id = i; c.ents.forEach(function (e) { D.ents[e].cl = i; }); c.texts.forEach(function (t) { D.texts[t].cl = i; }); });
    return out;
  }
  function recognize(D, cls) {
    cls.forEach(function (c) {
      // τίτλοι πρώτα: ο πλησιέστερος στο σχέδιο (μέσα ή ακριβώς κάτω), μετά τα μεγαλύτερα γράμματα
      var dcl = function (t) { var b = c.bb; return Math.hypot(Math.max(b[0] - t.x, 0, t.x - b[2]), Math.max(b[1] - t.y, 0, t.y - b[3])); };
      var tx = c.texts.map(function (i) { return D.texts[i]; }).sort(function (a, b) { var ta = isTitle(a) ? 0 : 1, tb = isTitle(b) ? 0 : 1; if (ta !== tb) return ta - tb; var dd = dcl(a) - dcl(b); if (Math.abs(dd) > 0.5) return dd; var la = /ΚΑΤΟΨ|ΤΟΜΗ|ΟΨΗ/.test(a.n) ? 0 : 1, lb = /ΚΑΤΟΨ|ΤΟΜΗ|ΟΨΗ/.test(b.n) ? 0 : 1; if (la !== lb) return la - lb; return b.h - a.h; });
      var kind = null, label = '', lev = null;
      // τοπογραφικό: TOPO_PROP / όρια / ΕΓΣΑ87
      var hasProp = c.ents.some(function (i) { return /^(TOPO_PROP|BOUND_)/.test(D.ents[i].L); });
      for (var k = 0; k < tx.length && !kind; k++) {
        var n = tx[k].n;
        if (/ΤΟΠΟΓΡΑΦ|ΔΙΑΜΟΡΦΩΣΗ ΠΕΡΙΒΑΛ|ΔΙΑΓΡΑΜΜΑ ΔΙΑΜΟΡΦ/.test(n)) { kind = 'topo'; label = tx[k].text; break; }
        if (/(^|\s)ΤΟΜΗ/.test(n)) { kind = 'section'; label = tx[k].text; break; }
        if (/(^|\s)ΟΨΗ|ΟΨΕΙΣ/.test(n)) { kind = 'elev'; label = tx[k].text; break; }
        var L = levelFromText(n);
        if (L && (/ΚΑΤΟΨ/.test(n) || tx[k].h >= 0.3 || n.length < 30)) { kind = L.typ === 9 ? 'roof' : 'plan'; lev = L; label = tx[k].text; break; }
      }
      if (!kind && (hasProp || EGSA(c.bb))) kind = 'topo';
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
    plot: /^(TOPO_PROP|BOUND_IMPL|BOUND_UNIMPL|KAL_OIKOPEDO|KAEK_MAIN)$|OIKOP|GHPED|ΟΙΚΟΠ|ΓΗΠΕΔ|PLOT/,
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
    ['E', /ΕΡΚΕΡ|ΚΛΕΙΣΤ.{0,4}ΕΞΩΣΤ/],
    ['X', /ΕΞΩΣΤ|ΒΕΡΑΝΤ|ΜΠΑΛΚΟΝ/],
    ['Y', /ΠΥΛΩΤ|PILOTIS/],
    ['F', /ΦΩΤΑΓ|ΑΙΘΡΙ|ΦΡΕΑΤ|ΑΓΩΓΟΣ ΑΕΡ|ΚΑΠΝΟΔ/],
    ['P', /ΣΤΑΘΜΕΥΣ|ΘΕΣΗ ΣΤΑΘΜ|ΓΚΑΡΑΖ|ΜΗΧΑΝΟΣΤ|ΛΕΒΗΤΟΣΤ|Η\/Μ|ΔΕΞΑΜΕΝ|ΑΝΤΛΙΟΣΤ/]
  ];
  // δήλωση με layer (προτεινόμενα ονόματα KAL_…, δεκτά και ελληνικά / συνώνυμα)
  var SPL_LAYER = [
    ['O', /PERIGRAMMA|ΠΕΡΙΓΡΑΜΜΑ|OUTLINE/],
    ['Y', /PILOT|ΠΥΛΩΤ/],
    ['A', /ANOIX?T.{0,3}KLIM|KLIM.{0,10}ANOIX?T|ΑΝΟΙΧΤ.{0,3}ΚΛΙΜ|ΚΛΙΜ.{0,10}ΑΝΟΙΧΤ/],
    ['K', /KLIM.{0,10}KOIN|ΚΛΙΜ.{0,10}ΚΟΙΝ/],
    ['I', /KLIM.{0,10}IDI|ΚΛΙΜ.{0,10}ΙΔΙΩΤ/],
    ['E', /ERKER|ΕΡΚΕΡ|KLEIST.{0,3}EXOST|ΚΛΕΙΣΤ.{0,3}ΕΞΩΣΤ/],
    ['H', /HMIYP|ΗΜΙΥΠ|(^|_)HX($|_)|(^|_)Η_?Χ($|_)/],
    ['X', /EXOST|ΕΞΩΣΤ|BALCON/],
    ['F', /FOTAG|ΦΩΤΑΓ|AITHRI|ΑΙΘΡΙ|FREATI|ΦΡΕΑΤ/],
    ['P', /STATHM|ΣΤΑΘΜ|PARKING|MHXANOST|ΜΗΧΑΝΟΣΤ|(^|_)H_?M($|_)/]
  ];
  function layerCode(L) { for (var k = 0; k < SPL_LAYER.length; k++) if (SPL_LAYER[k][1].test(L)) return SPL_LAYER[k][0]; return null; }
  function planDetect(D, c) {
    var all = closedIn(D, c).filter(function (e) { return e.area >= 0.3; });
    var res = { outline: [], spaces: [] };
    // α) δηλωμένα με layer
    var lout = [], lsp = [];
    all.forEach(function (e) { var k = layerCode(e.L); if (k === 'O') lout.push(e.id); else if (k) lsp.push({ id: e.id, code: k, lbl: false, byLayer: true }); });
    var cs = all.filter(function (e) { return e.area >= 1 && !layerCode(e.L); });
    if (lout.length) { res.outline = lout; res.spaces = lsp; return res; }
    res.spaces = lsp.slice();
    if (!cs.length) return res;
    cs.sort(function (a, b) { return b.area - a.area; });
    var cw = c.bb[2] - c.bb[0], chh = c.bb[3] - c.bb[1];
    var frame = /FRAME|PLAIS|ΠΛΑΙΣ|VPORT|VIEWPORT|DEFPOINTS|KAEK|ΚΑΕΚ|TOPO_PROP|BOUND|OIKOPED|ΟΙΚΟΠΕΔ|PLOT|GEOTEM|ΓΕΩΤΕΜ|ORIA|ΟΡΙΑ/;
    var cand = cs.filter(function (e) { return !frame.test(e.L); });
    var out = cand[0];
    if (!out) return res;
    // κι άλλα κομμάτια του ίδιου ορόφου (π.χ. δύο πτέρυγες) που δεν περιέχονται
    var outs = [out];
    cand.slice(1).forEach(function (e) { if (e.area > out.area * 0.25 && !outs.some(function (o) { return pip(cent(e.pts), o.pts); }) && !textIn(D, c, /./, e)) outs.push(e); });
    res.outline = outs.map(function (e) { return e.id; });
    var excl = {}; outs.forEach(function (o) { excl[o.id] = 1; });
    var seen = {}; lsp.forEach(function (sp) { seen[sp.id] = 1; });
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
    A: 'Ανοικτό κλιμακοστάσιο', F: 'Φωταγωγός / φρεάτιο / αίθριο', P: 'Στάθμευση / Η-Μ', E: 'Κλειστός εξώστης (έρκερ)', Y: 'Πυλωτή'
  };
  var TYP = { 1: 'Υπέργειο', 2: 'Υπόγειο', 3: 'Σοφίτα', 4: 'Υπόσκαφο', 5: 'Πατάρι', 9: 'Δώμα / στέγη' };
  function typText(t, u) {
    if (t === 2) return u === 2 ? 'Υπόγειο - στάθμευση/Η-Μ' : u === 3 ? 'Υπόγειο - κύρια χρήση' : 'Υπόγειο - βοηθητικό';
    if (t === 4) return u === 2 ? 'Υπόσκαφο - άλλη χρήση' : 'Υπόσκαφο - κατοικία';
    return TYP[t] || 'Υπέργειο';
  }
  // οικισμοί (άρθ. 238): Ζώνη Β/Β1 και Ζώνη Α, για κατοικία
  function oikMax(E, zone) {
    if (zone === 'A') {
      if (E <= 100) return { v: 1.6 * E, t: 'Σ.Δ. 1,6 (οικόπεδο έως 100 Μ2)', kp: 80 };
      if (E <= 200) return { v: Math.max(1.2 * E, 160), t: 'Σ.Δ. 1,2, ελάχιστη δόμηση 160 Μ2 (οικόπεδο 100-200 Μ2)', kp: 80 };
      if (E <= 300) return { v: Math.max(1.0 * E, 240), t: 'Σ.Δ. 1,0, ελάχιστη δόμηση 240 Μ2 (οικόπεδο 200-300 Μ2)' };
      if (E <= 2000) return { v: Math.min(400, Math.max(0.8 * E, 300)), t: 'Σ.Δ. 0,8, ελάχιστη 300 και μέγιστη 400 Μ2 (οικόπεδο 300-2.000 Μ2)' };
      return { v: 400 + (E - 2000) * 0.05, t: '400 Μ2 + (Ε - 2.000) x 0,05 (οικόπεδο άνω των 2.000 Μ2)' };
    }
    if (E <= 200) return { v: E, t: 'Σ.Δ. 1,0 (οικόπεδο έως 200 Μ2)' };
    if (E < 700) return { v: 240, t: 'μέγιστη δόμηση 240 Μ2 (οικόπεδο 200-700 Μ2)' };
    return { v: 400, t: 'μέγιστη δόμηση 400 Μ2 (οικόπεδο από 700 Μ2)' };
  }
  // εκτός σχεδίου κατοικία (άρθ. 256 παρ. 1β) — άλλες χρήσεις: Σ.Δ. 0,18 (άρθ. 251 παρ. 2)
  function ektMax(E) { if (E < 4000) return null; if (E <= 8000) return 186 + (E - 4000) * 0.018; return Math.min(360, 258 + (E - 8000) * 0.009); }
  function hmax210(s) { if (!(s > 0)) return null; if (s <= 0.4) return 10.75; if (s <= 0.8) return 14; if (s <= 1.2) return 17.25; if (s <= 1.6) return 19.5; if (s <= 2.0) return 22.75; if (s <= 2.6) return 26; return null; }
  function rnd(x) { return Math.floor(x + 0.5); }
  function gr(v, d) { if (v == null || !isFinite(v)) return '....'; d = d == null ? 2 : d; return v.toFixed(d).replace('.', ','); }
  function grz(v) { if (v == null || !isFinite(v)) return '....'; var s = gr(v, 2); return s.replace(/,?0+$/, ''); }

  /* ---------------- ανάλυση τομών / όψεων: στάθμες, έδαφος, ύψη ---------------- */
  var LVRE = /^(?:\+\/-|[+\-±])?\s*\d{1,3}[.,]\d{2}$/;
  function lvVal(s) { s = String(s).replace(/\s/g, '').replace(',', '.'); var neg = s.charAt(0) === '-'; var v = parseFloat(s.replace(/^\+\/-|^[+\-±]/, '')); return neg ? -v : v; }
  var GNAT_L = /FYSIK|ΦΥΣΙΚ|NATUR|EXIST|PHYS/, GFIN_L = /DIAMORF|ΔΙΑΜΟΡΦ|ORISTIK|ΟΡΙΣΤΙΚ|FINISH|TELIK|ΤΕΛΙΚ|FINAL_GR|GROUND_F/;
  var GNAT_T = /ΦΥΣΙΚΟ|ΦΥΣ\. ?ΕΔ|^Φ\.Ε\.?$/, GFIN_T = /ΔΙΑΜΟΡΦΩΜΕΝ|ΟΡΙΣΤΙΚ|ΤΕΛΙΚΟ ΕΔ|^Ο\.Σ\.Ε|^Ο\.Δ\.Ε|^Δ\.Ε\.?$/;
  function yAt(list, x) {
    var best = null;
    list.forEach(function (e) {
      var P = e.pts;
      for (var i = 0; i < P.length - 1; i++) {
        var a = P[i], b = P[i + 1], x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]);
        if (x < x0 - 1e-6 || x > x1 + 1e-6 || x1 - x0 < 1e-9) continue;
        var y = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
        best = best == null ? y : Math.min(best, y);
      }
    });
    return best;
  }
  function xRange(list) { var a = 1e30, b = -1e30; list.forEach(function (e) { e.pts.forEach(function (p) { a = Math.min(a, p[0]); b = Math.max(b, p[0]); }); }); return [a, b]; }
  // S: αποτέλεσμα για μία τομή ή όψη — όλα σε μέτρα, στάθμες ως προς ±0,00 της τομής
  function sectionAnalyze(D, c) {
    var S = { id: c.id, marks: [], nat: [], fin: [], notes: [], ok: true };
    var ents = c.ents.map(function (i) { return D.ents[i]; }).filter(Boolean);
    c.texts.forEach(function (ti) { var t = D.texts[ti], s = t.text.trim(); if (LVRE.test(s)) S.marks.push({ y: t.y, lv: lvVal(s), x: t.x, s: s }); });
    // γραμμές εδάφους από layer
    ents.forEach(function (e) { if (e.closed) return; if (GFIN_L.test(e.L)) S.fin.push(e); else if (GNAT_L.test(e.L)) S.nat.push(e); });
    // ή από κείμενο δίπλα στη γραμμή (μόνο αν δεν δηλώθηκε ήδη με layer)
    var haveN = S.nat.length > 0, haveF = S.fin.length > 0;
    c.texts.forEach(function (ti) {
      var t = D.texts[ti], isN = GNAT_T.test(t.n) && !haveN, isF = GFIN_T.test(t.n) && !haveF; if (!isN && !isF) return;
      var best = null, bd = 2.5;
      ents.forEach(function (e) { if (e.closed || S.fin.indexOf(e) >= 0 || S.nat.indexOf(e) >= 0) return; var d = dpoly([t.x, t.y], e.pts.length > 2 ? e.pts : e.pts.concat([e.pts[0]])); if (d < bd) { bd = d; best = e; } });
      if (best) (isF ? S.fin : S.nat).push(best);
    });
    var cw = c.bb[2] - c.bb[0];
    if (!S.fin.length && !S.nat.length) {
      // καμία δηλωμένη γραμμή εδάφους: η φαρδύτερη ανοικτή γραμμή θεωρείται έδαφος (φυσικό = διαμορφωμένο)
      var w = null; ents.forEach(function (e) { if (e.closed) return; var ew = e.bb[2] - e.bb[0]; if (ew >= 0.6 * cw && (!w || ew > w.bb[2] - w.bb[0])) w = e; });
      if (w) { S.fin.push(w); S.nat.push(w); S.assumed = true; S.notes.push('Δεν βρέθηκαν χωριστές γραμμές φυσικού και διαμορφωμένου εδάφους — η γραμμή εδάφους θεωρήθηκε και τα δύο (καμία εκσκαφή / επίχωση).'); }
    } else if (!S.fin.length) { S.fin = S.nat.slice(); S.notes.push('Δεν βρέθηκε γραμμή διαμορφωμένου εδάφους — θεωρήθηκε ίδια με το φυσικό.'); }
    else if (!S.nat.length) { S.nat = S.fin.slice(); S.noNat = true; S.notes.push('Δεν βρέθηκε γραμμή φυσικού εδάφους — δεν ελέγχονται εκσκαφές / επιχώσεις σε αυτή την τομή.'); }
    var ground = S.fin.concat(S.nat);
    // κτίριο: ό,τι δεν είναι έδαφος και δεν είναι σύμβολο στάθμης
    var bld = ents.filter(function (e) { if (ground.indexOf(e) >= 0) return false; var w = e.bb[2] - e.bb[0], h = e.bb[3] - e.bb[1]; if (w < 0.7 && h < 0.7) return false; if (w >= 0.95 * cw && h < 0.05) return false; return true; });
    if (!bld.length || !S.fin.length) { S.ok = false; S.notes.push('Δεν αναγνωρίστηκε κτίριο ή έδαφος στο σχέδιο.'); return S; }
    var bx0 = 1e30, bx1 = -1e30, ry = -1e30;
    bld.forEach(function (e) { e.pts.forEach(function (p) { var g = yAt(S.fin, p[0]); if (g != null && p[1] < g + 0.2) return; bx0 = Math.min(bx0, p[0]); bx1 = Math.max(bx1, p[0]); ry = Math.max(ry, p[1]); }); });
    if (!(bx1 > bx0)) { S.ok = false; S.notes.push('Δεν βρέθηκε τμήμα κτιρίου πάνω από το έδαφος.'); return S; }
    S.bx = [bx0, bx1]; S.ridgeY = ry;
    // κεκλιμένα τμήματα στο πάνω μέρος = στέγη
    var eave = null;
    bld.forEach(function (e) { var P = e.pts, n = P.length, m = e.closed ? n : n - 1;
      for (var i = 0; i < m; i++) { var a = P[i], b = P[(i + 1) % n], dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1]);
        if (dx < 0.3 || dy < 0.05) continue; var ang = Math.atan2(dy, dx) * 180 / Math.PI; if (ang < 5 || ang > 75) continue;
        if (Math.min(a[1], b[1]) < ry - 6) continue; var lo = Math.min(a[1], b[1]); eave = eave == null ? lo : Math.min(eave, lo); } });
    S.pitched = eave != null && ry - eave > 0.15; S.eaveY = S.pitched ? eave : null;
    // αντιστοίχιση y → στάθμη (σχέδιο σε μέτρα 1:1)
    var gx = [bx0 - 0.05, bx1 + 0.05].map(function (x) { var g = yAt(S.fin, x); return g == null ? yAt(S.fin, x < (bx0 + bx1) / 2 ? bx0 + 0.05 : bx1 - 0.05) : g; });
    if (S.marks.length) {
      var bs = S.marks.map(function (m) { return m.lv - m.y; }).sort(function (a, b) { return a - b; });
      S.b = bs[Math.floor(bs.length / 2)]; S.fitErr = 0; S.marks.forEach(function (m) { S.fitErr = Math.max(S.fitErr, Math.abs(m.lv - (m.y + S.b))); });
      if (S.fitErr > 0.35) S.notes.push('Οι στάθμες δεν συμφωνούν με σχέδιο σε κλίμακα 1:1 (απόκλιση έως ' + gr(S.fitErr) + ' μ.) — έλεγξε ότι η τομή είναι σχεδιασμένη σε μέτρα.');
      S.hasZero = S.marks.some(function (m) { return Math.abs(m.lv) < 0.005; });
    } else { var g0 = Math.min.apply(null, gx.filter(function (v) { return v != null; })); S.b = -g0; S.noMarks = true; S.notes.push('Δεν βρέθηκαν στάθμες (π.χ. ±0,00, +3,20) — τα ύψη μετρήθηκαν από το χαμηλότερο σημείο του εδάφους στις όψεις.'); }
    var LV = function (y) { return y + S.b; };
    // ύψος κτιρίου κατά 197 παρ. 89: έως την άνω επιφάνεια του τελευταίου ορόφου ή, σε στέγη, έως την κατώτερη έδραση της στέγης
    var topLv;
    if (S.pitched) topLv = LV(S.eaveY);
    else { var rl = LV(ry), mk = S.marks.filter(function (m) { return m.lv <= rl + 0.05 && m.lv >= rl - 1.3; }).sort(function (a, b) { return b.lv - a.lv; }); topLv = mk.length ? mk[0].lv : rl; if (mk.length && rl - mk[0].lv > 0.05) S.parapet = rl - mk[0].lv; }
    S.topLv = topLv; S.ridgeLv = LV(ry); S.roof = S.pitched ? LV(ry) - LV(S.eaveY) : 0;
    S.gFac = gx.map(function (g) { return g == null ? null : LV(g); });
    S.Hfac = S.gFac.map(function (g) { return g == null ? null : topLv - g; });
    S.Hmax = Math.max.apply(null, S.Hfac.filter(function (v) { return v != null; }));
    // οροφή υπογείου (στάθμη ±0,00) πάνω από το οριστικό έδαφος στις όψεις
    var minMark = S.marks.length ? Math.min.apply(null, S.marks.map(function (m) { return m.lv; })) : null;
    S.hasBase = minMark != null && minMark < -1.5;
    if (S.hasBase) S.baseRoof = Math.max.apply(null, S.gFac.filter(function (v) { return v != null; }).map(function (g) { return 0 - g; }));
    // εκσκαφές / επιχώσεις στον ακάλυπτο (έξω από το κτίριο)
    S.fill = 0; S.dig = 0;
    if (!S.assumed && !S.noNat) {
      var r = xRange(S.fin.concat(S.nat));
      for (var x = r[0]; x <= r[1] + 1e-9; x += 0.1) {
        if (x > bx0 - 0.01 && x < bx1 + 0.01) continue;
        var f = yAt(S.fin, x), nn = yAt(S.nat, x); if (f == null || nn == null) continue;
        var d = f - nn; if (d > S.fill) { S.fill = d; S.fillX = x; } if (-d > S.dig) { S.dig = -d; S.digX = x; }
      }
    }
    // κλίση φυσικού εδάφους
    var nr = xRange(S.nat); if (nr[1] - nr[0] > 1) { var lo = 1e30, hi = -1e30; for (var xx = nr[0]; xx <= nr[1]; xx += 0.25) { var v = yAt(S.nat, xx); if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); } } S.slope = 100 * (hi - lo) / (nr[1] - nr[0]); }
    return S;
  }

  // A: { E, mode(1 σχέδιο, 2 εκτός, 3 οικισμός), sd, kp, cap, hmax, roofmax, so, plot, cov[{pts}], levels[{name,typ,use,h,outlines[pts],spaces[{code,pts}]}],
  //      H, roof, fytA, prasA, units, m2per, prov, akal, fronts[], plotPts, dists[] }
  function compute(A) {
    var R = { items: [], sug: [], lv: [] };
    var E = A.E, mode = A.mode;
    // επιτρεπόμενη δόμηση — από το εμβαδόν του τοπογραφικού
    var allow = null, allowTxt = '';
    if (mode === 1) { if (A.sd > 0) { allow = A.sd * E; allowTxt = 'Ε=Σ.Δ. x Εοικ.= ' + gr(A.sd) + ' x ' + gr(E) + ' = ' + gr(allow) + ' Μ2'; }
      if (allow != null && A.cap) { var c2 = oikMax(E, 'B').v; if (c2 < allow) { allow = c2; allowTxt += ' → όριο οικισμού <2.000 κατ.: ' + gr(c2) + ' Μ2'; } } }
    else if (mode === 3) { var om = oikMax(E, A.zone); allow = om.v; allowTxt = 'Ζώνη ' + (A.zone === 'A' ? 'Α' : 'Β/Β1') + ': ' + om.t + ' → Ε= ' + gr(allow) + ' Μ2'; R.oikKp = om.kp; }
    else if (A.resid === false) { allow = 0.18 * E; allowTxt = 'Ε=0,18 x ' + gr(E) + ' = ' + gr(allow) + ' Μ2 (Σ.Δ. 0,18, άρθ. 251 παρ. 2)'; }
    else { allow = ektMax(E); allowTxt = allow == null ? 'γήπεδο κάτω από 4.000 Μ2 — μη άρτιο κατά κανόνα (άρθ. 251 παρ. 1)' : (E <= 8000 ? 'Ε=186,00 Μ2 + 0,018 x (Ε - 4.000) = ' : 'Ε=258,00 Μ2 + 0,009 x (Ε - 8.000), έως 360 = ') + gr(allow) + ' Μ2 (κατοικία, άρθ. 256 παρ. 1β)'; }
    if (A.maxd > 0) { allow = allow == null ? A.maxd : Math.min(allow, A.maxd); allowTxt += (allowTxt ? ' · ' : '') + 'μέγιστη ' + gr(A.maxd) + ' Μ2'; }
    R.allow = allow; R.allowTxt = allowTxt;
    // κάλυψη
    var Sk = 0; A.cov.forEach(function (p) { Sk += area(p); });
    var kp = A.kp; if (mode === 3 && R.oikKp) kp = Math.max(kp, R.oikKp); if (mode === 2) kp = Math.min(kp || 10, 10);
    var kpe = kp; if (mode === 1 && kp > 0 && kp * E / 100 < 120) kpe = Math.max(kp, 100 * Math.min(120, 0.7 * E) / E);
    var Ka = kpe > 0 ? E * kpe / 100 : null; if (mode === 2 && Ka != null && allow != null) Ka = Math.min(Ka, allow);
    R.Sk = Sk; R.kpe = kpe; R.Ka = Ka; R.pk = 100 * Sk / E;
    // επίπεδα
    var Dom = 0, HX = 0, Hh = 0, Pat = 0, acount = 0, entr = -1, Vr = 0, remB = Sk, Ein = 0;
    A.levels.forEach(function (L, j) { if (entr < 0 && L.typ === 1) entr = j; });
    // τομές: ύψος, στέγη, έδαφος
    var SEC = (A.secs || []).filter(function (x) { return x && x.ok; });
    var sx = { n: SEC.length, Hmax: null, roof: 0, fill: 0, dig: 0, slope: 0, baseRoof: null, parapet: 0 };
    SEC.forEach(function (x) { if (x.Hmax != null && isFinite(x.Hmax)) sx.Hmax = sx.Hmax == null ? x.Hmax : Math.max(sx.Hmax, x.Hmax); sx.roof = Math.max(sx.roof, x.roof || 0); sx.fill = Math.max(sx.fill, x.fill || 0); sx.dig = Math.max(sx.dig, x.dig || 0); sx.slope = Math.max(sx.slope, x.slope || 0); if (x.baseRoof != null) sx.baseRoof = sx.baseRoof == null ? x.baseRoof : Math.max(sx.baseRoof, x.baseRoof); });
    R.sx = sx;
    var Hu = A.H > 0 ? A.H : (sx.Hmax || 0);
    // χωρίς τομές: εκτίμηση από τα ύψη των υπέργειων επιπέδων (άθροισμα), σημειώνεται ως εκτίμηση
    R.Hest = false;
    if (!(Hu > 0)) { var hs = 0; A.levels.forEach(function (L) { if (L.typ === 1) hs += (L.h || 0); }); if (hs > 0) { Hu = hs; R.Hest = true; } }
    R.Hu = Hu;
    var baseLim = mode === 2 ? 0.80 : 1.20; R.baseLim = baseLim;
    var baseBad = sx.baseRoof != null && sx.baseRoof > baseLim + 0.005; R.baseBad = baseBad;
    if (mode === 2 && sx.slope > 35 && allow != null) remB = Math.min(remB, 0.2 * allow);   // 251 παρ. 7
    // στάθμη δαπέδου κάθε υπέργειου επιπέδου πάνω από το έδαφος (για τα ανοικτά κλιμακοστάσια)
    var zf = [], zacc = 0; A.levels.forEach(function (L, j) { zf[j] = (L.typ === 1 || L.typ === 3) ? zacc : 0; if (L.typ === 1) zacc += (L.h || 0); });
    A.levels.forEach(function (L, j) {
      var G = 0; L.outlines.forEach(function (p) { G += area(p); });
      var tot = G, ex = 0, hx = 0, h = 0, sp = [];
      L.spaces.forEach(function (s) {
        var a = area(s.pts), inn = L.outlines.some(function (o) { return pip(cent(s.pts), o); }), x = 0, nt = '';
        if (!inn) tot += a;
        if (s.code === 'H' || s.code === 'X') { hx += a; if (s.code === 'H') h += a; nt = 'όριο 40% / 20% στο σύνολο (206 παρ. 6α)'; }
        else if (s.code === 'K') { var lim = j === entr ? 40 : 30; x = Math.min(a, lim); nt = 'έως ' + lim + ' τ.μ. ανά επίπεδο (206 παρ. 6δ)'; }
        else if (s.code === 'I') { x = Math.min(a, 25); nt = 'έως 25 τ.μ. ανά επίπεδο (206 παρ. 6ε)'; }
        else if (s.code === 'A') { acount++; if (acount <= 2 && zf[j] <= 7.5 + 0.005) { x = a; nt = 'έως 2 ανοικτά, στάθμη ορόφου έως 7,50 μ. (206 παρ. 6στ)'; } else nt = acount > 2 ? '3ο ανοικτό κλιμακοστάσιο: μετρά' : 'εξυπηρετεί στάθμη ' + gr(zf[j]) + ' μ. > 7,50 μ.: μετρά (206 παρ. 6στ)'; }
        else if (s.code === 'F') { x = a; nt = a < 1.5 ? 'ως φρεάτιο Η/Μ· φωταγωγός θέλει 1,50 τ.μ. (206 παρ. 6η)' : 'δεν φωτίζει κύριους χώρους (206 παρ. 6η)'; }
        else if (s.code === 'P') { if (L.typ === 1) { x = 0; nt = 'υπέργεια στάθμευση μετρά — εξαιρείται μόνο σε κτίριο αμιγούς χρήσης στάθμευσης (206 παρ. 6β)'; } else { x = a; nt = 'υπόγεια στάθμευση / Η-Μ / νερό / πισίνα (206 παρ. 6θ)'; } }
        else if (s.code === 'Y') { x = inn ? a : 0; nt = 'πυλωτή: δεν μετρά εφόσον ≥ 50% της κάλυψης, δάπεδο ±0,50 μ. από το έδαφος, ελεύθερο ύψος κύριας χρήσης (206 παρ. 6ιστ)'; }
        else if (s.code === 'E') { if (L.typ === 1 && inn) Ein += a; else if (L.typ === 1) Ein += 0; nt = 'μετρά στη δόμηση· δεν μετρά στην κάλυψη (207 παρ. 4β)'; }
        if (s.code !== 'H' && s.code !== 'X') ex += x;
        sp.push({ code: s.code, a: a, x: x, nt: nt, inn: inn });
      });
      var Lc = tot - ex - hx, cnt = Lc, nt = '';
      if (L.typ === 2 && baseBad) { cnt = Lc; nt = 'ΔΕΝ είναι υπόγειο: η οροφή του βγαίνει ' + gr(sx.baseRoof) + ' μ. πάνω από το έδαφος (> ' + gr(baseLim) + ' μ., ' + (mode === 2 ? '251 παρ. 8' : mode === 3 ? '239 Γ2' : '197 παρ. 87') + ') — μετρά όλο ως όροφος'; }
      else if (L.typ === 2) {
        if (L.use === 2) { cnt = 0; nt = 'στάθμευση / Η-Μ / νερό / ΑΠΕ / πισίνα: δεν μετρά (206 παρ. 6θ)'; }
        else if (L.use === 3) { var inB = Math.min(Lc, remB); remB -= inB; cnt = Lc - 0.5 * inB; nt = 'κύρια χρήση: μετρά το 50% έως την κάλυψη (' + gr(inB) + ' τ.μ.) και όλο το υπόλοιπο (206 παρ. 6ι)'; }
        else { var inA = Math.min(Lc, remB); remB -= inA; cnt = Lc - inA; nt = 'βοηθητικός: δεν μετρά έως την κάλυψη του κτιρίου (σύνολο βοηθητικών υπογείων ≤ ' + gr(Sk) + ' τ.μ.), οροφή ≤ 1,20 μ. από το οριστικό έδαφος (206 παρ. 6ι, 197 παρ. 87)' + (cnt > 0.005 ? ' — μετρούν ' + gr(cnt) + ' τ.μ.' : ''); }
      } else if (L.typ === 3) {
        var ug = null;
        for (var k = j - 1; k >= 0 && ug == null; k--) if (A.levels[k].typ === 1) { ug = 0; A.levels[k].outlines.forEach(function (p) { ug += area(p); }); }
        if (ug == null) A.levels.forEach(function (M) { if (ug == null && M.typ === 1) { ug = 0; M.outlines.forEach(function (p) { ug += area(p); }); } });
        if (ug != null && Lc <= 0.5 * ug + 0.005) { cnt = 0; nt = 'έως 1/2 του υποκείμενου ορόφου μαζί με τους τοίχους (' + gr(0.5 * ug) + ' τ.μ.) — δεν μετρά (206 περ. ιδ)'; }
        else if (ug != null) { cnt = Lc - 0.5 * ug; nt = 'ξεπερνά το 1/2 του υποκείμενου (' + gr(0.5 * ug) + ' τ.μ.) — μετρά η υπέρβαση ' + gr(cnt) + ' τ.μ. (197 παρ. 81, 206 περ. ιδ)'; }
        else nt = 'χωρίς υποκείμενο όροφο — μετρά';
        L._ug = ug;
      } else if (L.typ === 4) { cnt = Lc * (L.use === 2 ? 0.8 : 0.5); nt = L.use === 2 ? 'υπόσκαφο άλλης χρήσης: εξαιρείται 20% (206 κγ)' : 'υπόσκαφο κατοικίας: εξαιρείται 50% (206 κγ)'; }
      else if (L.typ === 5) { Pat += Lc; var ub = null; for (var q = j - 1; q >= 0 && ub == null; q--) if (A.levels[q].typ === 1) { ub = 0; A.levels[q].outlines.forEach(function (p) { ub += area(p); }); } L._ub = ub; nt = 'πατάρι: μετρά στη δόμηση· καθαρό εμβαδόν < 70% του χώρου κάτω του (197 παρ. 28)'; }
      else if (L.typ === 9) { cnt = 0; nt = 'δώμα / στέγη: σχέδιο αναφοράς'; }
      if (L.typ === 1 || L.typ === 3) Vr += G * (L.h || 0);
      Dom += cnt; HX += hx; Hh += h;
      R.lv.push({ name: L.name, typ: L.typ, use: L.use, G: G, tot: tot, ex: ex, hx: hx, h: h, Lc: Lc, cnt: cnt, nt: nt, sp: sp, hgt: L.h, ug: L._ug, ub: L._ub, z: zf[j] });
    });
    var lim40 = allow != null ? 0.4 * allow : null, limH = allow != null ? 0.2 * allow : null;
    // χαμηλό κτίριο (221): κατοικία, ύψος ≤ 8,50 χωρίς τη στέγη, δόμηση ≤ 400 τ.μ., όχι όπου το επιτρεπόμενο ύψος < 11 μ.
    var hmax0 = A.hmax || (mode === 1 ? hmax210(A.sd) : mode === 3 ? (A.zone !== 'A' && A.plain ? 8 : 7.5) : 7.5);
    var low = mode === 1 && A.resid !== false && Hu > 0 && Hu <= 8.5 + 0.005 && Dom <= 400 + 0.005 && hmax0 >= 11 - 0.005;
    R.lowWhy = { resid: A.resid !== false, h: Hu > 0 && Hu <= 8.5 + 0.005, dom: Dom <= 400 + 0.005, area: hmax0 >= 11 - 0.005 };
    var HXc = (allow != null && !low) ? Math.max(0, HX - lim40, Hh - limH) : 0;
    Dom += HXc;
    R.Dom = Dom; R.HX = HX; R.Hh = Hh; R.HXc = HXc; R.lim40 = lim40; R.limH = limH; R.Pat = Pat; R.okP = true;
    // κάλυψη που προκύπτει από τις κατόψεις (προβολή κλειστών + στεγασμένων + ημιυπαίθριων, χωρίς εξώστες) — 207 παρ. 3-4
    var Kpl = null; R.lv.forEach(function (l) { if (l.typ !== 1) return; var k = l.G - 0; l.sp.forEach(function (sp) { if (sp.code === 'H' && !sp.inn) k += sp.a; if (sp.code === 'E' && sp.inn) k -= sp.a; }); Kpl = Kpl == null ? k : Math.max(Kpl, k); });
    R.Kpl = Kpl;
    // όγκος
    var Va = null, SO = null;
    if (mode !== 2 && allow != null && A.so > 0) { SO = A.so * allow / E; Va = E * SO; }
    else if (mode === 2 && A.so > 0) { SO = A.so; Va = E * SO; }
    R.Vr = Vr; R.Va = Va; R.SO = SO;
    // ύψος & αποστάσεις
    var hmax = hmax0, roofmax = A.roofmax || (mode === 2 ? 1.2 : 2.0);
    if (mode === 2) roofmax = Math.min(roofmax, 1.2);
    if (low) roofmax = Math.min(roofmax, 1.5);
    // ύψος κατά τον τρόπο μέτρησης κάθε καθεστώτος
    var Hm = null, H10 = null, Rg = null;
    if (SEC.length) {
      SEC.forEach(function (x) {
        var g = x.gFac.filter(function (v) { return v != null; }); if (!g.length) return;
        var hv = mode === 3 ? x.topLv - Math.max.apply(null, g) : x.topLv - Math.min.apply(null, g);   // 239 Γ1: από το ψηλότερο σημείο τομής με το έδαφος
        var hlo = x.topLv - Math.min.apply(null, g);
        Hm = Hm == null ? hv : Math.max(Hm, hv); H10 = H10 == null ? hlo : Math.max(H10, hlo);
        var rv = hv + (x.ridgeLv - x.topLv); Rg = Rg == null ? rv : Math.max(Rg, rv);
      });
    }
    R.Hm = A.H > 0 ? A.H : (Hm != null ? Hm : (R.Hest ? Hu : null)); R.H10 = H10;
    R.ridge = A.H > 0 ? A.H + (A.roof || 0) : (Rg != null ? Rg : (R.Hest ? Hu : null)); R.ridgeMax = (low ? 8.5 : hmax) + roofmax;
    var dreq = null, Dbig = null;
    if (mode === 1 && Hu > 0) { dreq = low ? 2.5 : 2.5 + 0.05 * Hu; Dbig = low ? 2.5 : 3 + 0.1 * Hu; }
    if (mode === 3) { dreq = 2.5; Dbig = 2.5; }
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
      R.akReq = akReq; R.fytReq = akReq != null ? akReq * 2 / 3 : null; R.fytA = A.fytA + (A.poolA || 0);
      R.trPras = A.prasA > 0 ? rnd(A.prasA / 25) : 0; R.trRest = rnd((E - (A.prasA || 0)) / 200);
    }
    R.req = A.m2per > 0 ? Math.max(1, rnd(Dom / A.m2per)) : Math.max(0, Math.round(A.units || 0));
    R.prov = A.prov;
    return R;
  }

  /* ---------------- έλεγχοι με τεκμηρίωση (άρθρα) — ανά καθεστώς ---------------- */
  // κατάσταση: ok | fail | warn | info · grp: ydom | dilosi | ktirio | amea
  // κάθε έλεγχος: title, val (υπολογισμός), art (διάταξη), rule (τι λέει ο νόμος), why (σχόλιο)
  var N = 'ν.5306/2026 ';
  function checks(A, R) {
    var C = [], m = A.mode, E1 = m === 1, E2 = m === 2, E3 = m === 3;
    function add(grp, st, title, val, art, rule, why) { C.push({ grp: grp, st: st, title: title, val: val, art: art, rule: rule || '', why: why || '' }); }
    function le(a, b) { return a <= b + 0.005; }
    var G = 'ydom', Y = 'dilosi', K = 'ktirio', M = 'amea';
    var reg = E1 ? 'εντός εγκεκριμένου σχεδίου' : E3 ? 'εντός ορίων οικισμού (Ζώνη ' + (A.zone === 'A' ? 'Α' : 'Β/Β1') + ')' : 'εκτός σχεδίου';
    add(G, 'info', 'Καθεστώς περιοχής', reg + ' — εφαρμόζονται ' + (E1 ? 'τα άρθ. 197-225' : E3 ? 'τα άρθ. 237-242 και όσα ορίζει το άρθ. 196 παρ. 3 (όχι τα 209, 210, 221)' : 'τα άρθ. 250-256 και όσα ορίζει το άρθ. 196 παρ. 2 (όχι τα 209, 210, 221)'),
      N + 'άρθ. 196', 'Το άρθ. 196 ορίζει ποια άρθρα του Τμήματος εφαρμόζονται εκτός σχεδίου (παρ. 2) και σε οικισμούς χωρίς ρυμοτομικό (παρ. 3). Ειδικές διατάξεις (π.δ. οικισμού, ΖΟΕ, ΓΠΣ) κατισχύουν (παρ. 5).');
    // ---------- ΚΑΛΥΨΗ ----------
    var kArt = E1 ? N + 'άρθ. 207 παρ. 1' : E3 ? N + 'άρθ. 238' : N + 'άρθ. 251 παρ. 2';
    var kRule = E1 ? 'Έως 60% του οικοπέδου (ή ό,τι ορίζουν οι όροι της περιοχής)· αν δεν εξασφαλίζονται 120 τ.μ., προσαύξηση έως 120 τ.μ. χωρίς υπέρβαση του 70%· 40% σε περιοχές πανταχόθεν ελεύθερου συστήματος.'
      : E3 ? 'Έως 60% του οικοπέδου· στη Ζώνη Α σε οικόπεδα έως 200 τ.μ. έως 80%.' : 'Έως 10% του γηπέδου και όχι πάνω από τη μέγιστη επιτρεπόμενη δόμηση.';
    if (R.Ka != null) add(G, le(R.Sk, R.Ka) ? 'ok' : 'fail', 'Κάλυψη', gr(R.Sk) + ' τ.μ. (' + gr(R.pk) + '%) ' + (le(R.Sk, R.Ka) ? '≤' : '>') + ' επιτρεπόμενη ' + gr(A.E) + ' x ' + grz(R.kpe) + '% = ' + gr(R.Ka) + ' τ.μ.', kArt, kRule,
      E1 && R.kpe > A.kp + 0.001 ? 'Εφαρμόστηκε η προσαύξηση έως 120 τ.μ. (άρθ. 207 παρ. 1α).' : '');
    else add(G, 'warn', 'Κάλυψη', 'δεν δόθηκε ποσοστό κάλυψης', kArt, kRule, 'Συμπλήρωσε τους όρους στο βήμα 1.');
    add(G, 'info', 'Τι μετρά στην κάλυψη', 'μετρούν: κλειστοί χώροι, στεγασμένοι μη θερμαινόμενοι με άνοιγμα < 35% της περιμέτρου, ανοικτοί ημιυπαίθριοι · δεν μετρούν: εξώστες ανοικτοί και κλειστοί, εσοχές, αίθρια/φρεάτια από το έδαφος, βοηθητικό υπόγειο, 50%/20% υπόσκαφων, κατασκευές 211-212', N + 'άρθ. 207 παρ. 3-4', 'Η κάλυψη είναι η ορθή προβολή σε οριζόντιο επίπεδο των κλειστών και στεγασμένων χώρων και των ανοικτών ημιυπαίθριων (παρ. 3)· εξαιρούνται όσα απαριθμεί η παρ. 4.');
    if (R.Kpl != null) {
      var dK = R.Sk - R.Kpl;
      add(G, dK >= -0.5 ? 'ok' : 'fail', 'Κάλυψη τοπογραφικού ↔ κατόψεων', 'τοπογραφικό ' + gr(R.Sk) + ' τ.μ. · προβολή κατόψεων ' + gr(R.Kpl) + ' τ.μ. (περίγραμμα + ημιυπαίθριοι εκτός περιγράμματος − κλειστοί εξώστες)', N + 'άρθ. 207 παρ. 3-4',
        'Η κάλυψη στο τοπογραφικό πρέπει να περιλαμβάνει όλη την προβολή κλειστών, στεγασμένων και ημιυπαίθριων χώρων όλων των ορόφων.',
        dK < -0.5 ? 'Η κάλυψη του τοπογραφικού είναι μικρότερη κατά ' + gr(-dK) + ' τ.μ. από ό,τι δείχνουν οι κατόψεις — διόρθωσε το περίγραμμα κάλυψης.' : dK > 2 ? 'Η κάλυψη του τοπογραφικού είναι μεγαλύτερη κατά ' + gr(dK) + ' τ.μ.: έλεγξε αν σημείωσες ως κάλυψη και εξώστες ή εσοχές που δεν μετρούν (207 παρ. 4).' : '');
    }
    if (E2) add(G, A.E >= 4000 - 0.005 ? 'ok' : 'fail', 'Αρτιότητα γηπέδου', gr(A.E) + ' τ.μ. — κατά κανόνα ≥ 4.000 τ.μ. και πρόσωπο ≥ 25 μ. (≥ 45 μ. / βάθος 50 μ. σε εθνική, επαρχιακή, δημοτική οδό)', N + 'άρθ. 251 παρ. 1', 'Ελάχιστο εμβαδόν 4.000 τ.μ. και πρόσωπο 25 μ. σε κοινόχρηστο δρόμο· οι παρεκκλίσεις αρτιότητας (750 / 1.200 / 2.000 τ.μ.) ισχύουν μεταβατικά κατά το άρθ. 273.', A.E < 4000 ? 'Κάτω από 4.000 τ.μ.: οικοδομήσιμο μόνο κατά παρέκκλιση (άρθ. 273) — έλεγξε ημερομηνία δημιουργίας και πρόσωπο.' : '');
    if (E3) add(G, 'info', 'Αρτιότητα οικοπέδου', gr(A.E) + ' τ.μ. — κατά το π.δ. οριοθέτησης (κατά κανόνα 2.000 τ.μ. / 15 μ. πρόσωπο, με παρεκκλίσεις 300 / 150 τ.μ. κατά ημερομηνία)', N + 'άρθ. 237', 'Αρτιότητα κατά το π.δ. οριοθέτησης του οικισμού και τις παρεκκλίσεις του άρθ. 237 παρ. 2.');
    if (E2 && R.allow != null) add(G, le(R.Sk, R.allow) ? 'ok' : 'fail', 'Κάλυψη ≤ μέγιστη δόμηση', gr(R.Sk) + ' ≤ ' + gr(R.allow) + ' τ.μ.', N + 'άρθ. 251 παρ. 2, 256', 'Εκτός σχεδίου η κάλυψη δεν υπερβαίνει την επιτρεπόμενη δόμηση.');
    // ---------- ΟΓΚΟΣ ----------
    if (R.Va != null) add(G, R.Vr <= R.Va + 0.5 ? 'ok' : 'fail', 'Όγκος', gr(R.Vr) + ' ' + (R.Vr <= R.Va + 0.5 ? '≤' : '>') + ' ' + gr(R.Va) + ' μ³ (Σ.Ο. ' + gr(R.SO, 3) + ')', N + 'άρθ. 208', 'Σ.Ο. = 5 x Σ.Δ. (ή 5,5 κατά περίπτωση)· ο όγκος των υπέργειων τμημάτων μετρά από τα μικτά περιγράμματα.', 'Υπολογισμός: μικτό περίγραμμα κάθε υπέργειου επιπέδου x ύψος επιπέδου.');
    else add(G, 'warn', 'Όγκος', 'πραγματοποιούμενος ' + gr(R.Vr) + ' μ³ — δεν ορίστηκε Σ.Ο.', N + 'άρθ. 208', 'Σ.Ο. = 5 x Σ.Δ. (ή 5,5 κατά περίπτωση).', 'Δώσε τον συντελεστή όγκου στο βήμα 1.');
    // ---------- ΥΨΟΣ ----------
    var Hc = R.Hm;
    var hArt = E1 ? N + 'άρθ. 210 παρ. 1, 3 · 197 παρ. 89' : E3 ? N + 'άρθ. 239 Β2, Γ1' : N + 'άρθ. 251 παρ. 5, 256 παρ. 1β';
    var hRule = E1 ? 'Μέγιστο ύψος κατά τον ΣΔ της περιοχής (0,4→10,75 · 0,8→14 · 1,2→17,25 · 1,6→19,50 · 2,0→22,75 · 2,6→26 μ.), μετρούμενο σε κάθε σημείο των όψεων από την οριστική στάθμη του εδάφους (ή από το πεζοδρόμιο, αν οι όψεις είναι στη ρυμοτομική γραμμή)· έως την άνω επιφάνεια του τελευταίου ορόφου ή, σε στέγη, έως την κατώτερη έδρασή της.'
      : E3 ? 'Μέγιστο ύψος 7,50 μ. (έως 8 μ. σε πεδινούς οικισμούς Ζώνης Β), μετρούμενο από το ψηλότερο σημείο τομής του περιγράμματος της κάτοψης με το φυσικό ή οριστικά διαμορφωμένο έδαφος· λόγω κλίσης, όχι πάνω από 10 μ. σε κανένα σημείο.'
      : 'Μέγιστο ύψος 7,50 μ. (μονώροφο 4,00 μ. για κατοικία), μετρούμενο από το φυσικό ή διαμορφωμένο έδαφος σε κάθε όψη· με κεκλιμένη στέγη +1,20 μ.';
    if (R.hmax) add(G, !(Hc > 0) ? 'warn' : (le(Hc, R.hmax) ? (R.Hest ? 'warn' : 'ok') : 'fail'), 'Ύψος κτιρίου', (Hc > 0 ? 'Η=' + gr(Hc) + ' μ.' + (A.H > 0 ? ' (δόθηκε)' : R.sx.n ? ' (μετρήθηκε σε ' + R.sx.n + ' τομές/όψεις)' : R.Hest ? ' (εκτίμηση: άθροισμα υψών υπέργειων ορόφων)' : '') : 'δεν μετρήθηκε') + ' — μέγιστο ' + gr(R.hmax) + ' μ.', hArt, hRule,
      !(Hc > 0) ? 'Σχεδίασε στις τομές γραμμή εδάφους και στάθμες (±0,00, +3,20 …) ή δώσε το ύψος στο βήμα 5.' : R.Hest ? 'Το ύψος βγήκε από τα ύψη ορόφων (βήμα 4), όχι από τομές· για τελικό έλεγχο ανέβασε τομές με στάθμες και έδαφος ή δώσε το Η στο βήμα 5. Με αυτό το Η υπολογίστηκαν και τα Δ/δ.' : '');
    if (E3 && R.H10 != null) add(G, le(R.H10, 10) ? 'ok' : 'fail', 'Ύψος σε κάθε σημείο (κεκλιμένο)', 'μέγιστο ' + gr(R.H10) + ' μ. από το χαμηλότερο σημείο εδάφους — όριο 10,00 μ.', N + 'άρθ. 239 Γ1', 'Λόγω κλίσης του εδάφους, το κτίριο δεν υπερβαίνει τα 10 μ. σε κανένα σημείο.');
    if (E2 && Hc > 0) { var n1 = A.levels.filter(function (L) { return L.typ === 1; }).length; if (n1 === 1 && A.resid !== false) add(G, le(Hc, 4) ? 'ok' : 'fail', 'Ύψος μονώροφου', 'Η=' + gr(Hc) + ' μ. — έως 4,00 μ.', N + 'άρθ. 256 παρ. 1β', 'Μονώροφη κατοικία ή τμήμα: έως 4,00 μ.'); }
    // στέγη
    var roof = A.roof > 0 ? A.roof : R.sx.roof;
    var rArt = E1 ? (R.low ? N + 'άρθ. 221 παρ. 4' : N + 'άρθ. 197 παρ. 90') : E3 ? N + 'άρθ. 239 Γ7α' : N + 'άρθ. 251 παρ. 5';
    if (roof > 0) {
      var rOk = R.ridge == null || le(R.ridge, R.ridgeMax);
      add(G, rOk ? (!E1 || le(roof, R.roofmax) ? 'ok' : 'warn') : 'fail', 'Στέγη', 'ύψος στέγης ' + gr(roof) + ' μ. · κορφιάς ' + gr(R.ridge) + ' μ. — όριο κορφιά ' + gr(R.low ? 8.5 : R.hmax) + ' + ' + gr(R.roofmax) + ' = ' + gr(R.ridgeMax) + ' μ.', rArt,
        E1 ? (R.low ? 'Σε χαμηλό κτίριο: πάνω από τα 8,50 μ. επιτρέπεται στέγη ύψους έως 1,50 μ.' : 'Το ύψος της στέγης μετριέται από το κατώτερο σημείο έδρασης έως το ψηλότερο σημείο της και δεν υπερβαίνει τα 2 μ. πάνω από το μέγιστο επιτρεπόμενο ύψος της περιοχής.') : E3 ? 'Πάνω από το μέγιστο ύψος: στέγη έως 2 μ. (η υποχρέωση στέγης ορίζεται από το π.δ. του οικισμού).' : 'Με κεκλιμένη στέγη το μέγιστο ύψος προσαυξάνεται κατά 1,20 μ.',
        !rOk ? 'Ο κορφιάς ξεπερνά το επιτρεπόμενο κατά ' + gr(R.ridge - R.ridgeMax) + ' μ.' : E1 && !le(roof, R.roofmax) ? 'Η στέγη είναι ψηλότερη από ' + gr(R.roofmax) + ' μ., αλλά ο κορφιάς μένει κάτω από το όριο· βεβαιώσου ότι η ΥΔΟΜ δέχεται αυτή την ερμηνεία (όριο πάνω από το μέγιστο ύψος, όχι ύψος στέγης).' : '');
    }
    if (R.sx.n && R.sx.parapet > 0) add(G, 'info', 'Πάνω από το ύψος', 'στηθαίο/κατασκευές ' + gr(R.sx.parapet) + ' μ. πάνω από την τελευταία πλάκα', E1 ? N + 'άρθ. 214 παρ. 2' : E3 ? N + 'άρθ. 239 Γ7' : N + 'άρθ. 251 παρ. 5',
      E1 ? 'Πάνω από το μέγιστο ύψος, μέσα στο ιδεατό στερεό: στηθαία, απολήξεις κλιμακοστασίων έως 4,20 μ. (με στάση ανελκυστήρα) ή 3,40 μ., ηλιακά/Φ/Β, καπνοδόχοι, πέργκολες.' : E3 ? 'Απολήξεις κλιμακοστασίων έως 2,50 μ., δεξαμενή νερού έως 1 μ., στηθαία.' : 'Μόνο στηθαίο, φεγγίτες έως 0,30 μ. και καπνοδόχοι.');
    // ιδεατό στερεό
    if (E1 && A.P > 0) { var vs = Math.max(1.5 * A.P, 7.5); add(G, !(Hc > 0) ? 'warn' : (le(Hc, vs) ? 'ok' : 'warn'), 'Ιδεατό στερεό (πρόσωπο)', 'κατακόρυφο επίπεδο στην οικοδομική γραμμή έως 1,5 x Π = 1,5 x ' + gr(A.P) + ' → ' + gr(vs) + ' μ. από το κράσπεδο · Η=' + gr(Hc) + ' μ.', N + 'άρθ. 210 παρ. 5, 7',
      'Το κτίριο (εκτός εξωστών, στηθαίων, προεξοχών, σκιάστρων) εγγράφεται σε στερεό: κατακόρυφο επίπεδο στην οικοδομική γραμμή ύψους 1,5Π (όχι κάτω από 7,50 μ.) από το κράσπεδο, κεκλιμένο επίπεδο εφαπτομένης 1:1,50 από την άνω ακμή του και κατακόρυφα επίπεδα στα όρια ή στις αποστάσεις.', le(Hc, vs) ? '' : 'Το ύψος ξεπερνά το κατακόρυφο επίπεδο: έλεγξε στην τομή ότι το τμήμα πάνω από ' + gr(vs) + ' μ. είναι μέσα στο κεκλιμένο επίπεδο.'); }
    // όροφοι
    if (!E1) { var nab = A.levels.filter(function (L) { return L.typ === 1; }).length; add(G, nab <= 2 ? 'ok' : (E3 ? 'warn' : 'fail'), 'Αριθμός ορόφων', nab + ' υπέργειοι — έως 2', E2 ? N + 'άρθ. 251 παρ. 2' : N + 'άρθ. 239 Α1, Β1', E2 ? 'Μέγιστος αριθμός ορόφων: 2.' : 'Έως 2 όροφοι· 3ος λόγω κλίσης εδάφους χωρίς υπέρβαση ΣΔ (Ζώνη Α) ή με γνώμη Σ.Α. (Ζώνες Β/Β1).'); }
    // ---------- ΕΔΑΦΟΣ: εκσκαφές / επιχώσεις ----------
    if (R.sx.n) {
      var steep = R.sx.slope > 20, digL = E1 && steep ? 2.0 : 1.5, fillL = 1.5;
      var okF = le(R.sx.fill, fillL) && le(R.sx.dig, digL);
      add(G, okF ? 'ok' : 'fail', 'Διαμόρφωση εδάφους', 'μέγιστη επίχωση ' + gr(R.sx.fill) + ' μ. (όριο ' + gr(fillL) + ') · μέγιστη εκσκαφή ' + gr(R.sx.dig) + ' μ. (όριο ' + gr(digL) + ') · κλίση φυσικού εδάφους ' + gr(R.sx.slope, 1) + '%',
        E1 ? N + 'άρθ. 210 παρ. 4, 212 παρ. 3' : E3 ? N + 'άρθ. 239 Γ3, 212 παρ. 3' : N + 'άρθ. 251 παρ. 7, 212 παρ. 3α',
        E1 ? 'Στους ακάλυπτους η οριστική στάθμη δεν απέχει πάνω από ±1,50 μ. από το φυσικό έδαφος· σε κλίση > 20% επιτρέπεται υποβιβασμός έως 2,00 μ. και ανύψωση έως 1,50 μ. Πέρα από αυτά μόνο με γνώμη Σ.Α.'
          : E3 ? 'Επιτρέπονται μόνο οι απολύτως αναγκαίες εκσκαφές· σε κεκλιμένο έδαφος επίπεδα πλάτους ≥ 5 μ. με τοιχία ή πρανή ύψους ≤ 1,50 μ.' : 'Αναλημματικά τοιχία ή πρανή έως 1,50 μ. και επίπεδα πλάτους ≥ 5 μ.· μεγαλύτερα μόνο με γνώμη Σ.Α.',
        okF ? '' : 'Η διαμόρφωση ξεπερνά τα όρια: θέλει γνωμοδότηση Συμβουλίου Αρχιτεκτονικής ή αλλαγή στις στάθμες του ακαλύπτου.');
    } else add(G, 'warn', 'Διαμόρφωση εδάφους', 'δεν αναλύθηκαν τομές', N + (E1 ? 'άρθ. 210 παρ. 4, 212 παρ. 3' : E3 ? 'άρθ. 239 Γ3' : 'άρθ. 251 παρ. 7'), 'Εκσκαφές / επιχώσεις έως ±1,50 μ. από το φυσικό έδαφος.', 'Σχεδίασε στις τομές φυσικό και διαμορφωμένο έδαφος (layer ή κείμενο «ΦΥΣΙΚΟ ΕΔΑΦΟΣ», «ΔΙΑΜΟΡΦΩΜΕΝΟ ΕΔΑΦΟΣ»).');
    // υπόγειο
    var hasB = A.levels.some(function (L) { return L.typ === 2; });
    if (hasB) {
      var bArt = E1 ? N + 'άρθ. 197 παρ. 87, 206 παρ. 6ι' : E3 ? N + 'άρθ. 239 Γ2, 206 παρ. 6ι' : N + 'άρθ. 251 παρ. 8';
      var bRule = E2 ? 'Το υπόγειο δεν εξέχει του περιγράμματος του ισογείου και η οροφή του δεν υπερβαίνει τα 0,80 μ. από το διαμορφωμένο έδαφος.' : 'Υπόγειο είναι όροφος του οποίου η οροφή δεν υπερβαίνει σε κανένα σημείο το 1,20 μ. από το ' + (E3 ? 'φυσικό ή οριστικά διαμορφωμένο' : 'οριστικό') + ' έδαφος.';
      if (R.sx.baseRoof != null) add(G, R.baseBad ? 'fail' : 'ok', 'Οροφή υπογείου', 'έως ' + gr(R.sx.baseRoof) + ' μ. πάνω από το έδαφος στις όψεις — όριο ' + gr(R.baseLim) + ' μ.', bArt, bRule, R.baseBad ? 'Δεν είναι υπόγειο κατά τον νόμο: μετρά ως όροφος σε δόμηση, ύψος και αριθμό ορόφων. Χαμήλωσε την οροφή ή ανύψωσε (εντός ορίων) το έδαφος στις όψεις.' : '');
      else add(G, 'warn', 'Οροφή υπογείου', 'δεν μετρήθηκε στις τομές', bArt, bRule, 'Βάλε στάθμη ±0,00 και αρνητικές στάθμες (π.χ. -3,00) στις τομές και σχεδίασε το έδαφος.');
      if (E2) { var gB = 0, g0 = 0; R.lv.forEach(function (l) { if (l.typ === 2) gB = Math.max(gB, l.G); if (l.typ === 1 && !g0) g0 = l.G; }); if (g0) add(G, le(gB, g0) ? 'ok' : 'fail', 'Υπόγειο εντός περιγράμματος ισογείου', gr(gB) + ' ≤ ' + gr(g0) + ' τ.μ.', N + 'άρθ. 251 παρ. 8', 'Το υπόγειο δεν μπορεί να εξέχει του περιγράμματος του ισογείου.'); }
    }
    // ---------- ΑΠΟΣΤΑΣΕΙΣ ----------
    if (E2) {
      if (R.dmin != null) add(G, R.dmin >= 15 - 0.005 ? 'ok' : 'fail', 'Αποστάσεις από τα όρια', 'ελάχιστη ' + gr(R.dmin) + ' μ. — απαιτούνται 15,00 μ.', N + 'άρθ. 251 παρ. 4', 'Από τα όρια του γηπέδου τουλάχιστον 15 μ.· για κατοικία σε γήπεδο ≥ 4.000 τ.μ. που υπήρχε στις 15.4.1981, οι πλάγιες έως 7,50 μ. αν δεν χωρά με 15 μ. — τότε πλάτος κτιρίου έως 10 μ. 10 μ. από δάσος, 15 μ. από ρέμα και σιδηροδρομική ζώνη.');
      add(G, 'info', 'Ενιαίο κτίριο', 'ένα κτίριο στο γήπεδο', N + 'άρθ. 251 παρ. 3, 256 παρ. 1α', 'Το κτίριο είναι ενιαίο· διάσπαση μόνο με γνώμη Σ.Α., ως ενιαίο αρχιτεκτονικό σύνολο, σύνδεση πλάτους ≥ 1,20 μ.');
    } else if (E3) {
      var dm = null, tch = false; R.edges.forEach(function (e) { if (e.kind === 'front') return; if (e.d < 0.05) tch = true; else dm = dm == null ? e.d : Math.min(dm, e.d); });
      if (R.edges.length) add(G, dm == null || dm >= 2.5 - 0.005 ? 'ok' : 'fail', 'Αποστάσεις από πλάγια / πίσω όρια', (dm != null ? 'ελάχιστη ' + gr(dm) + ' μ.' : '—') + (tch ? ' (και σε επαφή)' : '') + ' — απαιτούνται 2,50 μ. όπου δεν εφάπτεται', N + 'άρθ. 240 Β', 'Το κτίριο τοποθετείται ελεύθερα· όπου δεν εφάπτεται στα πλάγια ή πίσω όρια, απόσταση τουλάχιστον 2,50 μ. Μεταξύ κτιρίων του ίδιου οικοπέδου 2,50 μ.', (A.fronts || []).length ? '' : 'Δείξε στο βήμα 3 την πλευρά σε δρόμο, για να μην ελεγχθεί ως πλάγια.');
      add(G, 'info', 'Γραμμή δόμησης', A.zone === 'A' ? 'Ζώνη Α: στην υφιστάμενη γραμμή δόμησης ή εσώτερα · οικόπεδα ≥ 500 τ.μ. χωρίς συνεχές μέτωπο: υποχώρηση ≥ 4 μ.' : 'Ζώνη Β: οικόπεδα ≥ 500 τ.μ. χωρίς συνεχές μέτωπο υποχώρηση ≥ 2,50 μ. (Β1: ≥ 4 μ.) · πρόσωπο σε κοινόχρηστο ≥ 4 μ.', N + 'άρθ. 240 Α', 'Η θέση της κύριας όψης ως προς τη γραμμή δόμησης κατά ζώνη του οικισμού.');
    } else if (R.Dbig != null) {
      var fr = (A.fronts || []).length;
      var dRule = 'Δ = 3,00 + 0,10Η και δ = 2,50 + 0,05Η, με Η το ύψος στην πλήρη εξάντληση του ΣΔ όπως στο διάγραμμα (198)· πίσω όριο τουλάχιστον Δ· στα πλάγια επαφή ή απόσταση δ, ανάλογα με το τι υπάρχει στο όμορο (209)' + (R.low ? '· χαμηλό κτίριο: Δ = 2,50 μ. όπου δεν εφάπτεται (221 παρ. 3)' : '') + '.';
      if (!fr) add(G, 'warn', 'Πλάγιες & οπίσθιες αποστάσεις', 'δεν ορίστηκαν πλευρές σε δρόμο — ελάχιστη απόσταση ' + gr(R.dmin) + ' μ. (δ=' + gr(R.dreq) + ', Δ=' + gr(R.Dbig) + ')', N + 'άρθ. 198, 209' + (R.low ? ', 221' : ''), dRule, 'Στο βήμα 3 δείξε ποιες πλευρές βλέπουν σε δρόμο.');
      else {
        var okR = R.Drear.v == null || R.Drear.v >= R.Dbig - 0.005, okS = R.dside.v == null || R.dside.v >= R.dreq - 0.005;
        add(G, okR ? 'ok' : 'fail', 'Οπίσθια απόσταση Δ', (R.Drear.v != null ? gr(R.Drear.v) + ' μ.' : (R.Drear.touch ? 'σε επαφή' : '—')) + ' — απαιτούνται Δ=' + (R.low ? '2,50 (χαμηλό κτίριο)' : '3,00+0,10x' + gr(R.Hu) + '=' + gr(R.Dbig)) + ' μ.', N + 'άρθ. 198, 209 παρ. 1α' + (R.low ? ', 221 παρ. 3' : ''), dRule, R.Drear.touch && !R.low ? 'Επαφή με πίσω όριο επιτρέπεται μόνο αν εκεί εφάπτεται ήδη κτίριο (209 παρ. 1γ).' : '');
        add(G, okS ? 'ok' : 'fail', 'Πλάγιες αποστάσεις δ', (R.dside.v != null ? gr(R.dside.v) + ' μ.' : '—') + (R.dside.touch ? ' (και σε επαφή)' : '') + ' — απαιτούνται δ=' + (R.low ? '2,50 (χαμηλό κτίριο)' : '2,50+0,05x' + gr(R.Hu) + '=' + gr(R.dreq)) + ' μ.', N + 'άρθ. 198, 209 παρ. 1β-γ', dRule, R.dside.touch ? 'Επαφή με πλάγιο όριο: επιτρέπεται εκτός αν το όμορο έχει κτίσμα σε απόσταση 1 μ. - δ με ανοίγματα στην πλευρά αυτή (209 παρ. 1β).' : '');
      }
      add(G, 'info', 'Προεξοχές μέσα στις αποστάσεις', 'αρχιτεκτονικές προεξοχές, σκίαστρα, καπνοδόχοι: πλάτος έως 1/4 Δ = ' + gr(R.Dbig / 4) + ' μ. ή 1/4 δ = ' + gr(R.dreq / 4) + ' μ., ≥ 1 μ. από τα όρια · προστεγάσματα/τέντες έως 1/2 Δ = ' + gr(R.Dbig / 2) + ' μ.', N + 'άρθ. 211 παρ. 1, 212 παρ. 4 και 7', 'Στοιχεία στις όψεις μέσα στις αποστάσεις με τα μέγιστα πλάτη του άρθρου· μεγαλύτερα μόνο με γνώμη Σ.Α.');
    }
    // ---------- ΑΚΑΛΥΠΤΟΣ / ΦΥΤΕΥΣΗ / ΣΤΑΘΜΕΥΣΗ ----------
    if (!E2) {
      var fRule = 'Τουλάχιστον τα 2/3 του υποχρεωτικά ακάλυπτου μένουν χωρίς επίστρωση και φυτεύονται· μετρούν πισίνες και στοιχεία νερού και κάθε επιφάνεια με χώμα ≥ 40 εκ.· με υπαίθριες θέσεις στάθμευσης τα 2/3 υπολογίζονται στον ακάλυπτο μειωμένο κατά 10 ποσοστιαίες μονάδες· αν δεν επιτυγχάνεται, έως 1/2 με φύτευση δώματος διπλάσια της έλλειψης.';
      if (R.fytReq != null && R.fytA > 0) add(G, R.fytA >= R.fytReq - 0.005 ? 'ok' : 'fail', 'Φύτευση', gr(R.fytA) + ' τ.μ.' + (A.poolA > 0 ? ' (με πισίνα ' + gr(A.poolA) + ')' : '') + ' — υποχρεωτική 2/3 x ' + gr(R.akReq) + ' = ' + gr(R.fytReq) + ' τ.μ.', N + 'άρθ. 212 παρ. 2α', fRule, R.fytA < R.fytReq ? 'Λείπουν ' + gr(R.fytReq - R.fytA) + ' τ.μ.: ή φύτευση δώματος ' + gr(2 * (R.fytReq - R.fytA)) + ' τ.μ. αν φτάνει τουλάχιστον το 1/2 (212 παρ. 2).' : '');
      else add(G, 'warn', 'Φύτευση', 'δεν σημειώθηκαν φυτεμένες επιφάνειες — υποχρεωτικά ' + gr(R.fytReq) + ' τ.μ.', N + 'άρθ. 212 παρ. 2α', fRule, 'Στο βήμα 3 κάνε κλικ στα πολύγωνα πρασίνου.');
      add(G, 'info', 'Δέντρα', (A.prasA > 0 ? R.trPras + ' στην πρασιά + ' : '') + R.trRest + ' στο οικόπεδο', 'Κτιριοδομικός άρθ. 19 · υπόδειγμα ΥΠΕΝ 1', 'Ένα δέντρο ανά 200 τ.μ. οικοπέδου και ανά 25 τ.μ. πρασιάς.');
      add(G, A.prov >= R.req ? 'ok' : 'fail', 'Θέσεις στάθμευσης', A.prov + ' δεσμεύονται — απαιτούνται ' + R.req, 'υπόδειγμα ΥΠΕΝ 1 · διατάξεις στάθμευσης της περιοχής', 'Ο αριθμός θέσεων ορίζεται ανά τ.μ. ή ανά κατοικία από τις διατάξεις της περιοχής.');
    }
    add(G, 'info', 'Περιφράξεις', 'ύψος έως 3,00 μ. · συμπαγές τμήμα έως 1,50 μ. · αυλόπορτες έως 3,00 μ.', N + 'άρθ. 212 παρ. 9', 'Ύψη μετρούμενα από τη ψηλότερη οριστική στάθμη εκατέρωθεν (στο πρόσωπο από το πεζοδρόμιο).');
    // ---------- ΥΠΕΥΘΥΝΗ ΔΗΛΩΣΗ: ΔΟΜΗΣΗ ----------
    var dRule2 = 'Μετρούν: κλειστοί χώροι, στεγασμένοι μη θερμαινόμενοι με άνοιγμα < 35% της περιμέτρου, υπόγεια άλλων χρήσεων, και η υπέρβαση του 40% σε εξώστες + ημιυπαίθριους (206 παρ. 5). Δεν μετρούν όσα απαριθμεί η 206 παρ. 6.';
    if (R.allow != null) add(Y, le(R.Dom, R.allow) ? 'ok' : 'fail', 'Δόμηση', gr(R.Dom) + ' ' + (le(R.Dom, R.allow) ? '≤' : '>') + ' ' + gr(R.allow) + ' τ.μ.', E1 ? N + 'άρθ. 206 παρ. 4-6' : E3 ? N + 'άρθ. 238, 206' : N + 'άρθ. 251 παρ. 2, 256 παρ. 1β, 206', dRule2, R.allowTxt);
    else add(Y, 'warn', 'Δόμηση', 'πραγματοποιούμενη ' + gr(R.Dom) + ' τ.μ. — δεν προκύπτει επιτρεπόμενη', N + 'άρθ. 206', dRule2, R.allowTxt);
    if (R.allow != null) {
      if (R.low) add(Y, 'ok', 'Εξώστες + ημιυπαίθριοι (χαμηλό κτίριο)', gr(R.HX) + ' τ.μ. — δεν μετρούν ανεξαρτήτως εμβαδού', N + 'άρθ. 221 παρ. 2', 'Στα χαμηλά κτίρια οι εξώστες και οι υπαίθριοι στεγασμένοι χώροι δεν προσμετρώνται στον ΣΔ ανεξάρτητα από την επιφάνειά τους.');
      else {
        add(Y, le(R.HX, R.lim40) ? 'ok' : 'fail', 'Ανοικτοί εξώστες + ημιυπαίθριοι', gr(R.HX) + ' ≤ 40% x ' + gr(R.allow) + ' = ' + gr(R.lim40) + ' τ.μ.' + (R.HXc > 0.005 ? ' — μετρούν ' + gr(R.HXc) : ''), N + 'άρθ. 206 παρ. 5δ, 6α', 'Δεν μετρούν όταν το σύνολό τους ≤ 40% της επιτρεπόμενης δόμησης· οι ανοικτοί ημιυπαίθριοι σε κάθε περίπτωση ≤ 20%. Η υπέρβαση μετρά.');
        add(Y, le(R.Hh, R.limH) ? 'ok' : 'fail', 'Ανοικτοί ημιυπαίθριοι', gr(R.Hh) + ' ≤ 20% x ' + gr(R.allow) + ' = ' + gr(R.limH) + ' τ.μ.', N + 'άρθ. 206 παρ. 6α, 197 παρ. 6', 'Ημιυπαίθριος: στεγασμένος μη θερμαινόμενος χώρος με άνοιγμα τουλάχιστον 35% της περιμέτρου του προς κοινόχρηστο ή ακάλυπτο.');
      }
    }
    if (E1) add(Y, R.low ? 'ok' : 'info', 'Χαμηλό κτίριο', R.low ? 'ΝΑΙ — Δ = 2,50 μ., εξώστες/ημιυπαίθριοι δεν μετρούν, στέγη έως 1,50 μ.' : 'ΟΧΙ — ' + [!R.lowWhy.resid ? 'όχι κατοικία' : '', !R.lowWhy.h ? 'ύψος > 8,50 μ.' : '', !R.lowWhy.dom ? 'δόμηση > 400 τ.μ.' : '', !R.lowWhy.area ? 'επιτρεπόμενο ύψος περιοχής < 11 μ.' : ''].filter(Boolean).join(', '), N + 'άρθ. 221', 'Χαμηλό: κύρια χρήση κατοικία, ύψος ≤ 8,50 μ. χωρίς τη στέγη, συνολική επιφάνεια στον ΣΔ ≤ 400 τ.μ.· δεν εφαρμόζεται όπου το επιτρεπόμενο ύψος είναι < 11 μ.');
    R.lv.forEach(function (l) {
      add(Y, 'info', 'Επίπεδο «' + l.name + '»', 'μικτό ' + gr(l.G) + ' τ.μ. · μετρά ' + gr(l.cnt) + ' τ.μ.' + (l.nt ? ' — ' + l.nt : ''), N + 'άρθ. 206 παρ. 5-6', '');
      if (l.typ === 3) add(Y, l.cnt > 0.005 ? 'warn' : 'ok', 'Σοφίτα «' + l.name + '»', gr(l.Lc) + ' τ.μ. — ' + l.nt, N + 'άρθ. 206 περ. ιδ, 197 παρ. 81', 'Δεν μετρά έως το 1/2 του υποκείμενου ορόφου (μαζί με τους τοίχους) με τον οποίο συνδέεται λειτουργικά· η υπέρβαση μετρά· δεν είναι όροφος ούτε ανεξάρτητη ιδιοκτησία· η σκάλα προς τη σοφίτα δεν μετρά.');
      if (l.typ === 5 && l.ub) add(Y, l.Lc < 0.7 * l.ub ? 'ok' : 'fail', 'Πατάρι «' + l.name + '»', gr(l.Lc) + ' < 70% x ' + gr(l.ub) + ' = ' + gr(0.7 * l.ub) + ' τ.μ.', N + 'άρθ. 197 παρ. 28', 'Πατάρι: προσβάσιμος χώρος μέσα σε χώρο, καθαρό εμβαδόν μικρότερο του 70% του υποκείμενου· δεν είναι όροφος· μετρά στη δόμηση.');
      l.sp.forEach(function (sp) {
        if ((sp.code === 'K' || sp.code === 'I') && sp.a > sp.x + 0.005) add(Y, 'warn', 'Κλιμακοστάσιο «' + l.name + '»', gr(sp.a) + ' τ.μ. — εξαιρούνται ' + gr(sp.x) + ', μετρούν ' + gr(sp.a - sp.x), N + 'άρθ. 206 παρ. 6δ-ε', 'Κοινόχρηστο έως 30 τ.μ. ανά επίπεδο (40 στην είσοδο)· ιδιωτικό έως 25 τ.μ. ανά επίπεδο και αυτοτελή ιδιοκτησία.');
        if (sp.code === 'F' && sp.a < 1.5) add(Y, 'warn', 'Φωταγωγός «' + l.name + '»', gr(sp.a) + ' τ.μ. < 1,50 τ.μ.', N + 'άρθ. 206 παρ. 6η', 'Φρεάτια Η/Μ εξαιρούνται ανεξαρτήτως διαστάσεων· ως φωταγωγός/αγωγός αέρα απαιτούνται τουλάχιστον 1,50 τ.μ. Δεν μετρούν για τον φωτισμό των κύριων χώρων.');
      });
    });
    // ---------- ΚΤΙΡΙΟΔΟΜΙΚΟΣ / ΑμεΑ ----------
    add(K, 'info', 'Ελεύθερο ύψος', 'κύριοι χώροι ≥ 2,50 μ. · βοηθητικοί ≥ 2,20 μ. · κάτω από δοκούς ≥ 2,00 μ.', 'Κτιριοδομικός άρθ. 7');
    add(K, 'info', 'Κλίμακες', 'ελεύθερο πλάτος 1,20 μ. (0,90 σε κατοικίες έως 3 ορόφων, 0,60 εσωτερική ενιαίας κατοικίας) · 2υ+π = 0,60-0,66 μ. · ελεύθερο ύψος ≥ 2,20 μ.', 'Κτιριοδομικός άρθ. 11');
    add(K, 'info', 'Στηθαία', '≥ 1,00 μ. όπου το δάπεδο είναι πάνω από 1,00 μ. από τον περιβάλλοντα χώρο · διάκενα ≤ 0,25 / 0,15 μ.', 'Κτιριοδομικός άρθ. 13');
    add(K, 'info', 'Φυσικός φωτισμός & αερισμός', 'ανοίγματα ≥ 10% (έμμεσος 15%) · ανοιγόμενα ≥ 5% (έμμεσος 7%) του καθαρού εμβαδού κάθε κύριου χώρου', 'Κτιριοδομικός άρθ. 20-21');
    add(M, 'info', 'Προσβασιμότητα', 'προσβάσιμες είσοδοι και κοινόχρηστοι χώροι, οριζόντια και κατακόρυφη προσβασιμότητα', N + 'άρθ. 223 · Κτιριοδομικός άρθ. 25 · «Σχεδιάζοντας για Όλους»');
    add(M, 'info', 'Ράμπες', 'κλίση ≤ 5% (έως 8% σε μικρά μήκη) με πλατύσκαλα και χειρολισθήρες', 'ΥΑ ΥΠΕΝ/ΔΜΕΑΑΠ/124964/1561/2022');
    add(M, 'info', 'Αξιοποίηση', 'κατασκευές για ΑμεΑ επιτρέπονται μέσα στις αποστάσεις Δ/δ · ο χώρος αναμονής ΑμεΑ στο κοινόχρηστο κλιμακοστάσιο είναι μέσα στα 30/40 τ.μ. που δεν μετρούν · ανελκυστήρας 1,60 x 1,90 (ΕΛΟΤ EN 81-70) δεν μετρά', N + 'άρθ. 211 παρ. 8, 206 παρ. 6δ, 6κζ');
    return C;
  }
  // συνολική απόφαση: fail αν υπάρχει υπέρβαση σε όσα ελέγχει η ΥΔΟΜ ή στη δήλωση
  function verdict(C) {
    var f = C.filter(function (c) { return c.st === 'fail' && (c.grp === 'ydom' || c.grp === 'dilosi'); }).length;
    var w = C.filter(function (c) { return c.st === 'warn' && (c.grp === 'ydom' || c.grp === 'dilosi'); }).length;
    return { st: f ? 'fail' : w ? 'warn' : 'ok', fails: f, warns: w, text: f ? 'ΔΕΝ ΠΕΡΝΑ — ' + f + (f === 1 ? ' υπέρβαση' : ' υπερβάσεις') : w ? 'ΠΕΡΝΑ ΥΠΟ ΠΡΟΫΠΟΘΕΣΕΙΣ — ' + w + ' σημεία θέλουν στοιχεία' : 'ΠΕΡΝΑ — όλα εντός επιτρεπομένων' };
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
    if (!hasA && R.Hu > 0 && n1 >= 2) sg('Έως δύο ανοικτά κλιμακοστάσια που εξυπηρετούν στάθμη έως 7,50 μ. δεν μετρούν καθόλου — π.χ. εξωτερική σκάλα αντί για κλειστή.', 'ν.5306/2026 άρθ. 206 παρ. 6στ', 0);
    if (!has3 && top) sg('Σοφίτα κάτω από κεκλιμένη στέγη, έως ' + gr(0.5 * top) + ' τ.μ. (1/2 του υποκείμενου ορόφου), δεν μετρά. Δεν είναι όροφος και δεν γίνεται ανεξάρτητη ιδιοκτησία.', 'ν.5306/2026 άρθ. 206 περ. ιδ, 197 παρ. 81', 0.5 * top);
    if (!has2 && R.Sk > 0) sg('Ένας υπόγειος όροφος βοηθητικής χρήσης έως ' + gr(R.Sk) + ' τ.μ. (όσο η κάλυψη, οροφή έως 1,20 μ. από το έδαφος) δεν μετρά. Υπόγεια για στάθμευση, Η-Μ, νερό, ΑΠΕ ή πισίνα δεν μετρούν ανεξαρτήτως εμβαδού.', 'ν.5306/2026 άρθ. 206 παρ. 6θ-ι', R.Sk);
    if (!has4) sg('Σε επικλινές γήπεδο: υπόσκαφο τμήμα (μία όψη, χωρίς ίχνος στην κάτοψη, προσβάσιμη στέγη) μετρά μόνο κατά 50% για κατοικία (εξαίρεση 20% για άλλες χρήσεις).', 'ν.5306/2026 άρθ. 206 περ. κγ', 0);
    sg('Αίθρια, φωταγωγοί από 1,50 τ.μ., φρεάτια Η/Μ και επιφάνειες από εσοχές στο σώμα του κτιρίου δεν μετρούν — δεν μετρούν όμως ούτε για τον φωτισμό των κύριων χώρων.', 'ν.5306/2026 άρθ. 206 παρ. 6γ, 6η', 0);
    if (R.kpe > A.kp + 0.001) sg('Κάλυψη: ισχύει η προσαύξηση έως 120 τ.μ. (χωρίς υπέρβαση του 70%) — επιτρεπόμενη ' + grz(R.kpe) + '% αντί ' + grz(A.kp) + '%.', 'ν.5306/2026 άρθ. 207', 0);
    if (A.mode === 1 && R.Hu > 8.5 && R.Hu <= 10) sg('Με ύψος έως 8,50 μ. (σήμερα ' + grz(R.Hu) + ' μ.) το κτίριο γίνεται χαμηλό: Δ = 2,50 μ. σταθερό αντί 3 + 0,10Η.', 'ν.5306/2026 άρθ. 221', 0);
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
    n('ΠΡΑΓΜΑΤΟΠΟΙΟΥΜΕΝΗ ΚΑΛΥΨΗ: Ε= ' + gr(R.Sk) + ' Μ² (' + gr(R.pk) + '%) <= επιτρεπ. κάλυψη ' + gr(R.Ka) + ' Μ²' + (R.Ka != null && A.E > 0 ? ' (' + gr(R.Ka / A.E * 100) + '%)' : '') + fl(R.Ka == null || R.Sk <= R.Ka + 0.005));
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
    else if (A.mode === 3) {
      var dm3 = null; (R.edges || []).forEach(function (e) { if (e.kind !== 'front' && e.d >= 0.05) dm3 = dm3 == null ? e.d : Math.min(dm3, e.d); });
      n('ΕΠΙΤΡΕΠΟΜΕΝΗ ΑΠΟΣΤΑΣΗ ΑΠΟ ΠΛΑΓΙΑ ΚΑΙ ΠΙΣΩ ΟΡΙΑ: 2,50 Μ όπου δεν εφάπτεται (άρθ. 240 Β ν.5306/26)');
      n('ΠΡΑΓΜΑΤΟΠΟΙΟΥΜΕΝΗ ΑΠΟΣΤΑΣΗ: ' + (dm3 != null ? gr(dm3) : '....') + ' Μ >= 2,50 Μ' + fl(dm3 == null || dm3 >= 2.495));
    } else {
      n('ΕΠΙΤΡΕΠΟΜΕΝΟ ΟΠΙΣΘΙΟ ΟΡΙΟ: Δ=' + (R.low ? '2,50 Μ (χαμηλό κτίριο, άρθ. 221 ν.5306/26)' : '3,00+0,10xHmax= 3,00+0,10x' + gr(R.Hu) + '= ' + gr(R.Dbig) + ' Μ'));
      n('ΕΠΙΤΡΕΠΟΜΕΝΟ ΠΛΑΓΙΟ ΟΡΙΟ: δ=' + (R.low ? '2,50 Μ' : '2,50+0,05xHmax= 2,50+0,05x' + gr(R.Hu) + '= ' + gr(R.dreq) + ' Μ'));
      var dr = R.Drear.v != null ? gr(R.Drear.v) : (R.Drear.touch ? 'σε επαφή' : '....'), ds = R.dside.v != null ? gr(R.dside.v) : (R.dside.touch ? 'σε επαφή' : '....');
      n('ΠΡΑΓΜΑΤΟΠΟΙΟΥΜΕΝΑ ΟΡΙΑ: Δπραγμ= ' + dr + ' Μ > Δ & δπραγμ= ' + ds + ' Μ > δ' + fl((R.Drear.v == null || R.Drear.v >= R.Dbig - 0.005) && (R.dside.v == null || R.dside.v >= R.dreq - 0.005)));
    }
    n('ΜΕΓΙΣΤΟ ΕΠΙΤΡΕΠΟΜΕΝΟ ΥΨΟΣ: Ηmax= ' + gr(R.hmax) + ' + ' + (R.roofmax ? gr(R.roofmax) : '....') + ' M ΣΤΕΓΗ (όπου προβλέπεται από τις διατάξεις της περιοχής ή από τη μελέτη βάσει ΝΟΚ)');
    var Hr = R.Hm, rf = A.roof > 0 ? A.roof : (R.sx ? R.sx.roof : 0);
    n('ΠΡΑΓΜΑΤΟΠΟΙΟΥΜΕΝΟ ΥΨΟΣ: Η= ' + gr(Hr) + ' M' + (R.Hest ? ' (από ύψη ορόφων)' : '') + ' + ' + gr(rf || 0) + ' M(ΣΤΕΓΗ) < Ηmax' + fl(!(Hr > 0) || !R.hmax || (Hr <= R.hmax + 0.005 && (!rf || !R.roofmax || rf <= R.roofmax + 0.005))));
    if (A.mode === 2 || A.mode === 3) { var nab2 = A.levels.filter(function (L) { return L.typ === 1; }).length; n('ΑΡΙΘΜΟΣ ΟΡΟΦΩΝ: ' + nab2 + ' <= 2' + fl(nab2 <= 2)); }
    if (!ekt) {
      n('ΕΛΕΓΧΟΣ ΦΥΤΕΥΣΗΣ (άρθ. 17 παρ. 2α ν.4067/12 - άρθ. 212 ν.5306/26)', true);
      if (A.akal > 0) n('ΥΠΟΧΡΕΩΤΙΚΟΣ ΑΚΑΛΥΠΤΟΣ ΟΙΚΟΠΕΔΟΥ ΣΕ ΠΕΡΙΠΤΩΣΗ ΥΠΑΙΘΡΙΩΝ ΧΩΡΩΝ ΣΤΑΘΜΕΥΣΗΣ: Εοικ-[Εοικ x (Σ.Κ+10%)]= ' + gr(R.akReq) + ' Μ2');
      else n('ΥΠΟΧΡΕΩΤΙΚΟΣ ΑΚΑΛΥΠΤΟΣ ΟΙΚΟΠΕΔΟΥ: Εοικ-Επιτρεπ. Κάλυψη= ' + gr(A.E) + ' - ' + gr(R.Ka) + ' = ' + gr(R.akReq) + ' Μ2');
      n('ΥΠΟΧΡΕΩΤΙΚΗ ΦΥΤΕΥΣΗ: Ε=2/3 x (Υποχρεωτικός Ακάλυπτος)= ' + gr(R.fytReq) + ' Μ²');
      n('ΠΡΑΓΜΑΤΟΠΟΙΟΥΜΕΝΗ ΦΥΤΕΥΣΗ' + (A.poolA > 0 ? ' (με πισίνα)' : '') + ': Ε= ' + (R.fytA > 0 ? gr(R.fytA) : '....') + ' Μ2 > Υποχρεωτ. Φύτευσης ' + gr(R.fytReq) + ' Μ²' + fl(!(R.fytA > 0) || R.fytA >= R.fytReq - 0.005));
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
    sectionAnalyze: sectionAnalyze, verdict: verdict, split: split, layerCode: layerCode, PLOTL: /KAEK|ΚΑΕΚ|TOPO_PROP|BOUND|OIKOPED|ΟΙΚΟΠΕΔ|PLOT|GEOTEM|ΓΕΩΤΕΜ/, oikMax: oikMax, ektMax: ektMax, hmax210: hmax210, gr: gr, grz: grz, CODE: CODE, typText: typText, EGSA: EGSA
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KalEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
