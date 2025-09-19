import { FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-10 px-3 py-2 text-left font-normal"
          >
            <span className={cn(value ? "text-foreground" : "text-muted-foreground")}>
              {value || "e.g., summer-sale-google-ads"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Type or search campaigns..." 
              value={value}
              onValueChange={onChange}
            />
            <CommandList>
              <CommandEmpty>No campaigns found.</CommandEmpty>
              <CommandGroup>
                {campaigns.map((campaign) => (
                  <CommandItem
                    key={campaign.id}
                    value={campaign.value}
                    onSelect={(currentValue) => {
                      onChange(currentValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === campaign.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{campaign.label}</span>
                      <span className="text-muted-foreground text-xs">{campaign.value}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {settings && value && (
        <p className="text-sm text-muted-foreground">
          Will be sent as: {normalizeValue(value, settings)}
        </p>
      )}
      <FormMessage />
    </FormItem>
  );
}