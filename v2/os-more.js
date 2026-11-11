/* Guitar OS, part two: Bruv the coach, the assessment, Strum lab, Sing over the strum, Songs and You.
   Loaded after os.js and uses its chords, mic, sounds, record and full-screen stage. */

/* ---------- Bruv: tells you what to do, out loud if you want ---------- */
const BR={frames:{idle:6,talk:4,jump:5,sad:8,gest:6,lookdown:8},mood:"idle",f:0,until:0};
document.body.insertAdjacentHTML("beforeend",`<aside class="bruv" id="bruv" aria-live="polite"><p hidden></p><button aria-label="Bruv. Tap to hear that again"><img src="../bruv/idle_0.png" alt="" width="78" height="120"></button></aside>`);
const brEl=$("#bruv"),brImg=brEl.querySelector("img"),brP=brEl.querySelector("p");let brLast="",brVoice=null;
setInterval(()=>{if(performance.now()>BR.until&&BR.mood!=="idle")BR.mood="idle";BR.f=(BR.f+1)%BR.frames[BR.mood];brImg.src=`../bruv/${BR.mood}_${BR.f}.png`},170);
const pickVoice=()=>{const v=speechSynthesis.getVoices();brVoice=v.find(x=>/Daniel|Google UK English Male/.test(x.name))||v.find(x=>x.lang==="en-GB")||v.find(x=>x.lang.startsWith("en"))||null};
if(window.speechSynthesis){pickVoice();speechSynthesis.onvoiceschanged=pickVoice}
function bruv(t,mood="talk",quiet){brLast=t;brP.innerHTML=t;brP.hidden=!t;BR.mood=mood;BR.f=0;BR.until=performance.now()+Math.max(1800,String(t).length*55);
  brP.classList.remove("pop");void brP.offsetWidth;brP.classList.add("pop");
  // inside a tool the bubble steps aside after he's said it, so it never sits on the controls
  clearTimeout(BR.hide);if(!$("#stage").hidden)BR.hide=setTimeout(()=>brP.hidden=true,Math.max(5000,String(t).length*75));
  if(!quiet&&state.voice!==false&&window.speechSynthesis&&ac){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(t).replace(/<[^>]+>/g," ").replace(/[→⇄]/g," to "));if(brVoice)u.voice=brVoice;u.lang=brVoice?.lang||"en-GB";u.rate=1.05;speechSynthesis.speak(u)}catch{}}}
brEl.querySelector("button").onclick=()=>{ctx();if(brP.hidden&&brLast)bruv(brLast);else if(!brP.hidden){brP.hidden=true;try{speechSynthesis.cancel()}catch{}}};
const hush=()=>{try{speechSynthesis.cancel()}catch{}};
const pickOne=a=>a[Math.floor(Math.random()*a.length)];

/* ---------- what's heard so far, folded into the record ---------- */
{const _cs=chordStatus;chordStatus=function(c){const r=_cs(c),ok=r.tests.filter(t=>t.ok);if(ok.length){const ms=Math.min(...ok.map(t=>t.ms||9e9));r.s=Math.max(r.s,ms<2500?2:1);r.ms=ms}return r}}
{const _sk=skills;skills=function(){const s=_sk(),a=state.assess;if(!a)return s;
  if(a.rhythm){const v=Object.values(a.rhythm).filter(x=>x!=null),avg=v.length?Math.round(v.reduce((x,y)=>x+y,0)/v.length):null;if(avg!=null){s[2].p=avg>=85?3:avg>=65?2:1;s[2].d=`${avg}% on time against a click`}}
  if(a.sing?.base!=null){const sg=a.sing,br=sg.breaks;s[4].p=!br?3:br==="sing"?2:br==="hum"?1.5:1;s[4].d=br?`Rhythm holds until you ${br}`:"Rhythm held through speak, hum and sing";
    if(sg.speak!=null){s[3].p=sg.speak<=Math.max(sg.base*1.5,.2)?2.5:1.2;s[3].d=sg.speak<=Math.max(sg.base*1.5,.2)?"Strum stays steady while you talk":"Strum wobbles when you talk"}}
  s[5].d="Not tested yet";return s}}
const todayKey=()=>ago(0),doneToday=k=>!!(state.done?.[todayKey()]?.[k]),markDone=k=>{state.done=state.done||{};(state.done[todayKey()]=state.done[todayKey()]||{})[k]=1;save();if(k!=="tune"&&window.partDone)window.partDone(k)};

