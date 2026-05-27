import { NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard, ClipboardCheck, UserX, FileWarning, CalendarClock,
  BellRing, FileText, BarChart3, ShieldCheck, Settings2, QrCode, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const sections = [
  { to: "tableau", label: "Tableau de bord", icon: LayoutDashboard, group: "Vue d'ensemble" },
  { to: "appel", label: "Appel du jour", icon: ClipboardCheck, group: "Vue d'ensemble" },

  { to: "absences", label: "Absences élèves", icon: UserX, group: "Élèves" },
  { to: "retards", label: "Retards", icon: CalendarClock, group: "Élèves" },
  { to: "justificatifs", label: "Justificatifs", icon: FileText, group: "Élèves" },
  { to: "sanctions", label: "Sanctions liées", icon: FileWarning, group: "Élèves" },

  { to: "personnel", label: "Présence personnel", icon: Users, group: "Personnel" },
  { to: "pointage", label: "Pointage QR / Badge", icon: QrCode, group: "Personnel" },

  { to: "notifications", label: "Notifications parents", icon: BellRing, group: "Suivi" },
  { to: "statistiques", label: "Statistiques", icon: BarChart3, group: "Suivi" },
  { to: "rapports", label: "Rapports & exports", icon: ShieldCheck, group: "Système" },
  { to: "configuration", label: "Configuration", icon: Settings2, group: "Système" },
];

const groups = Array.from(new Set(sections.map((s) => s.group)));

export default function AttendanceLayout() {
  const location = useLocation();
  if (location.pathname === "/presences" || location.pathname === "/presences/") {
    return <Navigate to="/presences/tableau" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold font-display text-primary">
          Présences & Absences
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Appel quotidien, suivi des absences, justificatifs et notifications aux familles.
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
