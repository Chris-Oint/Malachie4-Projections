import json, sys, re
sys.path.insert(0,'scripts')
from vgr_api import get_page, call
import vgr_api
from vgr_full import parse
h,FIELDS=get_page(); vgr_api.FIELDS=FIELDS
base={r['code']:r for r in json.load(open('data/vgr_officiel.json'))}
print("base:",len(base))
MOTS=["baptême","serpent","sagesse","guérison","prophète","Noé","Moïse","Daniel","Élie","jugement","résurrection",
"mariage","femme","héritage","semence","pierre","porte","nuée","colombe","lion","agneau","sang","alliance","croix",
"prière","jeûne","démon","ange","esprit","corps","âme","vie","mort","enfer","ciel","terre","roi","royaume","pasteur",
"brebis","enfant","jeune","temps","fin","commencement","amour","paix","joie","grâce","péché","salut","vérité","lumière",
"ténèbres","voix","parole","promesse","appel","élection","sion","jérusalem","babel","Egypte","Babylone","Assyrie",
"canan","Josué","Gédéon","Samson","David","Salomon","Job","Isaïe","Jérémie","Ezéchiel","Zacharie","Malachie","Paul","Pierre",
"Jean","Jacques","Luc","Marc","Matthieu","Thomas","Philippe","Étienne","Corneille","Lydie","Timothée","Tite","Onésime"]
new=[]
for m in MOTS:
    try: res=parse(call('wmSearch',[{'name':'searchcriteria','value':m}]))
    except Exception as e: print("ERR",m,e); continue
    add=[r['code'] for r in res if r['code'] not in base]
    if add:
        for r in res:
            if r['code'] not in base: base[r['code']]=r
        print(f"  + {m}: {len(add)} nouveaux -> {add[:8]}",flush=True)
    new+=add
print("Nouveaux codes trouvés:",len(set(new)))
json.dump(sorted(base.values(),key=lambda r:r['code']), open('data/vgr_officiel.json','w'), ensure_ascii=False, indent=0)
print("TOTAL après sondage:",len(base))
