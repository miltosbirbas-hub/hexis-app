// HEXIS PAD — Σύνδεση με δέκτη μέσω του Wi-Fi του, με ένα κουμπί:
// 1) Wi-Fi δέκτη μόνο για την εφαρμογή (τα δεδομένα κινητής μένουν για το NTRIP)
// 2) αναζήτηση ροής θέσης στις θύρες του δέκτη → αν βρεθεί, σύνδεση TCP και τέλος
// 3) αλλιώς η σελίδα ρυθμίσεων του δέκτη ανοίγει μέσα στην εφαρμογή (ενεργοποίηση NMEA μία φορά)
(function (g) {
  'use strict';
  const A = g.APP, $ = A.$, esc = A.esc;
  const t = s => (g.HI18N ? HI18N.t(s) : s);
  const P = () => g.Capacitor.Plugins.HexisGnss;
  const native = () => HIO.isNative();

  // γνωστά στοιχεία ανά κατασκευαστή (δημοσιευμένα από τους ίδιους)
  const BRANDS = [
    { id: 'singular', name: 'Singular XYZ', prefix: ['X1', 'E1', 'Y1', 'Z1', 'L1', 'Orion'], pass: '12345678', url: 'http://192.168.10.12/', login: 'admin / admin', hint: 'Σύνδεση: admin / admin. Device Configuration → Data Transmission → TCP (NMEA-0183): Startup ✓, θύρα 9000, GPGGA 1s, GPRMC 1s· για IMU/κλίση: PTNLAVR 1s, HEADING 1s, GPYBM 1s → OK. Το Bluetooth του X1/L1 δέχεται μόνο το SingularPad — μην το αλλάξεις.' },
    { id: 'chc', name: 'CHC / iGage', prefix: ['GNSS-', 'CHC', 'i7', 'i8', 'i9', 'X'], pass: '12345678', url: 'http://192.168.1.1/', login: 'admin / password', hint: 'Σύνδεση: admin / password. I/O Settings → Bluetooth → NMEA → GGA, GST, GSA 1 Hz → Save.' },
    { id: 'south', name: 'South', prefix: ['S', 'G'], pass: '12345678', url: 'http://10.1.1.1/', login: 'admin / admin', hint: 'Σύνδεση: admin / admin. Data Record / Output → Bluetooth → NMEA GGA, GST, GSA 1 Hz.' },
    { id: 'stonex', name: 'Stonex', prefix: ['S9', 'S7', 'S5', 'S8'], pass: '12345678', url: 'http://192.168.10.1/', login: 'admin / password', hint: 'Σύνδεση: admin / password. I/O → Bluetooth → NMEA GGA, GST, GSA 1 Hz → Save.' },
    { id: 'hitarget', name: 'Hi-Target', prefix: ['V', 'iRTK', 'vRTK'], pass: '12345678', url: 'http://192.168.1.1/', login: 'admin / password', hint: 'Σύνδεση: admin / password. I/O → Bluetooth → NMEA GGA, GST, GSA 1 Hz.' },
    { id: 'emlid', name: 'Emlid', prefix: ['reach', 'Reach'], pass: 'emlidreach', url: 'http://192.168.42.1/', login: '', hint: 'Position streaming → Bluetooth → NMEA → GGA, GST, GSA 1 Hz.' },
    { id: 'other', name: 'Άλλος', prefix: [], pass: '12345678', url: '', login: '', hint: 'Βρες την έξοδο δεδομένων (Data Output / I/O / NMEA) → Bluetooth → GGA, GST, GSA 1 Hz → Save.' },
  ];

  A.wifiSetup = function () {
    if (!native()) return A.toast(t('Διαθέσιμο στην εφαρμογή Android'), 'bad');
    const W = A.settings.wifiRx = A.settings.wifiRx || { brand: 'singular', pass: '12345678', ssid: '' };
    const br = BRANDS.find(b => b.id === W.brand) || BRANDS[0];
    A.sheet('Σύνδεση μέσω Wi-Fi δέκτη', `
      <p class="muted">${t('Για δέκτες που δεν στέλνουν θέση από το Bluetooth. Η εφαρμογή συνδέεται στο Wi-Fi του δέκτη')} <b>${t('χωρίς να κόψει τα δεδομένα κινητής')}</b> ${t('— το NTRIP συνεχίζει κανονικά.')}</p>
      <label class="fld"><span>${t('Κατασκευαστής')}</span><select id="ws-br">${BRANDS.map(b => `<option value="${b.id}" ${b.id === br.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>
      ${br.prefix.length > 1 ? `<label class="fld"><span>${t('Σειρά δέκτη (το όνομα Wi-Fi αρχίζει με…)')}</span><select id="ws-pf">${br.prefix.map(p => `<option value="${esc(p)}" ${p === (W.pf || br.prefix[0]) ? 'selected' : ''}>${esc(p)}…</option>`).join('')}</select></label>` : ''}
      <div class="row"><label class="fld grow"><span>${t('Όνομα Wi-Fi δέκτη (κενό = διαλέγεις από λίστα)')}</span><input id="ws-ssid" value="${esc(W.ssid || '')}" placeholder="${esc((br.prefix[0] || 'X1Lite') + '-…')}"></label><label class="fld" style="width:40%"><span>${t('Κωδικός Wi-Fi')}</span><input id="ws-pass" value="${esc(W.pass || br.pass)}"></label></div>
      <div class="result">${t('Τι θα γίνει')}: <b>1.</b> ${t('Το Android θα σου δείξει τα Wi-Fi γύρω σου — διάλεξε τον δέκτη (το όνομα έχει τον σειριακό του).')} <b>2.</b> ${t('Η εφαρμογή ψάχνει μόνη της θέση από το Wi-Fi του δέκτη.')} <b>3.</b> ${t('Αν δεν βρει, ανοίγει τη σελίδα του δέκτη για να ενεργοποιήσεις μία φορά την έξοδο NMEA (TCP) — μετά συνδέεται μόνη της για πάντα.')}</div>
      <button class="btn primary big" id="ws-go">📶 ${t('Σύνδεση στο Wi-Fi του δέκτη')}</button>
      <div id="ws-log" class="muted"></div>
      <button class="btn" id="ws-page">🌐 ${t('Άνοιγμα σελίδας δέκτη')} (${t('ρυθμίσεις NMEA / IMU')})</button>
      <button class="btn hidden" id="ws-tcp">✓ ${t('Χρήση αυτής της σύνδεσης')}</button>`, b => {
      const log = m => { const el = b.querySelector('#ws-log'); if (el) el.innerHTML += '<div>' + m + '</div>'; };
      b.querySelector('#ws-page').onclick = () => {
        const G = A.settings.gnss || {}; const url = G.type === 'tcp' && G.host ? 'http://' + G.host + '/' : (br.url || 'http://192.168.10.12/');
        P().openReceiverPage({ url, hint: (br.login ? t('Σύνδεση') + ': ' + br.login + ' · ' : '') + t(br.hint) }).catch(e => A.toast(e.message || String(e), 'bad'));
      };
      b.querySelector('#ws-br').onchange = e => { W.brand = e.target.value; const nb = BRANDS.find(x => x.id === W.brand); W.pass = nb.pass; A.saveSettings(); A.wifiSetup(); };
      b.querySelector('#ws-go').onclick = async () => {
        W.ssid = b.querySelector('#ws-ssid').value.trim(); W.pass = b.querySelector('#ws-pass').value; if (b.querySelector('#ws-pf')) W.pf = b.querySelector('#ws-pf').value; A.saveSettings();
        const nb = BRANDS.find(x => x.id === W.brand) || BRANDS[0];
        b.querySelector('#ws-go').disabled = true; log('⏳ ' + t('Σύνδεση στο Wi-Fi… διάλεξε τον δέκτη στο παράθυρο του Android'));
        let r;
        // χωρίς όνομα: το Android δείχνει μόνο τα δίκτυα που αρχίζουν με το πρόθεμα του κατασκευαστή (π.χ. X1Lite-…)
        const pf = b.querySelector('#ws-pf') ? b.querySelector('#ws-pf').value : '';
        try { r = await P().wifiConnect({ ssid: W.ssid, prefix: W.ssid ? '' : (pf || (nb.prefix[0] || '')), pass: W.pass }); }
        catch (e) { log('✕ ' + esc(e.message || String(e))); b.querySelector('#ws-go').disabled = false; return; }
        const gw = r.gateway || (nb.url ? nb.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : '');
        if (r.ssid) { W.ssid = r.ssid; A.saveSettings(); }
        log('✓ ' + t('Συνδέθηκε στο') + ' ' + esc(r.ssid || W.ssid || 'Wi-Fi') + (gw ? ' · ' + t('δέκτης') + ' ' + esc(gw) : ''));
        if (!gw) { log(t('Δεν βρέθηκε διεύθυνση δέκτη')); b.querySelector('#ws-go').disabled = false; return; }
        log('⏳ ' + t('Αναζήτηση ροής θέσης στις θύρες του δέκτη…'));
        let pr = null; try { pr = await P().wifiProbe({ host: gw }); } catch (e) { }
        if (pr && pr.best) {
          log('✓ ' + t('Βρέθηκε θέση στη θύρα') + ' ' + pr.best + ' (' + pr.kind + ')');
          const tcpBtn = b.querySelector('#ws-tcp'); tcpBtn.classList.remove('hidden');
          const useIt = async () => {
            const G = A.settings.gnss; G.type = 'tcp'; G.host = gw; G.port = pr.best; G.wifiSsid = W.ssid; A.saveSettings();
            try { await HCONN.connect({ type: 'tcp', host: gw, port: pr.best, channel: 'gnss' }); A.toast('✓ ' + t('Συνδέθηκε ο δέκτης μέσω Wi-Fi'), 'ok', 3000); if (A.settings.ntrip.auto && A.settings.ntrip.host) A.startNtrip(); A.closeSheet(); }
            catch (e) { log('✕ ' + esc(e.message || String(e))); A.toast(e.message || String(e), 'bad'); }
          };
          tcpBtn.onclick = useIt; useIt(); return;
        }
        const open = pr && pr.found ? pr.found.filter(f => f.kind === 'open' || f.kind === 'data').map(f => f.port) : [];
        log((open.length ? t('Ανοιχτές θύρες χωρίς θέση') + ': ' + open.join(', ') + '. ' : '') + t('Ανοίγω τη σελίδα του δέκτη — ενεργοποίησε το NMEA στο Bluetooth μία φορά.'));
        const url = 'http://' + gw + '/';
        const pg = b.querySelector('#ws-page');
        const openPage = () => P().openReceiverPage({ url, hint: (nb.login ? t('Σύνδεση') + ': ' + nb.login + ' · ' : '') + t(nb.hint) }).catch(e => A.toast(e.message || String(e), 'bad'));
        pg.onclick = openPage; openPage();
        b.querySelector('#ws-go').disabled = false;
      };
    });
  };

  // στην επιστροφή από τη σελίδα του δέκτη: αποδέσμευση Wi-Fi και νέα προσπάθεια Bluetooth
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !native()) return;
    const G = A.settings.gnss || {};
    if (G.type === 'tcp') return; // η σύνδεση μέσω Wi-Fi μένει
    try { P().wifiDisconnect(); } catch (e) { }
  });
  // το Wi-Fi δέκτη χάθηκε ενώ δουλεύαμε μέσω TCP → ξανασύνδεση μόνη της
  HCONN.on('status', async d => {
    if (d.channel !== 'wifi' || d.state !== 'lost') return;
    const G = A.settings.gnss || {}; if (G.type !== 'tcp' || !G.wifiSsid) return;
    A.toast(t('Χάθηκε το Wi-Fi του δέκτη — επανασύνδεση…'), 'bad', 3000);
    try { await P().wifiConnect({ ssid: G.wifiSsid, pass: (A.settings.wifiRx || {}).pass || '12345678' }); await HCONN.connect({ type: 'tcp', host: G.host, port: G.port, channel: 'gnss' }); A.toast('✓ ' + t('Επανασυνδέθηκε'), 'ok'); } catch (e) { }
  });
  // αυτόματη σύνδεση στην εκκίνηση όταν ο δέκτης δουλεύει μέσω Wi-Fi/TCP
  const ac0 = A.autoConnect;
  A.autoConnect = async function () {
    const G = A.settings.gnss || {};
    if (native() && G.type === 'tcp' && G.wifiSsid && HCONN.state.gnss !== 'on' && !A._userDisconnected && !A._wifiBusy) {
      A._wifiBusy = true;
      try { await P().wifiConnect({ ssid: G.wifiSsid, pass: (A.settings.wifiRx || {}).pass || '12345678' }); await HCONN.connect({ type: 'tcp', host: G.host, port: G.port, channel: 'gnss' }); A.toast('✓ ' + t('Συνδέθηκε ο δέκτης μέσω Wi-Fi'), 'ok'); if (A.settings.ntrip.auto && A.settings.ntrip.host) A.startNtrip(); }
      catch (e) { } finally { A._wifiBusy = false; }
      return;
    }
    return ac0 ? ac0.apply(this, arguments) : undefined;
  };
})(window);
