/* Guitar OS, part seven: the song book. Chords, song structure and a strumming pattern for songs you can play with
   the chords you have. No lyrics and no recordings are stored: add your own MP3 on the Songs tab for the real thing.
   One entry per bar. "Em|D" means the bar is split, half each. Capo is where to put it to match the record. */
PATS.sailor={n:"Sailor Song",s:"D.DUDUD.DUDUD.DU",tip:"D, DUDUD, DUDUD, DU. Keep the hand going through the gaps."};
const BOOK=[
  {t:"Sailor Song",a:"Gigi Perez",lv:1,capo:0,bpm:64,pat:"sailor",teach:"Your pattern: D, DUDUD, DUDUD, DU. Each gap is a swing that misses.",sec:[["Whole song",["C","Em","G","G"]]]},
  {t:"Zombie",a:"The Cranberries",lv:1,capo:0,bpm:84,pat:"du",teach:"One loop for the whole song. Lock in your eighths.",sec:[["Whole song",["Em","C","G","D"]]]},
  {t:"Riptide",a:"Vance Joy",lv:1,capo:1,bpm:102,pat:"folk",teach:"Three chords and the folk strum at speed.",sec:[["Verse and chorus",["Am","G","C","C"]],["Bridge",["Am","G","C","Feasy"]]]},
  {t:"Stay With Me",a:"Sam Smith",lv:1,capo:0,bpm:84,pat:"downs",teach:"Slow, even downstrokes. Good first song to sing over.",sec:[["Whole song",["Am","Feasy","C","C"]]]},
  {t:"Knockin' on Heaven's Door",a:"Bob Dylan",lv:1,capo:0,bpm:68,pat:"folk",teach:"Two endings to the same line: Am, then C.",sec:[["Verse and chorus",["G","D","Am","Am","G","D","C","C"]]]},
  {t:"Perfect",a:"Ed Sheeran",lv:2,capo:1,bpm:190,pat:"six",teach:"6/8 feel. Count six to every chord.",sec:[["Verse",["G","Em","C","D"]],["Chorus",["Em","C","G","D","Em","C","G","D"]]]},
  {t:"Stand By Me",a:"Ben E. King",lv:2,capo:2,bpm:118,pat:"calypso",teach:"The 1–6–4–5 loop, two bars on G and Em.",sec:[["Whole song",["G","G","Em","Em","C","D","G","G"]]]},
  {t:"I'm Yours",a:"Jason Mraz",lv:2,capo:4,bpm:76,pat:"push",teach:"A laid-back push strum. Don't rush it.",sec:[["Verse and chorus",["G","D","Em","C"]]]},
  {t:"Let It Be",a:"The Beatles",lv:2,capo:0,bpm:72,pat:"du",teach:"Your F in a real song. Use easy F.",sec:[["Verse",["C","G","Am","Feasy","C","G","Feasy","C"]],["Chorus",["Am","G","Feasy","C","C","G","Feasy","C"]]]},
  {t:"Someone Like You",a:"Adele",lv:2,capo:2,bpm:68,pat:"du",teach:"Soft eighths, or fingerpick it with the forward roll.",sec:[["Verse and chorus",["G","D","Em","C"]]]},
  {t:"Yellow",a:"Coldplay",lv:2,capo:4,bpm:87,pat:"folk",teach:"Split bars in the chorus: two chords in one bar.",sec:[["Verse",["G","G","D","D","C","C","G","G"]],["Chorus",["C","Em|D","C","Em|D"]]]},
  {t:"Photograph",a:"Ed Sheeran",lv:2,capo:4,bpm:108,pat:"folk",teach:"Same four chords, different order in the chorus.",sec:[["Verse",["C","Am","G","Feasy"]],["Chorus",["C","G","Am","Feasy"]]]},
  {t:"Take Me Home, Country Roads",a:"John Denver",lv:2,capo:2,bpm:82,pat:"folk",teach:"A split bar at the end of the verse line.",sec:[["Verse",["G","Em","D","C|G"]],["Chorus",["G","D","Em","C","G","D","C","G"]]]},
  {t:"Three Little Birds",a:"Bob Marley",lv:3,capo:0,bpm:74,pat:"offbeat",teach:"Offbeat strum: only the ups sound.",sec:[["Chorus",["A","A","D","A"]],["Verse",["A","E","A","D","A","E","D","A"]]]},
  {t:"Counting Stars",a:"OneRepublic",lv:3,capo:4,bpm:122,pat:"push",teach:"The push strum, fast.",sec:[["Whole song",["Am","C","G","Feasy"]]]},
  {t:"Have You Ever Seen the Rain",a:"Creedence Clearwater Revival",lv:3,capo:0,bpm:116,pat:"chuck",teach:"Try the backbeat chuck on 2 and 4.",sec:[["Verse",["C","C","C","C","G","G","C","C"]],["Chorus",["Feasy","G","C","Am","Feasy","G","C","C"]]]}];
