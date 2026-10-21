# Changelog

## [0.15.0] — 2026-10-20 — Central de ajuda, agenda, configurações e auditoria
### Adicionado
- `/rh/ajuda`: artigos (rascunho, publicado, arquivado) com pré-visualização, categoria, tipo, ícone/cor e área sugerida para falar com o suporte; acessos e índice de "foi útil?"; categorias.
- `/rh/agenda`: eventos para todas as unidades ou uma unidade, com local, término opcional e comunicado relacionado; cancelar e reativar.
- `/rh/configuracoes` (Administrador): matriz de prazos por área × prioridade em horas úteis (cada alteração cria nova versão e vale para novas solicitações), áreas de solicitação, expediente por dia da semana e feriados (cache do calendário invalidado na hora).
- `/rh/auditoria` (Administrador): trilha com filtros por tipo de ação, pessoa, registro e período, e exportação CSV (a exportação também é auditada).
- Painel do administrador sem permissões de RH mostra atalhos para configurações e auditoria.
- E2E da gestão cobre todas as telas (axe), o administrador e o bloqueio do RH às telas de administração.

## [0.14.0] — 2026-10-20 — Gestão de carreira e feedbacks
### Adicionado
- `/rh/carreira`: oportunidades internas (abertas, rascunhos, encerradas) com local, cargo, prazo de inscrição, destaque e elegibilidade (todos ou áreas/unidades/famílias/cargos); publicar com aviso aos elegíveis, encerrar (encerra candidaturas e avisa) e reabrir.
- Candidaturas por oportunidade: colaborador, mensagem, data e situação; marcar em análise ou encerrar (o candidato é avisado).
- Faixas salariais por cargo com vigência e visibilidade (o colaborador só vê faixas visíveis e vigentes; não há salário individual).
- Planos de desenvolvimento: etapas por colaborador (prazo, curso relacionado, situação), exibidas em Minha carreira › Próximas etapas.
- `/rh/feedbacks`: reconhecimentos, feedbacks e avaliações por colaborador (rascunho, publicado, leitura pendente, arquivado); a notificação nunca traz o conteúdo; editar um publicado reinicia a confirmação de leitura. Atalho "Registrar feedback" no perfil do colaborador.

## [0.13.0] — 2026-10-20 — Gestão de cursos
### Adicionado
- `/rh/cursos`: lista por situação com conteúdo (aulas e duração) e taxa de conclusão/atrasos; trilhas de aprendizagem (cursos em ordem, cor, ícone e família profissional) e categorias.
- Curso: dados do catálogo (título, endereço, resumo, descrição, categoria, capa), obrigatoriedade com prazo, certificado e público-alvo; publicar, arquivar e voltar para rascunho (publicar exige ao menos uma aula).
- Conteúdo: módulos e aulas (texto, vídeo do YouTube/Vimeo convertido para o player sem rastreamento, material), com reordenação; aulas já concluídas por alguém não podem ser excluídas; o progresso das matrículas é recalculado quando o conteúdo muda.
- Participantes: público e matriculados com progresso, prazo e atrasados (filtros e busca), exportação CSV auditada e atribuição do curso ao público ou a pessoas escolhidas com prazo (avisa os novos matriculados).

## [0.12.0] — 2026-10-20 — Gestão de colaboradores e estrutura
### Adicionado
- `/rh/colaboradores`: lista por situação (ativos, afastados, desligados) com busca por nome, e-mail ou matrícula e filtros de área, unidade, cargo e papel; último acesso e bloqueio visíveis.
- Cadastro com primeiro acesso por senha temporária (exibida uma única vez, troca obrigatória) ou convite por e-mail (link válido por 72 h); edição de dados e vínculo (cargo, área, unidade, gestor, admissão).
- Situação do vínculo: afastado mantém o acesso; desligado bloqueia na hora (sessões revogadas) e preserva o histórico. Nova senha temporária/convite também desbloqueia a conta.
- Papéis RH, Gestor e Administrador concedidos só por quem tem `role:manage`; o administrador não remove o próprio papel.
- Importação de colaboradores por planilha CSV (modelo para download), com conferência linha a linha antes de gravar e convite automático.
- `/rh/estrutura`: áreas (código, área superior), unidades, famílias profissionais e cargos (nível, rótulo, requisitos e critérios de progressão); desativar só sem colaboradores ativos.

