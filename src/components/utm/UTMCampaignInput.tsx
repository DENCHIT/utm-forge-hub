import { useState } from "react";
import { FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";
import { UTMOption, UTMSettings } from "@/types/utm";
import { normalizeValue } from "@/lib/utm-utils";

interface UTMCampaignInputProps {
  value: string;
  onChange: (value: string) => void;
  campaigns: UTMOption[];
  settings: UTMSettings | null;
}

export function UTMCampaignInput({ value, onChange, campaigns, settings }: UTMCampaignInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.label.toLowerCase().includes(inputValue.toLowerCase()) ||
    campaign.value.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setInputValue(suggestion);
    onChange(suggestion);
    setOpen(false);
  };

  return (
    <FormItem>
      <FormControl>
        <div className="relative">
          <Input
            placeholder="e.g., summer-sale-google-ads"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setOpen(true)}
          />
          {campaigns.length > 0 && (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <ChevronsUpDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-full p-0">
                <Command>
                  <CommandInput
                    placeholder="Search suggestions..."
                    value={inputValue}
                    onValueChange={setInputValue}
                  />
                  <CommandList>
                    <CommandEmpty>No suggestions found.</CommandEmpty>
                    <CommandGroup heading="Campaign Suggestions">
                      {filteredCampaigns.map((campaign) => (
                        <CommandItem
                          key={campaign.id}
                          value={campaign.value}
                          onSelect={() => handleSuggestionSelect(campaign.value)}
                        >
                          {campaign.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </FormControl>
      {settings && value && (
        <p className="text-sm text-muted-foreground">
          Will be sent as: {normalizeValue(value, settings)}
        </p>
      )}
      <FormMessage />
    </FormItem>
  );
}