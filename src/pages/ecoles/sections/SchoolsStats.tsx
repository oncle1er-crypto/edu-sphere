import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, GraduationCap, Users, BookOpen, DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEcoles } from "@/context/EcoleContext";

export default function SchoolsStats() {
  const { ecoles, currentEcoleId } = useEcoles();
  const [selected, setSelected] = useState<string>(currentEcoleId ?? ecoles[0]?.ecole_id ?? "");
  const ecole = ecoles.find((e) => e.ecole_id === selected);

  return (
    <SettingsSection
      title="Statistiques par école"
      description="Indicateurs détaillés filtrés par ecole_id."
      icon={<BarChart3 className="h-5 w-5" />}
      hideSave
    >
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">École :</span>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ecoles.map((e) => (
              <SelectItem key={e.ecole_id} value={e.ecole_id}>{e.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {ecole && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Élèves", value: ecole.effectif_eleves, icon: GraduationCap },
              { label: "Enseignants", value: ecole.effectif_enseignants, icon: Users },
              { label: "Classes", value: ecole.nb_classes, icon: BookOpen },
              { label: "Revenu (mois)", value: `${(ecole.revenu_mensuel / 1_000_000).toFixed(1)}M FCFA`, icon: DollarSign },
            ].map((k) => (
              <Card key={k.label} className="border shadow-[var(--shadow-card)]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
                    <k.icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-2xl font-bold mt-2">{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-4 space-y-3 text-sm">
              <h3 className="font-bold">Identité du tenant</h3>
              <div className="grid md:grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">ecole_id :</span> <code className="text-xs">{ecole.ecole_id}</code></div>
                <div><span className="text-muted-foreground">Code :</span> {ecole.code}</div>
                <div><span className="text-muted-foreground">Type :</span> {ecole.type}</div>
                <div><span className="text-muted-foreground">Directeur :</span> {ecole.directeur || "—"}</div>
                <div><span className="text-muted-foreground">Ville :</span> {ecole.ville}, {ecole.pays}</div>
                <div><span className="text-muted-foreground">Créée le :</span> {ecole.date_creation}</div>
                <div><span className="text-muted-foreground">Téléphone :</span> {ecole.telephone || "—"}</div>
                <div><span className="text-muted-foreground">Email :</span> {ecole.email || "—"}</div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </SettingsSection>
  );
}
