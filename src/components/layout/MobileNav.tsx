import { Button } from "@/components/ui/button";
import { Plus, Search, Settings } from "lucide-react";

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
      <div className="grid grid-cols-3 gap-1 p-2">
        <Button
          variant={activeTab === 'create' ? 'default' : 'ghost'}
          onClick={() => onTabChange('create')}
          className="flex flex-col gap-1 h-auto py-2"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs">Create</span>
        </Button>
        <Button
          variant={activeTab === 'saved' ? 'default' : 'ghost'}
          onClick={() => onTabChange('saved')}
          className="flex flex-col gap-1 h-auto py-2"
        >
          <Search className="w-5 h-5" />
          <span className="text-xs">Saved</span>
        </Button>
        <Button
          variant={activeTab === 'admin' ? 'default' : 'ghost'}
          onClick={() => onTabChange('admin')}
          className="flex flex-col gap-1 h-auto py-2"
        >
          <Settings className="w-5 h-5" />
          <span className="text-xs">Admin</span>
        </Button>
      </div>
    </div>
  );
}