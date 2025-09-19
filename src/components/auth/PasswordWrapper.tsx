import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PasswordWrapperProps {
  children: React.ReactNode;
}

const CORRECT_PASSWORD = "HHUTMHH";

export function PasswordWrapper({ children }: PasswordWrapperProps) {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already authenticated
    const storedAuth = localStorage.getItem('utm-authenticated');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('utm-authenticated', 'true');
      toast({
        title: "Access granted",
        description: "Welcome to UTM Link Creator!",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Access denied",
        description: "Incorrect password. Please try again.",
      });
      setPassword("");
    }
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('utm-authenticated');
    setPassword("");
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0 bg-gradient-card">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-primary mb-2">UTM Link Creator</h1>
              <p className="text-muted-foreground">Enter password to access the application</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-center"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full">
                Access Application
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {children}
      {/* Hidden sign out function for future use */}
      <div style={{ display: 'none' }}>
        <button onClick={handleSignOut}>Sign Out</button>
      </div>
    </>
  );
}