import { AppHeader } from "@/components/AppHeader";
import { TopNav } from "@/components/TopNav";
import { AppFooter } from "@/components/AppFooter";
import { AIAssistant } from "@/components/AIAssistant";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="sticky top-0 z-40 shadow-md">
        <AppHeader userName="Ello Charles Frédéric" />
        <TopNav schoolName="COMPLEXE SCOLAIRE LA PROVIDENCE DE DON ORIONE" />
      </div>
      <main className="flex-1 px-4 md:px-6 lg:px-8 py-5 md:py-8 animate-fade-in">
        {children}
      </main>
      <AppFooter />
      <AIAssistant />
      <ScrollToTopButton />
    </div>
  );
}
