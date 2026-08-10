/* ============================================================
   HEXIS KENAK — kenak-xml.js  v0.2
   Writer XML στη μορφή ENR_IN του ΤΕΕ-ΚΕΝΑΚ 1.31 (reverse-engineered
   από πραγματικό αρχείο επιθεώρησης).
   ΚΑΝΟΝΕΣ ΜΟΡΦΗΣ (όπως στο πρωτότυπο):
   - UTF-8 με BOM, ΜΙΑ γραμμή, δήλωση <?xml version="1.0"?>
   - Ρίζα <ENR_IN>: EPA_NR_PROJECT(rid="#1"), LIBRARIES(rid="#2"),
     BUILDING(rid=1)... (ένα BUILDING ανά σενάριο)
   - Οι πίνακες αποθηκεύονται ΚΑΤΑ ΣΤΗΛΕΣ: <X_rows>N</X_rows> και
     <X_columnK>τιμή1,τιμή2,...,τιμήN,</X_columnK> — ΠΑΝΤΑ trailing κόμμα.
   - Προσανατολισμός = αζιμούθιο σε μοίρες από Βορρά δεξιόστροφα
     (45=ΒΑ, 135=ΝΑ, 225=ΝΔ, 315=ΒΔ)· κλίση 90=κατακόρυφο, 0=οριζόντιο.
   - Στήλες αδιαφανών: 1 τύπος, 2 περιγραφή, 3 προσανατολισμός, 4 κλίση,
     5 εμβαδόν, 6 U, 7 σταθ. 0.04, 8 απορροφητικότητα α, 9 εκπομπή ε,
     10-15 συντ. σκίασης (χειμ/θέρος × ορίζοντας/πρόβολοι/πλευρικά), 16 κενή.
   - Στήλες εδάφους: 1 τύπος, 2 περιγραφή, 3 εμβαδόν, 4 U, 5 βάθος,
     6 κενή, 7 εκτεθειμένη περίμετρος, 8 κενή.
   - Στήλες διαφανών: 1 τύπος, 2 περιγραφή, 3 προσανατολισμός, 4 κλίση,
     5 εμβαδόν, 6 τύπος κουφώματος (κείμενο βιβλιοθήκης), 7 U,
     8-14 συντ. σκίασης/λοιπά, 15 κενή.
   ============================================================ */
'use strict';
var KENAK_SYSTEM_SPEC = {"heating": ["heating_exists", "production_rows", "production_column1", "production_column2", "production_column3", "production_column4", "production_column5", "production_column6", "production_column7", "production_column8", "production_column9", "production_column10", "production_column11", "production_column12", "production_column13", "production_column14", "production_column15", "production_column16", "production_column17", "production_column18", "distribution_rows", "distribution_column1", "distribution_column2", "distribution_column3", "distribution_column4", "distribution_column5", "distribution_column6", "distribution_column7", "distribution_column8", "termatic_rows", "termatic_column1", "termatic_column2", "termatic_column3", "auxiliary_rows", "auxiliary_column1", "auxiliary_column2", "auxiliary_column3"], "cooling": ["cooling_exists", "production_rows", "production_column1", "production_column2", "production_column3", "production_column4", "production_column5", "production_column6", "production_column7", "production_column8", "production_column9", "production_column10", "production_column11", "production_column12", "production_column13", "production_column14", "production_column15", "production_column16", "production_column17", "production_column18", "distribution_rows", "distribution_column1", "distribution_column2", "distribution_column3", "distribution_column4", "distribution_column5", "distribution_column6", "termatic_rows", "termatic_column1", "termatic_column2", "termatic_column3", "auxiliary_rows", "auxiliary_column1", "auxiliary_column2", "auxiliary_column3"], "humidification": ["humidification_exists", "production_rows", "production_column1", "production_column2", "production_column3", "production_column4", "production_column5", "production_column6", "production_column7", "production_column8", "production_column9", "production_column10", "production_column11", "production_column12", "production_column13", "production_column14", "production_column15", "production_column16", "production_column17", "distribution_rows", "distribution_column1", "distribution_column2", "distribution_column3", "distribution_column4", "termatic_rows", "termatic_column1", "termatic_column2", "termatic_column3"], "ahu": ["ahu_exists", "ahu_rows", "ahu_column1", "ahu_column2", "ahu_column3", "ahu_column4", "ahu_column5", "ahu_column6", "ahu_column7", "ahu_column8", "ahu_column9", "ahu_column10", "ahu_column11", "ahu_column12", "ahu_column13", "ahu_column14", "ahu_column15", "ahu_column16"], "dhw": ["dhw_exists", "production_rows", "production_column1", "production_column2", "production_column3", "production_column4", "production_column5", "production_column6", "production_column7", "production_column8", "production_column9", "production_column10", "production_column11", "production_column12", "production_column13", "production_column14", "production_column15", "production_column16", "production_column17", "distribution_rows", "distribution_column1", "distribution_column2", "distribution_column3", "distribution_column4", "distribution_column5", "termatic_rows", "termatic_column1", "termatic_column2", "termatic_column3", "auxiliary_rows", "auxiliary_column1", "auxiliary_column2", "auxiliary_column3"], "solar_collector": ["solar_collector_exists", "solar_collector_rows", "solar_collector_column1", "solar_collector_column2", "solar_collector_column3", "solar_collector_column4", "solar_collector_column5", "solar_collector_column6", "solar_collector_column7", "solar_collector_column8", "solar_collector_column9", "solar_collector_column10"], "lighting": ["lighting_exists", "lighting_parameter1", "lighting_parameter2", "lighting_parameter3", "lighting_parameter4", "lighting_parameter5", "lighting_parameter6", "lighting_parameter7", "lighting_parameter8", "lighting_parameter9", "lighting_parameter10", "lighting_parameter11", "lighting_parameter12"]};

