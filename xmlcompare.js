"use strict";
const A = require("./harness.js");
const P = require("./parsed.json");
const f2 = n => Math.round(n*100)/100;

// ---- Πραγματικά μερίδια από τα XML: budget κλάδου / Σ (Σ = budget αρχιτεκτονικών ή 1601) ----
console.log("=== 1. ΜΕΡΙΔΙΑ ΚΛΑΔΩΝ ΣΤΑ ΠΡΑΓΜΑΤΙΚΑ XML (βάση κλάδου ως % του Σ έργου) ===\n");
const NAMES = {101:"Αρχιτεκτονικά",201:"Στατικά",401:"Θερμομόνωση",501:"Παθ.πυρ.",301:"Ηλεκτρικά",601:"Ύδρευση",701:"Αποχέτευση",1101:"Θέρμανση",1201:"Κλιματισμός",1001:"Ενεργ.πυρ.",1401:"Περιβ.χώρος"};
for(const o of P){
  // Σ έργου = budget του 1601 (χρονικός, πάντα σε full Σ) ή max αρχιτεκτονικών
  const x1601 = o.rows.find(r=>r.task===1601);
  const S = x1601 ? x1601.budget : Math.max(...o.rows.filter(r=>r.task===101).map(r=>r.budget));
  const out = {};
  for(const r of o.rows){
    if(r.method===2 || !(r.task in NAMES) || String(r.task).endsWith("2")) continue;
    if(![101,201,401,501,301,601,701,1101,1201,1001,1401].includes(r.task)) continue;
    out[NAMES[r.task]] = (out[NAMES[r.task]]||0) + r.budget;
  }
  const line = Object.entries(out).map(([k,v])=>`${k}: ${(v/S*100).toFixed(2)}%`).join(" · ");
  console.log(o.file+" (Σ="+S.toLocaleString("el-GR")+"): "+line);
}

// ---- Το μοντέλο του app σε σύγκριση ----
console.log("\nApp DEF.studies shares: Αρχ 59,50 · Στατ 17,85 · Θερμ/νση 2,97 · Παθ 1,19 · Ηλ 3,57 · Υδρ 1,78 · Αποχ 1,78 · Θέρμ 4,16 · Κλιμ 7,14 · Εν.πυρ 2,38");
console.log("Λόγοι app/πραγματικών: 59,5/100 = 0,595 σε ΟΛΑ (ίδιες αναλογίες, λάθος κλίμακα)\n");

// ---- 2. Σύγκριση αμοιβών: app vs XML για το 5412 (νέα οικοδομή, καθαρή περίπτωση) ----
console.log("=== 2. ΣΥΓΚΡΙΣΗ ΑΜΟΙΒΩΝ: xml2tee_5412 (νέα οικοδομή) — app με eadeiesS=Σ ===\n");
function freshLike(S, opts){
  const U = A.USES_CATALOG;
  const D = {
    ergo:{titlos:"",eidos:"Νέα οικοδομή",months:18}, odFee:0,
    owners:[{id:1,type:"f",name:"",afm:"",doy:"",pct:100}],
    engineers:[{id:1},{id:2}], docEng:1,
    lambda:0.23368, tekmHm:60, efkaPct:60.84, fpa:24, parakr:10, parakrTopo:4, teeKrat:0, dimosFee:0, eadeiesFee:0,
    ektosSxediou:false, prasMode:"p5", analytP:0, aekkKg:50, aekkEur:9, aekkEgy:0,
    aekk:A.defAekk(), stat:A.defStat(), allagi:false, scen:[],
    uses:[{...U[1], m2:0, kind:opts.pros?"pros":"new", oldIdx:-1}],
    eta:118, studies:JSON.parse(JSON.stringify(A.DEF.studies)),
    kenakPct:20, topoFlat:0, incProsthiki:!!opts.pros, agreedFee:0, topo:A.defTopo(),
    works:JSON.parse(JSON.stringify(A.DEF.works)),
    efkaMode:"1", efkaCols:A.DEF.efkaCols.slice(), efkaMat:JSON.parse(JSON.stringify(A.DEF.efkaMat)),
    efkaMat2a:JSON.parse(JSON.stringify(A.DEF.efkaMat2a)), efkaMat2b:JSON.parse(JSON.stringify(A.DEF.efkaMat2b)),
    efka3:JSON.parse(JSON.stringify(A.DEF.efka3)), eadeiesS:S, sched:[], engFees:{},
  };
  // ΠΡΟΣΟΧΗ: eadeiesS>0 δίνει Σ, αλλά το incP σταθμίζεται από uses — γι' αυτό βάζουμε kind στο uses
  D.uses[0].m2 = 1; // ώστε _bT>0 και το σταθμισμένο incP να πιάσει το kind
  for(const st of D.studies){
    st.on = opts.on.includes(st.tM);
  }
  return D;
}

