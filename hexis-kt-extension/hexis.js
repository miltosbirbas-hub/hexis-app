// Γέφυρα με τη σελίδα «Φάκελος Ακινήτου» του HEXIS-APP (μηνύματα window.postMessage)
(() => {
  const VERSION = chrome.runtime.getManifest().version;
  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data || e.data.src !== "hexis-app") return;
    if (e.data.type === "ping") window.postMessage({ src: "hexis-kt-ext", type: "pong", version: VERSION }, location.origin);
    if (e.data.type === "job") chrome.runtime.sendMessage({ type: "job", job: e.data.job });
  });
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "file") window.postMessage({ src: "hexis-kt-ext", type: "file", name: msg.name, b64: msg.b64 }, location.origin);
    if (msg && msg.type === "status") window.postMessage({ src: "hexis-kt-ext", type: "status", text: msg.text }, location.origin);
  });
})();
