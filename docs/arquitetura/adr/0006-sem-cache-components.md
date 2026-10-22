# ADR-0006 — `cacheComponents` desabilitado

- **Status:** aceito — 2026-10-17
- **Contexto:** o template do Next 16.4 habilita Cache Components/Partial Prefetching. Toda página da intranet depende da sessão e de dados pessoais; com Cache Components cada leitura de cookie exige fronteiras `<Suspense>` e há risco de cache indevido de dados sensíveis.

## Decisão
Manter o modelo de renderização dinâmica padrão (sem `cacheComponents`). Páginas autenticadas são renderizadas por requisição; respostas com dados pessoais recebem `Cache-Control: private, no-store`. Isso também é requisito do CSP com nonce (ADR-0001/SECURITY).

## Consequências
Sem cache de shell estático entre usuários — aceitável para o volume de uma intranet. Reavaliar quando houver páginas públicas ou volume alto.
