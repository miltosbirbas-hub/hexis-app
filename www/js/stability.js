// HEXIS PAD — σταθερότητα και ενημερώσεις
// · κανένα σφάλμα δεν σταματά την εφαρμογή (καταγράφεται, συνεχίζει)
// · αυτόματη επανασύνδεση δέκτη/laser όταν χαθεί το Bluetooth
// · μόνιμη αποθήκευση δεδομένων (το Android δεν τα σβήνει)
// · έλεγχος για νέα έκδοση και εγκατάσταση με ένα πάτημα
(function (g) {
  'use strict';
  const A = g.APP, $ = A.$;
  const t = s => (g.HI18N ? HI18N.t(s) : s);

  // ---------- Σφάλματα: καταγραφή, όχι πάγωμα ----------
  const LOG_KEY = 'hexis_pad_errors';
  function logErr(msg) {
    try {
      const l = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
      l.unshift({ t: new Date().toISOString(), m: String(msg).slice(0, 400) });
      localStorage.setItem(LOG_KEY, JSON.stringify(l.slice(0, 50)));
    } catch (e) { }
  }
  let lastShown = 0;
  function report(msg) {
    logErr(msg);
    const now = Date.now();
    if (now - lastShown > 8000) { lastShown = now; try { A.toast(t('Κάτι δεν πήγε καλά — η εργασία συνεχίζεται. Τα δεδομένα σου είναι αποθηκευμένα.'), 'bad', 3500); } catch (e) { } }
  }
  g.addEventListener('error', e => { if (e && e.message && !/ResizeObserver/.test(e.message)) report(e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno); });
  g.addEventListener('unhandledrejection', e => { const r = e && e.reason; const m = r && r.message ? r.message : String(r); if (!/Ακυρώθηκε|Cancel/.test(m)) report(m); });
  A.errorLog = () => { try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { return []; } };

  // ---------- Μόνιμη αποθήκευση ----------
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }
  // αποθήκευση έργου όταν η εφαρμογή πάει στο παρασκήνιο
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && A.proj) A.saveProject(true); });
  g.addEventListener('pagehide', () => { if (A.proj) A.saveProject(true); });

  // ---------- Αυτόματη επανασύνδεση Bluetooth ----------
  const want = { gnss: null, laser: null, base: null };
  const origConnect = HCONN.connect;
  HCONN.connect = async function (cfg) {
    const r = await origConnect.call(HCONN, cfg);
    const ch = cfg.channel || 'gnss';
    if (cfg.type === 'bt' || cfg.type === 'tcp' || cfg.type === 'ble') want[ch] = Object.assign({}, cfg); else want[ch] = null;
    return r;
  };
  const origDisc = HCONN.disconnect;
  HCONN.disconnect = async function (ch) { want[ch || 'gnss'] = null; return origDisc.call(HCONN, ch); };
  const retry = {};
  HCONN.on('status', d => {
    const ch = d.channel;
    if (!want[ch] || d.state !== 'disconnected' || d.reason !== 'lost') return;
    if (retry[ch]) return;
    let n = 0;
    A.toast(t('Χάθηκε η σύνδεση') + (ch === 'gnss' ? ' ' + t('με τον δέκτη') : '') + ' — ' + t('επανασύνδεση…'), 'bad', 3000);
    A.sound && A.sound('lost');
    const tryOnce = async () => {
      if (!want[ch]) { retry[ch] = null; return; }
      n++;
      try { await origConnect.call(HCONN, want[ch]); retry[ch] = null; A.toast('✓ ' + t('Επανασυνδέθηκε'), 'ok'); A.sound && A.sound('fix');
        if (ch === 'gnss' && A.settings.ntrip && A.settings.ntrip.auto && A.settings.ntrip.host && A.startNtrip) A.startNtrip();
      } catch (e) { retry[ch] = setTimeout(tryOnce, Math.min(15000, 2000 + n * 1500)); }
    };
    retry[ch] = setTimeout(tryOnce, 1500);
  });

  // ---------- Δέκτης συνδεδεμένος αλλά χωρίς NMEA: αυτόματη ενεργοποίηση εξόδου ----------
  let lastGga = 0, wakeT = null;
  HCONN.on('nmea', d => { if (d.channel === 'gnss' && /^\$..GGA/.test(d.line || '')) lastGga = Date.now(); });
  const WAKE = [
    // Unicore (UM980/UM982, πολλοί κινέζικοι δέκτες): έξοδος στη θύρα από την οποία ήρθε η εντολή
    'GPGGA 1', 'GPGST 1', 'GPGSA 1', 'GPRMC 1',
    // ίδιες εντολές σε κάθε θύρα: σε πολλούς δέκτες το Bluetooth είναι εσωτερικά COM1/COM2/COM3
    'GPGGA COM1 1', 'GPGGA COM2 1', 'GPGGA COM3 1', 'GPGST COM1 1', 'GPGST COM2 1', 'GPGST COM3 1', 'GPGSA COM1 1', 'GPGSA COM2 1', 'GPGSA COM3 1',
    // NovAtel / ComNav
    'LOG GPGGA ONTIME 1', 'LOG GPGST ONTIME 1', 'LOG GPGSA ONTIME 1',
    // μηνύματα θέσης που η εφαρμογή διαβάζει και χωρίς NMEA (Unicore / NovAtel)
    'BESTNAVA 1', 'BESTPOSA 1', 'LOG BESTPOSA ONTIME 1',
  ];
  // ενημέρωση όταν η θέση έρχεται από αποκωδικοποίηση πρωτοκόλλου (όχι NMEA)
  let fmtShown = '';
  setInterval(async () => {
    if (!HIO.isNative() || HCONN.state.gnss !== 'on') { fmtShown = ''; return; }
    const st = await stats(); if (st && st.format && st.format !== fmtShown) { fmtShown = st.format; A.toast('📡 ' + t('Αναγνωρίστηκε πρωτόκολλο δέκτη') + ': ' + st.format, 'ok', 4000); }
  }, 5000);
  async function stats() { try { return await g.Capacitor.Plugins.HexisGnss.connStats({ channel: 'gnss' }); } catch (e) { return null; } }
  HCONN.on('status', d => {
    if (d.channel !== 'gnss' || d.state !== 'connected' || !HIO.isNative()) return;
    const G = A.settings.gnss || {}; if (G.type !== 'bt' && G.type !== 'tcp') return;
    const t0 = Date.now(); clearTimeout(wakeT);
    wakeT = setTimeout(async () => {
      if (lastGga > t0 || HCONN.state.gnss !== 'on') return;
      // κλασικό Bluetooth χωρίς κανένα byte → δοκιμή μέσω Bluetooth Low Energy (πολλοί δέκτες στέλνουν εκεί)
      const s0 = await stats();
      if (s0 && s0.bytes === 0 && G.type === 'bt' && G.address && !G.ble && !A._bleTried) {
        A._bleTried = true;
        A.toast(t('Δεν έρχονται δεδομένα — δοκιμή σύνδεσης BLE…'), '', 3500);
        try { await HCONN.connect({ type: 'ble', address: G.address, channel: 'gnss' }); G.ble = true; A.saveSettings(); A.toast('✓ ' + t('Συνδέθηκε μέσω BLE'), 'ok'); return; }
        catch (e) { A.toast('BLE: ' + (e.message || e), 'bad', 3500); try { await HCONN.connect({ type: 'bt', address: G.address, channel: 'gnss' }); } catch (e2) { } return; }
      }
      A.toast(t('Ο δέκτης δεν στέλνει θέση (NMEA) — στέλνω εντολές ενεργοποίησης…'), '', 3500);
      for (const c of WAKE) { try { await HCONN.write('gnss', c + '\r\n'); } catch (e) { } await new Promise(r => setTimeout(r, 120)); }
      wakeT = setTimeout(async () => {
        const s = await stats();
        if (lastGga > t0 || HCONN.state.gnss !== 'on') { if (lastGga > t0) A.toast('✓ ' + t('Ο δέκτης στέλνει πλέον θέση') + (s && s.format ? ' (' + s.format + ')' : ''), 'ok', 4000); return; }
        if (s && s.bytes === 0 && G.ble) { G.ble = false; A.saveSettings(); }
        const msg = s && s.bytes > 0
          ? t('Ο δέκτης στέλνει δεδομένα αλλά όχι θέση NMEA (GGA)') + ' (' + s.bytes + ' bytes). ' + t('Ενεργοποίησε την έξοδο NMEA GGA στο Bluetooth από την εφαρμογή του κατασκευαστή.')
          : t('Δεν έρχεται τίποτα από τον δέκτη. Μήπως είναι συνδεδεμένος σε άλλη συσκευή (χειριστήριο / εφαρμογή κατασκευαστή); Κλείσε την άλλη σύνδεση ή σβήσε-άναψε τον δέκτη.');
        A.sheet(t('Ο δέκτης δεν στέλνει θέση'), '<div class="result warn">' + A.esc(msg) + '</div><p class="muted">' + t('Η εφαρμογή χρειάζεται από τον δέκτη μηνύματα NMEA: GGA (θέση, απαραίτητο), GST (ακρίβεια), GSA (PDOP), 1 φορά το δευτερόλεπτο.') + '</p>' + '<button class="btn primary" id="nw-wifi">📶 ' + t('Σύνδεση μέσω Wi-Fi δέκτη') + '</button>' + (s && s.bytes > 0 ? '<button class="btn" id="nw-diag">🔎 ' + t('Δείγμα δεδομένων δέκτη') + '</button>' : '') + '<button class="btn primary" id="nw-ok">OK</button>', b => {
          b.querySelector('#nw-ok').onclick = () => A.closeSheet();
          const dg = b.querySelector('#nw-diag'); if (dg) dg.onclick = () => A.receiverDiag();
          const wf = b.querySelector('#nw-wifi'); if (wf) wf.onclick = () => A.wifiSetup();
        });
      }, 6000);
    }, 6000);
  });

  // Διαγνωστικό: τι ακριβώς στέλνει ο δέκτης (κείμενο + hex) — για αναγνώριση πρωτοκόλλου
  A.receiverDiag = async function () {
    if (!HIO.isNative() || HCONN.state.gnss !== 'on') return A.toast(t('Σύνδεσε πρώτα τον δέκτη'), 'bad');
    A.sheet(t('Δείγμα δεδομένων δέκτη'), '<p>⏳ ' + t('Καταγραφή 4 δευτερολέπτων…') + '</p>');
    let r; try { r = await g.Capacitor.Plugins.HexisGnss.sniff({ ms: 4000 }); } catch (e) { return A.toast(e.message || String(e), 'bad'); }
    const sync = r.hex.slice(0, 8).replace(/\s/g, '');
    let guess = '';
    if (/\$[A-Z]{2}[A-Z]{3},/.test(r.ascii)) guess = t('Υπάρχουν μηνύματα NMEA — αλλά όχι GGA.');
    else if (/^AA44(12|B5)/i.test(sync) || /AA 44 (12|B5)/i.test(r.hex)) guess = t('Δυαδικό πρωτόκολλο τύπου Unicore/NovAtel.');
    else if (/^B562/i.test(sync) || /B5 62/i.test(r.hex)) guess = t('Δυαδικό πρωτόκολλο u-blox (UBX).');
    else if (/D3 0[0-3]/i.test(r.hex)) guess = t('Διορθώσεις RTCM3 (όχι θέση).');
    else if (/#[A-Z]+A,/.test(r.ascii)) guess = t('Μηνύματα κειμένου Unicore (#…A).');
    A.sheet(t('Δείγμα δεδομένων δέκτη'), '<div class="result">' + r.n + ' bytes / 4 s' + (guess ? '<br><b>' + A.esc(guess) + '</b>' : '') + '</div>'
      + '<h4>' + t('Κείμενο') + '</h4><pre class="raw" style="white-space:pre-wrap;max-height:30vh;overflow:auto;font-size:12px">' + A.esc(r.ascii.slice(0, 1500)) + '</pre>'
      + '<h4>Hex</h4><pre class="raw" style="white-space:pre;max-height:24vh;overflow:auto;font-size:12px">' + A.esc(r.hex) + '</pre>'
      + '<p class="muted">' + t('Στείλε φωτογραφία αυτής της οθόνης για να προστεθεί υποστήριξη του δέκτη σου.') + '</p>'
      + '<div class="row"><button class="btn grow" id="dg-cp">📋 ' + t('Αντιγραφή') + '</button><button class="btn primary grow" id="dg-ok">OK</button></div>', b => {
      b.querySelector('#dg-ok').onclick = () => A.closeSheet();
      b.querySelector('#dg-cp').onclick = async () => { try { await navigator.clipboard.writeText('HEXIS PAD diag ' + r.n + ' bytes\n' + r.hex + '\n---\n' + r.ascii.slice(0, 1500)); A.toast('✓ ' + t('Αντιγράφηκε'), 'ok'); } catch (e) { A.toast(t('Δεν επιτράπηκε η αντιγραφή'), 'bad'); } };
    });
  };

  // ---------- Ελαφριά ενημέρωση οθόνης: ο χάρτης σχεδιάζει μόνο όταν φαίνεται ----------
  document.addEventListener('visibilitychange', () => {
    if (A.map) A.map._paused = document.visibilityState === 'hidden';
    // επιστροφή (π.χ. μετά από κλήση): όλα συνεχίζουν — απλώς ανανεώνεται η οθόνη
    if (document.visibilityState === 'visible') { try { A.updateStatus(); A.updatePos(); A.updateGuidance && A.updateGuidance(); A.map && A.map.redraw(); } catch (e) { } }
  });
  // άδεια ειδοποιήσεων (Android 13+) την πρώτη φορά που συνδέεται δέκτης — για την ειδοποίηση «HEXIS PAD σε λειτουργία»
  HCONN.on('status', d => {
    if (d.state !== 'connected' || !HIO.isNative()) return;
    try { if (localStorage.getItem('hexis_pad_notif')) return; localStorage.setItem('hexis_pad_notif', '1'); } catch (e) { }
    try { g.Capacitor.Plugins.HexisGnss.notifPermission(); } catch (e) { }
  });

  // ---------- Ενημερώσεις εφαρμογής ----------
  const VERSION_URL = 'https://github.com/miltosbirbas-hub/hexis-app/releases/download/pad-apk/version.json';
  async function currentBuild() {
    try { const i = await g.Capacitor.Plugins.App.getInfo(); return parseInt(i.build, 10) || 0; } catch (e) { return 0; }
  }
  A.checkUpdate = async function (manual) {
    if (!HIO.isNative()) { if (manual) A.toast(t('Οι ενημερώσεις γίνονται από την εφαρμογή Android')); return; }
    try {
      const r = await fetch(VERSION_URL + '?t=' + Date.now(), { cache: 'no-store' });
      const v = await r.json();
      const cur = await currentBuild();
      if (v && v.build > cur) offer(v, cur);
      else if (manual) A.toast('✓ ' + t('Έχεις την τελευταία έκδοση') + ' (1.0.' + cur + ')', 'ok');
    } catch (e) { if (manual) A.toast(t('Δεν ήταν δυνατός ο έλεγχος — χρειάζεται σύνδεση στο διαδίκτυο'), 'bad'); }
  };
  function offer(v, cur) {
    A.sheet(t('Νέα έκδοση HEXIS PAD'), `<div class="result ok"><b>${t('Διαθέσιμη η έκδοση')} ${A.esc(v.version)}</b><br>${t('Τρέχουσα')}: 1.0.${cur}</div>
      <p>${t('Η ενημέρωση εγκαθίσταται πάνω στην υπάρχουσα — τα έργα, τα σημεία και οι φωτογραφίες σου μένουν.')}</p>
      <p class="muted">${t('Την πρώτη φορά το Android ζητά να επιτρέψεις «Εγκατάσταση άγνωστων εφαρμογών» για το HEXIS PAD.')}</p>
      <div id="up-p" class="muted"></div>
      <div class="row"><button class="btn grow" id="up-later">${t('Αργότερα')}</button><button class="btn primary grow" id="up-go">⤓ ${t('Ενημέρωση τώρα')}</button></div>`, b => {
      b.querySelector('#up-later').onclick = () => { A.closeSheet(); try { localStorage.setItem('hexis_pad_skip', String(v.build)); } catch (e) { } };
      b.querySelector('#up-go').onclick = async () => {
        if (A.proj) A.saveProject(true);
        const btn = b.querySelector('#up-go'); btn.disabled = true; btn.textContent = '⏳ ' + t('Λήψη…');
        const P = g.Capacitor.Plugins.HexisGnss;
        const h = await P.addListener('updateProgress', d => { const el = b.querySelector('#up-p'); if (el && d.total > 0) el.textContent = Math.round(d.done / d.total * 100) + '%'; });
        try { await P.installUpdate({ url: v.url }); } catch (e) { A.toast(e.message || String(e), 'bad', 4000); btn.disabled = false; btn.textContent = '⤓ ' + t('Ενημέρωση τώρα'); }
        try { h.remove(); } catch (e) { }
      };
    });
  }
  // αυτόματος έλεγχος: λίγο μετά την εκκίνηση και κάθε 6 ώρες (χωρίς να διακόπτει μέτρηση)
  setTimeout(async () => {
    if (!HIO.isNative()) return;
    try {
      const r = await fetch(VERSION_URL + '?t=' + Date.now(), { cache: 'no-store' }); const v = await r.json();
      const cur = await currentBuild(); const skip = parseInt(localStorage.getItem('hexis_pad_skip') || '0', 10);
      if (v && v.build > cur && v.build > skip && !A._cancelCollect) offer(v, cur);
    } catch (e) { }
  }, 8000);
  setInterval(() => { if (!A._cancelCollect && document.visibilityState === 'visible') A.checkUpdate(false); }, 6 * 3600e3);
})(window);
