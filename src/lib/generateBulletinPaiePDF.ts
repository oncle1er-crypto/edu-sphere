import jsPDF from "jspdf";

export interface BulletinPaieEcole {
  nom: string;
  sigle?: string | null;
  adresse?: string | null;
  telephone?: string | null;
  email?: string | null;
  logo_url?: string | null;
}

export interface BulletinPaieSalarie {
  nom: string;
  prenom: string;
  matricule?: string | null;
  poste?: string | null;
  departement?: string | null;
  date_embauche?: string | null;
  numero_cnps?: string | null;
  numero_cmu?: string | null;
  parts_fiscales?: number | null;
  anciennete_annees?: number | null;
  type_contrat?: string | null;
}

export interface BulletinPaieCumuls {
  total_gains: number;
  brut_imposable: number;
  total_retenues: number;
  net_a_payer: number;
  base_cnps: number;
  total_charges_patronales: number;
}

export interface BulletinPaieLigne {
  libelle: string;
  base: number;
  taux: number | null;
  montant: number;
  type: string;
}

export interface BulletinPaieData {
  ecole: BulletinPaieEcole;
  salarie: BulletinPaieSalarie;
  mois: number;
  annee: number;
  statut: string;
  lignes: BulletinPaieLigne[];
  total_gains: number;
  total_retenues: number;
  net_a_payer: number;
  total_charges_patronales: number;
  cout_employeur: number;
  brut_imposable: number;
  base_cnps: number;
  date_paiement?: string | null;
  periode_debut: string;
  periode_fin: string;
  cumuls_annuels: BulletinPaieCumuls;
}

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const DASH = "—";

// `toLocaleString("fr-FR")` insère des espaces insécables fines que jsPDF rend
// comme une barre — on les remplace par un espace ASCII.
const num = (n: number) =>
  Math.round(n).toLocaleString("fr-FR").replace(/[\u202F\u00A0]/g, " ");
const money = (n: number) => `${num(n)} FCFA`;
const val = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? DASH : String(v);
const pct = (t: number | null) =>
  t === null || t === undefined ? DASH : `${String(Number(t)).replace(".", ",")} %`;
