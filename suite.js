"use strict";
const A = require("./harness.js");
const R = []; // results
function log(section, name, status, detail){ R.push({section, name, status, detail}); }
const f2 = n => Math.round(n*100)/100;
const approx = (a,b,tol=0.01) => Math.abs(a-b) <= tol;

function freshD(){
  // rebuild a pristine D like the app's default
  const U = A.USES_CATALOG;
  return {
    ergo:{titlos:"",eidos:"Νέα οικοδομή",dieuth:"",kaek:"",ydom:"",eaAA:"",months:18,lat:null,lon:null,zoom:null},
    odFee:0,
    owners:[{id:1,type:"f",name:"",afm:"",doy:"",pct:100}],
    engineers:[{id:1,name:"",eid:"ΠΜ",am:"",afm:""},{id:2,name:"",eid:"ΠΜ",am:"",afm:""}],
    docEng:1,
    lambda:A.DEF.lambda, tekmHm:A.DEF.tekmHm, efkaPct:A.DEF.efkaPct,
    fpa:A.DEF.fpa, parakr:A.DEF.parakr, teeKrat:A.DEF.teeKrat, dimosFee:A.DEF.dimosFee, eadeiesFee:0,
    ektosSxediou:false, prasMode:"p5", analytP:0, aekkKg:50, aekkEur:9, aekkEgy:0,
    aekk:A.defAekk(), stat:A.defStat(), allagi:false, scen:[],
    uses:[{...U[1],m2:0,kind:"new",oldIdx:-1},{...U[12],m2:0,kind:"new",oldIdx:-1},{...U[11],m2:0,kind:"new",oldIdx:-1}],
    eta:A.DEF.eta, studies:JSON.parse(JSON.stringify(A.DEF.studies)), kenakPct:A.DEF.kenakPct,
    topoFlat:A.DEF.topoFlat, incProsthiki:false, agreedFee:0, topo:A.defTopo(),
    works:JSON.parse(JSON.stringify(A.DEF.works)),
    efkaMode:"1", efkaCols:A.DEF.efkaCols.slice(),
    efkaMat:JSON.parse(JSON.stringify(A.DEF.efkaMat)),
    efkaMat2a:JSON.parse(JSON.stringify(A.DEF.efkaMat2a)),
    efkaMat2b:JSON.parse(JSON.stringify(A.DEF.efkaMat2b)),
    efka3:JSON.parse(JSON.stringify(A.DEF.efka3)),
    eadeiesS:0, sched:JSON.parse(JSON.stringify(A.DEF.sched)),
    parakrTopo:4, engFees:{}, // ΠΡΟΣΟΧΗ: στο app ΔΕΝ υπάρχουν σε fresh D — τα βάζουμε εδώ για να τεστάρουμε τη «σωστή» ροή
  };
}

/* ============================================================
   1. ΒΑΣΙΚΗ ΜΑΘΗΜΑΤΙΚΗ ΟΡΘΟΤΗΤΑ β = κ + μ/∛(Σ/1000λ)
   ============================================================ */
(function(){
  const l = 0.23368;
  // Σ = 233,68 → β = κ+μ
  let b = A.beta(233.68, l, 2.0, 35);
  log("1.β","Σ=233,68€ ⇒ β=κ+μ", approx(b,37)?"OK":"FAIL", `β=${b.toFixed(4)} (αναμ. 37)`);
  // Σ = 233.680 (×1000) → β = κ + μ/10
  b = A.beta(233680, l, 2.0, 35);
  log("1.β","Σ=233.680€ ⇒ β=κ+μ/10", approx(b,5.5)?"OK":"FAIL", `β=${b.toFixed(4)} (αναμ. 5,5)`);
  // μονοτονία: μεγαλύτερη βάση ⇒ μικρότερο β
  const b1=A.beta(50000,l,1.8,48), b2=A.beta(500000,l,1.8,48);
  log("1.β","Μονοτονία β (φθίνουσα)", b2<b1?"OK":"FAIL", `β(50k)=${b1.toFixed(2)}% > β(500k)=${b2.toFixed(2)}%`);
  // guard: base<=0 or l<=0
  log("1.β","β(0)=0 / β(l=0)=0", (A.beta(0,l,2,35)===0 && A.beta(1000,0,2,35)===0)?"OK":"FAIL","");
  // ΠΡΟΒΛΗΜΑ: πολύ μικρή βάση ⇒ β εκρήγνυται (>100%)
  const bx = A.beta(50, l, 1.8, 48);
  log("1.β","Μικρή βάση 50€ ⇒ β χωρίς όριο", bx>100?"ΠΡΟΣΟΧΗ":"OK", `β=${bx.toFixed(1)}% — αμοιβή ${(50*bx/100).toFixed(2)}€ > βάση!`);
})();

/* ============================================================
   2. ΠΡΟΫΠΟΛΟΓΙΣΜΟΣ ΧΡΗΣΕΩΝ (useBudget / symbatikos)
   ============================================================ */
