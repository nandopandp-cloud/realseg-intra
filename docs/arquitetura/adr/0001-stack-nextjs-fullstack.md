# ADR-0001 — Stack: Next.js 16 (App Router) full-stack em TypeScript

- **Status:** aceito — 2026-10-17
- **Contexto:** repositório vazio (apenas README e imagens de referência). Requisitos: web responsiva mobile-first, backend autenticado, PostgreSQL, tipagem ponta a ponta, equipe enxuta, manutenção de longo prazo.

## Opções avaliadas
1. **Next.js 16 (App Router) monolito modular** — React Server Components, Route Handlers e renderização no servidor no mesmo deploy.
2. SPA (Vite + React) + API separada (NestJS/Fastify) — mais peças para operar, duplicação de tipos e deploys.
3. Remix/React Router 7 — viável, ecossistema menor para a equipe.

## Decisão
Opção 1. Um único app Next.js 16.4 com TypeScript estrito, organizado em camadas:
`app/` (apresentação) → `server/services` (regras de negócio + autorização) → `server/db` (persistência Drizzle).
Pacotes: React 19.3, Tailwind CSS 4, Zod 4, Drizzle ORM, lucide-react, date-fns 4 + @date-fns/tz.

## Consequências
- Um pipeline de build/teste; tipos compartilhados entre cliente e servidor.
- O ambiente RH será um segundo grupo de rotas (`/rh`) no mesmo app, com layouts e permissões próprios.
- Se surgir um app nativo, os Route Handlers `/api/v1` já são a API pública (ver ADR-0005).
