import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, PenLine, Mail, Library, Image as ImageIcon,
  BookOpen, Menu, Sparkles, LogOut,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "sidebar-nav-dashboard", end: true, accent: "--accent-dashboard" },
  { to: "/blog", label: "Blog Studio", icon: PenLine, testid: "sidebar-nav-blog-studio", accent: "--accent-blog" },
  { to: "/newsletter", label: "Newsletter Studio", icon: Mail, testid: "sidebar-nav-newsletter-studio", accent: "--accent-newsletter" },
  { to: "/library", label: "Content Library", icon: Library, testid: "sidebar-nav-content-library", accent: "--accent-content-library" },
  { to: "/media", label: "Media Library", icon: ImageIcon, testid: "sidebar-nav-media-library", accent: "--accent-media-library" },
  { to: "/knowledge", label: "Knowledge Base", icon: BookOpen, testid: "sidebar-nav-knowledge-base", accent: "--accent-knowledge-base" },
];

const NavItems = ({ onClick }) => (
  <nav className="flex flex-col gap-1 px-3">
    {NAV.map((item) => {
      const Icon = item.icon;
      const accent = `hsl(var(${item.accent}))`;
      return (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onClick}
          data-testid={item.testid}
          className={({ isActive }) =>
            `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-[background-color,color,box-shadow] ${
              isActive
                ? "bg-card text-foreground border border-border shadow-[var(--shadow-sm)]"
                : "text-muted-foreground hover:bg-[hsl(var(--surface-2))] hover:text-foreground"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full transition-opacity"
                style={{ background: accent, opacity: isActive ? 1 : 0 }}
              />
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} style={{ color: isActive ? accent : undefined }} />
              {item.label}
            </>
          )}
        </NavLink>
      );
    })}
  </nav>
);

const Brand = () => (
  <div className="flex items-center gap-2.5 px-5 py-5">
    <div className="leading-tight">
      <div className="font-display text-lg font-semibold text-foreground">Content Studio</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">My Date Jar</div>
    </div>
  </div>
);

const UserMenu = () => {
  const { user, logout } = useAuth();
  const initials = (user?.name || user?.email || "?").slice(0, 2).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 rounded-xl px-2" data-testid="user-menu-button">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{initials}</span>
          <span className="hidden sm:block max-w-[140px] truncate text-sm font-medium">{user?.name || user?.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} data-testid="logout-button" className="gap-2 text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const AppShell = ({ children }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden lg:flex w-[272px] flex-col border-r border-border bg-card/70 fixed inset-y-0 left-0 z-30">
        <Brand />
        <NavItems />
        <div className="mt-auto p-4">
          <Button data-testid="sidebar-new-content-button" onClick={() => navigate("/blog")} className="w-full rounded-xl gap-2">
            <Sparkles className="h-4 w-4" /> New Content
          </Button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-[272px] min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          <div className="lg:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="topbar-menu-button"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <Brand />
                <NavItems onClick={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
          <div className="font-display text-base font-semibold lg:hidden">Content Studio</div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="secondary" size="sm" className="rounded-xl gap-2 hidden sm:flex" onClick={() => navigate("/blog")} data-testid="topbar-new-blog">
              <PenLine className="h-4 w-4" style={{ color: "hsl(var(--accent-blog))" }} /> Blog
            </Button>
            <Button variant="secondary" size="sm" className="rounded-xl gap-2 hidden sm:flex" onClick={() => navigate("/newsletter")} data-testid="topbar-new-newsletter">
              <Mail className="h-4 w-4" style={{ color: "hsl(var(--accent-newsletter))" }} /> Newsletter
            </Button>
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
};