const dateFr = (date?: string | null) =>
  date ? new Date(`${date.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : DASH;
const libelleDepartement = (departement?: string | null) => {
  if (!departement) return DASH;
  const normalise = departement.trim().toLowerCase();
  if (normalise === "enseignant" || normalise === "enseignement") return "Enseignement";
  return departement
    .replace(/[_-]+/g, " ")
    .replace(/\b\p{L}/gu, (lettre) => lettre.toUpperCase());
};

async function loadImage(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const data = reader.result as string;
        const img = new Image();
        img.onload = () => resolve({ data, w: img.width, h: img.height });
        img.onerror = () => resolve(null);
        img.src = data;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateBulletinPaiePDF(data: BulletinPaieData): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const pad = 14;
  const innerW = W - pad * 2;

  const logo = data.ecole.logo_url ? await loadImage(data.ecole.logo_url) : null;

  // ---------- En-tête ----------
  pdf.setFillColor(110, 26, 44);
  pdf.rect(0, 0, W, 26, "F");
  pdf.setFillColor(252, 227, 77);
  pdf.rect(0, 26, W, 2.5, "F");

  let logoRight = pad;
  if (logo) {
    try {
      const h = 17;
      const w = h * (logo.w / logo.h);
      pdf.addImage(logo.data, "PNG", pad, 5, w, h);
      logoRight = pad + w + 4;
    } catch {
      /* noop */
    }
  }
  const cx = (W + logoRight) / 2;
  const maxW = W - logoRight - pad;
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(data.ecole.nom.toUpperCase(), cx, 11, { align: "center", maxWidth: maxW });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  const contact = [data.ecole.adresse, data.ecole.telephone, data.ecole.email]
    .filter(Boolean)
    .join("  •  ");
  if (contact) pdf.text(contact, cx, 18, { align: "center", maxWidth: maxW });

  pdf.setTextColor(30, 30, 30);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("BULLETIN DE PAIE", W / 2, 39, { align: "center" });
  pdf.setFontSize(10);
  pdf.setTextColor(110, 26, 44);
  pdf.text(`${MOIS[data.mois - 1] ?? DASH} ${data.annee}`, W / 2, 46, { align: "center" });

  pdf.setTextColor(90, 90, 90);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.text(`Période du ${dateFr(data.periode_debut)} au ${dateFr(data.periode_fin)}`, W / 2, 50, { align: "center" });

  // ---------- Bloc salarié ----------
  let y = 54;
  pdf.setDrawColor(200, 200, 200);
  pdf.setFillColor(248, 248, 248);
  pdf.rect(pad, y, innerW, 37, "FD");
  pdf.setTextColor(40, 40, 40);
  pdf.setFontSize(8.5);

  const s = data.salarie;
  const infos: [string, string][] = [
    ["Nom", val(s.nom)],
    ["Prénom", val(s.prenom)],
    ["Matricule", val(s.matricule)],
    ["Poste", val(s.poste)],
    ["Type de contrat", val(s.type_contrat)],
    ["Département", libelleDepartement(s.departement)],
    [
      "Date d'embauche",
      s.date_embauche ? new Date(s.date_embauche).toLocaleDateString("fr-FR") : DASH,
    ],
    ["N° CNPS", val(s.numero_cnps)],
    ["N° CMU", val(s.numero_cmu)],
    ["Parts fiscales", val(s.parts_fiscales)],
    [
      "Ancienneté",
      s.anciennete_annees === null || s.anciennete_annees === undefined
        ? DASH
        : `${s.anciennete_annees} an(s)`,
    ],
  ];
  const colW = innerW / 2;
  infos.forEach(([k, v], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = pad + 4 + col * colW;
    const ly = y + 7 + row * 5.2;
    pdf.setFont("helvetica", "bold");
    pdf.text(`${k} :`, x, ly);
    pdf.setFont("helvetica", "normal");
    pdf.text(v, x + 30, ly, { maxWidth: colW - 34 });
  });
  y += 42;

  // ---------- Détail de la rémunération (présentation inspirée du modèle Excel) ----------
  const cols = {
    libelle: pad + 3,
    base: pad + 87,
    taux: pad + 112,
    gain: pad + 139,
    retenue: pad + 164,
    patronale: pad + innerW - 3,
  };
  pdf.setFillColor(110, 26, 44);
  pdf.rect(pad, y, innerW, 6.5, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.text("DÉTAIL DE LA RÉMUNÉRATION", pad + 3, y + 4.5);
  y += 6.5;

  pdf.setFillColor(246, 246, 246);
  pdf.rect(pad, y, innerW, 8, "F");
  pdf.setTextColor(75, 75, 75);
  pdf.setFontSize(6.8);
  pdf.text("Désignation", cols.libelle, y + 4.8);
  pdf.text("Base", cols.base, y + 4.8, { align: "right" });
  pdf.text("Taux", cols.taux, y + 4.8, { align: "right" });
  pdf.text(["Gain", "salarié"], cols.gain, y + 3.1, { align: "right", lineHeightFactor: 0.9 });
  pdf.text(["Retenue", "salarié"], cols.retenue, y + 3.1, { align: "right", lineHeightFactor: 0.9 });
  pdf.text(["Charge", "employeur"], cols.patronale, y + 3.1, { align: "right", lineHeightFactor: 0.9 });
  y += 8;

  pdf.setTextColor(35, 35, 35);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.4);
  const ordreTypes: Record<string, number> = { gain: 0, retenue: 1, charge_patronale: 2 };
  [...data.lignes]
    .sort((a, b) => (ordreTypes[a.type] ?? 9) - (ordreTypes[b.type] ?? 9))
    .forEach((ligne) => {
    y += 4.7;
    pdf.setDrawColor(232, 232, 232);
    pdf.line(pad, y + 1.5, pad + innerW, y + 1.5);
    pdf.text(ligne.libelle, cols.libelle, y, { maxWidth: 78 });
    pdf.text(ligne.base ? num(ligne.base) : DASH, cols.base, y, { align: "right" });
    pdf.text(pct(ligne.taux), cols.taux, y, { align: "right" });
    pdf.text(ligne.type === "gain" ? num(ligne.montant) : DASH, cols.gain, y, { align: "right" });
    pdf.text(ligne.type === "retenue" ? num(ligne.montant) : DASH, cols.retenue, y, { align: "right" });
    pdf.text(ligne.type === "charge_patronale" ? num(ligne.montant) : DASH, cols.patronale, y, { align: "right" });
    });
  y += 3;
  pdf.setFillColor(238, 238, 238);
  pdf.rect(pad, y, innerW, 7, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.8);
  pdf.text("TOTAUX", cols.libelle, y + 4.7);
  pdf.text(num(data.total_gains), cols.gain, y + 4.7, { align: "right" });
  pdf.text(num(data.total_retenues), cols.retenue, y + 4.7, { align: "right" });
  pdf.text(num(data.total_charges_patronales), cols.patronale, y + 4.7, { align: "right" });
  y += 10;

  // ---------- Net à payer ----------
  pdf.setDrawColor(110, 26, 44);
  pdf.setLineWidth(0.8);
  pdf.setFillColor(255, 255, 255);
  pdf.rect(pad, y, innerW, 14, "FD");
  pdf.setLineWidth(0.2);
  pdf.setTextColor(110, 26, 44);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("NET À PAYER", pad + 4, y + 9.5);
  pdf.setFontSize(16);
  pdf.text(money(data.net_a_payer), pad + innerW - 4, y + 9.8, { align: "right" });
  y += 16;

  pdf.setFillColor(248, 248, 248);
  pdf.rect(pad, y, innerW, 6.5, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(60, 60, 60);
  pdf.text("COÛT EMPLOYEUR (INFORMATIF)", cols.libelle, y + 4.4);
  pdf.text(money(data.cout_employeur), cols.patronale, y + 4.4, { align: "right" });

  y += 9;
  if (y > H - 82) {
    pdf.addPage();
    y = 20;
  }

  // ---------- Bases réglementaires et cumuls annuels ----------
  pdf.setFillColor(110, 26, 44);
  pdf.rect(pad, y, innerW, 7, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(`SYNTHÈSE ET CUMULS ${data.annee}`, pad + 3, y + 4.8);
  y += 7;

  const synthese: [string, number, number][] = [
    ["Gains bruts", data.total_gains, data.cumuls_annuels.total_gains],
    ["Brut imposable", data.brut_imposable, data.cumuls_annuels.brut_imposable],
    ["Base CNPS", data.base_cnps, data.cumuls_annuels.base_cnps],
    ["Retenues salariales", data.total_retenues, data.cumuls_annuels.total_retenues],
    ["Net à payer", data.net_a_payer, data.cumuls_annuels.net_a_payer],
    ["Charges patronales", data.total_charges_patronales, data.cumuls_annuels.total_charges_patronales],
  ];
  const sx = [pad + 3, pad + 94, pad + innerW - 3];
  pdf.setFillColor(246, 246, 246);
  pdf.rect(pad, y, innerW, 6.5, "F");
  pdf.setTextColor(80, 80, 80);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.text("Indicateur", sx[0], y + 4.4);
  pdf.text("Mois", sx[1], y + 4.4, { align: "right" });
  pdf.text("Cumul annuel", sx[2], y + 4.4, { align: "right" });
  y += 6.5;
  synthese.forEach(([libelle, mensuel, cumul]) => {
    pdf.setDrawColor(226, 226, 226);
    pdf.line(pad, y + 5.6, pad + innerW, y + 5.6);
    pdf.setTextColor(45, 45, 45);
    pdf.setFont("helvetica", libelle === "Net à payer" ? "bold" : "normal");
    pdf.setFontSize(7.8);
    pdf.text(libelle, sx[0], y + 4);
    pdf.text(num(mensuel), sx[1], y + 4, { align: "right" });
    pdf.text(num(cumul), sx[2], y + 4, { align: "right" });
    y += 5.6;
  });

  // ---------- Paiement et signatures ----------
  y += 3;
  pdf.setDrawColor(190, 190, 190);
  pdf.rect(pad, y, innerW, 23);
  pdf.line(W / 2, y, W / 2, y + 23);
  pdf.setTextColor(70, 70, 70);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.text("SIGNATURE DU SALARIÉ", pad + innerW / 4, y + 5, { align: "center" });
  pdf.text("CACHET ET SIGNATURE DE L'EMPLOYEUR", W / 2 + innerW / 4, y + 5, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.text(`Salaire payé le : ${dateFr(data.date_paiement)}`, W / 2 + 4, y + 11);

  // ---------- Filigrane brouillon ----------
  const statut = data.statut === "valide" || data.statut === "paye" ? data.statut : "brouillon";
  if (statut === "brouillon") {
    const pages = pdf.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      pdf.setPage(i);
      const gs = (pdf as unknown as { GState?: new (o: { opacity: number }) => unknown }).GState;
      const setGState = (pdf as unknown as { setGState?: (g: unknown) => void }).setGState;
      if (gs && setGState) setGState.call(pdf, new gs({ opacity: 0.15 }));
      pdf.setTextColor(200, 30, 30);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(34);
      pdf.text("BROUILLON — NON VALIDÉ", W / 2, H / 2, {
        align: "center",
        angle: 30,
      } as Parameters<typeof pdf.text>[3]);
      if (gs && setGState) setGState.call(pdf, new gs({ opacity: 1 }));
    }
  }

  // ---------- Pied de page ----------
  const statutLabel =
    statut === "paye" ? "Payé" : statut === "valide" ? "Validé" : "Brouillon (non validé)";
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setTextColor(120, 120, 120);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text(
      `Bulletin établi le ${new Date().toLocaleDateString("fr-FR")}  •  Statut : ${statutLabel}`,
      pad,
      H - 10,
    );
    pdf.text(`Page ${i}/${pages}`, W - pad, H - 10, { align: "right" });
  }

  return pdf;
}

export async function downloadBulletinPaiePDF(data: BulletinPaieData) {
  const pdf = await generateBulletinPaiePDF(data);
  const nom = `${data.salarie.nom}-${data.salarie.prenom}`.replace(/\s+/g, "_");
  pdf.save(`bulletin-paie-${nom}-${data.annee}-${String(data.mois).padStart(2, "0")}.pdf`);
}
