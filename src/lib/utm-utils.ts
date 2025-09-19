import { UTMFormData, UTMSettings, CustomParam } from '@/types/utm';

export function normalizeValue(value: string, settings: UTMSettings): string {
  if (!settings.normalize_values) return value;
  
  let normalized = value;
  
  if (settings.lowercase_values) {
    normalized = normalized.toLowerCase();
  }
  
  if (settings.replace_spaces) {
    normalized = normalized.replace(/\s+/g, '-');
  }
  
  // Remove dangerous characters and clean up
  normalized = normalized
    .replace(/[^\w\s-._~:/?#[\]@!$&'()*+,;=]/g, '')
    .replace(/[-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return normalized;
}

export function buildUTMUrl(formData: UTMFormData, settings: UTMSettings): string {
  try {
    const url = new URL(formData.destination_url);
    
    // Normalize UTM parameters
    const utmParams = {
      utm_source: normalizeValue(formData.utm_source, settings),
      utm_medium: normalizeValue(formData.utm_medium, settings),
      utm_campaign: normalizeValue(formData.utm_campaign, settings),
      utm_term: formData.utm_term ? normalizeValue(formData.utm_term, settings) : '',
      utm_content: formData.utm_content ? normalizeValue(formData.utm_content, settings) : '',
    };
    
    // Add UTM parameters
    Object.entries(utmParams).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
    
    // Add custom parameters
    formData.custom_params.forEach((param: CustomParam) => {
      if (param.key && param.value) {
        url.searchParams.set(param.key, param.value);
      }
    });
    
    return url.toString();
  } catch (error) {
    throw new Error('Invalid URL format');
  }
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
}

export function formatEventTemplate(eventName: string, location: string, date: string): string {
  const year = new Date(date).getFullYear();
  return `${eventName.toLowerCase().replace(/\s+/g, '-')}-${location.toLowerCase().replace(/\s+/g, '-')}-${year}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}