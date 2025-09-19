import { FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UTMOption, UTMSettings } from "@/types/utm";
import { normalizeValue } from "@/lib/utm-utils";

interface UTMCampaignInputProps {
  value: string;
  onChange: (value: string) => void;
  campaigns: UTMOption[];
  settings: UTMSettings | null;
}

export function UTMCampaignInput({ value, onChange, campaigns, settings }: UTMCampaignInputProps) {
  return (
    <FormItem>
      <Select value={value} onValueChange={onChange}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="e.g., summer-sale-google-ads" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {campaigns.map((campaign) => (
            <SelectItem key={campaign.id} value={campaign.value}>
              {campaign.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {settings && value && (
        <p className="text-sm text-muted-foreground">
          Will be sent as: {normalizeValue(value, settings)}
        </p>
      )}
      <FormMessage />
    </FormItem>
  );
}