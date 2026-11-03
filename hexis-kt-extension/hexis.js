// Γέφυρα με τη σελίδα «Φάκελος Ακινήτου» του HEXIS-APP (μηνύματα window.postMessage)
(() => {
  const VERSION = chrome.runtime.getManifest().version;
  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data || e.data.src !== "hexis-app") return;
    if (e.data.type === "ping") window.postMessage({ src: "hexis-kt-ext", type: "pong", version: VERSION }, location.origin);
    if (e.data.type === "job") chrome.runtime.sendMessage({ type: "job", job: e.data.job });
    if (e.data.type === "extra") chrome.runtime.sendMessage({ type: "extra", kaek: e.data.kaek, files: e.data.files }, (r) => window.postMessage({ src: "hexis-kt-ext", type: "extraAck", ok: !!(r && r.ok) }, location.origin));
  });
  const pend = new Map(); let seq = 0;
  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data || e.data.src !== "hexis-app" || e.data.type !== "fileAck") return;
    const f = pend.get(e.data.id); if (f) { pend.delete(e.data.id); f({ saved: !!e.data.saved }); }
  });
  chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    if (msg && msg.type === "file") {
      const id = ++seq; pend.set(id, reply);
      setTimeout(() => { if (pend.has(id)) { pend.delete(id); reply({ saved: false }); } }, 20000);
      window.postMessage({ src: "hexis-kt-ext", type: "file", id, name: msg.name, rel: msg.rel || "", b64: msg.b64 }, location.origin);
      return true;
    }
    if (msg && msg.type === "downloaded") window.postMessage({ src: "hexis-kt-ext", type: "downloaded", name: msg.name, path: msg.path }, location.origin);
    if (msg && msg.type === "status") window.postMessage({ src: "hexis-kt-ext", type: "status", text: msg.text }, location.origin);
  });
})();
