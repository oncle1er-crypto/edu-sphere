import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2 } from "lucide-react";
import { useParametresMatieres } from "@/hooks/useGradingScales";

export default function ExamsConfig() {
  const { params, loading, saveParams } = useParametresMatieres();

  if (loading || !params) {
    return (
      <SettingsSection icon={<Settings2 className="h-5 w-5" />} title="Configuration" description="Paramètres généraux du module évaluations." hideSave>
        <Skeleton className="h-64 w-full" />
      </SettingsSection>
    );
  }

  const p = params as any;

  return (
    <SettingsSection
      icon={<Settings2 className="h-5 w-5" />}
      title="Configuration"
      description="Paramètres généraux du module évaluations. Les modifications sont enregistrées automatiquement."
      hideSave
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FieldRow label="Système de notation">
          <Select
            value={p.systeme_notation ?? "20"}
            onValueChange={(v) => saveParams({ systeme_notation: v } as any)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="20">Sur 20 (système français / MENA)</SelectItem>
              <SelectItem value="100">Sur 100 (pourcentage)</SelectItem>
              <SelectItem value="gpa">GPA (système américain)</SelectItem>
              <SelectItem value="lettre">Lettres (A, B, C, D, E)</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Note de passage">
          <Input
            type="number"
            min={0}
            step={0.5}
            defaultValue={Number(p.note_passage_defaut)}
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (v !== Number(p.note_passage_defaut)) saveParams({ note_passage_defaut: v });
            }}
          />
        </FieldRow>

        <FieldRow label="Échelle par défaut">
          <Input
            type="number"
            min={1}
            defaultValue={p.echelle_defaut}
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (v !== p.echelle_defaut) saveParams({ echelle_defaut: v });
            }}
          />
        </FieldRow>

        <FieldRow label="Coefficient par défaut">
          <Input
            type="number"
            min={0}
            step={0.5}
            defaultValue={Number(p.coefficient_defaut)}
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (v !== Number(p.coefficient_defaut)) saveParams({ coefficient_defaut: v });
            }}
          />
        </FieldRow>

        <FieldRow label="Décimales affichées">
          <Select
            value={String(p.decimales_affichees ?? 2)}
            onValueChange={(v) => saveParams({ decimales_affichees: Number(v) } as any)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0 (entiers)</SelectItem>
              <SelectItem value="1">1 décimale</SelectItem>
              <SelectItem value="2">2 décimales</SelectItem>
              <SelectItem value="3">3 décimales</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Méthode d'arrondi">
          <Select
            value={p.arrondi ?? "arithmetique"}
            onValueChange={(v) => saveParams({ arrondi: v } as any)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="arithmetique">Arithmétique (0.5 → 1)</SelectItem>
              <SelectItem value="superieur">Toujours supérieur</SelectItem>
              <SelectItem value="inferieur">Toujours inférieur</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Autoriser les notes hors barème" hint="Ex : bonus au-delà de la note maximale">
          <Switch
            checked={p.autoriser_notes_hors_bareme ?? false}
            onCheckedChange={(v) => saveParams({ autoriser_notes_hors_bareme: v } as any)}
          />
        </FieldRow>

        <FieldRow label="Verrouiller les coefficients">
          <Switch
            checked={p.verrouiller_coefficients}
            onCheckedChange={(v) => saveParams({ verrouiller_coefficients: v })}
          />
        </FieldRow>

        <FieldRow label="Afficher les mentions sur les bulletins">
          <Switch
            checked={p.afficher_mentions ?? true}
            onCheckedChange={(v) => saveParams({ afficher_mentions: v } as any)}
          />
        </FieldRow>

        <FieldRow label="Afficher le rang">
          <Switch
            checked={p.afficher_rang ?? true}
            onCheckedChange={(v) => saveParams({ afficher_rang: v } as any)}
          />
        </FieldRow>

        <FieldRow label="Afficher l'appréciation générale">
          <Switch
            checked={p.afficher_appreciation ?? true}
            onCheckedChange={(v) => saveParams({ afficher_appreciation: v } as any)}
          />
        </FieldRow>

        <FieldRow label="Afficher le code matière sur les bulletins">
          <Switch
            checked={p.afficher_code_bulletin}
            onCheckedChange={(v) => saveParams({ afficher_code_bulletin: v })}
          />
        </FieldRow>

        <FieldRow label="Autoriser les matières optionnelles">
          <Switch
            checked={p.matieres_optionnelles}
            onCheckedChange={(v) => saveParams({ matieres_optionnelles: v })}
          />
        </FieldRow>

        <FieldRow label="Inclure l'éducation religieuse">
          <Switch
            checked={p.education_religieuse}
            onCheckedChange={(v) => saveParams({ education_religieuse: v })}
          />
        </FieldRow>
      </div>

      <div className="space-y-2">
        <Label>Texte affiché en pied de bulletin</Label>
        <Textarea
          rows={3}
          defaultValue={p.texte_pied_bulletin ?? ""}
          placeholder="Ex : « Foi, Savoir, Excellence » — Groupe Scolaire La Providence"
          onBlur={(e) => {
            const v = e.target.value || null;
            if (v !== (p.texte_pied_bulletin ?? null))
              saveParams({ texte_pied_bulletin: v } as any);
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>URL de la signature du directeur (image)</Label>
        <Input
          type="url"
          defaultValue={p.signature_directeur_url ?? ""}
          placeholder="https://…/signature-directeur.png"
          onBlur={(e) => {
            const v = e.target.value || null;
            if (v !== (p.signature_directeur_url ?? null))
              saveParams({ signature_directeur_url: v } as any);
          }}
        />
      </div>
    </SettingsSection>
  );
}
