# Privacidade e LGPD

## Inventário de dados pessoais
| Dado | Onde | Finalidade | Base legal sugerida* | Quem acessa |
| --- | --- | --- | --- | --- |
| Nome, matrícula, e-mail corporativo, setor, unidade, cargo, admissão, gestor | `employees`, `users` | Identificação e gestão do vínculo; segmentação de comunicados/cursos | Execução de contrato (art. 7º, V) | Próprio colaborador; RH autorizado |
| Holerites, comprovantes de rendimento | `documents` (sensível) | Obrigação trabalhista/fiscal | Obrigação legal (art. 7º, II) | Próprio colaborador; RH com `document:read:any` |
| Atestados médicos (**dado sensível de saúde**) | `document_submissions` | Justificativa de ausência | Art. 11, II, "a" e "b" | Próprio colaborador; RH com `submission:review` |
| Advertências, feedbacks, avaliações | `documents`, `feedbacks` | Gestão do desempenho e disciplina | Execução de contrato / legítimo interesse | Próprio colaborador; autor; RH autorizado |
| Mensagens e anexos de solicitações | `ticket_*` | Atendimento | Execução de contrato | Solicitante, participantes, atendentes |
| Registros de leitura/ciência, downloads | `announcement_reads/acknowledgements`, `document_acknowledgements`, `audit_events` | Comprovar ciência; segurança | Legítimo interesse / obrigação legal | Próprio colaborador (seu histórico); RH (relatórios — fase 2); ADMIN (auditoria) |
| Progresso em cursos, certificados | `enrollments`, `certificates` | Capacitação obrigatória e desenvolvimento | Obrigação legal (NRs) / contrato | Próprio colaborador; RH (relatórios) |
| Candidaturas internas | `opportunity_applications` | Recrutamento interno | Legítimo interesse | Próprio colaborador; RH |
| Sessões (user agent, IP pseudonimizado) | `sessions`, `audit_events` | Segurança | Legítimo interesse | Próprio colaborador (lista); ADMIN |

\*Bases legais a serem confirmadas pelo encarregado (DPO)/jurídico da REALSEG.

## Minimização (decisões de projeto)
- Não armazenamos CPF, data de nascimento, endereço, dados bancários nem **salário individual** (o plano de cargos mostra apenas faixas publicadas).
- IP é pseudonimizado com HMAC; o IP bruto não é persistido.
- Contadores de acesso a artigos são agregados e anônimos.
- Notificações não carregam conteúdo sensível (apenas títulos genéricos e links).
- Logs com redação automática; auditoria sem conteúdo dos documentos ou mensagens.

## Controle de acesso
Ver `SECURITY.md` (RBAC + escopo no servidor + 404 para recursos alheios). Feedbacks e documentos individuais nunca são visíveis a outros colaboradores.

## Retenção (proposta — validar com jurídico/RH)
| Categoria | Sugestão | Observação |
| --- | --- | --- |
| Holerites e comprovantes | 5 anos após o desligamento (mín.), ou prazo previdenciário aplicável | `document_categories.retention_months` |
| Atestados médicos | 5 anos | dado sensível |
| Advertências/feedbacks | Duração do vínculo + 5 anos | |
| Tickets e mensagens | 5 anos | |
| Auditoria | 5 anos | |
| Sessões/tokens/rate limits | 30 dias / 7 dias / 1 dia | já automatizado em `pnpm jobs:run` |
| Outbox de e-mail | Somente dev/teste | |

Pendência: job de expurgo por categoria após a definição dos prazos.

## Direitos dos titulares (art. 18)
- **Acesso e confirmação**: o colaborador vê seus dados no Perfil, seus documentos, envios, solicitações, cursos e feedbacks.
- **Correção**: via "Fale com o RH" (solicitação registrada com protocolo).
- **Portabilidade/cópia**: download individual de documentos. Pendência: exportação consolidada (JSON/PDF) pelo RH — fase 2.
- **Eliminação/anonimização**: quando legalmente cabível, executada pelo RH/ADMIN respeitando obrigações de guarda (procedimento no RUNBOOK). Pendência: ferramenta administrativa na fase 2.
- **Informação sobre compartilhamento**: não há compartilhamento com terceiros nesta versão (e-mail/antivírus futuros serão operadores — registrar contratos).

## Incidentes
Procedimento em `SECURITY.md`/`RUNBOOK.md`; notificação à ANPD e titulares avaliada pelo DPO.
