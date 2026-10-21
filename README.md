# Intranet REALSEG

Intranet corporativa da REALSEG, com dois ambientes:

- **Colaborador**: implementado (Home, Comunicados, Documentos, Solicitações com SLA, Cursos, Minha carreira, Feedbacks, Ajuda, Fale com o RH, Notificações, Perfil e Busca).
- **Gestão (RH/Administração)** em `/rh`: painel, solicitações (fila e atendimento), comunicados e agenda, documentos (análise de envios, distribuição individual e em lote, normas), colaboradores e estrutura, cursos e trilhas, carreira, feedbacks, central de ajuda, configurações de prazo e calendário e auditoria. Cada tela exige a sua permissão. Atalho "Painel de gestão" no menu da conta.

Mobile-first, fiel às referências visuais em `referencias/`, acessível (WCAG 2.2 AA verificado por testes) e com autorização feita no servidor em toda leitura e escrita.

| | |
| --- | --- |
| **Homologação** | https://realseg-intra-seven.vercel.app (Vercel, região `gru1`, São Paulo) |
| **Banco** | Neon PostgreSQL (`aws-sa-east-1`, São Paulo) |
| **Repositório** | `main` publica automaticamente na Vercel |
| **Versão** | ver [`docs/CHANGELOG.md`](docs/CHANGELOG.md) |

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript estrito · Tailwind CSS 4 · PostgreSQL · Drizzle ORM · Zod 4 · lucide-react · Vitest · Playwright + axe. As decisões estão em [`docs/ADR`](docs/ADR) e a arquitetura em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Rodar localmente

Pré-requisitos: Node.js ≥ 22.12 e pnpm 11 (`corepack enable`). **Não é preciso instalar banco nem Docker**: o projeto sobe um PostgreSQL 18 real embarcado (`embedded-postgres`) para desenvolvimento e testes.

```bash
pnpm install
cp .env.example .env.local        # ajuste IP_HASH_SECRET (openssl rand -hex 32)
pnpm dev:full                     # PostgreSQL local (porta 54320) + migrações + Next em http://localhost:3000
pnpm db:reset:demo                # em outro terminal, na 1ª vez: recria o banco local com dados de DEMONSTRAÇÃO
```

Alternativa em terminais separados: `pnpm db:dev` (banco), depois `pnpm db:migrate` e `pnpm dev`.

**Acesso de demonstração (local)**: matrícula `100231` (Carlos Silva) ou `carlos.silva@demo.realseg.invalid`, senha `Realseg@2026`. Outros: `100198` (Ana, outra unidade), `100402` (João, sem histórico, para ver os estados vazios), `100012` (Mariana, **RH**: acessa a gestão) e `100077` (Lucas, **Administrador**: configurações e auditoria). Todos os dados são fictícios (domínio reservado `@demo.realseg.invalid`).

**Na homologação** as mesmas contas existem, mas a senha é o segredo `DEMO_PASSWORD` configurado na Vercel. A senha local acima não vale lá.

## Deploy (Vercel + Neon)

Fluxo: commit no `main` → push → a Vercel publica.

- **Build:** a Vercel executa `pnpm run vercel-build` (`scripts/vercel-build.mjs`):
  - em **Production**: aplica as migrações no Neon pela conexão direta (`DATABASE_URL_UNPOOLED`), roda o seed idempotente (dados de referência sempre; demonstração só com `SEED_DEMO=true` e uma única vez) e compila;
  - em **Preview**: só compila, sem tocar no banco (que é o de produção).
