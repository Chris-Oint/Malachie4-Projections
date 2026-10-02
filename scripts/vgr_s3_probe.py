import json, urllib.parse, urllib.request, concurrent.futures as cf, time, os, re
UA={"User-Agent":"Mozilla/5.0","Range":"bytes=0-0"}
BASE="https://s3.amazonaws.com/download.branham.org/pdf/FRN/"
idx=json.load(open('data/sermons_index.json'))
codes={}
for r in idx:
    c=r['code']
    if not c: continue
    codes.setdefault(c,set())
    if r.get('title_en'): codes[c].add(r['title_en'])
exclude={r['title_en'] for r in idx if r.get('title_en') and r['trad'].upper()=='VGR'}

def variants(t):
    v=[t]
    v.append(t.replace('&','And'))
    v.append(re.sub(r"[:;,.!?]","",t))
    v.append(re.sub(r"[’']","",t))
    v.append(re.sub(r"[:;,.!?]","",re.sub(r"[’']","",t)).replace('&','And'))
    out=[]
    for x in v:
        x=re.sub(r'\s+',' ',x).strip()
        if x and x not in out: out.append(x)
    return out

def probe(args):
    code,title=args
    for v in variants(title):
        url=BASE+urllib.parse.quote(f"FRN{code} {v} VGR.pdf")
        try:
            r=urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=25)
            return {'code':code,'title_en':title,'filename':f"FRN{code} {v} VGR.pdf",'url':url,
                    'size':int((r.headers.get('Content-Range') or '0').split('/')[-1] or 0),'status':r.status}
        except Exception as e:
            if getattr(e,'code',None)==403: continue
            time.sleep(1)
    return None

if __name__=='__main__':
    tasks=[(c,t) for c,ts in codes.items() for t in sorted(ts)]
    print("codes:",len(codes),"| candidats:",len(tasks),flush=True)
    found=[]; done=0
    with cf.ThreadPoolExecutor(10) as ex:
        for res in ex.map(probe,tasks):
            done+=1
            if res: found.append(res)
            if done%200==0: print(f"  {done}/{len(tasks)} sondés · {len(found)} trouvés",flush=True)
    found.sort(key=lambda r:r['code'])
    json.dump(found,open('data/vgr_s3.json','w'),ensure_ascii=False,indent=0)
    print("TROUVÉS sur le serveur VGR:",len(found),"| poids total %.0f Mo"%(sum(f['size'] for f in found)/1048576))