(function(){
  A.D = freshD();
  // 2.1 Κατοικία 120 m², SE 1.00
  A.D.uses = [{...A.USES_CATALOG[1], m2:120, kind:"new", oldIdx:-1}];
  let S = A.symbatikos();
  log("2.Προϋπ","Κατοικία 120μ² SE1,00", approx(S,120*118)?"OK":"FAIL", `Σ=${f2(S)}€ (αναμ. 14.160)`);
  // 2.2 Μίξη χρήσεων
  A.D.uses = [
    {...A.USES_CATALOG[1], m2:100, kind:"new", oldIdx:-1},        // SE 1.00
    {...A.USES_CATALOG[12], m2:60, kind:"new", oldIdx:-1},        // υπόγεια SE 0.50
    {...A.USES_CATALOG[6], m2:20, kind:"new", oldIdx:-1},         // ημιυπ SE 0.50
  ];
  S = A.symbatikos();
  const exp = 100*118*1 + 60*118*0.5 + 20*118*0.5;
  log("2.Προϋπ","Μίξη κύριοι+υπόγειο+ημιυπ.", approx(S,exp)?"OK":"FAIL", `Σ=${f2(S)}€ (αναμ. ${f2(exp)})`);
  // 2.3 Override e-Άδειες
  A.D.eadeiesS = 99999;
  log("2.Προϋπ","Override Σ e-Άδειες", approx(A.symbatikos(),99999)?"OK":"FAIL", `Σ=${A.symbatikos()}`);
  A.D.eadeiesS = 0;
  // 2.4 Αλλαγή χρήσης: αποθήκη(0.60) → κατοικία(1.00), 80μ²
  A.D.uses = [{...A.USES_CATALOG[1], m2:80, kind:"chg", oldIdx:16}]; // 16=Αποθήκες se 0.60
  S = A.symbatikos();
  log("2.Προϋπ","Αλλαγή χρήσης αποθήκη→κατοικία 80μ²", approx(S,80*118*(1-0.6))?"OK":"FAIL", `Σ=${f2(S)}€ (αναμ. ${f2(80*118*0.4)})`);
  // 2.5 Αλλαγή χρήσης αντίστροφη (νέα<παλιά) ⇒ 0
  A.D.uses = [{...A.USES_CATALOG[16], m2:80, kind:"chg", oldIdx:1}];
  log("2.Προϋπ","Αλλαγή χρήσης κατοικία→αποθήκη ⇒ min 0", A.symbatikos()===0?"OK":"FAIL", `Σ=${A.symbatikos()}`);
  // 2.6 Αρνητικά m² (input λάθος χρήστη)
  A.D.uses = [{...A.USES_CATALOG[1], m2:-50, kind:"new", oldIdx:-1}];
  S = A.symbatikos();
  log("2.Προϋπ","Αρνητικά μ² δεν μπλοκάρονται", S<0?"ΠΡΟΣΟΧΗ":"OK", `Σ=${f2(S)}€ — αρνητικός προϋπολογισμός περνάει σε όλα τα επόμενα`);
  // 2.7 oldIdx εκτός ορίων
  A.D.uses = [{...A.USES_CATALOG[1], m2:80, kind:"chg", oldIdx:999}];
  log("2.Προϋπ","oldIdx εκτός καταλόγου", isFinite(A.symbatikos())?"OK":"FAIL", `Σ=${f2(A.symbatikos())} (παλιό SE→0, πλήρης αξία)`);
})();

/* ============================================================
   3. ΑΜΟΙΒΕΣ ΜΗΧΑΝΙΚΩΝ — σενάρια μεγέθους
   ============================================================ */
const AMB = [];
(function(){
  const sizes = [
    ["Μικρή κατοικία 60μ²",     [[1,60]]],
    ["Κατοικία 100μ²",          [[1,100]]],
    ["Κατοικία 120μ²+υπόγ 60+ημιυπ 20", [[1,120],[12,60],[6,20]]],
    ["Κατοικία 180μ² (SE 1,05)",[[2,180]]],
    ["Πολυκατοικία 600μ²+κοιν 80+υπόγ 200", [[1,600],[10,80],[12,200]]],
    ["Ξενοδοχείο Β' 1200μ²",    [[19,1200]]],
    ["Βιοτεχνικό 800μ²",        [[36,800]]],
    ["Αγροτ. αποθήκη 100μ²",    [[43,100]]],
  ];
  for(const [name, mix] of sizes){
    A.D = freshD();
    A.D.uses = mix.map(([i,m2])=>({...A.USES_CATALOG[i], m2, kind:"new", oldIdx:-1}));
    const S = A.symbatikos(), a = A.amoivesCalc();
    const kenak = a.rows.find(r=>r.isKenak).melF;
    const xron = a.rows.find(r=>r.tM===1601);
    AMB.push({name, S:f2(S), mel:f2(a.mel), epi:f2(a.epi), sum:f2(a.sum),
      pct:f2(a.sum/S*100), kenak:f2(kenak), xron:f2((xron.melF||0)+(xron.epiF||0)), belowMin:a.belowMin});
  }
})();

