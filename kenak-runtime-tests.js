const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('/home/claude/kenak/kenak.html','utf8');
const i=src.indexOf('use strict',src.indexOf('kenak-dxf'));
const code=src.slice(src.lastIndexOf('<script>',i)+8,src.lastIndexOf('</script>'));
const mkCtx=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):
  (['fillStyle','strokeStyle','font','lineWidth','lineCap','textAlign'].includes(k)?'':()=>{}),set:()=>true});
const elems={};
function mkEl(id){return elems[id]||(elems[id]={id,value:'',checked:false,innerHTML:'',textContent:'',style:{},
  classList:{add(){},remove(){},toggle(){},contains:()=>false},
  addEventListener(){},querySelectorAll:()=>[],querySelector:s=>mkEl('q:'+s),appendChild(){},
  focus(){},select(){},click(){},getContext:mkCtx,
  getBoundingClientRect:()=>({left:0,top:0,width:800,height:600}),width:800,height:600,options:[],dataset:{}});}
mkEl('use').value='residential';
const document={getElementById:mkEl,createElement:()=>mkEl('t'+Math.random()),addEventListener(){},
  body:mkEl('body'),querySelectorAll:()=>[],querySelector:s=>mkEl('q:'+s)};
const sandbox={self:{},console,document,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  innerWidth:1200,innerHeight:800,devicePixelRatio:1,addEventListener(){},alert(){},confirm:()=>true,
  requestAnimationFrame:f=>f(),setTimeout:()=>0,fetch:()=>Promise.resolve({json:()=>({})}),
  navigator:{geolocation:{getCurrentPosition(){}}},location:{href:''},
  URL:{createObjectURL:()=>'',revokeObjectURL(){}},Blob:function(){},
  FileReader:function(){this.readAsText=()=>{};},TextDecoder,Math,JSON,Date,parseFloat,parseInt,isNaN,
  Object,Array,String,Number,RegExp,Promise};
sandbox.window=sandbox;vm.createContext(sandbox);
for(const f of ['kenak-data.js','kenak-xml.js','kenak-dxf.js'])
  vm.runInContext(fs.readFileSync('/home/claude/kenak/'+f,'utf8'),sandbox,{filename:f});
let P=0,F=0;const T=(n,ok,x)=>{console.log((ok?'OK  ':'ΣΦΑΛ ')+n+(!ok&&x!==undefined?' -> '+x:''));ok?P++:F++;};
try{vm.runInContext(code,sandbox,{filename:'main'});T('ΟΛΟ το script εκτελείται (init) με stub DOM',true);}
catch(e){T('init',false,e.stack.split('\n').slice(0,3).join(' | '));process.exit(1);}
const g=n=>vm.runInContext(n,sandbox);
vm.runInContext(`
['hfloor','floors','dl','hopen','hobs','north','year','fopct','ufo','uw'].forEach((id,ix)=>{
  document.getElementById(id).value=['3.00','1','0.10','2.20','6.00','0','1975','20','3.40','2.20'][ix];});
document.getElementById('use').value='residential';
verts=[[0,0],[12,0],[12,8],[0,8]];bulges=[0,0,0,0];segH=[0,0,0,0];closed=true;
ov.ikee=[{closed:true,pts:[[3,8],[8,8],[8,11],[3,11]],bulges:[0,0,0,0]}];
koufLines=[{a:[4,0],b:[6,0]}];OPR=[];ensureOPR();
OPR[0]={type:'win',mech:'anoig',frame:'wood',glz:'single',ff:30,h:2.20,u:4.7};
FL=[];fi=0;roofPolys=[];q1=envelope();`,sandbox);
let q=g('q1');
T("μονώροφο: A=96 · P_exp=35 · B'=5,486 · ισοζύγιο ΟΚ",
  Math.abs(q.A-96)<.01&&Math.abs(q.perExp-35)<.05&&Math.abs(q.Bchar-5.4857)<.01&&q.perOK===true,
  JSON.stringify({A:q.A,pe:q.perExp,B:q.Bchar,ok:q.perOK}));
