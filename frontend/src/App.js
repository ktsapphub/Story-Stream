import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/AppShell";
import Dashboard from "@/pages/Dashboard";
import BlogStudio from "@/pages/BlogStudio";
import NewsletterStudio from "@/pages/NewsletterStudio";
import ContentLibrary from "@/pages/ContentLibrary";
import MediaLibrary from "@/pages/MediaLibrary";
import KnowledgeBase from "@/pages/KnowledgeBase";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/blog" element={<BlogStudio />} />
            <Route path="/blog/:id" element={<BlogStudio />} />
            <Route path="/newsletter" element={<NewsletterStudio />} />
            <Route path="/newsletter/:id" element={<NewsletterStudio />} />
            <Route path="/library" element={<ContentLibrary />} />
            <Route path="/media" element={<MediaLibrary />} />
            <Route path="/knowledge" element={<KnowledgeBase />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
