// HEXIS PAD — ανάγνωση DXF / DWG σε απλό μοντέλο σχεδίου
// Μοντέλο: { layers:{name:{color,on}}, ents:[ {t:'L',layer,color,pts:[{E,N,Z}],closed} | {t:'P',layer,E,N,Z} | {t:'T',layer,E,N,text,h,rot} ], bbox }
(function (g) {
  'use strict';
  const D2R = Math.PI / 180;
  const ACI = ['#000000', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffffff', '#808080', '#c0c0c0'];

  function aciColor(i) {
    if (i == null || i === 256 || i === 0) return null;
    i = Math.abs(i);
    if (i < ACI.length) return ACI[i];
    // απλοποιημένη παλέτα για 10..249
    const h = ((i - 10) / 240) * 360;
    return `hsl(${h.toFixed(0)},80%,45%)`;
  }

  function arcPts(cx, cy, r, a0, a1, z) {
    // a0,a1 σε μοίρες, αριστερόστροφα
    let sweep = a1 - a0; while (sweep <= 0) sweep += 360;
    const n = Math.max(8, Math.ceil(sweep / 6));
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = (a0 + sweep * i / n) * D2R;
      out.push({ E: cx + r * Math.cos(a), N: cy + r * Math.sin(a), Z: z });
    }
    return out;
  }

  // bulge μεταξύ p1,p2 -> ενδιάμεσα σημεία
  function bulgePts(p1, p2, b) {
    if (!b) return [];
    const d = Math.hypot(p2.E - p1.E, p2.N - p1.N);
    if (!d) return [];
    const theta = 4 * Math.atan(b);
    const r = d / (2 * Math.sin(theta / 2));
    const mx = (p1.E + p2.E) / 2, my = (p1.N + p2.N) / 2;
    const h = r * Math.cos(theta / 2);
    const ux = (p2.E - p1.E) / d, uy = (p2.N - p1.N) / d;
    const cx = mx - uy * h, cy = my + ux * h;
    const a0 = Math.atan2(p1.N - cy, p1.E - cx);
    const n = Math.max(4, Math.ceil(Math.abs(theta) / (8 * D2R)));
    const out = [];
    for (let i = 1; i < n; i++) {
      const a = a0 + theta * i / n;
      out.push({ E: cx + Math.abs(r) * Math.cos(a), N: cy + Math.abs(r) * Math.sin(a), Z: p1.Z });
    }
    return out;
  }

  function expandBulges(vs, closed) {
    const out = [];
    const n = vs.length;
    for (let i = 0; i < n; i++) {
      const v = vs[i];
      out.push({ E: v.E, N: v.N, Z: v.Z });
      const nx = (i + 1 < n) ? vs[i + 1] : (closed ? vs[0] : null);
      if (nx && v.b) out.push(...bulgePts(v, nx, v.b));
    }
    return out;
  }

  // ---------- DXF ----------
  function parseDXF(text) {
    const lines = text.split(/\r\n|\r|\n/);
    const pairs = [];
    for (let i = 0; i + 1 < lines.length; i += 2) {
      const c = parseInt(lines[i].trim(), 10);
      if (isNaN(c)) { i--; continue; }
      pairs.push([c, lines[i + 1]]);
    }
    const model = { layers: {}, ents: [], blocks: {} };
    let i = 0;
    let section = null;

    function readEntity(start) {
      // επιστρέφει {type, codes:[[c,v]...], next}
      const type = pairs[start][1].trim();
      const codes = [];
      let j = start + 1;
      while (j < pairs.length && pairs[j][0] !== 0) { codes.push(pairs[j]); j++; }
      return { type, codes, next: j };
    }

    function getf(codes, c, def) { for (const [k, v] of codes) if (k === c) return parseFloat(v); return def; }
    function gets(codes, c, def) { for (const [k, v] of codes) if (k === c) return v.trim(); return def; }

    let curBlock = null;
    let pendingPoly = null;

    function add(e) {
      if (curBlock) curBlock.ents.push(e); else model.ents.push(e);
    }

    function handle(ent) {
      const c = ent.codes, layer = gets(c, 8, '0'), color = aciColor(getf(c, 62, null));
      switch (ent.type) {
        case 'LINE':
          add({ t: 'L', layer, color, pts: [{ E: getf(c, 10, 0), N: getf(c, 20, 0), Z: getf(c, 30, 0) }, { E: getf(c, 11, 0), N: getf(c, 21, 0), Z: getf(c, 31, 0) }] });
          break;
        case 'POINT':
          add({ t: 'P', layer, color, E: getf(c, 10, 0), N: getf(c, 20, 0), Z: getf(c, 30, 0) });
          break;
        case 'CIRCLE':
          add({ t: 'L', layer, color, closed: true, pts: arcPts(getf(c, 10, 0), getf(c, 20, 0), getf(c, 40, 0), 0, 360, getf(c, 30, 0)), center: { E: getf(c, 10, 0), N: getf(c, 20, 0) } });
          break;
        case 'ARC':
          add({ t: 'L', layer, color, pts: arcPts(getf(c, 10, 0), getf(c, 20, 0), getf(c, 40, 0), getf(c, 50, 0), getf(c, 51, 360), getf(c, 30, 0)) });
          break;
        case 'LWPOLYLINE': {
          const vs = []; let cur = null; const elev = getf(c, 38, 0);
          for (const [k, v] of c) {
            if (k === 10) { cur = { E: parseFloat(v), N: 0, Z: elev, b: 0 }; vs.push(cur); }
            else if (k === 20 && cur) cur.N = parseFloat(v);
            else if (k === 42 && cur) cur.b = parseFloat(v);
          }
          const closed = (getf(c, 70, 0) & 1) === 1;
          add({ t: 'L', layer, color, closed, pts: expandBulges(vs, closed), verts: vs.map(v => ({ E: v.E, N: v.N, Z: v.Z })) });
          break;
        }
        case 'POLYLINE':
          pendingPoly = { layer, color, closed: (getf(c, 70, 0) & 1) === 1, vs: [] };
          break;
        case 'VERTEX':
          if (pendingPoly) {
            const fl = getf(c, 70, 0);
            if (!(fl & 16)) pendingPoly.vs.push({ E: getf(c, 10, 0), N: getf(c, 20, 0), Z: getf(c, 30, 0), b: getf(c, 42, 0) });
          }
          break;
        case 'SEQEND':
          if (pendingPoly) {
            const p = pendingPoly; pendingPoly = null;
            add({ t: 'L', layer: p.layer, color: p.color, closed: p.closed, pts: expandBulges(p.vs, p.closed), verts: p.vs.map(v => ({ E: v.E, N: v.N, Z: v.Z })) });
          }
          break;
        case 'TEXT': case 'MTEXT': case 'ATTRIB': {
          let t = '';
          for (const [k, v] of c) if (k === 1 || k === 3) t += v;
          t = cleanMText(t);
          if (t) add({ t: 'T', layer, color, E: getf(c, 10, 0), N: getf(c, 20, 0), Z: getf(c, 30, 0), text: t, h: getf(c, 40, 1), rot: getf(c, 50, 0) });
          break;
        }
        case 'INSERT':
          add({ t: 'I', layer, color, name: gets(c, 2, ''), E: getf(c, 10, 0), N: getf(c, 20, 0), Z: getf(c, 30, 0), sx: getf(c, 41, 1), sy: getf(c, 42, 1), rot: getf(c, 50, 0) });
          break;
      }
    }

    while (i < pairs.length) {
      const [c, v] = pairs[i];
      const val = v.trim();
      if (c === 0 && val === 'SECTION') { section = pairs[i + 1] ? pairs[i + 1][1].trim() : null; i += 2; continue; }
      if (c === 0 && val === 'ENDSEC') { section = null; i++; continue; }
      if (c === 0 && val === 'EOF') break;
      if (section === 'TABLES' && c === 0 && val === 'LAYER') {
        const e = readEntity(i);
        const name = gets(e.codes, 2, null);
        if (name) { const col = getf(e.codes, 62, 7); model.layers[name] = { color: aciColor(Math.abs(col)) || '#000000', on: col >= 0 }; }
        i = e.next; continue;
      }
      if (section === 'BLOCKS' && c === 0) {
        if (val === 'BLOCK') {
          const e = readEntity(i);
          curBlock = { name: gets(e.codes, 2, ''), base: { E: getf(e.codes, 10, 0), N: getf(e.codes, 20, 0) }, ents: [] };
          i = e.next; continue;
        }
        if (val === 'ENDBLK') { if (curBlock) model.blocks[curBlock.name] = curBlock; curBlock = null; const e = readEntity(i); i = e.next; continue; }
        const e = readEntity(i); handle(e); i = e.next; continue;
      }
      if (section === 'ENTITIES' && c === 0) { const e = readEntity(i); handle(e); i = e.next; continue; }
      i++;
    }
    return finalize(model);
  }

  function cleanMText(t) {
    return t.replace(/\\P/g, ' ').replace(/\\[A-Za-z][^;]*;/g, '').replace(/[{}]/g, '').replace(/%%[cC]/g, 'Ø').replace(/%%[dD]/g, '°').replace(/%%[pP]/g, '±').trim();
  }

  // Ανάπτυξη INSERT (μέχρι 4 επίπεδα)
  function explode(model) {
    const out = [];
    function tf(p, ins, base) {
      const x = (p.E - base.E) * ins.sx, y = (p.N - base.N) * ins.sy;
      const c = Math.cos(ins.rot * D2R), s = Math.sin(ins.rot * D2R);
      return { E: ins.E + x * c - y * s, N: ins.N + x * s + y * c, Z: (p.Z || 0) + (ins.Z || 0) };
    }
    function walk(ents, xf, depth) {
      for (const e of ents) {
        if (e.t === 'I') {
          const b = model.blocks[e.name];
          if (!b || depth > 4) continue;
          const ins = e, outer = xf;
          walk(b.ents, outer ? (p => outer(tf(p, ins, b.base))) : (p => tf(p, ins, b.base)), depth + 1);
          continue;
        }
        if (!xf) { out.push(e); continue; }
        if (e.t === 'L') {
          const n = Object.assign({}, e, { pts: e.pts.map(xf) });
          if (e.verts) n.verts = e.verts.map(xf);
          out.push(n);
        } else if (e.t === 'P' || e.t === 'T') {
          const p = xf(e); out.push(Object.assign({}, e, p));
        }
      }
    }
    walk(model.ents, null, 0);
    return out;
  }

  function finalize(model) {
    const ents = explode(model);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    function bb(p) { if (!isFinite(p.E) || !isFinite(p.N)) return; if (p.E < x0) x0 = p.E; if (p.E > x1) x1 = p.E; if (p.N < y0) y0 = p.N; if (p.N > y1) y1 = p.N; }
    for (const e of ents) {
      // 2Δ σχέδιο: Z=0 σημαίνει «χωρίς υψόμετρο»
      if (e.t === 'L' && e.pts.every(p => !p.Z)) { e.pts.forEach(p => p.Z = null); if (e.verts) e.verts.forEach(p => p.Z = null); }
      if ((e.t === 'P' || e.t === 'T') && !e.Z) e.Z = null;
      if (!model.layers[e.layer]) model.layers[e.layer] = { color: '#000000', on: true };
      if (e.t === 'L') e.pts.forEach(bb); else bb(e);
    }
    return { layers: model.layers, ents, bbox: isFinite(x0) ? { x0, y0, x1, y1 } : null };
  }

  // ---------- DWG (libredwg wasm, φορτώνεται μόνο όταν χρειαστεί) ----------
  let dwgLib = null;
  async function parseDWG(buf) {
    if (!dwgLib) {
      const base = new URL('lib/libredwg/', document.baseURI).href;
      // Δυναμικό import μέσω (0,eval) ώστε παλιά WebView να μη σκοντάφτουν στο parse όλου του αρχείου
      const mod = await (0, eval)('(u => import(u))')(base + 'dist/libredwg-web.js');
      dwgLib = await mod.LibreDwg.create(base + 'wasm');
      dwgLib._types = mod.Dwg_File_Type;
    }
    const data = dwgLib.dwg_read_data(new Uint8Array(buf), dwgLib._types.DWG);
    if (!data) throw new Error('Δεν διαβάστηκε το DWG');
    const db = dwgLib.convert(data);
    try { dwgLib.dwg_free(data); } catch (e) { /* */ }
    const model = { layers: {}, ents: [], blocks: {} };
    (db.tables.LAYER.entries || []).forEach(l => {
      model.layers[l.name] = { color: aciColor(Math.abs(l.colorIndex || 7)) || '#000000', on: !l.off && !l.frozen };
    });
    function P(p) { return { E: p.x || 0, N: p.y || 0, Z: p.z || 0 }; }
    function conv(e, push) {
      const layer = e.layer || '0', color = aciColor(e.colorIndex);
      switch (e.type) {
        case 'LINE': push({ t: 'L', layer, color, pts: [P(e.startPoint), P(e.endPoint)] }); break;
        case 'POINT': { const p = P(e.position || e.point || {}); push({ t: 'P', layer, color, E: p.E, N: p.N, Z: p.Z }); break; }
        case 'CIRCLE': push({ t: 'L', layer, color, closed: true, pts: arcPts(e.center.x, e.center.y, e.radius, 0, 360, e.center.z || 0) }); break;
        case 'ARC': {
          const k = Math.abs(e.endAngle) > 6.3 || Math.abs(e.startAngle) > 6.3 ? 1 : 1 / D2R; // rad ή μοίρες
          push({ t: 'L', layer, color, pts: arcPts(e.center.x, e.center.y, e.radius, e.startAngle * k, e.endAngle * k, e.center.z || 0) });
          break;
        }
        case 'LWPOLYLINE': {
          const vs = (e.vertices || []).map(v => ({ E: v.x, N: v.y, Z: e.elevation || 0, b: v.bulge || 0 }));
          const closed = (e.flag & 1) === 1 || (e.flag & 512) === 512;
          push({ t: 'L', layer, color, closed, pts: expandBulges(vs, closed), verts: vs.map(v => ({ E: v.E, N: v.N, Z: v.Z })) });
          break;
        }
        case 'POLYLINE2D': case 'POLYLINE3D': case 'POLYLINE': {
          const vs = (e.vertices || []).map(v => { const p = P(v.point || v); return { E: p.E, N: p.N, Z: p.Z, b: v.bulge || 0 }; });
          const closed = (e.flag & 1) === 1;
          push({ t: 'L', layer, color, closed, pts: expandBulges(vs, closed), verts: vs.map(v => ({ E: v.E, N: v.N, Z: v.Z })) });
          break;
        }
        case 'TEXT': case 'MTEXT': case 'ATTRIB': {
          const p = P(e.startPoint || e.insertionPoint || {});
          const raw = e.text && typeof e.text === 'object' ? (e.text.text || e.text.contents || '') : (e.text || e.contents || ''); const t = cleanMText(String(raw));
          if (t) push({ t: 'T', layer, color, E: p.E, N: p.N, Z: p.Z, text: t, h: e.textHeight || e.height || 1, rot: (e.rotation || 0) * (Math.abs(e.rotation || 0) > 6.3 ? 1 : 1 / D2R) });
          break;
        }
        case 'INSERT':
          push({ t: 'I', layer, color, name: e.name, E: e.insertionPoint.x, N: e.insertionPoint.y, Z: e.insertionPoint.z || 0, sx: e.xScale || 1, sy: e.yScale || 1, rot: (e.rotation || 0) * (Math.abs(e.rotation || 0) > 6.3 ? 1 : 1 / D2R) });
          break;
      }
    }
    (db.tables.BLOCK_RECORD.entries || []).forEach(b => {
      if (!b.name || /^\*(model|paper)_space/i.test(b.name)) return;
      const blk = { name: b.name, base: { E: (b.basePoint && b.basePoint.x) || 0, N: (b.basePoint && b.basePoint.y) || 0 }, ents: [] };
      (b.entities || []).forEach(e => conv(e, x => blk.ents.push(x)));
      model.blocks[b.name] = blk;
    });
    (db.entities || []).forEach(e => { if (!e.isInPaperSpace) conv(e, x => model.ents.push(x)); });
    return finalize(model);
  }

  // ---------- DXF εξαγωγή (R12, ανοίγει παντού) ----------
  function writeDXF(points, lines, opts) {
    opts = opts || {};
    const th = opts.textHeight || 0.25;
    const L = [];
    const p = (c, v) => { L.push(String(c)); L.push(String(v)); };
    const layers = new Set(['0', 'HP_POINTS', 'HP_NAMES', 'HP_ELEV', 'HP_CODES', 'HP_LINES']);
    points.forEach(pt => pt.layer && layers.add(pt.layer));
    p(0, 'SECTION'); p(2, 'HEADER'); p(9, '$ACADVER'); p(1, 'AC1009'); p(9, '$PDMODE'); p(70, 3); p(9, '$PDSIZE'); p(40, th); p(0, 'ENDSEC');
    p(0, 'SECTION'); p(2, 'TABLES'); p(0, 'TABLE'); p(2, 'LAYER'); p(70, layers.size);
    const col = { HP_POINTS: 1, HP_NAMES: 7, HP_ELEV: 3, HP_CODES: 4, HP_LINES: 5 };
    layers.forEach(n => { p(0, 'LAYER'); p(2, n); p(70, 0); p(62, col[n] || 7); p(6, 'CONTINUOUS'); });
    p(0, 'ENDTAB'); p(0, 'ENDSEC');
    p(0, 'SECTION'); p(2, 'ENTITIES');
    const f = v => (v == null ? 0 : v).toFixed(4);
    points.forEach(pt => {
      p(0, 'POINT'); p(8, pt.layer || 'HP_POINTS'); p(10, f(pt.E)); p(20, f(pt.N)); p(30, f(pt.Z));
      p(0, 'TEXT'); p(8, 'HP_NAMES'); p(10, f(pt.E + th * 0.6)); p(20, f(pt.N + th * 0.3)); p(30, f(pt.Z)); p(40, th); p(1, pt.name || '');
      if (pt.Z != null) { p(0, 'TEXT'); p(8, 'HP_ELEV'); p(10, f(pt.E + th * 0.6)); p(20, f(pt.N - th * 1.1)); p(30, f(pt.Z)); p(40, th * 0.8); p(1, pt.Z.toFixed(3)); }
      if (pt.code) { p(0, 'TEXT'); p(8, 'HP_CODES'); p(10, f(pt.E + th * 0.6)); p(20, f(pt.N - th * 2.3)); p(30, f(pt.Z)); p(40, th * 0.8); p(1, pt.code); }
    });
    (lines || []).forEach(ln => {
      if (ln.pts.length < 2) return;
      if (ln.kind === 'line') { // ανεξάρτητα ευθύγραμμα τμήματα
        const ps = ln.closed ? ln.pts.concat([ln.pts[0]]) : ln.pts;
        for (let i = 0; i < ps.length - 1; i++) { p(0, 'LINE'); p(8, ln.layer || 'HP_LINES'); p(10, f(ps[i].E)); p(20, f(ps[i].N)); p(30, f(ps[i].Z)); p(11, f(ps[i + 1].E)); p(21, f(ps[i + 1].N)); p(31, f(ps[i + 1].Z)); }
        return;
      }
      if (ln.kind === 'spline' && window.APP && APP.splinePts) { ln = Object.assign({}, ln, { pts: APP.splinePts(ln.pts, ln.closed), closed: false }); }
      p(0, 'POLYLINE'); p(8, ln.layer || 'HP_LINES'); p(66, 1); p(70, (ln.closed ? 1 : 0) | 8); p(10, 0); p(20, 0); p(30, 0);
      ln.pts.forEach(v => { p(0, 'VERTEX'); p(8, ln.layer || 'HP_LINES'); p(10, f(v.E)); p(20, f(v.N)); p(30, f(v.Z)); p(70, 32); });
      p(0, 'SEQEND'); p(8, ln.layer || 'HP_LINES');
    });
    p(0, 'ENDSEC'); p(0, 'EOF');
    return L.join('\r\n');
  }

  g.HCAD = { parseDXF, parseDWG, writeDXF, aciColor };
})(window);