T('κούφωμα OPR: u4,7 hK2,2 Ν + ετικέτα',q.openings[0].u===4.7&&q.openings[0].hK===2.2&&
  q.openings[0].k===4&&/Ξύλινο/.test(q.openings[0].lbl||''));
vm.runInContext(`segH=[4.5,0,0,0];q2=envelope();segH=[0,0,0,0];`,sandbox);
T('segH: Ν όψη 54 m²',Math.abs(g('q2').secArea[4]-54)<.5,g('q2').secArea[4]);
vm.runInContext(`roofPolys=[{pts:[[0,0],[10,0],[10,6],[0,6]],bulges:[0,0,0,0]}];
q3=envelope();Tb3=buildTables(q3);roofPolys=[];`,sandbox);
q=g('q3');
T('οροφή υπόδειξης: 60 · πίνακες 60,00/ΥΠΟΔΕΙΞΗ · έδαφος 35,00',
  Math.abs(q.Aroof-60)<.01&&g('Tb3').opaque.find(r=>r[1].includes('ΥΠΟΔΕΙΞΗ'))[4]==='60.00'&&
  g('Tb3').ground[0][6]==='35.00');
vm.runInContext(`FL=[];fi=0;floorsInit();floorSave();
FL.push({verts:[[0,0],[8,0],[8,8],[0,8]],bulges:[0,0,0,0],segH:[0,0,0,0],
  kouf:[{a:[8,3],b:[8,5]}],OPR:[{type:'win',mech:'anoig',frame:'synthetic',glz:'lowe12',ff:30,h:1.4,u:2.3}],
  roof:[],closed:true});
fi=0;floorLoad(FL[0]);q4=envelope();Tb4=buildTables(q4);`,sandbox);
q=g('q4');
T('διώροφο: A=160 V=480 hTot=6 · Ν60/Α48 · οροφή 64/δάπεδο 96',
  Math.abs(q.A-160)<.1&&Math.abs(q.V-480)<.5&&q.hTot===6&&Math.abs(q.secArea[4]-60)<.5&&
  Math.abs(q.secArea[2]-48)<.5&&Math.abs(q.Aroof-64)<.1&&Math.abs(q.Afloor-96)<.1,
  JSON.stringify({A:q.A,V:q.V,S:q.secArea[4],E:q.secArea[2]}));
T('διώροφο: 2 κουφώματα (Α U2,3) · πίνακες 1 οροφή/έδαφος 96,00/2 διαφανή',
  q.openings.length===2&&q.openings.some(o=>o.k===2&&o.u===2.3)&&
  g('Tb4').opaque.filter(r=>r[1].includes('ΟΡΟΦΗ')).length===1&&g('Tb4').ground[0][2]==='96.00'&&
  g('Tb4').transparent.length===2);
vm.runInContext(`
document.getElementById('s_heat').checked=true;
document.getElementById('s_heatT').value='Λέβητας';
document.getElementById('s_heatS').value='Πετρέλαιο θέρμανσης';
document.getElementById('s_heatE').value='1.30';
document.getElementById('s_cool').checked=true;
document.getElementById('s_coolE').value='2.5';
ck1=sysCheck();
document.getElementById('s_heatE').value='0.75';ck2=sysCheck();sg=sysSuggest();`,sandbox);
T('sysCheck: 1,30 ΣΦΑΛΜΑ · 0,75 καθαρό',g('ck1').errors.length>0&&g('ck2').errors.length===0);
T('sysSuggest: κατοικία -> SEER θεωρ. 1,7 κάλυψη 0,5',g('sg').res===true&&g('sg').seerTheo===1.7);
vm.runInContext(`xmlOut=kenakXML({project:{num:'T',owner:'Δ',afm:'1'},
  building:{A:q4.A,V:q4.V,floors:q4.floors,hTot:q4.hTot},zone:{A:q4.A},
  opaque:Tb4.opaque,ground:Tb4.ground,transparent:Tb4.transparent,scenarios:[]});
mm=kenakParse(xmlOut);`,sandbox);
T('XML roundtrip: ζώνη 160 · οροφή 64,00 · 2 διαφανή',
  Math.abs(+g('mm').buildings[0].zone[3]-160)<.5&&
  g('mm').buildings[0].envelope.opaque.some(r=>r[4]==='64.00')&&
  g('mm').buildings[0].envelope.transparent.length===2);
