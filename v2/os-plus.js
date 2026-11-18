/* Guitar OS, part eight: eyes-up playing and the rest of the wish list.
   Chord call-outs, vocal range and key fitting, eyes-off and steady-tempo drills, pasting chord sheets, singing over a
   recording, "what next", a weekly report, badges and a calendar reminder. Loaded after os-book.js, before os-hands.js. */

/* ---------- Bruv calls out chords (always spoken: it's for when your eyes are elsewhere) ---------- */
const sayChord=n=>String(n).replace(/^([A-G])#/,"$1 sharp ").replace(/^([A-G])b/,"$1 flat ").replace(/m$/," minor").replace(/m7$/," minor seven").replace(/7$/," seven");
function callOut(t){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);if(brVoice)u.voice=brVoice;u.lang=brVoice?.lang||"en-GB";u.rate=1.15;speechSynthesis.speak(u)}catch{}}
const NNAME=m=>NOTES[((Math.round(m)%12)+12)%12]+(Math.floor(Math.round(m)/12)-1);
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s[s.length>>1]};

/* ---------- your vocal range ---------- */
function range(then){let step=0,got=[];const st=openStage("Your vocal range","var(--mint)","var(--ink)",`<div class="lab"><span class="mono" data-n>Step 1 of 2</span><h2 class="tight" data-t>Sing your lowest comfortable note</h2><b class="wide" data-nt style="font-size:min(22vh,170px);line-height:.9;text-transform:none">–</b>
    <div class="steady"><i data-p></i></div><p class="hint" data-h>Any vowel, like “ahh”. Not a growl: the lowest note you could sing a song on. Hold it for three seconds.</p><button class="btn" data-again hidden>Do it again</button></div>`),q=k=>st.querySelector(k);
  const run=async()=>{if(!await ears()){q("[data-h]").textContent="This needs the mic. Check it in Practice, Mic check.";return}got=[];let held=0;loop(()=>{if(step>1)return;if(!loud()){held=Math.max(0,held-2);return}const f=pitch();if(!f||f<70||f>1100)return;const m=69+12*Math.log2(f/440);got.push(m);if(got.length>40)got.shift();q("[data-nt]").textContent=NNAME(median(got));held++;q("[data-p]").style.width=Math.min(100,held/150*100)+"%";
    if(held>=150){const v=median(got);held=0;got=[];if(step===0){state.vr={lo:v};step=1;q("[data-n]").textContent="Step 2 of 2";q("[data-t]").textContent="Now your highest comfortable note";q("[data-h]").textContent="Not a squeak: the highest you'd sing a chorus on without straining. Hold it.";bruv("Good. Now the highest one you can sing comfortably.");q("[data-p]").style.width=0}
      else{step=2;const lo=state.vr.lo,hi=Math.max(v,lo+5);state.voiceRange={lo,hi,t:Date.now()};save();q("[data-t]").textContent=`${NNAME(lo)} to ${NNAME(hi)}`;q("[data-nt]").textContent=`${Math.round(hi-lo)} notes`;q("[data-h]").textContent="Saved. In any song-book song, press Fit my voice to get a capo that suits it.";q("[data-again]").hidden=false;markDone("range");bruv(`That's about ${Math.round((hi-lo)/12*10)/10} octaves. Now songs can fit you.`,"jump");then&&setTimeout(()=>{closeStage();then()},1800)}}})};
  q("[data-again]").onclick=()=>{step=0;q("[data-again]").hidden=true;q("[data-n]").textContent="Step 1 of 2";q("[data-t]").textContent="Sing your lowest comfortable note";run()};run();bruv("Lowest comfortable note first. Hold it till the bar fills.")}
