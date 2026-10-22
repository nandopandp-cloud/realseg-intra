# Registros de decisão de arquitetura (ADRs)

Cada ADR registra **uma** decisão: contexto, opções avaliadas, escolha e consequências. ADRs não são reescritos quando a realidade muda: acrescenta-se uma seção "Revisão AAAA-MM-DD" ou um novo ADR que substitui o anterior.

| ADR | Decisão | Status |
| --- | --- | --- |
| [0001](0001-stack-nextjs-fullstack.md) | Stack: Next.js 16 (App Router) full-stack em TypeScript, monolito modular | aceito |
| [0002](0002-postgresql-drizzle.md) | PostgreSQL + Drizzle ORM + migrações versionadas; PostgreSQL embarcado em dev e testes | aceito |
| [0003](0003-sessoes-opacas.md) | Sessões opacas no banco e senhas com scrypt | aceito |
| [0004](0004-rbac-escopo.md) | RBAC granular + verificação de escopo na camada de serviços | aceito · revisado em 2026-10-20 |
| [0005](0005-api-route-handlers.md) | API REST `/api/v1` com Route Handlers; páginas leem direto dos serviços | aceito |
| [0006](0006-sem-cache-components.md) | `cacheComponents` desabilitado (renderização por requisição) | aceito |
| [0007](0007-armazenamento-arquivos.md) | Armazenamento privado de arquivos (Cloudflare R2 ou disco) com validação de conteúdo | aceito · driver R2 em 2026-10-18 |
| [0008](0008-email.md) | E-mail desacoplado: outbox em dev/teste, SMTP em produção | aceito |
| [0009](0009-navegacao-mobile.md) | Navegação mobile consolidada (Início · Documentos · Solicitações · Mais) | aceito · revisado em 2026-10-18 |
| [0010](0010-assets-e-dados-demo.md) | Assets visuais provisórios e dados de demonstração isolados | aceito |
| [0011](0011-sla-minutos-uteis.md) | SLA em minutos úteis com calendário e política "congelada" na solicitação | aceito |

## Como registrar uma nova decisão

1. Copie a estrutura de um ADR existente para `NNNN-titulo-curto.md` (próximo número livre).
2. Preencha **Status** (`proposto`, `aceito`, `substituído por ADR-NNNN`), **Contexto**, **Opções avaliadas**, **Decisão** e **Consequências**.
3. Acrescente a linha na tabela acima e, se a decisão mudar o desenho do sistema, atualize a [Arquitetura](../visao-geral.md).
