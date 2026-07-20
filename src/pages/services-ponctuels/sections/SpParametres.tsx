import SpCatalogue from "./SpCatalogue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SpParametres() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Paramètres — Services ponctuels</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Modifiez ci-dessous les tarifs, couleurs, icônes et disponibilité des services. L'ajout de nouveaux services se fait également ici, sans modification de code.
        </CardContent>
      </Card>
      <SpCatalogue />
    </div>
  );
}
