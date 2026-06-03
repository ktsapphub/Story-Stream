import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useAuth, formatApiErrorDetail } from "@/context/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await signup(email, password, name);
      navigate("/");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || "Sign up failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden lg:flex flex-col justify-between auth-band noise p-10 w-[46%]">
        <div className="leading-tight">
          <div className="font-display text-lg font-semibold">Content Studio</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">My Date Jar</div>
        </div>
        <div className="max-w-sm">
          <h1 className="font-display text-4xl font-semibold leading-tight">Create your workspace.</h1>
          <p className="mt-3 text-muted-foreground">Generate blogs, newsletters, and exports in one warm, organized studio built for the My Date Jar brand.</p>
        </div>
        <div className="text-xs text-muted-foreground">© My Date Jar — Content Studio</div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="cs-card w-full max-w-md p-7 sm:p-8">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <span className="font-display text-lg font-semibold">Content Studio</span>
          </div>
          <h2 className="font-display text-2xl font-semibold">Create your account</h2>
          <p className="text-sm text-muted-foreground mt-1">Start generating on-brand content in minutes.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-11 rounded-xl" data-testid="auth-signup-name-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@mydatejar.com" required className="h-11 rounded-xl" data-testid="auth-signup-email-input" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 rounded-xl" data-testid="auth-signup-password-input" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="h-11 rounded-xl" data-testid="auth-signup-confirm-password-input" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive" data-testid="auth-signup-error-text">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl gap-2" data-testid="auth-signup-submit-button">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create account
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-5 text-center">
            Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline" data-testid="auth-signup-login-link">Log in</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
