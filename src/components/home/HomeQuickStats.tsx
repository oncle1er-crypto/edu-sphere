import { GraduationCap, Users, Wallet, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import type { HomeOverview } from "@/hooks/useHomeOverview";

const fmtMontant = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)} M`
    : n.toLocaleString("fr-FR");

export function HomeQuickStats({ data }: { data: HomeOverview }) {
  const tiles = [
    { label: "Élèves", value: data.totalEleves.toLocaleString("fr-FR"), icon: GraduationCap, tone: "text-primary bg-primary/10" },
    { label: "Enseignants", value: data.totalEnseignants.toLocaleString("fr-FR"), icon: Users, tone: "text-[hsl(205_80%_40%)] bg-[hsl(205_80%_45%)]/10" },
    { label: "Encaissé aujourd'hui", value: `${fmtMontant(data.encaisseJour)} F`, icon: Wallet, tone: "text-success bg-success/10" },
    {
      label: "Présence du jour",
      value: data.tauxPresence === null ? "—" : `${data.tauxPresence}%`,
      icon: UserCheck,
      tone: "text-accent-foreground bg-accent/20",
      sub: data.presencesSaisies === 0 ? "Non saisie" : `${data.presencesSaisies} saisies`,
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
          className="rounded-xl border bg-card/70 backdrop-blur-sm p-3"
        >
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${t.tone}`}>
            <t.icon className="h-4 w-4" />
          </span>
          <p className="mt-2 text-[11px] text-muted-foreground truncate">{t.label}</p>
          <p className="text-lg font-extrabold font-display text-card-foreground truncate">{t.value}</p>
          {t.sub && <p className="text-[10px] text-muted-foreground truncate">{t.sub}</p>}
        </motion.div>
      ))}
    </div>
  );
}
