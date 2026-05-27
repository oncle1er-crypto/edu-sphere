import { Home, BarChart3, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Tableau de bord", to: "/", icon: Home, end: true },
  { label: "Statistiques", to: "/statistiques", icon: BarChart3 },
  { label: "Paramètres", to: "/parametres", icon: Settings },
];

interface TopNavProps {
  schoolName?: string;
}

export function TopNav({ schoolName = "COMPLEXE SCOLAIRE LA PROVIDENCE DE DON ORIONE" }: TopNavProps) {
  return (
    <nav className="px-3 md:px-6 pt-3 pb-2">
      <div
        className="relative overflow-hidden rounded-2xl border border-accent/30 shadow-[0_10px_30px_-12px_hsl(var(--primary)/0.45)]"
        style={{
          background:
            "linear-gradient(95deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.92) 35%, hsl(var(--primary)) 65%, hsl(var(--accent) / 0.85) 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 10s linear infinite",
        }}
      >
        {/* Glow accents */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 120% at 0% 50%, hsl(var(--accent) / 0.18) 0%, transparent 60%), radial-gradient(50% 120% at 100% 50%, hsl(var(--accent) / 0.22) 0%, transparent 60%)",
          }}
        />
        {/* Top sheen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />


        <div className="relative flex items-center justify-between px-3 md:px-5 overflow-x-auto">
          <div className="flex items-center gap-1 md:gap-2">
            {navItems.map((item) => (
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

          <div className="hidden md:block py-3 pr-2 text-xs font-bold uppercase tracking-widest text-primary-foreground/95 drop-shadow">
            {schoolName}
          </div>
        </div>
      </div>
    </nav>
  );
}
