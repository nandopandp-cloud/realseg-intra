# Visão do produto

## Objetivo
Concentrar em um só lugar, seguro e fácil de usar, tudo o que o colaborador da REALSEG precisa no dia a dia: comunicados, documentos pessoais e institucionais, solicitações com prazo, cursos, carreira, feedbacks e ajuda — e dar ao RH ferramentas de gestão com rastreabilidade (ambiente `/rh`).

## Personas
| Persona | Contexto | Necessidades | Implicações de design |
| --- | --- | --- | --- |
| **Colaborador operacional** (vigilância, transporte, apoio) | Usa principalmente o celular, em turnos, às vezes com conexão instável; familiaridade digital variada | Holerite, envio de atestado, avisos importantes, abrir chamado | Mobile-first, navegação inferior fixa, botões grandes (≥ 44 px), textos curtos, poucas etapas, foto pelo celular |
| **Colaborador administrativo** | Desktop durante o expediente | Documentos, cursos, solicitações para TI/Facilities | Sidebar, tabelas, filtros persistentes na URL |
| **RH / atendimento** | Desktop | Publicar comunicados, distribuir documentos, analisar envios, atender fila com SLA, cadastrar colaboradores, cursos e carreira | Ambiente `/rh` com menu por permissão, tabelas com filtros na URL e relatórios CSV |
| **Gestor** (fase 2) | Desktop/celular | Feedbacks e acompanhamento da equipe | Papel e permissões já modelados |

## Escopo desta entrega (ambiente do colaborador)
Home · Comunicados · Documentos (recebidos, envio, normas, histórico) · Solicitações com SLA · Cursos e certificados · Minha carreira (desenvolvimento, cargos e salários, oportunidades, avaliações/feedbacks) · Ajuda e suporte · Fale com o RH · Notificações · Perfil e segurança da conta · Busca global · Autenticação completa.

Fora do escopo desta fase (registrado em `FEATURE_STATUS.md`): telas do RH/gestor, relatórios, importações em lote, chat em tempo real, integração com folha/ponto, envio de e-mail por provedor corporativo (driver SMTP pronto, provedor não definido), antivírus de arquivos (hook pronto, scanner não definido), armazenamento S3.

## Princípios
1. **Simples e previsível** — a mesma navegação em todas as telas; cada tarefa em poucas etapas; linguagem direta.
2. **Seguro por padrão** — negação por padrão, autorização no servidor perto dos dados, 404 para recursos alheios, auditoria de acessos sensíveis.
3. **Privacidade (LGPD)** — minimização (sem salário individual, sem CPF), finalidade clara, logs sem conteúdo sensível.
4. **Honesto** — nada é simulado: prazos vêm da configuração de SLA; certificado só com regra de emissão; ciência é ação explícita e não equivale a concordância.
5. **Acessível** — WCAG 2.2 AA verificado automaticamente (axe) e por regras do design system (contraste, foco visível, status sempre com texto).
6. **Fiel à marca** — referências visuais em `referencias/` reproduzidas em desktop e mobile, com superfícies claras, azul-marinho estrutural e verde-água como destaque.
