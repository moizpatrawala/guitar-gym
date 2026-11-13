/* Guitar OS: the rebuilt app.
   Progress from the old app (localStorage keys starting gg2_) is read and never changed. New results go in gos_state.
   The rule everything follows: a chord you say you know is "not heard" until the app has heard it, and nothing is
   Mastered without clean tests on three different days. */

const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const OPEN_MIDI=[40,45,50,55,59,64],OPEN_HZ=OPEN_MIDI.map(m=>440*2**((m-69)/12)),SNAME=["low E","A","D","G","B","high e"],PEG=["E","A","D","G","B","e"];

/* ---------- chords: frets and fingers, thickest string first (-1 = don't play, 0 = open) ---------- */
const CH={
  A:{f:[-1,0,2,2,2,0],n:[0,0,1,2,3,0]}, C:{f:[-1,3,2,0,1,0],n:[0,3,2,0,1,0]}, D:{f:[-1,-1,0,2,3,2],n:[0,0,0,1,3,2]},
  E:{f:[0,2,2,1,0,0],n:[0,2,3,1,0,0]}, G:{f:[3,2,0,0,0,3],n:[2,1,0,0,0,3]},
  Feasy:{f:[-1,-1,3,2,1,1],n:[0,0,3,2,1,1],name:"F",tag:"easy"},
  Am:{f:[-1,0,2,2,1,0],n:[0,0,2,3,1,0]}, Dm:{f:[-1,-1,0,2,3,1],n:[0,0,0,2,3,1]}, Em:{f:[0,2,2,0,0,0],n:[0,2,3,0,0,0]},
  Fm:{f:[-1,-1,3,1,1,1],n:[0,0,3,1,1,1]},
  A7:{f:[-1,0,2,0,2,0],n:[0,0,2,0,3,0]}, C7:{f:[-1,3,2,3,1,0],n:[0,3,2,4,1,0]}, D7:{f:[-1,-1,0,2,1,2],n:[0,0,0,2,1,3]},
  E7:{f:[0,2,0,1,0,0],n:[0,2,0,1,0,0]}, G7:{f:[3,2,0,0,0,1],n:[3,2,0,0,0,1]}, B7:{f:[-1,2,1,2,0,2],n:[0,2,1,3,0,4]},
  F:{f:[1,3,3,2,1,1],n:[1,3,4,2,1,1],name:"F",tag:"barre"}, Bm:{f:[-1,2,4,4,3,2],n:[0,1,3,4,2,1],tag:"barre"}, "F#m":{f:[2,4,4,2,2,2],n:[1,3,4,1,1,1],tag:"barre"},
};
Object.values(CH).forEach(c=>c.pc=[...new Set(c.f.map((f,i)=>f<0?-1:(OPEN_MIDI[i]+f)%12).filter(p=>p>=0))]);
const GROUPS=[["Major",["A","C","D","E","Feasy","G"]],["Minor",["Am","Dm","Em","Fm"]],["Sevenths",["A7","C7","D7","E7","G7","B7"]]];
const NEXT=["F","Bm","F#m"],MINE=GROUPS.flatMap(g=>g[1]);
const label=c=>CH[c]?.name||c;
const PAIRS=[["C","G"],["G","D"],["D","A"],["A","E"],["Am","Feasy"],["C","Am"],["G","Em"],["B7","E7"],["Dm","G"],["Feasy","C"]];
const SONGS=[{t:"Perfect",a:"Ed Sheeran",c:""},{t:"Yellow",a:"Coldplay",c:"amber"},{t:"Sailor Song",a:"Gigi Perez",c:"mintb"}];
const STAGE=["Not heard","Learning","Developing","Proficient","Mastered"];

