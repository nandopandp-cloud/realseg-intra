# Intranet REALSEG

Intranet corporativa da REALSEG, com dois ambientes:

- **Colaborador**: Home, Comunicados, Documentos, Solicitações com SLA e chat com o suporte, Cursos, Minha carreira, Feedbacks, Ajuda, Notificações, Perfil e Busca.
- **Gestão (RH/Administração)** em `/rh`: painel, solicitações (fila e atendimento), comunicados e agenda, documentos (análise de envios, distribuição individual e em lote, normas), colaboradores e estrutura, cursos e trilhas, carreira, feedbacks, central de ajuda, configurações de prazo e calendário e auditoria. Cada tela exige a sua permissão. Atalho "Painel de gestão" no menu da conta.

Mobile-first, fiel às referências visuais em `referencias/`, acessível (WCAG 2.2 AA verificado por testes) e com autorização feita no servidor em toda leitura e escrita.

| | |
| --- | --- |
| **Homologação** | https://realseg-intra-seven.vercel.app (Vercel, região `gru1`, São Paulo) |
| **Banco** | Neon PostgreSQL (`aws-sa-east-1`, São Paulo) |
| **Arquivos** | Cloudflare R2 (bucket privado) |
| **Repositório** | `main` publica automaticamente na Vercel |
| **Versão** | 0.15.0 — ver [Changelog](CHANGELOG.md) |

## Documentação

Índice completo, com guia de leitura por objetivo: **[docs/README.md](docs/README.md)**.

| Área | Documento | O que você encontra |
| --- | --- | --- |
| **Produto** | [Visão do produto](docs/produto/visao-do-produto.md) | Objetivo, personas, escopo entregue, próximas fases, princípios |
| | [Requisitos](docs/produto/requisitos.md) | Requisitos funcionais e não funcionais, máquina de estados, SLA inicial |
| | [Mapa de telas](docs/produto/mapa-de-telas.md) | Todas as rotas do colaborador e da gestão, com a permissão de cada tela |
| | [Status das funcionalidades](docs/produto/status-das-funcionalidades.md) | Pronto, parcial e pendente, com os testes de cada módulo |
| | [Changelog](CHANGELOG.md) | Histórico de versões |
| **Arquitetura** | [Visão geral](docs/arquitetura/visao-geral.md) | Contexto, camadas, limites de confiança, organização do código, fluxos |
| | [Serviços de domínio](docs/arquitetura/servicos.md) | Catálogo dos serviços (colaborador e gestão): funções, permissões, tabelas |
| | [API REST](docs/arquitetura/api.md) | Convenções, erros e todas as rotas `/api/v1` e `/api/v1/rh` |
| | [Decisões (ADRs)](docs/arquitetura/adr/README.md) | As 11 decisões de arquitetura e como registrar novas |
| **Dados** | [Modelo de dados](docs/dados/modelo-de-dados.md) | ERD, dicionário das 63 tabelas, enums, retenção |
| | [Migrações e seeds](docs/dados/migracoes.md) | Histórico das migrações, como criar, regras e modos de seed |
| **Design** | [Design system](docs/design/design-system.md) | Marca, cores, tipografia, componentes, acessibilidade |
| | [Referências visuais](docs/design/referencias-visuais.md) | Mockup de cada tela (desktop e celular) e divergências intencionais |
| **Segurança** | [Segurança](docs/seguranca/seguranca.md) | Ameaças, matriz de permissões, sessões, auditoria, incidentes |
| | [Privacidade e LGPD](docs/seguranca/privacidade-lgpd.md) | Dados pessoais, bases legais, retenção, direitos dos titulares |
| **Operação** | [Infraestrutura e serviços externos](docs/operacao/infraestrutura.md) | GitHub, Vercel, Neon, R2, SMTP; ambientes; variáveis de ambiente |
| | [Runbook](docs/operacao/runbook.md) | Deploy, reversão, backups, operações comuns, troubleshooting |
| | [Otimização de custos](docs/operacao/otimizacao-de-custos.md) | Limites dos planos gratuitos e como respeitá-los |
| **Qualidade** | [Estratégia de testes](docs/qualidade/estrategia-de-testes.md) | Pirâmide, critérios de release, matriz E2E |

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript estrito · Tailwind CSS 4 · PostgreSQL · Drizzle ORM · Zod 4 · lucide-react · Vitest · Playwright + axe. Decisões em [ADRs](docs/arquitetura/adr/README.md), arquitetura em [Visão geral](docs/arquitetura/visao-geral.md).

## Rodar localmente

Pré-requisitos: Node.js ≥ 22.12 e pnpm 11 (`corepack enable`). **Não é preciso instalar banco nem Docker**: o projeto sobe um PostgreSQL 18 real embarcado (`embedded-postgres`) para desenvolvimento e testes.

```bash
pnpm install
cp .env.example .env.local        # ajuste IP_HASH_SECRET (openssl rand -hex 32)
pnpm dev:full                     # PostgreSQL local (porta 54320) + migrações + Next em http://localhost:3000
pnpm db:reset:demo                # em outro terminal, na 1ª vez: recria o banco local com dados de DEMONSTRAÇÃO
```

