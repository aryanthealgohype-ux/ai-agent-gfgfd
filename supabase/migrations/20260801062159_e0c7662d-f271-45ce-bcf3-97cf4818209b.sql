ALTER TABLE public.run_logs REPLICA IDENTITY FULL;
ALTER TABLE public.agent_runs REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.run_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_runs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;