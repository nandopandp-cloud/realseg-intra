# ADR-0005 — API REST `/api/v1` com Route Handlers; leituras de página direto nos serviços

- **Status:** aceito — 2026-10-17

## Opções avaliadas
- Server Actions para mutações — menos código, mas endpoints implícitos (IDs internos), difíceis de documentar/testar como contrato e de reutilizar por outros clientes.
- **Route Handlers REST** — contrato explícito, testável com `Request`/`Response`, reaproveitável pelo futuro ambiente RH e por apps.

## Decisão
- Mutações e downloads via `/api/v1/*` (Route Handlers) com um wrapper único (`server/http/route.ts`) que: resolve a sessão, valida origem (CSRF), valida payload com Zod, aplica rate limit, padroniza erros `{ error: { code, message, details? } }` e registra log estruturado com `requestId`.
- Páginas (Server Components) leem dados chamando diretamente os mesmos serviços — sem round-trip HTTP interno — e passam a cada componente cliente só os campos necessários.
- Endpoints GET de coleções existem para os recursos principais (paginação `page`/`pageSize`, filtros e ordenação documentados em `docs/API.md`).