// you sing the opening line after one strum of the first chord; the app compares that to your range and moves the capo
function fitVoice(s,capo,done){if(!state.voiceRange){bruv("First I need your range. Thirty seconds.");return range(()=>{TOOLS.book(s.t)})}
  const R=state.voiceRange,first=s.sec[0][1][0].split("|")[0];let got=[],run=false;const st=openStage("Fit my voice · "+esc(s.t),"var(--mint)","var(--ink)",`<div class="lab"><h2 class="tight">I'll strum ${esc(label(first))} once. Then sing the first line on your own.</h2>
    <b class="wide" data-nt style="font-size:min(20vh,150px);line-height:.9;text-transform:none">–</b><button class="btn" data-go2>Strum it</button><p class="hint" data-h>Capo ${capo||"off"} for now. Sing at the volume you'd really sing it.</p><div data-out style="display:flex;gap:10px"></div></div>`),q=k=>st.querySelector(k);
  q("[data-go2]").onclick=async()=>{if(run)return;if(!await ears()){q("[data-h]").textContent="This needs the mic.";return}run=true;got=[];strumAt(first,capo,.3);q("[data-go2]").textContent="Listening…";const t0=performance.now()+1500;
    loop(()=>{if(!run||performance.now()<t0)return;if(performance.now()-t0>9000){run=false;finish();return}if(!loud())return;const f=pitch();if(f&&f>70&&f<1100){const m=69+12*Math.log2(f/440);got.push(m);q("[data-nt]").textContent=NNAME(m)}})};
  function finish(){q("[data-go2]").textContent="Again";if(got.length<25){q("[data-h]").textContent="I didn't catch enough singing. Go a little louder.";return}const sorted=[...got].sort((a,b)=>a-b),top=sorted[Math.floor(sorted.length*.9)],bot=sorted[Math.floor(sorted.length*.1)];
    // keep your highest notes two below your top, and your lowest three above your bottom
    let shift=0;if(top>R.hi-2)shift=-Math.ceil(top-(R.hi-2));else if(bot<R.lo+3)shift=Math.ceil(R.lo+3-bot);const want=capo+shift,c2=Math.max(0,Math.min(7,want));
    q("[data-h]").innerHTML=shift===0?`<b>That key suits you.</b> Your notes sat between ${NNAME(bot)} and ${NNAME(top)}, comfortably inside your range.`:`Your notes ran ${NNAME(bot)} to ${NNAME(top)}. ${shift<0?"That's near the top of your range":"That's near the bottom of your range"}, so move the capo to <b>${c2?`fret ${c2}`:"off"}</b>.${want<0?" Even with no capo it's high for you: sing it an octave lower, or ask me for a lower key.":want>7?" Capo 7 is as far as it goes.":""}`;
    q("[data-out]").innerHTML=`<button class="btn" data-use>Use capo ${c2||"off"}</button>`;q("[data-use]").onclick=()=>{done(c2);closeStage();TOOLS.book(s.t);bruv(`Capo ${c2||"off"} it is. That's your key for ${s.t}.`,"jump")};bruv(shift===0?"Spot on for your voice.":`Try capo ${c2||"off"}. Your voice will thank you.`)}
  bruv("One strum, then you sing the first line. I'm only listening to how high and low you go.")}

