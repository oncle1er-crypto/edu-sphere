import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

type KpiVariant =
  | "primary"
  | "accent"
  | "success"
  | "info"
  | "warning"
  | "rose"
  | "violet";

const variantClass: Record<KpiVariant, string> = {
  primary: "stat-card--primary",
  accent: "stat-card--accent",
  success: "stat-card--success",
  info: "stat-card--info",
  warning: "stat-card--warning",
  rose: "stat-card--rose",
  violet: "stat-card--violet",
};

const iconClass: Record<KpiVariant, string> = {
  primary: "text-primary",
  accent: "text-accent-foreground",
  success: "text-success",
  info: "text-[hsl(205_80%_45%)]",
  warning: "text-warning",
  rose: "text-[hsl(340_75%_50%)]",
  violet: "text-[hsl(265_70%_55%)]",
};

const cycle: KpiVariant[] = ["primary", "success", "info", "accent", "warning", "rose", "violet"];

export function pickVariant(i: number): KpiVariant {
  return cycle[i % cycle.length];
}

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  variant?: KpiVariant;
  index?: number;
}

export function KpiCard({ label, value, sub, icon: Icon, variant, index = 0 }: KpiCardProps) {
  const v = variant ?? pickVariant(index);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`stat-card ${variantClass[v]} p-4`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="stat-icon h-9 w-9 sm:h-8 sm:w-8">
          <Icon className={`h-4 w-4 ${iconClass[v]}`} />
        </span>
      </div>
      <p className="text-2xl font-extrabold font-display text-card-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</p>}
    </motion.div>
  );
}
