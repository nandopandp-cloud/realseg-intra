# Status das funcionalidades

Atualizado em 2026-10-18. Execução real registrada: **unitários 41/41**, **integração 67/67** (PostgreSQL 18 real), **E2E 90/90** (Chromium desktop 1440×900 + Pixel 7, com axe WCAG 2.2 A/AA), lint ✔, typecheck ✔, build de produção ✔. Nenhum teste foi pulado. Cobertura percentual não é medida.

Legenda: ✅ concluído (critérios de aceite + testes) · 🟡 parcial · ⏳ não iniciado/fase seguinte.

| Módulo | Status | Testes que cobrem | Limitações / pendências reais |
| --- | --- | --- | --- |
| Fundação (env, banco, migrações, logger, erros, CI) | ✅ | integração (todas), CI | Métricas/APM (OpenTelemetry) pendentes |
| Autenticação e sessão | ✅ | `auth.test.ts` (16), E2E A (9) | E-mail real depende do provedor SMTP corporativo (driver pronto). Sem MFA (avaliar para RH/ADMIN) |
| RBAC e autorização | ✅ (papéis e matriz) | `api-matrix.test.ts`, testes IDOR por módulo | UI de gestão de papéis — fase RH |
| Design system e shell | ✅ | E2E a11y (desktop + mobile), crawler de desenvolvimento | Logo vetorial oficial e fotos licenciadas em alta resolução pendentes (ADR-0010). Sem tema escuro |
| Home | ✅ | `services-read`, E2E B | — |
| Comunicados (colaborador) | ✅ | `announcements-documents`, E2E C | Publicação/segmentação/relatório de leitura pelo RH — fase RH |
| Documentos (colaborador) | ✅ | `announcements-documents`, E2E D/E | Distribuição e análise de envios pelo RH — fase RH. Antivírus: hook pronto, scanner não definido (status `skipped`). Armazenamento S3 pendente. Expurgo por retenção aguarda prazos do jurídico |
| Solicitações e SLA | ✅ (colaborador) · 🟡 (atendimento: serviços prontos e testados, sem UI) | `tickets.test.ts`, `business-time.test.ts`, `ticket-state-machine.test.ts`, E2E F | Fila/atribuição/configuração de SLA na UI — fase RH. Valores de SLA são proposta inicial a validar com o RH. Feriados estaduais/municipais a cadastrar. Chat em tempo real não implementado (atendimento por mensagens no ticket) |
| Cursos | ✅ | `learning-career`, E2E G | Conteúdo das aulas da demonstração é fictício; vídeos aceitos apenas de YouTube-nocookie/Vimeo; gestão de cursos e relatórios — fase RH |
| Carreira | ✅ | `learning-career`, `services-read`, E2E H | Avaliação da trilha e programa de liderança são etapas cadastradas (sem fluxo próprio). Gestão de cargos/faixas/oportunidades — fase RH |
| Feedbacks | ✅ (leitura e confirmação) | `learning-career`, E2E I | Registro por gestor/RH — fase RH. Comentário/réplica do colaborador não implementado |
| Ajuda e suporte | ✅ | `learning-career`, E2E J | Artigos institucionais (ponto, uniforme, férias) são de demonstração; gestão de artigos — fase RH |
| Perfil, notificações, busca | ✅ | `learning-career`, E2E B/L | Notificações por e-mail (preferência `email`) não enviadas nesta fase |
| Fale com o RH | ✅ | E2E F | — |
| Ambiente RH/Administração | ⏳ | — | Próxima fase: painel, colaboradores, comunicados, documentos, filas, SLA, cursos, carreira, feedbacks, relatórios, lote, auditoria (matriz E2E K) |
| LGPD — exportação/eliminação | 🟡 | — | Acesso e download individuais existem; exportação consolidada e anonimização administrativa — fase RH |

## Como reproduzir
```bash
pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration && pnpm build && pnpm test:e2e
```
