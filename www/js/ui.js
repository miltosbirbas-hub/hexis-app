// HEXIS PAD — αριστερή στήλη εργαλείων (προσαρμόσιμη) και αρχική οθόνη
(function (g) {
  'use strict';
  const A = g.APP, $ = A.$, esc = A.esc;

  const ov = k => !!A.settings.overlays[k];
  // Όλα τα διαθέσιμα εργαλεία: i=εικονίδιο, l=σύντομη ετικέτα, f=ενέργεια, on=ενεργό;
  const T = {
    home: { i: '⌂', l: 'Αρχική', f: () => A.showHome() },
    survey: { i: '●', l: 'Survey', f: () => A.setTab('survey'), on: () => A.tab === 'survey' && !$('dock').classList.contains('hidden') },
    stake: { i: '◎', l: 'Stakeout', f: () => A.setTab('stake'), on: () => A.tab === 'stake' && !$('dock').classList.contains('hidden') },
    points: { i: '☰', l: 'Σημεία', f: () => A.pointsSheet() },
    extents: { i: '⤢', l: 'Extents', f: () => A.mapAction('extents') },
    zoomin: { i: '＋', l: 'Zoom +', f: () => A.mapAction('zoomin') },
    zoomout: { i: '－', l: 'Zoom −', f: () => A.mapAction('zoomout') },
    follow: { i: '⌖', l: 'Θέση μου', f: () => A.mapAction('follow'), on: () => A.map && A.map.follow },
    kt: { i: '▦', l: 'Κτημ/γιο', f: () => toggleKt(), on: () => ov('kt_wms') || ov('hexis_kaek') },
    sat: { i: '◐', l: 'Δορυφ.', f: () => toggleSat(), on: () => A.settings.base !== 'none' },
    layers: { i: '≣', l: 'Layers', f: () => A.mapAction('layers') },
    voice: { i: '🎙︎', l: 'Φωνή', f: () => A.voice.toggle(), on: () => A.voice && A.voice.on },
    cont: { i: '⟳', l: 'Συνεχής', f: () => A.contSheet(), on: () => A.cont && A.cont.on },
    static: { i: '◷', l: 'Static', f: () => A.staticSheet(), on: () => A.static && A.static.on },
    tilt: { i: '∠', l: 'IMU κλίση', f: () => A.imuSheet(), on: () => A.settings.imu && A.settings.imu.on },
    hiddenpt: { i: '✕', l: 'Δυσπρόσιτο', f: () => { A.setTab('survey'); A.hiddenFromSurvey(); } },
    grid: { i: '⁘', l: 'Κάνναβος', f: () => A.gridTool() },
    laserpt: { i: '⟟', l: 'Laser σημείο', f: () => { A.setTab('survey'); A.laserPoint(); } },
    draw: { i: '✎', l: 'Σχεδίαση γραμμής', f: () => A.drawSheet() },
    reloc: { i: '⇄', l: 'Relocalize', f: () => A.relocSheet() },
    dellast: { i: '⌫', l: 'Σβήσε τελευταίο', f: () => A.deleteLast() },
    measure: { i: '⟷', l: 'Μέτρηση', f: () => A.mapAction('measure'), on: () => !!A._measureMode },
    import: { i: '⤓', l: 'Εισαγωγή', f: () => A.importSheet() },
    export: { i: '⤒', l: 'Εξαγωγή', f: () => A.exportSheet() },
    photo: { i: '◉', l: 'Φωτο', f: () => A.takePhoto() },
    offset: { i: '⊹', l: 'Offset', f: () => $('btn-offset').click() },
    stakereport: { i: '📄', l: 'Αρχείο χάραξης', f: () => A.stakeReport() },
    full: { i: '⛶', l: 'Μεγάλη χάραξη', f: () => { A.setTab('stake'); $('so-full').click(); } },
    cogo: { i: '∑', l: 'COGO', f: () => A.cogoSheet() },
    inverse: { i: '↔', l: 'Απόστ/Αζιμ', f: () => A.runTool('inverse') },
    slope: { i: '⟋', l: 'Κλίση', f: () => A.runTool('slope') },
    extend: { i: '→|', l: 'Επέκταση', f: () => A.runTool('extend') },
    densify: { i: '┄', l: 'Πύκνωση', f: () => A.runTool('densify') },
    hidden: { i: '⌖', l: 'Δυσπρόσ.', f: () => A.runTool('hidden') },
    floor: { i: '▱', l: 'Δάπεδο', f: () => A.runTool('floor') },
    square: { i: '⊾', l: 'Γωνίασμα', f: () => A.runTool('square') },
    intersect: { i: '✕', l: 'Τομή', f: () => A.runTool('intersect') },
    area: { i: '⬠', l: 'Εμβαδόν', f: () => A.runTool('area') },
    calib: { i: '⚙', l: 'Προσαρμ.', f: () => A.runTool('calib') },
    connect: { i: '⌁', l: 'Δέκτης', f: () => A.connectSheet() },
    ntrip: { i: '⇣', l: 'NTRIP', f: () => A.ntripSheet() },
    base: { i: '⛯', l: 'Base', f: () => A.baseSheet() },
    laser: { i: '⊸', l: 'Laser', f: () => A.laserSheet() },
    project: { i: '▭', l: 'Έργα', f: () => A.projectSheet() },
    crs: { i: '⊕', l: 'Σύστημα', f: () => A.crsSheet() },
    settings: { i: '⚙', l: 'Ρυθμίσεις', f: () => A.settingsSheet() },
    help: { i: '?', l: 'Οδηγίες', f: () => A.helpSheet() },
  };
  const DEFAULT = ['home', 'survey', 'stake', 'points', '|', 'extents', 'zoomin', 'zoomout', 'follow', '|', 'kt', 'sat', 'layers', 'measure', '|', 'cont', 'static', 'tilt', 'voice', 'dellast', '|', 'import', 'export'];

  function toggleKt() {
    const on = !(ov('kt_wms') || ov('hexis_kaek'));
    A.settings.overlays.kt_wms = on; A.settings.overlays.hexis_kaek = on;
    A.map.overlays.kt_wms = on; A.map.overlays.hexis_kaek = on; A.map._kaekEnv = null;
    A.saveSettings(); A.map.onViewChange && A.map.onViewChange(); A.map.redraw();
    A.toast(on ? 'Όρια Κτηματολογίου: ορατά (σε μεγάλη μεγέθυνση)' : 'Όρια Κτηματολογίου: κρυφά');
  }
  function toggleSat() {
    A.settings.base = A.settings.base === 'none' ? (A.settings.lastBase && A.settings.lastBase !== 'none' ? A.settings.lastBase : 'esri_sat') : 'none';
    if (A.settings.base !== 'none') A.settings.lastBase = A.settings.base;
    A.map.base = A.settings.base; A.saveSettings(); A.map.redraw();
  }

  function list() { return Array.isArray(A.settings.toolbar) && A.settings.toolbar.length ? A.settings.toolbar : DEFAULT.slice(); }

  function render() {
    const box = $('lefttools');
    box.innerHTML = list().map(k => k === '|' ? '<div class="sep"></div>' : (T[k] ? `<button data-t="${k}" title="${esc(T[k].l)}"><i>${T[k].i}</i>${esc(T[k].l)}</button>` : '')).join('') +
      '<div class="sep"></div><button class="edit" data-t="__edit" title="Προσθήκη / αφαίρεση εργαλείων"><i>✎</i>Εργαλεία</button>';
    box.querySelectorAll('button').forEach(b => b.onclick = () => { const k = b.dataset.t; if (k === '__edit') return customize(); T[k].f(); refreshToolState(); });
    refreshToolState();
  }
  function refreshToolState() {
    document.querySelectorAll('#lefttools button[data-t]').forEach(b => { const t = T[b.dataset.t]; b.classList.toggle('on', !!(t && t.on && t.on())); });
  }

  // Προσαρμογή: ενεργά πάνω (με σειρά), διαθέσιμα κάτω
  function customize() {
    const draw = () => {
      const cur = list();
      const avail = Object.keys(T).filter(k => !cur.includes(k));
      A.sheet('Εργαλεία αριστερής στήλης', `<p class="muted">Πρόσθεσε ή αφαίρεσε εργαλεία και άλλαξε τη σειρά τους. Η «—» είναι διαχωριστική γραμμή.</p>
        <h4>Στη στήλη</h4><div class="list">${cur.map((k, i) => `<div class="tb-row"><i>${k === '|' ? '—' : T[k].i}</i><span>${k === '|' ? 'Διαχωριστικό' : esc(T[k].l)}</span><button class="btn" data-up="${i}">▲</button><button class="btn" data-dn="${i}">▼</button><button class="btn" data-rm="${i}">✕</button></div>`).join('')}</div>
        <button class="btn" id="tb-sep">＋ Διαχωριστικό</button>
        <h4>Διαθέσιμα</h4><div class="list">${avail.map(k => `<div class="tb-row"><i>${T[k].i}</i><span>${esc(T[k].l)}</span><button class="btn primary" data-add="${k}">＋</button></div>`).join('') || '<p class="muted">Όλα τα εργαλεία είναι ήδη στη στήλη.</p>'}</div>
        <button class="btn" id="tb-reset">Επαναφορά προεπιλογής</button>`, b => {
        const save = l => { A.settings.toolbar = l; A.saveSettings(); render(); draw(); };
        b.querySelectorAll('[data-up]').forEach(x => x.onclick = () => { const l = list().slice(), i = +x.dataset.up; if (i > 0) { [l[i - 1], l[i]] = [l[i], l[i - 1]]; save(l); } });
        b.querySelectorAll('[data-dn]').forEach(x => x.onclick = () => { const l = list().slice(), i = +x.dataset.dn; if (i < l.length - 1) { [l[i + 1], l[i]] = [l[i], l[i + 1]]; save(l); } });
        b.querySelectorAll('[data-rm]').forEach(x => x.onclick = () => { const l = list().slice(); l.splice(+x.dataset.rm, 1); save(l); });
        b.querySelectorAll('[data-add]').forEach(x => x.onclick = () => { const l = list().slice(); l.push(x.dataset.add); save(l); });
        b.querySelector('#tb-sep').onclick = () => { const l = list().slice(); l.push('|'); save(l); };
        b.querySelector('#tb-reset').onclick = () => save(DEFAULT.slice());
      });
      const body = $('sh-body'); if (draw._y) body.scrollTop = draw._y;
      body.onscroll = () => { draw._y = body.scrollTop; };
    };
    draw();
  }

  // ---------- Αρχική οθόνη ----------
  // Αρχική: μόνο κατηγορίες· πάτημα → οι επιλογές της κατηγορίας (χωρίς τα υπόλοιπα), «Πίσω» → κατηγορίες
  function homeCats() {
    document.querySelectorAll('#home .panel').forEach(p => p.classList.add('hidden'));
    $('home-cats').classList.remove('hidden'); document.querySelector('#home .home-cards').classList.remove('hidden'); $('home').scrollTop = 0;
  }
  function homeOpen(k) {
    const p = document.querySelector(`#home .panel[data-panel="${k}"]`); if (!p) return;
    $('home-cats').classList.add('hidden'); document.querySelector('#home .home-cards').classList.add('hidden');
    document.querySelectorAll('#home .panel').forEach(x => x.classList.toggle('hidden', x !== p));
    $('home').scrollTop = 0;
  }
  document.querySelectorAll('#home .cat').forEach(c => c.onclick = () => homeOpen(c.dataset.cat));
  document.querySelectorAll('#home .pn-back').forEach(b => b.onclick = homeCats);
  A.homePanelOpen = () => !$('home').classList.contains('hidden') && $('home-cats').classList.contains('hidden');
  A.homeBack = homeCats;
  A.showHome = function () {
    $('home').classList.remove('hidden');
    homeCats();
    updateHome();
  };
  function updateHome() {
    if ($('home').classList.contains('hidden')) return;
    $('home-proj-name').textContent = A.proj ? A.proj.name : '—';
    const n = A.proj ? A.proj.points.length : 0;
    $('home-proj-n').textContent = n + ' σημεία' + (A.design ? ' · σχέδιο ' + A.design.name : '');
    const P = A.pos, fx = P ? A.nmea.fix() : null;
    $('home-gnss-st').textContent = P ? fx.label + (P.sh != null ? ' · σH ' + P.sh.toFixed(3) : '') : (HCONN.state.gnss === 'on' ? 'Συνδεδεμένος — αναμονή θέσης' : 'Χωρίς σύνδεση');
    { const d = $('home-gnss-dot'); if (d) d.className = 'hc-dot' + (P ? (fx.key === 'fix' ? ' fix' : fx.key === 'float' ? ' float' : ' bad') : ''); }
    $('home-gnss-st').style.color = P ? getComputedStyle(document.documentElement).getPropertyValue('--' + (fx.key === 'fix' ? 'ok' : fx.key === 'float' ? 'warn' : 'bad')) : '';
    $('home-gnss-sub').textContent = P ? `${A.nmea.sats} δορυφόροι · ${HGEO.crsName().split(' (')[0]}` : 'Πάτα για σύνδεση δέκτη';
  }
  setInterval(updateHome, 1000);
  $('home-map').onclick = () => $('home').classList.add('hidden');
  $('home-lang').textContent = HI18N.lang() === 'en' ? 'ΕΛ' : 'EN';
  $('home-lang').onclick = () => HI18N.setLang(HI18N.lang() === 'en' ? 'el' : 'en');
  $('home-proj').onclick = () => A.projectSheet();
  $('home-gnss').onclick = () => (A.pos ? A.gnssSheet() : A.connectSheet());
  document.querySelectorAll('[data-home]').forEach(b => b.onclick = () => {
    const k = b.dataset.home;
    const close = () => $('home').classList.add('hidden');
    if (k === 'survey') { close(); A.setTab('survey'); }
    if (k === 'stake') { close(); A.setTab('stake'); A.setStakeMode('point'); if (!A.stake.target) { const l = A.stakeList(); if (l.length) A.setTarget(l.find(p => !p.done) || l[0]); else A.toast('Εισήγαγε σημεία χάραξης (Εισαγωγή αρχείου) ή πάτα ⌖ στον χάρτη'); } }
    if (k === 'stakeline') { close(); A.setTab('stake'); A.setStakeMode('line'); if (!A.stake.line) A.pickLineSheet(); }
    if (k.startsWith('tool:')) { close(); A.runTool(k.slice(5)); }
    if (k === 'hiddenpt') { close(); A.setTab('survey'); A.hiddenFromSurvey(); }
    if (k === 'reloc') { close(); A.relocSheet(); }
    if (k === 'wifirx') { A.wifiSetup(); }
    if (k === 'grid') { close(); A.gridTool(); }
    if (k === 'laserpt') { close(); A.setTab('survey'); A.laserPoint(); }
    if (k === 'draw') { close(); A.setTab('survey'); A.drawSheet(); }
    if (k === 'cont') { close(); A.setTab('survey'); A.contSheet(); }
    if (k === 'static') { close(); A.setTab('survey'); A.staticSheet(); }
    if (k === 'voice') { close(); A.voice.toggle(); }
    if (k === 'floor') { close(); A.runTool('floor'); }
    if (k === 'square') { close(); A.runTool('square'); }
    if (k === 'cogo') { close(); A.cogoSheet(); }
    if (k === 'points') { close(); A.pointsSheet(); }
    if (k === 'calib') { close(); A.runTool('calib'); }
    if (k === 'import') { A.importSheet(); }
    if (k === 'paste') { A.pasteImport(); }
    if (k === 'toolbar') { customize(); }
  });
  // Τα κουμπιά [data-menu] της αρχικής δένονται στο tools.js· κλείνουμε την αρχική όταν ανοίγει χάρτης
  A._onSheetCloseHome = null;

  A.ui = { render, refreshToolState, T, init() { render(); if (A.settings.startHome !== false) A.showHome(); } };
  // το A.init έχει ήδη τρέξει ασύγχρονα· αν πρόλαβε, αρχικοποίησε τώρα
  if (A.map && !$('lefttools').children.length) A.ui.init();
})(window);
