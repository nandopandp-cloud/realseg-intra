# Migrações e seeds

Como o esquema do banco evolui e como os dados iniciais são criados. O esquema em si está descrito em [Modelo de dados](modelo-de-dados.md).

- **Fonte da verdade do esquema**: `src/server/db/schema/*.ts` (Drizzle ORM).
- **Migrações**: SQL versionado em [`drizzle/`](../../drizzle), com snapshots em `drizzle/meta/`. São geradas pelo `drizzle-kit` ([`drizzle.config.ts`](../../drizzle.config.ts)) e aplicadas por `scripts/migrate.ts`, que usa o migrador do Drizzle e é idempotente.
- **Onde rodam**: no build de Production da Vercel (conexão direta `DATABASE_URL_UNPOOLED`), em `pnpm db:migrate` no ambiente local e automaticamente nos bancos de teste. Ver [Infraestrutura › Build](../operacao/infraestrutura.md#build-na-vercel-scriptsvercel-buildmjs).

## Histórico

| # | Arquivo | Tipo | O que faz |
| --- | --- | --- | --- |
| 0000 | `0000_initial_schema.sql` | estrutura | Esquema inicial completo: identidade e acesso, organização, plataforma, comunicação, documentos, solicitações e SLA, aprendizagem, carreira, feedback e ajuda (63 tabelas e 27 enums no estado atual) |
| 0001 | `0001_search_extensions.sql` | estrutura | Extensão `unaccent` e função `f_unaccent` (IMMUTABLE) para busca sem acento |
| 0002 | `0002_course_covers_webp.sql` | dados | Capas de curso `.jpg` → `.webp` (imagens pré-otimizadas, [Otimização de custos §2](../operacao/otimizacao-de-custos.md#2-imagens-pré-otimizadas-sem-image-optimization)). O comentário do arquivo cita o caminho antigo `docs/COST_OPTIMIZATION.md` e não é alterado (migração aplicada) |
| 0003 | `0003_announcement_detail.sql` | estrutura + dados | Conteúdo estruturado do comunicado: `cover_image`, `effective_note`, `highlights`, `tags` (GIN), `support_ticket_category`. Preenche os comunicados de demonstração existentes (só em bancos de demonstração) |
| 0004 | `0004_ticket_channel.sql` | estrutura | Enum `ticket_channel` (`portal`, `chat`) e coluna `tickets.channel`, para o chat com o suporte |
| 0005 | `0005_help_demo_views.sql` | dados | Acessos de demonstração dos artigos de ajuda (ordem de "Mais acessados" da referência). Só age em bancos de demonstração |

As entregas do ambiente de gestão (v0.9–v0.15) não exigiram mudanças de esquema: as tabelas já haviam sido modeladas na migração inicial.

## Como criar uma migração

| Situação | Comando |
| --- | --- |
| Mudança de estrutura (tabela, coluna, índice, enum) | altere `src/server/db/schema` e rode `pnpm db:generate --name <descricao>` |
| Correção ou transformação de dados existentes | `pnpm db:generate --custom --name <descricao>` e escreva o SQL (exemplo: `0002_course_covers_webp.sql`) |
| Dados que só fazem sentido em demonstração | proteja o SQL com `IF NOT EXISTS (SELECT 1 FROM users WHERE email LIKE '%@demo.realseg.invalid') THEN RETURN` (exemplo: `0005`) |

Depois: revise o SQL gerado, rode `pnpm db:migrate` localmente, rode os testes de integração (que recriam o banco do zero) e commite o SQL **e** o snapshot em `drizzle/meta/`.

### Regras

- **Nunca edite** uma migração já aplicada (nem os comentários). Corrija com uma nova migração.
- **Nunca use** `drizzle-kit push` fora do banco local.
- **Expand/contract**: remoções e renomeações são feitas em dois deploys. Primeiro adiciona-se o novo e publica-se o código que usa os dois; depois remove-se o antigo.
- Não há "down" automático. A reversão de dados é feita por backup/PITR ([Runbook › Reversão segura](../operacao/runbook.md#reversão-segura)).

## Seeds (`scripts/seed`)

| Modo | Comando | O que cria | Onde pode rodar |
| --- | --- | --- | --- |
| `reference` | `pnpm db:seed` | Papéis e permissões (de `src/server/auth/permissions.ts`; acrescenta as ausentes sem sobrescrever ajustes da administração), categorias (comunicados, documentos, cursos, ajuda), artigos de ajuda do produto, áreas de solicitação, calendário, feriados nacionais e políticas de SLA iniciais | qualquer ambiente; idempotente |
| `demo` | `pnpm db:seed:demo` | Colaboradores, comunicados, documentos (PDFs gerados), solicitações, cursos, carreira e ajuda fictícios, com domínio `@demo.realseg.invalid` ([ADR-0010](../arquitetura/adr/0010-assets-e-dados-demo.md)) | **proibido** com `APP_ENV=production` (ou `NODE_ENV=production` sem `APP_ENV`). Se já houver colaboradores, só repara os arquivos |
| `reset-demo` | `pnpm db:reset:demo` | Apaga o schema, aplica as migrações e cria referência + demonstração | só local |
| `deploy` | build da Vercel | referência sempre; demonstração se `SEED_DEMO=true` e a base ainda não tiver colaboradores; restaura arquivos de demonstração ausentes no R2 (`repair-files.ts`) | Production da Vercel |
| `e2e` | servidor E2E | apaga o schema, migra, cria referência + demonstração + usuários de borda (bloqueado, inativo, recuperação) determinísticos | só E2E |

Os valores iniciais de SLA são uma proposta a validar com o RH ([Requisitos › RF-TKT](../produto/requisitos.md#rf-tkt--solicitações-e-sla)). Depois do primeiro deploy, prazos, expediente e feriados são mantidos pela tela **Gestão › Configurações**.
