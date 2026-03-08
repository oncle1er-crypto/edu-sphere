import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">{title}</h1>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Construction className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-semibold font-display text-foreground">Module en cours de développement</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Ce module sera disponible prochainement. Connectez votre backend pour activer toutes les fonctionnalités.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
