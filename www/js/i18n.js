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
  // Παλιές WebView (χωρίς lookbehind / \p{}): απλούστερη έκφραση με όριο λέξης μέσω ομάδας
  let RX_OLD = null;
  if (!RX && keys.length) { try { RX_OLD = new RegExp('(^|[^A-Za-z0-9\u0370-\u03FF\u1F00-\u1FFF])(' + keys.map(esc).join('|') + ')(?![A-Za-z0-9\u0370-\u03FF\u1F00-\u1FFF])', 'g'); } catch (e) { RX_OLD = null; }
  }
  const GREEK = /[Ͱ-Ͽἀ-῿]/;

  function t(s) {
    if (lang !== 'en' || !(RX || RX_OLD) || s == null) return s;
    s = String(s);
    if (!GREEK.test(s)) return s;
    if (RX) return s.replace(RX, m => D[m] != null ? D[m] : m);
    return s.replace(RX_OLD, (m, pre, w) => pre + (D[w] != null ? D[w] : w));
  }
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE']);
  function walk(root) {
    if (lang !== 'en' || !(RX || RX_OLD) || !root) return;
    if (root.nodeType === 3) { fixText(root); return; }
    if (root.nodeType !== 1 || (root.classList && root.classList.contains('nt'))) return;
    if (SKIP.has(root.nodeName)) { for (const a of ['placeholder', 'title']) { const v = root.getAttribute(a); if (v && GREEK.test(v)) { const r = t(v); if (r !== v) root.setAttribute(a, r); } } return; }
    for (const a of ['placeholder', 'title', 'aria-label', 'label']) {
      const v = root.getAttribute && root.getAttribute(a);
      if (v && GREEK.test(v)) { const r = t(v); if (r !== v) root.setAttribute(a, r); }
    }
    if (root.nodeName === 'OPTION' && root.label && GREEK.test(root.label)) { const r = t(root.label); if (r !== root.label) root.label = r; }
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: n => {
        if (n.nodeType === 1 && (SKIP.has(n.nodeName) || n.classList.contains('nt'))) {
          if (!n.classList.contains('nt')) for (const a of ['placeholder', 'title', 'aria-label']) { const v = n.getAttribute(a); if (v && GREEK.test(v)) { const r = t(v); if (r !== v) n.setAttribute(a, r); } }
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n; while ((n = tw.nextNode())) {
      if (n.nodeType === 3) fixText(n);
      else for (const a of ['placeholder', 'title', 'aria-label', 'label']) { const v = n.getAttribute(a); if (v && GREEK.test(v)) { const r = t(v); if (r !== v) n.setAttribute(a, r); } }
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
    const OPTS = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'label'] };
    // Οι δικές μας αλλαγές δεν ξαναπυροδοτούν τον παρατηρητή (καμία πιθανότητα βρόχου/παγώματος)
    const mo = new MutationObserver(ms => {
      mo.disconnect();
      try {
        for (const m of ms) {
          if (m.type === 'characterData') fixText(m.target);
          else if (m.type === 'attributes') walk(m.target);
          else m.addedNodes.forEach(walk);
        }
      } catch (e) { console.error(e); }
      mo.takeRecords();
      mo.observe(document.body, OPTS);
    });
    mo.observe(document.body, OPTS);
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
