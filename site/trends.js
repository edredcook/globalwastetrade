// Trends page: time series for plastic waste and for wastes that carry plastic.
// Reads data/trends.json (HS 3915) or data/trends_<stream>.json. Exporters' and
// importers' reports are drawn separately and never added together.
(async function(){
const $=s=>document.querySelector(s);
const WASTES=[
  ["plastic","Plastic waste and scrap (HS 3915)"],
  ["clothing","Worn clothing (HS 6309)"],
  ["rags","Rags, twine and rope (HS 6310)"],
  ["fibre","Synthetic fibre waste (HS 5505.10)"],
  ["weee","E-waste assemblies and boards (HS 8549.31, 8549.39)"],
  ["weeeo","Other e-waste (HS 8549.91, 8549.99)"],
  ["rdf","Refuse-derived fuel and mixed waste (HS 3825.10)"],
  ["paper","Recovered paper (HS 4707)"]];
const GC={HIC:"--g-hic",UMC:"--g-umc",LMC:"--g-lmc",LIC:"--g-lic",NS:"--g-ns"};
const GN={HIC:"High income",UMC:"Upper-middle income",LMC:"Lower-middle income",LIC:"Low income",NS:"Not classified"};
const VN=["exporters' reports","importers' reports"];
const q=new URLSearchParams(location.search);
let W0=WASTES.some(w=>w[0]===q.get("w"))?q.get("w"):"plastic",V=q.get("v")==="1"?1:0,BMODE="t",T=null,YA=null,YB=null;
const cache={};
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const dark=()=>{const t=document.documentElement.dataset.theme;return t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches};
const fT=v=>v>=1e6?(v/1e6).toFixed(2)+" Mt":v>=1e3?d3.format(",.0f")(v/1e3)+" kt":d3.format(",.0f")(v)+" t";
const fAx=v=>v>=1e6?d3.format("~g")(v/1e6)+" Mt":v>=1e3?d3.format("~g")(v/1e3)+" kt":d3.format("~g")(v)+" t";
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tip=$("#tip");
const showTip=(e,h)=>{tip.innerHTML=h;tip.hidden=false;let x=e.clientX+14,y=e.clientY+14;if(x>innerWidth-270)x=e.clientX-270;if(y>innerHeight-110)y=e.clientY-100;tip.style.left=x+"px";tip.style.top=y+"px"};
const hideTip=()=>tip.hidden=true;

$("#waste").innerHTML=WASTES.map(([k,n])=>`<option value="${k}" ${k===W0?"selected":""}>${n}</option>`).join("");
document.querySelectorAll("#view button").forEach(b=>b.setAttribute("aria-pressed",String(+b.dataset.v===V)));

async function load(k){if(!cache[k]){const r=await fetch(k==="plastic"?"data/trends.json":`data/trends_${k}.json`);if(!r.ok)throw new Error(r.status);cache[k]=await r.json()}return cache[k]}

// Years with any trade in either view, so e-waste starts in 2022.
function span(t){const idx=t.years.map((y,i)=>i).filter(i=>t.world["0"].t[i]>0||t.world["1"].t[i]>0);return idx.length?[idx[0],idx.at(-1)]:[0,t.years.length-1]}
let I0=0,I1=0,Y=[],N=0,LAST=0;
const sl=a=>a.slice(I0,I1+1);
const name=c=>(T.names[c]||[c,"Code "+c])[1];
const events=()=>W0==="plastic"?[[2018,"China ban"],[2021,"Basel amendments"]]:[[2018,"China ban"]];

function frame(id,H,m){const el=$(id);el.innerHTML="";const W=Math.max(300,el.clientWidth||600);
  const svg=d3.select(el).append("svg").attr("viewBox",`0 0 ${W} ${H}`);
  const x=d3.scaleLinear().domain([Y[0],LAST]).range([m.l,W-m.r]);return {svg,W,H,m,x}}
function xticks(W){const step=W<600?4:2;return Y.filter(v=>(v-Y[0])%step===0||v===LAST&&N<6)}
function axes(f,y,fmt){const {svg,W,H,m,x}=f;
  svg.append("g").attr("class","gl").selectAll("line").data(y.ticks(5)).join("line").attr("x1",m.l).attr("x2",W-m.r).attr("y1",d=>y(d)).attr("y2",d=>y(d));
  svg.append("g").attr("class","ax").attr("transform",`translate(0,${H-m.b})`).call(d3.axisBottom(x).tickValues(xticks(W)).tickFormat(d3.format("d")).tickSizeOuter(0));
  svg.append("g").attr("class","ax").attr("transform",`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(fmt).tickSize(0).tickPadding(6)).select(".domain").remove()}
function marks(f){const {svg,H,m,x}=f;const g=svg.append("g").attr("class","note");
  events().forEach(([yr,l],k)=>{if(yr<Y[0]||yr>LAST)return;g.append("line").attr("x1",x(yr)).attr("x2",x(yr)).attr("y1",m.t).attr("y2",H-m.b);
    g.append("text").attr("x",x(yr)+(k?4:-4)).attr("text-anchor",k?"start":"end").attr("y",m.t-6).text(f.W<600?l.split(" ")[0]:l)})}
function hover(f,fn){const {svg,W,H,m,x}=f;const guide=svg.append("line").attr("stroke",css("--muted")).attr("y1",m.t).attr("y2",H-m.b).attr("opacity",0);
  svg.append("rect").attr("x",m.l).attr("y",m.t).attr("width",Math.max(0,W-m.l-m.r)).attr("height",H-m.t-m.b).attr("fill","transparent")
   .on("mousemove",e=>{const [px]=d3.pointer(e);const yr=Math.round(x.invert(px)),i=Y.indexOf(yr);if(i<0)return;guide.attr("x1",x(yr)).attr("x2",x(yr)).attr("opacity",.6);showTip(e,fn(i))})
   .on("mouseleave",()=>{guide.attr("opacity",0);hideTip()})}

function chartA(){const f=frame("#cA",300,{l:58,r:120,t:30,b:28});const {svg,x}=f;
  const w0=sl(T.world["0"].t),w1=sl(T.world["1"].t);
  const y=d3.scaleLinear().domain([0,(d3.max([...w0,...w1])||1)*1.08]).nice().range([300-28,30]);
  axes(f,y,fAx);marks(f);
  [[0,w0,"--out"],[1,w1,"--in"]].forEach(([v,s,c])=>{
    svg.append("path").attr("fill","none").attr("stroke",css(c)).attr("stroke-width",v===V?3:1.6).attr("opacity",v===V?1:.6).attr("stroke-dasharray",v===1?"5 4":null)
      .attr("d",d3.line().x((d,i)=>x(Y[i])).y(d=>y(d)).curve(d3.curveMonotoneX)(s));
    svg.append("circle").attr("cx",x(LAST)).attr("cy",y(s[N-1])).attr("r",3.5).attr("fill",css(c));
    svg.append("text").attr("class","lbl").attr("x",x(LAST)+8).attr("y",y(s[N-1])+(s[N-1]>=(v?w0:w1)[N-1]?-4:12)).attr("fill",css(c)).text(v===0?"Exporters' reports":"Importers' reports")});
  const s=V?w1:w0,pk=d3.maxIndex(s);
  if(N>2)svg.append("text").attr("class","lbl").attr("x",x(Y[pk])).attr("y",y(s[pk])-10).attr("text-anchor","middle").attr("fill",css("--ink")).text("Peak "+fT(s[pk])+", "+Y[pk]);
  hover(f,i=>`<b>${Y[i]}</b><br>Exporters' reports ${fT(w0[i])}<br>Importers' reports ${fT(w1[i])}`)}

const flows=()=>sl(T.income_flows[String(V)]);
function recvByGroup(m){return T.groups.map((g,j)=>d3.sum(m,row=>row[j]))}
function chartB(){const f=frame("#cB",280,{l:56,r:12,t:30,b:28});const {svg,x}=f;const G=T.groups,F=flows();
  const rows=F.map((m,i)=>{const r=recvByGroup(m),t=d3.sum(r);const o={yr:Y[i]};G.forEach((g,j)=>o[g]=BMODE==="s"?(t?r[j]/t:0):r[j]);return o});
  const st=d3.stack().keys(G)(rows);
  const y=d3.scaleLinear().domain([0,BMODE==="s"?1:(d3.max(st.at(-1),d=>d[1])||1)*1.05]).nice().range([280-28,30]);
  axes(f,y,BMODE==="s"?d3.format(".0%"):fAx);
  svg.append("g").selectAll("path").data(st).join("path").attr("fill",d=>css(GC[d.key])).attr("opacity",.85).attr("d",d3.area().x(d=>x(d.data.yr)).y0(d=>y(d[0])).y1(d=>y(d[1])).curve(d3.curveMonotoneX));
  marks(f);
  hover(f,i=>{const r=recvByGroup(F[i]),t=d3.sum(r)||1;return `<b>${Y[i]}</b> · ${VN[V]}<br>`+G.map((g,j)=>r[j]?`${GN[g]}: ${fT(r[j])} (${d3.format(".0%")(r[j]/t)})`:"").filter(Boolean).join("<br>")});
  $("#lB").innerHTML=G.map(g=>`<span><i style="background:var(${GC[g]})"></i>${GN[g]}</span>`).join("")}

function chartC(){const f=frame("#cC",280,{l:56,r:48,t:30,b:28});const {svg,x,W,H,m}=f;
  const hl=flows().map(mt=>{const r=mt[0];return [r[1]+r[2]+r[3],d3.sum(r)]});
  const y=d3.scaleLinear().domain([0,(d3.max(hl,d=>d[0])||1)*1.1]).nice().range([H-m.b,m.t]),y2=d3.scaleLinear().domain([0,1]).range([H-m.b,m.t]);
  axes(f,y,fAx);
  svg.append("g").attr("class","ax").attr("transform",`translate(${W-m.r},0)`).call(d3.axisRight(y2).ticks(4).tickFormat(d3.format(".0%")).tickSize(0).tickPadding(6)).select(".domain").remove();
  const bw=Math.min(14,(W-m.l-m.r)/Math.max(N,2)*.6);
  svg.append("g").selectAll("rect").data(hl).join("rect").attr("x",(d,i)=>x(Y[i])-bw/2).attr("width",bw).attr("y",d=>y(d[0])).attr("height",d=>y(0)-y(d[0])).attr("fill",css("--out")).attr("opacity",.8).attr("rx",2);
  const sh=d=>d[1]?d[0]/d[1]:0;
  svg.append("path").attr("fill","none").attr("stroke",css("--ink")).attr("stroke-width",2).attr("d",d3.line().x((d,i)=>x(Y[i])).y(d=>y2(sh(d))).curve(d3.curveMonotoneX)(hl));
  svg.append("g").selectAll("circle").data(hl).join("circle").attr("cx",(d,i)=>x(Y[i])).attr("cy",d=>y2(sh(d))).attr("r",2.5).attr("fill",css("--ink"));
  marks(f);
  hover(f,i=>`<b>${Y[i]}</b> · ${VN[V]}<br>To middle- and low-income countries: ${fT(hl[i][0])}<br>Share of high-income countries' exports: ${d3.format(".0%")(sh(hl[i]))}`);
  $("#lC").innerHTML=`<span><i style="background:var(--out)"></i>Tonnes (left)</span><span><i style="background:var(--ink);height:3px"></i>Share of high-income countries' exports (right)</span>`}

// Heatmap ramp: pale sand to teal to deep navy in light; the reverse journey in dark.
const RAMP_L=["#f6efd9","#cfe6c9","#7cc4b9","#2a8f9a","#1d5878","#1b2b4f"];
const RAMP_D=["#16222b","#1f4552","#22737c","#3aa59a","#93d3a8","#f1eab0"];
function chartE(){const el=$("#cE");el.innerHTML="";const ramp=dark()?RAMP_D:RAMP_L;
  const all=Object.entries(T.countries).map(([c,v])=>({c,s:sl(v[String(V)]?.in_t||[])})).filter(d=>d.s.length);
  const top=all.sort((a,b)=>d3.sum(b.s)-d3.sum(a.s)).slice(0,20).filter(d=>d3.sum(d.s)>0);
  if(!top.length){el.innerHTML=`<div class="empty">No trade reported.</div>`;$("#lE").innerHTML="";return}
  const m={l:118,r:8,t:6,b:24},cw=Math.max(18,Math.min(30,((el.clientWidth||560)-m.l-m.r)/N)),ch=18,W=m.l+cw*N+m.r,H=m.t+ch*top.length+m.b;
  const svg=d3.select(el).append("svg").attr("viewBox",`0 0 ${W} ${H}`).style("min-width",Math.min(W,m.l+18*N+m.r)+"px");
  const mx=d3.max(top,d=>d3.max(d.s))||1,lo=Math.max(1,mx/2000);
  const col=d3.scaleSequentialLog(d3.interpolateRgbBasis(ramp)).domain([lo,mx]).clamp(true);
  top.forEach((d,r)=>{svg.append("text").attr("x",m.l-8).attr("y",m.t+r*ch+ch/2+4).attr("text-anchor","end").attr("class","lbl").attr("fill",css("--ink")).style("font-weight",500).text(name(d.c));
    svg.append("g").selectAll("rect").data(d.s.map((v,i)=>({v,i}))).join("rect").attr("x",p=>m.l+p.i*cw+1).attr("y",m.t+r*ch+1).attr("width",cw-2).attr("height",ch-2).attr("rx",2)
      .attr("fill",p=>p.v>0?col(p.v):css("--raise")).on("mousemove",(e,p)=>showTip(e,`<b>${esc(name(d.c))}</b>, ${Y[p.i]}<br>${fT(p.v)} received (${VN[V]})`)).on("mouseleave",hideTip)});
  Y.forEach((yr,i)=>{if((yr-Y[0])%2===0||N<8)svg.append("text").attr("x",m.l+i*cw+cw/2).attr("y",H-8).attr("text-anchor","middle").attr("class","ax").append("tspan").attr("fill",css("--muted")).style("font-family","var(--mono)").style("font-size","11px").text("’"+String(yr).slice(2))});
  $("#lE").innerHTML=`<span>${fT(lo)}</span><span class="ramp" style="background:linear-gradient(90deg,${ramp.join(",")})"></span><span>${fT(mx)}</span>`}

function chartF(){const el=$("#cF");el.innerHTML="";
  const top=Object.entries(T.countries).map(([c,v])=>({c,s:sl(v[String(V)]?.out_t||[])})).filter(d=>d.s.length&&!/nes$|^Areas|Special|Free Zones/.test(name(d.c)))
    .sort((a,b)=>d3.sum(b.s)-d3.sum(a.s)).slice(0,12).filter(d=>d3.sum(d.s)>0);
  if(!top.length){el.innerHTML=`<div class="empty">No trade reported.</div>`;return}
  for(const d of top){const s=d.s,pk=d3.maxIndex(s);const box=document.createElement("div");box.className="m";
    box.innerHTML=`<b>${esc(name(d.c))}</b><small>Peak ${fT(s[pk])} in ${Y[pk]}</small><small>${LAST}: ${fT(s[N-1])}</small>`;el.appendChild(box);
    const W=150,H=46,svg=d3.select(box).append("svg").attr("viewBox",`0 0 ${W} ${H}`);
    const x=d3.scaleLinear().domain([Y[0],Math.max(LAST,Y[0]+1)]).range([2,W-4]),y=d3.scaleLinear().domain([0,s[pk]||1]).range([H-2,5]);
    svg.append("path").attr("fill",css("--out")).attr("opacity",.18).attr("d",d3.area().x((v,i)=>x(Y[i])).y0(H-2).y1(v=>y(v)).curve(d3.curveMonotoneX)(s));
    svg.append("path").attr("fill","none").attr("stroke",css("--out")).attr("stroke-width",1.8).attr("d",d3.line().x((v,i)=>x(Y[i])).y(v=>y(v)).curve(d3.curveMonotoneX)(s));
    svg.append("circle").attr("cx",x(Y[pk])).attr("cy",y(s[pk])).attr("r",3).attr("fill",css("--out"));
    svg.append("circle").attr("cx",x(LAST)).attr("cy",y(s[N-1])).attr("r",2.5).attr("fill",css("--ink"));
    svg.append("rect").attr("width",W).attr("height",H).attr("fill","transparent").on("mousemove",e=>{const yr=Math.round(x.invert(d3.pointer(e)[0])),i=Y.indexOf(yr);if(i>=0)showTip(e,`<b>${esc(name(d.c))}</b>, ${yr}<br>${fT(s[i])} sent (${VN[V]})`)}).on("mouseleave",hideTip)}}

function chartG(){const el=$("#cG");el.innerHTML="";const ia=Y.indexOf(YA),ib=Y.indexOf(YB);
  const pick=new Map();[ia,ib].forEach(i=>Object.entries(T.countries).map(([c,v])=>({c,s:sl(v[String(V)]?.in_t||[])})).filter(d=>d.s.length).sort((a,b)=>b.s[i]-a.s[i]).slice(0,8).forEach(d=>pick.set(d.c,d)));
  const rows=[...pick.values()].map(d=>({c:d.c,a:d.s[ia]||0,b:d.s[ib]||0})).filter(r=>r.a||r.b);
  if(!rows.length){el.innerHTML=`<div class="empty">No trade reported in these years.</div>`;return}
  const W=Math.max(320,el.clientWidth||700),narrow=W<600,H=Math.max(240,rows.length*24+60),m={l:narrow?118:180,r:narrow?118:180,t:28,b:12};
  const svg=d3.select(el).append("svg").attr("viewBox",`0 0 ${W} ${H}`);
  const y=d3.scaleSymlog().constant(Math.max(1,d3.max(rows,r=>Math.max(r.a,r.b))/500)).domain([0,d3.max(rows,r=>Math.max(r.a,r.b))]).range([H-m.b,m.t]);
  const xa=m.l,xb=W-m.r;
  [[xa,YA],[xb,YB]].forEach(([xx,yr])=>{svg.append("text").attr("x",xx).attr("y",14).attr("text-anchor","middle").attr("class","lbl").attr("fill",css("--muted")).text(yr);
    svg.append("line").attr("x1",xx).attr("x2",xx).attr("y1",m.t-6).attr("y2",H-m.b).attr("stroke",css("--grid"))});
  const place=vals=>{const s=vals.slice().sort((p,q)=>p.y-q.y);for(let k=1;k<s.length;k++)if(s[k].y-s[k-1].y<14)s[k].y=s[k-1].y+14;const over=s.length?s.at(-1).y-(H-m.b+4):0;if(over>0)s.forEach(v=>v.y-=over);return new Map(s.map(v=>[v.k,v.y]))};
  const la=place(rows.map(r=>({k:r.c,y:y(r.a)}))),lb=place(rows.map(r=>({k:r.c,y:y(r.b)})));
  for(const r of rows){const c=css(r.b>=r.a?"--in":"--out");const nm=name(r.c);
    svg.append("line").attr("x1",xa).attr("x2",xb).attr("y1",y(r.a)).attr("y2",y(r.b)).attr("stroke",c).attr("stroke-width",2).attr("opacity",.85)
      .on("mousemove",e=>showTip(e,`<b>${esc(nm)}</b> · ${VN[V]}<br>${YA}: ${fT(r.a)}<br>${YB}: ${fT(r.b)}`)).on("mouseleave",hideTip);
    [[xa,r.a],[xb,r.b]].forEach(([xx,v])=>svg.append("circle").attr("cx",xx).attr("cy",y(v)).attr("r",3.5).attr("fill",c));
    svg.append("text").attr("class","lbl").attr("x",xa-8).attr("y",la.get(r.c)+4).attr("text-anchor","end").attr("fill",css("--ink")).text(narrow?`${fT(r.a)} ${nm.slice(0,12)}`:`${nm} ${fT(r.a)}`);
    svg.append("text").attr("class","lbl").attr("x",xb+8).attr("y",lb.get(r.c)+4).attr("fill",c).text(narrow?`${fT(r.b)} ${nm.slice(0,12)}`:`${fT(r.b)} ${nm}`)}}

function yearPickers(){const opts=Y.map(y=>`<option value="${y}">${y}</option>`).join("");$("#ya").innerHTML=opts;$("#yb").innerHTML=opts;
  if(!Y.includes(YA))YA=Y.includes(2016)?2016:Y[0];if(!Y.includes(YB))YB=LAST;if(YA===YB)YA=Y[0];$("#ya").value=YA;$("#yb").value=YB}
function draw(){hideTip();chartA();chartB();chartC();chartE();chartF();chartG()}
async function setWaste(k){try{T=await load(k)}catch(e){$("#grid").innerHTML=`<div class="empty">The data could not load. Refresh the page to try again.</div>`;return}
  W0=k;[I0,I1]=span(T);Y=sl(T.years);N=Y.length;LAST=Y[N-1];yearPickers();draw();
  const u=new URL(location.href);if(k==="plastic")u.searchParams.delete("w");else u.searchParams.set("w",k);if(V)u.searchParams.set("v","1");else u.searchParams.delete("v");history.replaceState(null,"",u)}

$("#waste").onchange=e=>setWaste(e.target.value);
$("#view").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;V=+b.dataset.v;document.querySelectorAll("#view button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));setWaste(W0)});
$("#bmode").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;BMODE=b.dataset.v;document.querySelectorAll("#bmode button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));chartB()});
$("#ya").onchange=e=>{YA=+e.target.value;chartG()};$("#yb").onchange=e=>{YB=+e.target.value;chartG()};
let rt;addEventListener("resize",()=>{clearTimeout(rt);rt=setTimeout(()=>T&&draw(),150)});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>T&&draw());
await setWaste(W0);
})();
