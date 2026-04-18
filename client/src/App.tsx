import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "@/pages/Dashboard";
import SessionDetail from "@/pages/SessionDetail";
import NewSession from "@/pages/NewSession";
import NotFound from "@/pages/not-found";
import { ThemeProvider } from "@/components/ThemeProvider";
import InstallBanner from "@/components/InstallBanner";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router hook={useHashLocation}>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/session/new" component={NewSession} />
            <Route path="/session/:id" component={SessionDetail} />
            <Route component={NotFound} />
          </Switch>
        </Router>
        <Toaster />
        <InstallBanner />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
