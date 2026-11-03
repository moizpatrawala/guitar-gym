/* ================= revision: spaced repetition over everything you've learned =================
   Every skill you've picked up (chord shapes, changes, strum patterns, riffs, ear tests, theory) becomes a card in a
   Leitner box. Nail it and it comes back later and later (2, 4, 7, 14, 30, 60, 90 days); fluff it and it comes back tomorrow.
   A daily set mixes the due cards across skills (interleaving sticks better than drilling one thing). Stored in gg2_rev. */

let revState=S("rev",{});
{const _s=save;save=function(){_s();W("rev",revState)}}
const REV_I=[0,2,4,7,14,30,60,90];
const dayN=()=>Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4)/864e5);
const REVCAT={"Warm-up":"🎚️",Chords:"🎸",Changes:"⇄",Strumming:"🥁","Riffs & notes":"🎵",Ears:"👂",Theory:"💡",Songs:"🎤"};

// every revisable skill, built from what you've learned so far
function revItems(){const out=[],seen=new Set(),kn=knownChords();
  const add=(id,cat,name,step,mins,unit)=>{if(seen.has(id))return;seen.add(id);out.push({id,cat,name,step,mins,unit,st:revState[id]})};
  const learnedIn=c=>LESSONS.find(L=>L.steps?.some(s=>s.learn===c));
  const pair2=()=>{const k=kn.filter(c=>!CH[c].nick).slice(-2);return k.length===2?k:kn.length?[kn.at(-1)]:["open"]};
  kn.forEach(c=>add("chord:"+c,"Chords",label(c),{type:"reps",c,n:5},1,learnedIn(c)?.unit));
  LESSONS.filter(L=>done[L.id]).forEach(L=>(L.steps||[]).forEach((s,i)=>{
    const pairs=s.type==="onemin"?[s.pair]:s.type==="race"?(s.pairs||[]):[];
    pairs.forEach(p=>{if(p.every(c=>known[c])&&!sameChord(p[0],p[1]))add("change:"+[...p].sort().join("-"),"Changes",p.map(label).join(" ⇄ "),{type:"onemin",pair:p},1.2,L.unit)});
    if(s.type==="strum"&&s.pat&&!s.song)add("strum:"+s.pat,"Strumming",PATTERNS[s.pat].name,{type:"strum",pat:s.pat,chords:pair2(),bpm:s.bpm||70,bars:4,t:"Revision round."},1.2,L.unit);
    if(s.type==="notes"&&!s.dia)add("notes:"+L.id+":"+i,"Riffs & notes",L.t+(L.steps.filter(x=>x.type==="notes"&&!x.dia).length>1?` · ${s.t||"part "+(i+1)}`:""),{...s},1,L.unit);
    if(s.type==="ear")add("ear:"+s.kind,"Ears",s.kind==="majmin"?"Major or minor?":"Which string is it?",{...s,n:5},1,L.unit);
    if(s.type==="quiz")add("quiz:"+L.id+":"+i,"Theory",s.q.replace(/<[^>]+>/g,""),{...s},.4,L.unit)}));
  readySongs().forEach(([k,s])=>add("song:"+k,"Songs",s.t,{type:"jam",song:k,passes:1},3,null));
  return out}

const revDue=it=>!it.st||it.st.due<=dayN();
// 0-100: how firmly it's stuck. Grows with the box, fades once it's overdue
function revStrength(it){const s=it.st;if(!s)return 0;const base=s.box/7*100,over=Math.max(0,dayN()-s.due);return Math.round(Math.max(5,base*Math.pow(.88,over/Math.max(1,REV_I[s.box]))))}
const dueLabel=it=>{if(!it.st)return"New";const d=it.st.due-dayN();return d<0?`${-d} day${d<-1?"s":""} overdue`:d===0?"Due today":d===1?"Tomorrow":`In ${d} days`};

// Again / Hard / Good / Easy
function gradeItem(id,q){const s=revState[id]||{box:0,n:0};s.n++;s.last=dayN();s.q=q;
  if(q===0)s.box=1;else if(q===1)s.box=Math.max(1,s.box);else s.box=Math.min(7,s.box+(q===3?2:1));
  s.due=dayN()+(q<=1?1:REV_I[s.box]);revState[id]=s;save()}