Alternativa em terminais separados: `pnpm db:dev` (banco), depois `pnpm db:migrate` e `pnpm dev`.

**Acesso de demonstração (local)**: matrícula `100231` (Carlos Silva) ou `carlos.silva@demo.realseg.invalid`, senha `Realseg@2026`. Outros: `100198` (Ana, outra unidade), `100402` (João, sem histórico, para ver os estados vazios), `100012` (Mariana, **RH**: acessa a gestão) e `100077` (Lucas, **Administrador**: configurações e auditoria). Todos os dados são fictícios (domínio reservado `@demo.realseg.invalid`).

**Na homologação** as mesmas contas existem, mas a senha é o segredo `DEMO_PASSWORD` configurado na Vercel. A senha local acima não vale lá.

## Deploy (Vercel + Neon)

Fluxo: commit no `main` → push → a Vercel publica.

- **Production**: o build (`scripts/vercel-build.mjs`) aplica as migrações no Neon, roda o seed idempotente e compila. **Preview**: só compila, sem tocar no banco (que é o de produção).
- Commits que alteram só documentação, testes ou referências não geram deploy (`ignoreCommand` em `vercel.json`).
- Cron diário às 06:00 de Brasília: manutenção em `/api/cron/daily`, protegida por `CRON_SECRET`.
- O plano Hobby da Vercel é só para uso não comercial; a produção da empresa exige o plano Pro.

Detalhes em [Infraestrutura](docs/operacao/infraestrutura.md) e [Runbook](docs/operacao/runbook.md). Antes de mudar navegação, imagens, jobs ou conexões com o banco, leia [Otimização de custos](docs/operacao/otimizacao-de-custos.md).

## Banco de dados e variáveis de ambiente

- Esquema em `src/server/db/schema` (Drizzle) e migrações versionadas em `drizzle/`. Mudança de estrutura: `pnpm db:generate --name <descricao>`. Nunca edite uma migração já aplicada. Procedimento completo em [Migrações e seeds](docs/dados/migracoes.md).
- Variáveis: modelo em [`.env.example`](.env.example) e tabela completa em [Infraestrutura › Variáveis de ambiente](docs/operacao/infraestrutura.md#variáveis-de-ambiente). A aplicação valida tudo na inicialização e **recusa** configurações inseguras em produção (`APP_ENV=production`).

## Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm dev` / `pnpm dev:full` | Servidor de desenvolvimento (sem/com o banco embarcado) |
| `pnpm build` / `pnpm start` | Build e execução de produção |
| `pnpm lint` / `pnpm typecheck` | ESLint e TypeScript (`next typegen` + `tsc`) |
| `pnpm test:unit` | Testes unitários (SLA, máquina de estados, validações, criptografia) |
| `pnpm test:integration` | Integração com PostgreSQL real (serviços, rotas HTTP, autorização, cron) |
| `pnpm test:e2e` | Playwright em desktop e mobile, com axe. Requer `pnpm build` antes |
| `pnpm check` | lint + tipos + unitários + integração + build |
| `pnpm db:dev` | Sobe o PostgreSQL local (porta 54320) |
| `pnpm db:generate` | Gera migração a partir do esquema |
| `pnpm db:migrate` | Aplica as migrações versionadas |
| `pnpm db:seed` | Somente dados de referência (qualquer ambiente) |
| `pnpm db:seed:demo` / `pnpm db:reset:demo` | Dados de demonstração (proibido em produção) |
| `pnpm jobs:run` | Executa manualmente a manutenção diária (a mesma do cron) |

Utilitários de desenvolvimento, em `scripts/dev/`:
- `screenshot.mjs <prefixo> <rotas…>`: capturas desktop e mobile;
- `crawl.mjs`: percorre todos os links e aponta erros e rolagem horizontal;
- `measure.mjs`: requisições e bytes de uma sessão típica, para conferir custos.

## Estrutura do repositório

```
src/app/            rotas: (auth) login e senha · (colaborador) telas · (rh) gestão em /rh · api/v1 REST (api/v1/rh = gestão) · api/cron
src/components/     UI reutilizável (ui/), layout (sidebar, topbar, navegação mobile) e componentes da gestão (admin/)
src/features/       componentes de cada módulo
src/lib/            utilitários e schemas Zod compartilhados entre cliente e servidor
src/server/         env, db (esquema), auth, http, services (regras + autorização; services/rh = gestão), sla, files, jobs
drizzle/            migrações versionadas
scripts/            migrate, seeds, build da Vercel, servidor E2E, utilitários de dev
tests/ · e2e/       Vitest (unitários/integração) · Playwright
docs/               documentação (índice em docs/README.md)
public/logo/        logo oficial (símbolo SVG + wordmark) · public/images/: imagens WebP
referencias/        mockups de referência (desktop e mobile), indexados em docs/design/referencias-visuais.md
CHANGELOG.md        histórico de versões
```
