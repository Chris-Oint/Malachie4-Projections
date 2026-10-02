import json, urllib.request, concurrent.futures as cf, os, time
UA={"User-Agent":"Mozilla/5.0"}
recs=json.load(open('data/vgr_officiel.json'))
OUT='/tmp/vgr_pdf'; os.makedirs(OUT,exist_ok=True)
def dl(r):
    code=r['code'].replace('/','_'); p=f"{OUT}/{code}.pdf"
    if os.path.exists(p) and os.path.getsize(p)>1000: return (code,'skip',os.path.getsize(p))
    for t in range(3):
        try:
            d=urllib.request.urlopen(urllib.request.Request(r['pdf'],headers=UA),timeout=180).read()
            open(p,'wb').write(d); return (code,'ok',len(d))
        except Exception as e:
            if t==2: return (code,'ERR '+str(getattr(e,'code',e))[:24],0)
            time.sleep(2)
if __name__=='__main__':
    t0=time.time(); ok=err=sk=0; tot=0; bad=[]
    with cf.ThreadPoolExecutor(8) as ex:
        for i,(code,st,n) in enumerate(ex.map(dl,recs),1):
            if st=='ok': ok+=1; tot+=n
            elif st=='skip': sk+=1; tot+=n
            else: err+=1; bad.append((code,st))
            if i%50==0: print(f"  {i}/{len(recs)} · {tot/1048576:.1f} Mo · erreurs={err}",flush=True)
    print(f"TERMINÉ ok={ok} skip={sk} err={err} · TOTAL {tot/1048576:.1f} Mo en {time.time()-t0:.0f}s")
    if bad: print("échecs:",bad[:12]); json.dump(bad,open('/tmp/vgr_bad.json','w'))
