/* ================= song studio: your own recordings =================
   Drop in an audio file. Bruv finds the beat and the chords, picks a capo that gives easy shapes,
   and syncs a pasted chord sheet to the recording. Songs and audio stay in IndexedDB on this device. */

/* ----- storage ----- */
const STU=(()=>{let p;
  const open=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open("bruv-studio",1);
    r.onupgradeneeded=()=>{r.result.createObjectStore("songs",{keyPath:"id"});r.result.createObjectStore("audio")};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
  const tx=async(store,mode,fn)=>{const db=await open();return new Promise((res,rej)=>{const t=db.transaction(store,mode),r=fn(t.objectStore(store));t.oncomplete=()=>res(r?.result);t.onerror=()=>rej(t.error)})};
  return{all:()=>tx("songs","readonly",s=>s.getAll()),put:v=>tx("songs","readwrite",s=>s.put(v)),del:id=>tx("songs","readwrite",s=>s.delete(id)),
    audio:id=>tx("audio","readonly",s=>s.get(id)),putAudio:(id,b)=>tx("audio","readwrite",s=>s.put(b,id)),delAudio:id=>tx("audio","readwrite",s=>s.delete(id))}})();
const urls={};
async function audioURL(song){if(urls[song.id])return urls[song.id];const b=await STU.audio(song.id);if(!b)throw new Error("audio missing");return urls[song.id]=URL.createObjectURL(b)}
const IC={
  play:'<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  pause:'<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>',
  start:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><rect x="5" y="5.5" width="2.6" height="13" rx="1"/><path d="M19 6.3v11.4a.9.9 0 0 1-1.4.75L9.6 13a1.2 1.2 0 0 1 0-2l8-5.4a.9.9 0 0 1 1.4.7z"/></svg>',
  back:'<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 3.5v4h4"/><text x="12" y="15.4" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" stroke="none">5</text></svg>',
  loop:'<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3.5l3 3-3 3"/><path d="M4 11.5v-1a4 4 0 0 1 4-4h12"/><path d="M7 20.5l-3-3 3-3"/><path d="M20 12.5v1a4 4 0 0 1-4 4H4"/></svg>',
  click:'<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3.5h6l3.5 17h-13z"/><path d="M12 15l5-8"/><path d="M8 15.5h8"/></svg>'};
const fmtT=t=>{t=Math.max(0,t);return Math.floor(t/60)+":"+String(Math.floor(t%60)).padStart(2,"0")};

/* ----- file tags: title, artist and cover art from MP3 (ID3v2) and M4A (iTunes atoms) ----- */
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

/* ----- signal processing ----- */
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
const shapeOf=(c,capo)=>{if(c.r<0)return null;const k=NOTES[(c.r-capo+120)%12]+(c.m?"m":"");return CH[k]?k:null};
const showName=(c,capo)=>{const s=shapeOf(c,capo);return s?label(songChords([s])[0]):NOTES[(c.r-capo+120)%12]+(c.m?"m":"")};
const playShape=(c,capo)=>{const s=shapeOf(c,capo);return s?songChords([s])[0]:null};
// one colour per chord root, from a professional set (no pinks); minor chords a shade deeper
const HUES=["#ff9500","#2f6bff","#10b765","#14b8a6","#3f51d8","#e0a100","#0a84ff","#34c759","#ff7a00","#2c8fb3","#6c7cff","#c48a00"];
const chordHue=c=>c.r<0?"#9aa0b4":c.m?`color-mix(in srgb,${HUES[c.r]} 78%,#0f1f4d)`:HUES[c.r];

// tempo, beats and chords from a decoded AudioBuffer. prog(0..1) reports progress
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
function pickCapo(chords,dur){let best=0,bs=-1e9;
  for(let k=0;k<=7;k++){let s=0;chords.forEach((c,i)=>{const d=(chords[i+1]?.t??dur)-c.t,sh=shapeOf(c,k);if(sh)s+=d*(known[sh]?1:.75)*(CH[sh].barre?.45:1)});s-=k*.012*dur;if(s>bs)bs=s,best=k}
  return best}

/* ----- chord sheet → recording ----- */
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

/* ----- shared views ----- */
function waveCanvas(cv,song,ev){const W=cv.width=cv.clientWidth*devicePixelRatio,H=cv.height=cv.clientHeight*devicePixelRatio,g=cv.getContext("2d"),pk=song.peaks,n=pk.length,mx=Math.max(...pk)||1;
  // on the jam stage: white bars over the gradient, with a strip of chord colours underneath
  const onStage=!!cv.closest(".sk-stage"),strip=onStage?5*devicePixelRatio:0,HH=H-strip;
  return t=>{g.clearRect(0,0,W,H);const bw=W/n;
    for(let i=0;i<n;i++){const tt=i/n*song.dur,k=evAt(ev,tt),c=k>=0?ev[k].c:{r:-1},h=Math.max(2,pk[i]/mx*HH*.86);
      g.fillStyle=onStage?"#fff":chordHue(c);g.globalAlpha=tt<=t?1:onStage?.38:.42;g.fillRect(i*bw,(HH-h)/2,Math.max(1,bw-1),h);
      if(onStage){g.fillStyle=chordHue(c);g.globalAlpha=tt<=t?1:.6;g.fillRect(i*bw,H-strip,bw+.5,strip)}}
    g.globalAlpha=1;g.fillStyle=onStage?"#1a1020":"#fff";g.fillRect(t/song.dur*W-1.5,0,3,H)}}
