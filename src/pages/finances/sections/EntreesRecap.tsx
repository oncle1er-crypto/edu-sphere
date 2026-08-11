import { useMemo, useState } from "react";
import { ListChecks, Loader2, Download, CalendarRange, LayoutGrid } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEntreesRecap, type RecapLigne, type RecapPeriode, type Granularite } from "@/hooks/useEntreesRecap";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { useNiveau } from "@/context/NiveauContext";
import { useEcoleInfo } from "@/pages/services-ponctuels/hooks/useEcoleInfo";
import { exportRowsCSV, exportRowsXLSX, exportRowsPDF } from "@/lib/reports/exporters";
import type { DateBucket } from "@/lib/dateBuckets";

const fmt = (n: number) =>
  n === 0 ? "-" : Math.round(n).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ");

type Vue = "annee" | "trimestre" | "mois";

const GRANULARITES: { value: Granularite; label: string }[] = [
  { value: "global", label: "Globalisé (un seul total)" },
  { value: "jour", label: "Détaillé par jour" },
  { value: "semaine", label: "Détaillé par semaine" },
  { value: "mois", label: "Détaillé par mois" },
  { value: "trimestre", label: "Détaillé par trimestre" },
];

/** En-tête de colonne compact ; le libellé complet reste en info-bulle. */
function shortHeader(b: DateBucket, granularite: Granularite): string {
  if (granularite === "global") return "Total période";
  if (granularite === "jour") return b.label;
  if (granularite === "semaine") {
    const m = b.key.match(/-W(\d+)/);
    return m ? `S${m[1]}` : b.key;
  }
  if (granularite === "mois") return b.label.slice(0, 4);
  return b.key; // trimestre : T1/T2/T3
}

