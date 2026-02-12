import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import ViewPage from "./pages/ViewPage";
import TeamPage from "./pages/TeamPage";
import UsersPage from "./pages/UsersPage";
import ManagePage from "./pages/ManagePage";
import HiringPage from "./pages/HiringPage";
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
                <ViewPage />
              </AppLayout>
            }
          />
          <Route
            path="/team"
            element={
              <AppLayout>
                <TeamPage />
              </AppLayout>
            }
          />
          <Route
            path="/users"
            element={
              <AppLayout>
                <UsersPage />
              </AppLayout>
            }
          />
          <Route
            path="/manage"
            element={
              <AppLayout>
                <ManagePage />
              </AppLayout>
            }
          />
          <Route
            path="/hiring"
            element={
              <AppLayout>
                <HiringPage />
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
