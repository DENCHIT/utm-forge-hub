-- Update RLS policies to allow public access for UTM app

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_utm_preferences;
DROP POLICY IF EXISTS "Users can create their own preferences" ON public.user_utm_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_utm_preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences" ON public.user_utm_preferences;

DROP POLICY IF EXISTS "Users can view their own utm links" ON public.utm_links;
DROP POLICY IF EXISTS "Users can create their own utm links" ON public.utm_links;
DROP POLICY IF EXISTS "Users can update their own utm links" ON public.utm_links;
DROP POLICY IF EXISTS "Users can delete their own utm links" ON public.utm_links;

DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.utm_settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.utm_settings;

DROP POLICY IF EXISTS "Anyone can view active utm options" ON public.utm_options;
DROP POLICY IF EXISTS "Authenticated users can manage utm options" ON public.utm_options;

-- Create new public access policies

-- UTM Links - allow public access
CREATE POLICY "Public access to utm links" ON public.utm_links FOR ALL USING (true) WITH CHECK (true);

-- UTM Options - allow public access  
CREATE POLICY "Public access to utm options" ON public.utm_options FOR ALL USING (true) WITH CHECK (true);

-- UTM Settings - allow public access
CREATE POLICY "Public access to utm settings" ON public.utm_settings FOR ALL USING (true) WITH CHECK (true);

-- User preferences - allow public access
CREATE POLICY "Public access to user preferences" ON public.user_utm_preferences FOR ALL USING (true) WITH CHECK (true);