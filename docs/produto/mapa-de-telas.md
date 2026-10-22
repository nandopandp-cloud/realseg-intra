# Mapa de telas

Todas as páginas da aplicação, por ambiente. As rotas vêm de `src/app`. Os grupos entre parênteses, como `(colaborador)`, não aparecem na URL.

Veja também: [Visão do produto](visao-do-produto.md) · [Requisitos](requisitos.md) · [Referências visuais](../design/referencias-visuais.md) · [API](../arquitetura/api.md)

## Autenticação — `src/app/(auth)`

| Rota | Tela |
| --- | --- |
| `/login` | Entrada por matrícula ou e-mail |
| `/recuperar-senha` | Pedido do link de redefinição (resposta sempre igual) |
| `/redefinir-senha` | Nova senha a partir do link (uso único, 30 min; convite: 72 h) |

## Colaborador — `src/app/(colaborador)`

Navegação: sidebar no desktop; barra inferior **Início · Documentos · Solicitações · Mais** no celular ([ADR-0009](../arquitetura/adr/0009-navegacao-mobile.md)).

| Módulo | Rotas | O que o colaborador faz |
| --- | --- | --- |
| Home | `/` | Boas-vindas, atalhos personalizáveis, comunicado importante, solicitações e documentos recentes |
| Comunicados | `/comunicados` · `/comunicados/[id]` | Feed com abas, busca e filtros; leitura, ciência, favoritos e anexos |
| Documentos | `/documentos` · `/documentos/normas` · `/documentos/enviar` · `/documentos/historico` · `/documentos/[id]` · `/documentos/envios/[id]` | Documentos pessoais, normas e manuais, envio ao RH (ex.: atestado), histórico e acompanhamento do envio |
| Solicitações | `/solicitacoes` · `/solicitacoes/nova` · `/solicitacoes/[numero]` | Abrir com prazo (SLA), rascunhos, conversa, confirmar solução, reabrir |
| Cursos | `/cursos` · `/cursos/[slug]` · `/cursos/[slug]/aulas/[lessonId]` · `/cursos/[slug]/continuar` · `/cursos/trilhas` · `/cursos/trilhas/[slug]` · `/cursos/certificados` · `/cursos/certificados/[id]` | Catálogo, aulas, progresso, trilhas e certificados |
| Minha carreira | `/carreira` (Visão geral) · `/carreira/desenvolvimento` · `/carreira/cargos` · `/carreira/oportunidades` · `/carreira/oportunidades/[id]` · `/carreira/avaliacoes` · `/carreira/avaliacoes/[id]` | Trilha e plano de desenvolvimento, cargos e faixas publicadas, oportunidades internas, feedbacks e avaliações |
| Ajuda e suporte | `/ajuda` · `/ajuda/artigos` · `/ajuda/artigos/[slug]` · `/ajuda/categorias/[slug]` · `/ajuda/chat` | Base de conhecimento, voto "foi útil?", chat com o suporte (sobre a fila de solicitações) |
| Conta | `/perfil` · `/perfil/seguranca` · `/notificacoes` · `/busca` | Dados e preferências, senha e sessões ativas, notificações, busca global |
| Fale com o RH | `/fale-com-rh` | **Oculto** (`FEATURES.talkToHr = false`): responde 404; os links abrem `/solicitacoes/nova?categoria=rh` |

## Gestão (RH e Administração) — `src/app/(rh)/rh`

Atalho "Painel de gestão" no menu da conta. O menu (`src/components/layout/rh-nav.ts`) mostra só os itens permitidos, e cada página exige a sua permissão (`requireRhCtx`). Sem permissão, a página responde "não encontrada".

| Grupo | Tela | Rotas | Permissão |
| --- | --- | --- | --- |
| Operação | Painel | `/rh` | qualquer permissão de gestão |
| Operação | Solicitações | `/rh/solicitacoes` · `/rh/solicitacoes/[numero]` | `ticket:read:any` (ações: `ticket:manage`) |
| Conteúdo | Comunicados | `/rh/comunicados` · `/rh/comunicados/novo` · `/rh/comunicados/[id]` | `announcement:manage` |
| Conteúdo | Relatório de leitura | `/rh/comunicados/[id]/leitura` | `announcement:report` |
| Conteúdo | Agenda | `/rh/agenda` | `announcement:manage` |
| Conteúdo | Documentos | `/rh/documentos` · `/rh/documentos/distribuir` · `/rh/documentos/normas/nova` | `document:manage` |
| Conteúdo | Documento (detalhe) | `/rh/documentos/[id]` | `document:read:any` |
| Conteúdo | Análise de envio | `/rh/documentos/envios/[id]` | `submission:review` |
| Conteúdo | Cursos | `/rh/cursos` · `/rh/cursos/novo` · `/rh/cursos/[id]` | `course:manage` |
| Conteúdo | Central de ajuda | `/rh/ajuda` · `/rh/ajuda/artigos/novo` · `/rh/ajuda/artigos/[id]` | `help:manage` |
| Pessoas | Colaboradores | `/rh/colaboradores` · `/rh/colaboradores/[id]` | `employee:read:any` |
| Pessoas | Cadastro e importação | `/rh/colaboradores/novo` · `/rh/colaboradores/importar` | `employee:manage` |
| Pessoas | Estrutura | `/rh/estrutura` | `employee:manage` |
| Pessoas | Carreira | `/rh/carreira` · `/rh/carreira/oportunidades/nova` · `/rh/carreira/oportunidades/[id]` | `career:manage` |
| Pessoas | Feedbacks | `/rh/feedbacks` · `/rh/feedbacks/novo` · `/rh/feedbacks/[id]` | `feedback:write:any` |
| Administração | Configurações (prazos, áreas, expediente, feriados) | `/rh/configuracoes` | `sla:configure` |
| Administração | Auditoria | `/rh/auditoria` | `audit:read` |

Com os papéis padrão, o **RH** vê Operação, Conteúdo e Pessoas, e o **Administrador** vê Administração. Uma pessoa com os dois papéis vê tudo ([matriz de permissões](../seguranca/seguranca.md#rbac--matriz-de-permissões)).

## Estados comuns a todas as telas

- `loading.tsx`: esqueleto com `role="status"`.
- `error.tsx`: mensagem com "Tentar novamente" e código para o suporte (`requestId`).
- `not-found.tsx`: "Página não encontrada" (também para recursos alheios ou sem permissão). Como o `loading.tsx` inicia a resposta, o status HTTP dessas páginas é 200, e os testes verificam o título, não o status.
