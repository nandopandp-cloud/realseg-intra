# API `/api/v1`

Route Handlers REST (ADR-0005). Todas as rotas exigem sessão (`rs_session`), exceto login e recuperação de senha. Exemplos usam dados fictícios.

## Convenções
- **Autenticação**: cookie `rs_session` (HttpOnly). Sem sessão → `401 UNAUTHENTICATED`; sessão expirada → `401 SESSION_EXPIRED`.
- **CSRF**: `POST/PUT/PATCH/DELETE` exigem cabeçalho `Origin` igual a `APP_URL` → senão `403 CSRF_REJECTED`.
- **Autorização**: permissão do papel + escopo do recurso. Recurso inexistente **ou** alheio → `404 NOT_FOUND` (não revela existência).
- **Entrada**: JSON validado com Zod (`Content-Type: application/json`) ou `multipart/form-data` para uploads. IDs inválidos → 404.
- **Paginação**: `page` (≥1) e `pageSize` (1–50, padrão 10). Resposta: `{ items, total, page, pageSize, pageCount }`.
- **Cache**: respostas `Cache-Control: private, no-store`; header `x-request-id` para suporte.
- **Erros**:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Verifique os campos informados.", "details": { "subject": ["O assunto precisa ter pelo menos 4 caracteres."] }, "requestId": "6f1c…" } }
```
Códigos: `UNAUTHENTICATED` 401, `SESSION_EXPIRED` 401, `INVALID_CREDENTIALS` 401, `FORBIDDEN` 403, `CSRF_REJECTED` 403, `NOT_FOUND` 404, `CONFLICT` 409, `INVALID_TRANSITION` 409, `PAYLOAD_TOO_LARGE` 413, `UNSUPPORTED_FILE` 415, `VALIDATION_ERROR` 422, `RATE_LIMITED` 429 (+`Retry-After`), `INTERNAL` 500.

## Autenticação
| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| POST | `/auth/login` | `{ identifier: "100231" \| "email", password }` | 200 `{ ok, mustChangePassword }` + cookie |
| POST | `/auth/logout` | — | 204, cookie removido, sessão revogada |
| POST | `/auth/password/forgot` | `{ email }` | 200 `{ ok: true }` (sempre igual) |
| POST | `/auth/password/reset` | `{ token, password, confirmPassword }` | 200 / 422 (link inválido/expirado) |
| POST | `/auth/password/change` | `{ currentPassword, password, confirmPassword }` | 200 (demais sessões revogadas) |

## Conta, preferências e notificações
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/me` | Perfil (dados cadastrais e papéis) |
| GET / PATCH | `/me/preferences` | `{ homeShortcuts?: (1–4 de comunicados, documentos, cursos, carreira, solicitacoes, ajuda, fale-com-rh, avaliacoes), sidebarCollapsed?: boolean, notification?: { category, inApp } }` |
| GET | `/me/sessions` | Sessões ativas (`id` = prefixo de 16 hex do hash) |
| DELETE | `/me/sessions/:id` | Encerra outra sessão (nunca a atual) |
| GET | `/notifications?filter=all\|unread&page` | Notificações próprias |
| POST | `/notifications/:id/read` · `/notifications/read-all` | Marca como lidas |

## Comunicados
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/announcements?aba=todos\|importantes\|nao-lidos\|favoritos&q&categoria&ordem=recentes\|antigos&page` | Lista visível + `counts {todos, importantes, naoLidos, favoritos}` |
| GET | `/announcements/:id` | Detalhe (anexos, `acknowledgedAt`) |
| POST | `/announcements/:id/read` | Registra visualização (204) |
| POST | `/announcements/:id/acknowledge` | Ciência formal (idempotente) → `{ acknowledgedAt }`; 409 se não exigida |
| PUT / DELETE | `/announcements/:id/favorite` | Favoritar / desfavoritar |
| GET | `/announcements/:id/attachments/:fileId?disposition=inline` | Download autorizado e auditado |
| GET | `/events` | Próximos eventos da unidade |

## Documentos
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/documents?q&categoria&ano&status=todos\|pendente\|ciente&page` | Somente documentos pessoais próprios |
| GET | `/documents/:id` | Pessoal próprio ou institucional vigente (versões, ciência, histórico próprio) |
| GET | `/documents/:id/file?disposition=attachment\|inline` | Arquivo (reautorizado, auditado, `no-store`) |
| POST | `/documents/:id/acknowledge` | Ciência da versão atual |
| GET | `/policies?q` | Normas e manuais vigentes |
| GET | `/submissions` | Meus envios |
| POST | `/submissions` | multipart: `categorySlug`, `title`, `notes?`, `referenceDate?` (AAAA-MM-DD), `file` (PDF/JPG/PNG ≤ 10 MB) → 201 `{ id, number, status }` |
| GET | `/submissions/:id` · `/submissions/:id/file` | Detalhe com eventos · arquivo enviado |
| POST | `/submissions/:id/cancel` | Somente em `enviado` (409 caso contrário) |

