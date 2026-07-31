import { useAuth } from "@/context/AuthContext";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { motion } from "framer-motion";
import { CalendarDays, GraduationCap } from "lucide-react";

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
      className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-accent/10 to-transparent px-4 py-3.5 md:px-5"
    >
      <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="font-display font-extrabold text-lg md:text-xl text-primary tracking-tight truncate">
            {salut}{who ? `, ${who}` : ""} <span aria-hidden>👋</span>
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Voici la situation de votre établissement aujourd'hui.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card/80 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            <span className="capitalize">{date}</span>
          </span>
          {activeAnnee?.libelle && (
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card/80 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm">
              <GraduationCap className="h-3.5 w-3.5 text-primary" />
              Année scolaire {activeAnnee.libelle}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