const nextIn=(id,q)=>{const b=(revState[id]?.box)||0,nb=q===0?1:q===1?Math.max(1,b):Math.min(7,b+(q===3?2:1)),d=q<=1?1:REV_I[nb];return d===1?"tomorrow":`${d} days`};

// what the trainer just measured, turned into a suggested grade (null when there was nothing to measure)
function suggestGrade(r){if(!r)return null;
  switch(r.type){
    case "chordcheck":return r.tries===0?3:r.tries===1?2:r.tries===2?1:0;
    case "onemin":{const b=r.prev;if(b==null)return r.n>=20?3:r.n>=12?2:r.n>=6?1:0;return r.n>=b||r.n>=30?3:r.n>=b*.85?2:r.n>=b*.6?1:0}
    case "strum":return r.pct>=85?3:r.pct>=70?2:r.pct>=50?1:0;
    case "ear":{const p=r.right/r.n;return p>=.9?3:p>=.7?2:p>=.5?1:0}
    case "race":return r.secs<1?3:r.secs<1.6?2:r.secs<2.5?1:0;
    case "quiz":return r.tries===1?3:r.tries===2?1:0}
  return null}
const resultText=r=>!r?"":r.type==="chordcheck"?(r.tries===0?"Clean first strum.":`Clean after ${r.tries+1} tries.`):r.type==="onemin"?`${r.n} changes`+(r.prev!=null?` (best ${Math.max(r.prev,r.n)})`:"")+".":
  r.type==="strum"?`${r.pct}% on time.`:r.type==="ear"?`${r.right} of ${r.n} right.`:r.type==="race"?`Changed in ${r.secs.toFixed(2)}s.`:r.type==="quiz"?(r.tries===1?"First try.":`Got it on try ${r.tries}.`):"";

// a session: due cards first (most overdue, weakest), dealt round-robin across skills, up to a time budget
function revSession(pool,maxMin=10,extra=false){
  const list=(extra?pool:pool.filter(revDue)).sort((a,b)=>extra?revStrength(a)-revStrength(b):((a.st?.due??-1e9)-(b.st?.due??-1e9))||((a.st?.box??0)-(b.st?.box??0)));
  const by={};list.forEach(it=>(by[it.cat]=by[it.cat]||[]).push(it));const cats=Object.keys(REVCAT).filter(c=>by[c]);const out=[];let t=0,more=true;
  while(more){more=false;for(const c of cats){const it=by[c].shift();if(!it)continue;more=true;if(it.cat==="Songs"&&out.some(x=>x.cat==="Songs"))continue;if(out.length&&t+it.mins>maxMin)continue;out.push(it);t+=it.mins}}
  return out}

// the 20-minute recap: a proper lesson through everything you know, in the order a teacher would run it.
// Weakest skills first in each part; if you don't know enough yet to fill 20 minutes, a speed round on your weakest changes tops it up.
const PARTS={"Warm-up":"Tune up and wake your fingers.",Chords:"Every chord you know, weakest first. Lift off, land the shape, strum.",
  "Focus pairs":"The changes you pinned. One minute each, every recap.",Changes:"One-minute changes on the pairs that need it most.",Strumming:"Your strum patterns, 8 bars each. Lock in with the beat.",
  "Riffs & ears":"Single notes and ear training.",Theory:"Quick questions. Guitar can rest on your knee.",
  "Speed round":"Back to your weakest changes. Beat the score you just set.",Song:"Finish with a whole song."};
