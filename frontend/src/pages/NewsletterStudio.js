import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Save, Download, ArrowLeft, Plus, Trash2, Loader2, FileText, ArrowRight, Mail, Layers,
} from "lucide-react";
import { toast } from "sonner";
import { PromptComposer } from "@/components/PromptComposer";
import { QualityScorePanel } from "@/components/QualityScorePanel";
import { ExportModal } from "@/components/ExportModal";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import {
  getModels, generateNewsletter, getContent, saveContent, scoreContent,
  listContent, newsletterFromBlog,
} from "@/lib/api";

export default function NewsletterStudio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [defaultModel, setDefaultModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [scoring, setScoring] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    getModels().then((d) => { setModels(d.models); setDefaultModel(d.default); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (id) {
      getContent(id).then(setContent).catch(() => toast.error("Could not load"));
    } else {
      setContent(null);
      listContent("blog").then((d) => setBlogs(d.slice(0, 8))).catch(() => {});
    }
  }, [id]);

  const handleGenerate = async (payload) => {
    setLoading(true);
    try {
      const c = await generateNewsletter({
        topic: payload.topic, model_key: payload.model_key,
        tone: payload.tone, reference_source_ids: payload.reference_source_ids,
        topics: payload.focusTopics || [],
      });
      toast.success("Newsletter generated!");
      navigate(`/newsletter/${c.id}`);
    } catch (e) {
      toast.error("Generation failed: " + (e.response?.data?.detail || e.message));
    } finally { setLoading(false); }
  };

  const convertBlog = async (blogId) => {
    setLoading(true);
    try {
      const nl = await newsletterFromBlog({ blog_content_id: blogId });
      toast.success("Newsletter created from blog!");
      navigate(`/newsletter/${nl.id}`);
    } catch { toast.error("Conversion failed"); }
    finally { setLoading(false); }
  };

  const update = (patch) => setContent((c) => ({ ...c, ...patch }));
  const updateNl = (patch) => setContent((c) => ({ ...c, newsletter: { ...(c.newsletter || {}), ...patch } }));

  const updateSection = (i, patch) => {
    const sections = [...(content.newsletter?.sections || [])];
    sections[i] = { ...sections[i], ...patch };
    updateNl({ sections });
  };
  const addSection = () => updateNl({ sections: [...(content.newsletter?.sections || []), { heading: "New section", content: "" }] });
  const removeSection = (i) => updateNl({ sections: content.newsletter.sections.filter((_, idx) => idx !== i) });

  const persist = async () => {
    const saved = await saveContent({ ...content, type: "newsletter" });
    setContent(saved);
    return saved;
  };
  const handleSave = async () => { try { await persist(); toast.success("Saved"); } catch { toast.error("Save failed"); } };
  const handleScore = async () => {
    if (!content?.id) return;
    setScoring(true);
    try { await persist(); const r = await scoreContent({ content_id: content.id }); update({ quality_score: r }); toast.success(`Scored: ${r.overall_score}/100`); }
    catch { toast.error("Scoring failed"); }
    finally { setScoring(false); }
  };

  // ---------- compose view ----------
  if (!content) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-semibold">Newsletter Studio</h1>
            <p className="text-muted-foreground mt-1">Write a newsletter from a prompt, or turn an existing blog post into one.</p>
          </div>
          <Button className="rounded-xl gap-2" onClick={() => navigate("/newsletter/build")} data-testid="open-builder-button">
            <Layers className="h-4 w-4" /> Roll up multiple posts
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PromptComposer models={models} defaultModel={defaultModel} loading={loading} onGenerate={handleGenerate} kind="newsletter" />
          <Card className="cs-card p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-3"><FileText className="h-4 w-4" /> Build from a blog post</h3>
            {blogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No blog posts yet. Create one in Blog Studio first.</p>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-auto">
                {blogs.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 rounded-xl border border-border p-3" data-testid={`convert-blog-${b.id}`}>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{b.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{b.excerpt}</div>
                    </div>
                    <Button size="sm" variant="secondary" className="rounded-lg gap-1" onClick={() => convertBlog(b.id)} disabled={loading}>
                      Use <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  const nl = content.newsletter || {};

  // ---------- editor view ----------
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/newsletter")} data-testid="nl-back-button"><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-semibold truncate flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> {nl.subject || content.title || "Newsletter"}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`cs-badge ${content.status === "published" ? "badge-published" : "badge-draft"}`} data-testid="status-badge">{content.status}</span>
            {content.source_blog_id && <span className="cs-badge badge-blog">from blog</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="rounded-xl gap-2" onClick={() => setExportOpen(true)} data-testid="nl-export-button"><Download className="h-4 w-4" /> Export</Button>
          <Button className="rounded-xl gap-2" onClick={handleSave} data-testid="nl-save-button"><Save className="h-4 w-4" /> Save</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <Card className="cs-card p-4 sm:p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject line</label>
              <Input value={nl.subject || ""} onChange={(e) => updateNl({ subject: e.target.value })} className="rounded-xl font-display" data-testid="nl-subject" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Preheader</label>
              <Input value={nl.preheader || ""} onChange={(e) => updateNl({ preheader: e.target.value })} className="rounded-xl" data-testid="nl-preheader" />
            </div>
          </Card>

          <Tabs defaultValue="edit">
            <TabsList className="rounded-xl">
              <TabsTrigger value="edit" className="rounded-lg" data-testid="nl-edit-tab">Edit sections</TabsTrigger>
              <TabsTrigger value="preview" className="rounded-lg" data-testid="nl-preview-tab">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-3 pt-3">
              {(nl.sections || []).map((s, i) => (
                <Card key={i} className="cs-card p-4 space-y-2" data-testid={`nl-section-${i}`}>
                  <div className="flex items-center gap-2">
                    <Input value={s.heading || ""} onChange={(e) => updateSection(i, { heading: e.target.value })} className="rounded-xl font-medium" placeholder="Section heading" data-testid={`nl-section-heading-${i}`} />
                    <Button variant="ghost" size="icon" onClick={() => removeSection(i)} data-testid={`nl-section-remove-${i}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  <Textarea value={s.content || ""} onChange={(e) => updateSection(i, { content: e.target.value })} className="rounded-xl min-h-[100px]" placeholder="Section content (markdown supported)" data-testid={`nl-section-content-${i}`} />
                </Card>
              ))}
              <Button variant="secondary" className="rounded-xl gap-2 w-full" onClick={addSection} data-testid="nl-add-section"><Plus className="h-4 w-4" /> Add section</Button>

              <Card className="cs-card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">CTA text</label>
                  <Input value={nl.cta_text || ""} onChange={(e) => updateNl({ cta_text: e.target.value })} className="rounded-xl" data-testid="nl-cta-text" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">CTA link</label>
                  <Input value={nl.cta_url || ""} onChange={(e) => updateNl({ cta_url: e.target.value })} className="rounded-xl" data-testid="nl-cta-url" />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="pt-3">
              <Card className="cs-card p-6">
                <div className="text-center border-b border-border pb-4 mb-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Story Stream</div>
                  <h2 className="font-display text-2xl font-semibold mt-1">{nl.subject}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{nl.preheader}</p>
                </div>
                {(nl.sections || []).map((s, i) => (
                  <div key={i} className="mb-5">
                    {s.heading && <h3 className="font-display text-lg font-semibold mb-1">{s.heading}</h3>}
                    <MarkdownPreview content={s.content} />
                  </div>
                ))}
                {nl.cta_text && (
                  <div className="text-center mt-6">
                    <span className="inline-block rounded-xl bg-primary px-6 py-3 text-primary-foreground font-medium">{nl.cta_text}</span>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <QualityScorePanel score={content.quality_score} loading={scoring} onScore={handleScore} />
        </div>
      </div>

      <ExportModal open={exportOpen} onOpenChange={setExportOpen} content={content} />
    </div>
  );
}
