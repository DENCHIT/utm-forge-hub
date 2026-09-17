-- Gym app storage.
--
-- One row per person. The whole of their gym state (profile, programme,
-- sessions, chat, settings) lives in a single jsonb document, which mirrors how
-- the client already holds it and keeps sync to one read and one write.
-- Row level security means a signed-in user can only ever touch their own row.

CREATE TABLE IF NOT EXISTS public.gym_state (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gym_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own gym state" ON public.gym_state;
CREATE POLICY "Users can read their own gym state"
  ON public.gym_state FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own gym state" ON public.gym_state;
CREATE POLICY "Users can create their own gym state"
  ON public.gym_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own gym state" ON public.gym_state;
CREATE POLICY "Users can update their own gym state"
  ON public.gym_state FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own gym state" ON public.gym_state;
CREATE POLICY "Users can delete their own gym state"
  ON public.gym_state FOR DELETE
  USING (auth.uid() = user_id);

-- Keep updated_at honest even if a client forgets to send one.
CREATE OR REPLACE FUNCTION public.gym_state_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.updated_at IS NULL OR NEW.updated_at = OLD.updated_at THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gym_state_set_updated_at ON public.gym_state;
CREATE TRIGGER gym_state_set_updated_at
  BEFORE UPDATE ON public.gym_state
  FOR EACH ROW EXECUTE FUNCTION public.gym_state_touch_updated_at();