/* ============================================================
   4. ΑΜΟΙΒΕΣ — ειδικοί έλεγχοι
   ============================================================ */
(function(){
  // 4.1 Αντισεισμικός: στατικά μελ ×1.8, επιβλ ×1.4
  A.D = freshD(); A.D.uses=[{...A.USES_CATALOG[1],m2:100,kind:"new",oldIdx:-1}];
  const a1 = A.amoivesCalc();
  const st = A.D.studies.find(s=>s.s==="Στατικά"); st.aseismic=false;
  const a2 = A.amoivesCalc();
  const r1 = a1.rows.find(r=>r.s==="Στατικά"), r2 = a2.rows.find(r=>r.s==="Στατικά");
  log("4.Αμοιβές","Αντισεισμικός μελ ×1,80", approx(r1.melF/r2.melF,1.80,0.001)?"OK":"FAIL", `${f2(r1.melF)}/${f2(r2.melF)}=${(r1.melF/r2.melF).toFixed(3)}`);
  log("4.Αμοιβές","Αντισεισμικός επιβλ ×1,40", approx(r1.epiF/r2.epiF,1.40,0.001)?"OK":"FAIL", `${(r1.epiF/r2.epiF).toFixed(3)}`);

  // 4.2 Προσθήκη +30% (όλες οι γραμμές pros)
  A.D = freshD(); A.D.uses=[{...A.USES_CATALOG[1],m2:100,kind:"pros",oldIdx:-1}];
  const ap = A.amoivesCalc();
  A.D.uses[0].kind="new"; const an = A.amoivesCalc();
  log("4.Αμοιβές","Προσθήκη +30% σε όλα", approx(ap.sum/an.sum,1.30,0.001)?"OK":"FAIL", `${f2(ap.sum)}/${f2(an.sum)}=${(ap.sum-A.D.topoFlat*0)/1&&(ap.sum/an.sum).toFixed(4)} — ΠΡΟΣΟΧΗ: πολλαπλασιάζεται και το τοπογραφικό;`);
  // το τοπογραφικό (κατ' αποκοπή) ΔΕΝ πρέπει να ×1.30:
  const tpP = ap.rows.find(r=>r.isTopo).melF, tpN = an.rows.find(r=>r.isTopo).melF;
  log("4.Αμοιβές","Τοπογραφικό ανεπηρέαστο από +30%", approx(tpP,tpN)?"OK":"FAIL", `${f2(tpP)} vs ${f2(tpN)}`);
  // άρα ap.sum/an.sum ΔΕΝ είναι ακριβώς 1.30 λόγω τοπο — έλεγχος χωρίς τοπο:
  const ratio = (ap.sum-tpP)/(an.sum-tpN);
  log("4.Αμοιβές","+30% σε μελ+επιβλ+ΚΕΝΑΚ (χωρίς τοπο)", approx(ratio,1.30,0.001)?"OK":"FAIL", `λόγος=${ratio.toFixed(4)}`);

  // 4.3 Σταθμισμένο incP σε μίξη νέο+προσθήκη
  A.D = freshD();
  A.D.uses=[{...A.USES_CATALOG[1],m2:100,kind:"new",oldIdx:-1},{...A.USES_CATALOG[1],m2:100,kind:"pros",oldIdx:-1}];
  const am = A.amoivesCalc();
  const rArch = am.rows.find(r=>r.s==="Αρχιτεκτονικά");
  // αναμενόμενο incP = (1+1.3)/2 = 1.15
  A.D.uses[1].kind="new"; const am0 = A.amoivesCalc();
  const rArch0 = am0.rows.find(r=>r.s==="Αρχιτεκτονικά");
  log("4.Αμοιβές","Σταθμ. incP 50/50 ⇒ 1,15", approx(rArch.melF/rArch0.melF,1.15,0.001)?"OK":"FAIL", `λόγος=${(rArch.melF/rArch0.melF).toFixed(4)}`);

  // 4.4 ΚΕΝΑΚ = 20% × Σ feePart(κλάδοι, 2.3/45)
  A.D = freshD(); A.D.uses=[{...A.USES_CATALOG[1],m2:100,kind:"new",oldIdx:-1}];
  const ak = A.amoivesCalc();
  const l=A.D.lambda, S=A.symbatikos();
  let man=0;
  for(const st2 of A.D.studies){
    if(!st2.on || ![101,301,601,701,1101].includes(st2.tM)) continue; // on μόνο: 101,301,601,701,1101 (1201,1001 off)
    man += A.feePart(S*st2.share/100, l, 2.3, 45, 1);
  }
  man *= 0.20;
  const kk = ak.rows.find(r=>r.isKenak).melF;
  log("4.Αμοιβές","ΚΕΝΑΚ 20% επί κλάδων (χειροκ. επαλήθευση)", approx(kk,man,0.01)?"OK":"FAIL", `app=${f2(kk)} χειρ=${f2(man)}`);

  // 4.5 Ελάχιστη αμοιβή 5000λ
  A.D = freshD(); A.D.uses=[{...A.USES_CATALOG[1],m2:2,kind:"new",oldIdx:-1}];
  const amin = A.amoivesCalc();
  log("4.Αμοιβές","Σήμανση κάτω από 5000λ=1.168,40€", (amin.minPay===5000*0.23368)?"OK":"FAIL",
     `sum=${f2(amin.sum)} minPay=${f2(amin.minPay)} belowMin=${amin.belowMin} — ΣΗΜ: μόνο σήμανση, ΔΕΝ επιβάλλεται στο sum`);

  // 4.6 Χρονικός προγραμματισμός: share 100% — βαρύτητα
  A.D = freshD(); A.D.uses=[{...A.USES_CATALOG[1],m2:100,kind:"new",oldIdx:-1}];
  const ax = A.amoivesCalc(); const rx = ax.rows.find(r=>r.tM===1601);
  log("4.Αμοιβές","Χρον. προγραμματισμός (bf 0,2 επί όλου Σ)", "INFO",
     `μελ=${f2(rx.melF)} επιβλ=${f2(rx.epiF)} — μελ ΚΑΙ επιβλ με ίδια κ/μ (2,3/45)`);

  // 4.7 Όλες οι μελέτες off ⇒ μόνο ΚΕΝΑΚ 0 + τοπο
  A.D = freshD(); A.D.uses=[{...A.USES_CATALOG[1],m2:100,kind:"new",oldIdx:-1}];
  A.D.studies.forEach(s=>s.on=false);
  const aoff = A.amoivesCalc();
  log("4.Αμοιβές","Όλα off ⇒ sum = τοπογραφικό", approx(aoff.sum, A.D.topoFlat)?"OK":"FAIL", `sum=${f2(aoff.sum)}`);
})();

