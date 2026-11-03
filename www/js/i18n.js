// HEXIS PAD — γλώσσα εφαρμογής (Ελληνικά / English)
// Η εφαρμογή γράφεται στα ελληνικά· στα αγγλικά μεταφράζονται αυτόματα όλα τα κείμενα της οθόνης (και όσα εμφανίζονται αργότερα).
(function (g) {
  'use strict';
  let lang = 'el';
  try {
    const saved = localStorage.getItem('hexis_pad_lang');
    lang = saved || ((navigator.language || 'el').toLowerCase().startsWith('el') ? 'el' : 'en');
  } catch (e) { }
  const D = g.HEXIS_EN || {};
  const keys = Object.keys(D).filter(k => k && D[k] && D[k] !== k).sort((a, b) => b.length - a.length);
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let RX = null;
  try { RX = keys.length ? new RegExp('(?<![\\p{L}\\p{N}])(?:' + keys.map(esc).join('|') + ')(?![\\p{L}\\p{N}])', 'gu') : null; } catch (e) { RX = null; }
  const GREEK = /[Ͱ-Ͽἀ-῿]/;

  function t(s) {
    if (lang !== 'en' || !RX || s == null) return s;
    s = String(s);
    if (!GREEK.test(s)) return s;
    return s.replace(RX, m => D[m] != null ? D[m] : m);
  }
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE']);
  function walk(root) {
    if (lang !== 'en' || !RX || !root) return;
    if (root.nodeType === 3) { fixText(root); return; }
    if (root.nodeType !== 1 || (root.classList && root.classList.contains('nt'))) return;
    if (SKIP.has(root.nodeName)) { for (const a of ['placeholder', 'title']) { const v = root.getAttribute(a); if (v && GREEK.test(v)) root.setAttribute(a, t(v)); } return; }
    for (const a of ['placeholder', 'title', 'aria-label', 'label']) {
      const v = root.getAttribute && root.getAttribute(a);
      if (v && GREEK.test(v)) root.setAttribute(a, t(v));
    }
    if (root.nodeName === 'OPTION' && root.label && GREEK.test(root.label)) root.label = t(root.label);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: n => {
        if (n.nodeType === 1 && (SKIP.has(n.nodeName) || n.classList.contains('nt'))) {
          if (!n.classList.contains('nt')) for (const a of ['placeholder', 'title', 'aria-label']) { const v = n.getAttribute(a); if (v && GREEK.test(v)) n.setAttribute(a, t(v)); }
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n; while ((n = tw.nextNode())) {
      if (n.nodeType === 3) fixText(n);
      else for (const a of ['placeholder', 'title', 'aria-label', 'label']) { const v = n.getAttribute(a); if (v && GREEK.test(v)) n.setAttribute(a, t(v)); }
    }
  }
  function fixText(n) {
    const v = n.nodeValue;
    if (!v || !GREEK.test(v)) return;
    const p = n.parentNode; if (p && (SKIP.has(p.nodeName) || (p.classList && p.classList.contains('nt')))) return;
    const r = t(v); if (r !== v) n.nodeValue = r;
  }

  function start() {
    document.documentElement.lang = lang;
    if (lang !== 'en') return;
    walk(document.body);
    const mo = new MutationObserver(ms => {
      for (const m of ms) {
        if (m.type === 'characterData') fixText(m.target);
        else { m.addedNodes.forEach(walk); if (m.type === 'attributes') walk(m.target); }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'label'] });
    // μεταφράζει και τα ειδοποιητικά παράθυρα
    const al = g.alert; g.alert = s => al(t(s));
  }
  function setLang(l) {
    try { localStorage.setItem('hexis_pad_lang', l); } catch (e) { }
    location.reload();
  }
  g.HI18N = { t, lang: () => lang, setLang, start, walk };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window);
