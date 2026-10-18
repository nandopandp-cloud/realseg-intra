# ADR-0007 — Armazenamento privado de arquivos com validação de conteúdo

- **Status:** aceito — 2026-10-17

## Decisão
- Interface `StorageProvider` (`put`, `getStream`, `delete`). Driver atual: disco local **fora de `public/`** (`STORAGE_DIR`, padrão `.data/storage`). Driver S3-compatível fica como pendência (FEATURE_STATUS) usando a mesma interface.
- Nomes internos aleatórios (UUID) — o nome original é apenas metadado sanitizado.
- Validação em 3 camadas: extensão permitida, tamanho máximo (10 MB por padrão), **assinatura binária (magic bytes)** coerente com a extensão (PDF, JPEG, PNG). SVG/HTML/executáveis são recusados.
- `scan_status` em `file_assets`: `pending` → `clean`/`infected`/`skipped`. Hook `MalwareScanner`; sem antivírus configurado, o status é `skipped` e isso fica explícito no RUNBOOK (não simulamos verificação).
- Download apenas via endpoint autenticado que reavalia a autorização a cada requisição, com `Content-Disposition`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store` e CSP `sandbox` para visualização inline; cada acesso a documento sensível gera evento de auditoria.
