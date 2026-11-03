// HEXIS-APP · Φάκελος ZIP — καρτέλα του πρόσθετου. Διαβάζει τα αρχεία που μάζεψε το πρόσθετο
// (IndexedDB), προτείνει ονόματα φακέλων «ΚΑΕΚ - Ιδιοκτήτης - ΟΤΑ» και φτιάχνει ΕΝΑ ZIP.
// Όλα γίνονται τοπικά στον υπολογιστή σου — τίποτα δεν ανεβαίνει πουθενά.
"use strict";
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const SAFE = (s) => String(s || "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "").slice(0, 70);
const LABEL = { kf: "ΚΦ", kd: "ΚΔ", symvolaio: "Συμβόλαιο", topografiko: "Τοπογραφικό", synyp: "Συνυποβαλλόμενο", titlos: "Τίτλος", praxi: "Πράξη", eggrafo: "Έγγραφο" };
const ORDER = ["kf", "kd", "symvolaio", "titlos", "topografiko", "synyp", "praxi", "eggrafo"];
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("lib/pdf.worker.min.js");

function db() { return new Promise((res, rej) => { const r = indexedDB.open("hexis-fakelos", 1); r.onupgradeneeded = () => { r.result.createObjectStore("files", { keyPath: "id", autoIncrement: true }); r.result.createObjectStore("diag", { keyPath: "kaek" }); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function all(store) { const d = await db(); return new Promise((res, rej) => { const q = d.transaction(store).objectStore(store).getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
async function clearStore(store) { const d = await db(); return new Promise((res) => { const t = d.transaction(store, "readwrite"); t.objectStore(store).clear(); t.oncomplete = res; }); }

/* ---------- ιδιοκτήτης από το ΚΦ (απόσπασμα περιγραφικής βάσης) ---------- */
const LABELS_RX = /^(ΕΠΩΝΥΜΟ|ΕΠΩΝΥΜΙΑ|ΟΝΟΜΑ|ΠΑΤΡΩΝΥΜΟ|ΜΗΤΡΩΝΥΜΟ|ΑΦΜ|Α\.?Φ\.?Μ\.?|ΠΟΣΟΣΤΟ|ΕΙΔΟΣ|ΔΙΚΑΙΩΜΑ|ΔΙΚΑΙΟΥΧΟΣ|ΔΙΚΑΙΟΥΧΟΙ|ΙΔΙΟΤΗΤΑ|ΑΙΤΙΑ|ΤΙΤΛΟΣ|ΗΜΕΡΟΜΗΝΙΑ|ΑΡΙΘΜΟΣ|ΣΤΟΙΧΕΙΑ|ΚΑΕΚ|ΔΙΕΥΘΥΝΣΗ|ΠΛΗΡΗΣ|ΚΥΡΙΟΤΗΤΑ|ΨΙΛΗ|ΕΠΙΚΑΡΠΙΑ|ΠΡΟΣΩΠΟ|ΦΥΣΙΚΟ|ΝΟΜΙΚΟ)$/;
const up = (s) => String(s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const nameOk = (s) => { const u = up(s); return u.length >= 2 && u.length <= 45 && /^[Α-ΩA-Z][Α-ΩA-Z.\-' ]+$/.test(u) && !u.split(" ").some((w) => LABELS_RX.test(w)); };
async function ownerFromKF(buf) {
  try {
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)), isEvalSupported: false }).promise;
    const items = [];
    for (let p = 1; p <= Math.min(2, pdf.numPages); p++) {
      const tc = await (await pdf.getPage(p)).getTextContent();
      tc.items.forEach((it) => { if (it.str && it.str.trim()) items.push({ s: it.str.trim(), x: it.transform[4], y: it.transform[5] - p * 10000, w: it.width || 0 }); });
    }
    // γραμμές (ίδιο y)
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines = []; items.forEach((it) => { const L = lines.find((l) => Math.abs(l.y - it.y) < 3); if (L) L.items.push(it); else lines.push({ y: it.y, items: [it] }); });
    lines.forEach((l) => { l.items.sort((a, b) => a.x - b.x); l.text = l.items.map((i) => i.s).join(" "); });
    const pick = (rx) => {
      // α) «ΕΠΩΝΥΜΟ: ΠΑΠΑΔΟΠΟΥΛΟΣ» στην ίδια γραμμή
      for (const l of lines) { const m = up(l.text).match(rx.same); if (m && nameOk(m[1])) return m[1].trim(); }
      // β) επικεφαλίδα πίνακα και τιμή στην από κάτω γραμμή, στην ίδια στήλη
      for (let i = 0; i < lines.length - 1; i++) {
        const h = lines[i].items.find((it) => rx.head.test(up(it.s))); if (!h) continue;
        for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
          const v = lines[j].items.find((it) => Math.abs(it.x - h.x) < 25 || (it.x <= h.x + 5 && it.x + it.w >= h.x));
          if (v && nameOk(v.s)) return v.s.trim();
        }
      }
      return "";
    };
    const sur = pick({ same: /(?:ΕΠΩΝΥΜΟ|ΕΠΩΝΥΜΙΑ)(?:\s*\/\s*ΕΠΩΝΥΜΙΑ)?\s*[:：]\s*([Α-ΩA-Z][Α-ΩA-Z.\-' ]{1,40}?)(?=\s+(?:ΟΝΟΜΑ|ΠΑΤΡΩΝΥΜΟ|ΜΗΤΡΩΝΥΜΟ|ΑΦΜ|Α\.Φ\.Μ)|$)/, head: /^(ΕΠΩΝΥΜΟ|ΕΠΩΝΥΜΟ\s*\/\s*ΕΠΩΝΥΜΙΑ|ΕΠΩΝΥΜΙΑ)$/ });
    const nam = sur ? pick({ same: /(?:^|\s)ΟΝΟΜΑ\s*[:：]\s*([Α-ΩA-Z][Α-ΩA-Z.\-' ]{1,30}?)(?=\s+(?:ΠΑΤΡΩΝΥΜΟ|ΜΗΤΡΩΝΥΜΟ|ΑΦΜ|Α\.Φ\.Μ|ΕΠΩΝΥΜΟ)|$)/, head: /^ΟΝΟΜΑ$/ }) : "";
    return [sur, nam].filter(Boolean).join(" ");
  } catch (e) { console.warn(e); return ""; }
}

/* ΚΦ/ΚΔ: ιδιοκτήτης («Ονοματεπώνυμο Φυσικού Προσώπου»), ΟΤΑ («OTA:» του ΚΔ) */
function infoLines(lines){
  const U=s=>String(s).toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ").trim();
  const L=lines.map(U), all=L.join(" \n ");
  const kind=/ΑΠΟΣΠΑΣΜΑ ΠΕΡΙΓΡΑΦΙΚΗΣ ΒΑΣΗΣ/.test(all)?"kf":/ΦΥΛΛΟ ΧΑΡΤΙΟΥ|ΑΠΟΣΠΑΣΜΑ ΧΩΡΙΚΗΣ|ΚΤΗΜΑΤΟΛΟΓΙΚΟΥ ΔΙΑΓΡΑΜΜΑΤΟΣ|ΚΩΔΙΚΟΣ ΑΡΙΘΜΟΣ ΕΘΝΙΚΟΥ ΚΤΗΜΑΤΟΛΟΓΙΟΥ/.test(all)?"kd":"";
  const own=[];
  for(const l of L){
    const m=l.match(/ΟΝΟΜΑΤΕΠΩΝΥΜΟ ΦΥΣΙΚΟΥ ΠΡΟΣΩΠΟΥ ?: ?([Α-ΩA-Z][Α-ΩA-Z.'\- ]{2,60})$/) || l.match(/^ΕΠΩΝΥΜΙΑ(?: ΝΟΜΙΚΟΥ ΠΡΟΣΩΠΟΥ)? ?: ?([Α-ΩA-Z0-9][Α-ΩA-Z0-9.&'\- ]{2,80})$/);
    if(m) own.push(m[1].trim());
  }
  const uniq=[...new Set(own)];
  let ota=""; for(const l of L){ const m=l.match(/(?:^| )(?:OTA|ΟΤΑ) ?: ?([Α-ΩA-Z][Α-ΩA-Z.'\-]*(?: [Α-ΩA-Z.'\-]+)*?)(?= ΦΥΛΛΟ| ΚΩΔΙΚΟΣ| ΝΟΜΟΣ| \(|$)/); if(m){ ota=m[1].trim(); break; } }
  const km=all.replace(/[\s\/]+/g,"").match(/(\d{5}(?:ΕΚ|EK|\d{2})\d{5})/);
  return {kind, owner: uniq.length? uniq[0]+(uniq.length>1?" κ.α.":""):"", ota, kaek: km?km[1].replace("EK","ΕΚ"):""};
}
async function pdfLines(data){
  const pdf = await pdfjsLib.getDocument({ data, isEvalSupported:false }).promise, items=[];
  for(let p=1;p<=Math.min(2,pdf.numPages);p++){ const tc=await (await pdf.getPage(p)).getTextContent(); tc.items.forEach(it=>{ if(it.str&&it.str.trim()) items.push({s:it.str, x:it.transform[4], y:it.transform[5]-p*10000}); }); }
  items.sort((a,b)=>b.y-a.y||a.x-b.x); const lines=[];
  items.forEach(it=>{ const L=lines.find(l=>Math.abs(l.y-it.y)<3); if(L) L.items.push(it); else lines.push({y:it.y, items:[it]}); });
  return lines.map(l=>l.items.sort((a,b)=>a.x-b.x).map(i=>i.s).join(" "));
}

/* ---------- κατάσταση ---------- */
let JOB = null, FILES = [], DIAG = [], ROWS = [];
function folderOf(r) { return SAFE([r.kaek, r.owner, r.ota].filter(Boolean).join(" - ")) || r.kaek; }
function plan() {
  const main = ROWS.find((r) => r.role === "main") || ROWS[0];
  const out = [];
  ROWS.forEach((r) => {
    const fs = FILES.filter((f) => f.kaek === r.kaek).sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.n - b.n || a.t - b.t);
    const cnt = {}; fs.forEach((f) => { cnt[f.kind] = (cnt[f.kind] || 0) + 1; });
    const idx = {};
    fs.forEach((f) => {
      if (f.kind === "rym") { out.push({ path: folderOf(main) + "/Απόσπασμα ρυμοτομικού/" + SAFE(f.fname || ("aposp_" + f.n)), f }); return; }
      idx[f.kind] = (idx[f.kind] || 0) + 1;
      const name = `${r.kaek}_${LABEL[f.kind] || "Έγγραφο"}${cnt[f.kind] > 1 ? "_" + idx[f.kind] : ""}.pdf`;
      const dir = r === main ? folderOf(main) : folderOf(main) + "/" + folderOf(r);
      out.push({ path: dir + "/" + name, f });
    });
  });
  return { main, out };
}
function renderTree() {
  const { main, out } = plan();
  const root = folderOf(main) + "/";
  $("tree").textContent = out.length ? (folderOf(main) + ".zip  →  φάκελος «" + folderOf(main) + "»\n" + out.map((o) => "  " + o.path.slice(o.path.startsWith(root) ? root.length : 0)).join("\n")) : "Δεν μαζεύτηκαν αρχεία ακόμη.";
  $("save").disabled = !out.length;
}
function render() {
  $("rows").innerHTML = ROWS.map((r, i) => {
    const fs = FILES.filter((f) => f.kaek === r.kaek);
    const has = (k) => fs.some((f) => f.kind === k);
    const docs = fs.filter((f) => !["kf", "kd", "rym"].includes(f.kind)).length;
    const rym = fs.some((f) => f.kind === "rym");
    return `<tr><td class="k">${esc(r.kaek)}</td><td><span class="tag ${r.role === "main" ? "main" : ""}">${r.role === "main" ? "κύριο" : r.role === "ek" ? "ΕΚ" : "όμορο"}</span></td>
      <td><input type="text" data-i="${i}" value="${esc(r.owner)}" placeholder="π.χ. ΠΑΠΑΔΟΠΟΥΛΟΣ ΓΕΩΡΓΙΟΣ"></td><td class="h">${esc(r.ota || "—")}</td>
      <td class="files">${has("kf") ? "<b>ΚΦ ✓</b> " : '<span class="miss">ΚΦ —</span> '}${has("kd") ? "<b>ΚΔ ✓</b> " : '<span class="miss">ΚΔ —</span> '}${docs ? `<b>+${docs} έγγρ.</b>` : '<span class="miss">έγγραφα —</span>'}${r.role === "main" ? (rym ? " <b>+ απόσπ. ρυμοτομικού (PDF, DXF, TIFF)</b>" : ' <span class="miss">απόσπ. ρυμοτομικού —</span>') : ""}</td></tr>`;
  }).join("") || `<tr><td colspan="5">Δεν υπάρχει εργασία.</td></tr>`;
  $("rows").querySelectorAll("input").forEach((inp) => inp.addEventListener("input", () => { ROWS[+inp.dataset.i].owner = inp.value; renderTree(); }));
  const noDocs = ROWS.filter((r) => FILES.some((f) => f.kaek === r.kaek) && !FILES.some((f) => f.kaek === r.kaek && !["kf", "kd", "rym"].includes(f.kind)));
  $("warn").innerHTML = noDocs.length && DIAG.length
    ? `<div class="warnbox">Για ${noDocs.length === ROWS.length ? "κανένα ΚΑΕΚ" : noDocs.map((r) => esc(r.kaek)).join(", ")} δεν βρέθηκαν έγγραφα (συμβόλαια/τίτλοι) στην οθόνη του Κτηματολογίου. Αν τα βλέπεις εκεί, το ZIP περιέχει το αρχείο <b>_HEXIS_diagnostiko.json</b> (μόνο δομή σελίδας, χωρίς ονόματα) — στείλ' το στο HEXIS-APP για να διορθωθεί η αναγνώριση.</div>` : "";
  renderTree();
}
async function build() {
  const { main, out } = plan();
  const zip = new JSZip();
  out.forEach((o) => zip.file(o.path, o.f.data));
  const csv = ["ΚΑΕΚ;Ρόλος;Ιδιοκτήτης;ΟΤΑ;ΚΦ;ΚΔ;Έγγραφα;Φάκελος"].concat(ROWS.map((r) => {
    const fs = FILES.filter((f) => f.kaek === r.kaek);
    return [r.kaek, r.role === "main" ? "κύριο" : r.role === "ek" ? "κοινόχρηστο" : "όμορο", r.owner || "", r.ota || "", fs.some((f) => f.kind === "kf") ? "ΝΑΙ" : "ΟΧΙ", fs.some((f) => f.kind === "kd") ? "ΝΑΙ" : "ΟΧΙ", fs.filter((f) => !["kf", "kd", "rym"].includes(f.kind)).length, r === main ? folderOf(main) : folderOf(main) + "/" + folderOf(r)].join(";");
  }));
  zip.file(folderOf(main) + "/_ΕΥΡΕΤΗΡΙΟ.csv", "﻿" + csv.join("\r\n"));
  if (DIAG.length && ROWS.some((r) => FILES.some((f) => f.kaek === r.kaek) && !FILES.some((f) => f.kaek === r.kaek && !["kf", "kd", "rym"].includes(f.kind))))
    zip.file(folderOf(main) + "/_HEXIS_diagnostiko.json", JSON.stringify({ v: chrome.runtime.getManifest().version, pages: DIAG.map((d) => d.d) }, null, 1));
  return { blob: await zip.generateAsync({ type: "blob", compression: "DEFLATE" }), name: folderOf(main) + ".zip", count: out.length };
}
window.HXDone = { build, rows: () => ROWS, files: () => FILES };

$("save").onclick = async () => {
  $("save").disabled = true; $("st").textContent = "Δημιουργία ZIP…";
  try {
    const z = await build();
    if (window.showSaveFilePicker) {
      try {
        const h = await window.showSaveFilePicker({ suggestedName: z.name, types: [{ description: "ZIP", accept: { "application/zip": [".zip"] } }] });
        const w = await h.createWritable(); await w.write(z.blob); await w.close();
        $("st").textContent = `✓ Αποθηκεύτηκε: ${h.name} (${z.count} αρχεία).`; $("save").disabled = false; return;
      } catch (e) { if (e.name === "AbortError") { $("st").textContent = "Ακυρώθηκε."; $("save").disabled = false; return; } }
    }
    const a = document.createElement("a"); a.href = URL.createObjectURL(z.blob); a.download = z.name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
    $("st").textContent = `✓ Κατέβηκε: ${z.name} (${z.count} αρχεία).`;
  } catch (e) { $("st").textContent = "Σφάλμα: " + e.message; }
  $("save").disabled = false;
};
$("diag").onclick = async () => {
  const txt = JSON.stringify({ v: chrome.runtime.getManifest().version, job: JOB ? { i: JOB.i, step: JOB.step, n: JOB.kaeks.length, done: JOB.done } : null, pages: DIAG.map((d) => ({ at: d.kaek, d: d.d })) });
  try { await navigator.clipboard.writeText(txt); $("st").textContent = "✓ Αντιγράφηκε (" + DIAG.length + " σελίδες). Κάνε επικόλληση (Ctrl+V) στη συνομιλία με το Claude."; }
  catch (e) { $("tree").textContent = txt; $("st").textContent = "Αντίγραψε το κείμενο από το πλαίσιο."; }
};
$("clear").onclick = async () => {
  if (!confirm("Να σβηστούν τα αρχεία που μάζεψε το πρόσθετο για αυτή την εργασία;")) return;
  await clearStore("files"); await clearStore("diag"); await chrome.storage.local.remove("job");
  FILES = []; DIAG = []; ROWS = []; render(); $("st").textContent = "Καθαρίστηκε. Ξεκίνα νέα εργασία από τη σελίδα «Φάκελος Ακινήτου» του HEXIS-APP.";
};

(async () => {
  JOB = (await chrome.storage.local.get("job")).job || null;
  FILES = await all("files"); DIAG = await all("diag");
  const kaeks = JOB ? JOB.kaeks : [...new Set(FILES.map((f) => f.kaek))].map((k, i) => ({ kaek: k, role: i ? "omoro" : "main" }));
  ROWS = kaeks.map((k) => ({ kaek: k.kaek, role: k.role, ota: k.ota || "", owner: (JOB && JOB.owner && JOB.owner[k.kaek]) || "" }));
  render();
  // ιδιοκτήτης από το ΚΦ (όπου δεν βρέθηκε στην οθόνη) και ΟΤΑ του Κτηματολογίου από το ΚΔ
  for (const r of ROWS) {
    try {
      const kd = FILES.find((f) => f.kaek === r.kaek && f.kind === "kd");
      if (kd) { const i = infoLines(await pdfLines(new Uint8Array(kd.data.slice(0)))); if (i.ota) { r.ota = i.ota; render(); } }
      if (r.owner) continue;
      const kf = FILES.find((f) => f.kaek === r.kaek && f.kind === "kf"); if (!kf) continue;
      const i = infoLines(await pdfLines(new Uint8Array(kf.data.slice(0))));
      const o = i.owner || await ownerFromKF(kf.data); if (o && !r.owner) { r.owner = o; render(); }
    } catch (e) { console.warn(e); }
  }
  window.HXDone.ready = true;
})();