function revLesson(pool,target=20){
  const of=c=>pool.filter(i=>i.cat===c).sort((a,b)=>revStrength(a)-revStrength(b)||revDue(b)-revDue(a));
  const out=[],put=(part,it,mins)=>out.push({...it,part,mins});
  put("Warm-up",{id:"tune",cat:"Warm-up",name:"Tune up",step:{type:"tuner"},noGrade:true},1.5);
  const spider=pool.find(i=>i.id.startsWith("notes:spider:"));if(spider)put("Warm-up",spider,.8);
  of("Chords").slice(0,10).forEach(it=>put("Chords",it,.5));
  // pinned pairs (Gym → One-minute changes → Pin) are in every recap, graded on the same card as the normal change drill
  const fp=focus.filter(p=>p.every(c=>known[c])&&!sameChord(p[0],p[1])).map(p=>({p,id:"change:"+[...p].sort().join("-")}));
  const fIt=fp.map(({p,id})=>({...(pool.find(i=>i.id===id)||{id,cat:"Changes",name:p.map(label).join(" ⇄ "),st:revState[id]}),step:{type:"onemin",pair:p}}));
  fIt.forEach(it=>put("Focus pairs",it,1.2));
  const ch=of("Changes").filter(i=>!fIt.some(f=>f.id===i.id));ch.slice(0,6).forEach(it=>put("Changes",it,1.2));
  of("Strumming").slice(0,4).forEach(it=>put("Strumming",{...it,step:{...it.step,bars:8}},.8));
  of("Riffs & notes").filter(i=>i!==spider).slice(0,2).concat(of("Ears")).forEach(it=>put("Riffs & ears",it,.9));
  of("Theory").slice(0,3).forEach(it=>put("Theory",it,.3));
  const song=of("Songs")[0],total=()=>lessonMins(out)+(song?3:0);
  // too long: drop the strongest skill from whichever part is biggest (they're further down because they're solid)
  const many=fIt.length>4,MIN={Chords:many?5:8,Changes:many?0:fIt.length?2:4,Strumming:1,"Riffs & ears":many?0:1,Theory:1};
  while(total()>target){const big=Object.keys(MIN).map(p=>[p,out.filter(i=>i.part===p).length-MIN[p]]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1])[0];
    if(!big)break;out.splice(out.map(i=>i.part).lastIndexOf(big[0]),1)}
  const sp=[...fIt,...ch];
  for(let k=0;sp.length&&total()<target-1&&k<8;k++){const it=sp[k%Math.min(4,sp.length)];put("Speed round",{...it,name:it.name+" · beat your score"},1.2)}
  if(song)put("Song",song,3);
  return out}
const lessonMins=items=>Math.round(items.reduce((a,i)=>a+i.mins+.1,0));

