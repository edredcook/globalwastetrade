// Trends page: time series for plastic waste and for wastes that carry plastic.
// Reads data/flows.json (HS 3915) or data/flows_<stream>.json: every route, every
// year, per view. Exporters' and importers' reports are filtered and drawn
// separately and never added together.
(async function(){
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
// Material menu, named as in the explorer's Material card. One entry per group:
// [heading, [[key, name, HS codes], ...], parent heading]. STREAMS follows from it.
const OEP="Other and embedded plastics";
const MATS=[
  ["Plastics",[["all","All plastic",""],["plastic","Plastic scrap","HS 3915"]]],
  ["Textiles",[["clothing","Used clothing (plastic fraction)","HS 6309"],["rags","Rags, twine and rope (plastic fraction)","HS 6310"],["fibre","Synthetic fibres","HS 5505.10"]],OEP],
  ["E-waste",[["weee","Electronic waste (plastic fraction)","HS 8549.31, 8549.39"],["weeeo","Electrical waste (plastic fraction)","HS 8549.91, 8549.99"]],OEP],
  ["Refuse-derived fuel",[["rdf","Refuse-derived fuel (plastic fraction)","HS 3825.10"]],OEP],
  ["Rubber and tyres",[["tyres","Used tyres","HS 4012.20"],["rubber","Rubber waste and scrap","HS 4004"],["hardrubber","Hard rubber","HS 4017"]],OEP],
  ["Paper and card",[["paper","Paper and card (plastic contamination)","HS 4707"]],OEP],
  ["Paper and card grades",[["pkraft","Kraft and corrugated","HS 4707.10"],["pbleach","Bleached paper and board","HS 4707.20"],["pmech","Newspapers and magazines","HS 4707.30"],["pmixed","Mixed and unsorted","HS 4707.90"]]],
  ["Metals",[["fe","Iron and steel","HS 7204, not 7204.21"],["ss","Stainless steel","HS 7204.21"],["al","Aluminium","HS 7602"],["cu","Copper","HS 7404"],["pb","Lead","HS 7802"],["zn","Zinc","HS 7902"],["ni","Nickel","HS 7503"],["sn","Tin","HS 8002"],["pm","Precious metals","HS 7112.91 to 7112.99"],["om","Other metals","HS 81 waste and scrap"]]],
  ["Other textiles",[["tartif","Artificial fibres","HS 5505.20"],["tcotton","Cotton","HS 5202"],["twool","Wool and animal hair","HS 5103, 5104"],["tsilk","Silk and flax","HS 5003, 5301.30"]]],
  ["Other e-waste",[["ebatt","Batteries","HS 8549.11 to 8549.19, 8548.10"],["eprec","Scrap for precious-metal recovery","HS 8549.21, 8549.29"]]]];
const MATN=Object.fromEntries(MATS.flatMap(g=>g[1].map(([k,n])=>[k,n])));
const MATC=Object.fromEntries(MATS.flatMap(g=>g[1].map(([k,,c])=>[k,c])));
const STREAMS=MATS.flatMap(g=>g[1].map(i=>i[0])).filter(k=>k!=="all");
// Plastic shares, as in the explorer's Plastics group (sources on the About page).
const SHARE={plastic:1,clothing:.65,rags:.65,fibre:1,weee:.247,weeeo:.247,rdf:.3325,tyres:1,rubber:1,hardrubber:1,paper:.02};
// Streams of the other material groups carry no plastic share here; "All plastic" leaves them out.
const PSTREAMS=STREAMS.filter(k=>SHARE[k]);
const MATCOL={pkraft:"#9c755f",pbleach:"#edc948",pmech:"#c9b27a",pmixed:"#bab0ac",fe:"#4e79a7",ss:"#a0cbe8",al:"#86bcb6",cu:"#d37295",pb:"#5f5f5f",zn:"#76b7b2",ni:"#59a14f",sn:"#8cd17d",pm:"#f1ce63",om:"#b6992d",tartif:"#d4a6c8",tcotton:"#499894",twool:"#a47764",tsilk:"#f28e2b",ebatt:"#9d7660",eprec:"#d7b5a6",plastic:"#e0531f",clothing:"#4e79a7",rags:"#76b7b2",fibre:"#b07aa1",weee:"#59a14f",weeeo:"#8cd17d",rdf:"#9c755f",tyres:"#3d3d3d",rubber:"#8a8a8a",hardrubber:"#5f5f5f",paper:"#edc948"};
const GL=["H","U","M","L","N"],GKEY={HIC:"H",UMC:"U",LMC:"M",LIC:"L",NS:"N"};
const GC={H:"--g-hic",U:"--g-umc",M:"--g-lmc",L:"--g-lic",N:"--g-ns"};
const GN={H:"High income",U:"Upper-middle income",M:"Lower-middle income",L:"Low income",N:"Not classified"};
const SCHEMES={un:"UN regions",unsub:"UN sub-regions",wb:"World Bank regions",oecd2:"OECD members / non-OECD",oecd:"OECD regions"};
const REGPAL=["#4e79a7","#f28e2b","#59a14f","#e15759","#76b7b2","#edc948","#b07aa1","#ff9da7","#9c755f","#8cd17d","#499894","#d37295","#a0cbe8","#bab0ac","#86bcb6","#f1ce63"];
const VN=["exporters' reports","importers' reports"];
const TOPS=[0,100,50,30,20,10,5,3,1];
const SHOWS=[12,24,48,96,200,0];
const MINS=[0,100,1e3,1e4,1e5,1e6,1e7];
const NONC=/nes$|^Areas|^Special Categories|^Free Zones|^Bunkers/;

// ---------- state ----------
const q=new URLSearchParams(location.search);
const toks=s=>(s||"").split(",").filter(t=>/^(c|g|r):/.test(t));
const pick=(v,ok,d)=>ok.includes(v)?v:d;
const DEF={imp:"1",count:"plastic",v:0,m:"t",sch:"wb",xr:false,xi:false,xh:false,xo:false,ts:0,tr:0,from:[],to:[],split:"rg",bmode:"t",hdir:"in",hrows:20,gdir:"out",gsort:"total",gshow:1,gmin:0,gscale:"own",cdir:"in",cgrp:"c",csort:"b",cn:12,cchart:"dumb",cscale:"lin"};
const S={...DEF,
  mats:(()=>{const w=(q.get("w")||"plastic").split(","),m=["all",...STREAMS].filter(k=>w.includes(k));return m.includes("all")?["all"]:m.length?m:["plastic"]})(),
  count:q.get("count")==="whole"?"whole":"plastic", imp:q.get("imp")==="0"?"0":"1",
  v:q.get("v")==="1"?1:0, m:pick(q.get("m"),["t","usd"],"t"), sch:pick(q.get("sch"),Object.keys(SCHEMES),"wb"),
  xr:q.get("xr")==="1", xi:q.get("xi")==="1", xh:q.get("xh")==="1", xo:q.get("xo")==="1",
  ts:Math.max(0,TOPS.indexOf(+q.get("ts"))), tr:Math.max(0,TOPS.indexOf(+q.get("tr"))),
  from:toks(q.get("from")), to:toks(q.get("to")),
  tab:pick(q.get("tab"),["overview","glance","compare"],"overview"),
  y0:+q.get("y0")||0, y1:+q.get("y1")||0, ya:+q.get("ya")||0, yb:+q.get("yb")||0,
  split:pick(q.get("split"),["rg","sg","rr","sr","mt"],"rg"), cgrp:pick(q.get("cgrp"),["c","r","g"],"c"), cdir:pick(q.get("cdir"),["in","out"],"in"), gdir:pick(q.get("gdir"),["in","out"],"out")};

// ---------- helpers ----------
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const dark=()=>{const t=document.documentElement.dataset.theme;return t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches};
const fTn=v=>v>=1e6?(v/1e6).toFixed(2)+" Mt":v>=1e3?d3.format(",.0f")(v/1e3)+" kt":d3.format(",.0f")(v)+" t";
const fUs=v=>v>=1e9?"US$"+(v/1e9).toFixed(2)+" bn":v>=1e6?"US$"+d3.format(",.1f")(v/1e6)+" m":v>=1e3?"US$"+d3.format(",.0f")(v/1e3)+" k":"US$"+d3.format(",.0f")(v);
const fV=v=>S.m==="usd"?fUs(v):fTn(v);
const fAx=v=>S.m==="usd"?(v>=1e9?d3.format("~g")(v/1e9)+" bn":v>=1e6?d3.format("~g")(v/1e6)+" m":v>=1e3?d3.format("~g")(v/1e3)+" k":d3.format("~g")(v)):(v>=1e6?d3.format("~g")(v/1e6)+" Mt":v>=1e3?d3.format("~g")(v/1e3)+" kt":d3.format("~g")(v)+" t");
const pct=d3.format("+.0%");
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tip=$("#tip");
const showTip=(e,h)=>{tip.innerHTML=h;tip.hidden=false;let x=e.clientX+14,y=e.clientY+14;if(x>innerWidth-270)x=e.clientX-270;if(y>innerHeight-130)y=e.clientY-120;tip.style.left=x+"px";tip.style.top=y+"px"};
const hideTip=()=>tip.hidden=true;
const sent=()=>S.v?"received":"sent";
// Explorer names count the plastic share; with "Whole material" the bracket is dropped.
const nm=k=>S.count==="whole"&&!S.mats.includes("all")?MATN[k].replace(/ \(plastic (fraction|contamination)\)$/,""):MATN[k];
const nmShare=k=>SHARE[k]<1&&MATN[k].endsWith(")")&&(S.mats.includes("all")||S.count==="plastic")?MATN[k].replace(/\)$/,`, ${d3.format(".4~p")(SHARE[k])})`):nm(k);

// ---------- data ----------
// Each material file has its own country list; all are mapped onto one shared index.
let OECD={};
const D={codes:[],idx:new Map(),names:[],inc:[],regions:{},years:null,mats:{},nc:0,span:[0,0],modelled:[]};
async function load(k){if(D.mats[k])return;const r=await fetch(k==="plastic"?"data/flows.json":`data/flows_${k}.json`,{cache:"no-cache"});if(!r.ok)throw new Error(r.status);const d=await r.json();
  if(!D.years){D.years=d.years;D.modelled=d.modelled||[]}
  const map=d.codes.map((c,j)=>{let g=D.idx.get(c);if(g==null){g=D.codes.length;D.codes.push(c);D.idx.set(c,g);D.names.push(d.names[j]);D.inc.push(d.inc[j]);for(const sch in d.regions)(D.regions[sch]||(D.regions[sch]=[]))[g]=d.regions[sch][j]}return g});
  const remap=fl=>[0,1].map(v=>fl[String(v)].map(a=>{const o=Float64Array.from(a);for(let p=0;p<o.length;p+=4){o[p]=map[o[p]];o[p+1]=map[o[p+1]]}return o}));
  const F=remap(d.flows),FI=d.imputed?remap(d.imputed):[0,1].map(()=>d.years.map(()=>new Float64Array(0)));
  D.mats[k]={F,FI};
  D.nc=D.codes.length;D.nm=D.names.map(n=>n[1]);D.real=D.nm.map(n=>!NONC.test(n));D.incY=D.years.map((y,i)=>D.inc.map(s=>s[i]));
  const o=D.regions.oecd||[];D.regions.oecd2=D.codes.map((c,j)=>o[j]?(o[j].startsWith("OECD")?"OECD members":"Non-OECD"):"")}
// Selected materials as [key, weight]: "all" = every stream at its plastic share.
const matList=()=>S.mats.includes("all")?PSTREAMS.map(k=>[k,SHARE[k]]):S.mats.map(k=>[k,S.count==="plastic"&&SHARE[k]!=null?SHARE[k]:1]);
function setSpan(){const ml=matList(),has=D.years.map((y,i)=>ml.some(([k])=>D.mats[k].F[0][i].length+D.mats[k].F[1][i].length>0));
  const a=has.indexOf(true),b=has.lastIndexOf(true);D.span=a<0?[0,D.years.length-1]:[a,b]}
let I0=0,I1=0,Y=[],N=0,LAST=0;
const sl=a=>Array.from(a.slice(I0,I1+1));
const name=j=>D.nm[j];
const regCol=nm=>{if(!nm||nm==="Other")return css("--g-ns");const all=[...new Set(D.regions[S.sch])].filter(Boolean).sort();return REGPAL[Math.max(0,all.indexOf(nm))%REGPAL.length]};
const events=()=>S.mats.some(k=>k==="plastic"||k==="all")?[[2018,"China ban"],[2021,"Basel amendments"]]:[[2018,"China ban"]];

// OECD members in year i (by accession year).
const oecdMask=i=>{const y=D.years[i],m=new Uint8Array(D.nc);for(let j=0;j<D.nc;j++){const a=OECD[D.codes[j]];if(a!=null&&a<=y)m[j]=1}return m};
// Token → member mask for year i.
function mask(tokens,i){if(!tokens.length)return null;const m=new Uint8Array(D.nc);
  for(const t of tokens){const k=t[0];
    if(k==="c"){const j=D.idx.get(t.slice(2));if(j!=null)m[j]=1}
    else if(k==="g"){const g=t.slice(2),inc=D.incY[i];for(let j=0;j<D.nc;j++)if(inc[j]===g)m[j]=1}
    else{const p=t.indexOf(":",2),sch=t.slice(2,p),nm=t.slice(p+1),R=D.regions[sch];if(R)for(let j=0;j<D.nc;j++)if(R[j]===nm)m[j]=1}}
  return m}

// One pass over the routes of view v with every filter applied.
function agg(v,lim){const NY=D.years.length,nc=D.nc,R=D.regions[S.sch],usd=S.m==="usd",sk=S.split;
  const tot=new Float64Array(NY),ti=new Float64Array(NY),out=new Float64Array(nc*NY),inn=new Float64Array(nc*NY),hl=new Float64Array(NY),hAll=new Float64Array(NY),split=new Map();
  const ml=matList();
  for(let i=I0;i<=I1;i++){const fm=mask(S.from,i),tm=mask(S.to,i),inc=D.incY[i],oe=S.xo?oecdMask(i):null;
   for(const [mk,w] of ml)for(const im of S.imp==="1"?[0,1]:[0]){const a=D.mats[mk][im?"FI":"F"][v][i];
    for(let p=0;p<a.length;p+=4){const e=a[p],r=a[p+1];
      if(fm&&!fm[e]||tm&&!tm[r])continue;
      if(lim&&(lim.ex&&!lim.ex[e]||lim.rc&&!lim.rc[r]))continue;
      if(S.xr&&R[e]&&R[e]===R[r])continue;
      if(S.xi&&inc[e]===inc[r])continue;
      if(S.xh&&inc[e]==="H"&&(inc[r]==="U"||inc[r]==="M"||inc[r]==="L"))continue;
      if(oe&&oe[e]&&!oe[r])continue;
      const val=(usd?a[p+3]*1000:a[p+2])*w;if(!val)continue;
      tot[i]+=val;if(im)ti[i]+=val;out[e*NY+i]+=val;inn[r*NY+i]+=val;
      if(inc[e]==="H"){hAll[i]+=val;if(inc[r]==="U"||inc[r]==="M"||inc[r]==="L")hl[i]+=val}
      const key=sk==="mt"?mk:sk==="rg"?inc[r]:sk==="sg"?inc[e]:sk==="rr"?(R[r]||"Other"):(R[e]||"Other");
      let s=split.get(key);if(!s){s=new Float64Array(NY);split.set(key,s)}s[i]+=val}}}
  return {tot,ti,out,inn,hl,hAll,split}}
const series=(arr,j)=>{const NY=D.years.length;return Array.from(arr.slice(j*NY+I0,j*NY+I1+1))};
function limits(){if(!S.ts&&!S.tr)return null;const base=agg(S.v,null),NY=D.years.length;
  const top=(arr,n)=>{const s=[];for(let j=0;j<D.nc;j++){if(!D.real[j])continue;let t=0;for(let i=I0;i<=I1;i++)t+=arr[j*NY+i];if(t>0)s.push([j,t])}
    s.sort((a,b)=>b[1]-a[1]);const m=new Uint8Array(D.nc);s.slice(0,n).forEach(([j])=>m[j]=1);return m};
  return {ex:S.ts?top(base.out,TOPS[S.ts]):null,rc:S.tr?top(base.inn,TOPS[S.tr]):null}}
let A=[null,null];
function compute(){const lim=limits();A=[agg(0,lim),agg(1,lim)]}
const cur=()=>A[S.v];

// ---------- chart scaffolding ----------
function frame(el,H,m){el.innerHTML="";const W=Math.max(300,el.clientWidth||600);
  const svg=d3.select(el).append("svg").attr("viewBox",`0 0 ${W} ${H}`);
  const x=d3.scaleLinear().domain([Y[0],Math.max(LAST,Y[0]+1)]).range([m.l,W-m.r]);return {svg,W,H,m,x}}
function xticks(W){const step=N>12?(W<600?4:2):1;return Y.filter(v=>(v-Y[0])%step===0)}
function axes(f,y,fmt){const {svg,W,H,m,x}=f;
  svg.append("g").attr("class","gl").selectAll("line").data(y.ticks(5)).join("line").attr("x1",m.l).attr("x2",W-m.r).attr("y1",d=>y(d)).attr("y2",d=>y(d));
  svg.append("g").attr("class","ax").attr("transform",`translate(0,${H-m.b})`).call(d3.axisBottom(x).tickValues(xticks(W)).tickFormat(d3.format("d")).tickSizeOuter(0));
  svg.append("g").attr("class","ax").attr("transform",`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(fmt).tickSize(0).tickPadding(6)).select(".domain").remove()}
function marks(f){const {svg,H,m,x}=f;const g=svg.append("g").attr("class","note");
  const md=D.modelled.filter(y=>y>=Y[0]&&y<=LAST);
  if(md.length){const a=x(Math.max(Y[0],md[0]-.5)),b=x(LAST);ensureHatch(svg);
    g.append("rect").attr("x",a).attr("y",m.t).attr("width",Math.max(0,b-a)).attr("height",H-m.t-m.b).attr("fill","url(#mhatch)").attr("stroke","none");
    g.append("text").attr("x",(a+b)/2).attr("y",H-m.b-6).attr("text-anchor","middle").text("Modelled")}
  events().forEach(([yr,l],k)=>{if(yr<Y[0]||yr>LAST)return;g.append("line").attr("x1",x(yr)).attr("x2",x(yr)).attr("y1",m.t).attr("y2",H-m.b);
    g.append("text").attr("x",x(yr)+(k?4:-4)).attr("text-anchor",k?"start":"end").attr("y",m.t-6).text(f.W<600?l.split(" ")[0]:l)})}
function hover(f,fn){const {svg,W,H,m,x}=f;const guide=svg.append("line").attr("stroke",css("--muted")).attr("y1",m.t).attr("y2",H-m.b).attr("opacity",0);
  svg.append("rect").attr("x",m.l).attr("y",m.t).attr("width",Math.max(0,W-m.l-m.r)).attr("height",H-m.t-m.b).attr("fill","transparent")
   .on("mousemove",e=>{const [px]=d3.pointer(e);const yr=Math.round(x.invert(px)),i=Y.indexOf(yr);if(i<0)return;guide.attr("x1",x(yr)).attr("x2",x(yr)).attr("opacity",.6);showTip(e,fn(i))})
   .on("mouseleave",()=>{guide.attr("opacity",0);hideTip()})}
function ensureHatch(svg){if(svg.select("#mhatch").size())return;
  svg.append("defs").html(`<pattern id="mhatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--muted)" stroke-width=".8" opacity=".35"/></pattern>`)}
const empty=(el,lg)=>{el.innerHTML=`<div class="empty">No trade for this selection.</div>`;if(lg)lg.innerHTML=""};

// ---------- overview ----------
function chartA(){const el=$("#cA");const w0=sl(A[0].tot),w1=sl(A[1].tot);ROWS.A=null;
  if(!d3.max([...w0,...w1]))return empty(el);
  {const u=unit(),t0=sl(A[0].ti),t1=sl(A[1].ti);ROWS.A=()=>[["year","modelled","exporters_reports_"+u,"importers_reports_"+u,...(S.imp==="1"?["imputed_in_exporters_reports_"+u,"imputed_in_importers_reports_"+u]:[])],
    Y.map((y,i)=>({year:y,modelled:D.modelled.includes(y)?"yes":"",["exporters_reports_"+u]:rnd(w0[i]),["importers_reports_"+u]:rnd(w1[i]),["imputed_in_exporters_reports_"+u]:rnd(t0[i]),["imputed_in_importers_reports_"+u]:rnd(t1[i])}))]}
  const f=frame(el,300,{l:62,r:120,t:30,b:28});const {svg,x}=f;
  const y=d3.scaleLinear().domain([0,(d3.max([...w0,...w1])||1)*1.08]).nice().range([300-28,30]);
  axes(f,y,fAx);marks(f);
  if(S.imp==="1"){const s=S.v?w1:w0,ti=sl(A[S.v].ti);ensureHatch(svg);
    svg.append("path").attr("fill","url(#mhatch)").attr("stroke","none").attr("d",d3.area().x((d,i)=>x(Y[i])).y0((d,i)=>y(s[i]-ti[i])).y1(d=>y(d)).curve(d3.curveMonotoneX)(s))}
  [[0,w0,"--out"],[1,w1,"--in"]].forEach(([v,s,c])=>{
    svg.append("path").attr("fill","none").attr("stroke",css(c)).attr("stroke-width",v===S.v?3:1.6).attr("opacity",v===S.v?1:.6).attr("stroke-dasharray",v===1?"5 4":null)
      .attr("d",d3.line().x((d,i)=>x(Y[i])).y(d=>y(d)).curve(d3.curveMonotoneX)(s));
    svg.append("circle").attr("cx",x(LAST)).attr("cy",y(s[N-1])).attr("r",3.5).attr("fill",css(c));
    svg.append("text").attr("class","lbl").attr("x",x(LAST)+8).attr("y",y(s[N-1])+(s[N-1]>=(v?w0:w1)[N-1]?-4:12)).attr("fill",css(c)).text(v===0?"Exporters' reports":"Importers' reports")});
  const s=S.v?w1:w0,pk=d3.maxIndex(s);
  if(N>2&&s[pk])svg.append("text").attr("class","lbl").attr("x",Math.min(x(Y[pk]),f.W-200)).attr("y",y(s[pk])-10).attr("text-anchor","middle").attr("fill",css("--ink")).text("Peak "+fV(s[pk])+", "+Y[pk]);
  const t0=sl(A[0].ti),t1=sl(A[1].ti),im=i=>S.imp==="1"?[t0,t1][S.v][i]:0;
  hover(f,i=>`<b>${Y[i]}${D.modelled.includes(Y[i])?" (modelled)":""}</b><br>Exporters' reports ${fV(w0[i])}<br>Importers' reports ${fV(w1[i])}${im(i)?`<br>of which imputed ${fV(im(i))}`:""}`)}

const BTITLE={rg:"Where it goes",sg:"Where it comes from",rr:"Where it goes",sr:"Where it comes from",mt:"By material"};
function chartB(){const el=$("#cB");$("#hB").textContent=BTITLE[S.split];const sp=cur().split,inc=S.split[1]==="g",mt=S.split==="mt";
  let keys=[...sp.keys()].filter(k=>d3.sum(sl(sp.get(k)))>0);
  keys=inc?GL.filter(g=>g!=="N"&&keys.includes(g)):mt?STREAMS.filter(k=>keys.includes(k)):keys.sort((a,b)=>(a==="Other")-(b==="Other")||d3.sum(sl(sp.get(b)))-d3.sum(sl(sp.get(a))));
  ROWS.B=null;if(!keys.length)return empty(el,$("#lB"));
  {const u=unit(),gl=$("#split").selectedOptions[0].textContent.replace(/^By /,"");ROWS.B=()=>[["year","figures",gl,u,"share"],Y.flatMap((y,i)=>{const t=d3.sum(keys,k=>sp.get(k)[I0+i]);return keys.map(k=>{const v=sp.get(k)[I0+i];return {year:y,figures:VN[S.v],[gl]:lab(k),[u]:rnd(v),share:t?+(v/t).toFixed(4):""}})})]}
  const col=k=>inc?css(GC[k]):mt?MATCOL[k]:regCol(k),lab=k=>inc?GN[k]:mt?nmShare(k):k;
  const f=frame(el,280,{l:60,r:12,t:30,b:28});const {svg,x}=f;
  const rows=Y.map((yr,i)=>{const o={yr},t=d3.sum(keys,k=>sp.get(k)[I0+i]);keys.forEach(k=>{const v=sp.get(k)[I0+i];o[k]=S.bmode==="s"?(t?v/t:0):v});o._t=t;return o});
  const st=d3.stack().keys(keys)(rows);
  const y=d3.scaleLinear().domain([0,S.bmode==="s"?1:(d3.max(st.at(-1),d=>d[1])||1)*1.05]).nice().range([280-28,30]);
  axes(f,y,S.bmode==="s"?d3.format(".0%"):fAx);
  svg.append("g").selectAll("path").data(st).join("path").attr("fill",d=>col(d.key)).attr("opacity",.85).attr("d",d3.area().x(d=>x(d.data.yr)).y0(d=>y(d[0])).y1(d=>y(d[1])).curve(d3.curveMonotoneX));
  marks(f);
  hover(f,i=>{const t=rows[i]._t||1;return `<b>${Y[i]}</b> · ${VN[S.v]}<br>`+keys.map(k=>{const v=sp.get(k)[I0+i];return v?`${esc(lab(k))}: ${fV(v)} (${d3.format(".0%")(v/t)})`:""}).filter(Boolean).join("<br>")});
  $("#lB").innerHTML=keys.map(k=>`<span><i style="background:${col(k)}"></i>${esc(lab(k))}</span>`).join("")}

function chartC(){const el=$("#cC");const hl=Y.map((yr,i)=>[cur().hl[I0+i],cur().hAll[I0+i]]);
  ROWS.C=null;if(!d3.max(hl,d=>d[1]))return empty(el,$("#lC"));
  {const u=unit();ROWS.C=()=>[["year","figures","to_middle_and_low_income_"+u,"all_high_income_exports_"+u,"share"],Y.map((y,i)=>({year:y,figures:VN[S.v],["to_middle_and_low_income_"+u]:rnd(hl[i][0]),["all_high_income_exports_"+u]:rnd(hl[i][1]),share:hl[i][1]?+(hl[i][0]/hl[i][1]).toFixed(4):""}))]}
  const f=frame(el,280,{l:60,r:48,t:30,b:28});const {svg,x,W,H,m}=f;
  const y=d3.scaleLinear().domain([0,(d3.max(hl,d=>d[0])||1)*1.1]).nice().range([H-m.b,m.t]),y2=d3.scaleLinear().domain([0,1]).range([H-m.b,m.t]);
  axes(f,y,fAx);
  svg.append("g").attr("class","ax").attr("transform",`translate(${W-m.r},0)`).call(d3.axisRight(y2).ticks(4).tickFormat(d3.format(".0%")).tickSize(0).tickPadding(6)).select(".domain").remove();
  const bw=Math.min(14,(W-m.l-m.r)/Math.max(N,2)*.6);
  svg.append("g").selectAll("rect").data(hl).join("rect").attr("x",(d,i)=>x(Y[i])-bw/2).attr("width",bw).attr("y",d=>y(d[0])).attr("height",d=>y(0)-y(d[0])).attr("fill",css("--out")).attr("opacity",.8).attr("rx",2);
  const sh=d=>d[1]?d[0]/d[1]:0;
  svg.append("path").attr("fill","none").attr("stroke",css("--ink")).attr("stroke-width",2).attr("d",d3.line().x((d,i)=>x(Y[i])).y(d=>y2(sh(d))).curve(d3.curveMonotoneX)(hl));
  svg.append("g").selectAll("circle").data(hl).join("circle").attr("cx",(d,i)=>x(Y[i])).attr("cy",d=>y2(sh(d))).attr("r",2.5).attr("fill",css("--ink"));
  marks(f);
  hover(f,i=>`<b>${Y[i]}</b> · ${VN[S.v]}<br>To middle- and low-income countries: ${fV(hl[i][0])}<br>Share of high-income countries' exports: ${d3.format(".0%")(sh(hl[i]))}`);
  $("#lC").innerHTML=`<span><i style="background:var(--out)"></i>${S.m==="usd"?"US$":"Tonnes"} (left)</span><span><i style="background:var(--ink);height:3px"></i>Share of high-income countries' exports (right)</span>`}

// Heatmap ramp: pale sand to teal to deep navy in light; the reverse journey in dark.
const RAMP_L=["#f6efd9","#cfe6c9","#7cc4b9","#2a8f9a","#1d5878","#1b2b4f"];
const RAMP_D=["#16222b","#1f4552","#22737c","#3aa59a","#93d3a8","#f1eab0"];
function chartE(){const el=$("#cE");el.innerHTML="";const ramp=dark()?RAMP_D:RAMP_L,arr=S.hdir==="in"?cur().inn:cur().out;
  $("#hE").textContent=S.hdir==="in"?"Receivers year by year":"Senders year by year";$("#hrv").textContent=S.hrows;
  const top=d3.range(D.nc).filter(j=>D.real[j]).map(j=>({j,s:series(arr,j)})).map(d=>({...d,t:d3.sum(d.s)})).filter(d=>d.t>0).sort((a,b)=>b.t-a.t).slice(0,S.hrows);
  ROWS.E=null;if(!top.length)return empty(el,$("#lE"));
  ROWS.E=()=>wide(top,S.hdir==="in"?"receiver":"sender");
  const m={l:150,r:8,t:6,b:24},cw=Math.max(18,Math.min(64,((el.clientWidth||560)-m.l-m.r)/N)),ch=18,W=m.l+cw*N+m.r,H=m.t+ch*top.length+m.b;
  const svg=d3.select(el).append("svg").attr("viewBox",`0 0 ${W} ${H}`).style("min-width",Math.min(W,m.l+18*N+m.r)+"px").style("max-width",W+"px");
  const mx=d3.max(top,d=>d3.max(d.s))||1,lo=Math.max(1,mx/2000);
  const col=d3.scaleSequentialLog(d3.interpolateRgbBasis(ramp)).domain([lo,mx]).clamp(true);
  const verb=S.hdir==="in"?"received":"sent";
  top.forEach((d,r)=>{svg.append("text").attr("x",m.l-8).attr("y",m.t+r*ch+ch/2+4).attr("text-anchor","end").attr("class","lbl").attr("fill",css("--ink")).style("font-weight",500).text(name(d.j).length>22?name(d.j).slice(0,21)+"…":name(d.j));
    svg.append("g").selectAll("rect").data(d.s.map((v,i)=>({v,i}))).join("rect").attr("x",p=>m.l+p.i*cw+1).attr("y",m.t+r*ch+1).attr("width",cw-2).attr("height",ch-2).attr("rx",2)
      .attr("fill",p=>p.v>0?col(p.v):css("--raise")).on("mousemove",(e,p)=>showTip(e,`<b>${esc(name(d.j))}</b>, ${Y[p.i]}<br>${fV(p.v)} ${verb} (${VN[S.v]})`)).on("mouseleave",hideTip)});
  Y.forEach((yr,i)=>{if((yr-Y[0])%2===0||N<8)svg.append("text").attr("x",m.l+i*cw+cw/2).attr("y",H-8).attr("text-anchor","middle").attr("fill",css("--muted")).style("font-family","var(--mono)").style("font-size","11px").text("’"+String(yr).slice(2))});
  $("#lE").innerHTML=`<span>${fV(lo)}</span><span class="ramp" style="background:linear-gradient(90deg,${ramp.join(",")})"></span><span>${fV(mx)}</span>`}

// ---------- who reported (HS 3915) ----------
let WR=null,WY=null;
async function loadWR(){if(WR)return WR;const r=await fetch("data/completeness.json",{cache:"no-cache"});if(!r.ok)throw new Error(r.status);return WR=await r.json()}
function chartW(){const el=$("#cW");if(!WR){loadWR().then(chartW).catch(()=>empty(el));return}
  const W0=WR,yrs=W0.years.filter((y,i)=>W0.universe[i]!=null),ix=y=>W0.years.indexOf(y);
  if(!yrs.length)return empty(el,$("#lW"));
  if(!yrs.includes(WY))WY=yrs.at(-1);
  const v=String(S.v),o=S.v?"0":"1",share=y=>{const i=ix(y),t=W0.total_t[o][i];return t?W0.partner_only_t[v][i]/t:0};
  const up=y=>W0.both[ix(y)]+W0.x_only[ix(y)]+W0.m_only[ix(y)],dn=y=>W0.none[ix(y)];
  const Wd=Math.max(300,el.clientWidth||600),H=310,m={l:44,r:52,t:22,b:40};el.innerHTML="";
  const svg=d3.select(el).append("svg").attr("viewBox",`0 0 ${Wd} ${H}`);
  const x=d3.scaleBand().domain(yrs).range([m.l,Wd-m.r]).padding(.28),bw=x.bandwidth();
  const mu=d3.max(yrs,up)||1,md=d3.max(yrs,dn)||1,z=m.t+(H-m.t-m.b)*mu/(mu+md),k=(H-m.t-m.b)/(mu+md);
  const ys=d3.scaleLinear().domain([0,Math.max(.05,d3.max(yrs,share)*1.15)]).nice().range([H-m.b,m.t]);
  svg.append("g").attr("class","ax").attr("transform",`translate(${Wd-m.r},0)`).call(d3.axisRight(ys).ticks(4).tickFormat(d3.format(".0%")).tickSize(0).tickPadding(6)).select(".domain").remove();
  const muted=css("--muted"),out=css("--out");
  yrs.forEach(y=>{const i=ix(y),b=W0.both[i],one=W0.x_only[i]+W0.m_only[i],n=W0.none[i],xx=x(y),sel=y===WY;
    const g=svg.append("g").style("cursor","pointer").on("click",()=>{WY=y;chartW()})
      .on("mousemove",e=>showTip(e,`<b>${y}</b> · ${W0.universe[i]} economies<br>Exports and imports: ${b}<br>Exports only: ${W0.x_only[i]}<br>Imports only: ${W0.m_only[i]}<br>Nothing: ${n}<br>Seen only in partners' reports: ${d3.format(".1%")(share(y))} (${VN[S.v]})`)).on("mouseleave",hideTip);
    g.append("rect").attr("x",xx-2).attr("width",bw+4).attr("y",m.t).attr("height",H-m.t-m.b).attr("fill",sel?css("--raise"):"transparent").attr("rx",3);
    g.append("rect").attr("x",xx).attr("width",bw).attr("y",z-b*k).attr("height",b*k).attr("fill",muted).attr("opacity",.6);
    g.append("rect").attr("x",xx).attr("width",bw).attr("y",z-(b+one)*k).attr("height",one*k).attr("fill",muted).attr("opacity",.25);
    g.append("rect").attr("x",xx).attr("width",bw).attr("y",z).attr("height",n*k).attr("fill",out).attr("opacity",.85);
    if(bw>=16){g.append("text").attr("x",xx+bw/2).attr("y",z-(b+one)*k-4).attr("text-anchor","middle").attr("fill",muted).style("font-family","var(--mono)").style("font-size","10.5px").text(b+one);
      g.append("text").attr("x",xx+bw/2).attr("y",z+n*k+12).attr("text-anchor","middle").attr("fill",css("--ink")).style("font-family","var(--mono)").style("font-size","10.5px").style("font-weight",600).text(n)}
    g.append("text").attr("x",xx+bw/2).attr("y",H-8).attr("text-anchor","middle").attr("fill",sel?css("--ink"):muted).style("font-family","var(--mono)").style("font-size","11px").style("font-weight",sel?600:400).text(bw<24?"’"+String(y).slice(2):y)});
  svg.append("line").attr("x1",m.l).attr("x2",Wd-m.r).attr("y1",z).attr("y2",z).attr("stroke",css("--ink")).attr("stroke-width",1);
  svg.append("path").attr("fill","none").attr("stroke",css("--in")).attr("stroke-width",2).attr("pointer-events","none").attr("d",d3.line().x(y=>x(y)+bw/2).y(y=>ys(share(y)))(yrs));
  svg.append("g").attr("pointer-events","none").selectAll("circle").data(yrs).join("circle").attr("cx",y=>x(y)+bw/2).attr("cy",y=>ys(share(y))).attr("r",2.5).attr("fill",css("--in"));
  $("#lW").innerHTML=`<span><i style="background:var(--muted);opacity:.6"></i>Reported exports and imports</span><span><i style="background:var(--muted);opacity:.25"></i>One flow only</span><span><i style="background:var(--out)"></i>Reported nothing</span><span><i style="background:var(--in);height:3px"></i>Seen only in partners' reports, ${VN[S.v]} (right)</span>`;
  nrList()}

// Non-reporters for the chosen year: largest first, or grouped by World Bank region.
let NRM="top",NRALL=false,NRQ="";
function nrList(){const W0=WR,el=$("#wlist");if(!W0||!W0.nonrep)return;const v=String(S.v),i=W0.years.indexOf(WY);
  const all=(W0.nonrep[v][i]||[]).map(([c,t,g])=>{const n=W0.names[c]||[c,c,""];return {c,t,g,nm:n[1],rg:n[2]||"Other"}});
  const q=NRQ.trim().toLowerCase(),L=q?all.filter(d=>d.nm.toLowerCase().includes(q)||d.rg.toLowerCase().includes(q)):all;
  const tot=d3.sum(all,d=>d.t),mx=d3.max(all,d=>d.t)||1,dot=g=>`<i class="nrdot" style="background:var(${GC[g]||"--g-ns"})" title="${GN[g]||""}"></i>`;
  const val=t=>t?fTn(t):"—";
  let body;
  if(NRM==="top"){const rows=NRALL||q?L:L.slice(0,12);
    body=`<table class="nrt"><thead><tr><th>Economy</th><th class="rg">Region</th><th class="n">Recorded by partners</th></tr></thead><tbody>${rows.map(d=>`<tr><td>${dot(d.g)}${esc(d.nm)}</td><td class="rg">${esc(d.rg)}</td><td class="n"><span class="nrbar" style="width:${Math.max(1,d.t/mx*90)}px"></span>${val(d.t)}</td></tr>`).join("")}</tbody></table>`+
      (!q&&L.length>12?`<button class="nrmore">${NRALL?"Show the largest 12":`Show all ${L.length}`}</button>`:"")}
  else{const g=d3.groups(L,d=>d.rg).sort((a,b)=>d3.sum(b[1],d=>d.t)-d3.sum(a[1],d=>d.t)||a[0].localeCompare(b[0]));
    body=`<div class="nrg">${g.map(([r,ds])=>`<div><h4>${esc(r)} <span>${ds.length}</span></h4><ul>${ds.map(d=>`<li>${dot(d.g)}<span>${esc(d.nm)}</span><em>${d.t?val(d.t):""}</em></li>`).join("")}</ul></div>`).join("")}</div>`}
  el.innerHTML=`<div class="nrhd"><b>No ${S.v?"import":"export"} report, ${WY}</b><span>${all.length} economies · partners recorded ${fTn(tot)} with them</span>
    <div class="seg sm" id="nrm"><button data-m="top" aria-pressed="${NRM==="top"}">Largest first</button><button data-m="reg" aria-pressed="${NRM==="reg"}">By region</button></div>
    <input id="nrq" type="search" placeholder="Find a country or region" value="${esc(NRQ)}" aria-label="Find a country or region"></div>${body||""}
    <div class="nrleg">${["H","U","M","L"].map(g=>`<span>${dot(g)}${GN[g]}</span>`).join("")}</div>`;
  el.querySelectorAll("#nrm button").forEach(b=>b.onclick=()=>{NRM=b.dataset.m;nrList()});
  const qi=el.querySelector("#nrq");qi.oninput=()=>{NRQ=qi.value;const p=qi.selectionStart;nrList();const n=$("#nrq");n.focus();n.setSelectionRange(p,p)};
  const mb=el.querySelector(".nrmore");if(mb)mb.onclick=()=>{NRALL=!NRALL;nrList()}}

// ---------- at a glance ----------
function chartF(){const el=$("#cF");el.innerHTML="";const out=S.gdir==="out",arr=out?cur().out:cur().inn,c=css(out?"--out":"--in"),verb=out?"sent":"received";
  $("#hF").textContent=out?"Senders at a glance":"Receivers at a glance";
  const lim=SHOWS[S.gshow],minv=MINS[S.gmin],qq=S.gq.trim().toLowerCase();
  $("#gshowv").textContent=lim?lim:"All";$("#gminv").textContent=minv?fV(minv):"Any";
  let rows=d3.range(D.nc).filter(j=>D.real[j]).map(j=>{const s=series(arr,j),pk=d3.maxIndex(s);return {j,s,t:d3.sum(s),pk,peak:s[pk],last:s[N-1],first:s[0]}}).filter(d=>d.t>0&&d.t>=minv);
  if(qq)rows=rows.filter(d=>name(d.j).toLowerCase().includes(qq));
  const key={total:d=>-d.t,last:d=>-d.last,peak:d=>-d.peak,rise:d=>d.first-d.last,fall:d=>d.last-d.first,name:d=>name(d.j)}[S.gsort];
  rows.sort((a,b)=>S.gsort==="name"?key(a).localeCompare(key(b)):key(a)-key(b));
  const total=rows.length;if(lim)rows=rows.slice(0,lim);
  $("#fcount").textContent=`${rows.length} of ${total}`;
  ROWS.F=null;if(!rows.length)return empty(el);
  ROWS.F=()=>wide(rows,out?"sender":"receiver");
  const shared=S.gscale==="shared"?d3.max(rows,d=>d.peak):0;
  for(const d of rows){const s=d.s;const box=document.createElement("div");box.className="m";
    box.innerHTML=`<b title="${esc(name(d.j))}">${esc(name(d.j))}</b><small>Peak ${fV(d.peak)} in ${Y[d.pk]}</small><small>${LAST}: ${fV(d.last)}</small>`;el.appendChild(box);
    const W=160,H=50,svg=d3.select(box).append("svg").attr("viewBox",`0 0 ${W} ${H}`);
    const x=d3.scaleLinear().domain([Y[0],Math.max(LAST,Y[0]+1)]).range([2,W-4]),y=d3.scaleLinear().domain([0,shared||d.peak||1]).range([H-2,5]);
    svg.append("path").attr("fill",c).attr("opacity",.18).attr("d",d3.area().x((v,i)=>x(Y[i])).y0(H-2).y1(v=>y(v)).curve(d3.curveMonotoneX)(s));
    svg.append("path").attr("fill","none").attr("stroke",c).attr("stroke-width",1.8).attr("d",d3.line().x((v,i)=>x(Y[i])).y(v=>y(v)).curve(d3.curveMonotoneX)(s));
    svg.append("circle").attr("cx",x(Y[d.pk])).attr("cy",y(d.peak)).attr("r",3).attr("fill",c);
    svg.append("circle").attr("cx",x(LAST)).attr("cy",y(d.last)).attr("r",2.5).attr("fill",css("--ink"));
    svg.append("rect").attr("width",W).attr("height",H).attr("fill","transparent").on("mousemove",e=>{const yr=Math.round(x.invert(d3.pointer(e)[0])),i=Y.indexOf(yr);if(i>=0)showTip(e,`<b>${esc(name(d.j))}</b>, ${yr}<br>${fV(s[i])} ${verb} (${VN[S.v]})`)}).on("mouseleave",hideTip)}}

// ---------- compare two years ----------
function cmpRows(){const ia=D.years.indexOf(S.ya),ib=D.years.indexOf(S.yb),NY=D.years.length,arr=S.cdir==="in"?cur().inn:cur().out;
  const g=new Map(),add=(k,lab,col,a,b)=>{let o=g.get(k);if(!o){o={k,lab,col,a:0,b:0};g.set(k,o)}o.a+=a;o.b+=b};
  for(let j=0;j<D.nc;j++){const a=arr[j*NY+ia],b=arr[j*NY+ib];if(!a&&!b)continue;
    if(S.cgrp==="c"){if(D.real[j])add(j,name(j),null,a,b)}
    else if(S.cgrp==="r"){const r=D.regions[S.sch][j]||"Other";add(r,r,regCol(r),a,b)}
    else{add(D.incY[ia][j]+"a",null,null,a,0);add(D.incY[ib][j]+"a",null,null,0,b)}}
  let rows=[...g.values()];
  if(S.cgrp==="g")rows=rows.filter(o=>o.k[0]!=="N").map(o=>({...o,lab:GN[o.k[0]],col:css(GC[o.k[0]])}));
  const ch=r=>r.b-r.a,pc=r=>r.a?(r.b-r.a)/r.a:(r.b?Infinity:0);
  const key={b:r=>-r.b,a:r=>-r.a,chg:r=>-Math.abs(ch(r)),rise:r=>-ch(r),fall:r=>ch(r),pct:r=>-pc(r),pctf:r=>pc(r)}[S.csort];
  rows=rows.filter(r=>r.a||r.b);
  if(S.csort==="pct"||S.csort==="pctf")rows=rows.filter(r=>r.a>0&&r.b>0);
  return rows.sort((p,q)=>key(p)-key(q)).slice(0,S.cn)}
function chartG(){const el=$("#cG");el.innerHTML="";$("#cnv").textContent=S.cn;const rows=cmpRows();
  {const u=unit(),a=S.ya+"_"+u,b=S.yb+"_"+u;ROWS.G=rows.length?()=>[[(S.cdir==="in"?"receiver_":"sender_")+{c:"country",r:"region",g:"income_group"}[S.cgrp],"figures",a,b,"change_"+u,"change_pct"],rows.map(r=>({[(S.cdir==="in"?"receiver_":"sender_")+{c:"country",r:"region",g:"income_group"}[S.cgrp]]:r.lab,figures:VN[S.v],[a]:rnd(r.a),[b]:rnd(r.b),["change_"+u]:rnd(r.b-r.a),change_pct:r.a?+((r.b-r.a)/r.a*100).toFixed(1):""}))]:null}
  $("#lG").innerHTML=(S.cchart==="dumb"?`<span><i style="border:1.5px solid var(--muted);border-radius:50%"></i>${S.ya}</span><span><i style="background:var(--ink);border-radius:50%"></i>${S.yb}</span>`:"")+`<span><i style="background:var(--in)"></i>Rise</span><span><i style="background:var(--out)"></i>Fall</span>`;
  if(!rows.length)return empty(el,$("#lG"));
  (S.cchart==="slope"?slope:dumbbell)(el,rows)}
function dumbbell(el,rows){const W=Math.max(320,el.clientWidth||700),narrow=W<600,rh=26,m={l:narrow?110:180,r:narrow?96:200,t:30,b:8},H=m.t+rows.length*rh+m.b;
  const svg=d3.select(el).append("svg").attr("viewBox",`0 0 ${W} ${H}`);
  const mx=d3.max(rows,r=>Math.max(r.a,r.b))||1;
  const x=S.cscale==="log"?d3.scaleSymlog().constant(Math.max(1,mx/1e4)).domain([0,mx]).range([m.l,W-m.r]):d3.scaleLinear().domain([0,mx]).nice().range([m.l,W-m.r]);
  const ticks=S.cscale==="log"?[0,...[1,10,100,1e3,1e4,1e5,1e6,1e7,1e8,1e9,1e10].filter(v=>v<=mx&&v>=mx/1e4)]:x.ticks(narrow?3:6);
  svg.append("g").attr("class","gl").selectAll("line").data(ticks).join("line").attr("x1",d=>x(d)).attr("x2",d=>x(d)).attr("y1",m.t-4).attr("y2",H-m.b);
  svg.append("g").attr("class","ax").selectAll("text").data(ticks).join("text").attr("x",d=>x(d)).attr("y",m.t-10).attr("text-anchor","middle").text(fAx);
  rows.forEach((r,k)=>{const yy=m.t+k*rh+rh/2,c=css(r.b>=r.a?"--in":"--out");
    const g=svg.append("g").on("mousemove",e=>showTip(e,`<b>${esc(r.lab)}</b> · ${VN[S.v]}<br>${S.ya}: ${fV(r.a)}<br>${S.yb}: ${fV(r.b)}${r.a?"<br>"+pct((r.b-r.a)/r.a):""}`)).on("mouseleave",hideTip);
    g.append("rect").attr("x",0).attr("y",yy-rh/2).attr("width",W).attr("height",rh).attr("fill","transparent");
    if(r.col)g.append("rect").attr("x",m.l-14).attr("y",yy-4).attr("width",8).attr("height",8).attr("rx",2).attr("fill",r.col);
    g.append("text").attr("class","lbl").attr("x",m.l-(r.col?20:10)).attr("y",yy+4).attr("text-anchor","end").attr("fill",css("--ink")).style("font-weight",500).text(narrow&&r.lab.length>15?r.lab.slice(0,14)+"…":r.lab);
    g.append("line").attr("x1",x(r.a)).attr("x2",x(r.b)).attr("y1",yy).attr("y2",yy).attr("stroke",c).attr("stroke-width",3).attr("opacity",.55);
    g.append("circle").attr("cx",x(r.a)).attr("cy",yy).attr("r",5).attr("fill",css("--panel")).attr("stroke",css("--muted")).attr("stroke-width",1.5);
    g.append("circle").attr("cx",x(r.b)).attr("cy",yy).attr("r",5).attr("fill",c);
    g.append("text").attr("class","lbl").attr("x",W-m.r+10).attr("y",yy+4).attr("fill",c).text(narrow?fV(r.b):`${fV(r.a)} → ${fV(r.b)}${r.a?"  "+pct((r.b-r.a)/r.a):""}`)})}
function slope(el,rows){const W=Math.max(320,el.clientWidth||700),narrow=W<600,H=Math.max(240,rows.length*24+60),m={l:narrow?118:200,r:narrow?118:200,t:28,b:12};
  const svg=d3.select(el).append("svg").attr("viewBox",`0 0 ${W} ${H}`);
  const mx=d3.max(rows,r=>Math.max(r.a,r.b))||1;
  const y=(S.cscale==="log"?d3.scaleSymlog().constant(Math.max(1,mx/1e4)):d3.scaleLinear()).domain([0,mx]).range([H-m.b,m.t]);
  const xa=m.l,xb=W-m.r;
  [[xa,S.ya],[xb,S.yb]].forEach(([xx,yr])=>{svg.append("text").attr("x",xx).attr("y",14).attr("text-anchor","middle").attr("class","lbl").attr("fill",css("--muted")).text(yr);
    svg.append("line").attr("x1",xx).attr("x2",xx).attr("y1",m.t-6).attr("y2",H-m.b).attr("stroke",css("--grid"))});
  const place=vals=>{const s=vals.slice().sort((p,q)=>p.y-q.y);for(let k=1;k<s.length;k++)if(s[k].y-s[k-1].y<14)s[k].y=s[k-1].y+14;const over=s.length?s.at(-1).y-(H-m.b+4):0;if(over>0)s.forEach(v=>v.y-=over);return new Map(s.map(v=>[v.k,v.y]))};
  const la=place(rows.map(r=>({k:r.k,y:y(r.a)}))),lb=place(rows.map(r=>({k:r.k,y:y(r.b)})));
  for(const r of rows){const c=css(r.b>=r.a?"--in":"--out");const nm=r.lab;
    svg.append("line").attr("x1",xa).attr("x2",xb).attr("y1",y(r.a)).attr("y2",y(r.b)).attr("stroke",c).attr("stroke-width",2).attr("opacity",.85)
      .on("mousemove",e=>showTip(e,`<b>${esc(nm)}</b> · ${VN[S.v]}<br>${S.ya}: ${fV(r.a)}<br>${S.yb}: ${fV(r.b)}`)).on("mouseleave",hideTip);
    [[xa,r.a],[xb,r.b]].forEach(([xx,v])=>svg.append("circle").attr("cx",xx).attr("cy",y(v)).attr("r",3.5).attr("fill",c));
    svg.append("text").attr("class","lbl").attr("x",xa-8).attr("y",la.get(r.k)+4).attr("text-anchor","end").attr("fill",css("--ink")).text(narrow?`${fV(r.a)} ${nm.slice(0,12)}`:`${nm} ${fV(r.a)}`);
    svg.append("text").attr("class","lbl").attr("x",xb+8).attr("y",lb.get(r.k)+4).attr("fill",c).text(narrow?`${fV(r.b)} ${nm.slice(0,12)}`:`${fV(r.b)} ${nm}`)}}

// ---------- saving ----------
// Every chart saves as PNG, SVG (title, legend and a source caption) and CSV.
const CITE="Cook, E. (2026) Global Waste Trade Data Hub. Available at: https://globalwastetrade.org. Licence: CC BY 4.0";
const ROWS={};
const unit=()=>S.m==="usd"?"usd":"t";
const rnd=v=>v==null?"":Math.round(v);
const wide=(list,who)=>[[who,"iso3","figures",...Y.map(String)],list.map(d=>Object.assign({[who]:name(d.j),iso3:D.names[d.j][0],figures:VN[S.v]},Object.fromEntries(Y.map((y,i)=>[String(y),rnd(d.s[i])]))))];
const csvCell=v=>{const t=v==null?"":String(v);return /[",\n]/.test(t)?`"${t.replace(/"/g,'""')}"`:t};
const toCSV=(keys,rows)=>[keys.map(csvCell).join(","),...rows.map(r=>keys.map(k=>csvCell(r[k])).join(","))].join("\n");
const slug=t=>t.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50);
let toastT;const toast=m=>{const t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,3400)};
async function saveFile(fn,data){const type=fn.endsWith(".csv")?"text/csv":fn.endsWith(".svg")?"image/svg+xml":"image/png";
  const blob=data instanceof Blob?data:new Blob([data],{type:type+";charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=fn;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);toast(`Saved ${fn}`)}
function matDesc(){if(S.mats.includes("all"))return "All plastic: Plastic scrap (HS 3915) with "+PSTREAMS.filter(k=>k!=="plastic").map(k=>`${nmShare(k)} (${MATC[k]})`).join(", ");
  return S.mats.map(k=>`${S.count==="plastic"?nmShare(k):nm(k)} (${MATC[k]})`).join(", ")}
function caption(c){const p=[];
  if(c==="W")p.push(`Plastic scrap (HS 3915). ${VN[S.v][0].toUpperCase()+VN[S.v].slice(1)}.`);
  else{p.push(matDesc()+".",`${VN[S.v][0].toUpperCase()+VN[S.v].slice(1)}, ${S.imp==="1"?"with gaps imputed":"as reported"}.`,S.m==="usd"?"US$.":"Tonnes.");
    if(S.from.length)p.push("From "+S.from.map(t=>tokLabel(t)[0]).join(", ")+".");
    if(S.to.length)p.push("To "+S.to.map(t=>tokLabel(t)[0]).join(", ")+".");
    if(S.ts)p.push(`Top ${TOPS[S.ts]} senders.`);if(S.tr)p.push(`Top ${TOPS[S.tr]} receivers.`);
    if(S.xr)p.push(`Trade within a region left out (${SCHEMES[S.sch]}).`);if(S.xi)p.push("Trade within an income group left out.");if(S.xh)p.push("Trade from high-income to middle- and low-income countries left out.");if(S.xo)p.push("Trade from OECD to non-OECD countries left out (membership by year).");
    const md=D.modelled.filter(y=>y>=Y[0]&&y<=LAST);if(md.length)p.push(md.join(", ")+" modelled.")}
  p.push(`Source: UN Comtrade${c==="W"?"":`, ${Y[0]}–${LAST}`}. Global Waste Trade Data Hub, globalwastetrade.org, CC BY 4.0.`);return p.join(" ")}
const TITLE={A:()=>"Total",B:()=>$("#hB").textContent,C:()=>"From high-income to middle- and low-income countries",E:()=>$("#hE").textContent,W:()=>"Who reported plastic scrap trade",F:()=>$("#hF").textContent,G:()=>`Compare ${S.ya} and ${S.yb}`};
const LEG={A:null,B:"#lB",C:"#lC",E:"#lE",W:"#lW",F:null,G:"#lG"};
const mctx=document.createElement("canvas").getContext("2d");
const tw=(t,px,w)=>{mctx.font=`${w||400} ${px}px "IBM Plex Sans", Arial, sans-serif`;return mctx.measureText(t).width};
function wrapTxt(t,max,px){const out=[];let line="";for(const w of t.split(" ")){const nx=line?line+" "+w:w;if(line&&tw(nx,px)>max){out.push(line);line=w}else line=nx}if(line)out.push(line);return out}
// Legend chips (HTML) redrawn as SVG rows.
function legendItems(el){if(!el)return [];return [...el.children].map(sp=>{
  if(sp.classList.contains("ramp"))return {ramp:(sp.getAttribute("style").match(/#[0-9a-f]{6}/gi)||[])};
  const i=sp.querySelector("i"),o={text:sp.textContent.trim()};
  if(i){const cs=getComputedStyle(i);o.sw={fill:cs.backgroundColor,op:cs.opacity,h:Math.min(10,parseFloat(cs.height)||10),stroke:parseFloat(cs.borderTopWidth)?cs.borderTopColor:null,round:cs.borderTopLeftRadius==="50%"||parseFloat(cs.borderTopLeftRadius)>=5}}
  return o})}
function standalone(svgEl,title,note,lgEl,raw){
  const ns="http://www.w3.org/2000/svg",vb=svgEl.viewBox.baseVal,VW=vb.width,H=vb.height,W=Math.max(VW+48,520),top=46;
  const items=legendItems(lgEl),pos=[];let lx=16,ly=0,lrows=items.length?1:0;
  for(const it of items){const w=it.ramp?126:(it.sw?16:0)+tw(it.text,12)+16;if(lx+w>W-16&&lx>16){lx=16;ly+=20;lrows++}pos.push([lx,ly]);lx+=w}
  const lgH=lrows?lrows*20+6:0,cap=wrapTxt(note||"",W-32,11),bot=lgH+18+cap.length*15,TH=H+top+bot;
  const out=document.createElementNS(ns,"svg");out.setAttribute("xmlns",ns);out.setAttribute("viewBox",`0 0 ${W} ${TH}`);out.setAttribute("width",W);out.setAttribute("height",TH);
  const el=(tag,at,parent)=>{const e=document.createElementNS(ns,tag);for(const k in at)e.setAttribute(k,at[k]);(parent||out).appendChild(e);return e};
  const tx=(t,x,y,size,col,w,fam)=>{const e=el("text",{x,y,"font-size":size,fill:col,"font-family":fam||"IBM Plex Sans, Arial, sans-serif"});if(w)e.setAttribute("font-weight",w);e.textContent=t;return e};
  el("rect",{width:W,height:TH,fill:css("--panel")});
  tx(title,16,30,20,css("--ink"),700,"Archivo, Arial Narrow, Arial, sans-serif");
  const clone=svgEl.cloneNode(true);
  if(!raw){const orig=svgEl.querySelectorAll("*"),cl=clone.querySelectorAll("*");
    const props=["fill","stroke","stroke-width","stroke-opacity","fill-opacity","opacity","font-size","font-weight","font-family","stroke-dasharray","display","text-anchor"];
    orig.forEach((o,i)=>{const cs=getComputedStyle(o),t=cl[i];for(const p of props){const v=cs.getPropertyValue(p);if(v)t.setAttribute(p,v)}t.removeAttribute("class");t.style.cssText=""})}
  const inner=el("svg",{x:(W-VW)/2,y:top,width:VW,height:H,viewBox:`${vb.x} ${vb.y} ${VW} ${H}`,overflow:"visible"});
  while(clone.firstChild)inner.appendChild(clone.firstChild);
  const ly0=H+top+12;
  items.forEach((it,k)=>{const [x,y]=pos[k],yy=ly0+y;
    if(it.ramp){const id="lgr"+k,g=el("linearGradient",{id},el("defs",{}));it.ramp.forEach((c,n)=>el("stop",{offset:n/Math.max(1,it.ramp.length-1),"stop-color":c},g));el("rect",{x,y:yy,width:110,height:10,rx:2,fill:`url(#${id})`});return}
    let tx0=x;if(it.sw){const s=it.sw,h=s.h;const r=el("rect",{x,y:yy+5-h/2,width:10,height:h,rx:s.round?5:2,fill:s.fill,opacity:s.op});if(s.stroke){r.setAttribute("stroke",s.stroke);r.setAttribute("stroke-width",1.5)}tx0+=16}
    tx(it.text,tx0,yy+9.5,12,css("--muted"))});
  cap.forEach((l,i)=>tx(l,16,H+top+lgH+20+i*15,11,css("--muted")));
  return new XMLSerializer().serializeToString(out)}
function svgToPNG(str){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>{const k=2,c=document.createElement("canvas");c.width=img.width*k;c.height=img.height*k;const x=c.getContext("2d");x.scale(k,k);x.drawImage(img,0,0);c.toBlob(b=>b?res(b):rej(new Error("png")),"image/png")};img.onerror=rej;img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(str)})}
// At a glance: the small charts laid out as one picture, in the grid's columns.
function glanceSVG(){const el=$("#cF"),boxes=[...el.querySelectorAll(".m")];if(!boxes.length)return null;
  const ns="http://www.w3.org/2000/svg",cols=Math.max(1,getComputedStyle(el).gridTemplateColumns.split(" ").length),cw=176,chh=104;
  const svg=document.createElementNS(ns,"svg"),W=cols*cw,H=Math.ceil(boxes.length/cols)*chh;svg.setAttribute("viewBox",`0 0 ${W} ${H}`);
  const ink=css("--ink"),mut=css("--muted");
  boxes.forEach((b,n)=>{const g=document.createElementNS(ns,"g"),x=(n%cols)*cw,y=Math.floor(n/cols)*chh;g.setAttribute("transform",`translate(${x},${y})`);svg.appendChild(g);
    const t=(s,yy,size,col,w,fam)=>{const e=document.createElementNS(ns,"text");e.setAttribute("x",0);e.setAttribute("y",yy);e.setAttribute("font-size",size);e.setAttribute("fill",col);e.setAttribute("font-family",fam||"IBM Plex Sans, Arial, sans-serif");if(w)e.setAttribute("font-weight",w);e.textContent=s;g.appendChild(e)};
    let nmT=b.querySelector("b").textContent;while(nmT.length>3&&tw(nmT,12.5,600)>cw-12)nmT=nmT.slice(0,-2)+"…";
    t(nmT,12,12.5,ink,600);[...b.querySelectorAll("small")].forEach((sm,i)=>t(sm.textContent,27+i*13,10.5,mut,null,"IBM Plex Mono, Menlo, monospace"));
    const s=b.querySelector("svg").cloneNode(true),inner=document.createElementNS(ns,"svg");inner.setAttribute("x",0);inner.setAttribute("y",44);inner.setAttribute("width",160);inner.setAttribute("height",50);inner.setAttribute("viewBox","0 0 160 50");
    while(s.firstChild)inner.appendChild(s.firstChild);g.appendChild(inner)});
  return svg}
document.addEventListener("click",async e=>{const b=e.target.closest("[data-save]");if(!b)return;const c=b.dataset.save,f=b.dataset.fmt;
  try{const title=TITLE[c](),base=c==="W"?`gwt-trends-who-reported-hs3915`:c==="G"?`gwt-trends-compare-${S.ya}-${S.yb}-${slug(matShort())}`:`gwt-trends-${slug(title)}-${slug(matShort())}-${Y[0]}-${LAST}`;
    if(f==="csv"){if(c==="W"){const r=await fetch("data/completeness.csv");if(!r.ok)throw new Error(r.status);return saveFile(base+".csv",await r.blob())}
      if(!ROWS[c])return toast("Nothing to save for this selection.");const [keys,rows]=ROWS[c]();
      return saveFile(base+".csv",toCSV(keys,rows)+"\n\n"+csvCell(caption(c))+"\n"+csvCell("Cite as: "+CITE))}
    const svg=c==="F"?glanceSVG():$(`#c${c} svg`);if(!svg)return toast("Nothing to save for this selection.");
    const st=standalone(svg,c==="W"?title:`${title} · ${matShort()}`,caption(c),LEG[c]&&$(LEG[c]),c==="F");
    return f==="svg"?saveFile(base+".svg",st):saveFile(base+".png",await svgToPNG(st))}
  catch(err){console.error(err);toast("Couldn't build that file. Try another format.")}});

// ---------- filter controls ----------
// Grouped choices for the From / To pickers.
let GROUPS=[];
function options(){const g=[["Income groups",["H","U","M","L"].map(x=>[GN[x],"g:"+x])],["OECD",[["OECD members","r:oecd2:OECD members"],["Non-OECD","r:oecd2:Non-OECD"]]]];
  for(const [sch,lab] of [["un","UN regions"],["unsub","UN sub-regions"],["wb","World Bank regions"],["oecd","OECD regions"]])
    g.push([lab,[...new Set(D.regions[sch]||[])].filter(Boolean).sort().map(r=>[r,`r:${sch}:${r}`])]);
  g.push(["Countries",d3.range(D.nc).filter(j=>D.real[j]).sort((a,b)=>name(a).localeCompare(name(b))).map(j=>[name(j),"c:"+D.codes[j]])]);
  GROUPS=g}
function tokLabel(t){if(t[0]==="g")return [GN[t.slice(2)]||t,css(GC[t.slice(2)]||"--g-ns")];
  if(t[0]==="c"){const j=D.idx.get(t.slice(2));return [j!=null?name(j):"Code "+t.slice(2),null]}
  const p=t.indexOf(":",2),r=t.slice(p+1);return [r,t.slice(2,p)===S.sch?regCol(r):css("--g-ns")]}
function chips(){$$(".pickbox").forEach(box=>{const k=box.dataset.p;box.querySelectorAll(".chip").forEach(c=>c.remove());const inp=box.querySelector("input");
  S[k].forEach(t=>{const [l,c]=tokLabel(t);const ch=document.createElement("span");ch.className="chip";ch.innerHTML=`${c?`<i style="background:${c}"></i>`:""}${esc(l)}<button aria-label="Remove ${esc(l)}">×</button>`;
    ch.querySelector("button").onclick=()=>{S[k]=S[k].filter(x=>x!==t);update()};box.insertBefore(ch,inp)})})}
$$(".pickbox").forEach(box=>{const inp=box.querySelector("input"),menu=box.querySelector(".menu"),k=box.dataset.p;let act=-1;
  const items=()=>[...menu.querySelectorAll(".mi")];
  const render=()=>{const qq=inp.value.trim().toLowerCase();let h="";
    for(const [hd,its] of GROUPS){const f=its.filter(([l])=>!qq||l.toLowerCase().includes(qq));if(!f.length)continue;
      h+=`<div class="mh">${esc(hd)}</div>`+f.map(([l,t])=>`<div class="mi${S[k].includes(t)?" on":""}" role="option" data-t="${esc(t)}">${esc(l)}</div>`).join("")}
    menu.innerHTML=h||`<div class="mh">No match</div>`;act=-1};
  const open=()=>{render();menu.hidden=false;inp.setAttribute("aria-expanded","true")};
  const close=()=>{menu.hidden=true;inp.setAttribute("aria-expanded","false")};
  const take=t=>{if(t&&!S[k].includes(t))S[k].push(t);inp.value="";close();update()};
  const mark=()=>items().forEach((el,n)=>{el.setAttribute("aria-selected",String(n===act));if(n===act)el.scrollIntoView({block:"nearest"})});
  inp.addEventListener("focus",open);inp.addEventListener("input",open);inp.addEventListener("blur",()=>setTimeout(close,120));
  menu.addEventListener("mousedown",e=>{e.preventDefault();const el=e.target.closest(".mi");if(el)take(el.dataset.t)});
  inp.addEventListener("keydown",e=>{const it=items();
    if(e.key==="ArrowDown"){e.preventDefault();if(menu.hidden)open();act=Math.min(items().length-1,act+1);mark()}
    else if(e.key==="ArrowUp"){e.preventDefault();act=Math.max(0,act-1);mark()}
    else if(e.key==="Enter"){e.preventDefault();const el=it[act>=0?act:0];if(el&&(act>=0||inp.value.trim()))take(el.dataset.t)}
    else if(e.key==="Escape")close();
    else if(e.key==="Backspace"&&!inp.value&&S[k].length){S[k].pop();update()}});
  box.addEventListener("click",e=>{if(e.target===box)inp.focus()})});

// Materials menu: tick several; "All plastic" stands on its own.
function matUI(){let par="";
  $("#matmenu").innerHTML=MATS.map(([hd,its,p])=>{let h="";if((p||"")!==par){par=p||"";if(p)h+=`<div class="mh">${esc(p)}</div>`}
    h+=`<div class="${p?"msh":"mh"}">${esc(hd)}</div>`;
    return h+its.map(([k])=>`<label${p?' class="sub"':""}><input type="checkbox" value="${k}" ${S.mats.includes(k)||S.mats[0]==="all"&&(k==="all"||SHARE[k]!=null)?"checked":""}>${k==="all"?"":`<i style="background:${MATCOL[k]}"></i>`}<span>${nm2(nm(k))}</span>${MATC[k]?`<small>${MATC[k]}</small>`:""}</label>`).join("")}).join("");
  $("#matsum").textContent=matShort(true);
  $("#countctl").hidden=S.mats.includes("all")||S.mats.every(k=>k==="plastic"||SHARE[k]==null)}
// As on the explorer: a bracket such as "(plastic fraction)" sits on its own line.
const nm2=n=>{const m=n.match(/^(.*?) (\(.*\))$/);return m?`${esc(m[1])}<small>${esc(m[2])}</small>`:esc(n)};
const matShort=code=>S.mats[0]==="all"?"All plastic":S.mats.length===1?nm(S.mats[0])+(code&&MATC[S.mats[0]]?` (${MATC[S.mats[0]]})`:""):`${S.mats.length} materials: `+S.mats.map(nm).join(", ");
// "All plastic" ticks every stream; unticking one leaves the rest at their plastic shares,
// and ticking every stream again counts as "All plastic".
$("#matmenu").addEventListener("change",e=>{const k=e.target.value;let m=S.mats[0]==="all"?PSTREAMS.slice():S.mats.slice();
  if(k==="all")m=e.target.checked?["all"]:["plastic"];
  else{if(S.mats[0]==="all")S.count="plastic";if(e.target.checked)m.push(k);else m=m.filter(x=>x!==k);if(PSTREAMS.every(x=>m.includes(x))&&m.every(x=>PSTREAMS.includes(x)))m=["all"]}
  if(!m.length)m=["plastic"];const before=S.mats.length;S.mats=STREAMS.concat("all").filter(x=>m.includes(x));
  if((S.mats.length>1||S.mats[0]==="all")&&before<2&&S.split!=="mt")S.split="mt";
  setMats()});
document.addEventListener("click",e=>{const dd=$("#mats");if(dd.open&&!dd.contains(e.target))dd.open=false});

function yearsUI(){const a=D.span[0],b=D.span[1];const r0=$("#y0"),r1=$("#y1");[r0,r1].forEach(r=>{r.min=D.years[a];r.max=D.years[b];r.step=1});
  r0.value=Y[0];r1.value=LAST;$("#yrs").textContent=Y[0]===LAST?Y[0]:`${Y[0]}–${LAST}`;
  const span=D.years[b]-D.years[a]||1,p=v=>(v-D.years[a])/span*100;$("#yfill").style.left=`calc(${p(Y[0])}% )`;$("#yfill").style.width=`${p(LAST)-p(Y[0])}%`}
function cmpYears(){const opts=Y.map(y=>`<option value="${y}">${y}</option>`).join("");$("#ya").innerHTML=opts;$("#yb").innerHTML=opts;
  if(!Y.includes(S.ya))S.ya=Y.includes(2016)?2016:Y[0];if(!Y.includes(S.yb))S.yb=LAST;if(S.ya===S.yb&&N>1)S.ya=Y[0];$("#ya").value=S.ya;$("#yb").value=S.yb}
function setRange(){const [a,b]=D.span;let y0=S.y0&&D.years.indexOf(S.y0)>=a?D.years.indexOf(S.y0):a,y1=S.y1&&D.years.indexOf(S.y1)>=0&&D.years.indexOf(S.y1)<=b?D.years.indexOf(S.y1):b;
  if(y1<y0)[y0,y1]=[y1,y0];I0=y0;I1=y1;Y=D.years.slice(I0,I1+1);N=Y.length;LAST=Y[N-1]}

function syncUI(){$$(".seg[data-k]").forEach(s=>s.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(String(S[s.dataset.k])===b.dataset.v))));
  for(const k of ["xr","xi","xh","xo"])$("#"+k).setAttribute("aria-pressed",String(S[k]));
  $("#ts").value=S.ts;$("#tr").value=S.tr;$("#tsv").textContent=S.ts?TOPS[S.ts]:"All";$("#trv").textContent=S.tr?TOPS[S.tr]:"All";
  $("#sch").value=S.sch;$("#split").value=S.split;$("#hrows").value=S.hrows;$("#gsort").value=S.gsort;$("#gshow").value=S.gshow;$("#gmin").value=S.gmin;$("#gq").value=S.gq||"";
  $("#csort").value=S.csort;$("#cn").value=S.cn;
  $$(".tabs button").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tab===S.tab)));
  ["overview","glance","compare"].forEach(t=>$("#p-"+t).hidden=t!==S.tab)}
