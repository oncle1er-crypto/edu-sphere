import { Suspense } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { RequirePerm } from "@/components/auth/RequirePerm";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppLoader, NavigationProgress } from "@/components/loading";
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const AcceptInvitationPage = lazy(() => import("@/pages/auth/AcceptInvitationPage"));
const FirstPasswordPage = lazy(() => import("@/pages/auth/FirstPasswordPage"));

const Home = lazy(() => import("@/pages/Home"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const StudentsLayout = lazy(() => import("@/pages/eleves/StudentsLayout"));
const StudentsDashboard = lazy(() => import("@/pages/eleves/sections/StudentsDashboard"));
const StudentsList = lazy(() => import("@/pages/eleves/sections/StudentsList"));
const StudentsRegistration = lazy(() => import("@/pages/eleves/sections/StudentsRegistration"));
const StudentsReregistration = lazy(() => import("@/pages/eleves/sections/StudentsReregistration"));
const StudentsAssignment = lazy(() => import("@/pages/eleves/sections/StudentsAssignment"));
const StudentsAttendance = lazy(() => import("@/pages/eleves/sections/StudentsAttendance"));
const StudentsHealth = lazy(() => import("@/pages/eleves/sections/StudentsHealth"));
const StudentsDiscipline = lazy(() => import("@/pages/eleves/sections/StudentsDiscipline"));
const StudentsDocuments = lazy(() => import("@/pages/eleves/sections/StudentsDocuments"));
const StudentsAttestations = lazy(() => import("@/pages/eleves/sections/StudentsAttestations"));
const StudentsAlumni = lazy(() => import("@/pages/eleves/sections/StudentsAlumni"));
const StudentsConfig = lazy(() => import("@/pages/eleves/sections/StudentsConfig"));
const StudentsSigfne = lazy(() => import("@/pages/eleves/sections/StudentsSigfne"));
const StaffLayout = lazy(() => import("@/pages/enseignants/StaffLayout"));
const StaffDashboard = lazy(() => import("@/pages/enseignants/sections/StaffDashboard"));
const StaffList = lazy(() => import("@/pages/enseignants/sections/StaffList"));
const StaffRecruitment = lazy(() => import("@/pages/enseignants/sections/StaffRecruitment"));
const StaffContracts = lazy(() => import("@/pages/enseignants/sections/StaffContracts"));
const StaffPayroll = lazy(() => import("@/pages/enseignants/sections/StaffPayroll"));
const StaffSubjects = lazy(() => import("@/pages/enseignants/sections/StaffSubjects"));
const StaffSchedule = lazy(() => import("@/pages/enseignants/sections/StaffSchedule"));
const StaffTraining = lazy(() => import("@/pages/enseignants/sections/StaffTraining"));
const StaffEvaluations = lazy(() => import("@/pages/enseignants/sections/StaffEvaluations"));
const StaffAdmin = lazy(() => import("@/pages/enseignants/sections/StaffAdmin"));
const StaffConfig = lazy(() => import("@/pages/enseignants/sections/StaffConfig"));
const ClassesLayout = lazy(() => import("@/pages/classes/ClassesLayout"));
const ClassesDashboard = lazy(() => import("@/pages/classes/sections/ClassesDashboard"));
const ClassesList = lazy(() => import("@/pages/classes/sections/ClassesList"));
const ClassesCycles = lazy(() => import("@/pages/classes/sections/ClassesCycles"));
const ClassesRooms = lazy(() => import("@/pages/classes/sections/ClassesRooms"));
const ClassesGroups = lazy(() => import("@/pages/classes/sections/ClassesGroups"));
const ClassesEffectifs = lazy(() => import("@/pages/classes/sections/ClassesEffectifs"));
const ClassesSchedule = lazy(() => import("@/pages/classes/sections/ClassesSchedule"));
const ClassesTransfers = lazy(() => import("@/pages/classes/sections/ClassesTransfers"));
const ClassesReports = lazy(() => import("@/pages/classes/sections/ClassesReports"));
const ClassesConfig = lazy(() => import("@/pages/classes/sections/ClassesConfig"));
const CanteenLayout = lazy(() => import("@/pages/cantine/CanteenLayout"));
const CanteenDashboard = lazy(() => import("@/pages/cantine/sections/CanteenDashboard"));
const CanteenMenus = lazy(() => import("@/pages/cantine/sections/CanteenMenus"));
const CanteenPlanning = lazy(() => import("@/pages/cantine/sections/CanteenPlanning"));
const CanteenDiets = lazy(() => import("@/pages/cantine/sections/CanteenDiets"));
const CanteenTeam = lazy(() => import("@/pages/cantine/sections/CanteenTeam"));
const CanteenSubscribers = lazy(() => import("@/pages/cantine/sections/CanteenSubscribers"));
const CanteenBilling = lazy(() => import("@/pages/cantine/sections/CanteenBilling"));
const CanteenStock = lazy(() => import("@/pages/cantine/sections/CanteenStock"));
const CanteenIncidents = lazy(() => import("@/pages/cantine/sections/CanteenIncidents"));
const CanteenStats = lazy(() => import("@/pages/cantine/sections/CanteenStats"));
const CanteenReports = lazy(() => import("@/pages/cantine/sections/CanteenReports"));
const CanteenConfig = lazy(() => import("@/pages/cantine/sections/CanteenConfig"));
const TransportLayout = lazy(() => import("@/pages/transport/TransportLayout"));
const TransportDashboard = lazy(() => import("@/pages/transport/sections/TransportDashboard"));
const TransportLines = lazy(() => import("@/pages/transport/sections/TransportLines"));
const TransportVehicles = lazy(() => import("@/pages/transport/sections/TransportVehicles"));
const TransportDrivers = lazy(() => import("@/pages/transport/sections/TransportDrivers"));
const TransportMaintenance = lazy(() => import("@/pages/transport/sections/TransportMaintenance"));
const TransportFuel = lazy(() => import("@/pages/transport/sections/TransportFuel"));
const TransportSubscribers = lazy(() => import("@/pages/transport/sections/TransportSubscribers"));
const TransportBilling = lazy(() => import("@/pages/transport/sections/TransportBilling"));
const TransportIncidents = lazy(() => import("@/pages/transport/sections/TransportIncidents"));
const TransportAlerts = lazy(() => import("@/pages/transport/sections/TransportAlerts"));
const TransportStats = lazy(() => import("@/pages/transport/sections/TransportStats"));
const TransportReports = lazy(() => import("@/pages/transport/sections/TransportReports"));
const TransportConfig = lazy(() => import("@/pages/transport/sections/TransportConfig"));
const Placeholder = lazy(() => import("@/pages/Placeholder"));
const ServicesPonctuelsLayout = lazy(() => import("@/pages/services-ponctuels/ServicesPonctuelsLayout"));
const SpDashboard = lazy(() => import("@/pages/services-ponctuels/sections/SpDashboard"));
const SpPaiements = lazy(() => import("@/pages/services-ponctuels/sections/SpPaiements"));
const SpTestsEntree = lazy(() => import("@/pages/services-ponctuels/sections/SpTestsEntree"));
const SpVentesTenues = lazy(() => import("@/pages/services-ponctuels/sections/SpVentesTenues"));
const SpCatalogue = lazy(() => import("@/pages/services-ponctuels/sections/SpCatalogue"));
const SpRapports = lazy(() => import("@/pages/services-ponctuels/sections/SpRapports"));
const SpPointCaisse = lazy(() => import("@/pages/services-ponctuels/sections/SpPointCaisse"));
const SpParametres = lazy(() => import("@/pages/services-ponctuels/sections/SpParametres"));
const SettingsLayout = lazy(() => import("@/pages/parametres/SettingsLayout"));
const FinanceLayout = lazy(() => import("@/pages/finances/FinanceLayout"));
const FinanceDashboard = lazy(() => import("@/pages/finances/sections/FinanceDashboard"));
const Invoices = lazy(() => import("@/pages/finances/sections/Invoices"));
const Payments = lazy(() => import("@/pages/finances/sections/Payments"));
const StudentSummary = lazy(() => import("@/pages/finances/sections/StudentSummary"));
const ClassSummary = lazy(() => import("@/pages/finances/sections/ClassSummary"));
const Receipts = lazy(() => import("@/pages/finances/sections/Receipts"));
const Unpaid = lazy(() => import("@/pages/finances/sections/Unpaid"));
const Expenses = lazy(() => import("@/pages/finances/sections/Expenses"));
const Payroll = lazy(() => import("@/pages/finances/sections/Payroll"));
const Suppliers = lazy(() => import("@/pages/finances/sections/Suppliers"));
const Budget = lazy(() => import("@/pages/finances/sections/Budget"));
const Treasury = lazy(() => import("@/pages/finances/sections/Treasury"));
const Ledger = lazy(() => import("@/pages/finances/sections/Ledger"));
const Reports = lazy(() => import("@/pages/finances/sections/Reports"));
const Tax = lazy(() => import("@/pages/finances/sections/Tax"));
const FinanceConfig = lazy(() => import("@/pages/finances/sections/FinanceConfig"));
const SchoolProfile = lazy(() => import("@/pages/parametres/sections/SchoolProfile"));
const AcademicSettings = lazy(() => import("@/pages/parametres/sections/AcademicSettings"));
const UsersRoles = lazy(() => import("@/pages/parametres/sections/UsersRoles"));
const FinanceSettings = lazy(() => import("@/pages/parametres/sections/FinanceSettings"));
const DocumentTemplates = lazy(() => import("@/pages/parametres/sections/DocumentTemplates"));
const NotificationSettings = lazy(() => import("@/pages/parametres/sections/NotificationSettings"));
const AppearanceSettings = lazy(() => import("@/pages/parametres/sections/AppearanceSettings"));
const LocalizationSettings = lazy(() => import("@/pages/parametres/sections/LocalizationSettings"));
const BackupSettings = lazy(() => import("@/pages/parametres/sections/BackupSettings"));
const UserProfile = lazy(() => import("@/pages/parametres/sections/UserProfile"));
const SecuritySettings = lazy(() => import("@/pages/parametres/sections/SecuritySettings"));
const MfaSettings = lazy(() => import("@/pages/parametres/sections/MfaSettings"));
const SecurityHistory = lazy(() => import("@/pages/parametres/sections/SecurityHistory"));
const TrustedDevices = lazy(() => import("@/pages/parametres/sections/TrustedDevices"));
import MfaGuard from "@/components/security/MfaGuard";
const IntegrationsSettings = lazy(() => import("@/pages/parametres/sections/IntegrationsSettings"));
const ActivityLogs = lazy(() => import("@/pages/parametres/sections/ActivityLogs"));
const SupportSettings = lazy(() => import("@/pages/parametres/sections/SupportSettings"));
const AdvancedSettings = lazy(() => import("@/pages/parametres/sections/AdvancedSettings"));
const SmsSettings = lazy(() => import("@/pages/parametres/sections/SmsSettings"));
const ExamsLayout = lazy(() => import("@/pages/examens/ExamsLayout"));
const ExamsDashboard = lazy(() => import("@/pages/examens/sections/ExamsDashboard"));
const ExamsCalendar = lazy(() => import("@/pages/examens/sections/ExamsCalendar"));
const Evaluations = lazy(() => import("@/pages/examens/sections/Evaluations"));
const Compositions = lazy(() => import("@/pages/examens/sections/Compositions"));
const GradeEntry = lazy(() => import("@/pages/examens/sections/GradeEntry"));
const QuickGradeEntry = lazy(() => import("@/pages/examens/sections/QuickGradeEntry"));
const Bulletins = lazy(() => import("@/pages/examens/sections/Bulletins"));
const Averages = lazy(() => import("@/pages/examens/sections/Averages"));
const ClassCouncils = lazy(() => import("@/pages/examens/sections/ClassCouncils"));
const ExamsStatistics = lazy(() => import("@/pages/examens/sections/Statistics"));
const ExamsReports = lazy(() => import("@/pages/examens/sections/Reports"));
const Validation = lazy(() => import("@/pages/examens/sections/Validation"));
const ExamsConfig = lazy(() => import("@/pages/examens/sections/ExamsConfig"));
const GradingScales = lazy(() => import("@/pages/examens/sections/GradingScales"));
const FinAnnee = lazy(() => import("@/pages/examens/sections/FinAnnee"));
const LibraryLayout = lazy(() => import("@/pages/bibliotheque/LibraryLayout"));
const LibraryDashboard = lazy(() => import("@/pages/bibliotheque/sections/LibraryDashboard"));
const LibraryCatalog = lazy(() => import("@/pages/bibliotheque/sections/LibraryCatalog"));
const LibrarySearch = lazy(() => import("@/pages/bibliotheque/sections/LibrarySearch"));
const LibraryCategories = lazy(() => import("@/pages/bibliotheque/sections/LibraryCategories"));
const LibraryAcquisitions = lazy(() => import("@/pages/bibliotheque/sections/LibraryAcquisitions"));
const LibraryLoans = lazy(() => import("@/pages/bibliotheque/sections/LibraryLoans"));
const LibraryOverdue = lazy(() => import("@/pages/bibliotheque/sections/LibraryOverdue"));
const LibraryReaders = lazy(() => import("@/pages/bibliotheque/sections/LibraryReaders"));
const LibraryStats = lazy(() => import("@/pages/bibliotheque/sections/LibraryStats"));
const LibraryReports = lazy(() => import("@/pages/bibliotheque/sections/LibraryReports"));
const LibraryConfig = lazy(() => import("@/pages/bibliotheque/sections/LibraryConfig"));
const CommunicationLayout = lazy(() => import("@/pages/communication/CommunicationLayout"));
const CommunicationDashboard = lazy(() => import("@/pages/communication/sections/CommunicationDashboard"));
const InboxSection = lazy(() => import("@/pages/communication/sections/Inbox"));
const DirectMessages = lazy(() => import("@/pages/communication/sections/DirectMessages"));
const EmailCampaigns = lazy(() => import("@/pages/communication/sections/EmailCampaigns"));
const SmsCampaigns = lazy(() => import("@/pages/communication/sections/SmsCampaigns"));
const PushNotifications = lazy(() => import("@/pages/communication/sections/PushNotifications"));
const Announcements = lazy(() => import("@/pages/communication/sections/Announcements"));
const MessageTemplates = lazy(() => import("@/pages/communication/sections/MessageTemplates"));
const MailingLists = lazy(() => import("@/pages/communication/sections/MailingLists"));
const MediaLibrary = lazy(() => import("@/pages/communication/sections/MediaLibrary"));
const SendHistory = lazy(() => import("@/pages/communication/sections/SendHistory"));
const CommunicationConfig = lazy(() => import("@/pages/communication/sections/CommunicationConfig"));
const AttendanceLayout = lazy(() => import("@/pages/presences/AttendanceLayout"));
const AttendanceDashboard = lazy(() => import("@/pages/presences/sections/AttendanceDashboard"));
const DailyCall = lazy(() => import("@/pages/presences/sections/DailyCall"));
const StudentAbsences = lazy(() => import("@/pages/presences/sections/StudentAbsences"));
const Tardiness = lazy(() => import("@/pages/presences/sections/Tardiness"));
const Justifications = lazy(() => import("@/pages/presences/sections/Justifications"));
const AttendanceSanctions = lazy(() => import("@/pages/presences/sections/Sanctions"));
const StaffAttendance = lazy(() => import("@/pages/presences/sections/StaffAttendance"));
const QrCheckIn = lazy(() => import("@/pages/presences/sections/QrCheckIn"));
const ParentNotifications = lazy(() => import("@/pages/presences/sections/ParentNotifications"));
const AttendanceStats = lazy(() => import("@/pages/presences/sections/AttendanceStats"));
const AttendanceReports = lazy(() => import("@/pages/presences/sections/AttendanceReports"));
const AttendanceConfig = lazy(() => import("@/pages/presences/sections/AttendanceConfig"));
const TimetableLayout = lazy(() => import("@/pages/emploi/TimetableLayout"));
const TimetableDashboard = lazy(() => import("@/pages/emploi/sections/TimetableDashboard"));
const WeeklyView = lazy(() => import("@/pages/emploi/sections/WeeklyView"));
const AutoGenerate = lazy(() => import("@/pages/emploi/sections/AutoGenerate"));
const SubjectsVolumes = lazy(() => import("@/pages/emploi/sections/SubjectsVolumes"));
const TeacherAvailability = lazy(() => import("@/pages/emploi/sections/TeacherAvailability"));
const RoomAssignment = lazy(() => import("@/pages/emploi/sections/RoomAssignment"));
const Substitutions = lazy(() => import("@/pages/emploi/sections/Substitutions"));
const Conflicts = lazy(() => import("@/pages/emploi/sections/Conflicts"));
const TimetableNotifications = lazy(() => import("@/pages/emploi/sections/Notifications"));
const Printing = lazy(() => import("@/pages/emploi/sections/Printing"));
const TimetableConfig = lazy(() => import("@/pages/emploi/sections/TimetableConfig"));
const SchoolsLayout = lazy(() => import("@/pages/ecoles/SchoolsLayout"));
const SchoolsDashboard = lazy(() => import("@/pages/ecoles/sections/SchoolsDashboard"));
const SchoolsList = lazy(() => import("@/pages/ecoles/sections/SchoolsList"));
const SchoolsCreate = lazy(() => import("@/pages/ecoles/sections/SchoolsCreate"));
const SchoolsStats = lazy(() => import("@/pages/ecoles/sections/SchoolsStats"));
const SchoolsConfig = lazy(() => import("@/pages/ecoles/sections/SchoolsConfig"));
const SchoolsYearTransition = lazy(() => import("@/pages/ecoles/sections/SchoolsYearTransition"));
import { EcoleProvider } from "@/context/EcoleContext";
import { AcademicPeriodProvider } from "@/context/AcademicPeriodContext";
const CardsLayout = lazy(() => import("@/pages/cartes/CardsLayout"));
const CardsDashboard = lazy(() => import("@/pages/cartes/sections/CardsDashboard"));
const CardsList = lazy(() => import("@/pages/cartes/sections/CardsList"));
const CardsIssue = lazy(() => import("@/pages/cartes/sections/CardsIssue"));
const CardsBatchByClass = lazy(() => import("@/pages/cartes/sections/CardsBatchByClass"));
const CardsPrintQueue = lazy(() => import("@/pages/cartes/sections/CardsPrintQueue"));
const CardsRenewal = lazy(() => import("@/pages/cartes/sections/CardsRenewal"));
const CardsLost = lazy(() => import("@/pages/cartes/sections/CardsLost"));
const CardsTemplates = lazy(() => import("@/pages/cartes/sections/CardsTemplates"));
const CardsConfig = lazy(() => import("@/pages/cartes/sections/CardsConfig"));
const StudentCardVerificationPage = lazy(() => import("@/pages/cartes/StudentCardVerificationPage"));
const StatsLayout = lazy(() => import("@/pages/statistiques/StatsLayout"));
const GlobalDashboard = lazy(() => import("@/pages/statistiques/sections/GlobalDashboard"));
const SchoolsCompare = lazy(() => import("@/pages/statistiques/sections/SchoolsCompare"));
const StudentsStatsG = lazy(() => import("@/pages/statistiques/sections/StudentsStats"));
const TeachersStatsG = lazy(() => import("@/pages/statistiques/sections/TeachersStats"));
const AttendanceStatsG = lazy(() => import("@/pages/statistiques/sections/AttendanceStats"));
const ExamsStatsG = lazy(() => import("@/pages/statistiques/sections/ExamsStats"));
const FinanceStatsG = lazy(() => import("@/pages/statistiques/sections/FinanceStats"));
const CanteenStatsG = lazy(() => import("@/pages/statistiques/sections/CanteenStatsGlobal"));
const TransportStatsG = lazy(() => import("@/pages/statistiques/sections/TransportStatsGlobal"));
const LibraryStatsG = lazy(() => import("@/pages/statistiques/sections/LibraryStatsGlobal"));
const GlobalReports = lazy(() => import("@/pages/statistiques/sections/GlobalReports"));
const StatsConfig = lazy(() => import("@/pages/statistiques/sections/StatsConfig"));
const SubjectsLayout = lazy(() => import("@/pages/matieres/SubjectsLayout"));
const SubjectsDashboard = lazy(() => import("@/pages/matieres/sections/SubjectsDashboard"));
const SubjectsList = lazy(() => import("@/pages/matieres/sections/SubjectsList"));
const SubjectsCategories = lazy(() => import("@/pages/matieres/sections/SubjectsCategories"));
const SubjectsClassesAssignment = lazy(() => import("@/pages/matieres/sections/SubjectsClassesAssignment"));
const SubjectsTeachersAssignment = lazy(() => import("@/pages/matieres/sections/SubjectsTeachersAssignment"));
const SubjectsVolumesPage = lazy(() => import("@/pages/matieres/sections/SubjectsVolumes"));
const SubjectsScales = lazy(() => import("@/pages/matieres/sections/SubjectsScales"));
const SubjectsPrograms = lazy(() => import("@/pages/matieres/sections/SubjectsPrograms"));
const SubjectsReports = lazy(() => import("@/pages/matieres/sections/SubjectsReports"));
const SubjectsConfig = lazy(() => import("@/pages/matieres/sections/SubjectsConfig"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TeacherPortal = lazy(() => import("@/pages/portail-enseignant/TeacherPortal"));
const EvaluationGradesPage = lazy(() => import("@/pages/portail-enseignant/EvaluationGradesPage"));
const VieScolaireLayout = lazy(() => import("@/pages/vie-scolaire/VieScolaireLayout"));
const VieScolaireDashboard = lazy(() => import("@/pages/vie-scolaire/sections/VieScolaireDashboard"));
const VieScolaireBillets = lazy(() => import("@/pages/vie-scolaire/sections/VieScolaireBillets"));
const VieScolaireCertificats = lazy(() => import("@/pages/vie-scolaire/sections/VieScolaireCertificats"));
const VieScolairePresences = lazy(() => import("@/pages/vie-scolaire/sections/VieScolairePresences"));
const VieScolaireDiscipline = lazy(() => import("@/pages/vie-scolaire/sections/VieScolaireDiscipline"));
const VieScolaireInfirmerie = lazy(() => import("@/pages/vie-scolaire/sections/VieScolaireInfirmerie"));
const OfflinePage = lazy(() => import("@/pages/Offline"));
const VacancesLayout = lazy(() => import("@/pages/cours-vacances/VacancesLayout"));
const VacancesDashboard = lazy(() => import("@/pages/cours-vacances/sections/VacancesDashboard"));
const VacancesInscriptions = lazy(() => import("@/pages/cours-vacances/sections/VacancesInscriptions"));
const VacancesClasses = lazy(() => import("@/pages/cours-vacances/sections/VacancesClasses"));
const VacancesPaiements = lazy(() => import("@/pages/cours-vacances/sections/VacancesPaiements"));
const VacancesEnseignants = lazy(() => import("@/pages/cours-vacances/sections/VacancesEnseignants"));
const VacancesHonoraires = lazy(() => import("@/pages/cours-vacances/sections/VacancesHonoraires"));
const VacancesRapports = lazy(() => import("@/pages/cours-vacances/sections/VacancesRapports"));
const VacancesPointCaisse = lazy(() => import("@/pages/cours-vacances/sections/VacancesPointCaisse"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading, mustChangePassword } = useAuth();
  if (loading) return <AppLoader label="Vérification de votre session…" />;
  if (!session) return <Navigate to="/connexion" replace />;
  if (mustChangePassword) return <Navigate to="/premier-mot-de-passe" replace />;
  return <MfaGuard>{children}</MfaGuard>;
}



const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NavigationProgress />
        <AuthProvider>
        <EcoleProvider>
        <AcademicPeriodProvider>
          <Routes>
            <Route path="/offline" element={<Suspense fallback={<AppLoader label="Chargement…" />}><OfflinePage /></Suspense>} />
            <Route path="/connexion" element={<LoginPage />} />
            <Route path="/premier-mot-de-passe" element={<Suspense fallback={<AppLoader label="Chargement…" />}><FirstPasswordPage /></Suspense>} />

            <Route path="/invitation" element={<AcceptInvitationPage />} />
            <Route path="/carte-scolaire/verification/:token" element={<StudentCardVerificationPage />} />
            <Route path="/verify-student-card/:token" element={<StudentCardVerificationPage />} />
            <Route path="/portail-enseignant" element={<RequireAuth><TeacherPortal /></RequireAuth>} />
            <Route path="/portail-enseignant/evaluations/:id" element={<RequireAuth><EvaluationGradesPage /></RequireAuth>} />
            <Route path="/*" element={
              <RequireAuth>
                <AppLayout>
                  <Suspense fallback={<AppLoader label="Chargement…" />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/index" element={<Navigate to="/" replace />} />
            <Route path="/statistiques" element={<StatsLayout />}>
              <Route path="tableau" element={<GlobalDashboard />} />
              <Route path="ecoles" element={<SchoolsCompare />} />
              <Route path="eleves" element={<StudentsStatsG />} />
              <Route path="enseignants" element={<TeachersStatsG />} />
              <Route path="presences" element={<AttendanceStatsG />} />
              <Route path="examens" element={<ExamsStatsG />} />
              <Route path="finances" element={<FinanceStatsG />} />
              <Route path="cantine" element={<CanteenStatsG />} />
              <Route path="transport" element={<TransportStatsG />} />
              <Route path="bibliotheque" element={<LibraryStatsG />} />
              <Route path="rapports" element={<GlobalReports />} />
              <Route path="configuration" element={<StatsConfig />} />
            </Route>
            <Route path="/eleves" element={<RequirePerm module="eleves"><StudentsLayout /></RequirePerm>}>
              <Route path="tableau" element={<StudentsDashboard />} />
              <Route path="liste" element={<StudentsList />} />
              <Route path="inscription" element={<StudentsRegistration />} />
              <Route path="reinscription" element={<StudentsReregistration />} />
              <Route path="affectation" element={<StudentsAssignment />} />
              <Route path="presences" element={<StudentsAttendance />} />
              <Route path="sante" element={<StudentsHealth />} />
              <Route path="discipline" element={<StudentsDiscipline />} />
              <Route path="documents" element={<StudentsDocuments />} />
              <Route path="attestations" element={<StudentsAttestations />} />
              <Route path="anciens" element={<StudentsAlumni />} />
              <Route path="sigfne" element={<StudentsSigfne />} />
              <Route path="configuration" element={<StudentsConfig />} />
            </Route>
            <Route path="/enseignants" element={<RequirePerm module="enseignants"><StaffLayout /></RequirePerm>}>
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
            <Route path="/classes" element={<RequirePerm module="classes"><ClassesLayout /></RequirePerm>}>
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
            <Route path="/ecoles" element={<RequirePerm module="parametres"><SchoolsLayout /></RequirePerm>}>
              <Route path="tableau" element={<SchoolsDashboard />} />
              <Route path="liste" element={<SchoolsList />} />
              <Route path="nouvelle" element={<SchoolsCreate />} />
              <Route path="statistiques" element={<SchoolsStats />} />
              <Route path="configuration" element={<SchoolsConfig />} />
              <Route path="transition" element={<SchoolsYearTransition />} />
            </Route>
            <Route path="/emploi-du-temps" element={<RequirePerm module="emploi_temps"><TimetableLayout /></RequirePerm>}>
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
            <Route path="/examens" element={<RequirePerm module="examens"><ExamsLayout /></RequirePerm>}>
              <Route path="tableau" element={<ExamsDashboard />} />
              <Route path="calendrier" element={<ExamsCalendar />} />
              <Route path="evaluations" element={<Evaluations />} />
              <Route path="compositions" element={<Compositions />} />
              <Route path="saisie-notes" element={<GradeEntry />} />
              <Route path="saisie-rapide" element={<QuickGradeEntry />} />
              <Route path="bulletins" element={<Bulletins />} />
              <Route path="moyennes" element={<Averages />} />
              <Route path="conseils" element={<ClassCouncils />} />
              <Route path="statistiques" element={<ExamsStatistics />} />
              <Route path="rapports" element={<ExamsReports />} />
              <Route path="baremes" element={<GradingScales />} />
              <Route path="fin-annee" element={<FinAnnee />} />
              <Route path="validation" element={<Validation />} />
              <Route path="configuration" element={<ExamsConfig />} />
            </Route>
            <Route path="/finances" element={<RequirePerm module="finances"><FinanceLayout /></RequirePerm>}>
              <Route path="tableau" element={<FinanceDashboard />} />
              <Route path="factures" element={<Invoices />} />
              <Route path="paiements" element={<Payments />} />
              <Route path="synthese-eleve" element={<StudentSummary />} />
              <Route path="synthese-classe" element={<ClassSummary />} />
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
            <Route path="/presences" element={<RequirePerm module="presences"><AttendanceLayout /></RequirePerm>}>
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
            <Route path="/cantine" element={<RequirePerm module="cantine"><CanteenLayout /></RequirePerm>}>
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
            <Route path="/transport" element={<RequirePerm module="transport"><TransportLayout /></RequirePerm>}>
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
            <Route path="/bibliotheque" element={<RequirePerm module="bibliotheque"><LibraryLayout /></RequirePerm>}>
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
            <Route path="/communication" element={<RequirePerm module="communication"><CommunicationLayout /></RequirePerm>}>
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
            <Route path="/cartes" element={<RequirePerm module="cartes"><CardsLayout /></RequirePerm>}>
              <Route path="tableau" element={<CardsDashboard />} />
              <Route path="liste" element={<CardsList />} />
              <Route path="emission" element={<CardsIssue />} />
              <Route path="par-classe" element={<CardsBatchByClass />} />
              <Route path="impression" element={<CardsPrintQueue />} />
              <Route path="renouvellement" element={<CardsRenewal />} />
              <Route path="perdues" element={<CardsLost />} />
              <Route path="templates" element={<CardsTemplates />} />
              <Route path="configuration" element={<CardsConfig />} />
            </Route>
            <Route path="/matieres" element={<RequirePerm module="matieres"><SubjectsLayout /></RequirePerm>}>
              <Route path="tableau" element={<SubjectsDashboard />} />
              <Route path="liste" element={<SubjectsList />} />
              <Route path="categories" element={<SubjectsCategories />} />
              <Route path="affectation-classes" element={<SubjectsClassesAssignment />} />
              <Route path="affectation-enseignants" element={<SubjectsTeachersAssignment />} />
              <Route path="volumes" element={<SubjectsVolumesPage />} />
              <Route path="baremes" element={<SubjectsScales />} />
              <Route path="programmes" element={<SubjectsPrograms />} />
              <Route path="rapports" element={<SubjectsReports />} />
              <Route path="configuration" element={<SubjectsConfig />} />
            </Route>
            
            <Route path="/vie-scolaire" element={<RequirePerm module="vie_scolaire"><VieScolaireLayout /></RequirePerm>}>
              <Route path="tableau" element={<VieScolaireDashboard />} />
              <Route path="billets" element={<VieScolaireBillets />} />
              <Route path="certificats" element={<VieScolaireCertificats />} />
              <Route path="presences" element={<VieScolairePresences />} />
              <Route path="discipline" element={<VieScolaireDiscipline />} />
              <Route path="infirmerie" element={<VieScolaireInfirmerie />} />
            </Route>
            <Route path="/services-ponctuels" element={<RequirePerm module="services_ponctuels"><ServicesPonctuelsLayout /></RequirePerm>}>
              <Route path="tableau" element={<SpDashboard />} />
              <Route path="paiements" element={<SpPaiements />} />
              <Route path="tests-entree" element={<SpTestsEntree />} />
              <Route path="ventes-tenues" element={<SpVentesTenues />} />
              <Route path="catalogue" element={<SpCatalogue />} />
              <Route path="rapports" element={<SpRapports />} />
              <Route path="parametres" element={<SpParametres />} />
            </Route>
            <Route path="/cours-vacances" element={<RequirePerm module="cours_vacances"><VacancesLayout /></RequirePerm>}>
              <Route path="tableau" element={<VacancesDashboard />} />
              <Route path="inscriptions" element={<VacancesInscriptions />} />
              <Route path="classes" element={<VacancesClasses />} />
              <Route path="paiements" element={<VacancesPaiements />} />
              <Route path="point-caisse" element={<VacancesPointCaisse />} />
              <Route path="enseignants" element={<VacancesEnseignants />} />
              <Route path="honoraires" element={<VacancesHonoraires />} />
              <Route path="rapports" element={<VacancesRapports />} />
            </Route>
            <Route path="/utilisateurs" element={<UsersRoles />} />
            <Route path="/parametres" element={<SettingsLayout />}>
              <Route path="ecole" element={<SchoolProfile />} />
              <Route path="academique" element={<AcademicSettings />} />
              <Route path="utilisateurs" element={<UsersRoles />} />
              <Route path="finances" element={<FinanceSettings />} />
              <Route path="documents" element={<DocumentTemplates />} />
              <Route path="notifications" element={<NotificationSettings />} />
              <Route path="sms" element={<SmsSettings />} />
              <Route path="apparence" element={<AppearanceSettings />} />
              <Route path="localisation" element={<LocalizationSettings />} />
              <Route path="sauvegarde" element={<BackupSettings />} />
              <Route path="profil" element={<UserProfile />} />
              <Route path="securite" element={<SecuritySettings />} />
              <Route path="mfa" element={<MfaSettings />} />
              <Route path="appareils" element={<TrustedDevices />} />
              <Route path="historique-securite" element={<SecurityHistory />} />
              <Route path="integrations" element={<IntegrationsSettings />} />
              <Route path="logs" element={<ActivityLogs />} />
              <Route path="support" element={<SupportSettings />} />
              <Route path="avance" element={<AdvancedSettings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
                  </Routes>
                  </Suspense>
                </AppLayout>
              </RequireAuth>
            } />
          </Routes>
        </AcademicPeriodProvider>
        </EcoleProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
