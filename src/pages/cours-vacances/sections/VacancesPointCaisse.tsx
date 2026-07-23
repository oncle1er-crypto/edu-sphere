import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVacancesData } from "../hooks/useVacances";
import { ReportExportButtons } from "@/components/reports/ReportExportButtons";
import { useEcoleInfo } from "@/pages/services-ponctuels/hooks/useEcoleInfo";
import { Wallet } from "lucide-react";

const fmt = (n: number) => `${Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
const today = () => new Date().toISOString().slice(0, 10);

const MODE_LABEL: Record<string, string> = {
  especes: "Espèces",
  mobile_money: "Mobile money",
  virement: "Virement",
  autre: "Autre",
};

export default function VacancesPointCaisse() {
  const { classes, eleves, paiements, loading } = useVacancesData();
  const ecole = useEcoleInfo();
  const [from, setFrom] = useState<string>(today());
  const [to, setTo] = useState<string>(today());

  const classeNom = (id: string) => classes.find((c) => c.id === id)?.nom ?? "—";
  const eleveNom = (id: string) => { const e = eleves.find((x) => x.id === id); return e ? `${e.nom} ${e.prenom}` : "—"; };

  const inRange = (d: string) => {
    if (!d) return false;
    const t = new Date(d + (d.length === 10 ? "T00:00:00" : "")).getTime();
    if (from && t < new Date(from + "T00:00:00").getTime()) return false;
    if (to && t > new Date(to + "T23:59:59").getTime()) return false;
    return true;
  };

  const lignes = useMemo(
    () => paiements
      .filter((p) => inRange(p.date_paiement))
      .sort((a, b) => (a.date_paiement < b.date_paiement ? -1 : 1)),
    [paiements, from, to],
  );

  const total = lignes.reduce((s, p) => s + Number(p.montant_paye), 0);
  const parMode = useMemo(() => {
    const m: Record<string, { total: number; count: number }> = {};
    for (const p of lignes) {
      const k = p.mode || "autre";
      m[k] ??= { total: 0, count: 0 };
      m[k].total += Number(p.montant_paye);
      m[k].count += 1;
    }
    return m;
  }, [lignes]);
  const parClasse = useMemo(() => {
    const m: Record<string, { total: number; count: number }> = {};
    for (const p of lignes) {
      const k = classeNom(p.classe_id);
      m[k] ??= { total: 0, count: 0 };
      m[k].total += Number(p.montant_paye);
      m[k].count += 1;
    }
    return m;
  }, [lignes, classes]);

  const setToday = () => { setFrom(today()); setTo(today()); };
  const setYesterday = () => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    const s = d.toISOString().slice(0, 10); setFrom(s); setTo(s);
  };
  const setWeek = () => {
    const d = new Date(); const day = (d.getDay() + 6) % 7;
    const start = new Date(d); start.setDate(d.getDate() - day);
    setFrom(start.toISOString().slice(0, 10)); setTo(today());
  };
  const setMonth = () => {
    const d = new Date();
    setFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10));
    setTo(today());
  };

  const periodeLabel = from === to ? `Journée du ${from}` : `Du ${from} au ${to}`;
  const sousTitre = `Point de caisse — ${periodeLabel} · ${lignes.length} opération(s) · Total : ${fmt(total)}`;

  const columns = ["Date", "Élève", "Classe", "Mode", "Attendu", "Payé", "Statut", "Observation"];
  const getRows = () => lignes.map((p) => [
    p.date_paiement,
    eleveNom(p.eleve_id),
    classeNom(p.classe_id),
    MODE_LABEL[p.mode] ?? p.mode,
    Number(p.montant_attendu),
    Number(p.montant_paye),
    p.statut,
    p.observation ?? "",
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Point de caisse journalier</h2>
          <p className="text-sm text-muted-foreground">Consultez et imprimez les encaissements de la période choisie.</p>
        </div>
        <ReportExportButtons
          title={`Point de caisse — Cours de vacances (${periodeLabel})`}
          filename={`point-caisse-vacances-${from}_${to}`}
          columns={columns}
          getRows={getRows}
          ecole={ecole}
          sousTitre={sousTitre}
          orientation="landscape"
          disabled={loading || lignes.length === 0}
          pdfSummary={{
            modes: Object.entries(parMode).map(([k, v]) => ({
              label: MODE_LABEL[k] ?? k,
              count: v.count,
              total: v.total,
            })),
            grandTotal: total,
            grandTotalLabel: "TOTAL ENCAISSÉ — COURS DE VACANCES",
            operationsCount: lignes.length,
          }}
        />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Période</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="sm:col-span-2 flex items-end gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={setToday}>Aujourd'hui</Button>
            <Button variant="outline" size="sm" onClick={setYesterday}>Hier</Button>
            <Button variant="outline" size="sm" onClick={setWeek}>Cette semaine</Button>
            <Button variant="outline" size="sm" onClick={setMonth}>Ce mois</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total encaissé</p><p className="text-2xl font-bold text-emerald-600 mt-1">{fmt(total)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Opérations</p><p className="text-2xl font-bold mt-1">{lignes.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Période</p><p className="text-sm font-medium mt-1">{periodeLabel}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Par mode de paiement</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Mode</TableHead><TableHead className="text-right">Nb</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {Object.entries(parMode).length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground">Aucun encaissement.</TableCell></TableRow>}
                {Object.entries(parMode).map(([k, v]) => (
                  <TableRow key={k}><TableCell>{MODE_LABEL[k] ?? k}</TableCell><TableCell className="text-right">{v.count}</TableCell><TableCell className="text-right font-semibold">{fmt(v.total)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Par classe</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Classe</TableHead><TableHead className="text-right">Nb</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {Object.entries(parClasse).length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground">Aucun encaissement.</TableCell></TableRow>}
                {Object.entries(parClasse).map(([k, v]) => (
                  <TableRow key={k}><TableCell>{k}</TableCell><TableCell className="text-right">{v.count}</TableCell><TableCell className="text-right font-semibold">{fmt(v.total)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Détail des opérations</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Élève</TableHead><TableHead>Classe</TableHead>
              <TableHead>Mode</TableHead><TableHead className="text-right">Attendu</TableHead>
              <TableHead className="text-right">Payé</TableHead><TableHead>Statut</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={7} className="text-center text-sm py-4">Chargement…</TableCell></TableRow>}
              {!loading && lignes.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">Aucun paiement sur la période.</TableCell></TableRow>}
              {lignes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.date_paiement}</TableCell>
                  <TableCell className="font-medium">{eleveNom(p.eleve_id)}</TableCell>
                  <TableCell>{classeNom(p.classe_id)}</TableCell>
                  <TableCell>{MODE_LABEL[p.mode] ?? p.mode}</TableCell>
                  <TableCell className="text-right">{fmt(Number(p.montant_attendu))}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(Number(p.montant_paye))}</TableCell>
                  <TableCell className="capitalize">{p.statut}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            {lignes.length > 0 && (
              <TableFooter>
                <TableRow><TableCell colSpan={5} className="text-right font-bold">Total encaissé</TableCell><TableCell className="text-right font-bold text-emerald-600">{fmt(total)}</TableCell><TableCell /></TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