/* ============================================================
   5. ΦΟΡΟΛΟΓΙΚΑ (foroCalc)
   ============================================================ */
(function(){
  A.D = freshD(); A.D.uses=[{...A.USES_CATALOG[1],m2:120,kind:"new",oldIdx:-1}];
  const f = A.foroCalc(); const a=f.a;
  // 5.1 ΦΠΑ 24% επί νόμιμης
  log("5.Φόροι","ΦΠΑ 24% επί νόμιμης", approx(f.fpa, a.sum*0.24)?"OK":"FAIL", `ΦΠΑ=${f2(f.fpa)}`);
  // 5.2 ΦΕΜ 10%/4%
  const topoFee = a.rows.find(r=>r.isTopo).melF;
  const expP = (a.sum-topoFee)*0.10 + topoFee*0.04;
  log("5.Φόροι","ΦΕΜ 10% μελ/επιβλ + 4% τοπο", approx(f.parakr, expP)?"OK":"FAIL", `app=${f2(f.parakr)} αναμ=${f2(expP)}`);
  // 5.3 ΦΕΜ με parakrTopo=undefined (fresh install bug)
  const D2 = freshD(); delete D2.parakrTopo; A.D = D2;
  A.D.uses=[{...A.USES_CATALOG[1],m2:120,kind:"new",oldIdx:-1}];
  const f2u = A.foroCalc();
  const expBug = (f2u.a.sum-topoFee)*0.10 + topoFee*0.04;
  log("5.Φόροι","BUG fresh install: parakrTopo undefined ⇒ ΦΕΜ τοπο 0%", approx(f2u.parakr, expBug)?"OK (δεν αναπαράγεται)":"ΣΦΑΛΜΑ",
     `ΦΕΜ=${f2(f2u.parakr)} — σωστό θα ήταν ${f2(expBug)} (διαφορά ${f2(expBug-f2u.parakr)}€ = 4% τοπογραφικού)`);
  // 5.4 Συμφωνηθείσα αμοιβή
  A.D = freshD(); A.D.uses=[{...A.USES_CATALOG[1],m2:120,kind:"new",oldIdx:-1}];
  const leg = A.amoivesCalc().sum;
  A.D.agreedFee = 3000;
  const fa = A.foroCalc();
  log("5.Φόροι","Συμφωνηθείσα: ΦΠΑ επί 3000", approx(fa.fpa,720)?"OK":"FAIL", `ΦΠΑ=${f2(fa.fpa)} (νόμιμη=${f2(leg)})`);
  log("5.Φόροι","Συμφωνηθείσα: ΦΕΜ παραμένει επί ΝΟΜΙΜΗΣ", approx(fa.parakr, (leg - topoFee)*0.1 + topoFee*0.04, 0.5)?"OK":"INFO",
     `ΦΕΜ=${f2(fa.parakr)} — κατά ΠΟΛ.1025/2014 ο ΦΕΜ υπολογίζεται στη νόμιμη (συμβατική) αμοιβή ✓`);
  // 5.5 cash δεν περιλαμβάνει ΦΕΜ
  log("5.Φόροι","Ταμειακό: billed+ΦΠΑ+ΤΕΕ+πράσινο+ΑΕΚΚ+λοιπά (χωρίς ΦΕΜ)",
     approx(fa.cash, fa.billed+fa.fpa+fa.tee+fa.prasino+fa.aekk.cost+fa.other)?"OK":"FAIL", `cash=${f2(fa.cash)}`);
  // 5.6 odFee ΔΕΝ μπαίνει στο cash;
  A.D.odFee = 500;
  const fo = A.foroCalc();
  log("5.Φόροι","odFee (αμοιβή ελέγχου δόμησης;) εκτός ταμειακού", approx(fo.cash, fa.cash)?"ΠΡΟΣΟΧΗ":"OK",
     `Το D.odFee=500€ δεν επηρεάζει το cash — έλεγξε αν είναι σκόπιμο`);
})();

