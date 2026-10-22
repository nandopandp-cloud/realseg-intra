# Status das funcionalidades

O que está pronto, parcial ou pendente, com os testes que cobrem cada módulo. Relacionados: [Visão do produto](visao-do-produto.md#próximas-fases) · [Estratégia de testes](../qualidade/estrategia-de-testes.md) · [Changelog](../../CHANGELOG.md)

Atualizado em 2026-10-20 (v0.15.0). Execução real registrada: **unitários 43/43**, **integração 133/133** (PostgreSQL 18 real), **E2E 155/155** (Chromium desktop 1440×900 + Pixel 7, com axe WCAG 2.2 A/AA, inclusive todas as telas da gestão), lint ✔, typecheck ✔, build de produção ✔. Nenhum teste foi pulado. Cobertura percentual não é medida.

Legenda: ✅ concluído (critérios de aceite + testes) · 🟡 parcial · ⏳ não iniciado/fase seguinte.

| Módulo | Status | Testes que cobrem | Limitações / pendências reais |
| --- | --- | --- | --- |
| Fundação (env, banco, migrações, logger, erros, CI) | ✅ | integração (todas), CI | Métricas/APM (OpenTelemetry) pendentes |
| Otimização de custos (Vercel/Neon) | ✅ | `cron.test.ts`, E2E completo, `scripts/dev/measure.mjs` | Ações manuais no painel do Neon (limitar autoscaling) — ver [Otimização de custos](../operacao/otimizacao-de-custos.md) |
| Deploy Vercel + Neon (homologação) | 🟡 | simulação local do `vercel-build` (migração + seed 2×, idempotente) | Migração no Neon só ocorre no próximo deploy; arquivos no Cloudflare R2 (Production); Preview sem R2 usa `/tmp` efêmero; Preview compartilha o banco; região alinhada em São Paulo (`vercel.json` → `gru1`, Neon `aws-sa-east-1`) |
| Autenticação e sessão | ✅ | `auth.test.ts` (16), E2E A (9) | E-mail real depende do provedor SMTP corporativo (driver pronto). Sem MFA (avaliar para RH/ADMIN) |
| RBAC e autorização | ✅ (papéis e matriz) | `api-matrix.test.ts`, testes IDOR por módulo | Papéis atribuídos pela gestão (`/rh/colaboradores`, somente Administrador). Edição da matriz de permissões por papel só via seed |
| Design system e shell | ✅ | E2E a11y (desktop + mobile), crawler de desenvolvimento | Logo vetorial oficial e fotos licenciadas em alta resolução pendentes (ADR-0010). Sem tema escuro |
| Home | ✅ (fiel às referências desktop/mobile) | `services-read`, E2E B | Foto do colaborador no avatar: não há upload de foto (iniciais) |
| Comunicados (colaborador, inclusive a página de leitura com vigência, "o que muda", tags e relacionados) | ✅ | `announcements-documents`, E2E C | Publicação, segmentação e relatório de leitura: ver **Gestão — Comunicados** |
| Documentos (colaborador) | ✅ | `announcements-documents`, E2E D/E | Distribuição e análise de envios: ver **Gestão — Documentos**. Antivírus: hook pronto, scanner não definido (status `skipped`). Arquivos no Cloudflare R2. Expurgo por retenção aguarda prazos do jurídico |
| Solicitações e SLA | ✅ | `tickets.test.ts`, `business-time.test.ts`, `ticket-state-machine.test.ts`, E2E F | Fila, atendimento e prazos: ver **Gestão — Solicitações** e **Gestão — Configurações**. Valores de SLA são proposta inicial a validar com o RH. Feriados estaduais/municipais a cadastrar. Chat com o suporte (`/ajuda/chat`): conversa sobre a mesma fila de solicitações (`channel = chat`), atualização automática a cada 8 s com a aba visível; o atendimento responde pela fila da gestão (canal indicado em `/rh/solicitacoes`) |
| Cursos | ✅ | `learning-career`, E2E G | Conteúdo das aulas da demonstração é fictício; vídeos aceitos apenas de YouTube-nocookie/Vimeo; gestão de cursos e relatórios: ver **Gestão — Cursos**. Upload de arquivo como material de aula ainda não implementado |
| Carreira | ✅ | `learning-career`, `services-read`, E2E H | Avaliação da trilha e programa de liderança são etapas cadastradas (sem fluxo próprio). Gestão de cargos, faixas e oportunidades: ver **Gestão — Carreira** e **Estrutura** |
| Feedbacks | ✅ (leitura e confirmação) | `learning-career`, E2E I | Registro pelo RH: ver **Gestão — Feedbacks**; pelo gestor, pendente. Comentário/réplica do colaborador não implementado |
| Ajuda e suporte | ✅ | `learning-career`, `services-read`, E2E J | Artigos institucionais (ponto, uniforme, férias) são de demonstração; gestão de artigos: ver **Gestão — Central de ajuda** |
| Perfil, notificações, busca | ✅ | `learning-career`, E2E B/L | Notificações por e-mail (preferência `email`) não implementadas |
| Fale com o RH | ⏸️ oculto | E2E F (rota 404) | Oculto em 2026-10-18 por decisão do produto (`src/lib/features.ts` → `talkToHr`). Pedidos ao RH seguem por Solicitações → categoria RH; links antigos apontam para `/solicitacoes/nova?categoria=rh` |
| Ambiente RH/Administração — base (`/rh`, menu por permissão, painel) | ✅ | `rh-tickets.test.ts`, `api-matrix` (rotas `/rh` recusam colaborador), E2E `rh.spec.ts` | Acesso por `MANAGEMENT_PERMISSIONS` (RH + ADMIN); sem permissão a página mostra "não encontrada" e a API responde 403 |
| Gestão — Solicitações (fila, atendimento, notas internas, responsável, prioridade, situação) | ✅ | `rh-tickets.test.ts`, E2E `rh.spec.ts` | Respostas prontas (macros) e ações em lote não implementadas |
| Gestão — Comunicados (editor, público-alvo, capa, anexos, agendamento, versões, arquivo, relatório de leitura/ciência + CSV) | ✅ | `rh-announcements.test.ts` | Agendados ficam visíveis na hora marcada; o aviso aos colaboradores sai na manutenção diária ou quando a gestão abre a lista (cron diário no plano Hobby). Editor de texto com marcação simples (sem editor visual) |
| Gestão — Documentos (análise de envios, distribuição individual e em lote por matrícula, normas e manuais, versões, arquivo, remoção auditada) | ✅ | `rh-documents.test.ts`, E2E `rh.spec.ts` | Lote enviado arquivo a arquivo (limite de ~4,5 MB por requisição na Vercel). Pré-visualização de PDF depende do navegador |
| Gestão — Colaboradores (cadastro, primeiro acesso por senha temporária ou convite, situação, desbloqueio, papéis, importação CSV) | ✅ | `rh-employees.test.ts`, E2E `rh.spec.ts` | Convite depende do e-mail corporativo (SMTP) em produção. Papéis só por quem tem `role:manage` (Administrador). Sem foto do colaborador |
| Gestão — Estrutura (áreas, unidades, famílias e cargos) | ✅ | `rh-employees.test.ts`, E2E `rh.spec.ts` | Desativar exige não haver colaboradores ativos vinculados |
| Gestão — Cursos (catálogo, módulos e aulas, público, obrigatoriedade com prazo, atribuição, participantes + CSV, trilhas e categorias) | ✅ | `rh-courses.test.ts`, E2E `rh.spec.ts` | Material de aula sem upload de arquivo. Vídeos só de YouTube/Vimeo (convertidos para o player sem rastreamento). Aula já concluída por alguém não pode ser excluída |
| Gestão — Carreira (oportunidades e candidaturas, faixas salariais com visibilidade, planos de desenvolvimento) | ✅ | `rh-career-feedbacks.test.ts`, E2E `rh.spec.ts` | Sem salário individual (só faixas por cargo) |
| Gestão — Feedbacks (registrar, publicar, editar com nova confirmação de leitura, arquivar) | ✅ | `rh-career-feedbacks.test.ts`, E2E `rh.spec.ts` | Registro pelo gestor da equipe pendente (ver **Gestão — Gestor**) |
| Gestão — Central de ajuda (artigos com pré-visualização, publicação, categorias, acessos e "foi útil?") | ✅ | `rh-help-settings.test.ts`, E2E `rh.spec.ts` | — |
| Gestão — Agenda (eventos por unidade, vínculo a comunicado, cancelar) | ✅ | `rh-help-settings.test.ts`, E2E `rh.spec.ts` | — |
| Gestão — Configurações (prazos SLA por área × prioridade com versões, áreas de solicitação, expediente e feriados) | ✅ | `rh-help-settings.test.ts`, E2E `rh.spec.ts` | Um único calendário de atendimento para todas as áreas. Novo prazo vale só para solicitações novas |
| Gestão — Auditoria (consulta com filtros e exportação CSV auditada) | ✅ | `rh-help-settings.test.ts`, E2E `rh.spec.ts` | Retenção de 5 anos sugerida, a validar com o jurídico |
| Gestão — Gestor (equipe) | ⏳ | — | Papel e permissões existem (`employee:read:team`, `feedback:write:team`), sem telas próprias; o acesso à gestão hoje é para RH e Administrador |
| LGPD — exportação/eliminação | 🟡 | — | Acesso e download individuais existem; desligamento bloqueia o acesso e preserva os registros. Exportação consolidada por titular e anonimização administrativa ainda não implementadas |

## Como reproduzir
```bash
pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration && pnpm build && pnpm test:e2e
```
