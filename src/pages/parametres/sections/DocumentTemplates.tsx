import { FileSignature, FileText, Award, IdCard, Mail, Upload, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

const TEMPLATE_LIST = [
  { id: "bulletin", icon: FileText, title: "Bulletin de notes", desc: "Modèle PDF imprimé chaque trimestre" },
  { id: "certificat", icon: Award, title: "Certificat de scolarité", desc: "Attestation officielle pour démarches" },
  { id: "carte", icon: IdCard, title: "Carte scolaire", desc: "Carte d'identité de l'élève" },
  { id: "convocation", icon: Mail, title: "Convocation parents", desc: "Modèle de convocation officielle" },
  { id: "presence", icon: FileText, title: "Attestation de présence", desc: "Document officiel de fréquentation" },
];

const DEFAULTS = {
  entete: "République de Côte d'Ivoire\nMinistère de l'Éducation Nationale et de l'Alphabétisation\nDirection Diocésaine de l'Enseignement Catholique — Abidjan\nComplexe Scolaire La Providence de Don Orione",
  pied_page: "Complexe Scolaire La Providence de Don Orione • Abidjan • +225 ... • contact@laprovidence.ci",
  show_logo: true,
  show_cachet: true,
  signature_url: "" as string | null,
  prefixe_bulletin: "BUL-2025/2026-",
  prefixe_certificat: "CERT-2025-",
  templates_actifs: { bulletin: true, certificat: true, carte: true, convocation: false, presence: true } as Record<string, boolean>,
};

export default function DocumentTemplates() {
  const { ecoleId, loading: loadingId } = useEcoleId();
  const [data, setData] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const sigRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ecoleId) { if (!loadingId) setLoading(false); return; }
    supabase.from("parametres_documents").select("*").eq("ecole_id", ecoleId).maybeSingle()
      .then(({ data: row }) => {
        if (row) setData({
          entete: row.entete ?? DEFAULTS.entete,
          pied_page: row.pied_page ?? DEFAULTS.pied_page,
          show_logo: row.show_logo,
          show_cachet: row.show_cachet,
          signature_url: row.signature_url,
          prefixe_bulletin: row.prefixe_bulletin ?? "",
          prefixe_certificat: row.prefixe_certificat ?? "",
          templates_actifs: { ...DEFAULTS.templates_actifs, ...(row.templates_actifs as Record<string, boolean>) },
        });
        setLoading(false);
      });
  }, [ecoleId, loadingId]);

  const update = (patch: Partial<typeof DEFAULTS>) => setData(d => ({ ...d, ...patch }));

  const handleSave = async () => {
    if (!ecoleId) return;
    const { error } = await supabase.from("parametres_documents")
      .upsert({ ecole_id: ecoleId, ...data }, { onConflict: "ecole_id" });
    if (error) toast.error(error.message);
    else toast.success("Modèles de documents enregistrés");
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ecoleId) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${ecoleId}/signature-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
    update({ signature_url: pub.publicUrl });
    setUploading(false);
    toast.success("Signature téléversée — pensez à enregistrer");
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <SettingsSection
        title="En-tête & pied de page"
        description="Apparaissent sur tous les documents officiels (bulletins, factures, attestations)."
        icon={<FileSignature className="h-5 w-5" />}
        onSave={handleSave}
      >
        <FieldRow label="Texte d'en-tête" hint="Affiché en haut de chaque document">
          <Textarea rows={4} value={data.entete} onChange={e => update({ entete: e.target.value })} />
        </FieldRow>
        <FieldRow label="Pied de page">
          <Textarea rows={2} value={data.pied_page} onChange={e => update({ pied_page: e.target.value })} />
        </FieldRow>
        <FieldRow label="Afficher le logo">
          <Switch checked={data.show_logo} onCheckedChange={v => update({ show_logo: v })} />
        </FieldRow>
        <FieldRow label="Afficher le cachet de la direction">
          <Switch checked={data.show_cachet} onCheckedChange={v => update({ show_cachet: v })} />
        </FieldRow>
        <FieldRow label="Signature du directeur" hint="Image PNG transparente">
          <div className="flex items-center gap-3">
            {data.signature_url && <img src={data.signature_url} alt="Signature" className="h-12 border rounded bg-white p-1" />}
            <input ref={sigRef} type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
            <Button variant="outline" size="sm" onClick={() => sigRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Téléverser une signature
            </Button>
          </div>
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        title="Modèles disponibles"
        description="Activez ou désactivez les documents générés automatiquement."
        icon={<FileSignature className="h-5 w-5" />}
        onSave={handleSave}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TEMPLATE_LIST.map((t) => (
            <Card key={t.id} className="p-4 flex items-start gap-3 hover:border-accent/40 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-accent/15 text-primary flex items-center justify-center shrink-0">
                <t.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm text-primary truncate">{t.title}</h3>
                  <Switch
                    checked={data.templates_actifs[t.id] ?? false}
                    onCheckedChange={v => update({ templates_actifs: { ...data.templates_actifs, [t.id]: v } })}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Numérotation automatique"
        description="Format des numéros de bulletin et certificats."
        icon={<FileSignature className="h-5 w-5" />}
        onSave={handleSave}
      >
        <FieldRow label="Préfixe bulletin">
          <Input value={data.prefixe_bulletin} onChange={e => update({ prefixe_bulletin: e.target.value })} className="w-64" />
        </FieldRow>
        <FieldRow label="Préfixe certificat">
          <Input value={data.prefixe_certificat} onChange={e => update({ prefixe_certificat: e.target.value })} className="w-64" />
        </FieldRow>
      </SettingsSection>
    </div>
  );
}
