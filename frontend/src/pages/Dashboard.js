import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PenLine, Mail, Layers, FileText, Image as ImageIcon, BookOpen,
  Gauge, ArrowRight, Sparkles,
} from "lucide-react";
import { getStats, listContent } from "@/lib/api";
import { typeBadgeClass, statusBadgeClass } from "@/lib/ui";

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <Card className="cs-card p-4 flex items-center gap-3" data-testid={`stat-${label.toLowerCase().replace(/ /g, "-")}`}>
    <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: accent + "22", color: accent }}>
      <Icon className="h-5 w-5" strokeWidth={1.9} />
    </div>
    <div>
      <div className="font-display text-2xl font-semibold leading-none">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  </Card>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ blogs: 0, newsletters: 0, published: 0, media: 0, sources: 0, avg_score: 0 });
  const [recent, setRecent] = useState([]);

  const load = () => {
    getStats().then(setStats).catch(() => {});
    listContent().then((d) => setRecent(d.slice(0, 6))).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero band */}
      <div className="warm-band rounded-2xl border border-border p-6 sm:p-8">
        <Badge variant="secondary" className="rounded-full mb-3">My Date Jar • Content Studio</Badge>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold max-w-2xl">Craft blogs & newsletters your readers will love</h1>
        <p className="mt-2 text-muted-foreground max-w-xl">Generate on-brand content with AI, score its quality, add media, and export anywhere.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button className="rounded-xl gap-2" onClick={() => navigate("/blog")} data-testid="quick-new-blog"><PenLine className="h-4 w-4" /> New Blog Post</Button>
          <Button variant="secondary" className="rounded-xl gap-2" onClick={() => navigate("/newsletter")} data-testid="quick-new-newsletter"><Mail className="h-4 w-4" /> New Newsletter</Button>
          <Button variant="secondary" className="rounded-xl gap-2" onClick={() => navigate("/blog")} data-testid="quick-batch"><Layers className="h-4 w-4" /> Batch Generate</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard icon={FileText} label="Blog Posts" value={stats.blogs} accent="#835EF5" />
        <StatCard icon={Mail} label="Newsletters" value={stats.newsletters} accent="#2F8F82" />
        <StatCard icon={Sparkles} label="Published" value={stats.published} accent="#2E9E6A" />
        <StatCard icon={ImageIcon} label="Media" value={stats.media} accent="#E0583E" />
        <StatCard icon={BookOpen} label="Sources" value={stats.sources} accent="#4E7CA6" />
        <StatCard icon={Gauge} label="Avg Score" value={stats.avg_score} accent="#E0A21B" />
      </div>

      {/* Recent */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-semibold">Recent content</h2>
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/library")} data-testid="view-all-content">
            View all <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        {recent.length === 0 ? (
          <Card className="cs-card border-dashed p-10 text-center">
            <p className="text-muted-foreground">No content yet. Let’s create your first post!</p>
            <Button className="rounded-xl gap-2 mt-4" onClick={() => navigate("/blog")}><Sparkles className="h-4 w-4" /> Generate content</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recent.map((c) => (
              <Card
                key={c.id}
                className="cs-card p-4 cursor-pointer hover:shadow-[var(--shadow-md)] transition-shadow"
                onClick={() => navigate(`/${c.type === "newsletter" ? "newsletter" : "blog"}/${c.id}`)}
                data-testid={`recent-content-${c.id}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`cs-badge ${typeBadgeClass(c.type)} capitalize`} data-testid="content-type-badge">{c.type}</span>
                  <span className={`cs-badge ${statusBadgeClass(c.status)}`} data-testid="status-badge">{c.status}</span>
                  {c.quality_score && <span className="cs-badge badge-published ml-auto">{c.quality_score.overall_score}</span>}
                </div>
                <h3 className="font-display font-semibold line-clamp-2">{c.title || "Untitled"}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{c.excerpt || c.meta_description}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
