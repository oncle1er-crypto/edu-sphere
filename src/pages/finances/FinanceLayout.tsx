import { NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, CreditCard, Receipt, Wallet, Landmark,
  Users, PiggyBank, BarChart3, FileSpreadsheet, Settings2, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const sections = [
  { to: "tableau", label: "Tableau de bord", icon: LayoutDashboard, group: "Vue d'ensemble" },
  { to: "factures", label: "Factures & frais", icon: FileText, group: "Vue d'ensemble" },

  { to: "paiements", label: "Encaissements", icon: CreditCard, group: "Encaissements" },
  { to: "recus", label: "Reçus & quittances", icon: Receipt, group: "Encaissements" },
  { to: "impayes", label: "Impayés & relances", icon: AlertTriangle, group: "Encaissements" },

  { to: "depenses", label: "Dépenses", icon: Wallet, group: "Sorties" },
  { to: "salaires", label: "Salaires & paie", icon: Users, group: "Sorties" },
  { to: "fournisseurs", label: "Fournisseurs", icon: Landmark, group: "Sorties" },

  { to: "budget", label: "Budget annuel", icon: PiggyBank, group: "Comptabilité" },
  { to: "tresorerie", label: "Trésorerie & banques", icon: Landmark, group: "Comptabilité" },
  { to: "grand-livre", label: "Grand livre", icon: FileSpreadsheet, group: "Comptabilité" },

  { to: "rapports", label: "Rapports financiers", icon: BarChart3, group: "Analyses" },
  { to: "fiscalite", label: "Fiscalité & TVA", icon: FileSpreadsheet, group: "Analyses" },

  { to: "configuration", label: "Configuration", icon: Settings2, group: "Système" },
];

const groups = Array.from(new Set(sections.map((s) => s.group)));

export default function FinanceLayout() {
  const location = useLocation();
  if (location.pathname === "/finances" || location.pathname === "/finances/") {
    return <Navigate to="/finances/tableau" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold font-display text-primary">
          Paiements & Comptabilité
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestion financière complète : facturation, encaissements, dépenses, paie et reporting.
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
                {sections
                  .filter((s) => s.group === group)
                  .map((s) => (
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