// 5412: on: 101,201,501,301,601,701,1101,1201,1001,1601 · χωρίς θερμομόνωση · νέα (όχι προσθήκη)
A.D = freshLike(45072.23, {pros:false, on:[101,201,501,301,601,701,1101,1201,1001,1601]});
const app5412 = A.amoivesCalc();
const X = P.find(p=>p.file==="xml2tee_5412.xml");

function xmlSum(o, pred){ return o.rows.filter(pred).reduce((a,r)=>a+r.fee,0); }
const PAIRS = [
  ["Αρχιτεκτονικά ΜΕΛ", r=>r.task===101, "Αρχιτεκτονικά", "melF"],
  ["Στατικά ΜΕΛ", r=>r.task===201, "Στατικά", "melF"],
  ["Παθ.πυρ. ΜΕΛ", r=>r.task===501, "Παθητική πυροπροστασία", "melF"],
  ["Ηλεκτρικά ΜΕΛ", r=>r.task===301, "Ηλεκτρικές εγκ/σεις", "melF"],
  ["Ύδρευση ΜΕΛ", r=>r.task===601, "Ύδρευση", "melF"],
  ["Αποχέτευση ΜΕΛ", r=>r.task===701, "Αποχέτευση", "melF"],
  ["Θέρμανση ΜΕΛ", r=>r.task===1101, "Θέρμανση", "melF"],
  ["Κλιματισμός ΜΕΛ", r=>r.task===1201, "Κλιματισμός", "melF"],
  ["Ενεργ.πυρ. ΜΕΛ", r=>r.task===1001, "Ενεργητική πυροπροστασία", "melF"],
  ["Αρχιτεκτονικά ΕΠΙΒΛ", r=>r.task===102, "Αρχιτεκτονικά", "epiF"],
  ["Στατικά ΕΠΙΒΛ", r=>r.task===202, "Στατικά", "epiF"],
  ["Ηλεκτρικά ΕΠΙΒΛ", r=>r.task===302, "Ηλεκτρικές εγκ/σεις", "epiF"],
  ["Κλιματισμός ΕΠΙΒΛ", r=>r.task===1202, "Κλιματισμός", "epiF"],
  ["Χρονικός (μελ+εφαρμ)", r=>r.task===1601||r.task===1609, "Χρονικός προγραμματισμός", "both"],
  ["ΚΕΝΑΚ 5601", r=>r.task===5601, "isKenak", "melF"],
];
console.log("Γραμμή".padEnd(24), "XML(πραγμ.)".padStart(12), "App".padStart(12), "App/XML".padStart(9));
let sumX=0, sumApp=0;
for(const [name, pred, appName, fld] of PAIRS){
  const xv = xmlSum(X, pred);
  const ar = app5412.rows.find(r=> appName==="isKenak" ? r.isKenak : r.s===appName);
  const av = !ar?0 : fld==="both" ? (ar.melF||0)+(ar.epiF||0) : (ar[fld]||0);
  if(xv===0 && av===0) continue;
  sumX+=xv; sumApp+=av;
  console.log(name.padEnd(24), f2(xv).toLocaleString("el-GR").padStart(12), f2(av).toLocaleString("el-GR").padStart(12), (xv?(av/xv):0).toFixed(3).padStart(9));
}
// σύνολα (χωρίς 104/1401/103/τοπο για ισότιμη σύγκριση)
console.log("-".repeat(60));
console.log("ΣΥΝΟΛΟ συγκρίσιμων".padEnd(24), f2(sumX).toLocaleString("el-GR").padStart(12), f2(sumApp).toLocaleString("el-GR").padStart(12), (sumApp/sumX).toFixed(3).padStart(9));

