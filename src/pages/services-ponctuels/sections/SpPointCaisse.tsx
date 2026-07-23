import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Wallet } from "lucide-react";
import { ReportExportButtons } from "@/components/reports/ReportExportButtons";
import { useEcoleInfo } from "../hooks/useEcoleInfo";
import { useSpPaiements } from "../hooks/useSpPaiements";
import { useSpVentes } from "../hooks/useSpVentes";
import { useSpServices } from "../hooks/useSpServices";
import { useSpCandidats } from "../hooks/useSpCandidats";
import { useClasses } from "@/hooks/useClasses";

const fmt = (n: number) => `${Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
const today = () => new Date().toISOString().slice(0, 10);

const MODE_LABEL: Record<string, string> = {
  especes: "Espèces", wave: "Wave", orange_money: "Orange Money",
  mtn_money: "MTN Money", moov_money: "Moov Money", virement: "Virement", cheque: "Chèque",
};

type Scope = "tests" | "tenues" | "tous";

export default function SpPointCaisse() {
  const ecole = useEcoleInfo();
  const { paiements, loading: loadingP } = useSpPaiements();
  const { ventes, loading: loadingV } = useSpVentes();
  const { services } = useSpServices();
  const { candidats } = useSpCandidats();
  const { classes } = useClasses();

  const [from, setFrom] = useState<string>(today());
  const [to, setTo] = useState<string>(today());
  const [scope, setScope] = useState<Scope>("tous");

  const servicesMap = useMemo(() => Object.fromEntries(services.map((s) => [s.id, s])), [services]);
  const candidatsMap = useMemo(() => Object.fromEntries(candidats.map((c) => [c.id, c])), [candidats]);
  const classesMap = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c.nom])), [classes]);
  const testServiceId = useMemo(() => services.find((s) => s.slug === "test_entree")?.id, [services]);
  const tenueServiceIds = useMemo(
    () => new Set(services.filter((s) => s.slug === "tenue" || s.gere_stock === true).map((s) => s.id)),
    [services],
  );

  const inRange = (iso: string | null | undefined) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    if (from && t < new Date(from + "T00:00:00").getTime()) return false;
    if (to && t > new Date(to + "T23:59:59").getTime()) return false;
    return true;
  };

  // Lignes normalisées
  type Ligne = {
    id: string; date: string; numero: string; type: "test" | "service" | "tenue";
    libelle: string; beneficiaire: string; classe: string; mode: string;
    montant: number; statut: string;
  };

  const lignesPaiements: Ligne[] = useMemo(() => paiements
    .filter((p) => !p.annule_le && inRange(p.date_paiement))
    .map((p) => {
      const svc = servicesMap[p.service_id];
      const isTest = svc?.slug === "test_entree" || (testServiceId && p.service_id === testServiceId);
      const isTenue = tenueServiceIds.has(p.service_id);
      const cand = p.candidat_id ? candidatsMap[p.candidat_id] : null;
      return {
        id: p.id,
        date: p.date_paiement,
        numero: p.numero,
        type: isTest ? "test" : isTenue ? "tenue" : "service",
        libelle: svc?.nom ?? "Service",
        beneficiaire: p.beneficiaire_libre ?? (cand ? `${cand.nom} ${cand.prenom}` : "—"),
        classe: cand?.classe_demandee ?? "—",
        mode: p.mode_paiement,
        montant: Number(p.montant_paye),
        statut: "Encaissé",
      } as Ligne;
    }), [paiements, servicesMap, candidatsMap, testServiceId, tenueServiceIds, from, to]);

  const lignesVentes: Ligne[] = useMemo(() => ventes
    .filter((v) => v.statut !== "annule" && inRange(v.created_at))
    .map((v) => ({
      id: v.id,
      date: v.created_at,
      numero: v.numero,
      type: "tenue",
      libelle: `Tenue scolaire (x${v.quantite})`,
      beneficiaire: v.acheteur_libre ?? "—",
      classe: v.classe_id ? (classesMap[v.classe_id] ?? "—") : "—",
      mode: v.mode_paiement,
      montant: Number(v.montant_total),
      statut: v.statut,
    })), [ventes, classesMap, from, to]);

  const filtered = useMemo(() => {
    let base: Ligne[] = [];
    if (scope === "tests") base = lignesPaiements.filter((l) => l.type === "test");
    else if (scope === "tenues") base = [...lignesVentes, ...lignesPaiements.filter((l) => l.type === "tenue")];
    else base = [...lignesPaiements, ...lignesVentes];
    return base.sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [scope, lignesPaiements, lignesVentes]);

  const total = filtered.reduce((s, l) => s + l.montant, 0);
  const parMode = useMemo(() => {
    const m: Record<string, { total: number; count: number }> = {};
    for (const l of filtered) {
      const k = l.mode || "autre";
      m[k] ??= { total: 0, count: 0 };
      m[k].total += l.montant; m[k].count += 1;
    }
    return m;
  }, [filtered]);
  const parCategorie = useMemo(() => {
    const m: Record<string, { total: number; count: number }> = {};
    for (const l of filtered) {
      const k = l.type === "test" ? "Tests d'entrée" : l.type === "tenue" ? "Ventes de tenues" : l.libelle;
      m[k] ??= { total: 0, count: 0 };
      m[k].total += l.montant; m[k].count += 1;
    }
    return m;
  }, [filtered]);

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
  const scopeLabel = scope === "tests" ? "Tests d'entrée" : scope === "tenues" ? "Ventes de tenues" : "Toutes caisses SP";
  const sousTitre = `${scopeLabel} — ${periodeLabel} · ${filtered.length} opération(s) · Total : ${fmt(total)}`;

  const columns = ["Date", "N°", "Catégorie", "Libellé", "Bénéficiaire", "Classe", "Mode", "Montant"];
  const getRows = () => filtered.map((l) => [
    new Date(l.date).toLocaleString("fr-FR"),
    l.numero,
    l.type === "test" ? "Test d'entrée" : l.type === "tenue" ? "Vente tenue" : "Service",
    l.libelle,
    l.beneficiaire,
    l.classe,
    MODE_LABEL[l.mode] ?? l.mode,
    l.montant,
  ]);

  const loading = loadingP || loadingV;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Point de caisse — Services ponctuels
          </h2>
          <p className="text-sm text-muted-foreground">
            Consultez et imprimez les encaissements (tests d'entrée, ventes de tenues, autres services) sur la période choisie.
          </p>
        </div>
        <ReportExportButtons
          title={`Point de caisse — ${scopeLabel} (${periodeLabel})`}
          filename={`point-caisse-sp-${scope}-${from}_${to}`}
          columns={columns}
          getRows={getRows}
          ecole={ecole}
          sousTitre={sousTitre}
          orientation="landscape"
          disabled={loading || filtered.length === 0}
          pdfSummary={{
            modes: Object.entries(parMode).map(([k, v]) => ({
              label: MODE_LABEL[k] ?? k,
              count: v.count,
              total: v.total,
            })),
            grandTotal: total,
            grandTotalLabel: `TOTAL ENCAISSÉ — ${scopeLabel.toUpperCase()}`,
            operationsCount: filtered.length,
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

      <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
        <TabsList>
          <TabsTrigger value="tous">Toutes caisses</TabsTrigger>
          <TabsTrigger value="tests">Tests d'entrée</TabsTrigger>
          <TabsTrigger value="tenues">Ventes de tenues</TabsTrigger>
        </TabsList>
        <TabsContent value={scope} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total encaissé</p><p className="text-2xl font-bold text-emerald-600 mt-1">{fmt(total)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Opérations</p><p className="text-2xl font-bold mt-1">{filtered.length}</p></CardContent></Card>
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
              <CardHeader><CardTitle className="text-base">Par catégorie</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Catégorie</TableHead><TableHead className="text-right">Nb</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {Object.entries(parCategorie).length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground">Aucun encaissement.</TableCell></TableRow>}
                    {Object.entries(parCategorie).map(([k, v]) => (
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
                  <TableHead>Date</TableHead><TableHead>N°</TableHead><TableHead>Catégorie</TableHead>
                  <TableHead>Libellé</TableHead><TableHead>Bénéficiaire</TableHead><TableHead>Classe</TableHead>
                  <TableHead>Mode</TableHead><TableHead className="text-right">Montant</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {loading && <TableRow><TableCell colSpan={8} className="text-center text-sm py-4">Chargement…</TableCell></TableRow>}
                  {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">Aucun encaissement sur la période.</TableCell></TableRow>}
                  {filtered.map((l) => (
                    <TableRow key={`${l.type}-${l.id}`}>
                      <TableCell>{new Date(l.date).toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="font-mono text-xs">{l.numero}</TableCell>
                      <TableCell>{l.type === "test" ? "Test d'entrée" : l.type === "tenue" ? "Vente tenue" : "Service"}</TableCell>
                      <TableCell>{l.libelle}</TableCell>
                      <TableCell className="font-medium">{l.beneficiaire}</TableCell>
                      <TableCell>{l.classe}</TableCell>
                      <TableCell>{MODE_LABEL[l.mode] ?? l.mode}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(l.montant)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {filtered.length > 0 && (
                  <TableFooter>
                    <TableRow><TableCell colSpan={7} className="text-right font-bold">Total encaissé</TableCell><TableCell className="text-right font-bold text-emerald-600">{fmt(total)}</TableCell></TableRow>
                  </TableFooter>
                )}
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
