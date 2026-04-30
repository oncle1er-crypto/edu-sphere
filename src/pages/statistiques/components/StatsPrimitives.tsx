import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: string;
}

export function KpiCard({ label, value, icon: Icon, trend, color = "text-primary" }: KpiCardProps) {
  return (
    <Card className="border shadow-[var(--shadow-card)]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <p className="text-2xl font-bold mt-2">{value}</p>
        {trend && <p className="text-[11px] text-muted-foreground mt-1">{trend}</p>}
      </CardContent>
    </Card>
  );
}

interface BarChartProps {
  title: string;
  data: { label: string; value: number; sub?: string }[];
  unit?: string;
  format?: (v: number) => string;
  children?: ReactNode;
}

export function BarChart({ title, data, unit = "", format, children }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <Card className="border shadow-[var(--shadow-card)]">
      <CardContent className="p-4">
        <h3 className="font-bold mb-3">{title}</h3>
        <div className="space-y-2">
          {data.map((d) => (
            <div key={d.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium truncate">{d.label}</span>
                <span className="font-semibold">
                  {format ? format(d.value) : `${d.value.toLocaleString("fr-FR")}${unit}`}
                  {d.sub && <span className="text-muted-foreground ml-2">{d.sub}</span>}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(d.value / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
