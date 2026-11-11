/* Guitar OS, part four: music theory in Learn (taught in small steps, each checked with a question),
   a theory question in every Revision, and the ear trainer. Loaded last. */

/* ---------- theory lessons ---------- */
const Q=(q,o,a,why)=>({k:"quiz",q,o,a,why});
const THEORY=[
  {id:"th-notes",t:"The 12 notes",d:"The whole alphabet of music.",steps:[R("Only twelve","Music uses seven letters, A to G, then starts again. Between most letters there's an in-between note called a sharp (#), which makes twelve notes in all: A A# B C C# D D# E F F# G G#."),
    R("Two gaps have no sharp","There is no note between B and C, and none between E and F. Everywhere else there is one. One fret on your guitar is one step along this list."),
    Q("Which note comes straight after E?",["F","E#","F#"],0,"E and F are neighbours, with no sharp between them."),Q("You play the open A string, then fret 2. What note is fret 2?",["B","A#","C"],0,"Fret 1 is A#, fret 2 is B. One fret, one note.")]},
  {id:"th-strings",t:"Notes on your strings",d:"Find any note on the two thick strings.",steps:[R("Open strings","Thickest to thinnest your strings are E A D G B E. Every fret raises a string by one note."),
    R("The low E string","Open E, fret 1 F, fret 3 G, fret 5 A, fret 7 B, fret 8 C. Barre chords are named after the note under your first finger on this string, which is why the F barre sits at fret 1 and G at fret 3."),
    Q("What note is fret 3 on the low E string?",["G","F#","A"],0,"E, F, F#, G. Three frets up from E is G."),Q("A barre chord in the E shape at fret 5 is which chord?",["A","G","B"],0,"Fret 5 on the low E string is A, so the chord is A.")]},
  {id:"th-scale",t:"The major scale",d:"Where every key comes from.",steps:[R("A pattern of steps","A whole step is two frets, a half step is one. The major scale is always: whole, whole, half, whole, whole, whole, half."),
    R("G major","Start on G and follow the pattern: G A B C D E F#. Seven notes, and that's the key of G. Songs in G mostly use just these notes."),
    Q("How many frets is a whole step?",["Two","One","Three"],0,"A whole step is two frets, a half step is one."),Q("Which note in the key of G is sharp?",["F#","C#","None"],0,"G A B C D E F#. Only the F is sharp.")]},
  {id:"th-chords",t:"How chords are built",d:"Why major sounds bright and minor sounds sad.",steps:[R("Every other note","A chord is three notes from the scale: the 1st, 3rd and 5th. G major is G, B and D. Your G chord has six strings, but they're all just G, B or D."),
    R("One note decides the mood","Lower the middle note (the 3rd) by one fret and major becomes minor. E major is E G# B; E minor is E G B. That's why Em is just E with a finger lifted."),
    Q("Which three notes make a G major chord?",["G B D","G A B","G C D"],0,"The 1st, 3rd and 5th notes of the G scale: G, B, D."),Q("What turns a major chord into a minor chord?",["Lowering the 3rd by one fret","Lowering the root","Adding a fourth note"],0,"Only the middle note moves. One fret down.")]},
  {id:"th-sevenths",t:"Seventh chords",d:"Why G7 wants to go to C.",steps:[R("Add one more note","A 7 chord adds a fourth note, a flattened 7th. G7 is G B D plus F. That F rubs against the B and makes the chord feel unfinished."),
    R("Tension and home","The tension resolves when you move to the chord a 4th up: G7 to C, B7 to E, E7 to A, A7 to D, D7 to G. Play B7 then E and you'll hear it land."),
    Q("G7 most naturally leads to which chord?",["C","D","Em"],0,"A 7 chord pulls to the chord a 4th above it. G7 goes to C."),Q("What does the 7 add to a G chord?",["The note F","The note F#","A louder strum"],0,"G7 adds a flattened 7th, which is F.")]},
  {id:"th-sus",t:"Sus and add chords",d:"What the names in your colour chords mean.",steps:[R("Sus means suspended","A sus chord swaps the 3rd for a neighbour. Sus4 uses the 4th note instead, sus2 uses the 2nd. With no 3rd the chord is neither major nor minor, so it floats."),
    R("Add means extra","An add chord keeps the whole chord and adds a note on top. Cadd9 is C E G plus D."),
    Q("Dsus4 replaces which note of the D chord?",["The 3rd","The root","The 5th"],0,"Sus chords take out the 3rd."),Q("Why does a sus chord sound unsettled?",["It has no 3rd, so it's neither major nor minor","It's out of tune","It has too many notes"],0,"The 3rd is the note that says major or minor. Without it the chord hangs.")]},
  {id:"th-time",t:"Counting time",d:"What 4/4 and 6/8 actually mean.",steps:[R("Beats in a bar","4/4 means four beats in every bar, counted 1 2 3 4. Most songs you know are in 4/4. Each beat can be split in two (1 and 2 and) or four (1 e and a)."),
    R("6/8 swings in threes","6/8 has six quick beats grouped in two lots of three: ONE two three FOUR five six. It rocks back and forth, which is why Perfect sways."),
    Q("In 4/4, counting “1 and 2 and 3 and 4 and” gives how many strums a bar?",["Eight","Four","Sixteen"],0,"Four beats, each split in two."),Q("Where are the strong beats in 6/8?",["1 and 4","1 and 3","2 and 5"],0,"Six beats in two groups of three: ONE two three FOUR five six.")]}];
