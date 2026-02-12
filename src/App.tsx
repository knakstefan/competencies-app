import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import RolesPage from "./pages/RolesPage";
import RoleDetailPage from "./pages/RoleDetailPage";
import RoleOverviewPage from "./pages/RoleOverviewPage";
import CompetenciesPage from "./pages/CompetenciesPage";
import TeamPage from "./pages/TeamPage";
import TeamMemberDetailPage from "./pages/TeamMemberDetailPage";
import UsersPage from "./pages/UsersPage";
import HiringPage from "./pages/HiringPage";
import CandidateDetailPage from "./pages/CandidateDetailPage";
import Auth from "./pages/Auth";
import AcceptInvite from "./pages/AcceptInvite";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn, isLoaded, handleSignOut } = useAuth();
  const navigate = useNavigate();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar onSignOut={handleSignOut} />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route
            path="/"
            element={
              <AppLayout>
                <RolesPage />
              </AppLayout>
            }
          />
          <Route
            path="/roles/:roleId"
            element={
              <AppLayout>
                <RoleDetailPage />
              </AppLayout>
            }
          >
            <Route index element={<RoleOverviewPage />} />
            <Route path="competencies" element={<CompetenciesPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="team/:memberId" element={<TeamMemberDetailPage />} />
            <Route path="hiring" element={<HiringPage />} />
            <Route path="hiring/:candidateId" element={<CandidateDetailPage />} />
          </Route>
          <Route
            path="/users"
            element={
              <AppLayout>
                <UsersPage />
              </AppLayout>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
);

export default App;
