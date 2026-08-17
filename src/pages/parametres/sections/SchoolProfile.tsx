import { Building2, Upload, Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

type Ecole = {
  nom: string; sigle: string | null; devise: string | null; type: string;
  cycles: string | null; diocese: string | null; agrement: string | null;
  annee_creation: number | null; adresse: string | null; telephone: string | null;
  email: string | null; site_web: string | null; directeur: string | null;
  ville: string; pays: string; logo_url: string | null;
  // En-tête officiel — utilisé sur les documents administratifs formels
  // (ex. fiche de paiement à faire signer par un bénéficiaire).
  ministere: string | null; drenet: string | null; ddenet: string | null;
  devise_nationale: string | null; armoiries_url: string | null;
};

const EMPTY: Ecole = {
  nom: "", sigle: "", devise: "Foi, Savoir, Excellence", type: "Groupe scolaire",
  cycles: "", diocese: "", agrement: "", annee_creation: null,
  adresse: "", telephone: "", email: "", site_web: "", directeur: "",
  ville: "Abidjan", pays: "Côte d'Ivoire", logo_url: null,
  ministere: "", drenet: "", ddenet: "", devise_nationale: "Union - Discipline - Travail",
  armoiries_url: null,
};

export default function SchoolProfile() {
  const { ecoleId, loading: loadingId } = useEcoleId();
  const [data, setData] = useState<Ecole>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingArmoiries, setUploadingArmoiries] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const armoiriesFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ecoleId) { if (!loadingId) setLoading(false); return; }
    supabase.from("ecoles").select("*").eq("id", ecoleId).single().then(({ data, error }) => {
      if (!error && data) setData({ ...EMPTY, ...data });
      setLoading(false);
    });
  }, [ecoleId, loadingId]);

  const update = <K extends keyof Ecole>(k: K, v: Ecole[K]) => setData(d => ({ ...d, [k]: v }));

  const handleSave = async () => {
    if (!ecoleId) {
      toast.error("Aucune école active — reconnectez-vous.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("ecoles").update({
      nom: data.nom, sigle: data.sigle, devise: data.devise, type: data.type,
      cycles: data.cycles, diocese: data.diocese, agrement: data.agrement,
      annee_creation: data.annee_creation, adresse: data.adresse,
      telephone: data.telephone, email: data.email, site_web: data.site_web,
      directeur: data.directeur, ville: data.ville, pays: data.pays,
      ministere: data.ministere, drenet: data.drenet, ddenet: data.ddenet,
      devise_nationale: data.devise_nationale,
    }).eq("id", ecoleId);
    setSaving(false);
    if (error) {
      console.error("[SchoolProfile] update failed:", error);
      toast.error("Erreur : " + messageErreurBase(error));
      throw error;
    }
    toast.success("Profil de l'école enregistré");
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ecoleId) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${ecoleId}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (upErr) { toast.error(messageErreurBase(upErr)); setUploading(false); return; }
    const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
    const { error } = await supabase.from("ecoles").update({ logo_url: pub.publicUrl }).eq("id", ecoleId);
    setUploading(false);
    if (error) toast.error(messageErreurBase(error));
    else { update("logo_url", pub.publicUrl); toast.success("Logo mis à jour"); }
  };

  // Armoiries nationales — même bucket "logos" que le logo de l'école (image
  // publique, pas de contenu sensible), champ distinct armoiries_url.
  const handleArmoiriesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ecoleId) return;
    setUploadingArmoiries(true);
    const ext = file.name.split(".").pop();
    const path = `${ecoleId}/armoiries-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (upErr) { toast.error(messageErreurBase(upErr)); setUploadingArmoiries(false); return; }
    const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
    const { error } = await supabase.from("ecoles").update({ armoiries_url: pub.publicUrl }).eq("id", ecoleId);
    setUploadingArmoiries(false);
    if (error) toast.error(messageErreurBase(error));
    else { update("armoiries_url", pub.publicUrl); toast.success("Armoiries mises à jour"); }
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <SettingsSection
      title="Profil de l'école"
      description="Informations officielles de votre établissement, affichées sur les documents."
      icon={<Building2 className="h-5 w-5" />}
      onSave={handleSave}
    >
      <FieldRow label="Logo de l'école" hint="PNG ou JPG, 512x512px recommandé">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-xl bg-muted border-2 border-dashed flex items-center justify-center text-muted-foreground overflow-hidden">
            {data.logo_url ? <img src={data.logo_url} alt="Logo" className="h-full w-full object-contain" /> : <Building2 className="h-9 w-9 sm:h-8 sm:w-8" />}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Téléverser
          </Button>
        </div>
      </FieldRow>

      <FieldRow label="Nom officiel"><Input value={data.nom} onChange={e => update("nom", e.target.value)} /></FieldRow>
      <FieldRow label="Sigle / abréviation"><Input value={data.sigle ?? ""} onChange={e => update("sigle", e.target.value)} maxLength={10} /></FieldRow>
      <FieldRow label="Devise / slogan"><Input value={data.devise ?? ""} onChange={e => update("devise", e.target.value)} /></FieldRow>
      <FieldRow label="Type d'établissement">
        <Select value={data.type} onValueChange={v => update("type", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Groupe scolaire">Groupe scolaire</SelectItem>
            <SelectItem value="Privé confessionnel catholique">Privé confessionnel catholique</SelectItem>
            <SelectItem value="Privé laïc">Privé laïc</SelectItem>
            <SelectItem value="Public">Public</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Cycles"><Input value={data.cycles ?? ""} onChange={e => update("cycles", e.target.value)} placeholder="Maternelle • Primaire • Collège • Lycée" /></FieldRow>
      <FieldRow label="Diocèse de rattachement"><Input value={data.diocese ?? ""} onChange={e => update("diocese", e.target.value)} /></FieldRow>
      <FieldRow label="N° d'agrément (MENA)"><Input value={data.agrement ?? ""} onChange={e => update("agrement", e.target.value)} /></FieldRow>
      <FieldRow label="Année de création">
        <Input type="number" value={data.annee_creation ?? ""} onChange={e => update("annee_creation", e.target.value ? parseInt(e.target.value) : null)} className="w-32" />
      </FieldRow>
      <FieldRow label="Adresse complète"><Textarea rows={3} value={data.adresse ?? ""} onChange={e => update("adresse", e.target.value)} /></FieldRow>
      <FieldRow label="Ville"><Input value={data.ville} onChange={e => update("ville", e.target.value)} /></FieldRow>
      <FieldRow label="Pays"><Input value={data.pays} onChange={e => update("pays", e.target.value)} /></FieldRow>
      <FieldRow label="Téléphone"><Input value={data.telephone ?? ""} onChange={e => update("telephone", e.target.value)} placeholder="+225 ..." /></FieldRow>
      <FieldRow label="Email"><Input type="email" value={data.email ?? ""} onChange={e => update("email", e.target.value)} /></FieldRow>
      <FieldRow label="Site web"><Input type="url" value={data.site_web ?? ""} onChange={e => update("site_web", e.target.value)} /></FieldRow>
      <FieldRow label="Directeur / Proviseur"><Input value={data.directeur ?? ""} onChange={e => update("directeur", e.target.value)} /></FieldRow>

      <div className="pt-4 mt-4 border-t">
        <p className="text-sm font-semibold mb-1">En-tête officiel</p>
        <p className="text-xs text-muted-foreground mb-3">
          Utilisé sur les documents administratifs formels (ex. fiche de paiement à faire signer). Saisi une seule fois ici.
        </p>
      </div>
      <FieldRow label="Ministère de tutelle"><Input value={data.ministere ?? ""} onChange={e => update("ministere", e.target.value)} placeholder="Ministère de l'Éducation Nationale et de l'Alphabétisation" /></FieldRow>
      <FieldRow label="DRENET (rattachement)"><Input value={data.drenet ?? ""} onChange={e => update("drenet", e.target.value)} placeholder="DRENET Aboisso" /></FieldRow>
      <FieldRow label="DDENET (rattachement)"><Input value={data.ddenet ?? ""} onChange={e => update("ddenet", e.target.value)} placeholder="DDENET Grand Bassam" /></FieldRow>
      <FieldRow label="Devise nationale"><Input value={data.devise_nationale ?? ""} onChange={e => update("devise_nationale", e.target.value)} placeholder="Union - Discipline - Travail" /></FieldRow>
      <FieldRow label="Armoiries nationales" hint="Image affichée en haut à droite des documents officiels">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-xl bg-muted border-2 border-dashed flex items-center justify-center text-muted-foreground overflow-hidden">
            {data.armoiries_url ? <img src={data.armoiries_url} alt="Armoiries" className="h-full w-full object-contain" /> : <Building2 className="h-9 w-9 sm:h-8 sm:w-8" />}
          </div>
          <input ref={armoiriesFileRef} type="file" accept="image/*" className="hidden" onChange={handleArmoiriesUpload} />
          <Button variant="outline" size="sm" onClick={() => armoiriesFileRef.current?.click()} disabled={uploadingArmoiries}>
            {uploadingArmoiries ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Téléverser
          </Button>
        </div>
      </FieldRow>

      {saving && <p className="text-xs text-muted-foreground">Enregistrement...</p>}
    </SettingsSection>
  );
}
