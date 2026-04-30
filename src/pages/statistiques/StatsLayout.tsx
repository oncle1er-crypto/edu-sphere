import { NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard, GraduationCap, Users, DollarSign, ClipboardCheck,
  ClipboardList, UtensilsCrossed, Bus, Library, FileText, Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const sections = [
  { to: "tableau", label: "Vue d'ensemble", icon: LayoutDashboard, group: "Réseau" },
  { to: "ecoles", label: "Comparatif écoles", icon: LayoutDashboard, group: "Réseau" },

  { to: "eleves", label: "Élèves", icon: GraduationCap, group: "Académique" },
  { to: "enseignants", label: "Enseignants", icon: Users, group: "Académique" },
  { to: "presences", label: "Présences", icon: ClipboardCheck, group: "Académique" },
  { to: "examens", label: "Examens & notes", icon: ClipboardList, group: "Académique" },

  { to: "finances", label: "Finances", icon: DollarSign, group: "Opérations" },
  { to: "cantine", label: "Cantine", icon: UtensilsCrossed, group: "Opérations" },
  { to: "transport", label: "Transport", icon: Bus, group: "Opérations" },
  { to: "bibliotheque", label: "Bibliothèque", icon: Library, group: "Opérations" },

  { to: "rapports", label: "Rapports & exports", icon: FileText, group: "Système" },
  { to: "configuration", label: "Configuration", icon: Settings2, group: "Système" },
];

const groups = Array.from(new Set(sections.map((s) => s.group)));

export default function StatsLayout() {
  const location = useLocation();
  if (location.pathname === "/statistiques" || location.pathname === "/statistiques/") {
    return <Navigate to="/statistiques/tableau" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold font-display text-primary">
          Statistiques globales
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Indicateurs consolidés du réseau, agrégés par <code className="text-xs">ecole_id</code>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <aside className="bg-card border rounded-2xl shadow-[var(--shadow-card)] p-3 lg:sticky lg:top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto">
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
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-foreground hover:bg-muted",
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
