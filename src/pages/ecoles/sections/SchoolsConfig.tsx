import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Settings2, ShieldCheck } from "lucide-react";
import { useEcoles } from "@/context/EcoleContext";

export default function SchoolsConfig() {
  const { currentEcole, ecoles } = useEcoles();
  return (
    <SettingsSection
      title="Configuration multi-tenant"
      description="Toutes les requêtes des modules sont automatiquement filtrées par ecole_id."
      icon={<Settings2 className="h-5 w-5" />}
      hideSave
    >
      <Card className="border shadow-[var(--shadow-card)]">
        <CardContent className="p-4 space-y-3 text-sm">
          <div className="flex items-center gap-2 text-primary font-bold">
            <ShieldCheck className="h-4 w-4" /> Isolation stricte des données
          </div>
          <p className="text-muted-foreground">
            Chaque table métier (élèves, enseignants, finances, cantine, transport, etc.)
            possède une colonne <code className="text-xs">ecole_id</code>. Le tenant actif est
            injecté automatiquement à la création d'enregistrements et utilisé en filtre lors
            des lectures.
          </p>

          <div className="grid md:grid-cols-2 gap-3 pt-2">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Tenant actif</p>
              <p className="font-bold">{currentEcole?.nom ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                <code className="text-[10px]">{currentEcole?.ecole_id ?? "—"}</code>
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Écoles dans le réseau</p>
              <p className="font-bold">{ecoles.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {ecoles.filter((e) => e.status === "active").length} actives
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </SettingsSection>
  );
}
