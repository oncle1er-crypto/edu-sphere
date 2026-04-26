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
            <Route path="/examens" element={<Placeholder title="Examens & Notes" />} />
            <Route path="/finances" element={<Placeholder title="Finances" />} />
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
