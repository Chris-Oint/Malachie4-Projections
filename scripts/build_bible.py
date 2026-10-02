import json, os, re, gzip, urllib.request
from concurrent.futures import ThreadPoolExecutor
REPO="https://raw.githubusercontent.com/BibleCorps/FRA-B-LSG1910-PD-UBS/main/p.sfm/"
UA={"User-Agent":"Mozilla/5.0"}
# ordre canonique + noms FR
BOOKS=[("GEN","Genèse",50),("EXO","Exode",40),("LEV","Lévitique",27),("NUM","Nombres",36),("DEU","Deutéronome",34),
("JOS","Josué",24),("JDG","Juges",21),("RUT","Ruth",4),("1SA","1 Samuel",31),("2SA","2 Samuel",24),
("1KI","1 Rois",22),("2KI","2 Rois",25),("1CH","1 Chroniques",29),("2CH","2 Chroniques",36),("EZR","Esdras",10),
("NEH","Néhémie",13),("EST","Esther",10),("JOB","Job",42),("PSA","Psaumes",150),("PRO","Proverbes",31),
("ECC","Ecclésiaste",12),("SNG","Cantique des cantiques",8),("ISA","Ésaïe",66),("JER","Jérémie",52),("LAM","Lamentations",5),
("EZK","Ézéchiel",48),("DAN","Daniel",12),("HOS","Osée",14),("JOL","Joël",3),("AMO","Amos",9),("OBA","Abdias",1),
("JON","Jonas",4),("MIC","Michée",7),("NAM","Nahum",3),("HAB","Habacuc",3),("ZEP","Sophonie",3),("HAG","Aggée",2),
("ZEC","Zacharie",14),("MAL","Malachie",4),("MAT","Matthieu",28),("MRK","Marc",16),("LUK","Luc",24),("JHN","Jean",21),
("ACT","Actes",28),("ROM","Romains",16),("1CO","1 Corinthiens",16),("2CO","2 Corinthiens",13),("GAL","Galates",6),
("EPH","Éphésiens",6),("PHP","Philippiens",4),("COL","Colossiens",4),("1TH","1 Thessaloniciens",5),("2TH","2 Thessaloniciens",3),
("1TI","1 Timothée",6),("2TI","2 Timothée",4),("TIT","Tite",3),("PHM","Philémon",1),("HEB","Hébreux",13),
("JAS","Jacques",5),("1PE","1 Pierre",5),("2PE","2 Pierre",3),("1JN","1 Jean",5),("2JN","2 Jean",1),
("3JN","3 Jean",1),("JUD","Jude",1),("REV","Apocalypse",22)]

def fetch(rec):
    code=rec[0]
    fn=[f for f in LI if f"UBS-{code}" in f] if False else None
    return rec

import urllib.request
def get(url):
    req=urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=90).read().decode('utf-8','ignore')

DROP_LINE = set('ms1 ms2 ms mr s s1 s2 s3 s4 r x f fig id c cp va vp cl h toc toca mt is ip io iot ie ili im imt imq iex rem sts sp sr sv tr th thr tc tcr b'.split())

def _rm_inline(t):
    t=re.sub(r'\\x\s.*?\\x\*',' ',t,flags=re.S)
    t=re.sub(r'\\x\s[^\n]*',' ',t)
    t=re.sub(r'\\f\s.*?\\f\*',' ',t,flags=re.S)
    t=re.sub(r'\\f\s[^\n]*',' ',t)
    t=re.sub(r'\\fig\s.*?\\fig\*',' ',t,flags=re.S)
    # keep content of common inline markers, drop the marker itself
    for m in ['add','wj','w','nd','qt','bk','em','bd','it','no','sc','sup','k','tl','pn','png','pro','ord','lit']:
        t=re.sub(r'\\'+m+r'\*',' ',t)
        t=re.sub(r'\\'+m+r'\s',' ',t)
    t=re.sub(r'\\[a-z]+[0-9]?\*',' ',t)
    t=re.sub(r'\\[a-z]+[0-9]?\s',' ',t)
    return t

def _clean(body):
    body=re.sub(r'\\x\s.*?\\x\*',' ',body,flags=re.S)
    body=re.sub(r'\\x\s[^\n]*',' ',body)
    out=[]
    for line in body.split('\n'):
        line=line.strip()
        if not line: continue
        m=re.match(r'\\([a-z]+[0-9]?)\*?\s?(.*)$', line)
        if m:
            mk=m.group(1)
            if mk in DROP_LINE:
                continue
            line=m.group(2)
        line=_rm_inline(line)
        line=re.sub(r'\s+',' ',line).strip()
        if line: out.append(line)
    t=' '.join(out)
    t=re.sub(r'\s+',' ',t).strip()
    t=re.sub(r'\s+([.,;:!?»\)])',r'\1',t)
    t=re.sub(r'([«\(])\s+',r'\1',t)
    return t.strip()

def parse_sfm(txt):
    """USFM -> {chapter: {verse: texte}}"""
    txt=re.sub(r'\\id[^\n]*\n','',txt)
    chapters={}
    parts=re.split(r'\\c\s+(\d+)', txt)
    for i in range(1,len(parts)-1,2):
        cnum=parts[i]; body=parts[i+1]
        vs=re.split(r'\\v\s+(\d+)(?:-\d+)?', body)
        verses={}
        for j in range(1,len(vs)-1,2):
            v=vs[j]; t=_clean(vs[j+1])
            if t: verses[v]=t
        if verses: chapters[cnum]=verses
    return chapters

if __name__=='__main__':
    listing=json.loads(get("https://api.github.com/repos/BibleCorps/FRA-B-LSG1910-PD-UBS/contents/p.sfm"))
    files={f['name']:f['download_url'] for f in listing}
    out={"version":"Louis Segond 1910","lang":"fr","books":[]}
    total=0
    for code,name,nch in BOOKS:
        key=[k for k in files if k.endswith(f"-{code}.p.sfm")]
        if not key: print("MISSING",code); continue
        txt=get(files[key[0]])
        ch=parse_sfm(txt)
        nv=sum(len(v) for v in ch.values())
        out["books"].append({"code":code,"name":name,"chapters":ch})
        total+=nv
        print(f"{name}: {len(ch)} chapitres / {nv} versets", flush=True)
    json.dump(out, open('bible_lsg1910/lsg1910.json','w'), ensure_ascii=False)
    with gzip.open('bible_lsg1910/lsg1910.json.gz','wt',encoding='utf-8',compresslevel=9) as f:
        json.dump(out,f,ensure_ascii=False)
    print("TOTAL versets:",total)
