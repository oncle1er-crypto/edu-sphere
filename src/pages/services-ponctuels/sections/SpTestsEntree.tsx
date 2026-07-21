import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, CreditCard, UserPlus, Sparkles } from "lucide-react";
import { useSpCandidats, type SpCandidat } from "../hooks/useSpCandidats";
import { CandidatFormDialog } from "../components/CandidatFormDialog";
import { ServicePaymentDialog } from "../components/ServicePaymentDialog";
import { useSpServices } from "../hooks/useSpServices";
import { ConvertCandidatDialog } from "../components/ConvertCandidatDialog";
import SpTestWorkflow from "../components/SpTestWorkflow";
import { StatutCandidatLegend } from "../components/StatutCandidatLegend";

const STATUT_COLOR: Record<string, string> = {
  en_attente: "bg-muted text-foreground",
  programme: "bg-blue-500 text-white",
  absent: "bg-orange-500 text-white",
  present: "bg-emerald-500 text-white",
  admis: "bg-emerald-700 text-white",
  refuse: "bg-destructive text-white",
};
const STATUT_LABEL: Record<string, string> = {
  en_attente: "En attente", programme: "Programmé", absent: "Absent",
  present: "Présent", admis: "Admis", refuse: "Refusé",
};

export default function SpTestsEntree() {
  const { candidats, loading, save, remove, convertir } = useSpCandidats();
  const { services } = useSpServices();
  const [editing, setEditing] = useState<Partial<SpCandidat> | null>(null);
  const [pay, setPay] = useState<SpCandidat | null>(null);
  const [convert, setConvert] = useState<SpCandidat | null>(null);
  const [workflow, setWorkflow] = useState(false);
  const [q, setQ] = useState("");

  const testService = services.find((s) => s.slug === "test_entree");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return candidats;
    return candidats.filter((c) =>
      [c.nom, c.prenom, c.numero, c.parent, c.telephone].some((v) => v?.toLowerCase().includes(s))
    );
  }, [candidats, q]);

  return (
    <div className="space-y-4">
      <StatutCandidatLegend />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Tests d'entrée</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
            <Button size="sm" variant="outline" onClick={() => setEditing({})}>
              <Plus className="h-4 w-4 mr-1" />Simple
            </Button>
            <Button size="sm" onClick={() => setWorkflow(true)} className="gap-1">
              <Sparkles className="h-4 w-4" />Nouveau parcours (candidat + paiement + reçu)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p>Chargement…</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Classe demandée</TableHead>
                  <TableHead>Parent / Tél.</TableHead>
                  <TableHead>Date test</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-40 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.numero}</TableCell>
                    <TableCell>
                      <div className="font-medium">{c.nom} {c.prenom}</div>
                      <div className="text-xs text-muted-foreground">{c.sexe} • {c.date_naissance ?? "—"}</div>
                    </TableCell>
                    <TableCell>{c.classe_demandee ?? "—"}</TableCell>
                    <TableCell>{c.parent ?? "—"}<div className="text-xs text-muted-foreground">{c.telephone}</div></TableCell>
                    <TableCell>{c.date_test ? new Date(c.date_test).toLocaleString("fr-FR") : "—"}</TableCell>
                    <TableCell><Badge className={STATUT_COLOR[c.statut] ?? "bg-muted"}>{STATUT_LABEL[c.statut] ?? c.statut}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Encaisser" onClick={() => setPay(c)}><CreditCard className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" title="Convertir en élève" disabled={!!c.converti_eleve_id} onClick={() => setConvert(c)}>
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Supprimer ?")) remove(c.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CandidatFormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        initial={editing ?? undefined}
        onSubmit={async (p) => { await save(p); setEditing(null); }}
      />

      <ServicePaymentDialog
        open={!!pay}
        onOpenChange={(v) => !v && setPay(null)}
        preset={pay ? {
          service_id: testService?.id,
          beneficiaire_type: "candidat",
          candidat_id: pay.id,
          beneficiaire_libre: `${pay.nom} ${pay.prenom}`,
        } : undefined}
      />

      {convert && (
        <ConvertCandidatDialog
          open={!!convert}
          onOpenChange={(v) => !v && setConvert(null)}
          candidatNom={`${convert.nom} ${convert.prenom}`}
          onConfirm={async (classeId) => { await convertir(convert.id, classeId); }}
        />
      )}

      <SpTestWorkflow open={workflow} onOpenChange={setWorkflow} />
    </div>
  );
}
