import { useMemo, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Wallet, Download, Send, Loader2, Plus, CheckCircle2 } from "lucide-react";
import { useBulletinsPaie } from "@/hooks/useBulletinsPaie";
import { useEnseignants } from "@/hooks/useEnseignants";
import { useContratsEnseignants } from "@/hooks/useContratsEnseignants";
import { toast } from "sonner";

const MOIS_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const CHARGES_RATE = 0.15; // Taux de charges sociales par défaut

function fmt(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

export default function StaffPayroll() {
  const now = new Date();
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());
  const { bulletins, loading, addBulletin, payBulletin, refetch } = useBulletinsPaie(mois, annee);
  const { enseignants } = useEnseignants();
  const { contrats } = useContratsEnseignants();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [form, setForm] = useState({ enseignant_id: "", salaire_brut: "", retenues: "" });

  const kpis = useMemo(() => {
    const brut = bulletins.reduce((s, b) => s + b.salaire_brut, 0);
    const charges = bulletins.reduce((s, b) => s + b.retenues, 0);
    const net = bulletins.reduce((s, b) => s + b.net_a_payer, 0);
    return { brut, charges, net };
  }, [bulletins]);

  // Années disponibles : année courante ± 2
  const anneesOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y - 2, y - 1, y, y + 1];
  }, []);

  const handleSubmit = async () => {
    if (!form.enseignant_id || !form.salaire_brut) {
      toast.error("Employé et salaire brut requis");
      return;
    }
    const brut = Number(form.salaire_brut);
    const ret = Number(form.retenues) || Math.round(brut * CHARGES_RATE);
    await addBulletin({
      enseignant_id: form.enseignant_id,
      salaire_brut: brut,
      retenues: ret,
      net_a_payer: brut - ret,
    });
    setForm({ enseignant_id: "", salaire_brut: "", retenues: "" });
    setOpen(false);
  };

  const lancerPaie = async () => {
    const actifs = contrats.filter((c) => c.statut === "actif");
    if (actifs.length === 0) {
      toast.error("Aucun contrat actif à traiter");
      return;
    }
    setRunning(true);
    let created = 0;
    let skipped = 0;
    for (const c of actifs) {
      if (bulletins.some((b) => b.enseignant_id === c.enseignant_id)) {
        skipped++;
        continue;
      }
      const primesTotal = Array.isArray(c.primes)
        ? c.primes.reduce((s: number, p: any) => s + (Number(p?.montant) || 0), 0)
        : 0;
      const brut = Math.round((Number(c.salaire_base) * (Number(c.quotite) || 100)) / 100 + primesTotal);
      const retenues = Math.round(brut * CHARGES_RATE);
      await addBulletin({
        enseignant_id: c.enseignant_id,
        salaire_brut: brut,
        retenues,
        net_a_payer: brut - retenues,
      });
      created++;
    }
    setRunning(false);
    toast.success(`Paie lancée : ${created} bulletin(s) créé(s)${skipped ? `, ${skipped} déjà existant(s)` : ""}`);
    refetch();
  };

  const exporter = () => {
    if (bulletins.length === 0) {
      toast.error("Aucun bulletin à exporter");
      return;
    }
    const rows = [
      ["Employé", "Fonction", "Mois", "Année", "Brut", "Charges", "Net", "Statut"],
      ...bulletins.map((b) => [
        b.enseignant_nom ?? "",
        b.enseignant_fonction ?? "",
        String(b.mois),
        String(b.annee),
        String(b.salaire_brut),
        String(b.retenues),
        String(b.net_a_payer),
        b.statut,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paie-${annee}-${String(mois).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV généré");
  };

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<Wallet className="h-5 w-5" />}
        title="Paie & salaires"
        description={`${MOIS_LABELS[mois - 1]} ${annee} · ${bulletins.length} bulletin(s)`}
        hideSave
      >
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex gap-2">
            <Select value={String(mois)} onValueChange={(v) => setMois(Number(v))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOIS_LABELS.map((l, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(annee)} onValueChange={(v) => setAnnee(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {anneesOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Plus className="h-4 w-4" />Bulletin manuel</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nouveau bulletin de paie</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Employé *</Label>
                    <SearchableSelect
                      value={form.enseignant_id}
                      onValueChange={(v) => setForm({ ...form, enseignant_id: v })}
                      placeholder="Choisir..."
                      searchPlaceholder="Rechercher..."
                      options={enseignants.map((e) => ({ value: e.id, label: `${e.nom} ${e.prenom}` }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Salaire brut (FCFA) *</Label>
                      <Input type="number" value={form.salaire_brut}
                        onChange={(e) => setForm({ ...form, salaire_brut: e.target.value })} />
                    </div>
                    <div>
                      <Label>Retenues (FCFA)</Label>
                      <Input type="number" value={form.retenues}
                        onChange={(e) => setForm({ ...form, retenues: e.target.value })}
                        placeholder={`Auto: ${Math.round(CHARGES_RATE * 100)}%`} />
                    </div>
                  </div>
                  <Button onClick={handleSubmit} className="w-full">Créer le bulletin</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={exporter}>
              <Download className="h-4 w-4" />Tout exporter
            </Button>
            <Button size="sm" onClick={lancerPaie} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Lancer la paie
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Masse salariale brute</p>
              <p className="text-xl font-extrabold font-display mt-1 text-primary">{fmt(kpis.brut)}</p>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Charges & retenues</p>
              <p className="text-xl font-extrabold font-display mt-1 text-blue-600">{fmt(kpis.charges)}</p>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Net à payer</p>
              <p className="text-xl font-extrabold font-display mt-1 text-emerald-600">{fmt(kpis.net)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Fonction</TableHead>
                  <TableHead className="text-right">Brut</TableHead>
                  <TableHead className="text-right">Charges</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bulletins.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.enseignant_nom}</TableCell>
                    <TableCell className="text-muted-foreground">{b.enseignant_fonction}</TableCell>
                    <TableCell className="text-right">{fmt(b.salaire_brut)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">-{fmt(b.retenues)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(b.net_a_payer)}</TableCell>
                    <TableCell>
                      <Badge variant={b.statut === "paye" ? "default" : "secondary"}>
                        {b.statut === "paye" ? "Payé" : "En attente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {b.statut !== "paye" && (
                        <Button size="sm" variant="ghost" onClick={() => payBulletin(b.id)}>
                          <CheckCircle2 className="h-4 w-4" />Marquer payé
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {bulletins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      Aucun bulletin pour ce mois. Cliquez sur « Lancer la paie » pour générer automatiquement depuis les contrats actifs.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