/* ---------- eyes off the fretboard ---------- */
function eyes(){const pool=(()=>{const p=MINE.filter(c=>chordStatus(c).s>=2&&!CH[c].tag);return p.length>=4?p:["G","C","D","Em","Am"]})();let n=0,times=[],cur=null,prev=null,t0=0,hits=0,state2="idle",mic=false;const ROUND=10;
  const st=openStage("Eyes off the fretboard","var(--ink)","#fff",`<div class="lab"><span class="mono" data-n></span><h2 class="tight" data-t>Look at the screen, not your hand.</h2><b class="wide" data-c style="font-size:min(30vh,240px);line-height:.9;text-transform:none;color:var(--amber)">👀</b>
    <p class="hint" data-h>Bruv calls a chord out loud. Play it without looking down. The name only shows if you're stuck for five seconds.</p><button class="btn" data-go2 style="background:var(--amber);color:var(--ink)">Start</button></div>`),q=k=>st.querySelector(k);
  const next=()=>{if(n>=ROUND){state2="idle";const ok=times.filter(x=>x!=null),avg=ok.length?ok.reduce((a,b)=>a+b,0)/ok.length:null;(state.eyes=state.eyes||[]).push({t:Date.now(),avg,ok:ok.length,n:ROUND});save();markDone("eyes");q("[data-c]").textContent=avg?`${(avg/1000).toFixed(1)}s`:"–";q("[data-t]").textContent=`${ok.length} of ${ROUND} without looking`;q("[data-go2]").textContent="Again";q("[data-go2]").hidden=false;
      bruv(avg&&avg<1800?"Under two seconds, eyes up. That's how you play while you sing.":"Keep at it. Picture the shape before your fingers move.",avg&&avg<1800?"jump":"talk");return}
    n++;prev=cur;do cur=pool[Math.floor(Math.random()*pool.length)];while(cur===prev);q("[data-n]").textContent=`${n} of ${ROUND}`;q("[data-c]").textContent="👀";hits=0;callOut(sayChord(label(cur)));t0=performance.now();state2="wait";
    if(!mic)q("[data-h]").innerHTML="No mic: press <kbd>Space</kbd> the moment the chord rings."};
  const got=()=>{if(state2!=="wait")return;state2="gap";const ms=performance.now()-t0;times.push(ms<5000?ms:null);q("[data-c]").textContent=label(cur);q("[data-h]").textContent=ms<5000?`${(ms/1000).toFixed(1)} seconds`:"Took a look. That's fine, next one.";setTimeout(next,1100)};
  q("[data-go2]").onclick=async()=>{mic=await ears();n=0;times=[];cur=null;q("[data-go2]").hidden=true;next()};
  loop(()=>{if(state2!=="wait")return;const el=performance.now()-t0;if(el>5000&&q("[data-c]").textContent==="👀")q("[data-c]").textContent=label(cur);if(el>9000){times.push(null);got();return}if(mic&&hears(cur,prev?[prev,cur]:undefined)){if(++hits>=3)got()}else hits=Math.max(0,hits-1)});
  onKey(e=>{if(e.key===" "){e.preventDefault();if(state2==="wait")got();else if(state2==="idle")q("[data-go2]").click()}});bruv("Eyes on me, not on your hand. I'll call the chords.")}

