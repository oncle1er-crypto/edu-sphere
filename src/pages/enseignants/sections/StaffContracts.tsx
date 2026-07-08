import { useMemo, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileSignature, Loader2, Plus, MoreHorizontal, AlertTriangle, Clock, Users, TrendingUp, Search, Download,
} from "lucide-react";
import { useEnseignants } from "@/hooks/useEnseignants";
import { useContratsEnseignants, type ContratEnseignant } from "@/hooks/useContratsEnseignants";
import { ContractFormDialog } from "../components/ContractFormDialog";
import { TerminateContractDialog } from "../components/TerminateContractDialog";
import { AssignmentsPanel } from "../components/AssignmentsPanel";
import { ContractDocumentsPanel } from "../components/ContractDocumentsPanel";

const statutColor: Record<string, string> = {
  actif: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  brouillon: "bg-slate-500/15 text-slate-700 border-slate-500/30",
  suspendu: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  rompu: "bg-red-500/15 text-red-700 border-red-500/30",
  termine: "bg-blue-500/15 text-blue-700 border-blue-500/30",
};

const typeColor: Record<string, string> = {
  CDI: "bg-primary/15 text-primary border-primary/30",
  CDD: "bg-accent/25 text-accent-foreground border-accent/40",
  vacation: "bg-purple-500/15 text-purple-700 border-purple-500/30",
  stage: "bg-cyan-500/15 text-cyan-700 border-cyan-500/30",
};

function daysBetween(a: string, b: string) {
  return Math.floor((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: any; tone: "primary" | "warning" | "danger" | "info" }) {
  const toneMap: any = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-amber-500/10 text-amber-600",
    danger: "bg-red-500/10 text-red-600",
    info: "bg-blue-500/10 text-blue-600",
  };
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneMap[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold font-display">{value}</p>
      </div>
    </Card>
  );
}

