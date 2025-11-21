import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NeuralSphereProvider } from "./contexts/NeuralSphereContext";
import { PrivateRoute } from "./components/PrivateRoute";
import Home from "./pages/Home";

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // AuthProvider will handle loading state
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
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NeuralSphereProvider>
          <ThemeProvider
            defaultTheme="dark"
            switchable
          >
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
