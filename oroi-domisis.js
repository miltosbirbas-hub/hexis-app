/* =====================================================================
   HEXIS Νομοθεσία — ταμπέλα «ΟΡΟΙ ΔΟΜΗΣΗΣ» (v1)
   ΚΑΕΚ ή κλικ στον χάρτη → γεωτεμάχιο (γεωπύλη Κτηματολογίου / βάση HEXIS)
   → πολεοδομικά στοιχεία από τον Ενιαίο Ψηφιακό Χάρτη (ΤΕΕ/ΥΠΕΝ, μέσω oroi-domisis)
   → όροι δόμησης, μέγιστη δόμηση και Σ.Α.Ο.
   Ενημερωτικό εργαλείο — ΔΕΝ υποκαθιστά βεβαίωση/έλεγχο της ΥΔΟΜ.
===================================================================== */
(function(){
"use strict";
const FN_URL   = "https://oucqqudfdimccgowvpqp.supabase.co/functions/v1/oroi-domisis";
const KAEK_GEO = "https://oucqqudfdimccgowvpqp.supabase.co/functions/v1/kaek-geo";
const KT_LIVE  = "https://services-eu1.arcgis.com/40tFGWzosjaLJpmn/arcgis/rest/services/GEOTEMAXIA_LEITOURGOUN_ON_gdb/FeatureServer/0/query";
const UDM_EXPORT = "https://sdigmap.tee.gov.gr/mapping/rest/services/UDM/UDM_SERVICE_POLEODOMIKI_PLIROFORIA/MapServer/export";
const SDM_PUBLIC = "https://sdigmap.tee.gov.gr/sdmquery/public/";
const LS_KEY = "hexis_oroi_last_v1";
const CDN = {
  lcss: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
  ljs:  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js",
  proj: "https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.11.0/proj4.js"
};
const esc = s => (s==null?"":String(s)).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = (n, d=2) => (n==null || !isFinite(n)) ? "—" : Number(n).toLocaleString("el-GR",{minimumFractionDigits:d, maximumFractionDigits:d});
const fmt0 = n => fmt(n, 0);

/* ---------- βιβλιοθήκες (μόνο όταν ανοίξει η ταμπέλα) ---------- */
let libsP = null;
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=()=>rej(new Error("load "+src)); document.head.appendChild(s); }); }
function ensureLibs(){
  if(libsP) return libsP;
  libsP = (async()=>{
    if(!document.querySelector('link[data-oroi-leaflet]')){
      const l=document.createElement("link"); l.rel="stylesheet"; l.href=CDN.lcss; l.setAttribute("data-oroi-leaflet","1"); document.head.appendChild(l);
    }
    if(typeof L === "undefined") await loadScript(CDN.ljs);
    if(typeof proj4 === "undefined") await loadScript(CDN.proj);
    proj4.defs("EPSG:2100","+proj=tmerc +lat_0=0 +lon_0=24 +k=0.9996 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=-199.87,74.79,246.62,0,0,0,0 +units=m +no_defs");
  })();
  libsP.catch(()=>{ libsP=null; });
  return libsP;
}
const toEgsa = (lon,lat)=> proj4("EPSG:4326","EPSG:2100",[lon,lat]);
const toWgs  = (x,y)=> proj4("EPSG:2100","EPSG:4326",[x,y]);

/* ---------- γεωμετρία ---------- */
const sarea = r => { let a=0; for(let i=0;i<r.length;i++){ const p=r[i], q=r[(i+1)%r.length]; a+=p[0]*q[1]-q[0]*p[1]; } return a/2; };
function pip(pt, ring){ let ins=false; for(let i=0,j=ring.length-1;i<ring.length;j=i++){ const [xi,yi]=ring[i],[xj,yj]=ring[j]; if(((yi>pt[1])!==(yj>pt[1]))&&(pt[0]<(xj-xi)*(pt[1]-yi)/(yj-yi)+xi)) ins=!ins; } return ins; }
function openRing(r){ const q=r.map(p=>[p[0],p[1]]); if(q.length>1 && q[0][0]===q[q.length-1][0] && q[0][1]===q[q.length-1][1]) q.pop(); return q; }
function polysOf(g){ return !g ? [] : g.type==="Polygon" ? [g.coordinates] : g.type==="MultiPolygon" ? g.coordinates : []; }
function geomArea(g){ let a=0; polysOf(g).forEach(p=>p.forEach((r,i)=>{ const s=Math.abs(sarea(openRing(r))); a += i ? -s : s; })); return a; }
function mainOuter(g){ let best=null, ba=-1; polysOf(g).forEach(p=>{ const r=openRing(p[0]); const a=Math.abs(sarea(r)); if(a>ba){ ba=a; best={outer:r, holes:p.slice(1).map(openRing)}; } }); return best; }
function insidePoly(pt, poly){ return pip(pt, poly.outer) && !poly.holes.some(h=>pip(pt,h)); }
/* εσωτερικό σημείο: κεντροειδές αν είναι μέσα, αλλιώς το πιο «βαθύ» σημείο πλέγματος */
function interiorPoint(poly){
  const r = poly.outer; let cx=0, cy=0, A=0;
  for(let i=0;i<r.length;i++){ const p=r[i], q=r[(i+1)%r.length], f=p[0]*q[1]-q[0]*p[1]; A+=f; cx+=(p[0]+q[0])*f; cy+=(p[1]+q[1])*f; }
  if(A){ cx/=3*A; cy/=3*A; if(insidePoly([cx,cy],poly)) return [cx,cy]; }
  let b=[Infinity,Infinity,-Infinity,-Infinity]; r.forEach(([x,y])=>{ b[0]=Math.min(b[0],x); b[1]=Math.min(b[1],y); b[2]=Math.max(b[2],x); b[3]=Math.max(b[3],y); });
  let best=null, bd=-1;
  for(let i=1;i<24;i++) for(let j=1;j<24;j++){
    const p=[b[0]+(b[2]-b[0])*i/24, b[1]+(b[3]-b[1])*j/24]; if(!insidePoly(p,poly)) continue;
    let d=Infinity; for(let k=0;k<r.length;k++){ d=Math.min(d, segDist(p, r[k], r[(k+1)%r.length])); }
    if(d>bd){ bd=d; best=p; }
  }
  return best || r[0];
}
function segDist(p,a,b){ const dx=b[0]-a[0], dy=b[1]-a[1], L2=dx*dx+dy*dy; if(!L2) return Math.hypot(p[0]-a[0],p[1]-a[1]); let t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L2; t=Math.max(0,Math.min(1,t)); return Math.hypot(p[0]-(a[0]+t*dx), p[1]-(a[1]+t*dy)); }
const isEK = k => /[ΕΚEK]/.test(String(k).slice(4,8)) && /[^0-9]/.test(String(k));
/* πρόσωπο σε κοινόχρηστο: μήκος περιγράμματος που εφάπτεται σε γεωτεμάχια ΕΚ (δρόμοι, πλατείες κ.λπ.) */
function frontageOnEK(poly, neighbors){
  const ek = (neighbors||[]).filter(n=> isEK(n.kaek) && n.geometry_egsa);
  if(!ek.length) return {len:0, ek:0};
  const ekEdges = [];
  ek.forEach(n=> polysOf(n.geometry_egsa).forEach(p=>p.forEach(rr=>{ const r=openRing(rr); for(let i=0;i<r.length;i++) ekEdges.push([r[i], r[(i+1)%r.length]]); })));
  const TOL = 0.6, STEP = 0.5; let len = 0;
  const r = poly.outer;
  for(let i=0;i<r.length;i++){
    const a=r[i], b=r[(i+1)%r.length], L=Math.hypot(b[0]-a[0], b[1]-a[1]); if(!L) continue;
    const n = Math.max(1, Math.ceil(L/STEP));
    for(let k=0;k<n;k++){
      const t=(k+0.5)/n, p=[a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t];
      if(ekEdges.some(e=> segDist(p,e[0],e[1]) <= TOL)) len += L/n;
    }
  }
  return {len, ek:ek.length};
}

