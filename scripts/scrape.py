import re, json, os, sys, gzip, html as H, time
from concurrent.futures import ThreadPoolExecutor
import urllib.request

BASE="https://branham.fr"
UA={"User-Agent":"Mozilla/5.0 (compatible; offline-collector/1.0)"}

def get(url, tries=3, timeout=45):
    for t in range(tries):
        try:
            req=urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode('utf-8','ignore')
        except Exception as e:
            if t==tries-1: raise
            time.sleep(1.5*(t+1))

def clean_text(raw):
    """raw = inner HTML of .scalText ; return list of paragraphs"""
    s=raw
    # remove leftover commented fragments
    s=re.sub(r'(?s)<!--.*?-->',' ',s)
    s=s.replace('--&gt;',' ').replace('<!--',' ')
    # paragraph-ish splits
    s=re.sub(r'(?i)</\s*(p|div|li|h[1-6]|tr)\s*>','\n',s)
    s=re.sub(r'(?i)<br\s*/?>','\n',s)
    s=re.sub(r'(?s)<[^>]+>',' ',s)
    s=H.unescape(s)
    s=s.replace('\u00a0',' ').replace('\ufeff','')
    s=re.sub(r'[ \t]+',' ',s)
    lines=[l.strip() for l in s.split('\n')]
    lines=[l for l in lines if l]
    out=[]
    for l in lines:
        # merge soft-wrapped lines: a line ending without sentence end continues
        if out and not re.search(r"[.:;!?»\"'\)\]]$", out[-1]) and not re.match(r'^\d+\s', l) and not re.match(r'^\d+\s*$', out[-1]):
            out[-1] = out[-1] + ' ' + l
        else:
            out.append(l)
    # collapse whitespace
    out=[re.sub(r'\s+',' ',p).strip() for p in out]
    return [p for p in out if p]

def parse_page(u):
    h=get(BASE+u)
    # main text div
    m=re.search(r'(?is)<div class="scalText[^"]*">(.*?)</div>\s*</div>', h)
    raw = m.group(1) if m else ''
    if len(raw) < 500:
        m2=re.search(r'(?is)<div class="scalText[^"]*">(.*)', h)
        raw = m2.group(1)[:400000] if m2 else raw
    paras=clean_text(raw)
    # metadata block
    meta={}
    mt=re.search(r'(?is)<div class="[^"]*sermon[^"]*">(.*?)</div>\s*</div>', h)
    head=re.sub(r'(?s)<[^>]+>',' ',re.sub(r'(?s)<!--.*?-->',' ',h[:h.find('scalText') if 'scalText' in h else 60000]))
    head=H.unescape(re.sub(r'\s+',' ',head))
    m=re.search(r'Date:\s*([0-9]{2}-[0-9A-Za-z]+)', head)
    code=m.group(1) if m else ''
    m=re.search(r'La traduction:\s*([A-Za-z]+)', head)
    trad=m.group(1) if m else ''
    m=re.search(r'La durée est de:\s*([^|]{0,60})', head)
    duree=m.group(1).strip() if m else ''
    # toggles: other translations
    others=sorted(set(re.findall(r'href="(/sermons/[^"]+)"[^>]*>\s*([^<]{2,120}?)\s*-\s*(MS|VGR|Shp)\s*<', h)))
    pdf=sorted(set(re.findall(r"href='(/files/pdf[^']+\.pdf)'", h)))
    pdf_print=sorted(set(re.findall(r"href='(/files/pdf_print[^']+\.pdf)'", h)))
    mp3=sorted(set(re.findall(r'href="(/files/mp3/[^"]+\.mp3)"', h)))
    return {'code':code,'trad':trad,'duree':duree,'n_paras':len(paras),
            'chars':sum(len(p) for p in paras),'pdf':pdf,'pdf_print':pdf_print,'mp3':mp3,
            'others':[o[0] for o in others],'_paras':paras}

if __name__=='__main__':
    idx=json.load(open('data/sermons_index.json'))
    test=idx[:8]+idx[800:806]
    with ThreadPoolExecutor(6) as ex:
        res=list(ex.map(lambda r: parse_page(r['url']), test))
    for r in res:
        print(r['code'], r['trad'], r['n_paras'], r['chars'], r['pdf'][:1], len(r['others']))
    print("TOTAL chars for 14:", sum(r['chars'] for r in res))
    print("SAMPLE TEXT:", res[0]['_paras'][:3])
    print("SAMPLE TAIL:", res[0]['_paras'][-2:])