function dia(c){const ch=CH[c],up=ch.f.filter(f=>f>0),base=up.length&&Math.max(...up)>4?Math.min(...up):1,X=i=>14+i*14.4,Y=f=>18+(f-base+.5)*19;
  let s=`<svg viewBox="0 0 100 100" role="img" aria-label="${esc(label(c))} chord chart"><rect x="14" y="${base>1?17:14}" width="72" height="${base>1?1.5:4}" rx="1" fill="currentColor"/>`;
  for(let j=1;j<=4;j++)s+=`<line x1="14" x2="86" y1="${18+j*19}" y2="${18+j*19}" stroke="currentColor" stroke-opacity=".25"/>`;
  for(let i=0;i<6;i++)s+=`<line x1="${X(i)}" x2="${X(i)}" y1="18" y2="94" stroke="currentColor" stroke-opacity=".55" stroke-width="${1.6-i*.14}"/>`;
  const b=ch.n.map((n,i)=>n===1?i:-1).filter(i=>i>=0);
  if(b.length>1&&b.every(i=>ch.f[i]===ch.f[b[0]]))s+=`<rect x="${X(b[0])-5.5}" y="${Y(ch.f[b[0]])-5.5}" width="${X(b.at(-1))-X(b[0])+11}" height="11" rx="5.5" fill="currentColor"/>`;
  ch.f.forEach((f,i)=>{if(f<0)s+=`<path d="M${X(i)-3} 5l6 6m0-6l-6 6" stroke="currentColor" stroke-opacity=".5" stroke-width="1.5"/>`;
    else if(f===0)s+=`<circle cx="${X(i)}" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
    else s+=`<circle cx="${X(i)}" cy="${Y(f)}" r="5.5" fill="currentColor"/>`});
  if(base>1)s+=`<text x="9" y="${Y(base)+3}" font-size="8" font-family="JetBrains Mono,monospace" text-anchor="end" fill="currentColor">${base}</text>`;
  return s+"</svg>"}

/* ---------- sound out: plucked strings and the metronome click ---------- */
let ac;
const ctx=()=>{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==="suspended")ac.resume();return ac};
function pluck(freq,when,gain=.3){const a=ctx(),len=Math.round(a.sampleRate/freq),buf=a.createBuffer(1,a.sampleRate*2.2,a.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=Math.random()*2-1;for(let i=len;i<d.length;i++)d[i]=(d[i-len]+d[i-len+1])*.498;
  const s=a.createBufferSource(),g=a.createGain();s.buffer=buf;g.gain.value=gain;s.connect(g).connect(a.destination);s.start(when??a.currentTime+.01)}
function strum(c,gain=.26){const t=ctx().currentTime+.01;CH[c].f.forEach((f,i)=>{if(f>=0)pluck(OPEN_HZ[i]*2**(f/12),t+i*.018,gain)})}
function tick(t,hi){const a=ctx(),o=a.createOscillator(),g=a.createGain();o.frequency.value=hi?1700:1050;g.gain.setValueAtTime(.2,t);g.gain.exponentialRampToValueAtTime(.001,t+.05);o.connect(g).connect(a.destination);o.start(t);o.stop(t+.06)}

/* ---------- sound in: the mic, pitch for the tuner, and which chord is ringing ---------- */
let an=null,tbuf,fbuf,micDenied=false;
async function ears(){if(an)return true;if(micDenied||!navigator.mediaDevices?.getUserMedia)return false;
  try{const raw={echoCancellation:false,noiseSuppression:false,autoGainControl:false};let mic=await navigator.mediaDevices.getUserMedia({audio:raw});
    // earbud mics are built for voice and barely hear a guitar, so use the laptop or phone mic when there is one
    if(/bluetooth|buds|airpods|headset|hands-free|beats/i.test(mic.getAudioTracks()[0]?.label||"")){const d=(await navigator.mediaDevices.enumerateDevices()).find(d=>d.kind==="audioinput"&&/iphone|ipad|built-in|macbook|internal/i.test(d.label));
      if(d)try{const m2=await navigator.mediaDevices.getUserMedia({audio:{...raw,deviceId:{exact:d.deviceId}}});mic.getTracks().forEach(t=>t.stop());mic=m2}catch{}}
    const a=ctx();if(a.state!=="running")await a.resume();an=a.createAnalyser();an.fftSize=8192;an.smoothingTimeConstant=0;a.createMediaStreamSource(mic).connect(an);
    const mute=a.createGain();mute.gain.value=0;an.connect(mute).connect(a.destination);tbuf=new Float32Array(an.fftSize);fbuf=new Float32Array(an.frequencyBinCount);return true}
  catch(e){if(e?.name==="NotAllowedError")micDenied=true;return false}}
function level(){an.getFloatTimeDomainData(tbuf);let r=0;for(let i=tbuf.length-1024;i<tbuf.length;i++)r+=tbuf[i]*tbuf[i];return Math.sqrt(r/1024)}
function pitch(){an.getFloatTimeDomainData(tbuf);const N=4096,b=tbuf.subarray(tbuf.length-N);let rms=0;for(let i=0;i<N;i++)rms+=b[i]*b[i];if(Math.sqrt(rms/N)<.003)return null;
  const sr=ac.sampleRate,minL=Math.floor(sr/1000),maxL=Math.floor(sr/70),c=new Float32Array(maxL+2);
  for(let l=minL;l<=maxL+1;l++){let s=0,e1=0,e2=0;for(let i=0;i<N-l;i+=2){s+=b[i]*b[i+l];e1+=b[i]*b[i];e2+=b[i+l]*b[i+l]}c[l]=s/Math.sqrt(e1*e2+1e-12)}
  let best=-1,bl=0;for(let l=minL+1;l<=maxL;l++)if(c[l]>c[l-1]&&c[l]>=c[l+1]&&c[l]>best)best=c[l],bl=l;if(best<.8)return null;
  for(let l=minL+1;l<bl;l++)if(c[l]>c[l-1]&&c[l]>=c[l+1]&&c[l]>best*.93){bl=l;break}
  const a1=c[bl-1],a2=c[bl],a3=c[bl+1];return sr/(bl+((a1-a3)/(2*(a1-2*a2+a3))||0))}
function chroma(){an.getFloatFrequencyData(fbuf);const bw=ac.sampleRate/an.fftSize,ch=new Array(12).fill(0);let tot=0;
  for(let k=Math.floor(75/bw);k<Math.min(fbuf.length,1400/bw);k++){const m=10**(fbuf[k]/20);if(!isFinite(m))continue;const pc=((Math.round(69+12*Math.log2(k*bw/440))%12)+12)%12;ch[pc]+=m*m;tot+=m*m}
  return tot<1e-7?null:ch.map(x=>x/tot)}
const chordScore=(ch,c)=>{let inn=0,miss=0;CH[c].pc.forEach(p=>{inn+=ch[p];if(ch[p]<.04)miss++});return inn-.25*miss};
const samePc=(a,b)=>[...CH[a].pc].sort().join()===[...CH[b].pc].sort().join();
function hears(c){if(level()<.006)return false;const ch=chroma();if(!ch||chordScore(ch,c)<.48)return false;let b=c,bs=-9;Object.keys(CH).forEach(k=>{const s=chordScore(ch,k);if(s>bs)bs=s,b=k});return samePc(b,c)}

/* ---------- your record ---------- */
const read=k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}};
const dayKey=d=>new Date(d).toDateString(),ago=n=>dayKey(Date.now()-n*864e5);
// The laptop preview has no saved progress (that lives on the live site), so it shows your 8 Nov snapshot.
const SNAP={stats:{streak:9,totalSec:24362,last:dayKey(Date.now()),mins:{[ago(6)]:45,[ago(5)]:19,[ago(4)]:22,[ago(3)]:20}},
  onemin:{"G-C":15,"A-D":13,"A-E":10,"A-G":19,"C-Fmini":8,"Fmini-D":1,"Fmini-E":13,"E-A":21,"D-A":21,"D-E":28,"Am-E":37,"Am-Dm":36,"A-Dm":33,"Em-D":47,"C-Am":36,"C-A":33,"C-G":32,"G-E":35,"G7-C":32,"C7-Fmaj7":22,"E-B7":16,"Em-G":40,"Em-C":26,"D-C":16,"G7-D":27,"C7-D":28},
  rev:{"chord:E":{box:5},"chord:Am":{box:4},"chord:Em":{box:4},"chord:G":{box:4},"chord:D":{box:4},"chord:C":{box:3},"chord:A":{box:3},"chord:Dm":{box:3},"chord:Fmaj7":{box:3},"chord:Fmini":{box:1},"chord:G7":{box:3}}};
const live=!!localStorage.getItem("gg2_stats");
const OLD=live?{stats:read("gg2_stats")||{},onemin:read("gg2_onemin")||{},rev:read("gg2_rev")||{}}:SNAP;
let state=read("gos_state")||{v:1,since:Date.now(),tests:{chord:{},pair:{}},days:{}};state.days=state.days||{};
const save=()=>localStorage.setItem("gos_state",JSON.stringify(state));
const canon=c=>c==="Fmaj7"||c==="Fmini"?"Feasy":c==="Gmini"||c==="Cmaj7"?null:c;
const pk=(a,b)=>[a,b].sort().join("|");
function pairBests(){const m={};Object.entries(OLD.onemin).forEach(([k,v])=>{const[a,b]=k.split("-").map(canon);if(a&&b&&a!==b)m[pk(a,b)]=Math.max(m[pk(a,b)]||0,v)});
  Object.entries(state.tests.pair).forEach(([k,arr])=>arr.forEach(t=>m[k]=Math.max(m[k]||0,t.n)));return m}
function chordStatus(c){const pb=pairBests(),mine=Object.entries(pb).filter(([k])=>k.split("|").includes(c)).map(([k,v])=>({with:k.split("|").find(x=>x!==c)||c,n:v})).sort((a,b)=>b.n-a.n);
  const top=mine[0]?.n||0,fast=mine.filter(p=>p.n>=30).length,box=Math.max(0,...Object.entries(OLD.rev).filter(([k])=>k.startsWith("chord:")&&canon(k.slice(6))===c).map(([,v])=>v.box||0));
  const tests=state.tests.chord[c]||[],passDays=new Set(tests.filter(t=>t.ok).map(t=>dayKey(t.t))).size;
  let s=!mine.length&&!box&&!tests.length?0:top<15&&box<3?1:fast>=2?3:2;if(s===3&&passDays>=3)s=4;
  return{s,top,fast,box,mine,tests}}
function streak(){const s=OLD.stats,mins=d=>(s.mins?.[d]||0)+(state.days[d]||0);let n=0;for(let i=mins(ago(0))>=1?0:1;mins(ago(i))>=1;i++)n++;
  if(!live)n=s.streak;return{n,week:[6,5,4,3,2,1,0].map(i=>({d:"SMTWTFS"[new Date(Date.now()-i*864e5).getDay()],on:mins(ago(i))>=1}))}}
// time spent in a tool counts as practice
let clockT=null;const clockOn=()=>{clockT=clockT||setInterval(()=>{if(document.hidden)return;state.days[ago(0)]=(state.days[ago(0)]||0)+1/12;save()},5000)},clockOff=()=>{clearInterval(clockT);clockT=null};

/* ---------- the six skills you're developing, one per string. Position is a stage: 0 not heard … 4 mastered ---------- */
function skills(){const pb=pairBests(),done=PAIRS.filter(([a,b])=>(pb[pk(a,b)]||0)>=30).length,fe=pb[pk("C","Feasy")]||0;
  return[{t:"Clean transitions",d:`${done} of ${PAIRS.length} test changes at 30 a minute`,p:1+done/PAIRS.length*3},
    {t:"Full F barre",d:fe?`Easy F ⇄ C at ${fe} a minute`:"Easy F not timed yet",p:fe>=30?2:fe>=15?1.5:1.1},
    {t:"Strumming consistency",d:"Not heard yet",p:0},{t:"Rhythm independence",d:"Not heard yet",p:0},
    {t:"Singing while playing",d:"Your word: rhythm slips when you sing",p:0},{t:"Eyes off the fretboard",d:"Not heard yet",p:0}]}

/* ---------- screens ---------- */
function today(v){const sk=skills(),st=streak(),needs=MINE.slice().sort((a,b)=>chordStatus(a).s-chordStatus(b).s||chordStatus(a).top-chordStatus(b).top).slice(0,6),ms=milestones();
  v.innerHTML=`<div class="bento">
    ${heroHTML()}
    <div class="c4" style="display:grid;gap:var(--gap)">
      <section class="blk tang streak" style="--n:1"><span class="lbl">Streak</span><b class="tight">${st.n} day${st.n===1?"":"s"}</b>
        <div class="week">${st.week.map(d=>`<span><i class="${d.on?"on":""}"></i>${d.d}</span>`).join("")}</div></section>
      <section class="blk inkb quick" style="--n:2"><span class="lbl">Practice room</span><div>
        <button data-tool="tuner">Tuner <span>E A D G B e</span></button><button data-tool="metro">Metronome <span>${state.bpm||80} bpm</span></button><button data-tool="omc">One-minute changes <span>with the best move</span></button></div></section>
    </div>
    <section class="blk inkb c12 neck" style="--n:3"><div class="neck-h"><h2 class="tight">Where you are</h2><span class="lbl">six skills · six strings · pluck one</span></div>
      <div class="frets"><ol>${STAGE.map(s=>`<li>${s}</li>`).join("")}</ol></div>
      ${sk.map((s,i)=>`<div class="str" data-str="${i}"><span><b>${s.t}</b><small>${s.d}</small></span><span class="wire"><svg viewBox="0 0 1000 66" preserveAspectRatio="none"><path d="M0 33L1000 33" stroke="${i<3?"var(--bronze)":"var(--steel)"}" stroke-width="${(5-i*.75).toFixed(2)}"/></svg><i class="pick${s.p?"":" open"}" style="--p:${Math.max(1.5,Math.min(98.5,s.p/4*100)).toFixed(1)}%"></i></span></div>`).join("")}
      <p class="note">A hollow pick means the app hasn't heard it yet. The assessment fills those in.</p></section>
  </div>
  <div class="sec-h"><h2 class="tight">Needs your attention</h2><button data-go="chords">all ${MINE.length} chords →</button></div>
  <div class="tiles fit">${needs.map(tile).join("")}</div>
  <div class="sec-h"><h2 class="tight">Your songs</h2><span>plays through: your word · singing: not yet</span></div>
  <div class="bento">${SONGS.map((s,i)=>`<section class="blk ${s.c} c4 song" style="--n:${i}"><span class="lbl">${s.a}</span><div><h3 class="tight">${s.t}</h3><p>Not heard by the app yet</p></div></section>`).join("")}</div>
  <div class="sec-h"><h2 class="tight">First milestones</h2><span>${ms.filter(m=>m.ok).length} of ${ms.length} · measured, not assumed</span></div>
  <section class="blk"><div class="rows" style="columns:2 340px;column-gap:44px">${ms.map(m=>`<div class="row" style="break-inside:avoid"><span><i class="tick${m.ok?" done":""}"></i><b>${m.t}</b></span><span class="val">${m.v}</span></div>`).join("")}</div></section>`;
  wireStrings(v)}

function milestones(){const pb=pairBests(),hit=PAIRS.filter(([a,b])=>(pb[pk(a,b)]||0)>=30).length,clean=MINE.filter(c=>chordStatus(c).s>=3).length;
  return[{t:"Every chord clean",v:`${clean} of ${MINE.length}`,ok:clean===MINE.length},{t:"30 changes in 60 seconds",v:`${hit} of ${PAIRS.length} pairs`,ok:hit===PAIRS.length},
    {t:"Progressions without pauses",v:"not heard",ok:false},{t:"Steady strum with a metronome",v:"not heard",ok:false},{t:"Three songs without stopping",v:"your word",ok:false},
    {t:"Speak lyrics while strumming",v:"not yet",ok:false},{t:"Hum the melody in time",v:"not yet",ok:false},{t:"Sing a whole song at tempo",v:"not yet",ok:false}]}

// strings that behave like strings: they ring when you touch them, and sound once you've clicked anything
function wireStrings(root){root.querySelectorAll("[data-str]").forEach((row,k)=>{const i=+row.dataset.str,path=row.querySelector("path");let raf=0;
  const ring=(amp,snd)=>{const t0=performance.now(),f=6+i*1.7,tau=.6-i*.05;cancelAnimationFrame(raf);if(snd&&ac)pluck(OPEN_HZ[i],null,.28);
    (function fr(now){const t=(now-t0)/1000,e=Math.exp(-t/tau);if(e<.02){path.setAttribute("d","M0 33L1000 33");return}path.setAttribute("d",`M0 33Q500 ${(33+amp*e*Math.cos(2*Math.PI*f*t)*2).toFixed(1)} 1000 33`);raf=requestAnimationFrame(fr)})(t0)};
  row.onpointerenter=()=>ring(13-i*1.4,true);row.onclick=()=>{ctx();ring(18-i*1.6,true)};
  if(!matchMedia("(prefers-reduced-motion:reduce)").matches)setTimeout(()=>ring(11-i,false),420+k*90)})}

function tile(c){const st=chordStatus(c),ch=CH[c],nx=NEXT.includes(c)&&!st.s;
  return`<button class="tile" data-chord="${esc(c)}" data-s="${st.s}"><header><b class="wide">${esc(label(c))}</b><span>${ch.tag||""}</span></header>${dia(c)}<footer><span>${nx?"Up next":STAGE[st.s]}</span><span>${st.top?st.top+"/min":""}</span></footer></button>`}

function chords(v){const pb=pairBests(),heard=MINE.filter(c=>chordStatus(c).s).length;
  v.innerHTML=`<span class="lbl">Chord mastery · ${heard} heard · ${MINE.length-heard} not heard</span><h1 class="tight title">Knowing isn't <em>mastering.</em></h1>
    <div class="key"><span class="k0">Not heard</span><span>Learning</span><span class="k2">Developing</span><span class="k3">Proficient</span><span class="k4">Mastered · clean on 3 days</span></div>
    ${GROUPS.map(([g,list])=>`<div class="group"><h3>${g}</h3><div class="tiles">${list.map(tile).join("")}</div></div>`).join("")}
    <div class="group"><h3>Next: barre chords</h3><div class="tiles">${NEXT.map(tile).join("")}</div></div>
    <div class="sec-h"><h2 class="tight">Your ten changes</h2><span>target 30 a minute · tap one to drill it</span></div>
    <section class="blk"><div class="rows">${PAIRS.map(([a,b])=>{const n=pb[pk(a,b)];return`<button class="row${n>=30?" hit":""}" data-tool="omc" data-a="${esc(a)}" data-b="${esc(b)}"><span class="pair wide">${esc(label(a))}<i>→</i>${esc(label(b))}</span><span class="val">${n!=null?`<em>${n}</em> / 30`:"not timed"}</span><span class="meter"><i style="width:${Math.min(100,(n||0)/30*100)}%"></i></span></button>`}).join("")}</div></section>`}

function chordSheet(c){const st=chordStatus(c),sh=$("#sheet"),nx=NEXT.includes(c)&&!st.s,M=(k,val)=>`<div class="row"><b>${k}</b><span class="val">${val}</span></div>`,buddy=st.mine.find(p=>p.n<30)?.with||MINE.find(x=>x!==c&&CH[x]);
  ctx();strum(c);
  sh.innerHTML=`<button class="x" aria-label="Close">×</button><span class="lbl">${nx?"Up next":STAGE[st.s]}</span><h2 class="wide">${esc(label(c))}</h2>${dia(c)}
    <div><button class="go dark" data-tool="omc" data-a="${esc(c)}" data-b="${esc(buddy)}">Drill ${esc(label(c))} ⇄ ${esc(label(buddy))} <i></i></button></div>
    <div class="rows">${M("Shape forms correctly",st.tests.length?`${st.tests.filter(t=>t.ok).length} of ${st.tests.length} tests`:"not heard")}${M("Every string rings","not heard")}${M("Time to form","not heard")}
      ${M("Fastest change",st.top?`<em>${st.top}</em> a minute, with ${esc(label(st.mine[0].with))}`:"not timed")}${M("Changes at 30+",st.mine.length?`<em>${st.fast}</em> of ${st.mine.length} pairs`:"not timed")}
      ${M("Holds up in rhythm","not heard")}${M("Sticks between sessions",st.box?`memory level <em>${st.box}</em> of 7`:"not heard")}</div>
    <p class="lbl" style="margin-top:18px;line-height:1.6">${nx?"Not started. Comes after your easy F is solid.":st.s===0?"You've said you know this one. It moves up when the app hears it.":st.s<4?"Mastered needs a clean test on three different days.":""}</p>`;
  sh.hidden=false;sh.querySelector(".x").onclick=()=>sh.hidden=true}

function practice(v){v.innerHTML=`<span class="lbl">Tools and drills, any time</span><h1 class="tight title">Practice <em>room.</em></h1>
  <div class="bento">
    <button class="blk amber c4 tool" data-tool="tuner"><span class="art"><i class="needle"></i></span><span class="lbl">Tool</span><span><h2 class="tight">Tuner</h2><p>Pluck a string. The screen turns green when it's in tune.</p></span></button>
    <button class="blk tang c4 tool" data-tool="metro" style="--n:1"><span class="art"><i class="pend"></i></span><span class="lbl">Tool</span><span><h2 class="tight">Metro&shy;nome</h2><p>4/4, 3/4 or 6/8. Tap the tempo in, or use the arrow keys.</p></span></button>
    <button class="blk cobalt c4 tool" data-tool="omc" style="--n:2"><span class="art"><i class="ringart"></i></span><span class="lbl">Drill</span><span><h2 class="tight">One-minute changes</h2><p>Sixty seconds, two chords, and the best way to move between them.</p></span></button>
    <button class="blk mintb c6 tool" data-tool="sing" style="--n:3;min-height:230px"><span class="lbl">Drill</span><span><h2 class="tight">Sing over the strum</h2><p>Speak, hum, then sing, while the mic watches your strumming hand.</p></span></button>
    <button class="blk c6 tool" data-tool="strum" style="--n:4;min-height:230px"><span class="lbl">Drill</span><span><h2 class="tight">Strum lab</h2><p>Quarter notes to sixteenths, scored on timing.</p></span></button>
    <button class="blk inkb c12 tool" data-tool="assess" style="--n:5;min-height:150px"><span class="lbl">Ten minutes</span><span><h2 class="tight">The assessment</h2><p>Everything you say you know, played for the mic.</p></span></button>
  </div>`}

const PLAN={
  assess:["The assessment","Being built next. Five parts, about twelve minutes, mic on.",["<b>Chords.</b> Strum each chord once. The app checks every string rings and times how fast the shape lands.","<b>Changes.</b> Your ten pairs, counted by ear.","<b>Rhythm.</b> Downs, ups, eighths and sixteenths against a click, scored on timing.","<b>Songs.</b> Perfect, Yellow and Sailor Song start to finish, watching for stops.","<b>Singing.</b> Speak, hum, then sing over a steady strum, to find which step breaks first."]],
  songs:["Songs","Your three songs, plus everything you add.",["<b>Your recordings.</b> Every song you've already added and synced carries over.","<b>Play-through check.</b> The app listens for stops and marks a song as heard, not just claimed.","<b>Why it works.</b> The key, the chord numbers and the pattern behind each song."]],
  you:["You","Your record and settings.",["<b>Progress.</b> Practice minutes, change speeds and timing scores over time.","<b>Backup.</b> One file with everything, so nothing depends on one browser.","<b>Settings.</b> Microphone, left-handed charts, daily goal."]]};
function plan(v,k){const[t,l,items]=PLAN[k];v.innerHTML=`<span class="lbl">In the build queue</span><h1 class="tight title">${t}</h1><p class="lede">${l}</p><section class="blk plan"><ul>${items.map(i=>`<li>${i}</li>`).join("")}</ul></section>`}

/* ---------- the best way between two chords ---------- */
const fingerMap=c=>{const m={};CH[c].n.forEach((fg,i)=>{if(fg)(m[fg]=m[fg]||[]).push({s:i,f:CH[c].f[i]})});return m};
// what each finger does going a → b, and the order to think about it in: anchors first, then slides, then the fingers that travel
function bestMove(a,b){const A=fingerMap(a),B=fingerMap(b),F=[1,2,3,4],kind={},steps=[],one=x=>x&&x.length===1?x[0]:null,pl=(n,w)=>`${n} ${w}${n>1?"s":""}`;
  F.forEach(f=>{const p=A[f],q=B[f];if(!p&&!q)return;if(!p){kind[f]="land";return}if(!q){kind[f]="lift";return}const same=p.length===q.length&&p.every((x,k)=>x.s===q[k].s);
    kind[f]=same&&p[0].f===q[0].f?"stay":same?"slide":"move"});
  const both=F.filter(f=>A[f]&&B[f]);let shift=null;
  if(both.length>=2&&!F.some(f=>kind[f]==="land"||kind[f]==="lift")&&both.every(f=>A[f].length===B[f].length)){const d=both.flatMap(f=>A[f].map((p,k)=>[B[f][k].s-p.s,B[f][k].f-p.f]));if(d.every(x=>x[0]===d[0][0]&&x[1]===d[0][1])&&(d[0][0]||d[0][1]))shift=d[0]}
  const at=p=>`${SNAME[p.s]} string, fret ${p.f}`;
  if(shift){const[ds,df]=shift;steps.push(["","<b>Freeze the shape.</b> Every finger keeps its place in the shape."]);
    steps.push(["",`<b>Move it as one block</b>${ds?`, ${pl(Math.abs(ds),"string")} ${ds>0?"towards the floor":"towards your face"}`:""}${df?`${ds?" and":","} ${pl(Math.abs(df),"fret")} ${df>0?"up the neck":"towards the headstock"}`:""}.`])}
  else{F.filter(f=>kind[f]==="stay").forEach(f=>steps.push(["stay",`<b>Finger ${f} stays down</b> on the ${A[f].length>1?`barre at fret ${A[f][0].f}`:at(A[f][0])}. Pivot around it.`]));
    F.filter(f=>kind[f]==="slide").forEach(f=>steps.push(["slide",`<b>Finger ${f} slides</b> along the ${SNAME[A[f][0].s]} string, fret ${A[f][0].f} to ${B[f][0].f}. Keep it touching.`]));
    const mv=F.filter(f=>kind[f]==="move"||kind[f]==="land"),up=F.filter(f=>kind[f]==="lift");
    if(!steps.length&&mv.length){const i=CH[b].f.findIndex((f,k)=>f>0&&CH[b].n[k]),lead=CH[b].n[i];steps.push(["",`<b>Lead with finger ${lead}</b>: aim it at the ${SNAME[i]} string, fret ${CH[b].f[i]}. It's the first note your strum hits.`]);
      const rest=mv.filter(f=>f!==lead);if(rest.length)steps.push(["",`<b>Finger${rest.length>1?"s":""} ${rest.join(" and ")} land${rest.length>1?"":"s"} with it</b>: ${rest.map(f=>`${f} on the ${at(B[f][0])}`).join("; ")}.`])}
    else if(mv.length===1)steps.push(["",`<b>Only finger ${mv[0]} travels</b>: to the ${at(B[mv[0]][0])}.`]);
    else if(mv.length)steps.push(["",`<b>Fingers ${mv.join(" and ")} land together</b>: ${mv.map(f=>`${f} on the ${at(B[f][0])}`).join("; ")}.`]);
    if(up.length)steps.push(["",`<b>Finger${up.length>1?"s":""} ${up.join(" and ")} lift${up.length>1?"":"s"} off</b> and hover close to the strings.`])}
  const la=CH[a].f.findIndex(f=>f>=0),lb=CH[b].f.findIndex(f=>f>=0);if(la!==lb)steps.push(["",`<b>Strum from the ${SNAME[lb]} string</b> for ${label(b)} (${label(a)} starts on the ${SNAME[la]}).`]);
  return{A,B,kind,steps}}

