// HEXIS PAD — Σχεδίαση κατά τη μέτρηση: γραμμή / πολυγραμμή / spline / κλειστό πολύγωνο
// Κάθε νέο σημείο που μετράς μπαίνει στη γραμμή που είναι ανοιχτή. Τέλος = κλείνει η γραμμή, Αναίρεση = βγάζει το
// τελευταίο σημείο από τη γραμμή (το σημείο μένει), Ακύρωση = διαλύει τη γραμμή (τα σημεία μένουν).
(function (g) {
  'use strict';
  const A = g.APP, $ = A.$, esc = A.esc;
  const t = s => (g.HI18N ? HI18N.t(s) : s);
  const KINDS = { line: 'Γραμμή (ευθύγραμμα τμήματα)', poly: 'Πολυγραμμή', spline: 'Spline (καμπύλη)', closed: 'Κλειστό πολύγωνο' };
  const D = A.draw = { on: false, id: null, kind: 'poly' };
  const uid = () => 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const meta = () => (A.proj.lines = A.proj.lines || {});
  const ptsOf = id => A.proj.points.filter(p => p.lineId === id);

  function bar() {
    let b = $('draw-bar');
    if (!b) {
      b = document.createElement('div'); b.id = 'draw-bar'; b.className = 'hidden';
      b.innerHTML = '<div class="mb-t"></div><button class="btn" id="db-undo" title="Αναίρεση">↶</button><button class="btn" id="db-cancel" title="Ακύρωση">✕</button><button class="btn primary" id="db-end">✓ Τέλος</button>';
      $('mapwrap').appendChild(b);
      b.querySelector('#db-undo').onclick = () => A.drawUndo();
      b.querySelector('#db-cancel').onclick = () => A.drawCancel();
      b.querySelector('#db-end').onclick = () => A.drawEnd();
    }
    if (D.on) {
      const n = ptsOf(D.id).length;
      const SHORT = { line: 'Γραμμή', poly: 'Πολυγρ.', spline: 'Spline', closed: 'Πολύγωνο' };
      b.querySelector('.mb-t').innerHTML = '✎ ' + esc(t(SHORT[D.kind])) + ' <span class="mb-w">' + n + '</span>';
    }
    b.classList.toggle('hidden', !D.on);
    const btn = $('btn-draw'); if (btn) btn.classList.toggle('active', D.on);
  }

  // Έναρξη: επιλογή τύπου και αν ξεκινά από το τελευταίο σημείο
  A.drawSheet = function () {
    if (D.on) return bar(), A.sheet(t('Σχεδίαση'), `<p>${t('Ανοιχτή')}: <b>${esc(t(KINDS[D.kind]))}</b> · ${ptsOf(D.id).length} ${t('σημεία')}</p>
      <div class="row"><button class="btn grow" id="dw-undo">↶ ${t('Αναίρεση τελευταίου')}</button><button class="btn grow" id="dw-cancel">✕ ${t('Ακύρωση γραμμής')}</button></div>
      <button class="btn primary big" id="dw-end">✓ ${t('Τέλος γραμμής')}</button>`, b => {
      b.querySelector('#dw-undo').onclick = () => { A.drawUndo(); A.closeSheet(); };
      b.querySelector('#dw-cancel').onclick = () => { A.drawCancel(); A.closeSheet(); };
      b.querySelector('#dw-end').onclick = () => { A.drawEnd(); A.closeSheet(); };
    });
    const last = [...A.proj.points].reverse().find(p => p.type === 'survey');
    A.sheet(t('Σχεδίαση από σημείο σε σημείο'), `
      <p class="muted">${t('Διάλεξε τύπο. Κάθε σημείο που μετράς από εδώ και πέρα μπαίνει στη γραμμή. Με «Τέλος» κλείνει, με «Ακύρωση» διαλύεται (τα σημεία μένουν). Στο DXF βγαίνει ως γραμμή/πολυγραμμή/spline.')}</p>
      <div class="grid2">${Object.keys(KINDS).map(k => `<button class="btn big ${k === D.kind ? 'primary' : ''}" data-k="${k}">${k === 'line' ? '╱' : k === 'poly' ? '⌒' : k === 'spline' ? '∿' : '⬠'} ${esc(t(KINDS[k]))}</button>`).join('')}</div>
      ${last ? `<label class="chk"><input type="checkbox" id="dw-last" checked> ${t('Ξεκίνα από το τελευταίο σημείο')} (${esc(last.name)})</label>` : ''}
      <label class="fld"><span>${t('Κωδικός γραμμής (προαιρετικό)')}</span><input id="dw-code" value="${esc($('sv-code') ? $('sv-code').value : '')}"></label>`, b => {
      b.querySelectorAll('button[data-k]').forEach(x => x.onclick = () => {
        D.kind = x.dataset.k; D.id = uid(); D.on = true;
        meta()[D.id] = { kind: D.kind, closed: D.kind === 'closed', code: b.querySelector('#dw-code').value.trim(), t: Date.now() };
        const cl = b.querySelector('#dw-last'); if (cl && cl.checked && last) { last.lineId = D.id; }
        A.saveProject(); A.updateMapLayers(); bar(); A.closeSheet();
        A.toast('✎ ' + t(KINDS[D.kind]) + ' — ' + t('μέτρα το επόμενο σημείο'), 'ok', 2500);
      });
    });
  };
  A.drawEnd = function () {
    if (!D.on) return;
    const n = ptsOf(D.id).length;
    if (n < 2) { delete meta()[D.id]; ptsOf(D.id).forEach(p => delete p.lineId); A.toast(t('Η γραμμή χρειάζεται 2+ σημεία — ακυρώθηκε')); }
    else A.toast('✓ ' + t('Γραμμή ολοκληρώθηκε') + ' (' + n + ')', 'ok');
    D.on = false; D.id = null; A.saveProject(); A.updateMapLayers(); bar();
  };
  A.drawCancel = function () {
    if (!D.on) return;
    ptsOf(D.id).forEach(p => delete p.lineId); delete meta()[D.id];
    D.on = false; D.id = null; A.saveProject(); A.updateMapLayers(); bar(); A.toast(t('Η γραμμή ακυρώθηκε — τα σημεία έμειναν'));
  };
  A.drawUndo = function () {
    if (!D.on) return;
    const ps = ptsOf(D.id); if (!ps.length) return;
    delete ps[ps.length - 1].lineId; A.saveProject(); A.updateMapLayers(); bar();
  };
  // το σημείο που μόλις αποθηκεύτηκε μπαίνει στην ανοιχτή γραμμή
  A.drawAttach = function (pt) { if (D.on && D.id && pt) { pt.lineId = D.id; bar(); return true; } return false; };
  // όταν σβήνεται το τελευταίο σημείο (φωνητικό «Σβήσε») η μπάρα ενημερώνεται
  A.drawRefresh = bar;

  // Spline για χάρτη/DXF: Catmull-Rom μέσα από τα σημεία (8 τμήματα ανά διάστημα)
  A.splinePts = function (pts, closed) {
    if (pts.length < 3) return pts.slice();
    const P = closed ? pts.concat([pts[0]]) : pts;
    const out = []; const N = P.length;
    const at = i => P[Math.max(0, Math.min(N - 1, i))];
    for (let i = 0; i < N - 1; i++) {
      const p0 = closed ? pts[(i - 1 + pts.length) % pts.length] : at(i - 1), p1 = P[i], p2 = P[i + 1], p3 = closed ? pts[(i + 2) % pts.length] : at(i + 2);
      for (let k = 0; k < 8; k++) {
        const u = k / 8, u2 = u * u, u3 = u2 * u;
        const c = (a, b, c2, d) => 0.5 * ((2 * b) + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u2 + (-a + 3 * b - 3 * c2 + d) * u3);
        out.push({ E: c(p0.E, p1.E, p2.E, p3.E), N: c(p0.N, p1.N, p2.N, p3.N), Z: (p1.Z != null && p2.Z != null) ? p1.Z + (p2.Z - p1.Z) * u : (p1.Z != null ? p1.Z : null) });
      }
    }
    out.push(P[N - 1]); return out;
  };

  // κουμπί στο dock του Survey
  function init() {
    const row = document.querySelector('.sv-act'); if (!row || $('btn-draw')) return;
    const b = document.createElement('button'); b.className = 'btn big icon'; b.id = 'btn-draw'; b.title = t('Σχεδίαση γραμμής'); b.innerHTML = '✎<small>' + t('Σχέδιο') + '</small>';
    const ph = $('btn-photo'); row.insertBefore(b, ph || null);
    b.onclick = () => A.drawSheet();
    bar();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
