"""Build site/data/stories.json for the Home, Plastics and Tyres pages.

Reads the per-stream flow files written by build_site_data.py (site/data/flows*.json and the
country files) and pre-computes every series those pages draw, for each reporter type:
"0" exporters' reports, "1" importers' reports and "2" resolved (the mean of both reports on a
route where both exist, otherwise whichever exists). Exporter and importer figures are never added
together. Run after build_site_data.py; the monthly refresh workflow does this.

    python pipeline/build_stories.py
"""
import datetime
import glob
import json
import os

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site", "data") + os.sep
OUT = D + "stories.json"

# Plastic share of each stream, as the Explorer's defaults (each one's source is named in the
# Explorer's Plastics pop-outs and on the About page, #embedded-plastic).
F = {'flows': 1, 'clothing': .65, 'rags': .65, 'fibre': 1, 'weee': .247, 'weeeo': .247, 'rdf': .3325,
     'tyres': 1, 'rubber': 1, 'hardrubber': 1, 'paper': .02}
GROUP = {'flows': 'Plastic scrap', 'clothing': 'Textiles', 'rags': 'Textiles', 'fibre': 'Textiles',
         'weee': 'E-waste', 'weeeo': 'E-waste', 'rdf': 'Refuse-derived fuel', 'tyres': 'Rubber and tyres',
         'rubber': 'Rubber and tyres', 'hardrubber': 'Rubber and tyres', 'paper': 'Paper and card'}


def L(s):
    return json.load(open(D + (s if s == 'flows' else 'flows_' + s) + '.json'))


# Stage 1: totals by material, paper imports of China and India, plastic destinations and routes
def stage1(store):
    pl=L('flows'); ys=pl['years']; n=len(ys)
    codes=pl['codes']; inc=pl['inc']
    def rows(d,v,i):
        for part in ('flows','imputed'):
            A=d.get(part,{}).get(v,[[]]*n)[i]
            for k in range(0,len(A),4): yield d['codes'][A[k]],d['codes'][A[k+1]],A[k+2],A[k+3]
    DEST={'156':'China','344':'Hong Kong','458':'SEA','704':'SEA','360':'SEA','764':'SEA','792':'Turkey','699':'India'}
    out={'years':ys,'modelled':[2026],'part':[2025]}
    dest={};hic={};routes={}
    cinc={}
    for c,s in zip(pl['codes'],pl['inc']): cinc[c]=s
    for v in '01':
        dd={k:[0]*n for k in ['China','Hong Kong','SEA','Turkey','India','Other']}
        hh=[[0,0,0,0] for _ in range(n)]
        rr=[]
        for i in range(n):
            agg={}
            for ex,rc,t,u in rows(pl,v,i):
                dd[DEST.get(rc,'Other')][i]+=t
                if cinc.get(ex,'N'*n)[i]=='H':
                    g='HUML'.find(cinc.get(rc,'N'*n)[i])
                    if g>=0: hh[i][g]+=t
                agg[(ex,rc)]=agg.get((ex,rc),0)+t
            top=sorted(agg.items(),key=lambda x:-x[1])[:220]
            rr.append([[a,b,round(t)] for (a,b),t in top])
        dest[v]={k:[round(x) for x in s] for k,s in dd.items()}
        hic[v]=[[round(x) for x in r] for r in hh]; routes[v]=rr
    out['dest']=dest; out['hic']=hic; out['routes']=routes
    G={'Metals':['fe','ss','al','cu','pb','zn','ni','sn','pm','om'],'Paper and card':['pkraft','pbleach','pmech','pmixed'],
    'Textiles':['clothing','rags','fibre','tartif','tcotton','twool','tsilk'],'Plastic':['flows'],'Rubber and tyres':['tyres','rubber','hardrubber'],'E-waste':['weee','weeeo','ebatt','eprec']}
    mat={'0':{},'1':{}}
    paper={}
    cache={}
    for g,ss in G.items():
        for v in '01':
            T=[0]*n;U=[0]*n
            for s in ss:
                d=cache.setdefault(s,L(s))
                for i in range(n):
                    for ex,rc,t,u in rows(d,v,i): T[i]+=t;U[i]+=u
            mat[v][g]={'t':[round(x) for x in T],'usd':[round(x*1000) for x in U]}
    out['materials']=mat
    for v in '01':
        P={'China':[0]*n,'India':[0]*n}
        for s in G['Paper and card']:
            d=cache[s]
            for i in range(n):
                for ex,rc,t,u in rows(d,v,i):
                    if rc=='156':P['China'][i]+=t
                    if rc=='699':P['India'][i]+=t
        paper[v]={k:[round(x) for x in s] for k,s in P.items()}
    out['paper']=paper
    out['world_trade_2023']={'0':22.79e12,'1':23.27e12}
    # country table
    need={c for v in '01' for yr in routes[v] for a,b,t in yr for c in (a,b)}
    ct={}
    for f in sorted(glob.glob(D+'plastic_20*.json')):
        for c,vv in json.load(open(f))['countries'].items():
            if c in need: ct[c]=vv
    cty={}
    for c in sorted(need):
        vv=ct.get(c); 
        if not vv: print('missing',c); continue
        cty[c]={'n':vv[1],'m':vv[3],'ll':vv[4:6] if len(vv)>4 else None,'inc':cinc.get(c,'N'*n)}
    out['countries']=cty
    store.update(out)