export default function StaffContracts() {
  const { enseignants, loading: loadingEns } = useEnseignants();
  const { contrats, loading, add, update, remove, resilier, renouveler } = useContratsEnseignants();

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<ContratEnseignant | null>(null);
  const [openTerm, setOpenTerm] = useState(false);
  const [terminating, setTerminating] = useState<ContratEnseignant | null>(null);

  const [search, setSearch] = useState("");
  const [fType, setFType] = useState<string>("all");
  const [fStatut, setFStatut] = useState<string>("all");

  const nameOf = (id: string) => {
    const e = enseignants.find((x) => x.id === id);
    return e ? `${e.nom} ${e.prenom}` : "—";
  };

  const today = new Date().toISOString().slice(0, 10);

  const kpis = useMemo(() => {
    const actifs = contrats.filter((c) => c.statut === "actif");
    const cddFinProche = actifs.filter(
      (c) => c.type === "CDD" && c.date_fin && daysBetween(c.date_fin, today) >= 0 && daysBetween(c.date_fin, today) <= 30
    );
    const essaiProche = actifs.filter(
      (c) => c.periode_essai_fin && daysBetween(c.periode_essai_fin, today) >= 0 && daysBetween(c.periode_essai_fin, today) <= 7
    );
    const masseSalariale = actifs.reduce((s, c) => s + Number(c.salaire_base || 0) * (Number(c.quotite || 100) / 100), 0);
    return { actifs: actifs.length, cddFinProche, essaiProche, masseSalariale };
  }, [contrats, today]);

  const filtered = useMemo(() => {
    return contrats.filter((c) => {
      if (fType !== "all" && c.type !== fType) return false;
      if (fStatut !== "all" && c.statut !== fStatut) return false;
      if (search && !nameOf(c.enseignant_id).toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contrats, fType, fStatut, search, enseignants]);

  const exportCsv = () => {
    const rows = [
      ["Enseignant", "Type", "Statut", "Début", "Fin", "Quotité", "Salaire", "Motif rupture"],
      ...filtered.map((c) => [
        nameOf(c.enseignant_id), c.type, c.statut, c.date_debut, c.date_fin ?? "",
        String(c.quotite), String(c.salaire_base), c.motif_rupture ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `contrats-${today}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || loadingEns) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      icon={<FileSignature className="h-5 w-5" />}
      title="Contrats & affectations"
      description="Gestion complète des contrats, affectations pédagogiques, documents RH et alertes de fin de contrat."
      hideSave
    >
      {/* Dashboard KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Contrats actifs" value={kpis.actifs} icon={Users} tone="primary" />
        <StatCard label="CDD < 30 j" value={kpis.cddFinProche.length} icon={Clock} tone="warning" />
        <StatCard label="Fins d'essai < 7 j" value={kpis.essaiProche.length} icon={AlertTriangle} tone="danger" />
        <StatCard label="Masse salariale/mois" value={`${kpis.masseSalariale.toLocaleString("fr-FR")} F`} icon={TrendingUp} tone="info" />
      </div>

      {/* Alertes */}
      {(kpis.cddFinProche.length > 0 || kpis.essaiProche.length > 0) && (
        <Card className="p-4 border-amber-500/40 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <h4 className="font-semibold text-sm">À traiter</h4>
              <ul className="text-sm space-y-1">
                {kpis.cddFinProche.map((c) => (
                  <li key={c.id}>
                    <strong>{nameOf(c.enseignant_id)}</strong> — CDD se termine le {new Date(c.date_fin!).toLocaleDateString("fr-FR")}
                    <Button variant="link" size="sm" className="h-auto p-0 ml-2"
                      onClick={() => { setEditing(c); setOpenForm(true); }}>Renouveler</Button>
                  </li>
                ))}
                {kpis.essaiProche.map((c) => (
                  <li key={c.id}>
                    <strong>{nameOf(c.enseignant_id)}</strong> — fin de période d'essai le {new Date(c.periode_essai_fin!).toLocaleDateString("fr-FR")}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="contrats" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contrats">Liste des contrats</TabsTrigger>
          <TabsTrigger value="affectations">Affectations pédagogiques</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Onglet contrats */}
        <TabsContent value="contrats" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher un enseignant…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={fType} onValueChange={setFType}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="CDI">CDI</SelectItem>
                <SelectItem value="CDD">CDD</SelectItem>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="stage">Stage</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fStatut} onValueChange={setFStatut}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="brouillon">Brouillon</SelectItem>
                <SelectItem value="suspendu">Suspendu</SelectItem>
                <SelectItem value="rompu">Rompu</SelectItem>
                <SelectItem value="termine">Terminé</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> Export</Button>
            <Button onClick={() => { setEditing(null); setOpenForm(true); }}>
              <Plus className="h-4 w-4" /> Nouveau contrat
            </Button>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Début</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Quotité</TableHead>
                  <TableHead>Salaire</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Aucun contrat.</TableCell></TableRow>
                )}
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{nameOf(c.enseignant_id)}</TableCell>
                    <TableCell><Badge className={typeColor[c.type]} variant="outline">{c.type}</Badge></TableCell>
                    <TableCell><Badge className={statutColor[c.statut]} variant="outline">{c.statut}</Badge></TableCell>
                    <TableCell className="text-sm">{new Date(c.date_debut).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="text-sm">{c.date_fin ? new Date(c.date_fin).toLocaleDateString("fr-FR") : "—"}</TableCell>
                    <TableCell className="text-sm">{c.quotite}%</TableCell>
                    <TableCell className="text-sm">{Number(c.salaire_base).toLocaleString("fr-FR")} F</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(c); setOpenForm(true); }}>Modifier</DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            const r = await renouveler(c, {});
                            if (r) { setEditing(r); setOpenForm(true); }
                          }}>Renouveler</DropdownMenuItem>
                          {c.statut === "actif" && (
                            <DropdownMenuItem onClick={() => { setTerminating(c); setOpenTerm(true); }}>Résilier</DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => {
                            if (confirm("Supprimer définitivement ce contrat ?")) remove(c.id);
                          }}>Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="affectations"><AssignmentsPanel /></TabsContent>
        <TabsContent value="documents"><ContractDocumentsPanel /></TabsContent>
      </Tabs>

      <ContractFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        enseignants={enseignants.map((e) => ({ id: e.id, nom: e.nom, prenom: e.prenom }))}
        initial={editing}
        onSubmit={async (values) => {
          if (editing) return update(editing.id, values as any);
          return add(values);
        }}
      />

      <TerminateContractDialog
        open={openTerm}
        onOpenChange={setOpenTerm}
        onConfirm={async (motif, date) => terminating ? resilier(terminating.id, motif, date) : false}
      />
    </SettingsSection>
  );
}