THEORY.forEach(l=>l.track="Theory");
// the older "How songs work" lessons are theory too: fold them in and give each a question
{const i=LESSONS.findIndex(l=>l.track==="How songs work");LESSONS.filter(l=>l.track==="How songs work").forEach(l=>l.track="Theory");LESSONS.splice(i,0,...THEORY);
 const add=(id,q)=>LESSONS.find(l=>l.id===id)?.steps.push(q);
 add("t-numbers",Q("In the key of G, which chord is number 5?",["D","C","Em"],0,"Count up the scale: G A B C D. The fifth is D."));add("t-capo",Q("Capo on fret 2, you play a G shape. What chord sounds?",["A","G","F"],0,"Two frets up from G is A. Same shape, higher key."));add("t-anticipate",Q("When do good players start a chord change?",["On the last up-strum before the bar","Exactly on beat one","After the first strum"],0,"Lifting early means you land on beat one in time."))}

// one question, anywhere: shuffles the answers and shows why when you answer
function askQuiz(box,q,done){const order=q.o.map((_,i)=>i).sort(()=>Math.random()-.5);let tries=0;
  box.innerHTML=`<div class="quiz">${order.map(i=>`<button class="btn ghost" data-i="${i}">${esc(q.o[i])}</button>`).join("")}</div><p class="hint" data-why></p>`;
  box.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{if(box.dataset.done)return;tries++;if(+b.dataset.i===q.a){box.dataset.done=1;b.classList.add("right");box.querySelector("[data-why]").textContent=q.why;tick(ctx().currentTime,true);done&&done(tries)}else{b.classList.add("wrong");b.disabled=true}})}