/* ---------- steady tempo: the click drops out, you keep going ---------- */
function steady(){const bpm=state.steadyBpm||76,ms=60000/bpm/2,PLAN=[["click",2],["gap",1],["click",2],["gap",2],["click",2],["gap",4],["click",1]];let run=null;
  const st=openStage("Steady tempo","var(--cobalt)","#fff",`<div class="lab"><h2 class="tight">Strum eighths. The click drops out. Keep going.</h2><div class="lane" data-lane style="grid-template-columns:repeat(8,1fr)">${lane(PATS.du)}</div>
    <div class="segs" data-plan>${PLAN.map(([k,b],i)=>`<i class="${k}" data-i="${i}" style="flex:${b}">${k==="gap"?`${b} bar${b>1?"s":""} alone`:"click"}</i>`).join("")}</div>
    <div class="tempo"><button data-d="-4">−4</button><b class="mono" data-b style="min-width:80px;text-align:center;font-size:15px">${bpm} bpm</b><button data-d="4">+4</button></div><button class="btn" data-go2>Start</button><p class="hint" data-h>Any chord. Down-up on every eighth note, and keep your hand swinging through the silence.</p></div>`),q=k=>st.querySelector(k),L=q("[data-lane]");
  st.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>{if(run)return;state.steadyBpm=Math.max(56,Math.min(120,(state.steadyBpm||76)+ +b.dataset.d));save();closeStage();steady()});
  q("[data-go2]").onclick=async()=>{if(run)return;const mic=await ears();if(!mic){q("[data-h]").textContent="This one needs the mic to hear whether you drifted.";return}const det=onsetDetector(),on=[],grid=[];let slot=-8;const total=PLAN.reduce((a,p)=>a+p[1],0)*8,segAt=[];PLAN.forEach(([k,b],i)=>{for(let j=0;j<b*8;j++)segAt.push(i)});
    q("[data-go2]").textContent="Listening…";run=setInterval(()=>{if(st.hidden){clearInterval(run);return}const j=((slot%8)+8)%8,beat=j%2===0;[...L.children].forEach((c,x)=>c.classList.toggle("on",x===j));
      if(slot<0){if(beat)tick(ctx().currentTime,j===0)}else{const seg=segAt[slot],kind=PLAN[seg][0];st.querySelectorAll("[data-i]").forEach(e=>e.classList.toggle("on",+e.dataset.i===seg));if(kind==="click"&&beat)tick(ctx().currentTime,j===0);grid.push({t:performance.now(),seg,slot})}
      if(++slot>=total){clearInterval(run);run=null;setTimeout(()=>score(on,grid),ms)}},ms);(function f(){if(!run&&slot<total)return;const t=det();if(t)on.push(t);if(run)requestAnimationFrame(f)})()};
  function score(on,grid){q("[data-go2]").textContent="Again";[...L.children].forEach(c=>c.classList.remove("on"));
    const near=g=>{let b=1e9;on.forEach(o=>{if(Math.abs(o-g.t)<Math.abs(b))b=o-g.t});return b},clickOffs=grid.filter(g=>PLAN[g.seg][0]==="click").map(near).filter(d=>Math.abs(d)<ms*.5),lag=clickOffs.length>4?median(clickOffs):0;
    if(on.length<grid.length*.35){q("[data-h]").textContent="I couldn't hear enough strums to judge. Strum a bit firmer, closer to the mic.";return}
    const res=PLAN.map(([k,b],i)=>{if(k!=="gap")return null;const last=grid.filter(g=>g.seg===i).slice(-8),d=last.map(g=>near(g)-lag).filter(d=>Math.abs(d)<ms*.6);return d.length>=3?{bars:b,drift:Math.round(median(d))}:{bars:b,drift:null}}).filter(Boolean);
    (state.steady=state.steady||[]).push({t:Date.now(),bpm,res});save();markDone("steady");const worst=res.reduce((a,r)=>r.drift==null?a:Math.max(a,Math.abs(r.drift)),0);
    q("[data-h]").innerHTML=res.map(r=>`${r.bars} bar${r.bars>1?"s":""} alone: ${r.drift==null?"too quiet to tell":`<b>${Math.abs(r.drift)<40?"on the beat":`${Math.abs(r.drift)} ms ${r.drift<0?"early (rushing)":"late (dragging)"}`}</b>`}`).join(" · ");
    bruv(worst<40?"Rock solid. You don't need the click, it needs you.":worst<90?"Close. You drift a little on the long gap. Feel the beat in your foot.":"You drifted. Tap your foot and keep the hand swinging through the gaps.",worst<40?"jump":"talk")}
  bruv("Two bars of click, then I go quiet. You keep the time.")}