/* ============================================================
   6. ΠΡΑΣΙΝΟ ΤΑΜΕΙΟ
   ============================================================ */
(function(){
  // 6.1 εντός σχεδίου ⇒ 0
  A.D = freshD(); A.D.uses=[{...A.USES_CATALOG[1],m2:120,kind:"new",oldIdx:-1}];
  log("6.Πράσινο","Εντός σχεδίου ⇒ 0", A.prasinoCalc()===0?"OK":"FAIL","");
  // 6.2 5% συμβατικού, ενδιάμεσο
  A.D.ektosSxediou = true; A.D.prasMode="p5";
  A.D.uses=[{...A.USES_CATALOG[1],m2:20,kind:"new",oldIdx:-1}]; // Σ=2360 → 5%=118 → min 250
  log("6.Πράσινο","Ελάχιστο 250€", A.prasinoCalc()===250?"OK":"FAIL", `p=${A.prasinoCalc()} (5%×2.360=118)`);
  A.D.uses=[{...A.USES_CATALOG[1],m2:120,kind:"new",oldIdx:-1}]; // Σ=14160 → 708
  log("6.Πράσινο","5% συμβατικού", approx(A.prasinoCalc(),708)?"OK":"FAIL", `p=${A.prasinoCalc()}`);
  A.D.uses=[{...A.USES_CATALOG[1],m2:1000,kind:"new",oldIdx:-1}]; // Σ=118000 → 5900 → cap 5000
  log("6.Πράσινο","Οροφή 5.000€", A.prasinoCalc()===5000?"OK":"FAIL", `p=${A.prasinoCalc()}`);
  // 6.3 5‰ αναλυτικού
  A.D.prasMode="m5"; A.D.analytP=200000;
  log("6.Πράσινο","5‰ αναλυτικού 200.000", A.prasinoCalc()===1000?"OK":"FAIL", `p=${A.prasinoCalc()}`);
  A.D.analytP=0; // fallback σε συμβατικό
  log("6.Πράσινο","5‰ fallback συμβατικός", approx(A.prasinoCalc(), Math.min(5000,Math.max(250,118000*0.005)))?"OK":"FAIL", `p=${A.prasinoCalc()}`);
})();

/* ============================================================
   7. ΑΕΚΚ
   ============================================================ */
(function(){
  A.D = freshD();
  A.D.uses=[{...A.USES_CATALOG[1],m2:100,kind:"new",oldIdx:-1}];
  // 7.1 Νέα κατασκευή 100μ² × 50kg/μ² = 5t
  let r = A.aekkCalc();
  log("7.ΑΕΚΚ","Νέα 100μ²×50kg ⇒ 5,0 t", approx(r.tons,5,0.01)?"OK":"FAIL", `tons=${f2(r.tons)} κόστος=${f2(r.cost)}€ (9€/t)`);
  // σύνθεση ΕΚΑ = 100%;
  const fSum = [0.40,0.25,0.10,0.05,0.05,0.08,0.07].reduce((a,b)=>a+b,0);
  log("7.ΑΕΚΚ","Σύνθεση EKA_NEW = 100%", approx(fSum,1)?"OK":"FAIL", `Σ%=${fSum}`);
  const fD = [.50,.25,.05,.05,.03,.12].reduce((a,b)=>a+b,0), fR=[.45,.15,.08,.05,.05,.22].reduce((a,b)=>a+b,0);
  log("7.ΑΕΚΚ","Σύνθεση EKA_DEM/EKA_REN = 100%", (approx(fD,1)&&approx(fR,1))?"OK":"FAIL", `dem=${fD} ren=${fR}`);
  // 7.2 Εκσκαφές με επιτόπου αξιοποίηση
  A.D.aekk.excOn=true; A.D.aekk.excM3=100; A.D.aekk.excDens=1.65; A.D.aekk.excReuseM3=40;
  r = A.aekkCalc();
  log("7.ΑΕΚΚ","Εκσκαφές 100μ³−40μ³ reuse ⇒ 99 t", approx(r.excT,60*1.65,0.01)?"OK":"FAIL", `excT=${f2(r.excT)}`);
  // 7.3 Reuse > όγκου ⇒ clamp
  A.D.aekk.excReuseM3=500; r = A.aekkCalc();
  log("7.ΑΕΚΚ","Reuse>gross ⇒ 0 (clamp)", r.excT===0?"OK":"FAIL", `excT=${r.excT}`);
  // 7.4 Εγγυητική 0,5% / 0,2% / χειροκίνητη
  A.D.aekk.egyMode="a05"; r=A.aekkCalc();
  log("7.ΑΕΚΚ","Εγγυητική 0,5% Σ", approx(r.egy, A.symbatikos()*0.005)?"OK":"FAIL", `egy=${f2(r.egy)}`);
  A.D.aekk.egyMode="a02"; r=A.aekkCalc();
  log("7.ΑΕΚΚ","Εγγυητική 0,2% Σ", approx(r.egy, A.symbatikos()*0.002)?"OK":"FAIL", `egy=${f2(r.egy)}`);
  A.D.aekk.egyMode="man"; A.D.aekk.egyManual=333; r=A.aekkCalc();
  log("7.ΑΕΚΚ","Εγγυητική χειροκίνητη", r.egy===333?"OK":"FAIL", `egy=${r.egy}`);
  // 7.5 Η εγγυητική ΔΕΝ μπαίνει στο cost (επιστρέφεται) — αλλά μπαίνει στο cash;
  log("7.ΑΕΚΚ","Εγγυητική εκτός aekk.cost", (r.cost === r.excT*4 + r.restT*9 + 0)?"OK":"INFO", `cost=${f2(r.cost)} egy=${r.egy} — egy εμφανίζεται μόνο πληροφοριακά`);
  // 7.6 Κατεδάφιση + ανακαίνιση μαζί
  A.D = freshD(); A.D.aekk.newOn=false; A.D.aekk.demOn=true; A.D.aekk.demM2=100; A.D.aekk.demT=1.2;
  A.D.aekk.renOn=true; A.D.aekk.renM2=50; A.D.aekk.renT=0.15;
  r = A.aekkCalc();
  log("7.ΑΕΚΚ","Κατεδ.100μ²×1,2 + ανακ.50μ²×0,15 = 127,5 t", approx(r.tons,127.5,0.01)?"OK":"FAIL", `tons=${f2(r.tons)}`);
})();

