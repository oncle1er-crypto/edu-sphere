import { useState } from "react";
import { useCards, type CardStatut } from "@/pages/cartes/context/CardsContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Eye, Search, Printer } from "lucide-react";
import { SchoolCard } from "@/pages/cartes/components/SchoolCard";
import type { CardType } from "@/pages/cartes/components/SchoolCard";

const TYPE_LABELS: Record<CardType, string> = {
  eleve: "Élève", personnel: "Personnel", cantine: "Cantine",
  transport: "Transport", bibliotheque: "Bibliothèque", visiteur: "Visiteur",
};

function statusBadge(s: CardStatut) {
  switch (s) {
    case "active":   return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">Active</Badge>;
    case "perdue":   return <Badge className="bg-rose-500/15 text-rose-700 hover:bg-rose-500/15">Perdue</Badge>;
    case "revoquee": return <Badge className="bg-rose-700/20 text-rose-800 hover:bg-rose-700/20">Révoquée</Badge>;
    case "expiree":  return <Badge variant="secondary">Expirée</Badge>;
  }
}

export default function CardsList() {
  const { cards } = useCards();
  const [q, setQ] = useState("");
  const [type, setType] = useState<CardType | "all">("all");
  const [statut, setStatut] = useState<CardStatut | "all">("all");
  const [preview, setPreview] = useState<typeof cards[number] | null>(null);

  const filtered = cards.filter((c) => {
    if (type !== "all" && c.type !== type) return false;
    if (statut !== "all" && c.statut !== statut) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!`${c.nom} ${c.prenom} ${c.matricule}`.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, matricule…" className="pl-9" />
        </div>
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {(Object.keys(TYPE_LABELS) as CardType[]).map((t) => (
              <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statut} onValueChange={(v) => setStatut(v as typeof statut)}>
          <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="perdue">Perdue</SelectItem>
            <SelectItem value="revoquee">Révoquée</SelectItem>
            <SelectItem value="expiree">Expirée</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground self-center">
          {filtered.length} résultat(s)
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Type</TableHead>
              <TableHead>Titulaire</TableHead>
              <TableHead>Matricule</TableHead>
              <TableHead>Détail</TableHead>
              <TableHead>Année</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell><Badge variant="outline">{TYPE_LABELS[c.type]}</Badge></TableCell>
                <TableCell className="font-medium">{c.nom} {c.prenom}</TableCell>
                <TableCell className="font-mono text-xs">{c.matricule}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.classe || c.fonction || c.formule || c.ligne || c.numLecteur || c.motif || "—"}
                </TableCell>
                <TableCell className="text-xs">{c.anneeScolaire}</TableCell>
                <TableCell>{statusBadge(c.statut)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setPreview(c)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Aperçu de la carte</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="flex flex-wrap gap-6 justify-center py-4">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Recto</span>
                <SchoolCard data={preview} side="recto" scale={1.2} />
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Verso</span>
                <SchoolCard data={preview} side="verso" scale={1.2} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
