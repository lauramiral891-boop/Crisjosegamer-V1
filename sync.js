/* CrisJoseGamers — sincronização online (offline-first). Edite só a linha API abaixo. */
(function(){
const API='https://COLE-AQUI-O-ENDERECO-DO-RENDER.onrender.com';
const base=()=>(localStorage.getItem('cjgApi')||API).replace(/\/$/,'');
const on=()=>!/COLE-AQUI/.test(base());
const K={machines:'machine',sessions:'session',sales:'sale',expenses:'expense',cjgLog:'log',cjgPosts:'post',cjgStories:'story',cjgGroups:'group',cjgCommunities:'community',cjgFollowing:'following',cjgGallery:'gallery',cjgAdminPosts:'adminpost'};
const NODEL=['machine','post','story','group','community','following','gallery','adminpost'];               // só estes tipos propagam remoções
const gj=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const rawSet=Storage.prototype.setItem;let applying=false,busy=false,timer=null,hold=false;
Storage.prototype.setItem=function(k,v){rawSet.call(this,k,v);if(K[k]&&!applying)kick()};
const idOf=(kind,x)=>kind==='log'?'l'+x.t+'_'+x.by:x.id;
const tok=()=>localStorage.getItem('cjgToken');
async function call(path,body,ms){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms||70000);
 try{const r=await fetch(base()+path,{method:'POST',signal:c.signal,headers:{'Content-Type':'application/json',...(tok()?{Authorization:'Bearer '+tok()}:{})},body:JSON.stringify(body||{})});
  const j=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(j.error||'Erro do servidor');e.status=r.status;throw e}return j}
 catch(e){if(e.name==='AbortError'||e instanceof TypeError){const n=new Error('Sem ligação ao servidor. Verifique a internet e tente de novo (na primeira vez pode demorar cerca de 1 minuto).');n.offline=true;throw n}throw e}}
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');
function startSession(r,extra){const prev=localStorage.getItem('cjgHouse');
 if(prev&&prev!==r.user.house){Object.keys(K).forEach(k=>localStorage.removeItem(k));['cjgSnap','cjgSince'].forEach(k=>localStorage.removeItem(k))}
 localStorage.setItem('cjgHouse',r.user.house);localStorage.setItem('cjgToken',r.token);localStorage.setItem('cjgUserId',r.user.id);localStorage.setItem('cjgSession','active');
 localStorage.setItem('companyName',r.user.company||'Minha Game House');localStorage.setItem('cjgRole',r.user.role==='employee'?'employee':'owner');
 if(r.user.role==='employee')localStorage.setItem('cjgWho',r.user.name);else localStorage.setItem('accountName',r.user.name);Object.entries(extra||{}).forEach(([k,v])=>localStorage.setItem(k,v));kick(300)}
async function register(email,password,name,company){const r=await call('/register',{email,password,name,company});startSession(r,{accountEmail:email,cjgOff:await sha(email.toLowerCase()+'|'+password)});return r}
async function login(email,password){try{const r=await call('/login',{email,password});startSession(r,{accountEmail:email,cjgOff:await sha(email.toLowerCase()+'|'+password)});return r}
 catch(e){if(e.offline&&localStorage.getItem('cjgOff')&&localStorage.getItem('cjgOff')===await sha(email.toLowerCase()+'|'+password)&&localStorage.getItem('cjgToken')){localStorage.setItem('cjgSession','active');localStorage.setItem('cjgRole','owner');return{offline:true}}throw e}}
async function employeeLogin(name,password,code){const r=await call('/employee-login',{name,password,code});startSession(r);return r}
const addEmployee=(name,password,code)=>call('/employees',{name,password,code},20000);
const delEmployee=code=>call('/employees/delete',{code},20000).catch(()=>{});
function kick(ms){clearTimeout(timer);timer=setTimeout(sync,ms==null?1200:ms)}
async function sync(){if(!on()||!tok()||busy||hold||document.hidden&&0)return;busy=true;
 try{const snap=gj('cjgSnap',{}),since=+localStorage.getItem('cjgSince')||0,cur={},changes=[],now=Date.now();
  for(const[key,kind]of Object.entries(K))for(const x of gj(key,[])){const id=idOf(kind,x);if(id)cur[kind+'|'+id]=JSON.stringify(x)}
  for(const k in cur)if(snap[k]!==cur[k]){const[kind,...r]=k.split('|');changes.push({kind,id:r.join('|'),data:JSON.parse(cur[k]),updated:now})}
  for(const k in snap)if(!(k in cur)){const[kind,...r]=k.split('|');if(NODEL.includes(kind))changes.push({kind,id:r.join('|'),deleted:true});else delete snap[k]}
  const res=await call('/sync',{since,changes},60000);let changed=false;const by={};
  for(const c of res.changes)(by[c.kind]||(by[c.kind]=[])).push(c);
  applying=true;
  for(const[key,kind]of Object.entries(K)){const cs=by[kind];if(!cs)continue;const before=JSON.stringify(gj(key,[])),list=gj(key,[]),m=new Map(list.map(x=>[idOf(kind,x),x]));
   for(const c of cs){const k=kind+'|'+c.id;if(c.deleted){m.delete(c.id);delete snap[k]}else{m.set(c.id,c.data);snap[k]=JSON.stringify(c.data)}}
   let out=[...m.values()];if(kind==='post')out.sort((a,b)=>b.created-a.created);if(kind==='session'||kind==='sale'||kind==='expense')out.sort((a,b)=>(a.start||a.t||0)-(b.start||b.t||0));if(kind==='log')out.sort((a,b)=>b.t-a.t);
   if(JSON.stringify(out)!==before){rawSet.call(localStorage,key,JSON.stringify(out));changed=true}}
  applying=false;
  rawSet.call(localStorage,'cjgSnap',JSON.stringify(snap));rawSet.call(localStorage,'cjgSince',String(res.cursor));rawSet.call(localStorage,'cjgLastSync',String(Date.now()));
  window.dispatchEvent(new Event('cjg-status'));if(changed&&window.onSynced)window.onSynced()
 }catch(e){applying=false;if(e.status===401){localStorage.removeItem('cjgToken')}window.dispatchEvent(new Event('cjg-status'))}
 busy=false}
window.CJG={on,register,login,employeeLogin,addEmployee,delEmployee,sync,kick,hold:v=>{hold=v;if(!v)kick(200)},last:()=>+localStorage.getItem('cjgLastSync')||0};
if(on()){setInterval(sync,8000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});window.addEventListener('online',()=>sync());setTimeout(sync,400)}
})();
