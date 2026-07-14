import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { STATUTS_ACTIFS } from "@/lib/eleveStatus";

const fcfa = (n: number) => Math.round(n).toLocaleString("fr-FR");
const today = () => new Date().toLocaleDateString("fr-FR");

async function loadEcoleContext(ecoleId: string) {
  const { data: ecole } = await supabase.from("ecoles").select("nom, code, ville").eq("id", ecoleId).single();
  return { nom: (ecole as any)?.nom ?? "Établissement", code: (ecole as any)?.code ?? "", ville: (ecole as any)?.ville ?? "" };
}

function pdfHeader(doc: jsPDF, title: string, ctx: { nom: string; code: string; ville: string }) {
  doc.setFillColor(110, 26, 44);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text(ctx.nom, 14, 10);
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(`${ctx.ville} · Code : ${ctx.code}`, 14, 16);
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text(title, doc.internal.pageSize.getWidth() - 14, 10, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(`Édité le ${today()}`, doc.internal.pageSize.getWidth() - 14, 16, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

// ==================================================================
// 1. Rapport mensuel consolidé (PDF)
// ==================================================================
export async function generateRapportMensuelConsolide(ecoleId: string) {
  const ctx = await loadEcoleContext(ecoleId);
  const debutMois = new Date(); debutMois.setDate(1);
  const debutISO = debutMois.toISOString().slice(0, 10);

  const [eR, ensR, clR, prR, paR] = await Promise.all([
    supabase.from("eleves").select("id, sexe", { count: "exact" }).eq("ecole_id", ecoleId).in("statut", STATUTS_ACTIFS as any),
    supabase.from("enseignants").select("id", { count: "exact", head: true }).eq("ecole_id", ecoleId).eq("statut", "actif"),
    supabase.from("classes").select("id", { count: "exact", head: true }).eq("ecole_id", ecoleId),
    supabase.from("presences").select("statut").eq("ecole_id", ecoleId).gte("date_presence", debutISO),
    supabase.from("paiements").select("montant").eq("ecole_id", ecoleId).gte("date_paiement", debutISO),
  ]);

  const eleves = eR.data ?? [];
  const presences = prR.data ?? [];
  const tauxPresence = presences.length > 0 ? Math.round((presences.filter((p: any) => p.statut === "present").length / presences.length) * 100) : 0;
  const encaisse = (paR.data ?? []).reduce((s: number, p: any) => s + Number(p.montant), 0);

  const doc = new jsPDF();
  pdfHeader(doc, "Rapport mensuel consolidé", ctx);
  autoTable(doc, {
    startY: 30,
    head: [["Indicateur", "Valeur"]],
    body: [
      ["Élèves actifs", String(eR.count ?? eleves.length)],
      ["dont garçons / filles", `${eleves.filter((e: any) => e.sexe === "M").length} / ${eleves.filter((e: any) => e.sexe === "F").length}`],
      ["Enseignants actifs", String(ensR.count ?? 0)],
      ["Classes", String(clR.count ?? 0)],
      ["Taux de présence (mois)", `${tauxPresence}%`],
      ["Encaissements (mois)", `${fcfa(encaisse)} FCFA`],
      ["Nb de paiements (mois)", String((paR.data ?? []).length)],
    ],
    headStyles: { fillColor: [110, 26, 44] },
  });
  doc.save(`rapport-mensuel-${new Date().toISOString().slice(0, 7)}.pdf`);
}

// ==================================================================
// 2. Export Excel — KPIs réseau (XLSX)
// ==================================================================
export async function generateKpisReseauXlsx(ecoleId: string) {
  const [eR, ensR, clR, trR, paR, prR] = await Promise.all([
    supabase.from("eleves").select("id, sexe, statut").eq("ecole_id", ecoleId),
    supabase.from("enseignants").select("id, statut, sexe, type_contrat").eq("ecole_id", ecoleId),
    supabase.from("classes").select("id, nom, capacite").eq("ecole_id", ecoleId),
    supabase.from("tranches").select("montant, paye, statut").eq("ecole_id", ecoleId),
    supabase.from("paiements").select("montant, mode, date_paiement").eq("ecole_id", ecoleId),
    supabase.from("presences").select("statut").eq("ecole_id", ecoleId),
  ]);

  const eleves = eR.data ?? [];
  const ens = ensR.data ?? [];
  const tranches = trR.data ?? [];
  const paiements = paR.data ?? [];
  const pres = prR.data ?? [];

  const wb = XLSX.utils.book_new();

  const kpisSheet = XLSX.utils.json_to_sheet([
    { Indicateur: "Total élèves", Valeur: eleves.length },
    { Indicateur: "Élèves actifs", Valeur: eleves.filter((e: any) => STATUTS_ACTIFS.includes(e.statut)).length },
    { Indicateur: "Garçons", Valeur: eleves.filter((e: any) => e.sexe === "M").length },
    { Indicateur: "Filles", Valeur: eleves.filter((e: any) => e.sexe === "F").length },
    { Indicateur: "Enseignants", Valeur: ens.length },
    { Indicateur: "Enseignants actifs", Valeur: ens.filter((e: any) => e.statut === "actif").length },
    { Indicateur: "Classes", Valeur: (clR.data ?? []).length },
    { Indicateur: "Frais attendus (FCFA)", Valeur: tranches.reduce((s: number, t: any) => s + Number(t.montant), 0) },
    { Indicateur: "Encaissé (FCFA)", Valeur: tranches.reduce((s: number, t: any) => s + Number(t.paye), 0) },
    { Indicateur: "Nb paiements", Valeur: paiements.length },
    { Indicateur: "Enregistrements présence", Valeur: pres.length },
    { Indicateur: "Taux présence (%)", Valeur: pres.length > 0 ? Math.round((pres.filter((p: any) => p.statut === "present").length / pres.length) * 100) : 0 },
  ]);
  XLSX.utils.book_append_sheet(wb, kpisSheet, "KPIs");

  const classesSheet = XLSX.utils.json_to_sheet((clR.data ?? []).map((c: any) => ({
    Classe: c.nom,
    Capacité: c.capacite ?? "",
    Effectif: eleves.filter((e: any) => (e as any).classe_id === c.id).length,
  })));
  XLSX.utils.book_append_sheet(wb, classesSheet, "Classes");

  const contratsMap: Record<string, number> = {};
  ens.forEach((e: any) => { const c = e.type_contrat ?? "Non défini"; contratsMap[c] = (contratsMap[c] ?? 0) + 1; });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(Object.entries(contratsMap).map(([Contrat, Nombre]) => ({ Contrat, Nombre }))), "Enseignants");

  XLSX.writeFile(wb, `kpis-reseau-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ==================================================================
// 3. Rapport académique annuel (PDF)
// ==================================================================
export async function generateRapportAcademique(ecoleId: string) {
  const ctx = await loadEcoleContext(ecoleId);
  const { data: notes } = await supabase
    .from("notes")
    .select("note, evaluations(matieres(nom), classes(nom))")
    .eq("ecole_id", ecoleId)
    .not("note", "is", null);

  const list = notes ?? [];
  const parClasse: Record<string, { sum: number; n: number; reussis: number }> = {};
  const parMatiere: Record<string, { sum: number; n: number; reussis: number }> = {};
  list.forEach((n: any) => {
    const cl = n.evaluations?.classes?.nom ?? "—";
    const mat = n.evaluations?.matieres?.nom ?? "—";
    const v = Number(n.note);
    parClasse[cl] ??= { sum: 0, n: 0, reussis: 0 };
    parMatiere[mat] ??= { sum: 0, n: 0, reussis: 0 };
    parClasse[cl].sum += v; parClasse[cl].n += 1; if (v >= 10) parClasse[cl].reussis += 1;
    parMatiere[mat].sum += v; parMatiere[mat].n += 1; if (v >= 10) parMatiere[mat].reussis += 1;
  });

  const doc = new jsPDF();
  pdfHeader(doc, "Rapport académique annuel", ctx);
  autoTable(doc, {
    startY: 30,
    head: [["Classe", "Moyenne", "Taux de réussite", "Notes"]],
    body: Object.entries(parClasse).sort((a, b) => (b[1].sum / b[1].n) - (a[1].sum / a[1].n)).map(([c, v]) => [
      c, (v.sum / v.n).toFixed(2), `${Math.round((v.reussis / v.n) * 100)}%`, String(v.n),
    ]),
    headStyles: { fillColor: [110, 26, 44] },
  });
  autoTable(doc, {
    head: [["Matière", "Moyenne", "Taux de réussite", "Notes"]],
    body: Object.entries(parMatiere).sort((a, b) => (b[1].sum / b[1].n) - (a[1].sum / a[1].n)).map(([c, v]) => [
      c, (v.sum / v.n).toFixed(2), `${Math.round((v.reussis / v.n) * 100)}%`, String(v.n),
    ]),
    headStyles: { fillColor: [110, 26, 44] },
  });
  doc.save(`rapport-academique-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ==================================================================
// 4. Rapport financier consolidé (XLSX)
// ==================================================================
export async function generateRapportFinancierXlsx(ecoleId: string) {
  const { data: tranches } = await supabase
    .from("tranches")
    .select("montant, paye, statut, eleves(nom, prenoms, matricule, classes(nom))")
    .eq("ecole_id", ecoleId);

  const rows = (tranches ?? []).map((t: any) => ({
    Matricule: t.eleves?.matricule ?? "",
    Élève: `${t.eleves?.nom ?? ""} ${t.eleves?.prenoms ?? ""}`.trim(),
    Classe: t.eleves?.classes?.nom ?? "",
    Attendu: Number(t.montant),
    Payé: Number(t.paye),
    Restant: Number(t.montant) - Number(t.paye),
    Statut: t.statut,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Tranches");
  const totals = [
    { Poste: "Total attendu", Montant: rows.reduce((s, r) => s + r.Attendu, 0) },
    { Poste: "Total payé", Montant: rows.reduce((s, r) => s + r.Payé, 0) },
    { Poste: "Total restant dû", Montant: rows.reduce((s, r) => s + r.Restant, 0) },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(totals), "Synthèse");
  XLSX.writeFile(wb, `rapport-financier-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ==================================================================
// 5. Rapport des présences (PDF)
// ==================================================================
export async function generateRapportPresences(ecoleId: string) {
  const ctx = await loadEcoleContext(ecoleId);
  const debut = new Date(); debut.setDate(debut.getDate() - 30);
  const debutISO = debut.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("presences")
    .select("statut, eleves(classes(nom))")
    .eq("ecole_id", ecoleId)
    .gte("date_presence", debutISO);

  const parClasse: Record<string, { total: number; present: number; absent: number; retard: number }> = {};
  (data ?? []).forEach((p: any) => {
    const cl = p.eleves?.classes?.nom ?? "—";
    parClasse[cl] ??= { total: 0, present: 0, absent: 0, retard: 0 };
    parClasse[cl].total += 1;
    if (p.statut === "present") parClasse[cl].present += 1;
    else if (p.statut === "absent") parClasse[cl].absent += 1;
    else if (p.statut === "retard") parClasse[cl].retard += 1;
  });

  const doc = new jsPDF();
  pdfHeader(doc, "Rapport des présences (30j)", ctx);
  autoTable(doc, {
    startY: 30,
    head: [["Classe", "Enregistrements", "Présents", "Absents", "Retards", "Taux présence"]],
    body: Object.entries(parClasse).sort((a, b) => b[1].total - a[1].total).map(([c, v]) => [
      c, String(v.total), String(v.present), String(v.absent), String(v.retard),
      `${Math.round((v.present / v.total) * 100)}%`,
    ]),
    headStyles: { fillColor: [110, 26, 44] },
  });
  doc.save(`rapport-presences-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ==================================================================
// 6. Rapport opérationnel (PDF) — cantine, transport, biblio
// ==================================================================
export async function generateRapportOperationnel(ecoleId: string) {
  const ctx = await loadEcoleContext(ecoleId);
  const debut = new Date(); debut.setDate(debut.getDate() - 30);
  const debutISO = debut.toISOString().slice(0, 10);

  const [abC, plC, abT, vT, lT, liv, emp] = await Promise.all([
    supabase.from("abonnements_cantine").select("statut").eq("ecole_id", ecoleId),
    supabase.from("cantine_planning").select("effectif_realise, effectif_inscrits, capacite_prevue").eq("ecole_id", ecoleId).gte("date_service", debutISO),
    supabase.from("abonnements_transport").select("statut").eq("ecole_id", ecoleId),
    supabase.from("vehicules").select("capacite, statut").eq("ecole_id", ecoleId),
    supabase.from("lignes_transport").select("id", { count: "exact", head: true }).eq("ecole_id", ecoleId),
    supabase.from("livres").select("quantite").eq("ecole_id", ecoleId),
    supabase.from("emprunts").select("statut, date_retour_prevue").eq("ecole_id", ecoleId),
  ]);

  const abCantine = (abC.data ?? []).filter((a: any) => a.statut === "actif").length;
  const planning = plC.data ?? [];
  const repas = planning.reduce((s: number, p: any) => s + (Number(p.effectif_realise) || Number(p.effectif_inscrits) || 0), 0);
  const capaCantine = planning.reduce((s: number, p: any) => s + (Number(p.capacite_prevue) || 0), 0);
  const abTransport = (abT.data ?? []).filter((a: any) => a.statut === "actif").length;
  const vehicules = (vT.data ?? []).filter((v: any) => v.statut === "actif");
  const capaTransport = vehicules.reduce((s: number, v: any) => s + (Number(v.capacite) || 0), 0);
  const totalLivres = (liv.data ?? []).reduce((s: number, l: any) => s + Number(l.quantite), 0);
  const empruntsCours = (emp.data ?? []).filter((e: any) => e.statut === "en_cours").length;
  const empruntsRetard = (emp.data ?? []).filter((e: any) => e.statut === "en_cours" && new Date(e.date_retour_prevue) < new Date()).length;

  const doc = new jsPDF();
  pdfHeader(doc, "Rapport opérationnel (30j)", ctx);
  autoTable(doc, {
    startY: 30,
    head: [["Module", "Indicateur", "Valeur"]],
    body: [
      ["Cantine", "Abonnés actifs", String(abCantine)],
      ["Cantine", "Repas servis (30j)", String(repas)],
      ["Cantine", "Taux fréquentation", capaCantine > 0 ? `${Math.round((repas / capaCantine) * 100)}%` : "—"],
      ["Transport", "Véhicules actifs", String(vehicules.length)],
      ["Transport", "Lignes", String(lT.count ?? 0)],
      ["Transport", "Élèves transportés", String(abTransport)],
      ["Transport", "Taux remplissage", capaTransport > 0 ? `${Math.min(100, Math.round((abTransport / capaTransport) * 100))}%` : "—"],
      ["Bibliothèque", "Ouvrages", String(totalLivres)],
      ["Bibliothèque", "Emprunts en cours", String(empruntsCours)],
      ["Bibliothèque", "Emprunts en retard", String(empruntsRetard)],
    ],
    headStyles: { fillColor: [110, 26, 44] },
  });
  doc.save(`rapport-operationnel-${new Date().toISOString().slice(0, 10)}.pdf`);
}
