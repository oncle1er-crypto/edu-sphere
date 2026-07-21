import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

const STATUTS: Array<{ key: string; label: string; color: string; desc: string }> = [
  { key: "en_attente", label: "En attente", color: "bg-muted text-foreground", desc: "Candidat inscrit mais aucune session de test n'est encore fixée." },
  { key: "programme", label: "Programmé", color: "bg-blue-500 text-white", desc: "Candidat rattaché à une session : il est convoqué à une date précise." },
  { key: "present", label: "Présent", color: "bg-emerald-500 text-white", desc: "Le candidat s'est présenté au test le jour J." },
  { key: "absent", label: "Absent", color: "bg-orange-500 text-white", desc: "Le candidat ne s'est pas présenté à la session prévue." },
  { key: "admis", label: "Admis", color: "bg-emerald-700 text-white", desc: "Le candidat a réussi le test. Il peut être converti en élève." },
  { key: "refuse", label: "Refusé", color: "bg-destructive text-white", desc: "Le candidat n'a pas satisfait aux critères d'admission." },
];

export function StatutCandidatLegend() {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><Info className="h-4 w-4" />Signification des statuts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {STATUTS.map((s) => (
            <div key={s.key} className="flex items-start gap-2 text-xs">
              <Badge className={`${s.color} shrink-0`}>{s.label}</Badge>
              <span className="text-muted-foreground">{s.desc}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
