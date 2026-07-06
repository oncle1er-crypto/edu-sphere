import {
  GraduationCap,
  ChevronDown,
  User,
  LogOut,
  Settings,
  Menu,
  ArrowLeft,
  Calendar,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { Select, SelectTrigger, SelectValue, SelectContent } from "@/components/ui/select";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InstallPWAMenuItem } from "@/components/pwa/InstallPWAMenuItem";

const statutLabels: Record<string, string> = {
  active: "Active",
  preparation: "Préparation",
  verrouillee: "Verrouillée",
  archivee: "Archivée",
};

const statutBadgeClass: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  preparation: "bg-blue-50 text-blue-700 border-blue-200",
  verrouillee: "bg-amber-50 text-amber-700 border-amber-200",
  archivee: "bg-gray-50 text-gray-600 border-gray-200",
};

interface AppHeaderProps {
  userName?: string;
  onToggleMobileNav?: () => void;
}

export function AppHeader({ userName = "Administrateur", onToggleMobileNav }: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const canGoBack = location.pathname !== "/" && location.pathname !== "/index";
  const { annees, activeAnneeId, setActiveAnneeId, activeAnnee, loading } = useAcademicPeriod();

  const sortedAnnees = annees.slice().sort((a, b) => b.debut.localeCompare(a.debut));
  const isConsultation = activeAnnee.statut !== "active";

  return (
    <header className="sticky top-0 z-40 bg-card border-b shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between px-4 md:px-6 h-16 md:h-20">
        <div className="flex items-center gap-3 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onToggleMobileNav}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {canGoBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
              aria-label="Retour"
              className="rounded-full hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5 text-primary" />
            </Button>
          )}
          <div className="flex h-11 w-11 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-xl bg-primary shadow-[var(--shadow-card)]">
            <GraduationCap className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-display font-extrabold text-base md:text-2xl text-primary leading-tight tracking-tight">
              GESTION SCOLAIRE
            </h1>
            <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest hidden sm:block">
              Plateforme de gestion scolaire
            </p>
          </div>
        </div>

        {!loading && annees.length > 0 && (
          <div className="flex flex-col items-center justify-center">
            <Select value={activeAnneeId} onValueChange={setActiveAnneeId}>
              <SelectTrigger
                className={cn(
                  "h-8 w-auto gap-1.5 px-2 text-xs font-medium bg-background",
                  isConsultation ? "border-amber-500 border-2" : "border"
                )}
              >
                <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <SelectValue asChild>
                  <span className="flex items-center gap-1">
                    <span className="truncate max-w-[80px] sm:max-w-[140px]">
                      {activeAnnee.libelle || "—"}
                    </span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sortedAnnees.map((a) => (
                  <SelectPrimitive.Item
                    key={a.id}
                    value={a.id}
                    className={cn(
                      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground",
                      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                    )}
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      <SelectPrimitive.ItemIndicator>
                        <Check className="h-4 w-4" />
                      </SelectPrimitive.ItemIndicator>
                    </span>
                    <SelectPrimitive.ItemText className="flex-1 truncate pr-2">
                      {a.libelle}
                    </SelectPrimitive.ItemText>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-auto font-normal whitespace-nowrap",
                        statutBadgeClass[a.statut]
                      )}
                    >
                      {statutLabels[a.statut]}
                    </Badge>
                  </SelectPrimitive.Item>
                ))}
              </SelectContent>
            </Select>
            {isConsultation && (
              <span className="text-[10px] text-amber-600 font-medium leading-none mt-0.5">
                Consultation
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Bienvenue
            </span>
            <span className="text-sm font-semibold text-primary truncate max-w-[180px]">
              {userName}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 px-2 gap-1.5 rounded-full hover:bg-muted"
              >
                <div className="h-9 w-9 rounded-full border-2 border-accent flex items-center justify-center bg-card">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{userName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/parametres?section=profile")}>
                <User className="mr-2 h-4 w-4" />
                Mon profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/parametres")}>
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </DropdownMenuItem>
              <InstallPWAMenuItem />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={async () => {
                  try {
                    await supabase.auth.signOut();
                    toast.success("Déconnexion réussie");
                    navigate("/auth", { replace: true });
                  } catch (err: any) {
                    toast.error("Erreur", { description: err.message });
                  }
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
