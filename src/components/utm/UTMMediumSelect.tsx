import { useState } from "react";
import { FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { UTMOption, UTMOptionRow, UTMSettings } from "@/types/utm";
import { normalizeValue, slugify } from "@/lib/utm-utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UTMMediumSelectProps {
  value: string;
  onChange: (value: string) => void;
  mediums: UTMOption[];
  onAddMedium: (medium: UTMOption) => void;
  settings: UTMSettings | null;
}

export function UTMMediumSelect({ value, onChange, mediums, onAddMedium, settings }: UTMMediumSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { toast } = useToast();

  const filteredMediums = mediums.filter(medium =>
    medium.label.toLowerCase().includes(searchValue.toLowerCase()) ||
    medium.value.toLowerCase().includes(searchValue.toLowerCase())
  );

  const exactMatch = filteredMediums.find(medium => 
    medium.value === searchValue || medium.label.toLowerCase() === searchValue.toLowerCase()
  );

  const handleAddMedium = async () => {
    if (!searchValue.trim()) return;

    try {
      const newMedium = {
        kind: 'medium' as const,
        value: slugify(searchValue),
        label: searchValue,
        active: true,
        display_order: mediums.length + 1,
      };

      const { data, error } = await supabase
        .from('utm_options')
        .insert(newMedium)
        .select()
        .single();

      if (error) throw error;

      const typedData = data as UTMOptionRow;
      const utmOption: UTMOption = {
        ...typedData,
        kind: typedData.kind as 'source' | 'medium' | 'campaign',
      };
      
      onAddMedium(utmOption);
      onChange(utmOption.value);
      setSearchValue("");
      setOpen(false);

      toast({
        title: "Success!",
        description: `Added "${searchValue}" as a new medium option.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <FormItem>
      <FormLabel>Campaign Medium (utm_medium) *</FormLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {value
                ? mediums.find((medium) => medium.value === value)?.label
                : "Search or select medium..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput
              placeholder="Search or select medium..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>
                {searchValue && !exactMatch && (
                  <div className="p-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={handleAddMedium}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add "{searchValue}" as new medium
                    </Button>
                  </div>
                )}
              </CommandEmpty>
              <CommandGroup>
                {filteredMediums.map((medium) => (
                  <CommandItem
                    key={medium.id}
                    value={medium.value}
                    onSelect={(currentValue) => {
                      onChange(currentValue === value ? "" : currentValue);
                      setOpen(false);
                      setSearchValue("");
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === medium.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{medium.label}</span>
                        <span className="text-xs text-muted-foreground">{medium.value}</span>
                      </div>
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