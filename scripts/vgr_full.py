import re, json, html as H, sys
sys.path.insert(0,'scripts')
import vgr_api as api

def parse(html):
    rows=re.findall(r'(?is)<tr>(.*?)</tr>', html)
    out=[]
    for r in rows:
        if 'hdr' in r: continue
        tds=re.findall(r'(?is)<td[^>]*>(.*?)</td>', r)
        if len(tds)<5: continue
        code=re.sub(r'<[^>]+>','',tds[1]).strip()
        title=H.unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',tds[2]))).strip()
        pdf=re.search(r'href="([^"]+\.pdf)"',tds[3]); m4a=re.search(r'href="([^"]+\.(?:m4a|mp3))"',tds[4])
        out.append({'code':code,'title':title,'pdf':pdf.group(1) if pdf else '','audio':m4a.group(1) if m4a else ''})
    return out

if __name__=='__main__':
    h,FIELDS=api.get_page(); api.FIELDS=FIELDS
    seen={}
    # 1) tous les filtres par année
    for y in ['47','48','49','50','51','52','53','54','55','56','57','58','59','60','61','62','63','64','65']:
        try:
            res=parse(api.call('wmSearchByYear',[{'name':'year','value':y}]))
        except Exception as e:
            print("ERR année",y,e); continue
        new=[r for r in res if r['code'] not in seen]
        for r in res: seen.setdefault(r['code'],r)
        print(f"année {y}: {len(res):4d} résultats ({len(new)} nouveaux) — total {len(seen)}", flush=True)
    # 2) recherche par mot-clé (les + courants) pour attraper d'éventuels oublis
    for kw in ['a','e','i','o','u','Branham','Dieu','Christ','Sceau','Église','Épouse','Foi','Saint-Esprit','']:
        try:
            res=parse(api.call('wmSearch',[{'name':'searchcriteria','value':kw}]))
        except Exception as e:
            print("ERR mot",kw,e); continue
        new=[r for r in res if r['code'] not in seen]
        for r in res: seen.setdefault(r['code'],r)
        print(f"mot «{kw}»: {len(res):4d} ({len(new)} nouveaux) — total {len(seen)}", flush=True)
    # 3) séries
    for s in ['adoption','church','cod','demonology','hebrews','holy','revelation','seals','seventy','books','tracts']:
        try:
            if s in ('books','tracts'):
                crit='BK-11TH,BK-20TH,BK-AGES,BK-CANC,BK-EAGL,BK-LAOD,BK-PVSA,BK-SENT,CB-FOTP,MS-1962,MS-1963,MS-1964,MS-1965,MS-70WK,MS-ADOP,MS-BB,MS-CHUR,MS-COD,MS-COD1,MS-COD2,MS-DEMO,MS-EMES,MS-EREV,MS-FOOT,MS-HEBR,MS-HG,MS-SEALS' if s=='books' else 'TR-ASCE,TR-BEYO,TR-DOCT,TR-ENTI,TR-JCIG,TR-JCTS,TR-JEZE,TR-MESS,TR-PUYP'
                res=parse(api.call('wmSearchBySeries',[{'name':'series','value':s},{'name':'searchcriteria','value':crit}]))
            else:
                res=parse(api.call('wmSearchBySeries',[{'name':'series','value':s}]))
        except Exception as e:
            print("ERR série",s,e); continue
        new=[r for r in res if r['code'] not in seen]
        for r in res: seen.setdefault(r['code'],r)
        print(f"série {s}: {len(res):4d} ({len(new)} nouveaux) — total {len(seen)}", flush=True)
    recs=sorted(seen.values(), key=lambda r:r['code'])
    json.dump(recs, open('data/vgr_officiel.json','w'), ensure_ascii=False, indent=0)
    print("TOTAL VGR officiel:",len(recs),"| PDF:",sum(1 for r in recs if r['pdf']),"| audio:",sum(1 for r in recs if r['audio']))
