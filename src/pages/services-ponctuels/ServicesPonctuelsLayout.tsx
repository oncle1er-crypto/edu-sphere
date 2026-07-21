import { NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard, CreditCard, ClipboardCheck, Shirt, BookOpen, BarChart3, Settings2, Ticket, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const sections = [
  { to: "tableau", label: "Tableau de bord", icon: LayoutDashboard, group: "Vue d'ensemble" },
  { to: "paiements", label: "Paiements", icon: CreditCard, group: "Opérations" },
  { to: "tests-entree", label: "Tests d'entrée", icon: ClipboardCheck, group: "Opérations" },
  { to: "ventes-tenues", label: "Vente de tenues", icon: Shirt, group: "Opérations" },
  { to: "catalogue", label: "Catalogue des services", icon: BookOpen, group: "Configuration" },
  { to: "point-caisse", label: "Point de caisse", icon: Wallet, group: "Analyses" },
  { to: "rapports", label: "Rapports", icon: BarChart3, group: "Analyses" },
  { to: "parametres", label: "Paramètres", icon: Settings2, group: "Configuration" },
];

const groups = Array.from(new Set(sections.map((s) => s.group)));

export default function ServicesPonctuelsLayout() {
  const location = useLocation();
  if (location.pathname === "/services-ponctuels" || location.pathname === "/services-ponctuels/") {
    return <Navigate to="/services-ponctuels/tableau" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-[7.25rem] z-20 rounded-2xl bg-card/90 backdrop-blur-md border border-border/60 shadow-[var(--shadow-card)] px-4 py-3">
        <h1 className="text-2xl md:text-3xl font-extrabold font-display text-primary flex items-center gap-2">
          <Ticket className="h-6 w-6" /> Services ponctuels
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestion des paiements exceptionnels : tests d'entrée, ventes de tenues, services divers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <aside className="menu-aside border border-border/60 rounded-2xl shadow-[var(--shadow-card)] p-3 lg:sticky lg:top-24 self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
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
                          isActive ? "is-active" : "text-foreground"
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
