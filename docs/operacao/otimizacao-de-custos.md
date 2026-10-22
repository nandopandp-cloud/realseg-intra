# Otimização de custos — Vercel e Neon

Registro do **que** foi otimizado, **por que** e **como**, para manter a intranet dentro dos planos gratuitos (Vercel Hobby e Neon Free) e para consulta antes de qualquer mudança que possa aumentar o consumo.

Versão: 0.4.0 · 2026-10-18 (revisado em 2026-10-22) · Medições feitas com `scripts/dev/measure.mjs` em build de produção local.

## Limites que importam (planos gratuitos)

| Serviço | Recurso | Limite mensal | O que consome |
| --- | --- | --- | --- |
| Vercel Hobby | Function Invocations | 1.000.000 | Cada página, navegação, prefetch dinâmico, chamada à API e cron |
| Vercel Hobby | Active CPU | 4 horas | Tempo de CPU das funções (renderização, hash de senha) |
| Vercel Hobby | Fast Data Transfer | 100 GB | Bytes entregues ao navegador (HTML, JS, CSS, imagens) |
| Vercel Hobby | Fast Origin Transfer | 10 GB | Bytes que saem das funções para a CDN (HTML dinâmico, downloads de arquivos) |
| Vercel Hobby | Image Optimization | 5 mil transformações · 100 mil gravações de cache | Uso do `/_next/image` |
| Vercel Hobby | Cron | 1 execução por dia por job | Jobs agendados |
| Neon Free | Compute | 100 CU-hora por projeto | Tempo em que o banco fica **ligado** (desliga após 5 min sem uso) |
| Neon Free | Armazenamento | 1 GB por projeto | Dados + índices |
| Neon Free | Egress | 5 GB por projeto | Resultados de consultas enviados à aplicação |

**Regra de ouro do Neon:** o custo é o tempo em que o banco fica acordado, não a quantidade de consultas. Qualquer coisa que o acorde periodicamente (jobs frequentes, conexões presas, prefetch, builds) consome CU-hora. Com 0,25 CU, 100 CU-h ≈ 400 h/mês de banco ligado.

**Atenção — termos de uso:** o plano Hobby da Vercel é para uso **não comercial**. Serve para homologação; a intranet em produção para a empresa exige o plano Pro.

---

## 1. Prefetch automático desligado

- **O quê:** todos os links usam `src/components/ui/app-link.tsx`, um wrapper de `next/link` com `prefetch={false}` por padrão.
- **Por quê:** no Next 16, uma rota dinâmica com `loading.tsx` é prefetchada até o primeiro *loading boundary* sempre que um link entra na tela. Toda página da intranet é dinâmica (depende da sessão), então cada prefetch executava o layout no servidor: validação de sessão, notificações e preferências, ou seja, uma invocação de função e várias consultas ao Neon **sem nenhum clique**.
- **Como:** troca do import `next/link` por `@/components/ui/app-link` em todo o código. A experiência continua fluida porque o `loading.tsx` aparece no clique. Para um link crítico, passe `prefetch` explicitamente.
- **Efeito medido:** prefetches no servidor por sessão típica caíram de 3 para **0**. O número cresce com a quantidade de links visíveis, então páginas com muitos cards economizam mais.
- **Regra para o futuro:** nunca importe `next/link` direto (há um único import permitido, dentro do wrapper).

## 2. Imagens pré-otimizadas, sem Image Optimization