function kx_esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function kx_el(tag,val,attr){
  var a=attr?' '+attr:'';
  if(val==null||val==='')return '<'+tag+a+' />';
  return '<'+tag+a+'>'+kx_esc(val)+'</'+tag+'>';
}
/* πίνακας κατά στήλες: rows[i][k] -> X_rows + X_columnK (trailing κόμμα) */
function kx_table(prefix,rows,nCols){
  var out=kx_el(prefix+'_rows',rows.length||0,null);
  for(var k=1;k<=nCols;k++){
    var vals='';
    if(rows.length){
      for(var i=0;i<rows.length;i++)
        vals+=String(rows[i][k-1]==null?'':rows[i][k-1])+',';
    }
    out+=kx_el(prefix+'_column'+k,vals,null);
  }
  return out;
}
/* κενό υποσύστημα (exists=0) με ΟΛΑ τα πεδία στη σωστή σειρά */
function kx_emptySystem(name){
  var out='<'+name+' rid="1">';
  KENAK_SYSTEM_SPEC[name].forEach(function(f){
    var v='';
    if(/_exists$/.test(f))v='0';
    else if(/_rows$/.test(f))v='0';
    out+=(v==='')?('<'+f+' />'):('<'+f+'>'+v+'</'+f+'>');
  });
  return out+'</'+name+'>';
}

/* ---------- κύριος writer ----------
   model = { project:{use,part,num,kaek,owner,ownership,address,resp,
                      respName,respPhone,respMail,zone,height,climate,
                      datasource,licence},
             building:{A,Aheat,floors,V,Vheat,hTot,name,scenario},
             zone:{use,A,days?,ach?},
             opaque:[[...16 στήλες...]], ground:[[...8]], transparent:[[...15]] } */

/* ---- SYSTEM tables (δομή 1:1 με export ΤΕΕ-ΚΕΝΑΚ 1.31 / ΤΟΤΕΕ 20701-4 πίν.11.x) ----
   Σειριοποίηση COLUMN-MAJOR: production_columnK = "τιμή_γρ1,τιμή_γρ2,...," (τρέιλινγκ κόμμα). */
