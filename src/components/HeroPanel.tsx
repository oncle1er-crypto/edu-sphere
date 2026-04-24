import { GraduationCap } from "lucide-react";
import { motion } from "framer-motion";

export function HeroPanel() {
  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-2xl bg-gradient-to-br from-card via-background to-muted border shadow-[var(--shadow-card)]">
      {/* decorative gold curve */}
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative h-full flex flex-col items-center justify-center text-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex h-28 w-28 md:h-36 md:w-36 items-center justify-center rounded-3xl bg-primary shadow-[0_20px_50px_-15px_hsl(var(--primary)/0.5)]"
        >
          <GraduationCap className="h-14 w-14 md:h-20 md:w-20 text-accent" strokeWidth={1.8} />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-8 font-display font-extrabold text-3xl md:text-5xl tracking-tight"
        >
          <span className="text-primary">GESTION </span>
          <span className="text-accent">SCOLAIRE</span>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="my-5 flex items-center gap-3"
        >
          <span className="h-px w-16 md:w-24 bg-accent" />
          <span className="h-2 w-2 rotate-45 bg-accent" />
          <span className="h-px w-16 md:w-24 bg-accent" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-base md:text-lg text-muted-foreground italic max-w-md"
        >
          Une école, un avenir, une réussite.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="mt-6 text-xs text-muted-foreground/70 uppercase tracking-widest"
        >
          Maternelle · Primaire · Secondaire · Université
        </motion.p>
      </div>
    </div>
  );
}