function syncURL(){const u=new URL(location.href),p=u.searchParams;const set=(k,v,d)=>{if(v===d||v===""||v==null)p.delete(k);else p.set(k,v)};
  set("imp",S.imp,"1");set("w",S.mats.join(","),"plastic");set("count",S.count,"plastic");set("v",S.v?"1":"","");set("m",S.m,"t");set("sch",S.sch,"wb");for(const k of ["xr","xi","xh","xo"])set(k,S[k]?"1":"","");
  set("ts",S.ts?TOPS[S.ts]:"","");set("tr",S.tr?TOPS[S.tr]:"","");set("from",S.from.join(","),"");set("to",S.to.join(","),"");
  set("y0",I0!==D.span[0]?Y[0]:"","");set("y1",I1!==D.span[1]?LAST:"","");set("tab",S.tab,"overview");
  set("split",S.split,"rg");set("cgrp",S.cgrp,"c");set("cdir",S.cdir,"in");set("gdir",S.gdir,"out");
  set("ya",S.tab==="compare"?S.ya:"","");set("yb",S.tab==="compare"?S.yb:"","");history.replaceState(null,"",u)}

const run=fns=>{hideTip();for(const f of fns){try{f()}catch(e){console.error(e)}}};
function drawTab(){if(S.tab==="overview")run([chartA,chartB,chartC,chartE,chartW]);else if(S.tab==="glance")run([chartF]);else run([chartG])}
function update(){$("#split").value=S.split;setRange();yearsUI();cmpYears();compute();chips();syncUI();drawTab();syncURL()}