/* ---------- question bank for Revise: from lessons you've finished, plus ones worked out fresh each time ---------- */
const KEYS={G:["G","Am","Bm","C","D","Em"],C:["C","Dm","Em","F","G","Am"],D:["D","Em","F#m","G","A","Bm"],A:["A","Bm","C#m","D","E","F#m"]};
function freshQuestion(){const pool=LESSONS.filter(l=>l.track==="Theory"&&learned(l.id)).flatMap(l=>l.steps.filter(s=>s.k==="quiz")),r=Math.random(),pick=a=>a[Math.floor(Math.random()*a.length)];
  if(learned("t-numbers")&&r<.3){const k=pick(Object.keys(KEYS)),n=pick([1,3,4,5]),c=KEYS[k][n],others=KEYS[k].filter(x=>x!==c).sort(()=>Math.random()-.5).slice(0,2);return Q(`In the key of ${k}, which chord is number ${n+1}?`,[c,...others],0,`The key of ${k} runs ${KEYS[k].join(", ")}. Number ${n+1} is ${c}.`)}
  if(learned("th-strings")&&r<.55){const s=pick([0,1]),f=pick([1,2,3,5,7,8]),note=NOTES[(OPEN_MIDI[s]+f)%12],w=[NOTES[(OPEN_MIDI[s]+f+1)%12],NOTES[(OPEN_MIDI[s]+f+11)%12]];return Q(`What note is fret ${f} on the ${SNAME[s]} string?`,[note,...w],0,`Count up from open ${PEG[s].toUpperCase()}, one note per fret: fret ${f} is ${note}.`)}
  if(pool.length)return pick(pool);return pick(THEORY[0].steps.filter(s=>s.k==="quiz"))}
function quiz(){let n=0,right=0;const st=openStage("Theory question","var(--cobalt)","#fff",`<div class="lab"><span class="mono" data-n></span><h2 class="tight" data-q style="max-width:24ch"></h2><div data-b style="width:100%"></div><button class="btn" data-more hidden>Another one</button></div>`),q=k=>st.querySelector(k);
  const next=()=>{const qu=freshQuestion();n++;q("[data-n]").textContent=`Question ${n}${n>1?` · ${right} right first time`:""}`;q("[data-q]").textContent=qu.q;q("[data-more]").hidden=true;const B=q("[data-b]");delete B.dataset.done;
    askQuiz(B,qu,tries=>{if(tries===1)right++;(state.quiz=state.quiz||[]).push({t:Date.now(),ok:tries===1});save();markDone("quiz");q("[data-more]").hidden=false;bruv(tries===1?pickOne(["First time. Good.","Correct.","You know that one."]):"Got there. Read why, it'll stick.",tries===1?"jump":"talk")})};
  q("[data-more]").onclick=next;next();bruv(LESSONS.some(l=>l.track==="Theory"&&learned(l.id))?"One from what you've learned.":"You haven't done a theory lesson yet, so here's an easy one.")}

