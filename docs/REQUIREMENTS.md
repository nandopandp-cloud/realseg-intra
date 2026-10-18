# Requisitos

Legenda de status: ✅ implementado e testado nesta fase · 🟡 parcial · ⏳ próxima fase. Detalhes de testes em `FEATURE_STATUS.md`.

## Requisitos não funcionais
| ID | Requisito | Critério de aceite | Status |
| --- | --- | --- | --- |
| RNF-01 | Responsivo mobile-first | Sem rolagem horizontal em 375 px e 1440 px (E2E `a11y.spec`) | ✅ |
| RNF-02 | Acessibilidade WCAG 2.2 AA | axe sem violações A/AA nas páginas principais; foco visível; alvos ≥ 44 px; status com texto | ✅ |
| RNF-03 | Autorização no servidor | Toda rota/serviço exige sessão + permissão + escopo; recurso alheio → 404 | ✅ |
| RNF-04 | Persistência real | PostgreSQL com migrações versionadas; sem mocks | ✅ |
| RNF-05 | Segurança de sessão | Cookie HttpOnly/SameSite=Lax/Secure; expiração absoluta (12 h) e por inatividade (60 min) | ✅ |
| RNF-06 | Proteções web | CSRF por Origin, CSP com nonce, rate limit, validação Zod, uploads verificados por conteúdo | ✅ |
| RNF-07 | Auditoria | Login, downloads/visualizações de documentos sensíveis, ciência, transições de ticket | ✅ |
| RNF-08 | Logs sem dados sensíveis | Logger com redação de campos; metadados de auditoria sem conteúdo | ✅ |
| RNF-09 | Desempenho | Listas paginadas (máx. 50), consultas com índices, imagens pré-otimizadas em WebP com cache de 30 dias, sem prefetch automático de rotas dinâmicas (ver `COST_OPTIMIZATION.md`) | ✅ |

## RF-AUTH — Autenticação e conta
- Login por e-mail **ou** matrícula; mensagem genérica de erro; bloqueio após 5 falhas por 15 min (mesma resposta para contas inexistentes).
- Logout revoga a sessão no servidor.
- Recuperação: resposta idêntica para e-mail existente/inexistente; token de uso único (hash SHA-256 no banco), validade 30 min; redefinição revoga todas as sessões.
- Alteração de senha exige senha atual; encerra as demais sessões.
- Sessão expirada redireciona ao login com aviso e retorna à página de origem.
- Perfil mostra sessões ativas e permite encerrar outras.

## RF-HOME
- Boas-vindas personalizadas; atalhos (até 4) personalizáveis e persistidos.
- "Para você resolver": documentos/comunicados aguardando ciência, solicitações aguardando resposta, cursos obrigatórios pendentes, feedbacks novos.
- Comunicado importante (prioriza o que exige ciência pendente), solicitações em aberto, documentos recentes com download; estados vazios com próximo passo; acesso à Ajuda.

## RF-COM — Comunicados
- Feed com abas (Todos, Importantes, Não lidos, Favoritos), busca sem acento, filtro por categoria, ordenação, paginação.
- Visibilidade: somente `published`, com `published_at ≤ agora` e público-alvo compatível (todos, setor, unidade, cargo, família). Rascunhos/agendados/arquivados nunca aparecem.
- **Leitura** registrada por usuário e versão ao abrir; **ciência** é ação explícita, idempotente e auditada; nova versão exige nova ciência.
- Favoritos, anexos com download autorizado, destaque da semana, próximos eventos da unidade.
- Listas de leitura nunca são expostas ao colaborador.

## RF-DOC — Documentos
- Meus documentos (somente os próprios): busca, filtros por categoria/ano/situação, paginação, visualizar/baixar com reautorização e auditoria, detalhe com versão e histórico pessoal de acesso.
- Ciência explícita quando exigida (abrir não confirma).
- Normas e manuais vigentes (institucionais) para todos os colaboradores, com ciência quando exigida.
- Envio ao RH: tipo, nome, data de referência, observações, arquivo (PDF/JPG/PNG ≤ 10 MB, conteúdo verificado por assinatura binária, PDF com script recusado), confirmação, protocolo `DOC-n`.
- Estados do envio: `enviado → em_analise → aceito | recusado`; `enviado → cancelado` (pelo colaborador, com controle de concorrência). Motivo de recusa visível.
- Histórico unificado: recebidos, enviados, mudanças de situação, ciência, downloads e visualizações.

