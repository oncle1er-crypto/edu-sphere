import { useEffect, useMemo, useState } from "react";
import { FieldRow } from "@/components/settings/SettingsSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useCycles } from "@/hooks/useCycles";
import { useClasses } from "@/hooks/useClasses";
import { useEleves } from "@/hooks/useEleves";

interface Props {
  value: string;
  onValueChange: (eleveId: string) => void;
}

/** Sélection guidée : Niveau (cycle) → Classe → Élève. */
export function EleveClassePicker({ value, onValueChange }: Props) {
  const { cycles } = useCycles();
  const { classes } = useClasses();
  const { eleves } = useEleves();
  const [cycleId, setCycleId] = useState("all");
  const [classeId, setClasseId] = useState("all");

  const classesFiltrees = useMemo(
    () => (cycleId === "all" ? classes : classes.filter((c) => c.cycle_id === cycleId)),
    [classes, cycleId]
  );

  const elevesFiltres = useMemo(() => {
    const idsClasses = new Set(classesFiltrees.map((c) => c.id));
    return eleves.filter((e) =>
      classeId !== "all" ? e.classe_id === classeId : !!e.classe_id && idsClasses.has(e.classe_id)
    );
  }, [eleves, classesFiltrees, classeId]);

  // Si l'élève sélectionné sort du périmètre, on le désélectionne.
  useEffect(() => {
    if (value && !elevesFiltres.some((e) => e.id === value)) onValueChange("");
  }, [elevesFiltres, value, onValueChange]);

  return (
    <>
      <FieldRow label="Niveau">
        <Select
          value={cycleId}
          onValueChange={(v) => { setCycleId(v); setClasseId("all"); }}
        >
          <SelectTrigger><SelectValue placeholder="Tous les niveaux" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les niveaux</SelectItem>
            {cycles.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow label="Classe">
        <Select value={classeId} onValueChange={setClasseId}>
          <SelectTrigger><SelectValue placeholder="Toutes les classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les classes</SelectItem>
            {classesFiltrees.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow label="Élève *">
        <SearchableSelect
          value={value}
          onValueChange={onValueChange}
          placeholder={elevesFiltres.length === 0 ? "Aucun élève" : "Rechercher / sélectionner"}
          searchPlaceholder="Rechercher un élève..."
          options={elevesFiltres.map((e) => ({
            value: e.id,
            label: `${e.nom} ${e.prenom}`,
            keywords: `${e.matricule ?? ""} ${e.classe_nom ?? ""}`,
          }))}
        />
      </FieldRow>
    </>
  );
}
