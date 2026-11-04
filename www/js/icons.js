// HEXIS PAD — ενιαίο σετ εικονιδίων (γραμμικά, 24×24, πάχος 1.8, στρογγυλές άκρες).
// Τα emoji/σύμβολα στα κουμπιά αντικαθίστανται αυτόματα με SVG ώστε όλη η εφαρμογή να έχει το ίδιο ύφος.
(function (g) {
  'use strict';
  const P = {
    home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
    survey: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/>',
    stake: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    points: '<circle cx="5" cy="6" r="1.4" fill="currentColor"/><circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="5" cy="18" r="1.4" fill="currentColor"/><path d="M10 6h10M10 12h10M10 18h10"/>',
    extents: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
    zoomin: '<circle cx="11" cy="11" r="7"/><path d="M11 8v6M8 11h6M16.5 16.5L21 21"/>',
    zoomout: '<circle cx="11" cy="11" r="7"/><path d="M8 11h6M16.5 16.5L21 21"/>',
    follow: '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22"/>',
    kt: '<path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3z"/><path d="M9 4v13M15 7v13"/>',
    sat: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    layers: '<path d="M12 4l9 4.5-9 4.5-9-4.5z"/><path d="M3 13l9 4.5 9-4.5M3 17l9 4.5 9-4.5"/>',
    voice: '<path d="M4 12h1M7.5 8v8M11 5v14M14.5 8v8M18 10v4M21 12h-1"/>',
    cont: '<circle cx="4.5" cy="18" r="1.5" fill="currentColor"/><circle cx="10" cy="10" r="1.5" fill="currentColor"/><circle cx="15.5" cy="13" r="1.5" fill="currentColor"/><circle cx="20.5" cy="5" r="1.5" fill="currentColor"/><path d="M5.5 16.5l3.6-5.2M11.4 10.8l2.7 1.4M16.6 11.6l3-5.3"/>',
    static: '<path d="M12 4v7M12 11l-6 10M12 11l6 10M12 11v10"/><circle cx="12" cy="3.5" r="1.5"/>',
    tilt: '<path d="M4 20h16M4 20L15 6"/><path d="M10 20a6 6 0 0 0-1.8-4.3"/>',
    hiddenpt: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7"/>',
    grid: '<circle cx="6" cy="6" r="1.3" fill="currentColor"/><circle cx="12" cy="6" r="1.3" fill="currentColor"/><circle cx="18" cy="6" r="1.3" fill="currentColor"/><circle cx="6" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18" cy="12" r="1.3" fill="currentColor"/><circle cx="6" cy="18" r="1.3" fill="currentColor"/><circle cx="12" cy="18" r="1.3" fill="currentColor"/><circle cx="18" cy="18" r="1.3" fill="currentColor"/>',
    laserpt: '<circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M6.4 17.6L12 6l5.6 11.6"/><path d="M10 3.5l4 4M14 3.5l-4 4"/>',
    draw: '<path d="M4 19c3-8 6-10 9-9s3 5 7 2"/><circle cx="4" cy="19" r="1.5" fill="currentColor"/><circle cx="13" cy="10" r="1.5" fill="currentColor"/><circle cx="20" cy="12" r="1.5" fill="currentColor"/>',
    reloc: '<path d="M4 8h13M14 5l3 3-3 3M20 16H7M10 13l-3 3 3 3"/>',
    dellast: '<path d="M8 5h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8l-5-7z"/><path d="M12 9l5 6M17 9l-5 6"/>',
    measure: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M8 12l2 2M11 9l2 2M14 6l2 2"/>',
    import: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/>',
    export: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 17v3h16v-3"/>',
    photo: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v5M19.4 7.8l-4.3 2.5M19.4 16.2l-4.3-2.5M12 20.5v-5M4.6 16.2l4.3-2.5M4.6 7.8l4.3 2.5"/>',
    offset: '<circle cx="7" cy="12" r="2.2"/><circle cx="17" cy="12" r="2.2" fill="currentColor"/><path d="M9.5 12h5M3 6l4 4M21 18l-4-4"/>',
    stakereport: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    full: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
    cogo: '<path d="M5 4h14l-6 8 6 8H5"/>',
    inverse: '<circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/><path d="M6.5 17.5l11-11"/>',
    slope: '<path d="M3 19h18M3 19L21 7"/><path d="M12 19a9 9 0 0 0-2.5-6"/>',
    extend: '<path d="M3 12h12M12 8l4 4-4 4M20 6v12"/>',
    densify: '<path d="M3 12h18"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="9.3" cy="12" r="1.5" fill="currentColor"/><circle cx="14.7" cy="12" r="1.5" fill="currentColor"/><circle cx="20" cy="12" r="1.5" fill="currentColor"/>',
    hidden: '<circle cx="12" cy="12" r="2.5"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/><circle cx="12" cy="12" r="8.5" stroke-dasharray="3 3"/>',
    floor: '<path d="M3 15l9-5 9 5-9 5z"/><path d="M12 10V3M9 6l3-3 3 3"/>',
    square: '<path d="M5 3v16h16"/><path d="M5 13h6v6"/>',
    intersect: '<path d="M4 4l16 16M20 4L4 20"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/>',
    area: '<path d="M4 18L7 5l10 2 3 9-9 4z"/>',
    calib: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    connect: '<path d="M7 7l10 10-5 4V3l5 4L7 17"/>',
    ntrip: '<circle cx="12" cy="13" r="2"/><path d="M8.5 9.5a5 5 0 0 0 0 7M15.5 9.5a5 5 0 0 1 0 7M5.6 6.6a9 9 0 0 0 0 12.8M18.4 6.6a9 9 0 0 1 0 12.8"/>',
    base: '<path d="M12 8v13M8 21h8M9 21l3-13 3 13"/><path d="M9 5a4 4 0 0 1 6 0M7 2.8a7 7 0 0 1 10 0"/>',
    laser: '<rect x="3" y="9" width="8" height="6" rx="1.5"/><path d="M11 12h10M16 9l2 3-2 3"/>',
    project: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
    crs: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>',
    edit: '<path d="M4 20h4l11-11-4-4L4 16z"/><path d="M13 7l4 4"/>',
    prev: '<path d="M15 5l-7 7 7 7"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    up: '<path d="M5 15l7-7 7 7"/>',
    down: '<path d="M5 9l7 7 7-7"/>',
    pick: '<circle cx="12" cy="12" r="1.3" fill="currentColor"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/>',
    lab: '<path d="M9 3h6M10 3v6l-5.5 9.5A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3"/><path d="M7.5 15h9"/>',
    wifi: '<path d="M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="19.5" r="1.2" fill="currentColor"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
    bluetooth: '<path d="M7 7l10 10-5 4V3l5 4L7 17"/>',
    share: '<circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="M8 11l8-5M8 13l8 5"/>',
    save: '<path d="M4 4h12l4 4v12H4z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    check: '<path d="M4 12.5l5 5L20 7"/>',
    close: '<path d="M5 5l14 14M19 5L5 19"/>',
    undo: '<path d="M8 7H4v4"/><path d="M4 11a8 8 0 1 1 2.3 7"/>',
    play: '<path d="M7 4l12 8-12 8z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
    record: '<circle cx="12" cy="12" r="6" fill="currentColor"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    pin: '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
    hourglass: '<path d="M6 3h12M6 21h12M8 3v4l4 5 4-5V3M8 21v-4l4-5 4 5v4"/>',
    antenna: '<circle cx="12" cy="13" r="2"/><path d="M12 15v6M5.6 6.6a9 9 0 0 1 12.8 0M8.5 9.5a5 5 0 0 1 7 0"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    cross: '<path d="M4 4l16 16M20 4L4 20"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    gnss: '<circle cx="12" cy="12" r="2.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="7"/>',
    toolbar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M5 8h1M5 12h1M5 16h1"/>',
    map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    proj: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
    stakeline: '<path d="M3 20L21 4"/><circle cx="7.5" cy="16" r="1.8"/><circle cx="16.5" cy="8" r="1.8"/>',
    paste: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
    imu: '<path d="M4 20h16M4 20L15 6"/><path d="M10 20a6 6 0 0 0-1.7-4.2"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  };
  // emoji / σύμβολα → εικονίδιο
  const MAP = { '📷': 'photo', '🔎': 'search', '🔍': 'search', '🧪': 'lab', '📶': 'wifi', '📋': 'clipboard', '⚙': 'settings', '↻': 'refresh', '⏺': 'record', '■': 'stop', '⇪': 'share', '↗': 'share', '💾': 'save', '✉': 'mail', '✓': 'check', '✔': 'check', '✕': 'close', '✖': 'close', '↶': 'undo', '🌐': 'globe', '⏳': 'hourglass', '📡': 'antenna', '📄': 'doc', '◀': 'prev', '▶': 'next', '⌖': 'pick', '⤓': 'import', '⤒': 'export', '⟳': 'cont', '✎': 'edit', '📍': 'pin', '▲': 'up', '▼': 'down', '＋': 'plus', '+': 'plus', '−': 'minus', '⟟': 'laserpt', '⊹': 'offset', '🎙': 'voice', '🎙︎': 'voice', '🗑': 'trash', 'ℹ': 'info', '⌫': 'dellast', '⇄': 'reloc', '⬠': 'area', '⟷': 'measure', '∠': 'tilt', '◷': 'static', '☰': 'points', '≣': 'layers', '⤢': 'extents', '▦': 'kt', '◐': 'sat', '⌂': 'home', '●': 'survey', '◎': 'stake', '⁘': 'grid', '⊸': 'laser', '⇣': 'ntrip', '⛯': 'base', '▭': 'project', '⊕': 'crs', '⌁': 'connect', '∑': 'cogo', '↔': 'inverse', '⟋': 'slope', '┄': 'densify', '▱': 'floor', '⊾': 'square', '⛶': 'full', '◉': 'photo', '⚠': 'info', '⟂': 'tilt', '📝': 'doc', '🔗': 'connect', '📱': 'phone', '🧭': 'crs' };
  // ποια ονόματα από το T (ui.js) αντιστοιχούν 1:1 σε εικονίδιο
  const svg = (name, cls) => '<svg class="' + (cls || 'ic') + '" aria-hidden="true"><use href="#ix-' + (P[name] ? name : 'info') + '"/></svg>';
  function sprite() {
    if (document.getElementById('ix-sprite')) return;
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.id = 'ix-sprite'; s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.style.position = 'absolute'; s.setAttribute('aria-hidden', 'true');
    s.innerHTML = Object.keys(P).map(k => '<symbol id="ix-' + k + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + P[k] + '</symbol>').join('');
    document.body.insertBefore(s, document.body.firstChild);
  }
  // Αντικατάσταση emoji/συμβόλου στην αρχή κειμένου κουμπιού με SVG
  const RX = /^\s*([⌀-⏿①-➿⤀-⯿ἀ0-ᾯF←-⇿∀-⋿■-◿☀-⛿　-〿⬀-⯿＋−⌚-⌛─-╿]|[\uD83C-\uDBFF][\uDC00-\uDFFF])(︎|️)?\s*/;
  const SKIP = new Set(['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'CODE', 'PRE', 'SVG', 'svg', 'CANVAS']);
  function fixEl(el) {
    if (!el || el.nodeType !== 1 || SKIP.has(el.tagName) || el.dataset.ix === '1') return;
    const tn = el.firstChild;
    if (!tn || tn.nodeType !== 3) return;
    const m = RX.exec(tn.nodeValue); if (!m) return;
    const name = MAP[m[1]] || MAP[m[1] + (m[2] || '')]; if (!name) return;
    tn.nodeValue = tn.nodeValue.slice(m[0].length);
    const wrap = document.createElement('span'); wrap.innerHTML = svg(name, 'ic ic-btn'); el.insertBefore(wrap.firstChild, tn);
    el.dataset.ix = '1';
    if (!tn.nodeValue.trim()) { tn.remove(); el.classList.add('ic-only'); }
  }
  function walk(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.matches && root.matches('button, .btn, .op b, .st-qc, .st-ntrip')) fixEl(root);
    root.querySelectorAll && root.querySelectorAll('button, .btn').forEach(fixEl);
  }
  function init() {
    sprite();
    walk(document.body);
    new MutationObserver(ms => { for (const m of ms) { m.addedNodes.forEach(n => walk(n)); if (m.type === 'characterData' && m.target.parentElement) fixEl(m.target.parentElement.closest('button, .btn')); } })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  g.HICONS = { svg, names: Object.keys(P), has: n => !!P[n], fix: walk, MAP };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
