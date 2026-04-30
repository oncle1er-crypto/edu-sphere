import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, ArrowUpDown } from "lucide-react";
import { useEcoles } from "@/context/EcoleContext";
import { useState } from "react";

type SortKey = "nom" | "eleves" | "enseignants" | "classes" | "revenu";

export default function SchoolsCompare() {
  const { ecoles } = useEcoles();
  const [sort, setSort] = useState<SortKey>("eleves");

  const sorted = [...ecoles].sort((a, b) => {
    switch (sort) {
      case "nom": return a.nom.localeCompare(b.nom);
      case "enseignants": return b.effectif_enseignants - a.effectif_enseignants;
      case "classes": return b.nb_classes - a.nb_classes;
      case "revenu": return b.revenu_mensuel - a.revenu_mensuel;
      default: return b.effectif_eleves - a.effectif_eleves;
    }
  });

  const headers: { key: SortKey; label: string }[] = [
    { key: "nom", label: "École" },
    { key: "eleves", label: "Élèves" },
    { key: "enseignants", label: "Enseignants" },
    { key: "classes", label: "Classes" },
    { key: "revenu", label: "Revenus" },
  ];

  return (
    <SettingsSection
      title="Comparatif inter-écoles"
      description="Tri et benchmark entre les établissements du réseau."
      icon={<LayoutDashboard className="h-5 w-5" />}
      hideSave
    >
      <Card className="border shadow-[var(--shadow-card)]">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {headers.map((h) => (
                  <th key={h.key} className="text-left px-4 py-3 font-semibold">
                    <button
                      onClick={() => setSort(h.key)}
                      className="inline-flex items-center gap-1 hover:text-primary"
                    >
                      {h.label} <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                ))}
                <th className="text-left px-4 py-3 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.ecole_id} className="border-t">
                  <td className="px-4 py-3 font-medium">{e.nom}<div className="text-[10px] text-muted-foreground">{e.code}</div></td>
                  <td className="px-4 py-3">{e.effectif_eleves.toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-3">{e.effectif_enseignants}</td>
                  <td className="px-4 py-3">{e.nb_classes}</td>
                  <td className="px-4 py-3">{(e.revenu_mensuel / 1_000_000).toFixed(1)}M FCFA</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={
                      e.status === "active" ? "bg-accent/15 text-accent border-accent/30" :
                      e.status === "suspendue" ? "bg-destructive/15 text-destructive border-destructive/30" :
                      "bg-muted text-muted-foreground"
                    }>{e.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </SettingsSection>
  );
}
