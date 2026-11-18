/* Guitar OS, part five: hands-free. With a guitar in your hands you shouldn't need the mouse.
   - Strum once and whatever is waiting to start, starts.
   - When a drill, lesson step or revision part finishes, the next one begins after a short countdown.
   - Enter is always "next". Space is always start / stop. Any other key or a click cancels a countdown. */

const pill=document.createElement("div");pill.className="pill";pill.hidden=true;document.body.append(pill);
let auto=null,armed=null,armAt=0,hfDet=null,askedMic=false;const touch=matchMedia("(hover:none)").matches;
{const _c=closeStage;closeStage=function(){armed=null;if(!auto)pill.hidden=true;_c()}}

// do `fn` in `secs` seconds unless you cancel
function autoDo(fn,secs=5,what="Next"){cancelAuto();const t0=Date.now();auto={fn,iv:setInterval(()=>{const left=Math.ceil(secs-(Date.now()-t0)/1000);if(left<=0){const f=auto.fn;cancelAuto();f()}else show(`${what} in ${left} · strum to go again · any key to stay`)},200)};show(`${what} in ${secs} · strum to go again · any key to stay`)}
function cancelAuto(){if(auto){clearInterval(auto.iv);auto=null;pill.hidden=true}}
const show=t=>{pill.textContent=t;pill.hidden=false};
// a part of the revision finished: move on by itself
window.partDone=()=>{if(sess)autoDo(()=>sess&&sess.next(),6,"Next part")};

// the button a strum should press: Start or Go again, wherever the current tool keeps it
const startBtn=()=>{if($("#stage").hidden)return null;return[...document.querySelectorAll("#stage [data-start],#stage [data-go2],#stage [data-do],#stage [data-row] .btn")].find(b=>!b.hidden&&!b.disabled&&b.offsetParent&&/^(Start|Go again)/.test(b.textContent.trim()))||null};
setInterval(()=>{const b=startBtn(),key=b?b.textContent:null;if(!b){if(armed){armed=null;if(!auto)pill.hidden=true}return}
  if(armed?.b!==b||armed.key!==key){armed={b,key};armAt=performance.now()+1800;if(!an&&!askedMic){askedMic=true;ears()}}
  if(!auto)show(an?(touch?"Strum once to start · or tap Start":"Strum once to start · or press Space"):(touch?"Tap Start":"Press Space to start"))},350);
(function listen(){requestAnimationFrame(listen);if(!an)return;hfDet=hfDet||onsetDetector();const t=hfDet();if(!t||!armed||performance.now()<armAt)return;
  if(window.speechSynthesis?.speaking){armAt=performance.now()+500;return} // that was Bruv talking, not you
  if(!loud()||!armed.b.isConnected)return;const b=armed.b;armed=null;armAt=performance.now()+2500;cancelAuto();show("Heard you. Here we go.");setTimeout(()=>{if(!auto&&!startBtn())pill.hidden=true},1500);b.click()})();

document.addEventListener("keydown",e=>{if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;
  if(e.key==="Enter"){if($("#stage").hidden&&!sess)return;e.preventDefault();if(auto){const f=auto.fn;cancelAuto();f();return}
    const nx=document.querySelector("#stage [data-next]:not(:disabled)")||document.querySelector("#stage [data-more]:not([hidden])");if(nx)nx.click();else if(sess)sess.next();else document.querySelector("#stage [data-row] .btn")?.click()}
  else if(auto&&e.key!==" ")cancelAuto()},true);
document.addEventListener("pointerdown",e=>{if(auto&&!e.target.closest(".pill"))cancelAuto()},true);
pill.onclick=()=>{if(auto){const f=auto.fn;cancelAuto();f()}};

