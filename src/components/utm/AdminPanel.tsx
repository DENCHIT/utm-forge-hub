import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
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
  const [editingData, setEditingData] = useState<Record<string, any>>({});
  const [newItem, setNewItem] = useState({ label: "", value: "" });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsData, optionsData] = await Promise.all([
        apiClient.getSettings(),
        apiClient.getOptions(),
      ]);

      if (settingsData) setSettings(settingsData);
      if (optionsData) {
        const options = optionsData as UTMOptionRow[];
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
      await apiClient.updateSettings(settings.id, key, value);

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
      const response = await apiClient.addOption({
        kind,
        label: newItem.label,
        value: newItem.value || newItem.label.toLowerCase().replace(/\s+/g, '-'),
        display_order: getNextDisplayOrder(kind),
      });

      const utmOption: UTMOption = {
        ...response.data,
        kind: response.data.kind as 'source' | 'medium' | 'campaign',
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
      await apiClient.deleteOption(id);

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
      await apiClient.updateOption(id, { active });

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

  const updateItemField = (id: string, field: string, value: any, kind: 'source' | 'medium' | 'campaign') => {
    const updateFn = (items: UTMOption[]) =>
      items.map(item => item.id === id ? { ...item, [field]: value } : item);

    if (kind === 'source') setSources(updateFn(sources));
    else if (kind === 'medium') setMediums(updateFn(mediums));
    else setCampaigns(updateFn(campaigns));
  };

  const saveItem = async (id: string, kind: 'source' | 'medium' | 'campaign') => {
    try {
      const item = [...sources, ...mediums, ...campaigns].find(i => i.id === id);
      if (!item) return;

      await apiClient.updateOption(id, {
        label: item.label,
        value: item.value,
        active: item.active,
        requires_keyword: item.requires_keyword || false,
        requires_location_event: item.requires_location_event || false,
      });

      setEditingItem(null);
      toast({
        title: "Success!",
        description: `${kind} option updated successfully.`,
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
            Add New
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>LABEL</TableHead>
            <TableHead>VALUE</TableHead>
            {kind === 'campaign' && (
              <>
                <TableHead>REQUIRES KEYWORD</TableHead>
                <TableHead>REQUIRES LOCATION</TableHead>
              </>
            )}
            <TableHead>ACTIVE</TableHead>
            <TableHead className="text-right">ACTIONS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              {editingItem === item.id ? (
                <>
                  <TableCell>
                    <Input
                      value={item.label}
                      onChange={(e) => updateItemField(item.id, 'label', e.target.value, kind)}
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.value}
                      onChange={(e) => updateItemField(item.id, 'value', e.target.value, kind)}
                      className="w-full font-mono text-sm"
                    />
                  </TableCell>
                  {kind === 'campaign' && (
                    <>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={item.requires_keyword || false}
                          onChange={(e) => updateItemField(item.id, 'requires_keyword', e.target.checked, kind)}
                          className="w-4 h-4"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={item.requires_location_event || false}
                          onChange={(e) => updateItemField(item.id, 'requires_location_event', e.target.checked, kind)}
                          className="w-4 h-4"
                        />
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <Switch
                      checked={item.active}
                      onCheckedChange={(checked) => updateItemField(item.id, 'active', checked, kind)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => saveItem(item.id, kind)}
                        className="w-8 h-8 p-0 text-white bg-success hover:bg-success/80"
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingItem(null)}
                        className="w-8 h-8 p-0 text-white bg-destructive hover:bg-destructive/80"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="font-medium">{item.label}</TableCell>
                  <TableCell className="font-mono text-sm">{item.value}</TableCell>
                  {kind === 'campaign' && (
                    <>
                      <TableCell>
                        <Badge variant={item.requires_keyword ? "default" : "secondary"}>
                          {item.requires_keyword ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.requires_location_event ? "default" : "secondary"}>
                          {item.requires_location_event ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <Switch
                      checked={item.active}
                      onCheckedChange={(checked) => toggleActive(item.id, checked, kind)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingItem(item.id)}
                        className="w-8 h-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteOption(item.id, kind)}
                        className="w-8 h-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              )}
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
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">Settings</h2>
                <p className="text-muted-foreground">Configure global application settings and URL generation rules.</p>
              </div>

              {/* URL Generation Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">URL Generation Settings</h3>
                </div>
                
                {settings && (
                  <div className="space-y-6">
                    <div className="flex items-start gap-3">
                      <Switch
                        id="normalize-values"
                        checked={settings.normalize_values}
                        onCheckedChange={(checked) => updateSettings('normalize_values', checked)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="normalize-values" className="text-sm font-medium">
                          Normalize parameter values
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Automatically convert values to lowercase and URL-safe format
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Switch
                        id="replace-spaces"
                        checked={settings.replace_spaces}
                        onCheckedChange={(checked) => updateSettings('replace_spaces', checked)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="replace-spaces" className="text-sm font-medium">
                          Replace spaces with dashes
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Convert spaces to dashes (-) in parameter values for better URL formatting
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Data Management */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Data Management</h3>
                </div>

                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-warning rounded-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Database className="w-3 h-3 text-warning-foreground" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-warning-foreground mb-1">Data Storage</h4>
                      <p className="text-sm text-warning-foreground/80 mb-3">
                        All data is stored securely in the cloud. To backup your data:
                      </p>
                      <ul className="text-sm text-warning-foreground/80 space-y-1 ml-4">
                        <li className="list-disc">Export your links as CSV from the Saved Links tab</li>
                        <li className="list-disc">Note your admin configurations for manual restoration</li>
                        <li className="list-disc">Consider saving important links externally</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
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