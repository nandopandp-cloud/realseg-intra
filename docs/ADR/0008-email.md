# ADR-0008 — Envio de e-mail desacoplado (outbox local × SMTP)

- **Status:** aceito — 2026-10-17
- **Contexto:** não há provedor de e-mail definido. A recuperação de senha precisa de envio real em produção.

## Decisão
- Interface `Mailer`. Driver `outbox` (dev/teste) grava a mensagem na tabela `mail_outbox` — usada pelos testes E2E para ler o link de redefinição. Driver `smtp` (nodemailer) é configurado por variáveis `SMTP_*`.
- Em produção, `MAIL_DRIVER=outbox` é recusado na inicialização (não simulamos integração real).
- Pendência registrada: definição do provedor corporativo (SMTP/Microsoft 365/SES).