## RF-TKT — Solicitações e SLA
- Abertura com área (RH, TI, Serviços, Facilities), assunto, descrição, até 5 anexos, confirmação; protocolo sequencial `#n`.
- Rascunhos privados (máx. 20) retomáveis.
- Lista com abas por situação, busca por assunto ou número, filtro por área; detalhe com conversa, anexos, prazo e histórico.
- **Transições válidas** (`src/server/tickets/state-machine.ts`):

| De \ Para | em_andamento | aguardando_colaborador | respondido | resolvido | fechado | cancelado |
| --- | --- | --- | --- | --- | --- | --- |
| aberto | atendente | atendente | atendente | atendente | — | solicitante, atendente |
| em_andamento | — | atendente | atendente | atendente | — | solicitante, atendente |
| aguardando_colaborador | solicitante (ao responder), atendente, sistema | — | — | atendente | — | solicitante, atendente |
| respondido | solicitante, atendente | — | — | solicitante, atendente | sistema | — |
| resolvido | solicitante (reabrir ≤ 7 dias), atendente | — | — | — | solicitante, sistema (após 7 dias) | — |
| fechado / cancelado | terminais |

- **SLA** (ADR-0011): política por área × prioridade com minutos úteis de primeira resposta e de resolução; calendário com fuso, janelas e feriados; pausa em `aguardando_colaborador` (configurável) desloca o vencimento ao retomar; exibição "X de Y dias úteis", vencimento previsto, situação textual; sem política → "Sem prazo definido".
- Monitor periódico: alerta de risco (≥ 80% do prazo), violação de primeira resposta e de resolução (idempotente), fechamento automático de resolvidos após 7 dias.
- Notas internas do atendimento nunca aparecem ao solicitante. Compartilhamento explícito concede só leitura.
- **Configuração inicial de SLA (proposta, validar com o RH)** — minutos úteis (1ª resposta / resolução), expediente seg–sex 08h–18h, feriados nacionais 2026–2027:

| Área | Baixa | Normal | Alta | Urgente |
| --- | --- | --- | --- | --- |
| RH | 480 / 3000 | 240 / 1800 | 120 / 600 | 60 / 240 |
| TI | 240 / 1800 | 120 / 600 | 60 / 300 | 30 / 120 |
| Serviços | 480 / 3000 | 240 / 1800 | 120 / 600 | 60 / 240 |
| Facilities | 480 / 4800 | 240 / 3000 | 120 / 1200 | 60 / 300 |

## RF-CUR — Cursos
- Catálogo elegível (público por setor/unidade/cargo/família) com chips de categoria, busca, filtros (obrigatórios, em andamento, concluídos, não iniciados).
- Continuar assistindo; meu progresso; trilhas de aprendizagem com progresso.
- Matrícula idempotente; conclusão de aula idempotente e serializada; progresso recalculado em transação; ao atingir 100%: conclusão, certificado **somente se o curso tiver regra de emissão**, conquista automática e notificação.
- Certificados próprios com código de verificação e versão para impressão/PDF.

## RF-CAR — Minha carreira
- Visão geral: trilha da família profissional, próximas etapas do plano de desenvolvimento, oportunidades, conteúdos recomendados, conquistas.
- Cargos e salários: cargos da família do colaborador com requisitos, critérios de evolução e **apenas faixas publicadas e vigentes**; não há salário individual no sistema e nada é inferido sobre promoção.
- Oportunidades internas publicadas, dentro do prazo e elegíveis; candidatura com confirmação, retirada e nova candidatura.

## RF-FB — Feedbacks
- Somente feedbacks **publicados** do próprio colaborador; autor exibido conforme política (`show_author`); leitura auditada; confirmação de leitura explícita e idempotente (não é concordância).

## RF-AJU — Ajuda e suporte
- Busca (título prioritário), categorias com contagem, artigos mais acessados, base de conhecimento, artigos relacionados, CTA para solicitação na área relacionada, estados sem resultado.
- Contador de acessos agregado e anônimo; voto de utilidade único por pessoa (só agregados são exibidos).
- Horário de atendimento e "Online" derivados do calendário de SLA configurado.

## RF-PERF — Perfil e notificações
- Dados cadastrais somente leitura (correção via RH); preferências de notificação por categoria (segurança da conta não pode ser desligada); notificações com leitura individual, "marcar todas" e filtro de não lidas; notificações sem dados sensíveis.

## RF-RH — Ambiente RH/Administração ⏳
Próxima fase. Já existem: papéis RH/GESTOR/ADMIN e permissões granulares, serviços de atendimento de tickets (`agentReply`, `agentChangeStatus`, `agentAssign`, `agentChangePriority`) e monitor de SLA com testes.
