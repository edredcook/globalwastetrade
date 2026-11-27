(function(){
"use strict";
var css=function(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()};
var esc=function(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
var tip=document.getElementById("tip");
function showTip(e,html){tip.innerHTML=html;tip.hidden=false;var x=e.clientX+14,y=e.clientY+14;
  var w=tip.offsetWidth,h=tip.offsetHeight;if(x+w>innerWidth-8)x=e.clientX-w-14;if(y+h>innerHeight-8)y=e.clientY-h-14;
  tip.style.left=x+"px";tip.style.top=y+"px"}
function hideTip(){tip.hidden=true}

function fmt(v,unit){
  if(v==null)return "–";
  if(unit==="%")return (Math.round(v*10)/10).toLocaleString("en-GB")+"%";
  if(Math.abs(v)>=1e6)return (v/1e6).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})+" Mt";
  return (v/1e3).toLocaleString("en-GB",{minimumFractionDigits:1,maximumFractionDigits:1})+" kt";
}
function chip(d){
  if(d==null)return "";
  var a=Math.abs(d),cls=a<=0.1?"ok":a<=0.25?"warn":"bad";
  var s=(d>0?"+":d<0?"−":"±")+Math.round(a*100)+"%";
  return '<span class="d '+cls+'" title="Difference from the published figure">'+s+"</span>";
}

fetch("data/validation.json",{cache:"no-cache"}).then(function(r){return r.json()}).then(function(v){
  var S=v.sources;
  function srcLink(k){var s=S[k];return s?'<a href="#ref-'+esc(k)+'">'+esc(s.short)+"</a>":esc(k)}

  // Comparisons table
  var tb=document.querySelector("#checktable tbody"),html="",last=null;
  v.checks.forEach(function(c){
    if(c.group!==last){html+='<tr class="grp"><td colspan="8">'+esc(c.group)+"</td></tr>";last=c.group}
    html+="<tr><td>"+esc(c.label)+"</td><td>"+esc(c.year)+'</td><td class="n">'+fmt(c.published,c.unit)+
      '</td><td class="src">'+srcLink(c.source)+'</td><td class="n">'+fmt(c.x,c.unit)+chip(c.dx)+
      '</td><td class="n">'+fmt(c.m,c.unit)+chip(c.dm)+'</td><td class="n">'+(c.larger!=null?fmt(c.larger,c.unit)+chip(c.dl):"")+
      '</td><td class="why">'+esc(c.why)+"</td></tr>";
  });
  tb.innerHTML=html;

  // Streams table
  document.getElementById("streamyear").textContent=v.streams.year;
  document.querySelector("#streamtable tbody").innerHTML=v.streams.rows.map(function(s){
    return "<tr><td>"+esc(s.label)+'</td><td class="n">'+fmt(s.baci,"t")+'</td><td class="n">'+fmt(s.x,"t")+chip(s.dx)+
      '</td><td class="n">'+fmt(s.m,"t")+chip(s.dm)+'</td><td class="why">'+esc(s.why)+"</td></tr>";
  }).join("");

  // Findings
  document.getElementById("findings").innerHTML=v.findings.map(function(f){
    return '<div class="finding"><h3>'+esc(f.title)+'</h3><span class="st">'+esc(f.status)+"</span><p>"+esc(f.text)+"</p></div>";
  }).join("");

  // Corrections to reported records
  var C=v.corrections;
  if(C&&C.groups.length){
    document.getElementById("corrections").hidden=false;
    var rule={A:"No weight",B:"Partner's weight",D:"From value",E:"Comtrade estimate",F:"Reviewed",C:"Reviewed"};
    document.querySelector("#corrtable tbody").innerHTML=C.groups.map(function(g){
      return "<tr><td>"+esc(g.rule)+" · "+esc(rule[g.rule]||"")+"</td><td>"+esc(g.group)+"</td><td>"+esc(g.years)+'</td><td class="n">'+
        g.records.toLocaleString("en-GB")+'</td><td class="n">'+fmt(g.t_reported,"t")+'</td><td class="n">'+fmt(g.t_used,"t")+
        "</td><td>"+esc(g.decision)+(g.reason?'<span class="use">'+esc(g.reason)+"</span>":"")+"</td><td>"+esc(g.agreed)+"</td></tr>";
    }).join("");
  }

  // Sources (Harvard, alphabetical)
  var keys=Object.keys(S).sort(function(a,b){return S[a].cite.localeCompare(S[b].cite)});
  document.getElementById("refs").innerHTML=keys.map(function(k){var s=S[k];
    return '<li id="ref-'+esc(k)+'">'+s.cite+' Available at: <a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.url)+
      '</a>.<span class="use">'+esc(s.kind)+". "+esc(s.data)+".</span></li>";
  }).join("");

  // CSV
  document.getElementById("dl").addEventListener("click",function(){
    var q=function(x){x=x==null?"":String(x);return /[",\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x};
    var rows=[["group","measure","year","unit","published","source","exporters_reports","importers_reports","larger_report","diff_exporters","diff_importers","diff_larger","finding"]];
    v.checks.forEach(function(c){rows.push([c.group,c.label,c.year,c.unit==="%"?"%":"tonnes",c.published,S[c.source]?S[c.source].short:c.source,c.x,c.m,c.larger,c.dx,c.dm,c.dl,c.why])});
    v.streams.rows.forEach(function(s){rows.push(["Against BACI",s.label,v.streams.year,"tonnes",s.baci,S[v.streams.source].short,s.x,s.m,"",s.dx,s.dm,"",s.why])});
    var blob=new Blob([rows.map(function(r){return r.map(q).join(",")}).join("\n")],{type:"text/csv"});
    var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="globalwastetrade-validation.csv";
    document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500);
  });

  drawWorld(v);
  var redraw;window.addEventListener("resize",function(){clearTimeout(redraw);redraw=setTimeout(function(){drawWorld(v)},150)});
}).catch(function(e){console.error(e)});

function drawWorld(v){
  var S=v.sources,el=document.getElementById("worldchart");el.innerHTML="";
  var W=Math.max(320,el.clientWidth),H=Math.round(Math.min(420,Math.max(260,W*0.42)));
  var m={t:12,r:16,b:28,l:46},w=W-m.l-m.r,h=H-m.t-m.b;
  var yrs=v.world.years,out=css("--out"),inn=css("--in"),ink=css("--ink");
  var pts=v.checks.filter(function(c){return c.group==="World"&&c.unit==="t"});
  var x=d3.scaleLinear().domain(d3.extent(yrs)).range([0,w]);
  var ymax=d3.max(v.world.x.concat(v.world.m,pts.map(function(c){return Math.max(c.published,c.larger||0)})));
  var y=d3.scaleLinear().domain([0,ymax*1.05]).nice().range([h,0]);
  var svg=d3.select(el).append("svg").attr("viewBox","0 0 "+W+" "+H).attr("role","img").attr("aria-label","World trade in plastic waste: the site's figures and published figures");
  var g=svg.append("g").attr("transform","translate("+m.l+","+m.t+")");
  g.append("g").attr("class","grid").call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat("")).call(function(s){s.select(".domain").remove()});
  g.append("g").attr("class","axis").attr("transform","translate(0,"+h+")").call(d3.axisBottom(x).ticks(Math.min(yrs.length,Math.floor(w/48))).tickFormat(d3.format("d")));
  g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(5).tickFormat(function(d){return d/1e6+" Mt"}));
  var line=d3.line().x(function(d,i){return x(yrs[i])}).y(function(d){return y(d)});
  [["x",out,"Exporters' reports"],["m",inn,"Importers' reports"]].forEach(function(s){
    g.append("path").attr("d",line(v.world[s[0]])).attr("fill","none").attr("stroke",s[1]).attr("stroke-width",2.5);
    g.selectAll(null).data(v.world[s[0]]).enter().append("circle").attr("cx",function(d,i){return x(yrs[i])}).attr("cy",function(d){return y(d)})
      .attr("r",3).attr("fill",s[1]).on("mousemove",function(e,d){var i=v.world[s[0]].indexOf(d);showTip(e,"<b>"+yrs[i]+"</b><br>"+s[2]+": "+fmt(d,"t"))}).on("mouseleave",hideTip);
  });
  var srcs=[];pts.forEach(function(c){if(srcs.indexOf(c.source)<0)srcs.push(c.source)});
  var shapes=[d3.symbolDiamond,d3.symbolSquare,d3.symbolTriangle,d3.symbolCross,d3.symbolStar,d3.symbolWye];
  var sym=function(k){return d3.symbol().type(shapes[srcs.indexOf(k)%shapes.length]).size(90)()};
  pts.forEach(function(c){
    var label=c.label+(c.larger!=null?" (larger report per route)":"");
    var t="<b>"+esc(S[c.source].short)+", "+esc(c.year)+"</b><br>"+esc(label)+": "+fmt(c.published,"t");
    if(typeof c.year==="string"){var a=+c.year.slice(0,4),b=+c.year.slice(-4);
      g.append("line").attr("x1",x(a)).attr("x2",x(b)).attr("y1",y(c.published)).attr("y2",y(c.published)).attr("stroke",ink).attr("stroke-width",2).attr("stroke-dasharray","5 4")
        .on("mousemove",function(e){showTip(e,t)}).on("mouseleave",hideTip);
      g.append("path").attr("d",sym(c.source)).attr("transform","translate("+x(b)+","+y(c.published)+")").attr("fill",ink)
        .on("mousemove",function(e){showTip(e,t)}).on("mouseleave",hideTip);
    }else{
      g.append("path").attr("d",sym(c.source)).attr("transform","translate("+x(c.year)+","+y(c.published)+")").attr("fill",ink).attr("stroke",css("--panel")).attr("stroke-width",1)
        .on("mousemove",function(e){showTip(e,t)}).on("mouseleave",hideTip);
    }
  });
  var lg=document.getElementById("worldlegend"),items='<li><svg width="22" height="10"><line x1="0" x2="22" y1="5" y2="5" stroke="'+out+'" stroke-width="2.5"/></svg>This site, exporters\' reports</li>'+
    '<li><svg width="22" height="10"><line x1="0" x2="22" y1="5" y2="5" stroke="'+inn+'" stroke-width="2.5"/></svg>This site, importers\' reports</li>';
  srcs.forEach(function(k){items+='<li><svg width="14" height="14" viewBox="-7 -7 14 14"><path d="'+sym(k)+'" fill="'+ink+'"/></svg>'+esc(S[k].short)+"</li>"});
  lg.innerHTML=items;
}
})();