function kx_ctable(name,rows,ncols){
  var x='<'+name+'_rows>'+rows.length+'</'+name+'_rows>';
  for(var c=1;c<=ncols;c++){
    var vals=rows.map(function(r){var v=r[c-1];return v==null?'':String(v);});
    x+=kx_el(name+'_column'+c,vals.join(',')+',');
  }
  return x;
}
var KX_SRC_INTERNAL={'Ηλεκτρισμός':'Electricity','Φυσικό αέριο':'NaturalGas','Υγραέριο':'LPG',
  'Πετρέλαιο θέρμανσης':'Oil','Πετρέλαιο κίνησης':'Diesel','Βιομάζα':'Biomass',
  'Βιομάζα Τυποποιημένη':'BiomassStandard','Τηλεθέρμανση (ΔΕΗ)':'DistrictHeating',
  'Τηλεθέρμανση (ΑΠΕ)':'DistrictHeatingRES','ΣΗΘ(1-10)':'CHP'};
function kx_system(sys,rid){
  if(!sys)return '';
  var x='<SYSTEM rid="'+rid+'">';
  var h=sys.heating||{},c=sys.cooling||{},d=sys.dhw||{},sol=sys.solar||{};
  /* heating */
  x+='<heating rid="1"><heating_exists>'+(h.on?1:0)+'</heating_exists>';
  x+=kx_ctable('production',h.on?[[h.type||'',KX_SRC_INTERNAL[h.src]||h.src||'',
    h.kw!=null?(+h.kw).toFixed(2):'',h.eff!=null?h.eff:1,h.scop!=null?h.scop:1]
    .concat(h.cover||[1,1,1,1,0,0,0,0,0,0,1,1]).concat([''])]:[],18);
  x+=kx_ctable('distribution',h.on?[
    ['Δίκτυο διανομής θερμού μέσου',h.dnetKW!=null?(+h.dnetKW).toFixed(2):'',
     h.route||'Εσωτερικοί  ή έως και 20% σε εξωτερικούς','','',h.deff!=null?h.deff:0.96,'False',''],
    ['Αεραγωγοί','','','','','','False','']]:[],8);
  x+=kx_ctable('termatic',h.on?[['',h.term!=null?h.term:0.93,'']]:[],3);
  x+=kx_ctable('auxiliary',h.on&&h.auxKW?[['',h.auxN||1,(+h.auxKW).toFixed(6)]]:[],3);
  x+='</heating>';
  /* cooling */
  x+='<cooling rid="1"><cooling_exists>'+(c.on?1:0)+'</cooling_exists>';
  x+=kx_ctable('production',c.on?[[c.type||'Αερόψυκτη Α.Θ.','Electricity',
    c.kw!=null?(+c.kw).toFixed(2):'',1.0,c.seer!=null?c.seer:1]
    .concat(c.cover||[0,0,0,0,0.5,0.5,0.5,0.5,0.5,0,0,0]).concat([''])]:[],18);
  x+=kx_ctable('distribution',c.on?[
    ['Δίκτυο διανομής ψυχρού μέσου',c.dnetKW!=null?(+c.dnetKW).toFixed(2):'',
     c.route||'Εσωτερικοί  ή έως και 20% σε εξωτερικούς',c.deff!=null?c.deff:0.96,'False',''],
    ['Αεραγωγοί','','','','False','']]:[],6);
  x+=kx_ctable('termatic',c.on?[['',c.term!=null?c.term:0.93,'']]:[],3);
  x+=kx_ctable('auxiliary',[],3);
  x+='</cooling>';
  /* dhw */
  x+='<dhw rid="1"><dhw_exists>'+(d.on?1:0)+'</dhw_exists>';
  x+=kx_ctable('production',d.on?[[d.type||'Τοπικός ηλεκτρικός θερμαντήρας',
    KX_SRC_INTERNAL[d.src]||d.src||'Electricity',d.kw!=null?(+d.kw).toFixed(2):'',
    d.eff!=null?d.eff:1.0].concat(d.cover||[1,1,1,1,1,1,1,1,1,1,1,1]).concat([''])]:[],17);
  x+=kx_ctable('distribution',d.on?[['', d.recirc?'True':'False',
    d.route||'Εσωτερικοί  ή έως και 20% σε εξωτερικούς',d.deff!=null?d.deff:0.92,'']]:[],5);
  x+=kx_ctable('termatic',d.on?[['',d.term!=null?d.term:0.98,'']]:[],3);
  x+=kx_ctable('auxiliary',[],3);
  x+='</dhw>';
  /* solar collector */
  x+='<solar_collector rid="1"><solar_collector_exists>'+(sol.on?1:0)+'</solar_collector_exists>';
  x+=kx_ctable('solar_collector',sol.on?[[sol.type||'Επιλεκτικός επίπεδος','False','True',
    sol.util!=null?sol.util:0.36,'',sol.area!=null?(+sol.area).toFixed(2):'',
    sol.azim!=null?sol.azim:180,sol.tilt!=null?sol.tilt:60,sol.coverage!=null?sol.coverage:1.0,'']]:[],10);
  x+='</solar_collector>';
  /* lighting: κατοικία -> 0 */
  x+='<lighting rid="1"><lighting_exists>'+(sys.lighting?1:0)+'</lighting_exists></lighting>';
  x+='</SYSTEM>';
  return x;
}
function kenakXML(model){
  var p=model.project||{}, b=model.building||{}, z=model.zone||{};
  var floors=b.floors||1;
  var x='<?xml version="1.0"?><ENR_IN>';
  x+='<EPA_NR_PROJECT rid="#1">';
  x+=kx_el('id','');
  x+=kx_el('blg_use',p.use!=null?p.use:2);
  x+=kx_el('blg_part',p.part!=null?p.part:1);
  x+=kx_el('building_num',p.num||'');
  x+=kx_el('blg_kaek',p.kaek||'');
  x+=kx_el('blg_owner',(p.owner||'')+(p.afm?' — ΑΦΜ '+p.afm:''));
  x+=kx_el('blg_ownership',p.ownership!=null?p.ownership:1);
  x+=kx_el('blg_address',p.address||'');
  x+=kx_el('blg_resp',p.resp!=null?p.resp:0);
  x+=kx_el('blg_resp_name',p.respName||'');
  x+=kx_el('blg_resp_phone',p.respPhone||'');
  x+='<blg_resp_mail>'+kx_esc(p.respMail||'')+'</blg_resp_mail>';
  x+=kx_el('blg_zone',p.zone!=null?p.zone:1);
  x+=kx_el('blg_height',p.height!=null?p.height:0);
  x+=kx_el('blg_climate',p.climate!=null?p.climate:0);
  x+=kx_el('blg_datasource',p.datasource||'1000000000');
  x+=kx_el('blg_licence_data',p.licence||'');
  x+=kx_el('version_tee_kenak_dll','1.31.1.9');
  x+=kx_el('blg_type',p.type!=null?p.type:0);
  x+='</EPA_NR_PROJECT>';
  x+='<LIBRARIES rid="#2"><id>Lib</id>'
   +'<lib_const>C:\\Program Files (x86)\\TEE\\TEE_KENAK_1_31\\EnrConstGr.xml</lib_const>'
   +'<lib_clim>C:\\Program Files (x86)\\TEE\\TEE_KENAK_1_31\\EnrClimateGR.xml</lib_clim>'
   +'<lib_fuel>C:\\Program Files (x86)\\TEE\\TEE_KENAK_1_31\\EnrFuelGr.xml</lib_fuel>'
   +'</LIBRARIES>';
  /* Σενάρια: BUILDING rid=1 (υπάρχον) + rid=2.. (model.scenarios[].title),
     ίδιο κέλυφος, διαφορετικός τίτλος blg_parameter34 — όπως στα
     πραγματικά αρχεία ΤΕΕ-ΚΕΝΑΚ. */
  var scen=[{title:b.title||'Υπάρχον κτίριο'}].concat(model.scenarios||[]);
  /* scen[i].transparent (προαιρετικό) αντικαθιστά τα διαφανή του σεναρίου — νέα κουφώματα */
  for(var sc2=0;sc2<scen.length;sc2++){
  x+='<BUILDING rid="'+(sc2+1)+'">';
  var bp={1:b.A,2:b.Aheat!=null?b.Aheat:b.A,3:(b.A/floors),
          4:b.V,5:b.Vheat!=null?b.Vheat:b.V,6:(b.V/floors),
          7:1,8:b.hTot,9:'',10:0,11:1,12:0,13:0,
          14:b.name||'ΚΤΙΡΙΟ',15:'1111',16:0,17:0,18:'',19:0,20:'',
          21:0,22:'',23:'',24:'',25:'',26:1,27:0,28:'',29:1,30:0,
          31:'',32:1,33:b.scenario||'',34:scen[sc2].title||''};
  for(var k2=1;k2<=34;k2++){
    var v2=bp[k2];
    if(typeof v2==='number'&&!isFinite(v2))v2='';
    if(typeof v2==='number')v2=(Math.round(v2*1000)/1000);
    x+=kx_el('blg_parameter'+k2,v2===''?'':v2);
  }
  x+='<ZONE1 rid="'+(sc2+1)+'">';
  var zp={1:z.use||'Μονοκατοικία, πολυκατοικία',2:'',3:z.A!=null?z.A:b.A,
          4:z.days!=null?z.days:280,5:1,6:z.p6!=null?z.p6:'',7:0,8:0,9:0,10:0,
          11:1,12:z.p12!=null?z.p12:'',13:'False',14:1,15:0};
  for(var k3=1;k3<=15;k3++){
    var v3=zp[k3];
    if(typeof v3==='number')v3=(Math.round(v3*1000)/1000);
    x+=kx_el('zn_parameter'+k3,v3===''?'':v3);
  }
  x+='<ENVELOPE rid="'+(sc2+1)+'">';
  x+=kx_table('opaque',model.opaque||[],16);
  x+=kx_table('ground',model.ground||[],8);
  x+=kx_table('transparent',(scen[sc2].transparent||model.transparent)||[],15);
  x+=kx_table('opaque_tb',model.opaque_tb||[],3);
  x+=kx_el('internal_nodes',0);
  x+=kx_el('direct_benefit_exist',0);
  x+=kx_table('direct_benefit',[],16);
  x+='</ENVELOPE>';
  var scSys=(scen[sc2]&&scen[sc2].systems)||model.systems;
  if(scSys){x+=kx_system(scSys,sc2+1);}
  else{
    x+='<SYSTEM rid="'+(sc2+1)+'">';
    ['heating','cooling','humidification','ahu','dhw','solar_collector','lighting']
      .forEach(function(nm){x+=kx_emptySystem(nm);});
    x+='</SYSTEM>';
  }
  x+='</ZONE1></BUILDING>';
  }
  x+='</ENR_IN>';
  return '\uFEFF'+x;
}
if(typeof self!=='undefined'){self.kenakXML=kenakXML;self.KENAK_SYSTEM_SPEC=KENAK_SYSTEM_SPEC;}
if(typeof module!=='undefined')module.exports={kenakXML:kenakXML,KENAK_SYSTEM_SPEC:KENAK_SYSTEM_SPEC};

