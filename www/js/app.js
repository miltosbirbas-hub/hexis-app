// HEXIS PAD — κύρια λογική: κατάσταση, θέση, αποτύπωση, χάραξη, σημεία, έργα
(function (g) {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const F = (v, d) => HGEO.fmt(v, d);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const DEF = {
    crs: 'EGSA87', crsCustom: '', theme: 'light', antH: 1.8, onlyFix: true, epochs: 5, qcClass: 'RT3',
    tolH: 0.02, tolV: 0.02, beep: true, heightMode: 'msl', base: 'esri_sat', overlays: { esri_labels: false, kt_wms: false, hexis_kaek: false },
    googleKey: '', soRef: 'move', ntrip: { host: '', port: 2101, mount: '', user: '', pass: '', gga: true, auto: false }, gnss: { type: 'bt', address: '', name: '', host: '', port: 0, init: '' },
    laser: { address: '', name: '' }, decl: 4.5, lastProject: null, textH: 0.25,
  };

  const A = g.APP = {
    $, esc, F, uid, settings: JSON.parse(JSON.stringify(DEF)), proj: null, design: null,
    nmea: new HNMEA.NmeaState(), baseNmea: new HNMEA.NmeaState(), baseRaw: [], qc: new HQC.Monitor(), pos: null, map: null, raw: [], laserLast: null,
    stake: { mode: 'point', target: null, line: null, baseline: null, surface: null, list: [] },
    epochListeners: [], laserListeners: [], tab: 'survey',
  };

  // ---------- Εργαλεία UI ----------
  let toastT = null;
  A.toast = function (msg, kind, ms) {
    const t = $('toast'); t.textContent = msg; t.className = kind || ''; clearTimeout(toastT);
    toastT = setTimeout(() => t.className = 'hidden', ms || 2600);
  };
  A.sheet = function (title, html, onOpen) {
    $('sh-title').textContent = title; $('sh-body').innerHTML = html;
    $('sheet').classList.remove('hidden'); $('sheet-back').classList.remove('hidden');
    if (onOpen) onOpen($('sh-body'));
    $('sh-body').scrollTop = 0;
  };
  A.closeSheet = function () { $('sheet').classList.add('hidden'); $('sheet-back').classList.add('hidden'); $('sh-body').innerHTML = ''; if (A._onSheetClose) { const f = A._onSheetClose; A._onSheetClose = null; f(); } };
  $('sh-close').onclick = A.closeSheet; $('sheet-back').onclick = A.closeSheet;
  A.confirm = function (title, msg, okText, cb, cancelText) {
    A.sheet(title, `<p>${msg}</p><div class="row"><button class="btn grow" id="cf-no">${cancelText || 'Άκυρο'}</button><button class="btn primary grow" id="cf-ok">${okText || 'OK'}</button></div>`, b => {
      b.querySelector('#cf-no').onclick = () => { A.closeSheet(); };
      b.querySelector('#cf-ok').onclick = () => { A.closeSheet(); cb(); };
    });
  };
  A.qcTable = function (r) {
    return `<table class="qc-table">${r.checks.map(c => `<tr><td>${esc(c.name)}</td><td class="muted">${esc(c.lim)}</td><td class="${c.lim === '' ? '' : (c.ok === true ? 'qc-ok' : (c.ok === false ? (c.soft ? 'qc-warn' : 'qc-fail') : 'qc-warn'))}">${esc(c.val)}</td></tr>`).join('')}</table>`;
  };
  A.levelText = l => ({ ok: 'ΕΝΤΑΞΕΙ', warn: 'ΠΡΟΣΟΧΗ', fail: 'ΑΠΟΡΡΙΨΗ' }[l] || l);

  // ---------- Ρυθμίσεις ----------
  A.saveSettings = function () { HIO.kvSet('settings', A.settings).catch(() => { }); };
  A.applySettings = function () {
    const S = A.settings;
    document.documentElement.dataset.theme = S.theme;
    document.querySelector('meta[name=theme-color]').content = S.theme === 'dark' ? '#16202b' : '#f4f7fa';
    HGEO.setCRS(S.crs, S.crsCustom);
    HGEO.setCalib(A.proj && A.proj.calib ? A.proj.calib : null);
    $('cur-crs').textContent = HGEO.crsName().split('·').pop().trim().split(' (')[0] + (A.proj && A.proj.calib ? ' + CAL' : '');
    A.qc.cls = S.qcClass;
    $('sv-ant').value = S.antH; $('sv-onlyfix').checked = S.onlyFix; $('sv-epochs').value = String(S.epochs);
    $('so-ref').value = S.soRef;
    if (A.map) {
      A.map.dark = S.theme === 'dark'; A.map.base = S.base; A.map.overlays = Object.assign({}, S.overlays);
      A.map.setGoogleKey(S.googleKey); A.map.redraw();
    }
  };

  // ---------- Έργα ----------
  function newProject(name) {
    return { id: uid(), name: name || ('Έργο ' + new Date().toLocaleDateString('el-GR')), created: Date.now(), points: [], codes: [], calib: null, calibPairs: [], nextName: '1' };
  }
  let saveT = null;
  A.saveProject = function (now) {
    clearTimeout(saveT);
    const doit = () => { if (A.proj) { A.proj.updated = Date.now(); HIO.kvSet('proj:' + A.proj.id, A.proj).catch(e => A.toast('Σφάλμα αποθήκευσης', 'bad')); updateProjectList(); } };
    if (now) doit(); else saveT = setTimeout(doit, 400);
  };
  async function updateProjectList() {
    const list = (await HIO.kvGet('projlist')) || [];
    const i = list.findIndex(p => p.id === A.proj.id);
    const meta = { id: A.proj.id, name: A.proj.name, updated: A.proj.updated || Date.now(), n: A.proj.points.length };
    if (i >= 0) list[i] = meta; else list.unshift(meta);
    await HIO.kvSet('projlist', list);
  }
  A.openProject = async function (id) {
    const p = await HIO.kvGet('proj:' + id);
    if (!p) return false;
    A.proj = p; A.settings.lastProject = id; A.saveSettings();
    A.design = (await HIO.kvGet('design:' + id)) || null;
    A.map.layers.design = A.design ? A.design.model : null;
    A.map.designLayers = A.design ? (A.design.layerState || {}) : {};
    A.stake.target = null; A.stake.line = null;
    A.applySettings(); A.refreshAll();
    if (!A.map.extents()) A.map.redraw();
    return true;
  };
  A.createProject = async function (name) {
    A.proj = newProject(name); A.design = null; A.map.layers.design = null;
    A.saveProject(true); A.settings.lastProject = A.proj.id; A.saveSettings();
    A.applySettings(); A.refreshAll();
  };
  A.refreshAll = function () {
    $('st-proj').textContent = A.proj ? A.proj.name : '';
    $('sv-name').value = A.proj.nextName || '1';
    A.renderPoints(); A.renderCodes(); A.updateMapLayers(); A.updateStakeTarget();
  };

  // ---------- Θέση από NMEA ----------
  let headingAnchor = null;
  function onNmea(d) {
    if (d.channel === 'laser') return onLaser(d.line);
    if (d.channel === 'base') { const r = A.baseNmea.feed(d.line); A.baseRaw.push(d.line); if (A.baseRaw.length > 40) A.baseRaw.shift(); if (A._baseView) A._baseView(); return; }
    const line = d.line;
    A.raw.push(line); if (A.raw.length > 80) A.raw.shift();
    if (A._rawView) A._rawView();
    const r = A.nmea.feed(line);
    if (!r) { const lz = HNMEA.parseGenericLaser && null; return; }
    if (r.type === 'laser') return onLaserData(r);
    if (r.type !== 'GGA') return;
    const n = A.nmea;
    if (n.lat == null) { A.pos = null; A.updateStatus(); return; }
    const S = A.settings;
    let grid; try { grid = HGEO.toGrid(n.lat, n.lon); } catch (e) { return; }
    const ellH = (n.alt != null && n.geoidSep != null) ? n.alt + n.geoidSep : null;
    const H = S.heightMode === 'ell' ? ellH : n.alt;
    const fix = n.fix().key;
    const p = {
      E: grid.E, N: grid.N, Z: H != null ? H - (parseFloat($('sv-ant').value) || 0) + HGEO.heightShift() : null,
      lat: n.lat, lon: n.lon, ellH, msl: n.alt, fix, sh: n.hrms(), sv: n.sAlt, pdop: n.pdop != null ? n.pdop : (n.hdop != null ? n.hdop * 1.4 : null),
      hdop: n.hdop, sats: n.sats, age: n.age, t: Date.now(), antH: parseFloat($('sv-ant').value) || 0,
    };
    // κατεύθυνση κίνησης
    if (!headingAnchor) headingAnchor = { E: p.E, N: p.N };
    const md = Math.hypot(p.E - headingAnchor.E, p.N - headingAnchor.N);
    if (md > 0.35) { A.moveHeading = HGEO.azimuth(headingAnchor, p); headingAnchor = { E: p.E, N: p.N }; }
    if (n.speed != null && n.speed > 0.6 && n.course != null) A.moveHeading = n.course + HGEO.convergence(n.lat, n.lon) * -1;
    p.heading = A.moveHeading != null ? A.moveHeading : null;
    A.pos = p;
    A.liveQC = A.qc.epoch(p);
    A.epochListeners.slice().forEach(f => f(p));
    if (A.settings.ntrip.gga && HCONN.hasNative()) { const now = Date.now(); if (!A._lastGgaSent || now - A._lastGgaSent > 9000) { A._lastGgaSent = now; HCONN.ntripSetGGA(n.lastGGA); } }
    A.updateStatus(); A.updatePos(); A.updateGuidance();
  }

  A.updateStatus = function () {
    const n = A.nmea, P = A.pos;
    const fx = P ? n.fix() : HNMEA.FIX[0];
    const el = $('st-fix'); el.textContent = HCONN.state.source === 'sim' && P ? fx.label + '·SIM' : fx.label; el.className = 'fix ' + fx.key;
    const sf = $('sf-fix'); sf.textContent = el.textContent; sf.className = el.className;
    $('st-h').textContent = P && P.sh != null ? P.sh.toFixed(3) : '—';
    $('st-v').textContent = P && P.sv != null ? P.sv.toFixed(3) : '—';
    $('st-sv').textContent = P ? (n.sats + (n.satsView ? '/' + n.satsView : '')) : '—';
    $('st-pdop').textContent = P && P.pdop != null ? P.pdop.toFixed(1) : '—';
    $('st-age').textContent = P && n.age != null ? n.age.toFixed(1) : '—';
    const q = $('st-qc'); const lv = P && A.liveQC ? A.liveQC.level : 'warn';
    q.className = 'st-qc ' + lv; q.textContent = 'QC ' + (lv === 'ok' ? '✓' : lv === 'fail' ? '✕' : '!');
    if (A._gnssView) A._gnssView();
  };
  setInterval(() => { // απώλεια ροής δεδομένων
    if (A.pos && Date.now() - A.pos.t > 5000) { A.pos = null; A.nmea.quality = 0; A.updateStatus(); A.updatePos(); }
  }, 1500);

  A.updatePos = function () {
    const P = A.pos;
    $('cur-e').textContent = P ? P.E.toFixed(3) : '—';
    $('cur-n').textContent = P ? P.N.toFixed(3) : '—';
    $('cur-z').textContent = P && P.Z != null ? P.Z.toFixed(3) : '—';
    const m = A.map;
    m.layers.pos = P ? { E: P.E, N: P.N, fix: P.fix, acc: P.sh ? P.sh * 2 : null, heading: P.heading } : null;
    if (P && !A._firstPos) { A._firstPos = true; if (m.view.s < 1) m.view.s = 8; }
    if (P && m.follow) { m.view.cx = P.E; m.view.cy = P.N; m._changed(); }
    m.redraw();
  };

  // ---------- Laser ----------
  function onLaser(line) {
    const r = A.nmea && line && line[0] === '$' ? new HNMEA.NmeaState().feed(line) : HNMEA.parseGenericLaser(line);
    if (r && r.type === 'laser') onLaserData(r);
  }
  function onLaserData(r) {
    A.laserLast = Object.assign({ t: Date.now() }, r);
    A.laserListeners.slice().forEach(f => f(A.laserLast));
    A.toast('Laser: ' + (r.hd != null ? 'HD ' + r.hd.toFixed(3) + ' m' : '') + (r.az != null ? ' · Az ' + r.az.toFixed(1) + '°' : ''), 'ok');
  }

  // ---------- Αποτύπωση ----------
  function nextName(n) {
    const m = String(n).match(/^(.*?)(\d+)(\D*)$/);
    if (!m) return n + '1';
    const num = String(parseInt(m[2], 10) + 1).padStart(m[2].length, '0');
    return m[1] + num + m[3];
  }
  A.nextName = nextName;
  A.findPoint = name => A.proj.points.find(p => p.name === name);

  A.collect = function (epochs, onlyFix, onProgress) {
    return new Promise((resolve, reject) => {
      const eps = []; let skipped = 0;
      const fixAge = A.qc.fixSince ? (Date.now() - A.qc.fixSince) / 1000 : 0;
      const jumps0 = A.qc.jumps;
      const t0 = Date.now();
      const f = p => {
        if (onlyFix && p.fix !== 'fix') { skipped++; onProgress && onProgress(eps.length, epochs, 'Αναμονή FIX…'); if (Date.now() - t0 > Math.max(30000, epochs * 3000)) { done(); reject(new Error('Δεν υπήρξε FIX — η μέτρηση ακυρώθηκε')); } return; }
        eps.push(p); onProgress && onProgress(eps.length, epochs);
        if (eps.length >= epochs) { done(); resolve({ eps, skipped, fixAge, jumps: A.qc.jumps - jumps0 }); }
      };
      const done = () => { A.epochListeners = A.epochListeners.filter(x => x !== f); A._cancelCollect = null; };
      A._cancelCollect = () => { done(); reject(new Error('Ακυρώθηκε')); };
      A.epochListeners.push(f);
    });
  };

  A.measure = async function (opt) {
    opt = opt || {};
    const btn = opt.btn || $('btn-measure-pt');
    if (A._cancelCollect) { A._cancelCollect(); return; }
    if (!A.pos) { A.toast('Δεν υπάρχει θέση — σύνδεσε δέκτη (Μενού → Σύνδεση δέκτη)', 'bad', 3500); return; }
    const onlyFix = $('sv-onlyfix').checked;
    if (onlyFix && A.pos.fix !== 'fix') { A.toast('Αναμονή για FIX…', '', 1500); }
    const epochs = opt.epochs || parseInt($('sv-epochs').value, 10) || 1;
    const label = btn.innerHTML;
    btn.classList.add('busy');
    try {
      const r = await A.collect(epochs, onlyFix, (i, n, msg) => { btn.innerHTML = msg ? '⏳ ' + msg : `■ ${i}/${n} — Άκυρο`; });
      const ev = A.qc.evaluate(r.eps, { epochs, fixAge: r.fixAge, jumps: r.jumps });
      const last = r.eps[r.eps.length - 1];
      const m = ev.mean;
      const ll = HGEO.toLL(m.E, m.N);
      const pt = {
        id: uid(), name: opt.name || $('sv-name').value.trim() || '1', code: opt.code != null ? opt.code : $('sv-code').value.trim(), type: opt.type || 'survey',
        E: m.E, N: m.N, Z: m.Z, lat: ll.lat, lon: ll.lon, ellH: last.ellH != null ? last.ellH + (m.Z - last.Z) : null,
        fix: last.fix.toUpperCase(), hrms: ev.hrms, vrms: ev.vrms, pdop: last.pdop, sats: last.sats, age: last.age, antH: last.antH,
        time: Date.now(), epochs: r.eps.length, qc: { level: ev.level, cls: ev.cls, stdH: ev.stdH, stdV: ev.stdV, maxH: ev.maxH, maxV: ev.maxV }, photos: [],
        crs: HGEO.crsName(), baseSession: A.proj.activeBase || null, baseId: A.nmea.baseId || null,
      };
      if (opt.raw) return { pt, ev };
      if (ev.level === 'fail') {
        A.sheet('QC: η μέτρηση δεν πέρασε', `<div class="result fail"><b>${esc(pt.name)}</b> — κλάση ${esc(HQC.CLASSES[ev.cls].name)}</div>${A.qcTable(ev)}
          <div class="row"><button class="btn grow" id="qc-redo">↻ Επανάληψη</button><button class="btn grow" id="qc-keep">Κράτησε με σημείωση</button></div>
          <p class="muted">Σύσταση: μετακίνησε τη ράβδο ή κάνε επανεκκίνηση επίλυσης (κάλυψε την κεραία 5 s) και ξαναμέτρησε.</p>`, b => {
          b.querySelector('#qc-redo').onclick = () => { A.closeSheet(); A.measure(opt); };
          b.querySelector('#qc-keep').onclick = () => { A.closeSheet(); pt.note = 'QC: απόρριψη — κρατήθηκε από χρήστη'; storeSurvey(pt, ev, opt); };
        });
        return;
      }
      storeSurvey(pt, ev, opt);
    } catch (e) {
      A.toast(e.message, 'bad');
    } finally {
      btn.classList.remove('busy'); btn.innerHTML = label;
    }
  };

  function storeSurvey(pt, ev, opt) {
    const P = A.proj;
    const dup = P.points.find(p => p.name === pt.name && (p.type === 'survey' || p.type === 'control'));
    if (dup && !opt.force) {
      // ανεξάρτητη επαναμέτρηση: σύγκριση με την πρώτη
      const cmp = A.qc.compare(pt, dup, dup.type === 'control' ? 'known' : 'dup');
      A.sheet('Το σημείο υπάρχει ήδη', `<p><b>${esc(pt.name)}</b> υπάρχει. Σύγκριση με την προηγούμενη μέτρηση${dup.type === 'control' ? ' (γνωστό σημείο)' : ''}:</p>
        <div class="result ${cmp.level}">${A.levelText(cmp.level)}</div>${A.qcTable(cmp)}
        <div class="row"><button class="btn grow" id="dp-new">Νέο όνομα</button><button class="btn grow" id="dp-chk">Αποθήκευση ως έλεγχος</button></div>`, b => {
        b.querySelector('#dp-new').onclick = () => { A.closeSheet(); let n = pt.name; while (A.findPoint(n)) n = nextName(n); pt.name = n; storeSurvey(pt, ev, Object.assign({}, opt, { force: true })); };
        b.querySelector('#dp-chk').onclick = () => {
          A.closeSheet(); let n = pt.name + '_ΕΛ'; let k = 2; while (A.findPoint(n)) n = pt.name + '_ΕΛ' + (k++);
          pt.name = n; pt.check = { of: dup.name, dE: cmp.dE, dN: cmp.dN, dZ: cmp.dZ, level: cmp.level };
          storeSurvey(pt, ev, Object.assign({}, opt, { force: true, keepName: true }));
        };
      });
      return;
    }
    if ($('sv-line').checked && !opt.type) {
      const prev = [...P.points].reverse().find(p => p.type === 'survey');
      pt.lineId = (prev && prev.lineId && prev.code === pt.code) ? prev.lineId : uid();
    }
    P.points.push(pt);
    if (pt.code && !P.codes.includes(pt.code)) { P.codes.unshift(pt.code); P.codes = P.codes.slice(0, 30); }
    if (!opt.keepName) { P.nextName = nextName(pt.name); $('sv-name').value = P.nextName; }
    A.lastPoint = pt;
    A.saveProject();
    A.renderPoints(); A.renderCodes(); A.updateMapLayers();
    $('sv-last').textContent = `${pt.name}: σH ${F(pt.hrms)} σV ${F(pt.vrms)} · ${pt.epochs} εποχές`;
    A.beep(1200, 0.12); vibrate(60);
    A.toast(`✓ ${pt.name} αποθηκεύτηκε${ev && ev.level === 'warn' ? ' — QC: προσοχή' : ''}${pt.check ? ' · έλεγχος ' + A.levelText(pt.check.level) : ''}`, ev && ev.level === 'warn' ? '' : 'ok');
    if (opt.after) opt.after(pt);
  }
  A.storePoint = function (pt, silent) {
    if (!pt.id) pt.id = uid(); if (!pt.photos) pt.photos = []; if (!pt.time) pt.time = Date.now();
    if (pt.E != null && pt.lat == null) { try { const ll = HGEO.toLL(pt.E, pt.N); pt.lat = ll.lat; pt.lon = ll.lon; } catch (e) { } }
    A.proj.points.push(pt); A.saveProject(); A.renderPoints(); A.updateMapLayers();
    if (!silent) A.toast('✓ ' + pt.name, 'ok');
    return pt;
  };
  A.uniqueName = function (base) { let n = base; let k = 2; while (A.findPoint(n)) n = base + '_' + (k++); return n; };

  A.renderCodes = function () {
    const P = A.proj; const box = $('code-chips');
    box.innerHTML = (P.codes || []).slice(0, 12).map(c => `<button data-c="${esc(c)}" class="${$('sv-code').value === c ? 'on' : ''}">${esc(c)}</button>`).join('');
    $('code-list').innerHTML = (P.codes || []).map(c => `<option value="${esc(c)}">`).join('');
    box.querySelectorAll('button').forEach(b => b.onclick = () => { $('sv-code').value = b.dataset.c; A.renderCodes(); });
  };

  // ---------- Χάρτης: επίπεδα ----------
  A.updateMapLayers = function () {
    const m = A.map, P = A.proj;
    m.layers.points = P.points.map(p => Object.assign(p, { done: !!p.done }));
    const lines = {};
    P.points.forEach(p => { if (p.lineId) (lines[p.lineId] = lines[p.lineId] || []).push(p); });
    m.layers.lines = Object.values(lines).filter(l => l.length > 1).map(l => ({ pts: l }));
    m.redraw();
  };

  // ---------- Λίστα σημείων ----------
  A.renderPoints = function () {
    const q = ($('pt-search').value || '').toLowerCase(), fl = $('pt-filter').value;
    const pts = A.proj.points.filter(p => (fl === 'all' || p.type === fl) && (!q || (p.name + ' ' + (p.code || '')).toLowerCase().includes(q)));
    const tagName = { survey: 'MEAS', stake: 'STAKE', staked: 'DONE', calc: 'CALC', control: 'CTRL' };
    const html = pts.slice().reverse().slice(0, 400).map(p => `<div class="li" data-id="${p.id}">
      <span class="tag ${p.type}">${tagName[p.type] || p.type}</span><span class="nm">${esc(p.name)}</span><span class="cd">${esc(p.code || '')}${p.done ? ' ✓' : ''}${p.photos && p.photos.length ? ' 📷' + p.photos.length : ''}${p.qc && p.qc.level !== 'ok' ? ' ⚠' : ''}</span>
      <span class="xy">${F(p.E)}<br>${F(p.N)} · ${F(p.Z)}</span></div>`).join('');
    $('pt-list').innerHTML = html || '<p class="muted">Δεν υπάρχουν σημεία. Μέτρησε από το Survey ή κάνε Εισαγωγή TXT από το Μενού.</p>';
    $('pt-list').querySelectorAll('.li').forEach(el => el.onclick = () => A.pointSheet(A.proj.points.find(p => p.id === el.dataset.id)));
  };
  $('pt-search').oninput = () => A.renderPoints(); $('pt-filter').onchange = () => A.renderPoints();

  A.pointSheet = async function (p) {
    if (!p) return;
    const d = p.time ? new Date(p.time) : null;
    const rows = [['X (E)', F(p.E)], ['Y (N)', F(p.N)], ['Z', F(p.Z)], ['Κωδικός', esc(p.code || '—')], ['Τύπος', p.type]];
    if (p.fix) rows.push(['Λύση', p.fix], ['σH / σV', F(p.hrms) + ' / ' + F(p.vrms)], ['PDOP · SV', (p.pdop != null ? p.pdop.toFixed(1) : '—') + ' · ' + (p.sats || '—')], ['Εποχές', p.epochs || 1], ['Ύψος κεραίας', F(p.antH)]);
    if (p.qc) rows.push(['QC', `<span class="qc-${p.qc.level}">${A.levelText(p.qc.level)}</span> (${p.qc.cls})`]);
    if (p.lat != null) rows.push(['φ, λ (WGS84)', p.lat.toFixed(8) + ', ' + p.lon.toFixed(8)]);
    if (p.stake) rows.push(['Στόχος', esc(p.stake.target)], ['ΔX / ΔY / ΔZ', F(p.stake.dE) + ' / ' + F(p.stake.dN) + ' / ' + F(p.stake.dZ)]);
    if (p.check) rows.push(['Έλεγχος του', esc(p.check.of)], ['ΔX/ΔY/ΔZ', F(p.check.dE) + ' / ' + F(p.check.dN) + ' / ' + F(p.check.dZ)]);
    if (d) rows.push(['Ημ/νία', d.toLocaleString('el-GR')]);
    if (p.note) rows.push(['Σημείωση', esc(p.note)]);
    A.sheet('Σημείο ' + p.name, `<div class="kv">${rows.map(r => `<span>${r[0]}</span><span>${r[1]}</span>`).join('')}</div>
      <h4>Φωτογραφίες</h4><div class="photos" id="ps-photos"><span class="muted">—</span></div>
      <div class="row"><button class="btn grow" id="ps-photo">📷 Φωτογραφία</button><button class="btn grow primary" id="ps-stake">◎ Χάραξη</button></div>
      <div class="row"><button class="btn grow" id="ps-edit">✎ Επεξεργασία</button><button class="btn grow" id="ps-check">✓ Μέτρηση ελέγχου</button><button class="btn danger" id="ps-del">🗑</button></div>`, async b => {
      const box = b.querySelector('#ps-photos');
      if (p.photos && p.photos.length) {
        box.innerHTML = p.photos.map((ph, i) => `<img src="${ph.thumb}" data-i="${i}" alt="">`).join('');
        box.querySelectorAll('img').forEach(im => im.onclick = () => A.viewPhoto(p, +im.dataset.i));
      }
      b.querySelector('#ps-photo').onclick = () => A.takePhoto(p);
      b.querySelector('#ps-stake').onclick = () => { A.closeSheet(); A.setTab('stake'); A.setStakeMode('point'); A.setTarget(p); };
      b.querySelector('#ps-edit').onclick = () => A.editPoint(p);
      b.querySelector('#ps-check').onclick = () => A.checkShot(p);
      b.querySelector('#ps-del').onclick = () => A.confirm('Διαγραφή', `Διαγραφή του σημείου <b>${esc(p.name)}</b>;`, 'Διαγραφή', () => {
        (p.photos || []).forEach(ph => HIO.photoDel(ph.id));
        A.proj.points = A.proj.points.filter(x => x !== p); A.saveProject(); A.renderPoints(); A.updateMapLayers();
        if (A.stake.target === p) A.setTarget(null);
      });
    });
  };
  A.editPoint = function (p) {
    A.sheet('Επεξεργασία ' + p.name, `<label class="fld"><span>Όνομα</span><input id="ep-n" value="${esc(p.name)}"></label>
      <label class="fld"><span>Κωδικός</span><input id="ep-c" value="${esc(p.code || '')}"></label>
      <div class="row"><label class="fld grow"><span>X (E)</span><input id="ep-e" type="number" step="0.001" inputmode="decimal" value="${p.E != null ? p.E.toFixed(3) : ''}"></label><label class="fld grow"><span>Y (N)</span><input id="ep-y" type="number" step="0.001" inputmode="decimal" value="${p.N != null ? p.N.toFixed(3) : ''}"></label></div>
      <div class="row"><label class="fld grow"><span>Z</span><input id="ep-z" type="number" step="0.001" inputmode="decimal" value="${p.Z != null ? p.Z.toFixed(3) : ''}"></label>
      <label class="fld grow"><span>Τύπος</span><select id="ep-t">${['survey', 'stake', 'staked', 'calc', 'control'].map(t => `<option ${t === p.type ? 'selected' : ''} value="${t}">${{ survey: 'Μετρημένο', stake: 'Προς χάραξη', staked: 'Χαραγμένο', calc: 'Υπολογισμένο', control: 'Γνωστό / Τριγωνομετρικό' }[t]}</option>`).join('')}</select></label></div>
      <label class="fld"><span>Σημείωση</span><textarea id="ep-note" rows="2">${esc(p.note || '')}</textarea></label>
      <button class="btn primary" id="ep-save">Αποθήκευση</button>`, b => {
      b.querySelector('#ep-save').onclick = () => {
        const v = id => b.querySelector(id).value;
        const nz = v('#ep-z');
        const moved = parseFloat(v('#ep-e')) !== p.E || parseFloat(v('#ep-y')) !== p.N;
        Object.assign(p, { name: v('#ep-n').trim() || p.name, code: v('#ep-c').trim(), E: parseFloat(v('#ep-e')), N: parseFloat(v('#ep-y')), Z: nz === '' ? null : parseFloat(nz), type: v('#ep-t'), note: v('#ep-note') });
        if (moved) { try { const ll = HGEO.toLL(p.E, p.N); p.lat = ll.lat; p.lon = ll.lon; } catch (e) { } }
        A.saveProject(); A.renderPoints(); A.updateMapLayers(); A.closeSheet(); A.toast('✓ Αποθηκεύτηκε', 'ok');
      };
    });
  };
  A.addPointManual = function (pre) {
    pre = pre || {};
    A.sheet('Νέο σημείο', `<label class="fld"><span>Όνομα</span><input id="np-n" value="${esc(pre.name || A.uniqueName('Σ1'))}"></label>
      <div class="row"><label class="fld grow"><span>X (E)</span><input id="np-e" type="number" step="0.001" inputmode="decimal" value="${pre.E != null ? pre.E.toFixed(3) : ''}"></label><label class="fld grow"><span>Y (N)</span><input id="np-y" type="number" step="0.001" inputmode="decimal" value="${pre.N != null ? pre.N.toFixed(3) : ''}"></label></div>
      <div class="row"><label class="fld grow"><span>Z</span><input id="np-z" type="number" step="0.001" inputmode="decimal" value="${pre.Z != null ? pre.Z.toFixed(3) : ''}"></label><label class="fld grow"><span>Κωδικός</span><input id="np-c" value="${esc(pre.code || '')}"></label></div>
      <label class="fld"><span>Τύπος</span><select id="np-t"><option value="stake">Προς χάραξη</option><option value="control">Γνωστό / Τριγωνομετρικό</option><option value="calc">Υπολογισμένο</option></select></label>
      <button class="btn primary" id="np-save">Προσθήκη</button>`, b => {
      b.querySelector('#np-save').onclick = () => {
        const v = id => b.querySelector(id).value;
        const E = parseFloat(v('#np-e')), N = parseFloat(v('#np-y'));
        if (!isFinite(E) || !isFinite(N)) return A.toast('Συμπλήρωσε X, Y', 'bad');
        A.storePoint({ name: A.findPoint(v('#np-n').trim()) ? A.uniqueName(v('#np-n').trim()) : v('#np-n').trim(), E, N, Z: v('#np-z') === '' ? null : parseFloat(v('#np-z')), code: v('#np-c').trim(), type: v('#np-t') });
        A.closeSheet();
      };
    });
  };
  $('pt-add').onclick = () => A.addPointManual();

  // Μέτρηση ελέγχου σε σημείο (γνωστό ή μετρημένο)
  A.checkShot = async function (p) {
    A.closeSheet();
    if (!A.pos) return A.toast('Δεν υπάρχει θέση', 'bad');
    A.toast('Μέτρηση ελέγχου σε ' + p.name + '…');
    try {
      const L = A.qc.lim();
      const r = await A.measure({ raw: true, epochs: Math.max(parseInt($('sv-epochs').value, 10) || 5, 5) });
      if (!r) return;
      const cmp = A.qc.compare(r.pt, p, p.type === 'control' ? 'known' : 'dup');
      A.sheet('Έλεγχος σε ' + p.name, `<div class="result ${cmp.level}"><b>${A.levelText(cmp.level)}</b> — κλάση ${esc(L.name)}</div>${A.qcTable(cmp)}<p class="muted">Ανοχή: οριζ. ${L.h95.toFixed(3)} m, κατ. ${L.v95.toFixed(3)} m (95%).</p>
        <button class="btn primary" id="ck-save">Αποθήκευση ελέγχου</button>`, b => {
        b.querySelector('#ck-save').onclick = () => { const pt = r.pt; pt.name = A.uniqueName(p.name + '_ΕΛ'); pt.check = { of: p.name, dE: cmp.dE, dN: cmp.dN, dZ: cmp.dZ, level: cmp.level }; A.storePoint(pt); A.closeSheet(); };
      });
    } catch (e) { A.toast(e.message, 'bad'); }
  };

  // ---------- Φωτογραφίες ----------
  A.takePhoto = function (pt) {
    pt = pt || A.lastPoint;
    if (!pt) return A.toast('Μέτρησε πρώτα ένα σημείο (η φωτογραφία συνδέεται με σημείο)', 'bad', 3200);
    A._photoFor = pt;
    const inp = $('photo-in'); inp.value = ''; inp.click();
  };
  $('photo-in').onchange = async e => {
    const f = e.target.files && e.target.files[0]; const pt = A._photoFor; if (!f || !pt) return;
    try {
      A.toast('Αποθήκευση φωτογραφίας…');
      const d = new Date();
      const stamp = [`${pt.name}${pt.code ? ' · ' + pt.code : ''}  —  ${A.proj.name}`, `X ${F(pt.E)}  Y ${F(pt.N)}  Z ${F(pt.Z)}  (${HGEO.crsName().split(' (')[0]})`, d.toLocaleString('el-GR') + (A.pos ? `  ·  ${A.pos.fix.toUpperCase()}` : '')];
      const r = await HIO.processPhoto(f, stamp);
      const id = 'ph:' + A.proj.id + ':' + uid();
      await HIO.photoSet(id, r.blob);
      pt.photos = pt.photos || []; pt.photos.push({ id, thumb: r.thumb, time: Date.now() });
      A.saveProject(); A.renderPoints(); A.updateMapLayers();
      A.toast('📷 Συνδέθηκε με ' + pt.name, 'ok');
      if (!$('sheet').classList.contains('hidden') && $('sh-title').textContent === 'Σημείο ' + pt.name) A.pointSheet(pt);
    } catch (err) { A.toast('Σφάλμα φωτογραφίας: ' + err.message, 'bad'); }
  };
  A.viewPhoto = async function (p, i) {
    const ph = p.photos[i]; const blob = await HIO.photoGet(ph.id);
    const url = blob ? URL.createObjectURL(blob) : ph.thumb;
    A.sheet(p.name + ' · φωτογραφία ' + (i + 1), `<img src="${url}" style="width:100%;border-radius:10px" alt=""><div class="row"><button class="btn grow" id="vp-back">◀ Πίσω</button><button class="btn grow" id="vp-share">Κοινή χρήση</button><button class="btn danger" id="vp-del">🗑</button></div>`, b => {
      b.querySelector('#vp-back').onclick = () => A.pointSheet(p);
      b.querySelector('#vp-share').onclick = () => blob && HIO.share([{ name: HIO.photoName(p, i), data: blob, mime: 'image/jpeg' }], { subject: p.name });
      b.querySelector('#vp-del').onclick = () => { HIO.photoDel(ph.id); p.photos.splice(i, 1); A.saveProject(); A.renderPoints(); A.pointSheet(p); };
    });
  };
  $('btn-photo').onclick = () => A.takePhoto();

  // ---------- Ήχοι / δόνηση ----------
  let actx = null;
  A.beep = function (freq, dur) {
    if (!A.settings.beep) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), gn = actx.createGain();
      o.frequency.value = freq || 880; gn.gain.value = 0.15;
      o.connect(gn); gn.connect(actx.destination); o.start(); o.stop(actx.currentTime + (dur || 0.08));
    } catch (e) { }
  };
  function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } }
  A.vibrate = vibrate;

  // ---------- Καρτέλες ----------
  A.setTab = function (t) {
    A.tab = t;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    document.querySelectorAll('.pane').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== t));
    if (t === 'points') A.renderPoints();
    setTimeout(() => A.map._resize(), 30);
  };
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => A.setTab(b.dataset.tab));

  // ---------- Survey κουμπιά ----------
  $('btn-measure-pt').onclick = () => A.measure();
  $('sv-ant').onchange = () => { A.settings.antH = parseFloat($('sv-ant').value) || 0; A.saveSettings(); };
  $('sv-onlyfix').onchange = () => { A.settings.onlyFix = $('sv-onlyfix').checked; A.saveSettings(); };
  $('sv-epochs').onchange = () => { A.settings.epochs = parseInt($('sv-epochs').value, 10); A.saveSettings(); };
  $('sv-code').oninput = () => A.renderCodes();
  $('sv-name').onchange = () => { A.proj.nextName = $('sv-name').value.trim(); A.saveProject(); };
  $('status').onclick = () => A.gnssSheet && A.gnssSheet();

  // ==================== ΧΑΡΑΞΗ ====================
  const S = A.stake;
  A.setStakeMode = function (m) {
    S.mode = m;
    document.querySelectorAll('#so-mode button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
    $('so-line-opts').classList.toggle('hidden', !(m === 'line' || m === 'base'));
    $('so-target-row').classList.remove('hidden');
    A.updateStakeTarget(); A.updateGuidance();
  };
  document.querySelectorAll('#so-mode button').forEach(b => b.onclick = () => {
    const m = b.dataset.m;
    if (m === 'surface' && !S.surface) { A.setStakeMode(m); A.runTool && A.runTool('floor'); return; }
    if (m === 'base' && !S.baseline) { A.setStakeMode(m); A.runTool && A.runTool('square'); return; }
    A.setStakeMode(m);
  });

  A.stakeList = () => {
    const st = A.proj.points.filter(p => p.type === 'stake');
    return st.length ? st : A.proj.points.filter(p => p.type !== 'staked');
  };
  A.setTarget = function (p) {
    S.target = p; if (p) { S.mode = S.mode === 'surface' ? 'point' : S.mode; }
    A.updateStakeTarget(); A.updateGuidance();
    if (p && A.map && p.E != null) { // εμφάνισε θέση + στόχο
      const m = A.map, P = A.pos; const [sx, sy] = m.w2s(p.E, p.N);
      if (sx < 30 || sy < 30 || sx > m.w - 30 || sy > m.h - 30) {
        if (P) { const d = Math.max(4, Math.hypot(p.E - P.E, p.N - P.N)); m.view.s = Math.min(m.w, m.h) / (d * 2.6); m.follow = true; m.view.cx = P.E; m.view.cy = P.N; }
        else m.centerOn(p.E, p.N, Math.max(m.view.s, 4));
        m.redraw();
      }
    }
  };
  A.setLine = function (pts, name) { S.line = pts && pts.length > 1 ? { pts: pts.map(p => ({ E: p.E, N: p.N, Z: p.Z })), name: name || 'Γραμμή' } : null; A.updateStakeTarget(); A.updateGuidance(); };
  A.updateStakeTarget = function () {
    const m = A.map; let txt = 'Επίλεξε στόχο';
    m.layers.target = null; m.layers.targetLine = null;
    if (S.mode === 'point' && S.target) { txt = `${S.target.name}${S.target.code ? ' · ' + S.target.code : ''}${S.target.Z != null ? ' · Z ' + S.target.Z.toFixed(3) : ''}`; m.layers.target = { E: S.target.E, N: S.target.N, tol: A.settings.tolH }; }
    if (S.mode === 'line') {
      if (S.line) { txt = S.line.name + ' · L=' + lineLen(S.line.pts).toFixed(2) + ' m'; m.layers.targetLine = S.line.pts; const lt = lineTarget(); if (lt) m.layers.target = { E: lt.E, N: lt.N, tol: A.settings.tolH }; }
      else txt = 'Επίλεξε γραμμή (⌖ στον χάρτη ή από σημεία)';
    }
    if (S.mode === 'base') {
      if (S.baseline) { txt = `Γωνίασμα: ${S.baseline.a.name} → ${S.baseline.b.name}`; m.layers.targetLine = [S.baseline.a, S.baseline.b]; const lt = lineTarget(); if (lt) m.layers.target = { E: lt.E, N: lt.N, tol: A.settings.tolH }; }
      else txt = 'Όρισε βασική γραμμή (COGO → Γωνίασμα)';
    }
    if (S.mode === 'surface') txt = S.surface ? 'Επιφάνεια: ' + S.surface.name : 'Όρισε επιφάνεια (COGO → Κλίση δαπέδου)';
    $('so-target').textContent = txt; $('sf-target').textContent = txt;
    m.redraw();
  };
  function lineLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].E - pts[i - 1].E, pts[i].N - pts[i - 1].N); return L; }
  function lineTarget() {
    const st = parseFloat($('so-st').value), off = parseFloat($('so-off').value) || 0;
    if (!isFinite(st)) return null;
    if (S.mode === 'base' && S.baseline) { const p = HCOGO.baselinePoint(S.baseline.a, S.baseline.b, st, off); p.Z = S.baseline.a.Z; return p; }
    if (S.mode === 'line' && S.line) return HGEO.pointAtStation(S.line.pts, st, off);
    return null;
  }
  $('so-st').oninput = $('so-off').oninput = () => { A.updateStakeTarget(); A.updateGuidance(); };

  function navTarget(dir) {
    if (S.mode === 'line' || S.mode === 'base') {
      const step = parseFloat($('so-step').value) || 10;
      const cur = parseFloat($('so-st').value);
      const st = isFinite(cur) ? Math.max(0, cur + dir * step) : 0;
      $('so-st').value = String(Math.round(st * 1000) / 1000);
      A.updateStakeTarget(); A.updateGuidance(); return;
    }
    const list = A.stakeList(); if (!list.length) return A.toast('Δεν υπάρχουν σημεία για χάραξη');
    let i = list.indexOf(S.target);
    i = i < 0 ? 0 : (i + dir + list.length) % list.length;
    A.setTarget(list[i]);
  }
  $('so-prev').onclick = $('sf-prev').onclick = () => navTarget(-1);
  $('so-next').onclick = $('sf-next').onclick = () => navTarget(1);
  $('so-pick').onclick = () => {
    if (S.mode === 'surface') return A.runTool('floor');
    if (S.mode === 'base') return A.runTool('square');
    if (S.mode === 'line') return A.pickLineSheet();
    A.pickPointSheet('Στόχος χάραξης', p => A.setTarget(p));
  };
  $('so-map').onclick = () => {
    if (S.mode === 'line') A.startPick('Πάτα πάνω σε γραμμή του σχεδίου', { line: true }, r => {
      if (r.ent) { const pts = r.ent.closed ? r.ent.pts.concat([r.ent.pts[0]]) : r.ent.pts; A.setLine(pts, 'Γραμμή σχεδίου (' + r.ent.layer + ')'); $('so-st').value = ''; }
      else A.toast('Δεν βρέθηκε γραμμή — πάτα πάνω της', 'bad');
    });
    else A.startPick('Πάτα σε σημείο ή κορυφή του σχεδίου', {}, r => {
      if (r.ref) A.setTarget(r.ref);
      else { const p = { name: A.uniqueName('V' + (A.proj.points.length + 1)), E: r.E, N: r.N, Z: r.Z != null && r.Z !== 0 ? r.Z : null, type: 'stake', code: r.ent ? r.ent.layer : '' }; A.setTarget(A.storePoint(p, true)); }
      A.setStakeMode('point');
    });
  };
  $('so-ref').onchange = () => {
    A.settings.soRef = $('so-ref').value; A.saveSettings();
    if (A.settings.soRef === 'back' && !A.stake.backsight) A.pickPointSheet('Σημείο προσανατολισμού', p => { A.stake.backsight = p; A.updateGuidance(); });
    A.updateGuidance();
  };

  // Υπολογισμός καθοδήγησης
  function guidance() {
    const P = A.pos; if (!P) return null;
    const out = { mode: S.mode };
    let T = null;
    if (S.mode === 'point' && S.target) T = S.target;
    if ((S.mode === 'line' || S.mode === 'base')) {
      T = lineTarget();
      if (!T) { // ζωντανή χιλιομέτρηση / offset
        if (S.mode === 'line' && S.line) {
          const so = HGEO.stationOffset(S.line.pts, P);
          out.live = so; out.dZ = (so && so.z != null && P.Z != null) ? so.z - P.Z : null; return out;
        }
        if (S.mode === 'base' && S.baseline) {
          const so = HCOGO.baselineSO(S.baseline.a, S.baseline.b, P);
          out.live = so; out.dZ = (S.baseline.a.Z != null && P.Z != null) ? S.baseline.a.Z - P.Z : null; return out;
        }
        return null;
      }
      T.name = 'Χ.Θ. ' + $('so-st').value;
    }
    if (S.mode === 'surface') {
      if (!S.surface || P.Z == null) return null;
      const z = S.surface.fn(P.E, P.N);
      out.surfZ = z; out.dZ = z - P.Z; return out;
    }
    if (!T) return null;
    out.T = T;
    const dE = T.E - P.E, dN = T.N - P.N;
    out.dE = dE; out.dN = dN; out.dist = Math.hypot(dE, dN);
    out.az = HGEO.azimuth(P, T);
    out.dZ = (T.Z != null && P.Z != null) ? T.Z - P.Z : null;
    let h = null;
    const ref = A.settings.soRef;
    if (ref === 'move') h = P.heading;
    else if (ref === 'back' && A.stake.backsight) h = HGEO.azimuth(P, A.stake.backsight);
    out.ref = h == null ? 'north' : ref;
    if (h != null) {
      const r = h * Math.PI / 180;
      out.fwd = dE * Math.sin(r) + dN * Math.cos(r);
      out.right = dE * Math.cos(r) - dN * Math.sin(r);
      out.rel = ((out.az - h) + 360) % 360;
    }
    return out;
  }

  function dirText(v, pos, neg) { return (v >= 0 ? pos : neg) + ' ' + Math.abs(v).toFixed(3); }
  function cfText(dZ) {
    if (dZ == null) return { t: 'Z —', c: '' };
    const tv = A.settings.tolV;
    if (Math.abs(dZ) <= tv) return { t: '▬ Στη στάθμη ' + (dZ >= 0 ? '+' : '') + dZ.toFixed(3), c: 'on' };
    return dZ > 0 ? { t: '▲ Επίχωση ' + dZ.toFixed(3), c: 'fill' } : { t: '▼ Εκσκαφή ' + Math.abs(dZ).toFixed(3), c: 'cut' };
  }

  let lastBeep = 0;
  A.updateGuidance = function () {
    const G = guidance(); A.lastGuidance = G;
    const box = $('so-guide');
    box.classList.remove('near', 'in');
    let dist = '—', fb = '—', lr = '—', cf = { t: '—', c: '' }, sub = '';
    let fbK = 'Μπρος/Πίσω', lrK = 'Δεξιά/Αριστερά';
    if (G) {
      cf = cfText(G.dZ);
      if (G.live) {
        dist = Math.abs(G.live.offset).toFixed(3);
        fb = 'Χ.Θ. ' + G.live.station.toFixed(3);
        lr = G.live.offset >= 0 ? 'Δεξιά της γραμμής ' + G.live.offset.toFixed(3) : 'Αριστερά της γραμμής ' + Math.abs(G.live.offset).toFixed(3);
        fbK = 'Χιλιομέτρηση'; lrK = 'Offset';
        sub = 'Ζωντανή θέση ως προς τη γραμμή · Μήκος ' + (G.live.length || 0).toFixed(2) + ' m';
        if (Math.abs(G.live.offset) <= A.settings.tolH) box.classList.add('in');
      } else if (G.surfZ != null) {
        dist = G.dZ.toFixed(3); fb = 'Σχεδ. Z ' + G.surfZ.toFixed(3); lr = 'Έδαφος Z ' + (A.pos.Z).toFixed(3);
        fbK = 'Σχεδιαστικό'; lrK = 'Τρέχον'; sub = S.surface.name;
        if (Math.abs(G.dZ) <= A.settings.tolV) box.classList.add('in');
      } else if (G.T) {
        dist = G.dist.toFixed(3);
        if (G.fwd != null) { fb = dirText(G.fwd, '↑ Μπρος', '↓ Πίσω'); lr = dirText(G.right, '→ Δεξιά', '← Αριστερά'); }
        else { fb = dirText(G.dN, '↑ Βορράς ΔY', '↓ Νότος ΔY'); lr = dirText(G.dE, '→ Ανατολή ΔX', '← Δύση ΔX'); fbK = 'ΔY (Βορράς/Νότος)'; lrK = 'ΔX (Ανατολή/Δύση)'; }
        sub = `ΔX ${G.dE.toFixed(3)} · ΔY ${G.dN.toFixed(3)} · Αζιμ. ${G.az.toFixed(1)}°` + (G.ref === 'move' && A.pos.heading == null ? '' : '') + (A.settings.soRef === 'move' && A.pos.heading == null ? ' · Περπάτησε λίγα μέτρα για κατεύθυνση' : '');
        const tol = A.settings.tolH;
        if (G.dist <= tol) box.classList.add('in'); else if (G.dist < 1) box.classList.add('near');
        // ήχος
        const now = Date.now();
        if (A.tab === 'stake' || !$('so-fullscreen').classList.contains('hidden')) {
          const iv = G.dist <= tol ? 350 : (G.dist < 0.3 ? 500 : G.dist < 1 ? 800 : G.dist < 3 ? 1400 : 0);
          if (iv && now - lastBeep > iv) { lastBeep = now; A.beep(G.dist <= tol ? 1760 : 880 + (3 - Math.min(3, G.dist)) * 250, 0.06); if (G.dist <= tol) vibrate(40); }
        }
      }
    } else if (!A.pos) sub = 'Χωρίς θέση GNSS';
    $('so-dist').textContent = dist; $('so-fb').textContent = fb; $('so-lr').textContent = lr;
    const cfe = $('so-cf'); cfe.textContent = cf.t; cfe.className = 'so-dir cutfill ' + cf.c; $('so-sub').textContent = sub;
    $('sf-dist').textContent = dist === '—' ? '—' : dist + ' m'; $('sf-fb').textContent = fb; $('sf-lr').textContent = lr; $('sf-cf').textContent = cf.t;
    $('sf-fb-k').textContent = fbK; $('sf-lr-k').textContent = lrK;
    $('sf-cf').style.color = cf.c === 'cut' ? 'var(--bad)' : cf.c === 'fill' ? 'var(--primary)' : cf.c === 'on' ? 'var(--ok)' : '';
    drawEye($('so-eye'), G); if (!$('so-fullscreen').classList.contains('hidden')) drawEye($('sf-eye'), G);
  };

  // «Μάτι» χάραξης (bullseye): μακριά δείχνει βέλος, κοντά δακτυλίους με κλίμακα
  function drawEye(cv, G) {
    const dpr = window.devicePixelRatio || 1, r = cv.getBoundingClientRect();
    const W = Math.max(100, r.width), H = Math.max(100, r.height);
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    const css = getComputedStyle(document.documentElement);
    const C = k => css.getPropertyValue(k).trim();
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 6;
    x.lineWidth = 2; x.strokeStyle = C('--line'); x.fillStyle = C('--panel');
    x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill(); x.stroke();
    if (!G) { x.fillStyle = C('--muted'); x.font = '600 14px system-ui'; x.textAlign = 'center'; x.fillText(A.pos ? 'Επίλεξε στόχο' : 'Χωρίς θέση', cx, cy + 5); x.textAlign = 'left'; return; }
    if (G.live || G.surfZ != null) {
      // οριζόντια «αεροστάθμη»
      const v = G.live ? G.live.offset : G.dZ, tol = G.live ? A.settings.tolH : A.settings.tolV;
      const k = R / Math.max(tol * 10, Math.min(2, Math.abs(v) * 1.3));
      x.strokeStyle = C('--ok'); x.lineWidth = 3; x.beginPath();
      if (G.live) { x.moveTo(cx, cy - R + 6); x.lineTo(cx, cy + R - 6); } else { x.moveTo(cx - R + 6, cy); x.lineTo(cx + R - 6, cy); }
      x.stroke();
      const pos = Math.max(-R + 10, Math.min(R - 10, v * k));
      x.fillStyle = Math.abs(v) <= tol ? C('--ok') : C('--accent');
      x.beginPath(); if (G.live) x.arc(cx - pos, cy, 11, 0, 7); else x.arc(cx, cy + pos, 11, 0, 7); x.fill();
      return;
    }
    const tol = A.settings.tolH;
    if (G.dist > 2 || G.rel == null && G.dist > 2) {
      const ang = (G.rel != null ? G.rel : G.az) * Math.PI / 180;
      x.save(); x.translate(cx, cy); x.rotate(ang);
      x.fillStyle = C('--accent'); x.beginPath();
      x.moveTo(0, -R + 8); x.lineTo(R * 0.38, -R * 0.1); x.lineTo(R * 0.14, -R * 0.1); x.lineTo(R * 0.14, R * 0.6); x.lineTo(-R * 0.14, R * 0.6); x.lineTo(-R * 0.14, -R * 0.1); x.lineTo(-R * 0.38, -R * 0.1); x.closePath(); x.fill();
      x.restore();
      if (G.rel == null) { x.fillStyle = C('--muted'); x.font = '700 12px system-ui'; x.fillText('N↑', 8, 16); }
      return;
    }
    // κοντά: κλίμακα, στόχος στο κέντρο, θέση ως κουκκίδα
    const scaleM = [0.05, 0.1, 0.25, 0.5, 1, 2.5].find(v => G.dist <= v * 0.8) || 2.5;
    const k = R / scaleM;
    x.strokeStyle = C('--line'); x.lineWidth = 1;
    [0.25, 0.5, 0.75].forEach(f => { x.beginPath(); x.arc(cx, cy, R * f, 0, 7); x.stroke(); });
    x.beginPath(); x.moveTo(cx - R, cy); x.lineTo(cx + R, cy); x.moveTo(cx, cy - R); x.lineTo(cx, cy + R); x.stroke();
    x.fillStyle = C('--ok') + '33'; x.strokeStyle = C('--ok'); x.lineWidth = 2;
    x.beginPath(); x.arc(cx, cy, Math.max(4, tol * k), 0, 7); x.fill(); x.stroke();
    // θέση ράβδου: αντίθετο του διανύσματος προς στόχο, σε σχετικό σύστημα
    let px, py;
    if (G.fwd != null) { px = -G.right * k; py = G.fwd * k; } else { px = -G.dE * k; py = G.dN * k; }
    const inT = G.dist <= tol;
    x.fillStyle = inT ? C('--ok') : C('--accent');
    x.beginPath(); x.arc(cx + Math.max(-R, Math.min(R, px)), cy + Math.max(-R, Math.min(R, py)), 9, 0, 7); x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 2; x.stroke();
    x.fillStyle = C('--muted'); x.font = '700 11px system-ui';
    x.fillText('κύκλος: ' + (scaleM * 0.25 >= 0.1 ? (scaleM * 0.25).toFixed(2) + ' m' : (scaleM * 25).toFixed(1) + ' cm'), 6, H - 6);
  }

  // Καταγραφή χαραγμένου
  A.storeStake = async function () {
    const G = guidance();
    if (!A.pos) return A.toast('Δεν υπάρχει θέση', 'bad');
    if (!G || (!G.T && !G.live && G.surfZ == null)) return A.toast('Δεν υπάρχει στόχος', 'bad');
    const btns = [$('so-store'), $('sf-store')];
    btns.forEach(b => b.classList.add('busy'));
    try {
      const r = await A.measure({ raw: true, btn: $('so-store') });
      if (!r) return;
      const pt = r.pt; const G2 = guidance() || G;
      pt.type = 'staked';
      if (G.T) {
        pt.name = A.uniqueName((G.T.name || 'S') + '_X');
        pt.stake = { target: G.T.name, tE: G.T.E, tN: G.T.N, tZ: G.T.Z, dE: pt.E - G.T.E, dN: pt.N - G.T.N, dZ: (pt.Z != null && G.T.Z != null) ? pt.Z - G.T.Z : null };
        pt.code = G.T.code || pt.code;
        if (S.target === G.T) { G.T.done = true; }
      } else if (G.live) {
        pt.name = A.uniqueName('Χ' + G.live.station.toFixed(2));
        pt.stake = { target: (S.line ? S.line.name : 'Βασική') + ' Χ.Θ.' + G.live.station.toFixed(3) + ' off ' + G.live.offset.toFixed(3), dE: 0, dN: 0, dZ: G2.dZ != null ? -G2.dZ : null, station: G.live.station, offset: G.live.offset };
      } else if (G.surfZ != null) {
        pt.name = A.uniqueName('ΕΠ1'); pt.stake = { target: S.surface.name, dZ: -G2.dZ, surfZ: G2.surfZ, dE: 0, dN: 0 };
      }
      const ok = pt.stake.dE == null || Math.hypot(pt.stake.dE, pt.stake.dN) <= A.settings.tolH;
      A.storePoint(pt, true); A.lastPoint = pt;
      A.beep(1500, 0.15); vibrate(80);
      A.toast(`✓ ${pt.name} — ΔXY ${Math.hypot(pt.stake.dE || 0, pt.stake.dN || 0).toFixed(3)} m${pt.stake.dZ != null ? ' · ΔZ ' + pt.stake.dZ.toFixed(3) : ''}${ok ? '' : ' (εκτός ανοχής)'}`, ok ? 'ok' : '', 3500);
      if (G.T && S.mode === 'point' && A.settings.autoNext !== false) {
        const list = A.stakeList().filter(p => !p.done);
        if (list.length) { const i = A.stakeList().indexOf(S.target); const nx = A.stakeList().slice(i + 1).find(p => !p.done) || list[0]; if (nx && nx !== S.target) setTimeout(() => A.setTarget(nx), 700); }
      }
      A.updateMapLayers();
    } catch (e) { A.toast(e.message, 'bad'); } finally { btns.forEach(b => b.classList.remove('busy')); }
  };
  $('so-store').onclick = $('sf-store').onclick = () => A.storeStake();
  $('so-photo').onclick = $('sf-photo').onclick = () => A.takePhoto(A.lastPoint && A.lastPoint.type === 'staked' ? A.lastPoint : (S.target || A.lastPoint));
  $('so-full').onclick = () => { $('so-fullscreen').classList.remove('hidden'); requestWake(); A.updateGuidance(); };
  $('sf-close').onclick = () => $('so-fullscreen').classList.add('hidden');

  // ---------- Επιλογή σημείου (λίστα + τρέχουσα θέση + χάρτης) ----------
  A.pickPointSheet = function (title, cb, opts) {
    opts = opts || {};
    const draw = (q) => {
      const pts = A.proj.points.filter(p => !q || (p.name + ' ' + (p.code || '')).toLowerCase().includes(q.toLowerCase()));
      return pts.slice().reverse().slice(0, 300).map(p => `<div class="li" data-id="${p.id}"><span class="tag ${p.type}">${p.type.slice(0, 5).toUpperCase()}</span><span class="nm">${esc(p.name)}</span><span class="cd">${esc(p.code || '')}${p.done ? ' ✓' : ''}</span><span class="xy">${F(p.E)}<br>${F(p.N)}</span></div>`).join('') || '<p class="muted">Κανένα σημείο</p>';
    };
    A.sheet(title, `<div class="row"><input id="pk-q" class="grow" placeholder="Αναζήτηση"><button class="btn" id="pk-map">⌖ Χάρτης</button>${opts.noCur ? '' : '<button class="btn" id="pk-cur">📍 Θέση</button>'}</div><div class="list" id="pk-list">${draw('')}</div>`, b => {
      const bind = () => b.querySelectorAll('.li').forEach(el => el.onclick = () => { const p = A.proj.points.find(x => x.id === el.dataset.id); A.closeSheet(); cb(p); });
      bind();
      b.querySelector('#pk-q').oninput = e => { b.querySelector('#pk-list').innerHTML = draw(e.target.value); bind(); };
      b.querySelector('#pk-map').onclick = () => { A.closeSheet(); A.startPick('Πάτα σε σημείο / κορυφή', {}, r => cb(r.ref || { name: 'Κορυφή σχεδίου', E: r.E, N: r.N, Z: r.Z || null, _tmp: true })); };
      const cur = b.querySelector('#pk-cur'); if (cur) cur.onclick = () => { if (!A.pos) return A.toast('Δεν υπάρχει θέση', 'bad'); A.closeSheet(); cb({ name: 'Τρέχουσα θέση', E: A.pos.E, N: A.pos.N, Z: A.pos.Z, _tmp: true }); };
    });
  };
  A.pickLineSheet = function () {
    A.sheet('Γραμμή χάραξης', `<p>Επίλεξε πώς ορίζεται η γραμμή:</p>
      <button class="btn" id="pl-dxf">⌖ Γραμμή / πολυγραμμή από το σχέδιο (DXF/DWG)</button>
      <button class="btn" id="pl-2">Από δύο σημεία (Α → Β)</button>
      <button class="btn" id="pl-code">Από μετρημένη γραμμή (κωδικός)</button>`, b => {
      b.querySelector('#pl-dxf').onclick = () => { A.closeSheet(); $('so-map').click(); };
      b.querySelector('#pl-2').onclick = () => A.pickPointSheet('Αρχή γραμμής (Α)', a => A.pickPointSheet('Τέλος γραμμής (Β)', bb => { A.setLine([a, bb], a.name + ' → ' + bb.name); $('so-st').value = ''; }));
      b.querySelector('#pl-code').onclick = () => {
        const L = A.map.layers.lines;
        if (!L.length) return A.toast('Δεν υπάρχουν μετρημένες γραμμές', 'bad');
        A.sheet('Μετρημένες γραμμές', L.map((l, i) => `<div class="li" data-i="${i}"><span class="nm">${esc(l.pts[0].code || 'Γραμμή')}</span><span class="cd">${esc(l.pts[0].name)} → ${esc(l.pts[l.pts.length - 1].name)}</span></div>`).join(''), bb => bb.querySelectorAll('.li').forEach(el => el.onclick = () => { const l = L[+el.dataset.i]; A.closeSheet(); A.setLine(l.pts, (l.pts[0].code || 'Γραμμή') + ' ' + l.pts[0].name); }));
      };
    });
  };

  // ---------- Επιλογή στον χάρτη ----------
  A.startPick = function (text, opts, cb) {
    A._pick = { opts, cb };
    $('pick-text').textContent = text; $('pick-banner').classList.remove('hidden');
    A.closeSheet();
    if (A.tab !== 'stake' && A.tab !== 'survey') { /* κράτα τον χάρτη ορατό */ }
  };
  $('pick-cancel').onclick = () => { A._pick = null; $('pick-banner').classList.add('hidden'); };

  function onMapTap(w, s) {
    const m = A.map;
    if (A._pick) {
      const r = m.snap(s[0], s[1], A._pick.opts) || (A._pick.opts.line ? null : { kind: 'free', E: w.E, N: w.N, Z: null });
      if (!r) return A.toast('Δεν βρέθηκε στοιχείο — πάτα πιο κοντά', 'bad');
      const pk = A._pick; A._pick = null; $('pick-banner').classList.add('hidden');
      pk.cb(r); return;
    }
    if (A._measureMode) {
      const r = m.snap(s[0], s[1]) || { E: w.E, N: w.N };
      m.layers.measure.push({ E: r.E, N: r.N, Z: r.Z });
      const M = m.layers.measure; let L = 0; for (let i = 1; i < M.length; i++) L += Math.hypot(M[i].E - M[i - 1].E, M[i].N - M[i - 1].N);
      const ar = M.length > 2 ? HCOGO.area(M) : null;
      const last = M.length > 1 ? HCOGO.slope(M[M.length - 2], M[M.length - 1]) : null;
      $('snap-info').innerHTML = `<b>Μήκος ${L.toFixed(3)} m</b>${ar ? ` · Εμβαδόν ${ar.area.toFixed(2)} m²` : ''}${last ? ` · τελ. ${last.hd.toFixed(3)} m, Αζ ${last.az != null ? last.az.toFixed(2) + '°' : ''}` : ''}`;
      $('snap-info').classList.remove('hidden'); m.redraw(); return;
    }
    const r = m.snap(s[0], s[1]);
    if (!r) { $('snap-info').classList.add('hidden'); return; }
    const d = A.pos ? Math.hypot(r.E - A.pos.E, r.N - A.pos.N) : null;
    const name = r.ref ? r.ref.name : (r.kind === 'line' ? 'Γραμμή' : 'Κορυφή') + (r.ent ? ' · ' + r.ent.layer : '');
    $('snap-info').innerHTML = `<b>${esc(name)}</b> X ${r.E.toFixed(3)} Y ${r.N.toFixed(3)}${r.Z ? ' Z ' + r.Z.toFixed(3) : ''}${d != null ? ' · ' + d.toFixed(2) + ' m' : ''}
      <div class="row" style="margin-top:6px"><button class="btn" id="si-so">◎ Χάραξη</button>${r.ref ? '<button class="btn" id="si-info">ℹ</button>' : '<button class="btn" id="si-add">＋ Σημείο</button>'}<button class="btn" id="si-x">✕</button></div>`;
    $('snap-info').classList.remove('hidden');
    $('si-x').onclick = () => $('snap-info').classList.add('hidden');
    $('si-so').onclick = () => {
      $('snap-info').classList.add('hidden'); A.setTab('stake');
      if (r.kind === 'line' && r.ent) { A.setStakeMode('line'); const pts = r.ent.closed ? r.ent.pts.concat([r.ent.pts[0]]) : r.ent.pts; A.setLine(pts, 'Γραμμή ' + r.ent.layer); return; }
      A.setStakeMode('point');
      A.setTarget(r.ref || A.storePoint({ name: A.uniqueName('V1'), E: r.E, N: r.N, Z: r.Z || null, type: 'stake', code: r.ent ? r.ent.layer : '' }, true));
    };
    if (r.ref) $('si-info').onclick = () => { $('snap-info').classList.add('hidden'); A.pointSheet(r.ref); };
    else $('si-add').onclick = () => { $('snap-info').classList.add('hidden'); A.addPointManual({ E: r.E, N: r.N, Z: r.Z || null, code: r.ent ? r.ent.layer : '' }); };
  }
  function onLongPress(w) {
    if (HCONN.state.source === 'sim') { HCONN.Sim.walkTo(w); A.toast('Προσομοιωτής: μετακίνηση εκεί'); }
    else A.addPointManual({ E: w.E, N: w.N });
  }

  // ---------- Εργαλειοθήκη χάρτη ----------
  document.querySelectorAll('#map-tools button').forEach(b => b.onclick = () => {
    const m = A.map, a = b.dataset.act;
    if (a === 'zoomin') m.zoom(1.6); if (a === 'zoomout') m.zoom(1 / 1.6);
    if (a === 'extents') { if (!m.extents()) A.toast('Δεν υπάρχουν δεδομένα'); $('btn-follow').classList.remove('on'); }
    if (a === 'follow') { m.follow = true; $('btn-follow').classList.add('on'); if (A.pos) { const z = m.view.s < 2 ? 8 : m.view.s; m.centerOn(A.pos.E, A.pos.N, z); } }
    if (a === 'layers') A.layersSheet();
    if (a === 'measure') { A._measureMode = !A._measureMode; b.classList.toggle('on', A._measureMode); m.layers.measure = []; $('snap-info').classList.add('hidden'); if (A._measureMode) A.toast('Πάτα σημεία στον χάρτη για μέτρηση μήκους/εμβαδού'); m.redraw(); }
  });

  // ---------- Wake lock ----------
  let wake = null;
  async function requestWake() { try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => wake = null); } } catch (e) { } }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') requestWake(); });
  document.addEventListener('pointerdown', requestWake, { once: true });

  // ---------- Εκκίνηση ----------
  A.init = async function () {
    const st = await HIO.kvGet('settings').catch(() => null);
    if (st) A.settings = Object.assign(JSON.parse(JSON.stringify(DEF)), st, { ntrip: Object.assign({}, DEF.ntrip, st.ntrip || {}), gnss: Object.assign({}, DEF.gnss, st.gnss || {}), overlays: Object.assign({}, DEF.overlays, st.overlays || {}) });
    A.map = new HMAP.MapView($('map'));
    A.map.toLL = (E, N) => { try { return HGEO.toLL(E, N); } catch (e) { return null; } };
    A.map.toGrid = (lat, lon) => HGEO.toGrid(lat, lon);
    A.map.kaekToScreen = (E, N) => { // ΚΑΕΚ σε ΕΓΣΑ87 -> τρέχον σύστημα
      if (A.settings.crs === 'EGSA87' && !(A.proj && A.proj.calib)) return A.map.w2s(E, N);
      const ll = proj4(HGEO.CRS.EGSA87.def, '+proj=longlat +datum=WGS84 +no_defs', [E, N]); const g2 = HGEO.toGrid(ll[1], ll[0]); return A.map.w2s(g2.E, g2.N);
    };
    A.map.onTap = onMapTap; A.map.onLongPress = onLongPress;
    A.map.onPan = () => $('btn-follow').classList.remove('on');
    A.map.onViewChange = () => A.map.loadKaek(w => { try { const ll = HGEO.toLL(w.E, w.N); const p = proj4('+proj=longlat +datum=WGS84 +no_defs', HGEO.CRS.EGSA87.def, [ll.lon, ll.lat]); return { E: p[0], N: p[1] }; } catch (e) { return null; } });
    HCONN.on('nmea', onNmea);
    HCONN.on('status', d => { if (A.onConnStatus) A.onConnStatus(d); });
    HCONN.on('ntrip', d => { if (A.onNtrip) A.onNtrip(d); });
    const ok = A.settings.lastProject && await A.openProject(A.settings.lastProject).catch(() => false);
    if (!ok) await A.createProject();
    A.applySettings();
    if (!A.map.extents()) A.map.centerOn(213800, 4285200, 0.05); // Ελλάδα (Λευκάδα) αρχικά
    A.setTab('survey'); A.updateStatus(); A.updateGuidance();
    setTimeout(() => $('splash').classList.add('out'), 700); setTimeout(() => $('splash').remove(), 1300);
    if (A.autoConnect) A.autoConnect();
    // Native: κουμπί «πίσω» Android κλείνει φύλλα
    try { g.Capacitor && g.Capacitor.Plugins.App && g.Capacitor.Plugins.App.addListener('backButton', () => { if (!$('sheet').classList.contains('hidden')) A.closeSheet(); else if (!$('so-fullscreen').classList.contains('hidden')) $('sf-close').click(); else if (A._pick) $('pick-cancel').click(); else g.Capacitor.Plugins.App.minimizeApp(); }); } catch (e) { }
  };
})(window);
