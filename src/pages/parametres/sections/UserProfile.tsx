import { User, Camera, Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function UserProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState({
    full_name: "", phone: "", fonction: "", langue: "fr", avatar_url: "",
  });
  const email = user?.email ?? "";

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase.from("profiles").select("full_name, phone, fonction, langue, avatar_url").eq("id", user.id).single()
      .then(({ data: p }) => {
        if (p) setData({
          full_name: p.full_name ?? "", phone: p.phone ?? "",
          fonction: p.fonction ?? "", langue: p.langue ?? "fr",
          avatar_url: p.avatar_url ?? "",
        });
        setLoading(false);
      });
  }, [user]);

  const update = (k: string, v: string) => setData(d => ({ ...d, [k]: v }));

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: data.full_name, phone: data.phone,
      fonction: data.fonction, langue: data.langue,
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profil enregistré");
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", user.id);
    setUploading(false);
    if (error) toast.error(error.message);
    else { update("avatar_url", pub.publicUrl); toast.success("Photo mise à jour"); }
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  const initials = (data.full_name || email).split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <SettingsSection
      title="Mon profil"
      description="Vos informations personnelles."
      icon={<User className="h-5 w-5" />}
      onSave={handleSave}
    >
      <FieldRow label="Photo de profil">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            {data.avatar_url && <AvatarImage src={data.avatar_url} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">{initials || "?"}</AvatarFallback>
          </Avatar>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Changer
          </Button>
        </div>
      </FieldRow>
      <FieldRow label="Nom complet"><Input value={data.full_name} onChange={e => update("full_name", e.target.value)} /></FieldRow>
      <FieldRow label="Email" hint="Pour modifier l'email, contactez l'administrateur"><Input type="email" value={email} disabled /></FieldRow>
      <FieldRow label="Téléphone"><Input value={data.phone} onChange={e => update("phone", e.target.value)} placeholder="+225 ..." /></FieldRow>
      <FieldRow label="Fonction"><Input value={data.fonction} onChange={e => update("fonction", e.target.value)} placeholder="Directeur, Enseignant..." /></FieldRow>
      <FieldRow label="Langue préférée">
        <Select value={data.langue} onValueChange={v => update("langue", v)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      {saving && <p className="text-xs text-muted-foreground">Enregistrement...</p>}
    </SettingsSection>
  );
}
