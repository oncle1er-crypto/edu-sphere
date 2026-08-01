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
    const blank = (n: number) => Array(n).fill("");
    const columns = ["FICHE DE SUIVI DE TRÉSORERIE", ...data.mois.map((m) => m.label), "TOTAL"];
    const line = (l: BilanLigne) => [l.libelle, ...l.valeurs.map((v) => v), l.total];
    const rows: (string | number)[][] = [
      ["ENTRÉES", ...blank(nb + 1)],
      ...data.entrees.map(line),
      line(data.totalEntrees),
      ["SORTIES", ...blank(nb + 1)],
      ...data.sorties.map(line),
      line(data.totalSorties),
      line(data.solde),
      line(data.soldeCumuleLigne),
      ["", ...blank(nb + 1)],
      ["BILAN DE LA PÉRIODE", ...blank(nb + 1)],
      ["Total entrées", ...blank(nb), data.bilan.entrees],
      ["Total sorties", ...blank(nb), data.bilan.sorties],
      ["Résultat net (entrées - sorties)", ...blank(nb), data.bilan.net],
      ["Solde d'ouverture", ...blank(nb), data.bilan.ouverture],
      ["Solde de clôture", ...blank(nb), data.bilan.cloture],
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
        grandTotal: data.bilan.cloture,
        grandTotalLabel: "SOLDE DE CAISSE (CLÔTURE)",
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

  const Row = ({ l, variant }: { l: BilanLigne; variant?: "total" | "solde" | "cumul" }) => {
    const showZero = variant === "solde" || variant === "cumul";
    const v0 = (v: number) => (showZero ? Math.round(v).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ") : fmt(v));
    return (
    <tr
      className={
        variant === "total"
          ? "bg-muted/60 font-bold"
          : variant === "solde"
            ? "bg-primary/10 font-bold text-primary"
            : variant === "cumul"
              ? "bg-primary/20 font-bold text-primary border-t border-primary/30"
              : "hover:bg-muted/30"
      }
    >
      <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-left whitespace-nowrap max-w-[320px] truncate" title={l.libelle}>
        {l.libelle}
      </td>
      {l.valeurs.map((v, i) => (
        <td key={i} className="px-2 py-2 text-right tabular-nums whitespace-nowrap">
          {v0(v)}
        </td>
      ))}
      <td className="px-3 py-2 text-right tabular-nums font-bold bg-accent/20 whitespace-nowrap">{v0(l.total)}</td>
    </tr>
    );
  };

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
              <Row l={data.soldeCumuleLigne} variant="cumul" />
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-primary text-primary-foreground px-3 py-2 text-xs font-bold uppercase tracking-widest">
              Bilan de la période
            </div>
            <table className="w-full text-xs">
              <tbody>
                {[
                  { l: "Solde d'ouverture", v: data.bilan.ouverture },
                  { l: "Total entrées", v: data.bilan.entrees },
                  { l: "Total sorties", v: data.bilan.sorties },
                  { l: "Résultat net (entrées − sorties)", v: data.bilan.net, strong: true },
                  { l: "Solde de clôture", v: data.bilan.cloture, strong: true },
                ].map((r) => (
                  <tr key={r.l} className={r.strong ? "bg-primary/10 font-bold text-primary" : "border-t"}>
                    <td className="px-3 py-2">{r.l}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {Math.round(r.v).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")} FCFA
                    </td>
                  </tr>
                ))}
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
          L'exercice couvre les {data.moisExercice.length} mois de l'année scolaire, y compris les mois
          d'inscriptions anticipées précédant la rentrée. Les entrées correspondent aux encaissements réels
          (hors remises), ventilés par ordre de priorité : inscription → scolarité → frais annexes
          (uniformes puis activités extrascolaires).
        </p>
      </SettingsSection>
    </div>
  );
}
