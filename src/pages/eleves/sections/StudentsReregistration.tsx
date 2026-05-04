import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Search, Loader2, CheckCircle } from "lucide-react";
import { useEleves } from "@/hooks/useEleves";
import { toast } from "sonner";

export default function StudentsReregistration() {
  const { eleves, loading, updateEleve } = useEleves();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const inscrits = eleves.filter((e) => e.statut === "inscrit" || e.statut === "actif");
  const filtered = inscrits.filter(
    (d) =>
      d.nom.toLowerCase().includes(q.toLowerCase()) ||
      d.prenom.toLowerCase().includes(q.toLowerCase()) ||
      d.matricule.toLowerCase().includes(q.toLowerCase())
  );

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((d) => d.id)));
    }
  };

  const handleValidate = async () => {
    if (selected.size === 0) { toast.error("Sélectionnez au moins un élève"); return; }
    setSaving(true);
    let ok = 0;
    for (const id of selected) {
      const result = await updateEleve(id, { statut: "inscrit" });
      if (result) ok++;
    }
    toast.success(`${ok} élève(s) réinscrit(s) avec succès`);
    setSelected(new Set());
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      icon={<FileText className="h-5 w-5" />}
      title="Campagne de réinscription"
      description="Suivi du passage à l'année scolaire suivante."
      hideSave
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-2 items-center">
          {selected.size > 0 && (
            <span className="text-sm text-muted-foreground">{selected.size} sélectionné(s)</span>
          )}
          <Button size="sm" onClick={handleValidate} disabled={saving || selected.size === 0}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
            Valider la sélection
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Matricule</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>Classe actuelle</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((d) => (
              <TableRow key={d.id} className={selected.has(d.id) ? "bg-accent/10" : ""}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(d.id)}
                    onCheckedChange={() => toggleOne(d.id)}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{d.matricule}</TableCell>
                <TableCell className="font-medium">{d.prenom} {d.nom}</TableCell>
                <TableCell><Badge variant="secondary">{d.classe_nom ?? "Non affecté"}</Badge></TableCell>
                <TableCell>
                  <Badge variant={d.statut === "inscrit" || d.statut === "actif" ? "default" : "secondary"}>
                    {d.statut}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Aucun élève trouvé.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
