// Τρέχει στη σελίδα του Κτηματολογίου (MAIN world). ΜΟΝΟ όσο το πρόσθετο περιμένει αρχείο
// (data-hx-capture="1" — μόνο μετά από δικό του κλικ): το PDF που θα άνοιγε σε παράθυρο ή θα
// κατέβαινε στις Λήψεις, το παραδίδει στο πρόσθετο για να μπει στο ZIP του φακέλου.
(() => {
  const on = () => document.documentElement.dataset.hxCapture === "1";
  const post = (m, tr) => window.postMessage(Object.assign({ src: "hx-main" }, m), location.origin, tr || []);
  const isPdf = (buf) => { if (!buf || buf.byteLength < 200) return false; const h = new Uint8Array(buf, 0, Math.min(1024, buf.byteLength)); for (let i = 0; i < h.length - 4; i++) if (h[i] === 0x25 && h[i + 1] === 0x50 && h[i + 2] === 0x44 && h[i + 3] === 0x46) return true; return false; };

  // 1) window.open(PDF)
  const open0 = window.open;
  window.open = function (url, ...rest) {
    try { if (on() && url) { post({ type: "url", url: String(url) }); return null; } } catch (e) {}
    // όσο το πρόσθετο ανοίγει το ακίνητο: στην ίδια καρτέλα, όχι σε νέα (αλλιώς η εργασία «χάνεται»)
    try { if (document.documentElement.dataset.hxNav === "1" && url) { location.assign(new URL(String(url), location.href).href); return window; } } catch (e) {}
    return open0.call(this, url, ...rest);
  };
  // 2) PDF που φτιάχνεται στη σελίδα (fetch/XHR → Blob → createObjectURL)
  const cou = URL.createObjectURL;
  URL.createObjectURL = function (obj) {
    const u = cou.call(this, obj);
    try { if (on() && obj instanceof Blob && obj.size > 200) obj.arrayBuffer().then((buf) => { if (isPdf(buf)) post({ type: "blob", buf }, [buf]); }).catch(() => {}); } catch (e) {}
    return u;
  };
  // 3) <a download> / κλικ σε σύνδεσμο αρχείου
  const aclick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    try { if (on() && this.href && (this.hasAttribute("download") || /^blob:/.test(this.href))) { post({ type: "url", url: this.href }); return; } } catch (e) {}
    return aclick.call(this);
  };
  // 4) φόρμα που επιστρέφει PDF (π.χ. «Απόσπασμα» με POST): τη στέλνουμε εμείς, αν δεν είναι PDF ξαναϋποβάλλεται κανονικά
  const fsubmit = HTMLFormElement.prototype.submit;
  async function viaFetch(f, submitter) {
    const fd = new FormData(f); if (submitter && submitter.name) fd.append(submitter.name, submitter.value || "");
    const method = (f.getAttribute("method") || "GET").toUpperCase();
    let url = f.action || location.href; const opt = { method, credentials: "include" };
    if (method === "GET") { const u = new URL(url, location.href); for (const [k, v] of fd) u.searchParams.append(k, v); url = u.href; }
    else opt.body = /multipart/i.test(f.enctype) ? fd : new URLSearchParams([...fd]);
    const r = await fetch(url, opt); const buf = await r.arrayBuffer();
    return isPdf(buf) ? buf : null;
  }
  document.addEventListener("submit", (e) => {
    if (!on() || e.defaultPrevented) return;
    const f = e.target; if (!(f instanceof HTMLFormElement)) return;
    e.preventDefault();
    viaFetch(f, e.submitter).then((buf) => { if (buf) post({ type: "blob", buf }, [buf]); else fsubmit.call(f); }).catch(() => fsubmit.call(f));
  }, true);
  HTMLFormElement.prototype.submit = function () {
    if (!on()) return fsubmit.call(this);
    const f = this;
    viaFetch(f, null).then((buf) => { if (buf) post({ type: "blob", buf }, [buf]); else fsubmit.call(f); }).catch(() => fsubmit.call(f));
  };
})();
