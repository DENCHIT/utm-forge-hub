export interface UTMOption {
  id: string;
  kind: 'source' | 'medium' | 'campaign';
  value: string;
  label: string;
  active: boolean;
  display_order: number;
  requires_keyword?: boolean;
  requires_location_event?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomParam {
  key: string;
  value: string;
}

export interface UTMLink {
  id: string;
  link_name: string;
  destination_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term?: string;
  utm_content?: string;
  custom_params: CustomParam[];
  final_url: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UTMSettings {
  id: string;
  normalize_values: boolean;
  lowercase_values: boolean;
  replace_spaces: boolean;
  updated_at: string;
}

export interface UTMFormData {
  link_name: string;
  destination_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  custom_params: CustomParam[];
}

export interface EventTemplate {
  event_name: string;
  location: string;
  date: string;
}

// Database types (matching Supabase schema)
export interface UTMOptionRow {
  id: string;
  kind: string; // This comes as string from DB
  value: string;
  label: string;
  active: boolean;
  display_order: number;
  requires_keyword: boolean;
  requires_location_event: boolean;
  created_at: string;
  updated_at: string;
}