/* ---------- Mic check: see what the app hears, pick the mic, or switch the mic off ---------- */
const dropMic=()=>{micStream?.getTracks().forEach(t=>t.stop());micStream=null;an=null;hfDet=null};
async function micCheck(){const st=openStage("Mic check","var(--ink)","#fff",`<div class="lab"><h2 class="tight">What I'm hearing</h2>
    <div class="miclive"><div><span class="mono">Level</span><div class="steady" style="background:rgba(255,255,255,.14)"><i data-lv style="background:var(--mint)"></i></div><span class="mono" data-nz></span></div>
      <div><span class="mono">Chord</span><b class="wide" data-ch>–</b><span class="mono" data-cs></span></div><div><span class="mono">Note</span><b class="wide" data-nt>–</b><span class="mono" data-st></span></div><div><span class="mono">Strums</span><b class="wide" data-on>0</b><span class="mono">counted</span></div></div>
    <label class="mono" style="display:grid;gap:8px;justify-items:center">Microphone<select data-dev style="background:#fff;color:var(--ink);border-radius:14px;padding:10px 14px;font:500 15px var(--body);max-width:90vw"></select></label>
    <label class="mono" style="display:flex;gap:10px;align-items:center"><input type="checkbox" data-off style="width:20px;height:20px;accent-color:var(--tang)"> Turn the mic off everywhere: drills count taps and you grade yourself</label>
    <p class="hint" data-h style="max-width:52ch">Strum a G. The Chord box should say G within a second. Pluck one string and the Note box should name it. If the level bar barely moves, pick a different microphone.</p></div>`),q=k=>st.querySelector(k),sel=q("[data-dev]"),off=q("[data-off]");off.checked=!!state.micOff;
  off.onchange=()=>{state.micOff=off.checked;save();if(off.checked){dropMic();bruv("Mic's off. Every drill works by tapping now, and you mark your own work.")}else{start();bruv("Mic's back on.")}};
  sel.onchange=async()=>{state.mic=sel.value||null;save();dropMic();await start();bruv("Switched. Strum something.")};
  let det=null,n=0;async function start(){if(state.micOff)return;const ok=await ears();if(!ok){q("[data-h]").textContent=micDenied?"The browser is blocking the mic. Allow it in the site settings (the icon left of the address), then reopen this.":"I couldn't open a microphone.";return}
    det=onsetDetector();const devs=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==="audioinput"),cur=micStream?.getAudioTracks()[0]?.getSettings?.().deviceId;
    sel.innerHTML=`<option value="">Automatic (not earbuds)</option>`+devs.map(d=>`<option value="${esc(d.deviceId)}"${d.deviceId===state.mic?" selected":""}>${esc(d.label||"Microphone")}${d.deviceId===cur?" · in use":""}</option>`).join("")}
  const pool=[...MINE,"F","Bm","F#m"];loop(()=>{if(!an)return;const l=level(),L=loud();q("[data-lv]").style.width=Math.min(100,l*900)+"%";q("[data-nz]").textContent=L?"playing":`background ${(noiseFl*1000).toFixed(1)}`;
    if(det&&det()){n++;q("[data-on]").textContent=n}if(!L)return;const ch=chroma();if(ch){let b=null,bs=-1;pool.forEach(c=>{const v=match(ch,c);if(v>bs)bs=v,b=c});q("[data-ch]").textContent=bs>.72?label(b):"?";q("[data-cs]").textContent=bs>.72?`${Math.round(bs*100)}% match`:"not sure"}
    const f=pitch();if(f){const m=69+12*Math.log2(f/440),c=Math.round((m-Math.round(m))*100);q("[data-nt]").textContent=NOTES[((Math.round(m)%12)+12)%12];q("[data-st]").textContent=`${c>0?"+":""}${c} cents`}});
  start();bruv("This shows exactly what I hear. If it's wrong here, it's wrong everywhere, so let's sort it here.")}
TOOLS.miccheck=micCheck;
{const _y=VIEWS.you;VIEWS.you=v=>{_y(v);v.querySelector("[data-voice]")?.closest(".row")?.insertAdjacentHTML("beforebegin",`<div class="row"><span><b>Mic check</b><small>${state.micOff?"Mic is off · drills use taps":"See what the app hears, pick the mic"}</small></span><button class="btn sm" data-tool="miccheck">Open</button></div>`)}}
{const _p=VIEWS.practice;VIEWS.practice=v=>{_p(v);v.querySelector(".bento")?.insertAdjacentHTML("beforeend",`<button class="blk c12 tool" data-tool="miccheck" style="min-height:120px"><span class="lbl">Setup</span><span><h2 class="tight" style="font-size:clamp(30px,3.6vw,46px)">Mic check</h2><p>${state.micOff?"The mic is off. Drills count taps and you grade yourself.":"See what the app hears. Pick a better mic, or switch it off."}</p></span></button>`)}}
go(current,true);
