import { useState } from "react";
import { useCards, type IssuedCard } from "@/pages/cartes/context/CardsContext";
import type { CardType } from "@/pages/cartes/components/SchoolCard";
import { SchoolCard } from "@/pages/cartes/components/SchoolCard";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Wand2 } from "lucide-react";
import { toast } from "sonner";

const TYPE_LABELS: Record<CardType, string> = {
  eleve: "Carte élève", personnel: "Badge personnel", cantine: "Carte cantine",
  transport: "Carte transport", bibliotheque: "Carte bibliothèque", visiteur: "Badge visiteur",
};

// Pool d'élèves fictifs pour la démo (en prod : viendra de la table students)
const POOL_ELEVES = [
  { matricule: "EL-2456", nom: "OWONO", prenom: "Marie", classe: "6ème A" },
  { matricule: "EL-2457", nom: "BESSALA", prenom: "André", classe: "6ème A" },
  { matricule: "EL-2458", nom: "FALL", prenom: "Mamadou", classe: "6ème A" },
  { matricule: "EL-2459", nom: "DIOUF", prenom: "Awa", classe: "6ème A" },
  { matricule: "EL-2460", nom: "KOUASSI", prenom: "Jean", classe: "6ème A" },
];

const ECOLE = {
  ecoleId: "ec_001",
  ecoleNom: "Complexe Scolaire La Providence de Don Orione",
  ecoleVille: "Dakar",
};

