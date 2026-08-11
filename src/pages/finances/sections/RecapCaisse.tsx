import { useState } from "react";
import { Wallet, CalendarRange, Eye, Download, Loader2, ListChecks } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRecapCaisse, type RecapCaissePeriode } from "@/hooks/useRecapCaisse";
import { useNiveau } from "@/context/NiveauContext";
import { useEcoleInfo } from "@/pages/services-ponctuels/hooks/useEcoleInfo";
import { generateRecapCaisseJournalier, type RecapCaisseOptions } from "@/lib/generateFinanceReports";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

const todayIso = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number) =>
  n === 0 ? "-" : Math.round(n).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ");

type Vue = "jour" | "semaine";

export default function RecapCaisse() {
  const { isGlobal, label: niveauLabel } = useNiveau();
  const ecole = useEcoleInfo();
  const [vue, setVue] = useState<Vue>("jour");
  const [date, setDate] = useState(todayIso());
  const [avecDetail, setAvecDetail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  const periode: RecapCaissePeriode = vue === "jour" ? { mode: "jour", date } : { mode: "semaine", date };
  const { data, isLoading } = useRecapCaisse(periode);

  const closePreview = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setPreviewTitle("");
  };

  const run = async (previewOnly: boolean) => {
    if (!data) return;
    setBusy(true);
    try {
      const meta = {
        nom: ecole?.nom ?? "École",
        adresse: ecole?.adresse,
        telephone: ecole?.telephone,
        email: ecole?.email,
        logoUrl: ecole?.logo_url,
      };
      const opts: RecapCaisseOptions = {
        periodeLabel: data.periodeLabel,
        titre: vue === "jour" ? "Récapitulatif de caisse — Journée" : "Récapitulatif de caisse — Semaine",
        filenameSuffix: vue === "jour" ? date : `semaine_${data.from}_au_${data.to}`,
        avecDetail,
        niveauLabel: isGlobal ? null : niveauLabel,
      };
      const payload = { sources: data.sources, depenses: data.depenses };
      if (previewOnly) {
        const pdf = await generateRecapCaisseJournalier(meta, opts, payload, true);
        if (pdf) {
          const url = URL.createObjectURL((pdf as any).output("blob"));
          setPreviewTitle(`Récapitulatif de caisse — ${data.periodeLabel}`);
          setPdfUrl(url);
        }
      } else {
        await generateRecapCaisseJournalier(meta, opts, payload);
        toast.success("Récapitulatif de caisse téléchargé");
      }
    } catch (e) {
      toast.error("Erreur : " + messageErreurBase(e));
    } finally {
      setBusy(false);
    }
  };

  const entrees = data?.sources.filter((s) => !s.estRemise) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total encaissé</p>
            <p className="text-xl font-bold font-display mt-1 text-[hsl(152_55%_36%)]">{fmt(data?.totalEncaisse ?? 0)} FCFA</p>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Remises &amp; bourses</p>
            <p className="text-xl font-bold font-display mt-1 text-rose-600">{fmt(data?.totalRemises ?? 0)} FCFA</p>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Dépenses</p>
            <p className="text-xl font-bold font-display mt-1 text-destructive">{fmt(data?.totalDepenses ?? 0)} FCFA</p>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Solde net de caisse</p>
            <p className={`text-xl font-bold font-display mt-1 ${(data?.soldeNet ?? 0) >= 0 ? "text-[hsl(152_55%_36%)]" : "text-destructive"}`}>
              {fmt(data?.soldeNet ?? 0)} FCFA
            </p>
          </CardContent>
        </Card>
      </div>

      <SettingsSection
        title="Récapitulatif de caisse"
        description={`Document de clôture de caisse imprimable, pour un jour ou une semaine, avec ou sans détail des opérations. ${
          isGlobal ? "" : `Niveau : ${niveauLabel}.`
        }`}
        icon={<Wallet className="h-5 w-5" />}
        hideSave
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <CalendarRange className="h-3.5 w-3.5" />Période
              </Label>
              <Select value={vue} onValueChange={(v) => setVue(v as Vue)}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="jour">Un jour</SelectItem>
                  <SelectItem value="semaine">Une semaine</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{vue === "jour" ? "Date" : "Une date dans la semaine"}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayIso()} className="w-[180px]" />
            </div>

            <div className="flex items-center gap-2 pb-1.5">
              <Switch id="avec-detail" checked={avecDetail} onCheckedChange={setAvecDetail} />
              <Label htmlFor="avec-detail" className="text-xs cursor-pointer">
                {avecDetail ? "Avec détail des opérations" : "Sans détail (totaux uniquement)"}
              </Label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy || isLoading || !data} onClick={() => run(true)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}Aperçu
            </Button>
            <Button size="sm" disabled={busy || isLoading || !data} onClick={() => run(false)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Imprimer / PDF
            </Button>
          </div>
        </div>

        {data && (
          <p className="text-[11px] text-muted-foreground">
            Période affichée : <span className="font-semibold">{data.periodeLabel}</span> · {data.nbEncaissements} opération{data.nbEncaissements > 1 ? "s" : ""}.
          </p>
        )}

        {isLoading || !data ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-primary text-primary-foreground px-3 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5" />Entrées par catégorie
            </div>
            <table className="w-full text-xs">
              <tbody>
                {entrees.length === 0 && (
                  <tr><td className="px-3 py-4 text-center text-muted-foreground">Aucun encaissement sur la période.</td></tr>
                )}
                {entrees.map((s) => (
                  <tr key={s.source} className="border-t">
                    <td className="px-3 py-2">{s.libelle}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{s.nb} op.</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(s.total)} FCFA</td>
                  </tr>
                ))}
                <tr className="bg-muted/60 font-bold border-t">
                  <td className="px-3 py-2">TOTAL ENCAISSÉ</td>
                  <td className="px-3 py-2 text-right">{data.nbEncaissements} op.</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(data.totalEncaisse)} FCFA</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          « Avec détail » liste chaque opération (bénéficiaire, matricule, mode, référence, montant) dans le PDF ;
          « Sans détail » n'imprime que les sous-totaux par catégorie. Les dépenses prises en compte sont uniquement
          celles déjà validées, comme dans le Bilan comptable et le Grand livre.
        </p>
      </SettingsSection>

      <Dialog open={!!pdfUrl} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>{previewTitle}</DialogTitle></DialogHeader>
          <div className="flex-1 min-h-0">
            {pdfUrl ? (
              <iframe src={pdfUrl} className="w-full h-full rounded border" title="Aperçu du récapitulatif de caisse" />
            ) : (
              <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
