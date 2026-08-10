/* ============================================================
   HEXIS KENAK — kenak-dxf.js  v0.3
   Ανάγνωση ASCII DXF για την ενεργειακή επιθεώρηση.
   ΣΥΜΒΑΣΗ LAYERS (ονόματα ακριβώς έτσι, κεφαλαία ελληνικά):
     ΖΩΝΗ      περίγραμμα θερμικής ζώνης (κλειστή LWPOLYLINE,
               τα τόξα έρχονται ως bulges και διατηρούνται)
     ΜΘΧ       μη θερμαινόμενοι χώροι (κλειστές πολυγραμμές)
     ΙΚΕΕ      βοηθητική κατηγορία χώρων (κλειστές πολυγραμμές)
     ΕΜΠΟΔΙΑ   περιβάλλοντα εμπόδια σκίασης (πολυγραμμές/γραμμές)
     ΣΚΙΑΣΕΙΣ  πρόβολοι/σκίαστρα
     ΤΕΝΤΕΣ    τέντες
     ΚΟΥΦΩΜΑΤΑ κουφώματα ως LINE πάνω στον τοίχο της ζώνης
   Δεκτά entities: LWPOLYLINE, POLYLINE/VERTEX, LINE, ARC, CIRCLE.
   Κωδικοποίηση: UTF-8 ή Windows-1253 (αυτόματη ανίχνευση).
   ============================================================ */
'use strict';

function dxfDecode(buf){
  var u8=new Uint8Array(buf);
  var utf=new TextDecoder('utf-8',{fatal:false}).decode(u8);
  if(utf.indexOf('\uFFFD')<0)return utf;
  try{return new TextDecoder('windows-1253').decode(u8);}catch(e){return utf;}
}

/* κανονικοποίηση ονόματος layer: κεφαλαία, χωρίς τόνους/κενά */
function dxfLayerKey(name){
  return String(name||'').toUpperCase()
    .replace(/Ά/g,'Α').replace(/Έ/g,'Ε').replace(/Ή/g,'Η').replace(/Ί/g,'Ι')
    .replace(/Ό/g,'Ο').replace(/Ύ/g,'Υ').replace(/Ώ/g,'Ω').replace(/\s+/g,'');
}

/* Επιστρέφει: { polys:[{layer,pts:[[x,y]],bulges:[b],closed}],
                lines:[{layer,a,b}], arcs:[{layer,C,R,a0,a1}],
                circles:[{layer,C,R}], layers:{key:count} } */
