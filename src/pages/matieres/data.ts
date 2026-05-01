export type Subject = {
  id: string;
  code: string;
  nom: string;
  categorie: "Fondamentale" | "Scientifique" | "Littéraire" | "Religieuse" | "Artistique" | "Sportive" | "Optionnelle";
  cycles: ("Maternelle" | "Primaire" | "Collège" | "Lycée")[];
  coef: number;
  noteSur: 20 | 10;
  couleur: string;
  active: boolean;
};

export const SUBJECTS: Subject[] = [
  { id: "MAT-001", code: "MATH", nom: "Mathématiques", categorie: "Scientifique", cycles: ["Primaire", "Collège", "Lycée"], coef: 4, noteSur: 20, couleur: "bg-blue-500", active: true },
  { id: "MAT-002", code: "FR", nom: "Français", categorie: "Littéraire", cycles: ["Primaire", "Collège", "Lycée"], coef: 4, noteSur: 20, couleur: "bg-rose-500", active: true },
  { id: "MAT-003", code: "ANG", nom: "Anglais", categorie: "Littéraire", cycles: ["Primaire", "Collège", "Lycée"], coef: 3, noteSur: 20, couleur: "bg-indigo-500", active: true },
  { id: "MAT-004", code: "HG", nom: "Histoire-Géographie", categorie: "Littéraire", cycles: ["Collège", "Lycée"], coef: 3, noteSur: 20, couleur: "bg-amber-600", active: true },
  { id: "MAT-005", code: "SVT", nom: "Sciences de la Vie et de la Terre", categorie: "Scientifique", cycles: ["Collège", "Lycée"], coef: 3, noteSur: 20, couleur: "bg-emerald-500", active: true },
  { id: "MAT-006", code: "PC", nom: "Physique-Chimie", categorie: "Scientifique", cycles: ["Collège", "Lycée"], coef: 3, noteSur: 20, couleur: "bg-cyan-500", active: true },
  { id: "MAT-007", code: "PHILO", nom: "Philosophie", categorie: "Littéraire", cycles: ["Lycée"], coef: 2, noteSur: 20, couleur: "bg-purple-500", active: true },
  { id: "MAT-008", code: "EPS", nom: "Éducation Physique et Sportive", categorie: "Sportive", cycles: ["Primaire", "Collège", "Lycée"], coef: 1, noteSur: 20, couleur: "bg-orange-500", active: true },
  { id: "MAT-009", code: "REL", nom: "Éducation religieuse / Catéchèse", categorie: "Religieuse", cycles: ["Maternelle", "Primaire", "Collège", "Lycée"], coef: 1, noteSur: 20, couleur: "bg-primary", active: true },
  { id: "MAT-010", code: "ECM", nom: "Éducation civique et morale", categorie: "Fondamentale", cycles: ["Primaire", "Collège"], coef: 1, noteSur: 20, couleur: "bg-slate-500", active: true },
  { id: "MAT-011", code: "ART", nom: "Arts plastiques & Musique", categorie: "Artistique", cycles: ["Maternelle", "Primaire", "Collège"], coef: 1, noteSur: 20, couleur: "bg-pink-500", active: true },
  { id: "MAT-012", code: "INFO", nom: "Informatique / TICE", categorie: "Optionnelle", cycles: ["Collège", "Lycée"], coef: 2, noteSur: 20, couleur: "bg-teal-500", active: true },
  { id: "MAT-013", code: "ESP", nom: "Espagnol (LV2)", categorie: "Optionnelle", cycles: ["Collège", "Lycée"], coef: 2, noteSur: 20, couleur: "bg-yellow-600", active: true },
  { id: "MAT-014", code: "EVEIL", nom: "Activités d'éveil", categorie: "Fondamentale", cycles: ["Maternelle"], coef: 1, noteSur: 10, couleur: "bg-lime-500", active: true },
];
