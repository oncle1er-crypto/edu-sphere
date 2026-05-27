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
      <div className="sticky top-[7.25rem] z-20 -mx-2 px-2">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-hero px-4 py-3 border border-border/60 shadow-[var(--shadow-card)] backdrop-blur-md">
          <h1 className="text-2xl md:text-3xl font-extrabold font-display text-gradient">
            Enseignants & Personnel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Recrutement, contrats, paie, affectations pédagogiques et carrières.
          </p>
        </div>
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
                        "menu-link group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                        isActive ? "is-active" : ""
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <s.icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-200",
                            !isActive && "group-hover:scale-110"
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
