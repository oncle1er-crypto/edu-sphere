import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, CreditCard, UserPlus } from "lucide-react";
import { useSpCandidats, type SpCandidat } from "../hooks/useSpCandidats";
import { CandidatFormDialog } from "../components/CandidatFormDialog";
import { ServicePaymentDialog } from "../components/ServicePaymentDialog";
import { useSpServices } from "../hooks/useSpServices";

const STATUT_COLOR: Record<string, string> = {
  en_attente: "bg-muted", programme: "bg-blue-500", absent: "bg-orange-500",
  present: "bg-emerald-500", admis: "bg-emerald-700", refuse: "bg-destructive",
};

export default function SpTestsEntree() {
  const { candidats, loading, save, remove, convertir } = useSpCandidats();
  const { services } = useSpServices();
  const [editing, setEditing] = useState<Partial<SpCandidat> | null>(null);
  const [pay, setPay] = useState<SpCandidat | null>(null);
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Tests d'entrée</CardTitle>
          <div className="flex items-center gap-2">
            <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
            <Button size="sm" onClick={() => setEditing({})}><Plus className="h-4 w-4 mr-1" />Nouveau candidat</Button>
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
                    <TableCell><Badge className={STATUT_COLOR[c.statut] ?? "bg-muted"}>{c.statut}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Encaisser" onClick={() => setPay(c)}><CreditCard className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" title="Convertir en élève" disabled={!!c.converti_eleve_id} onClick={async () => { if (confirm("Convertir ce candidat en élève ?")) await convertir(c.id); }}>
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
    </div>
  );
}