/* ---------- Κτηματολόγιο: ζωντανά, αλλιώς βάση HEXIS ---------- */
function ktParse(j){
  if(j && j.error) throw new Error("ArcGIS: " + (j.error.message || j.error.code));
  const out=[], seen={};
  ((j&&j.features)||[]).forEach(f=>{
    const at=f.attributes||{}, kaek=at.KAEK||at.kaek||""; const rings=(f.geometry&&f.geometry.rings)||[];
    if(!kaek || !rings.length || seen[kaek]) return;
    let outers=[], holes=[];
    rings.forEach(r=>{ const rr=openRing(r); if(rr.length<3) return; (sarea(rr)<0?outers:holes).push(rr); });
    if(!outers.length && holes.length){ outers=holes; holes=[]; }
    if(!outers.length) return;
    const polys=outers.map(o=>({outer:o,holes:[]}));
    holes.forEach(h=>{ (polys.find(p=>pip(h[0],p.outer))||polys[0]).holes.push(h); });
    const close = r=> r.concat([r[0]]);
    const g = polys.length===1 ? {type:"Polygon", coordinates:[close(polys[0].outer)].concat(polys[0].holes.map(close))}
                               : {type:"MultiPolygon", coordinates: polys.map(p=>[close(p.outer)].concat(p.holes.map(close)))};
    seen[kaek]=1; out.push({kaek:String(kaek), geometry_egsa:g, area_m2:geomArea(g)});
  });
  return out;
}
async function ktQuery(params, timeout){
  const qs = Object.entries(Object.assign({f:"json", inSR:"2100", outSR:"2100", outFields:"KAEK", returnGeometry:"true", spatialRel:"esriSpatialRelIntersects"}, params))
    .map(([k,v])=>k+"="+encodeURIComponent(v)).join("&");
  const ctl=new AbortController(), to=setTimeout(()=>ctl.abort(), timeout||20000);
  try{ const r=await fetch(KT_LIVE+"?"+qs,{signal:ctl.signal}); if(!r.ok) throw new Error("HTTP "+r.status); return ktParse(await r.json()); }
  finally{ clearTimeout(to); }
}
async function parcelLive(q){
  let hits;
  if(q.kaek) hits = await ktQuery({where:"KAEK='"+String(q.kaek).replace(/'/g,"''")+"'", resultRecordCount:5});
  else {
    const [x,y]=toEgsa(q.lon,q.lat);
    hits = await ktQuery({where:"1=1", geometry:x.toFixed(3)+","+y.toFixed(3), geometryType:"esriGeometryPoint", resultRecordCount:20});
    hits.sort((a,b)=> (isEK(a.kaek)-isEK(b.kaek)) || (a.area_m2-b.area_m2));
  }
  if(!hits.length) return null;
  const main=hits[0], po=mainOuter(main.geometry_egsa);
  let b=[Infinity,Infinity,-Infinity,-Infinity]; po.outer.forEach(([x,y])=>{ b[0]=Math.min(b[0],x); b[1]=Math.min(b[1],y); b[2]=Math.max(b[2],x); b[3]=Math.max(b[3],y); });
  let neighbors=[];
  try{
    const env=[b[0]-30,b[1]-30,b[2]+30,b[3]+30].map(v=>v.toFixed(2)).join(",");
    neighbors=(await ktQuery({where:"1=1", geometry:env, geometryType:"esriGeometryEnvelope", resultRecordCount:600})).filter(n=>n.kaek!==main.kaek);
  }catch(e){}
  return Object.assign({}, main, {neighbors, src:"γεωπύλη Κτηματολογίου (ζωντανά)"});
}
async function parcelHexis(q){
  const qs = q.kaek ? "kaek="+encodeURIComponent(q.kaek) : "lat="+q.lat.toFixed(7)+"&lon="+q.lon.toFixed(7);
  const r = await fetch(KAEK_GEO+"?"+qs+"&neighbors=1&r=60");
  if(!r.ok) return null;
  const d = await r.json().catch(()=>null);
  const m = d && (d.main || d); if(!m || !m.geometry_egsa) return null;
  return {kaek:m.kaek, geometry_egsa:m.geometry_egsa, area_m2:m.area_m2 || geomArea(m.geometry_egsa), neighbors:(d.neighbors||[]), src:"βάση ΚΑΕΚ HEXIS"};
}
async function getParcel(q){
  try{ const p = await parcelLive(q); if(p) return p; }catch(e){ console.warn("[Όροι] ΚΤ live:", e); }
  try{ return await parcelHexis(q); }catch(e){ console.warn("[Όροι] kaek-geo:", e); return null; }
}

/* ---------- πολεοδομικά από ΕΨΧ ---------- */
function authToken(){
  try{ const raw=localStorage.getItem("sb-oucqqudfdimccgowvpqp-auth-token"); if(!raw) return ""; const s=JSON.parse(raw); return s.access_token || (s.currentSession && s.currentSession.access_token) || ""; }catch(e){ return ""; }
}
async function getPlanning(x, y, ring){
  const tok = authToken();
  const r = await fetch(FN_URL, {method:"POST", headers:{"Content-Type":"application/json", ...(tok?{Authorization:"Bearer "+tok}:{})},
    body: JSON.stringify({x, y, ring: ring && ring.length<=1500 ? ring.map(p=>[+p[0].toFixed(2), +p[1].toFixed(2)]) : undefined})});
  const j = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error==="login" ? "login" : (j.error || ("HTTP "+r.status)));
  return j;
}

/* ---------- ερμηνεία ---------- */
const first = (L,k)=> (L[k] && L[k][0]) || null;
function fekLink(a){
  if(!a || !a.FEK) return "";
  const t = esc("ΦΕΚ "+a.FEK);
  return a.FEK_FILE_URL && /^https:\/\/sdigmap\.tee\.gov\.gr\//.test(a.FEK_FILE_URL)
    ? ` <a class="od-fek" href="${esc(a.FEK_FILE_URL)}" target="_blank" rel="noopener">📄 ${t}</a>` : ` <span class="od-fek">${t}</span>`;
}
/* Ο ΣΔ/οι όροι προέρχονται από το καθεστώς οικισμών <2.000 κατ. (π.δ. 24.4.1985 κ.ε.); */
function smallSettlementRegime(L){
  const recs = [].concat(L.sd||[], L.kalypsi||[], L.ypsos||[], L.artiotita||[]);
  return recs.some(a=> /μέχρι\s*2[.\s]?000\s*κατ/i.test(a.TITLE||"") ||
                      (/240\s*τ\.?μ/i.test(a.SD_COMMENT||"") && /400\s*τ\.?μ/i.test(a.SD_COMMENT||"")));
}
/* Κατάταξη. Προτεραιότητα: Ο.Τ. εγκεκριμένου σχεδίου → όριο οικισμού / καθεστώς οικισμών → άλλη πράξη σχεδίου → εκτός.
   Μια «πράξη σχεδίου» χωρίς Ο.Τ. ΔΕΝ αρκεί για «εντός σχεδίου» όταν υπάρχει όριο οικισμού. */
function statusOf(L, manual){
  if(manual && manual!=="auto") return manual;
  if(L.ot) return "sxedio";
  if(L.oikismos || smallSettlementRegime(L)) return "oikismos";
  const sx = L.sxedio || [];
  const rym = sx.some(a=> !/ΟΡΙΩΝ ΟΙΚΙΣΜ|ΟΡΙΟΘΕΤΗΣ|ΓΠΣ|ΣΧΟΟΑΠ|ΖΟΕ|ΖΩΝΗΣ ΟΙΚΙΣΤΙΚΟΥ/i.test(a.APOF_THEME||"") && /ΡΥΜΟΤΟΜ|ΠΟΛΕΟΔΟΜΙΚ|ΣΧΕΔΙΟΥ ΠΟΛΕ|ΕΠΕΚΤΑΣ/i.test((a.APOF_THEME||"")+" "+(a.TITLE||"")));
  if(rym) return "sxedio";
  if(L.ektos) return "ektos";
  return "ektos?";
}
const STATUS_LABEL = {
  sxedio:"Εντός εγκεκριμένου σχεδίου", oikismos:"Εντός ορίων οικισμού (<2.000 κατ.)",
  ektos:"Εκτός σχεδίου", "ektos?":"Δεν βρέθηκε σχέδιο ή όριο οικισμού — πιθανώς εκτός σχεδίου"
};
/* Σ.Α.Ο. οικισμών <2.000 κατ.: έως 200 τ.μ. ΣΔ 1 · <700 τ.μ. μέγιστο 240 τ.μ. · ≥700 τ.μ. μέγιστο 400 τ.μ. */
function oikismosMax(E){
  if(!(E>0)) return null;
  if(E <= 200) return {max:E,   rule:"γήπεδο έως 200 τ.μ. → ΣΔ 1 (δόμηση = εμβαδόν)"};
  if(E < 700)  return {max:240, rule:"γήπεδο έως 699,99 τ.μ. → μέγιστη δόμηση 240 τ.μ. (+ πατάρι ξηράς δόμησης έως 40 τ.μ.)"};
  return {max:400, rule:"γήπεδο από 700 τ.μ. → μέγιστη δόμηση 400 τ.μ."};
}
/* Ενιαίος υπολογισμός (καθαρή συνάρτηση — ελέγχεται με τεστ) */
function computeCalc(st, E, L){
  const kal = first(L,"kalypsi"), sd = L.sd || [];
  if(st==="oikismos"){
    const m = oikismosMax(E); if(!m) return null;
    const kP = num(kal && kal.SYNT_KALYPSIS) || 60, k = E < 200 ? Math.max(kP, 70) : kP;
    return {kind:"oikismos", max:m.max, sao:m.max/E, rule:m.rule, kalPct:k, kalM2:k*E/100};
  }
  if(st==="sxedio"){
    const s0 = sd.find(a=> num(a.SD_TIMH)!=null);
    const kv = num(kal && kal.SYNT_KALYPSIS);
    if(!s0) return {kind:"sxedio", max:null, kalPct:kv, kalM2: kv!=null ? kv*E/100 : null};
    // Μέσος ΣΔ τομέα ΓΠΣ: δεν είναι ΣΔ οικοπέδου — δεν βγάζουμε μέγιστη δόμηση
    if(/Μέσος/i.test(s0.SD_COMMENT||"")) return {kind:"sxedio", max:null, msd:num(s0.SD_TIMH), kalPct:kv, kalM2: kv!=null ? kv*E/100 : null};
    const v = num(s0.SD_TIMH); let mx = v*E, rule = `ΣΔ ${fmt(v,2)} × ${fmt(E)} τ.μ.`;
    // ασφάλεια: ΣΔ με όρια οικισμού <2.000 κατ. → εφαρμόζονται τα όρια 200/240/400 τ.μ.
    if(smallSettlementRegime(L)){ const m = oikismosMax(E); if(m && m.max < mx){ mx = m.max; rule = m.rule + " (όριο οικισμού <2.000 κατ.)"; } }
    return {kind:"sxedio", max:mx, sao:mx/E, rule, sd:s0, kalPct:kv, kalM2: kv!=null ? kv*E/100 : null};
  }
  const k = ektosKatoikia(E);
  return {kind:"ektos", kalPct:10, kalM2:0.10*E, max: k ? k.max : null, sao: k ? k.max/E : null, rule: k ? k.rule : null};
}
/* εκτός σχεδίου, κατοικία (άρ.256 ν.5306/2026 — ίδιος κανόνας με το OROIDOM) */
function ektosKatoikia(E){
  if(!(E >= 4000)) return null;
  if(E <= 8000) return {max:186 + (E-4000)*0.018, rule:"κατοικία, Ε 4.000–8.000 τ.μ.: 186 + (Ε−4.000)×0,018 τ.μ."};
  return {max:Math.min(360, 258 + (E-8000)*0.009), rule:"κατοικία, Ε > 8.000 τ.μ.: 258 + (Ε−8.000)×0,009 τ.μ., μέγιστο 360 τ.μ."};
}
function num(v){ const n = typeof v==="number" ? v : parseFloat(String(v||"").replace(",",".")); return isFinite(n) ? n : null; }

/* ---------- κατάσταση ---------- */
const S = { map:null, parcelLayer:null, udmOverlay:null, udmOn:true, parcel:null, plan:null, manual:"auto", frontManual:null, busy:false, msg:"", err:"" };

function cardRow(label, value, sub){ return `<div class="od-row"><div class="od-l">${label}</div><div class="od-v">${value}${sub?`<div class="od-sub">${sub}</div>`:""}</div></div>`; }
function textBlock(t){ if(!t) return ""; t=String(t).trim(); if(t.length<=140) return `<div class="od-txt">${esc(t)}</div>`;
  return `<details class="od-more"><summary>Λεπτομέρειες από το ΦΕΚ</summary><div class="od-txt">${esc(t)}</div></details>`; }

function renderResults(){
  const box = document.getElementById("od-res"); if(!box) return;
  if(S.busy){ box.innerHTML = `<div class="od-busy"><span class="dot"></span><span class="dot"></span><span class="dot"></span> ${esc(S.msg||"Αναζήτηση…")}</div>`; return; }
  if(S.err){ box.innerHTML = `<div class="od-err">${S.err}</div>`; return; }
  if(!S.parcel){ box.innerHTML = `<div class="od-hint">Γράψε <b>ΚΑΕΚ</b> ή πάτα πάνω στον χάρτη για να επιλέξεις γεωτεμάχιο.</div>`; return; }
  const P = S.parcel, E = P.area_m2, L = (S.plan && S.plan.layers) || {}, T = (S.plan && S.plan.touches) || {};
  const st = statusOf(L, S.manual);
  const front = S.frontManual!=null ? S.frontManual : P.front;
  let h = "";

  /* 1. Γεωτεμάχιο */
  h += `<div class="od-card"><div class="od-h">Γεωτεμάχιο</div>`;
  h += cardRow("ΚΑΕΚ", `<b>${esc(P.kaek||"—")}</b>`, esc(P.src||""));
  h += cardRow("Εμβαδόν", `<b>${fmt(E)} τ.μ.</b>`, "από το πολύγωνο του Κτηματολογίου (ΕΓΣΑ΄87)");
  h += cardRow("Πρόσωπο σε κοινόχρηστο",
    `<input id="od-front" class="od-inp" type="number" min="0" step="0.01" value="${front!=null?(+front).toFixed(2):""}"> μ.`,
    S.frontManual!=null ? "τιμή που έδωσες" : (P.frontEK ? `εκτίμηση από τα όμορα γεωτεμάχια ΕΚ (${P.frontEK}) — διόρθωσέ το αν χρειάζεται` : "δεν βρέθηκε όμορο ΕΚ — συμπλήρωσέ το"));
  h += `</div>`;

  const hTop = h; h = "";
  /* 2. Καθεστώς */
  const oik = first(L,"oikismos"), ot = first(L,"ot"), sx = L.sxedio || [];
  h += `<div class="od-card"><div class="od-h">Πολεοδομικό καθεστώς</div>`;
  h += cardRow("Κατάταξη", `<b>${esc(STATUS_LABEL[st]||st)}</b>`,
    `<select id="od-manual" class="od-sel"><option value="auto"${S.manual==="auto"?" selected":""}>Αυτόματα (από τον Ενιαίο Ψηφιακό Χάρτη)</option><option value="sxedio"${S.manual==="sxedio"?" selected":""}>Εντός σχεδίου</option><option value="oikismos"${S.manual==="oikismos"?" selected":""}>Οικισμός &lt;2.000 κατ.</option><option value="ektos"${S.manual==="ektos"?" selected":""}>Εκτός σχεδίου</option></select>`);
  if(oik) h += cardRow("Οικισμός", `${esc(oik.NAME||"—")}${oik.KALL_DHM_NAME?` · Δ. ${esc(oik.KALL_DHM_NAME)}`:""}`, esc(oik.TITLE||"") + fekLink(oik));
  if(ot)  h += cardRow("Ο.Τ.", `<b>${esc(ot.OT_NUM||"—")}</b>${ot.KALL_DHM_NAME?` · Δ. ${esc(ot.KALL_DHM_NAME)}`:""}`, esc(ot.TITLE||"") + fekLink(ot));
  sx.slice(0,4).forEach(a=> h += cardRow("Πράξη", esc(a.APOF_THEME||a.APOF_EIDOS||""), esc(a.TITLE||"") + fekLink(a)));
  const gps = first(L,"xriseis_gps") || first(L,"xriseis_ers");
  if(gps) h += cardRow("Χρήση γης", `<b>${esc(gps.GEN_XRHSH_GPS || gps.GEN_XRHSH || gps.EID_XRHSH_TXT || gps.XRHSH || "—")}</b>`, esc(gps.TITLE||"") + fekLink(gps));
  const zoe = first(L,"zoe"); if(zoe) h += cardRow("ΖΟΕ", esc(zoe.ZONE_NAME || zoe.NAME || zoe.TITLE || "εντός ΖΟΕ"), fekLink(zoe));
  const pdp = first(L,"pd_prost"); if(pdp) h += cardRow("ΠΔ προστασίας", esc(pdp.ZONE_NAME || pdp.NAME || pdp.TITLE || "εντός ζώνης"), fekLink(pdp));
  if(L.archaiol) h += cardRow("⚠ Αρχαιολογική ζώνη", "Ναι", fekLink(first(L,"archaiol")));
  if(L.apallotr) h += cardRow("⚠ Ζώνη απαλλοτρίωσης", "Ναι", fekLink(first(L,"apallotr")));
  if(L.koinox)   h += cardRow("⚠ Κοινόχρηστος/κοινωφελής χώρος", esc(first(L,"koinox").EID_XRHSH_TXT||"Ναι"), fekLink(first(L,"koinox")));
  if(L.rema)     h += cardRow("⚠ Ρέμα ιδιαίτ. ενδιαφέροντος", "Ναι", fekLink(first(L,"rema")));
  const tk = Object.keys(T).filter(k=>["oikismos","ot","ektos","sd","zoe","apallotr","koinox"].includes(k));
  if(tk.length) h += `<div class="od-warn">⚠ Το γεωτεμάχιο φαίνεται να τέμνει και άλλη ζώνη/όριο (${tk.map(k=>({oikismos:"όριο οικισμού",ot:"Ο.Τ.",ektos:"εκτός σχεδίου",sd:"ζώνη ΣΔ",zoe:"ΖΟΕ",apallotr:"απαλλοτρίωση",koinox:"κοινόχρηστο"}[k])).join(", ")}). Έλεγξε τη θέση του στα διαγράμματα.</div>`;
  h += `</div>`;

  /* 3. Όροι δόμησης */
  const sd = L.sd || [], kal = first(L,"kalypsi"), yp = first(L,"ypsos"), ar = L.artiotita || [], sy = first(L,"systima");
  h += `<div class="od-card"><div class="od-h">Όροι δόμησης</div>`;
  let anyOroi = false;
  sd.slice(0,3).forEach(a=>{ anyOroi=true; h += cardRow("Συντελεστής δόμησης", `<b>${a.SD_TIMH!=null?esc(fmt(a.SD_TIMH,2)):"—"}</b>${a.SD_KLIMAKOTOS==="ΝΑΙ"?" (κλιμακωτός)":""}${a.SD_TOMEAS?` · ${esc(a.SD_TOMEAS)}`:""}`, fekLink(a) + textBlock(a.SD_COMMENT)); });
  if(kal){ anyOroi=true; h += cardRow("Κάλυψη", `<b>${kal.SYNT_KALYPSIS!=null?esc(fmt(kal.SYNT_KALYPSIS,0))+"%":"—"}</b>`, fekLink(kal) + textBlock(kal.REMARKS || kal.SYNTHIKI_TXT)); }
  if(yp){ anyOroi=true; h += cardRow("Ύψος / όροφοι", `<b>${yp.MAX_HEIGHT_M!=null?esc(fmt(yp.MAX_HEIGHT_M,2))+" μ.":""}${yp.MAX_OROFOI!=null?` · ${esc(yp.MAX_OROFOI)} όροφοι`:""}${(yp.MAX_HEIGHT_M==null && yp.MAX_OROFOI==null)?"βλ. σχόλιο":""}</b>`, fekLink(yp) + textBlock(yp.OROR_MAX_HEIGHT_COMMENT || yp.REMARKS)); }
  ar.slice(0,3).forEach(a=>{ anyOroi=true; h += cardRow("Αρτιότητα" + (a.OROS_TYPE?` <span class="od-tag">${esc(a.OROS_TYPE.toLowerCase())}</span>`:""), `<b>${a.ELAX_EMBADO_M2!=null?esc(fmt0(a.ELAX_EMBADO_M2))+" τ.μ.":"—"}${a.ELAX_PROSOP_M!=null?` · πρόσωπο ${esc(fmt(a.ELAX_PROSOP_M,1))} μ.`:""}</b>${a.DATE_PAREKLISIS?` · έως ${esc(a.DATE_PAREKLISIS)}`:""}`, fekLink(a) + textBlock([a.SYNTHIKI_TXT, a.REMARKS].filter(Boolean).join("\n"))); });
  if(sy){ anyOroi=true; h += cardRow("Οικοδομικό σύστημα", `<b>${esc(sy.OIK_SYSTHMA||"—")}</b>`, fekLink(sy) + textBlock([sy.SYNTHIKI_TXT, sy.OROIKS_COMMENT].filter(Boolean).join("\n"))); }
  if(!anyOroi && st!=="ektos" && st!=="ektos?") h += `<div class="od-warn">Ο Ενιαίος Ψηφιακός Χάρτης δεν έχει ψηφιοποιημένους όρους για αυτό το σημείο. Δες τα ΦΕΚ της ενότητας «Πολεοδομικό καθεστώς» ή ρώτα την ΥΔΟΜ.</div>`;
  if(st==="ektos" || st==="ektos?"){
    h += cardRow("Κανόνας (Κώδικας 5306/2026, άρθ. 251)", "<b>Αρτιότητα 4.000 τ.μ. & πρόσωπο 25 μ.</b>", "Κάλυψη 10% · 2 όροφοι · ύψος 7,50 μ. (+1,20 μ. με κεκλιμένη στέγη) · αποστάσεις 15 μ. από τα όρια (7,50 μ. πλάγιες για κατοικία σε γήπεδα της 15.4.1981, πλάτος ≤10 μ.). Αν η περιοχή έχει ΓΠΣ/ΣΧΟΟΑΠ/ΖΟΕ με δικούς της όρους, ισχύουν εκείνοι.");
  }
  h += `</div>`;

  const hMid = h; h = "";
  /* 4. Υπολογισμοί */
  h += `<div class="od-card od-calc"><div class="od-h">Υπολογισμός για αυτό το γεωτεμάχιο</div>`;
  const C = computeCalc(st, E, L);
  if(st==="oikismos"){
    h += cardRow("Μέγιστη δόμηση", `<b class="od-big">${fmt(C.max)} τ.μ.</b>`, esc(C.rule));
    h += cardRow("Σ.Α.Ο.", `<b class="od-big">${fmt(C.sao, 3)}</b>`, `${fmt(C.max)} ÷ ${fmt(E)} τ.μ. — Συντελεστής Αξιοποίησης Οικοπέδου = μέγιστη δόμηση ÷ εμβαδόν γηπέδου`);
    h += cardRow("Μέγιστη κάλυψη", `<b>${fmt(C.kalM2)} τ.μ.</b> (${fmt0(C.kalPct)}%)`, E<200 ? "γήπεδο < 200 τ.μ.: κάλυψη έως 70% για δόμηση έως 200 τ.μ." : "");
    const a0 = ar.find(a=>/ΚΑΝΟΝΑ/i.test(a.OROS_TYPE||"")) || ar[0];
    if(a0 && a0.ELAX_EMBADO_M2) h += cardRow("Έλεγχος αρτιότητας (κατά κανόνα)", artiCheck(E, front, a0.ELAX_EMBADO_M2, a0.ELAX_PROSOP_M), "οι παρεκκλίσεις (π.χ. γήπεδα της 3.5.1985) φαίνονται στους όρους πιο πάνω");
  } else if(st==="sxedio"){
    if(C.max!=null){
      const s0 = C.sd;
      h += cardRow("Μέγιστη δόμηση", `<b class="od-big">${fmt(C.max)} τ.μ.</b>`, esc(C.rule) + (s0.SD_KLIMAKOTOS==="ΝΑΙ" ? " — ο ΣΔ είναι κλιμακωτός: δες το σχόλιο" : "") + (/Μέσος/i.test(s0.SD_COMMENT||"") ? " — ⚠ πρόκειται για Μέσο ΣΔ τομέα (ΓΠΣ), όχι για ΣΔ οικοπέδου" : ""));
      h += cardRow("Σ.Α.Ο.", `<b class="od-big">${fmt(C.sao,3)}</b>`, `${fmt(C.max)} ÷ ${fmt(E)} τ.μ. — μέγιστη δόμηση ÷ εμβαδόν γηπέδου`);
    } else if(C.msd!=null) h += `<div class="od-warn">Ο Ενιαίος Ψηφιακός Χάρτης δίνει μόνο <b>Μέσο ΣΔ τομέα ΓΠΣ ${fmt(C.msd,2)}</b> — δεν είναι ΣΔ οικοπέδου. Ο ΣΔ του οικοπέδου προκύπτει από το ΦΕΚ του σχεδίου, γι' αυτό δεν υπολογίζεται μέγιστη δόμηση.</div>`;
    else h += `<div class="od-warn">Δεν υπάρχει αριθμητικός ΣΔ στον Ενιαίο Ψηφιακό Χάρτη για αυτό το σημείο — δες το ΦΕΚ του σχεδίου.</div>`;
    if(C.kalPct!=null) h += cardRow("Μέγιστη κάλυψη", `<b>${fmt(C.kalM2)} τ.μ.</b> (${fmt0(C.kalPct)}%)`, "");
    const a0 = ar.find(a=>/ΚΑΝΟΝΑ/i.test(a.OROS_TYPE||"")) || ar[0];
    if(a0 && a0.ELAX_EMBADO_M2) h += cardRow("Έλεγχος αρτιότητας (κατά κανόνα)", artiCheck(E, front, a0.ELAX_EMBADO_M2, a0.ELAX_PROSOP_M), "για παρεκκλίσεις δες τους όρους πιο πάνω");
  } else {
    h += cardRow("Έλεγχος αρτιότητας (κατά κανόνα)", artiCheck(E, front, 4000, 25), "πρόσωπο 45 μ. & βάθος 50 μ. όταν το πρόσωπο είναι σε διεθνή/εθνική/επαρχιακή/δημοτική/κοινοτική οδό · μεταβατικές παρεκκλίσεις άρθ. 273");
    if(C.max!=null){
      h += cardRow("Μέγιστη δόμηση κατοικίας", `<b class="od-big">${fmt(C.max)} τ.μ.</b>`, esc(C.rule) + " (άρ. 256)");
      h += cardRow("Σ.Α.Ο.", `<b class="od-big">${fmt(C.sao,3)}</b>`, `${fmt(C.max)} ÷ ${fmt(E)} τ.μ. — μέγιστη δόμηση ÷ εμβαδόν γηπέδου`);
    } else h += cardRow("Μέγιστη δόμηση κατοικίας", "<b>—</b>", "γήπεδο κάτω από 4.000 τ.μ.: μη άρτιο κατά κανόνα — έλεγξε τις μεταβατικές παρεκκλίσεις (άρ. 273)");
    h += cardRow("Μέγιστη κάλυψη", `<b>${fmt(C.kalM2)} τ.μ.</b> (10%)`, "");
    h += `<div class="od-txt">Για άλλες χρήσεις (τουριστικά, αγροτικά, βιομηχανικά κ.λπ.) ισχύουν διαφορετικοί όροι — άρθ. 252–263.</div>`;
  }
  h += `</div>`;

  h = hTop + h + hMid;
  /* 5. Ενέργειες */
  h += `<div class="od-actions">
    <a class="od-btn" href="${SDM_PUBLIC}" target="_blank" rel="noopener">Ενιαίος Ψηφιακός Χάρτης</a>
    <button type="button" class="od-btn od-primary" id="od-extract">Απόσπασμα σχεδίου (PDF / AutoCAD)</button>
    <button type="button" class="od-btn" id="od-print">PDF όρων</button>
    ${P.kaek && /^\d{12}$/.test(String(P.kaek)) ? `<a class="od-btn" href="fakelos.html?kaek=${encodeURIComponent(P.kaek)}&src=nomothesia" target="_blank" rel="noopener" title="Απόσπασμα, φύλλο, τίτλοι του ΚΑΕΚ και των όμορων από το Κτηματολόγιο — με τους κωδικούς σου ΤΕΕ, στο επίσημο site">Φάκελος Κτηματολογίου</a>` : ""}
  </div>
  <div class="od-note">ℹ️ Ενημερωτικά στοιχεία από τον <b>Ενιαίο Ψηφιακό Χάρτη</b> (ΤΕΕ/ΥΠΕΝ) και το Κτηματολόγιο. Δεν υποκαθιστούν τη βεβαίωση όρων δόμησης της ΥΔΟΜ ούτε τον έλεγχο του μηχανικού στα ΦΕΚ.${S.plan&&S.plan.t?` Ερώτημα: ${esc(new Date(S.plan.t).toLocaleString("el-GR"))}.`:""}</div>`;
  box.innerHTML = h;

  const fi = document.getElementById("od-front");
  if(fi) fi.addEventListener("change", ()=>{ const v=parseFloat(fi.value); S.frontManual = isFinite(v) ? v : null; renderResults(); });
  const ms = document.getElementById("od-manual");
  if(ms) ms.addEventListener("change", ()=>{ S.manual = ms.value; renderResults(); });
  const pb = document.getElementById("od-print"); if(pb) pb.addEventListener("click", printReport);
  const xb = document.getElementById("od-extract"); if(xb) xb.addEventListener("click", openExtract);
}
function artiCheck(E, front, minA, minF){
  const okA = E >= minA, okF = minF==null || (front!=null && front >= minF);
  const fTxt = minF==null ? "" : (front==null ? ` · πρόσωπο ≥ ${fmt(minF,1)} μ.: <b>συμπλήρωσε πρόσωπο</b>` : ` · πρόσωπο ${fmt(front,2)} / ${fmt(minF,1)} μ. ${okF?"✅":"❌"}`);
  return `<b>${okA && okF && front!=null ? "✅ Άρτιο κατά κανόνα" : (!okA ? "❌ Μη άρτιο κατά κανόνα" : "—")}</b><div class="od-sub">εμβαδόν ${fmt(E)} / ${fmt0(minA)} τ.μ. ${okA?"✅":"❌"}${fTxt}</div>`;
}
function printReport(){
  const box = document.getElementById("od-res"); if(!box) return;
  const w = window.open("", "_blank"); if(!w) return;
  const css = `body{font-family:Inter,Segoe UI,Roboto,sans-serif;color:#14213D;margin:14mm;font-size:12px}h1{font-size:17px;margin:0 0 4px}
  .od-card{border:1px solid #D5DEEC;border-radius:8px;padding:8px 10px;margin:8px 0;page-break-inside:avoid}.od-h{font-weight:700;margin-bottom:6px}
  .od-row{display:flex;gap:10px;padding:4px 0;border-top:1px solid #EEF2F8}.od-l{width:34%;color:#5B6B85}.od-v{flex:1}.od-sub{color:#5B6B85;font-size:11px}
  .od-txt{white-space:pre-wrap;font-size:11px;color:#25314D;margin-top:3px}.od-warn{color:#8A4B00;font-size:11.5px;margin:6px 0}
  .od-actions,select,input{display:none}details{display:block}summary{display:none}.od-note{font-size:10.5px;color:#5B6B85;margin-top:10px}a{color:#1F4E9C}`;
  const clone = box.cloneNode(true);
  clone.querySelectorAll("input#od-front").forEach(i=>{ const s=document.createElement("b"); s.textContent=(i.value||"—"); i.replaceWith(s); });
  clone.querySelectorAll("select").forEach(s=> s.remove());
  clone.querySelectorAll("details").forEach(d=> d.setAttribute("open",""));
  w.document.write(`<!doctype html><html lang="el"><head><meta charset="utf-8"><title>Όροι δόμησης ${esc(S.parcel&&S.parcel.kaek||"")}</title><style>${css}</style></head><body>
  <h1>HEXIS-APP · Όροι δόμησης</h1><div style="color:#5B6B85">ΚΑΕΚ ${esc(S.parcel&&S.parcel.kaek||"")} · ${esc(new Date().toLocaleDateString("el-GR"))}</div>${clone.innerHTML}</body></html>`);
  w.document.close(); setTimeout(()=>{ try{ w.focus(); w.print(); }catch(e){} }, 400);
}

/* ---------- απόσπασμα σχεδίου (φορτώνεται όταν ζητηθεί) ---------- */
let exportP = null;
async function openExtract(){
  const b = document.getElementById("od-extract"); if(b){ b.disabled = true; b.textContent = "Φόρτωση…"; }
  try{
    if(!window.HXOroiExport){
      exportP = exportP || new Promise((res,rej)=>{ const s=document.createElement("script"); s.src="oroi-export.js?v="+(typeof NOMO_VERSION!=="undefined"?NOMO_VERSION:""); s.onload=res; s.onerror=()=>{ exportP=null; rej(new Error("Δεν φορτώθηκε η εξαγωγή")); }; document.head.appendChild(s); });
      await exportP;
    }
    await window.HXOroiExport.open();
  }catch(e){ alert(e.message || e); }
  finally{ if(b){ b.disabled = false; b.textContent = "Απόσπασμα σχεδίου (PDF / AutoCAD)"; } }
}
function summary(){
  const L = (S.plan && S.plan.layers) || {}, st = statusOf(L, S.manual);
  const calc = [...document.querySelectorAll("#od-res .od-calc .od-row")].map(r=>[
    (r.querySelector(".od-l")||{}).textContent || "", ((r.querySelector(".od-v")||{}).innerText || "").replace(/\s*\n\s*/g," · ")]);
  return {status: STATUS_LABEL[st]||st, front: S.frontManual!=null ? S.frontManual : S.parcel && S.parcel.front, calc};
}
window.HXOroi = { polysOf, openRing, mainOuter, interiorPoint, _t:{ statusOf, oikismosMax, computeCalc, smallSettlementRegime, ektosKatoikia },
  state: ()=> S.parcel ? { parcel:S.parcel, plan:S.plan, status: statusOf((S.plan&&S.plan.layers)||{}, S.manual), summary: summary() } : null };

/* ---------- ροή ---------- */
async function lookup(q){
  if(S.busy) return;
  S.busy = true; S.err = ""; S.msg = "Εύρεση γεωτεμαχίου στο Κτηματολόγιο…"; S.frontManual = null; renderResults();
  try{
    const p = await getParcel(q);
    if(!p){ throw new Error(q.kaek ? "Δεν βρέθηκε το ΚΑΕΚ «"+esc(q.kaek)+"» στο Κτηματολόγιο." : "Δεν βρέθηκε γεωτεμάχιο σε αυτό το σημείο."); }
    const po = mainOuter(p.geometry_egsa);
    const ip = interiorPoint(po);
    const fr = frontageOnEK(po, p.neighbors);
    p.front = fr.ek ? fr.len : null; p.frontEK = fr.ek;
    S.parcel = p; drawParcel(p);
    try{ localStorage.setItem(LS_KEY, JSON.stringify({kaek:p.kaek})); }catch(e){}
    S.msg = "Πολεοδομικά στοιχεία από τον Ενιαίο Ψηφιακό Χάρτη…"; renderResults();
    try{ S.plan = await getPlanning(ip[0], ip[1], po.outer); }
    catch(e){
      S.plan = null;
      S.busy = false;
      S.err = e.message==="login"
        ? "Χρειάζεται σύνδεση στο HEXIS για την αναζήτηση όρων. <a href=\"login.html\">Σύνδεση</a>"
        : "Ο Ενιαίος Ψηφιακός Χάρτης δεν απάντησε (" + esc(e.message) + "). Δοκίμασε ξανά σε λίγο ή άνοιξε απευθείας τον <a href=\"" + SDM_PUBLIC + "\" target=\"_blank\" rel=\"noopener\">Ενιαίο Ψηφιακό Χάρτη</a>.";
      renderResults(); return;
    }
  }catch(e){
    S.err = e.message || String(e); S.parcel = null;
  }
  S.busy = false; renderResults();
}
function drawParcel(p){
  if(!S.map) return;
  if(S.parcelLayer){ S.map.removeLayer(S.parcelLayer); S.parcelLayer=null; }
  const latlngs = polysOf(p.geometry_egsa).map(poly=> poly.map(r=> openRing(r).map(([x,y])=>{ const [lon,lat]=toWgs(x,y); return [lat,lon]; })));
  S.parcelLayer = L.polygon(latlngs, {color:"#FFD60A", weight:3, fillColor:"#FFD60A", fillOpacity:.18}).addTo(S.map);
  S.map.fitBounds(S.parcelLayer.getBounds(), {maxZoom:19, padding:[30,30]});
}
function updateUdm(){
  if(!S.map) return;
  if(S.udmOverlay){ S.map.removeLayer(S.udmOverlay); S.udmOverlay=null; }
  if(!S.udmOn || S.map.getZoom() < 14) return;
  const b = S.map.getBounds(), sz = S.map.getSize();
  const url = UDM_EXPORT + "?" + new URLSearchParams({
    bbox:[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()].join(","), bboxSR:"4326", imageSR:"3857",
    size: Math.min(2048,sz.x)+","+Math.min(2048,sz.y), format:"png32", transparent:"true", layers:"show:0,3,6,9", dpi:"96", f:"image"}).toString();
  S.udmOverlay = L.imageOverlay(url, b, {opacity:.85, interactive:false}).addTo(S.map);
}
async function initMap(){
  const el = document.getElementById("od-map"); if(!el) return;
  try{ await ensureLibs(); }catch(e){ el.innerHTML = `<div class="od-err" style="margin:10px">Ο χάρτης δεν φόρτωσε (σύνδεση;). Μπορείς ακόμα να γράψεις ΚΑΕΚ.</div>`; return; }
  if(S.map){ try{ S.map.remove(); }catch(e){} S.map=null; S.parcelLayer=null; S.udmOverlay=null; }
  S.map = L.map(el, {zoomControl:false, attributionControl:true}).setView([38.83, 20.70], 14);
  L.control.zoom({position:"bottomright"}).addTo(S.map);
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {maxZoom:21, maxNativeZoom:18, attribution:"Esri"}).addTo(S.map);
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {maxZoom:20, maxNativeZoom:19, opacity:.9}).addTo(S.map);
  L.tileLayer.wms("https://gis.ktimanet.gr/inspire/rest/services/cadastralparcels/CadastralParcelWMS/MapServer/exts/InspireView/service",
    {layers:"0", format:"image/png", transparent:true, version:"1.3.0", opacity:.85, maxZoom:20, attribution:"Ελληνικό Κτηματολόγιο"}).addTo(S.map);
  S.map.attributionControl.addAttribution("Ενιαίος Ψηφιακός Χάρτης ΤΕΕ/ΥΠΕΝ");
  S.map.on("moveend", updateUdm);
  S.map.on("click", e=> lookup({lat:e.latlng.lat, lon:e.latlng.lng}));
  updateUdm();
  if(S.parcel) drawParcel(S.parcel);
  else if(navigator.geolocation){ /* αρχικό κέντρο: θέση χρήστη αν επιτραπεί — χωρίς επιμονή */ }
  setTimeout(()=>{ try{ S.map.invalidateSize(); }catch(e){} }, 120);
}