def stage2(store):
    base=L('flows'); ys=base['years']; n=len(ys)
    inc={}
    DEST={'156':'China','344':'Hong Kong','458':'SEA','704':'SEA','360':'SEA','764':'SEA','792':'Turkey','699':'India'}
    out={'years':ys}
    streams={}; destAll={}; routesAll={}; recv={}; hicAll={}; tyresIndia={}; indiaFrom={}; hicNoHK={}; csel={}
    cache={s:L(s) for s in F}
    for s,d in cache.items():
        for c,ii in zip(d['codes'],d['inc']): inc[c]=ii
    names={}
    for s,d in cache.items():
        for c,nm in zip(d['codes'],d['names']): names[c]=nm[1]
    def rows(d,v,i):
        for part in ('flows','imputed'):
            A=d.get(part,{}).get(v,[[]]*n)[i]
            for k in range(0,len(A),4): yield d['codes'][A[k]],d['codes'][A[k+1]],A[k+2],A[k+3]
    for v in '01':
        st={}; dd={k:[0]*n for k in ['China','Hong Kong','SEA','Turkey','India','Other']}
        rr=[]; rc_tot=[{} for _ in range(n)]; hh={g:[[0,0,0,0] for _ in range(n)] for g in sorted(set(GROUP.values()))}; hx={g:[[0,0,0,0] for _ in range(n)] for g in sorted(set(GROUP.values()))}; cs={}
        ti=[0]*n; tworld=[0]*n; ifrom=[{} for _ in range(n)]
        for i in range(n):
            agg={}
            for s,f in F.items():
                g=GROUP[s]; st.setdefault(g,[0]*n)
                for ex,rc,t,u in rows(cache[s],v,i):
                    p=t*f; st[g][i]+=p
                    dd[DEST.get(rc,'Other')][i]+=p
                    agg[(ex,rc)]=agg.get((ex,rc),0)+p
                    rc_tot[i][rc]=rc_tot[i].get(rc,0)+p
                    if inc.get(ex,'N'*n)[i]=='H':
                        gi='HUML'.find(inc.get(rc,'N'*n)[i])
                        if gi>=0:
                            hh[g][i][gi]+=p
                            if ex!='344': hx[g][i][gi]+=p
                    cs.setdefault(rc,{}).setdefault(g,[0]*n)[i]+=p
                    if s in('tyres','rubber','hardrubber'):
                        tworld[i]+=t
                        if rc=='699': ti[i]+=t; ifrom[i][ex]=ifrom[i].get(ex,0)+t
            top=sorted(agg.items(),key=lambda x:-x[1])[:220]
            rr.append([[a,b,round(t)] for (a,b),t in top])
        streams[v]={k:[round(x) for x in s] for k,s in st.items()}
        destAll[v]={k:[round(x) for x in s] for k,s in dd.items()}
        routesAll[v]=rr
        # receivers: top 12 middle/low income receivers each year
        recv[v]=[sorted([[c,round(t)] for c,t in rc_tot[i].items() if inc.get(c,'N'*n)[i] in 'UML'],key=lambda x:-x[1])[:15] for i in range(n)]
        hicAll[v]={g:[[round(x) for x in r] for r in m] for g,m in hh.items()}
        hicNoHK[v]={g:[[round(x) for x in r] for r in m] for g,m in hx.items()}
        top=set(c for i in range(n) for c,_ in recv[v][i][:12])|{'156','344','792','458','704','360','764','699','586'}
        csel[v]={c:{g:[round(x) for x in ser] for g,ser in cs[c].items()} for c in sorted(top) if c in cs}
        tyresIndia[v]={'india':[round(x) for x in ti],'world':[round(x) for x in tworld]}
        indiaFrom[v]=[sorted([[c,round(t)] for c,t in ifrom[i].items()],key=lambda x:-x[1])[:8] for i in range(n)]
    out.update(hicNoHK=hicNoHK,csel=csel,streams=streams,destAll=destAll,routesAll=routesAll,recv=recv,hicAll=hicAll,tyresIndia=tyresIndia,indiaFrom=indiaFrom)
    need={c for v in '01' for yr in routesAll[v] for r in yr for c in r[:2]}|{c for v in '01' for yr in recv[v] for c,_ in yr}|{c for v in '01' for yr in indiaFrom[v] for c,_ in yr}|{c for v in '01' for c in csel[v]}
    d1=store
    cty=d1['countries']
    ct={}
    for fpath in sorted(glob.glob(D+'plastic_20*.json'))+sorted(glob.glob(D+'textiles_20*.json')):
        for c,vv in json.load(open(fpath))['countries'].items(): ct[c]=vv
    for c in sorted(need):
        if c in cty: continue
        vv=ct.get(c)
        if not vv: print('missing',c,names.get(c)); continue
        cty[c]={'n':vv[1],'m':vv[3],'ll':vv[4:6] if len(vv)>4 else None,'inc':inc.get(c,'N'*n)}
    d1['countries']=cty; d1.update(out)


