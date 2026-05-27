import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

const JOURS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

interface Creneau {
  id: string;
  classe_id: string;
  matiere_id: string;
  enseignant_id: string | null;
  jour: number;
  heure_debut: string;
  heure_fin: string;
  salle: string | null;
  salle_id?: string | null;
  classes?: { nom: string } | null;
  matieres?: { nom: string } | null;
  enseignants?: { nom: string; prenom: string } | null;
  salles?: { code: string; nom: string } | null;
}

interface Ecole {
  nom?: string;
  sigle?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  devise?: string;
}

async function fetchData(ecoleId: string, anneeId: string) {
  const [creneauxRes, ecoleRes, anneeRes] = await Promise.all([
    supabase
      .from("creneaux_emploi_temps" as any)
      .select(
        "*, classes(nom), matieres(nom), enseignants(nom, prenom), salles(code, nom)"
      )
      .eq("ecole_id", ecoleId)
      .eq("annee_id", anneeId)
      .order("jour")
      .order("heure_debut"),
    supabase.from("ecoles").select("*").eq("id", ecoleId).maybeSingle(),
    supabase.from("annees_scolaires").select("libelle").eq("id", anneeId).maybeSingle(),
  ]);
  return {
    creneaux: ((creneauxRes.data as any[]) ?? []) as Creneau[],
    ecole: (ecoleRes.data as any) ?? {},
    annee: (anneeRes.data as any)?.libelle ?? "",
  };
}

function header(doc: jsPDF, ecole: Ecole, titre: string, sousTitre: string, annee: string) {
  doc.setFontSize(14).setFont("helvetica", "bold");
  doc.text(ecole.nom ?? "Établissement", 14, 14);
  doc.setFontSize(9).setFont("helvetica", "normal");
  if (ecole.adresse) doc.text(ecole.adresse, 14, 20);
  if (ecole.devise) doc.text(`« ${ecole.devise} »`, 14, 25);
  doc.setFontSize(13).setFont("helvetica", "bold");
  doc.text(titre, 14, 34);
  doc.setFontSize(10).setFont("helvetica", "normal");
  doc.text(sousTitre, 14, 40);
  if (annee) doc.text(`Année scolaire : ${annee}`, 14, 45);
}

function slotLabel(c: Creneau) {
  const lines = [c.matieres?.nom ?? "-"];
  if (c.enseignants) lines.push(`${c.enseignants.prenom} ${c.enseignants.nom}`);
  const salle = c.salles?.code ?? c.salle;
  if (salle) lines.push(`Salle ${salle}`);
  return lines.join("\n");
}

function timeSlots(creneaux: Creneau[]): string[] {
  const set = new Set<string>();
  creneaux.forEach((c) => set.add(`${c.heure_debut.slice(0, 5)}-${c.heure_fin.slice(0, 5)}`));
  return Array.from(set).sort();
}

function buildGrid(creneaux: Creneau[]) {
  const slots = timeSlots(creneaux);
  const days = [1, 2, 3, 4, 5, 6];
  const body = slots.map((slot) => {
    const [hd, hf] = slot.split("-");
    return [
      slot,
      ...days.map((d) => {
        const cs = creneaux.filter(
          (c) =>
            c.jour === d &&
            c.heure_debut.slice(0, 5) === hd &&
            c.heure_fin.slice(0, 5) === hf
        );
        return cs.map(slotLabel).join("\n---\n");
      }),
    ];
  });
  return {
    head: [["Horaire", ...days.map((d) => JOURS[d])]],
    body,
  };
}

export async function exportEDTParClassePDF(ecoleId: string, anneeId: string) {
  const { creneaux, ecole, annee } = await fetchData(ecoleId, anneeId);
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  const byClasse = new Map<string, Creneau[]>();
  creneaux.forEach((c) => {
    const k = `${c.classes?.nom ?? "?"}|${c.classe_id}`;
    if (!byClasse.has(k)) byClasse.set(k, []);
    byClasse.get(k)!.push(c);
  });
  const entries = Array.from(byClasse.entries()).sort();
  if (entries.length === 0) {
    header(doc, ecole, "Emplois du temps par classe", "Aucun créneau", annee);
  } else {
    entries.forEach(([key, list], idx) => {
      if (idx > 0) doc.addPage();
      const nom = key.split("|")[0];
      header(doc, ecole, "Emploi du temps – Classe", nom, annee);
      const grid = buildGrid(list);
      autoTable(doc, {
        startY: 52,
        head: grid.head,
        body: grid.body,
        styles: { fontSize: 7, cellPadding: 2, valign: "middle", halign: "center" },
        headStyles: { fillColor: [110, 26, 44], textColor: 255 },
        columnStyles: { 0: { fontStyle: "bold", fillColor: [245, 240, 230] } },
      });
    });
  }
  doc.save(`EDT_classes_${annee || "annee"}.pdf`);
}

