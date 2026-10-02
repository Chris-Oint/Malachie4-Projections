import re, json, gzip, html as H, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor
BASE="https://branham.fr"
UA={"User-Agent":"Mozilla/5.0 (compatible; offline-collector/1.0)"}
def get(u):
    req=urllib.request.Request(urllib.parse.quote(u,safe=":/?&=%[]()@!$&'*+,;~-"), headers=UA)
    return urllib.request.urlopen(req,timeout=90).read().decode('utf-8','ignore')
def clean(raw):
    s=re.sub(r'(?s)<script.*?</script>',' ',raw)
    s=re.sub(r'(?s)<style.*?</style>',' ',raw)
    s=re.sub(r'(?s)<!--.*?-->',' ',raw)
    s=re.sub(r'(?i)</\s*(p|div|li|h[1-6]|tr)\s*>','\n',s)
    s=re.sub(r'(?i)<br\s*/?>','\n',s)
    s=re.sub(r'(?s)<[^>]+>',' ',s)
    s=H.unescape(s).replace('\u00a0',' ')
    out=[]
    for l in (x.strip() for x in s.split('\n')):
        if not l: continue
        if out and not re.search(r"[.:;!?»\"'\)\]]$", out[-1]) and not re.match(r'^\d+\.?\s', l):
            out[-1]+=' '+l
        else: out.append(l)
    res=[re.sub(r'\s+',' ',p).strip() for p in out if p.strip()]
    bad=re.compile(r'(var |function\(|\$\("|window\.|document\.|;//|\}\s*$)')
    return [p for p in res if not (bad.search(p) and len(p)<400)]
def chapter(slug, n):
    h=get(f"{BASE}/books/{slug}/{n}")
    i=h.find('<div class="content">')
    if i<0: return n, {'title':'','paras':[]}
    j=h.find('pre-footer', i)
    seg=h[i:j if j>0 else i+900000]
    seg=re.sub(r'(?s)<script.*?</script>',' ',seg)
    title=''
    mt=re.search(r'(?is)<h[1-4][^>]*>(.*?)</h[1-4]>', seg)
    if mt: title=re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',mt.group(1))).strip()
    items=[]
    for m in re.finditer(r'(?is)<(p|h[1-4])\b[^>]*>(.*?)</\1>', seg):
        t=clean(m.group(2))
        if t: items.append(' '.join(t))
    # dedupe consecutive identical + drop sidebar residue
    out=[]
    for t in items:
        if out and out[-1]==t: continue
        out.append(t)
    for i2,t in enumerate(out[:8]):
        if 'Contenu du livre' in t:
            out=out[i2+1:]; break
    out=[t for t in out if not re.search(r'(newVal|defZoom|fontSize|\$\(|function\()', t)]
    return n, {'title':title,'paras':out}

if __name__=='__main__':
    slug='7-Church-Ages'; N=10
    with ThreadPoolExecutor(5) as ex:
        res=dict(ex.map(lambda n: chapter(slug,n), range(1,N+1)))
    book={'slug':slug,'title':"Les Sept Âges de l'Église",'author':"William Marrion Branham",'traduction':'Voix de Dieu / Shekinah','chapters':[{'n':n,'title':res[n]['title'],'paras':res[n]['paras']} for n in range(1,N+1)]}
    with gzip.open('data/books/7_church_ages.json.gz','wt',encoding='utf-8',compresslevel=9) as f:
        json.dump(book,f,ensure_ascii=False)
    for n in range(1,N+1):
        print(n, res[n]['title'][:50],'|', len(res[n]['paras']),'paras', sum(len(p) for p in res[n]['paras']),'chars |', (res[n]['paras'][1][:60] if len(res[n]['paras'])>1 else ''))
