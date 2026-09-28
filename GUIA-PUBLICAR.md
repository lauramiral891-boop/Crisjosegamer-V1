# Pôr a CrisJoseGamers online (custo zero)

Precisa de: conta no GitHub, no Supabase e no Render (todas gratuitas).

## 1) Base de dados — Supabase
1. supabase.com → **New project**. Escolha uma região próxima (ex.: Cape Town ou Frankfurt) e guarde a palavra-passe da base de dados.
2. Menu **SQL Editor** → cole o conteúdo de `schema.sql` → **Run**.
3. **Project Settings → Database → Connection string → Session pooler** (URI). Copie e troque `[YOUR-PASSWORD]` pela sua palavra-passe. (Use o *pooler*: o Render gratuito não liga à ligação direta.)

## 2) Servidor — Render
1. Crie um repositório no GitHub e envie **só o conteúdo desta pasta `servidor`** (server.js, package.json, schema.sql).
2. render.com → **New → Web Service** → escolha o repositório.
   - Runtime: Node · Build: `npm install` · Start: `npm start` · Instance: **Free**
3. Em **Environment** adicione:
   - `DATABASE_URL` = a ligação copiada no passo 1.3
   - `JWT_SECRET` = uma frase longa e aleatória (não a partilhe)
4. Deploy. Abra `https://O-SEU-SERVIDOR.onrender.com/health`: deve aparecer `{"ok":true,...}`.

## 3) Ligar a app
1. Abra `sync.js` (na raiz do projeto) e troque `https://COLE-AQUI-O-ENDERECO-DO-RENDER.onrender.com` pelo endereço do passo 2.4.
2. Gere o APK de novo com o seu processo habitual e reinstale nos telemóveis.
3. Crie a conta do proprietário **com internet**. Depois disso a app funciona offline e sincroniza quando houver rede.

## 4) Manter acordado (recomendado)
- O Render gratuito adormece após ~15 min sem uso (o 1.º pedido demora ~1 min).
- O Supabase gratuito pausa o projeto após 7 dias sem atividade.
- Solução grátis: uptimerobot.com → novo monitor HTTP em `.../health` de 5 em 5 minutos. Resolve as duas coisas.

## Limites conhecidos
- Fotografias das publicações sincronizam (reduzidas). Vídeos ficam só no telemóvel de quem os publica: use link do YouTube/Facebook/TikTok.
- Stories, grupos, comunidades e publicidade do ADM ainda não sincronizam.
- Sem internet, nada se perde: fica no telemóvel e é enviado depois.