// an animated chart: fingers travel a → b → a along dotted paths. Mint stays, amber slides, white travels
function moveClip(a,b){const{A,B,kind}=bestMove(a,b),up=[...CH[a].f,...CH[b].f].filter(f=>f>0),top=up.length?Math.max(...up):1,base=top>4?Math.min(...up):1,nf=Math.max(4,Math.min(6,top-base+1));
  const X=s=>30+s*28,Y=f=>46+(f-base+.5)*44,H=46+nf*44+12,col={stay:"var(--mint)",slide:"var(--amber)",move:"#fff",land:"#fff",lift:"#fff"},ink=k=>k==="stay"||k==="slide"?"var(--ink)":"var(--cobalt)";
  let s=`<svg viewBox="0 0 200 ${H}" role="img" aria-label="${esc(label(a))} to ${esc(label(b))}, animated"><rect x="30" y="${base>1?44:40}" width="140" height="${base>1?2:6}" rx="1" fill="#fff"/>`;
  if(base>1)s+=`<text x="20" y="${Y(base)+4}" font-size="12" font-family="JetBrains Mono,monospace" text-anchor="end" fill="#fff">${base}</text>`;
  for(let j=1;j<=nf;j++)s+=`<line x1="30" x2="170" y1="${46+j*44}" y2="${46+j*44}" stroke="#fff" stroke-opacity=".25" stroke-width="1.5"/>`;
  for(let i=0;i<6;i++)s+=`<line x1="${X(i)}" x2="${X(i)}" y1="46" y2="${46+nf*44}" stroke="#fff" stroke-opacity=".6" stroke-width="${2.6-i*.3}"/>`;
  [[a,"a"],[b,"b"]].forEach(([c,k])=>{s+=`<g class="fd mk" data-ph="${k}">`+CH[c].f.map((f,i)=>f<0?`<path d="M${X(i)-5} 17l10 10m0-10l-10 10" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>`:f===0?`<circle cx="${X(i)}" cy="22" r="5" fill="none" stroke="#fff" stroke-width="2"/>`:"").join("")+`</g>`});
  const dot=(f,p)=>(p.length>1?`<rect x="${X(p[0].s)-12}" y="-12" width="${X(p.at(-1).s)-X(p[0].s)+24}" height="24" rx="12" fill="${col[kind[f]]}"/><text x="${X(p[0].s)}" y="4.5" fill="${ink(kind[f])}" font-size="13" font-weight="700" font-family="JetBrains Mono,monospace" text-anchor="middle">${f}</text>`
    :`<circle r="12" fill="${col[kind[f]]}"/>${kind[f]==="stay"?`<circle class="ring" r="18" fill="none" stroke="var(--mint)" stroke-width="2.5"/>`:""}<text y="4.5" fill="${ink(kind[f])}" font-size="13" font-weight="700" font-family="JetBrains Mono,monospace" text-anchor="middle">${f}</text>`);
  const pos=p=>p?(p.length>1?`0,${Y(p[0].f)}`:`${X(p[0].s)},${Y(p[0].f)}`):"none";
  // dotted paths for the fingers that travel
  for(let f=1;f<=4;f++){const p=A[f],q=B[f];if(p&&q&&p.length===1&&q.length===1&&kind[f]!=="stay")s+=`<line x1="${X(p[0].s)}" y1="${Y(p[0].f)}" x2="${X(q[0].s)}" y2="${Y(q[0].f)}" stroke="${col[kind[f]]}" stroke-width="2" stroke-dasharray="1 6" stroke-linecap="round" opacity=".8"/>`}
  for(let f=1;f<=4;f++){const p=A[f],q=B[f];if(!p&&!q)continue;const same=p&&q&&p.length===q.length&&(p.length===1||p.every((x,k)=>x.s===q[k].s));
    if(same||!p||!q)s+=`<g class="fd" data-pa="${pos(p)}" data-pb="${pos(q)}">${dot(f,p||q)}</g>`;else s+=`<g class="fd" data-pa="${pos(p)}" data-pb="none">${dot(f,p)}</g><g class="fd" data-pa="none" data-pb="${pos(q)}">${dot(f,q)}</g>`}
  return s+"</svg>"}

