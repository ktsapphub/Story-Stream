import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, PenLine, Mail, Library, Image as ImageIcon,
  BookOpen, Menu, Sparkles, Heart,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "sidebar-nav-dashboard", end: true },
  { to: "/blog", label: "Blog Studio", icon: PenLine, testid: "sidebar-nav-blog" },
  { to: "/newsletter", label: "Newsletter Studio", icon: Mail, testid: "sidebar-nav-newsletter" },
  { to: "/library", label: "Content Library", icon: Library, testid: "sidebar-nav-library" },
  { to: "/media", label: "Media Library", icon: ImageIcon, testid: "sidebar-nav-media" },
  { to: "/knowledge", label: "Knowledge Base", icon: BookOpen, testid: "sidebar-nav-knowledge" },
];

const NavItems = ({ onClick }) => (
  <nav className="flex flex-col gap-1 px-3">
    {NAV.map((item) => {
      const Icon = item.icon;
      return (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onClick}
          data-testid={item.testid}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-secondary text-primary"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`
          }
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          {item.label}
        </NavLink>
      );
    })}
  </nav>
);

const Brand = () => (
  <div className="flex items-center gap-2.5 px-5 py-5">
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
      <Heart className="h-5 w-5" strokeWidth={2} fill="currentColor" />
    </div>
    <div className="leading-tight">
      <div className="font-display text-lg font-semibold text-foreground">Content Studio</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">My Date Jar</div>
    </div>
  </div>
);

export const AppShell = ({ children }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[264px] flex-col border-r border-border bg-card/60 fixed inset-y-0 left-0 z-30">
        <Brand />
        <NavItems />
        <div className="mt-auto p-4">
          <Button
            data-testid="sidebar-new-blog-button"
            onClick={() => navigate("/blog")}
            className="w-full rounded-xl gap-2"
          >
            <Sparkles className="h-4 w-4" /> New Content
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-[264px] min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
          <div className="lg:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="topbar-menu-button">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <Brand />
                <NavItems onClick={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
          <div className="font-display text-base font-semibold lg:hidden">Content Studio</div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="secondary" size="sm" className="rounded-xl gap-2" onClick={() => navigate("/blog")} data-testid="topbar-new-blog">
              <PenLine className="h-4 w-4" /> Blog
            </Button>
            <Button variant="secondary" size="sm" className="rounded-xl gap-2" onClick={() => navigate("/newsletter")} data-testid="topbar-new-newsletter">
              <Mail className="h-4 w-4" /> Newsletter
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
};