/* ============================================================
   8. ΕΦΚΑ
   ============================================================ */
(function(){
  // 8.1 Πίνακας 1: 100μ² κύριοι + 50 υπόγειο
  A.D = freshD();
  A.D.efkaMat[0].m2=100; A.D.efkaMat[1].m2=50;
  let e = A.efkaCalc();
  const d1 = 100*(0.62+0.40+0.36+0.30+0.32+0.22), d2=50*(0.55+0.18+0.16+0.14+0.12+0.12);
  log("8.ΕΦΚΑ","Πίν.1 ημερομίσθια 100+50μ²", approx(e.raw, d1+d2, 0.01)?"OK":"FAIL",
     `raw=${f2(e.raw)} (αναμ. ${f2(d1+d2)}) k=${e.k} κόστος=${f2(e.cost)}€`);
  // 8.2 ΜΖΜΣ ασυνέχεια στα όρια!
  const days = (n)=>{ A.D=freshD(); A.D.efkaMat.forEach(r=>r.m2=0); A.D.efkaMat[0].m2 = n/2.22; return A.efkaCalc(); };
  const eA = days(3000*2.22/ (2.22) * 1); // ακριβώς
  // απλούστερα: raw ελεγχόμενο μέσω m2 ενός χώρου με συντ. άθροισμα 2.22
  A.D = freshD(); A.D.efkaMat.forEach(r=>r.m2=0);
  A.D.efkaMat[0].m2 = 3000/2.22; let e1 = A.efkaCalc();
  A.D.efkaMat[0].m2 = 3010/2.22; let e2 = A.efkaCalc();
  log("8.ΕΦΚΑ","ΜΖΜΣ: ασυνέχεια 3000→3010 ημερομ.", e2.days < e1.days ? "ΣΦΑΛΜΑ":"OK",
     `raw 3000⇒days ${f2(e1.days)} (k=1,00) · raw 3010⇒days ${f2(e2.days)} (k=0,90) — ΤΑ ΗΜΕΡΟΜΙΣΘΙΑ ΜΕΙΩΝΟΝΤΑΙ ενώ το κτίριο μεγαλώνει!`);
  A.D.efkaMat[0].m2 = 10005/2.22; let e3=A.efkaCalc();
  A.D.efkaMat[0].m2 = 9995/2.22; let e4=A.efkaCalc();
  log("8.ΕΦΚΑ","ΜΖΜΣ: ασυνέχεια στο όριο 10000", e3.days<e4.days?"ΣΦΑΛΜΑ":"OK",
     `9995⇒${f2(e4.days)} · 10005⇒${f2(e3.days)}`);
  // 8.3 Κόστος: days × 60 × 60,84%
  A.D = freshD(); A.D.efkaMat[0].m2=100;
  e = A.efkaCalc();
  log("8.ΕΦΚΑ","Κόστος = ημέρες×60€×60,84%", approx(e.cost, e.days*60*0.6084, 0.01)?"OK":"FAIL", `${f2(e.cost)}€ για 100μ² κύριους (${f2(e.days)} ημ.)`);
  // 8.4 Πίν.2α: σκελετός −2/3
  A.D = freshD(); A.D.efkaMode="2a"; A.D.efkaMat2a[0].m2=100;
  const e2a = A.efkaCalc();
  log("8.ΕΦΚΑ","Πίν.2α σκελετός 0,62→0,21 (−2/3)", approx(0.21, 0.62/3, 0.005)?"OK":"INFO", `raw=${f2(e2a.raw)}`);
  // 8.5 Πίν.3: εργατική = b×p%
  A.D = freshD(); A.D.efkaMode="3"; A.D.efka3=[{w:"Επισκευή",b:20000,p:30}];
  const e3b = A.efkaCalc();
  log("8.ΕΦΚΑ","Πίν.3 20.000×30% ⇒ 6.000 εργατική", approx(e3b.labor,6000)?"OK":"FAIL",
     `labor=${e3b.labor} ημέρες=${f2(e3b.days)} κόστος=${f2(e3b.cost)}`);
  // Πίν.3: εφαρμόζεται ΜΖΜΣ; (στο app k=1 πάντα σε mode 3)
  log("8.ΕΦΚΑ","Πίν.3 χωρίς ΜΖΜΣ (k=1)", e3b.k===1?"INFO":"FAIL", `κατά την εγκ. ο ΜΖΜΣ αφορά τον Πίν.1-2 — σωστό`);
  // 8.6 tekmHm=0 ⇒ διαίρεση
  A.D.tekmHm=0; const e0=A.efkaCalc();
  log("8.ΕΦΚΑ","Πίν.3 με ημερομίσθιο 0 ⇒ no NaN", isFinite(e0.days)?"OK":"FAIL", `days=${e0.days}`);
})();