- **O quê:** as imagens de `public/images` foram convertidas de JPEG para **WebP** (318 KB → 144 KB) e `next.config.ts` usa `images.unoptimized: true`.
- **Por quê:** o otimizador de imagens da Vercel cobra por transformação (5 mil por mês no Hobby) e por gravação de cache. Cada combinação de imagem × largura × formato (AVIF/WebP) gera uma transformação, e o cache expira (no Next 16 o mínimo padrão é 4 h).
- **Como:** conversão com Pillow (WebP q=82). As imagens são servidas como arquivos estáticos da CDN. As capas de curso gravadas no banco foram atualizadas pela migration de dados `drizzle/0002_course_covers_webp.sql`.
- **Efeito medido:** transformações caíram de 11 para **0** por sessão. Trade-off: cerca de +40 KB no primeiro acesso (imagem inteira em vez de redimensionada por tela), irrelevante frente aos 100 GB de transferência e compensado pelo cache longo do item 3.
- **Regra para o futuro:** novas imagens entram já otimizadas em WebP (≤ 2× o tamanho exibido). Não use `/_next/image` para fotos enviadas por usuários; elas virão do R2.

## 3. Cache longo para arquivos públicos

- **O quê:** `/images/*` e `/logo/*` são servidos com `Cache-Control: public, max-age=2592000, stale-while-revalidate=86400` (30 dias).
- **Por quê:** sem isso, a Vercel serve a pasta `public` com revalidação a cada acesso. Cada visita gerava Edge Requests e respostas 304 para logo e imagens.
- **Como:** `headers()` em `next.config.ts`. JS e CSS do Next (`/_next/static`) já são imutáveis por hash.
- **Regra para o futuro:** ao trocar uma imagem ou logo, **publique com novo nome de arquivo**, senão navegadores podem manter a versão antiga por até 30 dias.

## 4. Menos trabalho do banco por página

- **Sininho sob demanda:** o layout buscava as 6 últimas notificações em toda navegação. Agora busca só a **contagem**, e a lista é carregada via `GET /api/v1/notifications?pageSize=6` quando o usuário abre o sininho (`src/components/layout/menus.tsx`). Resultado: uma consulta a menos e um HTML menor em toda página.
- **Gravação da sessão:** `last_seen_at` passou a ser atualizado no máximo a cada **5 min** (antes, 1 min) em `src/server/auth/session.ts`. A expiração por inatividade (60 min) continua precisa, com cerca de 5× menos escritas.
- **Já existente e mantido:** validação de sessão uma vez por requisição (`React.cache`), consultas em paralelo, paginação limitada a 50 e busca com índices.

## 5. Conexões curtas com o banco

- **O quê:** pool `pg` com no máximo 5 conexões por instância na Vercel, fechamento de conexões ociosas em 5 s e `attachDatabasePool` (`@vercel/functions`) em `src/server/db/client.ts`.
- **Por quê:** no Fluid Compute uma instância de função fica viva entre requisições. Conexões ociosas presas mantêm recursos abertos no pooler e podem atrasar a suspensão do Neon. `attachDatabasePool` libera os clientes ociosos antes de a função ser suspensa (recomendação oficial da Vercel).
- **Como:** a aplicação usa `DATABASE_URL` (pooler/PgBouncer do Neon). Migrações e seeds usam `DATABASE_URL_UNPOOLED` (conexão direta).

## 6. Deploys mais baratos

- **Build pulado quando só mudou documentação ou testes:** `ignoreCommand` em `vercel.json` compara o commit com o anterior e ignora `docs/`, `*.md`, `tests/`, `e2e/`, `referencias/`, `.github/` e `scripts/dev/`. Isso evita build e o despertar do Neon (migração + seed) em commits sem efeito no app, o que importa porque os commits são automáticos a cada mudança.
- **Preview não toca no banco:** `scripts/vercel-build.mjs` só roda migrações e seed em **Production**. Em Preview, o banco é o mesmo da produção, então build de branch não pode alterá-lo. Para habilitar: `PREVIEW_DB_TASKS=true`, recomendado só depois de ativar um branch Neon por preview.
- **Seed idempotente e leve:** a referência só acrescenta o que falta. A demonstração roda uma única vez (`SEED_DEMO=true`, nunca em produção).

## 7. Jobs: uma execução por dia

