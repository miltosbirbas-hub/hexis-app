// HEXIS PAD — Κάνναβος από πλευρά πολυγώνου (φύτευση δέντρων, πάσσαλοι, θεμέλια, φωτοβολταϊκά…)
// Πολύγωνο: μετρημένη γραμμή, κορυφές από σημεία, ή κλειστή πολυγραμμή του σχεδίου.
// Πλευρά βάσης → γραμμές παράλληλες σε απόσταση (offset) και σημεία ανά απόσταση, μέσα στο πολύγωνο.
(function (g) {
  'use strict';
  const A = g.APP, $ = A.$, esc = A.esc;
  const t = s => (g.HI18N ? HI18N.t(s) : s);
  const num = v => { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) ? x : null; };
  const F = v => v == null ? '—' : v.toFixed(3);

  // ---------- γεωμετρία ----------
  function inside(poly, E, N) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if (((a.N > N) !== (b.N > N)) && (E < (b.E - a.E) * (N - a.N) / (b.N - a.N) + a.E)) c = !c;
    }
    return c;
  }
  function segDist(p, a, b) {
    const dx = b.E - a.E, dy = b.N - a.N, L2 = dx * dx + dy * dy;
    let u = L2 ? ((p.E - a.E) * dx + (p.N - a.N) * dy) / L2 : 0; u = Math.max(0, Math.min(1, u));
    return Math.hypot(p.E - (a.E + u * dx), p.N - (a.N + u * dy));
  }
  function edgeDist(poly, p) { let m = Infinity; for (let i = 0; i < poly.length; i++) m = Math.min(m, segDist(p, poly[i], poly[(i + 1) % poly.length])); return m; }
  function area(poly) { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a.E * b.N - b.E * a.N; } return s / 2; }
  function clean(pts) {
    const out = [];
    for (const p of pts) { const q = out[out.length - 1]; if (!q || Math.hypot(p.E - q.E, p.N - q.N) > 1e-4) out.push({ E: p.E, N: p.N, Z: p.Z != null ? p.Z : null, name: p.name }); }
    if (out.length > 2 && Math.hypot(out[0].E - out[out.length - 1].E, out[0].N - out[out.length - 1].N) < 1e-4) out.pop();
    return out;
  }

  // Δημιουργία κανάβου. o: {side, dx, dy, first, edge, stagger, center, rot}
  function build(poly, o) {
    const a = poly[o.side], b = poly[(o.side + 1) % poly.length];
    const L = Math.hypot(b.E - a.E, b.N - a.N); if (L < 1e-6) return [];
    const ux = (b.E - a.E) / L, uy = (b.N - a.N) / L;
    // κάθετος προς το εσωτερικό
    let vx = -uy, vy = ux;
    const mid = { E: (a.E + b.E) / 2 + vx * 0.01, N: (a.N + b.N) / 2 + vy * 0.01 };
    if (!inside(poly, mid.E, mid.N)) { vx = -vx; vy = -vy; }
    const loc = poly.map(p => ({ u: (p.E - a.E) * ux + (p.N - a.N) * uy, v: (p.E - a.E) * vx + (p.N - a.N) * vy }));
    const vMax = Math.max(...loc.map(p => p.v));
    const out = [];
    const dx = o.dx, dy = o.dy;
    if (!(dx > 0) || !(dy > 0)) return out;
    let row = 0;
    for (let v = o.first; v <= vMax + 1e-9; v += dy, row++) {
      // τμήματα της γραμμής v μέσα στο πολύγωνο (τομές με τις πλευρές)
      const xs = [];
      for (let i = 0; i < loc.length; i++) {
        const p = loc[i], q = loc[(i + 1) % loc.length];
        if ((p.v > v) !== (q.v > v)) xs.push(p.u + (v - p.v) * (q.u - p.u) / (q.v - p.v));
      }
      xs.sort((m, n) => m - n);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const u0 = xs[k] + o.edge, u1 = xs[k + 1] - o.edge;
        if (u1 < u0 - 1e-9) continue;
        const sh = o.stagger && row % 2 ? dx / 2 : 0;
        let us = [];
        if (o.center) {
          const span = u1 - u0, n = Math.floor(span / dx + 1e-9) + 1, s0 = (u0 + u1) / 2 - (n - 1) * dx / 2;
          for (let i = 0; i < n; i++) us.push(s0 + i * dx);
          if (o.stagger && row % 2 && n > 1) { us = us.slice(0, -1).map(u => u + dx / 2); }
        } else {
          // αγκύρωση στην κορυφή Α της πλευράς βάσης (u = edge)
          const base = o.edge + sh;
          const i0 = Math.ceil((u0 - base) / dx - 1e-9), i1 = Math.floor((u1 - base) / dx + 1e-9);
          for (let i = i0; i <= i1; i++) us.push(base + i * dx);
        }
        for (const u of us) {
          const E = a.E + ux * u + vx * v, N = a.N + uy * u + vy * v;
          if (!inside(poly, E, N)) continue;
          if (o.edge > 0 && edgeDist(poly, { E, N }) < o.edge - 1e-6) continue;
          out.push({ E, N, row: row + 1, u });
        }
      }
    }
    // φιδωτή σειρά (πάει-έρχεται): το «Επόμενο» στη χάραξη πηγαίνει πάντα στο διπλανό σημείο
    out.sort((p, q) => p.row - q.row || (p.row % 2 ? p.u - q.u : q.u - p.u));
    return out;
  }
  A._gridBuild = build;

  // ---------- κατάσταση εργαλείου ----------
  const G = { poly: null, src: '', o: null };
  const S = () => (A.settings.grid = Object.assign({ dx: 5, dy: 5, first: 2.5, edge: 2.5, stagger: false, center: true, prefix: 'Δ', code: 'ΔΕΝΤΡΟ', zMode: 'none' }, A.settings.grid || {}));

  function choosePoly() {
    const lines = (A.map.layers.lines || []).filter(l => l.pts.length >= 3);
    A.sheet('Κάνναβος — πολύγωνο', `<p class="muted">Από ποιο πολύγωνο; (π.χ. το όριο του χωραφιού)</p>
      ${lines.length ? `<h4>Μετρημένες γραμμές</h4><div class="list">${lines.map((l, i) => `<div class="li" data-i="${i}"><span class="nm">${esc(l.pts[0].code || 'Γραμμή')}</span><span class="cd">${l.pts.length} ${t('κορυφές')} · ${esc(l.pts[0].name)} → ${esc(l.pts[l.pts.length - 1].name)}</span></div>`).join('')}</div>` : ''}
      <button class="btn" id="gp-dxf">⌖ Κλειστή πολυγραμμή από το σχέδιο (DXF/DWG)</button>
      <button class="btn" id="gp-pts">☰ Κορυφές από σημεία (με τη σειρά)</button>`, b => {
      b.querySelectorAll('.li[data-i]').forEach(el => el.onclick = () => { const l = lines[+el.dataset.i]; setPoly(l.pts, (l.pts[0].code || t('Γραμμή')) + ' ' + l.pts[0].name); });
      b.querySelector('#gp-dxf').onclick = () => A.startPick(t('Πάτα πάνω στο όριο (πολυγραμμή του σχεδίου)'), { line: true }, r => {
        if (r.ent && r.ent.pts && r.ent.pts.length >= 3) setPoly(r.ent.pts, t('Σχέδιο') + ' (' + (r.ent.layer || '') + ')');
        else { A.toast(t('Δεν βρέθηκε πολυγραμμή — πάτα πάνω της'), 'bad'); }
      });
      b.querySelector('#gp-pts').onclick = () => pickVerts([]);
    });
  }
  function pickVerts(chosen) {
    A.sheet('Κάνναβος — κορυφές', `<p class="muted">Πρόσθεσε τις κορυφές του πολυγώνου με τη σειρά.</p><div class="list">${chosen.map((p, i) => `<div class="li"><span class="nm">${i + 1}. ${esc(p.name)}</span><span class="xy">${F(p.E)} / ${F(p.N)}</span></div>`).join('')}</div>
      <div class="row"><button class="btn grow" id="gv-add">＋ Κορυφή</button><button class="btn primary grow" id="gv-ok" ${chosen.length >= 3 ? '' : 'disabled'}>Συνέχεια ▸</button></div>`, b => {
      b.querySelector('#gv-add').onclick = () => A.pickPointSheet(t('Κορυφή') + ' ' + (chosen.length + 1), p => { chosen.push(p); pickVerts(chosen); });
      b.querySelector('#gv-ok').onclick = () => setPoly(chosen, chosen.map(p => p.name).join('-'));
    });
  }
  function setPoly(pts, src) {
    const poly = clean(pts);
    if (poly.length < 3) return A.toast(t('Χρειάζονται τουλάχιστον 3 κορυφές'), 'bad');
    G.poly = poly; G.src = src;
    // προεπιλογή: η μεγαλύτερη πλευρά
    let best = 0, bl = 0; poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length], l = Math.hypot(q.E - p.E, q.N - p.N); if (l > bl) { bl = l; best = i; } });
    G.side = best;
    params();
  }

  function params() {
    const s = S(), poly = G.poly, n = poly.length;
    const sides = poly.map((p, i) => { const q = poly[(i + 1) % n]; return { i, txt: (p.name || ('K' + (i + 1))) + ' → ' + (q.name || ('K' + ((i + 1) % n + 1))) + ' · ' + Math.hypot(q.E - p.E, q.N - p.N).toFixed(2) + ' m' }; });
    A.sheet('Κάνναβος', `<div class="result"><b>${esc(G.src)}</b> · ${t('Εμβαδόν')} ${Math.abs(area(poly)).toFixed(1)} m² (${(Math.abs(area(poly)) / 1000).toFixed(3)} ${t('στρ.')})</div>
      <label class="fld"><span>Πλευρά βάσης (οι σειρές γίνονται παράλληλες σε αυτήν)</span><select id="gr-s">${sides.map(x => `<option value="${x.i}" ${x.i === G.side ? 'selected' : ''}>${esc(x.txt)}</option>`).join('')}</select></label>
      <div class="row"><label class="fld grow"><span>Απόσταση στη σειρά (m)</span><input id="gr-dx" type="number" step="0.1" min="0.1" inputmode="decimal" value="${s.dx}"></label>
      <label class="fld grow"><span>Απόσταση σειρών (m)</span><input id="gr-dy" type="number" step="0.1" min="0.1" inputmode="decimal" value="${s.dy}"></label></div>
      <div class="row"><label class="fld grow"><span>Offset 1ης σειράς (m)</span><input id="gr-f" type="number" step="0.1" min="0" inputmode="decimal" value="${s.first}"></label>
      <label class="fld grow"><span>Από όλα τα όρια (m)</span><input id="gr-e" type="number" step="0.1" min="0" inputmode="decimal" value="${s.edge}"></label></div>
      <div class="seg" id="gr-pat"><button data-v="sq" class="${!s.stagger ? 'on' : ''}">▦ Τετράγωνο</button><button data-v="st" class="${s.stagger ? 'on' : ''}">⁘ Ρομβοειδές (κλιμακωτό)</button></div>
      <label class="chk"><input type="checkbox" id="gr-c" ${s.center ? 'checked' : ''}> Κεντράρισμα κάθε σειράς (ίσα περιθώρια δεξιά-αριστερά)</label>
      <div class="row"><label class="fld grow"><span>Πρόθεμα ονόματος</span><input id="gr-pf" value="${esc(s.prefix)}"></label><label class="fld grow"><span>Κωδικός</span><input id="gr-cd" list="code-list" value="${esc(s.code)}"></label></div>
      <div id="gr-r"></div>
      <div class="row"><button class="btn grow" id="gr-back">◂ Άλλο πολύγωνο</button><button class="btn primary grow" id="gr-ok">✓ Δημιουργία σημείων χάραξης</button></div>`, b => {
      const read = () => {
        const segv = b.querySelector('#gr-pat .on').dataset.v;
        Object.assign(s, { dx: num(b.querySelector('#gr-dx').value) || s.dx, dy: num(b.querySelector('#gr-dy').value) || s.dy, first: Math.max(0, num(b.querySelector('#gr-f').value) != null ? num(b.querySelector('#gr-f').value) : s.first), edge: Math.max(0, num(b.querySelector('#gr-e').value) != null ? num(b.querySelector('#gr-e').value) : s.edge), stagger: segv === 'st', center: b.querySelector('#gr-c').checked, prefix: b.querySelector('#gr-pf').value.trim(), code: b.querySelector('#gr-cd').value.trim() });
        G.side = parseInt(b.querySelector('#gr-s').value, 10) || 0;
        return { side: G.side, dx: Math.max(0.05, s.dx), dy: Math.max(0.05, s.dy), first: s.first, edge: s.edge, stagger: s.stagger, center: s.center };
      };
      const upd = () => {
        const o = read(); const pts = build(poly, o); G.pts = pts;
        const rows = pts.length ? Math.max(...pts.map(p => p.row)) : 0;
        const a = poly[o.side], c = poly[(o.side + 1) % poly.length];
        A.map.layers.preview = { poly, base: [a, c], pts }; A.map.redraw();
        b.querySelector('#gr-r').innerHTML = `<div class="result ${pts.length ? 'ok' : 'warn'}"><b>${pts.length}</b> ${t('σημεία')} · ${rows} ${t('σειρές')}${pts.length > 3000 ? '<br>⚠ ' + t('Πολλά σημεία — μεγάλωσε τις αποστάσεις') : ''}</div>`;
      };
      b.querySelectorAll('input,select').forEach(el => el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', upd));
      b.querySelectorAll('#gr-pat button').forEach(x => x.onclick = () => { b.querySelectorAll('#gr-pat button').forEach(y => y.classList.toggle('on', y === x)); upd(); });
      upd();
      if (A.map && A.map.fitTo) try { A.map.fitTo(poly); } catch (e) { }
      A._onSheetClose = () => { A.map.layers.preview = null; A.map.redraw(); };
      b.querySelector('#gr-back').onclick = () => { A.map.layers.preview = null; choosePoly(); };
      b.querySelector('#gr-ok').onclick = () => {
        upd(); const pts = G.pts || [];
        if (!pts.length) return A.toast(t('Κανένα σημείο — έλεγξε αποστάσεις και όρια'), 'bad');
        if (pts.length > 5000) return A.toast(t('Πάνω από 5000 σημεία — μεγάλωσε τις αποστάσεις'), 'bad');
        const pf = s.prefix || 'Δ'; let k = 1; const made = [];
        for (const p of pts) {
          let nm; do { nm = pf + (k++); } while (A.findPoint(nm));
          let ll = { lat: null, lon: null }; try { ll = HGEO.toLL(p.E, p.N); } catch (e) { }
          made.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), name: nm, code: s.code, E: p.E, N: p.N, Z: null, lat: ll.lat, lon: ll.lon, type: 'stake', photos: [], time: Date.now(), note: t('Κάνναβος') + ' ' + s.dx + '×' + s.dy + ' m · ' + t('σειρά') + ' ' + p.row, grid: { row: p.row } });
        }
        A.proj.points.push(...made);
        A.saveSettings(); A.saveProject(); A.renderPoints(); A.updateMapLayers();
        A.map.layers.preview = null; A._onSheetClose = null; A.closeSheet();
        A.toast('✓ ' + made.length + ' ' + t('σημεία χάραξης') + ' (' + made[0].name + ' … ' + made[made.length - 1].name + ')', 'ok', 4000);
        A.setTab('stake'); A.setStakeMode('point'); A.setTarget(made[0]);
      };
    });
  }

  A.gridTool = () => choosePoly();
})(window);
