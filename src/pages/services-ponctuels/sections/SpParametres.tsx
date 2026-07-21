import SpCatalogue from "./SpCatalogue";
import SpTestSessionsConfig from "./SpTestSessionsConfig";
import SpStockTenuesConfig from "./SpStockTenuesConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SpParametres() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Paramètres — Services ponctuels</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Configurez ici les tarifs, la disponibilité des services, les sessions de tests d'entrée et le stock de tenues par classe.
        </CardContent>
      </Card>
      <SpTestSessionsConfig />
      <SpStockTenuesConfig />
      <SpCatalogue />
    </div>
  );
}
