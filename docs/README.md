# Documentação da Intranet REALSEG

Índice de toda a documentação do projeto. Cada pasta reúne um assunto. Comece pela **Visão do produto** se você é novo no projeto, ou vá direto à área que precisa.

```
docs/
├── produto/       o que é, para quem, o que faz e em que estado está
├── arquitetura/   como o sistema é construído: camadas, serviços, API e decisões (ADRs)
├── dados/         modelo de dados, migrações e seeds
├── design/        design system e referências visuais
├── seguranca/     segurança, permissões e LGPD
├── operacao/      infraestrutura, deploy, runbook e custos
└── qualidade/     estratégia e matriz de testes
```

## Produto

| Documento | Conteúdo |
| --- | --- |
| [Visão do produto](produto/visao-do-produto.md) | Objetivo, personas, escopo entregue, próximas fases e princípios |
| [Requisitos](produto/requisitos.md) | Requisitos funcionais e não funcionais com critérios de aceite, máquina de estados das solicitações e SLA inicial |
| [Mapa de telas](produto/mapa-de-telas.md) | Todas as rotas dos ambientes colaborador e gestão, com a permissão exigida por tela |
| [Status das funcionalidades](produto/status-das-funcionalidades.md) | O que está pronto, parcial ou pendente, com os testes que cobrem cada módulo |
| [Changelog](../CHANGELOG.md) | Histórico de versões (v0.1 a v0.15) |

## Arquitetura

| Documento | Conteúdo |
| --- | --- |
| [Visão geral](arquitetura/visao-geral.md) | Contexto, ambientes da aplicação, camadas e limites de confiança, organização do código, fluxos principais, observabilidade |
| [Serviços de domínio](arquitetura/servicos.md) | Contrato `Ctx`/`Actor`, catálogo dos serviços do colaborador e da gestão (funções, permissões, tabelas), módulos de suporte e roteiro para nova funcionalidade |
| [API REST `/api/v1`](arquitetura/api.md) | Convenções, códigos de erro e todas as rotas, inclusive as da gestão (`/api/v1/rh/*`) |
| [Decisões de arquitetura (ADRs)](arquitetura/adr/README.md) | Índice das 11 decisões: stack, banco, sessões, RBAC, API, cache, arquivos, e-mail, navegação, dados de demonstração, SLA |

## Dados

| Documento | Conteúdo |
| --- | --- |
| [Modelo de dados](dados/modelo-de-dados.md) | ERD por domínio, dicionário das 63 tabelas, enums, denormalizações, busca, exclusão e retenção |
| [Migrações e seeds](dados/migracoes.md) | Histórico das migrações, como criar uma nova, regras (*expand/contract*) e modos de seed |

## Design

| Documento | Conteúdo |
| --- | --- |
| [Design system](design/design-system.md) | Marca, cores com contraste medido, tipografia, espaçamento, componentes e acessibilidade |
| [Referências visuais](design/referencias-visuais.md) | Qual mockup de `referencias/` corresponde a cada tela (desktop e celular) e as divergências intencionais |

## Segurança e privacidade

| Documento | Conteúdo |
| --- | --- |
| [Segurança](seguranca/seguranca.md) | Modelo de ameaças, matriz de permissões por papel, sessões, senhas, eventos auditados, ambiente de gestão, segredos |
| [Privacidade e LGPD](seguranca/privacidade-lgpd.md) | Inventário de dados pessoais, minimização, retenção proposta, direitos dos titulares |

## Operação

| Documento | Conteúdo |
| --- | --- |
| [Infraestrutura e serviços externos](operacao/infraestrutura.md) | GitHub, Vercel, Neon, Cloudflare R2, SMTP; ambientes; build da Vercel; todas as variáveis de ambiente |
| [Runbook](operacao/runbook.md) | Deploy, migrações, reversão, backups, observabilidade, operações comuns, troubleshooting e incidentes |
| [Otimização de custos](operacao/otimizacao-de-custos.md) | Limites dos planos gratuitos e o que foi feito para caber neles. Leia antes de mudar navegação, imagens, jobs ou conexões |

## Qualidade

| Documento | Conteúdo |
| --- | --- |
| [Estratégia de testes](qualidade/estrategia-de-testes.md) | Pirâmide de testes, critérios de release, arquivos de teste e matriz E2E |

## Por onde começar

| Se você quer… | Leia |
| --- | --- |
| Entender o produto | [Visão do produto](produto/visao-do-produto.md) → [Mapa de telas](produto/mapa-de-telas.md) |
| Rodar o projeto | [README da raiz](../README.md#rodar-localmente) |
| Implementar uma funcionalidade | [Visão geral](arquitetura/visao-geral.md) → [Serviços](arquitetura/servicos.md#como-adicionar-uma-funcionalidade) → [Modelo de dados](dados/modelo-de-dados.md) |
| Integrar com a API | [API](arquitetura/api.md) |
| Alterar o banco | [Migrações e seeds](dados/migracoes.md) |
| Publicar ou operar | [Infraestrutura](operacao/infraestrutura.md) → [Runbook](operacao/runbook.md) |
| Avaliar segurança ou LGPD | [Segurança](seguranca/seguranca.md) → [Privacidade e LGPD](seguranca/privacidade-lgpd.md) |

## Como manter esta documentação

- Toda entrega atualiza o [Changelog](../CHANGELOG.md) e o [Status das funcionalidades](produto/status-das-funcionalidades.md).
- Rota nova ou alterada → [API](arquitetura/api.md). Serviço novo → [Serviços](arquitetura/servicos.md). Tela nova → [Mapa de telas](produto/mapa-de-telas.md).
- Mudança de esquema → [Modelo de dados](dados/modelo-de-dados.md) e [Migrações](dados/migracoes.md).
- Decisão de arquitetura → novo ADR em [`arquitetura/adr/`](arquitetura/adr/README.md).
- Nomes de arquivo em minúsculas e com hífens, em português. Links sempre relativos, para funcionarem no GitHub e no editor.
