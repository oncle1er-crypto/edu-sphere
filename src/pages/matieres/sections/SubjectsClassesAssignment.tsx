import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Loader2 } from "lucide-react";
import { useMatieres } from "@/hooks/useMatieres";
import { useClasses } from "@/hooks/useClasses";
import { useEcoleId } from "@/hooks/useEcoleId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CYCLES_FILTER = ["Maternelle", "Primaire", "Collège", "Lycée"] as const;

export default function SubjectsClassesAssignment() {
  const [cycleFilter, setCycleFilter] = useState<string>("all");
  const { matieres, loading: lm } = useMatieres();
  const { classes, loading: lc } = useClasses();
  const { ecoleId } = useEcoleId();
  const [assignments, setAssignments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data } = await supabase.from("classe_matieres").select("classe_id, matiere_id").eq("ecole_id", ecoleId);
    setAssignments(new Set((data ?? []).map((r: any) => `${r.classe_id}|${r.matiere_id}`)));
    setLoading(false);
  };
  useEffect(() => { load(); }, [ecoleId]);

  const toggle = async (classe_id: string, matiere_id: string, checked: boolean) => {
    if (!ecoleId) return;
    const key = `${classe_id}|${matiere_id}`;
    if (checked) {
      const { error } = await supabase.from("classe_matieres").insert({ ecole_id: ecoleId, classe_id, matiere_id, coefficient: 1, volume_horaire_hebdo: 2 });
      if (error) return toast.error(error.message);
      setAssignments((s) => new Set(s).add(key));
    } else {
      const { error } = await supabase.from("classe_matieres").delete().eq("ecole_id", ecoleId).eq("classe_id", classe_id).eq("matiere_id", matiere_id);
      if (error) return toast.error(error.message);
      setAssignments((s) => { const n = new Set(s); n.delete(key); return n; });
    }
  };

  const isLoading = lm || lc || loading;

  return (
    <SettingsSection
      icon={<BookOpen className="h-5 w-5" />}
      title="Affectation des matières aux classes"
      description="Cochez les matières enseignées dans chaque classe (sauvegarde automatique)."
      hideSave
    >
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : matieres.length === 0 || classes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Créez d'abord des classes et des matières.</p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card">Matière</TableHead>
                {classes.map((c) => (
                  <TableHead key={c.id} className="text-center text-xs whitespace-nowrap">{c.nom}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matieres.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="sticky left-0 bg-card font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${m.couleur || "bg-primary"}`} />
                      {m.nom}
                    </div>
                  </TableCell>
                  {classes.map((c) => {
                    const key = `${c.id}|${m.id}`;
                    return (
                      <TableCell key={c.id} className="text-center">
                        <Checkbox checked={assignments.has(key)} onCheckedChange={(v) => toggle(c.id, m.id, !!v)} />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SettingsSection>
  );
}
