import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Eleves from "@/pages/Eleves";
import Enseignants from "@/pages/Enseignants";
import Classes from "@/pages/Classes";
import Cantine from "@/pages/Cantine";
import Transport from "@/pages/Transport";
import Placeholder from "@/pages/Placeholder";
import SettingsLayout from "@/pages/parametres/SettingsLayout";
import FinanceLayout from "@/pages/finances/FinanceLayout";
import FinanceDashboard from "@/pages/finances/sections/FinanceDashboard";
import Invoices from "@/pages/finances/sections/Invoices";
import Payments from "@/pages/finances/sections/Payments";
import Receipts from "@/pages/finances/sections/Receipts";
import Unpaid from "@/pages/finances/sections/Unpaid";
import Expenses from "@/pages/finances/sections/Expenses";
import Payroll from "@/pages/finances/sections/Payroll";
import Suppliers from "@/pages/finances/sections/Suppliers";
import Budget from "@/pages/finances/sections/Budget";
import Treasury from "@/pages/finances/sections/Treasury";
import Ledger from "@/pages/finances/sections/Ledger";
import Reports from "@/pages/finances/sections/Reports";
import Tax from "@/pages/finances/sections/Tax";
import FinanceConfig from "@/pages/finances/sections/FinanceConfig";
import SchoolProfile from "@/pages/parametres/sections/SchoolProfile";
import AcademicSettings from "@/pages/parametres/sections/AcademicSettings";
import UsersRoles from "@/pages/parametres/sections/UsersRoles";
import FinanceSettings from "@/pages/parametres/sections/FinanceSettings";
import DocumentTemplates from "@/pages/parametres/sections/DocumentTemplates";
import NotificationSettings from "@/pages/parametres/sections/NotificationSettings";
import AppearanceSettings from "@/pages/parametres/sections/AppearanceSettings";
import LocalizationSettings from "@/pages/parametres/sections/LocalizationSettings";
import BackupSettings from "@/pages/parametres/sections/BackupSettings";
import UserProfile from "@/pages/parametres/sections/UserProfile";
import SecuritySettings from "@/pages/parametres/sections/SecuritySettings";
import IntegrationsSettings from "@/pages/parametres/sections/IntegrationsSettings";
import ActivityLogs from "@/pages/parametres/sections/ActivityLogs";
import SupportSettings from "@/pages/parametres/sections/SupportSettings";
import AdvancedSettings from "@/pages/parametres/sections/AdvancedSettings";
import ExamsLayout from "@/pages/examens/ExamsLayout";
import ExamsDashboard from "@/pages/examens/sections/ExamsDashboard";
import ExamsCalendar from "@/pages/examens/sections/ExamsCalendar";
import Evaluations from "@/pages/examens/sections/Evaluations";
import Compositions from "@/pages/examens/sections/Compositions";
import GradeEntry from "@/pages/examens/sections/GradeEntry";
import Bulletins from "@/pages/examens/sections/Bulletins";
import Averages from "@/pages/examens/sections/Averages";
import ClassCouncils from "@/pages/examens/sections/ClassCouncils";
import ExamsStatistics from "@/pages/examens/sections/Statistics";
import ExamsReports from "@/pages/examens/sections/Reports";
import Validation from "@/pages/examens/sections/Validation";
import ExamsConfig from "@/pages/examens/sections/ExamsConfig";
import GradingScales from "@/pages/examens/sections/GradingScales";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/statistiques" element={<Dashboard />} />
            <Route path="/eleves" element={<Eleves />} />
            <Route path="/enseignants" element={<Enseignants />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/ecoles" element={<Placeholder title="Gestion des Écoles" />} />
            <Route path="/emploi-du-temps" element={<Placeholder title="Emploi du Temps" />} />
            <Route path="/examens" element={<ExamsLayout />}>
              <Route path="tableau" element={<ExamsDashboard />} />
              <Route path="calendrier" element={<ExamsCalendar />} />
              <Route path="evaluations" element={<Evaluations />} />
              <Route path="compositions" element={<Compositions />} />
              <Route path="saisie-notes" element={<GradeEntry />} />
              <Route path="bulletins" element={<Bulletins />} />
              <Route path="moyennes" element={<Averages />} />
              <Route path="conseils" element={<ClassCouncils />} />
              <Route path="statistiques" element={<ExamsStatistics />} />
              <Route path="rapports" element={<ExamsReports />} />
              <Route path="baremes" element={<GradingScales />} />
              <Route path="validation" element={<Validation />} />
              <Route path="configuration" element={<ExamsConfig />} />
            </Route>
            <Route path="/finances" element={<FinanceLayout />}>
              <Route path="tableau" element={<FinanceDashboard />} />
              <Route path="factures" element={<Invoices />} />
              <Route path="paiements" element={<Payments />} />
              <Route path="recus" element={<Receipts />} />
              <Route path="impayes" element={<Unpaid />} />
              <Route path="depenses" element={<Expenses />} />
              <Route path="salaires" element={<Payroll />} />
              <Route path="fournisseurs" element={<Suppliers />} />
              <Route path="budget" element={<Budget />} />
              <Route path="tresorerie" element={<Treasury />} />
              <Route path="grand-livre" element={<Ledger />} />
              <Route path="rapports" element={<Reports />} />
              <Route path="fiscalite" element={<Tax />} />
              <Route path="configuration" element={<FinanceConfig />} />
            </Route>
            <Route path="/cantine" element={<Cantine />} />
            <Route path="/transport" element={<Transport />} />
            <Route path="/bibliotheque" element={<Placeholder title="Bibliothèque" />} />
            <Route path="/communication" element={<Placeholder title="Communication" />} />
            
            <Route path="/utilisateurs" element={<Placeholder title="Utilisateurs" />} />
            <Route path="/parametres" element={<SettingsLayout />}>
              <Route path="ecole" element={<SchoolProfile />} />
              <Route path="academique" element={<AcademicSettings />} />
              <Route path="utilisateurs" element={<UsersRoles />} />
              <Route path="finances" element={<FinanceSettings />} />
              <Route path="documents" element={<DocumentTemplates />} />
              <Route path="notifications" element={<NotificationSettings />} />
              <Route path="apparence" element={<AppearanceSettings />} />
              <Route path="localisation" element={<LocalizationSettings />} />
              <Route path="sauvegarde" element={<BackupSettings />} />
              <Route path="profil" element={<UserProfile />} />
              <Route path="securite" element={<SecuritySettings />} />
              <Route path="integrations" element={<IntegrationsSettings />} />
              <Route path="logs" element={<ActivityLogs />} />
              <Route path="support" element={<SupportSettings />} />
              <Route path="avance" element={<AdvancedSettings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