/* ---------- paste a chord sheet → a song-book song ---------- */
function addSheet(){const st=openStage("Add a chord sheet","var(--fog)","var(--ink)",`<div class="edit"><div class="edit-l"><label class="mono">Title<input data-t placeholder="Song name"></label><label class="mono">Artist<input data-a></label>
      <label class="mono">Strum<select data-p style="display:block;width:100%;margin-top:8px;border-radius:16px;background:#fff;padding:14px 16px;font:500 16px var(--body)">${Object.entries(PATS).map(([k,p])=>`<option value="${k}"${k==="folk"?" selected":""}>${p.n}</option>`).join("")}</select></label>
      <label class="mono">Tempo (bpm)<input data-bpm type="number" min="40" max="200" value="90"></label><div><span class="mono">Capo</span><div class="seg" style="margin-top:8px;background:#fff">${[0,1,2,3,4,5,6,7].map(k=>`<button data-capo="${k}">${k||"None"}</button>`).join("")}</div></div>
      <button class="btn" data-save style="background:var(--cobalt);color:#fff">Add to my song book</button><p class="hint" data-msg style="text-align:left"></p></div>
    <div class="edit-r"><span class="mono">Paste the chord sheet · chords on the line above the words, [Verse] style headings</span><textarea data-sheet spellcheck="false" placeholder="[Verse]&#10;G            Em&#10;words of the first line&#10;C            D&#10;words of the second line&#10;&#10;[Chorus]&#10;..."></textarea></div></div>`),q=k=>st.querySelector(k);let capo=0;
  const dc=()=>st.querySelectorAll("[data-capo]").forEach(b=>b.setAttribute("aria-pressed",+b.dataset.capo===capo));st.querySelectorAll("[data-capo]").forEach(b=>b.onclick=()=>{capo=+b.dataset.capo;dc()});dc();
  // any chord name → one of your shapes: Bm7 → Bm, Gsus4 → G, F → easy F. Anything else is reported, not guessed
  const toShape=raw=>{const k=chordKey(raw);if(!k)return null;if(k==="F")return"Feasy";if(CH[k])return k;const sev=raw.replace(/[()]/g,"").match(/^([A-G][#b]?)(7)$/);return sev&&CH[sev[1]+"7"]?sev[1]+"7":null};
  q("[data-save]").onclick=()=>{const title=q("[data-t]").value.trim(),txt=q("[data-sheet]").value;if(!title){q("[data-msg]").textContent="Give it a title.";return}const sh=parseSheet(txt),sec=[],lines=[],unknown=new Set();let cur=null,gbar=0;
    sh.lines.forEach(L=>{if(L.h){cur=[L.h,[]];sec.push(cur);return}const cs=(L.segs||[]).filter(g=>g.raw).map(g=>({raw:g.raw,c:toShape(g.raw)}));if(!cs.length)return;if(!cur){cur=["Song",[]];sec.push(cur)}const idx=[];
      cs.forEach(({raw,c})=>{if(!c){unknown.add(raw);return}cur[1].push(c);idx.push(gbar++)});const text=(L.segs||[]).map(g=>g.t||"").join("").trim()||cs.map(x=>x.raw).join("  ");lines.push({text,bars:idx})});
    const secs=sec.filter(s=>s[1].length);if(!secs.length){q("[data-msg]").textContent="I couldn't find any chords I know in that. Put chord names on their own line above the words.";return}
    const song={t:title,a:q("[data-a]").value.trim(),capo,bpm:Math.max(40,Math.min(200,+q("[data-bpm]").value||90)),pat:q("[data-p]").value,lv:0,mine:true,teach:"From your chord sheet. One chord per bar.",sec:secs,lines};
    state.myBook=(state.myBook||[]).filter(s=>s.t!==title);state.myBook.push(song);save();q("[data-msg]").innerHTML=`Added, ${secs.reduce((a,s)=>a+s[1].length,0)} bars.${unknown.size?` Skipped chords I don't have shapes for yet: <b>${[...unknown].join(", ")}</b>.`:""}`;bruv(`${title} is in your song book.`,"jump");setTimeout(()=>{closeStage();TOOLS.book(title)},unknown.size?2600:900)};
  bruv("Paste the sheet with chords above the words. I'll turn it into bars and strum it with you.")}

/* ---------- a sing-over take played back with its track ---------- */
document.addEventListener("click",async e=>{const b=e.target.closest("[data-mix]");if(!b)return;const tk=(await TAKES.all()).find(x=>x.id===b.dataset.mix),song=tk&&(await STU.all()).find(s=>s.id===tk.songId);if(!song){bruv("The recording for that song isn't on this device any more.","sad");return}
  if(window._mix){window._mix.forEach(a=>a.pause());window._mix=null;b.textContent="▶ With the track";return}const tr=new Audio(await audioURL(song)),me=new Audio(URL.createObjectURL(tk.blob));tr.preservesPitch=true;tr.playbackRate=tk.rate||1;tr.currentTime=tk.at||0;tr.volume=.55;
  await Promise.all([tr.play().catch(()=>{}),me.play().catch(()=>{})]);window._mix=[tr,me];b.textContent="■ Stop";me.onended=()=>{tr.pause();window._mix=null;b.textContent="▶ With the track"}});
{const _s=VIEWS.songs;VIEWS.songs=async v=>{await _s(v);if(!v.querySelector("[data-drop]"))return;let takes=[];try{takes=await TAKES.all()}catch{}takes.filter(t=>t.songId).forEach(t=>{const del=v.querySelector(`[data-deltake="${t.id}"]`);del&&del.insertAdjacentHTML("beforebegin",`<button class="btn sm lite" data-mix="${t.id}">▶ With the track</button>`)})}}

/* ---------- what next ---------- */
function whatNext(){if(!state.assess)return{t:"The assessment",why:"You haven't done the assessment yet. Everything else builds on it.",run:()=>TOOLS.assess()};const set=todaysSet(),n=set.find(x=>!doneToday(x.k));
  if(n)return{t:n.t,why:`${n.t}. ${n.d}.`,run:()=>TOOLS[n.tool](n.a,n.b)};if(!doneToday("revise")&&Date.now()-(state.revisions?.at(-1)?.t||0)>20*36e5)return{t:"Revision",why:"Today's set is done. A revision run locks it in.",run:()=>go("revise")};
  const L=LESSONS.find(l=>!learned(l.id));if(L)return{t:L.t,why:`Learn something new: ${L.t}.`,run:()=>lesson(L.id)};const pb=pairBests(),w=PAIRS.map(([a,b])=>({a,b,n:pb[pk(a,b)]??0})).sort((x,y)=>x.n-y.n)[0];return{t:`${label(w.a)} ⇄ ${label(w.b)}`,why:`Your slowest change. Beat ${w.n}.`,run:()=>TOOLS.omc(w.a,w.b)}}
{const _c=chips;chips=function(){_c();$("#chips").insertAdjacentHTML("afterbegin",`<button class="chip next" data-whatnext>What next?</button>`)}}
document.addEventListener("click",e=>{if(!e.target.closest("[data-whatnext]"))return;ctx();const w=whatNext();bruv(w.why+" Starting it.","talk");setTimeout(w.run,1400)});

/* ---------- weekly report ---------- */
function weekly(){const mins=d=>(OLD.stats.mins?.[d]||0)+(state.days[d]||0),sum=(a,b)=>[...Array(7)].reduce((s,_,i)=>s+mins(ago(a+i)),0),tw=sum(0),lw=sum(7),wk=Date.now()-7*864e5;
  const ups=Object.entries(state.tests.pair).map(([k,arr])=>{const before=Math.max(-1,...arr.filter(t=>t.t<wk).map(t=>t.n)),now=Math.max(-1,...arr.filter(t=>t.t>=wk).map(t=>t.n));return{k,before,now}}).filter(x=>x.now>x.before&&x.now>0).sort((a,b)=>(b.now-b.before)-(a.now-a.before));
  const sm=(state.strum||[]).filter(x=>x.t>=wk).map(x=>x.pct),learnedW=Object.entries(state.learn||{}).filter(([,t])=>t>=wk).length,revW=(state.revisions||[]).filter(x=>x.t>=wk).length,sk=skills().slice().sort((a,b)=>a.p-b.p)[0];
  return{tw:Math.round(tw),lw:Math.round(lw),ups,strum:sm.length?Math.round(sm.reduce((a,b)=>a+b,0)/sm.length):null,learnedW,revW,focus:sk}}
{const _y=VIEWS.you;VIEWS.you=v=>{_y(v);const w=weekly(),bento=v.querySelector(".bento");if(!bento)return;state.lastReport=Date.now();save();
  bento.insertAdjacentHTML("afterbegin",`<section class="blk cobalt c12 report"><span class="lbl">This week</span><h2 class="tight">${w.tw} minutes${w.lw?` <small>${w.tw>=w.lw?"▲":"▼"} from ${w.lw}</small>`:""}</h2>
    <div class="rep">${[[w.ups.length?w.ups.slice(0,3).map(u=>`${u.k.split("|").map(label).join("⇄")} ${u.before<0?"":u.before+"→"}${u.now}`).join("<br>"):"none timed","Changes improved"],[w.strum!=null?w.strum+"%":"–","Strum timing"],[w.learnedW,"Lessons learned"],[w.revW,"Revisions"]].map(([a,b])=>`<div><b>${a}</b><span>${b}</span></div>`).join("")}</div>
    <p>Next week's focus: <b>${esc(w.focus.t)}</b>. ${esc(w.focus.d)}.</p></section>`)}}

/* ---------- badges ---------- */
const anyPair30=()=>Object.values(pairBests()).some(n=>n>=30);
const BADGES=[["assess","Proved it","Took the assessment",()=>!!state.assess],["streak7","One week","7-day streak",()=>streak().n>=7],["streak30","Habit","30-day streak",()=>streak().n>=30],
  ["thirty","Thirty","30 changes in a minute",anyPair30],["ten","All ten","All ten test changes at 30+",()=>PAIRS.every(([a,b])=>(pairBests()[pk(a,b)]||0)>=30)],["cleanF","Clean F","Every string of the full F rings",()=>state.strings?.F?.ok?.every(Boolean)],
  ["barre","Barred","Finished the barre course",()=>LESSONS.filter(l=>l.track==="Barre chords").every(l=>learned(l.id))],["song","No stops","A song start to finish with no stops",()=>Object.values(state.songs||{}).some(x=>x.ok)],
  ["sang","Sang it","Held the strum while singing",()=>(state.singRuns||[]).some(x=>x.step==="sing"&&x.e<.2)],["take","On tape","Recorded your first take",()=>!!doneToday("take")||!!state.badges?.take],
  ["eyes","Eyes up","Eyes-off drill under 2 seconds",()=>(state.eyes||[]).some(x=>x.avg&&x.avg<2000)],["steady","Metronome","Held the beat through 4 silent bars",()=>(state.steady||[]).some(x=>x.res.some(r=>r.bars===4&&r.drift!=null&&Math.abs(r.drift)<40))],
  ["ears","Good ears","8 out of 10 in an ear round",()=>Object.values(state.ear||{}).flat().some(x=>x.right>=8)],["theory","Knows why","Finished the theory course",()=>LESSONS.filter(l=>l.track==="Theory").every(l=>learned(l.id))],
  ["learn10","Ten lessons","Learned 10 lessons",()=>Object.keys(state.learn||{}).length>=10],["revise5","Regular","5 revisions",()=>(state.revisions||[]).length>=5]];
function checkBadges(){state.badges=state.badges||{};const fresh=BADGES.filter(([id,,,ok])=>!state.badges[id]&&(()=>{try{return ok()}catch{return false}})());if(!fresh.length)return;fresh.forEach(([id])=>state.badges[id]=Date.now());save();bruv(`New badge: ${fresh.map(b=>b[1]).join(", ")}. ${fresh[0][2]}.`,"jump")}
{const _g=go;go=function(k,q){_g(k,q);setTimeout(checkBadges,900)}}{const _m=markDone;markDone=function(k){_m(k);setTimeout(checkBadges,1500)}}
{const _y=VIEWS.you;VIEWS.you=v=>{_y(v);const n=BADGES.filter(b=>state.badges?.[b[0]]).length;v.querySelector(".bento")?.insertAdjacentHTML("beforeend",`<section class="blk c12"><span class="lbl">Badges · ${n} of ${BADGES.length}</span><div class="badges">${BADGES.map(([id,t,d])=>`<div class="bdg${state.badges?.[id]?" got":""}"><i class="pk"></i><b>${t}</b><small>${d}</small></div>`).join("")}</div></section>`)}}

/* ---------- daily reminder in your calendar ---------- */
function reminder(time){const[h,m]=time.split(":").map(Number),d=new Date();d.setHours(h,m,0,0);if(d<new Date())d.setDate(d.getDate()+1);const p=n=>String(n).padStart(2,"0"),dt=x=>`${x.getFullYear()}${p(x.getMonth()+1)}${p(x.getDate())}T${p(x.getHours())}${p(x.getMinutes())}00`,url=location.origin+location.pathname;
  const ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Guitar OS//EN","BEGIN:VEVENT",`UID:guitaros-${Date.now()}@bruv`,`DTSTAMP:${dt(new Date())}`,`DTSTART:${dt(d)}`,`DTEND:${dt(new Date(d.getTime()+20*6e4))}`,"RRULE:FREQ=DAILY","SUMMARY:Guitar with Bruv","DESCRIPTION:20 minutes. "+url,"URL:"+url,"BEGIN:VALARM","TRIGGER:PT0M","ACTION:DISPLAY","DESCRIPTION:Guitar time","END:VALARM","END:VEVENT","END:VCALENDAR"].join("\r\n");
  const a=document.createElement("a");a.href="data:text/calendar;charset=utf-8,"+encodeURIComponent(ics);a.download="guitar-reminder.ics";a.click();state.remind=time;save();bruv("Open that file and press Add. I'll see you every day at "+time+".")}
{const _y=VIEWS.you;VIEWS.you=v=>{_y(v);v.querySelector("[data-exp]")?.closest(".row")?.insertAdjacentHTML("beforebegin",`<div class="row"><span><b>Daily reminder</b><small>Adds a repeating event to your calendar</small></span><span style="display:flex;gap:8px;align-items:center"><input type="time" data-rt value="${state.remind||"19:00"}" style="border:1px solid var(--line);border-radius:10px;padding:8px"><button class="btn sm" data-rem>Add</button></span></div>`);v.querySelector("[data-rem]").onclick=()=>reminder(v.querySelector("[data-rt]").value||"19:00")}}

/* ---------- wire in: tools, Practice tiles, skills, revision ---------- */
Object.assign(TOOLS,{range,eyes,steady,addsheet:addSheet});
{const _p=VIEWS.practice;VIEWS.practice=v=>{_p(v);v.querySelector('[data-tool="miccheck"]')?.insertAdjacentHTML("beforebegin",`<button class="blk inkb c4 tool" data-tool="eyes" style="min-height:210px"><span class="lbl">Drill</span><span><h2 class="tight">Eyes off</h2><p>Bruv calls chords. You play them without looking.</p></span></button>
  <button class="blk cobalt c4 tool" data-tool="steady" style="min-height:210px"><span class="lbl">Drill</span><span><h2 class="tight">Steady tempo</h2><p>The click drops out. Keep the beat.</p></span></button>
  <button class="blk mintb c4 tool" data-tool="range" style="min-height:210px"><span class="lbl">Voice</span><span><h2 class="tight">Vocal range</h2><p>${state.voiceRange?`${NNAME(state.voiceRange.lo)} to ${NNAME(state.voiceRange.hi)}. Sing it again any time.`:"Find your range so songs can be put in your key."}</p></span></button>`)}}
{const _sk=skills;skills=function(){const s=_sk(),e=(state.eyes||[]).at(-1),d=(state.steady||[]).at(-1);if(e?.avg){s[5].p=e.avg<1800?3:e.avg<3000?2:1;s[5].d=`${(e.avg/1000).toFixed(1)}s a change without looking`}
  if(d){const r=d.res.find(x=>x.bars===4);if(r?.drift!=null){const a=Math.abs(r.drift);s[3].p=Math.max(s[3].p||0,a<40?3:a<90?2:1);s[3].d=`Four bars alone: ${a<40?"on the beat":a+" ms "+(r.drift<0?"early":"late")}`}}return s}}
{const _rp=revisionPlan;revisionPlan=function(){const p=_rp(),i=p.findIndex(x=>x.t.startsWith("Ear")),odd=new Date().getDate()%2;p.splice(i<0?p.length:i,0,odd?{t:"Eyes off the fretboard",m:1.5,run:()=>TOOLS.eyes()}:{t:"Steady tempo",m:1.5,run:()=>TOOLS.steady()});
  const pairs=p.filter(x=>x.t.includes("⇄"));if(pairs.length>2)p.splice(p.indexOf(pairs.at(-1)),1);return p}}
LINES.today=(f=>()=>Date.now()-(state.lastReport||0)>7*864e5&&state.assess?"Your weekly report is ready on the You tab.":f())(LINES.today);
go(current,true);
