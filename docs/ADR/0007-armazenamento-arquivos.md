# ADR-0007 — Armazenamento privado de arquivos com validação de conteúdo

- **Status:** aceito — 2026-10-17 · driver R2 em 2026-10-18

## Decisão
- Interface `StorageProvider` (`put`, `getStream`, `delete`). Dois drivers, escolhidos por `STORAGE_DRIVER`: `r2` (Cloudflare R2 pela API S3, bucket **privado**, assinatura SigV4 via `aws4fetch`; ativado automaticamente quando `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` e `R2_BUCKET_NAME` existem) e `local` (disco **fora de `public/`**, `STORAGE_DIR`, padrão `.data/storage`; usado nos testes). O bucket não tem URL pública: todo download passa pelo endpoint autenticado.
- Nomes internos aleatórios (UUID) — o nome original é apenas metadado sanitizado.
- Validação em 3 camadas: extensão permitida, tamanho máximo (10 MB por padrão), **assinatura binária (magic bytes)** coerente com a extensão (PDF, JPEG, PNG). SVG/HTML/executáveis são recusados.
- `scan_status` em `file_assets`: `pending` → `clean`/`infected`/`skipped`. Hook `MalwareScanner`; sem antivírus configurado, o status é `skipped` e isso fica explícito no RUNBOOK (não simulamos verificação).
- Download apenas via endpoint autenticado que reavalia a autorização a cada requisição, com `Content-Disposition`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store` e CSP `sandbox` para visualização inline; cada acesso a documento sensível gera evento de auditoria.
