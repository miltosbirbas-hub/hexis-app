// HEXIS-APP · Φάκελος Κτηματολογίου — background (Manifest V3)
// Κρατά την εργασία και ΜΑΖΕΥΕΙ τα αρχεία μέσα στο πρόσθετο (IndexedDB). Στο τέλος ανοίγει
// την καρτέλα «Φάκελος ZIP» που φτιάχνει ΕΝΑ ZIP. Λήψεις του Κτηματολογίου που ξεκινούν όσο
// τρέχει εργασία πιάνονται και ακυρώνονται, ώστε να μη γεμίζουν οι Λήψεις. Δεν βλέπει ποτέ κωδικούς.
const KT_LOGIN = "https://ktimatologio.gov.gr/Professionals/Account/LoginEngineer";
const KT_RX = /^(https:\/\/([a-z0-9-]+\.)*ktimatologio\.(gov\.)?gr\/|blob:https:\/\/([a-z0-9-]+\.)*ktimatologio\.(gov\.)?gr\/)/i;
let expect = null;   // { kaek, kind, n, until, tab }
const caught = new Set();   // "kaek|kind|n" που έχουν φτάσει

/* ---------- IndexedDB ---------- */
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("hexis-fakelos", 1);
    r.onupgradeneeded = () => { r.result.createObjectStore("files", { keyPath: "id", autoIncrement: true }); r.result.createObjectStore("diag", { keyPath: "kaek" }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function tx(store, mode, fn) {
  const d = await db();
  return new Promise((res, rej) => { const t = d.transaction(store, mode); const out = fn(t.objectStore(store)); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); });
}
async function sha(bytes) { const h = await crypto.subtle.digest("SHA-256", bytes); return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
const unb64 = (s) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
let chain = Promise.resolve();
function store(meta, bytes) { const p = chain.then(() => store0(meta, bytes)); chain = p.catch(() => {}); return p; }   // ένα-ένα: αποφυγή διπλών
async function store0(meta, bytes) {
  const hash = await sha(bytes);
  const all = await tx("files", "readonly", (s) => s.getAll());
  caught.add([meta.kaek, meta.kind, meta.n || 0].join("|"));
  if (all.some((f) => f.hash === hash && f.kaek === meta.kaek)) return { ok: true, dup: true, count: all.length };
  await tx("files", "readwrite", (s) => s.add({ kaek: meta.kaek, kind: meta.kind || "eggrafo", n: meta.n || 0, fname: meta.fname || "", hash, size: bytes.byteLength, data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), t: Date.now() }));
  return { ok: true, count: all.length + 1 };
}
async function toOrigin(msg) {
  const job = (await chrome.storage.local.get("job")).job;
  if (!job || job.originTab == null) return null;
  try { return await chrome.tabs.sendMessage(job.originTab, msg); } catch (e) { return null; }
}
async function openDone() {
  const url = chrome.runtime.getURL("done.html");
  const prev = (await chrome.storage.local.get("doneTab")).doneTab;
  if (prev != null) { try { await chrome.tabs.update(prev, { active: true, url }); return; } catch (e) {} }
  const t = await chrome.tabs.create({ url }); await chrome.storage.local.set({ doneTab: t.id });
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    if (msg.type === "job") {
      const job = Object.assign({}, msg.job, { i: 0, step: "search", done: {}, owner: {}, originTab: sender.tab && sender.tab.id, finished: false });
      await tx("files", "readwrite", (s) => s.clear()); await tx("diag", "readwrite", (s) => s.clear()); caught.clear();
      // ΜΙΑ καρτέλα Κτηματολογίου: δεύτερη καρτέλα σύνδεσης ακυρώνει τη σύνδεση ΤΕΕ της πρώτης («Invalid state»)
      const prev = (await chrome.storage.local.get("ktTab")).ktTab;
      let tab = null;
      if (prev != null) { try { tab = await chrome.tabs.get(prev); } catch (e) { tab = null; } }
      await chrome.storage.local.set({ job });
      if (tab && KT_RX.test(tab.url || tab.pendingUrl || "")) {
        await chrome.tabs.update(tab.id, { active: true });
        try { await chrome.windows.update(tab.windowId, { focused: true }); } catch (e) {}
        try { await chrome.tabs.reload(tab.id); } catch (e) {}
      } else if (tab) { await chrome.tabs.update(tab.id, { active: true, url: KT_LOGIN }); }
      else { const t = await chrome.tabs.create({ url: KT_LOGIN }); await chrome.storage.local.set({ ktTab: t.id }); }
      reply({ ok: true });
    } else if (msg.type === "getJob") {
      reply((await chrome.storage.local.get("job")).job || null);
    } else if (msg.type === "setJob") {
      await chrome.storage.local.set({ job: msg.job }); reply({ ok: true });
    } else if (msg.type === "clearJob") {
      await chrome.storage.local.remove("job"); reply({ ok: true });
    } else if (msg.type === "expect") {
      expect = { kaek: msg.kaek, kind: msg.kind, n: msg.n || 0, until: Date.now() + 60000, tab: sender.tab && sender.tab.id };
      try { await chrome.storage.session.set({ expect }); } catch (e) {}
      reply({ ok: true });
    } else if (msg.type === "captured?") {
      reply({ ok: caught.has([msg.kaek, msg.kind, msg.n || 0].join("|")) });
    } else if (msg.type === "file") {
      const r = await store(msg, unb64(msg.b64));
      toOrigin({ type: "status", text: `Το πρόσθετο έχει μαζέψει ${r.count} αρχεία. Στο τέλος ανοίγει καρτέλα με το ZIP του φακέλου.` });
      reply(r);
    } else if (msg.type === "extra") {
      // απόσπασμα ρυμοτομικού (PDF + DXF/TIFF για AutoCAD) που έφτιαξε η σελίδα του HEXIS-APP
      let i = 0; for (const f of msg.files || []) await store({ kaek: msg.kaek, kind: "rym", n: ++i, fname: f.name }, unb64(f.b64));
      reply({ ok: true });
    } else if (msg.type === "diag") {
      await tx("diag", "readwrite", (s) => s.put({ kaek: msg.kaek, d: msg.d })); reply({ ok: true });
    } else if (msg.type === "finish") {
      await openDone(); reply({ ok: true });
    } else reply({ ok: false });
  })();
  return true;
});

