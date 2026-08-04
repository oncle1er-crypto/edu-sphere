import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMyEnseignant } from "@/hooks/useMyEnseignant";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2, Save, ClipboardList } from "lucide-react";
import { sortEleves } from "@/lib/sortEleves";
import { messageErreurBase } from "@/lib/dbErrorMessages";


interface EvalInfo {
  id: string;
  titre: string;
  type: string;
  date_eval: string;
  bareme: number;
  coefficient: number;
  classe_id: string;
  enseignant_id: string | null;
  ecole_id: string;
  classe: string;
  matiere: string;
}
interface Row {
  eleve_id: string;
  matricule: string;
  nom: string;
  prenom: string;
  note_id: string | null;
  note: string; // string for input
  absent: boolean;
  commentaire: string;
  dirty: boolean;
}

export default function EvaluationGradesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enseignant, loading: ensLoading } = useMyEnseignant();
  const [info, setInfo] = useState<EvalInfo | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id || !enseignant) return;
    (async () => {
      setLoading(true);
      const { data: ev, error } = await supabase
        .from("evaluations")
        .select("id, titre, type, date_eval, bareme, coefficient, classe_id, enseignant_id, ecole_id, classes(nom), matieres(nom)")
        .eq("id", id)
        .maybeSingle();
      if (error || !ev) {
        toast.error("Évaluation introuvable");
        setLoading(false);
        return;
      }
      const evInfo: EvalInfo = {
        id: ev.id, titre: ev.titre, type: ev.type, date_eval: ev.date_eval,
        bareme: Number(ev.bareme), coefficient: Number(ev.coefficient),
        classe_id: ev.classe_id, enseignant_id: ev.enseignant_id, ecole_id: ev.ecole_id,
        classe: (ev as any).classes?.nom ?? "—",
        matiere: (ev as any).matieres?.nom ?? "—",
      };
      setInfo(evInfo);

      const [{ data: eleves }, { data: notes }] = await Promise.all([
        supabase.from("eleves")
          .select("id, matricule, nom, prenom")
          .eq("classe_id", evInfo.classe_id)
          .eq("ecole_id", evInfo.ecole_id)
          .order("nom").order("prenom"),
        supabase.from("notes")
          .select("id, eleve_id, note, absent, commentaire")
          .eq("evaluation_id", evInfo.id),
      ]);
      const notesByEleve = new Map<string, any>();
      (notes ?? []).forEach((n: any) => notesByEleve.set(n.eleve_id, n));
      setRows((eleves ?? []).map((e: any) => {
        const n = notesByEleve.get(e.id);
        return {
          eleve_id: e.id,
          matricule: e.matricule,
          nom: e.nom,
          prenom: e.prenom,
          note_id: n?.id ?? null,
          note: n?.note != null ? String(n.note) : "",
          absent: n?.absent ?? false,
          commentaire: n?.commentaire ?? "",
          dirty: false,
        };
      }));
      setLoading(false);
    })();
  }, [id, enseignant]);

  const updateRow = (eleve_id: string, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => r.eleve_id === eleve_id ? { ...r, ...patch, dirty: true } : r));
  };

  const stats = useMemo(() => {
    if (!info) return { saisies: 0, abs: 0, moy: 0 };
    const valid = rows.filter((r) => !r.absent && r.note !== "" && !isNaN(Number(r.note)));
    const abs = rows.filter((r) => r.absent).length;
    const moy = valid.length ? valid.reduce((s, r) => s + Number(r.note), 0) / valid.length : 0;
    return { saisies: valid.length, abs, moy };
  }, [rows, info]);

  const handleSave = async () => {
    if (!info) return;
    setSaving(true);
    const dirtyRows = rows.filter((r) => r.dirty);
    if (dirtyRows.length === 0) { toast.info("Aucune modification à enregistrer"); setSaving(false); return; }
    // Validate notes
    for (const r of dirtyRows) {
      if (!r.absent && r.note !== "") {
        const n = Number(r.note);
        if (isNaN(n) || n < 0 || n > info.bareme) {
          toast.error(`Note invalide pour ${r.nom} ${r.prenom} (0–${info.bareme})`);
          setSaving(false); return;
        }
      }
    }
    const payload = dirtyRows.map((r) => ({
      ecole_id: info.ecole_id,
      evaluation_id: info.id,
      eleve_id: r.eleve_id,
      note: r.absent || r.note === "" ? null : Number(r.note),
      absent: r.absent,
      commentaire: r.commentaire || null,
    }));
    const { error } = await supabase
      .from("notes")
      .upsert(payload, { onConflict: "evaluation_id,eleve_id" });
    setSaving(false);
    if (error) { toast.error(messageErreurBase(error)); return; }
    toast.success(`${dirtyRows.length} note(s) enregistrée(s)`);
    setRows((rs) => rs.map((r) => ({ ...r, dirty: false })));
  };

  if (ensLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;
  }
  if (!enseignant || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-sm space-y-3">
            <p>Évaluation introuvable ou accès refusé.</p>
            <Button asChild variant="outline"><Link to="/portail-enseignant"><ArrowLeft className="h-4 w-4 mr-1" /> Retour au portail</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dirtyCount = rows.filter((r) => r.dirty).length;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/portail-enseignant"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="min-w-0">
              <h1 className="font-bold text-sm leading-tight truncate flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" /> {info.titre}
              </h1>
              <p className="text-xs opacity-80 truncate">{info.classe} • {info.matiere} • {new Date(info.date_eval).toLocaleDateString("fr-FR")}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving || dirtyCount === 0} variant="secondary" size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="ml-1 hidden sm:inline">Enregistrer{dirtyCount > 0 ? ` (${dirtyCount})` : ""}</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className="capitalize">{info.type}</Badge>
          <Badge variant="outline">Barème /{info.bareme}</Badge>
          <Badge variant="outline">Coef. {info.coefficient}</Badge>
          <span className="text-muted-foreground ml-auto">
            {stats.saisies} saisie(s) • {stats.abs} absent(s) • Moy. {stats.moy.toFixed(2)}/{info.bareme}
          </span>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Élèves de la classe ({rows.length})</CardTitle></CardHeader>
          <CardContent>
            {rows.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Aucun élève inscrit dans cette classe.</p> : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Matricule</TableHead>
                      <TableHead>Élève</TableHead>
                      <TableHead className="w-[120px]">Note /{info.bareme}</TableHead>
                      <TableHead className="w-[80px] text-center">Absent</TableHead>
                      <TableHead>Commentaire</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.eleve_id} className={r.dirty ? "bg-accent/10" : ""}>
                        <TableCell className="font-mono text-xs">{r.matricule}</TableCell>
                        <TableCell className="font-medium">{r.nom} {r.prenom}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={info.bareme}
                            step="0.25"
                            value={r.note}
                            disabled={r.absent}
                            onChange={(e) => updateRow(r.eleve_id, { note: e.target.value })}
                            className="h-8 w-20 tabular-nums"
                            placeholder="—"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={r.absent}
                            onCheckedChange={(v) => updateRow(r.eleve_id, { absent: !!v, note: v ? "" : r.note })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={r.commentaire}
                            onChange={(e) => updateRow(r.eleve_id, { commentaire: e.target.value })}
                            className="h-8 text-xs"
                            placeholder="—"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate("/portail-enseignant")}>Retour</Button>
          <Button onClick={handleSave} disabled={saving || dirtyCount === 0}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Enregistrer{dirtyCount > 0 ? ` (${dirtyCount})` : ""}
          </Button>
        </div>
      </main>
    </div>
  );
}