export default function EntreesRecap() {
  const { activeAnnee } = useAcademicPeriod();
  const { isGlobal, label: niveauLabel } = useNiveau();
  const ecole = useEcoleInfo();
  const [busy, setBusy] = useState(false);
  const [vue, setVue] = useState<Vue>("annee");
  const [index, setIndex] = useState(0);
  const [granularite, setGranularite] = useState<Granularite>("mois");

  const periode: RecapPeriode = useMemo(
    () => (vue === "annee" ? { mode: "annee" } : { mode: vue, index }),
    [vue, index],
  );

  const { data, isLoading } = useEntreesRecap(granularite, periode);

  const exportPayload = useMemo(() => {
    if (!data) return null;
    const nb = data.buckets.length;
    const blank = (n: number) => Array(n).fill("");
    const columns = ["RÉCAPITULATIF DES ENTRÉES", ...data.buckets.map((b) => b.label), "TOTAL"];
    const line = (l: RecapLigne) => [l.libelle, ...l.valeurs, l.total];
    const rows: (string | number)[][] = [
      ...data.lignes.map(line),
      line(data.totalLigne),
      ["", ...blank(nb + 1)],
      ["RÉPARTITION PAR MODE DE PAIEMENT", ...blank(nb + 1)],
      ...data.modes.map((m) => [`${m.label} (${m.count} opérations)`, ...blank(nb), m.total]),
      ["", ...blank(nb + 1)],
      [
        `REMISES / BOURSES ACCORDÉES (${data.remises.nbEleves} élève(s)) — hors trésorerie`,
        ...blank(nb),
        data.remises.total,
      ],
    ];
    return {
      title: "Récapitulatif des entrées",
      filename: `recapitulatif_entrees_${activeAnnee?.libelle ?? ""}`.replace(/\s/g, "_"),
      sousTitre: [
        activeAnnee ? `Année scolaire ${activeAnnee.libelle}` : null,
        data.periodeLabel,
        isGlobal ? null : niveauLabel,
      ]
        .filter(Boolean)
        .join(" · "),
      columns,
      rows,
      ecole,
      orientation: "landscape" as const,
      hideFootTotal: true,
      pdfSummary: {
        grandTotal: data.totalLigne.total,
        grandTotalLabel: "TOTAL DES ENTRÉES",
      },
    };
  }, [data, activeAnnee, ecole, isGlobal, niveauLabel]);

  const run = async (kind: "csv" | "xlsx" | "pdf") => {
    if (!exportPayload) return;
    setBusy(true);
    try {
      if (kind === "csv") exportRowsCSV(exportPayload);
      else if (kind === "xlsx") exportRowsXLSX(exportPayload);
      else await exportRowsPDF(exportPayload);
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
      </div>
    );
  }

  const colSpan = data.buckets.length + 2;

  const Row = ({ l, variant }: { l: RecapLigne; variant?: "total" }) => (
    <tr className={variant === "total" ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted/30"}>
      <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-left whitespace-nowrap max-w-[320px] truncate" title={l.libelle}>
        {l.libelle}
      </td>
      {l.valeurs.map((v, i) => (
        <td key={i} className="px-2 py-2 text-right tabular-nums whitespace-nowrap">
          {fmt(v)}
        </td>
      ))}
      <td className="px-3 py-2 text-right tabular-nums font-bold bg-accent/20 whitespace-nowrap">{fmt(l.total)}</td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total des entrées</p>
            <p className="text-2xl font-bold font-display mt-1 text-primary">{fmt(data.totalLigne.total)} FCFA</p>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Remises / bourses accordées</p>
            <p className="text-2xl font-bold font-display mt-1 text-rose-600">{fmt(data.remises.total)} FCFA</p>
          </CardContent>
        </Card>
      </div>

      <SettingsSection
        title="Récapitulatif des entrées"
        description={`Vue globalisée ou détaillée (jour / semaine / mois / trimestre) de toutes les catégories d'encaissement. ${
          activeAnnee ? `Année ${activeAnnee.libelle}.` : ""
        } ${isGlobal ? "" : `Niveau : ${niveauLabel}.`}`}
        icon={<ListChecks className="h-5 w-5" />}
        hideSave
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <CalendarRange className="h-3.5 w-3.5" />Période
              </Label>
              <Select
                value={vue}
                onValueChange={(v) => {
                  setVue(v as Vue);
                  setIndex(0);
                }}
              >
                <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annee">Exercice complet</SelectItem>
                  <SelectItem value="trimestre">Par trimestre</SelectItem>
                  <SelectItem value="mois">Par mois</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {vue === "trimestre" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Trimestre</Label>
                <Select value={String(index)} onValueChange={(v) => setIndex(Number(v))}>
                  <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {data.trimestresExercice.map((t, i) => (
                      <SelectItem key={t.key + i} value={String(i)}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {vue === "mois" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Mois</Label>
                <Select value={String(index)} onValueChange={(v) => setIndex(Number(v))}>
                  <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {data.moisExercice.map((m, i) => (
                      <SelectItem key={m.key} value={String(i)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5" />Granularité d'affichage
              </Label>
              <Select value={granularite} onValueChange={(v) => setGranularite(v as Granularite)}>
                <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GRANULARITES.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run("csv")}>
              <Download className="h-4 w-4" />CSV
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run("xlsx")}>
              <Download className="h-4 w-4" />Excel
            </Button>
            <Button size="sm" disabled={busy} onClick={() => run("pdf")}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}PDF
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Période affichée : <span className="font-semibold">{data.periodeLabel}</span>
          {data.buckets.length > 1 ? ` · ${data.buckets.length} colonnes` : ""}.
        </p>

        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="sticky left-0 z-10 bg-primary px-3 py-2.5 text-left whitespace-nowrap">
                  RÉCAPITULATIF DES ENTRÉES
                </th>
                {data.buckets.map((b) => (
                  <th key={b.key} className="px-2 py-2.5 text-right whitespace-nowrap" title={b.label}>
                    {shortHeader(b, granularite)}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right whitespace-nowrap">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {data.lignes.length === 0 && (
                <tr><td colSpan={colSpan} className="px-3 py-4 text-center text-muted-foreground">Aucune entrée enregistrée sur la période.</td></tr>
              )}
              {data.lignes.map((l) => <Row key={l.libelle} l={l} />)}
              <Row l={data.totalLigne} variant="total" />
            </tbody>
          </table>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-primary text-primary-foreground px-3 py-2 text-xs font-bold uppercase tracking-widest">
            Répartition par mode de paiement
          </div>
          <table className="w-full text-xs">
            <tbody>
              {data.modes.length === 0 && (
                <tr><td className="px-3 py-4 text-center text-muted-foreground">Aucun encaissement sur la période.</td></tr>
              )}
              {data.modes.map((m) => (
                <tr key={m.label} className="border-t">
                  <td className="px-3 py-2">{m.label}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{m.count} op.</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(m.total)} FCFA</td>
                </tr>
              ))}
              <tr className="bg-muted/60 font-bold border-t">
                <td className="px-3 py-2">TOTAL ENCAISSÉ</td>
                <td className="px-3 py-2 text-right">{data.modes.reduce((s, m) => s + m.count, 0)} op.</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmt(data.modes.reduce((s, m) => s + m.total, 0))} FCFA
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border rounded-lg bg-accent/15 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest">Remises, bourses et prises en charge</p>
            <p className="text-[11px] text-muted-foreground">
              Appliquées sur la ventilation du dû ({data.remises.nbEleves} élève(s)) mais exclues de la trésorerie.
            </p>
          </div>
          <p className="text-xl font-bold font-display text-rose-600">{fmt(data.remises.total)} FCFA</p>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Les entrées correspondent aux encaissements réels (hors remises), ventilés par ordre de priorité :
          inscription → scolarité → frais annexes (uniformes puis activités extrascolaires). La ventilation est
          calculée sur l'historique complet de l'exercice ; seul l'affichage est restreint à la période choisie.
        </p>
      </SettingsSection>
    </div>
  );
}
