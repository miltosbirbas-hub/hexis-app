// HEXIS PAD — πλωτό κουμπί μέτρησης / καταγραφής
// Σέρνεται οπουδήποτε στον χάρτη (δεξιόχειρες / αριστερόχειρες) και θυμάται τη θέση του.
(function (g) {
  'use strict';
  const A = g.APP, $ = A.$;
  const t = s => (g.HI18N ? HI18N.t(s) : s);
  const S = () => (A.settings.fab = Object.assign({ on: true, x: null, y: 0.40, side: 'right', big: false }, A.settings.fab || {}));

  const wrap = $('mapwrap');
  const b = document.createElement('button');
  b.id = 'fab'; b.className = 'hidden'; b.type = 'button';
  b.setAttribute('aria-label', 'Μέτρηση');
  b.innerHTML = '<span class="fab-i">●</span><span class="fab-l"></span>';
  wrap.appendChild(b);

  const stakeMode = () => !$('so-fullscreen').classList.contains('hidden') || (A.tab === 'stake' && !$('dock').classList.contains('hidden'));
  const target = () => stakeMode() ? $('so-store') : $('btn-measure-pt');

  // ---------- θέση ----------
  function size() { return S().big ? 104 : 84; }
  function place() {
    const s = S(), W = wrap.clientWidth, H = wrap.clientHeight, z = size();
    let fx = s.x; if (fx == null) fx = s.side === 'left' ? 0 : 1;
    const x = Math.round(Math.max(6, Math.min(W - z - 6, fx * (W - z))));
    let y = Math.round(Math.max(6, Math.min(H - z - 6, s.y * (H - z))));
    // να μην πέφτει πάνω στην κάρτα Survey/Stakeout: ανεβαίνει πάνω από αυτήν (η αποθηκευμένη θέση δεν αλλάζει)
    const d = $('dock');
    if (d && !d.classList.contains('hidden') && !drag) {
      const wr = wrap.getBoundingClientRect(), dr = d.getBoundingClientRect();
      const L = dr.left - wr.left, R = dr.right - wr.left, T = dr.top - wr.top;
      if (x + z > L && x < R && y + z > T) y = Math.max(6, Math.round(T - z - 8));
    }
    b.style.left = x + 'px'; b.style.top = y + 'px';
    b.style.width = b.style.height = z + 'px';
  }
  g.addEventListener('resize', () => requestAnimationFrame(place));

  // ---------- σύρσιμο ή πάτημα ----------
  let drag = null;
  b.addEventListener('pointerdown', e => {
    e.stopPropagation(); e.preventDefault();
    b.setPointerCapture(e.pointerId);
    const r = b.getBoundingClientRect();
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: e.clientX - r.left, oy: e.clientY - r.top, moved: false };
  });
  b.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    e.stopPropagation();
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 10) return;
    drag.moved = true; b.classList.add('drag');
    const wr = wrap.getBoundingClientRect(), z = size();
    const x = Math.max(6, Math.min(wr.width - z - 6, e.clientX - wr.left - drag.ox));
    const y = Math.max(6, Math.min(wr.height - z - 6, e.clientY - wr.top - drag.oy));
    b.style.left = x + 'px'; b.style.top = y + 'px';
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    e.stopPropagation();
    const moved = drag.moved; drag = null; b.classList.remove('drag');
    if (moved) {
      const wr = wrap.getBoundingClientRect(), z = size(), r = b.getBoundingClientRect();
      const s = S(); s.x = (r.left - wr.left) / Math.max(1, wr.width - z); s.y = (r.top - wr.top) / Math.max(1, wr.height - z);
      s.side = s.x < 0.5 ? 'left' : 'right';
      A.saveSettings();
      place();
    } else if (e.type === 'pointerup') {
      try { navigator.vibrate && navigator.vibrate(25); } catch (er) { }
      const tb = target(); if (tb) tb.click();
    }
  };
  b.addEventListener('pointerup', end);
  b.addEventListener('pointercancel', end);
  b.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); });

  // ---------- καθρέφτισμα κατάστασης του κανονικού κουμπιού (αναμονή / πράσινο) ----------
  function sync() {
    const s = S();
    const show = s.on && (A.tab === 'survey' || A.tab === 'stake' || !$('so-fullscreen').classList.contains('hidden')) && $('home').classList.contains('hidden');
    b.classList.toggle('hidden', !show);
    if (!show) return;
    const tb = target(); if (!tb) return;
    const busy = tb.classList.contains('busy'), done = tb.classList.contains('done');
    b.classList.toggle('big', !!s.big); b.classList.toggle('busy', busy); b.classList.toggle('done', done); b.classList.toggle('stake', stakeMode());
    const raw = (tb.textContent || '').replace(/^[●✓■⏳\s]+/, '').trim();
    const lbl = busy || done ? raw : (stakeMode() ? t('ΚΑΤΑΓΡΑΦΗ') : t('ΜΕΤΡΗΣΗ'));
    const l = b.querySelector('.fab-l'); if (l.textContent !== lbl) l.textContent = lbl;
    const ic = done ? '✓' : busy ? '■' : '●'; const i = b.querySelector('.fab-i'); if (i.textContent !== ic) i.textContent = ic;
  }
  const mo = new MutationObserver(() => requestAnimationFrame(sync));
  ['btn-measure-pt', 'so-store'].forEach(id => { const el = $(id); if (el) mo.observe(el, { attributes: true, attributeFilter: ['class'], childList: true, characterData: true, subtree: true }); });
  ['dock', 'home', 'so-fullscreen'].forEach(id => { const el = $(id); if (el) mo.observe(el, { attributes: true, attributeFilter: ['class'] }); });
  try { new ResizeObserver(() => requestAnimationFrame(place)).observe($('dock')); } catch (e) { }
  const mo2 = new MutationObserver(() => requestAnimationFrame(place)); mo2.observe($('dock'), { attributes: true, attributeFilter: ['class'] });
  const st0 = A.setTab; A.setTab = function () { const r = st0.apply(this, arguments); requestAnimationFrame(() => { place(); sync(); }); return r; };

  A.fab = {
    apply() { place(); sync(); },
    preset(side) { const s = S(); s.side = side; s.x = side === 'left' ? 0 : 1; s.y = 0.40; A.saveSettings(); place(); },
  };
  setTimeout(() => { place(); sync(); }, 300);
})(window);