function parseDXF(text){
  var lines=text.split(/\r\n|\r|\n/);
  var out={polys:[],lines:[],arcs:[],circles:[],layers:{}};
  var i=0,n=lines.length;
  function pair(){if(i+1>=n)return null;
    var c=parseInt(lines[i].trim(),10),v=lines[i+1];i+=2;
    return isNaN(c)?null:[c,v];}
  /* πήγαινε στο ENTITIES */
  var inEnt=false;
  while(i<n){
    var p=pair();if(!p)break;
    if(p[0]===2&&p[1].trim()==='ENTITIES'){inEnt=true;break;}
  }
  if(!inEnt)return out;
  var cur=null, curType='';
  function flush(){
    if(!cur)return;
    var L=dxfLayerKey(cur.layer);out.layers[L]=(out.layers[L]||0)+1;
    if(curType==='LWPOLYLINE'||curType==='POLYLINE'){
      if(cur.pts.length>=2)out.polys.push({layer:L,pts:cur.pts,bulges:cur.bulges,closed:!!cur.closed});
    }else if(curType==='LINE'){
      if(cur.a&&cur.b)out.lines.push({layer:L,a:cur.a,b:cur.b});
    }else if(curType==='ARC'){
      if(cur.C&&cur.R)out.arcs.push({layer:L,C:cur.C,R:cur.R,a0:cur.a0||0,a1:cur.a1||0});
    }else if(curType==='CIRCLE'){
      if(cur.C&&cur.R)out.circles.push({layer:L,C:cur.C,R:cur.R});
    }
    cur=null;curType='';
  }
  while(i<n){
    var g=pair();if(!g)break;
    var c=g[0],v=g[1].trim();
    if(c===0){
      if(v==='SEQEND'){flush();continue;}
      if(v==='VERTEX'&&curType==='POLYLINE'){cur._vx={};continue;}
      if(v==='ENDSEC')break;
      flush();
      if(v==='LWPOLYLINE'||v==='POLYLINE'){curType=v;cur={layer:'0',pts:[],bulges:[],closed:false};}
      else if(v==='LINE'){curType=v;cur={layer:'0'};}
      else if(v==='ARC'){curType=v;cur={layer:'0'};}
      else if(v==='CIRCLE'){curType=v;cur={layer:'0'};}
      else{curType='';cur=null;}
      continue;
    }
    if(!cur)continue;
    var f=parseFloat(v);
    if(curType==='POLYLINE'&&cur._vx){
      if(c===10)cur._vx.x=f;
      else if(c===20){cur._vx.y=f;cur.pts.push([cur._vx.x||0,f]);cur.bulges.push(0);}
      else if(c===42)cur.bulges[cur.bulges.length-1]=f;
      else if(c===8)cur.layer=v;
      continue;
    }
    switch(c){
      case 8: cur.layer=v;break;
      case 70: if(curType==='LWPOLYLINE'||curType==='POLYLINE')cur.closed=!!(parseInt(v,10)&1);break;
      case 10:
        if(curType==='LWPOLYLINE'){cur.pts.push([f,0]);cur.bulges.push(0);}
        else if(curType==='LINE')cur.a=[f,0];
        else if(curType==='ARC'||curType==='CIRCLE')cur.C=[f,0];
        break;
      case 20:
        if(curType==='LWPOLYLINE'&&cur.pts.length)cur.pts[cur.pts.length-1][1]=f;
        else if(curType==='LINE'&&cur.a)cur.a[1]=f;
        else if((curType==='ARC'||curType==='CIRCLE')&&cur.C)cur.C[1]=f;
        break;
      case 11: if(curType==='LINE')cur.b=[f,0];break;
      case 21: if(curType==='LINE'&&cur.b)cur.b[1]=f;break;
      case 40: if(curType==='ARC'||curType==='CIRCLE')cur.R=f;break;
      case 50: if(curType==='ARC')cur.a0=f*Math.PI/180;break;
      case 51: if(curType==='ARC')cur.a1=f*Math.PI/180;break;
      case 42: if(curType==='LWPOLYLINE'&&cur.bulges.length)cur.bulges[cur.bulges.length-1]=f;break;
    }
  }
  flush();
  return out;
}

/* Κατηγοριοποίηση κατά τη σύμβαση HEXIS KENAK */
var KENAK_DXF_LAYERS={
  'ΖΩΝΗ':'zone','ZONI':'zone','ZONE':'zone',
  'ΜΘΧ':'mtx','MTX':'mtx',
  'ΙΚΕΕ':'ikee','IKEE':'ikee',
  'ΕΜΠΟΔΙΑ':'empodia','EMPODIA':'empodia',
  'ΣΚΙΑΣΕΙΣ':'skiaseis','SKIASEIS':'skiaseis',
  'ΤΕΝΤΕΣ':'tentes','TENTES':'tentes',
  'ΚΟΥΦΩΜΑΤΑ':'kouf','KOYFOMATA':'kouf','KOUFOMATA':'kouf'
};
function categorizeDXF(d){
  var cat={zone:[],mtx:[],ikee:[],empodia:[],skiaseis:[],tentes:[],kouf:[],other:0};
  d.polys.forEach(function(p){
    var k=KENAK_DXF_LAYERS[p.layer];
    if(k==='kouf'){ /* πολυγραμμή σε ΚΟΥΦΩΜΑΤΑ -> σπάει σε γραμμές */
      for(var i=0;i<p.pts.length-1;i++)cat.kouf.push({a:p.pts[i],b:p.pts[i+1]});
      if(p.closed&&p.pts.length>2)cat.kouf.push({a:p.pts[p.pts.length-1],b:p.pts[0]});
    }
    else if(k)cat[k].push(p);else cat.other++;
  });
  d.lines.forEach(function(l){
    var k=KENAK_DXF_LAYERS[l.layer];
    if(k==='kouf')cat.kouf.push({a:l.a,b:l.b});
    else if(k)cat[k].push({pts:[l.a,l.b],bulges:[0,0],closed:false});
    else cat.other++;
  });
  d.circles.forEach(function(cc){
    var k=KENAK_DXF_LAYERS[cc.layer];
    if(k&&k!=='kouf'&&k!=='zone')cat[k].push({circle:cc});
    else cat.other++;
  });
  return cat;
}
if(typeof self!=='undefined'){self.parseDXF=parseDXF;self.dxfDecode=dxfDecode;
  self.categorizeDXF=categorizeDXF;self.dxfLayerKey=dxfLayerKey;}
if(typeof module!=='undefined')module.exports={parseDXF,dxfDecode,categorizeDXF,dxfLayerKey};
