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
        <h3 className="text-lg font-semibold">Custom Parameters</h3>
        <Button type="button" variant="ghost" size="sm" onClick={addParam} className="text-primary">
          <Plus className="w-4 h-4 mr-1" />
          Add Custom Parameter
        </Button>
      </div>

      {customParams.length > 0 && (
        <div className="space-y-3">
          {customParams.map((param, index) => (
            <div key={index} className="grid grid-cols-5 gap-3 items-center">
              <div className="col-span-2">
                <Input
                  placeholder="Parameter key"
                  value={param.key}
                  onChange={(e) => updateParam(index, 'key', e.target.value)}
                />
              </div>
              <div className="flex items-center justify-center">
                <span className="text-muted-foreground">=</span>
              </div>
              <div className="col-span-2">
                <Input
                  placeholder="Parameter value"
                  value={param.value}
                  onChange={(e) => updateParam(index, 'value', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {customParams.length === 0 && (
        <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
          No custom parameters added yet.
        </div>
      )}
    </div>
  );
}