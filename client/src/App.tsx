import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import Orders from "@/pages/orders";
import Payments from "@/pages/payments";
import Customers from "@/pages/customers";
import Analytics from "@/pages/analytics";
import Coupons from "@/pages/coupons";
import Settings from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/products" component={Products} />
      <ProtectedRoute path="/orders" component={Orders} />
      <ProtectedRoute path="/payments" component={Payments} />
      <ProtectedRoute path="/customers" component={Customers} />
      <ProtectedRoute path="/analytics" component={Analytics} />
      <ProtectedRoute path="/coupons" component={Coupons} />
      <ProtectedRoute path="/settings" component={Settings} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
