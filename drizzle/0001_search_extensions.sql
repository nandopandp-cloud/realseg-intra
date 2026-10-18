-- Busca sem acentos (ex.: "ferias" encontra "Férias").
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
-- Wrapper IMMUTABLE para permitir uso em índices/expressões estáveis.
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
