import { GraduationCap, Users, Wallet, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import type { HomeOverview } from "@/hooks/useHomeOverview";

const fmtMontant = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)} M`
    : n.toLocaleString("fr-FR");

export function HomeQuickStats({ data }: { data: HomeOverview }) {
  const { can } = usePermissions();

  const tiles = [
    {
      label: "Élèves inscrits",
      value: data.totalInscrits.toLocaleString("fr-FR"),
      icon: GraduationCap,
      ring: "bg-primary text-primary-foreground",
      bar: "bg-primary",
      sub: `${data.totalEleves.toLocaleString("fr-FR")} au total (pré-inscrits inclus)`,
    },
    {
      label: "Enseignants",
      value: data.totalEnseignants.toLocaleString("fr-FR"),
      icon: Users,
      ring: "bg-[hsl(205_80%_42%)] text-white",
      bar: "bg-[hsl(205_80%_42%)]",
      sub: "Personnel enseignant actif",
    },
    {
      label: "Encaissé aujourd'hui",
      value: `${fmtMontant(data.encaisseJour)} F`,
      icon: Wallet,
      ring: "bg-[hsl(152_55%_36%)] text-white",
      bar: "bg-[hsl(152_55%_36%)]",
      sub: "Total des encaissements",
    },
    {
      label: "Présence du jour",
      value: data.tauxPresence === null ? "—" : `${data.tauxPresence}%`,
      icon: UserCheck,
      ring: "bg-[hsl(28_85%_50%)] text-white",
      bar: "bg-[hsl(28_85%_50%)]",
      sub: data.presencesSaisies === 0 ? "Non saisie" : `${data.presencesSaisies} saisies`,
      action:
        data.presencesSaisies === 0 && can("presences", "view") ? (
          <Link
            to="/presences/appel"
            className="mt-1.5 inline-flex items-center rounded-full border border-[hsl(28_85%_50%)]/40 px-2.5 py-1 text-[11px] font-semibold text-[hsl(28_85%_38%)] transition-colors duration-150 hover:bg-[hsl(28_85%_50%)]/10"
          >
            Faire l'appel
          </Link>
        ) : null,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {tiles.map((t, i) => (
        <motion.div
          key={t.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          className="group relative overflow-hidden rounded-2xl border bg-card p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className={`absolute inset-x-0 top-0 h-1 ${t.bar}`} />
          <div className="flex items-start gap-2.5 pt-1.5">
            <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${t.ring} shadow-sm`}>
              <t.icon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground truncate">{t.label}</p>
              <p className="text-xl md:text-2xl font-extrabold font-display text-card-foreground leading-tight truncate">
                {t.value}
              </p>
            </div>
          </div>
          {t.sub && <p className="mt-1.5 text-[10px] text-muted-foreground line-clamp-2">{t.sub}</p>}
          {t.action}
        </motion.div>
      ))}
    </div>
  );
}
