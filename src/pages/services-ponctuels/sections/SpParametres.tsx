import SpCatalogue from "./SpCatalogue";
import SpTestSessionsConfig from "./SpTestSessionsConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SpParametres() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Paramètres — Services ponctuels</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Configurez ici les tarifs, la disponibilité des services, et planifiez à l'avance les sessions de tests d'entrée. Les sessions apparaîtront automatiquement dans le formulaire candidat.
        </CardContent>
      </Card>
      <SpTestSessionsConfig />
      <SpCatalogue />
    </div>
  );
}
