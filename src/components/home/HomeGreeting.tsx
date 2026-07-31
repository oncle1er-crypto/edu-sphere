import { useAuth } from "@/context/AuthContext";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { motion } from "framer-motion";

export function HomeGreeting({ name }: { name?: string }) {
  const { user } = useAuth();
  const { activeAnnee } = useAcademicPeriod();
  const h = new Date().getHours();
  const salut = h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
  const who = name || user?.email?.split("@")[0] || "";
  const date = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
    >
      <h2 className="font-display font-bold text-lg text-primary">
        {salut}{who ? `, ${who}` : ""}
      </h2>
      <p className="text-xs text-muted-foreground">
        <span className="capitalize">{date}</span>
        {activeAnnee?.libelle ? ` · Année ${activeAnnee.libelle}` : ""}
      </p>
    </motion.div>
  );
}
