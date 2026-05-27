import { NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, Layers, Users, MapPin,
  CalendarRange, ArrowRightLeft, Settings2, GraduationCap, FileBarChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const sections = [
  { to: "tableau", label: "Tableau de bord", icon: LayoutDashboard, group: "Vue d'ensemble" },
  { to: "liste", label: "Toutes les classes", icon: BookOpen, group: "Vue d'ensemble" },

  { to: "cycles", label: "Cycles & niveaux", icon: Layers, group: "Structure" },
  { to: "salles", label: "Salles de classe", icon: MapPin, group: "Structure" },
  { to: "groupes", label: "Groupes & options", icon: Users, group: "Structure" },

  { to: "effectifs", label: "Effectifs par classe", icon: GraduationCap, group: "Pédagogie" },
  { to: "emploi", label: "Emploi du temps classe", icon: CalendarRange, group: "Pédagogie" },
  { to: "transferts", label: "Transferts & passages", icon: ArrowRightLeft, group: "Pédagogie" },

  { to: "rapports", label: "Rapports", icon: FileBarChart, group: "Système" },
  { to: "configuration", label: "Configuration", icon: Settings2, group: "Système" },
];

const groups = Array.from(new Set(sections.map((s) => s.group)));

export default function ClassesLayout() {
  const location = useLocation();
  if (location.pathname === "/classes" || location.pathname === "/classes/") {
    return <Navigate to="/classes/tableau" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold font-display text-primary">
          Classes & Niveaux
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organisation des cycles, classes, salles, effectifs et emplois du temps.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <aside className="menu-aside border border-border/60 rounded-2xl shadow-[var(--shadow-card)] p-3 lg:sticky lg:top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto">
          {groups.map((group) => (
            <div key={group} className="mb-4 last:mb-0">
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {group}
              </div>
              <nav className="flex flex-col gap-0.5">
                {sections.filter((s) => s.group === group).map((s) => (
                  <NavLink
                    key={s.to}
                    to={s.to}
                    className={({ isActive }) =>
                      cn(
                        "menu-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                        isActive
                          ? "is-active"
                          : "text-foreground"
                      )
                    }
                  >
                    <s.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{s.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
        </aside>

        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
