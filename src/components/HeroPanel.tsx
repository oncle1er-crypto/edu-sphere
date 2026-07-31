import { GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomeOverview } from "@/hooks/useHomeOverview";
import { HomeGreeting } from "@/components/home/HomeGreeting";
import { HomeQuickStats } from "@/components/home/HomeQuickStats";
import { HomeAlerts } from "@/components/home/HomeAlerts";
import { HomeActivity } from "@/components/home/HomeActivity";
import { HomeAgenda } from "@/components/home/HomeAgenda";

function PanelSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-2/3" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-28 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  );
}

export function HeroPanel() {
  const { data, loading } = useHomeOverview();

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-2xl bg-gradient-to-br from-card via-background to-muted border shadow-[var(--shadow-card)]">
      {/* decorative gold curve */}
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative h-full flex flex-col gap-4 px-4 md:px-6 py-5">
        {loading || !data ? (
          <PanelSkeleton />
        ) : (
          <>
            <HomeGreeting />
            <HomeQuickStats data={data} />
            <HomeAlerts data={data} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <HomeActivity data={data} />
              <HomeAgenda data={data} />
            </div>
          </>
        )}

        {/* Bloc identité — compacté, en bas du panneau */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-auto pt-4 flex flex-col items-center text-center"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-[0_14px_36px_-14px_hsl(var(--primary)/0.5)]">
            <GraduationCap className="h-8 w-8 text-primary-foreground" strokeWidth={1.8} />
          </div>
          <h2 className="mt-3 font-display font-extrabold text-xl md:text-2xl tracking-tight text-primary">
            GESTION SCOLAIRE
          </h2>
          <div className="my-2 flex items-center gap-2">
            <span className="h-px w-10 md:w-16 bg-accent" />
            <span className="h-1.5 w-1.5 rotate-45 bg-accent" />
            <span className="h-px w-10 md:w-16 bg-accent" />
          </div>
          <p className="text-sm text-muted-foreground italic">Une école, un avenir, une réussite.</p>
          <p className="mt-2 text-[10px] text-muted-foreground/70 uppercase tracking-widest">
            Maternelle · Primaire · Secondaire · Université
          </p>
        </motion.div>
      </div>
    </div>
  );
}
