import { NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard, Users, UserPlus, BookOpen, CalendarCheck,
  FileSignature, Award, Wallet, GraduationCap, Settings2, Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const sections = [
  { to: "tableau", label: "Tableau de bord", icon: LayoutDashboard, group: "Vue d'ensemble" },
  { to: "liste", label: "Liste du personnel", icon: Users, group: "Vue d'ensemble" },

  { to: "recrutement", label: "Recrutement", icon: UserPlus, group: "Gestion RH" },
  { to: "contrats", label: "Contrats & affectations", icon: FileSignature, group: "Gestion RH" },
  { to: "paie", label: "Paie & salaires", icon: Wallet, group: "Gestion RH" },

  { to: "matieres", label: "Matières enseignées", icon: BookOpen, group: "Pédagogie" },
  { to: "emploi", label: "Emploi du temps prof", icon: CalendarCheck, group: "Pédagogie" },
  { to: "formations", label: "Formations & certifications", icon: GraduationCap, group: "Pédagogie" },
  { to: "evaluations", label: "Évaluations annuelles", icon: Award, group: "Pédagogie" },

  { to: "personnel", label: "Personnel administratif", icon: Briefcase, group: "Autres" },
  { to: "configuration", label: "Configuration", icon: Settings2, group: "Système" },
];

const groups = Array.from(new Set(sections.map((s) => s.group)));

export default function StaffLayout() {
  const location = useLocation();
  if (location.pathname === "/enseignants" || location.pathname === "/enseignants/") {
    return <Navigate to="/enseignants/tableau" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero px-2 py-1">
        <h1 className="text-2xl md:text-3xl font-extrabold font-display text-gradient">
          Enseignants & Personnel
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Recrutement, contrats, paie, affectations pédagogiques et carrières.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <aside className="relative bg-card/85 backdrop-blur-sm border border-border/60 rounded-2xl shadow-[var(--shadow-card)] p-3 lg:sticky lg:top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto">
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-primary-soft opacity-50" />
          <div className="relative">
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
                          "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 will-change-transform overflow-hidden",
                          isActive
                            ? "nav-active-glow text-primary-foreground shadow-glow"
                            : "text-foreground hover:bg-gradient-primary-soft hover:translate-x-0.5"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={cn(
                              "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-accent transition-opacity duration-300",
                              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-70"
                            )}
                          />
                          <s.icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-transform duration-200",
                              !isActive && "group-hover:scale-110 group-hover:text-primary"
                            )}
                          />
                          <span className="truncate">{s.label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </aside>

        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
