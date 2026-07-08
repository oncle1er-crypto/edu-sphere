import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

const fmt = (n: number | null | undefined, d = 2) =>
  n == null ? "—" : Number(n).toFixed(d);

function newPdf(title: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("GROUPE SCOLAIRE LA PROVIDENCE", 105, 15, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Abidjan — Côte d'Ivoire · Foi, Savoir, Excellence", 105, 21, { align: "center" });
  doc.setDrawColor(110, 26, 44);
  doc.setLineWidth(0.4);
  doc.line(15, 25, 195, 25);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(title, 105, 33, { align: "center" });
  return doc;
}

function saveXlsx(rows: any[], sheetName: string, fileName: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, fileName);
}

// ──────────────────────────────────────────────────────────────────
// 1. PV de délibération
// ──────────────────────────────────────────────────────────────────
export async function generatePVDeliberation(
  ecoleId: string,
  classeId: string,
  periodeId: string
) {
  const { data: classe } = await supabase.from("classes").select("nom").eq("id", classeId).maybeSingle();
  const { data: periode } = await supabase.from("periodes").select("nom").eq("id", periodeId).maybeSingle();
  const { data: bulletins } = await supabase
    .from("bulletins_audit")
    .select("moyenne, rang, mention, decision_conseil, eleve_id, locked")
    .eq("ecole_id", ecoleId)
    .eq("classe_id", classeId)
    .eq("periode_id", periodeId)
    .order("rang", { ascending: true });
  const eleveIds = (bulletins ?? []).map((b: any) => b.eleve_id);
  const { data: eleves } = eleveIds.length
    ? await supabase.from("eleves").select("id, nom, prenom").in("id", eleveIds)
    : { data: [] };
  const nameMap = new Map((eleves ?? []).map((e: any) => [e.id, `${e.nom} ${e.prenom}`]));

  if (!bulletins || bulletins.length === 0) throw new Error("Aucun bulletin pour cette classe/période");

  const doc = newPdf(`PV de délibération — ${classe?.nom ?? ""} · ${periode?.nom ?? ""}`);
  autoTable(doc, {
    startY: 40,
    head: [["Rang", "Élève", "Moyenne", "Mention", "Décision", "Verrouillé"]],
    body: bulletins.map((b: any) => [
      b.rang ?? "—",
      nameMap.get(b.eleve_id) ?? "—",
      fmt(b.moyenne),
      b.mention ?? "—",
      b.decision_conseil ?? "—",
      b.locked ? "Oui" : "Non",
    ]),
    headStyles: { fillColor: [110, 26, 44] },
    styles: { fontSize: 9 },
  });
  const finalY = (doc as any).lastAutoTable.finalY ?? 40;
  doc.setFontSize(9);
  doc.text(`Effectif : ${bulletins.length}   |   Généré le ${new Date().toLocaleDateString("fr-FR")}`, 15, finalY + 10);
  doc.text("Le Président du conseil ______________________________", 15, finalY + 25);
  doc.save(`PV_${classe?.nom ?? "classe"}_${periode?.nom ?? "periode"}.pdf`.replace(/\s+/g, "_"));
}

// ──────────────────────────────────────────────────────────────────
// 2. Relevé de notes individuel
// ──────────────────────────────────────────────────────────────────
export async function generateReleveNotes(
  ecoleId: string,
  eleveId: string,
  periodeId: string
) {
  const { data: eleve } = await supabase.from("eleves").select("nom, prenom, classe_id, classes(nom)").eq("id", eleveId).maybeSingle();
  const { data: periode } = await supabase.from("periodes").select("nom").eq("id", periodeId).maybeSingle();
  const { data: evals } = await supabase
    .from("evaluations")
    .select("id, type, bareme, coefficient, date_eval, matieres(nom)")
    .eq("ecole_id", ecoleId)
    .eq("periode_id", periodeId);
  const evalIds = (evals ?? []).map((e: any) => e.id);
  const { data: notes } = evalIds.length
    ? await supabase.from("notes").select("evaluation_id, note, absent").eq("eleve_id", eleveId).in("evaluation_id", evalIds)
    : { data: [] };
  const noteMap = new Map((notes ?? []).map((n: any) => [n.evaluation_id, n]));

  const rows = (evals ?? []).map((e: any) => {
    const n = noteMap.get(e.id);
    return {
      matiere: e.matieres?.nom ?? "—",
      type: e.type ?? "—",
      date: e.date_eval ? new Date(e.date_eval).toLocaleDateString("fr-FR") : "—",
      note: n?.absent ? "Abs" : fmt(n?.note),
      bareme: e.bareme ?? 20,
      coef: e.coefficient ?? 1,
    };
  });
  if (rows.length === 0) throw new Error("Aucune évaluation sur cette période");

  const doc = newPdf(`Relevé de notes — ${periode?.nom ?? ""}`);
  doc.setFontSize(10);
  doc.text(`Élève : ${eleve?.nom ?? ""} ${eleve?.prenom ?? ""}`, 15, 42);
  doc.text(`Classe : ${(eleve as any)?.classes?.nom ?? "—"}`, 15, 48);
  autoTable(doc, {
    startY: 54,
    head: [["Matière", "Type", "Date", "Note", "Barème", "Coef."]],
    body: rows.map((r) => [r.matiere, r.type, r.date, r.note, r.bareme, r.coef]),
    headStyles: { fillColor: [110, 26, 44] },
    styles: { fontSize: 9 },
  });
  doc.save(`Releve_${eleve?.nom ?? ""}_${eleve?.prenom ?? ""}_${periode?.nom ?? ""}.pdf`.replace(/\s+/g, "_"));
}

