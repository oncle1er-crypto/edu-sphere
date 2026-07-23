import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { ReportExportButtons } from "@/components/reports/ReportExportButtons";
import { useEcoleInfo } from "@/pages/services-ponctuels/hooks/useEcoleInfo";

const fmt = (n: number) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;
const today = () => new Date().toISOString().slice(0, 10);

const MODE_LABEL: Record<string, string> = {
  especes: "Espèces",
  virement: "Virement",
  cheque: "Chèque",
  mobile_money: "Mobile money",
  wave: "Wave",
  orange_money: "Orange money",
  mtn_money: "MTN money",
  moov_money: "Moov money",
  autre: "Autre",
};

interface Ligne {
  id: string;
  date_paiement: string;
  montant: number;
  mode: string;
  reference: string | null;
  facture_numero: string;
  facture_libelle: string;
  eleve: string;
  classe: string;
}

export default function ServicePointCaisse({
  categorie,
  moduleLabel,
}: {
  categorie: "cantine" | "transport";
  moduleLabel: string;
}) {
  const { ecoleId } = useEcoleId();
  const ecole = useEcoleInfo();
  const [from, setFrom] = useState<string>(today());
  const [to, setTo] = useState<string>(today());
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("paiements")
        .select("id, date_paiement, montant, mode, reference, factures!inner(numero, libelle, categorie, eleves(nom, prenom, classes(nom)))")
        .eq("ecole_id", ecoleId)
        .eq("factures.categorie", categorie)
        .is("annule_le", null)
        .gte("date_paiement", from)
        .lte("date_paiement", `${to}T23:59:59`)
        .order("date_paiement", { ascending: false })
        .limit(1000);
      setLignes(((data ?? []) as any[]).map((p) => ({
        id: p.id,
        date_paiement: p.date_paiement,
        montant: Number(p.montant),
        mode: p.mode || "autre",
        reference: p.reference,
        facture_numero: p.factures?.numero ?? "—",
        facture_libelle: p.factures?.libelle ?? "—",
        eleve: p.factures?.eleves ? `${p.factures.eleves.nom} ${p.factures.eleves.prenom}` : "—",
        classe: p.factures?.eleves?.classes?.nom ?? "—",
      })));
      setLoading(false);
    })();
  }, [ecoleId, categorie, from, to]);

  const total = lignes.reduce((s, l) => s + l.montant, 0);

  const parMode = useMemo(() => {
    const m: Record<string, { total: number; count: number }> = {};
    for (const p of lignes) {
      const k = p.mode || "autre";
      m[k] ??= { total: 0, count: 0 };
      m[k].total += p.montant;
      m[k].count += 1;
    }
    return m;
  }, [lignes]);

  const parClasse = useMemo(() => {
    const m: Record<string, { total: number; count: number }> = {};
    for (const p of lignes) {
      const k = p.classe;
      m[k] ??= { total: 0, count: 0 };
      m[k].total += p.montant;
      m[k].count += 1;
    }
    return m;
  }, [lignes]);

  const setToday = () => { setFrom(today()); setTo(today()); };
  const setYesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = d.toISOString().slice(0, 10); setFrom(s); setTo(s); };
  const setWeek = () => { const d = new Date(); const day = (d.getDay() + 6) % 7; const start = new Date(d); start.setDate(d.getDate() - day); setFrom(start.toISOString().slice(0, 10)); setTo(today()); };
  const setMonth = () => { const d = new Date(); setFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)); setTo(today()); };

  const periodeLabel = from === to ? `Journée du ${from}` : `Du ${from} au ${to}`;
  const sousTitre = `Point de caisse — ${periodeLabel} · ${lignes.length} opération(s) · Total : ${fmt(total)}`;

  const columns = ["Date", "N° Facture", "Élève", "Classe", "Libellé", "Mode", "Référence", "Montant"];
  const getRows = () => lignes.map((p) => [
    p.date_paiement.slice(0, 10),
    p.facture_numero,
    p.eleve,
    p.classe,
    p.facture_libelle,
    MODE_LABEL[p.mode] ?? p.mode,
    p.reference ?? "",
    p.montant,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Point de caisse journalier</h2>
          <p className="text-sm text-muted-foreground">Encaissements {moduleLabel} sur la période choisie.</p>
        </div>
        <ReportExportButtons
          title={`Point de caisse — ${moduleLabel} (${periodeLabel})`}
          filename={`point-caisse-${categorie}-${from}_${to}`}
          columns={columns}
          getRows={getRows}
          ecole={ecole}
          sousTitre={sousTitre}
          orientation="landscape"
          disabled={loading || lignes.length === 0}
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
              <TableHead>Date</TableHead><TableHead>N° Facture</TableHead><TableHead>Élève</TableHead>
              <TableHead>Classe</TableHead><TableHead>Libellé</TableHead><TableHead>Mode</TableHead>
              <TableHead>Référence</TableHead><TableHead className="text-right">Montant</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={8} className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></TableCell></TableRow>}
              {!loading && lignes.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">Aucun paiement sur la période.</TableCell></TableRow>}
              {lignes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{p.date_paiement.slice(0, 10)}</TableCell>
                  <TableCell className="font-mono text-xs">{p.facture_numero}</TableCell>
                  <TableCell className="font-medium">{p.eleve}</TableCell>
                  <TableCell>{p.classe}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{p.facture_libelle}</TableCell>
                  <TableCell>{MODE_LABEL[p.mode] ?? p.mode}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.reference ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-600">{fmt(p.montant)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
