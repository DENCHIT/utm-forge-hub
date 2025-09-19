import { FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UTMOption, UTMSettings } from "@/types/utm";
import { normalizeValue } from "@/lib/utm-utils";

interface UTMSourceSelectProps {
  value: string;
  onChange: (value: string) => void;
  sources: UTMOption[];
  settings: UTMSettings | null;
}

export function UTMSourceSelect({ value, onChange, sources, settings }: UTMSourceSelectProps) {
  return (
    <FormItem>
      <FormLabel>Campaign Source (utm_source) *</FormLabel>
      <Select value={value} onValueChange={onChange}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {sources.map((source) => (
            <SelectItem key={source.id} value={source.value}>
              {source.label}
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