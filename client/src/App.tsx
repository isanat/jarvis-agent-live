import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import TripsPage from "@/pages/TripsPage";
import TripDetailPage from "@/pages/TripDetailPage";
import DocumentsPage from "@/pages/DocumentsPage";
import FeedPage from "@/pages/FeedPage";
import ExperiencesPage from "@/pages/ExperiencesPage";
import ItineraryPage from "@/pages/ItineraryPage";
import ArrivalPage from "@/pages/ArrivalPage";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NeuralSphereProvider } from "./contexts/NeuralSphereContext";
import { PrivateRoute } from "./components/PrivateRoute";

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#060011" }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-[16px] flex items-center justify-center text-2xl font-extrabold text-white shadow-2xl"
            style={{ background: "linear-gradient(135deg,#7c3aed,#3b82f6)", boxShadow: "0 0 32px rgba(124,58,237,0.5)" }}
          >
            F
          </div>
          <p className="text-white/40 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />

      {/* Root: Neural Sphere home (first screen after login) */}
      <Route path="/">
        {user ? <Home /> : <Login />}
      </Route>

      {/* Smart feed */}
      <Route path="/feed">
        <PrivateRoute><FeedPage /></PrivateRoute>
      </Route>

      {/* Chat (same as home) */}
      <Route path="/chat">
        <PrivateRoute><Home /></PrivateRoute>
      </Route>

      {/* Experiences / nearby places */}
      <Route path="/experiences">
        <PrivateRoute><ExperiencesPage /></PrivateRoute>
      </Route>

      {/* Map (reuse Home for now — full map view TBD) */}
      <Route path="/map">
        <PrivateRoute><Home /></PrivateRoute>
      </Route>

      {/* Trips list */}
      <Route path="/trips">
        <PrivateRoute><TripsPage /></PrivateRoute>
      </Route>

      {/* Standalone documents upload (no trip required) */}
      <Route path="/documents">
        <PrivateRoute><DocumentsPage /></PrivateRoute>
      </Route>

      {/* Trip sub-routes — specific routes BEFORE the generic :id */}
      <Route path="/trips/:id/documents">
        <PrivateRoute><DocumentsPage /></PrivateRoute>
      </Route>
      <Route path="/trips/:id/itinerary">
        <PrivateRoute><ItineraryPage /></PrivateRoute>
      </Route>
      <Route path="/trips/:id/arrival">
        <PrivateRoute><ArrivalPage /></PrivateRoute>
      </Route>

      {/* Trip detail */}
      <Route path="/trips/:id">
        <PrivateRoute><TripDetailPage /></PrivateRoute>
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NeuralSphereProvider>
          <ThemeProvider defaultTheme="dark" switchable>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </ThemeProvider>
        </NeuralSphereProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
// Deploy trigger: 1774312273
