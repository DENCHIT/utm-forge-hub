// Supabase API client
import { supabase } from "@/integrations/supabase/client";
import { UTMSettings, UTMOption } from "@/types/utm";
import { TrainingWebinar, WebinarFormData, WebinarSignup, WebinarWithSignupCount } from "@/types/webinar";

interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
  message?: string;
}

class ApiClient {
  async getLinks() {
    try {
      const { data, error } = await supabase
        .from('utm_links')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching links:', error);
      return [];
    }
  }

  async insertLink(linkData: any) {
    // Remove user_id since we're using public access
    const { user_id, ...dataWithoutUserId } = linkData;
    
    const { data, error } = await supabase
      .from('utm_links')
      .insert(dataWithoutUserId)
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  }

  async deleteLink(id: string) {
    const { error } = await supabase
      .from('utm_links')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  }

  async getOptions(): Promise<UTMOption[]> {
    const { data, error } = await supabase
      .from('utm_options')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (error) throw error;
    return (data || []) as UTMOption[];
  }

  async getSettings(): Promise<UTMSettings | null> {
    const { data, error } = await supabase
      .from('utm_settings')
      .select('*')
      .maybeSingle();
    
    if (error) throw error;
    
    // If no settings exist, create default ones
    if (!data) {
      const defaultSettings = {
        normalize_values: true,
        lowercase_values: true,
        replace_spaces: true,
      };
      
      const { data: newData, error: insertError } = await supabase
        .from('utm_settings')
        .insert(defaultSettings)
        .select()
        .single();
      
      if (insertError) throw insertError;
      return newData;
    }
    
    return data;
  }

  async insertCampaign(campaignData: { value: string; label: string }) {
    return this.addOption({
      kind: 'campaign',
      label: campaignData.label,
      value: campaignData.value,
      display_order: 0,
      active: true,
    });
  }

  async updateSettings(id: string, field: string, value: boolean) {
    const { data, error } = await supabase
      .from('utm_settings')
      .update({ [field]: value })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  }

  async addOption(optionData: any) {
    const { data, error } = await supabase
      .from('utm_options')
      .insert(optionData)
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  }

  async deleteOption(id: string) {
    const { error } = await supabase
      .from('utm_options')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  }

  async updateOption(id: string, updateData: any) {
    const { data, error } = await supabase
      .from('utm_options')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  }

  // Training webinars

  /** Active webinars that have not finished yet, soonest first. */
  async getUpcomingWebinars(): Promise<TrainingWebinar[]> {
    const { data, error } = await supabase
      .from('training_webinars')
      .select('*')
      .eq('active', true)
      .order('starts_at', { ascending: true });

    if (error) throw error;
    const now = Date.now();
    return (data || []).filter(
      (w) => new Date(w.starts_at).getTime() + w.duration_minutes * 60_000 > now
    );
  }

  /** Every webinar, with a sign-up count, for the admin panel. */
  async getWebinars(): Promise<WebinarWithSignupCount[]> {
    const { data, error } = await supabase
      .from('training_webinars')
      .select('*, webinar_signups(count)')
      .order('starts_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => {
      const { webinar_signups, ...webinar } = row as TrainingWebinar & {
        webinar_signups: { count: number }[] | null;
      };
      return { ...webinar, signup_count: webinar_signups?.[0]?.count ?? 0 };
    });
  }

  async addWebinar(webinar: WebinarFormData) {
    const { data, error } = await supabase
      .from('training_webinars')
      .insert({
        title: webinar.title,
        description: webinar.description || null,
        meet_link: webinar.meet_link,
        starts_at: webinar.starts_at,
        duration_minutes: webinar.duration_minutes,
        active: webinar.active,
      })
      .select()
      .single();

    if (error) throw error;
    return { data };
  }

  async updateWebinar(id: string, updateData: Partial<WebinarFormData>) {
    const { description, ...rest } = updateData;
    const payload = description === undefined ? rest : { ...rest, description: description || null };
    const { data, error } = await supabase
      .from('training_webinars')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data };
  }

  async deleteWebinar(id: string) {
    const { error } = await supabase
      .from('training_webinars')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  async getWebinarSignups(webinarId: string): Promise<WebinarSignup[]> {
    const { data, error } = await supabase
      .from('webinar_signups')
      .select('*')
      .eq('webinar_id', webinarId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /** Registers an attendee. Signing up twice with the same email is treated as success. */
  async signUpForWebinar(webinarId: string, name: string, email: string) {
    const { data, error } = await supabase
      .from('webinar_signups')
      .upsert(
        { webinar_id: webinarId, name: name.trim(), email: email.trim().toLowerCase() },
        { onConflict: 'webinar_id,email' }
      )
      .select()
      .single();

    if (error) throw error;
    return { data };
  }
}

export const apiClient = new ApiClient();