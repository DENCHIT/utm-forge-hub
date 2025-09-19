-- Create tables for UTM Link Creator

-- Table for campaign options (sources, mediums, campaign names)
CREATE TABLE public.utm_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('source', 'medium', 'campaign')),
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  requires_keyword BOOLEAN DEFAULT false,
  requires_location_event BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(kind, value)
);

-- Table for UTM links
CREATE TABLE public.utm_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_name TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  utm_source TEXT NOT NULL,
  utm_medium TEXT NOT NULL,
  utm_campaign TEXT NOT NULL,
  utm_term TEXT,
  utm_content TEXT,
  custom_params JSONB DEFAULT '[]',
  final_url TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for app settings
CREATE TABLE public.utm_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  normalize_values BOOLEAN NOT NULL DEFAULT true,
  lowercase_values BOOLEAN NOT NULL DEFAULT true,
  replace_spaces BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.utm_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for utm_options (public read, admin write)
CREATE POLICY "Anyone can view active utm options"
ON public.utm_options
FOR SELECT
USING (active = true);

CREATE POLICY "Authenticated users can manage utm options"
ON public.utm_options
FOR ALL
USING (auth.uid() IS NOT NULL);

-- RLS policies for utm_links (users can manage their own)
CREATE POLICY "Users can view their own utm links"
ON public.utm_links
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own utm links"
ON public.utm_links
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own utm links"
ON public.utm_links
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own utm links"
ON public.utm_links
FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for utm_settings (authenticated users can read/write)
CREATE POLICY "Authenticated users can view settings"
ON public.utm_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update settings"
ON public.utm_settings
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_utm_options_updated_at
  BEFORE UPDATE ON public.utm_options
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_utm_links_updated_at
  BEFORE UPDATE ON public.utm_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_utm_settings_updated_at
  BEFORE UPDATE ON public.utm_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.utm_settings (normalize_values, lowercase_values, replace_spaces)
VALUES (true, true, true);

-- Insert default sources
INSERT INTO public.utm_options (kind, value, label, active, display_order) VALUES
('source', 'organic-google', 'Organic Google', true, 1),
('source', 'organic-social', 'Organic Social', true, 2),
('source', 'paid-google', 'Paid Google', true, 3),
('source', 'paid-social', 'Paid Social', true, 4),
('source', 'events', 'Events', true, 5),
('source', 'chinese-social', 'Chinese Social', true, 6);

-- Insert default mediums
INSERT INTO public.utm_options (kind, value, label, active, display_order) VALUES
('medium', 'instagram', 'Instagram', true, 1),
('medium', 'facebook', 'Facebook', true, 2),
('medium', 'tiktok', 'TikTok', true, 3),
('medium', 'youtube', 'YouTube', true, 4),
('medium', 'linkedin', 'LinkedIn', true, 5),
('medium', 'x-twitter', 'X (Twitter)', true, 6),
('medium', 'snapchat', 'Snapchat', true, 7),
('medium', 'pinterest', 'Pinterest', true, 8),
('medium', 'reddit', 'Reddit', true, 9),
('medium', 'email', 'Email', true, 10),
('medium', 'sms', 'SMS', true, 11),
('medium', 'whatsapp', 'WhatsApp', true, 12),
('medium', 'messenger', 'Messenger', true, 13),
('medium', 'telegram', 'Telegram', true, 14),
('medium', 'cpc', 'CPC', true, 15),
('medium', 'ppc', 'PPC', true, 16),
('medium', 'paid-social', 'Paid Social', true, 17),
('medium', 'social', 'Social', true, 18),
('medium', 'display', 'Display', true, 19),
('medium', 'video', 'Video', true, 20),
('medium', 'referral', 'Referral', true, 21),
('medium', 'affiliate', 'Affiliate', true, 22),
('medium', 'influencer', 'Influencer', true, 23),
('medium', 'qr', 'QR Code', true, 24),
('medium', 'offline', 'Offline', true, 25),
('medium', 'events', 'Events', true, 26),
('medium', 'wechat', 'WeChat', true, 27),
('medium', 'bilibili', 'Bilibili', true, 28),
('medium', 'brand', 'Brand', true, 29),
('medium', 'guarantor', 'Guarantor', true, 30),
('medium', 'india', 'India', true, 31),
('medium', 'rent-guarantor', 'Rent Guarantor', true, 32);

-- Insert default campaign suggestions
INSERT INTO public.utm_options (kind, value, label, active, display_order) VALUES
('campaign', 'paid-ads', 'Paid Ads', true, 1),
('campaign', 'organic', 'Organic', true, 2),
('campaign', 'customer-service', 'Customer Service', true, 3),
('campaign', 'guarantor', 'Guarantor', true, 4),
('campaign', 'india', 'India', true, 5),
('campaign', 'rent-guarantor', 'Rent Guarantor', true, 6),
('campaign', 'housing-fair', 'Housing Fair', true, 7),
('campaign', 'pre-departure-meeting', 'Pre Departure Meeting', true, 8),
('campaign', 'red', 'Red', true, 9),
('campaign', 'wechat', 'WeChat', true, 10),
('campaign', 'bilibili', 'Bilibili', true, 11);