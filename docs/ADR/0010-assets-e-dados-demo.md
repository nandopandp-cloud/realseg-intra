# ADR-0010 — Assets visuais provisórios e dados de demonstração

- **Status:** aceito — 2026-10-17
- **Contexto:** o repositório não contém arquivos da marca (SVG/PNG) — apenas as imagens de referência em `referencias/`.

## Decisão
- A logo oficial foi **recortada sem alterações** das referências (`public/brand/logo-light.png`, `logo-dark.png`, `logo-icon.png`). Não houve redesenho. Pendência: obter o arquivo vetorial oficial.
- Fotografias decorativas (heroes, capas de cursos) foram recortadas das referências e salvas em `public/images/`. São provisórias e devem ser substituídas por imagens licenciadas em alta resolução.
- Dados de demonstração vivem **somente** em `scripts/seed/demo.ts`, rodam apenas com `pnpm db:seed:demo` e são recusados quando `NODE_ENV=production` ou `APP_ENV=production`. Todo usuário demo usa o domínio reservado `@demo.realseg.invalid` e a interface exibe a faixa "Ambiente de demonstração" quando `APP_ENV` ≠ `production`.
- Dados de E2E vivem em `scripts/seed/e2e.ts` e são determinísticos.
