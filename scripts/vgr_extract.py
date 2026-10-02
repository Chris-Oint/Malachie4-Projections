import pymupdf, re, json, os, glob, gzip, unicodedata
from concurrent.futures import ThreadPoolExecutor

OFF={r['code']:r for r in json.load(open('data/vgr_officiel.json'))}
S3={r['code']:r for r in json.load(open('data/vgr_s3.json'))}

def norm(s):
    s=unicodedata.normalize('NFKD',s)
    s=''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^A-Za-z]','',s).upper()

def is_para_num(l):
    return bool(re.fullmatch(r'\d{1,4}', l.strip()))

def extract(pdf_path, title, code):
    d=pymupdf.open(pdf_path)
    pages=[p.get_text() for p in d]
    d.close()
    tkey=norm(title)
    lines=[]
    for pg in pages:
        for l in pg.split('\n'):
            lines.append(l.rstrip())
    # 1) couper la fin (mentions légales / adresses)
    cut=len(lines)
    for i,l in enumerate(lines):
        low=l.lower()
        if ('aucune partie' in low or 'toute reproduction' in low or 'autorisation écrite' in low
            or 'c.p. 156' in low or 'p.o. box 950' in low or ('voice of god recordings' in low and i>len(lines)*0.5)):
            cut=i; break
    lines=lines[:cut]
    # 2) supprimer entêtes, pieds et numéros de page
    clean=[]
    for l in lines:
        s=l.strip()
        if not s: clean.append(''); continue
        if is_para_num(s): clean.append(s); continue
        n=norm(s)
        if not n: continue
        # entête = fragment en MAJUSCULES du titre
        letters=re.findall(r'[A-Za-zÀ-ÿ]', s)
        upper_ratio=(sum(1 for c in letters if c.isupper())/len(letters)) if letters else 0
        if len(n)>=10 and upper_ratio>0.85 and (n in tkey or (len(n)>=12 and n in tkey) or (len(n)>=12 and tkey.endswith(n))): continue
        if n in ('LAVOIXDEDIEU','VOICEOFGODRECORDINGS','WWWBRANHAMORG','LAPAROLEPARLEE'): continue
        if re.fullmatch(r'[ivxlcIVXLC]{1,4}', s) and len(s)<=4: continue
        clean.append(s)
    # 3) assemblage des paragraphes (numéros conservés)
    paras=[]; cur=None
    for l in clean:
        s=l.strip()
        if not s: continue
        if is_para_num(s):
            if cur is not None and cur[1]: paras.append(cur)
            cur=[int(s),[]]; continue
        if cur is None: cur=[None,[]]
        cur[1].append(s)
    if cur and cur[1]: paras.append(cur)
    # 4) fusion + césures + nettoyage
    out=[]
    for num,parts in paras:
        t=' '.join(parts)
        t=re.sub(r'(\w)-\s+(\w)', lambda m: m.group(1)+m.group(2) if m.group(2)[0].islower() else m.group(1)+'-'+m.group(2), t)
        t=re.sub(r'\s+',' ',t).strip()
        t=re.sub(r'\s+([.,;:!?»\)])',r'\1',t)
        if len(t)>3: out.append((num,t))
    # 5) jeter l'éventuel bloc de couverture avant le paragraphe 1
    for i,(num,_) in enumerate(out):
        if num==1: out=out[i:]; break
    return out

def job(code):
    f=f"/tmp/vgr_pdf/{code}.pdf"
    if not os.path.exists(f): return (code,'absent',0)
    r=OFF.get(code,{})
    title=r.get('title','')
    try:
        paras=extract(f,title,code)
    except Exception as e:
        return (code,'ERR '+str(e)[:60],0)
    chars=sum(len(t) for _,t in paras)
    rec={'id':code+'__VGRoff','code':code,'title':title,'trad':'VGR-OFF',
         'pdf': (S3[code]['url'] if code in S3 else r.get('pdf','')),
         'audio': r.get('audio',''),
         'paras':[(f"{n} {t}" if n else t) for n,t in paras],
         'n':len(paras),'chars':chars,
         'scan': chars<3000}
    os.makedirs('data/vgr',exist_ok=True)
    with gzip.open(f"data/vgr/{rec['id']}.json.gz",'wt',encoding='utf-8',compresslevel=9) as fh:
        json.dump(rec,fh,ensure_ascii=False)
    return (code,'ok',chars)

if __name__=='__main__':
    codes=sorted(OFF.keys())
    ok=err=0; tot=0; small=[]
    with ThreadPoolExecutor(6) as ex:
        for i,(code,st,ch) in enumerate(ex.map(job,codes),1):
            if st=='ok': ok+=1; tot+=ch
            else: err+=1; print("  ",code,st)
            if st=='ok' and ch<15000: small.append((code,ch))
            if i%50==0: print(f"  {i}/{len(codes)} · {tot/1e6:.1f} M caractères · erreurs={err}",flush=True)
    print(f"TERMINÉ ok={ok} err={err} · {tot/1e6:.1f} M caractères de texte VGR")
    print("textes courts (<15k):",len(small),small[:8])
