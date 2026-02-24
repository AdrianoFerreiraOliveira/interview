import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import DocumentManagement from "./pages/DocumentManagement";
import NotFound from "./pages/NotFound";
import ObservabilityDashboard from "./pages/ObservabilityDashboard";
import Login from "./pages/Login";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, user } = useAuth();
  if (session === undefined) return <div className="h-screen w-full flex items-center justify-center text-muted-foreground">Carregando permissões...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/document-management" element={<ProtectedRoute><DocumentManagement /></ProtectedRoute>} />
            <Route path="/observability" element={<ProtectedRoute><ObservabilityDashboard /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
