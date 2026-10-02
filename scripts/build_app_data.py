import gzip, json, glob, os, re, shutil
os.makedirs('data/books', exist_ok=True); os.makedirs('data/bible', exist_ok=True)
idx=[]
for f in sorted(glob.glob('data/sermons/*.json.gz')):
    d=json.load(gzip.open(f,'rt',encoding='utf-8'))
    fid=os.path.basename(f)[:-len('.json.gz')]
    chars=sum(len(p) for p in d['paras'])
    year=None
    m=re.match(r'(\d{2})-', d['code'] or '')
    if m: year=1900+int(m.group(1))
    idx.append({'id':fid,'code':d['code'],'title':d['title'],'trad':(d['trad'] or '').upper(),
                'year':year,'chars':chars,'paras':len(d['paras']),
                'pdf':(d['pdfs'][0] if d.get('pdfs') else ''),
                'mp3':(d['mp3'][0] if d.get('mp3') else ''),
                'duree':d.get('duree','')})
idx.sort(key=lambda r: (r['code'] or ''))
cat={'generated':'2026-10-02','source':'branham.fr (Restauration Promise) — traductions La Voix de Dieu (VGR) & Shekinah Publications',
     'sermons':idx,
     'books':[{'id':'7_church_ages','title':"Les Sept Âges de l'Église",'file':'books/7_church_ages.json.gz','trad':'La Voix de Dieu'}],
     'bible':{'id':'lsg1910','title':'Bible Louis Segond 1910','file':'bible/lsg1910.json.gz'}}
json.dump(cat, open('data/index.json','w'), ensure_ascii=False, separators=(',',':'))
print("index.json:", round(os.path.getsize('data/index.json')/1024), "Ko,", len(idx), "prédications")
print("audio dispo:", sum(1 for r in idx if r['mp3']), "| pdf dispo:", sum(1 for r in idx if r['pdf']))
# déplacer bible + livre
if os.path.exists('bible_lsg1910/lsg1910.json.gz'):
    shutil.copy('bible_lsg1910/lsg1910.json.gz','data/bible/lsg1910.json.gz')
# script de téléchargement des PDF
with open('telecharger_tous_les_PDF.sh','w') as f:
    f.write("#!/bin/bash\n# Télécharge toutes les brochures PDF (La Voix de Dieu / Shekinah) — 1768 fichiers\n")
    f.write("mkdir -p brochures_pdf && cd brochures_pdf\n")
    for r in idx:
        if r['pdf']:
            f.write(f"curl -sSL -o \"{r['code']}_{r['trad']}.pdf\" \"https://branham.fr{r['pdf']}\" &\n")
    f.write("wait\necho 'Téléchargement terminé.'\n")
os.chmod('telecharger_tous_les_PDF.sh',0o755)
print("script PDF:", sum(1 for r in idx if r['pdf']), "liens")
