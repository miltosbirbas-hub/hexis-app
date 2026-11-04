// HEXIS PAD — Απομακρυσμένο σημείο με αποστασιόμετρο laser (π.χ. Leica DISTO) από 2–3 θέσεις του κονταριού
// Θέση 1: μέτρηση GNSS + απόσταση laser · Θέση 2: μέτρηση GNSS + απόσταση · (Θέση 3: έλεγχος) → τομή κύκλων / ελάχιστα τετράγωνα.
// Η απόσταση γράφεται μόνη της στο πεδίο με τη «λειτουργία πληκτρολογίου» Bluetooth του laser.
(function (g) {
  'use strict';
  const A = g.APP, $ = A.$, esc = A.esc;
  const t = s => (g.HI18N ? HI18N.t(s) : s);
  const F = v => v == null || !isFinite(v) ? '—' : v.toFixed(3);
  const parseD = v => { const m = String(v == null ? '' : v).replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };

  // ---------- υπολογισμός ----------
  function circles(a, b, r1, r2) {
    const d = Math.hypot(b.E - a.E, b.N - a.N);
    if (!(d > 0)) return null;
    let x = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h2 = r1 * r1 - x * x;
    const touch = h2 < 0; if (touch) h2 = 0; // οι κύκλοι δεν τέμνονται (σφάλμα μέτρησης) → το κοντινότερο σημείο
    const h = Math.sqrt(h2), ux = (b.E - a.E) / d, uy = (b.N - a.N) / d, px = a.E + ux * x, py = a.N + uy * x;
    return { L: { E: px - uy * h, N: py + ux * h }, R: { E: px + uy * h, N: py - ux * h }, touch, gap: touch ? Math.abs(Math.sqrt(-(r1 * r1 - x * x))) : 0 };
  }
  function lsq(st, p0) {
    let p = { E: p0.E, N: p0.N };
    for (let it = 0; it < 15; it++) {
      let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
      for (const s of st) {
        const dE = p.E - s.E, dN = p.N - s.N, r = Math.hypot(dE, dN) || 1e-9;
        const jE = dE / r, jN = dN / r, v = s.d - r;
        a11 += jE * jE; a12 += jE * jN; a22 += jN * jN; b1 += jE * v; b2 += jN * v;
      }
      const det = a11 * a22 - a12 * a12; if (Math.abs(det) < 1e-12) break;
      const xE = (a22 * b1 - a12 * b2) / det, xN = (a11 * b2 - a12 * b1) / det;
      p.E += xE; p.N += xN; if (Math.hypot(xE, xN) < 1e-6) break;
    }
    const res = st.map(s => s.d - Math.hypot(p.E - s.E, p.N - s.N));
    return { p, res, rms: Math.sqrt(res.reduce((m, r) => m + r * r, 0) / res.length) };
  }
  const angAt = (p, a, b) => { const a1 = Math.atan2(a.N - p.N, a.E - p.E), a2 = Math.atan2(b.N - p.N, b.E - p.E); let d = Math.abs(a1 - a2) * 180 / Math.PI; if (d > 180) d = 360 - d; return d; };

  function solve(L) {
    const S = L.st.filter(s => s.E != null && s.d != null && s.d > 0).map(s => ({ E: s.E, N: s.N, Z: s.Z, d: s.d + (L.add || 0) }));
    if (S.length < 2) return null;
    const c = circles(S[0], S[1], S[0].d, S[1].d); if (!c) return { err: t('Οι θέσεις 1 και 2 συμπίπτουν — μετακινήσου τουλάχιστον 2–3 m') };
    let p, side = L.side, rms = null, res = null, auto = false;
    if (S.length >= 3) {
      // η 3η απόσταση διαλέγει πλευρά και δίνει έλεγχο
      const fit = q => Math.abs(Math.hypot(q.E - S[2].E, q.N - S[2].N) - S[2].d);
      side = fit(c.L) <= fit(c.R) ? 'L' : 'R'; auto = true;
      const r = lsq(S, c[side]); p = r.p; rms = r.rms; res = r.res;
    } else p = c[side || 'L'];
    const ang = angAt(p, S[0], S[1]);
    const warn = [];
    if (c.touch) warn.push(t('Οι αποστάσεις δεν «κλείνουν» με τις θέσεις') + ' (' + F(c.gap) + ' m) — ' + t('έλεγξε τις μετρήσεις'));
    if (ang < 30 || ang > 150) warn.push(t('Αδύναμη γεωμετρία') + ' (' + ang.toFixed(0) + '°) — ' + t('οι θέσεις να σχηματίζουν γωνία 60°–120° με το σημείο'));
    if (rms != null && rms > 0.03) warn.push(t('Μεγάλο υπόλοιπο') + ' ' + F(rms) + ' m — ' + t('έλεγξε τις αποστάσεις'));
    let Z = null;
    const zs = S.map(s => s.Z).filter(z => z != null);
    if (L.zMode === 'st' && zs.length) Z = zs.reduce((m, z) => m + z, 0) / zs.length + (L.dz || 0);
    return { p: { E: p.E, N: p.N, Z }, alt: S.length === 2 ? c[side === 'L' ? 'R' : 'L'] : null, side, auto, rms, res, ang, warn, n: S.length };
  }
  A._laserSolve = solve;

  // ---------- οθόνη ----------
  A.laserPoint = function () {
    const L = A._laserState = A._laserState || { st: [{}, {}], side: 'L', add: 0, zMode: 'none', dz: 0 };
    const open = () => {
      const next = L.st.findIndex(s => s.E == null);
      const needD = L.st.findIndex(s => s.E != null && s.d == null);
      const sol = solve(L);
      A.sheet('Σημείο με laser (2–3 θέσεις)', `
        <svg viewBox="0 0 320 120" style="width:100%;max-width:420px;height:auto;display:block;margin:0 auto">
          <line x1="70" y1="98" x2="180" y2="24" stroke="#c4145a" stroke-width="2" stroke-dasharray="6 4"/><line x1="250" y1="98" x2="180" y2="24" stroke="#c4145a" stroke-width="2" stroke-dasharray="6 4"/>
          ${[[70, 98, '1'], [250, 98, '2']].map(([x, y, n], i) => `<circle cx="${x}" cy="${y}" r="10" fill="${L.st[i] && L.st[i].d != null ? '#0b8a45' : L.st[i] && L.st[i].E != null ? '#d97a00' : '#fff'}" stroke="#0060a8" stroke-width="3"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="12" font-weight="800" fill="${L.st[i] && L.st[i].E != null ? '#fff' : '#0060a8'}">${n}</text>`).join('')}
          <g stroke="#c4145a" stroke-width="4"><line x1="171" y1="15" x2="189" y2="33"/><line x1="189" y1="15" x2="171" y2="33"/></g>
          <text x="196" y="22" font-size="13" font-weight="800" fill="#c4145a">${t('σημείο')}</text>
          <text x="160" y="116" text-anchor="middle" font-size="12" fill="currentColor">${t('ακούμπα το laser στον στυλεό, σημάδεψε, μέτρα')}</text></svg>
        ${L.st.map((s, i) => `<div class="row" style="align-items:flex-end">
            <div class="grow"><b>${t('Θέση')} ${i + 1}${i === 2 ? ' (' + t('έλεγχος') + ')' : ''}</b><br><span class="muted">${s.E != null ? F(s.E) + ' / ' + F(s.N) : t('δεν μετρήθηκε')}</span></div>
            <label class="fld" style="width:42%"><span>${t('Απόσταση laser (m)')}</span><input class="lp-d" data-i="${i}" inputmode="decimal" enterkeyhint="next" value="${s.d != null ? s.d : ''}" ${s.E == null ? 'disabled' : ''}></label>
          </div>`).join('')}
        ${next >= 0 && needD < 0 ? `<button class="btn primary big" id="ll-meas">● ${t('Θέση')} ${next + 1}: ${t('μέτρηση GNSS')}</button>` : ''}
        ${L.st.length < 3 && L.st.every(s => s.d != null) ? `<button class="btn" id="lp-3">＋ ${t('3η θέση για έλεγχο (προαιρετικά)')}</button>` : ''}
        ${needD >= 0 ? `<div class="result warn">${t('Τώρα σημάδεψε το σημείο με το laser και πάτα μέτρηση — η απόσταση γράφεται μόνη της (λειτουργία πληκτρολογίου), ή γράψ’ την.')}</div>` : ''}
        <div class="row"><label class="fld grow"><span>${t('Διόρθωση απόστασης (m)')}</span><input id="lp-add" inputmode="decimal" value="${L.add || 0}"></label>
          <label class="fld grow"><span>${t('Υψόμετρο σημείου')}</span><select id="lp-z"><option value="none" ${L.zMode === 'none' ? 'selected' : ''}>${t('Χωρίς Z')}</option><option value="st" ${L.zMode === 'st' ? 'selected' : ''}>${t('Μέσο Z θέσεων + ΔΗ')}</option></select></label>
          ${L.zMode === 'st' ? `<label class="fld" style="width:26%"><span>ΔΗ (m)</span><input id="lp-dz" inputmode="decimal" value="${L.dz || 0}"></label>` : ''}</div>
        <div id="lp-r">${sol ? (sol.err ? `<div class="result fail">${esc(sol.err)}</div>` : `
          ${sol.n === 2 ? `<div class="seg" id="lp-side"><button data-v="L" class="${sol.side === 'L' ? 'on' : ''}">◀ ${t('Αριστερά')}</button><button data-v="R" class="${sol.side === 'R' ? 'on' : ''}">${t('Δεξιά')} ▶</button></div>
            <p class="muted">${t('Πλευρά του σημείου, κοιτάζοντας από τη θέση 1 προς τη θέση 2 (ή πρόσθεσε 3η θέση και διαλέγει μόνο του).')}</p>` : `<p class="muted">${t('Η πλευρά βρέθηκε από την 3η απόσταση.')}</p>`}
          <div class="result ${sol.warn.length ? 'warn' : 'ok'}"><div class="kv"><span>X</span><span>${F(sol.p.E)}</span><span>Y</span><span>${F(sol.p.N)}</span><span>Z</span><span>${F(sol.p.Z)}</span><span>${t('Γωνία τομής')}</span><span>${sol.ang.toFixed(0)}°</span>${sol.rms != null ? `<span>${t('Υπόλοιπο (RMS)')}</span><span>${F(sol.rms)} m</span>` : ''}</div>${sol.warn.length ? '⚠ ' + sol.warn.map(esc).join('<br>⚠ ') : ''}</div>
          <div class="row"><label class="fld grow"><span>${t('Σημείο')}</span><input id="lp-name" value="${esc($('sv-name').value || '1')}"></label><label class="fld grow"><span>${t('Κωδικός')}</span><input id="lp-code" list="code-list" value="${esc($('sv-code').value || '')}"></label></div>
          <div class="row"><button class="btn grow" id="lp-new">↺ ${t('Από την αρχή')}</button><button class="btn primary grow" id="lp-save">💾 ${t('Αποθήκευση στην αποτύπωση')}</button></div>`) : ''}</div>`, b => {
        // προεπισκόπηση στον χάρτη
        const pv = { pts: [] };
        L.st.forEach(s => { if (s.E != null) pv.pts.push({ E: s.E, N: s.N }); });
        if (sol && !sol.err) { pv.poly = L.st.filter(s => s.E != null).map(s => ({ E: s.E, N: s.N })).concat([sol.p]); pv.pts.push(sol.p); }
        A.map.layers.preview = pv.pts.length ? pv : null; A.map.redraw();
        A._onSheetClose = () => { A.map.layers.preview = null; A.map.redraw(); };

        const mb = b.querySelector('#ll-meas');
        if (mb) mb.onclick = async () => {
          if (!A.pos) return A.toast(t('Δεν υπάρχει θέση GNSS'), 'bad');
          try {
            const r = await A.measure({ raw: true, btn: mb }); if (!r) return;
            const i = L.st.findIndex(s => s.E == null);
            Object.assign(L.st[i], { E: r.pt.E, N: r.pt.N, Z: r.pt.Z, d: null });
            A.sound && A.sound('point'); open();
          } catch (e) { A.toast(e.message || String(e), 'bad'); }
        };
        b.querySelectorAll('.lp-d').forEach(inp => {
          const take = () => {
            const i = +inp.dataset.i, v = parseD(inp.value);
            if (v == null || v <= 0) return;
            if (L.st[i].d === v) return;
            L.st[i].d = v; A.sound && A.sound('point');
            if (A.voice && A.voice.on) A.voice.say('Απόσταση ' + v.toFixed(2), 'Distance ' + v.toFixed(2));
            open();
          };
          inp.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); take(); } });
          inp.addEventListener('change', take);
        });
        if (needD >= 0) { const f = b.querySelector(`.lp-d[data-i="${needD}"]`); if (f) setTimeout(() => { try { f.focus(); } catch (e) { } }, 150); }
        const p3 = b.querySelector('#lp-3'); if (p3) p3.onclick = () => { L.st.push({}); open(); };
        b.querySelector('#lp-add').onchange = e => { L.add = parseD(e.target.value) || 0; open(); };
        b.querySelector('#lp-z').onchange = e => { L.zMode = e.target.value; open(); };
        const dz = b.querySelector('#lp-dz'); if (dz) dz.onchange = e => { L.dz = parseD(e.target.value) || 0; open(); };
        b.querySelectorAll('#lp-side button').forEach(x => x.onclick = () => { L.side = x.dataset.v; open(); });
        const nw = b.querySelector('#lp-new'); if (nw) nw.onclick = () => { A._laserState = null; A.map.layers.preview = null; A.laserPoint(); };
        const sv = b.querySelector('#lp-save'); if (sv) sv.onclick = () => {
          const s2 = solve(L); if (!s2 || s2.err) return;
          let name = b.querySelector('#lp-name').value.trim() || '1'; while (A.findPoint(name)) name = A.nextName(name);
          $('sv-name').value = name; $('sv-code').value = b.querySelector('#lp-code').value.trim();
          let ll = { lat: null, lon: null }; try { ll = HGEO.toLL(s2.p.E, s2.p.N); } catch (e) { }
          const pt = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, code: $('sv-code').value, type: 'survey', E: s2.p.E, N: s2.p.N, Z: s2.p.Z, lat: ll.lat, lon: ll.lon,
            fix: 'CALC', hrms: s2.rms, vrms: null, time: Date.now(), epochs: s2.n, photos: [], crs: HGEO.crsName(),
            note: 'Laser ' + s2.n + ' ' + t('θέσεις') + ' · ' + t('γωνία') + ' ' + s2.ang.toFixed(0) + '°' + (s2.rms != null ? ' · RMS ' + F(s2.rms) : '') + ' · d=' + L.st.map(s => s.d != null ? s.d.toFixed(3) : '—').join('/'),
            laser: { st: L.st.map(s => ({ E: s.E, N: s.N, d: s.d })), add: L.add } };
          A._laserState = null; A.map.layers.preview = null; A._onSheetClose = null; A.closeSheet();
          A.storeSurvey(pt, null, { force: true });
        };
      });
    };
    open();
  };
})(window);
