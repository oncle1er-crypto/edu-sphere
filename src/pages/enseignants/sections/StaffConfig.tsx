import { useEffect, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings2, Info, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useRhReferentiels } from "@/hooks/useRhReferentiels";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "sonner";

export default function StaffConfig() {
  const { getNumber, getTexte, updateParametreValeur, updateParametreTexte, loading } = useRhReferentiels();
  const { isAdmin } = useIsAdmin();
  const readOnly = !isAdmin;

  const [jourPaie, setJourPaie] = useState("28");
  const [alerteFinContrat, setAlerteFinContrat] = useState("30");
  const [formatMatricule, setFormatMatricule] = useState("{PREFIXE}-{######}");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    setJourPaie(String(getNumber("adm_jour_paie", 28)));
    setAlerteFinContrat(String(getNumber("adm_alerte_fin_contrat", 30)));
    setFormatMatricule(getTexte("adm_format_matricule", "{PREFIXE}-{######}"));
  }, [loading, getNumber, getTexte]);

  const handleSave = async () => {
    if (readOnly) return;
    const jour = Number(jourPaie);
    const alerte = Number(alerteFinContrat);
    if (!Number.isFinite(jour) || jour < 1 || jour > 31) {
      toast.error("Le jour de paie doit être compris entre 1 et 31.");
      return;
    }
    if (!Number.isFinite(alerte) || alerte < 0) {
      toast.error("Le délai d'alerte doit être un nombre de jours positif.");
      return;
    }
    if (!formatMatricule.trim()) {
      toast.error("Le format des matricules ne peut pas être vide.");
      return;
    }
    setSaving(true);
    const results = await Promise.all([
      updateParametreValeur("adm_jour_paie", jour),
      updateParametreValeur("adm_alerte_fin_contrat", alerte),
      updateParametreTexte("adm_format_matricule", formatMatricule.trim()),
    ]);
    setSaving(false);
    if (results.every(Boolean)) toast.success("Configuration du personnel enregistrée");
  };

  return (
    <SettingsSection
      icon={<Settings2 className="h-5 w-5" />}
      title="Configuration du module"
      description="Paramètres généraux pour la gestion du personnel."
      onSave={handleSave}
      saving={saving}
      hideSave={readOnly}
    >
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Les taux de cotisation (CNPS, CMU, IRPP) et les rubriques de paie se règlent dans{" "}
          <Link to="/parametres/rh-paie" className="font-semibold underline underline-offset-2">
            Paramètres → RH &amp; Paie — Barèmes
          </Link>
          .
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <FieldRow label="Jour de paie mensuel">
            <Input
              type="number"
              min={1}
              max={31}
              value={jourPaie}
              onChange={(e) => setJourPaie(e.target.value)}
              className="w-full sm:w-32"
              disabled={readOnly}
            />
          </FieldRow>
          <FieldRow label="Alerte fin de contrat (jours)">
            <Input
              type="number"
              min={0}
              value={alerteFinContrat}
              onChange={(e) => setAlerteFinContrat(e.target.value)}
              className="w-full sm:w-32"
              disabled={readOnly}
            />
          </FieldRow>
          <FieldRow label="Format des matricules">
            <Input
              value={formatMatricule}
              onChange={(e) => setFormatMatricule(e.target.value)}
              placeholder="{PREFIXE}-{######}"
              disabled={readOnly}
            />
          </FieldRow>
          {readOnly && (
            <p className="text-xs text-muted-foreground">
              Seuls les administrateurs et les directeurs peuvent modifier ces paramètres.
            </p>
          )}
        </>
      )}
    </SettingsSection>
  );
}