def stage3(store):
    d=store; n=len(d['years'])
    cache={}
    def resolved(s,i):
        f=cache.setdefault(s,L(s)); out={}
        for v in '01':
            for part in ('flows','imputed'):
                A=f.get(part,{}).get(v,[[]]*n)[i]
                for k in range(0,len(A),4):
                    key=(f['codes'][A[k]],f['codes'][A[k+1]])
                    r=out.setdefault(key,[0,0,0,0]); r[int(v)]+=A[k+2]; r[2+int(v)]+=A[k+3]
        for key,r in out.items():
            t=(r[0]+r[1])/2 if r[0]>0 and r[1]>0 else max(r[0],r[1])
            u=(r[2]+r[3])/2 if r[2]>0 and r[3]>0 else max(r[2],r[3])
            yield key[0],key[1],t,u
    G={'Metals':['fe','ss','al','cu','pb','zn','ni','sn','pm','om'],'Paper and card':['pkraft','pbleach','pmech','pmixed'],
    'Textiles':['clothing','rags','fibre','tartif','tcotton','twool','tsilk'],'Plastic':['flows'],'Rubber and tyres':['tyres','rubber','hardrubber'],'E-waste':['weee','weeeo','ebatt','eprec']}
    mat={}
    for g,ss in G.items():
        T=[0]*n;U=[0]*n
        for s in ss:
            for i in range(n):
                for ex,rc,t,u in resolved(s,i): T[i]+=t;U[i]+=u
        mat[g]={'t':[round(x) for x in T],'usd':[round(x*1000) for x in U]}
    d['materials']['2']=mat
    DEST={'156':'China','344':'Hong Kong','458':'SEA','704':'SEA','360':'SEA','764':'SEA','792':'Turkey','699':'India'}
    st={}; da={k:[0]*n for k in ['China','Hong Kong','SEA','Turkey','India','Other']}; ds={k:[0]*n for k in da}
    for s,f in F.items():
        g=GROUP[s]; st.setdefault(g,[0]*n)
        for i in range(n):
            for ex,rc,t,u in resolved(s,i):
                st[g][i]+=t*f; da[DEST.get(rc,'Other')][i]+=t*f
                if s=='flows': ds[DEST.get(rc,'Other')][i]+=t
    d['streams']['2']={k:[round(x) for x in v] for k,v in st.items()}
    d['destAll']['2']={k:[round(x) for x in v] for k,v in da.items()}
    d['dest']['2']={k:[round(x) for x in v] for k,v in ds.items()}


