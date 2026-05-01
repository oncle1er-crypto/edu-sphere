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

export function TopNav({ schoolName = "GROUPE SCOLAIRE LA PROVIDENCE" }: TopNavProps) {
  return (
    <nav className="bg-primary border-t border-accent/30 shadow-md">
      <div className="flex items-center justify-between px-4 md:px-6 overflow-x-auto">
        <div className="flex items-center gap-1 md:gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-2 px-3 md:px-5 py-3.5 text-xs md:text-sm font-semibold uppercase tracking-wide whitespace-nowrap transition-colors duration-200",
                  isActive
                    ? "text-accent"
                    : "text-primary-foreground/80 hover:text-primary-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="hidden md:block py-3.5 text-xs font-bold uppercase tracking-widest text-primary-foreground/90">
          {schoolName}
        </div>
      </div>
    </nav>
  );
}
