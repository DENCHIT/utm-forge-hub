import { useState } from "react";
import { AuthWrapper } from "@/components/auth/AuthWrapper";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { UTMCreator } from "@/components/utm/UTMCreator";
import { SavedLinks } from "@/components/utm/SavedLinks";
import { AdminPanel } from "@/components/utm/AdminPanel";

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
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
        <Header activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="container mx-auto px-4 py-8 pb-20 md:pb-8">
          {renderContent()}
        </main>
        
        <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </AuthWrapper>
  );
};

export default Index;
