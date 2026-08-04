import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, UserPlus, Wallet, Printer, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useVacancesData } from "../hooks/useVacances";
import { generateVacancesRecuA5 } from "@/lib/generateVacancesRecuA5";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

type Step = 1 | 2 | 3;

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

export default function VacancesEnrollmentWorkflow({ open, onOpenChange }: Props) {
  const { ecoleId, classes, save, reload } = useVacancesData();
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [ecole, setEcole] = useState<any>(null);

  // Step 1 — inscription
  const [inscription, setInscription] = useState<any>({
    nom: "", prenom: "", sexe: "M", date_naissance: "",
    contact_parent: "", classe_id: "", etablissement_origine: "",
    observation: "", date_inscription: new Date().toISOString().slice(0, 10),
  });
  const [createdEleve, setCreatedEleve] = useState<any>(null);

  // Step 2 — paiement
  const [paiement, setPaiement] = useState<any>({
    montant_attendu: 0, montant_paye: 0,
    mode: "especes", date_paiement: new Date().toISOString().slice(0, 10),
    observation: "",
  });
  const [createdPaiement, setCreatedPaiement] = useState<any>(null);

  const activeClasses = useMemo(() => classes.filter((c) => c.actif), [classes]);
  const selectedClasse = classes.find((c) => c.id === inscription.classe_id);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setCreatedEleve(null);
    setCreatedPaiement(null);
    setInscription((f: any) => ({
      ...f, classe_id: f.classe_id || activeClasses[0]?.id || "",
    }));
    if (ecoleId) {
      supabase.from("ecoles")
        .select("nom, sigle, devise, adresse, telephone, email, logo_url")
        .eq("id", ecoleId).maybeSingle()
        .then(({ data }) => setEcole(data));
    }
  }, [open, ecoleId]); // eslint-disable-line

  useEffect(() => {
    if (selectedClasse) {
      setPaiement((p: any) => ({
        ...p,
        montant_attendu: Number(selectedClasse.montant),
        montant_paye: Number(selectedClasse.montant),
      }));
    }
  }, [selectedClasse?.id]); // eslint-disable-line

  const goInscription = async () => {
    if (!inscription.nom.trim() || !inscription.prenom.trim()) return toast.error("Nom et prénoms requis");
    if (!inscription.classe_id) return toast.error("Sélectionnez une classe");
    setBusy(true);
    const res = await save("vacances_eleves", {
      nom: inscription.nom.trim(),
      prenom: inscription.prenom.trim(),
      sexe: inscription.sexe || null,
      date_naissance: inscription.date_naissance || null,
      contact_parent: inscription.contact_parent || null,
      classe_id: inscription.classe_id,
      etablissement_origine: inscription.etablissement_origine || null,
      observation: inscription.observation || null,
      date_inscription: inscription.date_inscription,
    });
    setBusy(false);
    if (!res) return;
    setCreatedEleve(res);
    setStep(2);
  };

  const goPaiement = async () => {
    if (!createdEleve) return;
    const attendu = Number(paiement.montant_attendu) || 0;
    const paye = Number(paiement.montant_paye) || 0;
    if (paye < 0) return toast.error("Montant invalide");
    const statut = paye <= 0 ? "non_paye" : paye >= attendu ? "paye" : "partiel";
    setBusy(true);
    const res = await save("vacances_paiements", {
      eleve_id: createdEleve.id,
      classe_id: createdEleve.classe_id,
      montant_attendu: attendu,
      montant_paye: paye,
      date_paiement: paiement.date_paiement,
      mode: paiement.mode,
      statut,
      observation: paiement.observation || null,
    });
    setBusy(false);
    if (!res) return;
    setCreatedPaiement(res);
    setStep(3);
  };

  const printRecu = async () => {
    if (!createdEleve || !createdPaiement) return;
    setBusy(true);
    try {
      const attendu = Number(createdPaiement.montant_attendu);
      const paye = Number(createdPaiement.montant_paye);
      const pdf = await generateVacancesRecuA5({
        ecole: {
          nom: ecole?.nom ?? "École",
          sigle: ecole?.sigle,
          devise: ecole?.devise,
          adresse: ecole?.adresse,
          telephone: ecole?.telephone,
          email: ecole?.email,
          logoUrl: ecole?.logo_url,
        },
        reference: `CV-${createdPaiement.id.slice(0, 8).toUpperCase()}`,
        eleve: {
          nom: createdEleve.nom,
          prenom: createdEleve.prenom,
          sexe: createdEleve.sexe,
          contact_parent: createdEleve.contact_parent,
        },
        classe: selectedClasse?.nom ?? "—",
        montant_attendu: attendu,
        montant_paye: paye,
        reste: Math.max(0, attendu - paye),
        mode: createdPaiement.mode,
        date_paiement: createdPaiement.date_paiement,
        observation: createdPaiement.observation,
      });
      // Ouvre l'aperçu imprimable directement
      pdf.autoPrint();
      const url = pdf.output("bloburl");
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error(messageErreurBase(e) ?? "Erreur d'impression");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    onOpenChange(false);
    reload();
    // reset for next opening
    setInscription({
      nom: "", prenom: "", sexe: "M", date_naissance: "",
      contact_parent: "", classe_id: "", etablissement_origine: "",
      observation: "", date_inscription: new Date().toISOString().slice(0, 10),
    });
    setPaiement({
      montant_attendu: 0, montant_paye: 0, mode: "especes",
      date_paiement: new Date().toISOString().slice(0, 10), observation: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else onOpenChange(true); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouveau parcours d'inscription — Cours de vacances</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 py-2">
          {[
            { n: 1, label: "Inscription", icon: UserPlus },
            { n: 2, label: "Paiement", icon: Wallet },
            { n: 3, label: "Reçu A5", icon: Printer },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <div className={`h-9 w-9 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step >= (s.n as Step) ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"}`}>
                {step > s.n ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
              <span className={`text-sm ${step === s.n ? "font-bold text-primary" : "text-muted-foreground"}`}>{s.label}</span>
              {i < 2 && <div className={`flex-1 h-0.5 ${step > s.n ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nom *</Label><Input value={inscription.nom} onChange={(e) => setInscription({ ...inscription, nom: e.target.value })} /></div>
            <div><Label>Prénoms *</Label><Input value={inscription.prenom} onChange={(e) => setInscription({ ...inscription, prenom: e.target.value })} /></div>
            <div>
              <Label>Sexe</Label>
              <Select value={inscription.sexe} onValueChange={(v) => setInscription({ ...inscription, sexe: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="M">Masculin</SelectItem><SelectItem value="F">Féminin</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Date de naissance</Label><Input type="date" value={inscription.date_naissance} onChange={(e) => setInscription({ ...inscription, date_naissance: e.target.value })} /></div>
            <div className="col-span-2"><Label>Contact parent</Label><Input placeholder="+225…" value={inscription.contact_parent} onChange={(e) => setInscription({ ...inscription, contact_parent: e.target.value })} /></div>
            <div className="col-span-2">
              <Label>Classe demandée *</Label>
              <Select value={inscription.classe_id} onValueChange={(v) => setInscription({ ...inscription, classe_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{activeClasses.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom} — {fmt(Number(c.montant))}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Établissement d'origine</Label><Input value={inscription.etablissement_origine} onChange={(e) => setInscription({ ...inscription, etablissement_origine: e.target.value })} /></div>
            <div className="col-span-2"><Label>Observation</Label><Textarea rows={2} value={inscription.observation} onChange={(e) => setInscription({ ...inscription, observation: e.target.value })} /></div>
          </div>
        )}

        {step === 2 && createdEleve && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="font-semibold">{createdEleve.nom} {createdEleve.prenom}</div>
              <div className="text-muted-foreground">Classe : <b>{selectedClasse?.nom}</b> — Frais dus : <b>{fmt(Number(selectedClasse?.montant ?? 0))}</b></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Montant attendu</Label><Input type="number" value={paiement.montant_attendu} onChange={(e) => setPaiement({ ...paiement, montant_attendu: Number(e.target.value) })} /></div>
              <div><Label>Montant payé *</Label><Input type="number" value={paiement.montant_paye} onChange={(e) => setPaiement({ ...paiement, montant_paye: Number(e.target.value) })} /></div>
              <div><Label>Date</Label><Input type="date" value={paiement.date_paiement} onChange={(e) => setPaiement({ ...paiement, date_paiement: e.target.value })} /></div>
              <div>
                <Label>Mode</Label>
                <Select value={paiement.mode} onValueChange={(v) => setPaiement({ ...paiement, mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="especes">Espèces</SelectItem>
                    <SelectItem value="mobile_money">Mobile money</SelectItem>
                    <SelectItem value="virement">Virement</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Observation</Label><Textarea rows={2} value={paiement.observation} onChange={(e) => setPaiement({ ...paiement, observation: e.target.value })} /></div>
            </div>
            <div className="text-xs text-muted-foreground">
              Reste à payer :{" "}
              <b className={Number(paiement.montant_attendu) - Number(paiement.montant_paye) > 0 ? "text-destructive" : "text-emerald-600"}>
                {fmt(Math.max(0, Number(paiement.montant_attendu) - Number(paiement.montant_paye)))}
              </b>
            </div>
          </div>
        )}

        {step === 3 && createdPaiement && (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-9 w-9 sm:h-8 sm:w-8 text-emerald-600" />
            </div>
            <div>
              <div className="text-lg font-bold">Inscription & paiement enregistrés</div>
              <div className="text-sm text-muted-foreground mt-1">
                Réf. reçu : <span className="font-mono">CV-{createdPaiement.id.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>
            <div className="inline-flex items-center gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
              <Badge variant={createdPaiement.statut === "paye" ? "default" : createdPaiement.statut === "partiel" ? "secondary" : "destructive"}>
                {createdPaiement.statut === "paye" ? "Payé" : createdPaiement.statut === "partiel" ? "Partiel" : "Non payé"}
              </Badge>
              <span>{fmt(Number(createdPaiement.montant_paye))} / {fmt(Number(createdPaiement.montant_attendu))}</span>
            </div>
            <div>
              <Button onClick={printRecu} disabled={busy} size="lg" className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                Imprimer le reçu A5 (avec souche)
              </Button>
              <p className="text-xs text-muted-foreground mt-2">Format A5 paysage — souche école à gauche, exemplaire famille à droite.</p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && step < 3 && (
            <Button variant="outline" onClick={() => setStep((step - 1) as Step)} disabled={busy}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour
            </Button>
          )}
          {step === 1 && (
            <>
              <Button variant="outline" onClick={close} disabled={busy}>Annuler</Button>
              <Button onClick={goInscription} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-1" />}
                Étape suivante — Paiement
              </Button>
            </>
          )}
          {step === 2 && (
            <Button onClick={goPaiement} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-1" />}
              Enregistrer paiement
            </Button>
          )}
          {step === 3 && <Button onClick={close}>Terminer</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