def stage4(store):
    # Resolved view ("2") for the Plastics page datasets: per route, mean of both reports where both exist, else whichever exists.
    cache={s:json.load(open(D+('flows.json' if s=='flows' else f'flows_{s}.json'))) for s in F}
    ys=cache['flows']['years']; n=len(ys)
    inc={}
    for d in cache.values():
        for c,ii in zip(d['codes'],d['inc']): inc[c]=ii
    def view(d,v,i):
        out={}
        for part in ('flows','imputed'):
            A=d.get(part,{}).get(v,[[]]*n)[i]
            for k in range(0,len(A),4):
                key=(d['codes'][A[k]],d['codes'][A[k+1]]); out[key]=out.get(key,0)+A[k+2]
        return out
    def resolved(d,i):
        x=view(d,'0',i); m=view(d,'1',i)
        return {k:((x[k]+m[k])/2 if k in x and k in m else x.get(k,m.get(k))) for k in sorted(set(x)|set(m))}
    d1=store
    hh={g:[[0,0,0,0] for _ in range(n)] for g in sorted(set(GROUP.values()))}; hx={g:[[0,0,0,0] for _ in range(n)] for g in sorted(set(GROUP.values()))}
    cs={}; ti=[0]*n; tworld=[0]*n; ifrom=[{} for _ in range(n)]; rr=[]; rs=[]
    for i in range(n):
        agg={}; sc={}
        for s,f in F.items():
            g=GROUP[s]
            for (ex,rc),t in resolved(cache[s],i).items():
                p=t*f
                agg[(ex,rc)]=agg.get((ex,rc),0)+p
                if s=='flows': sc[(ex,rc)]=sc.get((ex,rc),0)+p
                if inc.get(ex,'N'*n)[i]=='H':
                    gi='HUML'.find(inc.get(rc,'N'*n)[i])
                    if gi>=0:
                        hh[g][i][gi]+=p
                        if ex!='344': hx[g][i][gi]+=p
                cs.setdefault(rc,{}).setdefault(g,[0]*n)[i]+=p
                if s in('tyres','rubber','hardrubber'):
                    tworld[i]+=t
                    if rc=='699': ti[i]+=t; ifrom[i][ex]=ifrom[i].get(ex,0)+t
        rr.append([[a,b,round(t)] for (a,b),t in sorted(agg.items(),key=lambda x:-x[1])[:220]])
        rs.append([[a,b,round(t)] for (a,b),t in sorted(sc.items(),key=lambda x:-x[1])[:220]])
    d1['routesAll']['2']=rr; d1['routes']['2']=rs
    d1['hicAll']['2']={g:[[round(x) for x in r] for r in m] for g,m in hh.items()}
    d1['hicNoHK']['2']={g:[[round(x) for x in r] for r in m] for g,m in hx.items()}
    d1['csel']['2']={c:{g:[round(x) for x in ser] for g,ser in cs[c].items()} for c in d1['csel']['0'] if c in cs}
    d1['tyresIndia']['2']={'india':[round(x) for x in ti],'world':[round(x) for x in tworld]}
    d1['indiaFrom']['2']=[sorted([[c,round(t)] for c,t in ifrom[i].items()],key=lambda x:-x[1])[:8] for i in range(n)]
    # countries needed for map routes/labels
    names={}
    for d in cache.values():
        for c,nm in zip(d['codes'],d['names']): names[c]=nm[1]
    miss={c for yr in rr+rs for a,b,t in yr for c in (a,b)}|{c for yr in d1['indiaFrom']['2'] for c,_ in yr}
    miss-=set(d1['countries'])


