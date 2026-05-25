import { useState, useEffect } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Scale, Loader2, Save } from "lucide-react";
import { useMatieres } from "@/hooks/useMatieres";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SubjectsScales() {
  const { matieres, fetchMatieres, loading } = useMatieres();
  const [edits, setEdits] = useState<Record<string, { coefficient: number; note_sur: number; note_passage: number }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const map: typeof edits = {};
    matieres.forEach((m) => { map[m.id] = { coefficient: Number(m.coefficient), note_sur: m.note_sur, note_passage: Number(m.note_passage) }; });
    setEdits(map);
  }, [matieres]);

  const dirty = matieres.filter((m) => {
    const e = edits[m.id]; if (!e) return false;
    return e.coefficient !== Number(m.coefficient) || e.note_sur !== m.note_sur || e.note_passage !== Number(m.note_passage);
  });

  const save = async () => {
    setSaving(true);
    let ok = 0;
    for (const m of dirty) {
      const e = edits[m.id];
      const { error } = await supabase.from("matieres").update(e).eq("id", m.id);
      if (!error) ok++;
    }
    setSaving(false);
    toast.success(`${ok} matière(s) mise(s) à jour`);
    fetchMatieres();
  };

  return (
    <SettingsSection
      icon={<Scale className="h-5 w-5" />}
      title="Barèmes & coefficients"
      description="Échelle de notation (MENA Côte d'Ivoire) et coefficients par matière."
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={saving || dirty.length === 0}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Enregistrer ({dirty.length})
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matière</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-center">Note sur</TableHead>
                <TableHead className="text-center">Coefficient</TableHead>
                <TableHead className="text-center">Note de passage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matieres.map((m) => {
                const e = edits[m.id] || { coefficient: 1, note_sur: 20, note_passage: 10 };
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${m.couleur || "bg-primary"}`} />
                        {m.nom}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{m.categorie || "—"}</Badge></TableCell>
                    <TableCell className="text-center">
                      <Input type="number" value={e.note_sur} onChange={(ev) => setEdits((p) => ({ ...p, [m.id]: { ...e, note_sur: Number(ev.target.value) } }))} className="w-16 mx-auto h-8 text-center" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Input type="number" step="0.5" value={e.coefficient} onChange={(ev) => setEdits((p) => ({ ...p, [m.id]: { ...e, coefficient: Number(ev.target.value) } }))} className="w-16 mx-auto h-8 text-center" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Input type="number" step="0.5" value={e.note_passage} onChange={(ev) => setEdits((p) => ({ ...p, [m.id]: { ...e, note_passage: Number(ev.target.value) } }))} className="w-16 mx-auto h-8 text-center" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </SettingsSection>
  );
}
