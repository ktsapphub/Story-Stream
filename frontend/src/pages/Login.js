import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Heart, PenLine, Mail, Sparkles, Loader2 } from "lucide-react";
import { useAuth, formatApiErrorDetail } from "@/context/AuthContext";

const BrandPanel = () => (
  <div className="relative hidden lg:flex flex-col justify-between auth-band noise p-10 w-[46%]">
    <div className="flex items-center gap-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Heart className="h-5 w-5" fill="currentColor" />
      </div>
      <div className="leading-tight">
        <div className="font-display text-lg font-semibold">Content Studio</div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">My Date Jar</div>
      </div>
    </div>
    <div className="max-w-sm">
      <h1 className="font-display text-4xl font-semibold leading-tight">Craft content your readers will fall for.</h1>
      <p className="mt-3 text-muted-foreground">Generate on-brand blogs &amp; newsletters, score quality, add media, and export anywhere — all in one warm, organized studio.</p>
      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-border" style={{ color: "hsl(var(--accent-blog))" }}><PenLine className="h-4 w-4" /></span><span className="text-sm font-medium">Blog Studio with batch generation</span></div>
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-border" style={{ color: "hsl(var(--accent-newsletter))" }}><Mail className="h-4 w-4" /></span><span className="text-sm font-medium">Newsletter Studio &amp; smart exports</span></div>
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-border" style={{ color: "hsl(var(--accent-knowledge-base))" }}><Sparkles className="h-4 w-4" /></span><span className="text-sm font-medium">Quality scoring &amp; knowledge base</span></div>
      </div>
    </div>
    <div className="text-xs text-muted-foreground">© My Date Jar — Content Studio</div>
  </div>
);

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <BrandPanel />
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="cs-card w-full max-w-md p-7 sm:p-8">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Heart className="h-5 w-5" fill="currentColor" /></div>
            <span className="font-display text-lg font-semibold">Content Studio</span>
          </div>
          <h2 className="font-display text-2xl font-semibold">Welcome back</h2>
          <p className="text-sm text-muted-foreground mt-1">Log in to keep your date-ideas content flowing.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@mydatejar.com" required className="h-11 rounded-xl" data-testid="auth-login-email-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="h-11 rounded-xl" data-testid="auth-login-password-input" />
            </div>
            {error && <p className="text-sm text-destructive" data-testid="auth-login-error-text">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl gap-2" data-testid="auth-login-submit-button">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Log in
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-5 text-center">
            New here? <Link to="/signup" className="font-semibold text-primary hover:underline" data-testid="auth-login-signup-link">Create an account</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