/* ---------- λήψεις που ξεκινά το ίδιο το Κτηματολόγιο ---------- */
const fromKt = (item) => KT_RX.test(item.url || "") || KT_RX.test(item.finalUrl || "") || KT_RX.test(item.referrer || "");
chrome.downloads.onCreated.addListener(async (item) => {
  if (item.byExtensionId === chrome.runtime.id || !fromKt(item)) return;
  const job = (await chrome.storage.local.get("job")).job;
  if (!job || job.finished && !expect) return;
  let ex = expect;
  if (!ex) { try { ex = (await chrome.storage.session.get("expect")).expect || null; } catch (e) { ex = null; } }
  const cur = (job.kaeks || [])[Math.min(job.i || 0, (job.kaeks || []).length - 1)] || {};
  const meta = ex && Date.now() < ex.until ? { kaek: ex.kaek, kind: ex.kind, n: ex.n } : { kaek: cur.kaek, kind: "eggrafo", n: Date.now() % 100000 };
  const tab = (ex && ex.tab) || (await chrome.storage.local.get("ktTab")).ktTab;
  let ok = false;
  if (tab != null && meta.kaek) {
    try { const r = await chrome.tabs.sendMessage(tab, { type: "refetch", url: item.finalUrl || item.url }); if (r && r.ok) { await store(meta, unb64(r.b64)); ok = true; } } catch (e) { ok = false; }
  }
  if (ok) {
    // μπήκε στον φάκελο → δεν το αφήνουμε να πάει (και) στις Λήψεις
    try { await chrome.downloads.cancel(item.id); } catch (e) {}
    try { await chrome.downloads.removeFile(item.id); } catch (e) {}
    try { await chrome.downloads.erase({ id: item.id }); } catch (e) {}
  }
});
// αν δεν μπόρεσε να διαβαστεί (σπάνιο), τουλάχιστον μπαίνει με σωστό όνομα σε φάκελο της εργασίας
const SAFE = (s) => String(s || "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "").slice(0, 70);
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  (async () => {
    if (item.byExtensionId === chrome.runtime.id || !fromKt(item)) return suggest();
    const job = (await chrome.storage.local.get("job")).job;
    if (!job || !job.kaeks || !job.kaeks.length) return suggest();
    const main = (job.kaeks.find((x) => x.role === "main") || job.kaeks[0]).kaek;
    const k = (job.kaeks[Math.min(job.i || 0, job.kaeks.length - 1)] || {}).kaek || main;
    const orig = SAFE((item.filename || "").split(/[\\/]/).pop()) || "eggrafo.pdf";
    suggest({ filename: "HEXIS-APP/" + SAFE(main) + "/" + k + "_" + orig, conflictAction: "uniquify" });
  })();
  return true;
});