/* ---------- full-screen tools ---------- */
let closers=[];
function openStage(name,bg,fg,html){const st=$("#stage");closeStage();st.style.setProperty("--bg",bg);st.style.setProperty("--fg",fg);
  st.innerHTML=`<div class="stage-h"><span class="mono">${name}</span><button class="x" aria-label="Close" data-close>×</button></div><div class="stage-b">${html}</div>`;st.hidden=false;$("#sheet").hidden=true;clockOn();return st}
function closeStage(){closers.forEach(f=>{try{f()}catch{}});closers=[];clockOff();const st=$("#stage");if(!st.hidden){st.hidden=true;st.innerHTML="";go(current,true)}}
const loop=fn=>{let on=true;(function f(){if(!on)return;fn();requestAnimationFrame(f)})();closers.push(()=>on=false)};
const onKey=fn=>{document.addEventListener("keydown",fn);closers.push(()=>document.removeEventListener("keydown",fn))};

function tuner(){const st=openStage("Tuner","var(--amber)","var(--ink)",`<div class="tuner"><b class="tight note" style="opacity:.28">Pluck</b>
    <div class="cents"><i></i><span style="left:0">flat · tighten</span><span style="right:0">sharp · loosen</span></div>
    <p class="hint" data-h>Starting the mic…</p><div class="pegs">${PEG.map((p,i)=>`<button data-peg="${i}" aria-label="Hear the ${SNAME[i]} string">${p}</button>`).join("")}</div>
    <p class="hint">Tap a letter to hear that string.</p></div>`),note=st.querySelector(".note"),pk2=st.querySelector(".cents i"),h=st.querySelector("[data-h]"),pegs=[...st.querySelectorAll("[data-peg]")],got=new Set();
  pegs.forEach((b,i)=>b.onclick=()=>pluck(OPEN_HZ[i],null,.5));let sm=null,last=-1,hold=0,quiet=0;
  ears().then(ok=>{if(st.hidden)return;if(!ok){h.textContent="No mic. Tap a letter and match your string to it by ear.";return}h.textContent="Pluck one string and let it ring.";
    loop(()=>{if(level()<.003){if(++quiet>90){st.style.setProperty("--bg","var(--amber)")}return}quiet=0;const f=pitch();if(!f)return;
      let si=0,bd=1e9;OPEN_HZ.forEach((o,i)=>{const d=Math.abs(1200*Math.log2(f/o));if(d<bd)bd=d,si=i});const c=1200*Math.log2(f/OPEN_HZ[si]);if(Math.abs(c)>400)return;
      sm=sm===null||si!==last?c:sm*.75+c*.25;const ok=Math.abs(sm)<5;pegs.forEach((b,i)=>b.classList.toggle("on",i===si));note.className="wide note";note.style.opacity=1;note.textContent=PEG[si].toUpperCase();
      pk2.style.transform=`translateX(${Math.max(-50,Math.min(50,sm))/50*Math.min(330,st.querySelector(".cents").clientWidth/2-14)}px)`;st.style.setProperty("--bg",ok?"var(--mint)":"var(--amber)");
      h.textContent=ok?"In tune. Hold it…":sm<0?`${Math.round(-sm)} cents flat. Tighten a touch.`:`${Math.round(sm)} cents sharp. Loosen a touch.`;
      if(ok&&si===last){if(++hold===24&&!got.has(si)){got.add(si);pegs[si].classList.add("done");tick(ctx().currentTime,true);if(got.size===6){h.textContent="All six in tune.";window.partDone&&window.partDone("tune")}}}else hold=0;last=si})})}