// ---- 3. Διορθωμένο μοντέλο: shares ×(100/59,5), επιβλέψεις ×1,40 (Επιμέτρηση), ΚΕΝΑΚ με κ/μ κλάδου + αρχιτεκτονικά ----
console.log("\n=== 3. ΔΙΟΡΘΩΜΕΝΟ ΜΟΝΤΕΛΟ vs XML (5412) ===\n");
const l=0.23368, S=45072.23;
const CORR = [ // [name, sharePct, mk,mm, ek,em]
  ["Αρχιτεκτονικά",100,1.8,48,1.3,25],
  ["Στατικά",30,3.7,35,2.0,28],
  ["Παθ.πυρ.",2,2.0,35,1.3,25],
  ["Ηλεκτρικά",6,2.3,45,1.3,25],
  ["Ύδρευση",3,2.0,35,1.3,25],
  ["Αποχέτευση",3,2.0,35,1.3,25],
  ["Θέρμανση",7,2.3,45,1.3,25],
  ["Κλιματισμός",12,2.5,45,2.0,28],
  ["Ενεργ.πυρ.",4,2.3,45,1.3,25],
];
let cm=0, ce=0, ck=0;
console.log("Κλάδος".padEnd(16),"ΜΕΛ διορθ.".padStart(11),"ΜΕΛ XML".padStart(10),"ΕΠΙΒΛ διορθ.".padStart(13),"ΕΠΙΒΛ XML".padStart(11));
for(const [name,sh,mk,mm,ek,em] of CORR){
  const base = S*sh/100;
  const mel = A.feePart(base,l,mk,mm,1);
  const epi = A.feePart(base,l,ek,em,1)*1.40;             // ×1,40 Επιμέτρηση
  cm+=mel; ce+=epi;
  // ΚΕΝΑΚ: κ/μ ΚΛΑΔΟΥ ×0,2 — μόνο 101,301,601,701,1101,1201,1001
  if(["Αρχιτεκτονικά","Ηλεκτρικά","Ύδρευση","Αποχέτευση","Θέρμανση","Κλιματισμός","Ενεργ.πυρ."].includes(name))
    ck += A.feePart(base,l,mk,mm,1)*0.2;
  const tid = {"Αρχιτεκτονικά":101,"Στατικά":201,"Παθ.πυρ.":501,"Ηλεκτρικά":301,"Ύδρευση":601,"Αποχέτευση":701,"Θέρμανση":1101,"Κλιματισμός":1201,"Ενεργ.πυρ.":1001}[name];
  const xm = xmlSum(X, r=>r.task===tid);
  const xe = xmlSum(X, r=>r.task===tid+1 || (tid===1101&&r.task===1102)||(tid===1201&&r.task===1202));
  console.log(name.padEnd(16), f2(mel).toLocaleString("el-GR").padStart(11), f2(xm).toLocaleString("el-GR").padStart(10), f2(epi).toLocaleString("el-GR").padStart(13), f2(xe).toLocaleString("el-GR").padStart(11));
}
const xron = A.feePart(S,l,2.3,45,0.2)*2;
console.log("Χρονικός×2".padEnd(16), f2(xron).toLocaleString("el-GR").padStart(11), f2(xmlSum(X,r=>r.task===1601||r.task===1609)).toLocaleString("el-GR").padStart(10));
console.log("ΚΕΝΑΚ".padEnd(16), f2(ck).toLocaleString("el-GR").padStart(11), f2(xmlSum(X,r=>r.task===5601)).toLocaleString("el-GR").padStart(10));
const corrTotal = cm+ce+xron+ck;
const xmlTotal = sumX;
console.log("-".repeat(64));
console.log("ΣΥΝΟΛΟ διορθ.".padEnd(16), f2(corrTotal).toLocaleString("el-GR").padStart(11), " vs XML:", f2(xmlTotal).toLocaleString("el-GR"), " λόγος:", (corrTotal/xmlTotal).toFixed(4));
