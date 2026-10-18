-- Otimização de custos (docs/COST_OPTIMIZATION.md §2): imagens públicas passaram de JPEG para WebP
-- servidas sem o otimizador de imagens da Vercel. Atualiza as capas já gravadas. Idempotente.
UPDATE "courses"
SET "cover_image" = regexp_replace("cover_image", '\.jpg$', '.webp')
WHERE "cover_image" LIKE '/images/%.jpg';
