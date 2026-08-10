"use strict";
const fs = require("fs");

function grab(x, tag){ const m = x.match(new RegExp("<"+tag+">([\\s\\S]*?)</"+tag+">")); return m? m[1].trim() : ""; }
function grabAll(x, tag){
  const out=[]; const re = new RegExp("<"+tag+">([\\s\\S]*?)</"+tag+">","g"); let m;
  while((m=re.exec(x))) out.push(m[1]);
  return out;
}

function parseFile(path){
  const x = fs.readFileSync(path,"utf8");
  const proj = {
    file: path.split("/").pop(),
    desc: grab(x,"project_description"),
    clear_area: +grab(x,"clear_area"),
    tasks: []
  };
  for(const t of grabAll(x,"task")){
    const task = { task_id:+grab(t,"task_id"), desc:grab(t,"task_description").trim(), type:grab(t,"task_type").trim(), subtasks:[] };
    for(const s of grabAll(t,"subtask")){
      const incs = grabAll(s,"increment").map(i=>({id:+grab(i,"increment_id"), desc:grab(i,"increment_description"), pct:+grab(i,"percent"), affects_initial:+grab(i,"affects_initial"), affects_multiple:+grab(i,"affects_multiple")}));
      task.subtasks.push({
        id:+grab(s,"subtask_id"), desc:grab(s,"subtask_description").trim(),
        type:+grab(s,"subtask_type"),
        budget:+grab(s,"budget"), budget_type:+grab(s,"budget_type"),
        factor:+grab(s,"factor"), method:+grab(s,"method"),
        stage_pct:+grab(s,"subtask_stage_percent")||100,
        kappa:+grab(s,"kappa")||0, mi:+grab(s,"mi")||0,
        sigma:+grab(s,"sigma")||1, category:+grab(s,"category")||0,
        bf:+grab(s,"subtask_budget_factor")||1,
        lam:+grab(s,"lamda")||0.23368,
        constant:+grab(s,"subtask_constant")||0,
        units:+grab(s,"iterations")||1,
        incs
      });
    }
    proj.tasks.push(task);
  }
  return proj;
}

// ΤΕΕ αμοιβή subtask
function beta(base, l, k, m){ if(base<=0||l<=0||(!k&&!m)) return 0; return k + m/Math.cbrt(base/(1000*l)); }
function feeOf(st){
  if(st.method===2){ // μονάδες × σταθερά × λ (π.χ. τοπογραφικά κατ' αποκοπή)
    return st.units * st.constant * st.lam * (st.factor||1) * (st.stage_pct/100);
  }
  const b = beta(st.budget, st.lam, st.kappa, st.mi);
  let fee = st.budget * b/100 * (st.bf||1) * (st.factor||1) * (st.stage_pct/100);
  for(const inc of st.incs){ fee *= (1 + inc.pct/100); }
  return fee;
}

const files = ["xml2tee_1520.xml","xml2tee_4461.xml","xml2tee_5412.xml","xml2tee_8232.xml"];
const OUT = [];
for(const f of files){
  const p = parseFile("/mnt/user-data/uploads/"+f);
  let total=0;
  const rows = [];
  for(const t of p.tasks){
    for(const s of t.subtasks){
      const fee = feeOf(s);
      total += fee;
      rows.push({task:t.task_id, sub:s.id, desc:(t.desc+" "+(s.desc.includes("ΕΠΙΒΛΕΨ")?"ΕΠΙΒΛ":s.desc.includes("ΜΕΛΕΤΗ")?"ΜΕΛ":s.desc)).slice(0,42),
        method:s.method, budget:s.budget, k:s.kappa, m:s.mi, bf:s.bf, factor:s.factor,
        incs:s.incs.map(i=>i.id+":"+i.pct+"%").join(","), fee:Math.round(fee*100)/100});
    }
  }
  OUT.push({file:f, desc:p.desc.slice(0,60), area:p.clear_area, rows, total:Math.round(total*100)/100});
}

for(const o of OUT){
  console.log("\n================ "+o.file+" — "+o.desc+" ("+o.area+" μ²) ================");
  console.table(o.rows);
  console.log("ΣΥΝΟΛΟ ΑΜΟΙΒΩΝ (αναπαραγωγή τύπου ΤΕΕ): "+o.total.toLocaleString("el-GR",{minimumFractionDigits:2})+" €");
  // Ανάλυση shares: βρες τον μέγιστο budget (πλήρες Σ;) και τύπωσε % ανά μελέτη
  const buds = [...new Set(o.rows.filter(r=>r.method!==2 && r.budget>0).map(r=>r.budget))].sort((a,b)=>b-a);
  console.log("Διακριτοί προϋπολογισμοί:", buds.map(b=>b.toLocaleString("el-GR")).join(" · "));
}
fs.writeFileSync("/home/claude/test/parsed.json", JSON.stringify(OUT,null,1));