// karaoke lyrics. A chord sheet only says when chords change, so every word gets an estimated time: words between two chord
// changes are spread across them, and words sung before a line's first chord (pickups) are timed backwards at the song's own
// singing pace. The sung word lights up, not the whole chord block.
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
function chipsView(box,ev,capo,onSeek){box.innerHTML=ev.map((e,k)=>`<button class="sk-chip" data-k="${k}">${esc(showName(e.c,capo))}</button>`).join("");
  box.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>onSeek(ev[+b.dataset.k].t));let cur=-2;
  return k=>{if(k===cur)return;cur=k;box.querySelectorAll(".on").forEach(x=>x.classList.remove("on"));const b=box.children[k];if(b){b.classList.add("on");box.scrollLeft=b.offsetLeft-box.clientWidth/2+b.offsetWidth/2}}}
async function artColor(song){if(!song.cover)return null;try{const im=await createImageBitmap(song.cover),c=document.createElement("canvas");c.width=c.height=8;const g=c.getContext("2d");g.drawImage(im,0,0,8,8);
  const d=g.getImageData(0,0,8,8).data;let r=0,gg=0,b=0;for(let i=0;i<d.length;i+=4){r+=d[i];gg+=d[i+1];b+=d[i+2]}return`rgb(${r/64|0},${gg/64|0},${b/64|0})`}catch{return null}}
const hashArt=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%997;return["#2f6bff","#ff9500","#14b8a6","#3f51d8","#10b765","#0a84ff"][h%6]};
const coverHTML=(song,cls)=>song.cover?`<img class="${cls}" alt="" src="${URL.createObjectURL(song.cover)}">`:`<div class="${cls} sk-nocover" style="--art:${hashArt(song.t)}">${esc((song.t||"?")[0])}</div>`;

/* ----- library on the Jam tab ----- */
async function drawStudio(){const box=$("studio");if(!box)return;let songs=[];try{songs=await STU.all()}catch{}
  songs.sort((a,b)=>(b.last||b.added)-(a.last||a.added));songs.forEach(s=>audioURL(s).catch(()=>{}));
  box.innerHTML=`<div class="card sk-lib"><div class="sk-libhead"><div><h2>Your songs</h2><p class="mute">Add an audio file. I'll find the beat and the chords, then sync your lyrics to the recording.</p></div>
    <label class="big gold sk-add" for="sk-file">＋ Add a song</label><input type="file" id="sk-file" accept="audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg" hidden></div>
    ${songs.length?`<div class="sk-grid">${songs.map(s=>`<div class="sk-card"><button class="sk-play" data-id="${s.id}" aria-label="Jam ${esc(s.t)}">${coverHTML(s,"sk-art")}<span class="sk-pbtn">${IC.play}</span></button>
      <b>${esc(s.t)}</b><span class="mute">${esc(s.a||"Your song")}</span><span class="sk-meta">${s.capo?`Capo ${s.capo} · `:""}${s.bpm} bpm${s.sheet?" · 📝":""}</span><button class="ghost sk-edit" data-ed="${s.id}">Edit</button></div>`).join("")}</div>`
    :`<div class="sk-empty">${/Mac/.test(navigator.platform)&&!("ontouchend" in document)?"Or drag an MP3 or M4A onto this page.":"Pick an MP3 or M4A from your Files app."}</div>`}</div>`;
  $("sk-file").onchange=e=>{const f=e.target.files[0];if(f)importSong(f);e.target.value=""};
  box.querySelectorAll("[data-id]").forEach(b=>b.onclick=()=>{const s=songs.find(x=>x.id===b.dataset.id);runTool(s.t,el=>mountStudioJam(el,s))});
  box.querySelectorAll("[data-ed]").forEach(b=>b.onclick=()=>{const s=songs.find(x=>x.id===b.dataset.ed);runTool("Edit: "+s.t,el=>mountStudioEdit(el,s))})}
{const _ds=drawSongs;drawSongs=function(){_ds();drawStudio()}}
document.addEventListener("dragover",e=>{if([...(e.dataTransfer?.items||[])].some(i=>i.kind==="file")){e.preventDefault();document.body.classList.add("sk-drop")}});
document.addEventListener("dragleave",e=>{if(!e.relatedTarget)document.body.classList.remove("sk-drop")});
document.addEventListener("drop",e=>{document.body.classList.remove("sk-drop");const f=[...(e.dataTransfer?.files||[])].find(f=>/audio|\.(mp3|m4a|aac|wav|flac|ogg)$/i.test(f.type+f.name));if(f){e.preventDefault();importSong(f)}});

