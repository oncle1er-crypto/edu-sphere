import { Database, Download, Upload, RefreshCw, Trash2, FileSpreadsheet, FileJson } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const backups = [
  { date: "24/04/2026 03:00", size: "12.4 Mo", type: "Auto" },
  { date: "23/04/2026 03:00", size: "12.3 Mo", type: "Auto" },
  { date: "22/04/2026 14:32", size: "12.1 Mo", type: "Manuel" },
  { date: "22/04/2026 03:00", size: "12.0 Mo", type: "Auto" },
];

export default function BackupSettings() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Sauvegarde automatique"
        description="Vos données sont protégées et sauvegardées régulièrement."
        icon={<Database className="h-5 w-5" />}
      >
        <FieldRow label="Sauvegarde automatique">
          <Switch defaultChecked />
        </FieldRow>
        <FieldRow label="Fréquence">
          <Select defaultValue="daily">
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Toutes les heures</SelectItem>
              <SelectItem value="daily">Quotidienne</SelectItem>
              <SelectItem value="weekly">Hebdomadaire</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="Conservation" hint="Durée pendant laquelle les sauvegardes sont gardées">
          <Select defaultValue="30">
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 jours</SelectItem>
              <SelectItem value="30">30 jours</SelectItem>
              <SelectItem value="90">90 jours</SelectItem>
              <SelectItem value="365">1 an</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        title="Sauvegardes récentes"
        description="Téléchargez ou restaurez une sauvegarde existante."
        icon={<Database className="h-5 w-5" />}
        hideSave
      >
        <div className="flex justify-end mb-3">
          <Button>
            <RefreshCw className="h-4 w-4" />
            Sauvegarder maintenant
          </Button>
        </div>
        <div className="border rounded-lg divide-y">
          {backups.map((b, i) => (
            <div key={i} className="flex items-center justify-between p-3 hover:bg-muted/30">
              <div>
                <div className="text-sm font-medium">{b.date}</div>
                <div className="text-xs text-muted-foreground">{b.size}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={b.type === "Auto" ? "secondary" : "outline"}>{b.type}</Badge>
                <Button size="sm" variant="ghost"><Download className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost"><RefreshCw className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Export & import de données"
        description="Exportez vos données ou importez en masse depuis un fichier."
        icon={<Database className="h-5 w-5" />}
        hideSave
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="p-4">
            <FileSpreadsheet className="h-6 w-6 text-success mb-2" />
            <h3 className="font-semibold text-sm">Export Excel</h3>
            <p className="text-xs text-muted-foreground mt-1">Élèves, notes, paiements (.xlsx)</p>
            <Button size="sm" variant="outline" className="mt-3"><Download className="h-4 w-4" />Exporter</Button>
          </Card>
          <Card className="p-4">
            <FileJson className="h-6 w-6 text-info mb-2" />
            <h3 className="font-semibold text-sm">Export complet (JSON)</h3>
            <p className="text-xs text-muted-foreground mt-1">Toutes vos données structurées</p>
            <Button size="sm" variant="outline" className="mt-3"><Download className="h-4 w-4" />Exporter</Button>
          </Card>
          <Card className="p-4">
            <Upload className="h-6 w-6 text-primary mb-2" />
            <h3 className="font-semibold text-sm">Importer des élèves</h3>
            <p className="text-xs text-muted-foreground mt-1">Fichier CSV / Excel</p>
            <Button size="sm" variant="outline" className="mt-3"><Upload className="h-4 w-4" />Importer</Button>
          </Card>
          <Card className="p-4 border-destructive/30">
            <Trash2 className="h-6 w-6 text-destructive mb-2" />
            <h3 className="font-semibold text-sm">Purge des données obsolètes</h3>
            <p className="text-xs text-muted-foreground mt-1">Élèves diplômés depuis +5 ans</p>
            <Button size="sm" variant="outline" className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />Purger
            </Button>
          </Card>
        </div>
      </SettingsSection>
    </div>
  );
}
