import json, re, html as H
import urllib.request, http.cookiejar
BASE="https://themessage.com"; PAGE=BASE+"/en/sermonsdownload"; ENDPOINT=BASE+"/themessage/sermonsdownload.aspx"
UA={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122","Accept":"application/json, text/javascript, */*; q=0.01",
    "X-Requested-With":"XMLHttpRequest","Referer":PAGE,"Origin":BASE}
cj=http.cookiejar.CookieJar(); op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj)); op.addheaders=list(UA.items())
h=op.open(PAGE,timeout=60).read().decode('utf-8','ignore')
FIELDS=[]
for m in re.finditer(r'<input[^>]*>',h):
    n=re.search(r'name="([^"]+)"',m.group(0)); v=re.search(r'value="([^"]*)"',m.group(0))
    if n and v: FIELDS.append({'name':n.group(1),'value':H.unescape(v.group(1))})
def call(method,extra):
    body={"formVars":FIELDS+extra}
    req=urllib.request.Request(ENDPOINT+"/"+method,data=json.dumps(body).encode(),headers={**UA,"Content-Type":"application/json; charset=utf-8"})
    return json.loads(op.open(req,timeout=90).read().decode('utf-8','ignore')).get('d','')
out=call('wmSearchByYear',[{'name':'year','value':'65'}])
open('/tmp/en_list.html','w').write(out)
rows=re.findall(r'(?is)<tr>(.*?)</tr>',out)
recs=[]
for r in rows:
    if 'hdr' in r: continue
    tds=re.findall(r'(?is)<td[^>]*>(.*?)</td>',r)
    if len(tds)<3: continue
    code=re.sub(r'<[^>]+>','',tds[1]).strip()
    title=H.unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',tds[2]))).strip()
    recs.append({'code':code,'title_en':title})
print("liste anglaise:",len(recs))
json.dump(recs,open('data/vgr_en_titles.json','w'),ensure_ascii=False,indent=0)
fr={r['code'] for r in json.load(open('data/vgr_officiel.json'))}
en={r['code'] for r in recs}
print("codes FR:",len(fr),"| codes EN:",len(en))
print("dans FR sans titre EN:",len(fr-en), sorted(fr-en)[:15])
print("exemples titres EN:",[(r['code'],r['title_en'][:40]) for r in recs[:4]])
