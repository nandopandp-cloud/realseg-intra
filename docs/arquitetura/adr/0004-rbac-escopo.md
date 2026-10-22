# ADR-0004 — Autorização: RBAC granular + verificação de escopo na camada de serviços

- **Status:** aceito — 2026-10-17

## Decisão
- Papéis `COLABORADOR`, `GESTOR`, `RH`, `ADMIN` (tabela `roles`), permissões granulares `recurso:ação[:escopo]` (tabela `permissions`), associadas por `role_permissions`. Um usuário pode ter vários papéis (`user_roles`).
- Negação por padrão: toda função de serviço recebe um `Actor` e chama `requirePermission()` + regras de propriedade/escopo antes de qualquer leitura ou escrita.
- Consultas de listas sempre filtram pelo escopo do ator **na query SQL** (não após buscar), inclusive buscas, exportações e downloads.
- Recursos de terceiros respondem **404** (não 403) para não revelar existência (mitigação de IDOR/enumeração).
- O `proxy.ts` só faz checagem otimista de presença de cookie; a autorização real ocorre no servidor, perto dos dados.
- Nesta fase só o papel COLABORADOR tem UI; GESTOR/RH/ADMIN existem no modelo para a próxima fase.

## Consequências
- Matriz de permissões documentada em [Segurança](../../seguranca/seguranca.md#rbac--matriz-de-permissões) e testada (testes de autorização negativa).

## Revisão 2026-10-20
O ambiente de gestão (`/rh`) foi entregue para os papéis RH e ADMIN. O acesso ao ambiente exige ao menos uma permissão de `MANAGEMENT_PERMISSIONS`; cada página exige a sua (`requireRhCtx`) e cada rota `/api/v1/rh/*` a permissão da ação, verificada antes de ler o corpo da requisição. Sem permissão: a página responde "não encontrada" e a API responde 403. O papel GESTOR continua sem telas próprias.