export default function CardsIssue() {
  const { addCards } = useCards();
  const [type, setType] = useState<CardType>("eleve");
  const [classe, setClasse] = useState("6ème A");
  const [annee, setAnnee] = useState("2025-2026");
  const [validJusqu, setValidJusqu] = useState("2026-07-31");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // Saisie individuelle
  const [oneNom, setOneNom] = useState("");
  const [onePrenom, setOnePrenom] = useState("");
  const [oneMatricule, setOneMatricule] = useState("");
  const [oneDetail, setOneDetail] = useState(""); // classe/fonction/formule selon type

  const togglerAll = (v: boolean) => {
    const next: Record<string, boolean> = {};
    POOL_ELEVES.forEach((e) => (next[e.matricule] = v));
    setSelected(next);
  };

  const issueBatch = () => {
    const targets = POOL_ELEVES.filter((e) => selected[e.matricule]);
    if (targets.length === 0) {
      toast.error("Sélectionnez au moins un élève");
      return;
    }
    const now = new Date().toISOString().slice(0, 10);
    const newCards: IssuedCard[] = targets.map((e) => ({
      id: `card_${Date.now()}_${e.matricule}`,
      type, ...ECOLE,
      nom: e.nom, prenom: e.prenom, matricule: e.matricule,
      classe: type === "eleve" || type === "cantine" ? e.classe : undefined,
      formule: type === "cantine" ? "Demi-pensionnaire" : undefined,
      ligne: type === "transport" ? "Ligne 1" : undefined,
      numLecteur: type === "bibliotheque" ? `LEC-${e.matricule.slice(-3)}` : undefined,
      anneeScolaire: annee, validJusqu,
      emiseLe: now, statut: "active",
    }));
    addCards(newCards);
    setSelected({});
    toast.success(`${newCards.length} carte(s) émise(s) — ajoutées à la file d'impression`);
  };

  const issueOne = () => {
    if (!oneNom || !onePrenom || !oneMatricule) {
      toast.error("Nom, prénom et matricule requis");
      return;
    }
    const now = new Date().toISOString().slice(0, 10);
    const card: IssuedCard = {
      id: `card_${Date.now()}`,
      type, ...ECOLE,
      nom: oneNom.toUpperCase(), prenom: onePrenom, matricule: oneMatricule,
      classe: type === "eleve" || type === "cantine" ? oneDetail : undefined,
      fonction: type === "personnel" ? oneDetail : undefined,
      formule: type === "cantine" ? oneDetail || "Demi-pensionnaire" : undefined,
      ligne: type === "transport" ? oneDetail : undefined,
      numLecteur: type === "bibliotheque" ? oneDetail : undefined,
      motif: type === "visiteur" ? oneDetail : undefined,
      anneeScolaire: annee, validJusqu,
      emiseLe: now, statut: "active",
    };
    addCards([card]);
    setOneNom(""); setOnePrenom(""); setOneMatricule(""); setOneDetail("");
    toast.success("Carte émise");
  };

  // Aperçu live
  const previewCard: IssuedCard = {
    id: "preview", type, ...ECOLE,
    nom: oneNom ? oneNom.toUpperCase() : "NOM",
    prenom: onePrenom || "Prénom",
    matricule: oneMatricule || "—",
    classe: type === "eleve" || type === "cantine" ? (oneDetail || classe) : undefined,
    fonction: type === "personnel" ? (oneDetail || "Fonction") : undefined,
    formule: type === "cantine" ? (oneDetail || "Demi-pensionnaire") : undefined,
    ligne: type === "transport" ? (oneDetail || "Ligne") : undefined,
    numLecteur: type === "bibliotheque" ? (oneDetail || "LEC-XXX") : undefined,
    motif: type === "visiteur" ? (oneDetail || "Motif") : undefined,
    anneeScolaire: annee, validJusqu,
    emiseLe: new Date().toISOString().slice(0, 10),
    statut: "active",
  };

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Émission par lot"
        description="Sélectionnez plusieurs titulaires à équiper en une seule opération (ex : toute une classe)."
        icon={<Wand2 className="h-5 w-5" />}
        hideSave
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Type de carte</Label>
            <Select value={type} onValueChange={(v) => setType(v as CardType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABELS) as CardType[]).map((t) => (
                  <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Classe (filtre)</Label>
            <Select value={classe} onValueChange={setClasse}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="6ème A">6ème A</SelectItem>
                <SelectItem value="5ème B">5ème B</SelectItem>
                <SelectItem value="3ème A">3ème A</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Année scolaire</Label>
            <Input value={annee} onChange={(e) => setAnnee(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Valide jusqu'au</Label>
            <Input type="date" value={validJusqu} onChange={(e) => setValidJusqu(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={POOL_ELEVES.every((e) => selected[e.matricule])}
              onCheckedChange={(v) => togglerAll(v === true)}
            />
            <span className="text-sm font-medium">Tout sélectionner</span>
          </div>
          <Button onClick={issueBatch}>
            <Plus className="h-4 w-4" />
            Émettre la sélection
          </Button>
        </div>

        <div className="border rounded-lg divide-y">
          {POOL_ELEVES.map((e) => (
            <label key={e.matricule} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40">
              <Checkbox
                checked={!!selected[e.matricule]}
                onCheckedChange={(v) => setSelected((s) => ({ ...s, [e.matricule]: v === true }))}
              />
              <div className="flex-1">
                <p className="font-medium">{e.nom} {e.prenom}</p>
                <p className="text-xs text-muted-foreground">{e.matricule} — {e.classe}</p>
              </div>
            </label>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Émission individuelle"
        description="Créer une carte unique avec aperçu en temps réel."
        icon={<Plus className="h-5 w-5" />}
        hideSave
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="space-y-3">
            <FieldRow label="Nom"><Input value={oneNom} onChange={(e) => setOneNom(e.target.value)} placeholder="DUPONT" /></FieldRow>
            <FieldRow label="Prénom"><Input value={onePrenom} onChange={(e) => setOnePrenom(e.target.value)} placeholder="Marie" /></FieldRow>
            <FieldRow label="Matricule"><Input value={oneMatricule} onChange={(e) => setOneMatricule(e.target.value)} placeholder="EL-XXXX" /></FieldRow>
            <FieldRow label={
              type === "personnel" ? "Fonction" :
              type === "cantine" ? "Formule" :
              type === "transport" ? "Ligne" :
              type === "bibliotheque" ? "N° lecteur" :
              type === "visiteur" ? "Motif" : "Classe"
            }>
              <Input value={oneDetail} onChange={(e) => setOneDetail(e.target.value)} />
            </FieldRow>
            <div className="flex justify-end pt-2">
              <Button onClick={issueOne}><Plus className="h-4 w-4" />Émettre la carte</Button>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 bg-muted/30 rounded-xl p-6">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Aperçu en direct</span>
            <SchoolCard data={previewCard} scale={1.2} />
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
