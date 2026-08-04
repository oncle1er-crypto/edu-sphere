import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { BookOpen } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAnneeId } from "@/hooks/useAnneeId";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

interface Row {
  id: string;
  matiere: string;
  classe: string;
  heures: number;
  coef: number;
}

export default function SubjectsVolumes() {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, { heures?: number; coef?: number }>>({});

  useEffect(() => {
    if (!ecoleId) return;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("classe_matieres")
        .select("id, coefficient, volume_horaire_hebdo, matieres(nom), classes(nom, annee_id)")
        .eq("ecole_id", ecoleId);
      const { data, error } = await q;
      if (error) {
        console.error(error);
        toast.error("Erreur chargement volumes");
        setLoading(false);
        return;
      }
      const mapped: Row[] = (data as any[])
        .filter((r) => !anneeId || r.classes?.annee_id === anneeId)
        .map((r) => ({
          id: r.id,
          matiere: r.matieres?.nom ?? "—",
          classe: r.classes?.nom ?? "—",
          heures: Number(r.volume_horaire_hebdo ?? 0),
          coef: Number(r.coefficient ?? 1),
        }))
        .sort((a, b) => a.classe.localeCompare(b.classe) || a.matiere.localeCompare(b.matiere));
      setRows(mapped);
      setLoading(false);
    })();
  }, [ecoleId, anneeId]);

  const saveRow = async (id: string) => {
    const e = edits[id];
    if (!e) return;
    const payload: any = {};
    if (e.heures !== undefined) payload.volume_horaire_hebdo = e.heures;
    if (e.coef !== undefined) payload.coefficient = e.coef;
    const { error } = await supabase.from("classe_matieres").update(payload).eq("id", id);
    if (error) { toast.error(messageErreurBase(error)); return; }
    toast.success("Mis à jour");
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, heures: e.heures ?? r.heures, coef: e.coef ?? r.coef } : r));
    setEdits((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  return (
    <SettingsSection
      title="Matières & volumes horaires"
      description="Heures hebdomadaires et coefficient par matière et par classe (depuis la configuration des classes)."
      icon={<BookOpen className="h-5 w-5" />}
      hideSave
    >
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune matière assignée aux classes. Configurez-les dans <strong>Matières → Affectation aux classes</strong>.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matière</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead className="text-center w-40">Heures / semaine</TableHead>
              <TableHead className="text-center w-32">Coefficient</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const e = edits[r.id] ?? {};
              const dirty = e.heures !== undefined || e.coef !== undefined;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.matiere}</TableCell>
                  <TableCell>{r.classe}</TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number" min={0} step={0.5}
                      defaultValue={r.heures}
                      onChange={(ev) => setEdits((p) => ({ ...p, [r.id]: { ...p[r.id], heures: Number(ev.target.value) } }))}
                      className="h-8 text-center"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number" min={0} step={0.5}
                      defaultValue={r.coef}
                      onChange={(ev) => setEdits((p) => ({ ...p, [r.id]: { ...p[r.id], coef: Number(ev.target.value) } }))}
                      className="h-8 text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant={dirty ? "default" : "outline"} disabled={!dirty} onClick={() => saveRow(r.id)}>
                      Enregistrer
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </SettingsSection>
  );
}
