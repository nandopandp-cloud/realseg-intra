# Segurança

## Modelo de ameaças (resumo)
| Ameaça | Mitigação implementada | Teste |
| --- | --- | --- |
| Acesso a dados de outro colaborador (IDOR) | Escopo do ator aplicado no SQL de todo serviço; IDs inválidos/alheios → 404 | `announcements-documents`, `tickets`, `learning-career`, `api-matrix`; E2E D/E/F/H/I |
| Sessão roubada/fixação | Token aleatório de 256 bits; só o SHA-256 é salvo; cookie HttpOnly, SameSite=Lax, Secure (HTTPS); expiração absoluta e por inatividade; revogação no logout/troca de senha | `auth.test.ts`, E2E A |
| Força bruta | Limite por identificador (5 falhas/15 min, mesma resposta para contas inexistentes), bloqueio da conta, limite por IP quando há proxy confiável | `auth.test.ts`, E2E A |
| Enumeração de contas | Mensagens genéricas; hash fictício para equalizar tempo; recuperação responde igual | `auth.test.ts` |
| CSRF | Origin obrigatório e igual a `APP_URL` em POST/PUT/PATCH/DELETE + SameSite=Lax | `auth.test.ts`, `api-matrix`, E2E A/G |
| XSS | React escapa saídas; conteúdo rico renderizado por `RichText` sem HTML bruto; CSP com nonce e `strict-dynamic`; `frame-ancestors 'none'`, `object-src 'none'` | revisão + CSP em produção |
| Upload malicioso | Extensão permitida + tamanho + **assinatura binária** coerente; PDF com JavaScript/ações automáticas recusado; nome físico aleatório fora de `public/`; `nosniff`; imagens servidas com CSP `sandbox`; hook antimalware | `announcements-documents`, E2E D |
| SQL injection | Consultas parametrizadas (Drizzle/`sql` com binds); busca escapa `%`/`_` | integração |
| Vazamento em logs | Logger com redação de chaves sensíveis; auditoria sem conteúdo; IP pseudonimizado (HMAC) | revisão |
| Clickjacking/sniffing | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS em produção | — |
| Configuração insegura | Validação de ambiente (Zod) recusa produção sem SMTP, com segredo padrão ou sem HTTPS; seeds demo bloqueados em produção | — |

## RBAC — matriz de permissões
Permissões definidas em `src/server/auth/permissions.ts` e semeadas no banco (configuráveis por papel). Papéis são cumulativos (um RH também é COLABORADOR).

| Permissão | COLABORADOR | GESTOR | RH | ADMIN |
| --- | :-: | :-: | :-: | :-: |
| profile:read/update:own, notification:read:own | ✅ | | | |
| announcement:read / acknowledge | ✅ | | | |
| document:read:own / acknowledge:own / submit:own, policy:read | ✅ | | | |
| ticket:create / read:own / comment:own | ✅ | | | |
| course:read / enroll, career:read, opportunity:read / apply | ✅ | | | |
| feedback:read:own / acknowledge:own, help:read | ✅ | | | |
| employee:read:team, feedback:write:team | | ✅ | | |
| employee:read:any / manage, announcement:manage / report, document:manage / read:any, submission:review, ticket:read:any / manage, course:manage / report, career:manage, salary_band:read:any, feedback:write:any, help:manage, report:export | | | ✅ | |
| sla:configure, audit:read, role:manage | | | | ✅ |

Regras de escopo (além da permissão): documentos/feedbacks/envios — somente do próprio vínculo; tickets — solicitante ou participante explícito (participante só lê); comunicados/cursos — público-alvo; oportunidades — elegibilidade + publicação + prazo; faixas salariais — somente publicadas e vigentes.

## Sessões
- Expiração absoluta `SESSION_ABSOLUTE_HOURS` (padrão 12 h); inatividade `SESSION_IDLE_MINUTES` (padrão 60 min); atualização de `last_seen_at` limitada a 1/min.
- Logout, redefinição e troca de senha revogam sessões; desativar o usuário invalida todas imediatamente.
- O usuário vê e encerra sessões em **Perfil › Senha e segurança**.

## Senhas
scrypt (N=2^15, r=8, p=1, sal de 16 bytes), comparação em tempo constante, NFKC. Política: ≥ 10 caracteres com letras e números. `must_change_password` força a troca no próximo acesso.

## Auditoria (eventos registrados)
`auth.login_succeeded/failed`, `auth.logout`, `auth.password_reset_requested/completed`, `auth.password_changed`, `auth.session_revoked`, `document.viewed/downloaded/acknowledged`, `submission.created/cancelled/file_downloaded`, `announcement.acknowledged/attachment_downloaded`, `ticket.created/status_changed/message_added/attachment_downloaded`, `course.completed`, `certificate.issued`, `opportunity.applied/withdrawn`, `feedback.viewed/acknowledged`, `profile.preferences_updated`. Metadados contêm apenas identificadores e categorias.

## Segredos
Somente em variáveis de ambiente (`.env.local` fora do git; `.env.example` sem segredos). Em produção use o gerenciador de segredos da plataforma. Rotacionar `IP_HASH_SECRET` invalida apenas a correlação de IPs anteriores.

## Resposta a incidentes (resumo — detalhes no RUNBOOK)
1. Conter: revogar sessões do usuário afetado (`update sessions set revoked_at = now() where user_id = …`) ou desativar a conta.
2. Investigar pela `audit_events` (por ator, entidade e `request_id`) e logs estruturados.
3. Avaliar comunicação à ANPD e aos titulares conforme LGPD (art. 48) com o encarregado (DPO).
4. Corrigir, registrar lições aprendidas e atualizar este documento.

## Revogação de acesso (desligamento)
Definir `users.status = 'inactive'` e `employees.status = 'desligado'` → acesso cessa na próxima requisição (sessões validadas a cada requisição). Os registros permanecem para fins legais.
