import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  ArrowLeft, GripVertical, ArrowUp, ArrowDown, Trash2, Plus, Loader2, Sparkles, Wand2,
  Save, Download, Image as ImageIcon, Palette, Gauge, Link2, CheckCircle2, LayoutTemplate, Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  listContent, listMedia, saveContent, downloadExport, absUrl,
  listTemplates, createTemplate, updateTemplate, deleteTemplate, rankNewsletterOrder,
} from "@/lib/api";

const FONTS = ["Playfair Display", "Montserrat", "Fraunces", "Crimson Text", "Figtree", "Roboto Mono", "Source Code Pro", "Fredoka"];
const uid = () => Math.random().toString(36).slice(2, 10);

const blogMedia = (b) => {
  if (b.header_image?.url) return { type: "image", url: b.header_image.url };
  const m = (b.inline_media || []).find((x) => x.url);
  if (m) return { type: m.media_type === "video" ? "video" : "image", url: m.url };
  return null;
};

const ScoreBar = ({ label, value }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{Math.round(value)}</span></div>
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  </div>
);

// ---------------- Template manager ----------------
const emptyTemplate = () => ({
  name: "", brand_name: "Story Stream", logo_url: "",
  colors: { primary: "#835ef5", accent: "#5b3fd6", background: "#fffbf6", text: "#24170f" },
  heading_font: "Playfair Display", body_font: "Montserrat",
  footer_text: "You are receiving this because you subscribed to Story Stream.",
});

