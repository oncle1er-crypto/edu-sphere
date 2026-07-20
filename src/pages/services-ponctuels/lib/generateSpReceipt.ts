import jsPDF from "jspdf";

export interface SpReceiptData {
  numero: string;
  date: string;
  ecoleNom: string;
  ecoleAdresse?: string;
  ecoleTelephone?: string;
  logoUrl?: string;
  service: string;
  beneficiaire: string;
  quantite?: number;
  montantDu?: number;
  montantPaye: number;
  remise?: number;
  reste?: number;
  modePaiement: string;
  caissier?: string;
  observations?: string;
  titre?: string; // "REÇU" | "REÇU DE VENTE" | "REÇU DE CORRECTION"
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " FCFA";

const MODES: Record<string, string> = {
  especes: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
  mtn_money: "MTN Money",
  moov_money: "Moov Money",
  virement: "Virement",
  cheque: "Chèque",
};

export function generateSpReceipt(d: SpReceiptData) {
  const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
  const w = doc.internal.pageSize.getWidth();
  let y = 12;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(d.ecoleNom, w / 2, y, { align: "center" });
  y += 5;
  if (d.ecoleAdresse) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(d.ecoleAdresse, w / 2, y, { align: "center" });
    y += 4;
  }
  if (d.ecoleTelephone) {
    doc.setFontSize(9);
    doc.text(`Tél. ${d.ecoleTelephone}`, w / 2, y, { align: "center" });
    y += 4;
  }

  doc.setDrawColor(110, 26, 44);
  doc.setLineWidth(0.6);
  doc.line(10, y + 1, w - 10, y + 1);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(d.titre ?? "REÇU DE PAIEMENT", w / 2, y, { align: "center" });
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`N° ${d.numero}`, 12, y);
  doc.text(`Date : ${d.date}`, w - 12, y, { align: "right" });
  y += 8;

  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, 12, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 55, y);
    y += 6;
  };

  row("Service :", d.service);
  row("Bénéficiaire :", d.beneficiaire);
  if (d.quantite) row("Quantité :", String(d.quantite));
  if (d.montantDu != null) row("Montant dû :", fmt(d.montantDu));
  if (d.remise) row("Remise :", fmt(d.remise));
  row("Mode de paiement :", MODES[d.modePaiement] ?? d.modePaiement);

  y += 2;
  doc.setDrawColor(200);
  doc.line(10, y, w - 10, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(110, 26, 44);
  doc.text("TOTAL ENCAISSÉ", 12, y);
  doc.text(fmt(d.montantPaye), w - 12, y, { align: "right" });
  doc.setTextColor(0);
  y += 8;

  if (d.reste && d.reste > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Reste à payer : ${fmt(d.reste)}`, 12, y);
    y += 5;
  }

  if (d.observations) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(`Obs. : ${d.observations}`, 12, y, { maxWidth: w - 24 });
    y += 6;
  }

  y = Math.max(y + 10, 130);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (d.caissier) doc.text(`Caissier : ${d.caissier}`, 12, y);
  doc.text("Signature & cachet", w - 12, y, { align: "right" });

  doc.save(`recu-${d.numero}.pdf`);
}
