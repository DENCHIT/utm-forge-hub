// Supabase API client
import { supabase } from "@/integrations/supabase/client";
import { UTMSettings, UTMOption } from "@/types/utm";

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
    const { data, error } = await supabase
      .from('utm_links')
      .insert(linkData)
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
}

export const apiClient = new ApiClient();