function metro(){let bpm=state.bpm||80,sig=state.sig||"4/4",on=false,next=0,beat=0,q=[],taps=[];const N=()=>+sig[0];
  const st=openStage("Metronome","var(--tang)","#fff",`<div class="metro"><b class="tight bpm">${bpm}</b><div class="beats"></div>
    <div class="tempo"><button data-d="-5">−5</button><button data-d="-1">−1</button><input type="range" min="40" max="220" value="${bpm}" aria-label="Tempo"><button data-d="1">+1</button><button data-d="5">+5</button></div>
    <div class="seg">${["4/4","3/4","6/8"].map(s=>`<button data-sig="${s}">${s}</button>`).join("")}</div>
    <div style="display:flex;gap:10px"><button class="btn" data-go2>Start</button><button class="btn ghost" data-tap>Tap tempo</button></div>
    <p class="hint"><kbd>Space</kbd> start / stop · <kbd>↑</kbd><kbd>↓</kbd> 1 bpm · <kbd>←</kbd><kbd>→</kbd> 5 bpm · <kbd>T</kbd> tap</p></div>`),B=st.querySelector(".bpm"),beats=st.querySelector(".beats"),sl=st.querySelector("input"),goB=st.querySelector("[data-go2]");
  const draw=()=>{B.textContent=bpm;sl.value=bpm;beats.innerHTML="<i></i>".repeat(N());st.querySelectorAll("[data-sig]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.sig===sig));state.bpm=bpm;state.sig=sig;save()};
  const set=v=>{bpm=Math.max(40,Math.min(220,Math.round(v)));draw()},toggle=()=>{on=!on;goB.textContent=on?"Stop":"Start";if(on){next=ctx().currentTime+.08;beat=0;q=[]}else[...beats.children].forEach(i=>i.classList.remove("on"))};
  const tap=()=>{const t=performance.now();taps=taps.filter(x=>t-x<2500);taps.push(t);if(taps.length>1)set(60000/((t-taps[0])/(taps.length-1)))};
  st.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>set(bpm+ +b.dataset.d));sl.oninput=()=>set(+sl.value);st.querySelectorAll("[data-sig]").forEach(b=>b.onclick=()=>{sig=b.dataset.sig;beat=0;draw()});
  goB.onclick=toggle;st.querySelector("[data-tap]").onclick=tap;draw();
  // clicks are scheduled a little ahead on the audio clock, so the beat stays steady even if the screen stutters
  loop(()=>{if(!on)return;const a=ctx(),n=N();while(next<a.currentTime+.12){const b=beat%n,acc=b===0||(sig==="6/8"&&b===3);tick(next,acc);q.push({t:next,b});next+=60/bpm;beat++}
    while(q.length&&q[0].t<=a.currentTime){const b=q.shift().b;[...beats.children].forEach((i,k)=>i.classList.toggle("on",k===b));B.classList.add("kick");requestAnimationFrame(()=>requestAnimationFrame(()=>B.classList.remove("kick")))}});
  onKey(e=>{if(e.key===" "){e.preventDefault();toggle()}else if(e.key==="ArrowUp")set(bpm+1);else if(e.key==="ArrowDown")set(bpm-1);else if(e.key==="ArrowRight")set(bpm+5);else if(e.key==="ArrowLeft")set(bpm-5);else if(e.key.toLowerCase()==="t")tap()})}

function omc(a0,b0){let a=CH[a0]?a0:(state.lastPair||["C","G"])[0],b=CH[b0]?b0:(state.lastPair||["C","G"])[1],run=null,n=0,micOn=false,ph="a";if(a===b)b=a==="G"?"C":"G";
  const opts=sel=>[...MINE,...NEXT].map(c=>`<option value="${esc(c)}"${c===sel?" selected":""}>${esc(label(c))}${CH[c].tag?" ("+CH[c].tag+")":""}</option>`).join("");
  const st=openStage("One-minute changes","var(--cobalt)","#fff",`<div class="omc"><div class="move"></div>
    <div class="clock"><div class="dial"><div><b class="tight" data-n>60</b><span data-l>seconds</span></div></div><button class="btn" data-start>Start</button>
      <p class="hint" data-h></p><div class="pairs"></div></div></div>`),mv=st.querySelector(".move"),dial=st.querySelector(".dial"),N=st.querySelector("[data-n]"),L=st.querySelector("[data-l]"),h=st.querySelector("[data-h]"),startB=st.querySelector("[data-start]");
  let flip=null;
  function draw(){const m=bestMove(a,b),best=pairBests()[pk(a,b)];state.lastPair=[a,b];save();
    mv.innerHTML=`<h2 class="tight"><label class="pick2"><b>${esc(label(a))}</b><select data-sa aria-label="First chord">${opts(a)}</select></label><span style="opacity:.5">to</span><label class="pick2"><b>${esc(label(b))}</b><select data-sb aria-label="Second chord">${opts(b)}</select></label></h2>
      <div class="clip still">${moveClip(a,b)}</div><div><span class="lbl">The best move</span><ol class="steps" style="margin-top:12px">${m.steps.map(([k,t])=>`<li class="${k}"><span>${t}</span></li>`).join("")}</ol>
        <p class="hint" style="text-align:left;margin-top:14px">Coming back is the same moves in reverse. Start moving on your last up-strum.</p></div>
      <div class="legend"><span><i style="background:var(--mint)"></i>stays down</span><span><i style="background:var(--amber)"></i>slides</span><span><i style="background:#fff"></i>travels</span><span>tap the chart to pause</span></div>`;
    mv.querySelector("[data-sa]").onchange=e=>{a=e.target.value;if(a===b)b=MINE.find(c=>c!==a);draw()};mv.querySelector("[data-sb]").onchange=e=>{b=e.target.value;if(a===b)a=MINE.find(c=>c!==b);draw()};
    const clip=mv.querySelector(".clip"),G=[...clip.querySelectorAll(".fd")];let paused=false;ph="b";
    const show=k=>{ph=k;G.forEach(g=>{if(g.dataset.ph){g.style.opacity=g.dataset.ph===k?1:0;return}const v2=g.dataset["p"+k];if(v2==="none")g.style.opacity=0;else{const[x,y]=v2.split(",");g.style.transform=`translate(${x}px,${y}px)`;g.style.opacity=1}})};
    show("a");requestAnimationFrame(()=>requestAnimationFrame(()=>clip.classList.remove("still")));clip.querySelector("svg").onclick=()=>paused=!paused;
    clearInterval(flip);flip=setInterval(()=>{if(!paused&&!run)show(ph==="a"?"b":"a")},1900);
    st.querySelector(".pairs").innerHTML=PAIRS.map(([x,y])=>`<button data-x="${esc(x)}" data-y="${esc(y)}" class="${pk(x,y)===pk(a,b)?"on":""}">${esc(label(x))}→${esc(label(y))}${pairBests()[pk(x,y)]!=null?" · "+pairBests()[pk(x,y)]:""}</button>`).join("");
    st.querySelectorAll("[data-x]").forEach(p=>p.onclick=()=>{if(run)return;a=p.dataset.x;b=p.dataset.y;draw()});
    N.textContent=60;L.textContent="seconds";dial.style.setProperty("--t",1);h.innerHTML=best!=null?`Your best: <b>${best}</b> a minute. Target 30.`:"Not timed yet. Target 30 a minute."}
  closers.push(()=>{clearInterval(flip);clearInterval(run?.iv)});
  function finish(){clearInterval(run.iv);run=null;const prev=pairBests()[pk(a,b)];(state.tests.pair[pk(a,b)]=state.tests.pair[pk(a,b)]||[]).push({t:Date.now(),n});save();tick(ctx().currentTime,true);if(typeof markDone==="function"){markDone("omc:"+pk(a,b));bruv(n>=30?`${n}. That's the target. Clean.`:prev!=null&&n>prev?`${n}. New best. Keep going.`:`${n}. Thirty is the target. Watch the green fingers and go again.`,n>=30?"jump":"talk")}
    N.textContent=n;L.textContent="changes";startB.textContent="Go again";st.style.setProperty("--bg",n>=30?"var(--mint)":"var(--cobalt)");st.style.setProperty("--fg",n>=30?"var(--ink)":"#fff");
    h.innerHTML=prev==null?`<b>${n}</b> changes. That's your first score for this pair.`:n>prev?`<b>${n}</b> changes. New best, up from ${prev}.`:`<b>${n}</b> changes. Your best is ${prev}.`;draw2()}
  const draw2=()=>st.querySelectorAll("[data-x]").forEach(p=>{const v2=pairBests()[pk(p.dataset.x,p.dataset.y)];p.textContent=`${label(p.dataset.x)}→${label(p.dataset.y)}${v2!=null?" · "+v2:""}`});
  async function start(){if(run)return;st.style.setProperty("--bg","var(--cobalt)");st.style.setProperty("--fg","#fff");micOn=await ears();n=0;let left=63,cur=null,cand=null,hits=0;const t0=ctx().currentTime+.1;[0,1,2].forEach(i=>tick(t0+i,false));tick(t0+3,true);
    startB.textContent="Stop";L.textContent="get ready";N.textContent=3;h.innerHTML=micOn?`I'm counting by ear. Missed one? Tap the dial or press <kbd>C</kbd>.`:`No mic, so tap the dial or press <kbd>C</kbd> for each change.`;
    run={iv:setInterval(()=>{left--;if(left>60){N.textContent=left-60;return}if(left===60)L.textContent="changes";dial.style.setProperty("--t",left/60);if(left<=0)finish()},1000)};
    // a change counts when the chord that's ringing flips from one to the other and holds for a few frames
    if(micOn)loop(()=>{if(!run||left>60)return;const c=hears(a)?a:hears(b)?b:null;if(!c){hits=0;return}if(c!==cand){cand=c;hits=1;return}if(++hits===3&&c!==cur){if(cur)bump();cur=c}})}
  const bump=()=>{if(!run)return;n++;N.textContent=n},stop=()=>{if(run){clearInterval(run.iv);run=null;startB.textContent="Start";draw()}};
  startB.onclick=()=>run?stop():start();dial.onclick=bump;onKey(e=>{if(/^(SELECT|INPUT)$/.test(e.target.tagName))return;if(e.key===" "){e.preventDefault();run?stop():start()}else if(e.key.toLowerCase()==="c")bump()});draw()}

/* ---------- shell ---------- */
const VIEWS={today,chords,practice},TOOLS={tuner,metro,omc};let current="today";
function go(k,quiet){current=k;const v=$("#view");$("#sheet").hidden=true;(VIEWS[k]||(x=>plan(x,PLAN[k]?k:"assess")))(v);
  document.querySelectorAll(".dock button").forEach(b=>b.setAttribute("aria-selected",b.dataset.go===k));if(location.hash.slice(1)!==k)history.replaceState(null,"","#"+k);if(!quiet)scrollTo(0,0);chips()}
function chips(){const s=streak();$("#chips").innerHTML=`${live?"":`<span class="chip dim">preview · your 8 Nov progress</span>`}<span class="chip"><i class="pk"></i>${s.n} day${s.n===1?"":"s"}</span>`}
document.addEventListener("click",e=>{const t=e.target.closest("[data-tool]"),g=e.target.closest("[data-go]"),c=e.target.closest("[data-chord]");
  if(e.target.closest("[data-close]"))closeStage();else if(t){ctx();TOOLS[t.dataset.tool](t.dataset.a,t.dataset.b)}else if(c)chordSheet(c.dataset.chord);else if(g){e.preventDefault();go(g.dataset.go)}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!$("#stage").hidden)closeStage();else $("#sheet").hidden=true}
  else if($("#stage").hidden&&/^[1-7]$/.test(e.key)&&!e.metaKey&&!e.ctrlKey&&!/^(SELECT|INPUT)$/.test(e.target.tagName))go([...document.querySelectorAll(".dock button")][e.key-1]?.dataset.go||"today")});
addEventListener("hashchange",()=>{const k=location.hash.slice(1)||"today";if(k!==current)go(k)});
current=location.hash.slice(1)||"today"; // os-more.js draws the first screen once the coach and drills are loaded
