import { NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard, Bus, MapPin, Users, UserCog, Wrench,
  Fuel, Receipt, AlertTriangle, BarChart3, FileText, Settings2, ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const sections = [
  { to: "tableau", label: "Tableau de bord", icon: LayoutDashboard, group: "Vue d'ensemble" },
  { to: "lignes", label: "Lignes & circuits", icon: MapPin, group: "Vue d'ensemble" },

  { to: "vehicules", label: "Véhicules", icon: Bus, group: "Flotte" },
  { to: "chauffeurs", label: "Chauffeurs", icon: UserCog, group: "Flotte" },
  { to: "maintenance", label: "Maintenance", icon: Wrench, group: "Flotte" },
  { to: "carburant", label: "Carburant", icon: Fuel, group: "Flotte" },

  { to: "abonnes", label: "Élèves abonnés", icon: Users, group: "Gestion" },
  { to: "facturation", label: "Facturation", icon: Receipt, group: "Gestion" },
  { to: "incidents", label: "Incidents & sécurité", icon: ShieldAlert, group: "Gestion" },
  { to: "alertes", label: "Alertes temps réel", icon: AlertTriangle, group: "Gestion" },

  { to: "statistiques", label: "Statistiques", icon: BarChart3, group: "Système" },
  { to: "rapports", label: "Rapports & exports", icon: FileText, group: "Système" },
  { to: "configuration", label: "Configuration", icon: Settings2, group: "Système" },
];

const groups = Array.from(new Set(sections.map((s) => s.group)));

export default function TransportLayout() {
  const location = useLocation();
  if (location.pathname === "/transport" || location.pathname === "/transport/") {
    return <Navigate to="/transport/tableau" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold font-display text-primary">
          Transport scolaire
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lignes, véhicules, chauffeurs, abonnements et sécurité.
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