/* ----- the tab ----- */
function drawRevise(){const box=$("revise");if(!box)return;const pool=revItems(),due=pool.filter(revDue),today=revSession(pool),mins=Math.max(2,Math.round(today.reduce((a,i)=>a+i.mins,0))),recap=revLesson(pool),parts=[...new Set(recap.map(i=>i.part))];
  const avg=pool.length?Math.round(pool.reduce((a,i)=>a+revStrength(i),0)/pool.length):0,learned=pool.filter(i=>i.st).length;
  if(!pool.length){box.innerHTML=`<div class="card rv-empty"><h2>Nothing to revise yet</h2><p class="mute">Finish your first lessons in Learn. Everything you learn shows up here, and Bruv brings it back just before you'd forget it.</p><button class="big" data-go-learn>Go to Learn</button></div>`;
    box.querySelector("[data-go-learn]").onclick=()=>tab("learn");$("rsay").textContent="Learn something first, then I'll make sure you never lose it.";return}
  $("rsay").textContent=due.length?`${due.length} thing${due.length>1?"s":""} to revise. I've mixed them up, which is how they stick.`:`All caught up. Nothing's due until ${(()=>{const n=Math.min(...pool.filter(i=>i.st).map(i=>i.st.due))-dayN();return n<=1?"tomorrow":"in "+n+" days"})()}.`;
  const units=UNITS.map((u,ui)=>({u,ui,its:pool.filter(i=>i.unit===ui)})).filter(x=>x.its.length);
  const cats=Object.keys(REVCAT).map(c=>[c,pool.filter(i=>i.cat===c)]).filter(([,a])=>a.length);
  box.innerHTML=`
   <div class="card hero rv-hero"><div class="rv-herotop"><div><span class="rv-eyebrow">Today's revision</span><h2>Full recap · ~${lessonMins(recap)} min</h2></div>
      <div class="rv-gauge" style="--p:${avg}"><b>${avg}%</b><span>memory</span></div></div>
     <div class="chips">${parts.map((p,n)=>{const k=recap.filter(i=>i.part===p).length;return`<span class="chip">${n+1} · ${esc(p)}${k>1?` ×${k}`:""}</span>`}).join("")}</div>
     <p class="mute">A full lesson through everything you've learned, weakest first: ${recap.length} drills in ${parts.length} parts.</p>
     <div class="row"><button class="big xl" data-recap>▶ Start the recap</button>${due.length?`<button class="ghost" data-today>Just what's due · ~${mins} min</button>`:""}</div>
     <p class="mute">${learned} of ${pool.length} skills reviewed so far. Each one comes back just before you'd forget it.</p></div>
   ${units.length?`<div class="card"><h2>Revise a unit</h2><p class="mute">Run through everything from one part of the course, mixed up.</p><div class="rv-units">${units.map(({u,ui,its})=>{const s=Math.round(its.reduce((a,i)=>a+revStrength(i),0)/its.length),d=its.filter(revDue).length;
      return`<button class="rv-unit" data-unit="${ui}"><span class="rv-ring" style="--p:${s}"><i>${s}</i></span><span><b>${esc(u.t.replace(/^\d+\s*·\s*/,""))}</b><small>${its.length} skills${d?` · ${d} due`:""}</small></span></button>`}).join("")}</div></div>`:""}
   ${cats.map(([c,its])=>`<div class="card rv-cat"><div class="rv-cathead"><h2><span class="rv-ic">${REVCAT[c]}</span>${c}</h2><button class="ghost" data-cat="${esc(c)}">Drill all</button></div>
     <div class="rv-list">${its.sort((a,b)=>revStrength(a)-revStrength(b)).map(it=>{const s=revStrength(it),bx=it.st?.box||0;
       return`<button class="rv-item${revDue(it)?" due":""}" data-id="${esc(it.id)}"><span class="rv-name">${esc(it.name)}</span><span class="rv-boxes" aria-label="Memory level ${bx} of 7">${Array.from({length:7},(_,k)=>`<i class="${k<bx?"on":""}"></i>`).join("")}</span><span class="rv-due">${dueLabel(it)}</span><span class="rv-pct">${s}%</span></button>`}).join("")}</div></div>`).join("")}`;
  box.querySelector("[data-recap]").onclick=()=>runRevision("Full recap",revLesson(revItems()));
  box.querySelector("[data-today]")?.addEventListener("click",()=>runRevision("Revision",today));
  box.querySelectorAll("[data-unit]").forEach(b=>b.onclick=()=>{const ui=+b.dataset.unit,its=pool.filter(i=>i.unit===ui);runRevision(UNITS[ui].t.replace(/^\d+\s*·\s*/,""),revSession(its,30,true))});
  box.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{const its=pool.filter(i=>i.cat===b.dataset.cat);runRevision(b.dataset.cat,revSession(its,30,true))});
  box.querySelectorAll("[data-id]").forEach(b=>b.onclick=()=>{const it=pool.find(i=>i.id===b.dataset.id);runRevision(it.name,[it])})}
{const _r=refresh;refresh=function(){_r();drawRevise()}}

/* ----- the session runner: drill, then grade, then the next drill ----- */
function runRevision(title,items){let i=0,introd=-1;const res=[],t0=Date.now();const s0=items.filter(it=>!it.noGrade).map(it=>revStrength(it));ears();openSheet();
  const parts=[...new Set(items.map(it=>it.part).filter(Boolean))];
  function show(){clean();lastResult=null;const it=items[i];if(!it){finish();return}
    const el=$("scard");el.innerHTML="";$("sprog").style.width=(i/items.length*100)+"%";
    // a short title card at the start of each part, so it feels like a lesson rather than a pile of drills
    if(it.part&&introd!==i&&it.part!==items[i-1]?.part){introd=i;const p=it.part,its=items.filter(x=>x.part===p),m=Math.max(1,lessonMins(its));
      el.append(h("div","stitle",`<span class="sec">Part ${parts.indexOf(p)+1} of ${parts.length}</span>${esc(p)}`));
      const b=h("div","rv-rate",`<div class="body">${PARTS[p]}<small>${its.length} drill${its.length>1?"s":""} · about ${m} min</small></div><div class="row" data-r></div>`);el.append(b);
      const r=b.querySelector("[data-r]");btn(r,"Start","big",show);autoNext(r,show,4);say(`Part ${parts.indexOf(p)+1}. ${p}. ${PARTS[p]}`);$("sheet").scrollTop=0;return}
    el.append(h("div","stitle",`<span class="sec">${REVCAT[it.cat]} ${it.part||it.cat}</span>${esc(it.name)}`));
    el.append(h("div","rv-step mute",`Drill ${i+1} of ${items.length}${it.noGrade?"":" · "+dueLabel(it)}`));
    const body=h("div","stack");el.append(body);MOUNT[it.step.type](body,it.step,()=>{if(it.noGrade){i++;show()}else rate(it)});narrate(it.step);$("sheet").scrollTop=0}
  function rate(it){const r=lastResult,sg=suggestGrade(r);clean();const el=$("scard");el.innerHTML="";
    el.append(h("div","stitle",`<span class="sec">${REVCAT[it.cat]} ${it.cat}</span>${esc(it.name)}`));
    const G=[["Again","Forgot it / messy"],["Hard","Got there, with effort"],["Good","Solid"],["Easy","Didn't have to think"]];
    const box=h("div","rv-rate",`<div class="body">${r?`<b>${resultText(r)}</b> `:""}How did that feel?<small>${sg!=null?"Bruv's pick is highlighted. Press 1 to 4 on your keyboard, or tap.":"Be honest. It decides when this comes back. Press 1 to 4, or tap."}</small></div>
      <div class="rv-grades">${G.map(([g,d],q)=>`<button data-q="${q}" class="rv-g q${q}${q===sg?" pick":""}"><b>${g}</b><span>${d}</span><small>Back ${nextIn(it.id,q)}</small></button>`).join("")}</div><div class="row" data-r></div>`);
    el.append(box);
    const pick=q=>{document.removeEventListener("keydown",key);gradeItem(it.id,q);res.push({it,q});i++;show()};
    box.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>pick(+b.dataset.q));
    const key=e=>{if(/^[1-4]$/.test(e.key)){e.preventDefault();pick(+e.key-1)}};document.addEventListener("keydown",key);cleanup.push(()=>document.removeEventListener("keydown",key));
    if(sg!=null){say(["Again tomorrow then.","Bit wobbly. Back tomorrow.","Solid.","Too easy. See you in a while."][sg]);autoNext(box.querySelector("[data-r]"),()=>pick(sg),6)}
    else say("How did that feel?")}
  function finish(){clean();$("sprog").style.width="100%";ding();const el=$("scard");el.innerHTML="";
    const up=Math.round(res.reduce((a,{it})=>a+revStrength({st:revState[it.id]}),0)/Math.max(1,res.length)-s0.reduce((a,b)=>a+b,0)/Math.max(1,s0.length));
    const cnt=[0,0,0,0];res.forEach(r=>cnt[r.q]++);addXp(Math.min(30,res.length*2));counters.revisions=(counters.revisions||0)+1;save();
    el.append(h("div","stitle","Revision done 🧠"));
    el.append(h("div","rv-sum",[["Minutes",Math.max(1,Math.round((Date.now()-t0)/6e4))],["Drills",res.length],["Memory",(up>=0?"+":"")+up+"%"],["Nailed",cnt[2]+cnt[3]]].map(([a,b])=>`<div><b>${b}</b><span>${a}</span></div>`).join("")));
    if(cnt[0]+cnt[1])el.append(h("p","mute",`Back tomorrow: ${res.filter(r=>r.q<=1).map(r=>esc(r.it.name)).join(", ")}.`));
    say(cnt[0]+cnt[1]===0?"Clean sweep. Your memory's a vault.":rnd(["Done. The shaky ones come back tomorrow.","That's how it sticks. Same again tomorrow.","Revision done. Future you says thanks."]));
    const r=h("div","row");el.append(r);btn(r,"Done","big",closeSheet);drawRevise()}
  show()}
