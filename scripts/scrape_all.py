import re, json, os, gzip, html as H, time, sys
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request

BASE="https://branham.fr"
UA={"User-Agent":"Mozilla/5.0 (compatible; offline-collector/1.0)"}
OUT="data/sermons"
os.makedirs(OUT, exist_ok=True)

def get(url, tries=4, timeout=60):
    import urllib.parse
    last=None
    for t in range(tries):
        try:
            req=urllib.request.Request(urllib.parse.quote(url, safe=":/?&=%[]()@!$&'*+,;~-"), headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode('utf-8','ignore')
        except Exception as e:
            last=e; time.sleep(1.0+2*t)
    raise last

def clean_text(raw):
    s=re.sub(r'(?s)<!--.*?-->',' ',raw)
    s=s.replace('--&gt;',' ').replace('<!--',' ')
    s=re.sub(r'(?i)</\s*(p|div|li|h[1-6]|tr)\s*>','\n',s)
    s=re.sub(r'(?i)<br\s*/?>','\n',s)
    s=re.sub(r'(?s)<[^>]+>',' ',s)
    s=H.unescape(s).replace('\u00a0',' ').replace('\ufeff','')
    s=re.sub(r'[ \t]+',' ',s)
    out=[]
    for l in (x.strip() for x in s.split('\n')):
        if not l: continue
        if out and not re.search(r"[.:;!?»\"'\)\]]$", out[-1]) and not re.match(r'^\d+\.?\s', l):
            out[-1]+=' '+l
        else:
            out.append(l)
    return [re.sub(r'\s+',' ',p).strip() for p in out if p.strip()]

def parse_page(u):
    h=get(BASE+u)
    m=re.search(r'(?is)<div class="scalText[^"]*">(.*?)</div>\s*</div>', h)
    raw = m.group(1) if m else ''
    if len(raw)<500:
        m2=re.search(r'(?is)<div class="scalText[^"]*">(.*)', h)
        raw = m2.group(1)[:600000] if m2 else raw
    paras=clean_text(raw)
    cut = h.find('scalText')
    head=H.unescape(re.sub(r'\s+',' ',re.sub(r'(?s)<[^>]+>',' ',re.sub(r'(?s)<!--.*?-->',' ',h[:cut if cut>0 else 80000]))))
    def g(p, d=''):
        mm=re.search(p, head); return mm.group(1).strip() if mm else d
    others=re.findall(r'href="(/sermons/[^"]+)"[^>]*>\s*([^<]{2,140}?)\s*-\s*(MS|VGR|Shp|SHP|BBV)\s*<', h)
    return {'paras':paras,
            'code':g(r'Date:\s*([0-9]{2}-[0-9A-Za-z]+)'),
            'trad':g(r'La traduction:\s*([A-Za-z]+)'),
            'duree':g(r'La durée est de:\s*([^|]{0,60})'),
            'lieu':g(r'Prêch[ée]\s*(?:le)?\s*([^|]{0,120})'),
            'en_title':g(r'Autres traductions([^|]{0,400})'),
            'others':[{'url':o[0],'title':H.unescape(o[1]).strip(),'trad':o[2]} for o in others],
            'pdfs':sorted(set(re.findall(r"href='(/files/pdf[^']*\.pdf)'", h))),
            'mp3':sorted(set(re.findall(r'href="(/files/mp3/[^"]+\.mp3)"', h)))}

import threading
_claimed=set(); _lock=threading.Lock()

def job(row):
    safe=re.sub(r'[^0-9A-Za-z_-]','_',row['code'])+'__'+row['trad']
    with _lock:
        base=safe; n=2
        while safe in _claimed:
            safe=f"{base}_{n}"; n+=1
        _claimed.add(safe)
    path=os.path.join(OUT, safe+'.json.gz')
    if os.path.exists(path) and os.path.getsize(path)>500: return 'skip'
    d=parse_page(row['url'])
    rec=dict(row); rec.update(d)
    with gzip.open(path,'wt',encoding='utf-8',compresslevel=6) as f:
        json.dump(rec,f,ensure_ascii=False)
    return 'ok'

if __name__=='__main__':
    idx=json.load(open('data/sermons_index.json'))
    ok=skip=err=0; chars=0
    t0=time.time()
    with ThreadPoolExecutor(7) as ex:
        futs={ex.submit(job,r):r for r in idx}
        for i,f in enumerate(as_completed(futs),1):
            r=futs[f]
            try:
                s=f.result()
                if s=='ok': ok+=1
                else: skip+=1
            except Exception as e:
                err+=1; print("ERR",r['code'],r['trad'],repr(e)[:120],flush=True)
            if i%100==0:
                print(f"[{i}/{len(idx)}] ok={ok} skip={skip} err={err} {time.time()-t0:.0f}s",flush=True)
    print(f"DONE ok={ok} skip={skip} err={err} in {time.time()-t0:.0f}s",flush=True)