- **Deploy pulado:** commits que alteram só documentação, testes ou referências não geram deploy (`ignoreCommand` em `vercel.json`).
- **Cron diário:** às 06:00 de Brasília, executa a manutenção (`/api/cron/daily`, protegido por `CRON_SECRET`).
- **Variáveis na Vercel:** a integração Neon cria `DATABASE_URL` (pooler) e `DATABASE_URL_UNPOOLED` (direta). As demais (`APP_ENV`, `APP_URL`, `IP_HASH_SECRET`, `DEMO_PASSWORD`, `SEED_DEMO`, `MAIL_DRIVER`, `TRUST_PROXY`, `CRON_SECRET`) estão descritas em [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

**Custos:** a configuração é pensada para caber nos planos gratuitos. Leia [`docs/COST_OPTIMIZATION.md`](docs/COST_OPTIMIZATION.md) antes de mudar navegação, imagens, jobs ou conexões com o banco. O plano Hobby da Vercel é só para uso não comercial; a produção da empresa exige o plano Pro.

## Banco de dados e migrações

- Esquema em `src/server/db/schema` (Drizzle) e migrações versionadas em `drizzle/`, aplicadas automaticamente no deploy de produção.
- **Mudança de estrutura** (tabela, coluna, índice): altere o esquema e rode `pnpm db:generate --name <descricao>`.
- **Correção ou transformação de dados existentes**: migration SQL personalizada, com `pnpm db:generate --custom --name <descricao>` (exemplo: `drizzle/0002_course_covers_webp.sql`).
- **Configuração inicial** (papéis, permissões, categorias, calendário de SLA): seed de referência idempotente (`scripts/seed/reference.ts`).
- Nunca edite uma migration já aplicada. Remoções e renomeações são feitas em dois deploys (*expand/contract*).

## Variáveis de ambiente

Veja [`.env.example`](.env.example). As principais: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `APP_URL`, `APP_ENV`, `IP_HASH_SECRET`, `SESSION_*`, `STORAGE_DIR`, `UPLOAD_MAX_MB`, `MAIL_DRIVER`/`SMTP_*`, `SEED_DEMO`, `DEMO_PASSWORD` e `CRON_SECRET`. A aplicação valida tudo na inicialização e **recusa** configurações inseguras em produção (`APP_ENV=production`), como e-mail em modo outbox, segredo padrão ou URL sem HTTPS.

## Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm dev` / `pnpm dev:full` | Servidor de desenvolvimento (sem/com o banco embarcado) |
| `pnpm build` / `pnpm start` | Build e execução de produção |
| `pnpm lint` / `pnpm typecheck` | ESLint e TypeScript (`next typegen` + `tsc`) |
| `pnpm test:unit` | Testes unitários (SLA, máquina de estados, validações, criptografia) |
| `pnpm test:integration` | Integração com PostgreSQL real (serviços, rotas HTTP, autorização, cron) |
| `pnpm test:e2e` | Playwright em desktop e mobile, com axe. Requer `pnpm build` antes |
| `pnpm check` | lint + tipos + unitários + integração + build |
| `pnpm db:dev` | Sobe o PostgreSQL local (porta 54320) |
| `pnpm db:generate` | Gera migration a partir do esquema |
| `pnpm db:migrate` | Aplica as migrations versionadas |
| `pnpm db:seed` | Somente dados de referência (qualquer ambiente) |
| `pnpm db:seed:demo` / `pnpm db:reset:demo` | Dados de demonstração (proibido em produção) |
| `pnpm jobs:run` | Executa manualmente a manutenção diária (a mesma do cron) |

Utilitários de desenvolvimento, em `scripts/dev/`:
- `screenshot.mjs <prefixo> <rotas…>`: capturas desktop e mobile;
- `crawl.mjs`: percorre todos os links e aponta erros e rolagem horizontal;
- `measure.mjs`: requisições e bytes de uma sessão típica, para conferir custos.

## Estrutura

```
src/app/            rotas: (auth) login e senha · (colaborador) telas · (rh) gestão em /rh · api/v1 REST (api/v1/rh = gestão) · api/cron
src/components/     UI reutilizável (ui/) e layout (sidebar, topbar, navegação mobile)
src/features/       componentes de cada módulo
src/lib/            utilitários e schemas Zod compartilhados entre cliente e servidor
src/server/         env, db (esquema), auth, http, services (regras + autorização), sla, files, jobs
drizzle/            migrations versionadas
scripts/            migrate, seeds, build da Vercel, servidor E2E, utilitários de dev
tests/ · e2e/       Vitest (unitários/integração) · Playwright
public/logo/        logo oficial (símbolo SVG + wordmark) · public/images/: imagens WebP
referencias/        mockups de referência (desktop e mobile)
```

## Documentação

[Visão do produto](docs/PRODUCT_OVERVIEW.md) · [Requisitos](docs/REQUIREMENTS.md) · [Arquitetura](docs/ARCHITECTURE.md) · [Modelo de dados](docs/DATA_MODEL.md) · [Segurança](docs/SECURITY.md) · [LGPD](docs/PRIVACY_LGPD.md) · [API](docs/API.md) · [Design system](docs/DESIGN_SYSTEM.md) · [Testes](docs/TEST_STRATEGY.md) · [Runbook](docs/RUNBOOK.md) · [Otimização de custos](docs/COST_OPTIMIZATION.md) · [Status das funcionalidades](docs/FEATURE_STATUS.md) · [Changelog](docs/CHANGELOG.md)
