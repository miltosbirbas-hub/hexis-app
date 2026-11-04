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

  const S = () => { const c = A.settings.imu || (A.settings.imu = {}); const d = { on: false, id: '', max: 0, tip: true, auto: true, bubble: true, tol: 0.5, plumbGate: false, asked: false, mode: 'tilt' }; for (const k in d) if (c[k] === undefined) c[k] = d[k]; return c; };
  const T = A.tilt = { deg: null, pitch: null, roll: null, t: 0, src: '', status: '', statusT: 0 };
  const model = () => DB().find(m => m.id === S().id) || null;
  A.imuModel = model;
  // γνωστό μοντέλο: όριο κατασκευαστή· άγνωστο: 30° (ασφαλές) ή ό,τι ορίσει ο χρήστης από το φυλλάδιο του δέκτη
  const DEF_MAX = 30;
  const maxDeg = () => { const s = S(), m = model(); if (m && m.max) return s.max > 0 ? Math.min(s.max, m.max) : m.max; return s.max > 0 ? s.max : DEF_MAX; };

  // ---------- Ανάγνωση κλίσης από τα μηνύματα του δέκτη ----------
  const n = v => { const x = parseFloat(v); return isFinite(x) ? x : null; };
  const tiltOf = (p, r) => Math.acos(Math.max(-1, Math.min(1, Math.cos(p * Math.PI / 180) * Math.cos(r * Math.PI / 180)))) * 180 / Math.PI;
  function setAtt(p, r, src, direct) {
    if (direct != null) { T.deg = Math.abs(direct); T.pitch = p; T.roll = r; }
    else if (p != null && r != null) { T.deg = tiltOf(p, r); T.pitch = p; T.roll = r; }
    else return;
    T.t = Date.now(); T.src = src;
    autoDetect(false);
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
  // ---------- Αυτόματη αναγνώριση από τα δεδομένα του δέκτη ----------
  // · κατάσταση αντιστάθμισης (#SLANTSTATUS) ⇒ ο δέκτης σίγουρα κάνει αντιστάθμιση IMU → ενεργοποιείται μόνο του
  // · σκέτη γωνία κλίσης (PASHR, HPR…) ⇒ μπορεί να είναι και απλή ηλεκτρονική φούσκα → ρωτά μία φορά
  let askOpen = false;
  function autoDetect(slant) {
    const s = S();
    if (s.on || !s.auto) return;
    if (slant) {
      s.on = true; s.tip = true; s.asked = true; A.saveSettings();
      A.toast('∠ ' + t('Ο δέκτης έχει αντιστάθμιση κλίσης (IMU)') + ' — ' + t('όριο') + ' ' + maxDeg() + '°', 'ok', 5000);
      say('Ο δέκτης έχει IMU. Κλίση μέχρι ' + maxDeg() + ' μοίρες', 'The receiver has an IMU. Tilt up to ' + maxDeg() + ' degrees');
      if (A.ui) A.ui.refreshToolState();
      return;
    }
    if (s.asked || askOpen || !$('sheet').classList.contains('hidden') || A._cancelCollect) return;
    askOpen = true;
    A.sheet('Ο δέκτης στέλνει κλίση', `<p>${t('Ο δέκτης στέλνει τη γωνία κλίσης του κονταριού.')}</p>
      <p><b>${t('Κάνει αντιστάθμιση κλίσης (IMU), δηλαδή μετράει σωστά με γερμένο κοντάρι;')}</b></p>
      <label class="fld"><span>${t('Μέγιστη κλίση από το φυλλάδιο του δέκτη (°)')}</span><input id="aq-max" type="number" min="1" max="90" step="1" inputmode="numeric" value="${s.max > 0 ? s.max : DEF_MAX}"></label>
      <div class="row"><button class="btn grow" id="aq-no">${t('Όχι — μόνο φούσκα κέντρωσης')}</button><button class="btn primary grow" id="aq-yes">∠ ${t('Ναι, έχει IMU')}</button></div>
      <p class="muted">${t('Αν δεν είσαι σίγουρος, πάτα «Όχι». Μπορείς να το αλλάξεις όποτε θέλεις από Μενού → IMU / φούσκα κέντρωσης.')}</p>`, b => {
      b.querySelector('#aq-no').onclick = () => { s.asked = true; s.on = false; A.saveSettings(); askOpen = false; A.closeSheet(); A.toast(t('Φούσκα κέντρωσης ενεργή — μέτρηση με κατακόρυφο κοντάρι'), 'ok'); };
      b.querySelector('#aq-yes').onclick = () => {
        const mx = parseInt(b.querySelector('#aq-max').value, 10);
        Object.assign(s, { asked: true, on: true, tip: true, max: mx > 0 ? Math.min(90, mx) : 0 }); A.saveSettings(); askOpen = false; A.closeSheet();
        A.toast('∠ IMU ' + t('ενεργό') + ' — ' + t('μέχρι') + ' ' + maxDeg() + '°', 'ok'); say('Κλίση μέχρι ' + maxDeg() + ' μοίρες', 'Tilt up to ' + maxDeg() + ' degrees');
        if (A.ui) A.ui.refreshToolState();
      };
    });
    const prevClose = A._onSheetClose; A._onSheetClose = () => { askOpen = false; if (prevClose) prevClose(); };
  }

  function setStatus(st) {
    autoDetect(true);
    const prev = T.status;
    T.status = st; T.statusT = Date.now();
    if (prev === st) return;
    const d = ST_TXT[st];
    if (!d) return;
    if (d[1] === 'ok') { A.toast('∠ ' + t('IMU έτοιμο') + ' — ' + t('μέχρι') + ' ' + maxDeg() + '°', 'ok', 3000); say('IMU έτοιμο. Μέχρι ' + maxDeg() + ' μοίρες', 'IMU ready. Up to ' + maxDeg() + ' degrees'); A.sound && A.sound('fix'); }
    else if (prev === 'CONVERGENCE') { A.toast('∠ ' + t(d[0]), 'bad', 3500); say(d[0], 'Move the pole to initialise the IMU'); }
  }
  HCONN.on('nmea', d => { if (d.channel === 'gnss' && (S().on || S().bubble)) { const c = d.line && d.line.charCodeAt(1); if (d.line[0] === '#' || (d.line[0] === '$' && (c === 80 || /^\$..(HPD|HPR|TLT)/.test(d.line)))) parse(d.line); } });

  // ---------- Έλεγχος κάθε εποχής ----------
  let overSince = 0, lastWarn = 0;
  A.tiltTip = () => { const s = S(); return s.on && s.tip; };
  A.tiltCheck = function (p) {
    const s = S();
    if (!s.on) {
      // χωρίς IMU: προαιρετικά δεν παίρνει σημείο εκτός ανοχής της φούσκας κέντρωσης
      const fr = T.deg != null && Date.now() - T.t < 2500;
      if (fr) p.tilt = Math.round(T.deg * 100) / 100;
      if (fr && s.plumbGate && T.deg > s.tol) p.tiltBad = t('Εκτός κέντρωσης') + ' ' + T.deg.toFixed(1) + '° > ' + s.tol + '°';
      return;
    }
    const now = Date.now();
    const fresh = T.deg != null && now - T.t < 2500;
    if (fresh) p.tilt = Math.round(T.deg * 10) / 10;
    if (s.mode === 'plumb') {
      // απόλυτη κέντρωση: σημείο μόνο με κατακόρυφο κοντάρι (μέσα στην ανοχή), ακόμη κι αν ο δέκτης έχει IMU
      if (fresh && T.deg > s.tol) p.tiltBad = t('Εκτός κέντρωσης') + ' ' + T.deg.toFixed(1) + '° > ' + s.tol + '°';
      return;
    }
    if (T.status && now - T.statusT < 5000 && ST_TXT[T.status] && ST_TXT[T.status][1] === 'init') { p.tiltBad = t('IMU') + ': ' + t(ST_TXT[T.status][0]); return; }
    if (fresh && T.deg > maxDeg()) {
      p.tiltBad = t('Κλίση') + ' ' + T.deg.toFixed(0) + '° > ' + maxDeg() + '°';
      if (!overSince) overSince = now;
      if (now - overSince > 800 && now - lastWarn > 6000) { lastWarn = now; A.sound && A.sound('lost'); try { navigator.vibrate && navigator.vibrate([120, 80, 120]); } catch (e) { } say('Πολύ μεγάλη κλίση', 'Tilt too large'); }
    } else overSince = 0;
  };
  A.tiltInfo = function (eps) {
    const s = S();
    if (!s.on) { const v = (eps || []).map(e => e.tilt).filter(x => x != null); return v.length ? { plumb: true, deg: Math.max(...v), tol: s.tol } : null; }
    const vals = (eps || []).map(e => e.tilt).filter(v => v != null);
    const m = model();
    return { model: m ? BR[m.brand] + ' ' + m.name : 'IMU', max: maxDeg(), deg: vals.length ? Math.max(...vals) : null, tip: !!s.tip, mode: s.mode === 'plumb' ? 'κέντρωση' : 'κλίση', tol: s.mode === 'plumb' ? s.tol : undefined };
  };

  // ---------- Ένδειξη στη γραμμή κατάστασης ----------
  function chip() {
    let c = $('st-tilt');
    if (!c) { c = document.createElement('div'); c.id = 'st-tilt'; c.className = 'st-tilt hidden nt'; c.title = 'IMU'; c.onclick = e => { e.stopPropagation(); A.tiltMode(); }; $('st-qc').after(c); }
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
    if (s.mode === 'plumb') { txt = '⊙ ' + (fresh ? T.deg.toFixed(1) + '°/' + s.tol + '°' : t('ΚΕΝΤΡΩΣΗ')); cls = fresh && T.deg > s.tol ? 'fail' : 'ok'; }
    else if (init) { txt = '∠ INIT'; cls = 'warn'; }
    else if (fresh) { txt = '∠ ' + T.deg.toFixed(0) + '°/' + maxDeg() + '°'; cls = T.deg > maxDeg() ? 'fail' : 'ok'; }
    else { txt = '∠ IMU'; cls = 'ok'; }
    if (c.textContent !== txt) c.textContent = txt;
    const k = 'st-tilt ' + cls; if (c.className !== k) c.className = k;
    const live = $('imu-live'); if (live && now - chipT > 400) { chipT = now; live.innerHTML = liveHtml(); }
  }, 300);

  // ---------- Ψηφιακή φούσκα κέντρωσης ----------
  let bubbleBig = false;
  function bubbleEl() {
    let c = $('bubble');
    if (!c) {
      c = document.createElement('canvas'); c.id = 'bubble'; c.className = 'hidden';
      c.title = 'Φούσκα κέντρωσης';
      c.onclick = () => { bubbleBig = !bubbleBig; drawBubble(true); };
      $('mapwrap').appendChild(c);
    }
    return c;
  }
  let lastDraw = 0;
  function drawBubble(force) {
    const s = S(), c = bubbleEl(), now = Date.now();
    const fresh = T.deg != null && now - T.t < 2500;
    if (!s.bubble || !fresh) { c.classList.add('hidden'); return; }
    if (!force && now - lastDraw < 90) return; lastDraw = now;
    c.classList.remove('hidden');
    const css = bubbleBig ? 220 : 128, dpr = Math.min(3, g.devicePixelRatio || 1);
    if (c.width !== css * dpr) { c.width = c.height = css * dpr; c.style.width = c.style.height = css + 'px'; }
    const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, css, css);
    const cx = css / 2, cy = css / 2 - 8, R = css / 2 - 18;
    const imu = s.on && s.mode !== 'plumb', lim = imu ? maxDeg() : null, tol = s.tol || 0.5;
    // κλίμακα: με IMU όλο το εύρος έως λίγο πέρα από το όριο, χωρίς IMU μερικές φορές η ανοχή
    const scale = imu ? lim * 1.15 : Math.max(tol * 4, 2);
    const rr = d => Math.min(R, d / scale * R);
    const deg = T.deg;
    const col = imu ? (deg > lim ? '#c4142e' : deg > lim * 0.85 ? '#d97a00' : '#0b8a45') : (deg <= tol ? '#0b8a45' : deg <= tol * 2 ? '#d97a00' : '#c4142e');
    // φόντο
    x.fillStyle = 'rgba(255,255,255,.94)'; x.beginPath(); x.arc(cx, cy, R + 6, 0, 7); x.fill();
    x.lineWidth = 1; x.strokeStyle = '#9aa7b8'; x.beginPath(); x.moveTo(cx - R, cy); x.lineTo(cx + R, cy); x.moveTo(cx, cy - R); x.lineTo(cx, cy + R); x.stroke();
    if (imu) { // όριο IMU
      x.fillStyle = 'rgba(11,138,69,.10)'; x.beginPath(); x.arc(cx, cy, rr(lim), 0, 7); x.fill();
      x.lineWidth = 2.5; x.strokeStyle = '#c4142e'; x.setLineDash([5, 4]); x.beginPath(); x.arc(cx, cy, rr(lim), 0, 7); x.stroke(); x.setLineDash([]);
    }
    // ανοχή κατακορύφου (κέντρωση)
    x.fillStyle = 'rgba(11,138,69,.22)'; x.beginPath(); x.arc(cx, cy, Math.max(5, rr(tol)), 0, 7); x.fill();
    x.lineWidth = 2; x.strokeStyle = '#0b8a45'; x.beginPath(); x.arc(cx, cy, Math.max(5, rr(tol)), 0, 7); x.stroke();
    x.lineWidth = 2; x.strokeStyle = '#10243a'; x.beginPath(); x.arc(cx, cy, R + 6, 0, 7); x.stroke();
    // φούσκα: κατεύθυνση από pitch/roll, αλλιώς μόνο κύκλος στη γωνία
    if (T.pitch != null && T.roll != null) {
      const a = Math.hypot(T.roll, T.pitch) || 1, d = rr(deg);
      const bx = cx + T.roll / a * d, by = cy - T.pitch / a * d;
      x.fillStyle = col; x.strokeStyle = '#fff'; x.lineWidth = 2.5; x.beginPath(); x.arc(bx, by, bubbleBig ? 13 : 9, 0, 7); x.fill(); x.stroke();
    } else {
      x.lineWidth = 4; x.strokeStyle = col; x.beginPath(); x.arc(cx, cy, Math.max(4, rr(deg)), 0, 7); x.stroke();
    }
    // τιμή
    x.fillStyle = col; x.font = `800 ${bubbleBig ? 20 : 15}px Manrope, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    const txt = (deg < 10 ? deg.toFixed(1) : deg.toFixed(0)) + '°' + (imu ? ' / ' + lim + '°' : ' · ±' + tol + '°');
    x.lineWidth = 4; x.strokeStyle = '#fff'; x.strokeText(txt, cx, css - 3); x.fillText(txt, cx, css - 3);
  }
  setInterval(() => drawBubble(false), 100);

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
    const brands = ['auto'].concat([...new Set(DB().map(m => m.brand))]);
    const cur = model();
    const curBrand = cur ? cur.brand : 'auto';
    const opts = b => b === 'auto' ? `<option value="">${t('Αυτόματα — από τα δεδομένα του δέκτη')}</option>` : DB().filter(m => m.brand === b).sort((x, y) => (y.year || 0) - (x.year || 0)).map(m => `<option value="${m.id}" ${m.id === s.id ? 'selected' : ''}>${esc(m.name)}${m.year ? ' (' + m.year + ')' : ''}${m.imu ? ' — IMU ' + m.max + '°' : ' — ' + t('χωρίς IMU')}</option>`).join('');
    A.sheet('IMU / φούσκα κέντρωσης', `
      <label class="chk"><input type="checkbox" id="im-on" ${s.on ? 'checked' : ''}> Μέτρηση με κεκλιμένο κοντάρι (αντιστάθμιση IMU του δέκτη)</label>
      <div class="row"><label class="fld grow"><span>Κατασκευαστής</span><select id="im-b">${brands.map(b => `<option value="${b}" ${b === curBrand ? 'selected' : ''}>${esc(b === 'auto' ? t('Αυτόματα') : (BR[b] || b))}</option>`).join('')}</select></label>
      <label class="fld grow"><span>Μοντέλο</span><select id="im-m">${opts(curBrand)}</select></label></div>
      <div id="im-spec"></div>
      <label class="fld"><span>Όριο κλίσης (°) — κενό = του κατασκευαστή (γνωστό μοντέλο) ή 30°</span><input id="im-max" type="number" min="1" max="90" step="1" inputmode="numeric" value="${s.max > 0 ? s.max : ''}"></label>
      <label class="chk"><input type="checkbox" id="im-tip" ${s.tip ? 'checked' : ''}> <span>Ο δέκτης δίνει τη θέση στη <b>μύτη του κονταριού</b> (το ύψος κονταριού είναι ρυθμισμένο στον δέκτη — η εφαρμογή δεν το αφαιρεί ξανά)</span></label>
      <label class="chk"><input type="checkbox" id="im-auto" ${s.auto ? 'checked' : ''}> Αυτόματη αναγνώριση μοντέλου από το όνομα Bluetooth</label>
      <h4>Φούσκα κέντρωσης</h4>
      <label class="chk"><input type="checkbox" id="im-bub" ${s.bubble ? 'checked' : ''}> Εμφάνιση ψηφιακής φούσκας πάνω στον χάρτη (όταν ο δέκτης στέλνει κλίση)</label>
      <label class="fld"><span>Ανοχή κέντρωσης / κατακορύφου (°)</span><input id="im-tol" type="number" min="0.05" max="10" step="0.05" inputmode="decimal" value="${s.tol}"></label>
      <label class="chk"><input type="checkbox" id="im-pg" ${s.plumbGate ? 'checked' : ''}> Χωρίς IMU: να μην παίρνει σημείο εκτός ανοχής κέντρωσης</label>
      <h4>Ζωντανά</h4><div id="imu-live">${liveHtml()}</div>
      <div id="im-uc" class="hidden"><button class="btn" id="im-send">⚙ Ενεργοποίηση αντιστάθμισης στον δέκτη (εντολές Unicore)</button>
      <p class="muted">Στέλνει: CONFIG INS SLANTMEAS · CONFIG ANTENNADELTAHEN &lt;ύψος κεραίας&gt; · SLANTSTATUSA 1. Μόνο για δέκτες με ανοιχτή πλακέτα Unicore UM981/UM982· οι επώνυμοι δέκτες ενεργοποιούν την αντιστάθμιση από τη δική τους ρύθμιση.</p></div>
      <div class="result warn" style="font-size:.92em">Η αντιστάθμιση γίνεται <b>μέσα στον δέκτη</b>. Πριν μετρήσεις: ύψος κονταριού σωστό και στον δέκτη, αρχικοποίηση IMU όπως ορίζει ο κατασκευαστής, και έλεγχος σε γνωστό σημείο με κεκλιμένο κοντάρι.</div>
      <button class="btn primary big" id="im-save">Αποθήκευση</button>`, b => {
      const spec = () => {
        const m = DB().find(x => x.id === b.querySelector('#im-m').value);
        b.querySelector('#im-uc').classList.toggle('hidden', !(m && m.unicore));
        b.querySelector('#im-spec').innerHTML = !m ? `<div class="result">${t('Ο δέκτης αναγνωρίζεται από τα δεδομένα που στέλνει. Όριο κλίσης')}: <b>${s.max > 0 ? s.max : DEF_MAX}°</b> — ${t('γράψε παρακάτω το όριο από το φυλλάδιο του δέκτη σου')}.</div>` : m ? `<div class="result ${m.imu ? 'ok' : 'warn'}">${m.imu
          ? `<b>${t('Μέγιστη κλίση')}: ${m.max}°</b>${m.acc ? '<br>' + t('Ακρίβεια κατασκευαστή') + ': ' + esc(m.acc) : ''}${m.init ? '<br>' + t('Αρχικοποίηση') + ': ' + esc(t(m.init)) : ''}${m.note ? '<br><span class="muted">' + esc(t(m.note)) + '</span>' : ''}`
          : `<b>${t('Χωρίς IMU')}</b> — ${t('μέτρηση με κατακόρυφο κοντάρι (αλφάδι)')}${m.note ? '<br><span class="muted">' + esc(t(m.note)) + '</span>' : ''}`}</div>` : '';
      };
      b.querySelector('#im-b').onchange = () => { b.querySelector('#im-m').innerHTML = opts(b.querySelector('#im-b').value); spec(); };
      b.querySelector('#im-m').onchange = spec; spec();
      b.querySelector('#im-send').onclick = async () => {
        const h = A.antTotal ? A.antTotal() : (parseFloat($('sv-ant').value) || 0);
        try { for (const c of ['CONFIG INS SLANTMEAS', 'CONFIG ANTENNADELTAHEN ' + h.toFixed(3), 'SLANTSTATUSA 1']) { await HCONN.write('gnss', c + '\r\n'); await new Promise(r => setTimeout(r, 250)); } A.toast('✓ ' + t('Εστάλη στον δέκτη'), 'ok'); }
        catch (e) { A.toast(e.message || String(e), 'bad'); }
      };
      b.querySelector('#im-save').onclick = () => {
        const m = DB().find(x => x.id === b.querySelector('#im-m').value);
        Object.assign(s, { on: b.querySelector('#im-on').checked, id: m ? m.id : '', max: Math.max(0, parseInt(b.querySelector('#im-max').value, 10) || 0), tip: b.querySelector('#im-tip').checked, auto: b.querySelector('#im-auto').checked, bubble: b.querySelector('#im-bub').checked, tol: Math.max(0.05, parseFloat(String(b.querySelector('#im-tol').value).replace(',', '.')) || 0.5), plumbGate: b.querySelector('#im-pg').checked });
        if (s.on && m && !m.imu) { A.toast(t('Το μοντέλο αυτό δεν έχει IMU'), 'bad', 3500); s.on = false; }
        A.saveSettings(); A.closeSheet();
        if (s.on) { A.toast('∠ IMU ' + t('ενεργό') + ' — ' + t('μέχρι') + ' ' + maxDeg() + '°', 'ok'); say('Κλίση μέχρι ' + maxDeg() + ' μοίρες', 'Tilt up to ' + maxDeg() + ' degrees'); }
        if (A.ui) A.ui.refreshToolState();
      };
    });
  };
  A.imuMax = maxDeg;

  // ---------- Εναλλαγή κλίση ↔ απόλυτη κέντρωση (ένα πάτημα, ή φωνή «Κέντρωση» / «Κλίση») ----------
  A.tiltMode = function (m) {
    const s = S();
    if (!s.on) { A.imuSheet(); return; }
    s.mode = m || (s.mode === 'plumb' ? 'tilt' : 'plumb'); A.saveSettings();
    if (s.mode === 'plumb') { A.toast('⊙ ' + t('Απόλυτη κέντρωση') + ' — ' + t('σημείο μόνο με κατακόρυφο κοντάρι') + ' (±' + s.tol + '°)', 'ok', 3000); say('Κέντρωση', 'Plumb mode'); }
    else { A.toast('∠ ' + t('Μέτρηση με κλίση') + ' — ' + t('μέχρι') + ' ' + maxDeg() + '°', 'ok', 3000); say('Κλίση μέχρι ' + maxDeg() + ' μοίρες', 'Tilt up to ' + maxDeg() + ' degrees'); }
    syncBtn(); drawBubble(true);
  };
  function syncBtn() {
    const s = S(), b = $('sv-tiltmode'); if (!b) return;
    b.classList.toggle('hidden', !s.on);
    const html = s.mode === 'plumb' ? '⊙ ' + t('Κέντρωση') : '∠ ' + t('Κλίση') + ' ' + maxDeg() + '°';
    if (b.dataset.h !== html) { b.dataset.h = html; b.innerHTML = html; }
    b.classList.toggle('plumb', s.mode === 'plumb');
  }
  setInterval(syncBtn, 1000);
  setTimeout(() => { const b = $('sv-tiltmode'); if (b) b.onclick = () => A.tiltMode(); syncBtn(); }, 0);
})(window);
