import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Printer, XCircle } from "lucide-react";
import { useSpPaiements, type SpPaiement } from "../hooks/useSpPaiements";
import { useSpServices } from "../hooks/useSpServices";
import { ServicePaymentDialog } from "../components/ServicePaymentDialog";
import { generateSpReceipt } from "../lib/generateSpReceipt";
import { useEcoles } from "@/context/EcoleContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " FCFA";

export default function SpPaiements() {
  const { paiements, loading, annuler } = useSpPaiements();
  const { services } = useSpServices();
  const { currentEcole } = useEcoles();
  const { isAdmin } = useIsAdmin();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const svcMap = useMemo(() => Object.fromEntries(services.map((s) => [s.id, s])), [services]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return paiements;
    return paiements.filter((p) =>
      [p.numero, p.beneficiaire_libre, svcMap[p.service_id]?.nom].some((v) => v?.toLowerCase().includes(s))
    );
  }, [paiements, q, svcMap]);

  const printReceipt = (p: SpPaiement, correction = false) => {
    const svc = svcMap[p.service_id];
    generateSpReceipt({
      numero: p.numero,
      date: new Date(p.date_paiement).toLocaleString("fr-FR"),
      ecoleNom: currentEcole?.nom ?? "",
      ecoleAdresse: currentEcole?.adresse,
      ecoleTelephone: currentEcole?.telephone,
      service: svc?.nom ?? "—",
      beneficiaire: p.beneficiaire_libre ?? "—",
      montantDu: Number(p.montant_du),
      montantPaye: Number(p.montant_paye),
      remise: Number(p.remise),
      reste: Math.max(0, Number(p.montant_du) - Number(p.montant_paye) - Number(p.remise)),
      modePaiement: p.mode_paiement,
      observations: p.observations ?? undefined,
      titre: correction ? "REÇU DE CORRECTION" : "REÇU DE PAIEMENT",
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Paiements — Services ponctuels</CardTitle>
          <div className="flex items-center gap-2">
            <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
            <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nouveau paiement</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p>Chargement…</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Bénéficiaire</TableHead>
                  <TableHead>Payé</TableHead>
                  <TableHead>Reste</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="w-24 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const reste = Math.max(0, Number(p.montant_du) - Number(p.montant_paye) - Number(p.remise));
                  return (
                    <TableRow key={p.id} className={p.annule_le ? "opacity-60 line-through" : ""}>
                      <TableCell className="font-mono text-xs">{p.numero}</TableCell>
                      <TableCell>{new Date(p.date_paiement).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>{svcMap[p.service_id]?.nom ?? "—"}</TableCell>
                      <TableCell>{p.beneficiaire_libre ?? "—"}</TableCell>
                      <TableCell className="font-medium">{fmt(Number(p.montant_paye))}</TableCell>
                      <TableCell>{reste > 0 ? <Badge variant="secondary">{fmt(reste)}</Badge> : <Badge className="bg-emerald-600">Soldé</Badge>}</TableCell>
                      <TableCell>{p.mode_paiement}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => printReceipt(p, !!p.annule_le)} title="Reçu"><Printer className="h-4 w-4" /></Button>
                          {isAdmin && !p.annule_le && (
                            <Button size="icon" variant="ghost" onClick={async () => {
                              const m = prompt("Motif d'annulation ?"); if (m && m.length >= 3) await annuler(p.id, m);
                            }} title="Annuler"><XCircle className="h-4 w-4 text-destructive" /></Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ServicePaymentDialog open={open} onOpenChange={setOpen} onSuccess={(p) => printReceipt(p)} />
    </div>
  );
}