def stage5(store):
    # HIC exporter -> material -> recipient income group, per view and year, for the three-column Sankey.
    cache={s:json.load(open(D+('flows.json' if s=='flows' else f'flows_{s}.json'))) for s in F}
    ys=cache['flows']['years']; n=len(ys)
    inc={}; names={}
    for d in cache.values():
        for c,ii in zip(d['codes'],d['inc']): inc[c]=ii
        for c,nm in zip(d['codes'],d['names']): names[c]=nm
    def view(d,v,i):
        out={}
        for part in ('flows','imputed'):
            A=d.get(part,{}).get(v,[[]]*n)[i]
            for k in range(0,len(A),4):
                key=(d['codes'][A[k]],d['codes'][A[k+1]]); out[key]=out.get(key,0)+A[k+2]
        return out
    def rows(s,v,i):
        d=cache[s]
        if v!='2': return view(d,v,i)
        x=view(d,'0',i); m=view(d,'1',i)
        return {k:((x[k]+m[k])/2 if k in x and k in m else x.get(k,m.get(k))) for k in sorted(set(x)|set(m))}
    cube={v:[{} for _ in range(n)] for v in '012'}   # (ex, material, gi) -> t
    tot={}
    for v in '012':
        for i in range(n):
            C=cube[v][i]
            for s,f in F.items():
                for (ex,rc),t in rows(s,v,i).items():
                    if inc.get(ex,'N'*n)[i]!='H': continue
                    gi='HUML'.find(inc.get(rc,'N'*n)[i])
                    if gi<0: continue
                    k=(ex,GROUP[s],gi); C[k]=C.get(k,0)+t*f
                    if v=='2': tot[ex]=tot.get(ex,0)+t*f
    top=[c for c,_ in sorted(tot.items(),key=lambda x:-x[1])[:10]]
    if '344' not in top: top.append('344')
    out={}
    for v in '012':
        out[v]=[]
        for i in range(n):
            agg={}
            for (ex,m,gi),t in cube[v][i].items():
                e=ex if ex in top else 'other'; k=(e,m,gi); agg[k]=agg.get(k,0)+t
            out[v].append([[e,m,gi,round(t)] for (e,m,gi),t in agg.items() if t>=500])
    d1=store
    d1['hicX']={'top':top,'names':{c:[names[c][0],names[c][1]] for c in top},'data':out}


def stage6(store):
    # Destination chart: named destinations + EU-27 + rest split by the receiver's income group that year.
    cache={s:L(s) for s in F}; n=len(cache['flows']['years'])
    inc={}
    for d in cache.values():
        for c,ii in zip(d['codes'],d['inc']): inc[c]=ii
    DEST={'156':'China','344':'Hong Kong','458':'SEA','704':'SEA','360':'SEA','764':'SEA','792':'Turkey','699':'India','586':'Pakistan'}
    EU={'40','56','100','191','196','203','208','233','246','251','276','300','348','372','380','428','440','442','470','528','616','620','642','703','705','724','752'}
    KEYS=['China','Hong Kong','SEA','Turkey','India','Pakistan','EU','OtherM','OtherH']
    def view(f,v,i):
        out={}
        for part in ('flows','imputed'):
            A=f.get(part,{}).get(v,[[]]*n)[i]
            for k in range(0,len(A),4):
                key=(f['codes'][A[k]],f['codes'][A[k+1]]); out[key]=out.get(key,0)+A[k+2]
        return out
    def rows(f,v,i):
        if v!='2': return view(f,v,i)
        x=view(f,'0',i); m=view(f,'1',i)
        return {k:((x[k]+m[k])/2 if k in x and k in m else x.get(k,m.get(k))) for k in sorted(set(x)|set(m))}
    def key(rc,i):
        if rc in DEST: return DEST[rc]
        if rc in EU: return 'EU'
        return 'OtherM' if inc.get(rc,'N'*n)[i] in 'UML' else 'OtherH'
    d=store; unc=[0]*n
    for v in '012':
        da={k:[0]*n for k in KEYS}; ds={k:[0]*n for k in KEYS}
        for s,f in F.items():
            for i in range(n):
                for (ex,rc),t in rows(cache[s],v,i).items():
                    k=key(rc,i); da[k][i]+=t*f
                    if s=='flows': ds[k][i]+=t
                    if v=='2' and k=='OtherH' and inc.get(rc,'N'*n)[i]!='H': unc[i]+=t*f
        d['destAll'][v]={k:[round(x) for x in s] for k,s in da.items()}
        d['dest'][v]={k:[round(x) for x in s] for k,s in ds.items()}


