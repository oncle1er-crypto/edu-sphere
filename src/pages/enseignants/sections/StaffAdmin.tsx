import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Loader2 } from "lucide-react";
import { useEnseignants } from "@/hooks/useEnseignants";
import { useRhReferentiels } from "@/hooks/useRhReferentiels";
import { compareEleves } from "@/lib/sortEleves";

export default function StaffAdmin() {
  const { enseignants, loading: loadingStaff } = useEnseignants();
  const { departements, loading: loadingRef } = useRhReferentiels();
  const loading = loadingStaff || loadingRef;

  const groupes = departements
    .map((d) => ({
      code: d.code,
      libelle: d.libelle,
      membres: enseignants
        .filter((e) => (e.departement ?? "").trim().toLowerCase() === d.code.trim().toLowerCase())
        .slice()
        .sort(compareEleves)
        .map((e) => `${e.nom ?? ""} ${e.prenom ?? ""}`.trim()),
    }))
    .filter((g) => g.membres.length > 0);

  const codesConnus = new Set(departements.map((d) => d.code.trim().toLowerCase()));
  const autres = enseignants
    .filter((e) => !codesConnus.has((e.departement ?? "").trim().toLowerCase()))
    .slice()
    .sort(compareEleves)
    .map((e) => `${e.nom ?? ""} ${e.prenom ?? ""}`.trim());
  if (autres.length > 0) {
    groupes.push({ code: "__autres__", libelle: "Non affecté", membres: autres });
  }

  return (
    <SettingsSection
      icon={<Briefcase className="h-5 w-5" />}
      title="Personnel par département"
      description="Répartition réelle du personnel enregistré, regroupée par département."
      hideSave
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : enseignants.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">Aucun membre du personnel enregistré.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {groupes.map((g) => (
            <Card key={g.code} className="border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-accent/15 text-primary flex items-center justify-center shrink-0">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <h4 className="font-bold font-display truncate">{g.libelle}</h4>
                  </div>
                  <Badge className="shrink-0">
                    {g.membres.length} {g.membres.length > 1 ? "membres" : "membre"}
                  </Badge>
                </div>
                <ul className="space-y-1 pt-2 border-t">
                  {g.membres.map((m, i) => (
                    <li key={`${g.code}-${i}`} className="text-sm text-muted-foreground">• {m}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