// today's set: built from what the app has heard, weakest things first
function todaysSet(){const pb=pairBests(),weak=PAIRS.map(([a,b])=>({a,b,n:pb[pk(a,b)]??-1})).filter(p=>p.n<30).sort((x,y)=>x.n-y.n).slice(0,2),a=state.assess||{};
  const r=a.rhythm?Object.entries(a.rhythm).filter(([,v])=>v!=null).sort((x,y)=>x[1]-y[1])[0]:null,step=a.sing?.breaks||"speak";
  return[{k:"tune",t:"Tune up",d:"Every session starts in tune",tool:"tuner"},
    ...weak.map(p=>({k:"omc:"+pk(p.a,p.b),t:`${label(p.a)} → ${label(p.b)}`,d:p.n<0?"One minute. Not timed yet":`One minute. Beat ${p.n}`,tool:"omc",a:p.a,b:p.b})),
    {k:"strum",t:"Strum lab",d:r?`Your weakest: ${({q:"quarter notes",e:"eighths",s:"sixteenths"})[r[0]]} at ${r[1]}%`:"Lock a pattern to the click",tool:"strum"},
    {k:"sing",t:`Sing: ${step}`,d:({speak:"Say the words over a steady strum",hum:"Hum the tune, keep the hand moving",sing:"Sing a line, loop it till it holds"})[step],tool:"sing",a:step}]}
function heroHTML(){const day=new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
  if(!state.assess)return`<section class="blk cobalt c8 hero"><i class="hole"></i><div><span class="lbl">${day}</span><h1 class="tight">Prove it.</h1></div>
    <div class="foot"><p>You say you know 16 chords and three songs. Take the ten-minute assessment, mic on, and Bruv builds your plan from what he actually hears.</p><button class="go" data-tool="assess">Start the assessment <i></i></button></div></section>`;
  const set=todaysSet(),left=set.filter(x=>!doneToday(x.k)).length;
  return`<section class="blk cobalt c8 hero set"><i class="hole"></i><div><span class="lbl">${day} · ${left?left+" to go":"all done"}</span><h1 class="tight">${left?"Today's set.":"Done. Nice."}</h1></div>
    <div class="setlist">${set.map(x=>`<button data-tool="${x.tool}" ${x.a?`data-a="${esc(x.a)}"`:""} ${x.b?`data-b="${esc(x.b)}"`:""} data-done="${esc(x.k)}" class="${doneToday(x.k)?"done":""}"><i class="tick${doneToday(x.k)?" done":""}"></i><span><b>${x.t}</b><small>${x.d}</small></span></button>`).join("")}</div></section>`}

/* ---------- hearing strums: the sharp attack of the pick, not loudness ---------- */
function onsetDetector(){let base=0,noise=1,lastOn=0;return()=>{an.getFloatTimeDomainData(tbuf);const n=tbuf.length;let e=0;for(let i=n-1024;i<n;i++){const d=tbuf[i]-tbuf[i-1];e+=d*d}e=Math.sqrt(e/1024);
  const t=performance.now();noise=Math.min(noise*1.003+1e-7,Math.max(e,1e-6));const hit=e>base*1.7&&e>noise*5&&e>.0008&&t-lastOn>90;if(hit)lastOn=t;base=base*.8+e*.2;return hit?t:null}}
// timing score: find the mic's delay, pair each expected strum with the nearest one heard, judge against your own steady pulse
function timing(expected,onsets,ms){if(expected.length<4)return null;const heard=onsets.filter(o=>o>=expected[0]-ms*.5&&o<=expected.at(-1)+ms*.9),near=o=>{let b=1e9;expected.forEach(e=>{if(Math.abs(o-e)<Math.abs(b))b=o-e});return b},raw=heard.map(near).sort((a,b)=>a-b),lag=raw.length?raw[raw.length>>1]:0;
  const used=new Set(),pairs=[];expected.forEach(e=>{let bj=-1,bd=1e9;heard.forEach((o,j)=>{if(used.has(j))return;const d=o-e-lag;if(Math.abs(d)<Math.abs(bd)&&Math.abs(d)<ms*.5){bd=d;bj=j}});if(bj>=0){used.add(bj);pairs.push(bd)}});
  if(pairs.length<expected.length*.4)return{pct:null,heard:pairs.length,of:expected.length};
  const good=pairs.filter((d,i)=>{const w=pairs.slice(Math.max(0,i-4),i+5).sort((a,b)=>a-b);return Math.abs(d-w[w.length>>1])<90}).length;return{pct:Math.round(good/expected.length*100),heard:pairs.length,of:expected.length}}
// how even a run of strums is: spread of the gaps between them (0 = a machine, 0.3+ = falling apart)
function evenness(on){if(on.length<8)return null;const g=[];for(let i=1;i<on.length;i++)g.push(on[i]-on[i-1]);const s=[...g].sort((a,b)=>a-b),med=s[s.length>>1],k=g.filter(x=>x>med*.4&&x<med*2.6).map(x=>{const r=x/med;return r>1.5?r/2:r});if(k.length<6)return null;
  const m=k.reduce((a,b)=>a+b,0)/k.length;return+Math.sqrt(k.reduce((a,b)=>a+(b-m)**2,0)/k.length).toFixed(3)}
