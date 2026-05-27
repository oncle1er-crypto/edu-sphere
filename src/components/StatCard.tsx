import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: LucideIcon;
  color: "primary" | "accent" | "warning" | "success";
}

const variantMap: Record<StatCardProps["color"], string> = {
  primary: "stat-card--primary",
  accent: "stat-card--accent",
  warning: "stat-card--warning",
  success: "stat-card--success",
};

const iconColorMap: Record<StatCardProps["color"], string> = {
  primary: "text-primary",
  accent: "text-[hsl(38_90%_45%)]",
  warning: "text-warning",
  success: "text-success",
};

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon, color }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`stat-card ${variantMap[color]} p-5`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold font-display text-card-foreground">{value}</p>
          {change && (
            <p className={`text-xs font-medium ${
              changeType === "up" ? "text-success" : changeType === "down" ? "text-destructive" : "text-muted-foreground"
            }`}>
              {change}
            </p>
          )}
        </div>
        <div className="stat-icon">
          <Icon className={`h-5 w-5 ${iconColorMap[color]}`} />
        </div>
      </div>
    </motion.div>
  );
}
