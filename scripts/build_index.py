import re, json, html as H
h=open('src/sermons.html',encoding='utf-8',errors='ignore').read()
rows=re.findall(r'(?is)<tr class="my-2">(.*?)</tr>', h)
print("rows:",len(rows))
out=[]
for r in rows:
    r=re.sub(r'(?s)<!--.*?-->',' ',r)
    m=re.search(r'href="(/sermons/[^"]+)"[^>]*>([^<]+)</a>', r, re.I)
    if not m: continue
    tds=re.findall(r'(?is)<td[^>]*>(.*?)</td>', r)
    code = H.unescape(re.sub(r'(?s)<[^>]+>','',tds[0])).strip() if tds else ''
    entit = H.unescape(re.sub(r'(?s)<[^>]+>','',tds[2])).strip() if len(tds)>2 else ''
    trad  = H.unescape(re.sub(r'(?s)<[^>]+>','',tds[3])).strip() if len(tds)>3 else ''
    pdf   = (re.search(r'href="([^"]*\.pdf)"', r, re.I).group(1) if re.search(r'href="([^"]*\.pdf)"', r, re.I) else '')
    mp3   = (re.search(r'href="([^"]*\.mp3)"', r, re.I).group(1) if re.search(r'href="([^"]*\.mp3)"', r, re.I) else '')
    out.append({'code':code,'title':H.unescape(m.group(2)).strip(),'url':m.group(1),
                'title_en':entit,'trad':trad,'pdf':pdf,'mp3':mp3})
json.dump(out, open('data/sermons_index.json','w'), ensure_ascii=False, indent=0)
print("kept:",len(out))
print("codes sample:", [o['code'] for o in out[:5]], out[-1]['code'])
tr={}
for o in out: tr[o['trad']]=tr.get(o['trad'],0)+1
print("trads:",tr)
print("with pdf:",sum(1 for o in out if o['pdf']), "with mp3:",sum(1 for o in out if o['mp3']))
