// HEXIS PAD — IMU / αντιστάθμιση κλίσης κονταριού
// Η αντιστάθμιση γίνεται μέσα στον δέκτη (ο κατασκευαστής ξέρει το IMU του). Η εφαρμογή:
//  · αναγνωρίζει το μοντέλο (από το όνομα Bluetooth ή επιλογή) και ξέρει μέχρι πόσες μοίρες επιτρέπεται,
//  · διαβάζει τη γωνία κλίσης όταν ο δέκτης τη στέλνει (PASHR, PSAT HPR, PTNL AVR, HPD, Unicore SLANT…),
//  · δεν αφήνει να ληφθεί σημείο πάνω από το όριο ή πριν ολοκληρωθεί η αρχικοποίηση,
//  · δεν αφαιρεί δεύτερη φορά το ύψος κονταριού όταν ο δέκτης δίνει ήδη τη μύτη του κονταριού.
(function (g) {
  'use strict';
  const A = g.APP, $ = A.$, esc = A.esc;
  const t = s => (g.HI18N ? HI18N.t(s) : s);
  const say = (el, en) => A.voice && A.voice.say && A.voice.say(el, en);
  const DB = () => g.HIMU_DB || [];
  const BR = { chc: 'CHC Navigation', stonex: 'Stonex', hitarget: 'Hi-Target', south: 'South', comnav: 'ComNav', singular: 'Singular XYZ', kolida: 'Kolida', ruide: 'Ruide', tersus: 'Tersus', satlab: 'SatLab', foif: 'FOIF', emlid: 'Emlid', leica: 'Leica', geomax: 'GeoMax', trimble: 'Trimble', spectra: 'Spectra Geospatial', topcon: 'Topcon', sokkia: 'Sokkia', unicore: 'Δέκτης με Unicore (UM981/UM982)', other: 'Άλλος' };

  const S = () => (A.settings.imu = Object.assign({ on: false, id: '', max: 0, tip: true, auto: true }, A.settings.imu || {}));
  const T = A.tilt = { deg: null, pitch: null, roll: null, t: 0, src: '', status: '', statusT: 0 };
  const model = () => DB().find(m => m.id === S().id) || null;
  const maxDeg = () => { const s = S(), m = model(); const lim = m && m.max ? m.max : 60; return s.max > 0 ? Math.min(s.max, lim) : lim; };

  // ---------- Ανάγνωση κλίσης από τα μηνύματα του δέκτη ----------
  const n = v => { const x = parseFloat(v); return isFinite(x) ? x : null; };
  const tiltOf = (p, r) => Math.acos(Math.max(-1, Math.min(1, Math.cos(p * Math.PI / 180) * Math.cos(r * Math.PI / 180)))) * 180 / Math.PI;
  function setAtt(p, r, src, direct) {
    if (direct != null) { T.deg = Math.abs(direct); T.pitch = p; T.roll = r; }
    else if (p != null && r != null) { T.deg = tiltOf(p, r); T.pitch = p; T.roll = r; }
    else return;
    T.t = Date.now(); T.src = src;
  }
  function parse(line) {
    if (!line) return;
    const body = line.split('*')[0];
    if (line[0] === '$') {
      const f = body.split(',');
      const id = f[0].slice(1);
      if (id === 'PASHR') { setAtt(n(f[5]), n(f[4]), 'PASHR'); if (f[11] != null && f[11] !== '') T.ins = f[11]; return; } // time,heading,T,roll,pitch,…
      if (id === 'PSAT' && f[1] === 'HPR') { setAtt(n(f[4]), n(f[5]), 'PSAT,HPR'); return; } // time,heading,pitch,roll
      if (id === 'PTNL' && f[1] === 'AVR') { const p = n(f[5]), r = n(f[7]); setAtt(p, r != null ? r : 0, 'PTNL,AVR'); return; } // time,yaw,Yaw,tilt,Tilt,roll,Roll
      if (/^..HPD$/.test(id)) { setAtt(n(f[4]), n(f[5]), 'HPD'); return; } // week,sec,heading,pitch,roll,…
      if (/^..HPR$/.test(id)) { setAtt(n(f[3]), n(f[4]), 'HPR'); return; } // time,heading,pitch,roll
      if (/^PTILT|^..TLT$|^PTLT/.test(id)) { setAtt(null, null, id, n(f[2]) != null ? n(f[2]) : n(f[1])); return; }
    } else if (line[0] === '#') {
      if (/^#SLANTSTATUS/i.test(body)) {
        const st = (body.split(';')[1] || '').split(',')[0].trim().toUpperCase();
        if (st) setStatus(st);
      }
    }
  }
  const ST_TXT = {
    WAITING: ['Αναμονή ενεργοποίησης αντιστάθμισης', 'init'], STATIC: ['Κράτα το κοντάρι ακίνητο και κατακόρυφο', 'init'],
    RTKNOFIX: ['Αναμονή για FIX', 'init'], MOVING: ['Κούνησε το κοντάρι (μύτη στο έδαφος) μπρος-πίσω, δεξιά-αριστερά', 'init'],
    INSBIGERR: ['Χαμηλή ακρίβεια IMU — κούνησε το κοντάρι', 'init'], CONVERGENCE: ['IMU έτοιμο', 'ok'],
  };
  function setStatus(st) {
    const prev = T.status;
    T.status = st; T.statusT = Date.now();
    if (prev === st) return;
    const d = ST_TXT[st];
    if (!d) return;
    if (d[1] === 'ok') { A.toast('∠ ' + t('IMU έτοιμο') + ' — ' + t('μέχρι') + ' ' + maxDeg() + '°', 'ok', 3000); say('IMU έτοιμο. Μέχρι ' + maxDeg() + ' μοίρες', 'IMU ready. Up to ' + maxDeg() + ' degrees'); A.sound && A.sound('fix'); }
    else if (prev === 'CONVERGENCE') { A.toast('∠ ' + t(d[0]), 'bad', 3500); say(d[0], 'Move the pole to initialise the IMU'); }
  }
  HCONN.on('nmea', d => { if (d.channel === 'gnss' && S().on) { const c = d.line && d.line.charCodeAt(1); if (d.line[0] === '#' || (d.line[0] === '$' && (c === 80 || /^\$..(HPD|HPR|TLT)/.test(d.line)))) parse(d.line); } });

  // ---------- Έλεγχος κάθε εποχής ----------
  let overSince = 0, lastWarn = 0;
  A.tiltTip = () => { const s = S(); return s.on && s.tip; };
  A.tiltCheck = function (p) {
    const s = S(); if (!s.on) return;
    const now = Date.now();
    const fresh = T.deg != null && now - T.t < 2500;
    if (fresh) p.tilt = Math.round(T.deg * 10) / 10;
    if (T.status && now - T.statusT < 5000 && ST_TXT[T.status] && ST_TXT[T.status][1] === 'init') { p.tiltBad = t('IMU') + ': ' + t(ST_TXT[T.status][0]); return; }
    if (fresh && T.deg > maxDeg()) {
      p.tiltBad = t('Κλίση') + ' ' + T.deg.toFixed(0) + '° > ' + maxDeg() + '°';
      if (!overSince) overSince = now;
      if (now - overSince > 800 && now - lastWarn > 6000) { lastWarn = now; A.sound && A.sound('lost'); try { navigator.vibrate && navigator.vibrate([120, 80, 120]); } catch (e) { } say('Πολύ μεγάλη κλίση', 'Tilt too large'); }
    } else overSince = 0;
  };
  A.tiltInfo = function (eps) {
    const s = S(); if (!s.on) return null;
    const vals = (eps || []).map(e => e.tilt).filter(v => v != null);
    const m = model();
    return { model: m ? BR[m.brand] + ' ' + m.name : 'IMU', max: maxDeg(), deg: vals.length ? Math.max(...vals) : null, tip: !!s.tip };
  };

  // ---------- Ένδειξη στη γραμμή κατάστασης ----------
  function chip() {
    let c = $('st-tilt');
    if (!c) { c = document.createElement('div'); c.id = 'st-tilt'; c.className = 'st-tilt hidden nt'; c.title = 'IMU'; c.onclick = e => { e.stopPropagation(); A.imuSheet(); }; $('st-qc').after(c); }
    return c;
  }
  let chipT = 0;
  setInterval(() => {
    const s = S(), c = chip();
    if (!s.on) { c.classList.add('hidden'); return; }
    c.classList.remove('hidden');
    const now = Date.now(), fresh = T.deg != null && now - T.t < 2500;
    const init = T.status && now - T.statusT < 5000 && ST_TXT[T.status] && ST_TXT[T.status][1] === 'init';
    let txt, cls;
    if (init) { txt = '∠ INIT'; cls = 'warn'; }
    else if (fresh) { txt = '∠ ' + T.deg.toFixed(0) + '°/' + maxDeg() + '°'; cls = T.deg > maxDeg() ? 'fail' : 'ok'; }
    else { txt = '∠ IMU'; cls = 'ok'; }
    if (c.textContent !== txt) c.textContent = txt;
    const k = 'st-tilt ' + cls; if (c.className !== k) c.className = k;
    const live = $('imu-live'); if (live && now - chipT > 400) { chipT = now; live.innerHTML = liveHtml(); }
  }, 300);

  function liveHtml() {
    const now = Date.now(), fresh = T.deg != null && now - T.t < 2500;
    const st = T.status && now - T.statusT < 5000 ? ST_TXT[T.status] : null;
    return `<table class="kv">
      <tr><td>${t('Κλίση τώρα')}</td><td><b style="font-size:1.4em" class="${fresh && T.deg > maxDeg() ? 'bad' : ''}">${fresh ? T.deg.toFixed(1) + '°' : '—'}</b> / ${t('μέγιστο')} ${maxDeg()}°</td></tr>
      ${st ? `<tr><td>${t('Κατάσταση IMU')}</td><td>${t(st[0])}</td></tr>` : ''}
      <tr><td>${t('Μήνυμα δέκτη')}</td><td>${fresh || st ? esc(T.src || 'SLANTSTATUS') : t('ο δέκτης δεν στέλνει γωνία κλίσης')}</td></tr></table>
      ${fresh || st ? '' : `<p class="muted">${t('Η αντιστάθμιση γίνεται μέσα στον δέκτη. Αν δεν στέλνει τη γωνία, η εφαρμογή δεν μπορεί να ελέγξει το όριο — τήρησε το όριο του κατασκευαστή και την αρχικοποίηση.')}</p>`}`;
  }

  // ---------- Αναγνώριση μοντέλου από το όνομα Bluetooth ----------
  function detect(name) {
    if (!name) return null;
    for (const m of DB()) if (m.rx && new RegExp(m.rx, 'i').test(name)) return m;
    return null;
  }
  HCONN.on('status', d => {
    if (d.channel !== 'gnss' || d.state !== 'connected' || !d.name) return;
    const s = S(); if (!s.auto) return;
    const m = detect(d.name);
    if (!m || m.id === s.id) { if (m && s.on) announce(m); return; }
    s.id = m.id; s.max = 0; s.on = !!m.imu; A.saveSettings();
    if (m.imu) announce(m);
    else A.toast(BR[m.brand] + ' ' + m.name + ': ' + t('χωρίς IMU — μέτρηση με κατακόρυφο κοντάρι (αλφάδι)'), '', 4000);
  });
  function announce(m) {
    A.toast('∠ ' + BR[m.brand] + ' ' + m.name + ' — IMU ' + t('μέχρι') + ' ' + maxDeg() + '°' + (m.init ? ' · ' + t('Αρχικοποίηση') + ': ' + t(m.init) : ''), 'ok', 5000);
    say('Αναγνωρίστηκε ' + m.name + '. Κλίση μέχρι ' + maxDeg() + ' μοίρες', 'Detected ' + m.name + '. Tilt up to ' + maxDeg() + ' degrees');
  }
  A.imuDetect = detect;

  // ---------- Ρυθμίσεις IMU ----------
  A.imuSheet = function () {
    const s = S();
    const brands = [...new Set(DB().map(m => m.brand))];
    const cur = model();
    const curBrand = cur ? cur.brand : (brands[0] || 'other');
    const opts = b => DB().filter(m => m.brand === b).sort((x, y) => (y.year || 0) - (x.year || 0)).map(m => `<option value="${m.id}" ${m.id === s.id ? 'selected' : ''}>${esc(m.name)}${m.year ? ' (' + m.year + ')' : ''}${m.imu ? ' — IMU ' + m.max + '°' : ' — ' + t('χωρίς IMU')}</option>`).join('');
    A.sheet('IMU — κλίση κονταριού', `
      <label class="chk"><input type="checkbox" id="im-on" ${s.on ? 'checked' : ''}> Μέτρηση με κεκλιμένο κοντάρι (αντιστάθμιση IMU του δέκτη)</label>
      <div class="row"><label class="fld grow"><span>Κατασκευαστής</span><select id="im-b">${brands.map(b => `<option value="${b}" ${b === curBrand ? 'selected' : ''}>${esc(BR[b] || b)}</option>`).join('')}</select></label>
      <label class="fld grow"><span>Μοντέλο</span><select id="im-m">${opts(curBrand)}</select></label></div>
      <div id="im-spec"></div>
      <label class="fld"><span>Δικό μου όριο κλίσης (°) — κενό = όριο κατασκευαστή</span><input id="im-max" type="number" min="1" max="90" step="1" inputmode="numeric" value="${s.max > 0 ? s.max : ''}"></label>
      <label class="chk"><input type="checkbox" id="im-tip" ${s.tip ? 'checked' : ''}> Ο δέκτης δίνει τη θέση στη <b>μύτη του κονταριού</b> (το ύψος κονταριού είναι ρυθμισμένο στον δέκτη — η εφαρμογή δεν το αφαιρεί ξανά)</label>
      <label class="chk"><input type="checkbox" id="im-auto" ${s.auto ? 'checked' : ''}> Αυτόματη αναγνώριση μοντέλου από το όνομα Bluetooth</label>
      <h4>Ζωντανά</h4><div id="imu-live">${liveHtml()}</div>
      <div id="im-uc" class="hidden"><button class="btn" id="im-send">⚙ Ενεργοποίηση αντιστάθμισης στον δέκτη (εντολές Unicore)</button>
      <p class="muted">Στέλνει: CONFIG INS SLANTMEAS · CONFIG ANTENNADELTAHEN &lt;ύψος κεραίας&gt; · SLANTSTATUSA 1. Μόνο για δέκτες με ανοιχτή πλακέτα Unicore UM981/UM982· οι επώνυμοι δέκτες ενεργοποιούν την αντιστάθμιση από τη δική τους ρύθμιση.</p></div>
      <div class="result warn" style="font-size:.92em">Η αντιστάθμιση γίνεται <b>μέσα στον δέκτη</b>. Πριν μετρήσεις: ύψος κονταριού σωστό και στον δέκτη, αρχικοποίηση IMU όπως ορίζει ο κατασκευαστής, και έλεγχος σε γνωστό σημείο με κεκλιμένο κοντάρι.</div>
      <button class="btn primary big" id="im-save">Αποθήκευση</button>`, b => {
      const spec = () => {
        const m = DB().find(x => x.id === b.querySelector('#im-m').value);
        b.querySelector('#im-uc').classList.toggle('hidden', !(m && m.unicore));
        b.querySelector('#im-spec').innerHTML = m ? `<div class="result ${m.imu ? 'ok' : 'warn'}">${m.imu
          ? `<b>${t('Μέγιστη κλίση')}: ${m.max}°</b>${m.acc ? '<br>' + t('Ακρίβεια κατασκευαστή') + ': ' + esc(m.acc) : ''}${m.init ? '<br>' + t('Αρχικοποίηση') + ': ' + esc(t(m.init)) : ''}${m.note ? '<br><span class="muted">' + esc(t(m.note)) + '</span>' : ''}`
          : `<b>${t('Χωρίς IMU')}</b> — ${t('μέτρηση με κατακόρυφο κοντάρι (αλφάδι)')}${m.note ? '<br><span class="muted">' + esc(t(m.note)) + '</span>' : ''}`}</div>` : '';
      };
      b.querySelector('#im-b').onchange = () => { b.querySelector('#im-m').innerHTML = opts(b.querySelector('#im-b').value); spec(); };
      b.querySelector('#im-m').onchange = spec; spec();
      b.querySelector('#im-send').onclick = async () => {
        const h = parseFloat($('sv-ant').value) || 0;
        try { for (const c of ['CONFIG INS SLANTMEAS', 'CONFIG ANTENNADELTAHEN ' + h.toFixed(3), 'SLANTSTATUSA 1']) { await HCONN.write('gnss', c + '\r\n'); await new Promise(r => setTimeout(r, 250)); } A.toast('✓ ' + t('Εστάλη στον δέκτη'), 'ok'); }
        catch (e) { A.toast(e.message || String(e), 'bad'); }
      };
      b.querySelector('#im-save').onclick = () => {
        const m = DB().find(x => x.id === b.querySelector('#im-m').value);
        Object.assign(s, { on: b.querySelector('#im-on').checked, id: m ? m.id : '', max: Math.max(0, parseInt(b.querySelector('#im-max').value, 10) || 0), tip: b.querySelector('#im-tip').checked, auto: b.querySelector('#im-auto').checked });
        if (s.on && m && !m.imu) { A.toast(t('Το μοντέλο αυτό δεν έχει IMU'), 'bad', 3500); s.on = false; }
        A.saveSettings(); A.closeSheet();
        if (s.on) { A.toast('∠ IMU ' + t('ενεργό') + ' — ' + t('μέχρι') + ' ' + maxDeg() + '°', 'ok'); say('Κλίση μέχρι ' + maxDeg() + ' μοίρες', 'Tilt up to ' + maxDeg() + ' degrees'); }
        if (A.ui) A.ui.refreshToolState();
      };
    });
  };
  A.imuMax = maxDeg;
})(window);
