import re, json, urllib.request, http.cookiejar, html as H, sys

BASE="https://themessage.com"
PAGE=BASE+"/fr/sermonsdownload"
ENDPOINT=BASE+"/themessage/sermonsdownload.aspx"
UA={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
    "Accept":"application/json, text/javascript, */*; q=0.01",
    "X-Requested-With":"XMLHttpRequest","Referer":PAGE,"Origin":BASE}

cj=http.cookiejar.CookieJar()
op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
op.addheaders=list(UA.items())

def get_page():
    h=op.open(PAGE,timeout=60).read().decode('utf-8','ignore')
    fields=[]
    for m in re.finditer(r'<input[^>]*>',h):
        tag=m.group(0)
        n=re.search(r'name="([^"]+)"',tag); v=re.search(r'value="([^"]*)"',tag)
        if n and v:
            fields.append({'name':n.group(1),'value':H.unescape(v.group(1))})
    return h, fields

def call(method, extra):
    global FIELDS
    body={"formVars":FIELDS+extra}
    req=urllib.request.Request(ENDPOINT+"/"+method, data=json.dumps(body).encode(),
                               headers={**UA,"Content-Type":"application/json; charset=utf-8"})
    raw=op.open(req,timeout=90).read().decode('utf-8','ignore')
    try:
        return json.loads(raw).get('d','')
    except Exception:
        return raw

if __name__=='__main__':
    h, FIELDS = get_page()
    print("champs de formulaire:", len(FIELDS), "| viewstate:", len(FIELDS[3]['value']) if len(FIELDS)>3 else 0)
    out=call('wmSearchByYear',[{'name':'year','value':'65'}])
    print("réponse len:", len(out))
    print(re.sub(r'\s+',' ',re.sub(r'(?s)<[^>]+>',' ',out))[:600])
    print("--- liens ---")
    for l in sorted(set(re.findall(r'href="([^"]+)"',out)))[:25]: print("  ",l[:150])
    open('/tmp/vgr_sample.html','w').write(out)
