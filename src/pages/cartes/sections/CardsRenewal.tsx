import { useCards } from "@/pages/cartes/context/CardsContext";
import { Button } from "@/components/ui/button";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";

export default function CardsRenewal() {
  const { cards, addCards, updateCard } = useCards();
  const { activeAnnee } = useAcademicPeriod();
  const [newAnnee, setNewAnnee] = useState(activeAnnee.libelle.replace(/\s/g, ""));
  const [newValid, setNewValid] = useState(activeAnnee.fin);
  const [archiveOld, setArchiveOld] = useState(true);

  const renouvelables = cards.filter((c) => c.statut === "active" && c.anneeScolaire !== newAnnee);

  const renouveler = () => {
    if (renouvelables.length === 0) {
      toast.info("Toutes les cartes actives sont déjà à jour");
      return;
    }
    const now = new Date().toISOString().slice(0, 10);
    const newOnes = renouvelables.map((c) => ({
      ...c,
      id: `card_${Date.now()}_${c.matricule}`,
      anneeScolaire: newAnnee,
      validJusqu: newValid,
      emiseLe: now,
      statut: "active" as const,
    }));
    addCards(newOnes);
    if (archiveOld) {
      renouvelables.forEach((c) => updateCard(c.id, { statut: "expiree" }));
    }
    toast.success(`${newOnes.length} carte(s) renouvelée(s) pour ${newAnnee}`);
  };

  return (
    <SettingsSection
      title="Renouvellement de masse"
      description="Émettre une nouvelle vague de cartes pour la prochaine année scolaire."
      icon={<RefreshCw className="h-5 w-5" />}
      hideSave
    >
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p>
          Cette opération crée une nouvelle carte pour <strong>chaque titulaire actuellement actif</strong>.
          {" "}Les anciennes cartes seront marquées comme expirées si l'option est activée.
        </p>
      </div>

      <FieldRow label="Nouvelle année scolaire">
        <Input value={newAnnee} onChange={(e) => setNewAnnee(e.target.value)} placeholder="2026-2027" />
      </FieldRow>
      <FieldRow label="Valide jusqu'au">
        <Input type="date" value={newValid} onChange={(e) => setNewValid(e.target.value)} />
      </FieldRow>
      <FieldRow label="Marquer les anciennes cartes comme expirées" hint="Recommandé pour invalider les anciens QR.">
        <Switch checked={archiveOld} onCheckedChange={setArchiveOld} />
      </FieldRow>

      <div className="flex items-center justify-between border-t pt-4">
        <p className="text-sm text-muted-foreground">
          <strong>{renouvelables.length}</strong> carte(s) seront renouvelées
        </p>
        <Button onClick={renouveler} disabled={renouvelables.length === 0}>
          <RefreshCw className="h-4 w-4" />
          Lancer le renouvellement
        </Button>
      </div>
    </SettingsSection>
  );
}
