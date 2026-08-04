import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, UserPlus, Wallet, Printer, Loader2, ArrowLeft, ArrowRight, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAnneeId } from "@/hooks/useAnneeId";
import { useClasses } from "@/hooks/useClasses";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useSpTestSessions } from "../hooks/useSpTestSessions";
import { useSpCandidats } from "../hooks/useSpCandidats";
import { useSpServices } from "../hooks/useSpServices";
import { useSpPaiements } from "../hooks/useSpPaiements";
import { generateSpReceipt } from "../lib/generateSpReceipt";
import { messageErreurBase } from "@/lib/dbErrorMessages";

type Step = 1 | 2 | 3;
type Props = { open: boolean; onOpenChange: (v: boolean) => void };

const fmt = (n: number) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;

export default function SpTestWorkflow({ open, onOpenChange }: Props) {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const { classes } = useClasses(anneeId ?? undefined);
  const { sessions } = useSpTestSessions();
  const { save: saveCandidat } = useSpCandidats();
  const { services } = useSpServices();
  const { save: savePaiement } = useSpPaiements();

  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [ecole, setEcole] = useState<any>(null);

  const [candidat, setCandidat] = useState<any>({
    nom: "", prenom: "", sexe: "M", date_naissance: "",
    parent: "", telephone: "", classe_demandee_id: "", ecole_origine: "",
    session_id: "", observations: "",
  });
  const [createdCandidat, setCreatedCandidat] = useState<any>(null);

  const testService = useMemo(() => services.find((s) => s.slug === "test_entree"), [services]);
  const [paiement, setPaiement] = useState<any>({
    montant_du: 0, montant_paye: 0, remise: 0, mode_paiement: "especes", observations: "",
  });
  const [createdPaiement, setCreatedPaiement] = useState<any>(null);

  const activeSessions = sessions.filter((s) => s.actif);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setCreatedCandidat(null);
    setCreatedPaiement(null);
    setCandidat({
      nom: "", prenom: "", sexe: "M", date_naissance: "",
      parent: "", telephone: "", classe_demandee_id: "", ecole_origine: "",
      session_id: activeSessions[0]?.id ?? "", observations: "",
    });
    if (ecoleId) {
      supabase.from("ecoles").select("nom, sigle, adresse, telephone, email, logo_url").eq("id", ecoleId).maybeSingle()
        .then(({ data }) => setEcole(data));
    }
  }, [open, ecoleId]); // eslint-disable-line

  useEffect(() => {
    if (testService) {
      setPaiement((p: any) => ({ ...p, montant_du: Number(testService.prix), montant_paye: Number(testService.prix) }));
    }
  }, [testService?.id]); // eslint-disable-line

  const selectedClasse = classes.find((c) => c.id === candidat.classe_demandee_id);
  const selectedSession = sessions.find((s) => s.id === candidat.session_id);

  const goInscription = async () => {
    if (!candidat.nom.trim() || !candidat.prenom.trim()) return toast.error("Nom et prénoms requis");
    setBusy(true);
    const payload: any = {
      nom: candidat.nom.trim(),
      prenom: candidat.prenom.trim(),
      sexe: candidat.sexe || null,
      date_naissance: candidat.date_naissance || null,
      parent: candidat.parent || null,
      telephone: candidat.telephone || null,
      classe_demandee_id: candidat.classe_demandee_id || null,
      classe_demandee: selectedClasse?.nom ?? null,
      ecole_origine: candidat.ecole_origine || null,
      session_id: candidat.session_id || null,
      date_test: selectedSession?.date_test ?? null,
      statut: selectedSession ? "programme" : "en_attente",
      observations: candidat.observations || null,
    };
    // On récupère le candidat créé
    if (!ecoleId) { setBusy(false); return; }
    const { data, error } = await (supabase as any).from("sp_candidats").insert({ ...payload, ecole_id: ecoleId }).select().single();
    setBusy(false);
    if (error) return toast.error(messageErreurBase(error));
    setCreatedCandidat(data);
    toast.success("Candidat enregistré");
    setStep(2);
  };

  const goPaiement = async () => {
    if (!createdCandidat) return;
    if (!testService) return toast.error("Aucun service « Test d'entrée » configuré");
    setBusy(true);
    const p = await savePaiement({
      service_id: testService.id,
      beneficiaire_type: "candidat",
      candidat_id: createdCandidat.id,
      beneficiaire_libre: `${createdCandidat.nom} ${createdCandidat.prenom}`,
      montant_du: Number(paiement.montant_du),
      montant_paye: Number(paiement.montant_paye),
      remise: Number(paiement.remise) || 0,
      mode_paiement: paiement.mode_paiement,
      observations: paiement.observations || null,
    } as any);
    setBusy(false);
    if (!p) return;
    setCreatedPaiement(p);
    setStep(3);
  };

  const printRecu = async () => {
    if (!createdPaiement || !createdCandidat) return;
    const paye = Number(createdPaiement.montant_paye);
    const du = Number(createdPaiement.montant_du);
    const remise = Number(createdPaiement.remise) || 0;
    await generateSpReceipt({
      numero: createdPaiement.numero ?? createdPaiement.id.slice(0, 8).toUpperCase(),
      date: new Date(createdPaiement.created_at ?? Date.now()).toLocaleString("fr-FR"),
      ecoleNom: ecole?.nom ?? "École",
      ecoleSigle: ecole?.sigle,
      ecoleAdresse: ecole?.adresse,
      ecoleTelephone: ecole?.telephone,
      ecoleEmail: ecole?.email,
      logoUrl: ecole?.logo_url,
      service: testService?.nom ?? "Test d'entrée",
      beneficiaire: `${createdCandidat.nom} ${createdCandidat.prenom}`,
      montantDu: du,
      montantPaye: paye,
      remise,
      reste: Math.max(0, du - paye - remise),
      modePaiement: createdPaiement.mode_paiement,
      observations: createdPaiement.observations,
      titre: "REÇU — TEST D'ENTRÉE",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouveau parcours — Test d'entrée</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          {[
            { n: 1, label: "Candidat", icon: UserPlus },
            { n: 2, label: "Paiement", icon: Wallet },
            { n: 3, label: "Reçu", icon: Printer },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step >= (s.n as Step) ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"}`}>
                {step > s.n ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
              <span className={`text-sm ${step === s.n ? "font-bold text-primary" : "text-muted-foreground"}`}>{s.label}</span>
              {i < 2 && <div className={`flex-1 h-0.5 ${step > s.n ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nom *</Label><Input value={candidat.nom} onChange={(e) => setCandidat({ ...candidat, nom: e.target.value })} /></div>
            <div><Label>Prénoms *</Label><Input value={candidat.prenom} onChange={(e) => setCandidat({ ...candidat, prenom: e.target.value })} /></div>
            <div>
              <Label>Sexe</Label>
              <Select value={candidat.sexe} onValueChange={(v) => setCandidat({ ...candidat, sexe: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="M">Masculin</SelectItem><SelectItem value="F">Féminin</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Date de naissance</Label><Input type="date" value={candidat.date_naissance} onChange={(e) => setCandidat({ ...candidat, date_naissance: e.target.value })} /></div>
            <div>
              <Label>Classe demandée</Label>
              <Select value={candidat.classe_demandee_id} onValueChange={(v) => setCandidat({ ...candidat, classe_demandee_id: v })}>
                <SelectTrigger><SelectValue placeholder={classes.length ? "Sélectionner" : "Aucune classe"} /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>École d'origine</Label><Input value={candidat.ecole_origine} onChange={(e) => setCandidat({ ...candidat, ecole_origine: e.target.value })} /></div>
            <div><Label>Parent</Label><Input value={candidat.parent} onChange={(e) => setCandidat({ ...candidat, parent: e.target.value })} /></div>
            <div><Label>Téléphone</Label><Input value={candidat.telephone} onChange={(e) => setCandidat({ ...candidat, telephone: e.target.value })} /></div>
            <div className="col-span-2">
              <Label className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />Session de test</Label>
              <Select value={candidat.session_id} onValueChange={(v) => setCandidat({ ...candidat, session_id: v })}>
                <SelectTrigger><SelectValue placeholder={activeSessions.length ? "Choisir une session planifiée" : "Aucune session — créer dans Paramètres"} /></SelectTrigger>
                <SelectContent>
                  {activeSessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {new Date(s.date_test).toLocaleString("fr-FR")}{s.libelle ? ` — ${s.libelle}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Observations</Label><Textarea rows={2} value={candidat.observations} onChange={(e) => setCandidat({ ...candidat, observations: e.target.value })} /></div>
          </div>
        )}

        {step === 2 && createdCandidat && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="font-semibold">{createdCandidat.nom} {createdCandidat.prenom}</div>
              <div className="text-muted-foreground">
                Classe : <b>{selectedClasse?.nom ?? "—"}</b>
                {selectedSession && <> · Session : <b>{new Date(selectedSession.date_test).toLocaleString("fr-FR")}</b></>}
              </div>
              <div className="text-muted-foreground">Service : <b>{testService?.nom ?? "Test d'entrée"}</b> — Prix : <b>{fmt(Number(testService?.prix ?? 0))}</b></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Montant dû</Label><Input type="number" value={paiement.montant_du} onChange={(e) => setPaiement({ ...paiement, montant_du: +e.target.value })} /></div>
              <div><Label>Payé *</Label><Input type="number" value={paiement.montant_paye} onChange={(e) => setPaiement({ ...paiement, montant_paye: +e.target.value })} /></div>
              <div><Label>Remise</Label><Input type="number" value={paiement.remise} onChange={(e) => setPaiement({ ...paiement, remise: +e.target.value })} /></div>
            </div>
            <div>
              <Label>Mode</Label>
              <Select value={paiement.mode_paiement} onValueChange={(v) => setPaiement({ ...paiement, mode_paiement: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="wave">Wave</SelectItem>
                  <SelectItem value="orange_money">Orange Money</SelectItem>
                  <SelectItem value="mtn_money">MTN Money</SelectItem>
                  <SelectItem value="moov_money">Moov Money</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="cheque">Chèque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Observations</Label><Textarea rows={2} value={paiement.observations} onChange={(e) => setPaiement({ ...paiement, observations: e.target.value })} /></div>
          </div>
        )}

        {step === 3 && createdPaiement && (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </div>
            <div>
              <div className="text-lg font-bold">Candidat inscrit & paiement enregistré</div>
              <div className="text-sm text-muted-foreground mt-1">
                Réf. : <span className="font-mono">{createdPaiement.numero ?? createdPaiement.id.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>
            <div className="inline-flex items-center gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
              <Badge>{fmt(Number(createdPaiement.montant_paye))}</Badge>
              <span>encaissé sur {fmt(Number(createdPaiement.montant_du))}</span>
            </div>
            <div>
              <Button onClick={printRecu} size="lg" className="gap-2"><Printer className="h-4 w-4" />Imprimer le reçu</Button>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && step < 3 && (
            <Button variant="outline" onClick={() => setStep((step - 1) as Step)} disabled={busy}>
              <ArrowLeft className="h-4 w-4 mr-1" />Retour
            </Button>
          )}
          {step === 1 && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Annuler</Button>
              <Button onClick={goInscription} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-1" />}Étape suivante — Paiement
              </Button>
            </>
          )}
          {step === 2 && (
            <Button onClick={goPaiement} disabled={busy || !testService}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-1" />}Enregistrer paiement
            </Button>
          )}
          {step === 3 && <Button onClick={() => onOpenChange(false)}>Terminer</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
