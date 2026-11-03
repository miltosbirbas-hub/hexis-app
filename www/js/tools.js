// HEXIS PAD — COGO, offset/laser, σύνδεση, NTRIP, έργα, εισαγωγή/εξαγωγή, συστήματα, ρυθμίσεις, οδηγίες
(function (g) {
  'use strict';
  const A = g.APP, $ = A.$, esc = A.esc, F = A.F;
  const num = v => { const x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : null; };

  // ---------- Πεδίο επιλογής σημείου ----------
  // Επιστρέφει html· μετά το άνοιγμα καλείς bindPP(body, sel) — sel[key] = σημείο
  function pp(key, label) {
    return `<div class="pp"><label class="fld pp-in"><span>${label}</span><input data-pp="${key}" placeholder="όνομα σημείου" autocomplete="off"></label><button class="btn" data-ppl="${key}" title="Λίστα">☰</button><button class="btn" data-ppc="${key}" title="Τρέχουσα θέση">📍</button><button class="btn" data-ppm="${key}" title="Μέτρηση τώρα">●</button></div>`;
  }
  function bindPP(b, sel, onChange, reopen) {
    b.querySelectorAll('[data-pp]').forEach(inp => {
      const k = inp.dataset.pp;
      if (sel[k]) inp.value = sel[k].name;
      inp.onchange = () => { const p = A.findPoint(inp.value.trim()); if (p) { sel[k] = p; onChange && onChange(); } else if (inp.value.trim()) A.toast('Δεν βρέθηκε: ' + inp.value, 'bad'); };
    });
    b.querySelectorAll('[data-ppl]').forEach(bt => bt.onclick = () => A.pickPointSheet('Επιλογή σημείου', p => { sel[bt.dataset.ppl] = p; reopen(); }));
    b.querySelectorAll('[data-ppc]').forEach(bt => bt.onclick = () => { if (!A.pos) return A.toast('Δεν υπάρχει θέση', 'bad'); sel[bt.dataset.ppc] = { name: 'Θέση ' + new Date().toLocaleTimeString('el-GR'), E: A.pos.E, N: A.pos.N, Z: A.pos.Z, _tmp: true }; reopen(); });
    b.querySelectorAll('[data-ppm]').forEach(bt => bt.onclick = async () => {
      if (!A.pos) return A.toast('Δεν υπάρχει θέση', 'bad');
      bt.textContent = '⏳';
      try { const r = await A.measure({ raw: true, btn: bt }); if (!r) return; const pt = r.pt; pt.name = A.uniqueName(pt.name); A.storePoint(pt, true); A.proj.nextName = A.nextName(pt.name); $('sv-name').value = A.proj.nextName; sel[bt.dataset.ppm] = pt; reopen(); }
      catch (e) { A.toast(e.message, 'bad'); bt.textContent = '●'; }
    });
  }
  const need = (sel, keys) => { for (const k of keys) if (!sel[k]) { A.toast('Συμπλήρωσε όλα τα σημεία', 'bad'); return false; } return true; };
  function saveCalc(p, name, code) {
    const pt = { name: A.uniqueName(name || 'Υ1'), code: code || '', E: p.E, N: p.N, Z: p.Z != null ? p.Z : null, type: 'calc' };
    return A.storePoint(pt);
  }
  function resultActions(p, defName) {
    return `<div class="row"><label class="fld grow"><span>Όνομα αποτελέσματος</span><input id="res-name" value="${esc(A.uniqueName(defName))}"></label></div>
      <div class="row"><button class="btn grow" id="res-save">💾 Αποθήκευση σημείου</button><button class="btn primary grow" id="res-stake">◎ Χάραξη</button></div>`;
  }
  function bindResult(b, getP, code) {
    const s = b.querySelector('#res-save'), k = b.querySelector('#res-stake');
    if (s) s.onclick = () => { const p = getP(); if (!p) return; saveCalc(p, b.querySelector('#res-name').value, code); A.closeSheet(); };
    if (k) k.onclick = () => { const p = getP(); if (!p) return; const pt = saveCalc(p, b.querySelector('#res-name').value, code); pt.type = 'stake'; A.saveProject(); A.closeSheet(); A.setTab('stake'); A.setStakeMode('point'); A.setTarget(pt); };
  }
  const kvHtml = rows => `<div class="kv">${rows.map(r => `<span>${r[0]}</span><span>${r[1]}</span>`).join('')}</div>`;

  // ==================== COGO ====================
  const tools = {};
  A.runTool = name => tools[name] && tools[name]({});
  tools.grid = () => A.gridTool();
  A.COGO_LIST = [['inverse', '↔', 'Απόσταση / Αζιμούθιο'], ['slope', '⟋', 'Μέτρηση κλίσης'], ['extend', '→|', 'Επέκταση ευθείας'], ['densify', '┄', 'Πύκνωση ευθυγραμμίας'], ['hidden', '⌖', 'Δυσπρόσιτο σημείο'], ['floor', '▱', 'Κλίση δαπέδου / επιφάνεια'], ['square', '⊾', 'Γωνίασμα κατασκευής'], ['intersect', '✕', 'Τομή ευθειών'], ['area', '⬠', 'Εμβαδόν / περίμετρος'], ['grid', '⁘', 'Κάνναβος από πλευρά (φύτευση, πάσσαλοι)'], ['calib', '⚙', 'Τοπική προσαρμογή']];
  A.cogoSheet = function () {
    A.sheet('COGO', `<div class="tool-grid">${A.COGO_LIST.map(([k, i, l]) => `<button data-tool="${k}"><i>${i}</i>${l}</button>`).join('')}</div>`, b => {
      b.querySelectorAll('[data-tool]').forEach(x => x.onclick = () => A.runTool(x.dataset.tool));
    });
  };

  tools.inverse = function (sel) {
    const open = () => A.sheet('Απόσταση / Αζιμούθιο / Κλίση', `${pp('a', 'Από σημείο')}${pp('b', 'Προς σημείο')}<div id="r"></div>`, b => {
      bindPP(b, sel, open, open);
      if (sel.a && sel.b) {
        const s = HCOGO.slope(sel.a, sel.b);
        b.querySelector('#r').innerHTML = `<div class="result">${kvHtml([['Οριζόντια απόσταση', s.hd.toFixed(3) + ' m'], ['Κεκλιμένη απόσταση', s.sd != null ? s.sd.toFixed(3) + ' m' : '—'], ['Αζιμούθιο (καννάβου)', HGEO.fmtAz(HGEO.azimuth(sel.a, sel.b))], ['Γωνία (grad)', (HGEO.azimuth(sel.a, sel.b) / 0.9).toFixed(4) + ' g'], ['ΔX / ΔY', F(sel.b.E - sel.a.E) + ' / ' + F(sel.b.N - sel.a.N)], ['ΔZ', F(s.dz)], ['Κλίση', s.pct != null ? s.pct.toFixed(3) + ' %  ·  ' + s.permil.toFixed(1) + ' ‰' : '—'], ['Γωνία κλίσης', s.deg != null ? s.deg.toFixed(3) + '°' : '—'], ['Αναλογία', s.ratio ? '1 : ' + s.ratio.toFixed(2) : '—']])}</div>`;
      }
    });
    open();
  };

  // Μέτρηση κλίσης: ζωντανά από σημείο αναφοράς ή μεταξύ δύο σημείων
  tools.slope = function (sel) {
    let live = null;
    const open = () => A.sheet('Μέτρηση κλίσης', `<p class="muted">Σημείο αναφοράς Α και (α) ζωντανή θέση της ράβδου ή (β) δεύτερο σημείο Β.</p>${pp('a', 'Σημείο αναφοράς Α')}${pp('b', 'Σημείο Β (προαιρετικό — αλλιώς ζωντανά)')}<div id="r" class="result"></div>`, b => {
      bindPP(b, sel, open, open);
      const upd = () => {
        const B = sel.b || (A.pos ? { E: A.pos.E, N: A.pos.N, Z: A.pos.Z } : null);
        const box = b.querySelector('#r'); if (!box) return;
        if (!sel.a || !B) { box.innerHTML = 'Όρισε το Α' + (A.pos ? '' : ' και σύνδεσε δέκτη'); return; }
        const s = HCOGO.slope(sel.a, B);
        box.innerHTML = `<div style="font-size:30px;font-weight:800">${s.pct != null ? s.pct.toFixed(2) + ' %' : '—'}</div>${kvHtml([['‰', s.permil != null ? s.permil.toFixed(1) : '—'], ['Μοίρες', s.deg != null ? s.deg.toFixed(3) + '°' : '—'], ['Αναλογία', s.ratio ? '1 : ' + s.ratio.toFixed(2) : '—'], ['Οριζ. απόσταση', s.hd.toFixed(3) + ' m'], ['ΔZ', F(s.dz)], ['Αζιμούθιο', HGEO.fmtAz(s.az || 0)], ['Πηγή Β', sel.b ? sel.b.name : 'ζωντανή θέση']])}`;
      };
      upd();
      if (!sel.b) { live = upd; A.epochListeners.push(live); A._onSheetClose = () => { A.epochListeners = A.epochListeners.filter(f => f !== live); }; }
    });
    open();
  };

  tools.extend = function (sel) {
    const open = () => A.sheet('Επέκταση ευθείας', `${pp('a', 'Σημείο Α')}${pp('b', 'Σημείο Β')}
      <div class="row"><label class="fld grow"><span>Απόσταση (m)</span><input id="d" type="number" step="0.001" inputmode="decimal" value="${sel.d || ''}"></label>
      <label class="fld grow"><span>Offset (+δεξιά)</span><input id="o" type="number" step="0.001" inputmode="decimal" value="${sel.o || 0}"></label></div>
      <div class="seg" id="fr"><button data-v="b" class="${sel.fr !== 'a' ? 'on' : ''}">Μετά το Β</button><button data-v="a" class="${sel.fr === 'a' ? 'on' : ''}">Πριν το Α</button></div>
      <div id="r"></div>${resultActions(null, 'ΕΠ1')}`, b => {
      bindPP(b, sel, open, () => { sel.d = b.querySelector('#d').value; sel.o = b.querySelector('#o').value; open(); });
      b.querySelectorAll('#fr button').forEach(x => x.onclick = () => { sel.fr = x.dataset.v; sel.d = b.querySelector('#d').value; sel.o = b.querySelector('#o').value; open(); });
      const calc = () => {
        if (!sel.a || !sel.b) return null; const d = num(b.querySelector('#d').value); if (d == null) return null;
        return HCOGO.extend(sel.a, sel.b, d, num(b.querySelector('#o').value) || 0, sel.fr === 'a');
      };
      const show = () => { const p = calc(); b.querySelector('#r').innerHTML = p ? `<div class="result">${kvHtml([['X', F(p.E)], ['Y', F(p.N)], ['Z (γραμμ. προέκταση)', F(p.Z)]])}</div>` : ''; };
      b.querySelector('#d').oninput = b.querySelector('#o').oninput = show; show();
      bindResult(b, () => calc() || (A.toast('Συμπλήρωσε τα στοιχεία', 'bad'), null), 'ΕΠΕΚΤ');
    });
    open();
  };

  tools.densify = function (sel) {
    const open = () => A.sheet('Πύκνωση ευθυγραμμίας', `<p class="muted">Δημιουργεί σημεία χάραξης κατά μήκος γραμμής Α→Β (ή γραμμής σχεδίου) ανά βήμα, με προαιρετικό offset.</p>
      <button class="btn" id="dz-dxf">⌖ Χρήση γραμμής από το σχέδιο${sel.line ? ' ✓ (' + sel.line.length + ' κορυφές)' : ''}</button>
      ${sel.line ? '' : pp('a', 'Αρχή Α') + pp('b', 'Τέλος Β')}
      <div class="row"><label class="fld grow"><span>Βήμα (m)</span><input id="st" type="number" step="0.01" inputmode="decimal" value="${sel.st || 5}"></label>
      <label class="fld grow"><span>Offset (+δεξιά)</span><input id="of" type="number" step="0.01" inputmode="decimal" value="${sel.of || 0}"></label>
      <label class="fld grow"><span>Πρόθεμα</span><input id="px" value="${esc(sel.px || 'Π')}"></label></div>
      <label class="chk"><input type="checkbox" id="vx" ${sel.vx !== false ? 'checked' : ''}> Και οι κορυφές της γραμμής</label>
      <div id="r"></div><button class="btn primary" id="go">Δημιουργία σημείων χάραξης</button>`, b => {
      const keep = () => { sel.st = b.querySelector('#st').value; sel.of = b.querySelector('#of').value; sel.px = b.querySelector('#px').value; sel.vx = b.querySelector('#vx').checked; };
      bindPP(b, sel, open, () => { keep(); open(); });
      b.querySelector('#dz-dxf').onclick = () => { keep(); A.startPick('Πάτα πάνω σε γραμμή του σχεδίου', { line: true }, r => { if (r.ent) { sel.line = r.ent.closed ? r.ent.pts.concat([r.ent.pts[0]]) : r.ent.pts; } open(); }); };
      const pts = () => sel.line || (sel.a && sel.b ? [sel.a, sel.b] : null);
      const show = () => { const P = pts(); const st = num(b.querySelector('#st').value); if (!P || !st) return; const L = P.reduce((a, p, i) => i ? a + Math.hypot(p.E - P[i - 1].E, p.N - P[i - 1].N) : 0, 0); b.querySelector('#r').innerHTML = `<div class="result">Μήκος ${L.toFixed(3)} m → περίπου ${Math.floor(L / st) + 1} σημεία</div>`; };
      b.querySelector('#st').oninput = show; show();
      b.querySelector('#go').onclick = () => {
        const P = pts(); const st = num(b.querySelector('#st').value);
        if (!P || !st || st <= 0) return A.toast('Όρισε γραμμή και βήμα', 'bad');
        const out = HCOGO.densify(P, st, num(b.querySelector('#of').value) || 0, b.querySelector('#vx').checked);
        const px = b.querySelector('#px').value || 'Π';
        out.forEach((p, i) => A.proj.points.push({ id: A.uid(), name: A.uniqueName(px + (i + 1)), code: 'Χ.Θ.' + p.station.toFixed(2), E: p.E, N: p.N, Z: p.Z, type: 'stake', photos: [], time: Date.now() }));
        A.saveProject(); A.renderPoints(); A.updateMapLayers(); A.closeSheet();
        A.toast(`✓ ${out.length} σημεία χάραξης`, 'ok'); A.setTab('stake'); A.setStakeMode('point'); A.setTarget(A.stakeList().find(p => p.name.startsWith(px)) || null);
      };
    });
    open();
  };

  // Δυσπρόσιτο σημείο
  tools.hidden = function (sel) {
    sel.m = sel.m || 'll';
    const modes = { ll: 'Δύο σημεία πριν + δύο μετά (τομή ευθειών)', polar: 'Απόσταση + αζιμούθιο (laser)', dd: 'Τομή δύο αποστάσεων', line: 'Στην προέκταση ευθείας' };
    const open = () => A.sheet('Δυσπρόσιτο σημείο', `<select id="hm">${Object.entries(modes).map(([k, v]) => `<option value="${k}" ${k === sel.m ? 'selected' : ''}>${v}</option>`).join('')}</select><div id="hb"></div><div id="r"></div>${sel.survey ? surveyActions() : resultActions(null, 'ΔΣ1')}`, b => {
      b.querySelector('#hm').onchange = e => { sel.m = e.target.value; open(); };
      const hb = b.querySelector('#hb');
      let calc = () => null;
      if (sel.m === 'polar') {
        hb.innerHTML = `${pp('a', 'Στάση (σημείο ή θέση)')}<div class="row"><label class="fld grow"><span>Οριζ. απόσταση HD (m)</span><input id="hd" type="number" step="0.001" inputmode="decimal" value="${sel.hd || ''}"></label><label class="fld grow"><span>Αζιμούθιο (°)</span><input id="az" type="number" step="0.01" inputmode="decimal" value="${sel.az || ''}"></label></div>
          <div class="row"><label class="fld grow"><span>Κατακ. διαφορά VD (m)</span><input id="vd" type="number" step="0.001" inputmode="decimal" value="${sel.vd || ''}"></label><label class="fld grow"><span>Ύψος laser (m)</span><input id="hi" type="number" step="0.001" inputmode="decimal" value="${sel.hi || 1.5}"></label><label class="fld grow"><span>Ύψος στόχου (m)</span><input id="ht" type="number" step="0.001" inputmode="decimal" value="${sel.ht || 0}"></label></div>
          <div class="row"><label class="chk grow"><input type="checkbox" id="mag" ${sel.mag ? 'checked' : ''}> Αζιμούθιο μαγνητικό (laser/πυξίδα)</label><label class="fld"><span>Απόκλιση (°)</span><input id="dec" type="number" step="0.1" value="${A.settings.decl}"></label></div>
          <button class="btn" id="las">🔦 Λήψη από laser</button>`;
        const keep = () => ['hd', 'az', 'vd', 'hi', 'ht'].forEach(k => sel[k] = hb.querySelector('#' + k).value);
        bindPP(b, sel, open, () => { keep(); sel.mag = hb.querySelector('#mag').checked; open(); });
        hb.querySelector('#las').onclick = () => {
          A.toast('Σημάδεψε με το laser και πάτα μέτρηση στη συσκευή…');
          const f = r => { A.laserListeners = A.laserListeners.filter(x => x !== f); if (r.hd != null) hb.querySelector('#hd').value = r.hd.toFixed(3); if (r.az != null) { hb.querySelector('#az').value = r.az.toFixed(2); hb.querySelector('#mag').checked = true; } if (r.vd != null) hb.querySelector('#vd').value = r.vd.toFixed(3); show(); };
          A.laserListeners.push(f);
        };
        calc = () => {
          if (!sel.a) return null; const hd = num(hb.querySelector('#hd').value); let az = num(hb.querySelector('#az').value);
          if (hd == null || az == null) return null;
          if (hb.querySelector('#mag').checked) { const dec = num(hb.querySelector('#dec').value) || 0; A.settings.decl = dec; let conv = 0; try { const ll = HGEO.toLL(sel.a.E, sel.a.N); conv = HGEO.convergence(ll.lat, ll.lon); } catch (e) { } az = az + dec - conv; }
          const vd = num(hb.querySelector('#vd').value), hi = num(hb.querySelector('#hi').value) || 0, ht = num(hb.querySelector('#ht').value) || 0;
          const p = HCOGO.polar(sel.a, az, hd, null);
          p.Z = (sel.a.Z != null && vd != null) ? sel.a.Z + hi + vd - ht : null; return p;
        };
        ['hd', 'az', 'vd', 'hi', 'ht', 'dec'].forEach(k => hb.querySelector('#' + k).oninput = () => show()); hb.querySelector('#mag').onchange = () => show();
      }
      if (sel.m === 'dd') {
        hb.innerHTML = `${pp('a', 'Σημείο Α')}${pp('b', 'Σημείο Β')}<div class="row"><label class="fld grow"><span>Απόσταση από Α (m)</span><input id="r1" type="number" step="0.001" inputmode="decimal" value="${sel.r1 || ''}"></label><label class="fld grow"><span>Απόσταση από Β (m)</span><input id="r2" type="number" step="0.001" inputmode="decimal" value="${sel.r2 || ''}"></label></div>
          <div class="seg" id="sd"><button data-v="L" class="${sel.sd !== 'R' ? 'on' : ''}">Αριστερά της Α→Β</button><button data-v="R" class="${sel.sd === 'R' ? 'on' : ''}">Δεξιά της Α→Β</button></div>`;
        const keep = () => { sel.r1 = hb.querySelector('#r1').value; sel.r2 = hb.querySelector('#r2').value; };
        bindPP(b, sel, open, () => { keep(); open(); });
        hb.querySelectorAll('#sd button').forEach(x => x.onclick = () => { keep(); sel.sd = x.dataset.v; open(); });
        calc = () => { if (!sel.a || !sel.b) return null; const r = HCOGO.distDist(sel.a, sel.b, num(hb.querySelector('#r1').value), num(hb.querySelector('#r2').value)); return r ? r[sel.sd === 'R' ? 'R' : 'L'] : null; };
        hb.querySelector('#r1').oninput = hb.querySelector('#r2').oninput = () => show();
      }
      if (sel.m === 'line') {
        hb.innerHTML = `<p class="muted">Μέτρησε δύο σημεία πάνω στην ευθεία (π.χ. κατά μήκος τοίχου) και δώσε την απόσταση μέχρι το δυσπρόσιτο σημείο.</p>${pp('a', 'Σημείο 1')}${pp('b', 'Σημείο 2')}<div class="row"><label class="fld grow"><span>Απόσταση μετά το 2 (m)</span><input id="d" type="number" step="0.001" inputmode="decimal" value="${sel.d || ''}"></label><label class="fld grow"><span>Offset (+δεξιά)</span><input id="o" type="number" step="0.001" inputmode="decimal" value="${sel.o || 0}"></label></div>`;
        bindPP(b, sel, open, () => { sel.d = hb.querySelector('#d').value; sel.o = hb.querySelector('#o').value; open(); });
        calc = () => { if (!sel.a || !sel.b) return null; const d = num(hb.querySelector('#d').value); return d == null ? null : HCOGO.extend(sel.a, sel.b, d, num(hb.querySelector('#o').value) || 0); };
        hb.querySelector('#d').oninput = hb.querySelector('#o').oninput = () => show();
      }
      if (sel.m === 'll') {
        const K = ['a', 'b', 'c', 'd'];
        const next = K.find(k => !sel[k]);
        const lbl = { a: '1 · πριν (μακριά)', b: '2 · πριν (κοντά στο σημείο)', c: '3 · μετά (κοντά στο σημείο)', d: '4 · μετά (μακριά)' };
        hb.innerHTML = `<svg viewBox="0 0 320 130" style="width:100%;max-width:420px;height:auto;display:block;margin:2px auto 4px">
            <line x1="20" y1="110" x2="160" y2="22" stroke="#0060a8" stroke-width="3"/><line x1="160" y1="22" x2="300" y2="110" stroke="#5b2fd6" stroke-width="3"/>
            <line x1="104" y1="57" x2="160" y2="22" stroke="#c4145a" stroke-width="2" stroke-dasharray="5 4"/><line x1="160" y1="22" x2="216" y2="57" stroke="#c4145a" stroke-width="2" stroke-dasharray="5 4"/>
            ${[[40, 97, '1'], [96, 62, '2'], [224, 62, '3'], [280, 97, '4']].map(([x, y, t], i) => `<circle cx="${x}" cy="${y}" r="9" fill="${sel[K[i]] ? '#0b8a45' : '#fff'}" stroke="${i < 2 ? '#0060a8' : '#5b2fd6'}" stroke-width="3"/><text x="${x}" y="${y + 26}" text-anchor="middle" font-size="15" font-weight="800" fill="currentColor">${t}</text>`).join('')}
            <g stroke="#c4145a" stroke-width="4"><line x1="151" y1="13" x2="169" y2="31"/><line x1="169" y1="13" x2="151" y2="31"/></g>
            <text x="180" y="20" font-size="14" font-weight="800" fill="#c4145a">δυσπρόσιτο</text></svg>
          <p class="muted">Μέτρησε δύο σημεία πάνω στην ευθεία <b>πριν</b> το δυσπρόσιτο (1, 2) και δύο πάνω στην ευθεία <b>μετά</b> (3, 4). Η τομή των δύο ευθειών είναι το δυσπρόσιτο σημείο.</p>
          ${next ? `<button class="btn primary big" id="ll-meas" style="white-space:normal">● Μέτρηση σημείου ${({ a: '1 (πριν)', b: '2 (πριν)', c: '3 (μετά)', d: '4 (μετά)' })[next]}</button>` : `<button class="btn" id="ll-clear">↺ Νέα τομή</button>`}
          ${K.map(k => pp(k, 'Σημείο ' + lbl[k] + (sel[k] ? ' ✓' : ''))).join('')}`;
        bindPP(b, sel, open, open);
        const mb = hb.querySelector('#ll-meas');
        if (mb) mb.onclick = async () => {
          if (!A.pos) return A.toast('Δεν υπάρχει θέση GNSS', 'bad');
          try {
            const r = await A.measure({ raw: true, btn: mb }); if (!r) return;
            const pt = r.pt; pt.name = A.uniqueName('ΔΣ' + ({ a: '1', b: '2', c: '3', d: '4' }[next]) + '_' + (A.proj.points.length + 1)); pt.code = 'ΤΟΜΗ';
            A.storePoint(pt, true); sel[next] = pt; A.sound('point'); open();
          } catch (e) { A.toast(e.message, 'bad'); }
        };
        const cl = hb.querySelector('#ll-clear'); if (cl) cl.onclick = () => { K.forEach(k => delete sel[k]); A.map.layers.measure = []; A.map.redraw(); open(); };
        calc = () => {
          if (!(sel.a && sel.b && sel.c && sel.d)) return null;
          const p = HCOGO.lineLine(sel.a, sel.b, sel.d, sel.c); if (!p) return null;
          const q = HCOGO.lineLine(sel.d, sel.c, sel.a, sel.b);
          const z1 = p.Z, z2 = q ? q.Z : null;
          p.Z = (z1 != null && z2 != null) ? (z1 + z2) / 2 : (z1 != null ? z1 : z2);
          p._dz = (z1 != null && z2 != null) ? z1 - z2 : null;
          const L1 = Math.hypot(sel.b.E - sel.a.E, sel.b.N - sel.a.N), L2 = Math.hypot(sel.c.E - sel.d.E, sel.c.N - sel.d.N);
          const t1 = ((p.E - sel.a.E) * (sel.b.E - sel.a.E) + (p.N - sel.a.N) * (sel.b.N - sel.a.N)) / (L1 * L1);
          const t2 = ((p.E - sel.d.E) * (sel.c.E - sel.d.E) + (p.N - sel.d.N) * (sel.c.N - sel.d.N)) / (L2 * L2);
          p._ang = HCOGO.angleAt(p, sel.a, sel.d);
          p._d2 = Math.hypot(p.E - sel.b.E, p.N - sel.b.N); p._d3 = Math.hypot(p.E - sel.c.E, p.N - sel.c.N);
          p._warn = [];
          if (p._ang < 20 || p._ang > 160) p._warn.push('Οι ευθείες τέμνονται υπό πολύ οξεία γωνία — αδύναμη γεωμετρία');
          if (t1 < 1 || t2 < 1) p._warn.push('Η τομή δεν βρίσκεται μετά τα σημεία 2 και 3 — έλεγξε τη σειρά');
          if (p._d2 > 3 * L1 || p._d3 > 3 * L2) p._warn.push('Μεγάλη προέκταση σε σχέση με την απόσταση των σημείων — βάλε τα σημεία πιο αραιά');
          A.map.layers.measure = [sel.a, p, sel.d]; A.map.redraw();
          return p;
        };
        A._onSheetClose = () => { A.map.layers.measure = []; A.map.redraw(); };
      }
      const show = () => {
        const p = calc(); const box = b.querySelector('#r');
        if (!p) { box.innerHTML = ''; return; }
        const extra = sel.m === 'll' ? [['Γωνία ευθειών', p._ang.toFixed(2) + '°'], ['Απόσταση από 2 / από 3', p._d2.toFixed(3) + ' / ' + p._d3.toFixed(3) + ' m']].concat(p._dz != null ? [['Διαφορά Z των δύο ευθειών', p._dz.toFixed(3) + ' m']] : []) : [];
        const warn = p._warn && p._warn.length ? `<br>⚠ ${p._warn.map(esc).join('<br>⚠ ')}` : '';
        box.innerHTML = `<div class="result ${warn ? 'warn' : 'ok'}">${kvHtml([['X', F(p.E)], ['Y', F(p.N)], ['Z', F(p.Z)]].concat(extra))}${warn}</div>`;
      };
      show();
      if (sel.survey) bindSurvey(b, sel, () => calc() || (A.toast('Συμπλήρωσε τα στοιχεία', 'bad'), null));
      else bindResult(b, () => calc() || (A.toast('Συμπλήρωσε τα στοιχεία', 'bad'), null), 'ΔΥΣΠΡ');
    });
    open();
  };
  // Δυσπρόσιτο από την αποτύπωση: το αποτέλεσμα γίνεται κανονικό σημείο αποτύπωσης (επόμενος αριθμός, κωδικός, γραμμή)
  function surveyActions() {
    return `<div class="row"><label class="fld grow"><span>Σημείο</span><input id="res-name" value="${esc($('sv-name').value || '1')}"></label><label class="fld grow"><span>Κωδικός</span><input id="res-code" list="code-list" value="${esc($('sv-code').value || '')}"></label></div>
      <label class="chk"><input type="checkbox" id="res-keep" ${A.settings.hiddenKeep !== false ? 'checked' : ''}> Κράτα και τα βοηθητικά σημεία στη λίστα</label>
      <button class="btn primary big" id="res-sv">💾 Αποθήκευση στην αποτύπωση</button>`;
  }
  function bindSurvey(b, sel, getP) {
    b.querySelector('#res-sv').onclick = () => {
      const p = getP(); if (!p) return;
      const keep = b.querySelector('#res-keep').checked; A.settings.hiddenKeep = keep; A.saveSettings();
      let name = b.querySelector('#res-name').value.trim() || '1'; while (A.findPoint(name)) name = A.nextName(name);
      $('sv-name').value = name; $('sv-code').value = b.querySelector('#res-code').value.trim();
      const helpers = ['a', 'b', 'c', 'd'].map(k => sel[k]).filter(x => x && x.code === 'ΤΟΜΗ');
      let ll = { lat: null, lon: null }; try { ll = HGEO.toLL(p.E, p.N); } catch (e) { }
      const pt = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, code: $('sv-code').value, type: 'survey', E: p.E, N: p.N, Z: p.Z != null ? p.Z : null, lat: ll.lat, lon: ll.lon,
        fix: 'CALC', hrms: null, vrms: null, time: Date.now(), epochs: 4, photos: [], crs: HGEO.crsName(), note: 'Δυσπρόσιτο — ' + ({ ll: 'τομή ευθειών (2 πριν + 2 μετά)', polar: 'απόσταση + αζιμούθιο', dd: 'τομή αποστάσεων', line: 'προέκταση ευθείας' }[sel.m] || '') + (p._ang ? ' · γωνία ' + p._ang.toFixed(1) + '°' : ''),
        hidden: { m: sel.m, from: ['a', 'b', 'c', 'd'].map(k => sel[k] && sel[k].name).filter(Boolean) } };
      if (!keep && helpers.length) { const ids = new Set(helpers.map(h => h.id)); A.proj.points = A.proj.points.filter(x => !ids.has(x.id)); }
      A.closeSheet();
      A.storeSurvey(pt, null, { force: true });
    };
  }
  A.hiddenFromSurvey = () => tools.hidden({ survey: true, m: 'll' });

  tools.intersect = function (sel) { sel.m = 'll'; tools.hidden(sel); };

  // Επιφάνεια / κλίση δαπέδου
  tools.floor = function (sel) {
    sel.m = sel.m || 'slope';
    const open = () => A.sheet('Κλίση δαπέδου / επιφάνεια', `<div class="seg" id="fm"><button data-v="slope" class="${sel.m === 'slope' ? 'on' : ''}">Σημείο + κλίσεις</button><button data-v="3pt" class="${sel.m === '3pt' ? 'on' : ''}">Από 3 σημεία</button><button data-v="flat" class="${sel.m === 'flat' ? 'on' : ''}">Οριζόντιο</button></div><div id="fb"></div><div id="r"></div>
      <button class="btn primary" id="go">◎ Χάραξη επιφάνειας (ζωντανό ΔZ)</button>`, b => {
      b.querySelectorAll('#fm button').forEach(x => x.onclick = () => { sel.m = x.dataset.v; open(); });
      const fb = b.querySelector('#fb'); let make = () => null;
      if (sel.m === 'slope') {
        fb.innerHTML = `${pp('a', 'Σημείο αναφοράς (με Z)')}
          <div class="row"><label class="fld grow"><span>Υψόμετρο αναφοράς (κενό = του σημείου)</span><input id="z0" type="number" step="0.001" inputmode="decimal" value="${sel.z0 || ''}"></label></div>
          <div class="row"><label class="fld grow"><span>Κύρια κλίση (%)</span><input id="s1" type="number" step="0.01" inputmode="decimal" value="${sel.s1 != null ? sel.s1 : 1.5}"></label><label class="fld grow"><span>Προς αζιμούθιο (°)</span><input id="az" type="number" step="0.1" inputmode="decimal" value="${sel.az || 0}"></label><button class="btn" id="azp" title="Αζιμούθιο προς σημείο">→⌖</button></div>
          <div class="row"><label class="fld grow"><span>Εγκάρσια κλίση (%, +δεξιά)</span><input id="s2" type="number" step="0.01" inputmode="decimal" value="${sel.s2 || 0}"></label></div>
          <p class="muted">Θετική κλίση = ανηφορίζει προς το αζιμούθιο. Για ρύση νερών προς το φρεάτιο δώσε αρνητική κλίση προς αυτό.</p>`;
        const keep = () => ['z0', 's1', 'az', 's2'].forEach(k => sel[k] = fb.querySelector('#' + k).value);
        bindPP(b, sel, open, () => { keep(); open(); });
        fb.querySelector('#azp').onclick = () => { keep(); if (!sel.a) return A.toast('Όρισε πρώτα το σημείο αναφοράς', 'bad'); A.pickPointSheet('Κατεύθυνση προς σημείο', p => { sel.az = HGEO.azimuth(sel.a, p).toFixed(2); open(); }); };
        make = () => {
          if (!sel.a) return null; const z0 = num(fb.querySelector('#z0').value); const ref = { E: sel.a.E, N: sel.a.N, Z: z0 != null ? z0 : sel.a.Z };
          if (ref.Z == null) return null;
          const s1 = num(fb.querySelector('#s1').value) || 0, az = num(fb.querySelector('#az').value) || 0, s2 = num(fb.querySelector('#s2').value) || 0;
          const fn = HCOGO.planeFromSlope(ref, az, s1, s2); return { fn, name: `${sel.a.name} Z${ref.Z.toFixed(3)} · ${s1}% @${az}°${s2 ? ' · ' + s2 + '% εγκ.' : ''}` };
        };
        ['z0', 's1', 'az', 's2'].forEach(k => fb.querySelector('#' + k).oninput = () => show());
      } else if (sel.m === '3pt') {
        fb.innerHTML = pp('a', 'Σημείο 1 (με Z)') + pp('b', 'Σημείο 2 (με Z)') + pp('c', 'Σημείο 3 (με Z)');
        bindPP(b, sel, open, open);
        make = () => { if (!sel.a || !sel.b || !sel.c || [sel.a, sel.b, sel.c].some(p => p.Z == null)) return null; const fn = HCOGO.planeFrom3(sel.a, sel.b, sel.c); return fn ? { fn, name: `Επίπεδο ${sel.a.name}-${sel.b.name}-${sel.c.name}`, info: `Μέγ. κλίση ${fn.maxSlopePct.toFixed(3)} % ανηφορικά προς ${fn.maxSlopeAz.toFixed(1)}°` } : null; };
      } else {
        fb.innerHTML = `<label class="fld"><span>Στάθμη δαπέδου Z (m)</span><input id="zf" type="number" step="0.001" inputmode="decimal" value="${sel.zf || ''}"></label>`;
        make = () => { const z = num(fb.querySelector('#zf').value); if (z == null) return null; sel.zf = z; return { fn: () => z, name: 'Οριζόντιο Z ' + z.toFixed(3) }; };
        fb.querySelector('#zf').oninput = () => show();
      }
      const show = () => {
        const s = make(); const box = b.querySelector('#r');
        if (!s) { box.innerHTML = ''; return; }
        const here = A.pos && A.pos.Z != null ? s.fn(A.pos.E, A.pos.N) : null;
        box.innerHTML = `<div class="result">${esc(s.name)}${s.info ? '<br>' + esc(s.info) : ''}${here != null ? `<br>Εδώ: σχεδ. Z ${here.toFixed(3)} · ΔZ ${(here - A.pos.Z).toFixed(3)}` : ''}</div>`;
      };
      show();
      b.querySelector('#go').onclick = () => { const s = make(); if (!s) return A.toast('Συμπλήρωσε τα στοιχεία (σημεία με Z)', 'bad'); A.stake.surface = s; A.closeSheet(); A.setTab('stake'); A.setStakeMode('surface'); };
    });
    open();
  };

  // Γωνίασμα κατασκευής
  tools.square = function (sel) {
    const open = () => A.sheet('Γωνίασμα κατασκευής', `<p class="muted">Βασική γραμμή Α→Β (π.χ. όψη κτιρίου / άξονας). Η χάραξη δίνει χιλιομέτρηση από το Α και κάθετη απόσταση (+δεξιά). Ελέγχει και την ορθή γωνία με τρίτο σημείο.</p>
      ${pp('a', 'Αρχή Α')}${pp('b', 'Κατεύθυνση Β')}${pp('c', 'Έλεγχος γωνίας: σημείο Γ (προαιρετικό)')}<div id="r"></div>
      <div class="row"><button class="btn grow" id="mk">Γωνίες ορθογωνίου…</button><button class="btn primary grow" id="go">◎ Χάραξη από βασική</button></div>`, b => {
      bindPP(b, sel, open, open);
      if (sel.a && sel.b) {
        const L = Math.hypot(sel.b.E - sel.a.E, sel.b.N - sel.a.N);
        const rows = [['Μήκος Α→Β', L.toFixed(3) + ' m'], ['Αζιμούθιο', HGEO.fmtAz(HGEO.azimuth(sel.a, sel.b))]];
        if (sel.c) {
          const ang = HCOGO.angleAt(sel.b, sel.a, sel.c), so = HCOGO.baselineSO(sel.a, sel.b, sel.c);
          const dev = ang - 90, lin = Math.hypot(sel.c.E - sel.b.E, sel.c.N - sel.b.N) * Math.tan(dev * Math.PI / 180);
          rows.push(['Γωνία Α-Β-Γ', ang.toFixed(4) + '°'], ['Απόκλιση από 90°', (dev * 3600).toFixed(0) + '″  (' + (lin * 1000).toFixed(1) + ' mm στο Γ)'], ['Γ: Χ.Θ. / offset', so.station.toFixed(3) + ' / ' + so.offset.toFixed(3)]);
        }
        b.querySelector('#r').innerHTML = `<div class="result">${kvHtml(rows)}</div>`;
      }
      b.querySelector('#go').onclick = () => { if (!need(sel, ['a', 'b'])) return; A.stake.baseline = { a: sel.a, b: sel.b }; A.closeSheet(); A.setTab('stake'); A.setStakeMode('base'); $('so-st').value = ''; A.toast('Γράψε Χ.Θ. και offset για στόχο — κενό = ζωντανή θέση'); };
      b.querySelector('#mk').onclick = () => {
        if (!need(sel, ['a', 'b'])) return;
        A.sheet('Γωνίες ορθογωνίου από βασική', `<div class="row"><label class="fld grow"><span>Μήκος κατά Α→Β (m)</span><input id="w" type="number" step="0.001" inputmode="decimal"></label><label class="fld grow"><span>Πλάτος (+δεξιά, m)</span><input id="h" type="number" step="0.001" inputmode="decimal"></label></div>
          <label class="fld"><span>Πρόθεμα</span><input id="px" value="Γ"></label><button class="btn primary" id="ok">Δημιουργία 4 γωνιών + διαγώνιοι</button><div id="r2"></div>`, bb => {
          bb.querySelector('#ok').onclick = () => {
            const w = num(bb.querySelector('#w').value), h = num(bb.querySelector('#h').value); if (!w || !h) return A.toast('Δώσε διαστάσεις', 'bad');
            const px = bb.querySelector('#px').value || 'Γ';
            const C = [[0, 0], [w, 0], [w, h], [0, h]].map(([s, o], i) => { const p = HCOGO.baselinePoint(sel.a, sel.b, s, o); return { id: A.uid(), name: A.uniqueName(px + (i + 1)), code: 'ΓΩΝΙΑ', E: p.E, N: p.N, Z: sel.a.Z, type: 'stake', photos: [], time: Date.now() }; });
            C.forEach(p => A.proj.points.push(p)); A.saveProject(); A.renderPoints(); A.updateMapLayers();
            const dg = Math.hypot(w, h);
            bb.querySelector('#r2').innerHTML = `<div class="result ok">✓ ${C.map(c => c.name).join(', ')}<br>Διαγώνιοι (έλεγχος ορθογωνίου): ${dg.toFixed(3)} m και οι δύο</div>`;
          };
        });
      };
    });
    open();
  };

  tools.area = function () {
    const chosen = [];
    const open = () => A.sheet('Εμβαδόν / περίμετρος', `<p class="muted">Πρόσθεσε σημεία με τη σειρά του πολυγώνου.</p><div class="list">${chosen.map((p, i) => `<div class="li"><span class="nm">${i + 1}. ${esc(p.name)}</span><span class="xy">${F(p.E)} / ${F(p.N)}</span></div>`).join('')}</div>
      <div class="row"><button class="btn grow" id="add">＋ Σημείο</button><button class="btn" id="clr">Καθαρισμός</button></div><div id="r"></div>`, b => {
      b.querySelector('#add').onclick = () => A.pickPointSheet('Κορυφή ' + (chosen.length + 1), p => { chosen.push(p); open(); });
      b.querySelector('#clr').onclick = () => { chosen.length = 0; open(); };
      if (chosen.length > 2) { const r = HCOGO.area(chosen); b.querySelector('#r').innerHTML = `<div class="result">${kvHtml([['Εμβαδόν', r.area.toFixed(2) + ' m²'], ['', (r.area / 1000).toFixed(4) + ' στρ.'], ['Περίμετρος', r.perimeter.toFixed(3) + ' m']])}</div>`; }
    });
    open();
  };

  // Τοπική προσαρμογή (calibration) σε γνωστά σημεία
  tools.calib = function () {
    const P = A.proj; P.calibPairs = P.calibPairs || [];
    const open = () => {
      const sol = P.calibPairs.length ? HGEO.solveCalib(P.calibPairs.map(x => ({ name: x.name, raw: x.raw, known: x.known })), !!P.calibScale) : null;
      A.sheet('Τοπική προσαρμογή (calibration)', `<p class="muted">Μέτρησε γνωστά σημεία του τοπικού δικτύου (τριγωνομετρικά, πασσάλους) και δώσε τις γνωστές συντεταγμένες. Υπολογίζεται μετασχηματισμός 4 παραμέτρων (μετάθεση, στροφή, κλίμακα) + μετάθεση υψομέτρου, που εφαρμόζεται σε όλες τις νέες μετρήσεις.</p>
        <div class="list">${P.calibPairs.map((x, i) => { const r = sol && sol.residuals[i]; return `<div class="li"><span class="nm">${esc(x.name)}</span><span class="xy">υπόλ. ${r ? F(Math.hypot(r.dE, r.dN)) + ' / ' + F(r.dZ) : '—'}</span><button class="btn" data-del="${i}">✕</button></div>`; }).join('') || '<p class="muted">Κανένα ζεύγος.</p>'}</div>
        <button class="btn" id="add">＋ Ζεύγος: μέτρηση + γνωστές συντεταγμένες</button>
        <label class="chk"><input type="checkbox" id="sc" ${P.calibScale ? 'checked' : ''}> Να υπολογίζεται και κλίμακα (≥3 σημεία)</label>
        ${sol ? `<div class="result">${kvHtml([['Σημεία', sol.n], ['Στροφή', (sol.rot * 3600).toFixed(1) + '″'], ['Κλίμακα', sol.scale.toFixed(7)], ['Μετάθεση Z', F(sol.dz)], ['Τρέχουσα κατάσταση', P.calib ? 'ΕΝΕΡΓΗ' : 'ανενεργή']])}</div>` : ''}
        <div class="row"><button class="btn grow" id="off">Απενεργοποίηση</button><button class="btn primary grow" id="on" ${sol ? '' : 'disabled'}>Εφαρμογή</button></div>`, b => {
        b.querySelectorAll('[data-del]').forEach(x => x.onclick = () => { P.calibPairs.splice(+x.dataset.del, 1); A.saveProject(); open(); });
        b.querySelector('#sc').onchange = e => { P.calibScale = e.target.checked; A.saveProject(); open(); };
        b.querySelector('#off').onclick = () => { P.calib = null; A.saveProject(); A.applySettings(); A.toast('Προσαρμογή ανενεργή'); open(); };
        b.querySelector('#on').onclick = () => { P.calib = { a: sol.a, b: sol.b, tx: sol.tx, ty: sol.ty, dz: sol.dz }; A.saveProject(); A.applySettings(); A.toast('✓ Η προσαρμογή εφαρμόζεται στις νέες μετρήσεις', 'ok'); open(); };
        b.querySelector('#add').onclick = () => {
          const known = {};
          A.sheet('Νέο ζεύγος', `<p>1. Βάλε τη ράβδο στο γνωστό σημείο και πάτα μέτρηση (μετριέται χωρίς προσαρμογή).</p><button class="btn primary" id="m">● Μέτρηση</button><div id="mr"></div>
            <p>2. Γνωστές συντεταγμένες (ή επίλεξε υπάρχον σημείο «Γνωστό»):</p><button class="btn" id="kp">☰ Από σημεία</button>
            <label class="fld"><span>Όνομα</span><input id="kn"></label><div class="row"><label class="fld grow"><span>X</span><input id="ke" type="number" step="0.001" inputmode="decimal"></label><label class="fld grow"><span>Y</span><input id="ky" type="number" step="0.001" inputmode="decimal"></label><label class="fld grow"><span>Z</span><input id="kz" type="number" step="0.001" inputmode="decimal"></label></div>
            <button class="btn primary" id="sv">Προσθήκη ζεύγους</button>`, bb => {
            bb.querySelector('#m').onclick = async () => {
              const keep = HGEO.getCalib(); HGEO.setCalib(null);
              try { const r = await A.measure({ raw: true, btn: bb.querySelector('#m') }); if (r) { known.raw = { E: r.pt.E, N: r.pt.N, Z: r.pt.Z }; bb.querySelector('#mr').innerHTML = `<div class="result ok">X ${F(r.pt.E)} Y ${F(r.pt.N)} Z ${F(r.pt.Z)} · σH ${F(r.pt.hrms)}</div>`; } }
              catch (e) { A.toast(e.message, 'bad'); } finally { HGEO.setCalib(keep); }
            };
            bb.querySelector('#kp').onclick = () => {
              const save = { raw: known.raw, html: bb.querySelector('#mr').innerHTML };
              A.pickPointSheet('Γνωστό σημείο', p => { tools.calib(); setTimeout(() => { $('sh-body').querySelector('#add').click(); const b3 = $('sh-body'); known.raw = save.raw; b3.querySelector('#mr').innerHTML = save.html; b3.querySelector('#kn').value = p.name; b3.querySelector('#ke').value = p.E.toFixed(3); b3.querySelector('#ky').value = p.N.toFixed(3); b3.querySelector('#kz').value = p.Z != null ? p.Z.toFixed(3) : ''; }, 50); }, { noCur: true });
            };
            bb.querySelector('#sv').onclick = () => {
              const E = num(bb.querySelector('#ke').value), N = num(bb.querySelector('#ky').value), Z = num(bb.querySelector('#kz').value);
              if (!known.raw || E == null || N == null) return A.toast('Χρειάζεται μέτρηση και γνωστά X, Y', 'bad');
              P.calibPairs.push({ name: bb.querySelector('#kn').value || ('Κ' + (P.calibPairs.length + 1)), raw: known.raw, known: { E, N, Z } });
              A.saveProject(); tools.calib();
            };
          });
        };
      });
    };
    open();
  };

  // ==================== Offset / laser από τη Survey ====================
  $('btn-hidden').onclick = () => A.hiddenFromSurvey();
  $('btn-offset').onclick = () => {
    const sel = {};
    if (A.pos) sel.a = { name: 'Τρέχουσα θέση', E: A.pos.E, N: A.pos.N, Z: A.pos.Z, _tmp: true };
    sel.m = 'polar'; tools.hidden(sel);
  };

  // ==================== Σύνδεση δέκτη ====================
  A.connectSheet = async function () {
    const G = A.settings.gnss;
    let devs = [];
    try { devs = await HCONN.listPaired(); } catch (e) { }
    const native = HCONN.hasNative();
    A.sheet('Σύνδεση δέκτη GNSS', `<div class="seg" id="ct">${[['bt', 'Bluetooth'], ['tcp', 'Wi-Fi / TCP'], ['phone', 'GPS κινητού'], ['sim', 'Προσομοιωτής']].map(([k, v]) => `<button data-v="${k}" class="${G.type === k ? 'on' : ''}">${v}</button>`).join('')}</div>
      <div id="cb"></div>
      <label class="fld"><span>Εντολή αρχικοποίησης προς τον δέκτη (προαιρετικό, π.χ. ενεργοποίηση GGA/GST 1 Hz)</span><input id="init" value="${esc(G.init || '')}" placeholder="π.χ. LOG GPGGA ONTIME 1"></label>
      <div class="row"><button class="btn grow" id="dis">Αποσύνδεση</button><button class="btn primary grow" id="con">Σύνδεση</button></div>
      <p class="muted">Υποστηρίζεται κάθε δέκτης που στέλνει NMEA 0183 (GGA απαραίτητο· GST για ακρίβειες σH/σV, GSA για PDOP). ${native ? '' : '<b>Bluetooth/TCP και NTRIP λειτουργούν στην εφαρμογή Android.</b>'}</p>
      <h4>Ροή δεδομένων</h4><div class="raw" id="raw"></div>`, b => {
      const cb = b.querySelector('#cb');
      const draw = () => {
        if (G.type === 'bt') cb.innerHTML = devs.length ? `<label class="fld"><span>Συζευγμένες συσκευές (κάνε πρώτα σύζευξη από τις ρυθμίσεις Bluetooth του Android)</span><select id="dev">${devs.map(d => `<option value="${esc(d.address)}" ${d.address === G.address ? 'selected' : ''}>${esc(d.name || d.address)} — ${esc(d.address)}</option>`).join('')}</select></label>` : `<p class="muted">${native ? 'Δεν βρέθηκαν συζευγμένες συσκευές. Κάνε σύζευξη του δέκτη από τις ρυθμίσεις Bluetooth του Android και ξανάνοιξε.' : 'Το Bluetooth διατίθεται στην εφαρμογή Android.'}</p>`;
        else if (G.type === 'tcp') cb.innerHTML = `<div class="row"><label class="fld grow"><span>IP / host δέκτη</span><input id="th" value="${esc(G.host || '192.168.1.1')}"></label><label class="fld" style="width:110px"><span>Port</span><input id="tp" type="number" value="${G.port || 9000}"></label></div>`;
        else if (G.type === 'phone') cb.innerHTML = `<p class="muted">Χρήση του GPS της συσκευής — ακρίβεια μέτρων, μόνο για προσανατολισμό/δοκιμή.</p>`;
        else cb.innerHTML = `<p class="muted">Προσομοιωμένος δέκτης RTK για εκπαίδευση/δοκιμή. Παρατεταμένο πάτημα στον χάρτη = «περπάτα εκεί».</p><button class="btn" id="simc">Τοποθέτηση στο κέντρο του χάρτη</button>`;
        const sc = cb.querySelector('#simc'); if (sc) sc.onclick = () => { HCONN.Sim.jumpTo({ E: A.map.view.cx, N: A.map.view.cy }); A.toast('Ο προσομοιωτής μετακινήθηκε'); };
      };
      draw();
      b.querySelectorAll('#ct button').forEach(x => x.onclick = () => { G.type = x.dataset.v; b.querySelectorAll('#ct button').forEach(y => y.classList.toggle('on', y === x)); draw(); });
      b.querySelector('#dis').onclick = async () => { await HCONN.disconnect('gnss'); A.toast('Αποσυνδέθηκε'); };
      b.querySelector('#con').onclick = async () => {
        G.init = b.querySelector('#init').value;
        const cfg = { type: G.type, channel: 'gnss' };
        if (G.type === 'bt') { const s = cb.querySelector('#dev'); if (!s) return A.toast('Δεν υπάρχει συσκευή', 'bad'); G.address = s.value; G.name = s.options[s.selectedIndex].text; cfg.address = G.address; }
        if (G.type === 'tcp') { G.host = cb.querySelector('#th').value; G.port = parseInt(cb.querySelector('#tp').value, 10); cfg.host = G.host; cfg.port = G.port; }
        if (G.type === 'sim') cfg.center = A.proj.points.length ? A.proj.points[A.proj.points.length - 1] : { E: A.map.view.cx, N: A.map.view.cy, Z: 10 };
        A.saveSettings();
        try {
          await HCONN.connect(cfg); A.toast('✓ Συνδέθηκε', 'ok');
          if (G.init && (G.type === 'bt' || G.type === 'tcp')) await HCONN.write('gnss', G.init.replace(/\\r\\n|$/g, '\r\n'));
          if (A.settings.ntrip.auto && A.settings.ntrip.host && HCONN.hasNative()) A.startNtrip();
        } catch (e) { A.toast(e.message || String(e), 'bad', 4000); }
      };
      const raw = b.querySelector('#raw');
      A._rawView = () => { if (document.body.contains(raw)) raw.textContent = A.raw.slice(-14).join('\n'); else A._rawView = null; };
      A._rawView();
    });
  };
  A.onConnStatus = d => {
    if (d.state === 'error') A.toast((d.channel === 'laser' ? 'Laser: ' : 'Δέκτης: ') + (d.message || 'σφάλμα'), 'bad', 4000);
    if (d.state === 'disconnected' && d.channel === 'gnss' && d.reason) A.toast('Ο δέκτης αποσυνδέθηκε', 'bad');
  };
  A.autoConnect = async function () {
    const G = A.settings.gnss;
    if (HCONN.hasNative() && G.type === 'bt' && G.address) { try { await HCONN.connect({ type: 'bt', address: G.address, channel: 'gnss' }); if (A.settings.ntrip.auto && A.settings.ntrip.host) A.startNtrip(); } catch (e) { } }
  };

  // ==================== NTRIP ====================
  A.startNtrip = async function () {
    const N = A.settings.ntrip;
    try { $('st-ntrip').className = 'st-ntrip wait'; await HCONN.ntripStart({ host: N.host, port: +N.port, mount: N.mount, user: N.user, pass: N.pass, gga: A.nmea.lastGGA || '' }); }
    catch (e) { $('st-ntrip').className = 'st-ntrip err'; A.toast('NTRIP: ' + (e.message || e), 'bad', 4000); }
  };
  A.onNtrip = d => {
    const el = $('st-ntrip');
    el.className = 'st-ntrip ' + ({ connected: 'on', data: 'on', connecting: 'wait', error: 'err', stopped: 'off' }[d.state] || 'off');
    if (d.bytes != null) el.title = 'NTRIP ' + (d.bytes / 1024).toFixed(1) + ' kB';
    A.ntripInfo = d;
    if (d.state === 'error') A.toast('NTRIP: ' + (d.message || 'σφάλμα'), 'bad', 4000);
    if (A._ntripView) A._ntripView();
  };
  A.ntripSheet = function () {
    const N = A.settings.ntrip;
    const prof = A.settings.ntripProfiles || [];
    A.sheet('NTRIP / Διορθώσεις RTK', `<p class="muted">Το κινητό συνδέεται στον caster (π.χ. δίκτυο μόνιμων σταθμών) και προωθεί τις διορθώσεις RTCM στον δέκτη μέσω Bluetooth. Στέλνει αυτόματα θέση GGA για VRS.</p>
      <label class="fld"><span>Δίκτυο μόνιμων σταθμών</span><select id="nw">${['HEPOS (Κτηματολόγιο)', 'URANUS', 'CivilPOS', 'HxGN SmartNet', 'JGC NET', 'Άλλο δίκτυο / δικός μου caster'].map(x => `<option ${x === (N.network || 'HEPOS (Κτηματολόγιο)') ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <p class="muted">Τα στοιχεία σύνδεσης (host, port, χρήστης, κωδικός) τα δίνει το δίκτυο με τη συνδρομή σου. Με «Λίστα» φέρνεις τα mountpoints. Σε όλα τα ελληνικά δίκτυα χρησιμοποίησε σύστημα «ΕΓΣΑ87 — επίσημο μοντέλο HEPOS».</p>
      ${prof.length ? `<label class="fld"><span>Αποθηκευμένα προφίλ</span><select id="pf"><option value="">—</option>${prof.map((p, i) => `<option value="${i}">${esc(p.label)}</option>`).join('')}</select></label>` : ''}
      <div class="row"><label class="fld grow"><span>Caster host</span><input id="h" value="${esc(N.host)}" placeholder="π.χ. caster.example.gr"></label><label class="fld" style="width:96px"><span>Port</span><input id="p" type="number" value="${N.port || 2101}"></label></div>
      <div class="row"><label class="fld grow"><span>Mountpoint</span><input id="m" value="${esc(N.mount)}" list="mlist"></label><button class="btn" id="tb">Λίστα</button></div><datalist id="mlist"></datalist>
      <div class="row"><label class="fld grow"><span>Χρήστης</span><input id="u" value="${esc(N.user)}" autocomplete="off"></label><label class="fld grow"><span>Κωδικός</span><input id="w" type="password" value="${esc(N.pass)}" autocomplete="off"></label></div>
      <label class="chk"><input type="checkbox" id="g" ${N.gga ? 'checked' : ''}> Αποστολή GGA (απαραίτητο για VRS / δίκτυα)</label>
      <label class="chk"><input type="checkbox" id="au" ${N.auto ? 'checked' : ''}> Αυτόματη έναρξη με τη σύνδεση του δέκτη</label>
      <div class="row"><button class="btn" id="sp">💾 Προφίλ</button><button class="btn grow" id="stop">Διακοπή</button><button class="btn primary grow" id="go">Έναρξη</button></div>
      <div id="ns" class="result"></div>`, b => {
      const v = id => b.querySelector(id).value;
      const keep = () => { Object.assign(N, { network: v('#nw'), host: v('#h').trim(), port: parseInt(v('#p'), 10) || 2101, mount: v('#m').trim(), user: v('#u'), pass: v('#w'), gga: b.querySelector('#g').checked, auto: b.querySelector('#au').checked }); A.saveSettings(); };
      const pf = b.querySelector('#pf'); if (pf) pf.onchange = () => { const p = prof[+pf.value]; if (p) { Object.assign(N, p.cfg); A.saveSettings(); A.ntripSheet(); } };
      b.querySelector('#sp').onclick = () => { keep(); const label = ((N.network || '').split(' (')[0] + ' · ' + N.mount); A.settings.ntripProfiles = prof.filter(p => p.label !== label).concat([{ label, cfg: Object.assign({}, N) }]); A.saveSettings(); A.toast('✓ Προφίλ αποθηκεύτηκε', 'ok'); };
      b.querySelector('#tb').onclick = async () => { keep(); try { const ms = await HCONN.ntripTable(N.host, N.port, N.user, N.pass); b.querySelector('#mlist').innerHTML = ms.map(m => `<option value="${esc(m.name)}">${esc(m.name)} ${esc(m.format || '')} ${esc(m.id || '')}</option>`).join(''); A.toast(ms.length + ' mountpoints'); b.querySelector('#m').focus(); } catch (e) { A.toast(e.message || String(e), 'bad'); } };
      b.querySelector('#go').onclick = () => { keep(); if (!N.host || !N.mount) return A.toast('Συμπλήρωσε host και mountpoint', 'bad'); A.startNtrip(); };
      b.querySelector('#stop').onclick = async () => { await HCONN.ntripStop(); $('st-ntrip').className = 'st-ntrip off'; };
      const ns = b.querySelector('#ns');
      A._ntripView = () => { if (!document.body.contains(ns)) { A._ntripView = null; return; } const d = A.ntripInfo; ns.innerHTML = d ? `Κατάσταση: <b>${esc(d.state)}</b>${d.bytes != null ? ' · ' + (d.bytes / 1024).toFixed(1) + ' kB' : ''}${d.message ? '<br>' + esc(d.message) : ''}` : (HCONN.hasNative() ? 'Ανενεργό' : 'Διαθέσιμο στην εφαρμογή Android'); };
      A._ntripView();
    });
  };


  // ==================== Base / Rover ====================
  A.baseSheet = async function () {
    const S = A.settings; S.rcv = S.rcv || { brand: 'singular', fam: 'unicore', port: 'COM2', baseAnt: 1.5, geoidN: '' };
    const R = S.rcv, P = A.proj; P.bases = P.bases || [];
    let devs = []; try { devs = await HCONN.listPaired(); } catch (e) { }
    const fam = () => HRCV.FAMILIES[R.fam] || HRCV.FAMILIES.nmea;
    const active = P.bases.find(b => b.id === P.activeBase);
    A.sheet('Base / Rover', `<label class="fld"><span>Κατασκευαστής δέκτη</span><select id="br">${HRCV.BRANDS.map(b => `<option value="${b.id}" ${b.id === R.brand ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>
      <label class="fld"><span>Οικογένεια εντολών (άλλαξέ την αν η πλακέτα του μοντέλου σου διαφέρει)</span><select id="fm">${Object.entries(HRCV.FAMILIES).map(([k, v]) => `<option value="${k}" ${k === R.fam ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>
      ${fam().note ? `<p class="muted">${esc(fam().note)}</p>` : ''}
      <h4>Ενεργή βάση έργου</h4>
      <div class="result">${active ? `<b>${esc(active.name)}</b> · X ${F(active.E)} Y ${F(active.N)} Z ${F(active.Z)}${active.shift ? '<br>Μετατεθειμένη κατά ΔX ' + F(active.shift.dE) + ' ΔY ' + F(active.shift.dN) + ' ΔZ ' + F(active.shift.dZ) : ''}` : 'Καμία (NTRIP / δίκτυο)'}</div>
      <div class="row"><button class="btn grow" id="nb">＋ Νέα βάση / αλλαγή βάσης</button><button class="btn grow" id="nt">Χωρίς βάση (NTRIP)</button></div>
      ${P.bases.length ? `<div class="list">${P.bases.map(b => `<div class="li" data-b="${b.id}"><span class="nm">${esc(b.name)}${b.id === P.activeBase ? ' ●' : ''}</span><span class="cd">${P.points.filter(p => p.baseSession === b.id).length} σημεία</span><span class="xy">${new Date(b.time).toLocaleString('el-GR')}</span></div>`).join('')}</div>` : ''}
      ${fam().baseFixed.length ? `<h4>Ρύθμιση δέκτη βάσης</h4>
      ${devs.length ? `<label class="fld"><span>Δέκτης βάσης (Bluetooth)</span><select id="bd">${devs.map(d => `<option value="${esc(d.address)}" ${d.address === R.baseAddr ? 'selected' : ''}>${esc(d.name || d.address)}</option>`).join('')}</select></label><button class="btn" id="bc">Σύνδεση στη βάση</button>` : '<p class="muted">Σύνδεση στη βάση: διαθέσιμη στην εφαρμογή Android με συζευγμένο δέκτη.</p>'}
      <h4>Ρύθμιση rover</h4><button class="btn" id="rv">Εντολές rover (NMEA + λειτουργία rover)</button>` : ''}`, b => {
      b.querySelector('#br').onchange = e => { R.brand = e.target.value; R.fam = (HRCV.BRANDS.find(x => x.id === R.brand) || {}).fam || 'nmea'; A.saveSettings(); A.baseSheet(); };
      b.querySelector('#fm').onchange = e => { R.fam = e.target.value; A.saveSettings(); A.baseSheet(); };
      b.querySelector('#nb').onclick = () => A.newBaseSheet();
      b.querySelector('#nt').onclick = () => { P.activeBase = null; A.saveProject(); A.baseSheet(); };
      b.querySelectorAll('[data-b]').forEach(el => el.onclick = () => A.baseDetail(P.bases.find(x => x.id === el.dataset.b)));
      const bc = b.querySelector('#bc'); if (bc) bc.onclick = async () => { R.baseAddr = b.querySelector('#bd').value; A.saveSettings(); try { await HCONN.connect({ type: 'bt', address: R.baseAddr, channel: 'base' }); A.toast('✓ Συνδέθηκε η βάση', 'ok'); } catch (e) { A.toast(e.message || String(e), 'bad'); } };
      const rv = b.querySelector('#rv'); if (rv) rv.onclick = () => A.cmdSheet('Εντολές rover', HRCV.fill(fam().rover, {}), 'gnss');
    });
  };
  A.cmdSheet = function (title, lines, channel, after) {
    A.sheet(title, `<p class="muted">Έλεγξε / διόρθωσε πριν την αποστολή (μία εντολή ανά γραμμή). Κανάλι: ${channel === 'base' ? 'δέκτης βάσης' : 'δέκτης rover'}.</p>
      <textarea id="cm" rows="10" style="font-family:ui-monospace,monospace;font-size:13px">${esc(lines.join('\n'))}</textarea>
      <div class="row"><button class="btn grow" id="cp">Αντιγραφή</button><button class="btn primary grow" id="sd">Αποστολή</button></div><div class="raw" id="rr"></div>`, b => {
      b.querySelector('#cp').onclick = () => { try { navigator.clipboard.writeText(b.querySelector('#cm').value); A.toast('Αντιγράφηκε'); } catch (e) { } };
      b.querySelector('#sd').onclick = async () => {
        if (!HCONN.hasNative()) return A.toast('Η αποστολή εντολών γίνεται από την εφαρμογή Android', 'bad');
        const ls = b.querySelector('#cm').value.split('\n').map(x => x.trim()).filter(Boolean);
        try { for (const l of ls) { await HCONN.write(channel, l + '\r\n'); await new Promise(r => setTimeout(r, 250)); } A.toast('✓ Στάλθηκαν ' + ls.length + ' εντολές', 'ok'); if (after) after(); }
        catch (e) { A.toast(e.message || String(e), 'bad'); }
      };
      const rr = b.querySelector('#rr');
      A._baseView = () => { if (!document.body.contains(rr)) { A._baseView = null; return; } rr.textContent = (channel === 'base' ? A.baseRaw : A.raw).slice(-10).join('\n'); };
      A._baseView();
    });
  };
  A.newBaseSheet = function (sel) {
    sel = sel || { mode: 'known' };
    const R = A.settings.rcv, P = A.proj, fam = HRCV.FAMILIES[R.fam] || HRCV.FAMILIES.nmea;
    const open = () => A.sheet('Νέα βάση', `<div class="seg" id="bm"><button data-v="known" class="${sel.mode === 'known' ? 'on' : ''}">Σε γνωστό σημείο</button><button data-v="here" class="${sel.mode === 'here' ? 'on' : ''}">Αυτόνομη θέση «εδώ»</button></div>
      ${sel.mode === 'known' ? pp('k', 'Γνωστό σημείο (X, Y, Z στο σύστημα του έργου)') : '<p class="muted">Η βάση στήνεται σε αυτόνομη θέση (μέσος όρος δέκτη). Όταν μάθεις τις σωστές συντεταγμένες, άνοιξε τη βάση και πάτα «Μετάθεση» — διορθώνονται όλα τα σημεία της.</p>'}
      <div class="row"><label class="fld grow"><span>Όνομα βάσης</span><input id="nm" value="${esc(sel.name || ('B' + (P.bases.length + 1)))}"></label><label class="fld grow"><span>Ύψος κεραίας βάσης (m)</span><input id="ah" type="number" step="0.001" inputmode="decimal" value="${R.baseAnt}"></label></div>
      ${fam.baseFixed.length ? `<div class="row"><label class="fld grow"><span>Θύρα εξόδου RTCM (ράδιο)</span><select id="pt">${fam.ports.map(p => `<option ${p === R.port ? 'selected' : ''}>${p}</option>`).join('')}</select></label><label class="fld grow"><span>Αποχή γεωειδούς N (m, για h)</span><input id="gn" type="number" step="0.001" inputmode="decimal" value="${esc(R.geoidN !== '' ? R.geoidN : (A.nmea.geoidSep != null ? A.nmea.geoidSep.toFixed(3) : ''))}"></label></div>` : ''}
      <div class="row"><button class="btn grow" id="sv">Ορισμός ως ενεργή βάση</button>${fam.baseFixed.length ? '<button class="btn primary grow" id="cmd">Εντολές προς τη βάση…</button>' : ''}</div>`, b => {
      const keep = () => { sel.name = b.querySelector('#nm').value; R.baseAnt = num(b.querySelector('#ah').value) || 0; const pt = b.querySelector('#pt'); if (pt) R.port = pt.value; const gn = b.querySelector('#gn'); if (gn) R.geoidN = gn.value; A.saveSettings(); };
      b.querySelectorAll('#bm button').forEach(x => x.onclick = () => { keep(); sel.mode = x.dataset.v; open(); });
      if (sel.mode === 'known') bindPP(b, sel, open, () => { keep(); open(); });
      const make = () => {
        keep();
        const base = { id: A.uid(), name: sel.name || 'B', time: Date.now(), antH: R.baseAnt, mode: sel.mode };
        if (sel.mode === 'known') { if (!sel.k) { A.toast('Επίλεξε γνωστό σημείο', 'bad'); return null; } Object.assign(base, { E: sel.k.E, N: sel.k.N, Z: sel.k.Z, point: sel.k.name }); }
        return base;
      };
      b.querySelector('#sv').onclick = () => { const base = make(); if (!base) return; P.bases.push(base); P.activeBase = base.id; A.saveProject(); A.toast('✓ Ενεργή βάση: ' + base.name + ' — τα νέα σημεία συνδέονται με αυτήν', 'ok', 3500); A.baseSheet(); };
      const cmd = b.querySelector('#cmd'); if (cmd) cmd.onclick = () => {
        const base = make(); if (!base) return;
        let lines;
        if (sel.mode === 'known') {
          const ll = HGEO.toLL(base.E, base.N); const N = num(R.geoidN) || 0;
          const hmsl = (base.Z || 0) + base.antH; const h = hmsl + N;
          lines = HRCV.fill(fam.baseFixed, { lat: ll.lat.toFixed(9), lon: ll.lon.toFixed(9), h: h.toFixed(4), hmsl: hmsl.toFixed(4), port: R.port });
        } else lines = HRCV.fill(fam.baseHere, { port: R.port });
        A.cmdSheet('Εντολές βάσης · ' + base.name, lines, 'base', () => { P.bases.push(base); P.activeBase = base.id; A.saveProject(); });
      };
    });
    open();
  };
  A.baseDetail = function (base) {
    const P = A.proj, pts = P.points.filter(p => p.baseSession === base.id);
    const sel = {};
    const open = () => A.sheet('Βάση ' + base.name, `<div class="kv"><span>Θέση</span><span>${base.E != null ? F(base.E) + ' / ' + F(base.N) + ' / ' + F(base.Z) : 'αυτόνομη (μη γνωστή)'}</span><span>Ύψος κεραίας</span><span>${F(base.antH)}</span><span>Σημεία</span><span>${pts.length}</span>${base.shift ? `<span>Μετάθεση</span><span>${F(base.shift.dE)} / ${F(base.shift.dN)} / ${F(base.shift.dZ)}</span>` : ''}</div>
      <h4>Μετάθεση βάσης</h4><p class="muted">Δώσε τη θέση που χρησιμοποίησε η βάση (όπως μετρήθηκε / αυτόνομη) και τη σωστή θέση. Όλα τα σημεία που μετρήθηκαν από αυτή τη βάση μετατίθενται κατά τη διαφορά.</p>
      ${pp('was', 'Θέση που χρησιμοποιήθηκε (π.χ. μετρημένο σημείο βάσης)')}${pp('true', 'Σωστή θέση (γνωστό σημείο)')}
      <div class="row"><button class="btn grow" id="act">Ορισμός ως ενεργή</button><button class="btn primary grow" id="sh">Εφαρμογή μετάθεσης</button></div>`, b => {
      bindPP(b, sel, open, open);
      b.querySelector('#act').onclick = () => { P.activeBase = base.id; A.saveProject(); A.baseSheet(); };
      b.querySelector('#sh').onclick = () => {
        if (!need(sel, ['was', 'true'])) return;
        const dE = sel.true.E - sel.was.E, dN = sel.true.N - sel.was.N, dZ = (sel.true.Z != null && sel.was.Z != null) ? sel.true.Z - sel.was.Z : 0;
        A.confirm('Μετάθεση βάσης', `ΔX ${dE.toFixed(3)} · ΔY ${dN.toFixed(3)} · ΔZ ${dZ.toFixed(3)} σε <b>${pts.length}</b> σημεία της βάσης ${esc(base.name)};`, 'Εφαρμογή', () => {
          pts.forEach(p => { p.E += dE; p.N += dN; if (p.Z != null) p.Z += dZ; try { const ll = HGEO.toLL(p.E, p.N); p.lat = ll.lat; p.lon = ll.lon; } catch (e) { } p.note = ((p.note || '') + ` [μετάθεση βάσης ${dE.toFixed(3)}/${dN.toFixed(3)}/${dZ.toFixed(3)}]`).trim(); });
          base.shift = { dE: (base.shift ? base.shift.dE : 0) + dE, dN: (base.shift ? base.shift.dN : 0) + dN, dZ: (base.shift ? base.shift.dZ : 0) + dZ };
          if (base.E != null) { base.E += dE; base.N += dN; if (base.Z != null) base.Z += dZ; }
          A.saveProject(); A.renderPoints(); A.updateMapLayers(); A.toast('✓ Μετατέθηκαν ' + pts.length + ' σημεία', 'ok');
        });
      };
    });
    open();
  };

  // ==================== Laser ====================
  A.laserSheet = async function () {
    const L = A.settings.laser; let devs = [];
    try { devs = await HCONN.listPaired(); } catch (e) { }
    A.sheet('Laser αποστασιόμετρο', `<p class="muted">Bluetooth laser που στέλνει μετρήσεις σειριακά (π.χ. πρότυπο $PLTIT με HD, αζιμούθιο, κλίση, ή απλή απόσταση). Χρησιμοποιείται στα «Δυσπρόσιτα σημεία» και στο Offset.</p>
      ${devs.length ? `<label class="fld"><span>Συσκευή</span><select id="dev">${devs.map(d => `<option value="${esc(d.address)}" ${d.address === L.address ? 'selected' : ''}>${esc(d.name || d.address)}</option>`).join('')}</select></label>` : '<p class="muted">Δεν βρέθηκαν συζευγμένες συσκευές (ή δεν τρέχει η εφαρμογή Android).</p>'}
      <div class="row"><button class="btn grow" id="d">Αποσύνδεση</button><button class="btn primary grow" id="c">Σύνδεση</button></div>
      <div class="result" id="ll">${A.laserLast ? 'Τελευταία: HD ' + F(A.laserLast.hd) + ' · Az ' + (A.laserLast.az != null ? A.laserLast.az.toFixed(1) + '°' : '—') : 'Καμία μέτρηση'}</div>`, b => {
      b.querySelector('#c').onclick = async () => { const s = b.querySelector('#dev'); if (!s) return; L.address = s.value; A.saveSettings(); try { await HCONN.connect({ type: 'bt', address: L.address, channel: 'laser' }); A.toast('✓ Laser συνδέθηκε', 'ok'); } catch (e) { A.toast(e.message || String(e), 'bad'); } };
      b.querySelector('#d').onclick = () => HCONN.disconnect('laser');
    });
  };

  // ==================== GNSS κατάσταση / QC ====================
  A.gnssSheet = function () {
    A.sheet('Κατάσταση GNSS · Έλεγχος ποιότητας', `<div id="gv"></div>`, b => {
      const gv = b.querySelector('#gv');
      A._gnssView = () => {
        if (!document.body.contains(gv)) { A._gnssView = null; return; }
        const n = A.nmea, P = A.pos, L = A.qc.lim();
        const q = P ? A.liveQC : null;
        gv.innerHTML = `<div class="result ${q ? q.level : 'warn'}"><b>QC ${q ? A.levelText(q.level) : '—'}</b> · ${esc(L.name)}</div>
          ${q ? A.qcTable(q) : '<p class="muted">Χωρίς θέση.</p>'}
          ${P ? `<div class="kv"><span>φ / λ</span><span>${P.lat.toFixed(9)} / ${P.lon.toFixed(9)}</span><span>Υψόμ. δέκτη (MSL)</span><span>${F(P.msl)}</span><span>Ελλειψοειδές h</span><span>${F(P.ellH)}</span><span>HDOP</span><span>${n.hdop != null ? n.hdop.toFixed(2) : '—'}</span><span>Σταθμός βάσης</span><span>${esc(n.baseId || '—')}</span><span>Απώλειες FIX / άλματα</span><span>${A.qc.losses} / ${A.qc.jumps}</span></div>` : ''}
          <h4>Συμβάντα</h4><div class="raw">${A.qc.events.slice(0, 12).map(e => new Date(e.t).toLocaleTimeString('el-GR') + '  ' + esc(e.msg)).join('\n') || '—'}</div>
          <div class="row"><button class="btn grow" id="cn">📡 Σύνδεση</button><button class="btn grow" id="nt">🛰 NTRIP</button></div>`;
        gv.querySelector('#cn').onclick = () => A.connectSheet(); gv.querySelector('#nt').onclick = () => A.ntripSheet();
      };
      A._gnssView();
    });
  };

  // ==================== Έργα ====================
  A.projectSheet = async function () {
    const list = (await HIO.kvGet('projlist')) || [];
    A.sheet('Έργα', `<div class="row"><input id="nn" class="grow" placeholder="Όνομα νέου έργου"><button class="btn primary" id="nw">＋ Νέο</button></div>
      <div class="list">${list.map(p => `<div class="li" data-id="${p.id}"><span class="nm">${esc(p.name)}${p.id === A.proj.id ? ' ●' : ''}</span><span class="cd">${p.n || 0} σημεία</span><span class="xy">${new Date(p.updated).toLocaleDateString('el-GR')}</span></div>`).join('')}</div>
      <h4>Τρέχον έργο</h4><div class="row"><input id="rn" class="grow" value="${esc(A.proj.name)}"><button class="btn" id="rb">Μετονομασία</button></div>
      <button class="btn danger" id="dl">Διαγραφή τρέχοντος έργου</button>`, b => {
      b.querySelector('#nw').onclick = async () => { await A.createProject(b.querySelector('#nn').value.trim() || undefined); A.closeSheet(); A.toast('✓ Νέο έργο', 'ok'); };
      b.querySelectorAll('.li').forEach(el => el.onclick = async () => { await A.openProject(el.dataset.id); A.closeSheet(); });
      b.querySelector('#rb').onclick = () => { A.proj.name = b.querySelector('#rn').value.trim() || A.proj.name; A.saveProject(true); A.refreshAll(); A.toast('✓', 'ok'); };
      b.querySelector('#dl').onclick = () => A.confirm('Διαγραφή έργου', `Οριστική διαγραφή του <b>${esc(A.proj.name)}</b> με ${A.proj.points.length} σημεία και φωτογραφίες; Κάνε πρώτα Εξαγωγή αν χρειάζεσαι τα δεδομένα.`, 'Διαγραφή', async () => {
        A.proj.points.forEach(p => (p.photos || []).forEach(ph => HIO.photoDel(ph.id)));
        await HIO.kvDel('proj:' + A.proj.id); await HIO.kvDel('design:' + A.proj.id);
        const l = ((await HIO.kvGet('projlist')) || []).filter(p => p.id !== A.proj.id); await HIO.kvSet('projlist', l);
        if (l.length) await A.openProject(l[0].id); else await A.createProject();
      });
    });
  };

  // ==================== Εισαγωγή ====================
  A.importSheet = function () {
    A.sheet('Εισαγωγή', `<button class="btn" data-k="stake">Σημεία για χάραξη (TXT / CSV)</button>
      <button class="btn" data-k="control">Γνωστά σημεία / τριγωνομετρικά (TXT / CSV)</button>
      <button class="btn" data-k="cad">Σχέδιο υποβάθρου (DXF / DWG)</button>
      <label class="fld"><span>Σειρά στηλών TXT</span><select id="ord"><option value="PENZ">Όνομα, X(E), Y(N), Z, Κωδικός</option><option value="PNEZ">Όνομα, Y(N), X(E), Z, Κωδικός</option></select></label>
      <p class="muted">Διαχωριστικό: κόμμα, ερωτηματικό, tab ή κενά — αναγνωρίζεται αυτόματα. Οι συντεταγμένες πρέπει να είναι στο σύστημα του έργου (${esc(HGEO.crsName())}).</p>`, b => {
      b.querySelectorAll('[data-k]').forEach(x => x.onclick = () => {
        const k = x.dataset.k, ord = b.querySelector('#ord').value, inp = $('file-in');
        inp.accept = k === 'cad' ? '.dxf,.dwg' : '.txt,.csv,.xyz,.pnt,.asc,.gsi,text/plain';
        inp.value = ''; inp.onchange = () => { const f = inp.files[0]; if (f) importFile(f, k, ord); };
        inp.click();
      });
    });
  };
  async function importFile(f, kind, ord) {
    A.closeSheet();
    try {
      if (kind === 'cad') {
        A.toast('Ανάγνωση ' + f.name + '…', '', 8000);
        const isDwg = /\.dwg$/i.test(f.name);
        let model;
        if (isDwg) model = await HCAD.parseDWG(await f.arrayBuffer());
        else { const buf = await f.arrayBuffer(); let t = new TextDecoder('utf-8').decode(buf); if (/�/.test(t.slice(0, 200000))) t = new TextDecoder('windows-1253').decode(buf); model = HCAD.parseDXF(t); }
        if (!model.ents.length) throw new Error('Δεν βρέθηκαν οντότητες στο model space');
        A.design = { name: f.name, model, layerState: {} };
        Object.keys(model.layers).forEach(l => A.design.layerState[l] = { on: model.layers[l].on !== false });
        await HIO.kvSet('design:' + A.proj.id, A.design);
        A.map.layers.design = model; A.map.designLayers = A.design.layerState;
        A.map.extents(); A.toast(`✓ ${f.name}: ${model.ents.length} οντότητες, ${Object.keys(model.layers).length} layers`, 'ok', 3500);
        const bb = model.bbox; if (bb && /^EGSA87/.test(A.settings.crs) && (bb.x0 < 50000 || bb.x1 > 1000000 || bb.y0 < 3800000 || bb.y1 > 4700000)) A.toast('Προσοχή: το σχέδιο δεν φαίνεται να είναι σε ΕΓΣΑ87 (τοπικές συντεταγμένες;)', 'bad', 6000);
        return;
      }
      const buf = await f.arrayBuffer(); let t = new TextDecoder('utf-8').decode(buf); if (/�/.test(t)) t = new TextDecoder('windows-1253').decode(buf);
      const pts = HIO.parsePoints(t, ord);
      if (!pts.length) throw new Error('Δεν αναγνωρίστηκαν σημεία');
      let dup = 0;
      pts.forEach(p => { let name = p.name; if (A.findPoint(name)) { dup++; name = A.uniqueName(name); } A.proj.points.push({ id: A.uid(), name, code: p.code, E: p.E, N: p.N, Z: p.Z, type: kind, photos: [], time: Date.now(), src: f.name }); });
      A.saveProject(); A.renderPoints(); A.updateMapLayers(); A.map.extents();
      A.toast(`✓ ${pts.length} σημεία από ${f.name}${dup ? ` (${dup} μετονομάστηκαν)` : ''}`, 'ok', 3500);
      if (kind === 'stake') { A.setTab('stake'); A.setStakeMode('point'); A.setTarget(A.stakeList()[0] || null); }
    } catch (e) { A.toast('Σφάλμα εισαγωγής: ' + e.message, 'bad', 5000); console.error(e); }
  }

  // ==================== Εξαγωγή / Email ====================
  A.exportSheet = function () {
    const P = A.proj;
    const base = P.name.replace(/[^\p{L}\p{N}\- ]/gu, '_').replace(/\s+/g, '_');
    A.sheet('Εξαγωγή / Αποστολή', `<label class="fld"><span>Σημεία</span><select id="fl"><option value="all">Όλα (${P.points.length})</option><option value="survey">Μετρημένα</option><option value="staked">Χαραγμένα (με αποκλίσεις)</option><option value="calc">Υπολογισμένα</option><option value="stake">Προς χάραξη</option></select></label>
      <h4>Μορφές</h4>
      <label class="chk"><input type="checkbox" value="txt" checked> TXT (Όνομα,X,Y,Z,Κωδικός)</label>
      <label class="chk"><input type="checkbox" value="csv" checked> CSV πλήρες (ακρίβειες, QC, χάραξη, φωτο)</label>
      <label class="chk"><input type="checkbox" value="dxf" checked> DXF (σημεία, ονόματα, υψόμετρα, γραμμές)</label>
      <label class="chk"><input type="checkbox" value="kml"> KML (Google Earth)</label>
      <label class="chk"><input type="checkbox" value="geojson"> GeoJSON</label>
      <label class="chk"><input type="checkbox" value="photos" checked> Φωτογραφίες (μέσα σε ZIP)</label>
      <label class="chk"><input type="checkbox" id="zip" checked> Όλα σε ένα αρχείο ZIP</label>
      <div class="row"><button class="btn grow" id="sv">💾 Αποθήκευση</button><button class="btn grow" id="sh">↗ Κοινή χρήση</button><button class="btn primary grow" id="em">✉ Email</button></div>
      <p class="muted">Το «Email» ανοίγει την εφαρμογή αλληλογραφίας (π.χ. Gmail) με τα αρχεία συνημμένα.</p>`, b => {
      const build = async () => {
        const fl = b.querySelector('#fl').value;
        const pts = P.points.filter(p => fl === 'all' || p.type === fl);
        const fm = [...b.querySelectorAll('input[type=checkbox][value]')].filter(x => x.checked).map(x => x.value);
        const files = [];
        if (fm.includes('txt')) files.push({ name: base + '.txt', data: HIO.toTXT(pts) });
        if (fm.includes('csv')) files.push({ name: base + '.csv', data: HIO.toCSV(pts), mime: 'text/csv' });
        if (fm.includes('dxf')) files.push({ name: base + '.dxf', data: HCAD.writeDXF(pts, A.map.layers.lines.map(l => ({ pts: l.pts, layer: 'HP_' + (l.pts[0].code || 'LINES').replace(/[^\w]/g, '_').toUpperCase() })), { textHeight: A.settings.textH }), mime: 'application/dxf' });
        if (fm.includes('kml')) files.push({ name: base + '.kml', data: HIO.toKML(pts, P.name), mime: 'application/vnd.google-earth.kml+xml' });
        if (fm.includes('geojson')) files.push({ name: base + '.geojson', data: HIO.toGeoJSON(pts), mime: 'application/geo+json' });
        if (fm.includes('photos')) for (const p of pts) for (let i = 0; i < (p.photos || []).length; i++) { const bl = await HIO.photoGet(p.photos[i].id); if (bl) files.push({ name: 'photos/' + HIO.photoName(p, i), data: bl, mime: 'image/jpeg' }); }
        if (!files.length) throw new Error('Επίλεξε μορφή');
        const report = `HEXIS PAD — ${P.name}\nΣύστημα: ${HGEO.crsName()}${P.calib ? ' + τοπική προσαρμογή' : ''}\nΣημεία: ${pts.length}\nΚλάση QC: ${A.qc.lim().name}\nΗμ/νία: ${new Date().toLocaleString('el-GR')}\n`;
        if (b.querySelector('#zip').checked || files.some(f => f.name.startsWith('photos/'))) {
          files.push({ name: 'README.txt', data: report });
          return { files: [{ name: base + '.zip', data: await HIO.makeZip(files), mime: 'application/zip' }], report };
        }
        return { files, report };
      };
      const run = async mode => {
        try {
          A.toast('Προετοιμασία αρχείων…');
          const { files, report } = await build();
          if (mode === 'save') { const r = await HIO.saveToDevice(files); A.toast('✓ Αποθηκεύτηκε' + (HIO.isNative() ? ' στα Έγγραφα/HEXIS PAD' : ''), 'ok', 3500); }
          else await HIO.share(files, { subject: 'HEXIS PAD · ' + P.name, text: report, email: mode === 'email' });
        } catch (e) { A.toast(e.message || String(e), 'bad'); }
      };
      b.querySelector('#sv').onclick = () => run('save'); b.querySelector('#sh').onclick = () => run('share'); b.querySelector('#em').onclick = () => run('email');
    });
  };

  // ==================== Σύστημα συντεταγμένων ====================
  A.crsSheet = function () {
    const S = A.settings;
    A.sheet('Σύστημα συντεταγμένων', `<label class="fld"><span>Χώρα / σύστημα</span><select id="cs">${Object.entries(HGEO.CRS).map(([k, v]) => `<option value="${k}" ${k === S.crs ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}<option value="CUSTOM" ${S.crs === 'CUSTOM' ? 'selected' : ''}>Άλλο — δικός μου ορισμός proj4</option></select></label>
      <label class="fld" id="cw"><span>Ορισμός proj4 (π.χ. από epsg.io → PROJ.4)</span><textarea id="cd" rows="3" placeholder="+proj=tmerc +lat_0=0 +lon_0=... +towgs84=...">${esc(S.crsCustom || '')}</textarea></label>
      <label class="fld"><span>Υψόμετρα</span><select id="hm"><option value="msl" ${S.heightMode === 'msl' ? 'selected' : ''}>Ορθομετρικά από τον δέκτη (μοντέλο γεωειδούς του δέκτη / δικτύου)</option><option value="ell" ${S.heightMode === 'ell' ? 'selected' : ''}>Ελλειψοειδή (h)</option></select></label>
      <p class="muted">Ελλάδα: με HEPOS ή δίκτυο σε ETRS89 διάλεξε «ΕΓΣΑ87 — επίσημο μοντέλο HEPOS» (7 παράμετροι + κάνναβος διορθώσεων Κτηματολογίου, ακρίβεια εκατοστού). Το «3 παράμετροι» αποκλίνει έως και πάνω από 1 m. Για τοπικό δίκτυο ή υψόμετρα: COGO → Τοπική προσαρμογή σε γνωστά σημεία.</p>
      <div class="result" id="tt"></div><button class="btn primary" id="ok">Εφαρμογή</button>`, b => {
      const cs = b.querySelector('#cs'), cw = b.querySelector('#cw');
      const sh = () => { cw.classList.toggle('hidden', cs.value !== 'CUSTOM'); };
      cs.onchange = sh; sh();
      const test = () => { try { HGEO.setCRS(cs.value, b.querySelector('#cd').value.trim()); const ll = A.pos ? [A.pos.lat, A.pos.lon] : [38.83, 20.70]; const g2 = HGEO.toGrid(ll[0], ll[1]); b.querySelector('#tt').textContent = `Δοκιμή (${A.pos ? 'τρέχουσα θέση' : 'Λευκάδα'}): X ${g2.E.toFixed(3)}  Y ${g2.N.toFixed(3)}`; } catch (e) { b.querySelector('#tt').textContent = 'Μη έγκυρος ορισμός: ' + e.message; } finally { HGEO.setCRS(S.crs, S.crsCustom); } };
      cs.addEventListener('change', test); b.querySelector('#cd').oninput = test; test();
      b.querySelector('#ok').onclick = () => {
        const def = b.querySelector('#cd').value.trim();
        if (cs.value === 'CUSTOM' && !HGEO.validDef(def)) return A.toast('Μη έγκυρος ορισμός proj4', 'bad');
        const changed = cs.value !== S.crs;
        S.crs = cs.value; S.crsCustom = def; S.heightMode = b.querySelector('#hm').value; A.saveSettings(); A.applySettings(); A.closeSheet();
        A.toast('✓ ' + HGEO.crsName(), 'ok');
        if (changed && A.proj.points.length) A.toast('Τα υπάρχοντα σημεία μένουν με τις αρχικές τους τιμές· οι νέες μετρήσεις στο νέο σύστημα.', '', 5000);
      };
    });
  };

  // ==================== Ρυθμίσεις ====================
  A.settingsSheet = function () {
    const S = A.settings;
    A.sheet('Ρυθμίσεις', `<h4>Ποιοτικός έλεγχος RTK</h4>
      <label class="fld"><span>Κλάση ακρίβειας (NGS RT1–RT4)</span><select id="qc">${Object.entries(HQC.CLASSES).map(([k, v]) => `<option value="${k}" ${k === S.qcClass ? 'selected' : ''}>${esc(v.name)} — ${(v.h95 * 100).toFixed(0)}/${(v.v95 * 100).toFixed(0)} cm · PDOP≤${v.pdop} · SV≥${v.sats} · ${v.epochs} εποχές</option>`).join('')}</select></label>
      <div class="row"><button class="btn grow" id="qce">Εφαρμογή εποχών της κλάσης</button></div>
      <h4>Μέτρηση σημείου</h4>
      <label class="fld"><span>Αναμονή σε σταθερό FIX πριν αρχίσει η μέτρηση (δευτ.)</span><input id="fw" type="number" min="0" step="1" inputmode="numeric" value="${S.fixWait != null ? S.fixWait : 10}"></label>
      <p class="muted">Η μέτρηση ξεκινά μόνο όταν η λύση μείνει FIX τόσα δευτερόλεπτα συνεχόμενα. Η διάρκεια της μέτρησης (εποχές ή δευτερόλεπτα) επιλέγεται στην κάρτα Survey.</p>
      <h4>Ήχοι</h4>
      <label class="chk"><input type="checkbox" id="sp" ${S.soundPoint !== false ? 'checked' : ''}> Ήχος όταν αποθηκεύεται σημείο</label>
      <label class="chk"><input type="checkbox" id="sf" ${S.soundFix !== false ? 'checked' : ''}> Ήχος όταν η λύση γίνεται FIX ή χάνεται (FLOAT)</label>
      <div class="row"><label class="fld grow"><span>Ένταση</span><input id="vol" type="range" min="0.05" max="1" step="0.05" value="${S.volume != null ? S.volume : 0.25}" style="min-height:40px;padding:0"></label><button class="btn" id="vt">▶ Δοκιμή</button></div>
      <h4>Φωνητικές εντολές</h4>
      <label class="chk"><input type="checkbox" id="vc" ${A.voice && A.voice.on ? 'checked' : ''}> Ενεργές (το μικρόφωνο ακούει συνεχώς)</label>
      <label class="chk"><input type="checkbox" id="vs" ${S.voiceSay !== false ? 'checked' : ''}> Φωνητική επιβεβαίωση («Αποθηκεύτηκε P12»)</label>
      <p class="muted">Πες: <b>«Πάρε»</b> = μέτρηση σημείου (στη χάραξη: καταγραφή Pn) · <b>«Σβήσε»</b> = διαγραφή του τελευταίου μετρημένου · <b>«Αναίρεση»</b> = επαναφορά · <b>«Επόμενο» / «Προηγούμενο»</b> = σημείο χάραξης · <b>«Άκυρο»</b> = διακοπή μέτρησης. Στα αγγλικά: Take, Delete, Undo, Next, Previous, Stop.</p>
      <h4>Χάραξη</h4>
      <div class="row"><label class="fld grow"><span>Ανοχή οριζ. (m)</span><input id="th" type="number" step="0.001" value="${S.tolH}"></label><label class="fld grow"><span>Ανοχή κατακ. (m)</span><input id="tv" type="number" step="0.001" value="${S.tolV}"></label></div>
      <label class="chk"><input type="checkbox" id="bp" ${S.beep ? 'checked' : ''}> Ήχοι καθοδήγησης</label>
      <label class="chk"><input type="checkbox" id="an" ${S.autoNext !== false ? 'checked' : ''}> Αυτόματα στο επόμενο σημείο μετά την καταγραφή</label>
      <h4>Πλωτό κουμπί μέτρησης</h4>
      <label class="chk"><input type="checkbox" id="fb-on" ${!A.settings.fab || A.settings.fab.on !== false ? 'checked' : ''}> Πλωτό κουμπί ● πάνω στον χάρτη (σύρε το όπου βολεύει)</label>
      <div class="row"><button class="btn grow" id="fb-l">✋ Αριστερόχειρας</button><button class="btn grow" id="fb-r">Δεξιόχειρας ✋</button></div>
      <label class="chk"><input type="checkbox" id="fb-big" ${A.settings.fab && A.settings.fab.big ? 'checked' : ''}> Μεγάλο κουμπί (γάντια)</label>
      <h4>Εμφάνιση</h4>
      <div class="seg" id="tm"><button data-v="light" class="${S.theme === 'light' ? 'on' : ''}">☀ Ήλιος (πεδίο)</button><button data-v="dark" class="${S.theme === 'dark' ? 'on' : ''}">NEO σκούρο</button></div>
      <label class="fld"><span>Γλώσσα / Language</span><select id="lng" class="nt"><option value="el" ${HI18N.lang() === 'el' ? 'selected' : ''}>Ελληνικά</option><option value="en" ${HI18N.lang() === 'en' ? 'selected' : ''}>English</option></select></label>
      <label class="fld"><span>Μέγεθος γραμμάτων</span><select id="tsz"><option value="large" ${S.textSize !== 'xl' ? 'selected' : ''}>Μεγάλα</option><option value="xl" ${S.textSize === 'xl' ? 'selected' : ''}>Πολύ μεγάλα</option></select></label>
      <label class="fld"><span>Ύψος κειμένου στο DXF (m)</span><input id="tx" type="number" step="0.01" value="${S.textH}"></label>
      <h4>Υπόβαθρα</h4>
      <label class="fld"><span>Google Map Tiles API key (για Google δορυφορική/οδικό)</span><input id="gk" value="${esc(S.googleKey || '')}" autocomplete="off" placeholder="AIza…"></label>
      <h4>Εφαρμογή</h4>
      <div class="row"><button class="btn grow" id="upd">⤓ Έλεγχος για ενημέρωση</button><button class="btn grow" id="elog">Αρχείο σφαλμάτων</button></div>
      <p class="muted" id="ver"></p>
      <button class="btn primary" id="ok">Αποθήκευση</button>`, b => {
      let theme = S.theme;
      b.querySelector('#upd').onclick = () => A.checkUpdate(true);
      b.querySelector('#elog').onclick = () => { const l = A.errorLog(); A.sheet('Αρχείο σφαλμάτων', `<p class="muted">${l.length ? 'Τελευταία σφάλματα (για υποστήριξη):' : 'Κανένα σφάλμα.'}</p><div class="raw nt">${l.map(e => A.esc(e.t + '  ' + e.m)).join('\n')}</div>${l.length ? '<button class="btn" id="el-sh">↗ Αποστολή</button>' : ''}`, bb => { const x = bb.querySelector('#el-sh'); if (x) x.onclick = () => HIO.share([{ name: 'hexis_pad_errors.txt', data: l.map(e => e.t + '  ' + e.m).join('\r\n') }], { subject: 'HEXIS PAD errors' }); }); };
      (async () => { try { const i = await Capacitor.Plugins.App.getInfo(); b.querySelector('#ver').textContent = 'HEXIS PAD ' + i.version + ' (build ' + i.build + ')'; } catch (e) { b.querySelector('#ver').textContent = 'HEXIS PAD (web)'; } })();
      b.querySelectorAll('#tm button').forEach(x => x.onclick = () => { theme = x.dataset.v; b.querySelectorAll('#tm button').forEach(y => y.classList.toggle('on', y === x)); });
      b.querySelector('#fb-l').onclick = () => { if (A.fab) { A.settings.fab = Object.assign(A.settings.fab || {}, { on: true }); b.querySelector('#fb-on').checked = true; A.fab.preset('left'); A.fab.apply(); A.toast('✋ ' + 'Το κουμπί πήγε αριστερά', 'ok'); } };
      b.querySelector('#fb-r').onclick = () => { if (A.fab) { A.settings.fab = Object.assign(A.settings.fab || {}, { on: true }); b.querySelector('#fb-on').checked = true; A.fab.preset('right'); A.fab.apply(); A.toast('Το κουμπί πήγε δεξιά ✋', 'ok'); } };
      b.querySelector('#vt').onclick = () => { const v = A.settings.volume; A.settings.volume = parseFloat(b.querySelector('#vol').value); A.sound('point'); setTimeout(() => A.sound('fix'), 600); setTimeout(() => A.sound('lost'), 1300); setTimeout(() => { A.settings.volume = v; }, 2600); };
      b.querySelector('#qce').onclick = () => { const c = HQC.CLASSES[b.querySelector('#qc').value]; const opts = [...$('sv-epochs').options].map(o => +o.value).filter(v => v > 0); const e = opts.reduce((a, v) => Math.abs(v - c.epochs) < Math.abs(a - c.epochs) ? v : a, opts[0]); S.epochs = c.epochs > 60 ? c.epochs : e; if (c.epochs > 60 && ![...$('sv-epochs').options].some(o => +o.value === c.epochs)) $('sv-epochs').add(new Option(String(c.epochs), String(c.epochs))); A.toast('Εποχές: ' + S.epochs); };
      b.querySelector('#ok').onclick = () => {
        const nl = b.querySelector('#lng').value;
        A.settings.fab = Object.assign(A.settings.fab || {}, { on: b.querySelector('#fb-on').checked, big: b.querySelector('#fb-big').checked }); if (A.fab) A.fab.apply();
        const wantV = b.querySelector('#vc').checked;
        Object.assign(S, { qcClass: b.querySelector('#qc').value, tolH: num(b.querySelector('#th').value) || 0.02, tolV: num(b.querySelector('#tv').value) || 0.02, beep: b.querySelector('#bp').checked, autoNext: b.querySelector('#an').checked, theme, textSize: b.querySelector('#tsz').value, fixWait: Math.max(0, parseInt(b.querySelector('#fw').value, 10) || 0), soundPoint: b.querySelector('#sp').checked, soundFix: b.querySelector('#sf').checked, volume: parseFloat(b.querySelector('#vol').value), textH: num(b.querySelector('#tx').value) || 0.25, googleKey: b.querySelector('#gk').value.trim(), voiceSay: b.querySelector('#vs').checked, voice: wantV });
        if (A.voice && wantV !== A.voice.on) (wantV ? A.voice.start() : A.voice.stop());
        A.saveSettings(); A.applySettings(); A.updateStakeTarget(); A.closeSheet(); A.toast('✓ Αποθηκεύτηκε', 'ok');
        if (nl !== HI18N.lang()) setTimeout(() => HI18N.setLang(nl), 400);
      };
    });
  };

  // ==================== Επίπεδα χάρτη ====================
  A.layersSheet = function () {
    const S = A.settings, m = A.map;
    const dl = A.design ? Object.keys(A.design.model.layers) : [];
    A.sheet('Υπόβαθρα & επίπεδα', `<h4>Υπόβαθρο</h4>${Object.entries(HMAP.BASEMAPS).map(([k, v]) => `<label class="chk"><input type="radio" name="bm" value="${k}" ${k === S.base ? 'checked' : ''}> ${esc(v.name)}</label>`).join('')}
      ${!S.googleKey ? '<p class="muted">Για Google: Ρυθμίσεις → Google Map Tiles API key.</p>' : ''}
      <h4>Επικαλύψεις</h4>${Object.entries(HMAP.OVERLAYS).map(([k, v]) => `<label class="chk"><input type="checkbox" data-ov="${k}" ${S.overlays[k] ? 'checked' : ''}> ${esc(v.name)}</label>`).join('')}
      <p class="muted">Κτηματολόγιο/ΚΑΕΚ: διαθέσιμα για την Ελλάδα, εμφανίζονται σε μεγάλη μεγέθυνση.</p>
      ${dl.length ? `<h4>Σχέδιο: ${esc(A.design.name)}</h4><div class="row"><button class="btn grow" id="all1">Όλα ορατά</button><button class="btn grow" id="all0">Όλα κρυφά</button><button class="btn danger" id="rmd">Αφαίρεση</button></div>
      ${dl.map(l => `<label class="chk"><input type="checkbox" data-ly="${esc(l)}" ${(A.design.layerState[l] || {}).on !== false ? 'checked' : ''}> <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${A.design.model.layers[l].color}"></span> ${esc(l)}</label>`).join('')}` : ''}`, b => {
      b.querySelectorAll('input[name=bm]').forEach(x => x.onchange = () => { S.base = x.value; m.base = x.value; A.saveSettings(); m.redraw(); });
      b.querySelectorAll('[data-ov]').forEach(x => x.onchange = () => { S.overlays[x.dataset.ov] = x.checked; m.overlays[x.dataset.ov] = x.checked; A.saveSettings(); m._kaekEnv = null; m.onViewChange(); m.redraw(); });
      const saveLy = () => { HIO.kvSet('design:' + A.proj.id, A.design); m.redraw(); };
      b.querySelectorAll('[data-ly]').forEach(x => x.onchange = () => { A.design.layerState[x.dataset.ly] = { on: x.checked }; saveLy(); });
      const all = v => { dl.forEach(l => A.design.layerState[l] = { on: v }); b.querySelectorAll('[data-ly]').forEach(x => x.checked = v); saveLy(); };
      const a1 = b.querySelector('#all1'); if (a1) { a1.onclick = () => all(true); b.querySelector('#all0').onclick = () => all(false); b.querySelector('#rmd').onclick = async () => { A.design = null; m.layers.design = null; await HIO.kvDel('design:' + A.proj.id); A.closeSheet(); m.redraw(); }; }
    });
  };

  // ==================== Οδηγίες ====================
  A.helpSheet = function () {
    A.sheet('Οδηγίες χρήσης', `<div class="help">
      <button class="btn primary" id="hm-full">📖 Πλήρες εγχειρίδιο</button>
      <h3>0. Οθόνη</h3><p>⌂ αρχικό μενού. Αριστερή στήλη: ✎ Εργαλεία για προσθήκη/αφαίρεση. ▾ μικραίνει την κάρτα Survey/Stakeout. ▦ όρια Κτηματολογίου.</p><h3>1. Σύνδεση</h3><p>Μενού → Σύνδεση δέκτη → Bluetooth (κάνε πρώτα σύζευξη από το Android) → Σύνδεση. Μετά Μενού → NTRIP: host, port, mountpoint, χρήστης, κωδικός → Έναρξη. Η γραμμή κατάστασης δείχνει FIX/FLOAT, σH/σV, δορυφόρους, ηλικία διορθώσεων και QC.</p>
      <h3>2. Αποτύπωση (Survey)</h3><p>Όνομα, κωδικός, ύψος κεραίας (ράβδος + κέντρο φάσης) → ● ΜΕΤΡΗΣΗ. Γίνεται μέσος όρος εποχών και ποιοτικός έλεγχος· αν δεν περάσει, προτείνεται επανάληψη. «Γραμμή με κωδικό»: συνεχόμενα σημεία ίδιου κωδικού ενώνονται. 📷: φωτογραφία συνδεδεμένη με το τελευταίο σημείο, με υδατογράφημα συντεταγμένων.</p>
      <h3>3. Χάραξη (Stakeout)</h3><ul><li><b>Σημείο</b>: στόχος από λίστα, ◀ ▶, ή ⌖ στον χάρτη (σημεία/κορυφές DXF).</li><li><b>Γραμμή</b>: πολυγραμμή σχεδίου ή δύο σημεία. Κενή Χ.Θ. = ζωντανή χιλιομέτρηση/offset· με Χ.Θ. = στόχος, ▶ προχωρά κατά «Βήμα».</li><li><b>Επιφάνεια</b>: δάπεδο με κλίσεις ή επίπεδο 3 σημείων — δείχνει Εκσκαφή/Επίχωση.</li><li><b>Γωνίασμα</b>: βασική γραμμή, Χ.Θ./offset κάθετα.</li></ul><p>«Μπρος/Δεξιά» ως προς την κατεύθυνση που περπατάς (ή Βορράς / σημείο προσανατολισμού). ⛶ πλήρης οθόνη. ● ΚΑΤΑΓΡΑΦΗ: αποθηκεύει το χαραγμένο με ΔX/ΔY/ΔZ.</p>
      <h3>4. COGO</h3><p>Απόσταση/Αζιμούθιο, Κλίση (ζωντανά), Επέκταση ευθείας, Πύκνωση, Δυσπρόσιτο σημείο (laser, τομή αποστάσεων, προέκταση, τομή ευθειών), Κλίση δαπέδου, Γωνίασμα (και γωνίες ορθογωνίου), Εμβαδόν, Τοπική προσαρμογή.</p>
      <h3>5. Ποιοτικός έλεγχος (QC)</h3><p>Συνεχής έλεγχος σε κάθε εποχή: λύση FIX, χρόνος σε FIX, σH/σV, PDOP, δορυφόροι, ηλικία διορθώσεων, ανίχνευση άλματος θέσης (πιθανό λάθος fix). Κλάσεις RT1–RT4 κατά NGS. Μέτρηση ελέγχου σε γνωστό σημείο από τη λεπτομέρεια σημείου· ξαναμέτρηση ίδιου ονόματος = σύγκριση ανεξάρτητων μετρήσεων.</p>
      <h3>6. Αρχεία</h3><p>Εισαγωγή TXT/CSV, DXF, DWG. Εξαγωγή TXT, CSV, DXF, KML, GeoJSON, φωτογραφίες σε ZIP → Αποθήκευση, Κοινή χρήση ή Email.</p>
      <h3>7. Base / Rover</h3><p>Μενού → Base / Rover: κατασκευαστής δέκτη, νέα βάση (γνωστό σημείο ή «εδώ»), εντολές προς βάση/rover, μετάθεση βάσης με διόρθωση όλων των σημείων της.</p></div>`, b => {
      b.querySelector('#hm-full').onclick = () => A.sheet('Εγχειρίδιο HEXIS PAD', '<iframe src="manual.html" style="width:100%;height:72vh;border:0;border-radius:10px;background:#fff"></iframe>');
    });
  };

  // ---------- Μενού ----------
  document.querySelectorAll('[data-menu]').forEach(b => b.onclick = () => ({
    connect: A.connectSheet, base: A.baseSheet, ntrip: A.ntripSheet, laser: A.laserSheet, project: A.projectSheet, import: A.importSheet,
    export: A.exportSheet, crs: A.crsSheet, settings: A.settingsSheet, help: A.helpSheet, imu: () => A.imuSheet(),
  })[b.dataset.menu]());
  $('st-ntrip').onclick = e => { e.stopPropagation(); A.ntripSheet(); };

  A.init().catch(e => { console.error(e); alert('Σφάλμα εκκίνησης: ' + e.message); });
})(window);
