import { useMemo, useState } from "react";
import { FileSpreadsheet, Loader2, Download, CalendarRange } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBilanComptable, type BilanLigne, type BilanPeriode } from "@/hooks/useBilanComptable";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { useEcoleInfo } from "@/pages/services-ponctuels/hooks/useEcoleInfo";
import { exportRowsCSV, exportRowsXLSX, exportRowsPDF } from "@/lib/reports/exporters";

const fmt = (n: number) =>
  n === 0 ? "-" : Math.round(n).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ");

type Vue = "annee" | "trimestre" | "mois";

export default function BalanceSheet() {
  const { activeAnnee } = useAcademicPeriod();
  const ecole = useEcoleInfo();
  const [busy, setBusy] = useState(false);
  const [vue, setVue] = useState<Vue>("annee");
  const [index, setIndex] = useState(0);

  const periode: BilanPeriode = useMemo(
    () => (vue === "annee" ? { mode: "annee" } : { mode: vue, index }),
    [vue, index],
  );

  const { data, isLoading } = useBilanComptable(periode);

  const periodeLabel = useMemo(() => {
    if (!data) return "";
    if (vue === "annee") return "Exercice complet";
    if (vue === "trimestre") return data.trimestres[index]?.label ?? "";
    return data.moisExercice[index]?.label ?? "";
  }, [data, vue, index]);

  const exportPayload = useMemo(() => {
    if (!data) return null;
    const nb = data.mois.length;
    const columns = ["FICHE DE SUIVI DE TRÉSORERIE", ...data.mois.map((m) => m.label), "TOTAL"];
    const line = (l: BilanLigne) => [l.libelle, ...l.valeurs.map((v) => v), l.total];
    const rows: (string | number)[][] = [
      ["ENTRÉES", ...Array(nb + 1).fill("")],
      ...data.entrees.map(line),
      line(data.totalEntrees),
      ["SORTIES", ...Array(nb + 1).fill("")],
      ...data.sorties.map(line),
      line(data.totalSorties),
      line(data.solde),
    ];
    return {
      title: "Bilan comptable — Fiche de suivi de trésorerie",
      filename: `bilan_comptable_${activeAnnee?.libelle ?? ""}`.replace(/\s/g, "_"),
      sousTitre: [activeAnnee ? `Année scolaire ${activeAnnee.libelle}` : null, periodeLabel]
        .filter(Boolean)
        .join(" · "),
      columns,
      rows,
      ecole,
      orientation: "landscape" as const,
      pdfSummary: {
        grandTotal: data.solde.total,
        grandTotalLabel: "SOLDE DE CAISSE",
      },
    };
  }, [data, activeAnnee, ecole, periodeLabel]);

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

  const colSpan = data.mois.length + 2;

  const Row = ({ l, variant }: { l: BilanLigne; variant?: "total" | "solde" }) => (
    <tr
      className={
        variant === "total"
          ? "bg-muted/60 font-bold"
          : variant === "solde"
            ? "bg-primary/10 font-bold text-primary"
            : "hover:bg-muted/30"
      }
    >
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total entrées", value: data.totalEntrees.total, cls: "text-primary" },
          { label: "Total sorties", value: data.totalSorties.total, cls: "text-destructive" },
          { label: "Solde de caisse", value: data.solde.total, cls: data.solde.total >= 0 ? "text-primary" : "text-destructive" },
        ].map((k) => (
          <Card key={k.label} className="border">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</p>
              <p className={`text-2xl font-bold font-display mt-1 ${k.cls}`}>{fmt(k.value)} FCFA</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SettingsSection
        title="Bilan comptable — Fiche de suivi de trésorerie"
        description={`Entrées ventilées (inscription, scolarité, annexes) et sorties par catégorie de dépense. ${
          activeAnnee ? `Année ${activeAnnee.libelle}.` : ""
        }`}
        icon={<FileSpreadsheet className="h-5 w-5" />}
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
                  <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {data.trimestres.map((t, i) => (
                      <SelectItem key={t.label} value={String(i)}>{t.label}</SelectItem>
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
                      <SelectItem key={m.key} value={String(i)}>
                        {m.label} {m.key.slice(0, 4)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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

        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="sticky left-0 z-10 bg-primary px-3 py-2.5 text-left whitespace-nowrap">
                  FICHE DE SUIVI DE TRÉSORERIE
                </th>
                {data.mois.map((m) => (
                  <th key={m.key} className="px-2 py-2.5 text-right whitespace-nowrap">{m.court}</th>
                ))}
                <th className="px-3 py-2.5 text-right whitespace-nowrap">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-accent/40">
                <td colSpan={colSpan} className="px-3 py-1.5 font-bold uppercase text-[11px] tracking-widest">Entrées</td>
              </tr>
              {data.entrees.map((l) => <Row key={l.libelle} l={l} />)}
              <Row l={data.totalEntrees} variant="total" />

              <tr className="bg-accent/40">
                <td colSpan={colSpan} className="px-3 py-1.5 font-bold uppercase text-[11px] tracking-widest">Sorties</td>
              </tr>
              {data.sorties.length === 0 && (
                <tr><td colSpan={colSpan} className="px-3 py-4 text-center text-muted-foreground">Aucune dépense enregistrée sur la période.</td></tr>
              )}
              {data.sorties.map((l) => <Row key={l.libelle} l={l} />)}
              <Row l={data.totalSorties} variant="total" />
              <Row l={data.solde} variant="solde" />
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-muted-foreground">
          L'exercice couvre les {data.moisExercice.length} mois de l'année scolaire, y compris les mois
          d'inscriptions anticipées précédant la rentrée. Les entrées correspondent aux encaissements réels
          (hors remises), ventilés par ordre de priorité : inscription → scolarité → frais annexes
          (uniformes puis activités extrascolaires).
        </p>
      </SettingsSection>
    </div>
  );
}
