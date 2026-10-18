# Design system

Derivado das referências em `referencias/` (16 telas desktop e mobile). Tokens centralizados em `src/app/globals.css` (`@theme` do Tailwind 4 → CSS variables).

## Marca
- Logo oficial = **símbolo + wordmark "REALSEG"** (sem tagline), via componente `BrandLogo` (`src/components/ui/brand-logo.tsx`). Símbolo: SVG oficial `public/logo/symbol.svg` recolorido nas cores oficiais — `symbol-on-dark.svg` (#1CC4A8, sobre fundos escuros) e `symbol-on-light.svg` (#009488, sobre fundos claros). Wordmark: PNGs oficiais `wordmark-white.png` / `wordmark-midnight.png` (2x). Ícones do app gerados do mesmo SVG (`src/app/icon.svg`, `src/app/apple-icon.png`). Pendência opcional: wordmark em SVG.
- Fotografias decorativas (heroes, capas) em `public/images` — provisórias (ADR-0010). Sempre `alt=""`/`aria-hidden` quando decorativas.

## Cores (com contraste medido sobre branco salvo indicação)
| Token | Valor | Uso | Contraste |
| --- | --- | --- | --- |
| `navy-950` | #08131a | Sidebar | texto `on-dark` 14.6:1 |
| `navy-900` | #0c2028 | Item ativo da sidebar | `brand-400` 7.7:1 |
| `ink` | #071528 | Títulos | 18.3:1 |
| `body` | #556275 | Texto corrido | 6.2:1 |
| `muted` | #5f6b7e | Texto secundário | 5.4:1 (≥ 4.8:1 nos fundos tonais) |
| `subtle` | #98a2b3 | Somente decorativo | — |
| `brand-700` | #006b67 | Botão primário (texto branco) | 6.4:1 |
| `brand-600` | #0b7f75 | Links | 4.9:1 |
| `brand-500` | #049e8b | Destaques grandes ("Carlos!"), ícones | 3.35:1 (texto ≥ 24 px) |
| Tons `*-50/100` + `*-700` | teal, blue, indigo, amber, red, orange, green, slate | Fundos de cards/ícones e badges | texto `*-700` sobre `*-100` ≥ 4.6:1 |
| `focus` | #0b7f75 | Anel de foco 3 px + offset 2 px | — |

Regra: badges de status usam o tom `-700` sobre `-100` **e sempre texto** (nunca só cor).

## Tipografia
- Sans: Plus Jakarta Sans (variável, auto-hospedada). Mono: IBM Plex Mono (rótulos "eyebrow" em caixa alta com espaçamento 0.22em).
- Escala: H1 de página 34→44 px (mobile→desktop), saudação 48→56 px, seção 18→20 px, corpo 15–16 px, auxiliar 13–14 px. Inputs com 16 px (evita zoom no iOS).

## Espaçamento, raios e sombras
`--radius-card` 14 px · `--radius-control` 10 px · `--shadow-card` (quase plano) · `--shadow-raised` (popovers, hover). Gutter 16 px no celular, 24 px tablet, 40 px desktop. Sidebar 284 px (80 px recolhida).

## Breakpoints
Padrão Tailwind: `sm` 640, `md` 768, `lg` 1024 (sidebar/topbar desktop a partir daqui), `xl` 1280 (colunas laterais), `2xl` 1536.

## Componentes (`src/components`)
| Componente | Arquivo | Notas de acessibilidade |
| --- | --- | --- |
| Button, ButtonLink, IconButton | `ui/button.tsx` | Altura mínima 44 px (md/lg); `IconButton` exige rótulo; `loading` → `aria-busy` |
| Field, Input, Textarea, Select, Switch | `ui/form.tsx` | Label associado, dica/erro via `aria-describedby`, `aria-invalid`, `aria-required`; Switch com `role="switch"` |
| SearchField, FilterSelect | `ui/filters.tsx` | Filtros na URL (persistem ao recarregar), busca funciona sem JS |
| Card, SectionHeader, IconTile, Badge, CategoryLabel, ProgressBar, ProgressRing, Avatar, Alert, EmptyState, Skeleton, Breadcrumbs, DemoBanner | `ui/primitives.tsx` | `ProgressBar` com `role="progressbar"`; `Alert` com `role="alert"/"status"` |
| Dialog, ConfirmDialog (modal e folha inferior) | `ui/dialog.tsx` | `<dialog>` nativo: foco preso, Esc fecha, fundo inerte |
| Toast | `ui/toast.tsx` | `aria-live` |
| LinkTabs, Pagination | `ui/navigation.tsx` | `aria-current="page"`, rótulos de página |
| FileUpload | `ui/file-upload.tsx` | Arrastar/soltar, botão "Tirar foto" no celular, validação imediata, lista removível |
| RowMenu (⋮) | `ui/row-menu.tsx` | Disclosure com Esc/clique fora |
| FileIcon, RichText, IconByKey | `ui/*` | RichText sem HTML bruto |
| Sidebar, Topbar, BottomNav, menus, PageHero | `layout/*` | Link "Pular para o conteúdo"; landmarks `header/nav/main/aside` |

## Estados
Todas as listas têm estado vazio orientando o próximo passo; carregamento com `loading.tsx` (skeleton + `role="status"`); erros com `error.tsx` (tentar novamente + código para suporte); 404 com `h1`.

## Responsividade
- **Celular**: cabeçalho com logo/busca/notificações/conta; barra inferior fixa (Início · Documentos · Comunicação · Solicitações · Mais — ADR-0009); tabelas viram listas de cards; formulários em coluna única; ações primárias em largura total.
- **Desktop**: sidebar escura recolhível, topbar com busca global, conteúdo com coluna lateral (`xl`).
- Verificado por E2E em 375–412 px e 1440 px sem rolagem horizontal.

## Movimento
Transições curtas; `prefers-reduced-motion` desativa animações globalmente.
