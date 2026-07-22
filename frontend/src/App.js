import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/AppShell";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import BlogStudio from "@/pages/BlogStudio";
import NewsletterStudio from "@/pages/NewsletterStudio";
import NewsletterBuilder from "@/pages/NewsletterBuilder";
import ContentLibrary from "@/pages/ContentLibrary";
import MediaLibrary from "@/pages/MediaLibrary";
import KnowledgeBase from "@/pages/KnowledgeBase";
import Settings from "@/pages/Settings";

const FullLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-7 w-7 animate-spin text-primary" />
  </div>
);

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
};

const PublicOnly = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (user) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
            <Route path="/" element={<Protected><Dashboard /></Protected>} />
            <Route path="/blog" element={<Protected><BlogStudio /></Protected>} />
            <Route path="/blog/:id" element={<Protected><BlogStudio /></Protected>} />
            <Route path="/newsletter" element={<Protected><NewsletterStudio /></Protected>} />
            <Route path="/newsletter/build" element={<Protected><NewsletterBuilder /></Protected>} />
            <Route path="/newsletter/:id" element={<Protected><NewsletterStudio /></Protected>} />
            <Route path="/library" element={<Protected><ContentLibrary /></Protected>} />
            <Route path="/media" element={<Protected><MediaLibrary /></Protected>} />
            <Route path="/knowledge" element={<Protected><KnowledgeBase /></Protected>} />
            <Route path="/settings" element={<Protected><Settings /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
