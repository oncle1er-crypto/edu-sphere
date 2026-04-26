import { PiggyBank } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const budgetLines = [
  { name: "Recettes scolarité", planned: 85000000, current: 62500000, type: "in" },
  { name: "Subventions État", planned: 12000000, current: 8000000, type: "in" },
  { name: "Activités parascolaires", planned: 4500000, current: 2100000, type: "in" },
  { name: "Salaires", planned: 50000000, current: 38500000, type: "out" },
  { name: "Fonctionnement", planned: 15000000, current: 11200000, type: "out" },
  { name: "Investissements", planned: 8000000, current: 3400000, type: "out" },
];

export default function Budget() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Exercice budgétaire"
        description="Définissez la période et le budget global de votre établissement."
        icon={<PiggyBank className="h-5 w-5" />}
      >
        <FieldRow label="Année budgétaire">
          <Select defaultValue="2025-2026">
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2024-2025">2024 - 2025</SelectItem>
              <SelectItem value="2025-2026">2025 - 2026</SelectItem>
              <SelectItem value="2026-2027">2026 - 2027</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="Budget total prévisionnel">
          <Input defaultValue="101 500 000" className="w-56" />
        </FieldRow>
        <FieldRow label="Date de clôture">
          <Input type="date" defaultValue="2026-08-31" className="w-48" />
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        title="Répartition prévisionnelle"
        description="Suivi en temps réel des recettes et dépenses par poste."
        icon={<PiggyBank className="h-5 w-5" />}
        hideSave
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {budgetLines.map((b) => {
            const pct = Math.round((b.current / b.planned) * 100);
            return (
              <Card key={b.name} className="border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <div>
                      <p className="text-sm font-semibold">{b.name}</p>
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${b.type === "in" ? "text-accent" : "text-destructive"}`}>
                        {b.type === "in" ? "Recette" : "Dépense"}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-primary">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {b.current.toLocaleString()} / {b.planned.toLocaleString()} FCFA
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </SettingsSection>
    </div>
  );
}
