import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  onSave?: () => void;
  hideSave?: boolean;
}

export function SettingsSection({ title, description, icon, children, onSave, hideSave }: Props) {
  const handleSave = () => {
    onSave?.();
  };

  return (
    <Card className="border shadow-[var(--shadow-card)]">
      <div className="px-6 py-5 border-b bg-muted/30 rounded-t-lg flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold font-display text-primary">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {!hideSave && (
          <Button onClick={handleSave} size="sm" className="shrink-0">
            <Save className="h-4 w-4" />
            Enregistrer
          </Button>
        )}
      </div>
      <CardContent className="p-6 space-y-6">{children}</CardContent>
    </Card>
  );
}

export function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-3 md:gap-6 items-start">
      <div className="pt-2">
        <label className="text-sm font-semibold text-foreground">{label}</label>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}
