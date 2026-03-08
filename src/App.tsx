import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Eleves from "@/pages/Eleves";
import Enseignants from "@/pages/Enseignants";
import Classes from "@/pages/Classes";
import Placeholder from "@/pages/Placeholder";
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
            <Route path="/" element={<Dashboard />} />
            <Route path="/eleves" element={<Eleves />} />
            <Route path="/enseignants" element={<Enseignants />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/ecoles" element={<Placeholder title="Gestion des Écoles" />} />
            <Route path="/emploi-du-temps" element={<Placeholder title="Emploi du Temps" />} />
            <Route path="/examens" element={<Placeholder title="Examens & Notes" />} />
            <Route path="/finances" element={<Placeholder title="Finances" />} />
            <Route path="/bibliotheque" element={<Placeholder title="Bibliothèque" />} />
            <Route path="/communication" element={<Placeholder title="Communication" />} />
            <Route path="/statistiques" element={<Placeholder title="Statistiques" />} />
            <Route path="/utilisateurs" element={<Placeholder title="Utilisateurs" />} />
            <Route path="/parametres" element={<Placeholder title="Paramètres" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
