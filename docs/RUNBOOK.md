# Runbook

## Deploy
1. Provisionar PostgreSQL ≥ 15 (recomendado 18) gerenciado, com TLS, backups automáticos e PITR. Extensão `unaccent` deve ser permitida (aplicada pela migração 0001).
2. Configurar variáveis (ver `.env.example`) no gerenciador de segredos: `APP_ENV=production`, `APP_URL=https://…`, `DATABASE_URL`, `IP_HASH_SECRET` (aleatório, 32+ bytes), `MAIL_DRIVER=smtp` + `SMTP_*`, `STORAGE_DIR` em volume persistente e com backup, `TRUST_PROXY=true` somente atrás de proxy reverso confiável.
3. `pnpm install --frozen-lockfile && pnpm build`.
4. `pnpm db:migrate` (antes de subir a nova versão; migrações são aditivas — ver Reversão).
5. `pnpm db:seed` (somente dados de referência; idempotente). **Nunca** `db:seed:demo` em produção (bloqueado).
6. `pnpm start` (porta via `PORT`). Atrás de proxy com HTTPS e HSTS.
7. Manutenção diária: na Vercel já agendada por `vercel.json` (`/api/cron/daily`, requer `CRON_SECRET`). Em outra hospedagem, agende `pnpm jobs:run` 1x por dia. Não aumente a frequência sem ler `docs/COST_OPTIMIZATION.md` §7.
8. Verificar: `/login` responde 200 com header `Content-Security-Policy`; login com usuário de teste; logs `http.request` chegando.

## Deploy na Vercel + Neon (homologação atual)
- Projeto Vercel `realseg-intra` (conta `realsegintra-9920`), publicado a partir do branch `main` do GitHub. URL: https://realseg-intra-seven.vercel.app
- A integração Neon cria `DATABASE_URL` (pooler) e `DATABASE_URL_UNPOOLED` (direta) como variáveis **Sensitive** — não são legíveis pela CLI, por isso migrações rodam **no build**.
- O script `vercel-build` (`scripts/vercel-build.mjs`, usado automaticamente pela Vercel) executa em **Production**: `scripts/migrate.ts` (conexão direta) → `seed deploy` (referência sempre; demonstração somente se `SEED_DEMO=true`, `APP_ENV` ≠ `production` e a base ainda não tiver colaboradores) → `next build`. Em **Preview** só compila (sem tocar no banco), salvo `PREVIEW_DB_TASKS=true`. É idempotente.
- Commits só de documentação/testes não geram deploy (`ignoreCommand` em `vercel.json`).
- Variáveis configuradas (Production e Preview): `IP_HASH_SECRET` e `DEMO_PASSWORD` (Sensitive), `APP_ENV=staging`, `MAIL_DRIVER=outbox`, `SEED_DEMO=true`, `TRUST_PROXY=true`; somente em Production: `APP_URL` e `CRON_SECRET` (Sensitive).
- **Preview usa o mesmo banco**: por isso o build de Preview não aplica migrações. Para testar migrações em branches, habilite na integração Neon o branch de banco por Preview e defina `PREVIEW_DB_TASKS=true` no ambiente Preview.
- **Região**: Neon em São Paulo (`aws-sa-east-1`) e funções da Vercel em São Paulo (`gru1`), definido em `vercel.json` (plano Hobby permite uma região). Mantenha os dois na mesma região para evitar latência em cada consulta.
- **Arquivos**: Cloudflare R2 (bucket privado `realseg-intranet`), configurado por `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` e `R2_BUCKET_NAME` no ambiente Production da Vercel. O token R2 precisa de "Object Read & Write" no bucket. Com dados de demonstração, o seed de deploy restaura no R2 os arquivos de demo ausentes (`scripts/seed/repair-files.ts`).
- Ao migrar para produção real: `APP_ENV=production`, SMTP configurado, `SEED_DEMO` removido e base recriada sem dados de demonstração.

