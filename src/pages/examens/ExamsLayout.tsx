import { NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, CalendarRange, PenSquare, FileBarChart,
  Award, GraduationCap, Users, BarChart3, FileSpreadsheet, Settings2, ShieldCheck, Scale, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const sections = [
  { to: "tableau", label: "Tableau de bord", icon: LayoutDashboard, group: "Vue d'ensemble" },
  { to: "calendrier", label: "Calendrier des évaluations", icon: CalendarRange, group: "Vue d'ensemble" },

  { to: "evaluations", label: "Évaluations & devoirs", icon: ClipboardList, group: "Évaluations" },
  { to: "compositions", label: "Compositions & examens", icon: FileBarChart, group: "Évaluations" },
  { to: "saisie-notes", label: "Saisie des notes", icon: PenSquare, group: "Évaluations" },
  { to: "saisie-rapide", label: "Saisie rapide ⚡", icon: PenSquare, group: "Évaluations" },

  { to: "bulletins", label: "Bulletins scolaires", icon: GraduationCap, group: "Résultats" },
  { to: "moyennes", label: "Moyennes & classements", icon: Award, group: "Résultats" },
  { to: "conseils", label: "Conseils de classe", icon: Users, group: "Résultats" },

  { to: "statistiques", label: "Statistiques & analyses", icon: BarChart3, group: "Analyses" },
  { to: "rapports", label: "Rapports pédagogiques", icon: FileSpreadsheet, group: "Analyses" },

  { to: "fin-annee", label: "Fin d'année", icon: ArrowUpRight, group: "Résultats" },

  { to: "baremes", label: "Grilles & coefficients", icon: Scale, group: "Système" },
  { to: "validation", label: "Validation & verrouillage", icon: ShieldCheck, group: "Système" },
  { to: "configuration", label: "Configuration", icon: Settings2, group: "Système" },
];

const groups = Array.from(new Set(sections.map((s) => s.group)));

export default function ExamsLayout() {
  const location = useLocation();
  if (location.pathname === "/examens" || location.pathname === "/examens/") {
    return <Navigate to="/examens/tableau" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-16 z-30 rounded-2xl bg-card/90 backdrop-blur-md border border-border/60 shadow-[var(--shadow-card)] px-4 py-3">
        <h1 className="text-2xl md:text-3xl font-extrabold font-display text-primary">
          Examens & Notes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Évaluations, saisie de notes, bulletins, moyennes et analyses pédagogiques.
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
                {sections
                  .filter((s) => s.group === group)
                  .map((s) => (
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
