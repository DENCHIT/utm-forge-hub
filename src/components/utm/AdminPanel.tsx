import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UTMOption, UTMOptionRow, UTMSettings } from "@/types/utm";
import { Settings, Database, Plus, Trash2, Edit, Save } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function AdminPanel() {
  const [settings, setSettings] = useState<UTMSettings | null>(null);
  const [sources, setSources] = useState<UTMOption[]>([]);
  const [mediums, setMediums] = useState<UTMOption[]>([]);
  const [campaigns, setCampaigns] = useState<UTMOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ label: "", value: "" });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, optionsRes] = await Promise.all([
        supabase.from('utm_settings').select('*').single(),
        supabase.from('utm_options').select('*').order('display_order'),
      ]);

      if (settingsRes.data) setSettings(settingsRes.data);
      if (optionsRes.data) {
        const options = optionsRes.data as UTMOptionRow[];
        setSources(options.filter(opt => opt.kind === 'source') as UTMOption[]);
        setMediums(options.filter(opt => opt.kind === 'medium') as UTMOption[]);
        setCampaigns(options.filter(opt => opt.kind === 'campaign') as UTMOption[]);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (key: keyof UTMSettings, value: boolean) => {
    if (!settings) return;

    try {
      const { error } = await supabase
        .from('utm_settings')
        .update({ [key]: value })
        .eq('id', settings.id);

      if (error) throw error;

      setSettings({ ...settings, [key]: value });
      toast({
        title: "Success!",
        description: "Settings updated successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const addOption = async (kind: 'source' | 'medium' | 'campaign') => {
    if (!newItem.label.trim()) return;

    try {
      const { data, error } = await supabase
        .from('utm_options')
        .insert({
          kind,
          label: newItem.label,
          value: newItem.value || newItem.label.toLowerCase().replace(/\s+/g, '-'),
          active: true,
          display_order: getNextDisplayOrder(kind),
        })
        .select()
        .single();

      if (error) throw error;

      const typedData = data as UTMOptionRow;
      const utmOption: UTMOption = {
        ...typedData,
        kind: typedData.kind as 'source' | 'medium' | 'campaign',
      };

      // Update state based on kind
      if (kind === 'source') setSources([...sources, utmOption]);
      else if (kind === 'medium') setMediums([...mediums, utmOption]);
      else setCampaigns([...campaigns, utmOption]);

      setNewItem({ label: "", value: "" });
      toast({
        title: "Success!",
        description: `${kind} option added successfully.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const deleteOption = async (id: string, kind: 'source' | 'medium' | 'campaign') => {
    try {
      const { error } = await supabase
        .from('utm_options')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update state based on kind
      if (kind === 'source') setSources(sources.filter(s => s.id !== id));
      else if (kind === 'medium') setMediums(mediums.filter(m => m.id !== id));
      else setCampaigns(campaigns.filter(c => c.id !== id));

      toast({
        title: "Success!",
        description: `${kind} option deleted successfully.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const toggleActive = async (id: string, active: boolean, kind: 'source' | 'medium' | 'campaign') => {
    try {
      const { error } = await supabase
        .from('utm_options')
        .update({ active })
        .eq('id', id);

      if (error) throw error;

      // Update state based on kind
      const updateFn = (items: UTMOption[]) =>
        items.map(item => item.id === id ? { ...item, active } : item);

      if (kind === 'source') setSources(updateFn(sources));
      else if (kind === 'medium') setMediums(updateFn(mediums));
      else setCampaigns(updateFn(campaigns));

      toast({
        title: "Success!",
        description: `${kind} option ${active ? 'activated' : 'deactivated'}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const getNextDisplayOrder = (kind: 'source' | 'medium' | 'campaign') => {
    const items = kind === 'source' ? sources : kind === 'medium' ? mediums : campaigns;
    return Math.max(0, ...items.map(item => item.display_order || 0)) + 1;
  };

  const renderOptionTable = (
    items: UTMOption[],
    kind: 'source' | 'medium' | 'campaign',
    title: string
  ) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Label"
            value={newItem.label}
            onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
            className="w-32"
          />
          <Input
            placeholder="Value (optional)"
            value={newItem.value}
            onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
            className="w-32"
          />
          <Button onClick={() => addOption(kind)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.label}</TableCell>
              <TableCell className="font-mono text-sm">{item.value}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={item.active}
                    onCheckedChange={(checked) => toggleActive(item.id, checked, kind)}
                  />
                  <Badge variant={item.active ? "default" : "secondary"}>
                    {item.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteOption(item.id, kind)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  if (loading) {
    return (
      <Card className="shadow-lg border-0 bg-gradient-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse">Loading admin panel...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 bg-gradient-card">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Settings className="w-6 h-6 text-primary" />
          Admin Panel
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="mediums">Mediums</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">UTM Link Generation Settings</h3>
              
              {settings && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="normalize-values">Normalize Values</Label>
                      <p className="text-sm text-muted-foreground">Apply all normalization rules below</p>
                    </div>
                    <Switch
                      id="normalize-values"
                      checked={settings.normalize_values}
                      onCheckedChange={(checked) => updateSettings('normalize_values', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="lowercase-values">Lowercase Values</Label>
                      <p className="text-sm text-muted-foreground">Convert all UTM values to lowercase</p>
                    </div>
                    <Switch
                      id="lowercase-values"
                      checked={settings.lowercase_values}
                      onCheckedChange={(checked) => updateSettings('lowercase_values', checked)}
                      disabled={!settings.normalize_values}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="replace-spaces">Replace Spaces with Dashes</Label>
                      <p className="text-sm text-muted-foreground">Replace spaces with dashes in UTM values</p>
                    </div>
                    <Switch
                      id="replace-spaces"
                      checked={settings.replace_spaces}
                      onCheckedChange={(checked) => updateSettings('replace_spaces', checked)}
                      disabled={!settings.normalize_values}
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sources" className="space-y-6">
            {renderOptionTable(sources, 'source', 'Campaign Sources')}
          </TabsContent>

          <TabsContent value="mediums" className="space-y-6">
            {renderOptionTable(mediums, 'medium', 'Campaign Mediums')}
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            {renderOptionTable(campaigns, 'campaign', 'Campaign Suggestions')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}