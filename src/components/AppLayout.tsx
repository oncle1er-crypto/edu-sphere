import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
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
  const { pathname } = useLocation();
  const [displayName, setDisplayName] = useState<string>("");
  const headerRef = useRef<HTMLDivElement>(null);

  // La hauteur du bloc d'en-tête varie (mobile / bureau) : on la publie dans
  // --app-header-h pour que les titres de module et les menus latéraux
  // se collent exactement en dessous.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const apply = () => {
      document.documentElement.style.setProperty("--app-header-h", `${el.offsetHeight}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  // Le bandeau de titre du module (quand il existe) est lui aussi collé :
  // on publie sa hauteur pour que le menu latéral se cale juste en dessous
  // au lieu de passer derrière.
  useEffect(() => {
    const root = document.documentElement;
    const el = document.querySelector<HTMLElement>(".module-sticky-head");
    if (!el) {
      root.style.setProperty("--module-head-h", "0px");
      return;
    }
    const apply = () => root.style.setProperty("--module-head-h", `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty("--module-head-h", "0px");
    };
  }, [pathname]);

  // Changement de page : on repart en haut du contenu, sinon la nouvelle
  // section peut sembler ne pas s'être chargée quand on était en bas de page.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

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
    <div className="min-h-screen flex flex-col bg-background [overflow-x:clip]">
      
      <div ref={headerRef} className="sticky top-0 z-40 shadow-md bg-background">
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
