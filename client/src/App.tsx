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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
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
