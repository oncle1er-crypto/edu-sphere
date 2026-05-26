import { useMemo, useRef, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, Printer, Users } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useEleves } from "@/hooks/useEleves";
import { useEcoles } from "@/context/EcoleContext";
import { buildStudentCardData } from "@/pages/cartes/lib/buildStudentCardData";
import { StudentIdCardFront, StudentIdCardBack } from "@/pages/cartes/components/StudentIdCard";
import { generateClassCardsPDF } from "@/pages/cartes/lib/generateClassCardsPDF";
import { toast } from "sonner";

export default function CardsBatchByClass() {
  const { classes, loading: classesLoading } = useClasses();
  const { eleves, loading: elevesLoading } = useEleves();
  const { currentEcole } = useEcoles();

  const [classeId, setClasseId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const hiddenRef = useRef<HTMLDivElement>(null);

  const classeEleves = useMemo(
    () =>
      classeId
        ? eleves.filter((e) => (e as any).classe_id === classeId && e.statut !== "exclu")
        : [],
    [eleves, classeId],
  );

  const cards = useMemo(
    () => classeEleves.map((e) => buildStudentCardData(e, currentEcole)),
    [classeEleves, currentEcole],
  );

  const handleDownload = async () => {
    if (!cards.length) {
      toast.error("Aucun élève dans cette classe");
      return;
    }
    if (!hiddenRef.current) return;
    setBusy(true);
    try {
      const classeName =
        classes.find((c) => c.id === classeId)?.nom?.replace(/\s+/g, "_") ?? "classe";
      await generateClassCardsPDF(
        hiddenRef.current,
        cards,
        `cartes-${classeName}.pdf`,
      );
      toast.success(`${cards.length} carte(s) générée(s)`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<Users className="h-5 w-5" />}
        title="Génération des cartes par classe"
        description="Sélectionnez une classe : un PDF prêt à imprimer (recto + verso) sera généré pour tous les élèves."
        hideSave
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <Label className="text-xs">Classe</Label>
            <Select value={classeId} onValueChange={setClasseId} disabled={classesLoading}>
              <SelectTrigger>
                <SelectValue placeholder={classesLoading ? "Chargement..." : "Choisir une classe"} />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nom} {c.cycle_nom ? `— ${c.cycle_nom}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            {classeId
              ? `${classeEleves.length} élève(s) trouvé(s)`
              : "Aucune classe sélectionnée"}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => window.print()}
              disabled={busy || !cards.length}
            >
              <Printer className="h-4 w-4" /> Imprimer
            </Button>
            <Button onClick={handleDownload} disabled={busy || elevesLoading || !cards.length}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Télécharger PDF ({cards.length})
            </Button>
          </div>
        </div>

        {/* Aperçu en grille des cartes */}
        {cards.length > 0 && (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
              Aperçu ({cards.length} cartes)
            </p>
            <div className="flex flex-wrap gap-4 max-h-[480px] overflow-auto p-2 bg-muted/30 rounded-lg">
              {cards.map((c) => (
                <div key={c.id} className="flex flex-col items-center gap-1">
                  <div className="flex gap-1">
                    <StudentIdCardFront data={c} scale={0.6} />
                    <StudentIdCardBack data={c} scale={0.6} />
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                    {c.nom} {c.prenom}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SettingsSection>

      {/* Zone de rendu cachée — utilisée par html2canvas pour capture haute résolution */}
      <div
        ref={hiddenRef}
        aria-hidden
        style={{
          position: "fixed",
          left: -10000,
          top: 0,
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        {cards.map((c) => (
          <div key={c.id} style={{ marginBottom: 8 }}>
            <div data-card-id={c.id}>
              <StudentIdCardFront data={c} scale={1} />
            </div>
            <div data-card-id={c.id}>
              <StudentIdCardBack data={c} scale={1} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
