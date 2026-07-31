import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { TopNav } from "@/components/TopNav";
import { AppFooter } from "@/components/AppFooter";
import { AIAssistant } from "@/components/AIAssistant";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

import OfflineIndicator from "@/components/OfflineIndicator";
import { ReportQueuePanel } from "@/components/reports/ReportQueuePanel";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    if (!user) { setDisplayName(""); return; }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setDisplayName((data as any)?.full_name || user.email || "Utilisateur");
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      
      <div className="sticky top-0 z-40 shadow-md">
        <AppHeader userName={displayName || user?.email || "Utilisateur"} />
        <TopNav schoolName="COMPLEXE SCOLAIRE LA PROVIDENCE DE DON ORIONE" />
      </div>
      <main className="flex-1 px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-8 animate-fade-in min-w-0">
        {children}
      </main>
      <AppFooter />
      <AIAssistant />
      <ScrollToTopButton />
      <OfflineIndicator />
      <ReportQueuePanel />
    </div>
  );
}
