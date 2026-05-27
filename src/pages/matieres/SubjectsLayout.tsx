import { NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard, Library, Layers, Users, BookOpen,
  Clock, Scale, FileBarChart, Settings2, GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const sections = [
  { to: "tableau", label: "Tableau de bord", icon: LayoutDashboard, group: "Vue d'ensemble" },
  { to: "liste", label: "Toutes les matières", icon: Library, group: "Vue d'ensemble" },

  { to: "categories", label: "Catégories & types", icon: Layers, group: "Organisation" },
  { to: "affectation-classes", label: "Affectation aux classes", icon: BookOpen, group: "Organisation" },
  { to: "affectation-enseignants", label: "Affectation enseignants", icon: Users, group: "Organisation" },

  { to: "volumes", label: "Volumes horaires", icon: Clock, group: "Pédagogie" },
  { to: "baremes", label: "Barèmes & coefficients", icon: Scale, group: "Pédagogie" },
  { to: "programmes", label: "Programmes & progressions", icon: GitBranch, group: "Pédagogie" },

  { to: "rapports", label: "Rapports", icon: FileBarChart, group: "Système" },
  { to: "configuration", label: "Configuration", icon: Settings2, group: "Système" },
];

const groups = Array.from(new Set(sections.map((s) => s.group)));

export default function SubjectsLayout() {
  const location = useLocation();
  if (location.pathname === "/matieres" || location.pathname === "/matieres/") {
    return <Navigate to="/matieres/tableau" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold font-display text-primary">
          Matières & Disciplines
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Catalogue des matières, affectations, volumes horaires, barèmes et programmes.
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
