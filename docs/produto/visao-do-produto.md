# Visão do produto

Para quem é a intranet, o que ela resolve, o que já foi entregue e o que vem a seguir. Documentos relacionados: [Requisitos](requisitos.md) · [Mapa de telas](mapa-de-telas.md) · [Status das funcionalidades](status-das-funcionalidades.md) · [Changelog](../../CHANGELOG.md)

## Objetivo
Concentrar em um só lugar, seguro e fácil de usar, tudo o que o colaborador da REALSEG precisa no dia a dia: comunicados, documentos pessoais e institucionais, solicitações com prazo, cursos, carreira, feedbacks e ajuda — e dar ao RH ferramentas de gestão com rastreabilidade (ambiente `/rh`).

## Personas
| Persona | Contexto | Necessidades | Implicações de design |
| --- | --- | --- | --- |
| **Colaborador operacional** (vigilância, transporte, apoio) | Usa principalmente o celular, em turnos, às vezes com conexão instável; familiaridade digital variada | Holerite, envio de atestado, avisos importantes, abrir chamado | Mobile-first, navegação inferior fixa, botões grandes (≥ 44 px), textos curtos, poucas etapas, foto pelo celular |
| **Colaborador administrativo** | Desktop durante o expediente | Documentos, cursos, solicitações para TI/Facilities | Sidebar, tabelas, filtros persistentes na URL |
| **RH / atendimento** | Desktop | Publicar comunicados, distribuir documentos, analisar envios, atender fila com SLA, cadastrar colaboradores, cursos e carreira | Ambiente `/rh` com menu por permissão, tabelas com filtros na URL e relatórios CSV |
| **Administrador** | Desktop | Prazos de atendimento (SLA), expediente e feriados, papéis de acesso, auditoria | Seção "Administração" do `/rh`, separada das tarefas do dia a dia do RH |
| **Gestor** (próxima fase) | Desktop/celular | Feedbacks e acompanhamento da equipe | Papel e permissões já modelados, sem telas próprias |

## Escopo entregue

**Ambiente do colaborador** (v0.1–v0.8, 2026-10-17 a 2026-10-19): Home · Comunicados · Documentos (recebidos, envio, normas, histórico) · Solicitações com SLA e chat com o suporte · Cursos, trilhas e certificados · Minha carreira (desenvolvimento, cargos e salários, oportunidades, avaliações e feedbacks) · Ajuda e suporte · Notificações · Perfil e segurança da conta · Busca global · Autenticação completa. "Fale com o RH" está oculto por decisão de produto; pedidos ao RH seguem por Solicitações.

**Ambiente de gestão `/rh`** (v0.9–v0.15, 2026-10-20): Painel · Solicitações (fila e atendimento) · Comunicados e agenda · Documentos (análise de envios, distribuição individual e em lote, normas) · Colaboradores (cadastro, acesso, papéis, importação CSV) e estrutura · Cursos e trilhas · Carreira (oportunidades, faixas, planos) · Feedbacks · Central de ajuda · Configurações de prazo e calendário · Auditoria.

Telas e rotas: [Mapa de telas](mapa-de-telas.md). Situação detalhada de cada módulo: [Status das funcionalidades](status-das-funcionalidades.md).

## Próximas fases

| Item | Situação |
| --- | --- |
| Telas do **Gestor** para a própria equipe | permissões `employee:read:team` e `feedback:write:team` existem, sem telas |
| LGPD: exportação consolidada por titular e anonimização administrativa | pendente ([Privacidade e LGPD](../seguranca/privacidade-lgpd.md)) |
| Upload de material nas aulas de cursos | pendente |
| Provedor de e-mail corporativo (SMTP) | driver pronto; provedor não definido |
| Antimalware de uploads | hook pronto; scanner não definido |
| Expurgo por prazo de retenção | aguarda definição de prazos pelo jurídico |
| Respostas prontas e ações em lote no atendimento | não iniciado |
| Integração com folha e ponto, chat em tempo real, MFA para RH/Admin | fora do escopo atual |

## Princípios
1. **Simples e previsível** — a mesma navegação em todas as telas; cada tarefa em poucas etapas; linguagem direta.
2. **Seguro por padrão** — negação por padrão, autorização no servidor perto dos dados, 404 para recursos alheios, auditoria de acessos sensíveis.
3. **Privacidade (LGPD)** — minimização (sem salário individual, sem CPF), finalidade clara, logs sem conteúdo sensível.
4. **Honesto** — nada é simulado: prazos vêm da configuração de SLA; certificado só com regra de emissão; ciência é ação explícita e não equivale a concordância.
5. **Acessível** — WCAG 2.2 AA verificado automaticamente (axe) e por regras do design system (contraste, foco visível, status sempre com texto).
6. **Fiel à marca** — referências visuais em `referencias/` ([índice](../design/referencias-visuais.md)) reproduzidas em desktop e mobile, com superfícies claras, azul-marinho estrutural e verde-água como destaque.