def stage7(store):
    # Race chart data: every receiver's plastic by material for each view; keep the top 20 middle- and low-income receivers of any year,
    # plus world, middle-/low-income and high-income totals so the chart can show the whole world.
    cache={s:json.load(open(D+('flows.json' if s=='flows' else f'flows_{s}.json'))) for s in F}
    n=len(cache['flows']['years']); inc={}; names={}
    for d in cache.values():
        for c,ii,nm in zip(d['codes'],d['inc'],d['names']): inc[c]=ii; names[c]=nm
    def view(d,v,i):
        out={}
        for part in ('flows','imputed'):
            A=d.get(part,{}).get(v,[[]]*n)[i]
            for k in range(0,len(A),4):
                key=(d['codes'][A[k]],d['codes'][A[k+1]]); out[key]=out.get(key,0)+A[k+2]
        return out
    def rows(d,v,i):
        if v!='2': return view(d,v,i)
        x=view(d,'0',i); m=view(d,'1',i)
        return {k:((x[k]+m[k])/2 if k in x and k in m else x.get(k,m.get(k))) for k in sorted(set(x)|set(m))}
    d1=store; CS={}; TOT={}; keep=set()
    for v in '012':
        cs={}; tot={'world':[0]*n,'mlic':[0]*n,'hic':[0]*n}
        for s,f in F.items():
            g=GROUP[s]
            for i in range(n):
                for (ex,rc),t in rows(cache[s],v,i).items():
                    p=t*f; cs.setdefault(rc,{}).setdefault(g,[0]*n)[i]+=p
                    tot['world'][i]+=p; ig=inc.get(rc,'N'*n)[i]
                    if ig in 'UML': tot['mlic'][i]+=p
                    elif ig=='H': tot['hic'][i]+=p
        for i in range(n):
            ml=[c for c in cs if inc.get(c,'N'*n)[i] in 'UML']
            keep|=set(sorted(ml,key=lambda c:-sum(s[i] for s in cs[c].values()))[:20])
        CS[v]=cs; TOT[v]={k:[round(x) for x in a] for k,a in tot.items()}
    for v in '012':
        d1['csel'][v]={c:{g:[round(x) for x in ser] for g,ser in CS[v][c].items()} for c in sorted(keep|set(d1['csel'][v])) if c in CS[v]}
    d1['rcTot']=TOT
    miss=[c for c in sorted(keep) if c not in d1['countries']]
    for c in miss: d1['countries'][c]={'n':names[c][1],'m':c,'ll':None,'inc':inc[c]}


def stage8(store):
    # Tyre and rubber routes (HS 4012.20, 4004, 4017) for the tyres map: every view, every year, top routes worldwide.
    S=['tyres','rubber','hardrubber']
    cache={s:json.load(open(D+f'flows_{s}.json')) for s in S}
    ys=cache['tyres']['years']; n=len(ys)
    inc={}; names={}
    for d in cache.values():
        for c,ii,nm in zip(d['codes'],d['inc'],d['names']): inc[c]=ii; names[c]=nm[1]
    def view(d,v,i):
        out={}
        for part in ('flows','imputed'):
            A=d.get(part,{}).get(v,[[]]*n)[i]
            for k in range(0,len(A),4):
                key=(d['codes'][A[k]],d['codes'][A[k+1]]); out[key]=out.get(key,0)+A[k+2]
        return out
    def res(d,i):
        x=view(d,'0',i); m=view(d,'1',i)
        return {k:((x[k]+m[k])/2 if k in x and k in m else x.get(k,m.get(k))) for k in sorted(set(x)|set(m))}
    tr={}
    for v in '012':
        tr[v]=[]
        for i in range(n):
            agg={}
            for s in S:
                for k,t in (res(cache[s],i) if v=='2' else view(cache[s],v,i)).items():
                    if k[0]!=k[1]: agg[k]=agg.get(k,0)+t
            ind=[[a,b,round(t)] for (a,b),t in agg.items() if b=='699' and t>=500]
            oth=[[a,b,round(t)] for (a,b),t in sorted(agg.items(),key=lambda x:-x[1]) if b!='699'][:90]
            tr[v].append(sorted(ind,key=lambda r:-r[2])+oth)
    d1=store; cty=d1['countries']
    ct={}
    for fpath in sorted(glob.glob(D+'plastic_20*.json'))+sorted(glob.glob(D+'textiles_20*.json')):
        for c,vv in json.load(open(fpath))['countries'].items(): ct[c]=vv
    need={c for v in tr for yr in tr[v] for r in yr for c in r[:2]}
    for c in sorted(need):
        if c in cty: continue
        vv=ct.get(c)
        if not vv: print('missing',c,names.get(c)); continue
        cty[c]={'n':vv[1],'m':vv[3],'ll':vv[4:6] if len(vv)>4 else None,'inc':inc.get(c,'N'*n)}
    d1['countries']=cty; d1['tyreRoutes']=tr



def build():
    store = {}
    for stage in (stage1, stage2, stage3, stage4, stage5, stage6, stage7, stage8):
        stage(store)
    store["built"] = datetime.date.today().isoformat()
    return store


if __name__ == "__main__":
    data = build()
    with open(OUT, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print("wrote", OUT, os.path.getsize(OUT), "bytes")