/* ----- import ----- */
async function importSong(file){
  runTool("New song",el=>{el.innerHTML=`<div class="sk-import"><div class="sk-file">🎵 ${esc(file.name)}</div><div class="sk-bar"><i></i></div><div class="sk-step" data-st>Reading the file…</div></div>`});
  const el=$("scard"),bar=el.querySelector(".sk-bar i"),st=el.querySelector("[data-st]"),setP=p=>bar.style.width=Math.round(p*100)+"%";
  say(rnd(["New tune? Let me have a listen.","Ooh, what've we got here?","Give me a sec, I'm listening to it."]));
  try{
    const buf=await file.arrayBuffer(),tags=parseTags(buf);st.textContent="Decoding the audio…";setP(.02);
    const audio=await new Promise((res,rej)=>{const p=ctx().decodeAudioData(buf.slice(0),res,rej);if(p&&p.then)p.then(res,rej)});
    let stage=0;const res=await analyzeAudio(audio,p=>{setP(p);const ns=p<.45?1:p<.56?2:3;if(ns!==stage){stage=ns;st.textContent=["","Finding the beat…","Counting the bars…","Working out the chords…"][ns]}});
    const id="s"+Date.now().toString(36);await STU.putAudio(id,new Blob([buf],{type:file.type||"audio/mpeg"}));
    // no tags? read "Artist - Title" from the file name
    const base=file.name.replace(/\.[^.]+$/,"").replace(/_/g," ").trim(),fn=base.match(/^(.+?)\s+[-–]\s+(.+)$/);
    const song={id,t:tags.title||(fn?fn[2]:base).trim(),a:tags.artist||(fn?fn[1].trim():""),cover:tags.cover||null,...res,capo:pickCapo(res.chords,res.dur),
      sheet:"",T:0,times:null,offset:0,speed:.7,mode:"wait",click:false,plays:0,best:0,added:Date.now()};
    await STU.put(song);drawStudio();ding();
    const sh=[...new Set(song.chords.filter(c=>c.r>=0).map(c=>showName(c,song.capo)))].slice(0,6);
    say(`Got it. About ${song.bpm} bpm${song.capo?`, capo ${song.capo}`:""}. Main chords: ${sh.join(", ")}. Paste the lyrics and I'll sync them.`);
    clean();const card=$("scard");card.innerHTML="";card.append(h("div","stitle","Edit: "+song.t));const b=h("div","stack");card.append(b);mountStudioEdit(b,song)}
  catch(e){st.textContent="I couldn't read that file. Try an MP3 or M4A that plays in the Music app.";say("That file beat me. Try another one?");console.error(e)}}

