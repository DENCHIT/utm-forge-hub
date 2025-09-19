// API client for PHP backend

const API_BASE_URL = '/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
  message?: string;
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getLinks() {
    return this.request<any[]>('/list_links.php');
  }

  async insertLink(linkData: any) {
    return this.request<ApiResponse<any>>('/insert_link.php', {
      method: 'POST',
      body: JSON.stringify(linkData),
    });
  }

  async deleteLink(id: string) {
    return this.request<ApiResponse<any>>(`/delete_link.php/${id}`, {
      method: 'DELETE',
    });
  }

  async getOptions() {
    return this.request<any[]>('/get_options.php');
  }

  async getSettings() {
    return this.request<any>('/get_settings.php');
  }

  async insertCampaign(campaignData: { value: string; label: string }) {
    return this.request<ApiResponse<any>>('/insert_campaign.php', {
      method: 'POST',
      body: JSON.stringify(campaignData),
    });
  }

  async updateSettings(id: string, field: string, value: boolean) {
    return this.request<ApiResponse<any>>('/update_settings.php', {
      method: 'POST',
      body: JSON.stringify({ id, field, value }),
    });
  }

  async addOption(optionData: any) {
    return this.request<ApiResponse<any>>('/add_option.php', {
      method: 'POST',
      body: JSON.stringify(optionData),
    });
  }

  async deleteOption(id: string) {
    return this.request<ApiResponse<any>>(`/delete_option.php/${id}`, {
      method: 'DELETE',
    });
  }

  async updateOption(id: string, updateData: any) {
    return this.request<ApiResponse<any>>('/update_option.php', {
      method: 'POST',
      body: JSON.stringify({ id, ...updateData }),
    });
  }
}

export const apiClient = new ApiClient();