# API `/api/v1`

Route Handlers REST ([ADR-0005](adr/0005-api-route-handlers.md)). Todas as rotas exigem sessão (`rs_session`), exceto login e recuperação de senha. Exemplos usam dados fictícios. As regras por trás de cada rota estão em [Serviços](servicos.md).

**Índice:** [Convenções](#convenções) · [Autenticação](#autenticação) · [Conta](#conta-preferências-e-notificações) · [Comunicados](#comunicados) · [Documentos](#documentos) · [Solicitações](#solicitações) · [Cursos](#cursos) · [Carreira e feedbacks](#carreira-e-feedbacks) · [Ajuda e busca](#ajuda-e-busca) · [Gestão `/rh`](#gestão--apiv1rh) · [Cron](#cron-interno)

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
| GET | `/announcements?aba=todos\|importantes\|nao-lidos\|favoritos&q&categoria&tag&ordem=recentes\|antigos&page` | Lista visível + `counts {todos, importantes, naoLidos, favoritos}` |
| GET | `/announcements/:id` | Detalhe (anexos, `acknowledgedAt`, `coverImage`, `effectiveNote`, `highlights[]`, `tags[]`, `supportTicketCategory`) |
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
| GET | `/tickets?aba=todos\|andamento\|aguardando\|respondidos\|concluidos&q&categoria&page` | Lista com `sla`, `channel` e `counts` (abertas primeiro, depois pelo número) |
| POST | `/tickets` | multipart: `categorySlug`, `subject` (4–120), `description` (10–5000), `draftId?`, `files` (até 5) → 201 `{ id, number, status, resolutionDueAt }` |
| GET | `/tickets/:number` | Detalhe: mensagens (sem notas internas), anexos, eventos, `sla`, `actions` |
| POST | `/tickets/:number/messages` | multipart `body` + `files` → retoma atendimento quando aguardava o colaborador |
| POST | `/tickets/:number/cancel` | `{ reason? }` |
| POST | `/tickets/:number/confirm` | Confirma solução e encerra |
| POST | `/tickets/:number/reopen` | `{ body }` — até 7 dias após resolução |
| GET | `/tickets/:number/attachments/:id` | Anexo |
| GET | `/support-chat` | Conversa de chat em aberto: `{ number }` ou `{ number: null }` |
| POST | `/support-chat` | `{ categorySlug, message (4–2000) }` → inicia conversa (solicitação com `channel: "chat"`, mesmo SLA e fila) — 201 `{ number, resumed: false }`; se já houver conversa aberta, a mensagem entra nela — 200 `{ number, resumed: true }` |
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
| GET | `/help/articles?sugerir=texto` | Até 3 artigos relacionados a um texto livre (palavras-chave, sem palavras comuns) — usado no assunto da solicitação e no chat |
| GET | `/help/articles/:slug` | Artigo + relacionados + meu voto + agregados |
| POST | `/help/articles/:slug/view` | Contador anônimo |
| POST | `/help/articles/:slug/feedback` | `{ helpful: boolean }` (um voto por pessoa, atualizável) |
| GET | `/search?q` (≥ 2 caracteres) | Busca global respeitando o escopo de cada módulo |

| GET | `/media/:id` | Imagem de capa enviada pela gestão: só para usuários autenticados e só enquanto está em uso como capa |

## Gestão — `/api/v1/rh/*`

Rotas do ambiente RH/Administração. Valem as mesmas convenções e mais estas:
- **Permissão por rota**: a coluna *Permissão* indica o que é exigido. Ela é verificada **antes** de ler o corpo ou o multipart. Sem a permissão, a resposta é `403 FORBIDDEN` (o teste `api-matrix` garante isso para um colaborador comum em todas as rotas).
- **Leituras**: as listas e telas da gestão são renderizadas no servidor chamando os serviços diretamente ([Serviços › Gestão](servicos.md#serviços-de-gestão-srcserverservicesrhts)). A API expõe as **mutações**, os **downloads** e as **exportações CSV**.
- **Público-alvo** (comunicados, cursos, oportunidades): `{ all: boolean, department: uuid[], unit: uuid[], job_position: uuid[], job_family: uuid[] }`, com ao menos uma regra.
- **CSV**: `text/csv; charset=utf-8` com `Content-Disposition: attachment`. Toda exportação gera o evento de auditoria `report.exported`.
- Os schemas Zod de todos os corpos estão em `src/lib/validation/rh.ts`.

### Solicitações (atendimento)
| Método | Rota | Permissão | Descrição |
| --- | --- | --- | --- |
| POST | `/rh/tickets/:number/messages` | `ticket:manage` | multipart: `body` (≤ 5000), `internal` (`"true"` = nota interna, nunca exibida ao solicitante), `setStatus?`, `files` (até 5) → 201 |
| POST | `/rh/tickets/:number/status` | `ticket:manage` | `{ to, note? }`. Só transições válidas da [máquina de estados](../produto/requisitos.md#rf-tkt--solicitações-e-sla); senão `409 INVALID_TRANSITION` |
| POST | `/rh/tickets/:number/assign` | `ticket:manage` | `{ assigneeUserId: uuid \| null }` |
| POST | `/rh/tickets/:number/priority` | `ticket:manage` | `{ priority: baixa\|normal\|alta\|urgente }`. Recalcula o prazo pela política da nova prioridade |
| GET | `/rh/tickets/:number/attachments/:id` | `ticket:read:any` | Anexo (auditado como acesso do atendimento) |

### Comunicados e agenda
| Método | Rota | Permissão | Descrição |
| --- | --- | --- | --- |
| POST | `/rh/announcements` | `announcement:manage` | Cria rascunho: `title`, `summary`, `body` (marcação simples), `categorySlug`, `coverImage?`, `effectiveNote?`, `highlights[]` (≤ 6), `tags[]` (≤ 10), `supportTicketCategory?`, `isImportant`, `requiresAck`, `isFeatured`, `authorLabel`, `audience` |
| GET / PUT / DELETE | `/rh/announcements/:id` | `announcement:manage` | Detalhe · atualiza (`relevantChange: true` em publicado gera nova versão e exige nova ciência) · exclui **somente rascunho** |
| POST | `/rh/announcements/:id/publish` | `announcement:manage` | `{ mode: now\|schedule, publishAt? (ISO, futuro), notify }` |
| POST | `/rh/announcements/:id/archive` · `/restore` | `announcement:manage` | Arquiva / restaura (publicados nunca são apagados) |
| POST | `/rh/announcements/:id/duplicate` | `announcement:manage` | Cria rascunho a partir de um existente |
| POST | `/rh/announcements/:id/attachments` | `announcement:manage` | multipart `files` (até 10) |
| GET / DELETE | `/rh/announcements/:id/attachments/:fileId` | `announcement:manage` | Baixa / remove anexo |
| GET | `/rh/announcements/:id/report` | `report:export` | CSV de leitura e ciência por colaborador do público |
| POST | `/rh/events` · PUT `/rh/events/:id` | `announcement:manage` | `{ title, description?, location?, startsAt, endsAt?, unitId? (nulo = todas), announcementId? }` |
| POST | `/rh/events/:id/status` | `announcement:manage` | `{ status: scheduled\|cancelled }` |
| POST | `/rh/media` | `announcement:manage` ou `course:manage` | multipart `file` (JPG/PNG) → 201 `{ id, url: "/api/v1/media/<id>" }`, para usar como `coverImage` |

### Documentos
| Método | Rota | Permissão | Descrição |
| --- | --- | --- | --- |
| POST | `/rh/submissions/:id/review` | `submission:review` | `{ action: start\|accept\|refuse, note?, version }`. `version` é o controle otimista; desatualizado → 409 |
| GET | `/rh/submissions/:id/file` | `submission:review` | Arquivo enviado pelo colaborador |
| POST | `/rh/documents/personal` | `document:manage` | multipart: `employeeId`, `categorySlug`, `title?`, `description?`, `referencePeriod?` (AAAA-MM), `requiresAck?`, `file`. **Um arquivo por requisição**: o lote é enviado arquivo a arquivo (limite de ~4,5 MB por requisição na Vercel) |
| POST | `/rh/documents/batch-preview` | `document:manage` | `{ names: string[] (≤ 300) }` → casa cada nome de arquivo com a matrícula do colaborador antes do envio em lote |
| POST | `/rh/documents/institutional` | `document:manage` | multipart: norma ou manual com `categorySlug`, `title`, `description?`, `requiresAck?`, `notify?`, `effectiveFrom?`, `effectiveUntil?`, `file` |
| PUT | `/rh/documents/:id` | `document:manage` | Metadados (`title`, `description`, `referencePeriod`, `requiresAck`, vigência) |
| DELETE | `/rh/documents/:id` | `document:manage` | `{ reason }`. Exclusão lógica de documento enviado por engano (auditada) |
| POST | `/rh/documents/:id/versions` | `document:manage` | multipart `file`, `changeNote?`, `notify?` → nova versão (nova ciência, se exigida) |
| GET | `/rh/documents/:id/versions/:versionId` | `document:read:any` | Arquivo da versão (auditado como acesso do RH; não aparece no histórico do colaborador) |
| POST | `/rh/documents/:id/archive` · `/restore` | `document:manage` | Arquiva / restaura |

### Colaboradores e estrutura
| Método | Rota | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/rh/employees/search?q` | qualquer uma de `employee:read:any`, `document:manage`, `career:manage`, `feedback:write:any` | `{ items }`: colaboradores ativos, para seletores |
| POST | `/rh/employees` | `employee:manage` | Cadastro: `fullName`, `preferredName?`, `registrationNumber` (3–12 dígitos), `email`, `departmentId`, `unitId`, `jobPositionId`, `managerEmployeeId?`, `admissionDate`, `access: temp\|invite`, `roles?` → a senha temporária é devolvida **uma única vez** |
| PUT | `/rh/employees/:id` | `employee:manage` | Dados cadastrais |
| POST | `/rh/employees/:id/status` | `employee:manage` | `{ status: ativo\|afastado\|desligado }`. Desligar revoga todas as sessões na hora |
| POST | `/rh/employees/:id/access` | `employee:manage` | `{ mode: temp\|invite }`. Novo acesso e desbloqueio |
| PUT | `/rh/employees/:id/roles` | `role:manage` | `{ roles: (RH\|GESTOR\|ADMIN)[] }`. O administrador não remove o próprio papel |
| POST | `/rh/employees/import` | `employee:manage` | `{ csv, dryRun }`. `dryRun: true` valida linha a linha sem gravar (máx. 500 linhas) |
| POST · PUT | `/rh/org/departments` · `/:id` | `employee:manage` | Áreas `{ code, name, parentId?, active }` |
| POST · PUT | `/rh/org/units` · `/:id` | `employee:manage` | Unidades `{ name, city, state (UF), active }` |
| POST · PUT · DELETE | `/rh/org/families` · `/:id` | `employee:manage` | Famílias `{ name, description? }` |
| POST · PUT | `/rh/org/positions` · `/:id` | `employee:manage` | Cargos `{ title, familyId, level, levelLabel, description?, requirements?, progressionCriteria?, active }` |

Desativar área, unidade ou cargo exige que não haja colaboradores ativos vinculados; excluir família exige que ela não tenha cargos (senão `422 VALIDATION_ERROR` com a explicação).

### Cursos e trilhas
| Método | Rota | Permissão | Descrição |
| --- | --- | --- | --- |
| POST · PUT | `/rh/courses` · `/:id` | `course:manage` | `{ title, slug, summary, description, categorySlug, coverImage?, isMandatory, mandatoryDueDays?, issuesCertificate, audience }` |
| POST | `/rh/courses/:id/status` | `course:manage` | `{ status: draft\|published\|archived }` |
| POST | `/rh/courses/:id/modules` | `course:manage` | `{ title }` |
| PUT · DELETE | `/rh/course-modules/:id` | `course:manage` | Renomeia / exclui módulo |
| POST | `/rh/course-modules/:id/move` | `course:manage` | `{ dir: -1\|1 }` |
| POST | `/rh/course-modules/:id/lessons` | `course:manage` | `{ title, type: texto\|video\|material, content, videoUrl? (YouTube-nocookie/Vimeo), durationMinutes }` |
| PUT · DELETE | `/rh/lessons/:id` · POST `/rh/lessons/:id/move` | `course:manage` | Edita, exclui e reordena aulas |
| POST | `/rh/courses/:id/assign` | `course:manage` | `{ target: audience\|employees, employeeIds?, dueDays? }`. Atribuição com prazo |
| GET | `/rh/courses/:id/report` | `report:export` | CSV de participantes e progresso |
| POST · PUT · DELETE | `/rh/learning-paths` · `/:id` | `course:manage` | Trilhas `{ title, description, color, icon, jobFamilyId?, courseIds[] }` |
| POST · PUT | `/rh/course-categories` · `/:id` | `course:manage` | `{ name, color, icon }` |

### Carreira e feedbacks
| Método | Rota | Permissão | Descrição |
| --- | --- | --- | --- |
| POST · PUT | `/rh/opportunities` · `/:id` | `career:manage` | `{ title, areaLabel, description, requirements, jobPositionId?, departmentId?, unitId?, isHighlighted, closesAt?, eligibility }` |
| POST | `/rh/opportunities/:id/status` | `career:manage` | `{ status: draft\|published\|closed, notify? }` |
| POST | `/rh/applications/:id/status` | `career:manage` | `{ status: em_analise\|encerrada }` |
| POST · PUT · DELETE | `/rh/salary-bands` · `/:id` | `career:manage` | `{ jobPositionId, minCents, maxCents, effectiveFrom, effectiveUntil?, visibleToEmployees }` |
| POST · PUT · DELETE | `/rh/employees/:id/goals` · `/:goalId` | `career:manage` | Plano de desenvolvimento: `{ title, description?, startsOn?, dueDate?, courseId?, status }` |
| POST | `/rh/feedbacks` | `feedback:write:any` | `{ employeeId, type: feedback\|avaliacao\|reconhecimento, title, cycle?, body, authorContext, showAuthor, publish }` |
| PUT | `/rh/feedbacks/:id` | `feedback:write:any` | Edita (em publicado, exige nova confirmação de leitura) |
| POST | `/rh/feedbacks/:id/publish` · `/archive` | `feedback:write:any` | Publica / arquiva |

### Central de ajuda
| Método | Rota | Permissão | Descrição |
| --- | --- | --- | --- |
| POST · PUT | `/rh/help/articles` · `/:id` | `help:manage` | `{ title, summary, body, categorySlug, type: artigo\|tutorial\|faq, icon, color, ticketCategorySlug? }` |
| POST | `/rh/help/articles/:id/status` | `help:manage` | `{ status: draft\|published\|archived }` |
| POST · PUT | `/rh/help/categories` · `/:id` | `help:manage` | `{ name, description, color, icon }` |

### Configurações e auditoria (Administrador)
| Método | Rota | Permissão | Descrição |
| --- | --- | --- | --- |
| POST · PUT | `/rh/settings/ticket-categories` · `/:id` | `sla:configure` | Áreas de solicitação `{ name, description, color, icon, defaultPriority, active }` |
| POST | `/rh/settings/sla` | `sla:configure` | `{ categoryId, priority, firstResponseMinutes, resolutionMinutes, warnAtPercent }` → nova versão da política (vale só para solicitações novas) |
| PUT | `/rh/settings/calendar` | `sla:configure` | `{ workingHours: { "0".."6": [["08:00","12:00"], …] } }` (até 3 janelas por dia) |
| POST · DELETE | `/rh/settings/holidays` · `/:id` | `sla:configure` | `{ date, name }` |
| GET | `/rh/audit/export?grupo&quem&id&de&ate` | `audit:read` | CSV da trilha de auditoria filtrada |

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
