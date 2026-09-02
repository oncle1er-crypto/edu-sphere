import { useEffect, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Calculator, Loader2, Percent, Landmark, HeartPulse, Building2, Settings2, Award, Bus } from "lucide-react";
import { useRhParametres, type RhParametre } from "@/hooks/useRhParametres";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const fcfa = (n: number) =>
  `${Math.round(n).toLocaleString("fr-FR").replace(/\u202f|\s/g, " ")} FCFA`;

function ParametreRow({
  parametre,
  readOnly,
  onSave,
}: {
  parametre: RhParametre;
  readOnly: boolean;
  onSave: (id: string, valeur: number) => Promise<boolean>;
}) {
  const [value, setValue] = useState(String(parametre.valeur));

  useEffect(() => setValue(String(parametre.valeur)), [parametre.valeur]);

  const suffix =
    parametre.unite === "pourcentage"
      ? "%"
      : parametre.unite === "montant"
        ? "FCFA"
        : parametre.unite === "heures"
          ? "heures"
          : parametre.unite === "jours"
            ? "jours"
            : parametre.unite === "minutes"
              ? "minutes"
              : "";

  const commit = () => {
    const n = Number(value.replace(",", "."));
    if (!Number.isFinite(n) || n === parametre.valeur) {
      setValue(String(parametre.valeur));
      return;
    }
    onSave(parametre.id, n);
  };

  return (
    <FieldRow label={parametre.libelle} hint={parametre.cle}>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="any"
          className="max-w-[160px]"
          value={value}
          disabled={readOnly}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
        />
        {suffix && <span className="text-sm text-muted-foreground shrink-0">{suffix}</span>}
      </div>
    </FieldRow>
  );
}

const TYPE_LABELS: Record<string, string> = {
  gain: "Rubriques — Gains",
  retenue: "Rubriques — Retenues",
  charge_patronale: "Rubriques — Charges patronales",
};

export default function RhPaieSettings() {
  const {
    parametres,
    rubriques,
    baremeIrpp,
    baremeAnciennete,
    loading,
    updateParametre,
    updateRubrique,
    updatePalierAnciennete,
  } = useRhParametres();
  const { isAdmin } = useIsAdmin();
  const readOnly = !isAdmin;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const groupes: { key: string; title: string; description: string; icon: JSX.Element }[] = [
    { key: "primes", title: "Primes", description: "Montants et plafonds des primes, dont la prime de transport.", icon: <Bus className="h-5 w-5" /> },
    { key: "cnps", title: "CNPS", description: "Cotisations sociales (salarié et employeur).", icon: <Landmark className="h-5 w-5" /> },
    { key: "cmu", title: "CMU", description: "Couverture maladie universelle.", icon: <HeartPulse className="h-5 w-5" /> },
    { key: "charges_patronales", title: "Charges patronales", description: "Charges à la charge de l'établissement.", icon: <Building2 className="h-5 w-5" /> },
    { key: "administratif", title: "Paramètres administratifs", description: "Heures, jours et minutes de référence.", icon: <Settings2 className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<Calculator className="h-5 w-5" />}
        title="RH & Paie — Barèmes Côte d'Ivoire"
        description="Taux CNPS/CMU/IRPP préchargés selon la réglementation ivoirienne, entièrement modifiables."
        hideSave
      >
        <div className="flex items-start gap-3 rounded-lg border border-amber-400/60 bg-amber-50 dark:bg-amber-950/30 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 dark:text-amber-200">
            Toute modification s'applique uniquement aux <strong>futurs bulletins générés</strong>. Les
            bulletins déjà validés ou payés ne sont jamais recalculés rétroactivement.
          </p>
        </div>
        {readOnly && (
          <p className="text-xs text-muted-foreground">
            Consultation seule : seuls les administrateurs et directeurs peuvent modifier ces barèmes.
          </p>
        )}
      </SettingsSection>

      {groupes.map((g) => (
        <SettingsSection key={g.key} icon={g.icon} title={g.title} description={g.description} hideSave>
          {(parametres[g.key] ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun paramètre enregistré.</p>
          ) : (
            (parametres[g.key] ?? []).map((p) => (
              <ParametreRow key={p.id} parametre={p} readOnly={readOnly} onSave={updateParametre} />
            ))
          )}
        </SettingsSection>
      ))}

      <SettingsSection
        icon={<Percent className="h-5 w-5" />}
        title="Barème IRPP (impôt progressif sur salaire)"
        description="Tranches mensuelles appliquées au salaire imposable."
        hideSave
      >
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tranche min</TableHead>
                <TableHead>Tranche max</TableHead>
                <TableHead className="text-right">Taux</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baremeIrpp.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap">{fcfa(t.tranche_min)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {t.tranche_max === null ? "et plus" : fcfa(t.tranche_max)}
                  </TableCell>
                  <TableCell className="text-right font-semibold whitespace-nowrap">
                    {t.taux.toFixed(3)} %
                  </TableCell>
                </TableRow>
              ))}
              {baremeIrpp.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">
                    Aucune tranche enregistrée.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={<Award className="h-5 w-5" />}
        title="Barème prime d'ancienneté"
        description="Taux appliqué au salaire de base selon les années de service."
        hideSave
      >
        <div className="border rounded-lg overflow-x-auto max-h-[360px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Années d'ancienneté</TableHead>
                <TableHead className="text-right">Taux appliqué</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baremeAnciennete.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-nowrap">
                    {p.annees_min <= 1
                      ? "0 à 1 an"
                      : `${p.annees_min} à ${p.annees_max ?? p.annees_min} ans`}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Input
                        type="number"
                        step="any"
                        className="max-w-[110px] text-right"
                        defaultValue={String(p.taux)}
                        disabled={readOnly}
                        onBlur={(e) => {
                          const n = Number(e.target.value.replace(",", "."));
                          if (Number.isFinite(n) && n !== p.taux) updatePalierAnciennete(p.id, n);
                        }}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {baremeAnciennete.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-sm text-muted-foreground py-6">
                    Aucun palier enregistré.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SettingsSection>

      <TooltipProvider>
        {(["gain", "retenue", "charge_patronale"] as const).map((type) => (
          <SettingsSection
            key={type}
            icon={<Calculator className="h-5 w-5" />}
            title={TYPE_LABELS[type]}
            description="Activez ou désactivez les rubriques utilisées dans le calcul de la paie."
            hideSave
          >
            <div className="divide-y">
              {(rubriques[type] ?? []).map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{r.libelle}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.imposable ? "Imposable" : "Non imposable"} ·{" "}
                      {r.soumis_cnps ? "Soumis CNPS" : "Hors CNPS"}
                      {r.systeme ? " · Rubrique système" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-xs text-muted-foreground">Active</label>
                    {r.systeme ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Checkbox checked disabled />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Rubrique système, indispensable au calcul</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Checkbox
                        checked={r.active}
                        disabled={readOnly}
                        onCheckedChange={(v) => updateRubrique(r.id, { active: v === true })}
                      />
                    )}
                  </div>
                </div>
              ))}
              {(rubriques[type] ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground py-3">Aucune rubrique enregistrée.</p>
              )}
            </div>
          </SettingsSection>
        ))}
      </TooltipProvider>
    </div>
  );
}