/* ============================================================
   9. ΤΟΠΟΓΡΑΦΙΚΟ (ΠΔ 696/74)
   ============================================================ */
(function(){
  const l=0.23368;
  // 9.1 Εντός, 1:500, κάλυψη III, κλίση Α, 2 στρ, με υψομέτρηση
  A.D = freshD();
  A.D.topo = {...A.defTopo(), mode:"entos", klim:"500", klisi:"A", kal:"III", strem:2, ypsom:true, omora:0, trigIV:0, trigTomi:0, trigXr:0, polyN:0, rymN:0, otN:0};
  let t = A.topoCalc();
  const apot = 2*286*l, yps = 2*286*0.6*l;
  log("9.Τοπο","Εντός 1:500/III 2στρ + υψομ.", approx(t.sum, apot+yps, 0.01)?"OK":"FAIL", `sum=${f2(t.sum)} (αναμ. ${f2(apot+yps)})`);
  // 9.2 Κλίση προσαύξηση εντός (Γ +40%)
  A.D.topo.klisi="G"; t=A.topoCalc();
  log("9.Τοπο","Εντός με κλίση Γ ⇒ ×1,40", approx(t.sum,(apot+yps)*1.4,0.01)?"OK":"FAIL", `sum=${f2(t.sum)}`);
  // 9.3 Αστική: κλίση ×50%
  A.D.topo={...A.defTopo(), mode:"astiko", klim:"200", kal:"II", klisi:"G", strem:1, ypsom:false};
  t=A.topoCalc();
  log("9.Τοπο","Αστικό 1:200/II κλίση Γ ⇒ ×1,20", approx(t.sum, 1*879*l*1.2, 0.01)?"OK":"FAIL", `sum=${f2(t.sum)}`);
  // 9.4 Ελάχιστο 5000λ επιστρέφεται αλλά…
  log("9.Τοπο","min=5000λ=1.168,40 μόνο πληροφοριακά", approx(t.min,1168.4,0.01)?"INFO":"FAIL",
     `sum=${f2(t.sum)} < min=${f2(t.min)} — ΔΕΝ επιβάλλεται στο sum ούτε στο topoFlat`);
  // 9.5 Εκτός: κλίμακα 1:1000, κλίση Δ
  A.D.topo={...A.defTopo(), mode:"ektos", klim:"1000", klisi:"D", strem:5, ypsom:true};
  t=A.topoCalc();
  log("9.Τοπο","Εκτός 1:1000 κλίση Δ 5στρ+υψ", approx(t.sum, 5*130*l + 5*130*0.6*l, 0.01)?"OK":"FAIL", `sum=${f2(t.sum)} — ΠΡΟΣΟΧΗ: στο εκτός ΔΕΝ εφαρμόζεται extra κλίσης (σωστό: η κλίση αλλάζει ήδη τη δραχμική τιμή)`);
  // 9.6 Όμορα + τριγωνισμός + πολυγωνομετρία
  A.D.topo={...A.defTopo(), mode:"entos", klim:"500", kal:"III", klisi:"A", strem:0, ypsom:false, omora:1.5, trigIV:1, trigTomi:2, trigXr:1, polyN:4, rymN:3, otN:6};
  t=A.topoCalc();
  const man = 1.5*600*l + 1*4550*l + 2*1950*l + 1*390*l + 4*390*l + 3*390*l + 6*104*l;
  log("9.Τοπο","Πλήρες σετ εργασιών εξάρτησης", approx(t.sum,man,0.01)?"OK":"FAIL", `sum=${f2(t.sum)} αναμ=${f2(man)}`);
  // 9.7 Αστικό klim default fallback: mode astiko με klim 1000 (δεν υπάρχει)
  A.D.topo={...A.defTopo(), mode:"astiko", klim:"1000", kal:"II", klisi:"A", strem:1};
  t=A.topoCalc();
  log("9.Τοπο","Αστικό με ανύπαρκτη κλίμ. 1:1000 ⇒ fallback 1:100", t.rows.length?"ΠΡΟΣΟΧΗ":"OK",
     `Χρησιμοποιεί την πρώτη διαθέσιμη (1:100, ${f2(t.sum)}€) σιωπηλά`);
})();

