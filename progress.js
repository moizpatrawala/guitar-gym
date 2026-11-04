/* ================= progress: a history of your scores, charted on the Me tab =================
   One-minute change scores and strum timing are logged with a timestamp (gg2_hist). Practice minutes (st.mins) and
   change-race times (log.race) were already kept per day. Charts are plain SVG: one series each, so no legends needed. */

let hist=S("hist",{om:{},strum:[]});
{const _s=save;save=function(){_s();W("hist",hist)}}
function logHist(kind,key,v){const e=[Date.now(),v];if(kind==="om")(hist.om[key]=hist.om[key]||[]).push(e);else hist.strum.push([Date.now(),v,key]);save()}

const pgDays=n=>[...Array(n)].map((_,i)=>new Date(Date.now()-(n-1-i)*864e5));
const pgShort=d=>d.toLocaleDateString(undefined,{day:"numeric",month:"short"});
// best value per day, oldest first
function pgDaily(entries,pick=Math.max){const by={};entries.forEach(([ts,v])=>{const k=new Date(ts).toDateString();by[k]=by[k]==null?v:pick(by[k],v)});
  return Object.entries(by).map(([k,v])=>({d:new Date(k),v})).sort((a,b)=>a.d-b.d)}

// shared hover tooltip: each chart hands over its points in SVG coordinates
const pgTip=h("div","pg-tip","");document.body.append(pgTip);pgTip.hidden=true;
function pgHover(svg,pts,vw){const cross=svg.querySelector(".pg-cross");
  svg.onpointermove=e=>{const r=svg.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*vw;let best=null;pts.forEach(p=>{if(!best||Math.abs(p.x-x)<Math.abs(best.x-x))best=p});
    if(!best){pgTip.hidden=true;return}pgTip.hidden=false;pgTip.innerHTML=best.tip;
    const px=r.left+best.x/vw*r.width;pgTip.style.left=Math.min(innerWidth-pgTip.offsetWidth-8,Math.max(8,px-pgTip.offsetWidth/2))+"px";pgTip.style.top=Math.max(8,r.top-pgTip.offsetHeight-8)+"px";
    if(cross){cross.setAttribute("x1",best.x);cross.setAttribute("x2",best.x);cross.style.opacity=1}};
  svg.onpointerleave=()=>{pgTip.hidden=true;if(cross)cross.style.opacity=0}}

const PG={W:640,H:190,L:34,R:10,T:12,B:24};
const pgY=(v,lo,hi)=>PG.T+(1-(v-lo)/(hi-lo||1))*(PG.H-PG.T-PG.B);
function pgAxis(lo,hi,fmt,W=PG.W){const ticks=[lo,(lo+hi)/2,hi];return ticks.map(v=>{const y=pgY(v,lo,hi);return`<line x1="${PG.L}" x2="${W-PG.R}" y1="${y}" y2="${y}" class="pg-grid"/><text x="${PG.L-6}" y="${y+4}" class="pg-ax" text-anchor="end">${fmt(v)}</text>`}).join("")}

// practice minutes per day, with the daily goal as a dashed line
function pgMinutes(){const days=pgDays(14),mins=days.map(d=>st.mins[d.toDateString()]||0),hi=Math.ceil(Math.max(cfg.goal*1.25,...mins,5)/10)*10;
  const n=days.length,bw=(PG.W-PG.L-PG.R)/n,pts=[];let s="";
  days.forEach((d,i)=>{const m=mins[i],x=PG.L+i*bw+bw*.18,w=bw*.64,y=pgY(m,0,hi),base=pgY(0,0,hi),hh=Math.max(0,base-y);
    if(hh>0.5){const r=Math.min(4,hh,w/2);s+=`<path class="pg-bar${m>=cfg.goal?" goal":""}" d="M${x} ${base}V${y+r}Q${x} ${y} ${x+r} ${y}H${x+w-r}Q${x+w} ${y} ${x+w} ${y+r}V${base}Z"/>`}
    if(i%2===(n-1)%2)s+=`<text x="${x+w/2}" y="${PG.H-6}" class="pg-ax" text-anchor="middle">${i===n-1?"Today":pgShort(d)}</text>`;
    pts.push({x:x+w/2,tip:`<b>${Math.round(m)} min</b><span>${d.toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"})}</span>`})});
  const gy=pgY(cfg.goal,0,hi);
  return{svg:`<svg viewBox="0 0 ${PG.W} ${PG.H}" class="pg-svg" role="img" aria-label="Minutes practised each day for the last 14 days">${pgAxis(0,hi,v=>Math.round(v))}
    <line x1="${PG.L}" x2="${PG.W-PG.R}" y1="${gy}" y2="${gy}" class="pg-goal"/><text x="${PG.W-PG.R}" y="${gy-5}" class="pg-ax" text-anchor="end">goal ${cfg.goal} min</text>${s}</svg>`,pts}}

