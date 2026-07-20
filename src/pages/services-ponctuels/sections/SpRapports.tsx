import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { useSpPaiements } from "../hooks/useSpPaiements";
import { useSpServices } from "../hooks/useSpServices";
import { useSpCandidats } from "../hooks/useSpCandidats";
import { useSpVentes } from "../hooks/useSpVentes";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " FCFA";

function toCsv(rows: (string | number)[][]) {
  return rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

function download(name: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
}

export default function SpRapports() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { paiements } = useSpPaiements();
  const { services } = useSpServices();
  const { candidats } = useSpCandidats();
  const { ventes } = useSpVentes();

  const svcMap = useMemo(() => Object.fromEntries(services.map((s) => [s.id, s])), [services]);

  const inRange = (d: string) => {
    const t = new Date(d).getTime();
    if (from && t < new Date(from + "T00:00:00").getTime()) return false;
    if (to && t > new Date(to + "T23:59:59").getTime()) return false;
    return true;
  };

  const paiementsFiltres = paiements.filter((p) => !p.annule_le && inRange(p.date_paiement));
  const ventesFiltrees = ventes.filter((v) => v.statut !== "annule" && inRange(v.created_at));

  const parService = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of paiementsFiltres) {
      const nom = svcMap[p.service_id]?.nom ?? "—";
      map[nom] = (map[nom] ?? 0) + Number(p.montant_paye);
    }
    return Object.entries(map);
  }, [paiementsFiltres, svcMap]);

  const parMode = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of paiementsFiltres) map[p.mode_paiement] = (map[p.mode_paiement] ?? 0) + Number(p.montant_paye);
    return Object.entries(map);
  }, [paiementsFiltres]);

  const totalRecettes = paiementsFiltres.reduce((s, p) => s + Number(p.montant_paye), 0)
    + ventesFiltrees.reduce((s, v) => s + Number(v.montant_total), 0);

  const exportRecettes = () => {
    const rows: (string | number)[][] = [["N°", "Date", "Service", "Bénéficiaire", "Montant", "Mode"]];
    for (const p of paiementsFiltres) {
      rows.push([p.numero, new Date(p.date_paiement).toLocaleString("fr-FR"), svcMap[p.service_id]?.nom ?? "", p.beneficiaire_libre ?? "", p.montant_paye, p.mode_paiement]);
    }
    download("recettes-services-ponctuels.csv", toCsv(rows));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Filtres</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="flex items-end"><Button variant="outline" onClick={() => { setFrom(""); setTo(""); }}>Réinitialiser</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recettes ({fmt(totalRecettes)})</CardTitle>
          <Button variant="outline" size="sm" onClick={exportRecettes}><Download className="h-4 w-4 mr-1" />Exporter CSV</Button>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Par service</h4>
              <Table>
                <TableHeader><TableRow><TableHead>Service</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>{parService.map(([n, v]) => <TableRow key={n}><TableCell>{n}</TableCell><TableCell className="text-right font-medium">{fmt(v)}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
            <div>
              <h4 className="font-medium mb-2">Par mode de paiement</h4>
              <Table>
                <TableHeader><TableRow><TableHead>Mode</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>{parMode.map(([n, v]) => <TableRow key={n}><TableCell>{n}</TableCell><TableCell className="text-right font-medium">{fmt(v)}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Candidats</p><p className="text-2xl font-bold">{candidats.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Admis</p><p className="text-2xl font-bold text-emerald-600">{candidats.filter((c) => c.statut === "admis").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Refusés</p><p className="text-2xl font-bold text-destructive">{candidats.filter((c) => c.statut === "refuse").length}</p></CardContent></Card>
      </div>
    </div>
  );
}