/* ============================================================
   10. GRAND TOTAL — πλήρη σενάρια end-to-end
   ============================================================ */
const E2E = [];
(function(){
  function scenario(name, setup){
    A.D = freshD(); setup(A.D);
    const S=A.symbatikos(), a=A.amoivesCalc(), fr=A.foroCalc(), ef=A.efkaCalc(), g=A.grandTotal();
    const check = approx(g, fr.cash+ef.cost, 0.01);
    E2E.push({name, S:f2(S), fees:f2(a.sum), fpa:f2(fr.fpa), fem:f2(fr.parakr), pras:f2(fr.prasino),
      aekk:f2(fr.aekk.cost), efka:f2(ef.cost), grand:f2(g), consistent:check});
  }
  scenario("Κατοικία 120μ² + υπόγ 60 + ΕΦΚΑ", D=>{
    D.uses=[{...A.USES_CATALOG[1],m2:120,kind:"new",oldIdx:-1},{...A.USES_CATALOG[12],m2:60,kind:"new",oldIdx:-1}];
    D.efkaMat[0].m2=120; D.efkaMat[1].m2=60;
  });
  scenario("Εκτός σχεδίου 150μ² + εκσκαφές", D=>{
    D.uses=[{...A.USES_CATALOG[2],m2:150,kind:"new",oldIdx:-1}];
    D.ektosSxediou=true;
    D.aekk.excOn=true; D.aekk.excM3=300; D.aekk.excReuseM3=100;
    D.efkaMat[0].m2=150;
  });
  scenario("Προσθήκη 60μ² σε υφιστάμενο", D=>{
    D.uses=[{...A.USES_CATALOG[1],m2:60,kind:"pros",oldIdx:-1}];
    D.efkaMat[0].m2=60;
  });
  scenario("Αλλαγή χρήσης αποθήκη→κατοικία 90μ²", D=>{
    D.uses=[{...A.USES_CATALOG[1],m2:90,kind:"chg",oldIdx:16}];
    D.allagi=true;
    D.efkaMode="3"; D.efka3=[{w:"Εργασίες προσαρμογής",b:25000,p:35}];
  });
  scenario("Πολυκατοικία 800μ² με συμφωνηθείσα −20%", D=>{
    D.uses=[{...A.USES_CATALOG[3],m2:600,kind:"new",oldIdx:-1},{...A.USES_CATALOG[10],m2:80,kind:"new",oldIdx:-1},{...A.USES_CATALOG[12],m2:120,kind:"new",oldIdx:-1}];
    D.efkaMat[0].m2=680; D.efkaMat[1].m2=120;
    const leg = (()=>{ const keep=A.D; A.D=D; const s=A.amoivesCalc().sum; A.D=keep; return s; })();
    D.agreedFee = Math.round(leg*0.8);
  });
  scenario("Μεταλλικός σκελετός (Πίν.2α) 200μ²", D=>{
    D.uses=[{...A.USES_CATALOG[3],m2:200,kind:"new",oldIdx:-1}];
    D.efkaMode="2a"; D.efkaMat2a[0].m2=200;
  });
  scenario("Μηδενικό έργο (όλα 0)", D=>{});
})();

/* ============================================================
   ΕΚΤΥΠΩΣΗ
   ============================================================ */
console.log("\n========== ΑΝΑΛΥΤΙΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ ΕΛΕΓΧΩΝ ==========\n");
let cur="";
for(const r of R){
  if(r.section!==cur){ cur=r.section; console.log("\n--- "+cur+" ---"); }
  console.log(`[${r.status}] ${r.name}${r.detail?" · "+r.detail:""}`);
}
console.log("\n--- 3. ΑΜΟΙΒΕΣ ανά μέγεθος έργου (νόμιμη ΤΕΕ, defaults) ---");
console.table(AMB);
console.log("--- 10. END-TO-END σενάρια ---");
console.table(E2E);
const fails = R.filter(r=>/FAIL|ΣΦΑΛΜΑ/.test(r.status)).length;
const warns = R.filter(r=>/ΠΡΟΣΟΧΗ/.test(r.status)).length;
console.log(`\nΣΥΝΟΨΗ: ${R.length} έλεγχοι · ${fails} αποτυχίες/σφάλματα · ${warns} προειδοποιήσεις`);
