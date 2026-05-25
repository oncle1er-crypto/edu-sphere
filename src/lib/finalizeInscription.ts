import { supabase } from "@/integrations/supabase/client";
import { generateAttestationInscriptionPDF } from "./generateAttestationInscriptionPDF";
import { downloadReceiptFor } from "./downloadReceipt";

export interface FinalizeResult {
  ok: boolean;
  eleve_id: string;
  matricule: string;
  full_name: string;
  steps: string[];
  warnings: string[];
  error?: string;
  notifications_sent: number;
}

interface FinalizeOptions {
  eleve: any; // must include id, ecole_id, matricule, prenom, nom, classe_id
  /** Optional override classe (will be applied before promotion). */
  classe_id?: string | null;
  /** Whether to attempt SMS+email notifications to parents. */
  notify?: boolean;
  /** Whether to download the inscription confirmation PDF + last receipt. */
  generatePdf?: boolean;
  /** Pretty label of the operator (full name/email) for audit log. */
  operatorLabel?: string | null;
  /** Operator user id. */
  operatorId?: string | null;
}

/**
 * Orchestrates the full finalization of a student inscription:
 *  - update classe if needed
 *  - promote statut → "inscrit" via RPC (with fallback)
 *  - insert detailed audit log
 *  - notify parents (SMS via send-sms edge function + log in notifications_parents)
 *  - generate confirmation PDF and last-payment receipt PDF
 */
