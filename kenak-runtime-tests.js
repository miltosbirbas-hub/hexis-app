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
(function(){
const CAL=[
 {name:'ΤΣΙΜΠΟΥΚΗΣ κατάστημα (ΤΕΕ-ΚΕΝΑΚ: Δ — ΕΠΙΒΕΒΑΙΩΜΕΝΟ)',expect:'Δ',hard:true,
  use:'tertiary',zone:'B',heatT:'Ηλεκτρικές μονάδες',heatS:'Ηλεκτρισμός',heatE:'1.0',
  dhwT:'Ηλεκτρικός θερμαντήρας',dhwE:'1.0',solA:'0',A:58.75,
  op:[['ΜΘΧ ΝΟΤΙΑ',9.14,3.40*0.60],['ΔΟΚΟΙ ΔΥΤ',6.59,1.70],['ΤΟΙΧΟΠ ΔΥΤ',22.03,1.10]],
  gr:[30.75,3.10],tr:[[180,2.20,6.2,0.46,0.93]]},
 {name:'ΛΕΥΚΑΔΑ Ι-3 (snapshot Γ — ΕΚΚΡΕΜΕΙ επίσημη επιβεβαίωση)',expect:'Γ',hard:false,
  use:'residential',zone:'B',heatT:'Α.Θ. αερόψυκτη',heatS:'Ηλεκτρισμός',heatE:'4.89',
  dhwT:'Ηλεκτρικός θερμαντήρας',dhwE:'1.0',solA:'1.2',A:114.89,
  op:[['Τ',130.64,0.40],['ΟΡΟΦΗ ΜΟΝΩΜΕΝΗ',63.77,0.40]],gr:[63.77,0.40],
  tr:[[225,21.63,1.49,1,1],[315,15.20,1.95,1,1],[45,5.39,2.09,1,1],[135,9.20,1.62,1,1]]}
];
for(const c of CAL){
  vm.runInContext(`
document.getElementById('use').value='${c.use}';
document.getElementById('czone').value='${c.zone}';
document.getElementById('s_heatT').value='${c.heatT}';
document.getElementById('s_heatS').value='${c.heatS}';
document.getElementById('s_heatE').value='${c.heatE}';
document.getElementById('s_dhwT').value='${c.dhwT}';
document.getElementById('s_dhwE').value='${c.dhwE}';
document.getElementById('s_solA').value='${c.solA}';
envelope=()=>({A:${c.A}});
buildTables=()=>({
  opaque:${JSON.stringify(c.op)}.map(o=>['Τοίχος',o[0],'',90,String(o[1]),o[2].toFixed(2),'','','','','','','','','','']),
  ground:[['Δάπεδο','ΕΔΑΦΟΣ',String(${JSON.stringify(c.gr)}[0]),String(${JSON.stringify(c.gr)}[1])]],
  transparent:${JSON.stringify(c.tr)}.map((t,i2)=>['Ανοιγ.','Κ'+i2,t[0],90,String(t[1]),'',String(t[2]),'',String(t[3]),'1',String(t[4]),'1','1','1',''])
});
calE=estClass();`,sandbox);
  const e=vm.runInContext('calE',sandbox);
  const ok=e.cls===c.expect;
  T('CAL '+c.name+' -> '+e.cls+' (T '+e.T.toFixed(2)+')'+(c.hard?'':' [snapshot]'),ok);
}
})();

console.log('---- RUNTIME ΣΟΥΙΤΑ: '+P+' OK, '+F+' ΣΦΑΛΜΑΤΑ');process.exit(F?1:0);

