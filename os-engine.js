/* Guitar OS song engine. These are the proven parts of the old Song Studio, carried over unchanged:
   storage (same IndexedDB, so songs you already added still work), reading MP3 tags, finding the beat and chords
   in a recording, lining a pasted chord sheet up with it, and word-by-word lyric timing. */
const NOTES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const chordKey=raw=>{const m=String(raw).replace(/[()]/g,"").match(/^([A-G][#b]?)([^/]*)/);return m?m[1]+(/^m(?!aj)/.test(m[2])?"m":""):null};
const STU=(()=>{let p;
  const open=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open("bruv-studio",1);
    r.onupgradeneeded=()=>{r.result.createObjectStore("songs",{keyPath:"id"});r.result.createObjectStore("audio")};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
  const tx=async(store,mode,fn)=>{const db=await open();return new Promise((res,rej)=>{const t=db.transaction(store,mode),r=fn(t.objectStore(store));t.oncomplete=()=>res(r?.result);t.onerror=()=>rej(t.error)})};
  return{all:()=>tx("songs","readonly",s=>s.getAll()),put:v=>tx("songs","readwrite",s=>s.put(v)),del:id=>tx("songs","readwrite",s=>s.delete(id)),
    audio:id=>tx("audio","readonly",s=>s.get(id)),putAudio:(id,b)=>tx("audio","readwrite",s=>s.put(b,id)),delAudio:id=>tx("audio","readwrite",s=>s.delete(id))}})();
const urls={};
async function audioURL(song){if(urls[song.id])return urls[song.id];const b=await STU.audio(song.id);if(!b)throw new Error("audio missing");return urls[song.id]=URL.createObjectURL(b)}
const fmtT=t=>{t=Math.max(0,t);return Math.floor(t/60)+":"+String(Math.floor(t%60)).padStart(2,"0")};
function parseTags(buf){const u=new Uint8Array(buf),out={};
  const txt=(a,b,enc)=>{const s=u.subarray(a,b);try{return new TextDecoder(enc===1?"utf-16":enc===2?"utf-16be":enc===3?"utf-8":"latin1").decode(s).replace(/\0+$/,"").replace(/^\uFEFF/,"").trim()}catch{return""}};
  try{
    if(u[0]===0x49&&u[1]===0x44&&u[2]===0x33){const v=u[3],size=(u[6]<<21)|(u[7]<<14)|(u[8]<<7)|u[9];let i=10;const end=Math.min(u.length,10+size);
      while(i+10<end){const id=String.fromCharCode(u[i],u[i+1],u[i+2],u[i+3]);if(!/^[A-Z0-9]{4}$/.test(id))break;
        const fs=v===4?(u[i+4]<<21)|(u[i+5]<<14)|(u[i+6]<<7)|u[i+7]:(u[i+4]<<24)|(u[i+5]<<16)|(u[i+6]<<8)|u[i+7],a=i+10,b=a+fs;
        if(id==="TIT2")out.title=txt(a+1,b,u[a]);else if(id==="TPE1")out.artist=txt(a+1,b,u[a]);
        else if(id==="APIC"&&!out.cover){const enc=u[a];let j=a+1;while(u[j])j++;const mime=txt(a+1,j,0)||"image/jpeg";j+=2;
          if(enc===1||enc===2){while(j+1<b&&(u[j]||u[j+1]))j+=2;j+=2}else{while(j<b&&u[j])j++;j++}out.cover=new Blob([u.slice(j,b)],{type:mime.includes("/")?mime:"image/"+mime.toLowerCase()})}
        i=b}}
    else{const walk=(a,b,path)=>{let i=a;while(i+8<=b){let sz=(u[i]<<24|u[i+1]<<16|u[i+2]<<8|u[i+3])>>>0;const ty=String.fromCharCode(u[i+4],u[i+5],u[i+6],u[i+7]);if(sz<8)sz=b-i;const e=Math.min(b,i+sz);
        if(["moov","udta","ilst"].includes(ty))walk(i+8,e,path+"/"+ty);else if(ty==="meta")walk(i+12,e,path+"/meta");
        else if(path.endsWith("ilst")&&e-i>24){const d=i+8,pay=d+16,pe=Math.min(e,d+((u[d]<<24|u[d+1]<<16|u[d+2]<<8|u[d+3])>>>0));
          if(ty==="\xa9nam")out.title=txt(pay,pe,3);else if(ty==="\xa9ART")out.artist=txt(pay,pe,3);else if(ty==="covr")out.cover=new Blob([u.slice(pay,pe)],{type:u[pay]===0x89?"image/png":"image/jpeg"})}
        i=e}};walk(0,u.length,"")}
  }catch{}return out}

function makeFFT(n){const lv=Math.log2(n)|0,rev=new Uint32Array(n),cs=new Float32Array(n/2),sn=new Float32Array(n/2);
  for(let i=0;i<n;i++){let r=0;for(let b=0;b<lv;b++)r|=((i>>b)&1)<<(lv-1-b);rev[i]=r}
  for(let i=0;i<n/2;i++){cs[i]=Math.cos(2*Math.PI*i/n);sn[i]=-Math.sin(2*Math.PI*i/n)}
  return(re,im)=>{for(let i=0;i<n;i++){const j=rev[i];if(j>i){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
    for(let size=2;size<=n;size<<=1){const half=size>>1,step=n/size;for(let i=0;i<n;i+=size)for(let j=0,k=0;j<half;j++,k+=step){
      const a=i+j,b=a+half,tr=re[b]*cs[k]-im[b]*sn[k],ti=re[b]*sn[k]+im[b]*cs[k];re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti}}}}
const hann=n=>Float32Array.from({length:n},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/n));
const NAT={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const rawChord=raw=>{const m=String(raw).replace(/[()]/g,"").match(/^([A-G])([#b]?)([^/]*)/);if(!m)return null;return{r:(NAT[m[1]]+(m[2]==="#"?1:m[2]==="b"?-1:0)+12)%12,m:/^m(?!aj)/.test(m[3])}};
const chName=c=>c.r<0?"–":NOTES[c.r]+(c.m?"m":"");
// the shape you actually finger for a sounding chord, given the capo (null when it's not one of your shapes)
const shapeOf=(c,capo)=>{if(c.r<0)return null;const k=NOTES[(c.r-capo+120)%12]+(c.m?"m":""),v=k==="F"?"Feasy":k;return CH[v]?v:null};
const showName=(c,capo)=>NOTES[(c.r-capo+120)%12]+(c.m?"m":"");
function pickCapo(chords,dur){let best=0,bs=-1e9;for(let k=0;k<=7;k++){let s=0;chords.forEach((c,i)=>{const d=(chords[i+1]?.t??dur)-c.t,sh=shapeOf(c,k);if(sh)s+=d*(CH[sh].tag==="barre"?.45:1)});s-=k*.012*dur;if(s>bs)bs=s,best=k}return best}
async function analyzeAudio(buf,prog){
  const yieldUI=()=>new Promise(r=>setTimeout(r));
  const dec=buf.sampleRate>=32000?2:1,sr=buf.sampleRate/dec,L=Math.floor(buf.length/dec),x=new Float32Array(L),nc=buf.numberOfChannels;
  for(let c=0;c<nc;c++){const d=buf.getChannelData(c);for(let i=0;i<L;i++){let s=0;for(let k=0;k<dec;k++)s+=d[i*dec+k]||0;x[i]+=s/dec/nc}}
  const NP=480,peaks=[];for(let p=0;p<NP;p++){let m=0;const a=Math.floor(p*L/NP),b=Math.floor((p+1)*L/NP);for(let i=a;i<b;i+=3)m=Math.max(m,Math.abs(x[i]));peaks.push(+m.toFixed(3))}
  prog(.04);await yieldUI();
  // 1. onset strength: rectified spectral flux of log magnitudes
  const N1=1024,H1=256,F1=Math.max(1,Math.floor((L-N1)/H1)),f1=makeFFT(N1),w1=hann(N1),re=new Float32Array(N1),im=new Float32Array(N1),kmax=Math.min(N1/2,Math.floor(8000/(sr/N1))),last=new Float32Array(kmax);
  let env=new Float32Array(F1);
  for(let f=0;f<F1;f++){const o=f*H1;for(let i=0;i<N1;i++){re[i]=x[o+i]*w1[i];im[i]=0}f1(re,im);let s=0;
    for(let k=1;k<kmax;k++){const m=Math.log1p(100*Math.hypot(re[k],im[k])),d=m-last[k];if(d>0)s+=d;last[k]=m}env[f]=s;
    if(f%1500===0){prog(.04+.4*f/F1);await yieldUI()}}
  const fps=sr/H1,W=Math.round(fps*.4);{const cs=new Float64Array(F1+1);for(let i=0;i<F1;i++)cs[i+1]=cs[i]+env[i];let sq=0;
    for(let i=0;i<F1;i++){const a=Math.max(0,i-W),b=Math.min(F1,i+W+1);env[i]=Math.max(0,env[i]-(cs[b]-cs[a])/(b-a));sq+=env[i]*env[i]}
    const sd=Math.sqrt(sq/F1)||1;for(let i=0;i<F1;i++)env[i]/=sd}
  // 2. tempo: autocorrelation of the onset curve, weighted towards ~105 bpm
  const lagMin=Math.floor(fps*60/200),lagMax=Math.ceil(fps*60/50),acf=new Float32Array(lagMax+2);
  for(let l=lagMin-1;l<=lagMax+1;l++){let s=0;for(let i=l;i<F1;i++)s+=env[i]*env[i-l];acf[l]=s/(F1-l)}
  let bl=lagMin,bv=-1;for(let l=lagMin;l<=lagMax;l++){const bpm=60*fps/l,v=acf[l]*Math.exp(-.5*(Math.log2(bpm/105)/.9)**2);if(v>bv)bv=v,bl=l}
  const a1=acf[bl-1],a2=acf[bl],a3=acf[bl+1],per=bl+((a1-a3)/(2*(a1-2*a2+a3))||0);
  prog(.5);await yieldUI();
  // 3. beats: dynamic programming that rewards onsets and penalises drifting from the tempo (Ellis 2007)
  const score=new Float32Array(F1),back=new Int32Array(F1).fill(-1);
  for(let t=0;t<F1;t++){let best=-1e9,bi=-1;const lo=Math.max(0,Math.round(t-2*per)),hi=Math.min(t-1,Math.round(t-per/2));
    for(let q=lo;q<=hi;q++){const v=score[q]-100*Math.log((t-q)/per)**2;if(v>best)best=v,bi=q}
    if(bi>=0&&best>0){score[t]=env[t]+best;back[t]=bi}else score[t]=env[t]}
  let t=0,bs=-1;for(let i=Math.max(0,F1-Math.round(per));i<F1;i++)if(score[i]>bs)bs=score[i],t=i;
  let beats=[];while(t>=0){beats.push(t/fps);t=back[t]}beats.reverse();
  const P=per/fps,dur=buf.duration;
  {const fill=[];beats.forEach((b,i)=>{if(i){const g=b-beats[i-1],n=Math.round(g/P);for(let k=1;k<n;k++)fill.push(beats[i-1]+g*k/n)}fill.push(b)});beats=fill;
    while(beats.length&&beats[0]-P>0)beats.unshift(beats[0]-P);while(beats.length&&beats[beats.length-1]+P<dur)beats.push(beats[beats.length-1]+P)}
  if(beats.length<4)beats=Array.from({length:Math.floor(dur/P)},(_,i)=>i*P);
  prog(.56);await yieldUI();
  // 4. chroma: pitch-class energy every ~93 ms, then averaged per beat
  const N2=8192,H2=2048,F2=Math.max(1,Math.floor((L-N2)/H2)),f2=makeFFT(N2),w2=hann(N2),r2=new Float32Array(N2),i2=new Float32Array(N2),bw=sr/N2,k0=Math.ceil(98/bw),k1=Math.min(N2/2,Math.floor(2100/bw));
  const kb0=Math.ceil(40/bw),kb1=Math.floor(125/bw),pcOf=new Int8Array(k1+1),wOf=new Float32Array(k1+1);
  // only bins near a real note count, weighted by how close they are, so a C# doesn't leak into C
  for(let k=Math.min(k0,kb0);k<=k1;k++){const m=69+12*Math.log2(k*bw/440),d=Math.abs(m-Math.round(m));pcOf[k]=((Math.round(m)%12)+12)%12;wOf[k]=d<.4?1-d/.4:0}
  const fr=[];for(let f=0;f<F2;f++){const o=f*H2;for(let i=0;i<N2;i++){r2[i]=x[o+i]*w2[i];i2[i]=0}f2(r2,i2);const c=new Float32Array(12);let e=0;
    const bs=new Float32Array(12);for(let k=kb0;k<=kb1;k++)bs[pcOf[k]]+=(r2[k]*r2[k]+i2[k]*i2[k])*wOf[k];
    for(let k=k0;k<=k1;k++){const p=r2[k]*r2[k]+i2[k]*i2[k];c[pcOf[k]]+=Math.log1p(Math.sqrt(p)*20)*wOf[k];e+=p}let cs=0,bt=0;for(let k=0;k<12;k++){cs+=c[k];bt+=bs[k]}for(let k=0;k<12;k++){c[k]=cs?c[k]/cs:0;bs[k]=bt?bs[k]/bt:0}fr.push({t:(o+N2/2)/sr,c,e,bs});if(f%150===0){prog(.56+.34*f/F2);await yieldUI()}}
  const nb=beats.length,bc=[],be=[],bb=[];let fi=0,emax=0;
  for(let i=0;i<nb;i++){const a=beats[i],b=beats[i+1]??dur,c=new Float32Array(12),bz=new Float32Array(12);let e=0,n=0;while(fi<fr.length&&fr[fi].t<a)fi++;
    for(let j=fi;j<fr.length&&fr[j].t<b;j++){for(let k=0;k<12;k++){c[k]+=fr[j].c[k];bz[k]+=fr[j].bs[k]}e+=fr[j].e;n++}
    if(!n&&fr.length){const j=Math.min(fr.length-1,fi);for(let k=0;k<12;k++){c[k]=fr[j].c[k];bz[k]=fr[j].bs[k]}e=fr[j].e;n=1}{let bt=0;for(let k=0;k<12;k++)bt+=bz[k];for(let k=0;k<12;k++)bz[k]=bt?bz[k]/bt:0}bb.push(bz);
    let mn=Infinity;for(let k=0;k<12;k++)mn=Math.min(mn,c[k]);let nn=0;for(let k=0;k<12;k++){c[k]=Math.max(0,c[k]-mn*1.05);nn+=c[k]*c[k]}nn=Math.sqrt(nn)||1;for(let k=0;k<12;k++)c[k]/=nn;bc.push(c);be.push(e/(n||1));emax=Math.max(emax,e/(n||1))}
  // 5. chords: 24 major/minor triads, smoothed so the label only changes when the music clearly does
  const TPL=[];for(let r=0;r<12;r++)for(const m of[false,true]){const v=new Float32Array(12);[[r,1.1],[(r+(m?3:4))%12,1],[(r+7)%12,.9]].forEach(([n,w])=>{v[n]+=w;v[(n+7)%12]+=w*.3;v[(n+4)%12]+=w*.15});let n=0;v.forEach(z=>n+=z*z);n=Math.sqrt(n);TPL.push({r,m,v:v.map(z=>z/n)})}
  const S=TPL.length+1,pen=.22,bp=new Uint8Array(nb*S);let dp=new Float32Array(S);
  for(let i=0;i<nb;i++){const quiet=be[i]<emax*.004,em=TPL.map(T=>{let s=0;for(let k=0;k<12;k++)s+=T.v[k]*bc[i][k];s+=.8*bb[i][T.r]+.1*bb[i][(T.r+7)%12]-.35*bb[i][(T.r+(T.m?3:4))%12]-.2*bb[i][(T.r+(T.m?4:3))%12];return quiet?s*.3:s});em.push(quiet?.9:.35);
    let bi=0;for(let s=1;s<S;s++)if(dp[s]>dp[bi])bi=s;const nd=new Float32Array(S);
    for(let s=0;s<S;s++){const stay=dp[s],sw=dp[bi]-pen;if(i===0||stay>=sw){nd[s]=stay+em[s];bp[i*S+s]=s}else{nd[s]=sw+em[s];bp[i*S+s]=bi}}dp=nd}
  const lab=new Array(nb);{let s=0;for(let k=1;k<S;k++)if(dp[k]>dp[s])s=k;for(let i=nb-1;i>=0;i--){lab[i]=s;s=bp[i*S+s]}}
  const chordAt=i=>lab[i]===S-1?{r:-1,m:false}:{r:TPL[lab[i]].r,m:TPL[lab[i]].m};
  // 6. bars: 3 or 4 beats, with the downbeat where most chord changes land
  const chg=[];for(let i=1;i<nb;i++)if(lab[i]!==lab[i-1])chg.push(i);
  let bpb=4,phase=0;{const fit=k=>{let b=-1,bph=0;for(let p=0;p<k;p++){const n=chg.filter(i=>(i-p)%k===0).length/(chg.length||1);if(n>b)b=n,bph=p}return[b,bph]};
    const[s4,p4]=fit(4),[s3,p3]=fit(3);if(s3>s4+.15){bpb=3;phase=p3}else phase=p4}
  const chords=[],segs=[];for(let i=0;i<nb;i++){const c=chordAt(i),t=+beats[i].toFixed(3);
    if(!i||lab[i]!==lab[i-1])chords.push({t,...c});if(!i||lab[i]!==lab[i-1]||(i-phase)%bpb===0)segs.push({t,...c})}
  prog(1);
  const r3=a=>Array.from(a,x=>+x.toFixed(3));
  return{dur:+dur.toFixed(2),bpm:Math.round(60/P),beats:beats.map(b=>+b.toFixed(3)),bpb,phase,chords,segs,peaks,bc:bc.map(r3),bb:bb.map(r3)}}

// the capo that turns the most playing time into chord shapes you have (and prefers ones you know, without barres)
const CHORD_TOK=/^\(?[A-G][#b]?(m|maj|min|sus|add|dim|aug|M|\d|\+)*(\/[A-G][#b]?)?\)?$/;
const isBarTok=x=>CHORD_TOK.test(x)||x==="%";
const isChordLine=l=>{const t=l.replace(/\|/g," ").trim().split(/\s+/).filter(x=>x&&!/^(\(?x\d+\)?|-+|N\.?C\.?)$/i.test(x));return t.length>0&&t.every(isBarTok)&&t.some(x=>x!=="%")||t.length>0&&t.every(x=>x==="%")};
const isHead=l=>{const m=l.trim().match(/^\[([^\]]+)\]:?$/);return m&&!CHORD_TOK.test(m[1])?m[1]:null};
function parseSheet(txt){const src=txt.replace(/\r/g,"").replace(/\t/g,"    ").split("\n"),lines=[],bars=[],unknown=new Set();let lastRaw=null;
  const seg=(raw,t)=>{if(raw==="%")raw=lastRaw;if(raw)lastRaw=raw;const c=raw?chordKey(raw):null;if(raw&&!c)unknown.add(raw);const g={raw,c,t};if(c){g.b=bars.length;bars.push(c)}return g};
  for(let i=0;i<src.length;i++){if(/^[eBGDAE]\s*\|/.test(src[i].trim()))continue;const l=src[i].replace(/\|/g," "),hd=isHead(l);
    if(!l.trim())continue;
    if(hd){lines.push({h:hd});continue}
    if(/\[[A-G][^\]]*\]/.test(l)){const parts=l.split(/\[([^\]]+)\]/),segs=[];if(parts[0].trim())segs.push(seg(null,parts[0]));
      for(let k=1;k<parts.length;k+=2)segs.push(seg(parts[k],(parts[k+1]||"").padEnd(parts[k].length+1)));lines.push({segs});continue}
    if(isChordLine(l)){const cols=[...l.matchAll(/\S+/g)].filter(m=>isBarTok(m[0])),nx=src[i+1]||"",lyr=!src[i].includes("|")&&nx.trim()&&!isChordLine(nx)&&!isHead(nx)&&!/^[eBGDAE]\s*\|/.test(nx.trim())?nx:null;
      if(lyr==null){lines.push({segs:cols.map(m=>seg(m[0]," "))});continue}
      i++;const segs=[];if(lyr.slice(0,cols[0].index).trim())segs.push(seg(null,lyr.slice(0,cols[0].index)));
      cols.forEach((m,k)=>segs.push(seg(m[0],lyr.slice(m.index,k+1<cols.length?cols[k+1].index:undefined).padEnd(m[0].length+1))));lines.push({segs});continue}
    lines.push({segs:[seg(null,l)]})}
  return{lines,bars,unknown:[...unknown]}}
function sheetTokens(sh){const out=[];sh.lines.forEach((L,li)=>(L.segs||[]).forEach((g,si)=>{if(g.raw){const c=rawChord(g.raw);if(c)out.push({...c,li,si})}}));return out}
// Needleman-Wunsch: line up the sheet's chord order with what was heard. Skipping heard bars is cheap (intros, repeats); skipping sheet chords costs more
function nwAlign(A,B){const n=A.length,m=B.length,M=m+1,G=new Float32Array((n+1)*M),Pt=new Uint8Array((n+1)*M),gA=-1,gB=-.2;
  const sim=(a,b)=>b.r<0?-.8:a.r===b.r&&a.m===b.m?(b.st?2.3:2):a.r===b.r?.4:(a.m&&!b.m&&(a.r+3)%12===b.r)||(!a.m&&b.m&&(b.r+3)%12===a.r)?.3:-1;
  for(let i=1;i<=n;i++){G[i*M]=i*gA;Pt[i*M]=1}for(let j=1;j<=m;j++){G[j]=0;Pt[j]=2}
  for(let i=1;i<=n;i++)for(let j=1;j<=m;j++){const d=G[(i-1)*M+j-1]+sim(A[i-1],B[j-1]),u=G[(i-1)*M+j]+gA,l=G[i*M+j-1]+gB;
    if(d>=u&&d>=l){G[i*M+j]=d;Pt[i*M+j]=0}else if(u>=l){G[i*M+j]=u;Pt[i*M+j]=1}else{G[i*M+j]=l;Pt[i*M+j]=2}}
  let j=0;for(let k=1;k<=m;k++)if(G[n*M+k]>G[n*M+j])j=k;const score=G[n*M+j],map=new Int32Array(n).fill(-1);let i=n;
  while(i>0&&j>=0){const p=j===0?1:Pt[i*M+j];if(p===0){map[i-1]=j-1;i--;j--}else if(p===1)i--;else j--}
  return{score,map}}
// Sync v2: score how well every sheet chord fits every bar of the recording, then find the best path through the song
// where each chord lasts a sensible number of bars (segmental dynamic programming). One misheard bar can't drag the words off.
const CTPL=(()=>{const T=[];for(let r=0;r<12;r++)for(const m of[false,true]){const v=new Float32Array(12);[[r,1.1],[(r+(m?3:4))%12,1],[(r+7)%12,.9]].forEach(([n,w])=>{v[n]+=w;v[(n+7)%12]+=w*.3;v[(n+4)%12]+=w*.15});
  let n=0;v.forEach(z=>n+=z*z);n=Math.sqrt(n);T.push(v.map(z=>z/n))}return T})();
function alignAtPhase(song,sheet,phase){const sh=parseSheet(sheet),tok=sheetTokens(sh);if(!tok.length||!song.bc)return null;
  // units = bars (or half-bars), starting on the given downbeat
  const nb=song.beats.length,bpb=song.bpb,st=[];for(let i=0;i<nb;i++)if(i===0||(i-phase)%bpb===0)st.push(i);
  const N=st.length,U=st.map((a,k)=>{const b=k+1<N?st[k+1]:nb,c=new Float32Array(12),d=new Float32Array(12);for(let i=a;i<b;i++)for(let z=0;z<12;z++){c[z]+=song.bc[i][z];d[z]+=song.bb[i][z]}
    let n=0;for(let z=0;z<12;z++)n+=c[z]*c[z];n=Math.sqrt(n)||1;let bt=0;for(let z=0;z<12;z++){c[z]/=n;bt+=d[z]}for(let z=0;z<12;z++)d[z]=bt?d[z]/bt:0;return{t:song.beats[a],c,d}});
  // fit of chord (root r, minor m) to unit u, relative to how well an average chord fits it
  const raw=U.map(u=>CTPL.map((v,k)=>{const r=k>>1,m=k&1;let s=0;for(let z=0;z<12;z++)s+=v[z]*u.c[z];return s+.8*u.d[r]+.1*u.d[(r+7)%12]-.35*u.d[(r+(m?3:4))%12]}));
  const fit=raw.map(row=>{const mean=row.reduce((a,b)=>a+b,0)/row.length;return row.map(x=>x-mean)});
  const K=8,G=8,gap=.25,durPen=k=>k>4?.12*(k-4):0,M=tok.length;let best=null;
  for(let T=0;T<12;T++){const idx=tok.map(c=>(((c.r+T)%12)<<1)|(c.m?1:0));
    // prefix sums of fit per token along the units
    const P=idx.map(k=>{const p=new Float32Array(N+1);for(let j=0;j<N;j++)p[j+1]=p[j]+fit[j][k];return p});
    let prev=new Float32Array(N).fill(-1e9);const back=[];
    for(let i=0;i<M;i++){const cur=new Float32Array(N).fill(-1e9),bk=new Int32Array(N*2).fill(-1);
      for(let j=0;j<N;j++)for(let k=1;k<=K&&k<=j+1;k++){const s0=j-k+1,seg=P[i][j+1]-P[i][s0]-durPen(k);
        if(i===0){if(seg>cur[j]){cur[j]=seg;bk[2*j]=s0;bk[2*j+1]=-1}}
        else for(let g=0;g<=G&&s0-1-g>=0;g++){const v=prev[s0-1-g]-gap*g+seg;if(v>cur[j]){cur[j]=v;bk[2*j]=s0;bk[2*j+1]=s0-1-g}}}
      back.push(bk);prev=cur}
    let j=0;for(let x=1;x<N;x++)if(prev[x]>prev[j])j=x;
    if(!best||prev[j]>best.score){const starts=new Array(M);let e=j;for(let i=M-1;i>=0;i--){starts[i]=back[i][2*e];e=back[i][2*e+1]}best={score:prev[j],T,starts,idx}}}
  // second pass at the chosen key: also prefer each chord to last as long as the one before it (songs keep a steady rhythm of changes)
  {const idx=best.idx,KK=K+1,lam=.14,P=idx.map(k=>{const p=new Float32Array(N+1);for(let j=0;j<N;j++)p[j+1]=p[j]+fit[j][k];return p});
    let prev=null;const back=[];
    for(let i=0;i<M;i++){const cur=new Float32Array(N*KK).fill(-1e9),bk=new Int32Array(N*KK*2).fill(-1);
      // for every possible previous end unit, the best previous length given this length k
      for(let j=0;j<N;j++)for(let k=1;k<=K&&k<=j+1;k++){const s0=j-k+1,seg=P[i][j+1]-P[i][s0]-durPen(k),o=j*KK+k;
        if(i===0){cur[o]=seg;bk[2*o]=-1;continue}
        for(let g=0;g<=G&&s0-1-g>=0;g++){const pj=s0-1-g;for(let k2=1;k2<=K;k2++){const pv=prev[pj*KK+k2];if(pv<-1e8)continue;
          const v=pv-gap*g-lam*Math.abs(k-k2)+seg;if(v>cur[o]){cur[o]=v;bk[2*o]=pj;bk[2*o+1]=k2}}}}
      back.push(bk);prev=cur}
    let bo=0;for(let o=1;o<N*KK;o++)if(prev[o]>prev[bo])bo=o;
    const starts=new Array(M);let j=Math.floor(bo/KK),k=bo%KK;for(let i=M-1;i>=0;i--){starts[i]=j-k+1;const o=j*KK+k;const pj=back[i][2*o],pk=back[i][2*o+1];j=pj;k=pk}
    if(starts.every(x=>x>=0)){best.starts=starts;best.score=prev[bo]}}
  const times=best.starts.map(u=>+U[u].t.toFixed(3));
  const hits=best.starts.filter((u,i)=>fit[u][best.idx[i]]>0).length;
  return{T:best.T,times,hits,total:M,score:best.score,phase}}
// the downbeat guess from analysis is only a guess: try every bar start and keep the one the music fits best
function alignSheetDP(song,sheet){let best=null;for(let ph=0;ph<(song.bpb||4);ph++){const r=alignAtPhase(song,sheet,ph);if(r&&(!best||r.score>best.score))best=r}return best}
function alignSheet(song,sheet){if(song.bc)return alignSheetDP(song,sheet);const sh=parseSheet(sheet),tok=sheetTokens(sh);if(!tok.length)return null;
  const B=song.segs.map((g,j)=>({...g,st:!j||g.r!==song.segs[j-1].r||g.m!==song.segs[j-1].m}));
  let best=null;for(let T=0;T<12;T++){const r=nwAlign(tok.map(c=>({r:(c.r+T)%12,m:c.m})),B);if(!best||r.score>best.score)best={...r,T}}
  const times=new Array(tok.length).fill(null);let hits=0;best.map.forEach((j,i)=>{if(j>=0&&song.segs[j].r===(tok[i].r+best.T)%12){times[i]=song.segs[j].t;hits++}else if(j>=0)times[i]=song.segs[j].t});
  const known_=times.map((t,i)=>t==null?null:i).filter(i=>i!=null),bar=60/song.bpm*song.bpb;
  if(!known_.length)tok.forEach((_,i)=>times[i]=i*bar);
  else{for(let i=0;i<known_[0];i++)times[i]=Math.max(0,times[known_[0]]-(known_[0]-i)*bar);
    for(let k=0;k<known_.length-1;k++){const a=known_[k],b=known_[k+1];for(let i=a+1;i<b;i++)times[i]=times[a]+(times[b]-times[a])*(i-a)/(b-a)}
    const z=known_[known_.length-1];for(let i=z+1;i<tok.length;i++)times[i]=Math.min(song.dur,times[z]+(i-z)*bar)}
  for(let i=1;i<times.length;i++)if(times[i]<times[i-1])times[i]=times[i-1];
  return{T:best.T,times:times.map(t=>+t.toFixed(3)),hits,total:tok.length}}

// everything a jam needs: one event per chord change, with its lyric position when there's a sheet
function buildEvents(song){const off=song.offset||0;
  if(song.sheet&&song.times){const sh=parseSheet(song.sheet),tok=sheetTokens(sh);
    return{sh,ev:tok.map((c,i)=>({t:(song.times[i]??0)+off,c:{r:(c.r+song.T)%12,m:c.m},li:c.li,si:c.si,i}))}}
  return{sh:null,ev:song.chords.filter(c=>c.r>=0).map((c,i)=>({t:c.t+off,c:{r:c.r,m:c.m},i}))}}
const evAt=(ev,t)=>{let lo=0,hi=ev.length-1,r=-1;while(lo<=hi){const m=(lo+hi)>>1;if(ev[m].t<=t){r=m;lo=m+1}else hi=m-1}return r};
const LEAD=.3;
function lyricsView(box,sh,ev,capo,onSeek){
  const words=[],lines=[];let html="";
  sh.lines.forEach((L,li)=>{if(L.h){html+=`<div class="sk-h">${esc(L.h)}</div>`;return}
    let c=0;const anchors=[],ws=[];
    const segHtml=L.segs.map((g,si)=>{const e=ev.find(x=>x.li===li&&x.si===si),bar=e&&!g.t.trim();if(e)anchors.push({c,t:e.t});
      const lead=(g.t.match(/^\s*/)||[""])[0],parts=g.t.slice(lead.length).match(/\S+\s*/g)||[];c+=lead.length;
      const inner=esc(lead)+parts.map(w=>{const k=words.length;words.push({c,li,t:0});ws.push(k);c+=w.length;return`<span class="sk-w" data-w="${k}">${esc(w)}</span>`}).join("");
      return`<span class="sk-s${bar?" bar":""}"${e?` data-e="${e.i}"`:""}><b>${e?esc(showName(e.c,capo)):""}</b><span class="sk-tx">${inner}</span></span>`}).join("");
    lines.push({li,anchors,ws});html+=`<div class="sk-l" data-li="${li}">${segHtml}</div>`});
  box.innerHTML=html;
  // the song's singing pace: characters per second between chord changes inside a line
  const rates=[];lines.forEach(({anchors:a})=>{for(let k=1;k<a.length;k++){const dc=a[k].c-a[k-1].c,dt=a[k].t-a[k-1].t;if(dc>0&&dt>.3)rates.push(dc/dt)}});
  rates.sort((x,y)=>x-y);const rate=Math.min(25,Math.max(6,rates.length?rates[rates.length>>1]:12));
  let prevEnd=0;lines.forEach((L,n)=>{const a=L.anchors,nextStart=(lines.slice(n+1).find(x=>x.anchors.length)?.anchors[0].t)??Infinity;
    L.ws.forEach(k=>{const w=words[k];let t;
      if(!a.length)t=null;
      else if(w.c<a[0].c)t=Math.max(prevEnd+.05,a[0].t-(a[0].c-w.c)/rate);
      else{let j=0;while(j+1<a.length&&a[j+1].c<=w.c)j++;t=j+1<a.length?a[j].t+(w.c-a[j].c)/(a[j+1].c-a[j].c)*(a[j+1].t-a[j].t):Math.min(a[j].t+(w.c-a[j].c)/rate,nextStart-.1)}
      w.t=t});
    // lines with no chords of their own: spread them between the line before and the next chord
    if(!a.length&&L.ws.length){const span=Math.max(.5,Math.min(nextStart,prevEnd+L.ws.length*0.45)-prevEnd);L.ws.forEach((k,i)=>words[k].t=prevEnd+.1+span*i/L.ws.length)}
    L.ws.forEach(k=>{if(words[k].t<prevEnd)words[k].t=prevEnd+.01;prevEnd=words[k].t})});
  const W=[...box.querySelectorAll(".sk-w")],lineEl=li=>box.querySelector(`.sk-l[data-li="${li}"]`);
  box.querySelectorAll(".sk-l").forEach(l=>l.onclick=()=>{const li=+l.dataset.li,w=words.find(x=>x.li===li),e=ev.find(x=>x.li===li);const t=w?w.t:e?.t;if(t!=null)onSeek(Math.max(0,t-.6))});
  let curW=-2,curE=-2,curL=-1;
  const view=(k,t)=>{
    // chord-only rows (intros, interludes) still light up by chord
    if(k!==curE){curE=k;box.querySelectorAll(".sk-s.on").forEach(x=>x.classList.remove("on"));const e=ev[k],s=e&&box.querySelector(`[data-e="${e.i}"]`);if(s&&s.classList.contains("bar"))s.classList.add("on")}
    if(t==null)return;let lo=0,hi=words.length-1,wi=-1;const tt=t+LEAD;while(lo<=hi){const m=(lo+hi)>>1;if(words[m].t<=tt){wi=m;lo=m+1}else hi=m-1}
    if(wi===curW)return;curW=wi;W.forEach(x=>x.classList.remove("on","past"));
    const li=wi>=0?words[wi].li:(ev[k]?.li??-1);if(wi>=0){W[wi].classList.add("on");for(let j=wi-1;j>=0&&words[j].li===li;j--)W[j].classList.add("past")}
    if(li!==curL){if(curL>=0)lineEl(curL)?.classList.remove("cur");curL=li;const el=li>=0&&lineEl(li);if(el){el.classList.add("cur");box.scrollTop=el.offsetTop-box.clientHeight*.32}}};
  // [ and ] move the words as well as the chords
  view.shift=d=>{words.forEach(w=>w.t+=d);curW=-2};
  return view}