## Migrações
- Gerar: altere `src/server/db/schema`, rode `pnpm db:generate --name <descricao>`, revise o SQL e commite.
- Estratégia **expand/contract**: adicionar colunas/tabelas (compatível com a versão anterior) → publicar código → remover o antigo em release posterior.
- Nunca editar migração já aplicada; nunca usar `drizzle-kit push` em produção.

## Reversão segura
- Código: reimplantar a versão anterior (as migrações aditivas continuam compatíveis).
- Banco: não há "down" automático. Para reverter dados, restaurar backup/PITR em instância paralela e migrar seletivamente — **nunca** executar rollback destrutivo sem plano aprovado.

## Backups e restauração
- Banco: backup diário + PITR (retenção ≥ 30 dias). Teste de restauração **mensal** em ambiente isolado: restaurar → `pnpm db:migrate` (no-op) → subir app apontando para a cópia → login e download de um documento.
- Arquivos (`STORAGE_DIR`): snapshot diário do volume, mesma retenção. Banco e arquivos devem ser restaurados para o mesmo ponto no tempo.

## Observabilidade
- Logs JSON em stdout/stderr: `http.request` (método, rota, status, ms, requestId), `http.unhandled_error`, `jobs.completed`, `ticket.no_sla_policy`, `upload.malware_detected`, `mail.send_failed`.
- O usuário vê o `requestId` em erros da API — use-o para localizar o log.
- Alertas sugeridos: taxa de 5xx > 1% em 5 min; `jobs.failed`; `mail.send_failed`; crescimento anormal de `auth.login_failed` em `audit_events`.

## Operações comuns
| Situação | Ação |
| --- | --- |
| Revogar acesso (desligamento) | `update users set status='inactive' where email=…; update employees set status='desligado' where user_id=…` — efeito imediato |
| Encerrar todas as sessões de um usuário | `update sessions set revoked_at=now() where user_id=… and revoked_at is null` |
| Desbloquear conta após bloqueio | Aguardar 15 min ou `update users set failed_login_count=0, locked_until=null where …` e `delete from rate_limits where key like 'login:id:%'` (chave é hash do identificador) |
| Forçar troca de senha | `update users set must_change_password=true where …` |
| Feriado estadual/municipal | inserir em `sla_holidays` (UI de configuração na fase 2) |
| Alterar prazo de SLA | inserir nova linha em `sla_policies` e marcar a anterior com `superseded_at=now()` (tickets abertos mantêm a política original) |
| Antivírus | implementar `MalwareScanner` e registrar com `setMalwareScanner` na inicialização; arquivos passam a `clean`/bloqueados |

## Troubleshooting
| Sintoma | Causa provável | Verificação |
| --- | --- | --- |
| App não inicia: "Configuração de ambiente inválida" | Variável ausente/insegura | Mensagem lista o campo |
| 403 `CSRF_REJECTED` em todas as ações | `APP_URL` diferente do domínio público | Ajustar `APP_URL` |
| Scripts bloqueados no navegador (CSP) | Página servida de cache estático/CDN sem nonce | Não cachear HTML; todas as páginas são dinâmicas |
| "Sem prazo definido" em tickets | Falta política ativa para área × prioridade | `select * from sla_policies where superseded_at is null` |
| Busca não ignora acentos | Extensão `unaccent` ausente | `select f_unaccent('Férias')` |
| Dev: "Dados de demonstração já existem" | Seed já aplicado | `pnpm db:reset:demo` |
| Dev: porta 54320 ocupada | Outro `db:dev` rodando | Encerrar o processo anterior |

## Resposta a incidentes
1. Registrar horário e escopo. 2. Conter (revogar sessões/contas, bloquear rota no proxy se necessário). 3. Preservar evidências (`audit_events`, logs). 4. Corrigir e reimplantar. 5. Avaliar notificação LGPD com o DPO. 6. Post-mortem.