## [0.11.0] — 2026-10-20 — Gestão de documentos
### Adicionado
- `/rh/documentos` com três seções: envios dos colaboradores (para analisar, aceitos, recusados), documentos distribuídos (com situação da ciência) e normas e manuais (vigentes e arquivados, com % de ciência).
- Análise de envio: visualizar/baixar o arquivo (auditado), iniciar análise, aceitar ou recusar com motivo obrigatório; o colaborador é avisado e vê o retorno.
- Distribuição de documento pessoal para um colaborador (busca por nome ou matrícula) e em lote: cada arquivo vai para a matrícula que aparece no nome, com prévia que recusa nomes sem matrícula, ambíguos ou repetidos e progresso por arquivo.
- Normas e manuais: publicação com vigência e aviso a todos; nova versão do arquivo (reinicia a ciência), edição dos dados, arquivar/restaurar e remoção de documento enviado por engano (motivo na auditoria).
- E2E da gestão (`e2e/rh.spec.ts`, `e2e/rh.mobile.spec.ts`): acesso negado ao colaborador, axe em todas as telas da gestão e jornadas de atendimento, comunicado e análise de envio.
### Corrigido
- Datas de calendário (ex.: vigência, data de referência de atestado, prazo de meta) apareciam um dia antes por conversão de fuso; agora são exibidas como o dia gravado.

## [0.10.0] — 2026-10-20 — Gestão de comunicados
### Adicionado
- `/rh/comunicados`: lista por situação (publicados, agendados, rascunhos, arquivados) com busca, categoria e progresso de leitura/ciência de cada comunicado.
- Editor completo: título, resumo, texto com pré-visualização, "Quando começa a valer?", "O que muda" (até 6 itens), capa (biblioteca ou envio de JPG/PNG), anexos, categoria, assinatura, importante, exige ciência, destaque, área para dúvidas, tags e público-alvo (todos ou áreas, unidades, famílias e cargos).
- Publicação imediata (com aviso na intranet para o público) ou agendada; arquivar, restaurar como rascunho, duplicar e excluir rascunho.
- Alteração relevante em comunicado publicado gera nova versão: leituras e ciências recomeçam e o público é avisado.
- Relatório de leitura e ciência por colaborador (pendentes primeiro, filtros e busca) com exportação CSV auditada (`report.exported`).
- Capas enviadas pela gestão em `/api/v1/media/[id]`: servidas só a usuários autenticados e só se estiverem em uso como capa.
### Alterado
- Comunicado agendado fica visível ao colaborador na data marcada (`publish_at`); a manutenção diária marca como publicado e avisa o público.

## [0.9.0] — 2026-10-20 — Ambiente de gestão (RH): base, painel e fila de solicitações
### Adicionado
- Ambiente de gestão em `/rh` com layout próprio (menu escuro agrupado por Operação, Conteúdo, Pessoas e Administração; faixa rolável no celular). Cada item do menu e cada tela exigem a sua permissão; sem acesso, a resposta é 404. Atalho "Painel de gestão" ↔ "Área do colaborador" no menu da conta.
- Painel com indicadores por permissão: solicitações abertas, fora do prazo e em risco, % resolvidas no prazo, documentos para analisar, colaboradores ativos/afastados, comunicados, cursos obrigatórios atrasados e candidaturas.
- Fila de atendimento (`/rh/solicitacoes`): abas (abertas, sem responsável, comigo, aguardando colaborador, fora do prazo, concluídas), busca por protocolo/assunto/nome/matrícula, filtros de área e prioridade, ordenação por urgência e prazo.
- Atendimento (`/rh/solicitacoes/[numero]`): conversa completa com notas internas (nunca exibidas ao colaborador), resposta com anexos e mudança de situação, responsável ("Assumir solicitação"), prioridade (recalcula o prazo), dados do colaborador, outras solicitações dele, prazo e histórico.
- API `/api/v1/rh/tickets/[number]/{messages,status,assign,priority,attachments/[id]}`.
### Alterado
- `agentReply` aceita anexos, registra auditoria e bloqueia mensagens em solicitações encerradas; `agentAssign` aceita remover o responsável, valida que o responsável pertence à equipe de atendimento e notifica quem recebe.