async function setMats(){matUI();const need=S.mats.includes("all")?PSTREAMS:S.mats;
  try{await Promise.all(need.map(load))}catch(e){$("main").insertAdjacentHTML("beforeend",`<div class="empty">The data could not load. Refresh the page to try again.</div>`);return}
  setSpan();options();update()}

// ---------- wiring ----------
$$(".seg[data-k]").forEach(s=>s.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const k=s.dataset.k,v=b.dataset.v;S[k]=k==="v"?+v:v;
  if(k==="count"){matUI();setSpan();update()}else if(["v","m","imp"].includes(k))update();else{syncUI();drawTab();syncURL()}}));
for(const k of ["xr","xi","xh","xo"])$("#"+k).onclick=()=>{S[k]=!S[k];update()};
$("#sch").onchange=e=>{S.sch=e.target.value;options();update()};
$("#ts").oninput=e=>{S.ts=+e.target.value;update()};$("#tr").oninput=e=>{S.tr=+e.target.value;update()};
const yr=()=>{let a=+$("#y0").value,b=+$("#y1").value;if(a>b)[a,b]=[b,a];S.y0=a;S.y1=b;update()};
$("#y0").oninput=yr;$("#y1").oninput=yr;
$("#reset").onclick=()=>{Object.assign(S,{...DEF,from:[],to:[],mats:S.mats,count:S.count,imp:S.imp,tab:S.tab,y0:0,y1:0,ya:0,yb:0,gq:""});update()};
$$(".tabs button").forEach(b=>b.onclick=()=>{S.tab=b.dataset.tab;syncUI();drawTab();syncURL()});
$("#split").onchange=e=>{S.split=e.target.value;compute();chartB();syncURL()};
$("#hrows").oninput=e=>{S.hrows=+e.target.value;chartE()};
$("#gsort").onchange=e=>{S.gsort=e.target.value;chartF()};$("#gshow").oninput=e=>{S.gshow=+e.target.value;chartF()};
$("#gmin").oninput=e=>{S.gmin=+e.target.value;chartF()};$("#gq").oninput=e=>{S.gq=e.target.value;chartF()};
$("#ya").onchange=e=>{S.ya=+e.target.value;chartG();syncURL()};$("#yb").onchange=e=>{S.yb=+e.target.value;chartG();syncURL()};
$("#csort").onchange=e=>{S.csort=e.target.value;chartG()};$("#cn").oninput=e=>{S.cn=+e.target.value;chartG()};
let rt;addEventListener("resize",()=>{clearTimeout(rt);rt=setTimeout(()=>D&&drawTab(),150)});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>D&&drawTab());
S.gq="";
try{const r=await fetch("data/oecd.json",{cache:"no-cache"});if(r.ok)OECD=(await r.json()).members||{}}catch(e){}
await setMats();
if(location.hash){const t=document.getElementById(location.hash.slice(1));if(t)requestAnimationFrame(()=>t.scrollIntoView())}
})();
