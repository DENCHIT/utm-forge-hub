import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { CustomParam } from "@/types/utm";

interface CustomParamsSectionProps {
  customParams: CustomParam[];
  onChange: (params: CustomParam[]) => void;
}

export function CustomParamsSection({ customParams, onChange }: CustomParamsSectionProps) {
  const addParam = () => {
    onChange([...customParams, { key: "", value: "" }]);
  };

  const removeParam = (index: number) => {
    onChange(customParams.filter((_, i) => i !== index));
  };

  const updateParam = (index: number, field: keyof CustomParam, value: string) => {
    const updated = customParams.map((param, i) =>
      i === index ? { ...param, [field]: value } : param
    );
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Custom Parameters</Label>
        <Button type="button" variant="outline" size="sm" onClick={addParam}>
          <Plus className="w-4 h-4 mr-1" />
          Add Parameter
        </Button>
      </div>

      {customParams.length > 0 && (
        <div className="space-y-3">
          {customParams.map((param, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-sm">Parameter Name</Label>
                <Input
                  placeholder="e.g., custom_id"
                  value={param.key}
                  onChange={(e) => updateParam(index, 'key', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label className="text-sm">Value</Label>
                <Input
                  placeholder="e.g., abc123"
                  value={param.value}
                  onChange={(e) => updateParam(index, 'value', e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeParam(index)}
                className="mb-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {customParams.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          No custom parameters added yet. Click "Add Parameter" to get started.
        </p>
      )}
    </div>
  );
}