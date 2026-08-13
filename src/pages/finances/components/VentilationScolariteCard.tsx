import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Layers, AlertTriangle, Info } from "lucide-react";
import { fcfa } from "../scolarite-data";
import { useFinanceSettings } from "@/hooks/useFinanceSettings";
import { validateVentilation } from "@/lib/ventilationValidation";

interface Props {
  /** Total annuel dû par l'élève */
  total: number;
  /** Montant couvert (encaissements + remises) */
  couvert: number;
}

export default function VentilationScolariteCard({ total, couvert }: Props) {
  const { settings } = useFinanceSettings();
  const s = settings;
  const check = validateVentilation(total, couvert, {
    fraisInscription: Number(s.frais_inscription ?? 25000),
    fraisUniformes: Number(s.frais_uniformes ?? 15000),
    fraisActivites: Number(s.frais_activites ?? 15000),
  });
  const v = check.ventilation;

  return (
    <Card className="border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-bold">Ventilation des encaissements</h4>
          <Badge variant="outline" className="text-[10px]">
            Inscription → Scolarité → Annexes
          </Badge>
        </div>

        {check.issues.length > 0 && (
          <div className="space-y-1.5">
            {check.issues.map((i, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 rounded-md border p-2 text-[11px] ${
                  i.level === "error"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-warning/40 bg-warning/10 text-warning-foreground"
                }`}
              >
                {i.level === "error" ? (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                <span>{i.message}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2.5">
          {v.postes.map((p) => {
            const pct = p.du > 0 ? Math.min(100, Math.round((p.affecte / p.du) * 100)) : 100;
            return (

              <div key={p.cle} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium truncate">{p.label}</span>
                  <span className="tabular-nums shrink-0">
                    <span className={p.solde ? "text-success font-bold" : "text-primary font-bold"}>
                      {fcfa(p.affecte)}
                    </span>
                    <span className="text-muted-foreground"> / {fcfa(p.du)} F</span>
                  </span>
                </div>
                <Progress value={pct} className="h-1.5" />
                {p.cle === "annexes" && p.du > 0 && (
                  <ul className="pl-3 pt-1 space-y-0.5">
                    {v.detailAnnexes.map((d) => (
                      <li key={d.label} className="flex justify-between text-[11px] text-muted-foreground">
                        <span>• {d.label}</span>
                        <span className="tabular-nums">
                          {fcfa(d.affecte)} / {fcfa(d.du)} F
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {!p.solde && p.reste > 0 && (
                  <p className="text-[11px] text-destructive">Reste {fcfa(p.reste)} F</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t pt-2 text-xs font-bold">
          <span>Total ventilé</span>
          <span className="tabular-nums">
            {fcfa(v.totalAffecte)} / {fcfa(v.totalDu)} F
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