- **O quê:** a manutenção (monitor de SLA, fechamento automático de solicitações resolvidas há 7 dias, publicação dos comunicados agendados cuja data chegou e limpeza de sessões, links de redefinição e rate limit) roda **1x por dia** via Vercel Cron (`vercel.json` → `/api/cron/daily`, 09:00 UTC = 06:00 em Brasília), protegida por `CRON_SECRET`.
- **Por quê:** um job a cada 5 min manteria o Neon ligado 24 h (cerca de 180 CU-h/mês com 0,25 CU), acima dos 100 CU-h do plano. O Hobby também só permite cron diário.
- **Como:** lógica única em `src/server/jobs/maintenance.ts`, usada pela rota do cron e por `pnpm jobs:run`.
- **Quando revisar:** hoje o monitor de SLA roda 1x por dia, e a fila da gestão calcula a situação do prazo a cada acesso. Se o atendimento precisar de alertas de SLA em tempo real (notificação de risco ou de violação no mesmo instante), serão necessárias execuções mais frequentes. Nesse caso, agende só no horário comercial (ex.: a cada 30 min, de seg. a sex., das 08h às 18h, via GitHub Actions chamando a mesma rota) e reavalie o consumo de CU-hora.

## 8. Região única

As funções da Vercel (`gru1`) e o Neon (`aws-sa-east-1`) estão em São Paulo. Cada página faz várias consultas, e com o banco em outro continente cada uma custaria cerca de 120 ms a mais de CPU e de duração. Na mesma região, a latência cai para poucos milissegundos (ver [Runbook](runbook.md)).

---

## Ações manuais recomendadas (fora do código)

1. **Neon → Compute (Edit primary compute):** nada a fazer. Conferido em 2026-10-18: o autoscaling está fixo em **0,25 CU** (de 0,25 até 0,25) e o *scale to zero* em 5 min, e nenhum dos dois é configurável no plano Free. Se o projeto migrar para um plano pago, travar o máximo em 0,25–0,5 CU.
2. **Neon:** ativar o branch por preview na integração com a Vercel antes de criar migrações em outros branches.
3. **Vercel → Usage:** conferir mensalmente Function Invocations, Fast Origin Transfer e Active CPU.
4. **Neon → Monitoring:** acompanhar CU-hora e armazenamento (alerta mental: acima de 70 CU-h no mês, investigar o que está acordando o banco).

## Próximos passos (quando os módulos chegarem)

| Momento | Otimização planejada |
| --- | --- |
| Driver Cloudflare R2 | Download: autorizar e auditar na função e responder com **redirect 302 para URL pré-assinada do R2** (validade curta), para os bytes não passarem pela Vercel (Fast Origin Transfer) e saírem do R2, cujo egress é gratuito. Upload direto ao R2 com URL pré-assinada, validando o conteúdo depois. |
| Ambiente RH (entregue na v0.15) | Exportações CSV hoje são síncronas; se o volume crescer, torná-las paginadas ou assíncronas. Nunca listas sem limite. |
| Crescimento de dados | Política de retenção de `audit_events` e `notifications`, com arquivamento ou expurgo pelo job diário quando os prazos forem definidos (ver [Privacidade e LGPD](../seguranca/privacidade-lgpd.md)). |

## Como medir

```bash
pnpm build && npx next start -p 3300      # em outro terminal
node scripts/dev/measure.mjs http://localhost:3300
```
A saída mostra requisições por tipo (servidor, prefetch, estáticos, imagens otimizadas, API) e bytes de uma sessão típica. Compare antes e depois de qualquer mudança de layout ou navegação.

| Medição (sessão típica) | Antes (0.3.0) | Depois (0.4.0) |
| --- | --- | --- |
| Prefetches no servidor | 3 | 0 |
| Transformações de imagem | 11 | 0 |
| Cache de `/images` e `/logo` | revalidação a cada acesso | 30 dias |
| Consultas no layout por página | sessão + 4 | sessão + 2 |
| Escritas de sessão | até 1/min por usuário ativo | até 1 a cada 5 min |
| Execuções de job | manual (sem agendamento) | 1x por dia |
