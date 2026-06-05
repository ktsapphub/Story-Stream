import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings as SettingsIcon, Eye, EyeOff, Loader2, CheckCircle2, XCircle, CircleDashed,
  Save, Plug, Trash2, ExternalLink, Sparkles, Image as ImageIcon, Globe, Zap, Mail,
  Monitor, Server, Database, Boxes, Gauge, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { getPlatformInfo, getConnections, saveConnection, testConnection, deleteConnection } from "@/lib/api";

const ICONS = {
  sparkles: Sparkles, image: ImageIcon, globe: Globe, zap: Zap, mail: Mail,
  monitor: Monitor, server: Server, database: Database, boxes: Boxes,
};
const Icon = ({ name, ...props }) => {
  const C = ICONS[name] || Plug;
  return <C {...props} />;
};

const fmtTime = (iso) => {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString(); } catch { return ""; }
};

const StatusBadge = ({ configured, status }) => {
  if (status?.connected) {
    return (
      <Badge className="rounded-full gap-1 border-transparent" style={{ background: "hsl(152 55% 92%)", color: "hsl(152 55% 26%)" }} data-testid="conn-status-connected">
        <CheckCircle2 className="h-3 w-3" /> Connected
      </Badge>
    );
  }
  if (status && status.connected === false) {
    return (
      <Badge className="rounded-full gap-1 border-transparent" style={{ background: "hsl(0 72% 94%)", color: "hsl(0 65% 42%)" }} data-testid="conn-status-error">
        <XCircle className="h-3 w-3" /> Not connected
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="rounded-full gap-1" data-testid="conn-status-unconfigured">
      <CircleDashed className="h-3 w-3" /> {configured ? "Untested" : "Not configured"}
    </Badge>
  );
};

const SecretField = ({ field, value, onChange, testId }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={testId}>{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
      <div className="relative">
        <Input
          id={testId}
          type={show ? "text" : "password"}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="rounded-xl pr-10 font-mono text-sm"
          autoComplete="off"
          data-testid={testId}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={show ? "Hide secret" : "Show secret"}
          data-testid={`${testId}-toggle`}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

const UsagePanel = ({ usage, manualLimit }) => {
  const live = usage && (usage.limit != null || usage.remaining != null);
  if (!live && !manualLimit) return null;
  const limit = Number(usage?.limit);
  const remaining = Number(usage?.remaining);
  const pct = live && limit > 0 && !Number.isNaN(remaining) ? Math.max(0, Math.min(100, (remaining / limit) * 100)) : null;
  return (
    <div className="rounded-xl border border-border bg-[hsl(var(--surface-2))] p-3 space-y-2" data-testid="conn-usage">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Gauge className="h-3.5 w-3.5" /> Usage & limits
      </div>
      {live ? (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Remaining</span>
            <span className="font-medium">{usage.remaining ?? "—"}{usage.limit != null ? ` / ${usage.limit}` : ""}</span>
          </div>
          {pct != null && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">Live from provider</p>
        </>
      ) : (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Plan limit</span>
          <span className="font-medium">{manualLimit}</span>
        </div>
      )}
    </div>
  );
};

const ConnectionCard = ({ conn, onChanged }) => {
  const [values, setValues] = useState(conn.values || {});
  const [enabled, setEnabled] = useState(conn.enabled);
  const [manualLimit, setManualLimit] = useState(conn.manual_limit || "");
  const [status, setStatus] = useState(conn.status || null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    setValues(conn.values || {});
    setEnabled(conn.enabled);
    setManualLimit(conn.manual_limit || "");
    setStatus(conn.status || null);
  }, [conn]);

  const setField = (k, v) => setValues((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { values, enabled, manual_limit: manualLimit };
      const updated = await saveConnection(conn.key, payload);
      setStatus(updated.status || null);
      toast.success(`${conn.name} saved`);
      onChanged?.(updated);
    } catch (e) {
      toast.error(e.response?.data?.detail || `Could not save ${conn.name}`);
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const res = await testConnection(conn.key);
      setStatus(res);
      if (res.connected) toast.success(res.message || "Connected");
      else toast.error(res.message || "Not connected");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Test failed");
    } finally {
      setTesting(false);
    }
  };

  const disconnect = async () => {
    setDisconnecting(true);
    try {
      await deleteConnection(conn.key);
      toast.success(`${conn.name} disconnected`);
      onChanged?.();
    } catch {
      toast.error("Could not disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  const accent = "hsl(var(--primary))";
  return (
    <Card className="cs-card p-4 sm:p-5 flex flex-col gap-4" data-testid={`conn-card-${conn.key}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "hsl(var(--primary) / 0.12)", color: accent }}>
          <Icon name={conn.icon} className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold" data-testid={`conn-name-${conn.key}`}>{conn.name}</span>
            {conn.managed && (
              <Badge variant="outline" className="rounded-full gap-1 text-[10px]"><Lock className="h-2.5 w-2.5" /> Managed</Badge>
            )}
            <StatusBadge configured={conn.configured} status={status} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{conn.description}</p>
        </div>
        {!conn.managed && (
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Enabled" data-testid={`conn-enabled-${conn.key}`} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {conn.fields.map((f) => {
          const tid = `conn-${conn.key}-${f.key}`;
          if (f.secret) {
            return <SecretField key={f.key} field={f} value={values[f.key]} onChange={(v) => setField(f.key, v)} testId={tid} />;
          }
          return (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={tid}>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
              <Input id={tid} value={values[f.key] || ""} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.placeholder} className="rounded-xl" data-testid={tid} />
            </div>
          );
        })}
      </div>

      {!conn.supports_live_usage && (
        <div className="space-y-1.5">
          <Label htmlFor={`conn-${conn.key}-limit`}>Usage limit <span className="text-muted-foreground font-normal">(optional — your plan limit)</span></Label>
          <Input id={`conn-${conn.key}-limit`} value={manualLimit} onChange={(e) => setManualLimit(e.target.value)} placeholder="e.g. 10,000 emails / month" className="rounded-xl" data-testid={`conn-${conn.key}-limit`} />
        </div>
      )}

      <UsagePanel usage={status?.usage} manualLimit={manualLimit} />

      {status?.message && (
        <p className={`text-xs ${status.connected ? "text-muted-foreground" : "text-destructive"}`} data-testid={`conn-message-${conn.key}`}>
          {status.message}{status.checked_at ? ` · ${fmtTime(status.checked_at)}` : ""}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1 mt-auto">
        {!conn.managed && (
          <Button className="rounded-xl gap-2" onClick={save} disabled={saving} data-testid={`conn-save-${conn.key}`}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </Button>
        )}
        {conn.supports_test && (
          <Button variant="outline" className="rounded-xl gap-2" onClick={test} disabled={testing} data-testid={`conn-test-${conn.key}`}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />} Test connection
          </Button>
        )}
        {conn.docs_url && (
          <a href={conn.docs_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid={`conn-docs-${conn.key}`}>
            <ExternalLink className="h-3 w-3" /> Get key
          </a>
        )}
        {!conn.managed && conn.configured && (
          <Button variant="ghost" size="sm" className="rounded-xl gap-1 ml-auto text-destructive hover:text-destructive" onClick={disconnect} disabled={disconnecting} data-testid={`conn-disconnect-${conn.key}`}>
            {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Disconnect
          </Button>
        )}
      </div>
    </Card>
  );
};

export default function Settings() {
  const [platform, setPlatform] = useState(null);
  const [connections, setConnections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    return Promise.all([getPlatformInfo(), getConnections()])
      .then(([p, c]) => { setPlatform(p); setConnections(c.connections || []); setCategories(c.categories || []); })
      .catch(() => toast.error("Could not load settings"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const map = {};
    connections.forEach((c) => { (map[c.category] = map[c.category] || []).push(c); });
    return map;
  }, [connections]);

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
          <SettingsIcon className="h-7 w-7 text-primary" /> Settings
        </h1>
        <p className="text-muted-foreground mt-1">Review the platform stack and manage the API keys & connections that power your tools.</p>
      </div>

      {/* Platform / tech stack */}
      <Card className="cs-card p-5 sm:p-6" data-testid="platform-card">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-display text-xl font-semibold">Platform & Tech Stack</h2>
            <p className="text-sm text-muted-foreground">{platform?.description || "How Content Studio is built."}</p>
          </div>
          {platform?.brand && <Badge variant="secondary" className="rounded-full">{platform.brand}</Badge>}
        </div>
        <Separator className="my-4" />
        {loading && !platform ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-xl bg-[hsl(var(--surface-2))] animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(platform?.groups || []).map((g) => (
              <div key={g.title} className="rounded-xl border border-border p-4" data-testid={`platform-group-${g.title}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))" }}>
                    <Icon name={g.icon} className="h-4 w-4" />
                  </span>
                  <span className="font-semibold text-sm">{g.title}</span>
                </div>
                <ul className="space-y-2">
                  {g.items.map((it) => (
                    <li key={it.name} className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium">{it.name}</span>
                      <span className="text-xs text-muted-foreground text-right">{it.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Connections */}
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-xl font-semibold">Connections</h2>
          <p className="text-sm text-muted-foreground">Add your API keys to activate tools. Secrets are hidden by default — use the eye icon to reveal.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[0, 1].map((i) => <div key={i} className="h-64 rounded-2xl bg-[hsl(var(--surface-2))] animate-pulse" />)}
          </div>
        ) : (
          (categories.length ? categories : Object.keys(grouped)).map((cat) => (
            <section key={cat} className="space-y-3" data-testid={`conn-category-${cat}`}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{cat}</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(grouped[cat] || []).map((conn) => (
                  <ConnectionCard key={conn.key} conn={conn} onChanged={load} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