const bookChords=s=>[...new Set(s.sec.flatMap(x=>x[1]).flatMap(b=>b.split("|")))];

const allBook=()=>[...BOOK,...(state.myBook||[])];
// strum a chord as it sounds with a capo on (the shape stays the same, everything moves up)
const strumAt=(c,capo,g=.2)=>{if(!CH[c])return;const t=ctx().currentTime+.01;CH[c].f.forEach((f,i)=>{if(f>=0)pluck(OPEN_HZ[i]*2**((f+capo)/12),t+i*.018,g)})};
function bookSong(title){const s=allBook().find(x=>x.t===title);if(!s)return;let si=0,speed=state.bookSpeed||.8,run=null,quiet=false,call=!!state.callChords,capo=state.capoPref?.[s.t]??s.capo;
  const st=openStage(`${esc(s.t)} · ${esc(s.a||"Your song")}`,"var(--fog)","var(--ink)",`<div class="book"><div class="book-l"><span class="mono">${esc(s.a||"Your song")} · <span data-capo></span></span><h2 class="tight">${esc(s.t)}</h2><p style="color:var(--ink2)">${esc(s.teach||"")}</p>
      <div><span class="mono">Strum · ${PATS[s.pat].n}</span><div class="lane" data-lane style="grid-template-columns:repeat(${PATS[s.pat].s.length},1fr);margin-top:8px">${lane(PATS[s.pat])}</div><p class="hint" style="text-align:left;margin-top:8px">${PATS[s.pat].tip}</p></div>
      <div class="seg" style="background:#fff">${[.6,.8,1].map(v=>`<button data-sp="${v}">${Math.round(v*100)}%</button>`).join("")}<button data-q>Bruv plays</button></div>
      <div class="seg" style="background:#fff"><button data-stv>Stage view</button><button data-call>Bruv calls chords</button><button data-fit>Fit my voice</button></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-go2 style="background:var(--cobalt);color:#fff">Start</button><button class="btn ghost" data-take>Record a take</button>${s.mine?`<button class="btn ghost" data-del>Delete</button>`:""}</div><p class="hint" data-h style="text-align:left"></p></div>
    <div class="book-r"><div class="perf" data-perf><span class="mono" data-psec></span><b class="wide" data-pc>–</b><span class="mono">next <b data-pn></b></span><div class="plines" data-pl></div></div>
      <div data-grid>${s.sec.map(([n,bars],i)=>`<button class="secbtn" data-sec="${i}"><span class="mono">${esc(n)} · ${bars.length} bars</span></button><div class="bars2" data-bars="${i}">${bars.map((b,k)=>`<div class="bar2" data-bar="${k}">${b.split("|").map(c=>`<span><b class="wide">${esc(label(c))}</b>${dia(c)}</span>`).join("")}</div>`).join("")}</div>`).join("")}</div></div></div>`),q=k=>st.querySelector(k),L=q("[data-lane]"),P=PATS[s.pat],n=P.s.length,book=q(".book");
  const draw=()=>{st.querySelectorAll("[data-sp]").forEach(b=>b.setAttribute("aria-pressed",+b.dataset.sp===speed));st.querySelectorAll("[data-sec]").forEach(b=>b.setAttribute("aria-pressed",+b.dataset.sec===si));q("[data-q]").setAttribute("aria-pressed",!quiet);q("[data-q]").textContent=quiet?"Click only":"Bruv plays";
    q("[data-stv]").setAttribute("aria-pressed",book.classList.contains("stagev"));q("[data-call]").setAttribute("aria-pressed",call);q("[data-capo]").textContent=capo?`capo ${capo}${capo!==s.capo?` (yours · record ${s.capo||"none"})`:""}`:`no capo${s.capo?` (yours · record ${s.capo})`:""}`;
    q("[data-h]").textContent=`Loops the ${s.sec[si][0].toLowerCase()} at ${Math.round(s.bpm*speed/(n===6?3:1))} bpm. Tap a section to switch.`;
    q("[data-pl]").innerHTML=(s.lines||[]).map((l,i)=>`<div data-li="${i}">${esc(l.text)}</div>`).join("")};
  const stop=()=>{clearInterval(run);run=null;q("[data-go2]").textContent="Start";st.querySelectorAll(".on").forEach(e=>e.classList.remove("on"))};
  function start(){if(run)return stop();const bars=s.sec[si][1],ms=perSlot(P,s.bpm*speed);let k=-n;q("[data-go2]").textContent="Stop";const box=q(`[data-bars="${si}"]`),base=s.sec.slice(0,si).reduce((a,x)=>a+x[1].length,0);q("[data-psec]").textContent=s.sec[si][0];
    const step=()=>{if(st.hidden){clearInterval(run);return}const j=((k%n)+n)%n,beat=n===6?j%3===0:n===16?j%4===0:j%2===0;[...L.children].forEach((c,x)=>c.classList.toggle("on",x===j));if(k<0){if(beat)tick(ctx().currentTime,j===0);k++;return}
      const b=Math.floor(k/n)%bars.length,parts=bars[b].split("|"),pi=Math.min(parts.length-1,Math.floor(j/n*parts.length)),c=parts[pi];box.querySelectorAll(".bar2").forEach((e,x)=>{e.classList.toggle("on",x===b);if(x===b)[...e.children].forEach((sp,y)=>sp.classList.toggle("on",parts.length>1&&y===pi))});
      if(j===0){const nb=bars[(b+1)%bars.length].split("|")[0];q("[data-pc]").textContent=label(c);q("[data-pn]").textContent=label(nb);const gl=base+b;st.querySelectorAll("[data-li]").forEach(e=>e.classList.toggle("on",(s.lines[+e.dataset.li].bars||[]).includes(gl)));st.querySelector("[data-li].on")?.scrollIntoView({block:"center",behavior:"smooth"})}
      // call the next chord on the last beat of the bar
      if(call&&j===n-(n===6?3:n===16?4:2)){const nb=bars[(b+1)%bars.length].split("|")[0];if(nb!==parts.at(-1))callOut(sayChord(label(nb)))}
      if(beat)tick(ctx().currentTime,j===0);if(!quiet&&P.s[j]!==".")P.s[j]==="X"?chuck():strumAt(c,capo);k++};run=setInterval(step,ms);step()}
  st.querySelectorAll("[data-sp]").forEach(b=>b.onclick=()=>{speed=+b.dataset.sp;state.bookSpeed=speed;save();const was=run;stop();draw();if(was)start()});st.querySelectorAll("[data-sec]").forEach(b=>b.onclick=()=>{si=+b.dataset.sec;const was=run;stop();draw();if(was)start()});
  q("[data-q]").onclick=()=>{quiet=!quiet;draw()};q("[data-stv]").onclick=()=>{book.classList.toggle("stagev");draw()};q("[data-call]").onclick=()=>{call=!call;state.callChords=call;save();draw()};
  q("[data-fit]").onclick=()=>{stop();fitVoice(s,capo,c2=>{capo=c2;(state.capoPref=state.capoPref||{})[s.t]=c2;save();draw()})};
  q("[data-go2]").onclick=start;q("[data-take]").onclick=()=>{stop();TOOLS.take(s.t)};if(s.mine)q("[data-del]").onclick=()=>{if(!confirm(`Delete "${s.t}" from your song book?`))return;state.myBook=state.myBook.filter(x=>x!==s);save();closeStage();go("songs")};
  closers.push(()=>clearInterval(run));onKey(e=>{if(e.key===" "){e.preventDefault();start()}else if(e.key==="s"||e.key==="S")q("[data-stv]").click()});draw();
  const miss=bookChords(s).filter(c=>chordStatus(c).s<2);(state.book=state.book||{})[s.t]=Date.now();save();bruv(`${s.t}. ${capo?`Capo on fret ${capo}. `:""}${miss.length?`Watch the ${miss.map(label).join(" and ")}. `:""}I'll strum it with you. Start slow.`)}
