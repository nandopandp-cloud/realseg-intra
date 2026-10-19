-- Dados: acessos de DEMONSTRAÇÃO dos artigos de ajuda, para que "Artigos mais acessados" siga a ordem da referência
-- (referencias/Central de Ajuda REALSEG.png). Mesmos valores de scripts/seed/demo.ts.
-- Só age em bancos de demonstração (usuários @demo.realseg.invalid); em produção real não altera nada.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE email LIKE '%@demo.realseg.invalid') THEN
    RETURN;
  END IF;
  UPDATE help_articles SET view_count = v.views
  FROM (VALUES
    ('como-acessar-a-intranet-pela-primeira-vez', 640),
    ('politica-de-uso-do-uniforme', 610),
    ('esqueci-minha-senha', 580),
    ('solicitacao-de-ferias', 550),
    ('como-registrar-o-ponto', 520),
    ('manual-do-colaborador', 490)
  ) AS v(slug, views)
  WHERE help_articles.slug = v.slug;
END $$;