window.renderOroi = function(){
  const main = document.getElementById("main");
  let last = ""; try{ last = (JSON.parse(localStorage.getItem(LS_KEY)||"null")||{}).kaek || ""; }catch(e){}
  main.innerHTML = `
  <div class="lawmeta">
    <div class="fek">ΟΡΟΙ<br>ΔΟΜΗΣΗΣ</div>
    <p>Γράψε <b>ΚΑΕΚ</b> ή πάτα στον χάρτη: βρίσκεται το γεωτεμάχιο από το Κτηματολόγιο και αντλούνται <b>καθεστώς, όροι δόμησης, μέγιστη δόμηση και Σ.Α.Ο.</b> από τον Ενιαίο Ψηφιακό Χάρτη, με τα ΦΕΚ.</p>
  </div>
  <div class="od-bar">
    <input id="od-kaek" class="od-inp od-kaekinp" type="search" inputmode="text" autocomplete="off" placeholder="ΚΑΕΚ (π.χ. 340211234567)" value="${esc(S.parcel?S.parcel.kaek:last)}">
    <button type="button" id="od-go" class="od-btn od-primary">Αναζήτηση</button>
    <label class="od-chk"><input type="checkbox" id="od-udm"${S.udmOn?" checked":""}> Όρια σχεδίων / οικισμών</label>
  </div>
  <div id="od-map" class="od-map" role="application" aria-label="Χάρτης επιλογής γεωτεμαχίου"></div>
  <div id="od-res"></div>`;
  const inp = document.getElementById("od-kaek");
  const go = ()=>{ const k = inp.value.replace(/\s+/g,"").toUpperCase(); if(k) lookup({kaek:k}); };
  document.getElementById("od-go").addEventListener("click", go);
  inp.addEventListener("keydown", e=>{ if(e.key==="Enter") go(); });
  document.getElementById("od-udm").addEventListener("change", e=>{ S.udmOn = e.target.checked; updateUdm(); });
  renderResults();
  initMap();
};

