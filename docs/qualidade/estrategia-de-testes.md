# Estratégia de testes

Como a qualidade é verificada antes de cada entrega. Relacionados: [Status das funcionalidades](../produto/status-das-funcionalidades.md) · [Segurança](../seguranca/seguranca.md) · [CI](../../.github/workflows/ci.yml)

## Pirâmide
| Nível | Ferramenta | Escopo | Comando |
| --- | --- | --- | --- |
| Unitário | Vitest | Cálculo de SLA (fins de semana, feriados, janelas, fusos com horário de verão, entradas inválidas), máquina de estados, hash/tokens, validações Zod, catálogo de permissões | `pnpm test:unit` |
| Integração | Vitest + **PostgreSQL 18 real** (embarcado, porta 54321, recriado a cada execução) | Serviços e Route Handlers: persistência, transações, concorrência, uploads, auditoria, notificações, autorização negativa (IDOR), matriz 401/404 de todas as rotas | `pnpm test:integration` |
| E2E | Playwright (Chromium) desktop 1440×900 e Pixel 7 + axe-core | Jornadas reais em build de produção contra base isolada (porta 54322) com dados determinísticos | `pnpm build && pnpm test:e2e` |

Dados: `scripts/seed/reference.ts` (configuração) + `scripts/seed/demo.ts` (demonstração) + `scripts/seed/e2e.ts` (usuários de borda: bloqueio, recuperação, inativo). Integração recria a base por arquivo/teste (`resetDatabase`). E2E roda serialmente; testes que alteram dados usam registros próprios ou verificações relativas (ex.: contagem antes/depois).

## Critérios de release
Nenhuma entrega é considerada validada sem: lint ✔, typecheck ✔, unitários ✔, integração ✔, build ✔, E2E (desktop + mobile + acessibilidade) ✔. O CI (`.github/workflows/ci.yml`) executa tudo e bloqueia o merge em caso de falha. Cobertura percentual não é medida (não reportamos métricas inventadas).

## Última execução registrada

2026-10-20, v0.15.0: **unitários 43/43**, **integração 133/133**, **E2E 155/155** (desktop + mobile, com axe), lint ✔, typecheck ✔, build ✔. Nenhum teste pulado. Fonte: [Status das funcionalidades](../produto/status-das-funcionalidades.md).

## Testes unitários e de integração

| Arquivo | Nível | Cobre |
| --- | --- | --- |
| `tests/unit/business-time.test.ts` | unitário | minutos úteis, feriados, janelas, fusos e horário de verão |
| `tests/unit/ticket-state-machine.test.ts` | unitário | transições válidas e quem pode executá-las |
| `tests/unit/crypto-and-validation.test.ts` | unitário | hash de senha, tokens, validação de arquivos e schemas |
| `tests/unit/format.test.ts` | unitário | datas de calendário sem deslocamento de fuso; instantes no horário de Brasília |
| `tests/integration/auth.test.ts` | integração | login, bloqueio, recuperação, sessões, CSRF |
| `tests/integration/api-matrix.test.ts` | integração | todas as rotas: 401 sem sessão, 404 para recurso alheio, **403 para colaborador em `/api/v1/rh/*`** |
| `tests/integration/announcements-documents.test.ts` | integração | público-alvo, leitura e ciência, documentos, envios, uploads maliciosos |
| `tests/integration/tickets.test.ts` | integração | abertura com SLA, pausas, mensagens, concorrência, chat |
| `tests/integration/learning-career.test.ts` | integração | cursos, certificados, carreira, feedbacks, ajuda, preferências |
| `tests/integration/services-read.test.ts` | integração | leituras agregadas (Home, busca, contadores) |
| `tests/integration/cron.test.ts` | integração | manutenção diária e proteção por `CRON_SECRET` |
| `tests/integration/rh-tickets.test.ts` | integração | fila, atendimento, notas internas, responsável, prioridade |
| `tests/integration/rh-announcements.test.ts` | integração | editor, agendamento, versões, relatório de leitura |
| `tests/integration/rh-documents.test.ts` | integração | análise de envios, distribuição individual e em lote, versões, remoção |
| `tests/integration/rh-employees.test.ts` | integração | cadastro, acesso, situação, papéis, importação, estrutura |
| `tests/integration/rh-courses.test.ts` | integração | cursos, módulos e aulas, atribuição, trilhas |
| `tests/integration/rh-career-feedbacks.test.ts` | integração | oportunidades, faixas, metas, feedbacks |
| `tests/integration/rh-help-settings.test.ts` | integração | central de ajuda, agenda, SLA, calendário, auditoria |

