// HEXIS-APP · Φάκελος Κτηματολογίου — background (Manifest V3)
// Κρατά την εργασία (λίστα ΚΑΕΚ), ονομάζει τα αρχεία που κατεβαίνουν από το Κτηματολόγιο
// και τα βάζει στον φάκελο Λήψεις/HEXIS-APP/<κύριο ΚΑΕΚ>/. Δεν βλέπει ποτέ κωδικούς.
const KT_LOGIN = "https://ktimatologio.gov.gr/Professionals/Account/LoginEngineer";
let expect = null;   // { name, until } — όνομα για την επόμενη λήψη από το Κτηματολόγιο

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    if (msg.type === "job") {
      const job = Object.assign({}, msg.job, { i: 0, step: "search", done: {}, log: [], originTab: sender.tab && sender.tab.id });
      await chrome.storage.local.set({ job });
      await chrome.tabs.create({ url: KT_LOGIN });
      reply({ ok: true });
    } else if (msg.type === "getJob") {
      reply((await chrome.storage.local.get("job")).job || null);
    } else if (msg.type === "setJob") {
      await chrome.storage.local.set({ job: msg.job }); reply({ ok: true });
    } else if (msg.type === "clearJob") {
      await chrome.storage.local.remove("job"); reply({ ok: true });
    } else if (msg.type === "expect") {
      expect = { name: msg.name, until: Date.now() + 30000 }; reply({ ok: true });
    } else if (msg.type === "file") {
      // αρχείο που διάβασε το πρόσθετο από το Κτηματολόγιο → στη σελίδα «Φάκελος Ακινήτου» (αποθηκεύει όπου διάλεξε ο χρήστης)
      const job = (await chrome.storage.local.get("job")).job;
      let ok = false;
      if (job && job.originTab != null) { try { await chrome.tabs.sendMessage(job.originTab, msg); ok = true; } catch (e) { ok = false; } }
      if (!ok) await chrome.downloads.download({ url: "data:application/pdf;base64," + msg.b64, filename: "HEXIS-APP/" + (job ? job.main : "fakelos") + "/" + msg.name, conflictAction: "uniquify" });
      reply({ ok: true, delivered: ok });
    } else if (msg.type === "download") {
      const id = await chrome.downloads.download({ url: msg.url, filename: msg.name, conflictAction: "uniquify", saveAs: false });
      reply({ ok: true, id });
    } else reply({ ok: false });
  })();
  return true;
});

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  const fromKt = /ktimatologio\.gov\.gr/.test(item.url || "") || /ktimatologio\.gov\.gr/.test(item.referrer || "") || (item.url || "").startsWith("blob:https://ktimatologio.gov.gr");
  if (expect && Date.now() < expect.until && fromKt) {
    const name = expect.name; expect = null;
    suggest({ filename: name, conflictAction: "uniquify" });
  } else suggest();
});
