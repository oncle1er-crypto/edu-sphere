import { FileSignature, FileText, Award, IdCard, Mail } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const templates = [
  { icon: FileText, title: "Bulletin de notes", desc: "Modèle PDF imprimé chaque trimestre", active: true },
  { icon: Award, title: "Certificat de scolarité", desc: "Attestation officielle pour démarches", active: true },
  { icon: IdCard, title: "Carte scolaire", desc: "Carte d'identité de l'élève", active: true },
  { icon: Mail, title: "Convocation parents", desc: "Modèle de convocation officielle", active: false },
  { icon: FileText, title: "Attestation de présence", desc: "Document officiel de fréquentation", active: true },
];

export default function DocumentTemplates() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="En-tête & pied de page"
        description="Apparaissent sur tous les documents officiels (bulletins, factures, attestations)."
        icon={<FileSignature className="h-5 w-5" />}
      >
        <FieldRow label="Texte d'en-tête" hint="Affiché en haut de chaque document">
          <Textarea rows={4} defaultValue="République de Côte d'Ivoire&#10;Ministère de l'Éducation Nationale et de l'Alphabétisation&#10;Direction Diocésaine de l'Enseignement Catholique — Abidjan&#10;Groupe Scolaire La Providence" />
        </FieldRow>
        <FieldRow label="Pied de page">
          <Textarea rows={2} defaultValue="Groupe Scolaire La Providence • 01 BP 1234 Abidjan • +225 07 07 11 22 33 • contact@laprovidence.ci" />
        </FieldRow>
        <FieldRow label="Afficher le logo">
          <Switch defaultChecked />
        </FieldRow>
        <FieldRow label="Afficher le cachet de la direction">
          <Switch defaultChecked />
        </FieldRow>
        <FieldRow label="Signature du directeur" hint="Image PNG transparente">
          <Button variant="outline" size="sm">Téléverser une signature</Button>
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        title="Modèles disponibles"
        description="Personnalisez les documents générés automatiquement par la plateforme."
        icon={<FileSignature className="h-5 w-5" />}
        hideSave
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((t) => (
            <Card key={t.title} className="p-4 flex items-start gap-3 hover:border-accent/40 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
                <t.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm text-primary truncate">{t.title}</h3>
                  <Switch defaultChecked={t.active} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                <Button variant="link" size="sm" className="px-0 h-auto mt-1 text-xs">
                  Personnaliser
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Numérotation automatique"
        description="Format des numéros de bulletin et certificats."
        icon={<FileSignature className="h-5 w-5" />}
      >
        <FieldRow label="Préfixe bulletin">
          <Input defaultValue="BUL-2025/2026-" className="w-48" />
        </FieldRow>
        <FieldRow label="Préfixe certificat">
          <Input defaultValue="CERT-2025-" className="w-48" />
        </FieldRow>
      </SettingsSection>
    </div>
  );
}