const wait=ms=>new Promise(r=>setTimeout(r,ms));

/* ---------- strum patterns ---------- */
const PATS={downs:{n:"Quarter notes",s:"D.D.D.D.",tip:"One down on every beat."},du:{n:"Eighths",s:"DUDUDUDU",tip:"Down on the number, up on the and."},
  folk:{n:"Folk strum",s:"D.DU.UDU",tip:"Down, down-up, up-down-up."},six:{n:"6/8",s:"D.DUDU",tip:"The Perfect feel. Count six."},sixteen:{n:"Sixteenths",s:"DUDUDUDUDUDUDUDU",tip:"Four strums a beat. Small, loose wrist."}};
const lane=p=>[...p.s].map((x,k)=>{const dn=x==="."?k%2===0:x==="D",cnt=p.s.length===6?k+1:p.s.length===16?["1","e","&","a","2","e","&","a","3","e","&","a","4","e","&","a"][k]:["1","&","2","&","3","&","4","&"][k];return`<i class="${x==="."?"ghost":"hit"}"><b>${x==="X"?"✕":dn?"↓":"↑"}</b>${cnt}</i>`}).join("");

function strumLab(){let key=state.pat||"folk",bpm=state.sbpm||70,run=null;
  const st=openStage("Strum lab","var(--amber)","var(--ink)",`<div class="lab"><div class="seg">${Object.entries(PATS).map(([k,p])=>`<button data-p="${k}">${p.n}</button>`).join("")}</div>
    <h2 class="tight" data-t></h2><div class="lane" data-lane></div>
    <div class="tempo"><button data-d="-5">−5</button><b class="mono" data-b style="min-width:86px;text-align:center;font-size:15px"></b><button data-d="5">+5</button></div>
    <div style="display:flex;gap:10px"><button class="btn" data-go2>Start · 4 bars</button><button class="btn ghost" data-demo>Watch Bruv do it</button></div><p class="hint" data-h></p></div>`),L=st.querySelector("[data-lane]"),h=st.querySelector("[data-h]"),goB=st.querySelector("[data-go2]");
  const P=()=>PATS[key],per=()=>60000/bpm/(P().s.length===16?4:P().s.length===6?1:2),mark=k=>[...L.children].forEach((c,j)=>c.classList.toggle("on",j===k));
  const draw=()=>{st.querySelectorAll("[data-p]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.p===key));st.querySelector("[data-t]").textContent=P().tip;L.style.gridTemplateColumns=`repeat(${P().s.length},1fr)`;L.innerHTML=lane(P());st.querySelector("[data-b]").textContent=bpm+" bpm";state.pat=key;state.sbpm=bpm;save();
    h.textContent="Your hand never stops. On a faint arrow, swing past without touching the strings."};
  st.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{if(!run){key=b.dataset.p;draw()}});st.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>{if(!run){bpm=Math.max(40,Math.min(160,bpm+ +b.dataset.d));draw()}});
  async function go2(demo){if(run){clearInterval(run);run=null;mark(-1);goB.textContent="Start · 4 bars";return}const mic=!demo&&await ears(),det=mic?onsetDetector():null,n=P().s.length,bars=demo?2:4,ms=per(),exp=[],on=[];let k=-n;
    if(det)loop(()=>{const t=det();if(t&&run)on.push(t)});goB.textContent="Stop";h.textContent=demo?"Watch the hand: it swings on every arrow.":mic?"Count-in, then the click goes quiet and I score your timing.":"No mic, so strum along with me.";
    const step=()=>{const j=((k%n)+n)%n,x=P().s[j],beat=n===6?j%3===0:n===16?j%4===0:j%2===0;mark(j);if(k<0){if(beat)tick(ctx().currentTime,j===0)}else{if(x!=="."){exp.push(performance.now());if(demo||!mic)x==="X"?chuck():strum("G",.2)}if((demo||!mic)&&beat)tick(ctx().currentTime,j===0)}
      if(++k>=n*bars){clearInterval(run);run=null;setTimeout(()=>{mark(-1);goB.textContent="Start · 4 bars";if(demo)return;const r=mic?timing(exp,on,ms):null;markDone("strum");
        if(!r)h.textContent="Done. Turn the mic on and I'll score it.";else if(r.pct==null){h.textContent=`I only heard ${r.heard} of ${r.of} strums, so no score. Move closer to the mic.`;bruv("Couldn't hear enough of that one. Closer to the mic.","sad")}
        else{(state.strum=state.strum||[]).push({t:Date.now(),p:key,bpm,pct:r.pct});save();h.innerHTML=`<b>${r.pct}% on time</b> · heard ${r.heard} of ${r.of} strums${r.pct>=80?` · try ${bpm+5} bpm`:""}`;bruv(r.pct>=80?`${r.pct} percent. Locked in. Go up five.`:r.pct>=55?`${r.pct} percent. Getting there. Same tempo again.`:`${r.pct} percent. Slow it down five and keep the hand swinging.`,r.pct>=80?"jump":"talk")}},ms)}};
    run=setInterval(step,ms);step()}
  goB.onclick=()=>go2(false);st.querySelector("[data-demo]").onclick=()=>{if(!run)go2(true)};closers.push(()=>clearInterval(run));onKey(e=>{if(e.key===" "){e.preventDefault();go2(false)}});draw();
  bruv("Pick a pattern. Watch me do it first if you want, then it's you against the click.")}

