// HEXIS-APP · Φάκελος Κτηματολογίου — τρέχει ΜΟΝΟ μέσα στη δική σου συνεδρία στην
// Ηλεκτρονική Έρευνα Μηχανικών του Κτηματολογίου. Δεν διαβάζει ούτε στέλνει κωδικούς.
// Για κάθε ΚΑΕΚ: αναζήτηση → οθόνη ακινήτου → ΚΦ (περιγραφική), ΚΔ (χωρική), όλα τα έγγραφα.
// Τα αρχεία ΔΕΝ πάνε ένα-ένα στις Λήψεις: μαζεύονται μέσα στο πρόσθετο και στο τέλος
// ανοίγει καρτέλα με ΕΝΑ ZIP (φάκελος «ΚΑΕΚ - Ιδιοκτήτης - ΟΤΑ» + υποφάκελοι όμορων).
(() => {
  "use strict";
  // αν το πρόσθετο ενημερώθηκε/ξαναφορτώθηκε, αυτή η σελίδα πρέπει να ανανεωθεί (F5)
  const dead = () => { try { return !chrome.runtime || !chrome.runtime.id; } catch (e) { return true; } };
  function deadNotice() {
    const p = document.getElementById("hx-panel"); const m = p && p.querySelector(".msg");
    if (m) { m.textContent = "Το πρόσθετο ενημερώθηκε — κάνε ανανέωση αυτής της σελίδας (F5) και πάτα ξανά."; m.classList.add("warn"); }
    else alert("HEXIS-APP: το πρόσθετο ενημερώθηκε — κάνε ανανέωση της σελίδας (F5).");
  }
  const send = (m) => new Promise((res) => {
    if (dead()) { deadNotice(); return res(null); }
    try { chrome.runtime.sendMessage(m, (r) => { void chrome.runtime.lastError; res(r); }); } catch (e) { deadNotice(); res(null); }
  });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (s) => String(s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  const vis = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)) && getComputedStyle(el).visibility !== "hidden";
  const textOf = (el) => norm(el.innerText || el.value || el.getAttribute("title") || el.getAttribute("aria-label") || "");
  const CLICKABLE = "a,button,input[type=submit],input[type=button],[role=button],[role=tab],[onclick],span.btn,div.btn,li";

  // ΠΟΤΕ σε σύνδεσμο άλλου site (social media, gov.gr κ.λπ.) ή στο υποσέλιδο
  const external = (el) => { try { const a = el.closest && el.closest("a[href]"); if (!a) return false; const u = new URL(a.getAttribute("href"), location.href); return u.host !== location.host || u.protocol !== location.protocol; } catch (e) { return false; } };
  const inFooter = (el) => !!(el.closest && el.closest("footer,.footer,#footer,[class*=footer],[id*=footer]"));
  const safeEl = (el) => !external(el) && !inFooter(el) && !(typeof panel !== "undefined" && panel.contains(el));
  function findClickable(rx, root = document) {
    const all = [...root.querySelectorAll(CLICKABLE)].filter((el) => vis(el) && safeEl(el));
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
  let JOB = null, RUN = false, AUTO = true, HANDOFF_TAB = false;
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
      <div class="row"><button class="b p" data-a="zip">Φάκελος ZIP</button><button class="b" data-a="diag" title="Αντιγράφει τη δομή της σελίδας (χωρίς στοιχεία ιδιοκτητών) για βελτίωση του πρόσθετου">Διάγνωση σελίδας</button><button class="b" data-a="stop">Τέλος εργασίας</button></div>`;
    if (!panel.isConnected) document.body.appendChild(panel);
  }
  panel.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-a]"); if (!a) return;
    const act = a.dataset.a;
    if (act === "min") panel.classList.toggle("min");
    if (act === "run") { RUN = !RUN; AUTO = true; render(RUN ? "Εκτέλεση…" : "Σε παύση."); if (RUN) loop(); }
    if (act === "one") { RUN = true; AUTO = false; render("Εκτέλεση για το τρέχον ΚΑΕΚ…"); loop(); }
    if (act === "skip") { JOB.i++; JOB.step = "search"; await save(); render("Παραλείφθηκε."); }
    if (act === "zip") send({ type: "finish" });
    if (act === "diag") diagnose();
    if (act === "stop") { await send({ type: "clearJob" }); JOB = null; RUN = false; panel.remove(); }
  });
  (() => { let sx, sy, ox, oy; const hd = panel.querySelector(".hd");
    hd.addEventListener("mousedown", (e) => { if (e.target.closest("button")) return; sx = e.clientX; sy = e.clientY; const r = panel.getBoundingClientRect(); ox = r.left; oy = r.top;
      const mv = (ev) => { panel.style.left = ox + ev.clientX - sx + "px"; panel.style.top = oy + ev.clientY - sy + "px"; panel.style.right = "auto"; panel.style.bottom = "auto"; };
      const up = () => { removeEventListener("mousemove", mv); removeEventListener("mouseup", up); }; addEventListener("mousemove", mv); addEventListener("mouseup", up); }); })();

  const save = () => send({ type: "setJob", job: JOB });

  /* ---------- ιδιοκτήτης από την οθόνη ακινήτου (μόνο για το όνομα φακέλου στον υπολογιστή σου) ---------- */
  function readOwner() {
    const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
    const ok = (s) => s && s.length >= 3 && s.length <= 80 && /[Α-ΩA-Zα-ωa-z]/.test(s) && !/\d{5,}/.test(s);
    for (const t of document.querySelectorAll("table")) {
      const hr = [...t.querySelectorAll("tr")].find((r) => [...r.children].some((c) => /^(ΕΠΩΝΥΜΟ|ΟΝΟΜΑΤΕΠΩΝΥΜΟ|ΕΠΩΝΥΜΙΑ|ΕΠΩΝΥΜΟ\s*\/\s*ΕΠΩΝΥΜΙΑ)$/.test(norm(c.innerText))));
      if (!hr) continue;
      const ths = [...hr.children].map((th) => norm(th.innerText));
      const iFull = ths.findIndex((h) => /ΟΝΟΜΑΤΕΠΩΝΥΜΟ|ΔΙΚΑΙΟΥΧ|ΙΔΙΟΚΤΗΤ|ΕΠΩΝΥΜΟ\s*\/\s*ΕΠΩΝΥΜΙΑ|^ΕΠΩΝΥΜΙΑ$/.test(h));
      const iSur = ths.findIndex((h) => /^ΕΠΩΝΥΜΟ$/.test(h)), iName = ths.findIndex((h) => /^ΟΝΟΜΑ$/.test(h));
      if (iFull < 0 && iSur < 0) continue;
      const all = [...t.querySelectorAll("tr")], rows = all.slice(all.indexOf(hr) + 1).filter((r) => r.querySelector("td") && r.children.length >= ths.length - 1);
      const names = rows.map((r) => { const c = [...r.children].map((x) => clean(x.innerText)); return iFull >= 0 ? c[iFull] : [c[iSur], iName >= 0 ? c[iName] : ""].filter(Boolean).join(" "); }).filter(ok);
      if (names.length) return names[0] + (names.length > 1 ? " κ.α." : "");
    }
    const labs = [...document.querySelectorAll("label,dt,th,td,span,div,strong,b")].filter((el) => el.children.length <= 1 && /^(ΔΙΚΑΙΟΥΧΟΣ|ΔΙΚΑΙΟΥΧΟΙ|ΟΝΟΜΑΤΕΠΩΝΥΜΟ|ΕΠΩΝΥΜΙΑ|ΙΔΙΟΚΤΗΤΗΣ|ΙΔΙΟΚΤΗΤΕΣ)\s*:?$/.test(norm(el.innerText)));
    for (const l of labs) { const v = l.nextElementSibling; if (v && ok(clean(v.innerText))) return clean(v.innerText); }
    return "";
  }

  /* ---------- σύλληψη αρχείων ---------- */
  const b64 = (buf) => { let s = "", a = new Uint8Array(buf); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
  const isPdf = (buf) => { if (!buf || buf.byteLength < 200) return false; const h = new Uint8Array(buf, 0, Math.min(1024, buf.byteLength)); for (let i = 0; i < h.length - 4; i++) if (h[i] === 0x25 && h[i + 1] === 0x50 && h[i + 2] === 0x44 && h[i + 3] === 0x46) return true; return false; };
  let pending = null;        // { kaek, kind, n, got }
  async function keep(buf, meta) {
    if (!isPdf(buf) || !meta) return false;
    const r = await send({ type: "file", kaek: meta.kaek, kind: meta.kind, n: meta.n || 0, b64: b64(buf) });
    if (pending === meta) pending.got = true;
    return !!(r && r.ok);
  }
  async function fetchPdf(url) {
    try { const r = await fetch(url, { credentials: "include" }); if (!r.ok) return null; const buf = await r.arrayBuffer(); return isPdf(buf) ? buf : null; } catch (e) { return null; }
  }
  // το background ζητά να διαβαστεί μια λήψη που ξεκίνησε το site (για να μπει στο ZIP αντί για τις Λήψεις)
  chrome.runtime.onMessage.addListener((m) => {
    if (!m || m.type !== "resume") return;
    (async () => { JOB = await send({ type: "getJob" }); if (!JOB) return; RUN = true; AUTO = JOB.auto !== false; render("Συνέχεια με το επόμενο ΚΑΕΚ…"); loop(); })();
  });
  chrome.runtime.onMessage.addListener((m, s, reply) => {
    if (!m || m.type !== "refetch") return;
    (async () => { const buf = await fetchPdf(m.url); reply(buf ? { ok: true, b64: b64(buf) } : { ok: false }); })();
    return true;
  });
  // από το MAIN world (kt-main.js): PDF που θα άνοιγε σε παράθυρο, blob, ή φόρμα που επέστρεψε PDF
  window.addEventListener("message", async (e) => {
    if (e.source !== window || !e.data || e.data.src !== "hx-main" || !pending) return;
    const meta = pending;
    if (e.data.type === "blob" && e.data.buf) await keep(e.data.buf, meta);
    else if (e.data.url) { const buf = await fetchPdf(new URL(e.data.url, location.href).href); if (buf) await keep(buf, meta); }
  });
  async function grab(el, meta) {
    pending = meta; meta.got = false;
    await send({ type: "expect", kaek: meta.kaek, kind: meta.kind, n: meta.n || 0 });
    const href = el.getAttribute && el.getAttribute("href");
    if (href && !/^javascript:|^#/i.test(href)) { const buf = await fetchPdf(new URL(href, location.href).href); if (buf) { await keep(buf, meta); pending = null; return true; } }
    document.documentElement.dataset.hxCapture = "1";
    el.click();
    for (let t = 0; t < 40 && !meta.got; t++) await sleep(250);
    if (!meta.got) { const r = await send({ type: "captured?", kaek: meta.kaek, kind: meta.kind, n: meta.n || 0 }); meta.got = !!(r && r.ok); }
    for (let t = 0; t < 12 && !meta.got; t++) { await sleep(500); const r = await send({ type: "captured?", kaek: meta.kaek, kind: meta.kind, n: meta.n || 0 }); meta.got = !!(r && r.ok); }
    document.documentElement.dataset.hxCapture = "";
    pending = null;
    return meta.got;
  }

  // σελίδα (π.χ. showScans) που περιέχει τα έγγραφα: PDF κατευθείαν, ή σύνδεσμοι/πλαίσια προς PDF
  async function grabPage(url, meta, seen) {
    if (seen.has(url)) return 0; seen.add(url);
    let r, buf, ct = "";
    try { r = await fetch(url, { credentials: "include" }); if (!r.ok) return 0; ct = r.headers.get("content-type") || ""; buf = await r.arrayBuffer(); } catch (e) { return 0; }
    if (isPdf(buf)) return (await keep(buf, meta)) ? 1 : 0;
    if (!/html/i.test(ct)) return 0;
    const html = new TextDecoder("utf-8").decode(buf), doc = new DOMParser().parseFromString(html, "text/html");
    const base = r.url || url, cand = [];
    doc.querySelectorAll("a[href],iframe[src],embed[src],object[data]").forEach((e) => {
      const h = e.getAttribute("href") || e.getAttribute("src") || e.getAttribute("data") || "";
      if (!h || /^javascript:|^#|^mailto:|^tel:/i.test(h)) return;
      let u; try { u = new URL(h, base); } catch (x) { return; } if (u.host !== location.host) return;
      const txt = norm(e.textContent || "");
      if (e.tagName !== "A" || /pdf|scan|download|getfile|file|document|view|show|image/i.test(u.pathname + u.search) || /ΠΡΟΒΟΛΗ|ΛΗΨΗ|ΑΝΟΙΓΜΑ|ΕΜΦΑΝΙΣΗ|ΚΑΤΕΒΑΣΜΑ|ΕΓΓΡΑΦΟ|ΣΑΡΩΣ/.test(txt)) cand.push({ u: u.href, row: norm((e.closest("tr,li") || e).textContent || "") });
    });
    send({ type: "diag", kaek: "page " + new URL(base).pathname + " · " + meta.kaek, d: { path: new URL(base).pathname, links: [...doc.querySelectorAll("a[href]")].slice(0, 120).map((a) => ({ t: norm(a.textContent).slice(0, 40), h: (a.getAttribute("href") || "").replace(/[?#].*/, "").slice(0, 90), c: (a.className || "").slice(0, 40), o: (a.getAttribute("onclick") || "").slice(0, 60) })), forms: [...doc.querySelectorAll("form")].slice(0, 10).map((f) => ({ a: (f.getAttribute("action") || "").replace(/[?#].*/, ""), m: f.method, inputs: [...f.querySelectorAll("input,button,select")].slice(0, 20).map((i) => i.tagName + ":" + (i.type || "") + ":" + (i.name || "")) })), frames: [...doc.querySelectorAll("iframe,embed,object")].map((f) => (f.getAttribute("src") || f.getAttribute("data") || "").replace(/[?#].*/, "")), th: [...doc.querySelectorAll("th")].slice(0, 30).map((t) => norm(t.textContent).slice(0, 30)) } });
    let got = 0, i = 0;
    const KR = [["ΣΥΜΒΟΛΑΙ", "symvolaio"], ["ΤΟΠΟΓΡΑΦ", "topografiko"], ["ΣΥΝΥΠΟΒΑΛΛ", "synyp"], ["ΤΙΤΛ", "titlos"], ["ΠΡΑΞ", "praxi"], ["ΔΙΑΘΗΚ", "titlos"], ["ΑΠΟΦΑΣ", "titlos"]];
    for (const c of cand.slice(0, 30)) {
      if (seen.has(c.u)) continue; seen.add(c.u);
      const kind = (KR.find(([rx]) => c.row.includes(rx)) || [0, meta.kind])[1];
      const b = await fetchPdf(c.u); if (b && await keep(b, { kaek: meta.kaek, kind, n: meta.n * 100 + (++i) })) got++;
    }
    return got;
  }

  /* ---------- βήματα ---------- */
  // όλοι οι σύνδεσμοι της σελίδας (και όσοι είναι μέσα σε κλειστά μενού)
  const allLinks = () => [...document.querySelectorAll("a[href]")].filter((a) => safeEl(a) && !/^javascript:|^#|^mailto:|^tel:/i.test(a.getAttribute("href") || "") && !/LOGOUT|LOGOFF|SIGNOUT|ΑΠΟΣΥΝΔΕΣ|ΕΞΟΔΟΣ/i.test(norm(a.textContent) + " " + a.href.toUpperCase()));
  function searchLink() {
    const L = allLinks();
    return L.find((a) => /^(ΑΚΙΝΗΤΟ|ΑΚΙΝΗΤΑ|ΕΡΕΥΝΑ ΑΚΙΝΗΤΟΥ|ΑΝΑΖΗΤΗΣΗ ΑΚΙΝΗΤΟΥ|ΕΡΕΥΝΑ ΒΑΣΕΙ ΑΚΙΝΗΤΟΥ)$/.test(norm(a.textContent)))
        || L.find((a) => /ΑΚΙΝΗΤ/.test(norm(a.textContent)) && /ΕΡΕΥΝ|ΑΝΑΖΗΤ/.test(norm(a.textContent)))
        || L.find((a) => /\/(Search|Erevna|Ereuna|Research)[^?#]*(Property|Akinito|Akinita|Kaek)/i.test(a.href))
        || L.find((a) => /^(ΕΡΕΥΝΑ|ΗΛΕΚΤΡΟΝΙΚΗ ΕΡΕΥΝΑ)$/.test(norm(a.textContent)))
        || L.find((a) => /\/(Search|Erevna|Ereuna|Research)(\/|$|\?)/i.test(a.href));
  }
  const KT_SEARCH = "/Professionals/Inquiry/Main/SearchByEstate";
  const KT_VIEW = (k) => "/Professionals/Inquiry/Main/viewResults/" + encodeURIComponent(k) + "-0-0";
  async function stepSearch(k) {
    // 1) κατευθείαν στην οθόνη του ακινήτου (όπως την ανοίγει το site μετά την αναζήτηση)
    if (decodeURIComponent(location.pathname).indexOf("/viewResults/" + k.kaek) >= 0) {
      for (let t = 0; t < 10 && !findClickable(/ΑΠΟΣΠΑΣΜΑ ΠΕΡΙΓΡΑΦΙΚΗΣ/); t++) await sleep(500);
      if (findClickable(/ΑΠΟΣΠΑΣΜΑ ΠΕΡΙΓΡΑΦΙΚΗΣ/)) { JOB.step = "property"; await save(); return { next: true }; }
    }
    JOB.direct = JOB.direct || {};
    if (!JOB.direct[k.kaek]) { JOB.direct[k.kaek] = 1; await save(); location.assign(KT_VIEW(k.kaek)); await sleep(6000); return { next: true }; }
    if (!JOB.searchUrl) JOB.searchUrl = location.origin + KT_SEARCH;
    let inp = findKaekInput();
    if (!inp) {
      JOB.nav = (JOB.nav || 0) + 1; await save();
      if (JOB.nav > 5) { JOB.nav = 0; await save(); return { wait: "Πήγαινε ΜΙΑ φορά μόνος σου στην οθόνη αναζήτησης ακινήτου (εκεί που γράφεις ΚΑΕΚ) και πάτα «▶ Αυτόματα όλα». Από εκεί και πέρα το πρόσθετο τη θυμάται." }; }
      // 1) η οθόνη αναζήτησης που βρήκαμε την προηγούμενη φορά
      if (JOB.searchUrl && location.href.split("#")[0] !== JOB.searchUrl) { location.assign(JOB.searchUrl); await sleep(5000); return { next: true }; }
      // 2) ορατά «ΑΚΙΝΗΤΟ» / «ΕΡΕΥΝΑ»
      const m2 = findClickable(/^ΑΚΙΝΗΤΟ$/);
      if (m2) { m2.click(); await sleep(2500); }
      else {
        // 3) σύνδεσμος (και μέσα σε κλειστό μενού) προς την έρευνα ακινήτου
        const l = searchLink();
        if (l) { location.assign(l.href); await sleep(5000); return { next: true }; }
        // 4) άνοιγμα μενού (⋮ / ☰) και ξανά
        // μόνο κουμπιά μενού στην κεφαλίδα (πάνω μέρος της σελίδας), όχι σύνδεσμοι προς άλλες σελίδες
        const menus = [...document.querySelectorAll("button,[role=button],a[href='#'],a:not([href]),[data-toggle],[data-bs-toggle]")]
          .filter((el) => vis(el) && safeEl(el) && el.getBoundingClientRect().top < 220 && (/menu|toggle|dropdown|navbar|kebab|more/i.test((el.className && el.className.baseVal != null ? el.className.baseVal : el.className) + " " + (el.getAttribute("aria-label") || "") + " " + (el.id || "")) || /^(⋮|☰|…|ΜΕΝΟΥ)$/.test(textOf(el)) || el.hasAttribute("data-toggle") || el.hasAttribute("data-bs-toggle")));
        for (const mb of menus.slice(0, 2)) { try { mb.click(); await sleep(800); } catch (e) {} const m3 = findClickable(/^(ΑΚΙΝΗΤΟ|ΕΡΕΥΝΑ)$/); if (m3) { m3.click(); await sleep(2500); break; } }
      }
      inp = findKaekInput();
    }
    if (!inp) return { next: true };
    JOB.nav = 0;
    const here = location.href.split("#")[0];
    if (JOB.searchUrl !== here && !/\?.*KAEK=/i.test(here)) { JOB.searchUrl = here; send({ type: "pref", ktSearchUrl: here }); }
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
    JOB.step = "property"; JOB.lastRun = Date.now(); JOB.handoff = Date.now(); await save();
    // κλικ όπως ο χρήστης· αν το site ανοίξει το ακίνητο σε ΝΕΑ καρτέλα, η εργασία συνεχίζει εκεί
    link.click();
    for (let t = 0; t < 16; t++) { await sleep(500); if (findClickable(/ΑΠΟΣΠΑΣΜΑ ΠΕΡΙΓΡΑΦΙΚΗΣ/)) return { next: true }; }
    return { handoff: true };
  }
  // στοιχεία που κατεβάζουν/δείχνουν έγγραφο (με κείμενο, τίτλο ή μόνο εικονίδιο μέσα σε γραμμή πίνακα εγγράφων)
  const DOC_TXT = /^(ΠΡΟΒΟΛΗ|ΛΗΨΗ|ΑΝΟΙΓΜΑ|ΚΑΤΕΒΑΣΜΑ|ΕΜΦΑΝΙΣΗ|ΑΡΧΕΙΟ|PDF|DOWNLOAD|VIEW|ΠΡΟΒΟΛΗ ΕΓΓΡΑΦΟΥ|ΛΗΨΗ ΕΓΓΡΑΦΟΥ|ΠΡΟΒΟΛΗ ΑΡΧΕΙΟΥ)$/;
  function docTargets() {
    const out = new Set();
    const els = [...document.querySelectorAll("a,button,[role=button],input[type=button],input[type=submit]")].filter((el) => vis(el) && safeEl(el));
    for (const el of els) {
      const t = textOf(el), href = el.getAttribute("href") || "";
      if (/ΑΠΟΣΠΑΣΜΑ (ΠΕΡΙΓΡΑΦΙΚΗΣ|ΧΩΡΙΚΗΣ)|ΑΝΑΖΗΤΗΣΗ|ΕΠΙΣΤΡΟΦΗ|ΕΡΕΥΝΑ|ΑΠΟΣΥΝΔΕΣΗ|ΕΞΟΔΟΣ/.test(t)) continue;
      const icon = !norm(el.innerText) && el.querySelector("i,svg,img,span[class*=icon],span[class*=fa]");
      const rowTxt = norm((el.closest("tr,li,.row,.card") || el).innerText || "");
      const secTxt = norm((el.closest("table,section,fieldset,.panel,.card,.tab-pane") || document.body).innerText || "").slice(0, 400);
      if (/^ΕΠΙΛΕΞΤΕ$/.test(t) || /IconMore/.test(el.className || "") || /showScans|ShowDocs|GetScan|Download/i.test(href) ||
          /\.pdf(\?|$)/i.test(href) || DOC_TXT.test(t) || /fa-file-pdf|fa-download|pdf|download/i.test(el.className || "") ||
          (icon && /ΣΥΜΒΟΛ|ΤΙΤΛ|ΕΓΓΡΑΦ|ΤΟΠΟΓΡΑΦ|ΣΥΝΥΠΟΒ|ΠΡΑΞ/.test(secTxt + " " + rowTxt))) out.add(el);
    }
    return [...out];
  }
  async function openDocTabs() {
    // καρτέλες/κουμπιά «Έγγραφα», «Λίστα εγγράφων», «Τίτλοι» που κρύβουν τη λίστα
    const tabs = [...document.querySelectorAll("[role=tab],.nav a,.nav-tabs a,.tabs a,a[data-toggle],a[data-bs-toggle],button,a,summary")]
      .filter((el) => vis(el) && safeEl(el) && /^(ΕΓΓΡΑΦΑ|ΛΙΣΤΑ ΕΓΓΡΑΦΩΝ|ΤΙΤΛΟΙ|ΣΧΕΤΙΚΑ ΕΓΓΡΑΦΑ|ΣΥΝΗΜΜΕΝΑ|ΕΓΓΡΑΦΑ ΑΚΙΝΗΤΟΥ)/.test(textOf(el)) && !/\.pdf/i.test(el.getAttribute("href") || ""));
    for (const t of tabs.slice(0, 4)) { try { t.click(); await sleep(1500); } catch (e) {} }
  }
  function structure() {
    const cut = (s, n = 60) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
    return {
      path: location.pathname, title: document.title,
      inputs: [...document.querySelectorAll("input,select,textarea")].filter(vis).slice(0, 40).map((i) => ({ tag: i.tagName, type: i.type, name: i.name, id: i.id, label: cut(labelText(i), 80) })),
      clickables: [...document.querySelectorAll("a,button,input[type=submit],input[type=button],[role=button],[role=tab]")].filter((el) => vis(el) && !panel.contains(el)).slice(0, 160).map((el) => ({ tag: el.tagName, text: cut(el.innerText || el.value, 40), title: cut(el.getAttribute("title") || el.getAttribute("aria-label"), 40), href: cut((el.getAttribute("href") || "").replace(/[?#].*/, ""), 80), cls: cut(el.className && el.className.baseVal != null ? el.className.baseVal : el.className, 50), onclick: cut(el.getAttribute("onclick"), 60), target: el.getAttribute("target") || "", icon: !!el.querySelector("i,svg,img") })),
      tables: [...document.querySelectorAll("table")].filter(vis).slice(0, 12).map((t) => ({ th: [...t.querySelectorAll("th")].map((th) => cut(th.innerText, 30)), rows: t.querySelectorAll("tr").length })),
      headings: [...document.querySelectorAll("h1,h2,h3,h4,legend,.panel-title,.card-header")].filter(vis).slice(0, 30).map((h) => cut(h.innerText, 50)),
      links: allLinks().slice(0, 200).map((a) => ({ text: cut(a.textContent, 40), href: cut(a.getAttribute("href").replace(/[?#].*/, ""), 90), vis: vis(a) })),
      forms: [...document.querySelectorAll("form")].slice(0, 10).map((f) => ({ action: cut((f.getAttribute("action") || "").replace(/[?#].*/, ""), 80), method: f.method, target: f.target })),
      frames: [...document.querySelectorAll("iframe")].map((f) => cut(f.src.replace(/[?#].*/, ""), 80))
    };
  }
  async function stepProperty(k) {
    const got = [];
    JOB.owner = JOB.owner || {};
    if (!JOB.owner[k.kaek]) { const o = readOwner(); if (o) { JOB.owner[k.kaek] = o; await save(); } }
    let p = findClickable(/ΑΠΟΣΠΑΣΜΑ ΠΕΡΙΓΡΑΦΙΚΗΣ/);
    if (!p) { await sleep(2500); p = findClickable(/ΑΠΟΣΠΑΣΜΑ ΠΕΡΙΓΡΑΦΙΚΗΣ/); }
    if (!p) {
      // δεν είμαστε στην οθόνη ακινήτου (π.χ. γύρισε στην αρχική): ξαναψάχνουμε το ΚΑΕΚ, έως 2 φορές
      JOB.retry = (JOB.retry || 0) + 1;
      if (JOB.retry <= 2) { JOB.step = "search"; await save(); return { next: true }; }
      JOB.retry = 0; await save();
      return { wait: "Δεν βρίσκω το «ΑΠΟΣΠΑΣΜΑ ΠΕΡΙΓΡΑΦΙΚΗΣ ΒΑΣΗΣ». Αν το ακίνητο άνοιξε σε άλλη καρτέλα, πήγαινε εκεί και πάτα «▶ Αυτόματα όλα» — ή πάτα «Διάγνωση σελίδας» στην οθόνη του ακινήτου και στείλ' το." };
    }
    JOB.retry = 0;
    say("ΚΦ (περιγραφική βάση)…"); if (await grab(p, { kaek: k.kaek, kind: "kf" })) got.push("ΚΦ");
    const x = findClickable(/ΑΠΟΣΠΑΣΜΑ ΧΩΡΙΚΗΣ/);
    if (x) { say("ΚΔ (χωρική βάση)…"); if (await grab(x, { kaek: k.kaek, kind: "kd" })) got.push("ΚΔ"); }
    await openDocTabs();
    send({ type: "diag", kaek: k.kaek, d: structure() });
    const CATS = [["ΑΡΧΙΚΩΝ", "titlos"], ["ΜΕΤΑΓΕΝΕΣΤ", "symvolaio"], ["ΣΥΜΒΟΛΑΙ", "symvolaio"], ["ΤΟΠΟΓΡΑΦΙΚ", "topografiko"], ["ΣΥΝΥΠΟΒΑΛΛ", "synyp"], ["ΤΙΤΛ", "titlos"], ["ΠΡΑΞ", "praxi"]];
    // επικεφαλίδα της στήλης του κελιού (π.χ. «Τίτλοι και έγγραφα αρχικών εγγραφών» / «… μεταγενέστερων»)
    const colHead = (el) => { const td = el.closest("td,th"), tr = td && td.parentElement, t = tr && tr.closest("table"); if (!t) return "";
      const i = [...tr.children].indexOf(td), heads = [...t.querySelectorAll("tr")].filter((r) => r.querySelector("th") && r.children.length === tr.children.length);
      const h = heads.length ? heads[heads.length - 1].children[i] : null; return h ? norm(h.innerText) : ""; };
    let n = 0, ok = 0; const seen = new Set();
    for (const el of docTargets().slice(0, 40)) {
      const head = colHead(el);
      const ctx = norm((el.closest("tr,li,.row,.card") || el).innerText || "");
      const sec = norm((el.closest("table,section,fieldset,.panel,.card,.tab-pane") || document.body).innerText || "").slice(0, 200);
      const kind = (CATS.find(([rx]) => head.includes(rx)) || CATS.find(([rx]) => ctx.includes(rx)) || CATS.find(([rx]) => sec.includes(rx)) || [0, "eggrafo"])[1];
      n++; say(`Έγγραφο ${n}…`);
      const href = el.getAttribute("href") || "";
      if (href && !/^javascript:|^#/i.test(href)) {
        // σελίδα με λίστα σαρώσεων (showScans): τη διαβάζουμε και παίρνουμε κάθε PDF της
        // ΠΟΤΕ κλικ σε κανονικό σύνδεσμο εδώ: θα έφευγε η σελίδα του ακινήτου στη μέση της δουλειάς
        ok += await grabPage(new URL(href, location.href).href, { kaek: k.kaek, kind, n }, seen);
        continue;
      }
      if (await grab(el, { kaek: k.kaek, kind, n })) ok++;
    }
    if (ok) got.push(ok + " έγγρ.");
    JOB.done[k.kaek] = got.join(", ") || "—";
    JOB.i++; JOB.step = "search"; JOB.handoff = 0; await save();
    // καρτέλα που άνοιξε το site για το ακίνητο: κλείνει και η εργασία συνεχίζει στην αρχική καρτέλα
    if (window.opener || HANDOFF_TAB) { await send({ type: "resume" }); await sleep(400); try { window.close(); } catch (e) {} return { next: false, closed: true }; }
    return { next: true, doneOne: true };
  }

  async function loop() {
    while (RUN && JOB) {
      if (JOB.i >= JOB.kaeks.length) {
        RUN = false;
        render("✓ Τελείωσε. Άνοιξε καρτέλα «Φάκελος ZIP»: έλεγξε τα ονόματα και πάτα «Αποθήκευση ZIP». (Αν την έκλεισες, πάτα «Φάκελος ZIP» εδώ.)");
        if (!JOB.finished) { JOB.finished = true; await save(); send({ type: "finish" }); }
        return;
      }
      if (isLogin()) { render("Συνδέσου με τους κωδικούς ΤΕΕ σε αυτή τη σελίδα. Μετά τη σύνδεση η εργασία συνεχίζει μόνη της.", true); RUN = false; return; }
      const k = JOB.kaeks[JOB.i];
      JOB.lastRun = Date.now();
      render(`ΚΑΕΚ ${k.kaek}: ${JOB.step === "search" ? "αναζήτηση" : JOB.step === "result" ? "επιλογή αποτελέσματος" : "λήψη αρχείων"}…`);
      let r;
      try { r = JOB.step === "search" ? await stepSearch(k) : JOB.step === "result" ? await stepResult(k) : await stepProperty(k); }
      catch (e) { r = { wait: "Σφάλμα: " + e.message }; }
      if (r.handoff) { RUN = false; render("Το ακίνητο άνοιξε σε νέα καρτέλα — η εργασία συνεχίζει εκεί και επιστρέφει εδώ για το επόμενο ΚΑΕΚ."); return; }
      if (r.wait) { RUN = false; render(r.wait, true); return; }
      if (r.closed) { RUN = false; return; }
      if (r.doneOne && !AUTO) { RUN = false; render("✓ " + k.kaek + " ολοκληρώθηκε."); return; }
      await sleep(600);
    }
  }

  async function diagnose() {
    const txt = JSON.stringify(structure(), null, 1);
    try { await navigator.clipboard.writeText(txt); say("Η δομή της σελίδας αντιγράφηκε — επικόλλησέ τη στο Claude. Δεν περιέχει ονόματα ή στοιχεία ιδιοκτητών."); }
    catch (e) { const w = window.open("", "_blank"); if (w) { w.document.body.innerText = txt; } }
  }

  /* ---------- εκκίνηση ---------- */
  (async () => {
    JOB = await send({ type: "getJob" });
    if (!JOB) return;
    if (isLogin()) { render("Συνδέσου με τους κωδικούς ΤΕΕ σε αυτή τη σελίδα. Μετά τη σύνδεση πάτα «▶ Αυτόματα όλα». (Αν το ΤΕΕ βγάλει «Invalid state»: κλείσε τις άλλες καρτέλες Κτηματολογίου/ΤΕΕ και ξεκίνα πάλι — μην πατάς «Πίσω» ή ανανέωση στη σελίδα του ΤΕΕ.)", true); return; }
    render("Έτοιμο. Πάτα «▶ Αυτόματα όλα» για όλα τα ΚΑΕΚ ή «Μόνο το τρέχον».");
    RUN = !!JOB.running; AUTO = JOB.auto !== false;
    // αν το site άνοιξε το ακίνητο σε ΝΕΑ καρτέλα, η εργασία συνεχίζει εδώ
    if (!RUN && JOB.i < JOB.kaeks.length && JOB.step === "property" && Date.now() - (JOB.handoff || 0) < 120000) {
      let ok = !!findClickable(/ΑΠΟΣΠΑΣΜΑ ΠΕΡΙΓΡΑΦΙΚΗΣ/);
      for (let t = 0; t < 10 && !ok; t++) { await sleep(500); ok = !!findClickable(/ΑΠΟΣΠΑΣΜΑ ΠΕΡΙΓΡΑΦΙΚΗΣ/); }
      if (ok) { RUN = true; AUTO = JOB.auto !== false; HANDOFF_TAB = true; }
    }
    // δομή κάθε σελίδας για διάγνωση (χωρίς ονόματα) — μπαίνει στο ZIP μόνο αν κάτι λείπει
    try { send({ type: "diag", kaek: location.pathname + " · " + (JOB.step || ""), d: structure() }); } catch (e) {}
    if (RUN) loop();
  })();
  window.addEventListener("beforeunload", () => { if (JOB) { JOB.running = RUN; JOB.auto = AUTO; chrome.runtime.sendMessage({ type: "setJob", job: JOB }); } });
})();