// ──────────────────────────────────────────────────────────────────
// 3. Statistiques par matière (Excel)
// ──────────────────────────────────────────────────────────────────
export async function generateStatsMatieres(ecoleId: string, periodeId: string) {
  const { data: periode } = await supabase.from("periodes").select("nom").eq("id", periodeId).maybeSingle();
  const { data: evals } = await supabase
    .from("evaluations")
    .select("id, matiere_id, matieres(nom)")
    .eq("ecole_id", ecoleId)
    .eq("periode_id", periodeId);
  const evalIds = (evals ?? []).map((e: any) => e.id);
  const { data: notes } = evalIds.length
    ? await supabase.from("notes").select("evaluation_id, note, absent").in("evaluation_id", evalIds)
    : { data: [] };

  const byMatiere = new Map<string, { nom: string; total: number; effectif: number; min: number; max: number; abs: number }>();
  for (const e of evals ?? []) {
    const key = e.matiere_id;
    if (!byMatiere.has(key))
      byMatiere.set(key, { nom: (e as any).matieres?.nom ?? "—", total: 0, effectif: 0, min: 20, max: 0, abs: 0 });
  }
  for (const n of notes ?? []) {
    const ev = (evals ?? []).find((e: any) => e.id === (n as any).evaluation_id);
    if (!ev) continue;
    const bucket = byMatiere.get((ev as any).matiere_id)!;
    if ((n as any).absent) { bucket.abs++; continue; }
    if ((n as any).note == null) continue;
    const v = Number((n as any).note);
    bucket.total += v;
    bucket.effectif++;
    if (v < bucket.min) bucket.min = v;
    if (v > bucket.max) bucket.max = v;
  }

  const rows = Array.from(byMatiere.values()).map((b) => ({
    Matière: b.nom,
    Effectif_noté: b.effectif,
    Absences: b.abs,
    Moyenne: b.effectif > 0 ? Number((b.total / b.effectif).toFixed(2)) : null,
    Note_min: b.effectif > 0 ? b.min : null,
    Note_max: b.effectif > 0 ? b.max : null,
    Taux_réussite: b.effectif > 0
      ? Math.round(((notes ?? []).filter((n: any) => {
          const ev = (evals ?? []).find((e: any) => e.id === n.evaluation_id);
          return ev && (ev as any).matiere_id && !n.absent && n.note != null && Number(n.note) >= 10;
        }).length / b.effectif) * 100)
      : 0,
  }));
  if (rows.length === 0) throw new Error("Aucune donnée pour cette période");
  saveXlsx(rows, "Statistiques", `Stats_matieres_${periode?.nom ?? "periode"}.xlsx`.replace(/\s+/g, "_"));
}

// ──────────────────────────────────────────────────────────────────
// 4. Palmarès trimestriel
// ──────────────────────────────────────────────────────────────────
export async function generatePalmares(ecoleId: string, periodeId: string, classeId?: string) {
  const { data: periode } = await supabase.from("periodes").select("nom").eq("id", periodeId).maybeSingle();
  let q = supabase
    .from("bulletins_audit")
    .select("moyenne, rang, mention, eleve_id, classe_id")
    .eq("ecole_id", ecoleId)
    .eq("periode_id", periodeId)
    .not("moyenne", "is", null)
    .order("moyenne", { ascending: false });
  if (classeId) q = q.eq("classe_id", classeId);
  const { data: bulletins } = await q;
  const items = (bulletins ?? []).slice(0, 30);
  if (items.length === 0) throw new Error("Aucun bulletin");
  const eleveIds = items.map((b: any) => b.eleve_id);
  const classeIds = Array.from(new Set(items.map((b: any) => b.classe_id)));
  const [{ data: eleves }, { data: classes }] = await Promise.all([
    supabase.from("eleves").select("id, nom, prenom").in("id", eleveIds),
    supabase.from("classes").select("id, nom").in("id", classeIds),
  ]);
  const eleveMap = new Map((eleves ?? []).map((e: any) => [e.id, `${e.nom} ${e.prenom}`]));
  const classeMap = new Map((classes ?? []).map((c: any) => [c.id, c.nom]));

  const doc = newPdf(`Palmarès — ${periode?.nom ?? ""}`);
  autoTable(doc, {
    startY: 40,
    head: [["#", "Élève", "Classe", "Moyenne", "Mention"]],
    body: items.map((b: any, i: number) => [
      i + 1,
      eleveMap.get(b.eleve_id) ?? "—",
      classeMap.get(b.classe_id) ?? "—",
      fmt(b.moyenne),
      b.mention ?? "—",
    ]),
    headStyles: { fillColor: [252, 227, 77], textColor: [110, 26, 44] },
    styles: { fontSize: 9 },
  });
  doc.save(`Palmares_${periode?.nom ?? "periode"}.pdf`.replace(/\s+/g, "_"));
}