/* ---------- sing over the strum ---------- */
const SING={speak:["Speak","Keep a steady down-up strum on one chord and say the words out loud, like you're reading them. No tune."],hum:["Hum","Same strum. Hum the tune with your mouth shut. Let the changes come."],sing:["Sing","Sing one line. If the hand stutters, stop singing, keep strumming, and come back in."]};
function sing(step0){let step=SING[step0]?step0:"speak",run=null;
  const st=openStage("Sing over the strum","var(--mint)","var(--ink)",`<div class="lab"><div class="seg">${Object.entries(SING).map(([k,v],i)=>`<button data-s="${k}">${i+1} · ${v[0]}</button>`).join("")}</div>
    <h2 class="tight" data-t style="max-width:22ch"></h2><div class="steady"><i></i></div><p class="mono" data-m>steadiness</p>
    <button class="btn" data-go2>Start · 40 seconds</button><p class="hint" data-h></p></div>`),h=st.querySelector("[data-h]"),bar=st.querySelector(".steady i"),M=st.querySelector("[data-m]"),goB=st.querySelector("[data-go2]");
  const draw=()=>{st.querySelectorAll("[data-s]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.s===step));st.querySelector("[data-t]").textContent=SING[step][1];h.textContent="The bar shows how even your strum is. Keep the bar full while your mouth is busy."};
  st.querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{if(!run){step=b.dataset.s;draw()}});
  async function go2(){if(run){clearInterval(run);run=null;goB.textContent="Start · 40 seconds";return}if(!await ears()){h.textContent="This one needs the mic. Allow it and try again.";return}const det=onsetDetector(),on=[];let left=40;goB.textContent="Stop";
    loop(()=>{if(!run)return;const t=det();if(t)on.push(t);const e=evenness(on.slice(-14));if(e!=null){const g=Math.max(0,Math.min(1,1-(e-.08)/.3));bar.style.width=g*100+"%";bar.style.background=g>.6?"var(--ink)":g>.3?"var(--tang)":"#c0241c";M.textContent=g>.6?"steady":g>.3?"wobbling":"falling apart"}});
    run=setInterval(()=>{left--;goB.textContent=`Stop · ${left}s`;if(left<=0){clearInterval(run);run=null;goB.textContent="Start · 40 seconds";const e=evenness(on);markDone("sing");
      if(e==null){h.textContent="I didn't hear enough strums to judge. Strum a bit firmer.";return}(state.singRuns=state.singRuns||[]).push({t:Date.now(),step,e});save();const ok=e<.2;
      h.innerHTML=ok?`<b>Held it.</b> Your strum stayed even while you ${step==="speak"?"spoke":step==="hum"?"hummed":"sang"}.`:`<b>It slipped.</b> Your strum got uneven. Same step again, slower.`;
      bruv(ok?(step==="sing"?"You sang and the hand kept going. That's the whole trick.":"Solid. Move to the next step."):"Hand lost the beat. Halve what your mouth is doing and go again.",ok?"jump":"talk")}},1000)}
  goB.onclick=go2;closers.push(()=>clearInterval(run));onKey(e=>{if(e.key===" "){e.preventDefault();go2()}});draw();bruv("Your hand is the drummer. It doesn't stop, whatever your mouth does. Start with step one.")}

/* ---------- play-through check: any song, listening for stops ---------- */
function songCheck(title){let run=null;const st=openStage("Play-through check","var(--ink)","#fff",`<div class="lab"><span class="mono">${esc(title||"Your song")}</span><h2 class="tight" style="max-width:20ch">Play it start to finish. I'm listening for stops.</h2>
    <b class="tight" data-n style="font-size:min(26vh,200px);line-height:.85">0:00</b><div style="display:flex;gap:10px"><button class="btn" data-go2>Start</button></div><p class="hint" data-h>It stops by itself a few seconds after you finish playing.</p></div>`),N=st.querySelector("[data-n]"),h=st.querySelector("[data-h]"),goB=st.querySelector("[data-go2]");
  async function go2(){if(run){const{on,t0}=run;clearInterval(run.iv);run=null;goB.textContent="Start";const secs=(performance.now()-t0)/1000;let stops=0,gap=0;for(let i=1;i<on.length;i++){const g=(on[i]-on[i-1])/1000;gap=Math.max(gap,g);if(g>2.5)stops++}
      if(on.length<20||secs<45){h.textContent="Too short to count. Play at least a verse and a chorus.";return}(state.songs=state.songs||{})[title]={t:Date.now(),ok:!stops,stops,secs:Math.round(secs)};save();
      h.innerHTML=stops?`<b>${stops} stop${stops>1?"s":""}</b>, the longest ${gap.toFixed(1)} seconds.`:`<b>No stops.</b> ${Math.round(secs)} seconds straight through.`;bruv(stops?`You stopped ${stops} time${stops>1?"s":""}. Loop that bit, then run it again.`:"Start to finish, no stops. That one's heard.",stops?"talk":"jump");markDone("song");return}
    if(!await ears()){h.textContent="This needs the mic. Allow it and try again.";return}const det=onsetDetector(),on=[],t0=performance.now();goB.textContent="Stop";run={on,t0,iv:setInterval(()=>{const s=Math.floor((performance.now()-t0)/1000);N.textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`},500)};loop(()=>{if(!run)return;const t=det();if(t)on.push(t);else if(on.length>=20&&performance.now()-t0>45000&&performance.now()-on.at(-1)>7000)go2()})}
  goB.onclick=go2;closers.push(()=>clearInterval(run?.iv));bruv(`${title||"Your song"}. Whole thing, no stopping. Go when you're ready.`)}

/* ---------- the assessment ---------- */
function assess(){const out={t:Date.now(),chords:{},rhythm:{},songs:{},sing:{}};let dead=false,mic=false;
  const st=openStage("Assessment","var(--cobalt)","#fff",`<div class="lab as"><span class="mono" data-part></span><h2 class="tight" data-t></h2><div data-body class="asb"></div><p class="hint" data-h></p><div data-row style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"></div></div>`);
  const q=k=>st.querySelector(k),part=(n,t)=>q("[data-part]").textContent=`Part ${n} of 5 · ${t}`,T=t=>q("[data-t]").innerHTML=t,B=q("[data-body]"),H=t=>q("[data-h]").innerHTML=t,row=q("[data-row]");closers.push(()=>dead=true);
  const ask=(...btns)=>new Promise(res=>{row.innerHTML="";btns.forEach(([t,v,g])=>{const b=document.createElement("button");b.className="btn"+(g?" ghost":"");b.textContent=t;b.onclick=()=>{row.innerHTML="";res(v)};row.append(b)})});
  const until=(fn,ms)=>new Promise(res=>{const t0=performance.now();(function f(){if(dead)return res(null);const v=fn();if(v!=null)return res(v);if(performance.now()-t0>ms)return res(undefined);requestAnimationFrame(f)})()});
  const listenFor=async secs=>{const det=onsetDetector(),on=[],t0=performance.now();await until(()=>{const t=det();if(t)on.push(t);B.querySelector("[data-left]")&&(B.querySelector("[data-left]").textContent=Math.max(0,Math.ceil(secs-(performance.now()-t0)/1000)));return null},secs*1000);return on};
  (async()=>{
    part(1,"Setup");T("Ten minutes. Guitar in tune, mic on.");B.innerHTML="";H("I listen to everything you say you know. Nothing is marked on trust.");bruv("Right. Ten minutes, and I find out what you can actually play. Be honest, it only helps you.");
    if(await ask(["I'm ready","go"],["Tune first","tune",1])==="tune"){closeStage();tuner();return}
    mic=await ears();if(dead)return;if(!mic){T("I need the mic for this.");H("Allow the microphone for this site, then start again. On a Mac: the address bar's site settings.");bruv("No mic, no assessment. Switch it on and come back.","sad");return}
    // 1 chords
    part(1,"Chords");let i=0;for(const c of MINE){if(dead)return;i++;T(`${esc(label(c))}${CH[c].tag?` <small style="font-size:.4em;opacity:.6">${CH[c].tag}</small>`:""}`);B.innerHTML=`<div class="aschart">${dia(c)}</div>`;H(`Chord ${i} of ${MINE.length}. Strum it and let it ring.`);row.innerHTML=`<button class="btn ghost" data-skip>Can't play this one</button>`;
      let skipped=false;row.querySelector("[data-skip]").onclick=()=>skipped=true;if(i===1)bruv("One chord at a time. Make the shape, strum once, let it ring.");let hits=0;const t0=performance.now();
      const r=await until(()=>{if(skipped)return"skip";if(hears(c)){if(++hits>=4)return"ok"}else hits=Math.max(0,hits-1);return null},11000);if(dead)return;const ms=Math.round(performance.now()-t0);
      (state.tests.chord[c]=state.tests.chord[c]||[]).push({t:Date.now(),ok:r==="ok",ms});out.chords[c]=r==="ok"?ms:null;save();B.querySelector(".aschart").classList.add(r==="ok"?"hit":"miss");H(r==="ok"?`Heard it in ${(ms/1000).toFixed(1)}s.`:r==="skip"?"Skipped.":"Didn't hear it cleanly. Moving on.");await wait(650)}
    // 2 changes
    part(2,"Changes");let j=0;for(const[a,b]of PAIRS){if(dead)return;j++;T(`${esc(label(a))} <span style="opacity:.5">⇄</span> ${esc(label(b))}`);B.innerHTML=`<b class="tight" data-left style="font-size:min(22vh,170px);line-height:.85">20</b>`;H(`Change ${j} of ${PAIRS.length}. Back and forth, one strum each, for 20 seconds.`);row.innerHTML="";if(j===1)bruv("Now the changes. Twenty seconds each. Clean beats fast.");
      await wait(1400);let n=0,cur=null,cand=null,hits=0;const t0=performance.now();await until(()=>{B.querySelector("[data-left]").textContent=Math.max(0,Math.ceil(20-(performance.now()-t0)/1000));const c=hears(a)?a:hears(b)?b:null;if(!c){hits=0;return null}if(c!==cand){cand=c;hits=1;return null}if(++hits===3&&c!==cur){if(cur)n++;cur=c}return null},20000);if(dead)return;
      (state.tests.pair[pk(a,b)]=state.tests.pair[pk(a,b)]||[]).push({t:Date.now(),n:n*3,short:true});save();H(`${n*3} a minute.`);await wait(700)}
    // 3 rhythm
    part(3,"Rhythm");for(const[k,pat,bpm,name]of[["q","downs",70,"Quarter notes"],["e","du",70,"Eighths"],["s","sixteen",56,"Sixteenths"]]){if(dead)return;const P=PATS[pat],n=P.s.length,ms=60000/bpm/(n===16?4:2);T(name);B.innerHTML=`<div class="lane" style="grid-template-columns:repeat(${n},1fr)">${lane(P)}</div>`;H(`${P.tip} One bar of clicks, then two bars on your own.`);row.innerHTML="";if(k==="q")bruv("Rhythm. I count you in, then go quiet. You keep the time.");await wait(1600);
      const det=onsetDetector(),on=[],exp=[];let s=-n;await new Promise(res=>{const iv=setInterval(()=>{if(dead){clearInterval(iv);return res()}const jx=((s%n)+n)%n;[...B.querySelectorAll(".lane i")].forEach((c,x)=>c.classList.toggle("on",x===jx));if(s<0){if(n===16?jx%4===0:jx%2===0)tick(ctx().currentTime,jx===0)}else if(P.s[jx]!==".")exp.push(performance.now());if(++s>=n*2){clearInterval(iv);setTimeout(res,ms)}},ms);(function f(){if(dead||s>=n*2+1)return;const t=det();if(t)on.push(t);requestAnimationFrame(f)})()});if(dead)return;
      const r=timing(exp,on,ms);out.rhythm[k]=r?.pct??null;H(r?.pct!=null?`${r.pct}% on time.`:"Couldn't hear enough strums to score that one.");await wait(900)}
    // 4 songs
    part(4,"Songs");for(const sg of SONGS){if(dead)return;T(esc(sg.t));B.innerHTML=`<b class="tight" data-left style="font-size:min(22vh,170px);line-height:.85">30</b>`;H("Play any part of it for 30 seconds. Don't stop for anything.");if(sg===SONGS[0])bruv("Songs. Thirty seconds of each. A wrong chord is fine, stopping isn't.");
      if(await ask(["Start","go"],["Skip this song","skip",1])==="skip"){out.songs[sg.t]=null;continue}const on=await listenFor(30);if(dead)return;let stops=0;for(let x=1;x<on.length;x++)if(on[x]-on[x-1]>2500)stops++;const ok=on.length>=20&&!stops;out.songs[sg.t]={ok,stops,strums:on.length};H(ok?"No stops.":on.length<20?"I barely heard any strumming.":`${stops} stop${stops>1?"s":""}.`);await wait(900)}
    // 5 singing
    part(5,"Singing");T("Strum only");B.innerHTML=`<b class="tight" data-left style="font-size:min(22vh,170px);line-height:.85">15</b>`;H("A steady down-up strum on any chord, 15 seconds. No voice yet. This is your baseline.");bruv("Last part. First just strum, steady, so I know what your hand does on its own.");await ask(["Start","go"]);out.sing.base=evenness(await listenFor(15));if(dead)return;
    for(const k of["speak","hum","sing"]){T(SING[k][0]);H(SING[k][1]+" 20 seconds.");B.innerHTML=`<b class="tight" data-left style="font-size:min(22vh,170px);line-height:.85">20</b>`;await ask(["Start","go"]);out.sing[k]=evenness(await listenFor(20));if(dead)return;await wait(400)}
    const lim=Math.max((out.sing.base??.12)*1.6,.2);out.sing.breaks=["speak","hum","sing"].find(k=>out.sing[k]==null||out.sing[k]>lim)||null;
    state.assess=out;save();const heard=Object.values(out.chords).filter(v=>v!=null).length,rv=Object.values(out.rhythm).filter(v=>v!=null),songsOk=Object.values(out.songs).filter(v=>v?.ok).length;
    part(5,"Done");T("That's you, measured.");B.innerHTML=`<div class="asres"><div><b class="tight">${heard}/${MINE.length}</b><span>chords heard</span></div><div><b class="tight">${PAIRS.filter(([a,b])=>(pairBests()[pk(a,b)]||0)>=30).length}/10</b><span>changes at 30+</span></div><div><b class="tight">${rv.length?Math.round(rv.reduce((a,b)=>a+b,0)/rv.length)+"%":"–"}</b><span>on time</span></div><div><b class="tight">${songsOk}/3</b><span>songs, no stops</span></div><div><b class="tight">${out.sing.breaks?SING[out.sing.breaks][0]:"All 3"}</b><span>${out.sing.breaks?"is where singing breaks":"singing steps held"}</span></div></div>`;
    H("Your plan is built from this. It updates every time you practise.");bruv(out.sing.breaks?`Done. Your rhythm breaks when you ${out.sing.breaks}. That's where we start. Today's set is ready.`:"Done. Strong. Today's set is ready.","jump");await ask(["See today's set","x"]);closeStage();go("today")})()}

/* ---------- songs ---------- */
function libSongs(){return new Promise(res=>{try{const r=indexedDB.open("bruv-studio");r.onupgradeneeded=()=>{r.transaction.abort()};r.onerror=()=>res([]);r.onsuccess=()=>{try{const g=r.result.transaction("songs").objectStore("songs").getAll();g.onsuccess=()=>res(g.result||[]);g.onerror=()=>res([])}catch{res([])}}}catch{res([])}})}
VIEWS.songs=async v=>{const S=state.songs||{};v.innerHTML=`<span class="lbl">Your word becomes "heard" when you play it for the app</span><h1 class="tight title">Songs.</h1>
  <div class="bento">${SONGS.map((s,i)=>{const r=S[s.t];return`<section class="blk ${s.c} c4 song" style="--n:${i}"><span class="lbl">${s.a}</span><div><h3 class="tight">${s.t}</h3><p>${r?(r.ok?`Heard · no stops · ${r.secs}s`:`Heard · ${r.stops} stop${r.stops>1?"s":""}`):"Plays through: your word"}</p><button class="go dark" data-tool="songcheck" data-a="${esc(s.t)}" style="margin-top:14px">Play-through check <i></i></button></div></section>`}).join("")}</div>
  <div class="sec-h"><h2 class="tight">Your recordings</h2><span data-libn></span></div><section class="blk"><div class="rows" data-lib><p style="color:var(--ink2)">Looking for songs you've added…</p></div></section>
  <p class="lbl" style="margin-top:14px;line-height:1.7">Play-along with synced words still opens in the classic player while it's rebuilt here.</p>`;
  const lib=await libSongs(),L=v.querySelector("[data-lib]");if(!L)return;v.querySelector("[data-libn]").textContent=lib.length?`${lib.length} added`:"";
  L.innerHTML=lib.length?lib.map(s=>`<div class="row"><span><b>${esc(s.t||"Untitled")}</b><small>${esc(s.a||"Your song")}${s.bpm?` · ${Math.round(s.bpm)} bpm`:""}${s.capo?` · capo ${s.capo}`:""}</small></span><span style="display:flex;gap:8px"><button class="btn ghost" style="background:var(--fog);color:var(--ink);padding:10px 16px;font-size:14px" data-tool="songcheck" data-a="${esc(s.t||"Your song")}">Check</button><a class="btn" style="background:var(--ink);color:#fff;padding:10px 16px;font-size:14px;text-decoration:none" href="../index.html">Play along</a></span></div>`).join("")
    :`<p style="color:var(--ink2)">No recordings on this device yet. Add a song's audio in the <a href="../index.html" style="color:var(--cobalt)">classic player</a> and it appears here. Sailor Song needs adding this way.</p>`};

/* ---------- you ---------- */
VIEWS.you=v=>{const s=OLD.stats,days=[...Array(14)].map((_,i)=>{const d=ago(13-i);return{d,m:(s.mins?.[d]||0)+(state.days[d]||0)}}),mx=Math.max(20,...days.map(d=>d.m)),tot=Math.round(((s.totalSec||0)/60+Object.values(state.days).reduce((a,b)=>a+b,0))/6)/10,pb=Object.entries(pairBests()).sort((a,b)=>b[1]-a[1]);
  v.innerHTML=`<span class="lbl">Your record</span><h1 class="tight title">You.</h1>
  <div class="bento"><section class="blk inkb c8"><span class="lbl">Minutes a day · last two weeks</span><div class="bars">${days.map(d=>`<i title="${Math.round(d.m)} min · ${d.d.slice(4,10)}" style="height:${Math.max(3,d.m/mx*100)}%" class="${d.m>=15?"hit":""}"></i>`).join("")}</div></section>
    <section class="blk tang c4 streak"><span class="lbl">All time</span><b class="tight">${tot} h</b><span class="lbl">${streak().n}-day streak</span></section>
    <section class="blk c6"><span class="lbl">Fastest changes</span><div class="rows" style="margin-top:8px">${pb.slice(0,8).map(([k,n])=>`<div class="row${n>=30?" hit":""}"><span class="pair wide" style="font-size:16px">${k.split("|").map(label).join(" ⇄ ")}</span><span class="val"><em>${n}</em> / 30</span></div>`).join("")||"<p>Nothing timed yet.</p>"}</div></section>
    <section class="blk c6"><span class="lbl">Settings and backup</span><div class="rows" style="margin-top:8px">
      <label class="row"><span><b>Bruv talks out loud</b><small>He still shows his lines when this is off</small></span><input type="checkbox" data-voice ${state.voice!==false?"checked":""} style="width:22px;height:22px;accent-color:var(--cobalt)"></label>
      <div class="row"><span><b>Save a backup</b><small>One file with all your progress, old and new</small></span><button class="btn" data-exp style="background:var(--ink);color:#fff;padding:10px 16px;font-size:14px">Download</button></div>
      <label class="row"><span><b>Load a backup</b><small>Replaces the progress on this device</small></span><input type="file" accept="application/json" data-imp style="max-width:190px"></label>
      <div class="row"><span><b>Retake the assessment</b><small>${state.assess?"Last taken "+new Date(state.assess.t).toLocaleDateString("en-GB",{day:"numeric",month:"short"}):"Not taken yet"}</small></span><button class="btn" data-tool="assess" style="background:var(--cobalt);color:#fff;padding:10px 16px;font-size:14px">Start</button></div></div></section></div>`;
  v.querySelector("[data-voice]").onchange=e=>{state.voice=e.target.checked;save();if(!state.voice)hush();bruv(state.voice?"Back on the mic.":"Fine. I'll keep it to text.")};
  v.querySelector("[data-exp]").onclick=()=>{const d={};Object.keys(localStorage).filter(k=>k.startsWith("gg2_")||k==="gos_state").forEach(k=>d[k]=localStorage.getItem(k));const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(d)],{type:"application/json"}));a.download=`guitar-os-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();bruv("Backup saved. Keep that file somewhere safe.")};
  v.querySelector("[data-imp]").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());if(!Object.keys(d).some(k=>k.startsWith("gg2_")||k==="gos_state"))throw 0;if(!confirm("Replace the progress on this device with this backup?"))return;Object.keys(localStorage).filter(k=>k.startsWith("gg2_")||k==="gos_state").forEach(k=>localStorage.removeItem(k));Object.entries(d).forEach(([k,val])=>localStorage.setItem(k,val));location.reload()}catch{bruv("That file isn't a Guitar OS backup.","sad")}}};

/* ---------- wire it in ---------- */
Object.assign(TOOLS,{assess,strum:strumLab,sing,songcheck:songCheck});
{const _t=TOOLS.tuner;TOOLS.tuner=(...a)=>{_t(...a);markDone("tune");bruv("One string at a time. Screen goes green, you're in tune.")};
 const _m=TOOLS.metro;TOOLS.metro=(...a)=>{_m(...a);bruv("Space starts it. Play quieter than the click, not louder.")};
 const _o=TOOLS.omc;TOOLS.omc=(...a)=>{_o(...a);bruv("Watch the chart first. Green fingers never lift. Then hit start.")}}
const LINES={today:()=>!state.assess?"You say you can play. Prove it. Ten minutes, mic on.":(()=>{const n=todaysSet().find(x=>!doneToday(x.k));return n?`Next up: ${n.t}. ${n.d}.`:"Set's done. Play a song for fun, you've earned it."})(),
  chords:()=>{const u=MINE.filter(c=>!chordStatus(c).s).length;return u?`${u} chords I haven't heard yet. Grey ones are just your word.`:"Blue is solid. Yellow needs reps. Tap one to drill it."},
  practice:()=>"Tools on top, drills below. Tune first, always.",songs:()=>"A song counts when you play it start to finish and I hear no stops.",you:()=>"Your numbers. Save a backup now and then."};
{const _go=go;go=function(k,quiet){_go(k,quiet);if($("#stage").hidden)bruv((LINES[k]||LINES.today)(),"talk",true)}}
{const _c=closeStage;closeStage=function(){hush();_c()}}
go(current,true);