## [0.8.2] — 2026-10-19 — Ajuda e suporte fiel à referência
### Alterado
- Ajuda e suporte conforme `referencias/Central de Ajuda REALSEG.png` e `Portal de Ajuda e Suporte REALSEG.png`: imagem do cabeçalho recortada da referência (desktop e celular), atalhos com títulos em duas linhas e setas na cor de cada atalho, categorias e artigos compactos, "Chat com o suporte" com o mesmo ícone da referência, horário de atendimento com ícone em destaque e selo "Online", solicitações recentes compactas e "Não encontrou o que precisa?" com ícone.
- Celular: categorias e artigos na seleção e ordem da referência, chamada "Ainda precisa de ajuda?" com botão na mesma linha; os quadros laterais aparecem só no desktop (e nos resultados de busca).
- "Artigos mais acessados" de demonstração na ordem da referência (migration de dados `0005_help_demo_views`, só em bancos de demonstração).

## [0.8.1] — 2026-10-19 — Imagens de cabeçalho das referências
### Alterado
- Comunicados, Cursos e Minha carreira usam no cabeçalho as imagens recortadas das próprias referências (`*-ref.webp`, desktop e celular), na mesma proporção e posição, com o esfumado original. Novo `art` no `PageHero`; cabeçalho mais compacto nessas páginas, como nas referências. Imagens antigas removidas.

## [0.8.0] — 2026-10-18 — Revisão das jornadas do colaborador
### Alterado
- "Fale com o RH" oculto (flag `FEATURES.talkToHr`): sai da sidebar, do "Mais", dos atalhos da Home (inclusive de preferências salvas) e a rota responde 404. Os links passam a abrir uma solicitação na categoria RH.
- Documentos no celular conforme `referencias/Documentos REALSEG_ Gestão Segura.png`: seta de voltar, 4 recentes com "Ver todos" (lista completa com busca, filtros e paginação), card "Enviar documento" e "Documentos importantes" em 2 colunas. Ícones de documento por categoria (PDF, azul, verde), como nas referências.
- Histórico de documentos com filtros (Recebidos, Enviados ao RH, Ciência, Acessos) e agrupamento por mês.
- Detalhe do documento em duas colunas: referência por extenso, formato, versões, "Outros documentos" da mesma categoria e atalho "Dúvidas sobre este documento?" que abre a solicitação já com o assunto preenchido (`/solicitacoes/nova?assunto=`).
- Solicitações conforme `referencias/Painel REALSEG de Solicitações.png` e `Tela de Solicitações em Aplicativo Corporativo.png`: tabela com "Data de abertura", abas compactas, "Filtros" (situação, categoria, período de abertura — na URL), ordem pelo número; no celular, seta de voltar, botão centralizado, categorias em 4 colunas, abas "Meus tickets / Rascunhos" e "Precisa de ajuda?".
- Nova solicitação em duas colunas com "Como funciona", prazos de atendimento por área e sugestão de artigos da central de ajuda enquanto o assunto é digitado (`GET /help/articles?sugerir=`).
- Conversa da solicitação em bolhas (suas mensagens à direita, atendimento à esquerda com avatar).
- Ajuda e suporte conforme `referencias/Central de Ajuda REALSEG.png` e `Portal de Ajuda e Suporte REALSEG.png`: atalhos com as cores da referência (4 colunas também no celular), categorias em 3/2 colunas, 4 artigos no celular e chamada "Ainda precisa de ajuda?".
- Base de conhecimento com filtros por categoria e tipo; as páginas de categoria passam a abrir a base já filtrada. Artigo em duas colunas com "Falar com o suporte" e solicitação com assunto preenchido.
- Cursos conforme `referencias/Painel de Cursos REALSEG.png` e `Interface de Cursos Corporativos REALSEG.png`: recomendados sem repetir o curso em andamento (obrigatórios primeiro), trilhas com barra de progresso e "Ver todas"; no celular, "Continuar assistindo" horizontal (o card inteiro leva à aula atual), cards compactos e seta "Ver mais categorias" na rolagem lateral.
- Página do curso: progresso e botão de continuar logo após o título no celular, capa clicável para continuar e quadro "Sobre o curso".
- Minha carreira conforme `referencias/Dashboard de Carreira REALSEG.png` e `Painel de carreira REALSEG.png`: 4 abas (Visão geral, Meu desenvolvimento, Oportunidades, Avaliações), com Cargos e salários dentro de "Meu desenvolvimento"; "Continuar minha trilha" leva direto ao próximo curso; oportunidades com selos à direita; conteúdos recomendados em 3 colunas (1 no celular); etapa atual destacada em "Próximas etapas"; chamada "Construa o seu futuro" no celular.
### Corrigido
- Plano de cargos e salários mostrava "Faixa não divulgada" para todos os cargos: a subconsulta da faixa comparava a coluna errada. Faixas publicadas e vigentes voltam a aparecer (faixas não publicadas continuam ocultas).
### Adicionado
- "Minhas candidaturas" em Oportunidades, com situação de cada candidatura e acesso à vaga.
- Página "Trilhas de aprendizagem" (`/cursos/trilhas`) com todas as trilhas e o progresso de cada uma.
- Chat com o suporte (`/ajuda/chat`, `POST /support-chat`): cada conversa vira uma solicitação com `channel = "chat"` (protocolo, prazo, histórico), uma conversa aberta por vez, Enter envia, anexos, atualização automática e "Encerrar conversa". Migration `0004_ticket_channel`.

