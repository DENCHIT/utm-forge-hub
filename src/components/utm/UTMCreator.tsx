import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UTMFormData, UTMSettings, UTMOption, UTMOptionRow, CustomParam } from "@/types/utm";

interface UserUTMPreferences {
  id: string;
  user_id: string;
  keyword: string | null;
  location: string | null;
  event_name: string | null;
}
import { buildUTMUrl, validateUrl, normalizeValue } from "@/lib/utm-utils";
import { Copy, Link, Plus, Trash2 } from "lucide-react";
import { UTMSourceSelect } from "./UTMSourceSelect";
import { UTMMediumSelect } from "./UTMMediumSelect";
import { UTMCampaignInput } from "./UTMCampaignInput";
import { CustomParamsSection } from "./CustomParamsSection";

const formSchema = z.object({
  link_name: z.string().min(1, "Link name is required"),
  destination_url: z.string().url("Please enter a valid URL"),
  utm_source: z.string().min(1, "Source is required"),
  utm_medium: z.string().min(1, "Medium is required"),
  utm_campaign: z.string().min(1, "Campaign is required"),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
  keyword: z.string().optional(),
  location: z.string().optional(),
  event_name: z.string().optional(),
  custom_params: z.array(z.object({
    key: z.string(),
    value: z.string(),
  })),
});

