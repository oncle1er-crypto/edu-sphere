import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Layers } from "lucide-react";
import { fcfa } from "../scolarite-data";
import { useFinanceSettings } from "@/hooks/useFinanceSettings";
import { ventilerScolarite } from "@/lib/ventilationScolarite";

interface Props {
  /** Total annuel dû par l'élève */
  total: number;
  /** Montant couvert (encaissements + remises) */
  couvert: number;
}

export default function VentilationScolariteCard({ total, couvert }: Props) {
  const { settings } = useFinanceSettings();
  const s = settings as any;
  const v = ventilerScolarite(total, couvert, {
    fraisInscription: Number(s.frais_inscription ?? 25000),
    fraisUniformes: Number(s.frais_uniformes ?? 15000),
    fraisActivites: Number(s.frais_activites ?? 15000),
  });

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

        <div className="space-y-2.5">
          {v.postes.map((p) => {
            const pct = p.du > 0 ? Math.round((p.affecte / p.du) * 100) : 100;
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
