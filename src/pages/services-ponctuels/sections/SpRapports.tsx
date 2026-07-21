import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSpPaiements } from "../hooks/useSpPaiements";
import { useSpServices, type SpService } from "../hooks/useSpServices";
import { useSpCandidats } from "../hooks/useSpCandidats";
import { useSpVentes } from "../hooks/useSpVentes";
import { useEcoleInfo } from "../hooks/useEcoleInfo";

// Formatage manuel (jsPDF Helvetica ne rend pas U+202F produit par Intl fr-FR)
const fmt = (n: number) => {
  const v = Math.round(n || 0);
  const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${v < 0 ? "-" : ""}${s} FCFA`;
};

async function loadLogo(url?: string | null): Promise<{ dataUrl: string; w: number; h: number } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const dataUrl: string = await new Promise((r, j) => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result as string);
      fr.onerror = j;
      fr.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((r) => {
      const img = new Image();
      img.onload = () => r({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => r({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    return { dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

function drawHeader(doc: jsPDF, logo: { dataUrl: string; w: number; h: number } | null, ecoleNom?: string) {
  if (logo) {
    const h = 14;
    const w = (logo.w / (logo.h || 1)) * h;
    try { doc.addImage(logo.dataUrl, "PNG", 14, 8, w, h); } catch { /* ignore */ }
  }
  if (ecoleNom) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(ecoleNom.toUpperCase(), doc.internal.pageSize.getWidth() - 14, 14, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }
}

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
  const [serviceId, setServiceId] = useState<string>("all");
  const { paiements } = useSpPaiements();
  const { services } = useSpServices();
  const { candidats } = useSpCandidats();
  const { ventes } = useSpVentes();
  const { currentEcole } = useEcoles();

  const svcMap = useMemo(() => Object.fromEntries(services.map((s) => [s.id, s])), [services]);

  const inRange = (d: string) => {
    const t = new Date(d).getTime();
    if (from && t < new Date(from + "T00:00:00").getTime()) return false;
    if (to && t > new Date(to + "T23:59:59").getTime()) return false;
    return true;
  };

  const paiementsFiltres = paiements.filter((p) =>
    !p.annule_le && inRange(p.date_paiement) && (serviceId === "all" || p.service_id === serviceId),
  );
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
    + (serviceId === "all" ? ventesFiltrees.reduce((s, v) => s + Number(v.montant_total), 0) : 0);

  const exportRecettes = () => {
    const rows: (string | number)[][] = [["N°", "Date", "Service", "Bénéficiaire", "Montant", "Mode"]];
    for (const p of paiementsFiltres) {
      rows.push([p.numero, new Date(p.date_paiement).toLocaleString("fr-FR"), svcMap[p.service_id]?.nom ?? "", p.beneficiaire_libre ?? "", p.montant_paye, p.mode_paiement]);
    }
    download("recettes-services-ponctuels.csv", toCsv(rows));
  };

  const exportPdf = async () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const logo = await loadLogo(currentEcole?.logo_url);
    drawHeader(doc, logo, currentEcole?.nom);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Rapport — Services ponctuels${serviceId !== "all" ? ` — ${svcMap[serviceId]?.nom ?? ""}` : ""}`, 14, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const periode = (from || to) ? `Période : ${from || "…"} au ${to || "…"}` : "Toutes périodes";
    doc.text(periode, 14, 37);
    doc.text(`Total recettes : ${fmt(totalRecettes)}`, 14, 43);

    autoTable(doc, {
      startY: 50,
      head: [["Par service", "Total"]],
      body: parService.map(([n, v]) => [n, fmt(v)]),
      theme: "striped",
      headStyles: { fillColor: [110, 26, 44] },
    });
    autoTable(doc, {
      head: [["Mode paiement", "Total"]],
      body: parMode.map(([n, v]) => [n, fmt(v)]),
      theme: "striped",
      headStyles: { fillColor: [110, 26, 44] },
    });
    autoTable(doc, {
      head: [["N°", "Date", "Service", "Bénéficiaire", "Montant", "Mode"]],
      body: paiementsFiltres.map((p) => [
        p.numero,
        new Date(p.date_paiement).toLocaleDateString("fr-FR"),
        svcMap[p.service_id]?.nom ?? "",
        p.beneficiaire_libre ?? "",
        fmt(Number(p.montant_paye)),
        p.mode_paiement,
      ]),
      theme: "grid",
      headStyles: { fillColor: [110, 26, 44] },
      styles: { fontSize: 8 },
    });
    doc.save(`rapport-services-ponctuels${serviceId !== "all" ? "-" + (svcMap[serviceId]?.slug ?? serviceId) : ""}.pdf`);
  };

  // Rapport dédié à un service (caisse par service)
  const exportServiceReport = async (svc: SpService, format: "pdf" | "csv") => {
    const lignes = paiements.filter((p) => p.service_id === svc.id && !p.annule_le && inRange(p.date_paiement));
    const total = lignes.reduce((s, p) => s + Number(p.montant_paye), 0);
    const parModeMap: Record<string, number> = {};
    for (const p of lignes) parModeMap[p.mode_paiement] = (parModeMap[p.mode_paiement] ?? 0) + Number(p.montant_paye);

    if (format === "csv") {
      const rows: (string | number)[][] = [["N°", "Date", "Bénéficiaire", "Montant dû", "Payé", "Remise", "Mode"]];
      for (const p of lignes) rows.push([p.numero, new Date(p.date_paiement).toLocaleString("fr-FR"), p.beneficiaire_libre ?? "", p.montant_du, p.montant_paye, p.remise, p.mode_paiement]);
      rows.push(["", "", "", "", total, "", ""]);
      return download(`caisse-${svc.slug}.csv`, toCsv(rows));
    }

    const doc = new jsPDF({ orientation: "portrait" });
    const logo = await loadLogo(currentEcole?.logo_url);
    drawHeader(doc, logo, currentEcole?.nom);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Caisse — ${svc.nom}`, 14, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const periode = (from || to) ? `Période : ${from || "…"} au ${to || "…"}` : "Toutes périodes";
    doc.text(periode, 14, 37);
    doc.text(`Total encaissé : ${fmt(total)} — ${lignes.length} opération(s)`, 14, 43);

    autoTable(doc, {
      startY: 50, head: [["Mode paiement", "Total"]],
      body: Object.entries(parModeMap).map(([m, v]) => [m, fmt(v)]),
      theme: "striped", headStyles: { fillColor: [110, 26, 44] },
    });
    autoTable(doc, {
      head: [["N°", "Date", "Bénéficiaire", "Payé", "Mode"]],
      body: lignes.map((p) => [p.numero, new Date(p.date_paiement).toLocaleDateString("fr-FR"), p.beneficiaire_libre ?? "", fmt(Number(p.montant_paye)), p.mode_paiement]),
      theme: "grid", headStyles: { fillColor: [110, 26, 44] }, styles: { fontSize: 8 },
    });
    doc.save(`caisse-${svc.slug}.pdf`);
  };

  const totalParServiceId = useMemo(() => {
    const m: Record<string, { total: number; count: number }> = {};
    for (const p of paiements) {
      if (p.annule_le || !inRange(p.date_paiement)) continue;
      m[p.service_id] ??= { total: 0, count: 0 };
      m[p.service_id].total += Number(p.montant_paye);
      m[p.service_id].count += 1;
    }
    return m;
  }, [paiements, from, to]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Filtres</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div>
            <Label>Service</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les services</SelectItem>
                {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end"><Button variant="outline" onClick={() => { setFrom(""); setTo(""); setServiceId("all"); }}>Réinitialiser</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Caisses par service</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Opérations</TableHead>
                <TableHead className="text-right">Total encaissé</TableHead>
                <TableHead className="w-52 text-right">Rapport</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => {
                const info = totalParServiceId[s.id] ?? { total: 0, count: 0 };
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.nom}</TableCell>
                    <TableCell className="text-right">{info.count}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(info.total)}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => exportServiceReport(s, "pdf")}><FileText className="h-4 w-4 mr-1" />PDF</Button>
                        <Button size="sm" variant="outline" onClick={() => exportServiceReport(s, "csv")}><Download className="h-4 w-4 mr-1" />CSV</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recettes globales ({fmt(totalRecettes)})</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportPdf}><FileText className="h-4 w-4 mr-1" />PDF</Button>
            <Button variant="outline" size="sm" onClick={exportRecettes}><Download className="h-4 w-4 mr-1" />CSV</Button>
          </div>
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
