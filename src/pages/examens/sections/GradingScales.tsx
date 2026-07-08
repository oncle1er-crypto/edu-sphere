import { useMemo, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Scale, Plus, Trash2, Calculator, Info } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useMatieres } from "@/hooks/useMatieres";
import { useAnneeId } from "@/hooks/useAnneeId";
import {
  useParametresMatieres,
  useClasseMatieres,
} from "@/hooks/useGradingScales";

const MENTIONS_MENA = [
  { min: 16, label: "Très Bien" },
  { min: 14, label: "Bien" },
  { min: 12, label: "Assez Bien" },
  { min: 10, label: "Passable" },
  { min: 0, label: "Insuffisant" },
];

export default function GradingScales() {
  const { anneeId } = useAnneeId();
  const { classes, loading: classesLoading } = useClasses(anneeId ?? undefined);
  const { matieres, loading: matieresLoading } = useMatieres();
  const { params, loading: paramsLoading, saveParams } = useParametresMatieres();

  const [classeId, setClasseId] = useState<string>("");
  const activeClasse = classeId || classes[0]?.id || "";
  const {
    rows,
    loading: rowsLoading,
    updateCoefficient,
    updateVolume,
    attachMatiere,
    detachMatiere,
  } = useClasseMatieres(activeClasse || null);

  const totalCoef = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.coefficient) || 0), 0),
    [rows]
  );

  const attachableMatieres = useMemo(() => {
    const used = new Set(rows.map((r) => r.matiere_id));
    return matieres.filter((m) => m.active && !used.has(m.id));
  }, [matieres, rows]);

  const [matiereToAdd, setMatiereToAdd] = useState<string>("");

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<Scale className="h-5 w-5" />}
        title="Grilles de notes & coefficients"
        description="Configurez le barème, les matières et les coefficients pour chaque classe."
      >
        <Tabs defaultValue="matieres" className="w-full">
          <TabsList>
            <TabsTrigger value="matieres">Matières & coefficients</TabsTrigger>
            <TabsTrigger value="bareme">Barème global</TabsTrigger>
            <TabsTrigger value="mentions">Mentions (MENA)</TabsTrigger>
          </TabsList>

          {/* -------- Onglet matières -------- */}
          <TabsContent value="matieres" className="space-y-4">
            <FieldRow label="Classe" hint="Sélectionnez la classe à configurer">
              {classesLoading ? (
                <Skeleton className="h-10 w-80" />
              ) : classes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune classe. Créez-en une dans le module Classes.
                </p>
              ) : (
                <Select value={activeClasse} onValueChange={setClasseId}>
                  <SelectTrigger className="sm:w-80">
                    <SelectValue placeholder="Choisir une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nom}
                        {c.cycle_nom ? ` — ${c.cycle_nom}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FieldRow>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Calculator className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Total coefficients :</span>
                <Badge variant="secondary" className="font-bold">
                  {totalCoef}
                </Badge>
                <span className="text-muted-foreground ml-3">Matières :</span>
                <Badge variant="secondary" className="font-bold">
                  {rows.length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Select value={matiereToAdd} onValueChange={setMatiereToAdd}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Ajouter une matière…" />
                  </SelectTrigger>
                  <SelectContent>
                    {attachableMatieres.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        Toutes les matières sont déjà ajoutées.
                      </div>
                    ) : (
                      attachableMatieres.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nom}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!matiereToAdd || !activeClasse}
                  onClick={async () => {
                    const ok = await attachMatiere(matiereToAdd, 1);
                    if (ok) setMatiereToAdd("");
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">Matière</TableHead>
                    <TableHead className="w-32">Coefficient</TableHead>
                    <TableHead className="w-32">Note sur</TableHead>
                    <TableHead className="w-32">Note passage</TableHead>
                    <TableHead className="w-36">Volume / sem. (h)</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowsLoading || matieresLoading ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        Aucune matière rattachée à cette classe.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{r.matiere_nom}</span>
                            {r.matiere_categorie && (
                              <Badge variant="outline" className="text-[10px]">
                                {r.matiere_categorie}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            defaultValue={r.coefficient}
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (v !== r.coefficient) updateCoefficient(r.id, v);
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.matiere_note_sur}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.matiere_note_passage}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            defaultValue={r.volume_horaire_hebdo ?? 0}
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (v !== (r.volume_horaire_hebdo ?? 0))
                                updateVolume(r.id, v);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Retirer"
                            onClick={() => detachMatiere(r.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              La note sur et la note de passage se règlent au niveau de chaque matière
              (module Matières). Ici vous ne modifiez que le coefficient et le volume
              horaire pour cette classe.
            </p>
          </TabsContent>

          {/* -------- Onglet barème global -------- */}
          <TabsContent value="bareme" className="space-y-4">
            {paramsLoading || !params ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FieldRow label="Échelle par défaut" hint="Note maximale des matières nouvelles">
                  <Input
                    type="number"
                    min={1}
                    defaultValue={params.echelle_defaut}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== params.echelle_defaut)
                        saveParams({ echelle_defaut: v });
                    }}
                  />
                </FieldRow>
                <FieldRow label="Note de passage par défaut">
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    defaultValue={Number(params.note_passage_defaut)}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== Number(params.note_passage_defaut))
                        saveParams({ note_passage_defaut: v });
                    }}
                  />
                </FieldRow>
                <FieldRow label="Coefficient par défaut">
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    defaultValue={Number(params.coefficient_defaut)}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== Number(params.coefficient_defaut))
                        saveParams({ coefficient_defaut: v });
                    }}
                  />
                </FieldRow>
                <FieldRow label="Autoriser les matières optionnelles">
                  <Switch
                    checked={params.matieres_optionnelles}
                    onCheckedChange={(v) => saveParams({ matieres_optionnelles: v })}
                  />
                </FieldRow>
                <FieldRow label="Inclure l'éducation religieuse">
                  <Switch
                    checked={params.education_religieuse}
                    onCheckedChange={(v) => saveParams({ education_religieuse: v })}
                  />
                </FieldRow>
                <FieldRow label="Afficher le code matière sur les bulletins">
                  <Switch
                    checked={params.afficher_code_bulletin}
                    onCheckedChange={(v) => saveParams({ afficher_code_bulletin: v })}
                  />
                </FieldRow>
                <FieldRow label="Verrouiller les coefficients" hint="Empêche toute modification par les enseignants">
                  <Switch
                    checked={params.verrouiller_coefficients}
                    onCheckedChange={(v) => saveParams({ verrouiller_coefficients: v })}
                  />
                </FieldRow>
              </div>
            )}
          </TabsContent>

          {/* -------- Onglet mentions -------- */}
          <TabsContent value="mentions" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Barème officiel du MENA (Côte d'Ivoire). Ces mentions sont appliquées
              automatiquement au calcul des moyennes.
            </p>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Seuil ≥</TableHead>
                    <TableHead>Mention</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MENTIONS_MENA.map((m) => (
                    <TableRow key={m.label}>
                      <TableCell className="font-mono">{m.min}/20</TableCell>
                      <TableCell className="font-medium">{m.label}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </SettingsSection>
    </div>
  );
}
