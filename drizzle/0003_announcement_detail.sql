ALTER TABLE "announcements" ADD COLUMN "cover_image" text;--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "effective_note" text;--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "highlights" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "support_ticket_category" text;--> statement-breakpoint
CREATE INDEX "announcements_tags_idx" ON "announcements" USING gin ("tags");--> statement-breakpoint
-- Dados: conteúdo estruturado dos comunicados de DEMONSTRAÇÃO já existentes (mesmo conteúdo de scripts/seed/announcement-content.ts).
-- Só age em bancos de demonstração (usuários @demo.realseg.invalid); em produção real não altera nada.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE email LIKE '%@demo.realseg.invalid') THEN
    RETURN;
  END IF;

  UPDATE announcements SET
    cover_image = '/images/comunicado-uniforme.webp',
    effective_note = 'A partir de 1º de novembro de 2026, entram em vigor as novas orientações sobre o uso do uniforme e dos equipamentos de identificação.',
    highlights = '[{"icon":"shirt","title":"Crachá visível durante toda a jornada","text":"O crachá deve permanecer visível em todos os ambientes de trabalho."},{"icon":"badge","title":"Camisa polo obrigatória em serviços externos","text":"A camisa polo REALSEG passa a ser obrigatória em todas as atividades externas."},{"icon":"boot","title":"Calçados de segurança nas áreas operacionais","text":"O uso de calçados de segurança passa a ser obrigatório nas áreas operacionais."}]'::jsonb,
    tags = ARRAY['Uniforme','Crachá','Segurança','Operações','Equipamentos'],
    support_ticket_category = 'servicos',
    body = E'## Por que essa mudança?\n\nA padronização do uniforme e dos equipamentos de identificação reforça a segurança da nossa equipe, melhora a identificação em campo, fortalece a nossa marca e garante o cumprimento das normas dos nossos clientes e parceiros.'
  WHERE title = 'Atualização no uso do uniforme';

  UPDATE announcements SET tags = ARRAY['Segurança'] WHERE title = 'Campanha de prevenção e segurança';
  UPDATE announcements SET tags = ARRAY['Segurança','Eventos'] WHERE title = 'SIPAT 2026';

  INSERT INTO announcements (category_id, title, summary, body, status, published_at, author_label, cover_image, tags)
  SELECT c.id, v.title, v.summary, v.summary, 'published', now() - v.age, v.author, v.cover, v.tags
  FROM (VALUES
    ('seguranca', 'Boas práticas de segurança no dia a dia', 'Atitudes simples que evitam acidentes e protegem você e sua equipe.', 'Segurança do Trabalho', '/images/thumb-boas-praticas.webp', ARRAY['Segurança','Equipamentos'], interval '36 days'),
    ('operacoes', 'Modelos de crachá e utilização correta', 'Conheça os modelos de crachá e como usá-los corretamente.', 'Operações', '/images/thumb-cracha.webp', ARRAY['Crachá','Uniforme'], interval '43 days')
  ) AS v(cat, title, summary, author, cover, tags, age)
  JOIN announcement_categories c ON c.slug = v.cat
  WHERE NOT EXISTS (SELECT 1 FROM announcements a WHERE a.title = v.title);

  INSERT INTO announcement_audiences (announcement_id, type)
  SELECT a.id, 'all' FROM announcements a
  WHERE a.title IN ('Boas práticas de segurança no dia a dia', 'Modelos de crachá e utilização correta')
    AND NOT EXISTS (SELECT 1 FROM announcement_audiences x WHERE x.announcement_id = a.id);

  -- Já lidos pelas pessoas de demonstração, para não alterar os contadores de "não lidos".
  INSERT INTO announcement_reads (announcement_id, user_id, version)
  SELECT a.id, u.id, a.version FROM announcements a CROSS JOIN users u
  WHERE a.title IN ('Boas práticas de segurança no dia a dia', 'Modelos de crachá e utilização correta')
    AND u.email LIKE '%@demo.realseg.invalid'
  ON CONFLICT DO NOTHING;
END $$;