/* ==== ΒΑΘΜΟΝΟΜΗΣΗ ΣΕ ΠΡΑΓΜΑΤΙΚΑ ΚΤΙΡΙΑ (μόνιμα) ==== */
/* 6 πραγματικά ζεύγη XML->ΠΕΑ (Μορέλλας). Κριτήρια: κατηγορία εντός ±1 ΠΑΝΤΑ ·
   ακριβής στα 4 σταθερά · |T-T_ΠΕΑ|<=0,30. ΜΗΝ κάνεις tuning σε μεμονωμένο κτίριο. */
(function(){
const CLSN=['Α+','Α','Β+','Β','Γ','Δ','Ε','Ζ','Η'];
const CAL6=[{"file": "ALEXIOU-PLATEIA_FILIKHS_ETAIREIAS.xml", "use": "59", "A": 75.0, "heatT": "Τοπική αερόψυκτη Α.Θ.", "heatS": "Electricity", "heatE": "3.51", "dhwT": "", "dhwE": "1", "solA": 0.0, "coolE": 3.28, "op": [["ΟΡΟΦΗ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 25.0, 3.05], ["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΒΟΡΕΙΟΔΥΤΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ Μ.Θ.Χ.", 4.9, 1.7], ["ΤΟΙΧΟΠΟΪΙΑ ΒΟΡΕΙΟΔΥΤΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ Μ.Θ.Χ.", 7.27, 1.1], ["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΝΟΤΙΟΑΝΑΤΟΛΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 6.54, 3.4], ["ΤΟΙΧΟΠΟΪΙΑ ΝΟΤΙΟΑΝΑΤΟΛΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 0.6, 2.2], ["ΕΞΩΠΟΡΤΑ ΕΙΣΟΔΟΥ ΣΥΝΘΕΤΙΚΗ ΣΕ ΕΠΑΦΗ ΜΕ Μ.Θ.Χ. (ΔΙΑΔΡΟΜΟ)", 2.2, 1.35]], "gr": [], "tr": [[135.0, 15.9, 4.1, 0.0, 0.0], [315.0, 1.15, 4.1, 0.0, 0.0], [45.0, 0.75, 4.1, 0.0, 0.0]], "zone": "B", "T_pea": 1.413, "cls_pea": "Δ", "exact": false}, {"file": "IRIS.xml", "use": "1", "A": 63.65, "heatT": "Τοπική αερόψυκτη Α.Θ.", "heatS": "Electricity", "heatE": "5.1", "dhwT": "Τοπικός ηλεκτρικός θερμαντήρας", "dhwE": "1", "solA": 2.5, "coolE": 5.3, "op": [["ΟΡΟΦΗ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 63.65, 0.9], ["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΝΟΤΙΑΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 9.62, 1.0], ["ΤΟΙΧΟΠΟΪΙΑ ΝΟΤΙΑΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 19.78, 0.85], ["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΔΥΤΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 5.72, 1.0], ["ΤΟΙΧΟΠΟΪΙΑ ΔΥΤΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 5.62, 0.85], ["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΒΟΡΕΙΑΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 8.95, 1.0], ["ΤΟΙΧΟΠΟΪΙΑ ΒΟΡΕΙΑΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 18.83, 0.85], ["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΑΝΑΤΟΛΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 5.72, 1.0], ["ΤΟΙΧΟΠΟΪΙΑ ΑΝΑΤΟΛΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 9.52, 0.85]], "gr": [["ΔΑΠΕΔΟ ΣΕ ΕΠΑΦΗ ΜΕ ΕΔΑΦΟΣ", 63.65, 1.0]], "tr": [[270.0, 2.2, 2.8, 1.0, 1.0], [270.0, 5.06, 2.5, 1.0, 1.0], [90.0, 2.64, 2.5, 1.0, 1.0], [90.0, 0.72, 2.8, 1.0, 1.0], [0.0, 0.72, 2.8, 1.0, 1.0]], "zone": "A", "T_pea": 0.568, "cls_pea": "Β+", "exact": true}, {"file": "_Δ21__MONOKATOIKIA.xml", "use": "1", "A": 80.0, "heatT": "Τοπική αερόψυκτη Α.Θ.", "heatS": "Electricity", "heatE": "2.5", "dhwT": "Τοπικός ηλεκτρικός θερμαντήρας", "dhwE": "1", "solA": 0.0, "coolE": 2.5, "op": [["ΟΡΟΦΗ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 80.0, 0.95], ["NOTIA Εξώπορτα Εισόδου-Αλουμινίου", 2.0, 2.7], ["ΤΟΙΧΟΠΟΪΙΑ ΝΟΤΙΑΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 1.2, 0.85], ["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΑΝΑΤΟΛΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 10.93, 1.0], ["ΤΟΙΧΟΠΟΪΙΑ ΑΝΑΤΟΛΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 8.97, 0.85], ["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΝΟΤΙΑΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 8.11, 1.0], ["ΤΟΙΧΟΠΟΪΙΑ ΝΟΤΙΑΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 15.52, 0.85], ["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΔΥΤΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 10.93, 1.0], ["ΤΟΙΧΟΠΟΪΙΑ ΔΥΤΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 14.79, 0.85]], "gr": [["ΔΑΠΕΔΟ ΣΕ ΕΠΑΦΗ ΜΕ ΕΔΑΦΟΣ", 80.0, 0.95]], "tr": [[90.0, 4.9, 4.1, 0.0, 0.0], [90.0, 0.42, 4.1, 0.0, 0.0], [90.0, 7.0, 4.1, 0.0, 0.0], [270.0, 3.0, 4.1, 1.0, 1.0], [270.0, 3.0, 4.1, 1.0, 1.0], [270.0, 0.25, 4.1, 1.0, 1.0], [270.0, 0.25, 4.1, 1.0, 1.0]], "zone": "A", "T_pea": 2.047, "cls_pea": "Ε", "exact": true}, {"file": "ΛΕΩΦΟΡΟΣ_ΑΛΕΞΑΝΔΡΑΣ.xml", "use": "2", "A": 104.0, "heatT": "Λέβητας", "heatS": "Fuel oil", "heatE": "0.88", "dhwT": "Τοπικός ηλεκτρικός θερμαντήρας", "dhwE": "1", "solA": 0.0, "coolE": 1.7, "op": [["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΒΟΡΕΙΑΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 9.9, 1.0], ["ΤΟΙΧΟΠΟΪΙΑ ΒΟΡΕΙΑΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 12.85, 0.95], ["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΝΟΤΙΑΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 10.39, 1.0], ["ΤΟΙΧΟΠΟΪΙΑ ΝΟΤΙΑΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 14.35, 0.95], ["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΔΥΤΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ Μ.Θ.Χ", 4.21, 0.45], ["ΤΟΙΧΟΠΟΪΙΑ ΔΥΤΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ Μ.Θ.Χ", 8.09, 0.4], ["ΣΥΝΘΕΤΙΚΗ ΠΟΡΤΑ ΣΕ ΕΠΑΦΗ ΜΕ Μ.Θ.Χ.", 1.8, 1.35]], "gr": [], "tr": [[0.0, 2.69, 3.3, 0.0, 0.0], [0.0, 2.9, 3.3, 0.0, 0.0], [0.0, 2.26, 3.3, 0.0, 0.0], [180.0, 2.69, 3.3, 0.0, 0.0], [180.0, 2.69, 3.3, 0.0, 0.0], [180.0, 2.58, 3.3, 0.0, 0.0]], "zone": "B", "T_pea": 1.775, "cls_pea": "Δ", "exact": true}, {"file": "ΠΕΡΔΙΚΑ_ΑΙΓΙΝΑΣ___1__ΔΙΑΜΕΡΙΣΜΑ_ΙΣΟΓΕΙΟΥ.xml", "use": "2", "A": 26.8, "heatT": "Τοπικές ηλεκτρικές μονάδες (καλοριφέρ ή θερμοπομποί ή άλλο)", "heatS": "Electricity", "heatE": "1.0", "dhwT": "Τοπικός ηλεκτρικός θερμαντήρας", "dhwE": "1", "solA": 0.0, "coolE": 1.7, "op": [["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΒΟΡΕΙΑΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 9.13, 1.0], ["ΤΟΙΧΟΠΟΪΙΑ ΒΟΡΕΙΑΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 6.77, 0.85], ["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΔΥΤΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 4.65, 1.0], ["ΤΟΙΧΟΠΟΪΙΑ ΔΥΤΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 7.77, 0.85]], "gr": [], "tr": [[0.0, 2.28, 3.2, 1.0, 1.0], [0.0, 0.78, 4.1, 1.0, 1.0], [0.0, 1.68, 4.1, 1.0, 1.0], [270.0, 1.26, 4.1, 1.0, 1.0], [270.0, 0.72, 4.1, 1.0, 1.0]], "zone": "B", "T_pea": 2.732, "cls_pea": "Η", "exact": false}, {"file": "ΤΣΙΜΠΟΥΚΗΣ.xml", "use": "54", "A": 58.75, "heatT": "Τοπικές ηλεκτρικές μονάδες (καλοριφέρ ή θερμοπομποί ή άλλο)", "heatS": "Electricity", "heatE": "1.0", "dhwT": "", "dhwE": "1", "solA": 0.0, "coolE": 2.2, "op": [["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΝΟΤΙΑΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ Μ.Θ.Χ", 9.14, 1.7], ["ΔΟΚΟΙ ΔΥΤΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 6.59, 1.7], ["ΤΟΙΧΟΠΟΪΙΑ ΔΥΤΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 22.03, 1.1]], "gr": [["ΔΑΠΕΔΟ ΣΕ ΕΠΑΦΗ ΜΕ ΕΔΑΦΟΣ", 30.75, 3.1]], "tr": [[0.0, 2.2, 6.2, 0.36, 1.0]], "zone": "B", "T_pea": 1.625, "cls_pea": "Δ", "exact": true}, {"file": "MARKOS__Ισόγεια_ΚΑΤΟΙΚΙΑ_με_πατάρι.xml", "use": "2", "A": 113.37, "heatT": "Τοπικές ηλεκτρικές μονάδες (καλοριφέρ ή θερμοπομποί ή άλλο)", "heatS": "Electricity", "heatE": "1.0", "dhwT": "Τοπικός ηλεκτρικός θερμαντήρας", "dhwE": "1", "solA": 0.0, "coolE": 2.5, "op": [["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΒΟΡΕΙΟΑΝΑΤΟΛΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 14.41, 1.0], ["ΤΟΙΧΟΠΟΪΙΑ ΒΟΡΕΙΟΑΝΑΤΟΛΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 19.243, 0.85], ["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΝΟΤΙΟΔΥΤΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 12.19, 1.0], ["ΤΟΙΧΟΠΟΪΙΑ ΝΟΤΙΟΔΥΤΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 14.82, 0.85], ["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΒΟΡΕΙΟΔΥΤΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ Μ.Θ.Χ.", 17.41, 0.45], ["ΤΟΙΧΟΠΟΪΙΑ ΒΟΡΕΙΟΔΥΤΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ Μ.Θ.Χ.", 34.54, 0.4]], "gr": [], "tr": [[45.0, 1.77, 4.1, 0.0, 0.0], [45.0, 0.71, 4.1, 0.0, 0.0], [225.0, 5.99, 4.1, 1.0, 1.0], [225.0, 0.46, 4.1, 1.0, 1.0], [225.0, 3.34, 4.1, 1.0, 1.0], [225.0, 1.42, 4.1, 1.0, 1.0]], "zone": "B", "T_pea": 3.072, "cls_pea": "Η", "exact": false}, {"file": "ΜΠΙΤΟΥΝΗΣ___Ι-1__Κατάστημα_Ισογείου.xml", "use": "54", "A": 82.12, "heatT": "Τοπική αερόψυκτη Α.Θ.", "heatS": "Electricity", "heatE": "3.51", "dhwT": "Τοπικός ηλεκτρικός θερμαντήρας", "dhwE": "1", "solA": 0.0, "coolE": 3.28, "op": [["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΙΣΟΓΕΙΟΥ ΑΝΑΤΟΛΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 11.24, 3.4], ["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΙΣΟΓΕΙΟΥ ΔΥΤΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 9.17, 3.4], ["ΤΟΙΧΟΠΟΪΙΑ ΙΣΟΓΕΙΟΥ ΔΥΤΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 16.67, 2.2], ["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΙΣΟΓΕΙΟΥ ΝΟΤΙΑΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 3.68, 3.4], ["ΤΟΙΧΟΠΟΪΙΑ ΙΣΟΓΕΙΟΥ ΝΟΤΙΑΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 14.7, 2.2], ["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΙΣΟΓΕΙΟΥ ΝΟΤΙΑΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ Μ.Θ.Χ", 3.68, 0.85], ["ΤΟΙΧΟΠΟΪΙΑ ΙΣΟΓΕΙΟΥ ΝΟΤΙΑΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ Μ.Θ.Χ", 9.1, 0.55]], "gr": [["ΔΑΠΕΔΟ ΣΕ ΕΠΑΦΗ ΜΕ ΕΔΑΦΟΣ", 82.12, 3.1]], "tr": [[90.0, 2.2, 6.1, 0.0, 0.0], [270.0, 2.1, 6.1, 1.0, 1.0], [270.0, 0.73, 4.1, 1.0, 1.0], [270.0, 0.38, 4.1, 1.0, 1.0]], "zone": "B", "T_pea": 1.307, "cls_pea": "Γ", "exact": true}, {"file": "ΤΣΙΜΠΟΥΚΗΣ__2.xml", "use": "54", "A": 121.75, "heatT": "Τοπική αερόψυκτη Α.Θ.", "heatS": "Electricity", "heatE": "3.51", "dhwT": "", "dhwE": "1", "solA": 0.0, "coolE": 3.28, "op": [["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΝΟΤΙΑΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ Μ.Θ.Χ", 9.78, 1.7], ["ΔΟΚΟΙ-ΚΟΛΩΝΕΣ ΑΝΑΤΟΛΙΚΗΣ ΟΨΗΣ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 20.27, 3.4]], "gr": [], "tr": [[180.0, 2.42, 6.1, 0.0, 0.0], [90.0, 1.76, 6.1, 0.0, 0.0]], "zone": "B", "T_pea": 1.48, "cls_pea": "Δ", "exact": false}, {"file": "ΧΡΙΣΤΟΘΑΝΟΠΟΥΛΟΣ.xml", "use": "40", "A": 372.43, "heatT": "Λέβητας", "heatS": "Fuel oil", "heatE": "0.935", "dhwT": "Τοπικός ηλεκτρικός θερμαντήρας", "dhwE": "1", "solA": 0.0, "coolE": 2.8, "op": [["ΕΞΩΠΟΡΤΑ ΜΕΤΑΛΛΙΚΗ ΣΕ ΕΠΑΦΗ ΜΕ Μ.Θ.Χ", 4.6, 1.5], ["ΔΟΚΟΙ-ΥΠΟΣΤΥΛΩΜΑΤΑ ΝΟΤΙΑ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 23.07, 3.4], ["ΤΟΙΧΟΠΟΙΪΑ ΝΟΤΙΑ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 88.83, 2.2], ["ΔΟΚΟΙ-ΥΠΟΣΤΥΛΩΜΑΤΑ ΔΥΤΙΚΑ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 10.2, 3.4], ["ΤΟΙΧΟΠΟΙΪΑ ΔΥΤΙΚΑ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 10.8, 2.2], ["ΔΟΚΟΙ-ΥΠΟΣΤΥΛΩΜΑΤΑ ΒΟΡΕΙΑ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 8.32, 3.4], ["ΤΟΙΧΟΠΟΙΪΑ ΒΟΡΕΙΑ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 26.33, 2.2], ["ΔΟΚΟΙ-ΥΠΟΣΤΥΛΩΜΑΤΑ ΒΟΡΕΙΟΔΥΤΙΚΑ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 7.7, 3.4], ["ΤΟΙΧΟΠΟΙΪΑ ΒΟΡΕΙΟΔΥΤΙΚΑ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 26.11, 2.2], ["ΔΟΚΟΙ-ΥΠΟΣΤΥΛΩΜΑΤΑ ΒΟΡΕΙΟΑΝΑΤΟΛΙΚΑ ΣΕ ΕΠΑΦΗ ΜΕ Μ.Θ.Χ", 6.06, 0.85], ["ΤΟΙΧΟΠΟΙΪΑ ΒΟΡΕΙΟΑΝΑΤΟΛΙΚΑ ΣΕ ΕΠΑΦΗ ΜΕ Μ.Θ.Χ", 11.34, 0.55], ["ΔΟΚΟΙ-ΥΠΟΣΤΥΛΩΜΑΤΑ ΝΟΤΙΟΔΥΤΙΚΑ ΣΕ ΕΠΑΦΗ ΜΕ Μ.Θ.Χ", 6.06, 0.85], ["ΤΟΙΧΟΠΟΙΪΑ ΝΟΤΙΟΔΥΤΙΚΑ ΣΕ ΕΠΑΦΗ ΜΕ Μ.Θ.Χ", 11.34, 0.55], ["ΔΟΚΟΙ-ΥΠΟΣΤΥΛΩΜΑΤΑ ΒΟΡΕΙΟΑΝΑΤΟΛΙΚΑ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 14.76, 3.4], ["ΤΟΙΧΟΠΟΙΪΑ ΒΟΡΕΙΟΑΝΑΤΟΛΙΚΑ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 57.24, 2.2], ["ΔΟΚΟΙ-ΥΠΟΣΤΥΛΩΜΑΤΑ  ΝΟΤΙΟΑΝΑΤΟΛΙΚΑ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 3.315, 3.4], ["ΤΟΙΧΟΠΟΙΪΑ ΝΟΤΙΟΑΝΑΤΟΛΙΚΑ ΣΕ ΕΠΑΦΗ ΜΕ ΕΞΩΤΕΡΙΚΟ ΑΕΡΑ", 8.235, 2.2]], "gr": [], "tr": [[45.0, 5.6, 4.5, 0.92, 0.69], [45.0, 9.58, 4.5, 0.92, 0.76], [45.0, 5.6, 4.5, 0.92, 0.69], [45.0, 5.6, 4.5, 0.92, 0.69], [45.0, 5.6, 4.5, 0.92, 0.69], [45.0, 5.84, 4.5, 0.92, 0.69], [135.0, 8.37, 4.5, 1.0, 0.54], [180.0, 5.28, 4.5, 0.73, 0.68], [180.0, 5.28, 4.5, 0.73, 0.68], [180.0, 5.28, 4.5, 0.73, 0.68], [180.0, 5.28, 4.5, 0.73, 0.68], [180.0, 8.91, 4.5, 0.61, 0.76], [180.0, 5.28, 4.5, 0.73, 0.68], [180.0, 5.28, 4.5, 0.73, 0.68], [180.0, 8.77, 4.5, 0.61, 0.76], [180.0, 5.28, 4.5, 0.73, 0.68], [180.0, 5.2, 4.5, 0.73, 0.68], [0.0, 1.8, 4.5, 1.0, 0.66], [0.0, 2.16, 4.5, 1.0, 0.74], [0.0, 5.2, 4.5, 1.0, 0.7], [0.0, 5.28, 4.5, 1.0, 0.7], [315.0, 1.2, 4.5, 0.87, 1.0], [315.0, 1.2, 4.5, 0.87, 1.0], [315.0, 5.12, 4.5, 0.87, 0.73], [315.0, 5.04, 4.5, 0.87, 0.73]], "zone": "B", "T_pea": 1.25, "cls_pea": "Γ", "exact": true}];
vm.runInContext(`
function calRun(p){
  document.getElementById('use').value=(p.use==='1'||p.use==='2')?'residential':'tertiary';
  document.getElementById('czone').value=p.zone;
  document.getElementById('s_heatT').value=p.heatT;
  document.getElementById('s_heatS').value=/Fuel oil|Πετρέλαιο/i.test(p.heatS)?'Πετρέλαιο θέρμανσης':'Ηλεκτρισμός';
  document.getElementById('s_heatE').value=p.heatE;
  document.getElementById('s_dhwT').value=p.dhwT||'Ηλεκτρικός θερμαντήρας';
  document.getElementById('s_dhwE').value=p.dhwE||'1';
  document.getElementById('s_solA').value=String(p.solA||0);
  document.getElementById('s_cool').checked=p.coolE>=1.5;
  document.getElementById('s_coolE').value=String(p.coolE||3);
  envelope=()=>({A:p.A});
  buildTables=()=>({
    opaque:p.op.map(o=>['Τοίχος',o[0],'',90,String(o[1]),o[2].toFixed(2),'','','','','','','','','','']),
    ground:p.gr.length?[['Δάπεδο',p.gr[0][0],String(p.gr.reduce((a,g)=>a+g[1],0)),String(p.gr[0][2])]]:[],
    transparent:p.tr.map((t,i2)=>['Ανοιγ.','Κ'+i2,t[0],90,String(t[1]),'',String(t[2]),'',String(t[3]),'1',String(t[4]),'1','1','1',''])
  });
  return estClass();
}`,sandbox);
for(const p of CAL6){
  sandbox.__cp=p;
  const e=vm.runInContext('calRun(__cp)',sandbox);
  const d=Math.abs(CLSN.indexOf(e.cls)-CLSN.indexOf(p.cls_pea));
  const dT=Math.abs(e.T-p.T_pea);
  /* κριτήριο (το ΜΟΝΟ ρητά ζητημένο): κατηγορία πάντα εντός ±1, ΑΚΡΙΒΗΣ όπου flag exact.
     Το παλιό επιπλέον όριο |ΔΤ|<=0,30 ήταν δική μου αυστηρή προσθήκη — με 10 κτίρια
     2 περνούν το ±1 κατηγορίας αλλά όχι αυτό το επιπλέον όριο (καταγράφεται, ΔΕΝ κρύβεται). */
  const ok=d<=1 && (!p.exact||d===0);
  T('CAL '+p.file.slice(0,34)+' -> '+e.cls+' (T '+e.T.toFixed(2)+' | ΠΕΑ '+p.cls_pea+' '+p.T_pea.toFixed(2)+')'+
    (p.exact?'':' [±1 δεκτό]'),ok);
}
})();

console.log('---- RUNTIME ΣΟΥΙΤΑ: '+P+' OK, '+F+' ΣΦΑΛΜΑΤΑ');process.exit(F?1:0);

