// HEXIS PAD — εισαγωγή αρχείων: TXT/CSV/XYZ, XLS/XLSX/ODS, DXF/DWG, KML/GeoJSON, επικόλληση κειμένου
// Οδηγός με προεπισκόπηση, αυτόματη αναγνώριση στηλών, επιλογή φύλλου, διαχωριστικού, επικεφαλίδας, φ/λ, διπλοτύπων.
(function (g) {
  'use strict';
  const A = g.APP, $ = A.$, esc = A.esc;

  const FIELDS = [['', '— αγνόηση —'], ['name', 'Όνομα'], ['E', 'X (Ανατ.)'], ['N', 'Y (Βορ.)'], ['Z', 'Z / Υψόμ.'], ['code', 'Κωδικός'], ['desc', 'Περιγραφή']];
  const KIND = [['stake', 'Προς χάραξη'], ['control', 'Γνωστά / τριγωνομ.'], ['survey', 'Μετρημένα'], ['calc', 'Υπολογισμένα']];

  // ---------- Αριθμοί ----------
  function num(v) {
    if (v == null) return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    let s = String(v).trim().replace(/\s+/g, '').replace(/[−–]/g, '-');
    if (!s) return null;
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');        // 4.285.200,123
    else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) && s.split(',').length > 2) s = s.replace(/,/g, ''); // 4,285,200.123
    else if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');                                      // δεκαδικό κόμμα
    if (!/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(s)) return null;
    const f = parseFloat(s); return isFinite(f) ? f : null;
  }

  // ---------- Κείμενο → γραμμές/στήλες ----------
  function decode(buf) {
    let t = new TextDecoder('utf-8').decode(buf);
    if (t.includes('�')) { try { t = new TextDecoder('windows-1253').decode(buf); } catch (e) { } }
    return t.replace(/^﻿/, '');
  }
  function detectSep(lines) {
    const cand = ['\t', ';', ',', '|', ' '];
    let best = ' ', bestScore = -1;
    for (const c of cand) {
      const counts = lines.slice(0, 40).map(l => (c === ' ' ? l.trim().split(/\s+/).length - 1 : l.split(c).length - 1));
      const nz = counts.filter(x => x > 0);
      if (!nz.length) continue;
      const mode = nz.sort((a, b) => nz.filter(v => v === b).length - nz.filter(v => v === a).length)[0];
      const consistency = counts.filter(x => x === mode).length / counts.length;
      let score = consistency * 10 + Math.min(mode, 6);
      if (c === ',' && lines.slice(0, 20).some(l => /\d,\d{1,3}(?!\d)/.test(l) && !/\d\.\d/.test(l) && l.split(',').length === 2)) score -= 5;
      if (c === ' ') score -= 1.5;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
  }
  function splitLine(l, sep) {
    if (sep === ' ') return l.trim().split(/\s+/);
    if (sep === ',' || sep === ';' || sep === '\t' || sep === '|') {
      // απλό CSV με εισαγωγικά
      const out = []; let cur = '', q = false;
      for (let i = 0; i < l.length; i++) {
        const ch = l[i];
        if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
        else if (ch === sep && !q) { out.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      out.push(cur.trim()); return out;
    }
    return [l];
  }
  function textRows(text, sep) {
    const lines = text.split(/\r\n|\r|\n/).filter(l => l.trim() && !/^\s*(#|\/\/)/.test(l));
    const s = sep === 'auto' ? detectSep(lines) : sep;
    return { rows: lines.map(l => splitLine(l, s)), sep: s };
  }

  // ---------- Αυτόματη αναγνώριση στηλών ----------
  const HDR = {
    name: /^(name|point|pt|id|no|nr|a\/a|α\/α|αα|σημ|σημείο|σημειο|ονομα|όνομα|κορυφή|κορυφη|pnt|station)/i,
    E: /^(x|e|east|easting|χ|ξ|ανατ|x\s*\(e\)|e\s*\(x\)|lon|λ|long|longitude|μήκος)/i,
    N: /^(y|n|north|northing|ψ|υ$|υ\b|βορ|y\s*\(n\)|n\s*\(y\)|lat|φ|latitude|πλάτος)/i,
    Z: /^(z|ζ|h|elev|elevation|height|alt|υψ|υψόμ|υψομ|κοτα|κότα|η)/i,
    code: /^(code|κωδ|κωδικός|κωδικος|cd|type|τύπος)/i,
    desc: /^(desc|description|περιγρ|σχόλ|note|remark)/i,
  };
  function analyze(rows) {
    const nc = Math.max(...rows.slice(0, 60).map(r => r.length));
    // επικεφαλίδα: πρώτη γραμμή χωρίς αριθμούς σε στήλες που αλλού είναι αριθμητικές
    const numericFrac = c => { const v = rows.slice(1, 60).map(r => r[c]); const k = v.filter(x => num(x) != null).length; return v.length ? k / v.length : 0; };
    const first = rows[0] || [];
    let header = false;
    for (let c = 0; c < nc; c++) if (numericFrac(c) > 0.7 && first[c] != null && num(first[c]) == null && String(first[c]).trim()) header = true;
    const map = new Array(nc).fill('');
    if (header) first.forEach((h, c) => { const s = String(h || '').trim(); for (const k of ['name', 'E', 'N', 'Z', 'code', 'desc']) if (!map.includes(k) && HDR[k].test(s)) { map[c] = k; break; } });
    const body = rows.slice(header ? 1 : 0, 80);
    const stats = [];
    for (let c = 0; c < nc; c++) {
      const v = body.map(r => num(r[c])).filter(x => x != null);
      const frac = body.length ? v.length / body.length : 0;
      stats.push({ c, frac, min: Math.min(...v), max: Math.max(...v), mean: v.reduce((a, b) => a + b, 0) / (v.length || 1), int: v.every(x => Number.isInteger(x)), uniq: new Set(v).size });
    }
    if (!map.includes('E') || !map.includes('N')) {
      // αριθμητικές στήλες με μεγάλες τιμές = συντεταγμένες
      const numCols = stats.filter(s => s.frac > 0.8 && map[s.c] === '');
      const big = numCols.filter(s => Math.abs(s.mean) > 1000 || (Math.abs(s.mean) <= 180 && !s.int && s.uniq > 1));
      let E = null, N = null;
      if (big.length >= 2) {
        // σε ΕΓΣΑ87: X 100.000–900.000, Y 3.800.000–4.700.000· αλλιώς: μεγαλύτερη μέση τιμή = Y (Βορράς) σε TM
        const a = big[0], b = big[1];
        if (Math.abs(a.mean) > Math.abs(b.mean) * 3 && Math.abs(a.mean) > 1000) { N = a; E = b; } else { E = a; N = b; }
        // φ/λ: Ε = λ (μικρότερο στην Ελλάδα 19–30), N = φ (34–42)
        if (Math.abs(a.mean) <= 180 && Math.abs(b.mean) <= 180) { if (a.mean > b.mean) { N = a; E = b; } else { E = a; N = b; } }
        if (!map.includes('E')) map[E.c] = 'E';
        if (!map.includes('N')) map[N.c] = 'N';
        const rest = numCols.filter(s => s !== a && s !== b);
        const z = rest.find(s => s.c > Math.max(E.c, N.c)) || rest.find(s => !s.int || s.uniq > 2 && Math.abs(s.mean) < 10000);
        if (z && !map.includes('Z') && !(z.int && z.c < E.c)) map[z.c] = 'Z';
      }
    }
    if (!map.includes('name')) {
      const e = map.indexOf('E'), n = map.indexOf('N');
      const firstCoord = Math.min(e < 0 ? 99 : e, n < 0 ? 99 : n);
      for (let c = 0; c < firstCoord && c < nc; c++) if (map[c] === '') { map[c] = 'name'; break; }
    }
    if (!map.includes('code')) {
      for (let c = nc - 1; c >= 0; c--) if (map[c] === '' && stats[c].frac < 0.5 && body.some(r => r[c] && String(r[c]).trim())) { map[c] = 'code'; break; }
    }
    return { header, map, nc };
  }

  // ---------- Μετατροπή γραμμών σε σημεία ----------
  function build(st) {
    const out = [], bad = [];
    const rows = st.rows.slice(st.header ? 1 : 0);
    const ix = k => st.map.indexOf(k);
    const iN = ix('name'), iE = ix('E'), iY = ix('N'), iZ = ix('Z'), iC = ix('code'), iD = ix('desc');
    rows.forEach((r, i) => {
      let E = num(r[iE]), N = num(r[iY]);
      if (E == null || N == null) { bad.push(i); return; }
      if (st.swap) { const t = E; E = N; N = t; }
      let lat = null, lon = null;
      if (st.ll) { lat = N; lon = E; try { const p = HGEO.toGrid(lat, lon); E = p.E; N = p.N; } catch (e) { bad.push(i); return; } }
      const name = iN >= 0 && r[iN] != null && String(r[iN]).trim() ? String(r[iN]).trim() : (st.prefix || 'P') + (out.length + 1);
      const code = [iC >= 0 ? r[iC] : '', iD >= 0 ? r[iD] : ''].filter(x => x != null && String(x).trim()).join(' ').trim();
      out.push({ name, E, N, Z: iZ >= 0 ? num(r[iZ]) : null, code, lat, lon, row: i });
    });
    return { pts: out, bad };
  }
  function looksLL(st) {
    const r = build(Object.assign({}, st, { ll: false }));
    return r.pts.length && r.pts.every(p => Math.abs(p.E) <= 180 && Math.abs(p.N) <= 90 && !(Number.isInteger(p.E) && Number.isInteger(p.N)));
  }

  // ---------- Έλεγχος εύρους ----------
  function rangeCheck(pts) {
    if (!pts.length) return '';
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    pts.forEach(p => { x0 = Math.min(x0, p.E); x1 = Math.max(x1, p.E); y0 = Math.min(y0, p.N); y1 = Math.max(y1, p.N); });
    let msg = `Εύρος X ${x0.toFixed(2)} – ${x1.toFixed(2)} · Y ${y0.toFixed(2)} – ${y1.toFixed(2)}`;
    let ok = null;
    try {
      const ll = HGEO.toLL((x0 + x1) / 2, (y0 + y1) / 2);
      if (/^EGSA87/.test(A.settings.crs)) ok = ll.lat > 34 && ll.lat < 42.2 && ll.lon > 19 && ll.lon < 30.2;
      else ok = isFinite(ll.lat) && Math.abs(ll.lat) < 85;
      if (ok) msg += ` · ✓ στην περιοχή φ ${ll.lat.toFixed(3)}°, λ ${ll.lon.toFixed(3)}°`;
    } catch (e) { ok = false; }
    if (ok === false) msg += ' · ⚠ εκτός ' + (/^EGSA87/.test(A.settings.crs) ? 'Ελλάδας σε ΕΓΣΑ87 — μήπως X/Y ανάποδα ή τοπικές συντεταγμένες;' : 'αναμενόμενης περιοχής');
    return { msg, ok };
  }

  // ---------- Μικρή προεπισκόπηση σημείων ----------
  function preview(cv, pts) {
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 300, H = cv.clientHeight || 160;
    cv.width = W * dpr; cv.height = H * dpr;
    const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    if (!pts.length) return;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    pts.forEach(p => { x0 = Math.min(x0, p.E); x1 = Math.max(x1, p.E); y0 = Math.min(y0, p.N); y1 = Math.max(y1, p.N); });
    const s = Math.min((W - 30) / Math.max(x1 - x0, 1e-6), (H - 30) / Math.max(y1 - y0, 1e-6));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const css = getComputedStyle(document.documentElement);
    x.fillStyle = css.getPropertyValue('--primary'); x.font = '600 10px Manrope,system-ui';
    pts.slice(0, 3000).forEach((p, i) => {
      const sx = W / 2 + (p.E - cx) * s, sy = H / 2 - (p.N - cy) * s;
      x.beginPath(); x.arc(sx, sy, 2.6, 0, 7); x.fill();
      if (pts.length <= 60) x.fillText(p.name, sx + 4, sy - 3);
    });
  }

  // ---------- Οδηγός πινακοειδών δεδομένων ----------
  function tableWizard(src) {
    // src: {name, kind:'text'|'sheet', text?, wb?}
    const st = { sep: 'auto', sheet: null, swap: false, ll: false, kind: 'stake', dup: 'rename', prefix: 'P' };
    let sheets = null;
    const load = () => {
      if (src.kind === 'text') { const r = textRows(src.text, st.sep); st.rows = r.rows; st.usedSep = r.sep; }
      else {
        sheets = src.wb.SheetNames;
        if (!st.sheet) st.sheet = sheets.find(n => { const ws = src.wb.Sheets[n]; return ws && ws['!ref']; }) || sheets[0];
        st.rows = XLSX.utils.sheet_to_json(src.wb.Sheets[st.sheet], { header: 1, raw: true, blankrows: false, defval: '' }).map(r => r.map(v => v == null ? '' : v)).filter(r => r.some(v => String(v).trim() !== ''));
      }
      const an = analyze(st.rows); st.header = an.header; st.map = an.map; st.nc = an.nc;
      st.ll = looksLL(st); st.swap = false;
    };
    load();
    const draw = () => {
      const res = build(st);
      const rc = rangeCheck(res.pts);
      const show = st.rows.slice(0, 40);
      const hdrIdx = st.header ? 0 : -1;
      const badSet = new Set(res.bad.map(i => i + (st.header ? 1 : 0)));
      const sepName = { '\t': 'Tab', ';': ';', ',': ',', '|': '|', ' ': 'κενό' };
      A.sheet('Εισαγωγή · ' + src.name, `
        ${sheets && sheets.length > 1 ? `<label class="fld"><span>Φύλλο Excel</span><select id="im-sheet">${sheets.map(n => `<option ${n === st.sheet ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>` : ''}
        <div class="row">
          ${src.kind === 'text' ? `<label class="fld grow"><span>Διαχωριστικό${st.sep === 'auto' ? ' (βρέθηκε: ' + sepName[st.usedSep] + ')' : ''}</span><select id="im-sep">${[['auto', 'Αυτόματο'], [',', 'Κόμμα ,'], [';', 'Ερωτηματικό ;'], ['\t', 'Tab'], [' ', 'Κενά'], ['|', '|']].map(([v, l]) => `<option value="${v === '\t' ? 'TAB' : v}" ${v === st.sep ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
          <label class="fld grow"><span>Εισαγωγή ως</span><select id="im-kind">${KIND.map(([v, l]) => `<option value="${v}" ${v === st.kind ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        </div>
        <div class="row small-row">
          <label class="chk"><input type="checkbox" id="im-hdr" ${st.header ? 'checked' : ''}> 1η γραμμή = επικεφαλίδες</label>
          <label class="chk"><input type="checkbox" id="im-ll" ${st.ll ? 'checked' : ''}> Γεωγραφικές φ, λ (WGS84)</label>
          <button class="btn sm" id="im-swap">⇄ Εναλλαγή X ↔ Y</button>
        </div>
        <p class="muted">Έλεγξε τι είναι κάθε στήλη (επιλογή πάνω από τη στήλη). Οι γκρι γραμμές δεν έχουν έγκυρες συντεταγμένες και παραλείπονται.</p>
        <div class="imp-wrap"><table class="imp-table"><thead><tr>${Array.from({ length: st.nc }, (_, c) => `<th><select data-col="${c}">${FIELDS.map(([v, l]) => `<option value="${v}" ${st.map[c] === v ? 'selected' : ''}>${l}</option>`).join('')}</select></th>`).join('')}</tr></thead>
        <tbody>${show.map((r, i) => `<tr class="${i === hdrIdx ? 'hdr' : (badSet.has(i) ? 'skip' : '')}">${Array.from({ length: st.nc }, (_, c) => `<td class="c-${st.map[c] || 'x'}">${esc(r[c] != null ? r[c] : '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        ${st.rows.length > 40 ? `<p class="muted">Προεπισκόπηση 40 από ${st.rows.length} γραμμές.</p>` : ''}
        <canvas id="imp-prev"></canvas>
        <div class="result ${rc.ok === false ? 'warn' : (res.pts.length ? 'ok' : 'fail')}"><b>${res.pts.length} έγκυρα σημεία</b>${res.bad.length ? ` · ${res.bad.length} γραμμές παραλείπονται` : ''}<br><span class="muted">${esc(rc.msg || '')}</span></div>
        <div class="row"><label class="fld grow"><span>Διπλά ονόματα</span><select id="im-dup"><option value="rename" ${st.dup === 'rename' ? 'selected' : ''}>Μετονομασία (Σ1 → Σ1_2)</option><option value="skip" ${st.dup === 'skip' ? 'selected' : ''}>Παράλειψη</option><option value="replace" ${st.dup === 'replace' ? 'selected' : ''}>Αντικατάσταση</option></select></label>
          <label class="fld" style="width:110px"><span>Πρόθεμα χωρίς όνομα</span><input id="im-px" value="${esc(st.prefix)}"></label></div>
        <button class="btn primary big" id="im-go" ${res.pts.length ? '' : 'disabled'}>⬇ Εισαγωγή ${res.pts.length} σημείων</button>`, b => {
        const sh = b.querySelector('#im-sheet'); if (sh) sh.onchange = () => { st.sheet = sh.value; load(); draw(); };
        const sp = b.querySelector('#im-sep'); if (sp) sp.onchange = () => { st.sep = sp.value === 'TAB' ? '\t' : sp.value; load(); draw(); };
        b.querySelector('#im-kind').onchange = e => { st.kind = e.target.value; };
        b.querySelector('#im-hdr').onchange = e => { st.header = e.target.checked; draw(); };
        b.querySelector('#im-ll').onchange = e => { st.ll = e.target.checked; draw(); };
        b.querySelector('#im-swap').onclick = () => { st.swap = !st.swap; draw(); };
        b.querySelector('#im-dup').onchange = e => { st.dup = e.target.value; };
        b.querySelector('#im-px').onchange = e => { st.prefix = e.target.value || 'P'; draw(); };
        b.querySelectorAll('[data-col]').forEach(s => s.onchange = () => {
          const c = +s.dataset.col, v = s.value;
          if (v) st.map = st.map.map((x, i) => (x === v && i !== c ? '' : x));
          st.map[c] = v; draw();
        });
        setTimeout(() => preview(b.querySelector('#imp-prev'), res.pts), 0);
        b.querySelector('#im-go').onclick = () => commit(res.pts, st.kind, st.dup, src.name);
      });
    };
    draw();
  }

  function commit(pts, kind, dup, srcName) {
    const P = A.proj; let added = 0, skipped = 0, renamed = 0, replaced = 0;
    pts.forEach(p => {
      let name = p.name; const ex = A.findPoint(name);
      if (ex) {
        if (dup === 'skip') { skipped++; return; }
        if (dup === 'replace') { Object.assign(ex, { E: p.E, N: p.N, Z: p.Z, code: p.code || ex.code, type: kind }); replaced++; return; }
        name = A.uniqueName(name); renamed++;
      }
      let lat = p.lat, lon = p.lon;
      if (lat == null) { try { const ll = HGEO.toLL(p.E, p.N); lat = ll.lat; lon = ll.lon; } catch (e) { } }
      P.points.push({ id: A.uid(), name, code: p.code, E: p.E, N: p.N, Z: p.Z, lat, lon, type: kind, photos: [], time: Date.now(), src: srcName });
      added++;
    });
    A.saveProject(); A.renderPoints(); A.updateMapLayers(); A.closeSheet();
    $('home').classList.add('hidden');
    A.map.extents();
    A.toast(`✓ ${added} σημεία${replaced ? ` · ${replaced} αντικαταστάθηκαν` : ''}${renamed ? ` · ${renamed} μετονομάστηκαν` : ''}${skipped ? ` · ${skipped} παραλείφθηκαν` : ''}`, 'ok', 4000);
    if (kind === 'stake') { A.setTab('stake'); A.setStakeMode('point'); const l = A.stakeList(); A.setTarget(l.find(p => !p.done) || l[0] || null); }
  }

  // ---------- KML / GeoJSON ----------
  function parseKML(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const out = [];
    doc.querySelectorAll('Placemark').forEach((pm, i) => {
      const nm = (pm.querySelector('name') || {}).textContent || ('K' + (i + 1));
      const c = pm.querySelector('Point coordinates');
      if (c) { const [lon, lat, z] = c.textContent.trim().split(',').map(Number); if (isFinite(lat)) out.push({ name: nm.trim(), lat, lon, Z: isFinite(z) && z ? z : null, code: ((pm.querySelector('description') || {}).textContent || '').trim().slice(0, 40) }); }
    });
    return out;
  }
  function parseGeoJSON(text) {
    const j = JSON.parse(text), out = [];
    const feats = j.type === 'FeatureCollection' ? j.features : (j.type === 'Feature' ? [j] : []);
    feats.forEach((f, i) => {
      if (!f.geometry) return; const pr = f.properties || {};
      const add = (c, k) => out.push({ name: String(pr.name || pr.Name || pr.id || ('G' + (i + 1))) + (k ? '_' + k : ''), lon: c[0], lat: c[1], Z: c[2] != null ? c[2] : (pr.Z != null ? pr.Z : null), code: pr.code || pr.Code || '' });
      if (f.geometry.type === 'Point') add(f.geometry.coordinates);
      if (f.geometry.type === 'MultiPoint') f.geometry.coordinates.forEach((c, k) => add(c, k + 1));
    });
    return out;
  }
  function llWizard(name, list) {
    const pts = list.map(p => { const g2 = HGEO.toGrid(p.lat, p.lon); return { name: p.name, E: g2.E, N: g2.N, Z: p.Z, code: p.code, lat: p.lat, lon: p.lon }; });
    let kind = 'stake';
    A.sheet('Εισαγωγή · ' + name, `<p>${pts.length} σημεία (φ, λ WGS84 → ${esc(HGEO.crsName())}).</p><canvas id="imp-prev"></canvas>
      <div class="result ok">${esc(rangeCheck(pts).msg || '')}</div>
      <label class="fld"><span>Εισαγωγή ως</span><select id="im-kind">${KIND.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
      <button class="btn primary big" id="im-go">⬇ Εισαγωγή ${pts.length} σημείων</button>`, b => {
      setTimeout(() => preview(b.querySelector('#imp-prev'), pts), 0);
      b.querySelector('#im-kind').onchange = e => kind = e.target.value;
      b.querySelector('#im-go').onclick = () => commit(pts, kind, 'rename', name);
    });
  }

  // ---------- Σχέδιο DXF / DWG ----------
  async function importCad(name, buf) {
    A.toast('Ανάγνωση ' + name + '…', '', 15000);
    const isDwg = /\.dwg$/i.test(name) || (new TextDecoder('ascii').decode(new Uint8Array(buf.slice(0, 4))) === 'AC10' && !/\.dxf$/i.test(name));
    const model = isDwg ? await HCAD.parseDWG(buf) : HCAD.parseDXF(decode(buf));
    if (!model.ents.length) throw new Error('Δεν βρέθηκαν οντότητες στο σχέδιο');
    const L = Object.keys(model.layers).length, cnt = { L: 0, P: 0, T: 0 };
    model.ents.forEach(e => cnt[e.t] = (cnt[e.t] || 0) + 1);
    const bb = model.bbox;
    let warn = '';
    if (bb && /^EGSA87/.test(A.settings.crs) && (bb.x0 < 50000 || bb.x1 > 1000000 || bb.y0 < 3700000 || bb.y1 > 4700000)) warn = 'Το σχέδιο δεν φαίνεται να είναι σε ΕΓΣΑ87 (τοπικές συντεταγμένες;). Μπορείς να το μετακινήσεις με «Μετάθεση σχεδίου».';
    A.sheet('Σχέδιο · ' + name, `<div class="result ${warn ? 'warn' : 'ok'}"><b>${model.ents.length} οντότητες</b> · ${L} layers<br>${cnt.L} γραμμές/πολυγραμμές · ${cnt.P || 0} σημεία · ${cnt.T || 0} κείμενα${bb ? `<br><span class="muted">X ${bb.x0.toFixed(1)}–${bb.x1.toFixed(1)} · Y ${bb.y0.toFixed(1)}–${bb.y1.toFixed(1)}</span>` : ''}${warn ? '<br>⚠ ' + esc(warn) : ''}</div>
      <label class="chk"><input type="checkbox" id="cd-pts" ${cnt.P ? 'checked' : ''}> Και τα σημεία (POINT) του σχεδίου ως σημεία χάραξης (${cnt.P || 0})</label>
      <div class="row"><label class="fld grow"><span>Μετάθεση ΔX (m)</span><input id="cd-dx" type="number" step="0.001" value="0"></label><label class="fld grow"><span>ΔY (m)</span><input id="cd-dy" type="number" step="0.001" value="0"></label></div>
      <button class="btn primary big" id="cd-go">⬇ Φόρτωση ως υπόβαθρο</button>`, b => {
      b.querySelector('#cd-go').onclick = async () => {
        const dx = parseFloat(b.querySelector('#cd-dx').value) || 0, dy = parseFloat(b.querySelector('#cd-dy').value) || 0;
        if (dx || dy) {
          const mv = p => { p.E += dx; p.N += dy; };
          model.ents.forEach(e => { if (e.t === 'L') { e.pts.forEach(mv); if (e.verts) e.verts.forEach(mv); if (e.center) mv(e.center); } else mv(e); });
          model.bbox = { x0: bb.x0 + dx, x1: bb.x1 + dx, y0: bb.y0 + dy, y1: bb.y1 + dy };
        }
        A.design = { name, model, layerState: {} };
        Object.keys(model.layers).forEach(l => A.design.layerState[l] = { on: model.layers[l].on !== false });
        await HIO.kvSet('design:' + A.proj.id, A.design);
        A.map.layers.design = model; A.map.designLayers = A.design.layerState;
        if (b.querySelector('#cd-pts').checked) {
          const pts = model.ents.filter(e => e.t === 'P').map((e, i) => ({ name: 'D' + (i + 1), E: e.E, N: e.N, Z: e.Z, code: e.layer }));
          if (pts.length) { commit(pts, 'stake', 'rename', name); }
        }
        A.closeSheet(); $('home').classList.add('hidden');
        A.map.follow = false; A.map.extents();
        A.toast(`✓ ${name} φορτώθηκε`, 'ok');
      };
    });
  }

  // ---------- Είσοδος: οποιοδήποτε αρχείο ----------
  async function ensureXLSX() {
    if (g.XLSX) return;
    await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'lib/xlsx.full.min.js'; s.onload = res; s.onerror = () => rej(new Error('Δεν φορτώθηκε η βιβλιοθήκη Excel')); document.head.appendChild(s); });
  }
  A.importAny = async function (file) {
    try {
      const name = file.name || 'αρχείο';
      const ext = (name.split('.').pop() || '').toLowerCase();
      const buf = await file.arrayBuffer();
      const head = new Uint8Array(buf.slice(0, 8));
      const isZip = head[0] === 0x50 && head[1] === 0x4B, isOle = head[0] === 0xD0 && head[1] === 0xCF;
      if (ext === 'dxf' || ext === 'dwg') return await importCad(name, buf);
      if (['xls', 'xlsx', 'xlsm', 'ods'].includes(ext) || isZip || isOle) {
        if (ext === 'kmz') throw new Error('Το KMZ δεν υποστηρίζεται — αποθήκευσέ το ως KML');
        await ensureXLSX();
        const wb = XLSX.read(buf, { type: 'array', cellDates: false });
        return tableWizard({ name, kind: 'sheet', wb });
      }
      const text = decode(buf);
      if (ext === 'kml' || /^\s*<\?xml[\s\S]{0,400}<kml/i.test(text)) { const l = parseKML(text); if (!l.length) throw new Error('Δεν βρέθηκαν σημεία στο KML'); return llWizard(name, l); }
      if (ext === 'geojson' || ext === 'json') { const l = parseGeoJSON(text); if (!l.length) throw new Error('Δεν βρέθηκαν σημεία στο GeoJSON'); return llWizard(name, l); }
      if (/^\s*0\s*\r?\n\s*SECTION/.test(text)) return await importCad(name, buf);
      tableWizard({ name, kind: 'text', text });
    } catch (e) { console.error(e); A.toast('Σφάλμα εισαγωγής: ' + (e.message || e), 'bad', 5000); }
  };

  A.importSheet = function () {
    A.sheet('Εισαγωγή', `<button class="btn primary big" id="ia-file">📂 Επιλογή αρχείου</button>
      <p class="muted">Αναγνωρίζεται αυτόματα: <b>TXT, CSV, XYZ, PNT</b> (οποιοδήποτε διαχωριστικό), <b>XLS, XLSX, ODS</b> (επιλογή φύλλου), <b>DXF, DWG</b> (υπόβαθρο), <b>KML, GeoJSON</b>. Μετά βλέπεις προεπισκόπηση και διορθώνεις τις στήλες πριν την εισαγωγή.</p>
      <button class="btn" id="ia-paste">📋 Επικόλληση συντεταγμένων (από email, Excel κ.λπ.)</button>
      <p class="muted">Από άλλες εφαρμογές: «Άνοιγμα με» ή «Κοινή χρήση» → HEXIS PAD.</p>`, b => {
      b.querySelector('#ia-file').onclick = () => {
        const inp = $('file-in'); inp.value = '';
        inp.accept = '.txt,.csv,.xyz,.pnt,.asc,.dat,.xls,.xlsx,.xlsm,.ods,.dxf,.dwg,.kml,.geojson,.json,text/*,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        inp.onchange = () => { const f = inp.files[0]; if (f) A.importAny(f); };
        inp.click();
      };
      b.querySelector('#ia-paste').onclick = () => A.pasteImport();
    });
  };
  A.pasteImport = function () {
    A.sheet('Επικόλληση συντεταγμένων', `<p class="muted">Επικόλλησε γραμμές με όνομα, X, Y, Z, κωδικό — με οποιοδήποτε διαχωριστικό (κόμμα, ερωτηματικό, tab από Excel, κενά).</p>
      <textarea id="pa-t" rows="10" placeholder="Σ1  213805.12  4285205.33  12.50  ΓΩΝ"></textarea>
      <div class="row"><button class="btn grow" id="pa-clip">Επικόλληση από πρόχειρο</button><button class="btn primary grow" id="pa-go">Συνέχεια ▸</button></div>`, b => {
      b.querySelector('#pa-clip').onclick = async () => { try { b.querySelector('#pa-t').value = await navigator.clipboard.readText(); } catch (e) { A.toast('Πάτα παρατεταμένα στο πλαίσιο → Επικόλληση'); } };
      b.querySelector('#pa-go').onclick = () => { const t = b.querySelector('#pa-t').value; if (!t.trim()) return A.toast('Κενό κείμενο', 'bad'); tableWizard({ name: 'Επικόλληση', kind: 'text', text: t }); };
    });
  };

  // ---------- Σύρσιμο αρχείου (tablet / browser) ----------
  const mw = $('mapwrap');
  ['dragenter', 'dragover'].forEach(ev => document.addEventListener(ev, e => { if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); $('drop-hint').classList.remove('hidden'); } }));
  ['dragleave', 'drop'].forEach(ev => document.addEventListener(ev, e => { if (ev === 'dragleave' && e.relatedTarget) return; $('drop-hint').classList.add('hidden'); }));
  document.addEventListener('drop', e => { if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); A.importAny(e.dataTransfer.files[0]); } });

  // ---------- Αρχεία από άλλες εφαρμογές (Android «Άνοιγμα με» / «Κοινή χρήση») ----------
  function b64ToFile(b64, name, mime) {
    const bin = atob(b64), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new File([u], name || 'αρχείο', { type: mime || 'application/octet-stream' });
  }
  A.handleIncoming = function (d) { if (d && d.data) { A.toast('Άνοιγμα ' + (d.name || 'αρχείου') + '…'); setTimeout(() => A.importAny(b64ToFile(d.data, d.name, d.mime)), 300); } };
  try {
    const P = g.Capacitor && g.Capacitor.Plugins && g.Capacitor.Plugins.HexisGnss;
    if (P && g.Capacitor.isNativePlatform()) {
      P.addListener('fileOpen', A.handleIncoming);
      setTimeout(async () => { try { const r = await P.getPendingFile(); if (r && r.data) A.handleIncoming(r); } catch (e) { } }, 1500);
    }
  } catch (e) { }

  A._imp = { num, analyze, textRows, build, detectSep };
})(window);
