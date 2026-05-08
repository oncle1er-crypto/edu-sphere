import { GraduationCap, ChevronDown, User, LogOut, Settings, Menu, ArrowLeft } from "lucide-react";
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

interface AppHeaderProps {
  userName?: string;
  onToggleMobileNav?: () => void;
}

export function AppHeader({ userName = "Administrateur", onToggleMobileNav }: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const canGoBack = location.pathname !== "/" && location.pathname !== "/index";

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
            <GraduationCap className="h-6 w-6 md:h-8 md:w-8 text-accent" />
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
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Mon profil
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
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
