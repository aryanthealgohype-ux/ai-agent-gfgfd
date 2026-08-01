CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.ai_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  row_count INTEGER NOT NULL DEFAULT 0,
  source_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS public.ai_dataset_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.ai_datasets(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  row_key TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  searchable_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES public.ai_datasets(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'document',
  source_uri TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  chunk_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rag_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES public.ai_datasets(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  row_id UUID REFERENCES public.ai_dataset_rows(id) ON DELETE SET NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  token_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_dataset_rows_dataset_idx ON public.ai_dataset_rows(dataset_id);
CREATE INDEX IF NOT EXISTS knowledge_sources_dataset_idx ON public.knowledge_sources(dataset_id);
CREATE INDEX IF NOT EXISTS rag_chunks_org_dataset_idx ON public.rag_chunks(org_id, dataset_id);
CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx ON public.rag_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS rag_chunks_content_fts_idx ON public.rag_chunks USING gin (to_tsvector('english', content));

ALTER TABLE public.ai_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_dataset_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view datasets" ON public.ai_datasets
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Managers create datasets" ON public.ai_datasets
  FOR INSERT TO authenticated WITH CHECK (public.can_manage(org_id));
CREATE POLICY "Managers update datasets" ON public.ai_datasets
  FOR UPDATE TO authenticated USING (public.can_manage(org_id)) WITH CHECK (public.can_manage(org_id));
CREATE POLICY "Managers delete datasets" ON public.ai_datasets
  FOR DELETE TO authenticated USING (public.can_manage(org_id));

CREATE POLICY "Members view dataset rows" ON public.ai_dataset_rows
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Managers manage dataset rows" ON public.ai_dataset_rows
  FOR ALL TO authenticated USING (public.can_manage(org_id)) WITH CHECK (public.can_manage(org_id));

CREATE POLICY "Members view knowledge sources" ON public.knowledge_sources
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Managers manage knowledge sources" ON public.knowledge_sources
  FOR ALL TO authenticated USING (public.can_manage(org_id)) WITH CHECK (public.can_manage(org_id));

CREATE POLICY "Members view rag chunks" ON public.rag_chunks
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Managers manage rag chunks" ON public.rag_chunks
  FOR ALL TO authenticated USING (public.can_manage(org_id)) WITH CHECK (public.can_manage(org_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_datasets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_dataset_rows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rag_chunks TO authenticated;
GRANT ALL ON public.ai_datasets TO service_role;
GRANT ALL ON public.ai_dataset_rows TO service_role;
GRANT ALL ON public.knowledge_sources TO service_role;
GRANT ALL ON public.rag_chunks TO service_role;

CREATE OR REPLACE FUNCTION public.match_rag_chunks(
  query_embedding VECTOR(768),
  match_count INTEGER DEFAULT 8,
  filter_org_id UUID DEFAULT NULL,
  filter_dataset_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  dataset_id UUID,
  source_id UUID,
  content TEXT,
  metadata JSONB,
  similarity DOUBLE PRECISION
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    rc.id,
    rc.dataset_id,
    rc.source_id,
    rc.content,
    rc.metadata,
    1 - (rc.embedding <=> query_embedding) AS similarity
  FROM public.rag_chunks rc
  WHERE rc.embedding IS NOT NULL
    AND (filter_org_id IS NULL OR rc.org_id = filter_org_id)
    AND (filter_dataset_id IS NULL OR rc.dataset_id = filter_dataset_id)
    AND (filter_org_id IS NULL OR public.is_org_member(rc.org_id) OR auth.role() = 'service_role')
  ORDER BY rc.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 50);
$$;

GRANT EXECUTE ON FUNCTION public.match_rag_chunks(VECTOR(768), INTEGER, UUID, UUID) TO authenticated, service_role;