/* ============================================================
   READER: kenakParse(xmlText) — διαβάζει αρχείο ENR_IN (δικό μας ή
   πραγματικό του ΤΕΕ-ΚΕΝΑΚ) και επιστρέφει δομημένο μοντέλο για προβολή.
   Καθαρό regex (δουλεύει σε browser και node), οι πίνακες-στήλες
   αναστρέφονται σε γραμμές.
   ============================================================ */
function kx_unesc(s){return String(s==null?'':s)
  .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&apos;/g,"'")
  .replace(/&quot;/g,'"').replace(/&amp;/g,'&');}
function kx_val(block,tag){
  var m=block.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([^<]*)</'+tag+'>'));
  return m?kx_unesc(m[1]):'';
}
function kx_readTable(block,prefix,nCols){
  var rows=parseInt(kx_val(block,prefix+'_rows'),10)||0;
  var out=[];
  if(!rows)return out;
  var cols=[];
  for(var k=1;k<=nCols;k++){
    var raw=kx_val(block,prefix+'_column'+k);
    var vals=raw.split(',');
    if(vals.length&&vals[vals.length-1]==='')vals.pop();  /* trailing κόμμα */
    cols.push(vals);
  }
  for(var i=0;i<rows;i++){
    var r=[];
    for(var k2=0;k2<nCols;k2++)r.push(cols[k2]&&cols[k2][i]!=null?cols[k2][i]:'');
    out.push(r);
  }
  return out;
}
function kenakParse(text){
  text=String(text).replace(/^\uFEFF/,'');
  var out={project:{},buildings:[]};
  var pm=text.match(/<EPA_NR_PROJECT[^>]*>([\s\S]*?)<\/EPA_NR_PROJECT>/);
  if(pm){
    var pb=pm[1];
    ['blg_use','blg_part','building_num','blg_kaek','blg_owner','blg_address',
     'blg_resp_name','blg_resp_phone','blg_zone','blg_climate','blg_licence_data',
     'version_tee_kenak_dll'].forEach(function(f){out.project[f]=kx_val(pb,f);});
  }
  var bre=/<BUILDING[^>]*>([\s\S]*?)<\/BUILDING>/g,bm;
  while((bm=bre.exec(text))){
    var bb=bm[1],b={params:{},zone:{},envelope:{},systems:{}};
    for(var k=1;k<=34;k++)b.params[k]=kx_val(bb,'blg_parameter'+k);
    for(var z=1;z<=15;z++)b.zone[z]=kx_val(bb,'zn_parameter'+z);
    /* SYSTEM: heating/cooling/dhw/solar -> rows από column-major */
    var sm=bb.match(/<SYSTEM[^>]*>([\s\S]*?)<\/SYSTEM>/);
    if(sm){
      var sysTxt=sm[1];
      var readSec=function(sec,tbl,nc){
        var mm2=sysTxt.match(new RegExp('<'+sec+'[^>]*>([\\s\\S]*?)</'+sec+'>'));
        if(!mm2)return null;
        var t=mm2[1];
        var ex=(t.match(new RegExp('<'+sec+'_exists>([^<]*)<'))||[])[1];
        var nr=+((t.match(new RegExp('<'+tbl+'_rows>(\\d+)<'))||[])[1]||0);
        var rows=[];
        for(var r=0;r<nr;r++)rows.push(new Array(nc).fill(''));
        for(var c2=1;c2<=nc;c2++){
          var vm=(t.match(new RegExp('<'+tbl+'_column'+c2+'>([^<]*)<'))||[])[1]||'';
          var parts=vm.split(',');
          for(var r2=0;r2<nr;r2++)rows[r2][c2-1]=parts[r2]!=null?parts[r2]:'';
        }
        return {exists:ex==='1',rows:rows};
      };
      b.systems={
        heating:readSec('heating','production',18),
        heatingDistr:readSec('heating','distribution',8),
        cooling:readSec('cooling','production',18),
        dhw:readSec('dhw','production',17),
        solar:readSec('solar_collector','solar_collector',10)
      };
    }
    var em=bb.match(/<ENVELOPE[^>]*>([\s\S]*?)<\/ENVELOPE>/);
    if(em){
      b.envelope.opaque=kx_readTable(em[1],'opaque',16);
      b.envelope.ground=kx_readTable(em[1],'ground',8);
      b.envelope.transparent=kx_readTable(em[1],'transparent',15);
    }
    var sm=bb.match(/<SYSTEM[^>]*>([\s\S]*?)<\/SYSTEM>/);
    if(sm){
      ['heating','cooling','humidification','ahu','dhw','solar_collector','lighting']
      .forEach(function(nm){
        var mm=sm[1].match(new RegExp('<'+nm+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+nm+'>'));
        if(!mm)return;
        var ex=kx_val(mm[1],nm+'_exists');
        var rows=(nm==='ahu')?kx_readTable(mm[1],'ahu',16)
                             :kx_readTable(mm[1],'production',18);
        b.systems[nm]={exists:ex==='1',rows:rows};
      });
    }
    out.buildings.push(b);
  }
  return out;
}
if(typeof self!=='undefined')self.kenakParse=kenakParse;
if(typeof module!=='undefined')module.exports.kenakParse=kenakParse;