export async function exportEDTParEnseignantPDF(ecoleId: string, anneeId: string) {
  const { creneaux, ecole, annee } = await fetchData(ecoleId, anneeId);
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  const byEns = new Map<string, Creneau[]>();
  creneaux.forEach((c) => {
    if (!c.enseignant_id || !c.enseignants) return;
    const k = `${c.enseignants.nom} ${c.enseignants.prenom}|${c.enseignant_id}`;
    if (!byEns.has(k)) byEns.set(k, []);
    byEns.get(k)!.push(c);
  });
  const entries = Array.from(byEns.entries()).sort();
  if (entries.length === 0) {
    header(doc, ecole, "Plannings enseignants", "Aucun créneau attribué", annee);
  } else {
    entries.forEach(([key, list], idx) => {
      if (idx > 0) doc.addPage();
      const nom = key.split("|")[0];
      header(doc, ecole, "Planning enseignant", nom, annee);
      const grid = buildGrid(
        list.map((c) => ({
          ...c,
          enseignants: null,
          matieres: { nom: `${c.matieres?.nom ?? "-"} (${c.classes?.nom ?? ""})` },
        }))
      );
      autoTable(doc, {
        startY: 52,
        head: grid.head,
        body: grid.body,
        styles: { fontSize: 7, cellPadding: 2, valign: "middle", halign: "center" },
        headStyles: { fillColor: [110, 26, 44], textColor: 255 },
        columnStyles: { 0: { fontStyle: "bold", fillColor: [245, 240, 230] } },
      });
    });
  }
  doc.save(`EDT_enseignants_${annee || "annee"}.pdf`);
}

export async function exportSyntheseHebdoPDF(ecoleId: string, anneeId: string) {
  const { creneaux, ecole, annee } = await fetchData(ecoleId, anneeId);
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  header(doc, ecole, "Synthèse hebdomadaire", "Vue globale de l'établissement", annee);
  const rows = creneaux.map((c) => [
    JOURS[c.jour] ?? "?",
    `${c.heure_debut.slice(0, 5)}-${c.heure_fin.slice(0, 5)}`,
    c.classes?.nom ?? "-",
    c.matieres?.nom ?? "-",
    c.enseignants ? `${c.enseignants.prenom} ${c.enseignants.nom}` : "-",
    c.salles?.code ?? c.salle ?? "-",
  ]);
  autoTable(doc, {
    startY: 52,
    head: [["Jour", "Horaire", "Classe", "Matière", "Enseignant", "Salle"]],
    body: rows,
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [110, 26, 44], textColor: 255 },
  });
  doc.save(`EDT_synthese_${annee || "annee"}.pdf`);
}

export async function exportOccupationSallesXLSX(ecoleId: string, anneeId: string) {
  const { creneaux, annee } = await fetchData(ecoleId, anneeId);
  const wb = XLSX.utils.book_new();
  const bySalle = new Map<string, Creneau[]>();
  creneaux.forEach((c) => {
    const key = c.salles?.code ?? c.salle ?? "(non assignée)";
    if (!bySalle.has(key)) bySalle.set(key, []);
    bySalle.get(key)!.push(c);
  });

  // Feuille récap
  const recap = Array.from(bySalle.entries())
    .sort()
    .map(([salle, list]) => {
      const heures = list.reduce((acc, c) => {
        const [hd1, hd2] = c.heure_debut.split(":").map(Number);
        const [hf1, hf2] = c.heure_fin.split(":").map(Number);
        return acc + (hf1 * 60 + hf2 - hd1 * 60 - hd2) / 60;
      }, 0);
      return { Salle: salle, "Nb créneaux": list.length, "Heures / semaine": Number(heures.toFixed(2)) };
    });
  const wsRecap = XLSX.utils.json_to_sheet(recap);
  XLSX.utils.book_append_sheet(wb, wsRecap, "Récapitulatif");

  // Une feuille par salle
  Array.from(bySalle.entries()).forEach(([salle, list]) => {
    const rows = list
      .sort((a, b) => a.jour - b.jour || a.heure_debut.localeCompare(b.heure_debut))
      .map((c) => ({
        Jour: JOURS[c.jour] ?? "",
        Début: c.heure_debut.slice(0, 5),
        Fin: c.heure_fin.slice(0, 5),
        Classe: c.classes?.nom ?? "",
        Matière: c.matieres?.nom ?? "",
        Enseignant: c.enseignants ? `${c.enseignants.prenom} ${c.enseignants.nom}` : "",
      }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const safe = salle.replace(/[\\/?*\[\]:]/g, "_").slice(0, 28);
    XLSX.utils.book_append_sheet(wb, ws, safe || "Salle");
  });

  XLSX.writeFile(wb, `Occupation_salles_${annee || "annee"}.xlsx`);
}
