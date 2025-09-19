import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link2, LogOut, User } from "lucide-react";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const { toast } = useToast();

  const handleSignOut = () => {
    localStorage.removeItem('utm-authenticated');
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Link2 className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
              UTM Link Creator
            </h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-4">
            <Button
              variant={activeTab === 'create' ? 'default' : 'ghost'}
              onClick={() => onTabChange('create')}
            >
              Create Link
            </Button>
            <Button
              variant={activeTab === 'saved' ? 'default' : 'ghost'}
              onClick={() => onTabChange('saved')}
            >
              Saved Links
            </Button>
            <Button
              variant={activeTab === 'admin' ? 'default' : 'ghost'}
              onClick={() => onTabChange('admin')}
            >
              Admin
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}