TOOLS.book=bookSong;
{const _s=VIEWS.songs;VIEWS.songs=async v=>{await _s(v);const drop=v.querySelector("[data-drop]");if(!drop)return;const LV=["Your chord sheets","First songs","Getting going","A step up"],all=allBook();
  drop.insertAdjacentHTML("afterend",`<div class="sec-h"><h2 class="tight">Song book</h2><span>${all.length} songs · chords, structure and a strum for each · <button data-tool="addsheet" style="text-decoration:underline">add a chord sheet</button></span></div>${[0,1,2,3].filter(lv=>all.some(s=>(s.lv||0)===lv)).map(lv=>`<div class="group"><h3>${LV[lv]}</h3><div class="tiles les">${all.filter(s=>(s.lv||0)===lv).map(s=>{const need=bookChords(s),ok=need.every(c=>chordStatus(c).s>=2),cp=state.capoPref?.[s.t]??s.capo;
    return`<button class="tile les${state.book?.[s.t]?" seen":""}" data-tool="book" data-a="${esc(s.t)}"><header><b class="tight" style="font-size:25px;font-stretch:62%;line-height:1">${esc(s.t)}</b></header><div class="mono" style="opacity:.7">${esc(s.a||"Your song")}</div><div class="chordrow">${need.map(c=>`<i class="${chordStatus(c).s>=2?"":"new"}">${esc(label(c))}</i>`).join("")}</div><footer><span>${PATS[s.pat].n}</span><span>${cp?`capo ${cp}`:"no capo"}${ok?"":" · new chord"}</span></footer></button>`}).join("")}</div></div>`).join("")}`)}}
go(current,true);
