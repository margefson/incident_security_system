import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/views/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "@/views/Home";
import Login from "@/views/Login";
import Register from "@/views/Register";
import Dashboard from "@/views/Dashboard";
import Incidents from "@/views/Incidents";
import NewIncident from "@/views/NewIncident";
import IncidentDetail from "@/views/IncidentDetail";
import RiskAnalysis from "@/views/RiskAnalysis";
import Admin from "@/views/Admin";
import AdminCategories from "@/views/AdminCategories";
import AdminML from "@/views/AdminML";
import AdminUsers from "@/views/AdminUsers";
import AdminSystemHealth from "@/views/AdminSystemHealth";
import AdminIncidents from "@/views/AdminIncidents";
import AdminMLTraining from "@/views/AdminMLTraining";
import Profile from "@/views/Profile";
import ResetPassword from "@/views/ResetPassword";
import ResolutionMetrics from "@/views/ResolutionMetrics";
import AnalystIncidents from "@/views/AnalystIncidents";
import AnalystDashboard from "@/views/AnalystDashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/incidents/new" component={NewIncident} />
      <Route path="/incidents/:id" component={IncidentDetail} />
      <Route path="/incidents" component={Incidents} />
      <Route path="/risk" component={RiskAnalysis} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/ml" component={AdminML} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/system-health" component={AdminSystemHealth} />
      <Route path="/admin/incidents" component={AdminIncidents} />
      <Route path="/admin/ml-training" component={AdminMLTraining} />
      <Route path="/profile" component={Profile} />
      <Route path="/metrics" component={ResolutionMetrics} />
      <Route path="/analyst/incidents" component={AnalystIncidents} />
      <Route path="/analyst/dashboard" component={AnalystDashboard} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster theme="dark" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