/* ----- editor: details, capo, lyrics sync ----- */
function mountStudioEdit(el,song){
  const caps=[0,1,2,3,4,5,6,7];
  el.innerHTML=`<div class="sk-edhead">${coverHTML(song,"sk-art")}<div class="stack" style="gap:6px;min-width:0;flex:1">
      <label class="mute" for="sk-t">Song</label><input type="text" id="sk-t" value="${esc(song.t)}"><label class="mute" for="sk-a">Artist</label><input type="text" id="sk-a" value="${esc(song.a||"")}"></div></div>
    <div class="sk-sect"><h3>What I heard</h3>
      <div class="sk-facts"><span><b>${song.bpm}</b> bpm</span><span><b>${fmtT(song.dur)}</b> long</span><span><b>${new Set(song.chords.filter(c=>c.r>=0).map(chName)).size}</b> chords</span></div>
      <div class="sk-wave"><canvas></canvas></div>
      <label class="mute">Capo (I picked the one with the easiest shapes)</label>
      <div class="sk-caps">${caps.map(k=>`<button data-capo="${k}" aria-pressed="${k===song.capo}">${k?k:"None"}</button>`).join("")}</div>
      <div class="sk-shapes" data-shapes></div>
      <label class="mute">Beats per bar</label><div class="sk-caps sk-bpb">${[3,4].map(k=>`<button data-bpb="${k}" aria-pressed="${k===song.bpb}">${k}</button>`).join("")}</div></div>
    <div class="sk-sect"><h3>Lyrics + chords</h3>
      <p class="mute">Copy the chord sheet from Ultimate Guitar (chords above the words) and paste it here. I'll match its chords to the recording and time every word.</p>
      <textarea id="sk-sheet" spellcheck="false" autocapitalize="off" placeholder="[Verse 1]&#10;G          Em&#10;Words go here…"></textarea>
      <div class="row"><button class="big" data-sync>🔗 Sync to the recording</button></div><div class="mute" data-msg></div>
      <div data-prev hidden><div class="sk-lyrics sk-light" data-lyr></div>
        <div class="row sk-tools"><button class="ghost" data-pp>▶ Preview</button><button class="ghost" data-n="-0.1">◀ Earlier</button><button class="ghost" data-n="0.1">Later ▶</button><button class="ghost" data-tap>🎯 Tap sync</button></div>
        <p class="mute">Tap any line to hear it from there. If the words run ahead or behind, nudge them. If it's way off, use Tap sync and tap on every chord change.</p></div></div>
    <div class="row"><button class="big gold" data-save>Save & jam</button></div>
    <button class="ghost" data-del style="color:var(--hot)">Delete this song</button>`;
  const q=k=>el.querySelector(k),ta=q("#sk-sheet"),msg=q("[data-msg]"),prev=q("[data-prev]");ta.value=song.sheet||"";
  const audio=new Audio();audio.preservesPitch=audio.webkitPreservesPitch=true;audioURL(song).then(u=>audio.src=u).catch(()=>msg.textContent="The audio for this song is missing. Delete it and add the file again.");
  let ev=buildEvents(song).ev,draw,lv=null,raf=0;
  const drawShapes=()=>{const cs=[...new Map(song.chords.filter(c=>c.r>=0).map(c=>[showName(c,song.capo),playShape(c,song.capo)])).entries()];
    q("[data-shapes]").innerHTML=cs.map(([n,k])=>`<span class="chip${k&&known[k]?"":" miss"}">${esc(n)}</span>`).join("")+`<span class="mute">${cs.some(([,k])=>!k)?"Red = a chord you haven't learned yet. Try another capo.":""}</span>`};
  const redraw=()=>{ev=buildEvents(song).ev;draw=waveCanvas(q(".sk-wave canvas"),song,ev);draw(audio.currentTime||0);
    if(song.sheet&&song.times){prev.hidden=false;const {sh}=buildEvents(song);lv=lyricsView(q("[data-lyr]"),sh,ev,song.capo,t=>{audio.currentTime=Math.max(0,t-1);audio.play()})}else prev.hidden=true};
  requestAnimationFrame(redraw);drawShapes();
  el.querySelectorAll("[data-capo]").forEach(b=>b.onclick=()=>{song.capo=+b.dataset.capo;el.querySelectorAll("[data-capo]").forEach(x=>x.setAttribute("aria-pressed",x===b));drawShapes();redraw()});
  el.querySelectorAll("[data-bpb]").forEach(b=>b.onclick=()=>{song.bpb=+b.dataset.bpb;el.querySelectorAll("[data-bpb]").forEach(x=>x.setAttribute("aria-pressed",x===b))});
  q(".sk-wave").onclick=e=>{const r=e.currentTarget.getBoundingClientRect();audio.currentTime=(e.clientX-r.left)/r.width*song.dur;audio.play()};
  q("[data-sync]").onclick=async()=>{const txt=ta.value.trim();if(!txt){song.sheet="";song.times=null;redraw();msg.textContent="No lyrics. The jam shows chords only.";return}
    if(!song.bc){msg.textContent="Listening to the song again in more detail. This takes a few seconds…";
      try{const b=await (await STU.audio(song.id)).arrayBuffer(),a=await new Promise((res,rej)=>{const p=ctx().decodeAudioData(b,res,rej);if(p&&p.then)p.then(res,rej)}),r2=await analyzeAudio(a,()=>{});Object.assign(song,{beats:r2.beats,bpb:r2.bpb,phase:r2.phase,bc:r2.bc,bb:r2.bb});await STU.put(song)}catch(e){console.error(e)}}
    const r=alignSheet(song,txt);if(!r){msg.textContent="I can't find chords in that. Put the chord names on their own line above the words.";return}
    song.sheet=txt;song.T=r.T;song.times=r.times;song.offset=S("woff",0);redraw();const pct=Math.round(r.hits/r.total*100);
    msg.innerHTML=`Synced <b>${r.total}</b> chord changes. <b>${pct}%</b> matched what I heard in the recording.`+(pct<55?" That's low, so check the preview and use Tap sync if it drifts.":"");
    say(pct>=75?"Synced. Have a listen and check the words land.":"Done, but I'm not certain on all of it. Give the preview a listen.")};
  el.querySelectorAll("[data-n]").forEach(b=>b.onclick=()=>{song.offset=+((song.offset||0)+ +b.dataset.n).toFixed(2);W("woff",song.offset);redraw();toast(`Words ${song.offset>=0?"+":""}${song.offset.toFixed(1)}s`)});
  const pp=q("[data-pp]");pp.onclick=()=>audio.paused?audio.play():audio.pause();
  audio.onplay=()=>pp.textContent="⏸ Pause";audio.onpause=()=>pp.textContent="▶ Preview";
  let tapping=false;
  const tick=()=>{raf=requestAnimationFrame(tick);if(audio.paused&&!tapping)return;const t=audio.currentTime;draw&&draw(t);lv&&lv(evAt(ev,t),t)};tick();
  // tap sync: play (slowed) from just before the chosen chord and tap on every change after it
  q("[data-tap]").onclick=()=>{if(tapping)return;const {sh}=buildEvents(song),tok=sheetTokens(sh);let k=Math.max(0,evAt(ev,audio.currentTime));
    const pane=h("div","sk-tap",`<div class="mute">Tap sync · ${audio.paused?"starting":"from here"}</div><div class="sk-tapnow"></div><button class="sk-tapbtn">TAP<br><small>on each chord change</small></button><div class="row"><button class="ghost" data-u>Undo</button><button class="ghost" data-x>Done</button></div>`);
    el.prepend(pane);pane.scrollIntoView({behavior:"smooth"});tapping=true;audio.playbackRate=.8;audio.currentTime=Math.max(0,(song.times[k]||0)+(song.offset||0)-2);audio.play();
    const show=()=>{const e=ev[k];pane.querySelector(".sk-tapnow").innerHTML=e?`Next: <b>${esc(showName(e.c,song.capo))}</b> ${e.li!=null?`<span>“${esc(sh.lines[e.li].segs[e.si].t.trim()).slice(0,40)}”</span>`:""}`:"That's every chord. Tap Done."};show();
    const tap=()=>{if(k>=tok.length)return;const nt=+(audio.currentTime-.12*audio.playbackRate-(song.offset||0)).toFixed(3),d=nt-song.times[k];song.times[k]=nt;for(let i=k+1;i<song.times.length;i++)song.times[i]=+(song.times[i]+d).toFixed(3);k++;ev=buildEvents(song).ev;show()};
    const key=e=>{if(e.code==="Space"||e.code==="Enter"){e.preventDefault();tap()}};document.addEventListener("keydown",key);
    pane.querySelector(".sk-tapbtn").onpointerdown=e=>{e.preventDefault();tap()};
    pane.querySelector("[data-u]").onclick=()=>{if(k>0){k--;show();audio.currentTime=Math.max(0,song.times[k]+(song.offset||0)-2)}};
    const stop=()=>{tapping=false;audio.pause();audio.playbackRate=1;document.removeEventListener("keydown",key);pane.remove();redraw();toast("Timing saved")};
    pane.querySelector("[data-x]").onclick=stop;cleanup.push(()=>document.removeEventListener("keydown",key))};
  q("[data-save]").onclick=async()=>{song.t=q("#sk-t").value.trim()||song.t;song.a=q("#sk-a").value.trim();if(ta.value.trim()&&ta.value.trim()!==song.sheet)q("[data-sync]").click();
    await STU.put(song);drawStudio();clean();const card=$("scard");card.innerHTML="";card.append(h("div","stitle",song.t));const b=h("div","stack");card.append(b);mountStudioJam(b,song)};
  let delArm=false;q("[data-del]").onclick=async e=>{if(!delArm){delArm=true;e.target.textContent="Tap again to delete it for good";setTimeout(()=>{delArm=false;e.target.textContent="Delete this song"},3000);return}
    await STU.del(song.id);await STU.delAudio(song.id);drawStudio();closeSheet();toast("Song deleted")};
  cleanup.push(()=>{cancelAnimationFrame(raf);audio.pause();audio.removeAttribute("src")});
}