## Solicitações
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/tickets?aba=todos\|andamento\|aguardando\|respondidos\|concluidos&q&categoria&page` | Lista com `sla` e `counts` |
| POST | `/tickets` | multipart: `categorySlug`, `subject` (4–120), `description` (10–5000), `draftId?`, `files` (até 5) → 201 `{ id, number, status, resolutionDueAt }` |
| GET | `/tickets/:number` | Detalhe: mensagens (sem notas internas), anexos, eventos, `sla`, `actions` |
| POST | `/tickets/:number/messages` | multipart `body` + `files` → retoma atendimento quando aguardava o colaborador |
| POST | `/tickets/:number/cancel` | `{ reason? }` |
| POST | `/tickets/:number/confirm` | Confirma solução e encerra |
| POST | `/tickets/:number/reopen` | `{ body }` — até 7 dias após resolução |
| GET | `/tickets/:number/attachments/:id` | Anexo |
| GET | `/ticket-categories` | Áreas ativas |
| GET / POST | `/ticket-drafts` | Rascunhos (`{ categorySlug?, subject, description }`) |
| PUT / DELETE | `/ticket-drafts/:id` | Atualiza / exclui |

Objeto `sla` (exemplo):
```json
{ "kind": "running", "dueAt": "2026-10-21T21:00:00.000Z", "totalMinutes": 1800, "elapsedMinutes": 840, "percent": 47, "unit": "days", "progressLabel": "2 de 3 dias úteis", "statusLabel": "Restam 1 dia útil e 6h", "firstResponse": { "dueAt": "…", "respondedAt": "…", "breached": false } }
```
`kind`: `none` (sem política), `running`, `paused`, `overdue`, `met`, `breached`.

## Cursos
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/courses?categoria&q&filtro=todos\|obrigatorios\|em-andamento\|concluidos\|nao-iniciados` | Catálogo elegível |
| GET | `/courses/:slug` | Detalhe com módulos, aulas concluídas, matrícula, certificado |
| POST | `/courses/:slug/enroll` | Matrícula idempotente → `{ enrollmentId, status, resumeLessonId }` |
| POST | `/lessons/:id/complete` | Conclusão idempotente → `{ percent, completedNow, certificateId }` |
| GET | `/certificates` | Meus certificados |

## Carreira e feedbacks
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/career/overview` · `/career/plan` | Visão geral · cargos da família com faixas publicadas |
| GET | `/opportunities` · `/opportunities/:id` | Oportunidades elegíveis |
| POST | `/opportunities/:id/apply` | `{ message? }` (409 se já candidato) |
| POST | `/opportunities/:id/withdraw` | Retira candidatura ativa |
| GET | `/feedbacks` · `/feedbacks/:id` | Somente próprios publicados (leitura auditada) |
| POST | `/feedbacks/:id/acknowledge` | Confirma leitura (idempotente) |

## Ajuda e busca
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/help/articles?q&categoria` | Artigos publicados |
| GET | `/help/articles/:slug` | Artigo + relacionados + meu voto + agregados |
| POST | `/help/articles/:slug/view` | Contador anônimo |
| POST | `/help/articles/:slug/feedback` | `{ helpful: boolean }` (um voto por pessoa, atualizável) |
| GET | `/search?q` (≥ 2 caracteres) | Busca global respeitando o escopo de cada módulo |

## Cron (interno)
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/cron/daily` | Manutenção diária (SLA, fechamento automático, limpeza). Chamado pelo Vercel Cron com `Authorization: Bearer <CRON_SECRET>`; sem segredo configurado responde 404, segredo inválido 401. Fora de `/api/v1`. |

## Exemplo
```bash
curl -i -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Origin: http://localhost:3000' -H 'Content-Type: application/json' \
  -d '{"identifier":"100231","password":"Realseg@2026"}'
```
