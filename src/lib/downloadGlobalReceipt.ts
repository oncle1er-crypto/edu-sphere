import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import type { EleveScolarite } from "@/pages/finances/scolarite-data";

const FCFA = (n: number) =>
  `${Math.round(n).toLocaleString("fr-FR").replace(/\u202f/g, " ").replace(/\u00a0/g, " ")} FCFA`;

async function fetchLogo(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onloadend = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function detectFormat(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg") ? "JPEG" : "PNG";
}

interface Params {
  ecoleId: string;
  eleve: EleveScolarite;
}

/**
 * Génère et télécharge un reçu global (récapitulatif) de tous les versements
 * effectués pour un élève : encaissements + remises/bourses, avec totaux.
 */
export async function downloadGlobalReceipt({ ecoleId, eleve }: Params): Promise<void> {
  const { data: ecole } = await supabase
    .from("ecoles")
    .select("nom, sigle, devise, adresse, telephone, email, logo_url")
    .eq("id", ecoleId)
    .maybeSingle();

  if (!ecole) return;

  const paiements = [...(eleve.paiements ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const logoData = await fetchLogo(ecole.logo_url);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 15;

  // ── Header (bandeau école) ──
  doc.setFillColor(250, 246, 247);
  doc.rect(0, 0, W, 32, "F");
  if (logoData) {
    try { doc.addImage(logoData, detectFormat(logoData), M, 6, 22, 22); } catch { /* noop */ }
  }
  const textX = logoData ? M + 26 : M;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(110, 26, 44);
  doc.text((ecole.nom || "École").toUpperCase(), textX, 13);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(90);
  doc.text(ecole.devise || "Foi, Savoir, Excellence", textX, 18);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  const contact = [ecole.adresse, ecole.telephone, ecole.email].filter(Boolean).join("  •  ");
  if (contact) doc.text(contact, textX, 23);
  doc.setDrawColor(110, 26, 44); doc.setLineWidth(0.8); doc.line(M, 32, W - M, 32);
  doc.setDrawColor(252, 227, 77); doc.setLineWidth(0.4); doc.line(M, 33.2, W - M, 33.2);

  // ── Titre ──
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30);
  doc.text("REÇU GLOBAL DES VERSEMENTS", W / 2, 41, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  doc.text(`Édité le : ${new Date().toLocaleDateString("fr-FR")}`, W - M, 48, { align: "right" });

  // ── Bloc élève ──
  doc.setDrawColor(220);
  doc.setFillColor(252, 250, 250);
  doc.roundedRect(M, 52, W - 2 * M, 22, 2, 2, "FD");
  doc.setTextColor(30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`${eleve.nom} ${eleve.prenom}`, M + 4, 60);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90);
  doc.text(`Classe : ${eleve.classe}   •   Cycle : ${eleve.cycle}   •   Matricule : ${eleve.matricule}`, M + 4, 66);
  doc.text(`Parent : ${eleve.parent}   •   Tél : ${eleve.telephone}`, M + 4, 71);

  // ── Tableau des versements ──
  const rows = paiements.map((p) => [
    new Date(p.date).toLocaleDateString("fr-FR"),
    p.reference ?? "—",
    p.modeLabel,
    p.kind === "remise" ? "Remise / Bourse" : "Encaissement",
    p.trancheNum ? `T${p.trancheNum}` : "—",
    FCFA(p.montant),
  ]);

  autoTable(doc, {
    startY: 80,
    head: [["Date", "Référence", "Mode", "Nature", "Tranche", "Montant"]],
    body: rows.length > 0 ? rows : [[{ content: "Aucun versement enregistré.", colSpan: 6, styles: { halign: "center", textColor: 120, fontStyle: "italic" } } as any]],
    theme: "grid",
    headStyles: { fillColor: [110, 26, 44], textColor: 255, fontStyle: "bold", halign: "left" },
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: 40 },
    alternateRowStyles: { fillColor: [250, 246, 247] },
    columnStyles: { 5: { halign: "right", fontStyle: "bold" } },
    margin: { left: M, right: M },
  });

  const y1 = (doc as any).lastAutoTable?.finalY ?? 100;

  // ── Synthèse financière ──
  const encaisse = eleve.totalEncaisse ?? 0;
  const remises = eleve.totalRemises ?? 0;
  const couvert = eleve.totalPaye;
  const total = eleve.fraisAnnuel;
  const reste = Math.max(0, eleve.resteDu);

  autoTable(doc, {
    startY: y1 + 6,
    head: [["Synthèse financière", "Montant"]],
    body: [
      ["Total dû (frais annuels)", FCFA(total)],
      ["  dont encaissé (caisse)", FCFA(encaisse)],
      ["  dont remises / bourses", FCFA(remises)],
      [
        { content: "Total couvert", styles: { fontStyle: "bold" } },
        { content: FCFA(couvert), styles: { fontStyle: "bold", textColor: [22, 122, 70] } },
      ],
      [
        { content: "Reste à payer", styles: { fontStyle: "bold" } },
        { content: FCFA(reste), styles: { fontStyle: "bold", textColor: reste > 0 ? [180, 40, 40] : [22, 122, 70] } },
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [110, 26, 44], textColor: 255, fontStyle: "bold", halign: "left" },
    styles: { fontSize: 9, cellPadding: 2.5, textColor: 40 },
    columnStyles: { 1: { halign: "right" } },
    margin: { left: M, right: M },
  });

  const y2 = (doc as any).lastAutoTable?.finalY ?? y1 + 60;

  // ── Note & signature ──
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.setFont("helvetica", "italic");
  doc.text(
    "Ce document récapitule l'ensemble des versements enregistrés à ce jour pour l'élève. Il ne remplace pas les reçus unitaires officiels.",
    M,
    y2 + 8,
    { maxWidth: W - 2 * M },
  );

  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  doc.text("Signature & cachet de l'école", W - M - 60, y2 + 30);
  doc.setDrawColor(180);
  doc.line(W - M - 60, y2 + 42, W - M, y2 + 42);

  // ── Footer ──
  const H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(220); doc.setLineWidth(0.2);
  doc.line(M, H - 12, W - M, H - 12);
  doc.setFontSize(7);
  doc.setTextColor(130);
  doc.text(`${ecole.nom} — Document confidentiel`, M, H - 7);
  doc.text("Page 1 / 1", W - M, H - 7, { align: "right" });

  doc.save(`recu-global-${(eleve.matricule || eleve.id).replace(/[^\w-]/g, "")}.pdf`);
}
