import { Home, BarChart3, Settings, School, Sun, Menu } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";

const navItems = [
  { label: "Tableau de bord", to: "/", icon: Home, end: true, module: null as string | null },
  { label: "Écoles", to: "/ecoles", icon: School, module: "parametres" },
  { label: "Statistiques", to: "/statistiques", icon: BarChart3, module: "statistiques" },
  { label: "Cours de vacances", to: "/cours-vacances", icon: Sun, module: "cours_vacances" },
  { label: "Paramètres", to: "/parametres", icon: Settings, module: "parametres" },
];

interface TopNavProps {
  schoolName?: string;
}

export function TopNav({ schoolName = "COMPLEXE SCOLAIRE LA PROVIDENCE DE DON ORIONE" }: TopNavProps) {
  const [open, setOpen] = useState(false);
  const { can, loading: permsLoading } = usePermissions();
  const visibleItems = navItems.filter(i => !i.module || permsLoading || can(i.module));

  return (
    <nav className="px-2 sm:px-3 md:px-6 pt-2 sm:pt-3 pb-2">
      <div
        className="relative overflow-hidden rounded-2xl border border-accent/30 shadow-[0_10px_30px_-12px_hsl(var(--primary)/0.45)]"
        style={{
          background:
            "linear-gradient(95deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.92) 35%, hsl(var(--primary)) 65%, hsl(var(--accent) / 0.85) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 120% at 0% 50%, hsl(var(--accent) / 0.18) 0%, transparent 60%), radial-gradient(50% 120% at 100% 50%, hsl(var(--accent) / 0.22) 0%, transparent 60%)",
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

        <div className="relative flex items-center justify-between gap-2 px-2 sm:px-3 md:px-5">
          {/* Mobile hamburger */}
          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary-foreground hover:bg-white/15 hover:text-white touch-target"
                  aria-label="Ouvrir le menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] max-w-xs p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="text-left text-sm">{schoolName}</SheetTitle>
                </SheetHeader>
                <div className="p-2">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors touch-target",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted"
                        )
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1 md:gap-2 overflow-x-auto">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "relative flex items-center gap-2 px-3 md:px-5 py-3 text-xs md:text-sm font-semibold uppercase tracking-wide whitespace-nowrap rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-white/15 text-white shadow-[inset_0_1px_0_hsl(50_95%_80%/0.35)]"
                      : "text-primary-foreground/80 hover:text-white hover:bg-white/10"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute bottom-1 left-3 right-3 h-0.5 bg-accent rounded-full shadow-[0_0_8px_hsl(50_95%_60%/0.8)]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Mobile: titre école tronqué */}
          <div className="md:hidden flex-1 min-w-0 text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground/95 truncate">
              {schoolName}
            </div>
          </div>

          {/* Desktop: titre école complet */}
          <div className="hidden md:block py-3 pr-2 text-xs font-bold uppercase tracking-widest text-primary-foreground/95 drop-shadow truncate max-w-[45%]">
            {schoolName}
          </div>
        </div>
      </div>
    </nav>
  );
}
