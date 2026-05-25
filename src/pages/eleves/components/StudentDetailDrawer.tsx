import { useState, useEffect, useCallback, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  User, CalendarCheck, Wallet, Award, Files, Loader2,
  Check, X, Clock, BookOpen, Pencil, Save, Camera, Plus, Trash2, MessageSquare, Mail,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClasses } from "@/hooks/useClasses";
import { compressImage } from "@/lib/imageCompression";
import { toast } from "sonner";
import { ParentEditDialog } from "./ParentEditDialog";
import { ParentSmsDialog } from "./ParentMessageDialog";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  eleve: any | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

export default function StudentDetailDrawer({ eleve, open, onClose, onUpdated }: Props) {
  const [presences, setPresences] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [parentDialogOpen, setParentDialogOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<any | null>(null);
  const [selectedParentIds, setSelectedParentIds] = useState<Set<string>>(new Set());
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);

  const reloadParents = useCallback(async () => {
    if (!eleve) return;
    const { data } = await supabase
      .from("eleve_parents")
      .select("*, parents:parent_id(nom, prenom, telephone, email)")
      .eq("eleve_id", eleve.id);
    setParents((data as any[]) ?? []);
  }, [eleve]);

  const handleDetachParent = async (linkId: string): Promise<void> => {
    const { error } = await supabase.from("eleve_parents").delete().eq("id", linkId);
    if (error) { toast.error(error.message); return; }
    toast.success("Parent détaché de l'élève");
    reloadParents();
  };

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [showUnsavedAlert, setShowUnsavedAlert] = useState(false);
  const initialFormRef = useRef<Record<string, any>>({});
  const pendingActionRef = useRef<"cancel" | "close" | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { classes } = useClasses();

  const isDirty = useCallback(() => {
    const init = initialFormRef.current;
    return Object.keys(init).some((k) => (form[k] ?? "") !== (init[k] ?? ""));
  }, [form]);

  useEffect(() => {
    if (!eleve || !open) { setEditing(false); return; }
    setLoading(true);
    setEditing(false);
    const id = eleve.id;
    const ecoleId = eleve.ecole_id;

    Promise.all([
      supabase.from("presences").select("*").eq("eleve_id", id).order("date_presence", { ascending: false }).limit(30),
      supabase.from("paiements").select("*").eq("eleve_id", id).eq("ecole_id", ecoleId).order("date_paiement", { ascending: false }).limit(20),
      supabase.from("incidents_discipline").select("*").eq("eleve_id", id).order("date_incident", { ascending: false }).limit(20),
      supabase.from("documents_eleves").select("*").eq("eleve_id", id).eq("ecole_id", ecoleId),
      supabase.from("eleve_parents").select("*, parents:parent_id(nom, prenom, telephone, email)").eq("eleve_id", id),
    ]).then(([presR, paiR, incR, docR, parR]) => {
      setPresences((presR.data as any[]) ?? []);
      setPaiements((paiR.data as any[]) ?? []);
      setIncidents((incR.data as any[]) ?? []);
      setDocuments((docR.data as any[]) ?? []);
      setParents((parR.data as any[]) ?? []);
      setLoading(false);
    });
  }, [eleve, open]);

  const startEditing = () => {
    if (!eleve) return;
    const initial = {
      nom: eleve.nom ?? "",
      prenom: eleve.prenom ?? "",
      sexe: eleve.sexe ?? "",
      date_naissance: eleve.date_naissance ?? "",
      lieu_naissance: eleve.lieu_naissance ?? "",
      nationalite: eleve.nationalite ?? "",
      adresse: eleve.adresse ?? "",
      classe_id: eleve.classe_id ?? "",
      statut: eleve.statut ?? "inscrit",
    };
    initialFormRef.current = initial;
    setForm({ ...initial });
    setEditing(true);
  };

  const guardedCancel = () => {
    if (isDirty()) {
      pendingActionRef.current = "cancel";
      setShowUnsavedAlert(true);
    } else {
      setEditing(false);
    }
  };

  const guardedClose = () => {
    if (editing && isDirty()) {
      pendingActionRef.current = "close";
      setShowUnsavedAlert(true);
    } else {
      setEditing(false);
      onClose();
    }
  };

  const confirmDiscard = () => {
    setShowUnsavedAlert(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setEditing(false);
    if (action === "close") onClose();
  };

  const handleSave = async () => {
    if (!eleve) return;
    setSaving(true);
    const { error } = await supabase.from("eleves").update({
      nom: form.nom,
      prenom: form.prenom,
      sexe: form.sexe || null,
      date_naissance: form.date_naissance || null,
      lieu_naissance: form.lieu_naissance || null,
      nationalite: form.nationalite || null,
      adresse: form.adresse || null,
      classe_id: form.classe_id || null,
      statut: form.statut,
    }).eq("id", eleve.id);
    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la sauvegarde : " + error.message);
    } else {
      toast.success("Élève mis à jour avec succès");
      // Update initial form ref so dirty check resets
      initialFormRef.current = { ...form };
      setEditing(false);
      onUpdated?.();
    }
  };

  if (!eleve) return null;

  const init = `${(eleve.prenom?.[0] ?? "")}${(eleve.nom?.[0] ?? "")}`.toUpperCase();

  // Attendance stats
  const totalPres = presences.length;
  const nbPresent = presences.filter((p) => p.statut === "present").length;
  const nbAbsent = presences.filter((p) => p.statut === "absent").length;
  const nbRetard = presences.filter((p) => p.statut === "retard").length;
  const tauxPresence = totalPres > 0 ? Math.round((nbPresent / totalPres) * 100) : 0;

  // Finance stats
  const totalPaye = paiements.reduce((s, p) => s + Number(p.montant ?? 0), 0);

  const typeLabels: Record<string, string> = {
    avertissement: "Avertissement", sanction: "Sanction", exclusion: "Exclusion",
    felicitation: "Félicitation", encouragement: "Encouragement",
  };

  const updateField = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eleve?.id) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez choisir une image");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image trop lourde (max 10 Mo)");
      return;
    }
    setUploadingPhoto(true);
    try {
      // Compression + redimensionnement (max 800px, JPEG q=0.82)
      const compressed = await compressImage(file, { maxSize: 800, quality: 0.82 });
      const path = `eleves/${eleve.ecole_id}/${eleve.id}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-busting pour forcer le refresh dans toutes les vues
      const photoUrl = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: updErr } = await supabase
        .from("eleves")
        .update({ photo_url: photoUrl })
        .eq("id", eleve.id);
      if (updErr) throw updErr;
      eleve.photo_url = photoUrl;
      toast.success("Photo mise à jour");
      onUpdated?.();
    } catch (err: any) {
      toast.error("Erreur upload : " + err.message);
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  return (
    <>
    <Sheet open={open} onOpenChange={guardedClose}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="h-16 w-16">
                {eleve.photo_url ? <AvatarImage src={eleve.photo_url} alt={`${eleve.prenom} ${eleve.nom}`} /> : null}
                <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                  {init}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white"
                title="Changer la photo"
              >
                {uploadingPhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl">
                {eleve.prenom} {eleve.nom}
              </SheetTitle>
              <p className="text-sm text-muted-foreground font-mono">{eleve.matricule}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Badge variant="secondary">{eleve.classe_nom ?? "Non affecté"}</Badge>
                <Badge variant={eleve.statut === "inscrit" || eleve.statut === "actif" ? "default" : eleve.statut === "pre_inscrit" ? "secondary" : "destructive"} className="capitalize">
                  {eleve.statut === "pre_inscrit" ? "pré-inscrit" : eleve.statut}
                </Badge>
              </div>
            </div>
            {!editing && !loading && (
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={startEditing}>
                <Pencil className="h-3.5 w-3.5" /> Modifier
              </Button>
            )}
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {eleve.statut === "pre_inscrit" && (() => {
              const REQUIRED_DOCS = [
                { key: "acte_naissance", label: "Acte de naissance" },
                { key: "photo_identite", label: "Photo d'identité" },
                { key: "certificat_scolarite", label: "Certificat de scolarité" },
              ];
              const docTypes = new Set(documents.map((d) => d.type_document));
              const missingDocs = REQUIRED_DOCS.filter((d) => !docTypes.has(d.key));
              const cDocs = missingDocs.length === 0;
              const totalPaye = paiements.reduce((s, p) => s + Number(p.montant ?? 0), 0);
              const cPaie = totalPaye > 0;
              const cClasse = !!eleve.classe_id;
              const done = [cDocs, cPaie, cClasse].filter(Boolean).length;

              const Row = ({ ok, title, detail }: { ok: boolean; title: string; detail?: React.ReactNode }) => (
                <div className="flex items-start gap-2 text-xs">
                  <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${ok ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>
                    {ok ? "✓" : "!"}
                  </span>
                  <div className="min-w-0">
                    <p className={`font-medium ${ok ? "text-green-800" : "text-amber-900"}`}>{title}</p>
                    {detail && <p className="text-muted-foreground mt-0.5">{detail}</p>}
                  </div>
                </div>
              );

              return (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/60 p-3 space-y-2.5">
                  <p className="text-xs font-semibold text-amber-900">
                    Conditions restantes pour passage en « inscrit » — {done}/3 validées
                  </p>
                  <Row
                    ok={cDocs}
                    title={`Dossier administratif (${REQUIRED_DOCS.length - missingDocs.length}/${REQUIRED_DOCS.length})`}
                    detail={
                      cDocs
                        ? "Tous les documents obligatoires sont fournis."
                        : <>Manque : <span className="font-medium">{missingDocs.map((d) => d.label).join(", ")}</span></>
                    }
                  />
                  <Row
                    ok={cPaie}
                    title="Paiement 1ʳᵉ tranche"
                    detail={
                      cPaie
                        ? `${totalPaye.toLocaleString("fr-FR")} FCFA déjà encaissé.`
                        : "Aucun paiement enregistré — saisir un règlement dans l'onglet Finances."
                    }
                  />
                  <Row
                    ok={cClasse}
                    title="Affectation à une classe"
                    detail={
                      cClasse
                        ? `Classe : ${eleve.classe_nom ?? "—"}`
                        : "Aucune classe affectée — utiliser « Modifier » ou la page Affectation aux classes."
                    }
                  />
                </div>
              );
            })()}
            <Tabs defaultValue="identite" className="mt-2">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="identite" className="text-xs"><User className="h-3.5 w-3.5 mr-1" />Identité</TabsTrigger>
              <TabsTrigger value="presences" className="text-xs"><CalendarCheck className="h-3.5 w-3.5 mr-1" />Présences</TabsTrigger>
              <TabsTrigger value="finances" className="text-xs"><Wallet className="h-3.5 w-3.5 mr-1" />Finances</TabsTrigger>
              <TabsTrigger value="discipline" className="text-xs"><Award className="h-3.5 w-3.5 mr-1" />Discipline</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs"><Files className="h-3.5 w-3.5 mr-1" />Documents</TabsTrigger>
            </TabsList>

            {/* IDENTITÉ */}
            <TabsContent value="identite" className="space-y-4 mt-3">
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Nom</Label>
                      <Input value={form.nom} onChange={(e) => updateField("nom", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Prénom</Label>
                      <Input value={form.prenom} onChange={(e) => updateField("prenom", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Sexe</Label>
                      <Select value={form.sexe} onValueChange={(v) => updateField("sexe", v)}>
                        <SelectTrigger><SelectValue placeholder="Sexe" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Masculin</SelectItem>
                          <SelectItem value="F">Féminin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date de naissance</Label>
                      <Input type="date" value={form.date_naissance} onChange={(e) => updateField("date_naissance", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Lieu de naissance</Label>
                      <Input value={form.lieu_naissance} onChange={(e) => updateField("lieu_naissance", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Nationalité</Label>
                      <Input value={form.nationalite} onChange={(e) => updateField("nationalite", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Classe</Label>
                      <Select value={form.classe_id} onValueChange={(v) => updateField("classe_id", v)}>
                        <SelectTrigger><SelectValue placeholder="Classe" /></SelectTrigger>
                        <SelectContent>
                          {classes.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Statut</Label>
                      <Select value={form.statut} onValueChange={(v) => updateField("statut", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inscrit">Inscrit</SelectItem>
                          <SelectItem value="actif">Actif</SelectItem>
                          <SelectItem value="suspendu">Suspendu</SelectItem>
                          <SelectItem value="sorti">Sorti</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Adresse</Label>
                    <Textarea value={form.adresse} onChange={(e) => updateField("adresse", e.target.value)} rows={2} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={guardedCancel} disabled={saving}>Annuler</Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Enregistrer
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Info label="Sexe" value={eleve.sexe === "F" ? "Féminin" : eleve.sexe === "M" ? "Masculin" : "—"} />
                    <Info label="Né(e) le" value={fmt(eleve.date_naissance)} />
                    <Info label="Lieu de naissance" value={eleve.lieu_naissance} />
                    <Info label="Nationalité" value={eleve.nationalite} />
                    <Info label="Classe" value={eleve.classe_nom ?? "Non affecté"} />
                    <Info label="Cycle" value={eleve.cycle_nom} />
                    <Info label="Date inscription" value={fmt(eleve.date_inscription)} />
                    {eleve.adresse && <Info label="Adresse" value={eleve.adresse} span2 />}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <User className="h-4 w-4" /> Parent(s) / Tuteur(s)
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={() => { setEditingParent(null); setParentDialogOpen(true); }}
                      >
                        <Plus className="h-3.5 w-3.5" /> Ajouter
                      </Button>
                    </div>
                    {parents.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Aucun parent rattaché.</p>
                    )}
                    {parents.map((p, i) => (
                      <Card key={i} className="border">
                        <CardContent className="p-3 text-sm flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium">
                              {(p as any).parents?.prenom} {(p as any).parents?.nom} ({p.lien})
                            </p>
                            <p className="text-muted-foreground truncate">
                              {(p as any).parents?.telephone ?? "—"} • {(p as any).parents?.email ?? "—"}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              title="Modifier"
                              onClick={() => { setEditingParent(p); setParentDialogOpen(true); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <ConfirmButton
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              tone="danger"
                              confirmTitle="Détacher ce parent ?"
                              confirmDescription={`Retirer ${(p as any).parents?.prenom ?? ""} ${(p as any).parents?.nom ?? ""} de la fiche de cet élève ? La fiche parent reste conservée.`}
                              confirmLabel="Détacher"
                              onConfirm={() => handleDetachParent(p.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </ConfirmButton>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            {/* PRÉSENCES */}
            <TabsContent value="presences" className="space-y-4 mt-3">
              <div className="grid grid-cols-3 gap-3">
                <StatMini icon={Check} label="Présent" value={nbPresent} color="text-emerald-600" />
                <StatMini icon={X} label="Absent" value={nbAbsent} color="text-destructive" />
                <StatMini icon={Clock} label="Retard" value={nbRetard} color="text-amber-600" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Taux de présence</span>
                  <span>{tauxPresence}%</span>
                </div>
                <Progress value={tauxPresence} className="h-2" />
              </div>
              {presences.length > 0 ? (
                <div className="border rounded-lg overflow-x-auto max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {presences.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{fmt(p.date_presence)}</TableCell>
                          <TableCell>
                            <Badge variant={p.statut === "present" ? "default" : p.statut === "absent" ? "destructive" : "secondary"}>
                              {p.statut}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Empty text="Aucune donnée de présence" />
              )}
            </TabsContent>

            {/* FINANCES */}
            <TabsContent value="finances" className="space-y-4 mt-3">
              <Card className="border">
                <CardContent className="p-4 flex items-center gap-3">
                  <Wallet className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-2xl font-extrabold font-display">
                      {totalPaye.toLocaleString("fr-FR")} FCFA
                    </p>
                    <p className="text-xs text-muted-foreground">Total payé ({paiements.length} paiements)</p>
                  </div>
                </CardContent>
              </Card>
              {paiements.length > 0 ? (
                <div className="border rounded-lg overflow-x-auto max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Réf.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paiements.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{fmt(p.date_paiement)}</TableCell>
                          <TableCell className="font-semibold">{Number(p.montant).toLocaleString("fr-FR")} F</TableCell>
                          <TableCell><Badge variant="secondary">{p.mode}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.reference ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Empty text="Aucun paiement enregistré" />
              )}
            </TabsContent>

            {/* DISCIPLINE */}
            <TabsContent value="discipline" className="space-y-4 mt-3">
              {incidents.length > 0 ? (
                <div className="space-y-2">
                  {incidents.map((inc) => (
                    <Card key={inc.id} className="border">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant={inc.gravite === "grave" ? "destructive" : "secondary"}>
                            {typeLabels[inc.type] ?? inc.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{fmt(inc.date_incident)}</span>
                        </div>
                        <p className="text-sm">{inc.motif}</p>
                        {inc.decision && (
                          <p className="text-xs text-muted-foreground mt-1">Décision : {inc.decision}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Empty text="Aucun incident disciplinaire" />
              )}
            </TabsContent>

            {/* DOCUMENTS */}
            <TabsContent value="documents" className="space-y-4 mt-3">
              {documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <Card key={doc.id} className="border">
                      <CardContent className="p-3 flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{doc.nom_fichier}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {doc.type_document} • {fmt(doc.created_at)}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {doc.mime_type?.split("/")[1] ?? "fichier"}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Empty text="Aucun document téléversé" />
              )}
            </TabsContent>
          </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>

    {eleve && (
      <ParentEditDialog
        open={parentDialogOpen}
        onOpenChange={setParentDialogOpen}
        link={editingParent}
        eleveId={eleve.id}
        ecoleId={eleve.ecole_id}
        onSaved={reloadParents}
      />
    )}

    <AlertDialog open={showUnsavedAlert} onOpenChange={setShowUnsavedAlert}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Modifications non enregistrées</AlertDialogTitle>
          <AlertDialogDescription>
            Vous avez des modifications en cours. Voulez-vous vraiment quitter sans enregistrer ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continuer l'édition</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDiscard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Abandonner les modifications
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function Info({ label, value, span2 }: { label: string; value?: string | null; span2?: boolean }) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <span className="text-muted-foreground">{label} :</span>{" "}
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}

function StatMini({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card className="border">
      <CardContent className="p-3 flex items-center gap-2">
        <Icon className={`h-5 w-5 ${color}`} />
        <div>
          <p className="text-lg font-extrabold font-display">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-8 text-sm text-muted-foreground">{text}</div>
  );
}