/* ----- jam with the real recording ----- */
function mountStudioJam(el,song){
  const {sh,ev}=buildEvents(song),bp=60/song.bpm,beatEv=song.beats.map(b=>({t:b}));
  let mode=song.mode||"wait",speed=[.5,.6,.7,.8,.9,1].includes(song.speed)?song.speed:.7,micOn=false,off=null,raf=0,waiting=null,waitT=0,hits=0,waited=new Set(),waits=[],loop=null,lastBeat=-1,started=false,heardT=0;
  // capo on: listen for the shapes a fret up. Capo off: listen for them as played. Bruv also hears either way and flips the switch himself
  let capoOn=!!song.capo&&!song.noCapo;const shift=()=>capoOn?song.capo:0;
  el.innerHTML=`<div class="sk-stage">
    <header class="sk-head">
      ${coverHTML(song,"sk-art sm")}<div class="sk-ti"><b>${esc(song.t)}</b><span>${esc(song.a||"Your song")}</span></div>
      <div class="sk-ctrls">
        ${song.capo?`<button class="sk-capo" data-capo title="Switch if you're playing without a capo"></button>`:""}
        <div class="sk-sync" title="Move the words earlier or later ([ and ] keys)"><span class="sk-synclbl">Words</span><button data-off="-0.1" aria-label="Words earlier">−</button><b data-offv></b><button data-off="0.1" aria-label="Words later">+</button></div>
        <div class="seg sk-mode"><button data-m="wait" title="W">Wait for me</button><button data-m="go" title="W">Keep going</button></div>
        <div class="sk-speeds" title="↑ ↓">${[.5,.6,.7,.8,.9,1].map(s=>`<button data-sp="${s}">${Math.round(s*100)}%</button>`).join("")}</div>
      </div>
    </header>
    <div class="sk-main">
      <section class="sk-left">
        <div class="sk-panel sk-now"><div class="sk-ch"><span class="sk-lbl">Now</span><div class="sk-chord" data-c>…</div></div><div class="sk-dia" data-d></div></div>
        <div class="sk-panel sk-next"><span class="sk-lbl">Next</span><b data-nx></b><div class="sk-dots" data-dots></div></div>
        <div class="sk-panel sk-strum"><div class="sk-strumhd"><span class="sk-lbl">Strum</span><select data-pat aria-label="Strum pattern">${Object.entries(PATTERNS).map(([k,p])=>`<option value="${k}">${p.name}</option>`).join("")}</select></div><div class="sk-lane" data-lane></div></div>
        <div class="sk-wait" data-wait hidden></div>
        <div class="sk-panel sk-status"><img src="bruv/talk_1.png" alt=""><div class="sk-statxt"><p data-say></p><div class="sk-ear" data-earbox hidden><span class="dot"></span><span data-ear></span><b data-heard></b></div></div></div>
        <div class="best sk-res" data-res hidden></div>
      </section>
      ${sh?`<div class="sk-lyrics" data-lyr></div>`:`<div class="sk-chips" data-lyr></div>`}
    </div>
    <footer class="sk-foot">
      <div class="sk-transport"><button data-a="rs" aria-label="Back to start" title="Back to start (R)">${IC.start}</button><button data-a="bk" aria-label="Back 5 seconds" title="Back 5 seconds (←)">${IC.back}</button><button class="sk-pp" data-a="pp" aria-label="Play" title="Play / pause (Space)">${IC.play}</button><button data-a="lp" aria-label="Loop this line" title="Loop this line (L)">${IC.loop}</button><button data-a="ck" aria-label="Click track" title="Click track (C)">${IC.click}</button></div>
      <span class="sk-tm" data-t>0:00</span><div class="sk-wave dark"><canvas></canvas></div><span class="sk-tm">${fmtT(song.dur)}</span>
    </footer>
  </div>`;
  const outLat=()=>{try{return Math.min(.5,Math.max(0,(ac&&ac.outputLatency)||0))}catch{return 0}};
  const q=k=>el.querySelector(k),stage=q(".sk-stage"),audio=new Audio(),et=q("[data-ear]"),ear=q("[data-earbox]"),heard=q("[data-heard]"),pp=q('[data-a="pp"]'),sayEl=q("[data-say]");
  // Bruv's lines show inside the stage (the sheet's own bubble is hidden while jamming)
  const mo=new MutationObserver(()=>sayEl.textContent=$("ssbub").textContent);mo.observe($("ssbub"),{childList:true,characterData:true,subtree:true});
  audio.preservesPitch=audio.webkitPreservesPitch=true;audio.playbackRate=speed;
  // Safari only lets audio start inside a tap. Play it silently for an instant now (we're inside the tap that opened the jam)
  // so strumming to start and Wait mode's pause/resume can drive it hands-free later
  const prime=()=>{audio.muted=true;const p=audio.play();if(p)p.then(()=>{audio.pause();audio.currentTime=0;audio.muted=false}).catch(()=>{audio.muted=false})};
  if(urls[song.id]){audio.src=urls[song.id];prime()}
  else audioURL(song).then(u=>{audio.src=u;audio.playbackRate=speed}).catch(()=>say("The audio for this song is missing. Edit it, delete it and add the file again."));
  artColor(song).then(c=>stage.style.setProperty("--art",c||hashArt(song.t)));
  busy=true;
  const drawCapo=()=>{const b=q("[data-capo]");if(!b)return;b.setAttribute("aria-pressed",capoOn);b.innerHTML=capoOn?`<b>Capo ${song.capo}</b><span>on</span>`:`<b>No capo</b><span>off</span>`};
  const setCapo=(on,why)=>{capoOn=on;song.noCapo=!on;STU.put(song);drawCapo();if(why)toast(why)};
  if(q("[data-capo]"))q("[data-capo]").onclick=()=>setCapo(!capoOn,capoOn?"No capo: I'll listen for the shapes as you play them":`Capo on fret ${song.capo}`);
  // hears the shape with whichever capo you're using, and notices if you're not using the one the switch says
  const hearsShape=c=>{if(!c)return false;const a=shift(),b=song.capo&&a?0:song.capo||0;capoShift=a;if(hears(c)){capoShift=0;return true}
    if(song.capo){capoShift=b;if(hears(c)){capoShift=0;setCapo(!capoOn,capoOn?"Sounds like no capo. I'll listen for that.":`Sounds like you've got the capo on fret ${song.capo}.`);return true}}capoShift=0;return false};
  const lv=sh?lyricsView(q("[data-lyr]"),sh,ev,song.capo,seek):chipsView(q("[data-lyr]"),ev,song.capo,seek);
  const draw=waveCanvas(q(".sk-wave canvas"),song,ev);
  q(".sk-wave").onclick=e=>{const r=e.currentTarget.getBoundingClientRect();seek((e.clientX-r.left)/r.width*song.dur)};
  function seek(t){audio.currentTime=Math.max(0,Math.min(song.dur-.1,t));waiting=null;q("[data-wait]").hidden=true;stage.classList.remove("waiting");waited=new Set(ev.filter(e=>e.t<audio.currentTime+.05).map(e=>e.i));if(loop)setLoop(false);render(true)}
  const drawMode=()=>{el.querySelectorAll("[data-m]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.m===mode));el.querySelectorAll("[data-sp]").forEach(b=>b.setAttribute("aria-pressed",+b.dataset.sp===speed));q('[data-a="ck"]').setAttribute("aria-pressed",!!song.click)};
  el.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{mode=b.dataset.m;song.mode=mode;STU.put(song);if(mode==="go"&&waiting)resume(false);drawMode();
    say(mode==="wait"?(micOn?"Wait mode. I'll pause before every change until I hear your new chord.":"Wait mode needs the mic. Allow it and I'll pause for your changes."):"Keep going. The song won't stop for you.")});
  el.querySelectorAll("[data-sp]").forEach(b=>b.onclick=()=>{speed=+b.dataset.sp;audio.playbackRate=speed;song.speed=speed;STU.put(song);drawMode()});
  const play=()=>{ctx();audio.play().catch(()=>{});started=true},pause=()=>audio.pause();
  pp.onclick=()=>{if(waiting){resume(false);return}audio.paused?play():pause()};
  audio.onplay=()=>{if(audio.muted)return;pp.innerHTML=IC.pause;pp.setAttribute("aria-label","Pause");stage.classList.add("live")};
  audio.onpause=()=>{if(!waiting){pp.innerHTML=IC.play;pp.setAttribute("aria-label","Play");stage.classList.remove("live")}};
  q('[data-a="rs"]').onclick=()=>seek(0);q('[data-a="bk"]').onclick=()=>seek(audio.currentTime-5);
  q('[data-a="ck"]').onclick=()=>{song.click=!song.click;STU.put(song);drawMode()};
  const lineSpan=()=>{const k=Math.max(0,evAt(ev,audio.currentTime)),e=ev[k];if(!e)return null;
    if(e.li==null){const a=ev[k].t,b=ev[Math.min(ev.length-1,k+2)].t;return[a-.3,b>a?b:a+bp*4]}
    const ln=ev.filter(x=>x.li===e.li),nx=ev.find(x=>x.li>e.li);return[ln[0].t-.4,nx?nx.t-.05:song.dur]};
  function setLoop(on){loop=on?lineSpan():null;q('[data-a="lp"]').setAttribute("aria-pressed",!!loop);if(loop){toast("Looping this line");audio.currentTime=loop[0];waited=new Set(ev.filter(e=>e.t<loop[0]).map(e=>e.i))}}
  q('[data-a="lp"]').onclick=()=>setLoop(!loop);
  let shown=-2,pat=PATTERNS[song.pat]?song.pat:song.bpb===3?"waltz2":"folk",laneK=-2;
  const lane=q("[data-lane]"),drawLane=()=>{const P=PATTERNS[pat];lane.style.gridTemplateColumns=`repeat(${P.slots.length},1fr)`;lane.innerHTML=strumCells(P);laneK=-2};
  q("[data-pat]").value=pat;q("[data-pat]").onchange=e=>{pat=e.target.value;song.pat=pat;STU.put(song);drawLane()};drawLane();
  const strumSlot=t=>{const B=song.beats,bi=evAt(beatEv,t);if(bi<0||audio.paused&&!waiting)return-1;const bpb=song.bpb||4,j=bi-(((bi-(song.phase||0))%bpb)+bpb)%bpb;if(j<0)return-1;
    const t0=B[j],t1=B[j+bpb]??t0+bpb*bp,n=PATTERNS[pat].slots.length;return Math.min(n-1,Math.max(0,Math.floor((t-t0)/(t1-t0)*n)))};
  const nowT=()=>Math.max(0,audio.currentTime-outLat());
  function render(force){const t=nowT(),k=evAt(ev,t),beatIx=evAt(beatEv,t);q("[data-t]").textContent=fmtT(t);draw(t);lv(k,t);
    const sk=strumSlot(t);if(sk!==laneK){laneK=sk;[...lane.children].forEach((c,j)=>c.classList.toggle("on",j===sk))}
    if(k!==shown||force){shown=k;const cur=k>=0?ev[k]:null,nx=ev[k+1],cs=cur?playShape(cur.c,song.capo):null,C=q("[data-c]");
      C.textContent=cur?showName(cur.c,song.capo):"Intro";C.classList.toggle("long",C.textContent.length>3);C.classList.toggle("unk",!!cur&&!cs);
      q("[data-d]").innerHTML=cs?dia(cs):cur?`<div class="sk-nodia">Not in your chords yet</div>`:dia(playShape(ev[0].c,song.capo)||"open");
      q("[data-nx]").textContent=nx?showName(nx.c,song.capo):"End";C.classList.remove("pop");void C.offsetWidth;C.classList.add("pop")}
    const nx=ev[k+1];if(nx){const left=song.beats.filter(b=>b>t&&b<=nx.t+.02).length;q("[data-dots]").innerHTML=Array.from({length:Math.min(8,Math.max(left,0))},(_,i)=>`<i class="${i===0&&left<=4?"soon":""}"></i>`).join("")}else q("[data-dots]").innerHTML="";
    if(beatIx!==lastBeat){lastBeat=beatIx;if(!audio.paused&&beatIx>=0){const down=(beatIx-song.phase)%song.bpb===0;stage.classList.remove("beat","down");void stage.offsetWidth;stage.classList.add("beat");if(down)stage.classList.add("down");
      if(song.click)tick2(down);if(navigator.vibrate)navigator.vibrate(down?18:8)}}}
  let lastT=0;
  function frame(){raf=requestAnimationFrame(frame);if(!audio.src)return;const t=nowT();if(t<lastT-.5)lastT=t;
    if(loop&&t>=loop[1]){audio.currentTime=loop[0];waited=new Set(ev.filter(e=>e.t<loop[0]).map(e=>e.i))}
    // every change crossed since the last frame counts, even if the browser dropped frames
    if(mode==="wait"&&micOn&&!audio.paused&&!waiting){let k=evAt(ev,lastT)+1;while(k<ev.length&&ev[k].t<=t+.06&&(k===0||waited.has(ev[k].i)))k++;const e=ev[k];
      if(e&&k>0&&e.t<=t+.06){const prevS=playShape(ev[k-1].c,song.capo),s=playShape(e.c,song.capo);
        if(s&&s!==prevS){pause();if(t>e.t)audio.currentTime=Math.max(0,e.t-.05);waiting=e;waitT=performance.now();hits=0;stage.classList.add("waiting");const w=q("[data-wait]");w.hidden=false;w.innerHTML=`<span>Switch to</span><b>${esc(showName(e.c,song.capo))}</b><span>I'll wait. Strum it when you're there.</span>`;et.textContent=`Listening for ${showName(e.c,song.capo)}`;say(`${showName(e.c,song.capo)}. I'll wait.`)}
        else waited.add(e.i)}}
    render(false);lastT=waiting?waiting.t-.01:nowT()}
  function resume(byEar){if(!waiting)return;waited.add(waiting.i);if(byEar)waits.push((performance.now()-waitT)/1000);waiting=null;stage.classList.remove("waiting");q("[data-wait]").hidden=true;et.textContent="Listening";play()}
  // what Bruv thinks you're playing right now, so you can see when he's not picking you up
  const known_=()=>Object.keys(CH).filter(c=>c!=="open");
  function showHeard(){const now=performance.now();if(now-heardT<180)return;heardT=now;if(level()<.006){heard.textContent="";return}
    capoShift=shift();const ch=chroma();capoShift=0;if(!ch){heard.textContent="";return}const b=bestChord(ch,known_());heard.textContent=b.s>.35?"Hearing "+label(b.c):"Hearing something…"}
  function loopEar(){showHeard();
    if(waiting){if(performance.now()-waitT<250)return;if(hearsShape(playShape(waiting.c,song.capo))){if(++hits>3){say(rnd(["Yes!","There it is.","Clean.","Lovely.","Get in."]));resume(true)}}else hits=Math.max(0,hits-1);return}
    if(!started&&audio.paused&&mode==="wait"&&audio.src){const first=playShape(ev[0]?.c||{r:-1},song.capo);if(first&&hearsShape(first)){if(++hits>4){hits=0;waited.add(ev[0].i);play();say("Here we go.")}}else hits=Math.max(0,hits-1)}}
  audio.onended=()=>{if(loop){audio.currentTime=loop[0];play();return}stage.classList.remove("live");ding();started=false;
    const avg=waits.length?waits.reduce((a,b)=>a+b,0)/waits.length:null;song.plays=(song.plays||0)+1;song.best=Math.max(song.best||0,speed);song.last=Date.now();STU.put(song);drawStudio();
    if(avg!=null)logRace(avg);counters.songs=(counters.songs||0)+1;addXp(speed>=1?8:5);
    q("[data-res]").hidden=false;q("[data-res]").innerHTML=[["Speed",Math.round(speed*100)+"%"],...(avg!=null?[["Changes waited for",waits.length],["Average change",avg.toFixed(1)+"s"]]:[]),["Times played",song.plays]].map(([a,b])=>`<span>${a}</span><b>${b}</b>`).join("");
    say(speed>=1?"Full speed, start to finish. You can play this song.":avg!=null&&avg<1.2?`Smooth. Try ${Math.round(Math.min(1,speed+.1)*100)}% next.`:"Whole song done. Again, and the changes get quicker.")};
  const drawOff=()=>{const o=song.offset||0;q("[data-offv]").textContent=(o>0?"+":o<0?"−":"")+Math.abs(o).toFixed(1)+"s"};
  const nudge=d=>{song.offset=+((song.offset||0)+d).toFixed(2);ev.forEach(e=>e.t=+(e.t+d).toFixed(3));lv.shift&&lv.shift(d);W("woff",song.offset);STU.put(song);drawOff();shown=-2;render(true);toast(d<0?`Words earlier (${q("[data-offv]").textContent})`:`Words later (${q("[data-offv]").textContent})`)};
  el.querySelectorAll("[data-off]").forEach(b=>b.onclick=()=>nudge(+b.dataset.off));
  drawOff();drawCapo();drawMode();render(true);frame();
  (async()=>{micOn=await ears();if(!el.isConnected)return;if(micOn){ear.hidden=false;ear.classList.add("live");et.textContent="Listening";off=listen(loopEar)}drawMode()})();
  say((song.capo?(capoOn?`Capo on fret ${song.capo}, or switch it off up top if you don't have one. `:"No capo. Fine by me. "):"")+(mode==="wait"?`Strum ${showName(ev[0]?.c||{r:-1},song.capo)} to start.`:"Hit play when ready."));
  const SP=[.5,.6,.7,.8,.9,1];
  const keys=e=>{if(e.metaKey||e.ctrlKey||e.altKey||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;const k=e.key;
    const press=b=>{e.preventDefault();b.click()};
    if(k===" ")press(pp);else if(k==="ArrowLeft"){e.preventDefault();seek(audio.currentTime-5)}else if(k==="ArrowRight"){e.preventDefault();seek(audio.currentTime+5)}
    else if(k==="ArrowUp"||k==="ArrowDown"){e.preventDefault();const i=Math.max(0,Math.min(SP.length-1,SP.indexOf(speed)+(k==="ArrowUp"?1:-1)));el.querySelector(`[data-sp="${SP[i]}"]`).click();toast(`Speed ${Math.round(SP[i]*100)}%`)}
    else if(k==="l"||k==="L")press(q('[data-a="lp"]'));else if(k==="c"||k==="C")press(q('[data-a="ck"]'));else if(k==="r"||k==="R")press(q('[data-a="rs"]'));
    else if(k==="w"||k==="W"){e.preventDefault();el.querySelector(`[data-m="${mode==="wait"?"go":"wait"}"]`).click()}
    else if(k==="["||k==="]"){e.preventDefault();nudge(k==="["?-.1:.1)}};
  document.addEventListener("keydown",keys);
  cleanup.push(()=>{cancelAnimationFrame(raf);audio.pause();audio.removeAttribute("src");off&&off();mo.disconnect();capoShift=0;busy=false;document.removeEventListener("keydown",keys)});
}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("sheet").hidden&&!/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))closeSheet()});
drawStudio();
