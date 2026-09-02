import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { messageErreurBase } from "@/lib/dbErrorMessages";
import { calculerPartsFiscales, partsFiscalesValides } from "@/lib/fiscalParts";

type Enseignant = Database["public"]["Tables"]["enseignants"]["Row"] & {
  nombre_enfants_charge?: number;
};
type BulletinPaie = Database["public"]["Tables"]["bulletins_paie"]["Row"];
type Contrat = Database["public"]["Tables"]["contrats_enseignants"]["Row"];

const dash = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? "—" : String(v);

const fcfa = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

const dateFr = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("fr-FR") : "—";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

const statutBadge = (s: string) =>
  s === "paye" ? "default" : s === "valide" ? "secondary" : "outline";

function InfoLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right break-words">{value}</span>
    </div>
  );
}

interface Props {
  personnel: Enseignant;
  onBack: () => void;
  onUpdated?: () => void;
}

export default function PersonnelDetail({ personnel, onBack, onUpdated }: Props) {
  const [membre, setMembre] = useState<Enseignant>(personnel);
  const [bulletins, setBulletins] = useState<BulletinPaie[]>([]);
  const [contrats, setContrats] = useState<Contrat[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date_embauche: "",
    numero_cnps: "",
    numero_cmu: "",
    nombre_enfants_charge: "0",
    parts_fiscales: "1",
    banque: "",
    rib: "",
  });

  useEffect(() => setMembre(personnel), [personnel]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [b, c] = await Promise.all([
        supabase
          .from("bulletins_paie")
          .select("*")
          .eq("enseignant_id", personnel.id)
          .order("annee", { ascending: false })
          .order("mois", { ascending: false }),
        supabase
          .from("contrats_enseignants")
          .select("*")
          .eq("enseignant_id", personnel.id)
          .order("date_debut", { ascending: false }),
      ]);
      if (cancelled) return;
      if (b.error) toast.error(`Erreur chargement paies : ${messageErreurBase(b.error)}`);
      if (c.error) toast.error(`Erreur chargement contrats : ${messageErreurBase(c.error)}`);
      setBulletins(b.data ?? []);
      setContrats(c.data ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [personnel.id]);

  const openEdit = () => {
    setForm({
      date_embauche: membre.date_embauche ?? "",
      numero_cnps: membre.numero_cnps ?? "",
      numero_cmu: membre.numero_cmu ?? "",
      nombre_enfants_charge: String(membre.nombre_enfants_charge ?? 0),
      parts_fiscales: String(membre.parts_fiscales ?? 1),
      banque: membre.banque ?? "",
      rib: membre.rib ?? "",
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    const parts = Number(form.parts_fiscales.replace(",", "."));
    const enfants = Number(form.nombre_enfants_charge);
    if (!Number.isInteger(enfants) || enfants < 0 || enfants > 20) {
      toast.error("Le nombre d'enfants à charge doit être un entier entre 0 et 20");
      return;
    }
    if (!partsFiscalesValides(parts)) {
      toast.error("Les parts fiscales doivent aller de 1 à 5, par pas de 0,5");
      return;
    }
    setSaving(true);
    const patch = {
      date_embauche: form.date_embauche || null,
      numero_cnps: form.numero_cnps || null,
      numero_cmu: form.numero_cmu || null,
      nombre_enfants_charge: enfants,
      parts_fiscales: parts,
      banque: form.banque || null,
      rib: form.rib || null,
    };
    const { error } = await supabase.from("enseignants").update(patch).eq("id", membre.id);
    setSaving(false);
    if (error) {
      toast.error(messageErreurBase(error));
      return;
    }
    setMembre({ ...membre, ...patch });
    toast.success("Dossier administratif mis à jour");
    setEditOpen(false);
    onUpdated?.();
  };

  const contratActif = contrats.find((c) => c.statut === "actif");

  return (
    <div className="space-y-6">
      {/* En-tête sombre */}
      <div className="rounded-2xl bg-primary text-primary-foreground p-5 md:p-6 flex items-start gap-4">
        <Button
          variant="secondary"
          size="icon"
          className="shrink-0"
          onClick={onBack}
          aria-label="Retour à la liste du personnel"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-extrabold font-display leading-tight break-words">
            {membre.nom} {membre.prenom}
          </h1>
          <p className="text-xs md:text-sm uppercase tracking-widest opacity-80 mt-1">
            {dash(membre.matricule)} • {dash(membre.poste)}
          </p>
        </div>
      </div>

      <Tabs defaultValue="profil">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="paies">Paies</TabsTrigger>
          <TabsTrigger value="contrats">Contrats</TabsTrigger>
          <TabsTrigger value="presences">Présences</TabsTrigger>
        </TabsList>

        {/* PROFIL */}
        <TabsContent value="profil" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5">
                <h2 className="text-base font-bold font-display text-primary mb-3">
                  Informations personnelles
                </h2>
                <InfoLine label="Nom" value={dash(membre.nom)} />
                <InfoLine label="Prénoms" value={dash(membre.prenom)} />
                <InfoLine
                  label="Sexe"
                  value={membre.sexe === "F" ? "Féminin" : membre.sexe === "M" ? "Masculin" : "—"}
                />
                <InfoLine label="Téléphone" value={dash(membre.telephone)} />
                <InfoLine label="Email" value={dash(membre.email)} />
                <InfoLine label="Nationalité" value={dash(membre.nationalite)} />
                <InfoLine label="Situation matrimoniale" value={dash(membre.situation_matrimoniale)} />
                <InfoLine label="Personne à prévenir" value={dash(membre.personne_a_prevenir)} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h2 className="text-base font-bold font-display text-primary mb-3">
                  Informations professionnelles
                </h2>
                <InfoLine label="Poste" value={dash(membre.poste)} />
                <InfoLine label="Service" value={dash(membre.service)} />
                <InfoLine label="Fonction" value={dash(membre.fonction)} />
                <InfoLine label="Département" value={dash(membre.departement)} />
                <InfoLine label="Type de contrat" value={dash(membre.type_contrat)} />
                <InfoLine label="Date d'embauche" value={dateFr(membre.date_embauche)} />
                <InfoLine
                  label="Statut"
                  value={
                    <Badge variant={membre.statut === "actif" ? "default" : "secondary"}>
                      {dash(membre.statut)}
                    </Badge>
                  }
                />
                <InfoLine
                  label="Salaire du contrat actif"
                  value={contratActif?.salaire_base
                    ? fcfa(contratActif.salaire_base)
                    : "—"}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-base font-bold font-display text-primary">Dossier administratif</h2>
                <Button variant="outline" size="sm" onClick={openEdit}>
                  <Pencil className="h-4 w-4" />
                  Modifier
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <InfoLine label="Statut CNPS" value={membre.numero_cnps ? "Numéro renseigné" : "Numéro en attente"} />
                  <InfoLine label="Numéro CNPS" value={dash(membre.numero_cnps)} />
                  <InfoLine label="Numéro CMU" value={dash(membre.numero_cmu)} />
                  <InfoLine label="Enfants fiscalement à charge" value={dash(membre.nombre_enfants_charge)} />
                  <InfoLine label="Parts fiscales (IRPP)" value={dash(membre.parts_fiscales)} />
                </div>
                <div>
                  <InfoLine label="Banque" value={dash(membre.banque)} />
                  <InfoLine label="RIB" value={dash(membre.rib)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAIES */}
        <TabsContent value="paies" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Période</TableHead>
                        <TableHead className="text-right">Brut</TableHead>
                        <TableHead className="text-right">Retenues</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulletins.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="capitalize whitespace-nowrap">
                            {MOIS[b.mois - 1] ?? b.mois} {b.annee}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fcfa(b.salaire_brut)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fcfa(b.retenues)}</TableCell>
                          <TableCell className="text-right font-semibold whitespace-nowrap">{fcfa(b.net_a_payer)}</TableCell>
                          <TableCell>
                            <Badge variant={statutBadge(b.statut)}>{b.statut}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {bulletins.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">
                            Aucun bulletin de paie enregistré. La gestion se fait dans l'écran Paie &amp; salaires.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTRATS */}
        <TabsContent value="contrats" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Début</TableHead>
                        <TableHead>Fin</TableHead>
                        <TableHead className="text-right">Quotité</TableHead>
                        <TableHead className="text-right">Salaire de base</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contrats.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="whitespace-nowrap">{dash(c.type)}</TableCell>
                          <TableCell><Badge variant="secondary">{dash(c.statut)}</Badge></TableCell>
                          <TableCell className="whitespace-nowrap">{dateFr(c.date_debut)}</TableCell>
                          <TableCell className="whitespace-nowrap">{dateFr(c.date_fin)}</TableCell>
                          <TableCell className="text-right">{c.quotite ?? "—"}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fcfa(c.salaire_base)}</TableCell>
                        </TableRow>
                      ))}
                      {contrats.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                            Aucun contrat enregistré pour ce membre du personnel.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRESENCES */}
        <TabsContent value="presences" className="mt-4">
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              Aucune donnée de présence enregistrée.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Édition dossier administratif */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le dossier administratif</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Date d'embauche</Label>
              <Input type="date" value={form.date_embauche} onChange={(e) => setForm({ ...form, date_embauche: e.target.value })} />
              <p className="text-xs text-muted-foreground">Utilisée pour l'ancienneté affichée et calculée sur le bulletin.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Numéro CNPS</Label>
              <Input value={form.numero_cnps} onChange={(e) => setForm({ ...form, numero_cnps: e.target.value })} />
              <p className="text-xs text-muted-foreground">Laissez vide si le numéro n'est pas encore attribué. Le bulletin restera générable avec une alerte.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Numéro CMU</Label>
              <Input value={form.numero_cmu} onChange={(e) => setForm({ ...form, numero_cmu: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Enfants fiscalement à charge</Label>
              <Input
                type="number"
                min={0}
                max={20}
                step={1}
                value={form.nombre_enfants_charge}
                onChange={(e) => {
                  const nombre = e.target.value;
                  setForm((p) => ({
                    ...p,
                    nombre_enfants_charge: nombre,
                    parts_fiscales: String(calculerPartsFiscales(membre.situation_matrimoniale, membre.sexe, Number(nombre))),
                  }));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Parts fiscales (IRPP)</Label>
              <Input
                type="number"
                step="0.5"
                min={1}
                max={5}
                value={form.parts_fiscales}
                onChange={(e) => setForm({ ...form, parts_fiscales: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Banque</Label>
              <Input value={form.banque} onChange={(e) => setForm({ ...form, banque: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>RIB</Label>
              <Input value={form.rib} onChange={(e) => setForm({ ...form, rib: e.target.value })} />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
