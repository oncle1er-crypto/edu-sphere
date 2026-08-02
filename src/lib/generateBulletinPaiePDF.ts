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

  // ---------- Bloc salarié ----------
  let y = 52;
  pdf.setDrawColor(200, 200, 200);
  pdf.setFillColor(248, 248, 248);
  pdf.rect(pad, y, innerW, 32, "FD");
  pdf.setTextColor(40, 40, 40);
  pdf.setFontSize(8.5);

  const s = data.salarie;
  const infos: [string, string][] = [
    ["Nom", val(s.nom)],
    ["Prénom", val(s.prenom)],
    ["Matricule", val(s.matricule)],
    ["Poste", val(s.poste)],
    ["Département", val(s.departement)],
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
  y += 38;

  // ---------- Tableaux ----------
  const cols = [pad + 3, pad + 78, pad + 112, pad + innerW - 3];

  const drawTable = (
    titre: string,
    lignes: BulletinPaieLigne[],
    total: number,
    totalLabel: string,
    sousTitre?: string,
  ) => {
    if (y > H - 60) {
      pdf.addPage();
      y = 20;
    }
    pdf.setFillColor(110, 26, 44);
    pdf.rect(pad, y, innerW, 7, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(titre, pad + 3, y + 4.8);
    if (sousTitre) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.text(sousTitre, pad + innerW - 3, y + 4.8, { align: "right" });
    }
    y += 7;

    pdf.setTextColor(80, 80, 80);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.text("Libellé", cols[0], y + 4.5);
    pdf.text("Base", cols[1], y + 4.5, { align: "right" });
    pdf.text("Taux", cols[2], y + 4.5, { align: "right" });
    pdf.text("Montant", cols[3], y + 4.5, { align: "right" });
    y += 6.5;
    pdf.setDrawColor(220, 220, 220);
    pdf.line(pad, y, pad + innerW, y);

    pdf.setTextColor(30, 30, 30);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    if (lignes.length === 0) {
      y += 6;
      pdf.setTextColor(130, 130, 130);
      pdf.text("Aucune ligne", cols[0], y);
      pdf.setTextColor(30, 30, 30);
      y += 3;
    }
    lignes.forEach((l) => {
      if (y > H - 40) {
        pdf.addPage();
        y = 20;
      }
      y += 5.6;
      pdf.text(l.libelle, cols[0], y, { maxWidth: 72 });
      pdf.text(l.base ? num(l.base) : DASH, cols[1], y, { align: "right" });
      pdf.text(pct(l.taux), cols[2], y, { align: "right" });
      pdf.text(num(l.montant), cols[3], y, { align: "right" });
    });

    y += 4;
    pdf.setFillColor(240, 240, 240);
    pdf.rect(pad, y, innerW, 7.5, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.text(totalLabel, cols[0], y + 5);
    pdf.text(money(total), cols[3], y + 5, { align: "right" });
    y += 12;
  };

  const gains = data.lignes.filter((l) => l.type === "gain");
  const retenues = data.lignes.filter((l) => l.type === "retenue");
  const charges = data.lignes.filter((l) => l.type === "charge_patronale");

  drawTable("GAINS", gains, data.total_gains, "TOTAL DES GAINS");
  drawTable("RETENUES", retenues, data.total_retenues, "TOTAL DES RETENUES");

  // ---------- Net à payer ----------
  if (y > H - 50) {
    pdf.addPage();
    y = 20;
  }
  pdf.setDrawColor(110, 26, 44);
  pdf.setLineWidth(0.8);
  pdf.setFillColor(255, 255, 255);
  pdf.rect(pad, y, innerW, 16, "FD");
  pdf.setLineWidth(0.2);
  pdf.setTextColor(110, 26, 44);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("NET À PAYER", pad + 4, y + 10.5);
  pdf.setFontSize(17);
  pdf.text(money(data.net_a_payer), pad + innerW - 4, y + 11, { align: "right" });
  y += 22;

  // ---------- Charges patronales ----------
  pdf.setTextColor(30, 30, 30);
  drawTable(
    "CHARGES PATRONALES",
    charges,
    data.total_charges_patronales,
    "TOTAL CHARGES PATRONALES",
    "à titre informatif — non déduit du salaire",
  );

  pdf.setFillColor(248, 248, 248);
  pdf.rect(pad, y - 6, innerW, 8, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(60, 60, 60);
  pdf.text("COÛT EMPLOYEUR", cols[0], y - 0.5);
  pdf.text(money(data.cout_employeur), cols[3], y - 0.5, { align: "right" });

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