// a line over days that have data. lowerBetter flips the "you're improving" wording only, never the axis
function pgLine(data,{lo,hi,fmt,unit,target,label,W=380}){if(!data.length)return null;const n=data.length,pts=[];
  const x=i=>n===1?(PG.L+W-PG.R)/2:PG.L+12+i*(W-PG.L-PG.R-24)/(n-1);let path="";
  data.forEach((p,i)=>{const X=x(i),Y=pgY(p.v,lo,hi);path+=(i?"L":"M")+X+" "+Y;pts.push({x:X,y:Y,tip:`<b>${fmt(p.v)}${unit}</b><span>${pgShort(p.d)}</span>`})});
  const ty=target!=null?pgY(target,lo,hi):null;
  return{W,svg:`<svg viewBox="0 0 ${W} ${PG.H}" class="pg-svg" role="img" aria-label="${label}">${pgAxis(lo,hi,v=>fmt(v),W)}
    ${ty!=null?`<line x1="${PG.L}" x2="${W-PG.R}" y1="${ty}" y2="${ty}" class="pg-goal"/><text x="${PG.L+4}" y="${ty-5}" class="pg-ax">target ${fmt(target)}${unit}</text>`:""}
    <line class="pg-cross" y1="${PG.T}" y2="${PG.H-PG.B}" x1="0" x2="0"/><path d="${path}" class="pg-line"/>
    ${pts.map((p,i)=>i===n-1||n<=12?`<circle cx="${p.x}" cy="${p.y}" r="${i===n-1?5:4}" class="pg-dot${i===n-1?" last":""}"/>`:"").join("")}
    ${data.length>1?`<text x="${pts[0].x}" y="${PG.H-6}" class="pg-ax" text-anchor="start">${pgShort(data[0].d)}</text><text x="${pts.at(-1).x}" y="${PG.H-6}" class="pg-ax" text-anchor="end">${pgShort(data.at(-1).d)}</text>`:""}</svg>`,pts}}

// tiny trend line for one change pair, 0–30 changes
function pgSpark(data){if(data.length<2)return"";const W=160,H=36,n=data.length,x=i=>4+i*(W-8)/(n-1),y=v=>H-4-Math.min(1,v/30)*(H-8);
  return`<svg viewBox="0 0 ${W} ${H}" class="pg-spark" aria-hidden="true"><line x1="0" x2="${W}" y1="${y(30)}" y2="${y(30)}" class="pg-goal"/><path d="${data.map((p,i)=>(i?"L":"M")+x(i)+" "+y(p.v)).join("")}" class="pg-line"/><circle cx="${x(n-1)}" cy="${y(data.at(-1).v)}" r="3.5" class="pg-dot last"/></svg>`}

