import { NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import {
  Building2, User, GraduationCap, Users, ShieldCheck, Wallet, FileSignature,
  Bell, Globe, Palette, Database, Plug, ScrollText, LifeBuoy, Cog, Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const sections = [
  { to: "ecole", label: "Profil de l'école", icon: Building2, group: "Établissement" },
  { to: "academique", label: "Configuration académique", icon: GraduationCap, group: "Établissement" },
  { to: "utilisateurs", label: "Utilisateurs & rôles", icon: Users, group: "Établissement" },

  { to: "finances", label: "Finances & facturation", icon: Wallet, group: "Opérations" },
  { to: "documents", label: "Modèles de documents", icon: FileSignature, group: "Opérations" },
  { to: "notifications", label: "Notifications & communication", icon: Bell, group: "Opérations" },
  { to: "sms", label: "SMS (YellikaSMS)", icon: Smartphone, group: "Opérations" },

  { to: "apparence", label: "Apparence & branding", icon: Palette, group: "Personnalisation" },
  { to: "localisation", label: "Localisation & affichage", icon: Globe, group: "Personnalisation" },
  { to: "sauvegarde", label: "Sauvegarde & données", icon: Database, group: "Personnalisation" },

  { to: "profil", label: "Mon profil", icon: User, group: "Compte" },
  { to: "securite", label: "Sécurité & confidentialité", icon: ShieldCheck, group: "Compte" },

  { to: "integrations", label: "Intégrations & API", icon: Plug, group: "Système" },
  { to: "logs", label: "Journal d'activité", icon: ScrollText, group: "Système" },
  { to: "support", label: "Support & aide", icon: LifeBuoy, group: "Système" },
  { to: "avance", label: "Avancé", icon: Cog, group: "Système" },
];

const groups = Array.from(new Set(sections.map((s) => s.group)));

export default function SettingsLayout() {
  const location = useLocation();
  if (location.pathname === "/parametres" || location.pathname === "/parametres/") {
    return <Navigate to="/parametres/ecole" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-[7.25rem] z-20 rounded-2xl bg-card/90 backdrop-blur-md border border-border/60 shadow-[var(--shadow-card)] px-4 py-3">
        <h1 className="text-2xl md:text-3xl font-extrabold font-display text-primary">Paramètres</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configuration complète de votre plateforme de gestion scolaire.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar verticale */}
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

        {/* Contenu */}
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
