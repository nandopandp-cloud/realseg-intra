# Changelog

## [0.3.0] — 2026-10-18 — Logo oficial
### Alterado
- Logo oficial (símbolo SVG vetorial + wordmark "REALSEG") em sidebar, cabeçalho mobile, login e certificado, substituindo os recortes das referências; removida a tagline "SECURITY INTELLIGENCE", que não faz parte da marca.
- Favicon (`icon.svg`) e ícone do iPhone (`apple-icon.png`) gerados a partir do SVG oficial.
- `proxy.ts` deixa arquivos estáticos (logo, imagens, ícones) acessíveis sem login.

## [0.2.0] — 2026-10-18 — Home fiel à referência e deploy Vercel + Neon
### Alterado
- Home redesenhada conforme `referencias/Dashboard Corporativo…` (desktop) e `Painel Corporativo…` (mobile): ícones sólidos nos atalhos, proporções do hero e do banner, documentos recentes incluindo manuais atualizados; pendências passaram a ser selos com texto nos atalhos (o bloco "Para você resolver" e a faixa de ajuda foram removidos, pois não existem na referência).
- Seed de referência não sobrescreve mais permissões ajustadas pela administração (apenas acrescenta as padrão ausentes).
### Adicionado
- Script `vercel-build`: migrações + seed idempotente no build (conexão direta `DATABASE_URL_UNPOOLED`).
- `DEMO_PASSWORD` para contas de demonstração em ambientes públicos; guarda de produção baseada em `APP_ENV`.
- Arquivo ausente no armazenamento responde 404 claro; falha de configuração em rotas é registrada e respondida de forma padronizada.

## [0.1.0] — 2026-10-17 — Ambiente do Colaborador
### Adicionado
- Fundação: Next.js 16, TypeScript estrito, Tailwind 4 com tokens da marca, PostgreSQL 18 + Drizzle com migrações versionadas, PostgreSQL embarcado para dev/teste, CI.
- Segurança: sessões opacas no banco, scrypt, bloqueio e rate limit, CSRF por Origin, CSP com nonce, cabeçalhos de segurança, RBAC granular (COLABORADOR/GESTOR/RH/ADMIN), auditoria, logs com redação.
- Autenticação: login por e-mail ou matrícula, logout, recuperação com token de uso único, alteração de senha, sessão expirada, sessões ativas.
- Shell desktop (sidebar recolhível, topbar com busca e notificações) e mobile (cabeçalho + barra inferior + "Mais").
- Home com pendências, atalhos personalizáveis, comunicado importante, solicitações e documentos recentes.
- Comunicados com público-alvo, leitura por versão, ciência explícita, favoritos, anexos, destaque e eventos.
- Documentos: recebidos com filtros e download auditado, ciência, normas e manuais, envio ao RH com validação de conteúdo e acompanhamento, histórico.
- Solicitações com SLA em minutos úteis (calendário, feriados, pausa/retomada), rascunhos, anexos, conversa, cancelamento, confirmação, reabertura, monitor de SLA; serviços de atendimento para a fase RH.
- Cursos: catálogo elegível, trilhas, progresso idempotente, retomada, certificados.
- Carreira: visão geral, desenvolvimento, cargos e faixas publicadas, oportunidades com candidatura; feedbacks com confirmação de leitura.
- Ajuda: busca, categorias, base de conhecimento, voto de utilidade, horário de atendimento derivado do calendário.
- Notificações com preferências, perfil, busca global.
- Testes: 41 unitários, 67 de integração (PostgreSQL real), 90 E2E (desktop, mobile, axe).
