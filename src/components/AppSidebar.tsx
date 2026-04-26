import {
  LayoutDashboard,
  School,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  ClipboardList,
  DollarSign,
  Library,
  MessageSquare,
  BarChart3,
  Settings,
  Shield,
  UserCog,
  UtensilsCrossed,
  Bus,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
];

const managementItems = [
  { title: "Écoles", url: "/ecoles", icon: School },
  { title: "Élèves", url: "/eleves", icon: GraduationCap },
  { title: "Enseignants", url: "/enseignants", icon: Users },
  { title: "Classes", url: "/classes", icon: BookOpen },
];

const academicItems = [
  { title: "Emploi du temps", url: "/emploi-du-temps", icon: Calendar },
  { title: "Examens & Notes", url: "/examens", icon: ClipboardList },
];

const otherItems = [
  { title: "Paiements & Compta", url: "/finances", icon: DollarSign },
  { title: "Cantine", url: "/cantine", icon: UtensilsCrossed },
  { title: "Transport", url: "/transport", icon: Bus },
  { title: "Bibliothèque", url: "/bibliotheque", icon: Library },
  { title: "Communication", url: "/communication", icon: MessageSquare },
  { title: "Statistiques", url: "/statistiques", icon: BarChart3 },
];

const adminItems = [
  { title: "Utilisateurs", url: "/utilisateurs", icon: UserCog },
  { title: "Paramètres", url: "/parametres", icon: Settings },
];

type SidebarSection = {
  label: string;
  items: typeof mainItems;
};

const sections: SidebarSection[] = [
  { label: "Principal", items: mainItems },
  { label: "Gestion", items: managementItems },
  { label: "Académique", items: academicItems },
  { label: "Autres", items: otherItems },
  { label: "Administration", items: adminItems },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent">
            <Shield className="h-5 w-5 text-sidebar-accent-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold text-sidebar-primary">
                EduGest
              </span>
              <span className="text-xs text-sidebar-foreground/60">
                Gestion Scolaire
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest font-semibold">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const active = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                      >
                        <NavLink
                          to={item.url}
                          end
                          className="transition-colors duration-150"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="rounded-lg bg-sidebar-accent/50 p-3">
            <p className="text-xs text-sidebar-foreground/70">
              EduGest v1.0
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
