import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { QrCode, Download } from "lucide-react";

export default function QrCheckIn() {
  return (
    <SettingsSection
      icon={<QrCode className="h-5 w-5" />}
      title="Pointage QR / Badge"
      description="Configurer le pointage automatique par scan de carte ou QR code."
    >
      <FieldRow label="Mode actif">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Activer le pointage QR</p>
            <p className="text-xs text-muted-foreground">Les élèves scannent leur badge à l'entrée</p>
          </div>
          <Switch defaultChecked />
        </div>
      </FieldRow>
      <FieldRow label="Tolérance retard"><Input type="number" defaultValue={10} className="w-32" /></FieldRow>
      <FieldRow label="Heure limite arrivée"><Input type="time" defaultValue="08:15" className="w-32" /></FieldRow>
      <FieldRow label="Bornes de pointage"><Input defaultValue="Entrée principale, Cantine, Bibliothèque" /></FieldRow>

      <div className="border rounded-lg p-6 text-center bg-muted/30">
        <QrCode className="h-16 w-16 mx-auto text-primary mb-3" />
        <p className="font-medium">Générer les badges QR pour tous les élèves</p>
        <p className="text-xs text-muted-foreground mb-4">PDF imprimable, format carte (8,5 × 5,4 cm)</p>
        <Button><Download className="h-4 w-4" /> Télécharger le lot</Button>
      </div>
    </SettingsSection>
  );
}
