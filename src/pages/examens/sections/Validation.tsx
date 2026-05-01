import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ShieldCheck, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

type Periode = { nom: string; verrouille: boolean };

const initial: Periode[] = [
  { nom: "Trimestre 1 — 2024/2025", verrouille: true },
  { nom: "Trimestre 2 — 2024/2025", verrouille: false },
  { nom: "Trimestre 3 — 2024/2025", verrouille: false },
  { nom: "Examen blanc BAC", verrouille: true },
];

export default function Validation() {
  const [periods, setPeriods] = useState<Periode[]>(initial);

  const toggle = (i: number) => {
    setPeriods((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], verrouille: !next[i].verrouille };
      return next;
    });
    toast.success(periods[i].verrouille ? "Période rouverte" : "Période verrouillée");
  };

  return (
    <SettingsSection
      icon={<ShieldCheck className='h-5 w-5' />}
      title="Validation & verrouillage"
      description="Verrouillez les périodes de saisie pour empêcher toute modification."
    >
      <div className="space-y-3">
        {periods.map((p, i) => (
          <Card key={i} className="border">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${p.verrouille ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}`}>
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">{p.nom}</p>
                  <p className="text-xs text-muted-foreground">{p.verrouille ? "Saisies clôturées" : "Saisies ouvertes"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ConfirmButton
                  size="sm"
                  variant="outline"
                  tone={p.verrouille ? "warning" : "danger"}
                  confirmTitle={p.verrouille ? `Rouvrir « ${p.nom} » ?` : `Verrouiller « ${p.nom} » ?`}
                  confirmDescription={
                    p.verrouille
                      ? "Les enseignants pourront à nouveau modifier les notes et bulletins de cette période. Cette action sera tracée."
                      : "Plus aucune note, appréciation ou bulletin de cette période ne pourra être modifié. Les bulletins déjà émis restent valides."
                  }
                  confirmLabel={p.verrouille ? "Rouvrir" : "Verrouiller"}
                  onConfirm={() => toggle(i)}
                >
                  {p.verrouille ? <><Unlock className="h-3.5 w-3.5" />Rouvrir</> : <><Lock className="h-3.5 w-3.5" />Verrouiller</>}
                </ConfirmButton>
                <Button size="sm" variant="outline">Détails</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
