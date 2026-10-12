-- Training webinars: admins add a Google Meet session, users see a banner and
-- pop-up, sign up, and add it to their calendar.

CREATE TABLE public.training_webinars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  meet_link TEXT NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.webinar_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id UUID NOT NULL REFERENCES public.training_webinars(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (webinar_id, email)
);

CREATE INDEX training_webinars_starts_at_idx ON public.training_webinars (starts_at);
CREATE INDEX webinar_signups_webinar_id_idx ON public.webinar_signups (webinar_id);

-- Row Level Security: the app uses a shared password and the anon key, so
-- these match the public access policies on the other UTM tables.
ALTER TABLE public.training_webinars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinar_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access to training webinars"
ON public.training_webinars FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to webinar signups"
ON public.webinar_signups FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_training_webinars_updated_at
  BEFORE UPDATE ON public.training_webinars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
