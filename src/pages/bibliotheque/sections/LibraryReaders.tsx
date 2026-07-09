import { SettingsSection } from "@/components/settings/SettingsSection";
import { Users, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEmprunts } from "@/hooks/useEmprunts";
import { useMemo, useState } from "react";

export default function LibraryReaders() {
  const { emprunts, loading } = useEmprunts();
  const [search, setSearch] = useState("");

  const readers = useMemo(() => {
    const map = new Map<string, { nom: string; classe: string; total: number; en_cours: number; type: string }>();
    for (const e of emprunts) {
      const key = e.eleve_id || e.enseignant_id;
      if (!key) continue;
      const nom = e.eleve_nom || e.enseignant_nom || "—";
      const cur = map.get(key) || { nom, classe: e.eleve_id ? "Élève" : "Enseignant", total: 0, en_cours: 0, type: e.eleve_id ? "eleve" : "enseignant" };
      cur.total += 1;
      if (e.statut !== "rendu") cur.en_cours += 1;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .filter((r) => r.nom.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.total - a.total);
  }, [emprunts, search]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      title={`Lecteurs (${readers.length})`}
      description="Personnes ayant emprunté au moins une fois."
      icon={<Users className="h-5 w-5" />}
      hideSave
    >
      <div className="relative max-w-sm w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Nom..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lecteur</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-center">Emprunts totaux</TableHead>
            <TableHead className="text-center">En cours</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {readers.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.nom}</TableCell>
              <TableCell><Badge variant="secondary">{r.classe}</Badge></TableCell>
              <TableCell className="text-center">{r.total}</TableCell>
              <TableCell className="text-center">
                {r.en_cours > 0 ? <Badge>{r.en_cours}</Badge> : <span className="text-muted-foreground">0</span>}
              </TableCell>
            </TableRow>
          ))}
          {readers.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                Aucun emprunt enregistré.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