export async function finalizeInscription(opts: FinalizeOptions): Promise<FinalizeResult> {
  const { eleve, notify = true, generatePdf = true, operatorLabel, operatorId } = opts;
  const result: FinalizeResult = {
    ok: false,
    eleve_id: eleve.id,
    matricule: eleve.matricule,
    full_name: `${eleve.prenom} ${eleve.nom}`,
    steps: [],
    warnings: [],
    notifications_sent: 0,
  };

  try {
    // 1. Apply classe override if provided
    if (opts.classe_id && opts.classe_id !== eleve.classe_id) {
      const { error } = await supabase.from("eleves").update({ classe_id: opts.classe_id }).eq("id", eleve.id);
      if (error) throw new Error("Affectation classe : " + error.message);
      result.steps.push("Classe affectée");
      eleve.classe_id = opts.classe_id;
    }

    // 2. Promote via RPC
    const { error: rpcErr } = await supabase.rpc("check_and_promote_eleve" as any, { _eleve_id: eleve.id });
    if (rpcErr) {
      // Fallback : direct update
      const { error: e2 } = await supabase.from("eleves").update({ statut: "inscrit" as any }).eq("id", eleve.id);
      if (e2) throw new Error("Promotion : " + e2.message);
      result.steps.push("Statut → inscrit (direct)");
    } else {
      result.steps.push("Statut → inscrit");
    }

    // 3. Re-read élève to confirm + collect contextual data
    const [{ data: freshEleve }, { data: ecole }, parentsRes, paiementsRes, tranchesRes] = await Promise.all([
      supabase.from("eleves").select("*, classes(nom), annees_scolaires(libelle)").eq("id", eleve.id).maybeSingle(),
      supabase.from("ecoles").select("nom, sigle, devise, adresse, telephone, email, logo_url").eq("id", eleve.ecole_id).maybeSingle(),
      supabase
        .from("eleve_parents")
        .select("lien, est_contact_principal, parents(id, prenom, nom, telephone, telephone2, email)")
        .eq("eleve_id", eleve.id),
      supabase.from("paiements").select("id, montant, date_paiement").eq("eleve_id", eleve.id).order("date_paiement", { ascending: false }),
      supabase.from("tranches").select("montant").eq("eleve_id", eleve.id),
    ]);

    if (!freshEleve || (freshEleve.statut !== "inscrit" && freshEleve.statut !== "actif")) {
      result.warnings.push("Le serveur n'a pas confirmé le passage à « inscrit » (conditions probablement non remplies).");
    }

    const totalPaye = (paiementsRes.data ?? []).reduce((s: number, p: any) => s + Number(p.montant ?? 0), 0);
    const totalDu = (tranchesRes.data ?? []).reduce((s: number, t: any) => s + Number(t.montant ?? 0), 0);
    const reference = `INS-${eleve.matricule}-${new Date().getFullYear()}`;

    // 4. Audit log — école
    const auditDetails = {
      eleve_id: eleve.id,
      matricule: eleve.matricule,
      eleve_nom: `${eleve.prenom} ${eleve.nom}`,
      classe_id: freshEleve?.classe_id ?? null,
      classe: (freshEleve as any)?.classes?.nom ?? null,
      annee: (freshEleve as any)?.annees_scolaires?.libelle ?? null,
      total_paye: totalPaye,
      total_du: totalDu,
      reference,
      etapes: result.steps,
      finalise_par: operatorLabel,
    };
    const { error: auditErr } = await supabase.from("audit_logs").insert({
      ecole_id: eleve.ecole_id,
      user_id: operatorId,
      user_label: operatorLabel,
      action: "inscription.finalisation",
      cible: eleve.id,
      niveau: "info",
      details: auditDetails as any,
    });
    if (auditErr) result.warnings.push("Trace d'audit non écrite : " + auditErr.message);
    else result.steps.push("Audit enregistré");

    // 5. Notify parents
    if (notify) {
      const links = (parentsRes.data ?? []) as any[];
      const messageBase = `Bonjour, ${eleve.prenom} ${eleve.nom} (matricule ${eleve.matricule}) est désormais définitivement inscrit(e)${(freshEleve as any)?.classes?.nom ? " en " + (freshEleve as any).classes.nom : ""}. ${ecole?.nom ?? "L'établissement"} vous remercie.`;

      const phoneList: string[] = [];
      for (const link of links) {
        const p = link.parents;
        if (!p) continue;
        // Log per-canal
        if (p.telephone) {
          phoneList.push(p.telephone);
          await supabase.from("notifications_parents" as any).insert({
            ecole_id: eleve.ecole_id,
            eleve_id: eleve.id,
            type: "inscription_finalisee",
            canal: "sms",
            destinataire: p.telephone,
            message: messageBase,
            envoye_par: operatorId,
          } as any);
        }
        if (p.email) {
          await supabase.from("notifications_parents" as any).insert({
            ecole_id: eleve.ecole_id,
            eleve_id: eleve.id,
            type: "inscription_finalisee",
            canal: "email",
            destinataire: p.email,
            message: messageBase,
            envoye_par: operatorId,
          } as any);
          result.notifications_sent += 1;
        }
      }

      if (phoneList.length > 0) {
        try {
          const { data, error } = await supabase.functions.invoke("send-sms", {
            body: { ecole_id: eleve.ecole_id, destinataires: phoneList, message: messageBase },
          });
          if (error) {
            result.warnings.push("SMS non envoyés : " + error.message);
          } else if (data) {
            result.notifications_sent += (data as any).sent ?? phoneList.length;
            result.steps.push(`SMS envoyés (${(data as any).sent ?? phoneList.length}/${phoneList.length})`);
          }
        } catch (e: any) {
          result.warnings.push("SMS indisponibles : " + (e?.message ?? String(e)));
        }
      } else if (links.length === 0) {
        result.warnings.push("Aucun parent rattaché — notifications ignorées.");
      }
    }

    // 6. PDFs (attestation + dernier reçu)
    if (generatePdf) {
      try {
        const pdf = await generateAttestationInscriptionPDF({
          ecole: {
            nom: ecole?.nom ?? "École",
            sigle: ecole?.sigle ?? null,
            adresse: ecole?.adresse ?? null,
            telephone: ecole?.telephone ?? null,
            email: ecole?.email ?? null,
            logoUrl: ecole?.logo_url ?? null,
            devise: ecole?.devise ?? "FCFA",
          },
          eleve: {
            nom: eleve.nom,
            prenom: eleve.prenom,
            matricule: eleve.matricule,
            date_naissance: eleve.date_naissance ?? null,
            sexe: eleve.sexe ?? null,
            classe: (freshEleve as any)?.classes?.nom ?? null,
            photo_url: eleve.photo_url ?? null,
          },
          reference,
          annee_scolaire: (freshEleve as any)?.annees_scolaires?.libelle ?? null,
          total_du: totalDu,
          total_paye: totalPaye,
          finalise_par: operatorLabel ?? null,
          date_inscription: new Date().toISOString(),
        });
        pdf.save(`attestation-inscription-${eleve.matricule}.pdf`);
        result.steps.push("Attestation PDF générée");
      } catch (e: any) {
        result.warnings.push("PDF attestation : " + (e?.message ?? String(e)));
      }

      // Dernier reçu de paiement (si dispo)
      const lastPay = (paiementsRes.data ?? [])[0];
      if (lastPay) {
        try {
          await downloadReceiptFor({
            ecoleId: eleve.ecole_id,
            eleveId: eleve.id,
            paiementId: lastPay.id,
            type: "encaissement",
          });
          result.steps.push("Reçu paiement téléchargé");
        } catch {
          result.warnings.push("Reçu de paiement non généré.");
        }
      }
    }

    result.ok = true;
    return result;
  } catch (e: any) {
    result.error = e?.message ?? String(e);
    return result;
  }
}
