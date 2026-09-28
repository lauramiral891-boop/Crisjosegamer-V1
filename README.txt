CRISJOSEGAMERS — PACOTE ONLINE

Este pacote mantém a interface e acrescenta a configuração para colocar a API de sincronização no Render.

PUBLICAÇÃO NO RENDER
1. Crie um repositório no GitHub e envie a pasta inteira do projeto.
2. No Render: New > Blueprint. Escolha o repositório.
3. O arquivo render.yaml cria a API + PostgreSQL automaticamente.
4. Aguarde o deploy e abra a URL do serviço /health. Deve aparecer {"ok":true,...}.
5. Copie a URL https://...onrender.com e coloque-a na linha API do sync.js, substituindo COLE-AQUI-O-ENDERECO-DO-RENDER.
6. Gere/reinstale o APK.

TESTE CELULAR -> CELULAR
- Celular A e B entram na mesma conta/empresa.
- A publica uma foto/story ou cria grupo/comunidade.
- A toca ONLINE · SINCRONIZAR AGORA.
- B toca o mesmo botão.
- O conteúdo chega pelo servidor.

ATENÇÃO AO MODO GRATUITO
O Render Free é adequado para teste. O web service pode dormir após 15 minutos sem tráfego e o PostgreSQL Free expira após 30 dias. Para manter os dados por mais tempo, troque a base por Supabase Free ou passe o PostgreSQL do Render para um plano pago.

VÍDEOS
Vídeos locais não são enviados para o servidor. Para aparecerem em outros telemóveis, use URL do YouTube/Facebook/TikTok na publicação.
