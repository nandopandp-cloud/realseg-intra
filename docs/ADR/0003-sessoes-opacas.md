# ADR-0003 — Autenticação com sessões opacas no banco e hash scrypt

- **Status:** aceito — 2026-10-17
- **Contexto:** intranet com dados sensíveis (holerites, atestados, advertências). Exige logout efetivo, revogação imediata de acesso e expiração por inatividade.

## Opções avaliadas
- JWT stateless — revogação difícil; tokens longos em cookie.
- Auth.js (Credentials) — pouco controle sobre bloqueio, recuperação e auditoria.
- **Sessão opaca em banco** — token aleatório de 256 bits no cookie; apenas o SHA-256 do token é armazenado.

## Decisão
- Cookie `rs_session`: `HttpOnly`, `SameSite=Lax`, `Secure` em produção, `Path=/`.
- Expiração absoluta (padrão 12 h) e por inatividade (padrão 60 min), renovação deslizante limitada.
- Senhas com `scrypt` (Node `crypto`, N=2^15, r=8, p=1, salt 16 bytes), comparação em tempo constante; política mínima de 10 caracteres com letras e números.
- Bloqueio progressivo e rate limiting por conta e IP (tabela `rate_limits`).
- Recuperação de senha com token de uso único (SHA-256 armazenado), validade de 30 min, invalidação de todas as sessões após redefinição.
- Login aceita e-mail corporativo ou matrícula.

## Consequências
- Cada requisição autenticada faz uma consulta indexada por hash de sessão.
- Revogação de acesso = desativar usuário + `revoked_at` em todas as sessões (RUNBOOK).