## Matriz E2E
| ID | Arquivo | Cenários | Usuário/papel | Resultado esperado verificado |
| --- | --- | --- | --- | --- |
| A | `auth.spec.ts` | redirecionamento com `next`; validação de campos; credencial inválida; bloqueio após 5 falhas; usuário inativo; logout com revogação no servidor; sessão expirada por inatividade; recuperação com link de uso único; CSRF | Carlos, João, Ana, contas de borda | URL de destino, mensagens, 401 da API após logout, registro em `mail_outbox`, link reutilizado recusado |
| B | `home.spec.ts` | conteúdo da Home; personalização persistida após recarregar; busca global; estados vazios | Carlos, João | Atalhos persistidos no servidor, resultados autorizados |
| C | `comunicados.spec.ts` | contagem de não lidos cai após abrir; ciência explícita persistida (banco); favoritos; anexo; segmentação por unidade (404 UI/API); busca vazia | Carlos | Registro em `announcement_acknowledgements`, 404 |
| D/E | `documentos.spec.ts` | filtro persistente; download próprio; holerite alheio 404 (UI + API inline/attachment); ciência; envio com validação, confirmação e acompanhamento; `.exe` recusado no cliente; conteúdo disfarçado recusado no servidor; motivo de recusa | Carlos | Nome de arquivo baixado, 404, protocolo e status persistidos |
| F | `solicitacoes.spec.ts` | abertura com anexo + prazo; resposta retoma atendimento (evento "Prazo retomado"); confirmação de solução; rascunho → envio → cancelamento; ticket alheio 404; Fale com o RH | Carlos | Histórico e status após recarregar |
| G | `cursos.spec.ts` | filtros; matrícula → conclusão → retomada → certificado; conclusão repetida não duplica (banco); POST sem Origin → 403; curso de outro setor 404 | João, Carlos | 1 certificado no banco |
| H/I | `carreira.spec.ts` | abas; faixa não publicada oculta (UI + API); candidatura e retirada; oportunidade inelegível 404; ciência de feedback; feedback alheio 404 | Carlos | Estado persistido após recarregar |
| J | `ajuda.spec.ts` | busca → artigo → voto persistido; CTA abre solicitação na área correta; busca sem resultado; categorias | Carlos | `aria-pressed` após recarregar |
| L | `a11y.spec.ts` (desktop **e** mobile) | 19 páginas + login sem violações axe WCAG 2.2 A/AA e sem rolagem horizontal; link "Pular para o conteúdo" | Carlos | 0 violações |
| — | `navegacao.mobile.spec.ts` | barra inferior + "Mais"; alvos ≥ 44 px; envio de atestado pelo celular; perfil | Ana | Navegação e envio no viewport móvel |
| — | `jornadas.mobile.spec.ts` | resumo de documentos com "Ver todos"; Meus tickets e Rascunhos; atalhos da ajuda; "Continuar" em cursos; carreira no celular | Carlos | Layout e navegação fiéis às referências mobile |
| K | `rh.spec.ts` | colaborador não acessa a gestão (404) nem vê o atalho; painel; atendimento (assumir, responder, pedir retorno); comunicado para uma unidade com relatório; aceitar envio; cadastrar colaborador com senha temporária e primeiro acesso; criar unidade; curso criado e publicado aparece no catálogo; feedback publicado lido pelo colaborador; oportunidade publicada; administrador ajusta prazo; configurações e auditoria fechadas para o RH | Mariana (RH), Lucas (Admin), Carlos | Estado persistido no banco e visível no ambiente do colaborador; 404 na UI e 403 na API; todas as telas da gestão sem violações axe WCAG 2.2 A/AA |
| K | `rh.mobile.spec.ts` | `/rh`, solicitações, comunicados e documentos no celular | Mariana | Menu "Seções da gestão" visível e sem rolagem horizontal |

Evidências: relatório HTML em `playwright-report/` (trace e screenshot em falhas). Os testes verificam regras de negócio e persistência (consultas ao banco), não apenas capturas de tela.

## Revisão manual recomendada antes do release
Leitor de tela (NVDA/VoiceOver) nos fluxos de login, envio de documento e solicitação; zoom de 200%/400%; navegação só por teclado nos diálogos.
