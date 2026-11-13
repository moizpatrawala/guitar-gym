/* Guitar OS, part five: hands-free. With a guitar in your hands you shouldn't need the mouse.
   - Strum once and whatever is waiting to start, starts.
   - When a drill, lesson step or revision part finishes, the next one begins after a short countdown.
   - Enter is always "next". Space is always start / stop. Any other key or a click cancels a countdown. */

const pill=document.createElement("div");pill.className="pill";pill.hidden=true;document.body.append(pill);
let auto=null,armed=null,armAt=0,hfDet=null,askedMic=false;

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
  if(!auto)show(an?"Strum once to start · or press Space":"Press Space to start")},350);
(function listen(){requestAnimationFrame(listen);if(!an)return;hfDet=hfDet||onsetDetector();const t=hfDet();if(!t||!armed||performance.now()<armAt)return;
  if(window.speechSynthesis?.speaking){armAt=performance.now()+500;return} // that was Bruv talking, not you
  if(level()<.012||!armed.b.isConnected)return;const b=armed.b;armed=null;armAt=performance.now()+2500;cancelAuto();show("Heard you. Here we go.");setTimeout(()=>{if(!auto&&!startBtn())pill.hidden=true},1500);b.click()})();

document.addEventListener("keydown",e=>{if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;
  if(e.key==="Enter"){if($("#stage").hidden&&!sess)return;e.preventDefault();if(auto){const f=auto.fn;cancelAuto();f();return}
    const nx=document.querySelector("#stage [data-next]:not(:disabled)")||document.querySelector("#stage [data-more]:not([hidden])");if(nx)nx.click();else if(sess)sess.next();else document.querySelector("#stage [data-row] .btn")?.click()}
  else if(auto&&e.key!==" ")cancelAuto()},true);
document.addEventListener("pointerdown",e=>{if(auto&&!e.target.closest(".pill"))cancelAuto()},true);
pill.onclick=()=>{if(auto){const f=auto.fn;cancelAuto();f()}};
