import { NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard, Users, UserPlus, FileText, GraduationCap,
  CalendarCheck, Heart, Award, Files, FileBadge, Archive, Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const sections = [
  { to: "tableau", label: "Tableau de bord", icon: LayoutDashboard, group: "Vue d'ensemble" },
  { to: "liste", label: "Liste des élèves", icon: Users, group: "Vue d'ensemble" },

  { to: "inscription", label: "Inscriptions", icon: UserPlus, group: "Gestion" },
  { to: "reinscription", label: "Réinscriptions", icon: FileText, group: "Gestion" },
  { to: "affectation", label: "Affectation aux classes", icon: GraduationCap, group: "Gestion" },

  { to: "presences", label: "Présences & absences", icon: CalendarCheck, group: "Suivi" },
  { to: "sante", label: "Santé & infirmerie", icon: Heart, group: "Suivi" },
  { to: "discipline", label: "Discipline & sanctions", icon: Award, group: "Suivi" },

  { to: "documents", label: "Documents & dossiers", icon: Files, group: "Archives" },
  { to: "attestations", label: "Attestations & certificats", icon: FileBadge, group: "Archives" },
  { to: "anciens", label: "Anciens élèves", icon: Archive, group: "Archives" },

  { to: "configuration", label: "Configuration", icon: Settings2, group: "Système" },
];

const groups = Array.from(new Set(sections.map((s) => s.group)));

export default function StudentsLayout() {
  const location = useLocation();
  if (location.pathname === "/eleves" || location.pathname === "/eleves/") {
    return <Navigate to="/eleves/tableau" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-[7.25rem] z-20 rounded-2xl bg-card/90 backdrop-blur-md border border-border/60 shadow-[var(--shadow-card)] px-4 py-3">
        <h1 className="text-2xl md:text-3xl font-extrabold font-display text-primary">
          Gestion des Élèves
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Inscriptions, fiches, présences, dossiers et suivi pédagogique.
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