## [0.7.0] — 2026-10-18 — Arquivos no Cloudflare R2
### Adicionado
- Driver de armazenamento Cloudflare R2 (`STORAGE_DRIVER=r2`, automático com as credenciais `R2_*`). Uploads e downloads de documentos, anexos de comunicados e de solicitações passam a ficar no bucket privado, com o mesmo controle de acesso.
- Reparo dos arquivos de demonstração que estavam no `/tmp` efêmero da Vercel, executado pelo seed de deploy.
### Corrigido
- O seed carregava o `.env.local` depois das importações; agora o carrega primeiro (`scripts/seed/load-env.ts`).

## [0.6.0] — 2026-10-18 — Página de leitura do comunicado
### Adicionado
- Página do comunicado conforme `referencias/Colado 2026-10-18 às 12.08.10.png`: capa, selos, autor com data e hora, Favoritar e Compartilhar (menu nativo do celular ou cópia do link), "Quando começa a valer?", "O que muda", texto, confirmação de ciência, "Dúvidas?" com atalho para abrir solicitação, anexos com "Baixar todos", público-alvo, tags e relacionados.
- Campos `cover_image`, `effective_note`, `highlights`, `tags` e `support_ticket_category` em `announcements` (migration `0003_announcement_detail`, que também preenche o conteúdo de demonstração em bancos de demo); filtro `?tag=` na lista e na API.
- Comunicados de demonstração "Boas práticas de segurança no dia a dia" e "Modelos de crachá e utilização correta".
### Removido
- Imagem promocional "Segurança que enxerga além." da sidebar, que atrapalhava a navegação.

## [0.5.0] — 2026-10-18 — Home mobile fiel à referência
### Alterado
- Home no celular conforme `referencias/Painel Corporativo REALSEG.png`: boas-vindas mais compacta com a câmera inteira, cards de acesso rápido sem selos visíveis (o texto continua para leitores de tela), card "Comunicado importante" com data na mesma linha e botão em pílula, "Minhas solicitações" e "Documentos recentes" sem moldura externa e com o status na mesma linha. "Personalizar" foi para o fim da página.
- Barra inferior com 4 itens (Início · Documentos · Solicitações · Mais), "Início" ativo com ícone preenchido; Buscar e Comunicados passaram para o "Mais" (ADR-0009 revisado).
- Busca saiu do cabeçalho no celular (continua em tablets e no "Mais").

## [0.4.0] — 2026-10-18 — Otimização de custos (Vercel + Neon)
Detalhes, motivos e medições em `docs/COST_OPTIMIZATION.md`.
### Alterado
- Prefetch automático desligado em todos os links (`app-link.tsx`): 0 prefetches no servidor (antes 3 por sessão típica).
- Imagens em WebP (318 KB → 144 KB) servidas sem Image Optimization; migration de dados `0002_course_covers_webp`.
- Cache de 30 dias para `/images` e `/logo`.
- Lista do sininho carregada sob demanda; `last_seen_at` gravado no máximo a cada 5 min.
- Pool do banco menor, conexões ociosas fecham em 5 s e `attachDatabasePool` (Fluid Compute).
- Build de Preview não toca no banco; commits só de documentação/testes não geram deploy.
### Adicionado
- Cron diário da Vercel (`/api/cron/daily`, `CRON_SECRET`) com a manutenção (SLA, fechamento automático, limpeza).
- `docs/COST_OPTIMIZATION.md` e utilitário `scripts/dev/measure.mjs`; README reescrito.

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
