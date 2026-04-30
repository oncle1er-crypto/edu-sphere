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
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold font-display text-primary">
          Enseignants & Personnel
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Recrutement, contrats, paie, affectations pédagogiques et carrières.
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
                          : "text-foreground hover:bg-muted"
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
