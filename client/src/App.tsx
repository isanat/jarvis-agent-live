import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import TripsPage from "@/pages/TripsPage";
import TripDetailPage from "@/pages/TripDetailPage";
import DocumentsPage from "@/pages/DocumentsPage";
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
      <Route path="/">
        {user ? <Home /> : <Login />}
      </Route>
      <Route path="/chat">
        <PrivateRoute>
          <Home />
        </PrivateRoute>
      </Route>
      <Route path="/trips">
        <PrivateRoute>
          <TripsPage />
        </PrivateRoute>
      </Route>
      <Route path="/trips/:id/documents">
        <PrivateRoute>
          <DocumentsPage />
        </PrivateRoute>
      </Route>
      <Route path="/trips/:id">
        <PrivateRoute>
          <TripDetailPage />
        </PrivateRoute>
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
