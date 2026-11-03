// HEXIS PAD — φωνητικές εντολές («Πάρε», «Σβήσε», «Επόμενο»…) και φωνητική επιβεβαίωση
(function (g) {
  'use strict';
  const A = g.APP, $ = A.$;
  const t = s => (g.HI18N ? HI18N.t(s) : s);
  const P = () => g.Capacitor && g.Capacitor.Plugins && g.Capacitor.Plugins.HexisGnss;
  const native = () => g.Capacitor && g.Capacitor.isNativePlatform && g.Capacitor.isNativePlatform();
  const isEn = () => g.HI18N && HI18N.lang() === 'en';

  // Λέξεις-εντολές (χωρίς τόνους, πεζά). Αναγνωρίζονται και στα ελληνικά και στα αγγλικά.
  const CMDS = [
    { a: 'take', w: ['παρε', 'παρτο', 'παρ το', 'παρε σημειο', 'μετρα', 'μετρησε', 'μετρηση', 'καταγραφη', 'καταγραψε', 'take', 'take point', 'measure', 'shoot', 'record'] },
    { a: 'undo', w: ['αναιρεση', 'αναιρεσε', 'επαναφορα', 'undo', 'restore'] },
    { a: 'del', w: ['σβησε', 'σβησ το', 'σβηστο', 'σβησε το', 'διαγραφη', 'διεγραψε', 'διαγραψε', 'delete', 'delete last', 'erase'] },
    { a: 'next', w: ['επομενο', 'επομενος', 'επομενη', 'next'] },
    { a: 'prev', w: ['προηγουμενο', 'προηγουμενος', 'προηγουμενη', 'previous', 'back'] },
    { a: 'cancel', w: ['ακυρο', 'ακυρωση', 'ακυρωσε', 'σταματα', 'στοπ', 'stop', 'cancel'] },
  ];
  const norm = s => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  CMDS.forEach(c => c.n = c.w.map(w => ' ' + norm(w) + ' '));
  function match(text) {
    // πολλές εκδοχές «α | β | γ» — ελέγχεται η καθεμία
    for (const alt of String(text).split('|')) {
      const s = ' ' + norm(alt) + ' ';
      for (const c of CMDS) if (c.n.some(w => s.includes(w))) return c.a;
    }
    return null;
  }

  const V = A.voice = { on: false, match };
  let handledSeq = -1, lastAct = 0;

  function say(el, en) {
    if (A.settings.voiceSay === false) return;
    const text = isEn() ? en : el;
    try {
      if (native()) P().speak({ text, lang: isEn() ? 'en-US' : 'el-GR' });
      else if (g.speechSynthesis) { const u = new SpeechSynthesisUtterance(text); u.lang = isEn() ? 'en-US' : 'el-GR'; speechSynthesis.cancel(); speechSynthesis.speak(u); }
    } catch (e) { }
  }
  V.say = say;

  const stakeMode = () => !$('so-fullscreen').classList.contains('hidden') || (A.tab === 'stake' && !$('dock').classList.contains('hidden'));

  function act(a) {
    const now = Date.now();
    if (now - lastAct < 900) return; // προστασία από διπλή εκτέλεση
    lastAct = now;
    switch (a) {
      case 'take':
        if (A._cancelCollect) return say('Μέτρηση σε εξέλιξη', 'Measuring'); // ποτέ δεν ακυρώνει κατά λάθος
        { const hm = !$('sheet').classList.contains('hidden') && $('ll-meas'); if (hm) { hm.click(); break; } } // δυσπρόσιτο: επόμενο από τα 4 σημεία
        if (stakeMode()) A.storeStake(); else A.measure();
        break;
      case 'cancel':
        if (A._cancelCollect) { A._cancelCollect(); say('Ακύρωση', 'Cancelled'); }
        break;
      case 'del': A.deleteLast(); break;
      case 'undo': A.undoDelete(); break;
      case 'next': if (stakeMode()) { $('so-next').click(); say('Επόμενο ' + ((A.stake.target && A.stake.target.name) || ''), 'Next ' + ((A.stake.target && A.stake.target.name) || '')); } break;
      case 'prev': if (stakeMode()) { $('so-prev').click(); say('Προηγούμενο ' + ((A.stake.target && A.stake.target.name) || ''), 'Previous ' + ((A.stake.target && A.stake.target.name) || '')); } break;
    }
  }
  V.act = act;

  function onText(d) {
    if (!d || d.type !== 'text') {
      if (d && d.type === 'error') { A.toast(t(d.text), 'bad', 3500); stop(true); }
      return;
    }
    if (d.seq === handledSeq) return; // μία εντολή ανά φράση (μερικό + τελικό αποτέλεσμα)
    const a = match(d.text);
    if (!a) return;
    handledSeq = d.seq;
    showHeard(d.text.split('|')[0].trim());
    V.act(a);
  }
  function showHeard(s) {
    const b = $('voice-ind'); if (!b) return;
    b.querySelector('span').textContent = '«' + s + '»';
    clearTimeout(b._t); b._t = setTimeout(() => { b.querySelector('span').textContent = t('Ακούω…'); }, 1800);
  }

  let listenH = null, webRec = null;
  async function start() {
    try {
      if (native()) {
        if (!listenH) listenH = await P().addListener('voice', onText);
        await P().voiceStart({ lang: isEn() ? 'en-US' : 'el-GR' });
      } else {
        const R = g.SpeechRecognition || g.webkitSpeechRecognition;
        if (!R) throw new Error(t('Οι φωνητικές εντολές λειτουργούν στην εφαρμογή Android'));
        let seq = 0;
        webRec = new R(); webRec.lang = isEn() ? 'en-US' : 'el-GR'; webRec.continuous = true; webRec.interimResults = true;
        webRec.onresult = e => { const r = e.results[e.results.length - 1]; onText({ type: 'text', text: r[0].transcript, seq: seq + e.results.length }); if (r.isFinal) seq += 1000; };
        webRec.onend = () => { if (V.on) try { webRec.start(); } catch (e) { } };
        webRec.start();
      }
      V.on = true; ind(true);
      A.toast('🎙 ' + t('Φωνητικές εντολές ενεργές — πες «Πάρε»'), 'ok', 3000);
    } catch (e) { V.on = false; ind(false); A.toast(e.message || String(e), 'bad', 4000); }
    if (A.ui) A.ui.refreshToolState();
  }
  async function stop(quiet) {
    V.on = false; ind(false);
    try { if (native()) await P().voiceStop(); else if (webRec) webRec.stop(); } catch (e) { }
    if (!quiet) A.toast(t('Φωνητικές εντολές ανενεργές'));
    if (A.ui) A.ui.refreshToolState();
  }
  V.start = start; V.stop = stop;
  V.toggle = () => { A.settings.voice = !V.on; A.saveSettings && A.saveSettings(); return V.on ? stop() : start(); };

  // ένδειξη «ακούω» πάνω στον χάρτη — πάτημα = απενεργοποίηση
  function ind(on) {
    let b = $('voice-ind');
    if (!b) {
      b = document.createElement('button'); b.id = 'voice-ind'; b.className = 'hidden';
      b.innerHTML = '🎙 <span></span>';
      b.title = 'Πάτα για απενεργοποίηση';
      b.onclick = () => V.toggle();
      $('mapwrap').appendChild(b);
    }
    b.querySelector('span').textContent = t('Ακούω…');
    b.classList.toggle('hidden', !on);
  }

  // ---------- Σβήσιμο τελευταίου μετρημένου σημείου (με αναίρεση) ----------
  let undo = null;
  A.lastSurveyed = function () {
    const pts = A.proj.points;
    for (let i = pts.length - 1; i >= 0; i--) if (pts[i].type === 'survey' || pts[i].type === 'staked') return pts[i];
    return null;
  };
  A.deleteLast = function () {
    const p = A.lastSurveyed();
    if (!p) { A.toast(t('Δεν υπάρχει μετρημένο σημείο'), 'bad'); say('Δεν υπάρχει σημείο', 'No point'); return; }
    if (undo) finalizeUndo();
    const P2 = A.proj, idx = P2.points.indexOf(p), prevNext = P2.nextName;
    P2.points.splice(idx, 1);
    // ο επόμενος αριθμός ξαναπαίρνει το όνομα που σβήστηκε (π.χ. ξανά P12)
    if (p.type === 'survey' && A.nextName(p.name) === P2.nextName) { P2.nextName = p.name; $('sv-name').value = p.name; $('sv-mini').textContent = p.name; }
    if (A.stake.target === p) A.setTarget(null);
    A.saveProject(); A.renderPoints(); A.updateMapLayers();
    undo = { p, idx, prevNext, timer: setTimeout(finalizeUndo, 15000) };
    undoBar(true, p.name);
    say('Διαγράφηκε ' + p.name, 'Deleted ' + p.name);
    A.sound && A.sound('lost');
  };
  function finalizeUndo() {
    if (!undo) return;
    clearTimeout(undo.timer);
    (undo.p.photos || []).forEach(ph => { try { HIO.photoDel(ph.id); } catch (e) { } });
    undo = null; undoBar(false);
  }
  A.undoDelete = function () {
    if (!undo) { say('Τίποτα για αναίρεση', 'Nothing to undo'); return; }
    clearTimeout(undo.timer);
    const { p, idx, prevNext } = undo; undo = null;
    A.proj.points.splice(Math.min(idx, A.proj.points.length), 0, p);
    A.proj.nextName = prevNext; $('sv-name').value = prevNext; $('sv-mini').textContent = prevNext;
    A.saveProject(); A.renderPoints(); A.updateMapLayers();
    undoBar(false);
    A.toast('↶ ' + t('Επαναφέρθηκε') + ' ' + p.name, 'ok');
    say('Επαναφέρθηκε ' + p.name, 'Restored ' + p.name);
  };
  function undoBar(on, name) {
    let b = $('undo-bar');
    if (!b) {
      b = document.createElement('div'); b.id = 'undo-bar'; b.className = 'hidden';
      b.innerHTML = '<span></span><button class="btn" id="undo-go">↶ Αναίρεση</button>';
      document.body.appendChild(b);
      b.querySelector('#undo-go').onclick = () => A.undoDelete();
    }
    if (on) b.querySelector('span').textContent = t('Διαγράφηκε') + ' ' + name;
    b.classList.toggle('hidden', !on);
  }

  // φωνητική επιβεβαίωση αποθήκευσης σημείου
  const md = A.markDone;
  A.markDone = function (btn, name) {
    md.apply(this, arguments);
    if (V.on && name) say('Αποθηκεύτηκε ' + name, 'Saved ' + name);
  };

  // αυτόματη ενεργοποίηση αν ήταν ανοιχτή την προηγούμενη φορά
  setTimeout(() => { if (A.settings.voice && native()) start(); }, 2500);
  document.addEventListener('visibilitychange', () => {
    if (!V.on || !native()) return;
    // στο παρασκήνιο κλείνει το μικρόφωνο, ανοίγει ξανά μόλις επιστρέψεις
    if (document.visibilityState === 'hidden') { try { P().voiceStop(); } catch (e) { } }
    else { try { P().voiceStart({ lang: isEn() ? 'en-US' : 'el-GR' }); } catch (e) { } }
  });
})(window);
