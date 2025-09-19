import { useState } from "react";
import { AuthWrapper } from "@/components/auth/AuthWrapper";
import { UTMCreator } from "@/components/utm/UTMCreator";
import { SavedLinks } from "@/components/utm/SavedLinks";
import { AdminPanel } from "@/components/utm/AdminPanel";
import { Button } from "@/components/ui/button";
import { Link, History, Settings } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState('create');

  const renderContent = () => {
    switch (activeTab) {
      case 'create':
        return <UTMCreator />;
      case 'saved':
        return <SavedLinks />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <UTMCreator />;
    }
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-background">
        {/* Header Section */}
        <div className="border-b bg-background">
          <div className="container mx-auto px-6 py-8">
            <h1 className="text-4xl font-bold text-foreground mb-3">UTM Link Creator</h1>
            <p className="text-lg text-muted-foreground">
              Create, manage, and track your campaign URLs with powerful UTM parameter builder and comprehensive link management.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b bg-background">
          <div className="container mx-auto px-6">
            <div className="flex gap-1">
              <Button
                variant={activeTab === 'create' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('create')}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary h-12 px-4"
                data-state={activeTab === 'create' ? 'active' : 'inactive'}
              >
                <Link className="w-4 h-4 mr-2" />
                Create Link
              </Button>
              <Button
                variant={activeTab === 'saved' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('saved')}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary h-12 px-4"
                data-state={activeTab === 'saved' ? 'active' : 'inactive'}
              >
                <History className="w-4 h-4 mr-2" />
                Saved Links
              </Button>
              <Button
                variant={activeTab === 'admin' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('admin')}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary h-12 px-4"
                data-state={activeTab === 'admin' ? 'active' : 'inactive'}
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <main className="container mx-auto px-6 py-8">
          {renderContent()}
        </main>
      </div>
    </AuthWrapper>
  );
};

export default Index;