function drawProgress(){const box=$("progress");if(!box)return;
  const M=pgMinutes(),wk=pgDays(7).reduce((a,d)=>a+(st.mins[d.toDateString()]||0),0);
  // change race: average seconds per day over the last 30 days
  const race=pgDays(30).map(d=>({d,r:log.race[d.toDateString()]})).filter(x=>x.r).map(x=>({d:x.d,v:x.r.sum/x.r.n}));
  const R=pgLine(race,{lo:0,hi:Math.max(3,...race.map(p=>p.v)),fmt:v=>v.toFixed(1),unit:"s",target:1,label:"Average chord change time per day"});
  const strum=pgDaily(hist.strum),S2=pgLine(strum,{lo:0,hi:100,fmt:v=>Math.round(v),unit:"%",target:80,label:"Best strum timing score per day"});
  // pinned pairs first, then anything else you've timed
  const pk=p=>[...p].sort().join("-"),keys=[...new Set([...focus.map(pk),...Object.keys(hist.om),...Object.keys(onemin).map(k=>pk(k.split("-")))])];
  const pairs=keys.map(k=>{const best=Math.max(-1,...Object.entries(onemin).filter(([kk])=>pk(kk.split("-"))===k).map(([,v])=>v)),d=pgDaily(hist.om[k]||[]);
    return{k,name:k.split("-").map(label).join(" ⇄ "),pinned:focus.some(f=>pk(f)===k),best:best<0?null:best,last:d.at(-1)?.v,d}}).filter(p=>p.pinned||p.best!=null);
  const trend=(d,lower)=>d.length<2?"":(()=>{const a=d[0].v,b=d.at(-1).v,ch=lower?a-b:b-a;return ch>0?`<span class="pg-up">${lower?"▼":"▲"} ${lower?ch.toFixed(1)+"s faster":"+"+Math.round(ch)} since ${pgShort(d[0].d)}</span>`:""})();
  box.innerHTML=`<h2>Progress</h2>
   <div class="pg-tiles"><div><b>${Math.round(wk)}</b><span>minutes this week</span></div><div><b>${st.streak}</b><span>day streak</span></div>
     <div><b>${pairs.filter(p=>p.best>=30).length}/${pairs.length}</b><span>changes at 30+ a minute</span></div><div><b>${strum.length?Math.round(Math.max(...strum.map(p=>p.v)))+"%":"–"}</b><span>best strum timing</span></div></div>
   <div class="pg-block"><h3>Practice, last 14 days</h3><div class="pg-chart" data-ch="m">${M.svg}</div></div>
   <div class="pg-block"><h3>One-minute changes <small>target 30</small></h3>
     <div class="pg-pairs">${pairs.map(p=>`<div class="pg-pair${p.pinned?" pin":""}"><div class="pg-ph"><b>${esc(p.name)}</b>${p.pinned?`<span title="Pinned to your recap">📌</span>`:""}</div>
       <div class="pg-pn"><b>${p.best??"–"}</b><span>${p.best!=null?"best":"not timed yet"}${p.last!=null&&p.last!==p.best?` · last ${p.last}`:""}</span></div>
       <div class="pg-bar30"><i style="width:${Math.min(100,(p.best||0)/30*100)}%"></i></div>${pgSpark(p.d)}</div>`).join("")||`<p class="mute">Do a one-minute change in Gym and your scores start here.</p>`}</div></div>
   <div class="pg-two">
     <div class="pg-block"><h3>Chord change speed ${trend(race,true)}</h3>${R?`<div class="pg-chart" data-ch="r">${R.svg}</div><p class="mute">Average time per change in the change race. Lower is faster.</p>`:`<p class="mute">Do a change race and your speed shows up here.</p>`}</div>
     <div class="pg-block"><h3>Strum timing ${trend(strum)}</h3>${S2?`<div class="pg-chart" data-ch="s">${S2.svg}</div><p class="mute">Your best on-time score each day, with the mic on.</p>`:`<p class="mute">Use the strum trainer with the mic on and your timing shows up here.</p>`}</div>
   </div>`;
  [["m",M],["r",R],["s",S2]].forEach(([k,c])=>{const svg=c&&box.querySelector(`[data-ch="${k}"] svg`);if(svg)pgHover(svg,c.pts,c.W||PG.W)})}
{const _d=drawMe;drawMe=function(){_d();drawProgress()}}
