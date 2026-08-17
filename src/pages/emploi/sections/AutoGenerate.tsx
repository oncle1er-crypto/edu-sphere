import { messageErreurBase } from "@/lib/dbErrorMessages";
import { useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Wand2, Play, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAnneeId } from "@/hooks/useAnneeId";
import { useTimetableSettings, joursFromSettings } from "@/hooks/useTimetableSettings";
import { timeToMinutes, minutesToTime } from "@/lib/timeSlots";
import {
  generateEmploiDuTemps,
  type GenerateOptions,
  type GenerateReport,
} from "@/lib/generateEmploiDuTemps";

export default function AutoGenerate() {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const { settings } = useTimetableSettings();

  const [heuresMax, setHeuresMax] = useState(6);
  const [respectDispo, setRespectDispo] = useState(true);
  const [eviterTrous, setEviterTrous] = useState(true);
  const [matinLourd, setMatinLourd] = useState(true);
  const [effacer, setEffacer] = useState(false);

  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<GenerateReport | null>(null);

  const buildOptions = (dryRun: boolean): GenerateOptions | null => {
    if (!ecoleId || !anneeId) return null;
    const recreation: [string, string] | undefined =
      settings.duree_recreation_min > 0
        ? [
            settings.recreation_debut,
            minutesToTime(timeToMinutes(settings.recreation_debut) + settings.duree_recreation_min),
          ]
        : undefined;
    return {
      ecoleId,
      anneeId,
      jours: joursFromSettings(settings),
      plageMatin: [settings.heure_debut, settings.pause_dej_debut],
      plageAprem: [settings.pause_dej_fin, settings.heure_fin],
      recreation,
      dureeCreneauMin: settings.duree_creneau_min,
      heuresParJourMax: heuresMax,
      respectDispo,
      eviterTrous,
      matinLourd,
      effacerAvant: effacer,
      dryRun,
    };
  };


  const run = async (dryRun: boolean) => {
    const opts = buildOptions(dryRun);
    if (!opts) {
      toast.error("Année scolaire active introuvable");
      return;
    }
    if (!dryRun && opts.effacerAvant) {
      if (!confirm("Effacer tous les créneaux existants de l'année avant de générer ?")) return;
    }
    setBusy(true);
    setReport(null);
    try {
      const r = await generateEmploiDuTemps(opts);
      setReport(r);
      if (dryRun) {
        toast.success(`Simulation : ${r.placed}/${r.totalAttendu} créneaux placés`);
      } else {
        toast.success(`Génération terminée : ${r.placed} créneaux créés`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur : " + (messageErreurBase(e) ?? "génération échouée"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsSection
      title="Génération automatique"
      description="L'algorithme construit l'emploi du temps en respectant les contraintes (matières × volumes, profs, dispos, salles)."
      icon={<Wand2 className="h-5 w-5" />}
    >
      <FieldRow label="Heures par jour max" hint="Plafond par classe.">
        <Input
          type="number"
          min={1}
          max={10}
          value={heuresMax}
          onChange={(e) => setHeuresMax(parseInt(e.target.value) || 6)}
        />
      </FieldRow>

      <FieldRow label="Durée d'un créneau (min)" hint="Configurable dans l'onglet Configuration.">
        <Input
          type="number"
          value={settings.duree_creneau_min}
          disabled
          readOnly
        />
      </FieldRow>

      <FieldRow label="Pause déjeuner" hint="Configurable dans l'onglet Configuration.">
        <div className="text-sm text-muted-foreground">
          {settings.pause_dej_debut.slice(0,5)} → {settings.pause_dej_fin.slice(0,5)}
        </div>
      </FieldRow>

      {settings.duree_recreation_min > 0 && (
        <FieldRow label="Récréation" hint="Configurable dans l'onglet Configuration.">
          <div className="text-sm text-muted-foreground">
            {settings.recreation_debut.slice(0,5)} → {minutesToTime(timeToMinutes(settings.recreation_debut) + settings.duree_recreation_min).slice(0,5)}
          </div>
        </FieldRow>
      )}

      <FieldRow label="Jours ouvrés" hint="Configurable dans l'onglet Configuration.">
        <div className="text-sm text-muted-foreground">
          {settings.jours_ouvres === "lun-sam" ? "Lundi → Samedi" : "Lundi → Vendredi"}
        </div>
      </FieldRow>



      <FieldRow label="Respecter disponibilités profs">
        <Switch checked={respectDispo} onCheckedChange={setRespectDispo} />
      </FieldRow>

      <FieldRow label="Éviter heures isolées">
        <Switch checked={eviterTrous} onCheckedChange={setEviterTrous} />
      </FieldRow>

      <FieldRow label="Regrouper matières lourdes le matin">
        <Switch checked={matinLourd} onCheckedChange={setMatinLourd} />
      </FieldRow>

      <FieldRow label="Effacer les créneaux existants" hint="Génération à blanc.">
        <Switch checked={effacer} onCheckedChange={setEffacer} />
      </FieldRow>

      <div className="border-t pt-4 flex flex-col sm:flex-row gap-3">
        <Button className="gap-2" disabled={busy} onClick={() => run(false)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Lancer la génération
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => run(true)}>
          Simulation
        </Button>
      </div>

      {report && (
        <div className="bg-muted/40 rounded-lg p-4 text-sm space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            {report.failed.length === 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            )}
            Rapport ({(report.duree_ms / 1000).toFixed(2)}s)
          </div>
          <ul className="space-y-1 text-muted-foreground">
            <li>✓ {report.placed} créneaux placés sur {report.totalAttendu} attendus</li>
            {report.failed.length === 0 ? (
              <li>✓ Tous les volumes horaires respectés</li>
            ) : (
              <li className="text-amber-700">
                ⚠ {report.failed.length} affectations incomplètes
              </li>
            )}
          </ul>
          {report.failed.length > 0 && (
            <div className="max-h-48 overflow-y-auto border rounded p-2 bg-background">
              {report.failed.map((f, i) => (
                <div key={i} className="text-xs py-1 border-b last:border-b-0">
                  <span className="font-medium">{f.classe} / {f.matiere}</span>
                  {" — "}
                  <span className="text-destructive">{f.manquant}h manquantes</span>
                  <span className="text-muted-foreground"> ({f.raison})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SettingsSection>
  );
}
