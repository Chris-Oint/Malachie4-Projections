import json, gzip, html, os
d=json.load(gzip.open('data/bible/lsg1910.json.gz','rt',encoding='utf-8'))
books=[{'c':b['code'],'n':b['name'],'ch':b['chapters']} for b in d['books']]
payload=json.dumps(books, ensure_ascii=False, separators=(',',':')).replace('</','<\\/').replace('<!--','<\\!--')
tpl = r'''<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bible Louis Segond 1910 — hors-ligne</title>
<style>
:root{--bg:#f6f7fb;--card:#fff;--tx:#16202e;--mu:#66748a;--li:#e3e8f0;--ac:#1d4ed8}
html[data-t=dark]{--bg:#0b1220;--card:#121b2c;--tx:#e8eefb;--mu:#93a2bd;--li:#22304a;--ac:#7aa2ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;padding-bottom:40px}
header{position:sticky;top:0;background:var(--card);border-bottom:1px solid var(--li);padding:10px 12px;display:flex;gap:8px;align-items:center;z-index:9}
h1{font-size:15px;margin:0;flex:1}
input,select,button{font:inherit;color:inherit}
input[type=search]{flex:2;padding:9px 12px;border:1px solid var(--li);background:var(--card);border-radius:10px;min-width:120px}
button{background:var(--card);border:1px solid var(--li);border-radius:10px;padding:8px 12px;cursor:pointer}
main{max-width:820px;margin:0 auto;padding:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:7px}
.grid button{text-align:left;font-size:14px}
.ch{display:grid;grid-template-columns:repeat(auto-fill,minmax(48px,1fr));gap:6px;margin:12px 0}
.ch button{padding:9px 0;text-align:center}
.v{display:flex;gap:8px;margin:0 0 8px}
.v b{color:var(--ac);font-size:.72em;min-width:22px;text-align:right;padding-top:.3em}
.v p{margin:0;text-align:justify}
mark{background:#ffe9a8;color:#000}
.mu{color:var(--mu);font-size:13px}
</style></head><body>
<header>
  <h1>Bible Louis Segond 1910</h1>
  <input id="q" type="search" placeholder="Jean 3:16 ou un mot…">
  <button id="th">◐</button>
</header>
<main id="m"></main>
<script id="data" type="application/json">__DATA__</script>
<script>
const B=JSON.parse(document.getElementById('data').textContent);
const $=s=>document.querySelector(s), M=$('#m');
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’]/g,"'");
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ALIAS={'gen':'GEN','genese':'GEN','ex':'EXO','exo':'EXO','exode':'EXO','lev':'LEV','levitique':'LEV','nom':'NUM','nombres':'NUM','deut':'DEU','deuteronome':'DEU','jos':'JOS','josue':'JOS','jug':'JDG','juges':'JDG','ruth':'RUT','1s':'1SA','1sam':'1SA','1samuel':'1SA','2s':'2SA','2samuel':'2SA','1r':'1KI','1rois':'1KI','2r':'2KI','2rois':'2KI','1ch':'1CH','2ch':'2CH','esd':'EZR','esdras':'EZR','neh':'NEH','nehemie':'NEH','est':'EST','esther':'EST','job':'JOB','ps':'PSA','psaume':'PSA','psaumes':'PSA','pr':'PRO','prov':'PRO','proverbes':'PRO','ecc':'ECC','ecclesiaste':'ECC','ct':'SNG','cantique':'SNG','es':'ISA','esaie':'ISA','isaie':'ISA','jer':'JER','jeremie':'JER','lam':'LAM','lamentations':'LAM','ez':'EZK','ezechiel':'EZK','dan':'DAN','daniel':'DAN','os':'HOS','osee':'HOS','joel':'JOL','am':'AMO','amos':'AMO','ab':'OBA','abdias':'OBA','jon':'JON','jonas':'JON','mic':'MIC','michee':'MIC','nah':'NAM','nahum':'NAM','hab':'HAB','habacuc':'HAB','soph':'ZEP','sophonie':'ZEP','agg':'HAG','aggee':'HAG','zac':'ZEC','zacharie':'ZEC','mal':'MAL','malachie':'MAL','mt':'MAT','mat':'MAT','matthieu':'MAT','mc':'MRK','marc':'MRK','lc':'LUK','luc':'LUK','jn':'JHN','jean':'JHN','act':'ACT','actes':'ACT','rom':'ROM','romains':'ROM','1co':'1CO','2co':'2CO','gal':'GAL','galates':'GAL','eph':'EPH','ephesiens':'EPH','ph':'PHP','phil':'PHP','philippiens':'PHP','col':'COL','colossiens':'COL','1th':'1TH','2th':'2TH','1ti':'1TI','2ti':'2TI','tit':'TIT','tite':'TIT','phm':'PHM','philemon':'PHM','heb':'HEB','hebreux':'HEB','jc':'JAS','jacques':'JAS','1p':'1PE','1pierre':'1PE','2p':'2PE','2pierre':'2PE','1jn':'1JN','2jn':'2JN','3jn':'3JN','jud':'JUD','jude':'JUD','ap':'REV','apoc':'REV','apocalypse':'REV'};
const findB=x=>{x=norm(x).trim();if(ALIAS[x])return B.find(b=>b.c===ALIAS[x]);return B.find(b=>norm(b.n)===x)||B.find(b=>norm(b.n).startsWith(x)&&x.length>2)};
function home(){M.innerHTML='<p class="mu">66 livres · 31 169 versets — Version Louis Segond 1910 (domaine public). Recherchez une référence (« Jean 3:16 ») ou un mot.</p><div class="grid">'+
 B.map(b=>'<button data-b="'+b.c+'">'+esc(b.n)+'<br><span class="mu">'+Object.keys(b.ch).length+' ch.</span></button>').join('')+'</div>';
 [...M.querySelectorAll('[data-b]')].forEach(e=>e.onclick=()=>chapters(e.dataset.b));}
function grid(b){return '<h2 style="font-size:18px;margin:6px 0">'+esc(b.n)+'</h2><div class="ch">'+Object.keys(b.ch).sort((x,y)=>x-y).map(c=>'<button data-c="'+c+'">'+c+'</button>').join('')+'</div>'}
function chapters(code){const b=B.find(x=>x.c===code);M.innerHTML=grid(b);[...M.querySelectorAll('[data-c]')].forEach(e=>e.onclick=()=>read(code,+e.dataset.c));window.scrollTo(0,0)}
function read(code,c,verse){const b=B.find(x=>x.c===code),ch=b.ch[c];if(!ch)return;
 const list=Object.keys(b.ch).map(Number).sort((x,y)=>x-y),i=list.indexOf(c);
 M.innerHTML='<div style="display:flex;gap:6px;align-items:center;margin-bottom:10px"><button id="pv">←</button><h2 style="flex:1;margin:0;font-size:18px">'+esc(b.n)+' '+c+'</h2><button id="nx">→</button></div>'+
 Object.keys(ch).sort((x,y)=>x-y).map(v=>'<div class="v"'+(verse==v?' style="background:#fff3c4;border-radius:6px;padding:4px"':'')+'><b>'+v+'</b><p>'+esc(ch[v])+'</p></div>').join('');
 const pv=M.querySelector('#pv'),nx=M.querySelector('#nx');
 pv.onclick=()=>{const k=i-1;if(k>=0)read(code,list[k]);else{const j=B.indexOf(b)-1;if(j>=0){const pb=B[j];read(pb.c,Math.max(...Object.keys(pb.ch).map(Number)))}}};
 nx.onclick=()=>{const k=i+1;if(k<list.length)read(code,list[k]);else{const j=B.indexOf(b)+1;if(j<B.length){const nb=B[j];read(nb.c,Math.min(...Object.keys(nb.ch).map(Number)))}}};
 window.scrollTo(0,0); if(verse){const el=[...M.querySelectorAll('.v')].find(e=>e.firstChild.textContent==verse); el&&el.scrollIntoView&&el.scrollIntoView({block:'center'})}}
$('#q').oninput=e=>{const q=e.target.value.trim();if(q.length<2){home();return}
 const mm=q.match(/^((?:\d\s*)?[A-Za-zÀ-ÿ.]+)\s*(\d+)?\s*[:.,]?\s*(\d+)?$/);
 if(mm){const b=findB(mm[1]);if(b&&mm[2]){read(b.c,+mm[2],mm[3]?+mm[3]:null);return}if(b){chapters(b.c);return}}
 const nq=norm(q),out=[];outer:for(const b of B)for(const c in b.ch)for(const v in b.ch[c]){const t=b.ch[c][v];if(norm(t).includes(nq)){out.push('<div class="v" data-c="'+b.c+'" data-ch="'+c+'" data-v="'+v+'"><p><b style="color:var(--ac)">'+esc(b.n)+' '+c+':'+v+'</b> '+esc(t)+'</p></div>');if(out.length>150)break outer}}
 M.innerHTML='<p class="mu">'+out.length+' verset(s)</p>'+out.join('');
 [...M.querySelectorAll('[data-c]')].forEach(e=>e.onclick=()=>read(e.dataset.c,+e.dataset.ch,+e.dataset.v));};
$('#th').onclick=()=>{const d=document.documentElement.dataset.t==='dark';document.documentElement.dataset.t=d?'light':'dark';try{localStorage.setItem('t',d?'light':'dark')}catch(e){}};
try{const t=localStorage.getItem('t');if(t)document.documentElement.dataset.t=t;else if(matchMedia('(prefers-color-scheme:dark)').matches)document.documentElement.dataset.t='dark'}catch(e){}
home();
</script></body></html>'''
out=tpl.replace('__DATA__', payload)
open('Bible_Louis_Segond_1910.html','w',encoding='utf-8').write(out)
print("Bible autonome:", round(os.path.getsize('Bible_Louis_Segond_1910.html')/1048576,1), "Mo")