// ──────────────────────────────────────────────────────────────────
// 5. Rapport d'évolution (Excel, multi-périodes par élève)
// ──────────────────────────────────────────────────────────────────
export async function generateEvolutionMoyennes(ecoleId: string, anneeId: string, classeId: string) {
  const { data: classe } = await supabase.from("classes").select("nom").eq("id", classeId).maybeSingle();
  const { data: periodes } = await supabase
    .from("periodes")
    .select("id, nom")
    .eq("ecole_id", ecoleId)
    .eq("annee_id", anneeId)
    .order("debut");
  const { data: bulletins } = await supabase
    .from("bulletins_audit")
    .select("moyenne, eleve_id, periode_id")
    .eq("ecole_id", ecoleId)
    .eq("annee_id", anneeId)
    .eq("classe_id", classeId);
  const eleveIds = Array.from(new Set((bulletins ?? []).map((b: any) => b.eleve_id)));
  const { data: eleves } = eleveIds.length
    ? await supabase.from("eleves").select("id, nom, prenom").in("id", eleveIds)
    : { data: [] };

  if (!periodes || periodes.length === 0) throw new Error("Aucune période sur cette année");
  const rows = (eleves ?? []).map((e: any) => {
    const row: Record<string, any> = { Élève: `${e.nom} ${e.prenom}` };
    let sum = 0, count = 0;
    for (const p of periodes) {
      const b = (bulletins ?? []).find((x: any) => x.eleve_id === e.id && x.periode_id === p.id);
      const m = b?.moyenne != null ? Number(b.moyenne) : null;
      row[p.nom] = m;
      if (m != null) { sum += m; count++; }
    }
    row["Moyenne annuelle"] = count > 0 ? Number((sum / count).toFixed(2)) : null;
    return row;
  });
  if (rows.length === 0) throw new Error("Aucun élève avec bulletin");
  saveXlsx(rows, "Évolution", `Evolution_${classe?.nom ?? "classe"}.xlsx`.replace(/\s+/g, "_"));
}

// ──────────────────────────────────────────────────────────────────
// 6. Liste admis/redoublants
// ──────────────────────────────────────────────────────────────────
export async function generateDecisionsFinAnnee(ecoleId: string, anneeId: string, classeId?: string) {
  let q = supabase
    .from("decisions_fin_annee")
    .select("decision, motif, eleve_id, classe_origine_id, classe_destination_id, statut")
    .eq("ecole_id", ecoleId)
    .eq("annee_id", anneeId);
  if (classeId) q = q.eq("classe_origine_id", classeId);
  const { data: decisions } = await q;
  if (!decisions || decisions.length === 0) throw new Error("Aucune décision enregistrée");
  const eleveIds = decisions.map((d: any) => d.eleve_id);
  const classeIds = Array.from(new Set(decisions.flatMap((d: any) => [d.classe_origine_id, d.classe_destination_id]).filter(Boolean)));
  const [{ data: eleves }, { data: classes }] = await Promise.all([
    supabase.from("eleves").select("id, nom, prenom").in("id", eleveIds),
    supabase.from("classes").select("id, nom").in("id", classeIds),
  ]);
  const eleveMap = new Map((eleves ?? []).map((e: any) => [e.id, `${e.nom} ${e.prenom}`]));
  const classeMap = new Map((classes ?? []).map((c: any) => [c.id, c.nom]));

  const doc = newPdf("Décisions de fin d'année");
  autoTable(doc, {
    startY: 40,
    head: [["Élève", "Classe origine", "Décision", "Classe destination", "Statut"]],
    body: decisions.map((d: any) => [
      eleveMap.get(d.eleve_id) ?? "—",
      classeMap.get(d.classe_origine_id) ?? "—",
      d.decision,
      d.classe_destination_id ? classeMap.get(d.classe_destination_id) ?? "—" : "—",
      d.statut,
    ]),
    headStyles: { fillColor: [110, 26, 44] },
    styles: { fontSize: 9 },
  });
  doc.save(`Decisions_fin_annee.pdf`);
}