/* στυλ ταμπέλας */
const css = document.createElement("style");
css.textContent = `
.od-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:4px 0 10px}
.od-inp{font-family:var(--sans);font-size:14px;border:1.5px solid var(--line);border-radius:9px;padding:8px 10px;background:#fff;color:var(--navy);min-width:0}
.od-inp:focus{outline:none;border-color:var(--blue)}
.od-kaekinp{flex:1 1 220px;font-size:15px;letter-spacing:.5px}
#od-front{width:110px;padding:5px 8px;font-size:14px}
.od-sel{font-family:var(--sans);font-size:13px;border:1.5px solid var(--line);border-radius:8px;padding:5px 8px;background:#fff;color:var(--navy);margin-top:5px;max-width:100%}
.od-btn{appearance:none;display:inline-flex;align-items:center;gap:6px;border:1.5px solid var(--blue);background:#fff;color:var(--blue);font-family:var(--sans);font-size:13.5px;font-weight:700;border-radius:9px;padding:8px 13px;cursor:pointer;text-decoration:none}
.od-btn:hover{background:var(--soft)}
.od-primary{background:var(--blue);color:#fff}.od-primary:hover{background:#173d7c}
.od-chk{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);cursor:pointer;user-select:none}
.od-map{height:340px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#dfe6f0;margin-bottom:12px}
@media (max-width:640px){.od-map{height:42vh}}
@media (min-height:900px){.od-map{height:400px}}
.od-card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px 13px;margin:0 0 10px}
.od-h{font-weight:800;color:var(--navy);font-size:14.5px;margin-bottom:6px}
.od-row{display:flex;gap:12px;padding:7px 0;border-top:1px solid #EEF2F8}
.od-row:first-of-type{border-top:none}
.od-l{flex:0 0 34%;color:var(--muted);font-size:13px}
.od-v{flex:1;min-width:0;font-size:14px;color:#25314D;word-wrap:break-word}
.od-sub{color:var(--muted);font-size:12px;margin-top:2px;line-height:1.45}
.od-txt{white-space:pre-wrap;font-size:12.5px;line-height:1.5;color:#25314D;background:#F7F9FC;border-radius:7px;padding:6px 8px;margin-top:5px}
.od-more{margin-top:4px}.od-more summary{cursor:pointer;color:var(--blue);font-size:12.5px;font-weight:700;list-style:revert}
.od-big{font-size:18px;color:var(--blue)}
.od-tag{display:inline-block;font-size:11px;background:var(--soft);color:var(--blue);border-radius:6px;padding:1px 6px;margin-left:4px}
.od-fek{display:inline-block;margin-left:4px;font-size:12px;font-weight:700;color:var(--blue);text-decoration:none;white-space:nowrap}
.od-fek:hover{text-decoration:underline}
.od-warn{background:#FFF8EC;border-left:4px solid #C77700;border-radius:7px;padding:7px 10px;font-size:13px;color:#6B3E00;margin:6px 0}
.od-err{background:#FDECEC;border-left:4px solid #B42318;border-radius:8px;padding:10px 12px;font-size:13.5px;color:#7A1A12}
.od-err a{color:#7A1A12;font-weight:700}
.od-hint{color:var(--muted);font-size:14px;padding:6px 2px}
.od-busy{color:var(--muted);font-size:14px;padding:8px 2px}
.od-actions{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 8px}
.od-note{font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:24px}
@media (max-width:640px){.od-row{flex-direction:column;gap:2px}.od-l{flex:none}}
`;
document.head.appendChild(css);
})();
