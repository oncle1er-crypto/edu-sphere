import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import StudentsLayout from "@/pages/eleves/StudentsLayout";
import StudentsDashboard from "@/pages/eleves/sections/StudentsDashboard";
import StudentsList from "@/pages/eleves/sections/StudentsList";
import StudentsRegistration from "@/pages/eleves/sections/StudentsRegistration";
import StudentsReregistration from "@/pages/eleves/sections/StudentsReregistration";
import StudentsAssignment from "@/pages/eleves/sections/StudentsAssignment";
import StudentsAttendance from "@/pages/eleves/sections/StudentsAttendance";
import StudentsHealth from "@/pages/eleves/sections/StudentsHealth";
import StudentsDiscipline from "@/pages/eleves/sections/StudentsDiscipline";
import StudentsDocuments from "@/pages/eleves/sections/StudentsDocuments";
import StudentsAlumni from "@/pages/eleves/sections/StudentsAlumni";
import StudentsConfig from "@/pages/eleves/sections/StudentsConfig";
import StaffLayout from "@/pages/enseignants/StaffLayout";
import StaffDashboard from "@/pages/enseignants/sections/StaffDashboard";
import StaffList from "@/pages/enseignants/sections/StaffList";
import StaffRecruitment from "@/pages/enseignants/sections/StaffRecruitment";
import StaffContracts from "@/pages/enseignants/sections/StaffContracts";
import StaffPayroll from "@/pages/enseignants/sections/StaffPayroll";
import StaffSubjects from "@/pages/enseignants/sections/StaffSubjects";
import StaffSchedule from "@/pages/enseignants/sections/StaffSchedule";
import StaffTraining from "@/pages/enseignants/sections/StaffTraining";
import StaffEvaluations from "@/pages/enseignants/sections/StaffEvaluations";
import StaffAdmin from "@/pages/enseignants/sections/StaffAdmin";
import StaffConfig from "@/pages/enseignants/sections/StaffConfig";
import ClassesLayout from "@/pages/classes/ClassesLayout";
import ClassesDashboard from "@/pages/classes/sections/ClassesDashboard";
import ClassesList from "@/pages/classes/sections/ClassesList";
import ClassesCycles from "@/pages/classes/sections/ClassesCycles";
import ClassesRooms from "@/pages/classes/sections/ClassesRooms";
import ClassesGroups from "@/pages/classes/sections/ClassesGroups";
import ClassesEffectifs from "@/pages/classes/sections/ClassesEffectifs";
import ClassesSchedule from "@/pages/classes/sections/ClassesSchedule";
import ClassesTransfers from "@/pages/classes/sections/ClassesTransfers";
import ClassesReports from "@/pages/classes/sections/ClassesReports";
import ClassesConfig from "@/pages/classes/sections/ClassesConfig";
import CanteenLayout from "@/pages/cantine/CanteenLayout";
import CanteenDashboard from "@/pages/cantine/sections/CanteenDashboard";
import CanteenMenus from "@/pages/cantine/sections/CanteenMenus";
import CanteenPlanning from "@/pages/cantine/sections/CanteenPlanning";
import CanteenDiets from "@/pages/cantine/sections/CanteenDiets";
import CanteenTeam from "@/pages/cantine/sections/CanteenTeam";
import CanteenSubscribers from "@/pages/cantine/sections/CanteenSubscribers";
import CanteenBilling from "@/pages/cantine/sections/CanteenBilling";
import CanteenStock from "@/pages/cantine/sections/CanteenStock";
import CanteenIncidents from "@/pages/cantine/sections/CanteenIncidents";
import CanteenStats from "@/pages/cantine/sections/CanteenStats";
import CanteenReports from "@/pages/cantine/sections/CanteenReports";
import CanteenConfig from "@/pages/cantine/sections/CanteenConfig";
import TransportLayout from "@/pages/transport/TransportLayout";
import TransportDashboard from "@/pages/transport/sections/TransportDashboard";
import TransportLines from "@/pages/transport/sections/TransportLines";
import TransportVehicles from "@/pages/transport/sections/TransportVehicles";
import TransportDrivers from "@/pages/transport/sections/TransportDrivers";
import TransportMaintenance from "@/pages/transport/sections/TransportMaintenance";
import TransportFuel from "@/pages/transport/sections/TransportFuel";
import TransportSubscribers from "@/pages/transport/sections/TransportSubscribers";
import TransportBilling from "@/pages/transport/sections/TransportBilling";
import TransportIncidents from "@/pages/transport/sections/TransportIncidents";
import TransportAlerts from "@/pages/transport/sections/TransportAlerts";
import TransportStats from "@/pages/transport/sections/TransportStats";
import TransportReports from "@/pages/transport/sections/TransportReports";
import TransportConfig from "@/pages/transport/sections/TransportConfig";
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
import LibraryLayout from "@/pages/bibliotheque/LibraryLayout";
import LibraryDashboard from "@/pages/bibliotheque/sections/LibraryDashboard";
import LibraryCatalog from "@/pages/bibliotheque/sections/LibraryCatalog";
import LibrarySearch from "@/pages/bibliotheque/sections/LibrarySearch";
import LibraryCategories from "@/pages/bibliotheque/sections/LibraryCategories";
import LibraryAcquisitions from "@/pages/bibliotheque/sections/LibraryAcquisitions";
import LibraryLoans from "@/pages/bibliotheque/sections/LibraryLoans";
import LibraryOverdue from "@/pages/bibliotheque/sections/LibraryOverdue";
import LibraryReaders from "@/pages/bibliotheque/sections/LibraryReaders";
import LibraryStats from "@/pages/bibliotheque/sections/LibraryStats";
import LibraryReports from "@/pages/bibliotheque/sections/LibraryReports";
import LibraryConfig from "@/pages/bibliotheque/sections/LibraryConfig";
import CommunicationLayout from "@/pages/communication/CommunicationLayout";
import CommunicationDashboard from "@/pages/communication/sections/CommunicationDashboard";
import InboxSection from "@/pages/communication/sections/Inbox";
import DirectMessages from "@/pages/communication/sections/DirectMessages";
import EmailCampaigns from "@/pages/communication/sections/EmailCampaigns";
import SmsCampaigns from "@/pages/communication/sections/SmsCampaigns";
import PushNotifications from "@/pages/communication/sections/PushNotifications";
import Announcements from "@/pages/communication/sections/Announcements";
import MessageTemplates from "@/pages/communication/sections/MessageTemplates";
import MailingLists from "@/pages/communication/sections/MailingLists";
import MediaLibrary from "@/pages/communication/sections/MediaLibrary";
import SendHistory from "@/pages/communication/sections/SendHistory";
import CommunicationConfig from "@/pages/communication/sections/CommunicationConfig";
import AttendanceLayout from "@/pages/presences/AttendanceLayout";
import AttendanceDashboard from "@/pages/presences/sections/AttendanceDashboard";
import DailyCall from "@/pages/presences/sections/DailyCall";
import StudentAbsences from "@/pages/presences/sections/StudentAbsences";
import Tardiness from "@/pages/presences/sections/Tardiness";
import Justifications from "@/pages/presences/sections/Justifications";
import AttendanceSanctions from "@/pages/presences/sections/Sanctions";
import StaffAttendance from "@/pages/presences/sections/StaffAttendance";
import QrCheckIn from "@/pages/presences/sections/QrCheckIn";
import ParentNotifications from "@/pages/presences/sections/ParentNotifications";
import AttendanceStats from "@/pages/presences/sections/AttendanceStats";
import AttendanceReports from "@/pages/presences/sections/AttendanceReports";
import AttendanceConfig from "@/pages/presences/sections/AttendanceConfig";
import TimetableLayout from "@/pages/emploi/TimetableLayout";
import TimetableDashboard from "@/pages/emploi/sections/TimetableDashboard";
import WeeklyView from "@/pages/emploi/sections/WeeklyView";
import AutoGenerate from "@/pages/emploi/sections/AutoGenerate";
import SubjectsVolumes from "@/pages/emploi/sections/SubjectsVolumes";
import TeacherAvailability from "@/pages/emploi/sections/TeacherAvailability";
import RoomAssignment from "@/pages/emploi/sections/RoomAssignment";
import Substitutions from "@/pages/emploi/sections/Substitutions";
import Conflicts from "@/pages/emploi/sections/Conflicts";
import TimetableNotifications from "@/pages/emploi/sections/Notifications";
import Printing from "@/pages/emploi/sections/Printing";
import TimetableConfig from "@/pages/emploi/sections/TimetableConfig";
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
            <Route path="/eleves" element={<StudentsLayout />}>
              <Route path="tableau" element={<StudentsDashboard />} />
              <Route path="liste" element={<StudentsList />} />
              <Route path="inscription" element={<StudentsRegistration />} />
              <Route path="reinscription" element={<StudentsReregistration />} />
              <Route path="affectation" element={<StudentsAssignment />} />
              <Route path="presences" element={<StudentsAttendance />} />
              <Route path="sante" element={<StudentsHealth />} />
              <Route path="discipline" element={<StudentsDiscipline />} />
              <Route path="documents" element={<StudentsDocuments />} />
              <Route path="anciens" element={<StudentsAlumni />} />
              <Route path="configuration" element={<StudentsConfig />} />
            </Route>
            <Route path="/enseignants" element={<StaffLayout />}>
              <Route path="tableau" element={<StaffDashboard />} />
              <Route path="liste" element={<StaffList />} />
              <Route path="recrutement" element={<StaffRecruitment />} />
              <Route path="contrats" element={<StaffContracts />} />
              <Route path="paie" element={<StaffPayroll />} />
              <Route path="matieres" element={<StaffSubjects />} />
              <Route path="emploi" element={<StaffSchedule />} />
              <Route path="formations" element={<StaffTraining />} />
              <Route path="evaluations" element={<StaffEvaluations />} />
              <Route path="personnel" element={<StaffAdmin />} />
              <Route path="configuration" element={<StaffConfig />} />
            </Route>
            <Route path="/classes" element={<ClassesLayout />}>
              <Route path="tableau" element={<ClassesDashboard />} />
              <Route path="liste" element={<ClassesList />} />
              <Route path="cycles" element={<ClassesCycles />} />
              <Route path="salles" element={<ClassesRooms />} />
              <Route path="groupes" element={<ClassesGroups />} />
              <Route path="effectifs" element={<ClassesEffectifs />} />
              <Route path="emploi" element={<ClassesSchedule />} />
              <Route path="transferts" element={<ClassesTransfers />} />
              <Route path="rapports" element={<ClassesReports />} />
              <Route path="configuration" element={<ClassesConfig />} />
            </Route>
            <Route path="/ecoles" element={<Placeholder title="Gestion des Écoles" />} />
            <Route path="/emploi-du-temps" element={<TimetableLayout />}>
              <Route path="tableau" element={<TimetableDashboard />} />
              <Route path="hebdomadaire" element={<WeeklyView />} />
              <Route path="generation" element={<AutoGenerate />} />
              <Route path="matieres" element={<SubjectsVolumes />} />
              <Route path="enseignants" element={<TeacherAvailability />} />
              <Route path="salles" element={<RoomAssignment />} />
              <Route path="remplacements" element={<Substitutions />} />
              <Route path="conflits" element={<Conflicts />} />
              <Route path="notifications" element={<TimetableNotifications />} />
              <Route path="impression" element={<Printing />} />
              <Route path="configuration" element={<TimetableConfig />} />
            </Route>
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
            <Route path="/presences" element={<AttendanceLayout />}>
              <Route path="tableau" element={<AttendanceDashboard />} />
              <Route path="appel" element={<DailyCall />} />
              <Route path="absences" element={<StudentAbsences />} />
              <Route path="retards" element={<Tardiness />} />
              <Route path="justificatifs" element={<Justifications />} />
              <Route path="sanctions" element={<AttendanceSanctions />} />
              <Route path="personnel" element={<StaffAttendance />} />
              <Route path="pointage" element={<QrCheckIn />} />
              <Route path="notifications" element={<ParentNotifications />} />
              <Route path="statistiques" element={<AttendanceStats />} />
              <Route path="rapports" element={<AttendanceReports />} />
              <Route path="configuration" element={<AttendanceConfig />} />
            </Route>
            <Route path="/cantine" element={<CanteenLayout />}>
              <Route path="tableau" element={<CanteenDashboard />} />
              <Route path="menus" element={<CanteenMenus />} />
              <Route path="planning" element={<CanteenPlanning />} />
              <Route path="regimes" element={<CanteenDiets />} />
              <Route path="cuisine" element={<CanteenTeam />} />
              <Route path="abonnes" element={<CanteenSubscribers />} />
              <Route path="facturation" element={<CanteenBilling />} />
              <Route path="stock" element={<CanteenStock />} />
              <Route path="incidents" element={<CanteenIncidents />} />
              <Route path="statistiques" element={<CanteenStats />} />
              <Route path="rapports" element={<CanteenReports />} />
              <Route path="configuration" element={<CanteenConfig />} />
            </Route>
            <Route path="/transport" element={<TransportLayout />}>
              <Route path="tableau" element={<TransportDashboard />} />
              <Route path="lignes" element={<TransportLines />} />
              <Route path="vehicules" element={<TransportVehicles />} />
              <Route path="chauffeurs" element={<TransportDrivers />} />
              <Route path="maintenance" element={<TransportMaintenance />} />
              <Route path="carburant" element={<TransportFuel />} />
              <Route path="abonnes" element={<TransportSubscribers />} />
              <Route path="facturation" element={<TransportBilling />} />
              <Route path="incidents" element={<TransportIncidents />} />
              <Route path="alertes" element={<TransportAlerts />} />
              <Route path="statistiques" element={<TransportStats />} />
              <Route path="rapports" element={<TransportReports />} />
              <Route path="configuration" element={<TransportConfig />} />
            </Route>
            <Route path="/bibliotheque" element={<LibraryLayout />}>
              <Route path="tableau" element={<LibraryDashboard />} />
              <Route path="catalogue" element={<LibraryCatalog />} />
              <Route path="recherche" element={<LibrarySearch />} />
              <Route path="categories" element={<LibraryCategories />} />
              <Route path="acquisitions" element={<LibraryAcquisitions />} />
              <Route path="emprunts" element={<LibraryLoans />} />
              <Route path="retards" element={<LibraryOverdue />} />
              <Route path="lecteurs" element={<LibraryReaders />} />
              <Route path="statistiques" element={<LibraryStats />} />
              <Route path="rapports" element={<LibraryReports />} />
              <Route path="configuration" element={<LibraryConfig />} />
            </Route>
            <Route path="/communication" element={<CommunicationLayout />}>
              <Route path="tableau" element={<CommunicationDashboard />} />
              <Route path="boite" element={<InboxSection />} />
              <Route path="messages" element={<DirectMessages />} />
              <Route path="emails" element={<EmailCampaigns />} />
              <Route path="sms" element={<SmsCampaigns />} />
              <Route path="push" element={<PushNotifications />} />
              <Route path="annonces" element={<Announcements />} />
              <Route path="modeles" element={<MessageTemplates />} />
              <Route path="groupes" element={<MailingLists />} />
              <Route path="medias" element={<MediaLibrary />} />
              <Route path="envois" element={<SendHistory />} />
              <Route path="configuration" element={<CommunicationConfig />} />
            </Route>
            
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
