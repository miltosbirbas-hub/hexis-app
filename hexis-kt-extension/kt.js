// HEXIS-APP · Φάκελος Κτηματολογίου — τρέχει ΜΟΝΟ μέσα στη δική σου συνεδρία στο
// https://ktimatologio.gov.gr/Professionals/ (Ηλεκτρονική Έρευνα Μηχανικών).
// Δεν διαβάζει ούτε στέλνει κωδικούς. Για κάθε ΚΑΕΚ της εργασίας: αναζήτηση → οθόνη ακινήτου →
// «Απόσπασμα περιγραφικής βάσης», «Απόσπασμα χωρικής βάσης», έγγραφα → επόμενο ΚΑΕΚ.
// Τα κουμπιά εντοπίζονται από το κείμενό τους (όπως τα περιγράφει το εγχειρίδιο του Κτηματολογίου).
(() => {
  "use strict";
  const send = (m) => new Promise((res) => chrome.runtime.sendMessage(m, res));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (s) => String(s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  const vis = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)) && getComputedStyle(el).visibility !== "hidden";
  const textOf = (el) => norm(el.innerText || el.value || el.getAttribute("title") || el.getAttribute("aria-label") || "");
  const CLICKABLE = "a,button,input[type=submit],input[type=button],[role=button],[onclick],span.btn,div.btn,li";

  function findClickable(rx, root = document) {
    const all = [...root.querySelectorAll(CLICKABLE)].filter(vis);
    // προτιμάμε το «στενότερο» στοιχείο που ταιριάζει
    const hits = all.filter((el) => rx.test(textOf(el)));
    // ίδιο κείμενο: προτιμάμε a/button από περιέκτες (li, div) — αλλιώς το κλικ «πέφτει» στο κενό
    const rank = (el) => (/^(A|BUTTON|INPUT)$/.test(el.tagName) ? 0 : el.getAttribute("role") === "button" || el.hasAttribute("onclick") ? 1 : 2);
    hits.sort((a, b) => textOf(a).length - textOf(b).length || rank(a) - rank(b));
    const h = hits[0] || null;
    if (h && rank(h) === 2) { const inner = h.querySelector("a,button"); if (inner && vis(inner)) return inner; }
    return h;
  }
  function labelText(inp) {
    let t = [inp.name, inp.id, inp.placeholder, inp.getAttribute("aria-label"), inp.title].join(" ");
    if (inp.id) { const l = document.querySelector(`label[for="${CSS.escape(inp.id)}"]`); if (l) t += " " + l.innerText; }
    const p = inp.closest("label,td,div,.form-group"); if (p) t += " " + (p.innerText || "").slice(0, 80);
    const prev = inp.parentElement && inp.parentElement.previousElementSibling; if (prev) t += " " + (prev.innerText || "").slice(0, 60);
    return norm(t);
  }
  function findKaekInput() {
    const ins = [...document.querySelectorAll("input[type=text],input:not([type]),input[type=search]")].filter(vis);
    return ins.find((i) => /ΚΑΕΚ|KAEK/.test(labelText(i))) || null;
  }
  function setValue(inp, v) {
    const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    d.set.call(inp, v);
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    inp.dispatchEvent(new Event("change", { bubbles: true }));
  }
  const isLogin = () => !!document.querySelector("input[type=password]") && vis(document.querySelector("input[type=password]"));

  /* ---------- πάνελ ---------- */
  let JOB = null, RUN = false, AUTO = true;
  const panel = document.createElement("div"); panel.id = "hx-panel";
  panel.innerHTML = `<div class="hd"><span>HEXIS-APP · Φάκελος</span><button data-a="min" title="Ελαχιστοποίηση">–</button></div><div class="bd"></div>`;
  const bd = panel.querySelector(".bd");
  function say(t, warn) { const m = panel.querySelector(".msg"); if (m) { m.textContent = t; m.classList.toggle("warn", !!warn); } }
  function render(msg, warn) {
    if (!JOB) { panel.remove(); return; }
    const done = JOB.done || {};
    bd.innerHTML = `<div class="msg${warn ? " warn" : ""}">${msg || ""}</div>
      <div class="row"><button class="b p" data-a="run">${RUN ? "■ Παύση" : "▶ Αυτόματα όλα"}</button><button class="b" data-a="one">Μόνο το τρέχον</button><button class="b" data-a="skip">Παράλειψη</button></div>
      <table>${JOB.kaeks.map((k, i) => `<tr><td>${i === JOB.i ? "▶" : ""}</td><td class="k">${k.kaek}</td><td>${k.role === "main" ? "κύριο" : k.role === "ek" ? "ΕΚ" : "όμορο"}</td><td class="${done[k.kaek] ? "ok" : ""}">${done[k.kaek] ? "✓ " + done[k.kaek] : ""}</td></tr>`).join("")}</table>
      <div class="row"><button class="b" data-a="diag" title="Αντιγράφει τη δομή της σελίδας (χωρίς στοιχεία ιδιοκτητών) για βελτίωση του πρόσθετου">Διάγνωση σελίδας</button><button class="b" data-a="stop">Τέλος εργασίας</button></div>`;
    if (!panel.isConnected) document.body.appendChild(panel);
  }
  panel.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-a]"); if (!a) return;
    const act = a.dataset.a;
    if (act === "min") panel.classList.toggle("min");
    if (act === "run") { RUN = !RUN; AUTO = true; render(RUN ? "Εκτέλεση…" : "Σε παύση."); if (RUN) loop(); }
    if (act === "one") { RUN = true; AUTO = false; render("Εκτέλεση για το τρέχον ΚΑΕΚ…"); loop(); }
    if (act === "skip") { JOB.i++; JOB.step = "search"; await save(); render("Παραλείφθηκε."); }
    if (act === "diag") diagnose();
    if (act === "stop") { await send({ type: "clearJob" }); JOB = null; RUN = false; panel.remove(); }
  });
  // μετακίνηση πάνελ
  (() => { let sx, sy, ox, oy; const hd = panel.querySelector(".hd");
    hd.addEventListener("mousedown", (e) => { if (e.target.closest("button")) return; sx = e.clientX; sy = e.clientY; const r = panel.getBoundingClientRect(); ox = r.left; oy = r.top;
      const mv = (ev) => { panel.style.left = ox + ev.clientX - sx + "px"; panel.style.top = oy + ev.clientY - sy + "px"; panel.style.right = "auto"; panel.style.bottom = "auto"; };
      const up = () => { removeEventListener("mousemove", mv); removeEventListener("mouseup", up); }; addEventListener("mousemove", mv); addEventListener("mouseup", up); }); })();

  const save = () => send({ type: "setJob", job: JOB });
  const fname = (kaek, type, n) => `HEXIS-APP/${JOB.main}/${kaek}__${type}${n ? "__" + n : ""}.pdf`;

  /* ---------- άνοιγμα PDF σε νέο παράθυρο: πιάνουμε το URL και το κατεβάζουμε με όνομα ---------- */
  let pendingName = null;
  const b64 = (buf) => { let s = "", a = new Uint8Array(buf); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
  // πρώτα: διαβάζουμε το αρχείο μέσα στη συνεδρία και το στέλνουμε στη σελίδα του HEXIS-APP (σώζει όπου διάλεξες)
  async function deliver(url, name) {
    try {
      const r = await fetch(url, { credentials: "include" });
      const ct = r.headers.get("content-type") || "";
      if (r.ok && /pdf|octet-stream/i.test(ct)) {
        const buf = await r.arrayBuffer();
        if (buf.byteLength > 200) { await send({ type: "file", name: name.split("/").pop(), b64: b64(buf) }); return true; }
      }
    } catch (e) { /* συνεχίζουμε με λήψη */ }
    await send({ type: "download", url, name });
    return false;
  }
  window.addEventListener("message", async (e) => {
    if (e.source !== window || !e.data || e.data.src !== "hx-main" || !pendingName) return;
    const name = pendingName; pendingName = null;
    await deliver(new URL(e.data.url, location.href).href, name);
  });
  async function clickAndCapture(el, name) {
    pendingName = name;
    document.documentElement.dataset.hxCapture = "1";
    await send({ type: "expect", name });
    const href = el.getAttribute && el.getAttribute("href");
    if (href && !/^javascript:|^#/i.test(href)) {
      pendingName = null; await deliver(new URL(href, location.href).href, name); await sleep(800);
    } else { el.click(); await sleep(6000); }
    document.documentElement.dataset.hxCapture = "";
    pendingName = null;
  }

  /* ---------- βήματα ---------- */
  async function stepSearch(k) {
    let inp = findKaekInput();
    if (!inp) {
      // προστασία από βρόχο: το πολύ 4 μετακινήσεις μέχρι να βρεθεί το πεδίο ΚΑΕΚ
      JOB.nav = (JOB.nav || 0) + 1; await save();
      if (JOB.nav > 4) { JOB.nav = 0; await save(); return { wait: "Άνοιξε την οθόνη «ΕΡΕΥΝΑ › ΑΚΙΝΗΤΟ» — δεν βρίσκω το πεδίο ΚΑΕΚ (πάτα «Διάγνωση σελίδας» αν επιμένει)." }; }
      // πρώτα το «ΑΚΙΝΗΤΟ» αν φαίνεται ήδη, αλλιώς το μενού «ΕΡΕΥΝΑ» (η σελίδα μπορεί να αλλάξει — συνεχίζουμε μετά τη φόρτωση)
      const m2 = findClickable(/^ΑΚΙΝΗΤΟ$/);
      if (m2) { m2.click(); await sleep(2500); }
      else { const m1 = findClickable(/^ΕΡΕΥΝΑ$/); if (m1) { m1.click(); await sleep(1200); const m3 = findClickable(/^ΑΚΙΝΗΤΟ$/); if (m3) { m3.click(); await sleep(2500); } } }
      inp = findKaekInput();
    }
    if (!inp) return { wait: "Άνοιξε την οθόνη «ΕΡΕΥΝΑ › ΑΚΙΝΗΤΟ» — δεν βρίσκω το πεδίο ΚΑΕΚ (πάτα «Διάγνωση σελίδας» αν επιμένει)." };
    JOB.nav = 0;
    setValue(inp, k.kaek);
    const b = findClickable(/^ΑΝΑΖΗΤΗΣΗ$/) || findClickable(/ΑΝΑΖΗΤΗΣΗ/);
    if (!b) return { wait: "Δεν βρίσκω το κουμπί «ΑΝΑΖΗΤΗΣΗ»." };
    JOB.step = "result"; await save();
    b.click(); await sleep(3500);
    return { next: true };
  }
  async function stepResult(k) {
    if (findClickable(/ΑΠΟΣΠΑΣΜΑ ΠΕΡΙΓΡΑΦΙΚΗΣ/)) { JOB.step = "property"; await save(); return { next: true }; }
    const cells = [...document.querySelectorAll("td,div,span,a")].filter((el) => vis(el) && norm(el.innerText).includes(k.kaek) && el.children.length < 4);
    const row = cells.map((c) => c.closest("tr,li,.row,.result")).find(Boolean) || cells[0];
    if (!row) return { wait: "Δεν βρέθηκε αποτέλεσμα για το ΚΑΕΚ — πιθανώς δεν υπάρχει στο λειτουργούν Κτηματολόγιο. Πάτα «Παράλειψη»." };
    const link = row.querySelector("a,button,input[type=button],input[type=submit]") || row;
    JOB.step = "property"; await save();
    link.click(); await sleep(3500);
    return { next: true };
  }
  async function stepProperty(k) {
    let got = [];
    const p = findClickable(/ΑΠΟΣΠΑΣΜΑ ΠΕΡΙΓΡΑΦΙΚΗΣ/);
    if (!p) return { wait: "Δεν βρίσκω το «ΑΠΟΣΠΑΣΜΑ ΠΕΡΙΓΡΑΦΙΚΗΣ ΒΑΣΗΣ» στην οθόνη ακινήτου." };
    say("Απόσπασμα περιγραφικής βάσης…"); await clickAndCapture(p, fname(k.kaek, "perigrafiko")); got.push("περιγρ.");
    const x = findClickable(/ΑΠΟΣΠΑΣΜΑ ΧΩΡΙΚΗΣ/);
    if (x) { say("Απόσπασμα χωρικής βάσης…"); await clickAndCapture(x, fname(k.kaek, "xoriko")); got.push("χωρικό"); }
    // έγγραφα (συμβόλαια, τοπογραφικά, συνυποβαλλόμενα, τίτλοι αρχικών εγγραφών)
    const CATS = [["ΣΥΜΒΟΛΑΙ", "symvolaio"], ["ΤΟΠΟΓΡΑΦΙΚ", "topografiko"], ["ΣΥΝΥΠΟΒΑΛΛ", "synyp"], ["ΤΙΤΛ", "titlos"]];
    const docLinks = [...document.querySelectorAll("a,button")].filter((el) => vis(el) && (/\.pdf(\?|$)/i.test(el.getAttribute("href") || "") || /^(ΠΡΟΒΟΛΗ|ΛΗΨΗ|ΑΝΟΙΓΜΑ|ΚΑΤΕΒΑΣΜΑ)$/.test(textOf(el)) || /fa-file-pdf|pdf/i.test(el.className || "")));
    let n = 0;
    for (const el of docLinks.slice(0, 40)) {
      const ctx = norm((el.closest("tr,li,section,fieldset,.panel,.card,div") || el).innerText || "");
      const sec = norm((el.closest("section,fieldset,.panel,.card,.tab-pane") || document.body).innerText || "").slice(0, 200);
      const cat = (CATS.find(([rx]) => ctx.includes(rx) || sec.includes(rx)) || [0, "eggrafo"])[1];
      n++; say(`Έγγραφο ${n}…`); await clickAndCapture(el, fname(k.kaek, cat, n));
    }
    if (n) got.push(n + " έγγρ.");
    JOB.done[k.kaek] = got.join(", ") || "—";
    JOB.i++; JOB.step = "search"; await save();
    // επιστροφή στην αναζήτηση για το επόμενο
    if (JOB.i < JOB.kaeks.length) { const back = findClickable(/^ΕΠΙΣΤΡΟΦΗ$/) || findClickable(/^ΕΡΕΥΝΑ$/); if (back) { back.click(); await sleep(2500); } }
    return { next: true, doneOne: true };
  }

  async function loop() {
    while (RUN && JOB) {
      if (JOB.i >= JOB.kaeks.length) { RUN = false; render("✓ Τελείωσε. Τα αρχεία στάλθηκαν στη σελίδα «Φάκελος Ακινήτου» του HEXIS-APP (αν την είχες κλείσει, είναι στις Λήψεις › HEXIS-APP › " + JOB.main + ")."); return; }
      if (isLogin()) { render("Συνδέσου με τους κωδικούς ΤΕΕ σε αυτή τη σελίδα. Μετά τη σύνδεση η εργασία συνεχίζει μόνη της.", true); RUN = false; return; }
      const k = JOB.kaeks[JOB.i];
      render(`ΚΑΕΚ ${k.kaek}: ${JOB.step === "search" ? "αναζήτηση" : JOB.step === "result" ? "επιλογή αποτελέσματος" : "λήψη αρχείων"}…`);
      let r;
      try { r = JOB.step === "search" ? await stepSearch(k) : JOB.step === "result" ? await stepResult(k) : await stepProperty(k); }
      catch (e) { r = { wait: "Σφάλμα: " + e.message }; }
      if (r.wait) { RUN = false; render(r.wait, true); return; }
      if (r.doneOne && !AUTO) { RUN = false; render("✓ " + k.kaek + " ολοκληρώθηκε."); return; }
      await sleep(600);
    }
  }

  /* ---------- διάγνωση: μόνο δομή σελίδας, χωρίς περιεχόμενο πινάκων ---------- */
  async function diagnose() {
    const cut = (s, n = 60) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
    const d = {
      path: location.pathname, title: document.title,
      inputs: [...document.querySelectorAll("input,select,textarea")].filter(vis).slice(0, 40).map((i) => ({ tag: i.tagName, type: i.type, name: i.name, id: i.id, ph: i.placeholder, label: cut(labelText(i), 80) })),
      clickables: [...document.querySelectorAll("a,button,input[type=submit],input[type=button],[role=button]")].filter(vis).slice(0, 120).map((el) => ({ tag: el.tagName, text: cut(el.innerText || el.value, 50), href: cut((el.getAttribute("href") || "").replace(/[?#].*/, ""), 80), cls: cut(el.className, 40), onclick: cut(el.getAttribute("onclick"), 60) })),
      tables: [...document.querySelectorAll("table")].filter(vis).slice(0, 10).map((t) => [...t.querySelectorAll("th")].map((th) => cut(th.innerText, 30))),
      frames: [...document.querySelectorAll("iframe")].map((f) => cut(f.src.replace(/[?#].*/, ""), 80))
    };
    const txt = JSON.stringify(d, null, 1);
    try { await navigator.clipboard.writeText(txt); say("Η δομή της σελίδας αντιγράφηκε — επικόλλησέ τη στο Claude. Δεν περιέχει ονόματα ή στοιχεία ιδιοκτητών."); }
    catch (e) { const w = window.open("", "_blank"); if (w) { w.document.body.innerText = txt; } }
  }

  /* ---------- εκκίνηση ---------- */
  (async () => {
    JOB = await send({ type: "getJob" });
    if (!JOB) return;
    if (isLogin()) { render("Συνδέσου με τους κωδικούς ΤΕΕ σε αυτή τη σελίδα. Μετά τη σύνδεση πάτα «▶ Αυτόματα όλα».", true); return; }
    render("Έτοιμο. Πάτα «▶ Αυτόματα όλα» για όλα τα ΚΑΕΚ ή «Μόνο το τρέχον».");
    RUN = !!JOB.running; AUTO = JOB.auto !== false;
    if (RUN) loop();
  })();
  // κρατάμε την κατάσταση «σε εκτέλεση» ανάμεσα στις φορτώσεις σελίδων
  window.addEventListener("beforeunload", () => { if (JOB) { JOB.running = RUN; JOB.auto = AUTO; chrome.runtime.sendMessage({ type: "setJob", job: JOB }); } });
})();
