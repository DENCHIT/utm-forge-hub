import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UTMLink, CustomParam } from "@/types/utm";
import { Copy, ExternalLink, Search, Download, Trash2, Edit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function SavedLinks() {
  const [links, setLinks] = useState<UTMLink[]>([]);
  const [filteredLinks, setFilteredLinks] = useState<UTMLink[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadLinks();
  }, []);

  useEffect(() => {
    // Filter links based on search term
    if (!searchTerm) {
      setFilteredLinks(links);
    } else {
      const filtered = links.filter(link =>
        link.link_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.destination_url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.utm_source.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.utm_medium.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.utm_campaign.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLinks(filtered);
    }
  }, [searchTerm, links]);

  const loadLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('utm_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Parse custom_params from JSON string
      const linksWithParsedParams = data.map(link => ({
        ...link,
        custom_params: typeof link.custom_params === 'string' 
          ? JSON.parse(link.custom_params) 
          : link.custom_params || []
      }));

      setLinks(linksWithParsedParams);
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

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied!",
      description: "UTM link copied to clipboard.",
    });
  };

  const openUrl = (url: string) => {
    window.open(url, '_blank');
  };

  const deleteLink = async (id: string) => {
    try {
      const { error } = await supabase
        .from('utm_links')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLinks(links.filter(link => link.id !== id));
      toast({
        title: "Success!",
        description: "UTM link deleted successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const exportToCsv = () => {
    const csvContent = [
      // Header
      ['Link Name', 'Destination URL', 'Final URL', 'Source', 'Medium', 'Campaign', 'Term', 'Content', 'Custom Params', 'Created At'].join(','),
      // Data rows
      ...filteredLinks.map(link => [
        `"${link.link_name}"`,
        `"${link.destination_url}"`,
        `"${link.final_url}"`,
        `"${link.utm_source}"`,
        `"${link.utm_medium}"`,
        `"${link.utm_campaign}"`,
        `"${link.utm_term || ''}"`,
        `"${link.utm_content || ''}"`,
        `"${link.custom_params.map((p: CustomParam) => `${p.key}=${p.value}`).join('; ')}"`,
        `"${new Date(link.created_at).toLocaleString()}"`
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'utm-links.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Success!",
      description: "UTM links exported to CSV.",
    });
  };

  if (loading) {
    return (
      <Card className="shadow-lg border-0 bg-gradient-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse">Loading saved links...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 bg-gradient-card">
      <CardHeader className="pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Search className="w-6 h-6 text-primary" />
            Saved UTM Links ({filteredLinks.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={exportToCsv} variant="outline" disabled={filteredLinks.length === 0}>
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search links by name, URL, source, medium, or campaign..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredLinks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No links match your search.' : 'No UTM links saved yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Link Name</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Medium</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{link.link_name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-xs">
                          {link.destination_url}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{link.utm_campaign}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{link.utm_source}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{link.utm_medium}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(link.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyUrl(link.final_url)}
                          title="Copy URL"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openUrl(link.final_url)}
                          title="Open URL"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteLink(link.id)}
                          title="Delete link"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}