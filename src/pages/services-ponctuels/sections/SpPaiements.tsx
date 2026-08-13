import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Printer, XCircle, Trash2, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useSpPaiements, type SpPaiement } from "../hooks/useSpPaiements";
import { useSpServices } from "../hooks/useSpServices";
import { ServicePaymentDialog } from "../components/ServicePaymentDialog";
import { generateSpReceipt } from "../lib/generateSpReceipt";
import { useEcoleInfo } from "../hooks/useEcoleInfo";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " FCFA";

type SortKey = "numero" | "date_paiement" | "service" | "beneficiaire" | "montant_paye" | "reste" | "mode_paiement";
type Statut = "tous" | "solde" | "partiel" | "annule";
const PAR_PAGE = 25;

export default function SpPaiements() {
  const { paiements, loading, annuler, supprimer } = useSpPaiements();
  const { services } = useSpServices();
  const ecole = useEcoleInfo();
  const { isAdmin } = useIsAdmin();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [params, setParams] = useSearchParams();
  const serviceFiltre = params.get("service") ?? "tous";
  const [statut, setStatut] = useState<Statut>("tous");
  const [sortKey, setSortKey] = useState<SortKey>("date_paiement");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);

  const svcMap = useMemo(() => Object.fromEntries(services.map((s) => [s.id, s])), [services]);

  const reste = (p: SpPaiement) =>
    Math.max(0, Number(p.montant_du) - Number(p.montant_paye) - Number(p.remise));

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return paiements.filter((p) => {
      if (serviceFiltre !== "tous" && p.service_id !== serviceFiltre) return false;
      if (statut === "annule" && !p.annule_le) return false;
      if (statut === "solde" && (p.annule_le || reste(p) > 0)) return false;
      if (statut === "partiel" && (p.annule_le || reste(p) === 0)) return false;
      if (!s) return true;
      return [p.numero, p.beneficiaire_libre, svcMap[p.service_id]?.nom].some((v) =>
        v?.toLowerCase().includes(s),
      );
    });
  }, [paiements, q, svcMap, serviceFiltre, statut]);

  const sorted = useMemo(() => {
    const val = (p: SpPaiement): string | number => {
      switch (sortKey) {
        case "numero": return p.numero ?? "";
        case "service": return svcMap[p.service_id]?.nom ?? "";
        case "beneficiaire": return p.beneficiaire_libre ?? "";
        case "montant_paye": return Number(p.montant_paye || 0);
        case "reste": return reste(p);
        case "mode_paiement": return p.mode_paiement ?? "";
        default: return new Date(p.date_paiement).getTime();
      }
    };
    const arr = [...filtered].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (typeof va === "number" && typeof vb === "number") return va - vb;
      return String(va).localeCompare(String(vb), "fr", { sensitivity: "base" });
    });
    return sortDesc ? arr.reverse() : arr;
  }, [filtered, sortKey, sortDesc, svcMap]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAR_PAGE));
  useEffect(() => { setPage(1); }, [q, serviceFiltre, statut, sortKey, sortDesc]);
  const pageRows = useMemo(
    () => sorted.slice((page - 1) * PAR_PAGE, page * PAR_PAGE),
    [sorted, page],
  );
  const totalAffiche = useMemo(
    () => sorted.filter((p) => !p.annule_le).reduce((s, p) => s + Number(p.montant_paye || 0), 0),
    [sorted],
  );

  const trier = (key: SortKey) => {
    if (key === sortKey) setSortDesc((d) => !d);
    else { setSortKey(key); setSortDesc(key === "date_paiement" || key === "montant_paye"); }
  };

  const Th = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => trier(k)}
        className="inline-flex items-center gap-1 hover:text-primary transition-colors"
      >
        {children}
        {sortKey === k && (sortDesc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
      </button>
    </TableHead>
  );

  const printReceipt = async (p: SpPaiement, correction = false) => {
    const svc = svcMap[p.service_id];
    const e = ecole ?? {} as any;
    await generateSpReceipt({
      numero: p.numero,
      date: new Date(p.date_paiement).toLocaleString("fr-FR"),
      ecoleNom: e.nom ?? "",
      ecoleSigle: e.sigle,
      ecoleAdresse: e.adresse,
      ecoleTelephone: e.telephone,
      ecoleEmail: e.email,
      logoUrl: e.logo_url,
      service: svc?.nom ?? "—",
      beneficiaire: p.beneficiaire_libre ?? "—",
      montantDu: Number(p.montant_du),
      montantPaye: Number(p.montant_paye),
      remise: Number(p.remise),
      reste: reste(p),
      modePaiement: p.mode_paiement,
      observations: p.observations ?? undefined,
      titre: correction ? "REÇU DE CORRECTION" : "REÇU DE PAIEMENT",
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>
              {serviceFiltre !== "tous"
                ? `Paiements — ${svcMap[serviceFiltre]?.nom ?? "Service"}`
                : "Paiements — Services ponctuels"}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {sorted.length} paiement{sorted.length > 1 ? "s" : ""} · encaissé : <span className="font-semibold">{fmt(totalAffiche)}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} className="w-48" />
            <Select
              value={serviceFiltre}
              onValueChange={(v) => {
                const next = new URLSearchParams(params);
                if (v === "tous") next.delete("service"); else next.set("service", v);
                setParams(next, { replace: true });
              }}
            >
              <SelectTrigger className="w-48"><SelectValue placeholder="Service" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les services</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statut} onValueChange={(v) => setStatut(v as Statut)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous statuts</SelectItem>
                <SelectItem value="solde">Soldés</SelectItem>
                <SelectItem value="partiel">Reste à payer</SelectItem>
                <SelectItem value="annule">Annulés</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nouveau paiement</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p>Chargement…</p> : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <Th k="numero">N°</Th>
                    <Th k="date_paiement">Date</Th>
                    <Th k="service">Service</Th>
                    <Th k="beneficiaire">Bénéficiaire</Th>
                    <Th k="montant_paye">Payé</Th>
                    <Th k="reste">Reste</Th>
                    <Th k="mode_paiement">Mode</Th>
                    <TableHead className="w-24 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                        Aucun paiement pour ces critères.
                      </TableCell>
                    </TableRow>
                  )}
                  {pageRows.map((p) => {
                    const r = reste(p);
                    return (
                      <TableRow key={p.id} className={p.annule_le ? "opacity-60 line-through" : ""}>
                        <TableCell className="font-mono text-xs">{p.numero}</TableCell>
                        <TableCell>{new Date(p.date_paiement).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell>{svcMap[p.service_id]?.nom ?? "—"}</TableCell>
                        <TableCell>{p.beneficiaire_libre ?? "—"}</TableCell>
                        <TableCell className="font-medium">{fmt(Number(p.montant_paye))}</TableCell>
                        <TableCell>{r > 0 ? <Badge variant="secondary">{fmt(r)}</Badge> : <Badge className="bg-emerald-600">Soldé</Badge>}</TableCell>
                        <TableCell>{p.mode_paiement}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => printReceipt(p, !!p.annule_le)} title="Reçu"><Printer className="h-4 w-4" /></Button>
                            {isAdmin && !p.annule_le && (
                              <Button size="icon" variant="ghost" onClick={async () => {
                                const m = prompt("Motif d'annulation ?"); if (m && m.length >= 3) await annuler(p.id, m);
                              }} title="Annuler"><XCircle className="h-4 w-4 text-destructive" /></Button>
                            )}
                            {isAdmin && (
                              <Button size="icon" variant="ghost" onClick={async () => {
                                if (confirm(`Supprimer définitivement le paiement ${p.numero} ?\n\nCe montant disparaîtra des caisses et recettes. Action irréversible.`)) {
                                  await supprimer(p.id);
                                }
                              }} title="Supprimer définitivement"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 pt-3">
                  <p className="text-xs text-muted-foreground">
                    Page {page} / {totalPages}
                  </p>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((n) => n - 1)}>
                      <ChevronLeft className="h-4 w-4" /> Précédent
                    </Button>
                    <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((n) => n + 1)}>
                      Suivant <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ServicePaymentDialog open={open} onOpenChange={setOpen} onSuccess={(p) => printReceipt(p)} />
    </div>
  );
}
