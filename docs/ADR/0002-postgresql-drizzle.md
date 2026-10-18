# ADR-0002 — PostgreSQL + Drizzle ORM + migrações versionadas; PostgreSQL embarcado em dev/teste

- **Status:** aceito — 2026-10-17
- **Contexto:** a máquina de desenvolvimento não possui Docker nem PostgreSQL instalado. Precisamos de banco real (FKs, transações, índices, concorrência) em dev, testes de integração e E2E, sem mocks.

## Opções avaliadas
- **ORM:** Drizzle (SQL explícito, tipos inferidos, migrações SQL legíveis) × Prisma (engine binária, menor controle de SQL) × Kysely (só query builder).
- **Banco local:** Docker (indisponível) × PGlite/WASM (conexão única, divergências de extensões) × **embedded-postgres** (binários oficiais do PostgreSQL 18 via npm).

## Decisão
- PostgreSQL 18 como banco único. Drizzle ORM com `node-postgres`; migrações geradas por `drizzle-kit generate` e versionadas em `drizzle/`, aplicadas por `pnpm db:migrate` (nunca `push` em produção).
- Desenvolvimento e testes usam `embedded-postgres` (devDependency) — é o servidor PostgreSQL real, executado localmente em portas dedicadas: dev 54320, integração 54321, E2E 54322.
- Produção usa PostgreSQL gerenciado via `DATABASE_URL` (o pacote embarcado não é instalado em produção).

## Consequências
- Testes exercitam SQL real, constraints e transações.
- Dados de dev ficam em `.data/` (ignorado pelo git). Seeds de demonstração são separados e marcados (ADR-0010).
