import { FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { UTMOption, UTMSettings } from "@/types/utm";
import { normalizeValue } from "@/lib/utm-utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface UTMCampaignInputProps {
  value: string;
  onChange: (value: string) => void;
  campaigns: UTMOption[];
  settings: UTMSettings | null;
}

export function UTMCampaignInput({ value, onChange, campaigns, settings }: UTMCampaignInputProps) {
  const [open, setOpen] = useState(false);

  return (
    <FormItem>
      <div className="space-y-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g., summer-sale-google-ads"
        />
        
        <Select value={value} onValueChange={(selectedValue) => {
          onChange(selectedValue);
        }}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Or select from saved campaigns" />
          </SelectTrigger>
          <SelectContent>
            {campaigns.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.value} className="text-xs">
                <div className="flex flex-col items-start">
                  <span className="font-medium">{campaign.label}</span>
                  <span className="text-muted-foreground text-xs">{campaign.value}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {settings && value && (
        <p className="text-sm text-muted-foreground">
          Will be sent as: {normalizeValue(value, settings)}
        </p>
      )}
      <FormMessage />
    </FormItem>
  );
}