/* ---------- ear trainer ---------- */
const EAR={name:["Name the chord","One of your chords plays. Which one?"],maj:["Major or minor","Bright or sad?"],hi:["Higher or lower","Two notes. Is the second higher or lower?"]};
function ear(mode0){let mode=EAR[mode0]?mode0:state.earMode||"name",n=0,right=0,cur=null;const ROUND=10;
  const st=openStage("Ear trainer","var(--tang)","#fff",`<div class="lab"><div class="seg">${Object.entries(EAR).map(([k,v])=>`<button data-m="${k}">${v[0]}</button>`).join("")}</div><span class="mono" data-n></span><h2 class="tight" data-q></h2>
    <button class="btn" data-play style="background:var(--ink);color:#fff">▶ Hear it again</button><div class="quiz" data-o></div><p class="hint" data-h></p></div>`),q=k=>st.querySelector(k),O=q("[data-o]");
  const pool=()=>{const h=MINE.filter(c=>chordStatus(c).s>=2&&!CH[c].tag);return h.length>=4?h:["G","C","D","Em","Am","E"]},rnd=a=>a[Math.floor(Math.random()*a.length)];
  function play(){if(!cur)return;if(mode==="hi"){const t=ctx().currentTime+.02;pluck(cur.f1,t,.4);pluck(cur.f2,t+.75,.4)}else strum(cur.c,.3)}
  function next(){if(n>=ROUND){const best=Math.max(0,...(state.ear?.[mode]||[]).map(x=>x.right));(state.ear=state.ear||{})[mode]=[...(state.ear[mode]||[]),{t:Date.now(),right,n:ROUND}];save();markDone("ear");q("[data-q]").textContent=`${right} of ${ROUND}`;q("[data-n]").textContent="Round done";O.innerHTML=`<button class="btn" data-again>Go again</button>`;O.querySelector("[data-again]").onclick=()=>{n=0;right=0;next()};q("[data-h]").textContent=right>best&&best?`New best. Up from ${best}.`:best?`Your best is ${best}.`:"";bruv(right>=8?`${right} out of ten. Your ears are waking up.`:right>=5?`${right} out of ten. Do a round a day.`:`${right} out of ten. Play each chord yourself and listen before the next round.`,right>=8?"jump":"talk");return}
    n++;q("[data-n]").textContent=`${n} of ${ROUND} · ${right} right`;q("[data-q]").textContent=EAR[mode][1];q("[data-h]").textContent="";let opts,ans;
    if(mode==="name"){const p=pool(),c=rnd(p);opts=[c,...p.filter(x=>x!==c).sort(()=>Math.random()-.5).slice(0,3)].sort(()=>Math.random()-.5);ans=c;cur={c}}
    else if(mode==="maj"){const pr=rnd([["A","Am"],["D","Dm"],["E","Em"]]),c=rnd(pr);opts=["Major","Minor"];ans=c.endsWith("m")?"Minor":"Major";cur={c}}
    else{const gap=rnd(right>=6?[1,2]:right>=3?[2,3,4]:[4,5,7]),up=Math.random()<.5,m=52+Math.floor(Math.random()*12),hz=x=>440*2**((x-69)/12);opts=["Higher","Lower"];ans=up?"Higher":"Lower";cur={f1:hz(m),f2:hz(m+(up?gap:-gap))}}
    O.innerHTML=opts.map(o=>`<button class="btn ghost" data-v="${esc(o)}">${esc(CH[o]?label(o):o)}</button>`).join("");let first=true;
    O.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{if(b.dataset.v===ans){b.classList.add("right");if(first)right++;q("[data-h]").textContent=first?"Right.":"That's the one.";setTimeout(next,750)}else{b.classList.add("wrong");b.disabled=true;first=false;q("[data-h]").textContent="Not that one. Listen again.";play()}});play()}
  const setMode=m=>{mode=m;state.earMode=m;save();n=0;right=0;st.querySelectorAll("[data-m]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.m===m));next()};
  st.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>setMode(b.dataset.m));q("[data-play]").onclick=play;onKey(e=>{if(e.key===" "){e.preventDefault();play()}});setMode(mode);bruv("Ten rounds. Space plays it again. Guess with your ears, not your eyes.")}

/* ---------- wire in: lessons understand questions, Revise asks one and trains your ear, Practice lists both ---------- */
Object.assign(TOOLS,{quiz,ear});
{const _rp=revisionPlan;revisionPlan=function(){const p=_rp(),pairs=p.filter(x=>x.t.includes("⇄"));if(pairs.length>3)p.splice(p.indexOf(pairs.at(-1)),1);const i=p.findIndex(x=>x.t.startsWith("Sing"));
  p.splice(i<0?p.length:i,0,{t:"Ear · "+EAR[state.earMode||"name"][0].toLowerCase(),m:2,run:()=>TOOLS.ear()},{t:"Theory question",m:1,run:()=>TOOLS.quiz()});return p}}
{const _p=VIEWS.practice;VIEWS.practice=v=>{_p(v);v.querySelector('[data-tool="assess"]')?.insertAdjacentHTML("beforebegin",`<button class="blk tang c6 tool" data-tool="ear" style="--n:5;min-height:230px"><span class="lbl">Drill</span><span><h2 class="tight">Ear trainer</h2><p>Name the chord, major or minor, higher or lower. Ten rounds.</p></span></button>
  <button class="blk cobalt c6 tool" data-tool="quiz" style="--n:6;min-height:230px"><span class="lbl">Drill</span><span><h2 class="tight">Theory question</h2><p>One at a time, from the lessons you've finished.</p></span></button>`)}}
go(current,true);
