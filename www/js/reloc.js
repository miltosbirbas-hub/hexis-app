// HEXIS PAD — Relocalize: μετάθεση (και στροφή) μετρημένων σημείων πάνω σε γνωστά σημεία
// Για ψευδές FIX / λάθος βάση: όλο το σετ σημείων μετακινείται ώστε τα μετρημένα γνωστά σημεία να πέσουν στις σωστές συντεταγμένες.
(function (g) {
  'use strict';
  const A = g.APP, $ = A.$, esc = A.esc;
  const t = s => (g.HI18N ? HI18N.t(s) : s);
  const num = v => { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) ? x : null; };
  const F = v => v == null || !isFinite(v) ? '—' : v.toFixed(3);
  const dayOf = p => { const d = new Date(p.time || 0); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const movable = p => p.type === 'survey' || p.type === 'staked' || p.type === 'calc';

  const R = { scope: 'all', day: '', from: '', to: '', pairs: [], rot: true, scale: false, z: true };

  function scopePoints() {
    const pts = A.proj.points.filter(movable);
    if (R.scope === 'day') return pts.filter(p => dayOf(p) === R.day);
    if (R.scope === 'range') {
      const sorted = pts.slice().sort((a, b) => (a.time || 0) - (b.time || 0));
      const i = sorted.findIndex(p => p.name === R.from), j = sorted.findIndex(p => p.name === R.to);
      if (i < 0 || j < 0) return [];
      return sorted.slice(Math.min(i, j), Math.max(i, j) + 1);
    }
    return pts;
  }

  function solve() {
    const P = R.pairs.filter(x => x.m && x.k && x.k.E != null && x.k.N != null);
    if (!P.length) return null;
    const pairs = P.map(x => ({ name: x.m.name, raw: { E: x.m.E, N: x.m.N, Z: x.m.Z }, known: { E: x.k.E, N: x.k.N, Z: x.k.Z } }));
    let s;
    if (pairs.length >= 2 && R.rot) s = HGEO.solveCalib(pairs, R.scale);
    else { // μόνο μετάθεση (μέσος όρος)
      let dE = 0, dN = 0; pairs.forEach(p => { dE += p.known.E - p.raw.E; dN += p.known.N - p.raw.N; });
      dE /= pairs.length; dN /= pairs.length;
      let dz = 0, nz = 0; pairs.forEach(p => { if (p.raw.Z != null && p.known.Z != null) { dz += p.known.Z - p.raw.Z; nz++; } });
      dz = nz ? dz / nz : 0;
      s = { a: 1, b: 0, tx: dE, ty: dN, dz, scale: 1, rot: 0, n: pairs.length,
        residuals: pairs.map(p => ({ name: p.name, dE: p.known.E - (p.raw.E + dE), dN: p.known.N - (p.raw.N + dN), dZ: p.raw.Z != null && p.known.Z != null ? p.known.Z - (p.raw.Z + dz) : null })) };
    }
    if (!R.z) s.dz = 0;
    // μέση μετακίνηση των σημείων (για εμφάνιση)
    const c = pairs[0].raw; const E = s.a * c.E - s.b * c.N + s.tx, N = s.b * c.E + s.a * c.N + s.ty;
    s.dE0 = E - c.E; s.dN0 = N - c.N;
    s.rms = Math.sqrt(s.residuals.reduce((m, r) => m + r.dE * r.dE + r.dN * r.dN, 0) / s.residuals.length);
    return s;
  }
  const apply1 = (s, p) => ({ E: s.a * p.E - s.b * p.N + s.tx, N: s.b * p.E + s.a * p.N + s.ty, Z: p.Z != null ? p.Z + (s.dz || 0) : null });

  A.relocSheet = function () {
    const days = [...new Set(A.proj.points.filter(movable).map(dayOf))].sort().reverse();
    if (!R.day && days.length) R.day = days[0];
    const sc = scopePoints(), sol = solve();
    const log = A.proj.relocLog || [];
    A.sheet('Relocalize — μετάθεση σημείων', `
      <p class="muted">Όταν ένα σετ σημείων μετρήθηκε με ψευδές FIX ή λάθος βάση: δώσε γνωστά σημεία που μέτρησες και τις σωστές τους συντεταγμένες — όλα τα σημεία μετακινούνται στη σωστή θέση.</p>
      <h4>1. Ποια σημεία μετακινούνται</h4>
      <div class="seg" id="rl-sc"><button data-v="all" class="${R.scope === 'all' ? 'on' : ''}">Όλα</button><button data-v="day" class="${R.scope === 'day' ? 'on' : ''}">Ημέρα</button><button data-v="range" class="${R.scope === 'range' ? 'on' : ''}">Από – έως</button></div>
      ${R.scope === 'day' ? `<label class="fld"><span>Ημέρα μέτρησης</span><select id="rl-day">${days.map(d => `<option ${d === R.day ? 'selected' : ''}>${d}</option>`).join('')}</select></label>` : ''}
      ${R.scope === 'range' ? `<div class="row"><label class="fld grow"><span>Από σημείο</span><input id="rl-from" value="${esc(R.from)}" placeholder="π.χ. 101"></label><label class="fld grow"><span>Έως σημείο</span><input id="rl-to" value="${esc(R.to)}" placeholder="π.χ. 158"></label></div>` : ''}
      <div class="result">${sc.length} ${t('σημεία θα μετακινηθούν')} <span class="muted">(${t('μετρημένα / χαραγμένα / υπολογισμένα — τα γνωστά σημεία δεν αλλάζουν')})</span></div>
      <h4>2. Γνωστά σημεία (μετρημένο → σωστό)</h4>
      <div class="list">${R.pairs.map((x, i) => `<div class="li" style="align-items:center"><span class="nm">${x.m ? esc(x.m.name) : '—'}</span><span class="cd">→ ${x.k ? esc(x.k.name || 'X ' + F(x.k.E) + ' Y ' + F(x.k.N)) : '—'}</span>${sol && sol.residuals[i] ? `<span class="xy">υπ. ${F(Math.hypot(sol.residuals[i].dE, sol.residuals[i].dN))}${sol.residuals[i].dZ != null ? ' / ' + F(sol.residuals[i].dZ) : ''}</span>` : ''}<button class="btn" data-del="${i}">✕</button></div>`).join('') || `<p class="muted">${t('Κανένα ζεύγος ακόμη.')}</p>`}</div>
      <button class="btn" id="rl-add">＋ Προσθήκη γνωστού σημείου</button>
      <label class="chk"><input type="checkbox" id="rl-rot" ${R.rot ? 'checked' : ''}> Και στροφή (με 2+ γνωστά σημεία)</label>
      <label class="chk"><input type="checkbox" id="rl-scl" ${R.scale ? 'checked' : ''}> Και κλίμακα (με 3+ γνωστά σημεία)</label>
      <label class="chk"><input type="checkbox" id="rl-z" ${R.z ? 'checked' : ''}> Διόρθωση και υψομέτρου (Z)</label>
      ${sol ? `<div class="result ${sol.rms > 0.05 ? 'warn' : 'ok'}"><div class="kv">
          <span>ΔX</span><span>${F(sol.dE0)} m</span><span>ΔY</span><span>${F(sol.dN0)} m</span><span>ΔZ</span><span>${R.z ? F(sol.dz) + ' m' : '—'}</span>
          ${sol.n >= 2 && R.rot ? `<span>${t('Στροφή')}</span><span>${(sol.rot * 3600).toFixed(1)}″</span>` : ''}${R.scale && sol.n >= 2 ? `<span>${t('Κλίμακα')}</span><span>${sol.scale.toFixed(7)}</span>` : ''}
          ${sol.n >= 2 ? `<span>${t('Υπόλοιπο (RMS)')}</span><span>${F(sol.rms)} m</span>` : ''}</div>
          ${sol.n === 1 ? `<span class="muted">${t('Με 1 γνωστό σημείο γίνεται μόνο μετάθεση. Πρόσθεσε 2ο για έλεγχο και στροφή.')}</span>` : ''}${sol.n === 2 && R.rot ? `<span class="muted">${t('Με 2 γνωστά σημεία και στροφή τα υπόλοιπα είναι πάντα μηδέν — πρόσθεσε 3ο για πραγματικό έλεγχο.')}</span>` : ''}${sol.rms > 0.05 ? '⚠ ' + t('Μεγάλο υπόλοιπο — έλεγξε τα ζεύγη') : ''}</div>
        <button class="btn primary big" id="rl-go" ${sc.length ? '' : 'disabled'}>✓ Εφαρμογή σε ${sc.length} σημεία</button>` : ''}
      ${log.length ? `<button class="btn" id="rl-undo">↶ ${t('Αναίρεση τελευταίου relocalize')} (${esc(new Date(log[log.length - 1].time).toLocaleString('el-GR'))} · ${log[log.length - 1].ids.length} ${t('σημεία')})</button>` : ''}`, b => {
      const reopen = () => A.relocSheet();
      b.querySelectorAll('#rl-sc button').forEach(x => x.onclick = () => { R.scope = x.dataset.v; reopen(); });
      const dy = b.querySelector('#rl-day'); if (dy) dy.onchange = e => { R.day = e.target.value; reopen(); };
      const fr = b.querySelector('#rl-from'), to = b.querySelector('#rl-to');
      if (fr) fr.onchange = e => { R.from = e.target.value.trim(); reopen(); };
      if (to) to.onchange = e => { R.to = e.target.value.trim(); reopen(); };
      b.querySelectorAll('[data-del]').forEach(x => x.onclick = () => { R.pairs.splice(+x.dataset.del, 1); reopen(); });
      b.querySelector('#rl-rot').onchange = e => { R.rot = e.target.checked; reopen(); };
      b.querySelector('#rl-scl').onchange = e => { R.scale = e.target.checked; reopen(); };
      b.querySelector('#rl-z').onchange = e => { R.z = e.target.checked; reopen(); };
      b.querySelector('#rl-add').onclick = () => addPair();
      const go = b.querySelector('#rl-go'); if (go) go.onclick = () => applyNow();
      const un = b.querySelector('#rl-undo'); if (un) un.onclick = () => undo();
    });
  };

  function addPair() {
    A.pickPointSheet(t('Μετρημένο σημείο (λάθος θέση)'), m => {
      A.sheet(t('Σωστές συντεταγμένες για') + ' ' + m.name, `
        <button class="btn" id="kp-pt">☰ ${t('Από γνωστό σημείο της λίστας')}</button>
        <p class="muted">${t('ή γράψε τις σωστές συντεταγμένες:')}</p>
        <label class="fld"><span>${t('Όνομα')}</span><input id="kp-n" value="${esc(m.name)}_ΓΝ"></label>
        <div class="row"><label class="fld grow"><span>X (E)</span><input id="kp-e" inputmode="decimal"></label><label class="fld grow"><span>Y (N)</span><input id="kp-y" inputmode="decimal"></label></div>
        <label class="fld"><span>Z (${t('προαιρετικό')})</span><input id="kp-z" inputmode="decimal"></label>
        <button class="btn primary" id="kp-ok">✓ ${t('Προσθήκη ζεύγους')}</button>`, b => {
        b.querySelector('#kp-pt').onclick = () => A.pickPointSheet(t('Γνωστό σημείο (σωστή θέση)'), k => { R.pairs.push({ m, k: { name: k.name, E: k.E, N: k.N, Z: k.Z } }); A.relocSheet(); });
        b.querySelector('#kp-ok').onclick = () => {
          const E = num(b.querySelector('#kp-e').value), N = num(b.querySelector('#kp-y').value);
          if (E == null || N == null) return A.toast(t('Γράψε X και Y'), 'bad');
          R.pairs.push({ m, k: { name: b.querySelector('#kp-n').value.trim(), E, N, Z: num(b.querySelector('#kp-z').value) } });
          A.relocSheet();
        };
      });
    });
  }

  function applyNow() {
    const s = solve(); const pts = scopePoints(); if (!s || !pts.length) return;
    A.confirm('Relocalize', `${t('Μετακίνηση')} <b>${pts.length}</b> ${t('σημείων')} — ΔX ${F(s.dE0)} · ΔY ${F(s.dN0)}${R.z ? ' · ΔZ ' + F(s.dz) : ''}${s.n >= 2 && R.rot ? ' · ' + t('στροφή') + ' ' + (s.rot * 3600).toFixed(1) + '″' : ''}. ${t('Μπορείς να το αναιρέσεις.')}`, t('Εφαρμογή'), () => {
      const backup = {};
      pts.forEach(p => {
        backup[p.id] = { E: p.E, N: p.N, Z: p.Z, lat: p.lat, lon: p.lon, note: p.note };
        const q = apply1(s, p); p.E = q.E; p.N = q.N; if (R.z) p.Z = q.Z;
        try { const ll = HGEO.toLL(p.E, p.N); p.lat = ll.lat; p.lon = ll.lon; } catch (e) { }
        p.note = (p.note ? p.note + ' · ' : '') + 'Relocalize ΔX ' + s.dE0.toFixed(3) + ' ΔY ' + s.dN0.toFixed(3) + (R.z ? ' ΔZ ' + s.dz.toFixed(3) : '');
      });
      A.proj.relocLog = (A.proj.relocLog || []).concat([{ time: Date.now(), ids: pts.map(p => p.id), backup, params: { a: s.a, b: s.b, tx: s.tx, ty: s.ty, dz: R.z ? s.dz : 0, rms: s.rms, n: s.n }, pairs: R.pairs.map(x => ({ m: x.m.name, k: x.k })) }]).slice(-10);
      A.saveProject(); A.renderPoints(); A.updateMapLayers(); A.map && A.map.redraw();
      R.pairs = [];
      A.toast('✓ ' + pts.length + ' ' + t('σημεία μετακινήθηκαν στη σωστή θέση'), 'ok', 3500);
      A.closeSheet();
    });
  }

  function undo() {
    const log = A.proj.relocLog || []; const L = log[log.length - 1]; if (!L) return;
    A.confirm(t('Αναίρεση'), t('Επαναφορά') + ` <b>${L.ids.length}</b> ` + t('σημείων στις αρχικές τους θέσεις;'), t('Αναίρεση'), () => {
      let n = 0;
      A.proj.points.forEach(p => { const b = L.backup[p.id]; if (b) { Object.assign(p, b); n++; } });
      log.pop(); A.proj.relocLog = log;
      A.saveProject(); A.renderPoints(); A.updateMapLayers(); A.map && A.map.redraw();
      A.toast('↶ ' + n + ' ' + t('σημεία επανήλθαν'), 'ok'); A.relocSheet();
    });
  }
  A._reloc = { R, solve, scopePoints };
})(window);
