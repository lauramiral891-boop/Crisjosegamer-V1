// API CrisJoseGamers — sem dependências além de "pg". Sem DATABASE_URL usa memória (só para testes).
const http=require('http'),crypto=require('crypto');
const SECRET=process.env.JWT_SECRET||'trocar-este-segredo',PORT=process.env.PORT||3000;
let last=0;const nextSrv=()=>last=Math.max(Date.now(),last+1);
const HOUSE=['machine','session','sale','expense','log','following','gallery'],GLOBAL=['post','story','group','community','adminpost'];
// ---------- armazenamento
let db;
if(process.env.DATABASE_URL){
  const{Pool}=require('pg');const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:5});
  const q=(t,p)=>pool.query(t,p).then(r=>r.rows);
  db={ping:()=>q('select 1'),
   userByEmail:async e=>(await q('select * from users where email=$1',[e]))[0],
   userByCode:async c=>(await q('select * from users where code=$1',[c]))[0],
   addUser:u=>q('insert into users(id,email,name,company,pass,role,house,code,created) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',[u.id,u.email,u.name,u.company,u.pass,u.role,u.house,u.code,u.created]),
   delUser:(c,h)=>q('delete from users where code=$1 and house=$2 and role=$3',[c,h,'employee']),
   getRec:async(h,k,i)=>(await q('select * from records where house=$1 and kind=$2 and id=$3',[h,k,i]))[0],
   putRec:(h,k,i,d,del,s)=>q('insert into records(house,kind,id,data,srv,deleted) values($1,$2,$3,$4,$5,$6) on conflict(house,kind,id) do update set data=$4,srv=$5,deleted=$6',[h,k,i,JSON.stringify(d??null),s,!!del]),
   since:(h,s)=>q("select kind,id,data,srv,deleted from records where (house=$1 or house='*') and srv>$2 order by srv limit 2000",[h,s])};
}else{
  const U=[],R=new Map();
  db={ping:async()=>1,userByEmail:async e=>U.find(u=>u.email===e),userByCode:async c=>U.find(u=>u.code===c),addUser:async u=>{U.push(u)},
   delUser:async(c,h)=>{const i=U.findIndex(u=>u.code===c&&u.house===h&&u.role==='employee');if(i>=0)U.splice(i,1)},
   getRec:async(h,k,i)=>R.get(h+'|'+k+'|'+i),putRec:async(h,k,i,d,del,s)=>{R.set(h+'|'+k+'|'+i,{house:h,kind:k,id:i,data:d,deleted:!!del,srv:s})},
   since:async(h,s)=>[...R.values()].filter(r=>(r.house===h||r.house==='*')&&r.srv>s).sort((a,b)=>a.srv-b.srv).slice(0,2000)};
}
// ---------- segurança
const b64=b=>Buffer.from(b).toString('base64url');
const sign=p=>{const x=b64(JSON.stringify({...p,exp:Date.now()+90*864e5})),s=crypto.createHmac('sha256',SECRET).update(x).digest('base64url');return x+'.'+s};
function verify(t){try{const[x,s]=String(t).split('.');const ok=crypto.createHmac('sha256',SECRET).update(x).digest('base64url');if(s.length!==ok.length||!crypto.timingSafeEqual(Buffer.from(s),Buffer.from(ok)))return null;const p=JSON.parse(Buffer.from(x,'base64url'));return p.exp>Date.now()?p:null}catch{return null}}
const hash=p=>{const s=crypto.randomBytes(16).toString('hex');return s+':'+crypto.scryptSync(p,s,32).toString('hex')};
const check=(p,h)=>{const[s,k]=h.split(':');const a=crypto.scryptSync(p,s,32),b=Buffer.from(k,'hex');return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const tries=new Map();function limited(ip){const n=Date.now(),a=(tries.get(ip)||[]).filter(t=>n-t<6e4);a.push(n);tries.set(ip,a);return a.length>30}
// ---------- fusão de publicações (comentários e reações de várias pessoas sem se perderem)
function mergeC(a=[],b=[]){const m=new Map(a.map(c=>[c.id,c]));for(const c of b){const e=m.get(c.id);if(!e)m.set(c.id,c);else{e.replies=mergeC(e.replies,c.replies);e.likes=Math.max(e.likes||0,c.likes||0)}}return[...m.values()].sort((x,y)=>x.created-y.created)}
function mergePost(old,neu,actor){if(!old)return neu;const o={...old};o.comments=mergeC(old.comments,neu.comments);o.reacts={...(old.reacts||{})};if(neu.reacts&&actor in neu.reacts)o.reacts[actor]=neu.reacts[actor];o.likes=Object.values(o.reacts).filter(Boolean).length;o.shares=Math.max(old.shares||0,neu.shares||0);return o}
// ---------- HTTP
const send=(res,c,o)=>{res.writeHead(c,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});res.end(JSON.stringify(o))};
const body=req=>new Promise((ok,no)=>{let d='',n=0;req.on('data',c=>{n+=c.length;if(n>12e6){no(new Error('grande'));req.destroy()}else d+=c});req.on('end',()=>{try{ok(JSON.parse(d||'{}'))}catch{no(new Error('json'))}});});
const S=x=>String(x||'').trim();
const session=u=>({token:sign({id:u.id,house:u.house,role:u.role,name:u.name,company:u.company}),user:{id:u.id,name:u.name,company:u.company,role:u.role,house:u.house}});
const routes={
 'POST /register':async(b)=>{const email=S(b.email).toLowerCase(),pw=String(b.password||'');if(!/^\S+@\S+\.\S+$/.test(email)||pw.length<6||!S(b.name)||!S(b.company))return[400,{error:'Preencha nome, empresa, e-mail válido e palavra-passe com 6+ caracteres.'}];
  if(await db.userByEmail(email))return[409,{error:'Este e-mail já tem conta. Use "Conta existente".'}];
  const id=crypto.randomUUID(),u={id,email,name:S(b.name),company:S(b.company),pass:hash(pw),role:'owner',house:id,code:null,created:Date.now()};await db.addUser(u);return[200,session(u)]},
 'POST /login':async(b)=>{const u=await db.userByEmail(S(b.email).toLowerCase());if(!u||!check(String(b.password||''),u.pass))return[401,{error:'E-mail ou palavra-passe incorretos.'}];return[200,session(u)]},
 'POST /employee-login':async(b)=>{const u=await db.userByCode(S(b.code).toLowerCase());if(!u||u.name.toLowerCase()!==S(b.name).toLowerCase()||!check(String(b.password||''),u.pass))return[401,{error:'Utilizador, palavra-passe ou código incorretos.'}];return[200,session(u)]},
 'POST /employees':async(b,a)=>{if(a.role!=='owner')return[403,{error:'Só o proprietário cria funcionários.'}];const code=S(b.code).toLowerCase();if(!S(b.name)||!code||String(b.password||'').length<4)return[400,{error:'Preencha nome, código e senha (4+ caracteres).'}];
  if(await db.userByCode(code))return[409,{error:'Este código já está em uso. Escolha outro.'}];await db.addUser({id:crypto.randomUUID(),email:null,name:S(b.name),company:a.company,pass:hash(String(b.password)),role:'employee',house:a.house,code,created:Date.now()});return[200,{ok:true}]},
 'POST /employees/delete':async(b,a)=>{if(a.role!=='owner')return[403,{error:'Sem permissão.'}];await db.delUser(S(b.code).toLowerCase(),a.house);return[200,{ok:true}]},
 'POST /sync':async(b,a)=>{const since=+b.since||0;
  for(const c of(Array.isArray(b.changes)?b.changes:[]).slice(0,3000)){const g=GLOBAL.includes(c.kind);if(!g&&!HOUSE.includes(c.kind))continue;if(a.role==='employee'&&c.kind==='expense')continue;
   const h=g?'*':a.house,id=S(c.id).slice(0,120);if(!id)continue;const old=await db.getRec(h,c.kind,id);
   if(g&&c.deleted){if(old&&old.data&&old.data.authorId&&old.data.authorId!==a.id)continue;await db.putRec(h,c.kind,id,null,true,nextSrv());continue}
   if(c.deleted){await db.putRec(h,c.kind,id,null,true,nextSrv());continue}
   let d=c.data;if(!d||typeof d!=='object')continue;if(g){if(old&&old.data&&!old.deleted)d=mergePost(old.data,d,a.id);else d.authorId=a.id}
   await db.putRec(h,c.kind,id,d,false,nextSrv())}
  const rows=await db.since(a.house,since);return[200,{cursor:rows.length?Math.max(...rows.map(r=>+r.srv)):since,changes:rows.map(r=>({kind:r.kind,id:r.id,data:r.data,deleted:!!r.deleted}))}]}
};
async function initDb(){
 if(!process.env.DATABASE_URL)return;
 const {Pool}=require('pg');
 const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:5});
 const sql=require('fs').readFileSync(require('path').join(__dirname,'schema.sql'),'utf8');
 await pool.query(sql);
 await pool.end();
 console.log('PostgreSQL: schema pronto');
}

http.createServer(async(req,res)=>{
 try{if(req.method==='OPTIONS')return send(res,204,{});const path=req.url.split('?')[0];
  if(path==='/'||path==='/health'){await db.ping();return send(res,200,{ok:true,t:Date.now()})}
  const r=routes[req.method+' '+path];if(!r)return send(res,404,{error:'não encontrado'});
  if(limited(req.socket.remoteAddress)&&/login|register/.test(path))return send(res,429,{error:'Muitas tentativas. Aguarde um minuto.'});
  const b=await body(req);let a=null;if(!/login|register/.test(path)){a=verify((req.headers.authorization||'').replace('Bearer ',''));if(!a)return send(res,401,{error:'Sessão expirada. Entre novamente.'})}
  const[c,o]=await r(b,a);send(res,c,o)
 }catch(e){console.error(e);send(res,500,{error:'Erro no servidor.'})}
}).listen(PORT,'0.0.0.0',()=>console.log('API na porta '+PORT+(process.env.DATABASE_URL?' (Postgres)':' (memória — só testes)')));

initDb().catch(e=>{console.error('Falha ao preparar PostgreSQL:',e);process.exit(1)});