export function UTMCreator() {
  const [settings, setSettings] = useState<UTMSettings | null>(null);
  const [sources, setSources] = useState<UTMOption[]>([]);
  const [mediums, setMediums] = useState<UTMOption[]>([]);
  const [campaigns, setCampaigns] = useState<UTMOption[]>([]);
  const [finalUrl, setFinalUrl] = useState("");
  const [userPreferences, setUserPreferences] = useState<UserUTMPreferences | null>(null);
  const { toast } = useToast();

  const form = useForm<UTMFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      link_name: "",
      destination_url: "",
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_term: "",
      utm_content: "",
      keyword: "",
      location: "",
      event_name: "",
      custom_params: [],
    },
  });

  const watchedValues = form.watch();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Update final URL whenever form values change
    if (settings && watchedValues.destination_url && validateUrl(watchedValues.destination_url)) {
      try {
        const url = buildUTMUrl(watchedValues, settings);
        setFinalUrl(url);
      } catch (error) {
        setFinalUrl("");
      }
    } else {
      setFinalUrl("");
    }
  }, [watchedValues, settings]);

  const loadInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const [settingsRes, optionsRes, preferencesRes] = await Promise.all([
        supabase.from('utm_settings').select('*').single(),
        supabase.from('utm_options').select('*').eq('active', true).order('display_order'),
        user ? supabase.from('user_utm_preferences').select('*').eq('user_id', user.id).single() : Promise.resolve({ data: null, error: null }),
      ]);

      if (settingsRes.data) setSettings(settingsRes.data);
      if (optionsRes.data) {
        const options = optionsRes.data as UTMOptionRow[];
        setSources(options.filter(opt => opt.kind === 'source') as UTMOption[]);
        setMediums(options.filter(opt => opt.kind === 'medium') as UTMOption[]);
        setCampaigns(options.filter(opt => opt.kind === 'campaign') as UTMOption[]);
      }
      
      if (preferencesRes.data) {
        setUserPreferences(preferencesRes.data);
        // Pre-populate form with saved preferences
        form.setValue('keyword', preferencesRes.data.keyword || '');
        form.setValue('location', preferencesRes.data.location || '');
        form.setValue('event_name', preferencesRes.data.event_name || '');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const onSubmit = async (data: UTMFormData) => {
    if (!settings) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const final_url = buildUTMUrl(data, settings);
      
      // Check if campaign name is new and should be saved
      const campaignExists = campaigns.some(c => c.value === data.utm_campaign);
      if (!campaignExists && data.utm_campaign.trim()) {
        // Save new campaign to utm_options
        await supabase.from('utm_options').insert({
          kind: 'campaign',
          value: data.utm_campaign,
          label: data.utm_campaign,
          active: true,
          display_order: campaigns.length,
        });
      }

      // Save or update user preferences if they entered keyword, location, or event data
      if (data.keyword || data.location || data.event_name) {
        const preferencesData = {
          user_id: user.id,
          keyword: data.keyword || null,
          location: data.location || null,
          event_name: data.event_name || null,
        };

        if (userPreferences) {
          // Update existing preferences
          await supabase.from('user_utm_preferences')
            .update(preferencesData)
            .eq('id', userPreferences.id);
        } else {
          // Create new preferences
          await supabase.from('user_utm_preferences').insert(preferencesData);
        }
      }
      
      const { error } = await supabase.from('utm_links').insert({
        link_name: data.link_name,
        destination_url: data.destination_url,
        utm_source: normalizeValue(data.utm_source, settings),
        utm_medium: normalizeValue(data.utm_medium, settings),
        utm_campaign: normalizeValue(data.utm_campaign, settings),
        utm_term: data.utm_term ? normalizeValue(data.utm_term, settings) : null,
        utm_content: data.utm_content ? normalizeValue(data.utm_content, settings) : null,
        custom_params: JSON.stringify(data.custom_params),
        final_url,
        user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "UTM link saved successfully.",
      });

      // Reload data to refresh campaigns list
      await loadInitialData();
      
      // Reset form
      form.reset();
      setFinalUrl("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const copyUrl = () => {
    if (finalUrl) {
      navigator.clipboard.writeText(finalUrl);
      toast({
        title: "Copied!",
        description: "UTM link copied to clipboard.",
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Create UTM Link</h2>
        <p className="text-muted-foreground">
          Build trackable campaign URLs with proper UTM parameters for marketing attribution.
        </p>
      </div>

      {/* Form */}
      <div className="bg-card rounded-lg border p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* First Row - Link Name and Campaign Source */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="link_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Summer Campaign - Google Ads" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <UTMSourceSelect
                value={form.watch('utm_source')}
                onChange={(value) => form.setValue('utm_source', value)}
                sources={sources}
                settings={settings}
              />
            </div>

            {/* Second Row - Destination URL and Campaign Medium */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="destination_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination URL *</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/landing-page" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <UTMMediumSelect
                value={form.watch('utm_medium')}
                onChange={(value) => form.setValue('utm_medium', value)}
                mediums={mediums}
                settings={settings}
              />
            </div>

            {/* Campaign Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Campaign Details</h3>
              
              <div className="space-y-2">
                <FormLabel>Campaign Name (utm_campaign) *</FormLabel>
                <FormField
                  control={form.control}
                  name="utm_campaign"
                  render={({ field }) => (
                    <UTMCampaignInput
                      value={field.value}
                      onChange={field.onChange}
                      campaigns={campaigns}
                      settings={settings}
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="utm_term"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Term (utm_term)</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional keyword targeting" {...field} />
                      </FormControl>
                      {settings && form.watch('utm_term') && (
                        <p className="text-sm text-muted-foreground">
                          Will be sent as: {normalizeValue(form.watch('utm_term'), settings)}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="utm_content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Content (utm_content)</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional content identifier" {...field} />
                      </FormControl>
                      {settings && form.watch('utm_content') && (
                        <p className="text-sm text-muted-foreground">
                          Will be sent as: {normalizeValue(form.watch('utm_content'), settings)}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Conditional fields based on campaign requirements */}
              {(() => {
                const selectedCampaign = campaigns.find(c => c.value === form.watch('utm_campaign'));
                const requiresKeyword = selectedCampaign?.requires_keyword;
                const requiresLocationEvent = selectedCampaign?.requires_location_event;

                if (!requiresKeyword && !requiresLocationEvent) return null;

                return (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-dashed">
                    <h4 className="text-sm font-semibold text-foreground">Required Campaign Details</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {requiresKeyword && (
                        <FormField
                          control={form.control}
                          name="keyword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Keyword *</FormLabel>
                              <FormControl>
                                <Input placeholder="Target keyword" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {requiresLocationEvent && (
                        <FormField
                          control={form.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location *</FormLabel>
                              <FormControl>
                                <Input placeholder="Event location" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Custom Parameters */}
            <CustomParamsSection
              customParams={form.watch('custom_params')}
              onChange={(params) => form.setValue('custom_params', params)}
            />

            {/* Generated URL Preview */}
            {finalUrl && (
              <div className="p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Generated UTM Link</h3>
                  <Button type="button" variant="outline" size="sm" onClick={copyUrl}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={finalUrl}
                  readOnly
                  className="resize-none bg-background"
                  rows={3}
                />
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button type="submit" disabled={!finalUrl} className="px-8">
                Create Link
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}