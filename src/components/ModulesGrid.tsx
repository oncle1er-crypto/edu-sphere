import {
  GraduationCap,
  Users,
  BookOpen,
  Library,
  ClipboardList,
  FileText,
  Calendar,
  DollarSign,
  MessageSquare,
  Settings,
  UtensilsCrossed,
  Bus,
  LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface ModuleItem {
  title: string;
  description: string;
  icon: LucideIcon;
  to: string;
  iconBg: string;
  iconColor: string;
}

const modules: ModuleItem[] = [
  { title: "ÉLÈVES", description: "Gérer les élèves", icon: GraduationCap, to: "/eleves", iconBg: "bg-accent/15", iconColor: "text-primary" },
  { title: "ENSEIGNANTS", description: "Gérer les enseignants", icon: Users, to: "/enseignants", iconBg: "bg-primary/10", iconColor: "text-primary" },
  { title: "CLASSES", description: "Gérer les classes", icon: BookOpen, to: "/classes", iconBg: "bg-accent/15", iconColor: "text-primary" },
  { title: "MATIÈRES", description: "Gérer les matières", icon: Library, to: "/matieres", iconBg: "bg-primary/10", iconColor: "text-primary" },
  { title: "NOTES", description: "Saisir et consulter les notes", icon: ClipboardList, to: "/examens", iconBg: "bg-accent/15", iconColor: "text-primary" },
  { title: "BULLETINS", description: "Générer les bulletins", icon: FileText, to: "/examens", iconBg: "bg-primary/10", iconColor: "text-primary" },
  { title: "EMPLOI DU TEMPS", description: "Gérer les emplois du temps", icon: Calendar, to: "/emploi-du-temps", iconBg: "bg-accent/15", iconColor: "text-primary" },
  { title: "PAIEMENTS", description: "Gérer les paiements", icon: DollarSign, to: "/finances", iconBg: "bg-primary/10", iconColor: "text-primary" },
  { title: "CANTINE", description: "Menus et abonnés", icon: UtensilsCrossed, to: "/cantine", iconBg: "bg-accent/15", iconColor: "text-primary" },
  { title: "TRANSPORT", description: "Lignes et passagers", icon: Bus, to: "/transport", iconBg: "bg-primary/10", iconColor: "text-primary" },
  { title: "COMMUNICATION", description: "Messages et notifications", icon: MessageSquare, to: "/communication", iconBg: "bg-accent/15", iconColor: "text-primary" },
  { title: "PARAMÈTRES", description: "Configuration système", icon: Settings, to: "/parametres", iconBg: "bg-primary/10", iconColor: "text-primary" },
];

export function ModulesGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
      {modules.map((m, i) => (
        <motion.div
          key={m.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.03 }}
        >
          <Link
            to={m.to}
            className="group block rounded-2xl bg-card border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-soft)] p-4 md:p-5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40"
          >
            <div className={`mx-auto mb-3 flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-xl ${m.iconBg} transition-transform duration-200 group-hover:scale-105`}>
              <m.icon className={`h-7 w-7 md:h-8 md:w-8 ${m.iconColor}`} strokeWidth={2.2} />
            </div>
            <h3 className="text-xs md:text-sm font-extrabold tracking-wide text-primary">
              {m.title}
            </h3>
            <p className="text-[11px] md:text-xs text-muted-foreground mt-1">
              {m.description}
            </p>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
