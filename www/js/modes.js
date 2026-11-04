// HEXIS PAD — Συνεχής αποτύπωση (ανά απόσταση / χρόνο) και Static (μακρά στάση + καταγραφή δεδομένων δέκτη)
(function (g) {
  'use strict';
  const A = g.APP, $ = A.$, esc = A.esc;
  const t = s => (g.HI18N ? HI18N.t(s) : s);
  const P = () => g.Capacitor && g.Capacitor.Plugins && g.Capacitor.Plugins.HexisGnss;
  const native = () => g.Capacitor && g.Capacitor.isNativePlatform && g.Capacitor.isNativePlatform();
  const num = v => { const x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : null; };
  const F3 = v => v == null ? '—' : v.toFixed(3);
  const say = (el, en) => A.voice && A.voice.say && A.voice.say(el, en);

  // ---------- Μπάρα κατάστασης (πάνω στον χάρτη, δεν κρύβεται από τα παράθυρα) ----------
  function bar(on, html, onStop) {
    let b = $('mode-bar');
    if (!b) {
      b = document.createElement('div'); b.id = 'mode-bar'; b.className = 'hidden';
      b.innerHTML = '<div class="mb-t"></div><button class="btn" id="mb-stop">■ Διακοπή</button>';
      $('mapwrap').appendChild(b);
    }
    if (on) { b.querySelector('.mb-t').innerHTML = html; b.querySelector('#mb-stop').onclick = onStop; }
    b.classList.toggle('hidden', !on);
  }
  const unique = n => { while (A.findPoint(n)) n = A.nextName(n); return n; };

  // =========================== ΣΥΝΕΧΗΣ ΑΠΟΤΥΠΩΣΗ ===========================
  const C = A.cont = { on: false, n: 0 };
  A.contSheet = function () {
    if (C.on) return stopCont();
    const S = A.settings.cont = Object.assign({ by: 'd', d: 1, s: 2, onlyFix: true, maxH: 0.05 }, A.settings.cont || {});
    A.sheet('Συνεχής αποτύπωση', `<p class="muted">Το σημείο αποθηκεύεται αυτόματα καθώς περπατάς — για γραμμές, οδούς, πρανή, κράσπεδα, όρια.</p>
      <div class="seg" id="cb"><button data-v="d" class="${S.by === 'd' ? 'on' : ''}">Ανά απόσταση</button><button data-v="s" class="${S.by === 's' ? 'on' : ''}">Ανά χρόνο</button></div>
      <div class="row">
        <label class="fld grow" id="f-d"><span>Κάθε (m)</span><input id="cd" type="number" step="0.1" min="0.1" inputmode="decimal" value="${S.d}"></label>
        <label class="fld grow" id="f-s"><span>Κάθε (δευτ.)</span><input id="cs" type="number" step="1" min="1" inputmode="numeric" value="${S.s}"></label>
      </div>
      <div class="row">
        <label class="fld grow"><span>Πρώτο σημείο</span><input id="cn" value="${esc($('sv-name').value || '1')}"></label>
        <label class="fld grow"><span>Κωδικός</span><input id="cc" list="code-list" value="${esc($('sv-code').value || '')}"></label>
      </div>
      <label class="chk"><input type="checkbox" id="cf" ${S.onlyFix ? 'checked' : ''}> Μόνο σε FIX</label>
      <label class="fld"><span>Μέγιστο σH για αποθήκευση (m)</span><input id="ch" type="number" step="0.01" inputmode="decimal" value="${S.maxH}"></label>
      <label class="chk"><input type="checkbox" id="cl" ${$('sv-line').checked ? 'checked' : ''}> Σύνδεση σε γραμμή (ίδιος κωδικός)</label>
      <button class="btn primary big" id="cgo">▶ Έναρξη συνεχούς</button>
      <p class="muted">Διακοπή: κουμπί «■ Διακοπή» πάνω στον χάρτη, ή πες «Σταμάτα».</p>`, b => {
      const seg = () => { const v = b.querySelector('#cb .on').dataset.v; b.querySelector('#f-d').style.display = v === 'd' ? '' : 'none'; b.querySelector('#f-s').style.display = v === 's' ? '' : 'none'; };
      b.querySelectorAll('#cb button').forEach(x => x.onclick = () => { b.querySelectorAll('#cb button').forEach(y => y.classList.toggle('on', y === x)); seg(); });
      seg();
      b.querySelector('#cgo').onclick = () => {
        Object.assign(S, { by: b.querySelector('#cb .on').dataset.v, d: Math.max(0.1, num(b.querySelector('#cd').value) || 1), s: Math.max(1, num(b.querySelector('#cs').value) || 2), onlyFix: b.querySelector('#cf').checked, maxH: num(b.querySelector('#ch').value) || 0 });
        $('sv-name').value = b.querySelector('#cn').value.trim() || '1'; $('sv-code').value = b.querySelector('#cc').value.trim();
        $('sv-line').checked = b.querySelector('#cl').checked;
        A.saveSettings(); A.closeSheet(); startCont();
      };
    });
  };
  function startCont() {
    if (!A.pos) return A.toast(t('Δεν υπάρχει θέση — σύνδεσε δέκτη (Μενού → Σύνδεση δέκτη)'), 'bad', 3500);
    const S = A.settings.cont;
    C.on = true; C.n = 0; C.last = null; C.skip = '';
    C.f = p => {
      if (!C.on) return;
      let why = '';
      if (p.tiltBad) why = p.tiltBad;
      else if (S.onlyFix && p.fix !== 'fix') why = t('αναμονή FIX');
      else if (S.maxH && p.sh != null && p.sh > S.maxH) why = 'σH ' + p.sh.toFixed(3) + ' > ' + S.maxH;
      if (why) { C.skip = why; upd(); return; }
      C.skip = '';
      const L = C.last;
      const go = !L || (S.by === 'd' ? Math.hypot(p.E - L.E, p.N - L.N) >= S.d : (p.t - L.t) >= S.s * 1000);
      if (!go) { upd(); return; }
      try {
        const { pt, ev } = A.buildPoint({ eps: [p], fixAge: A.qc.fixSince ? (Date.now() - A.qc.fixSince) / 1000 : 0, jumps: 0 }, 1, { name: unique($('sv-name').value.trim() || '1') });
        pt.note = (pt.note ? pt.note + ' · ' : '') + (S.by === 'd' ? t('συνεχής') + ' ' + S.d + ' m' : t('συνεχής') + ' ' + S.s + ' s');
        A.storeSurvey(pt, ev, { force: true, btn: { id: 'cont' } });
        C.last = { E: p.E, N: p.N, t: p.t }; C.n++;
      } catch (e) { console.error(e); }
      upd();
    };
    A.epochListeners.push(C.f);
    A.toast('⟳ ' + t('Συνεχής αποτύπωση σε εξέλιξη'), 'ok');
    say('Συνεχής αποτύπωση', 'Continuous survey');
    upd(); if (A.ui) A.ui.refreshToolState();
  }
  let updT = 0;
  function upd() {
    const now = Date.now(); if (now - updT < 300) return; updT = now;
    const S = A.settings.cont;
    bar(true, `<b>⟳ ${t('Συνεχής')}</b> · ${S.by === 'd' ? S.d + ' m' : S.s + ' s'} · <b>${C.n}</b> ${t('σημεία')}${C.skip ? ` · <span class="mb-w">${esc(C.skip)}</span>` : ''}`, stopCont);
  }
  function stopCont() {
    if (!C.on) return;
    C.on = false; A.epochListeners = A.epochListeners.filter(x => x !== C.f);
    bar(false);
    A.toast('■ ' + t('Συνεχής αποτύπωση: τέλος') + ' — ' + C.n + ' ' + t('σημεία'), 'ok', 3000);
    say('Τέλος. ' + C.n + ' σημεία', 'Stopped. ' + C.n + ' points');
    if (A.ui) A.ui.refreshToolState();
  }
  A.stopCont = stopCont;

  // =========================== STATIC ===========================
  const ST = A.static = { on: false };
  A.staticSheet = function () {
    if (ST.on) return staticPanel();
    const S = A.settings.stat = Object.assign({ min: 15, raw: true, onlyFix: true }, A.settings.stat || {});
    A.sheet('Static μέτρηση', `<p class="muted">Ο δέκτης μένει ακίνητος πάνω στο σημείο για αρκετά λεπτά. Η εφαρμογή υπολογίζει τον μέσο όρο όλων των λύσεων με στατιστικά ακρίβειας, και ταυτόχρονα καταγράφει <b>όλα τα δεδομένα που στέλνει ο δέκτης</b> σε αρχείο για μεταγενέστερη επεξεργασία στο γραφείο.</p>
      <div class="row">
        <label class="fld grow"><span>Σημείο</span><input id="tn" value="${esc($('sv-name').value || '1')}"></label>
        <label class="fld grow"><span>Κωδικός</span><input id="tc" list="code-list" value="${esc($('sv-code').value || 'STATIC')}"></label>
      </div>
      <div class="row">
        <label class="fld grow"><span>Ύψος κεραίας (m)</span><input id="ta" type="number" step="0.001" inputmode="decimal" value="${esc($('sv-ant').value || '')}"></label>
        <label class="fld grow"><span>Διάρκεια</span><select id="td">${[5, 10, 15, 20, 30, 45, 60, 90, 120, 0].map(m => `<option value="${m}" ${m === S.min ? 'selected' : ''}>${m ? m + ' ' + 'λεπτά' : 'Μέχρι να το σταματήσω'}</option>`).join('')}</select></label>
      </div>
      <label class="chk"><input type="checkbox" id="tr" ${S.raw ? 'checked' : ''}> Καταγραφή δεδομένων δέκτη σε αρχείο (για μεταγενέστερη επεξεργασία)</label>
      <label class="chk"><input type="checkbox" id="tf" ${S.onlyFix ? 'checked' : ''}> Μέσος όρος μόνο από λύσεις FIX (αν δεν υπάρξει FIX, χρησιμοποιούνται όλες)</label>
      <div class="result warn" style="font-size:.92em">Για επεξεργασία στο γραφείο ο δέκτης πρέπει να στέλνει <b>ακατέργαστες παρατηρήσεις</b> (π.χ. RTCM3 MSM ή τη μορφή του κατασκευαστή) — ενεργοποίησέ τες από τις ρυθμίσεις του δέκτη. Πολλοί δέκτες έχουν και δική τους εσωτερική καταγραφή static.</div>
      <button class="btn primary big" id="tgo">▶ Έναρξη static</button>`, b => {
      b.querySelector('#tgo').onclick = async () => {
        Object.assign(S, { min: parseInt(b.querySelector('#td').value, 10) || 0, raw: b.querySelector('#tr').checked, onlyFix: b.querySelector('#tf').checked });
        A.saveSettings();
        const name = b.querySelector('#tn').value.trim() || '1', code = b.querySelector('#tc').value.trim();
        if (b.querySelector('#ta').value !== '') $('sv-ant').value = b.querySelector('#ta').value;
        A.closeSheet(); startStatic(name, code);
      };
    });
  };
  async function startStatic(name, code) {
    if (!A.pos) return A.toast(t('Δεν υπάρχει θέση — σύνδεσε δέκτη (Μενού → Σύνδεση δέκτη)'), 'bad', 3500);
    const S = A.settings.stat;
    Object.assign(ST, { on: true, name, code, t0: Date.now(), eps: [], all: 0, fixN: 0, lastT: 0, raw: null, bytes: 0 });
    if (S.raw && native()) {
      const d = new Date(), pad = x => String(x).padStart(2, '0');
      const fn = `${(A.proj.name || 'HEXIS').replace(A.RX_NOTNAME2, '_')}_${name}_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.gnss`;
      try { await P().rawLogStart({ name: fn }); ST.raw = fn; } catch (e) { A.toast(e.message || String(e), 'bad', 4000); }
    }
    ST.f = p => {
      if (!ST.on) return;
      ST.all++;
      if (p.fix === 'fix') ST.fixN++;
      // κρατάμε μία λύση ανά δευτερόλεπτο (σταθερή μνήμη ακόμη και για ώρες)
      if (p.t - ST.lastT < 950) return;
      ST.lastT = p.t; ST.eps.push(p);
      // τέλος χρόνου ελέγχεται και εδώ: στο παρασκήνιο (π.χ. κλήση) οι χρονομετρητές αραιώνουν, τα δεδομένα του δέκτη όχι
      const Sx = A.settings.stat; if (Sx.min && p.t - ST.t0 >= Sx.min * 60000) setTimeout(() => finishStatic(false), 0);
    };
    A.epochListeners.push(ST.f);
    ST.timer = setInterval(tick, 1000);
    A.toast('◷ ' + t('Static σε εξέλιξη — μην κουνάς τον δέκτη'), 'ok', 3500);
    say('Έναρξη static. Μην κουνάς τον δέκτη', 'Static started. Keep the receiver still');
    tick(); if (A.ui) A.ui.refreshToolState();
  }
  // μόνο FIX όταν υπάρχουν λύσεις FIX (αλλιώς όλες, με προειδοποίηση)
  function useEps() {
    const S = A.settings.stat;
    if (!S.onlyFix) return ST.eps;
    const f = ST.eps.filter(p => p.fix === 'fix');
    return f.length ? f : ST.eps;
  }
  function stats() {
    const e = useEps(); if (!e.length) return null;
    let sE = 0, sN = 0, sZ = 0, nZ = 0;
    for (const p of e) { sE += p.E; sN += p.N; if (p.Z != null) { sZ += p.Z; nZ++; } }
    const mE = sE / e.length, mN = sN / e.length, mZ = nZ ? sZ / nZ : null;
    let vH = 0, vZ = 0;
    for (const p of e) { vH += (p.E - mE) ** 2 + (p.N - mN) ** 2; if (p.Z != null && mZ != null) vZ += (p.Z - mZ) ** 2; }
    const n = e.length;
    return { n, E: mE, N: mN, Z: mZ, sH: n > 1 ? Math.sqrt(vH / (n - 1)) : null, sZ: nZ > 1 ? Math.sqrt(vZ / (nZ - 1)) : null };
  }
  const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  async function tick() {
    if (!ST.on) return;
    const S = A.settings.stat, el = (Date.now() - ST.t0) / 1000;
    if (ST.raw && native()) { try { const r = await P().rawLogStatus(); ST.bytes = r.bytes || 0; } catch (e) { } }
    const st = stats();
    const left = S.min ? Math.max(0, S.min * 60 - el) : null;
    bar(true, `<b>◷ Static ${esc(ST.name)}</b> · ${mmss(el)}${S.min ? ' / ' + S.min + "'" : ''} · ${st ? st.n : 0} ${t('λύσεις')}${st && st.sH != null ? ' · σH ' + F3(st.sH) : ''}${ST.raw ? ' · ⏺ ' + (ST.bytes / 1048576).toFixed(1) + ' MB' : ''}`, () => finishStatic(true));
    const pnl = $('st-live'); if (pnl) pnl.innerHTML = liveHtml(el, st);
    if (left === 0) finishStatic(false);
  }
  function liveHtml(el, st) {
    const fixPct = ST.all ? Math.round(ST.fixN / ST.all * 100) : 0;
    return `<table class="kv"><tr><td>Χρόνος</td><td><b>${mmss(el)}</b></td></tr><tr><td>Λύσεις στον μέσο όρο</td><td>${st ? st.n : 0}</td></tr>
      <tr><td>FIX</td><td>${fixPct}%</td></tr><tr><td>X / Y</td><td>${st ? F3(st.E) + ' / ' + F3(st.N) : '—'}</td></tr><tr><td>Z</td><td>${st ? F3(st.Z) : '—'}</td></tr>
      <tr><td>σH / σV</td><td>${st ? F3(st.sH) + ' / ' + F3(st.sZ) : '—'}</td></tr>${ST.raw ? `<tr><td>Αρχείο δέκτη</td><td>${(ST.bytes / 1048576).toFixed(2)} MB</td></tr>` : ''}</table>`;
  }
  function staticPanel() {
    A.sheet('Static ' + ST.name, `<div id="st-live">${liveHtml((Date.now() - ST.t0) / 1000, stats())}</div>
      <div class="row"><button class="btn grow" id="st-x">✕ Ακύρωση</button><button class="btn primary grow" id="st-ok">■ Τέλος και αποθήκευση</button></div>`, b => {
      b.querySelector('#st-ok').onclick = () => { A.closeSheet(); finishStatic(true); };
      b.querySelector('#st-x').onclick = () => A.confirm('Static', 'Ακύρωση χωρίς αποθήκευση σημείου; (το αρχείο δεδομένων του δέκτη κρατιέται)', 'Ακύρωση static', () => finishStatic(true, true));
    });
  }
  async function finishStatic(manual, discard) {
    if (!ST.on) return;
    ST.on = false; clearInterval(ST.timer);
    A.epochListeners = A.epochListeners.filter(x => x !== ST.f);
    bar(false); if (A.ui) A.ui.refreshToolState();
    const dur = Math.round((Date.now() - ST.t0) / 1000);
    let raw = null;
    if (ST.raw && native()) { try { raw = await P().rawLogStop(); } catch (e) { A.toast(e.message || String(e), 'bad', 4000); } }
    let pt = null;
    const E = useEps();
    const noFix = A.settings.stat.onlyFix && E.length && !E.some(p => p.fix === 'fix');
    if (!discard && E.length) {
      try {
        const r = A.buildPoint({ eps: E, fixAge: dur, jumps: 0 }, E.length, { name: unique(ST.name), code: ST.code });
        pt = r.pt;
        pt.static = { sec: dur, n: ST.eps.length, file: raw && raw.path ? raw.path : null };
        pt.note = 'STATIC ' + mmss(dur) + (noFix ? ' · ΧΩΡΙΣ FIX' : '') + (raw && raw.path ? ' · ' + raw.path.split('/').pop() : '');
        A.storeSurvey(pt, r.ev, { force: true, btn: { id: 'static' } });
      } catch (e) { console.error(e); A.toast(e.message, 'bad'); }
    }
    if (!manual) { A.sound('point'); }
    say(pt ? 'Static τέλος. Αποθηκεύτηκε ' + pt.name : 'Static τέλος', pt ? 'Static done. Saved ' + pt.name : 'Static done');
    A.sheet('Static — αποτέλεσμα', `${pt ? `<div class="result ${noFix ? 'warn' : 'ok'}"><b>${esc(pt.name)}</b> ${t('αποθηκεύτηκε')}${noFix ? ' — ' + t('δεν υπήρξε FIX, μέσος όρος από FLOAT/αυτόνομες λύσεις') : ''}</div>
      <table class="kv"><tr><td>Διάρκεια</td><td>${mmss(dur)}</td></tr><tr><td>Λύσεις</td><td>${pt.epochs}</td></tr><tr><td>X / Y</td><td>${F3(pt.E)} / ${F3(pt.N)}</td></tr><tr><td>Z</td><td>${F3(pt.Z)}</td></tr><tr><td>σH / σV</td><td>${F3(pt.hrms)} / ${F3(pt.vrms)}</td></tr></table>` : `<div class="result warn">${discard ? t('Χωρίς αποθήκευση σημείου') : t('Δεν συλλέχθηκαν λύσεις')}</div>`}
      ${raw && raw.path ? `<p>⏺ ${t('Αρχείο δεδομένων δέκτη')}: <b>${esc(raw.path)}</b> (${((raw.bytes || 0) / 1048576).toFixed(2)} MB)</p>${raw.bytes ? '' : `<p class="muted">${t('Το αρχείο είναι κενό — ο δέκτης δεν έστειλε δεδομένα.')}</p>`}
      <button class="btn" id="st-sh">⇪ Κοινή χρήση / email αρχείου</button>` : ''}
      <button class="btn primary" id="st-close">OK</button>`, b => {
      const sh = b.querySelector('#st-sh'); if (sh) sh.onclick = () => P().shareFile({ file: raw.file }).catch(e => A.toast(e.message, 'bad'));
      b.querySelector('#st-close').onclick = () => A.closeSheet();
    });
  }
  A.stopStatic = () => finishStatic(true);

  // η φωνητική εντολή «Σταμάτα» σταματά και τη συνεχή αποτύπωση
  if (A.voice && A.voice.act) {
    const act0 = A.voice.act;
    A.voice.act = a => { if (a === 'cancel' && C.on) return stopCont(); return act0(a); };
  }
})(window);
