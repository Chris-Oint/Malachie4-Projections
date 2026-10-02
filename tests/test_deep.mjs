import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs'; import http from 'node:http'; import { Readable } from 'node:stream';
const BASE='http://127.0.0.1:8080/';
function nodeFetch(url,opts={}){return new Promise((res,rej)=>{const u=new URL(url);const r=http.request({hostname:u.hostname,port:u.port,path:u.pathname+u.search,method:opts.method||'GET'},x=>{res(new Response(Readable.toWeb(x),{status:x.statusCode,headers:x.headers}));});r.on('error',rej);r.end();});}
const vc=new VirtualConsole(); const errs=[]; vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(fs.readFileSync('/home/user/index.html','utf8'),{url:BASE,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc});
const {window}=dom;
window.fetch=(u,o)=>nodeFetch(new URL(u,BASE).href,o);
window.DecompressionStream=DecompressionStream; window.Response=Response; window.Headers=Headers; window.Request=Request;
window.caches={open:async()=>({match:async()=>null,put:async()=>{}}),keys:async()=>[],delete:async()=>{}};
window.navigator.clipboard={writeText:async()=>{}};
window.IntersectionObserver=class{constructor(cb){this.cb=cb}observe(){}unobserve(){}disconnect(){}};
window.navigator.storage={estimate:async()=>({usage:1e6,quota:1e9})};
window.matchMedia=window.matchMedia||(()=>({matches:false,addListener(){},removeListener(){}}));
const sc=window.document.createElement('script'); sc.textContent=fs.readFileSync('/home/user/app.js','utf8'); window.document.body.appendChild(sc);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(2500);
// limiter le catalogue à 80 prédications pour un test rapide
window.eval("state.cat.sermons = state.cat.sermons.slice(0,80); state.sermons = state.cat.sermons;");
const $=s=>window.document.querySelector(s);
const tab=Array.from(window.document.querySelectorAll('[data-go]')).find(b=>b.dataset.go==='search');
tab.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
await sleep(300);
$('#deepQ').value='foi'; $('#deepGo').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
for(let i=0;i<40 && !/textes lus/.test($('#deepStatus').textContent);i++){ await sleep(1000); if(i===25) $('#deepStop').dispatchEvent(new window.MouseEvent('click',{bubbles:true})); }
console.log('statut:', $('#deepStatus').textContent);
console.log('résultats affichés:', window.document.querySelectorAll('#deepResults .item').length);
console.log('premier résultat:', (window.document.querySelector('#deepResults .item')?.textContent||'').replace(/\s+/g,' ').trim().slice(0,150));
console.log('barre:', $('#deepBar').style.width);
console.log('erreurs:', errs.filter(e=>!/scrollTo|not implemented/i.test(e)).length? errs.slice(0,3):'aucune');
