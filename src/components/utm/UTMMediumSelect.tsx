import { FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UTMOption, UTMSettings } from "@/types/utm";
import { normalizeValue } from "@/lib/utm-utils";

interface UTMMediumSelectProps {
  value: string;
  onChange: (value: string) => void;
  mediums: UTMOption[];
  settings: UTMSettings | null;
}

export function UTMMediumSelect({ value, onChange, mediums, settings }: UTMMediumSelectProps) {
  return (
    <FormItem>
      <FormLabel>Campaign Medium (utm_medium) *</FormLabel>
      <Select value={value} onValueChange={onChange}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Search or select medium..." />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {mediums.map((medium) => (
            <SelectItem key={medium.id} value={medium.value}>
              <div className="flex flex-col">
                <span>{medium.label}</span>
                <span className="text-xs text-muted-foreground">{medium.value}</span>
              </div>
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