const TemplateManager = ({ open, onOpenChange, templates, onChanged }) => {
  const [form, setForm] = useState(emptyTemplate());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const setC = (k, v) => setForm((f) => ({ ...f, colors: { ...f.colors, [k]: v } }));

  const editTpl = (t) => { setEditingId(t.id); setForm({ ...emptyTemplate(), ...t, colors: { ...emptyTemplate().colors, ...(t.colors || {}) } }); };
  const reset = () => { setEditingId(null); setForm(emptyTemplate()); };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Give the template a name"); return; }
    setSaving(true);
    try {
      if (editingId && editingId !== "default") await updateTemplate(editingId, form);
      else await createTemplate(form);
      toast.success("Template saved");
      reset(); onChanged?.();
    } catch { toast.error("Could not save template"); }
    finally { setSaving(false); }
  };
  const remove = async (t) => { try { await deleteTemplate(t.id); toast.success("Template deleted"); if (editingId === t.id) reset(); onChanged?.(); } catch { toast.error("Delete failed"); } };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="template-manager">
        <SheetHeader>
          <SheetTitle className="font-display flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> Newsletter templates</SheetTitle>
          <SheetDescription>Branding presets — logo, colors, fonts and footer applied to your newsletter.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-xl border border-border p-2.5" data-testid={`tpl-row-${t.id}`}>
              <span className="h-6 w-6 rounded-md" style={{ background: t.colors?.primary || "#835ef5" }} />
              <div className="min-w-0 flex-1"><div className="text-sm font-medium truncate">{t.name}</div><div className="text-xs text-muted-foreground truncate">{t.brand_name}</div></div>
              <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => editTpl(t)} data-testid={`tpl-edit-${t.id}`}>Edit</Button>
              {t.id !== "default" && <Button variant="ghost" size="icon" onClick={() => remove(t)} data-testid={`tpl-del-${t.id}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            </div>
          ))}
        </div>

        <Separator className="my-4" />
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">{editingId && editingId !== "default" ? "Edit template" : "New template"}</h4>
          <div className="space-y-1.5"><Label>Template name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Weekly Digest" className="rounded-xl" data-testid="tpl-name" /></div>
          <div className="space-y-1.5"><Label>Newsletter / brand name</Label><Input value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} className="rounded-xl" data-testid="tpl-brand" /></div>
          <div className="space-y-1.5"><Label>Logo URL <span className="text-muted-foreground font-normal">(or paste an image link)</span></Label><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://.../logo.png" className="rounded-xl" data-testid="tpl-logo" /></div>
          <div className="grid grid-cols-2 gap-3">
            {["primary", "accent", "background", "text"].map((k) => (
              <div key={k} className="space-y-1.5">
                <Label className="capitalize">{k}</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.colors[k]} onChange={(e) => setC(k, e.target.value)} className="h-9 w-10 rounded-lg border border-border bg-transparent p-0.5" data-testid={`tpl-color-${k}`} />
                  <Input value={form.colors[k]} onChange={(e) => setC(k, e.target.value)} className="rounded-xl font-mono text-xs" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Heading font</Label>
              <Select value={form.heading_font} onValueChange={(v) => setForm({ ...form, heading_font: v })}><SelectTrigger className="rounded-xl" data-testid="tpl-hfont"><SelectValue /></SelectTrigger><SelectContent>{FONTS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Body font</Label>
              <Select value={form.body_font} onValueChange={(v) => setForm({ ...form, body_font: v })}><SelectTrigger className="rounded-xl" data-testid="tpl-bfont"><SelectValue /></SelectTrigger><SelectContent>{FONTS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Footer text</Label><Textarea value={form.footer_text} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} className="rounded-xl" data-testid="tpl-footer" /></div>
          <div className="flex gap-2">
            <Button className="rounded-xl gap-2" onClick={save} disabled={saving} data-testid="tpl-save">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save template</Button>
            {editingId && <Button variant="outline" className="rounded-xl" onClick={reset} data-testid="tpl-new">New</Button>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ---------------- Media swap dialog ----------------
const MediaSwapDialog = ({ open, onOpenChange, onPick }) => {
  const [media, setMedia] = useState([]);
  useEffect(() => { if (open) listMedia().then(setMedia).catch(() => {}); }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-testid="media-swap-dialog">
        <DialogHeader><DialogTitle className="font-display">Choose a graphic</DialogTitle><DialogDescription>Pick an image or short-form video from your Media Library.</DialogDescription></DialogHeader>
        {media.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No media yet. Add some in the Media Library.</p> : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[420px] overflow-auto">
            {media.map((m) => (
              <button key={m.id} type="button" onClick={() => { onPick({ type: m.media_type === "video" ? "video" : "image", url: m.url }); onOpenChange(false); }} className="group relative aspect-square overflow-hidden rounded-lg border border-border hover:ring-2 hover:ring-primary" data-testid={`media-pick-${m.id}`}>
                <img src={absUrl(m.url)} alt="" className="h-full w-full object-cover" />
                {m.media_type === "video" && <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">&#9658;</span>}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ---------------- Main builder ----------------
export default function NewsletterBuilder() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("default");
  const [tplOpen, setTplOpen] = useState(false);
  const [allBlogs, setAllBlogs] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [sections, setSections] = useState([]);
  const [subject, setSubject] = useState("This week from Story Stream");
  const [preheader, setPreheader] = useState("");
  const [ai, setAi] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [swapFor, setSwapFor] = useState(null);
  const dragIndex = useRef(null);

  const loadTemplates = () => listTemplates().then((d) => setTemplates(d.templates || [])).catch(() => {});
  useEffect(() => { loadTemplates(); listContent("blog").then(setAllBlogs).catch(() => {}); }, []);

  const template = useMemo(() => templates.find((t) => t.id === templateId) || templates[0] || {}, [templates, templateId]);
  const blogById = useMemo(() => Object.fromEntries(allBlogs.map((b) => [b.id, b])), [allBlogs]);

  const visibleBlogs = useMemo(() => {
    let list = showAll ? allBlogs : allBlogs.filter((b) => b.status === "published");
    const q = pickerSearch.trim().toLowerCase();
    if (q) list = list.filter((b) => (b.title || "").toLowerCase().includes(q));
    return list;
  }, [allBlogs, showAll, pickerSearch]);

  const addBlog = (b) => {
    if (sections.some((s) => s.source_blog_id === b.id)) return;
    setSections((prev) => [...prev, {
      id: uid(), source_blog_id: b.id, title: b.title,
      subheader: b.title, excerpt: b.excerpt || b.meta_description || "",
      media: blogMedia(b), read_more_url: b.published_url || b.source_url || "", read_more_text: "Read More",
    }]);
    setAi(null);
  };
  const removeSection = (id) => { setSections((p) => p.filter((s) => s.id !== id)); setAi(null); };
  const patchSection = (id, patch) => setSections((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const move = (from, to) => {
    if (to < 0 || to >= sections.length || from === to) return;
    setSections((prev) => { const a = [...prev]; const [it] = a.splice(from, 1); a.splice(to, 0, it); return a; });
    setAi(null);
  };
  const onDrop = (i) => { if (dragIndex.current !== null) move(dragIndex.current, i); dragIndex.current = null; };

  // ---- live heuristic ranking ----
  const heuristic = useMemo(() => {
    if (!sections.length) return null;
    const scores = sections.map((s) => blogById[s.source_blog_id]?.quality_score?.overall_score ?? 60);
    const reads = sections.map((s, i) => blogById[s.source_blog_id]?.quality_score?.breakdown?.readability ?? scores[i]);
    const weights = sections.map((_, i) => 1 / (i + 1));
    const wsum = weights.reduce((a, b) => a + b, 0);
    const appeal = scores.reduce((a, s, i) => a + s * weights[i], 0) / wsum;
    const readability = reads.reduce((a, b) => a + b, 0) / reads.length;
    return { appeal, readability, overall: 0.5 * appeal + 0.5 * readability };
  }, [sections, blogById]);

  const analyze = async () => {
    if (sections.length < 2) { toast.error("Add at least two sections to analyze order"); return; }
    setAnalyzing(true);
    try {
      const items = sections.map((s) => ({ title: s.subheader, excerpt: s.excerpt, score: blogById[s.source_blog_id]?.quality_score?.overall_score ?? null }));
      const res = await rankNewsletterOrder(items);
      setAi(res);
      toast.success("Order analyzed");
    } catch (e) { toast.error(e.response?.data?.detail || "Analysis failed"); }
    finally { setAnalyzing(false); }
  };
  const applySuggested = () => {
    if (!ai?.suggested_order) return;
    setSections((prev) => ai.suggested_order.map((idx) => prev[idx - 1]).filter(Boolean));
    setAi(null);
    toast.success("Applied suggested order");
  };

  const buildPayload = () => ({
    type: "newsletter",
    title: subject,
    excerpt: preheader,
    newsletter: {
      builder: true, subject, preheader,
      template_id: template.id, brand_name: template.brand_name, logo_url: template.logo_url,
      colors: template.colors, heading_font: template.heading_font, body_font: template.body_font,
      footer_text: template.footer_text,
      sections: sections.map((s) => ({
        id: s.id, source_blog_id: s.source_blog_id, subheader: s.subheader,
        excerpt: s.excerpt, media: s.media, read_more_url: s.read_more_url, read_more_text: s.read_more_text,
      })),
      ranking: heuristic ? { overall: Math.round(heuristic.overall), readability: Math.round(heuristic.readability), appeal: Math.round(heuristic.appeal) } : null,
    },
  });

  const save = async () => {
    if (!sections.length) { toast.error("Add at least one post"); return null; }
    setSaving(true);
    try { const saved = await saveContent(buildPayload()); toast.success("Newsletter saved to Content Library"); return saved; }
    catch { toast.error("Save failed"); return null; }
    finally { setSaving(false); }
  };
  const saveAndExport = async () => { const saved = await save(); if (saved) await downloadExport(saved.id, "html", `${subject || "newsletter"}.html`); };

  const c = template.colors || {};

  return (
    <div className="space-y-5" data-testid="newsletter-builder">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/newsletter")} data-testid="builder-back"><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-semibold">Newsletter Builder</h1>
          <p className="text-sm text-muted-foreground">Roll up multiple posts into one newsletter — reorder to shape flow and appeal.</p>
        </div>
        <Button variant="outline" className="rounded-xl gap-2" onClick={() => setTplOpen(true)} data-testid="open-templates"><LayoutTemplate className="h-4 w-4" /> Templates</Button>
        <Button variant="secondary" className="rounded-xl gap-2" onClick={saveAndExport} data-testid="builder-export"><Download className="h-4 w-4" /> Save & Export HTML</Button>
        <Button className="rounded-xl gap-2" onClick={save} disabled={saving} data-testid="builder-save">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: post picker */}
        <Card className="cs-card p-4 space-y-3 lg:h-[calc(100vh-160px)] lg:overflow-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Add posts</h3>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">Show all
              <Switch checked={showAll} onCheckedChange={setShowAll} data-testid="toggle-show-all" />
            </label>
          </div>
          <div className="relative"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} placeholder="Search posts…" className="rounded-xl pl-8 h-9" data-testid="picker-search" /></div>
          {visibleBlogs.length === 0 ? <p className="text-xs text-muted-foreground py-6 text-center">{showAll ? "No posts yet." : "No approved (published) posts. Toggle 'Show all'."}</p> : visibleBlogs.map((b) => {
            const added = sections.some((s) => s.source_blog_id === b.id);
            const sc = b.quality_score?.overall_score;
            return (
              <div key={b.id} className="flex items-center gap-2 rounded-xl border border-border p-2.5" data-testid={`pick-blog-${b.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{b.title}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`cs-badge ${b.status === "published" ? "badge-published" : "badge-draft"}`}>{b.status}</span>
                    {sc != null && <span className="text-[10px] text-muted-foreground">Quality {sc}</span>}
                  </div>
                </div>
                <Button size="icon" variant={added ? "secondary" : "default"} className="rounded-lg h-8 w-8 shrink-0" onClick={() => addBlog(b)} disabled={added} data-testid={`add-blog-${b.id}`}>
                  {added ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            );
          })}
        </Card>

        {/* MIDDLE: sections */}
        <div className="space-y-3 lg:col-span-1">
          <Card className="cs-card p-4 space-y-3">
            <div className="space-y-1.5"><Label>Subject line</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-xl font-display" data-testid="builder-subject" /></div>
            <div className="space-y-1.5"><Label>Preheader</Label><Input value={preheader} onChange={(e) => setPreheader(e.target.value)} className="rounded-xl" placeholder="Short preview text" data-testid="builder-preheader" /></div>
            <div className="space-y-1.5"><Label>Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}><SelectTrigger className="rounded-xl" data-testid="builder-template-select"><SelectValue /></SelectTrigger><SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
            </div>
          </Card>

          {sections.length === 0 ? (
            <Card className="cs-card border-dashed p-10 text-center"><p className="text-sm text-muted-foreground">Add posts from the left to build your newsletter sections.</p></Card>
          ) : sections.map((s, i) => (
            <Card key={s.id} className="cs-card p-3 space-y-2" draggable onDragStart={() => { dragIndex.current = i; }} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(i)} data-testid={`section-${i}`}>
              <div className="flex items-center gap-1">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" data-testid={`section-drag-${i}`} />
                <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
                <div className="ml-auto flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, i - 1)} disabled={i === 0} data-testid={`section-up-${i}`}><ArrowUp className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, i + 1)} disabled={i === sections.length - 1} data-testid={`section-down-${i}`}><ArrowDown className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeSection(s.id)} data-testid={`section-remove-${i}`}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSwapFor(s.id)} className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary" data-testid={`section-media-${i}`}>
                  {s.media?.url ? <img src={absUrl(s.media.url)} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-muted-foreground"><ImageIcon className="h-5 w-5" /></span>}
                  {s.media?.type === "video" && <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-xs">&#9658;</span>}
                </button>
                <Input value={s.subheader} onChange={(e) => patchSection(s.id, { subheader: e.target.value })} className="rounded-xl font-medium" placeholder="Subheader" data-testid={`section-subheader-${i}`} />
              </div>
              <Textarea value={s.excerpt} onChange={(e) => patchSection(s.id, { excerpt: e.target.value })} className="rounded-xl min-h-[64px] text-sm" placeholder="Excerpt copy" data-testid={`section-excerpt-${i}`} />
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input value={s.read_more_url} onChange={(e) => patchSection(s.id, { read_more_url: e.target.value })} className="rounded-xl text-sm" placeholder="Read More URL (external)" data-testid={`section-url-${i}`} />
                {(blogById[s.source_blog_id]?.published_url || blogById[s.source_blog_id]?.source_url) && (
                  <Button variant="outline" size="sm" className="rounded-lg shrink-0" onClick={() => patchSection(s.id, { read_more_url: blogById[s.source_blog_id].published_url || blogById[s.source_blog_id].source_url })}>Use published</Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* RIGHT: ranking + preview */}
        <div className="space-y-4">
          <Card className="cs-card p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Gauge className="h-4 w-4 text-primary" /> Readability & appeal</h3>
            {!heuristic ? <p className="text-xs text-muted-foreground">Add sections to see the live ranking.</p> : (
              <>
                <div className="text-center py-1"><div className="text-3xl font-display font-bold text-primary" data-testid="rank-overall">{Math.round((ai?.overall ?? heuristic.overall))}</div><div className="text-xs text-muted-foreground">overall score {ai ? "(AI)" : "(live)"}</div></div>
                <ScoreBar label="Readability" value={ai?.readability ?? heuristic.readability} />
                <ScoreBar label="Appeal (order-weighted)" value={ai?.appeal ?? heuristic.appeal} />
                <Button variant="outline" className="rounded-xl gap-2 w-full" onClick={analyze} disabled={analyzing} data-testid="analyze-ai"><Wand2 className="h-4 w-4" /> {analyzing ? "Analyzing…" : "Analyze with AI"}</Button>
                {ai?.rationale && <p className="text-xs text-muted-foreground italic" data-testid="ai-rationale">{ai.rationale}</p>}
                {ai?.suggested_order && <Button variant="secondary" className="rounded-xl gap-2 w-full" onClick={applySuggested} data-testid="apply-suggested"><Sparkles className="h-4 w-4" /> Apply suggested order</Button>}
              </>
            )}
          </Card>

          {/* Branded preview */}
          <Card className="cs-card p-0 overflow-hidden" data-testid="builder-preview">
            <div className="p-4" style={{ background: c.background || "#fffbf6" }}>
              <div className="rounded-xl bg-white p-4" style={{ border: "1px solid #ece7f7" }}>
                <div className="text-center pb-3" style={{ borderBottom: `2px solid ${c.primary || "#835ef5"}` }}>
                  {template.logo_url ? <img src={template.logo_url} alt="logo" className="mx-auto mb-2 max-h-10" /> : null}
                  <div style={{ fontFamily: template.heading_font, color: c.primary || "#835ef5", fontWeight: 700, fontSize: 20 }}>{template.brand_name || "Story Stream"}</div>
                  <div className="text-xs mt-1" style={{ color: c.text }}>{subject}</div>
                </div>
                {sections.map((s) => (
                  <div key={s.id} className="py-3" style={{ borderBottom: "1px solid #ece7f7" }}>
                    {s.media?.url && <img src={absUrl(s.media.url)} alt="" className="w-full rounded-lg mb-2 max-h-32 object-cover" />}
                    <div style={{ fontFamily: template.heading_font, color: c.accent || "#5b3fd6", fontWeight: 700, fontSize: 15 }}>{s.subheader}</div>
                    <p className="text-xs mt-1" style={{ color: c.text, fontFamily: template.body_font }}>{(s.excerpt || "").slice(0, 160)}</p>
                    {s.read_more_url && <span className="inline-block mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: c.primary || "#835ef5" }}>{s.read_more_text || "Read More"}</span>}
                  </div>
                ))}
                {template.footer_text && <div className="text-center text-[10px] pt-3" style={{ color: "#8a839c" }}>{template.footer_text}</div>}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <TemplateManager open={tplOpen} onOpenChange={setTplOpen} templates={templates} onChanged={loadTemplates} />
      <MediaSwapDialog open={!!swapFor} onOpenChange={(v) => !v && setSwapFor(null)} onPick={(m) => patchSection(swapFor, { media: m })} />
    </div>
  );
}
