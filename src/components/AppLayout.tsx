import { AppHeader } from "@/components/AppHeader";
import { TopNav } from "@/components/TopNav";
import { AppFooter } from "@/components/AppFooter";
import { AIAssistant } from "@/components/AIAssistant";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader userName="Ello Charles Frédéric" />
      <TopNav schoolName="GROUPE SCOLAIRE LA PROVIDENCE" />
      <main className="flex-1 px-4 md:px-6 lg:px-8 py-5 md:py-8 animate-fade-in">
        {children}
      </main>
      <AppFooter />
      <AIAssistant />
    </div>
  );
}
