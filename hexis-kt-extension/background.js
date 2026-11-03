// HEXIS-APP · Φάκελος Κτηματολογίου — background (Manifest V3)
// Κρατά την εργασία (λίστα ΚΑΕΚ), ονομάζει τα αρχεία που κατεβαίνουν από το Κτηματολόγιο
// και τα βάζει στον φάκελο Λήψεις/HEXIS-APP/<κύριο ΚΑΕΚ>/. Δεν βλέπει ποτέ κωδικούς.
const KT_LOGIN = "https://ktimatologio.gov.gr/Professionals/Account/LoginEngineer";
let expect = null;   // { name, until, tab } — όνομα για την επόμενη λήψη από το Κτηματολόγιο
const tracked = new Map();   // downloadId → { name, tab, sent }
async function toOrigin(msg) {
  const job = (await chrome.storage.local.get("job")).job;
  if (!job || job.originTab == null) return false;
  try { await chrome.tabs.sendMessage(job.originTab, msg); return true; } catch (e) { return false; }
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    if (msg.type === "job") {
      const job = Object.assign({}, msg.job, { i: 0, step: "search", done: {}, log: [], originTab: sender.tab && sender.tab.id });
      // ΜΙΑ καρτέλα Κτηματολογίου: δεύτερη καρτέλα σύνδεσης ακυρώνει τη σύνδεση ΤΕΕ της πρώτης («Invalid state»)
      const prev = (await chrome.storage.local.get("ktTab")).ktTab;
      let tab = null;
      if (prev != null) { try { tab = await chrome.tabs.get(prev); } catch (e) { tab = null; } }
      if (tab && /^https:\/\/ktimatologio\.gov\.gr\/Professionals\//.test(tab.url || tab.pendingUrl || "")) {
        await chrome.storage.local.set({ job });
        await chrome.tabs.update(tab.id, { active: true });
        try { await chrome.windows.update(tab.windowId, { focused: true }); } catch (e) {}
        try { await chrome.tabs.reload(tab.id); } catch (e) {}
      } else {
        if (tab) { try { await chrome.tabs.update(tab.id, { active: true }); } catch (e) {} }
        await chrome.storage.local.set({ job });
        if (tab) await chrome.tabs.update(tab.id, { url: KT_LOGIN });
        else { const t = await chrome.tabs.create({ url: KT_LOGIN }); await chrome.storage.local.set({ ktTab: t.id }); }
      }
      reply({ ok: true });
    } else if (msg.type === "getJob") {
      reply((await chrome.storage.local.get("job")).job || null);
    } else if (msg.type === "setJob") {
      await chrome.storage.local.set({ job: msg.job }); reply({ ok: true });
    } else if (msg.type === "clearJob") {
      await chrome.storage.local.remove("job"); reply({ ok: true });
    } else if (msg.type === "expect") {
      expect = { name: msg.name, until: Date.now() + 30000, tab: sender.tab && sender.tab.id }; reply({ ok: true });
    } else if (msg.type === "file") {
      // αρχείο που διάβασε το πρόσθετο από το Κτηματολόγιο → στη σελίδα «Φάκελος Ακινήτου» (αποθηκεύει όπου διάλεξε ο χρήστης)
      const job = (await chrome.storage.local.get("job")).job;
      const ok = await toOrigin({ type: "file", name: msg.name, b64: msg.b64 });
      if (!ok && !msg.noFallback) await chrome.downloads.download({ url: "data:application/pdf;base64," + msg.b64, filename: "HEXIS-APP/" + (job ? job.main : "fakelos") + "/" + msg.name, conflictAction: "uniquify" });
      reply({ ok: true, delivered: ok });
    } else if (msg.type === "download") {
      const id = await chrome.downloads.download({ url: msg.url, filename: msg.name, conflictAction: "uniquify", saveAs: false });
      if (id != null) tracked.set(id, { name: msg.name, tab: sender.tab && sender.tab.id });
      reply({ ok: true, id });
    } else reply({ ok: false });
  })();
  return true;
});

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  const fromKt = /ktimatologio\.gov\.gr/.test(item.url || "") || /ktimatologio\.gov\.gr/.test(item.referrer || "") || (item.url || "").startsWith("blob:https://ktimatologio.gov.gr");
  if (expect && Date.now() < expect.until && fromKt) {
    const name = expect.name, tab = expect.tab; expect = null;
    tracked.set(item.id, { name, tab, url: item.finalUrl || item.url });
    suggest({ filename: name, conflictAction: "uniquify" });
  } else suggest();
});

// όταν τελειώσει λήψη του Κτηματολογίου: (α) δοκιμάζουμε να τη στείλουμε και στη σελίδα του Φακέλου,
// (β) αλλιώς λέμε στη σελίδα ότι το αρχείο είναι στις Λήψεις, για να ξέρει ο χρήστης πού να το βρει.
chrome.downloads.onChanged.addListener(async (d) => {
  if (!d.state || d.state.current !== "complete" || !tracked.has(d.id)) return;
  const t = tracked.get(d.id); tracked.delete(d.id);
  const [item] = await chrome.downloads.search({ id: d.id });
  const short = t.name.split("/").pop();
  let sent = false;
  const url = (item && (item.finalUrl || item.url)) || t.url;
  if (t.tab != null && url && /^https:\/\/ktimatologio\.gov\.gr\//.test(url)) {
    try { const r = await chrome.tabs.sendMessage(t.tab, { type: "refetch", url, name: short }); sent = !!(r && r.ok); } catch (e) { sent = false; }
  }
  if (!sent) await toOrigin({ type: "downloaded", name: short, path: item ? item.filename : t.name });
});
