# Intranet REALSEG — Security Intelligence

Plataforma web de intranet corporativa da REALSEG, com dois ambientes: **Colaborador** (implementado nesta fase) e **RH/Administração** (próxima fase — serviços de atendimento e permissões já preparados no backend).

Mobile-first, acessível (WCAG 2.2 AA como critério de aceite), com autorização verificada no servidor em toda leitura e escrita.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript estrito · Tailwind CSS 4 · PostgreSQL 18 · Drizzle ORM · Zod 4 · Vitest · Playwright + axe. Decisões em [`docs/ADR`](docs/ADR).

## Pré-requisitos

- Node.js ≥ 22.12 e pnpm 11 (`corepack enable`)
- Nenhum banco instalado é necessário em dev/teste: o projeto sobe um **PostgreSQL 18 real embarcado** (`embedded-postgres`). Em produção, use um PostgreSQL gerenciado.

## Primeiros passos

```bash
pnpm install
cp .env.example .env.local        # ajuste IP_HASH_SECRET
pnpm db:dev                       # terminal 1: PostgreSQL de dev (porta 54320)
pnpm db:migrate                   # terminal 2: aplica migrações
pnpm db:reset:demo                # dados de DEMONSTRAÇÃO (somente dev)
pnpm dev                          # http://localhost:3000
```

Ou tudo de uma vez: `pnpm dev:full` (banco + migrações + Next).

**Acesso de demonstração** (dados fictícios, domínio reservado `@demo.realseg.invalid`): matrícula `100231` (Carlos Silva) ou `carlos.silva@demo.realseg.invalid`, senha `Realseg@2026`. Outros: `100198` (Ana — outra unidade), `100402` (João — sem histórico, para estados vazios).

## Variáveis de ambiente

Ver [`.env.example`](.env.example). Principais: `DATABASE_URL`, `APP_URL`, `APP_ENV`, `IP_HASH_SECRET`, `SESSION_*`, `STORAGE_DIR`, `UPLOAD_MAX_MB`, `MAIL_DRIVER`/`SMTP_*`. A aplicação valida tudo na inicialização e **recusa** configurações inseguras em produção (ex.: e-mail em modo outbox, segredo padrão, URL sem HTTPS).

## Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm dev` / `pnpm dev:full` | Servidor de desenvolvimento (com/sem banco embarcado) |
| `pnpm build` / `pnpm start` | Build e execução de produção |
| `pnpm lint` / `pnpm typecheck` | ESLint e TypeScript (`next typegen` + `tsc`) |
| `pnpm test:unit` | Testes unitários (SLA, máquina de estados, validações, criptografia) |
| `pnpm test:integration` | Integração com PostgreSQL real (serviços, rotas HTTP, autorização) |
| `pnpm test:e2e` | Playwright (desktop + mobile + axe). Requer `pnpm build` antes |
| `pnpm check` | lint + tipos + unitários + integração + build |
| `pnpm db:generate` | Gera migração a partir do esquema (`src/server/db/schema`) |
| `pnpm db:migrate` | Aplica migrações versionadas (`drizzle/`) |
| `pnpm db:seed` | Somente dados de referência (qualquer ambiente) |
| `pnpm db:seed:demo` / `pnpm db:reset:demo` | Dados de demonstração (proibido em produção) |
| `pnpm jobs:run` | Tarefas periódicas (SLA, limpeza) — agendar a cada 5 min |

Utilitários de desenvolvimento: `node scripts/dev/screenshot.mjs <prefixo> <rotas…>` (capturas desktop/mobile) e `node scripts/dev/crawl.mjs` (percorre todos os links e aponta erros/overflow).

## Documentação

[Visão do produto](docs/PRODUCT_OVERVIEW.md) · [Requisitos](docs/REQUIREMENTS.md) · [Arquitetura](docs/ARCHITECTURE.md) · [Modelo de dados](docs/DATA_MODEL.md) · [Segurança](docs/SECURITY.md) · [LGPD](docs/PRIVACY_LGPD.md) · [API](docs/API.md) · [Design system](docs/DESIGN_SYSTEM.md) · [Testes](docs/TEST_STRATEGY.md) · [Runbook](docs/RUNBOOK.md) · [Status das funcionalidades](docs/FEATURE_STATUS.md) · [Changelog](docs/CHANGELOG.md)
