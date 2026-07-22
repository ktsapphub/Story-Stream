import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Save, Download, Mail, ImagePlus, Plus, Loader2, ArrowLeft,
  CheckCircle2, XCircle, Image as ImageIcon, Sparkles, Layers,
} from "lucide-react";
import { toast } from "sonner";
import { PromptComposer } from "@/components/PromptComposer";
import { QualityScorePanel } from "@/components/QualityScorePanel";
import { MediaInsertDialog } from "@/components/MediaInsertDialog";
import { ExportModal } from "@/components/ExportModal";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import {
  getModels, generateBlog, generateBatch, getJob, getContent, saveContent,
  scoreContent, newsletterFromBlog, generateImage, absUrl,
} from "@/lib/api";
import { statusBadgeClass, providerBadgeClass, providerOf, providerLabel, itemStatusClass } from "@/lib/ui";

export default function BlogStudio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [defaultModel, setDefaultModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState(null);
  const [tagsStr, setTagsStr] = useState("");
  const [job, setJob] = useState(null);
  const [scoring, setScoring] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState("body");
  const [exportOpen, setExportOpen] = useState(false);
  const [headerLoading, setHeaderLoading] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    getModels().then((d) => { setModels(d.models); setDefaultModel(d.default); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (id) {
      getContent(id).then((c) => {
        setContent(c);
        setTagsStr((c.tags || []).join(", "));
      }).catch(() => toast.error("Could not load content"));
    } else {
      setContent(null);
      setTagsStr("");
      setJob(null);
    }
  }, [id]);

  // Poll batch job
  useEffect(() => {
    if (!job || job.status === "done") return;
    const t = setInterval(async () => {
      try {
        const j = await getJob(job.id);
        setJob(j);
        if (j.status === "done") clearInterval(t);
      } catch { clearInterval(t); }
    }, 2500);
    return () => clearInterval(t);
  }, [job?.id, job?.status]);

  const handleGenerate = async (payload) => {
    setLoading(true);
    try {
      if (payload.mode === "batch") {
        const j = await generateBatch({
          topics: payload.topics, model_key: payload.model_key,
          tone: payload.tone, length: payload.length,
          reference_source_ids: payload.reference_source_ids,
          focus_topics: payload.focusTopics || [],
        });
        setJob(j);
        toast.success(`Generating ${j.total} posts...`);
      } else {
        const c = await generateBlog({
          topic: payload.topic, model_key: payload.model_key,
          tone: payload.tone, length: payload.length,
          reference_source_ids: payload.reference_source_ids,
          topics: payload.focusTopics || [],
        });
        toast.success("Blog generated!");
        navigate(`/blog/${c.id}`);
      }
    } catch (e) {
      toast.error("Generation failed: " + (e.response?.data?.detail || e.message));
    } finally { setLoading(false); }
  };

  const update = (patch) => setContent((c) => ({ ...c, ...patch }));

  const persist = async (extra = {}) => {
    const payload = {
      ...content,
      tags: tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
      ...extra,
    };
    const saved = await saveContent(payload);
    setContent(saved);
    setTagsStr((saved.tags || []).join(", "));
    return saved;
  };

  const handleSave = async () => {
    try { await persist(); toast.success("Saved"); }
    catch { toast.error("Save failed"); }
  };

  const handleScore = async () => {
    if (!content?.id) return;
    setScoring(true);
    try {
      await persist();
      const result = await scoreContent({ content_id: content.id });
      update({ quality_score: result });
      toast.success(`Scored: ${result.overall_score}/100`);
    } catch { toast.error("Scoring failed"); }
    finally { setScoring(false); }
  };

  const handleConvert = async () => {
    if (!content?.id) return;
    setLoading(true);
    try {
      await persist();
      const nl = await newsletterFromBlog({ blog_content_id: content.id });
      toast.success("Converted to newsletter!");
      navigate(`/newsletter/${nl.id}`);
    } catch { toast.error("Conversion failed"); }
    finally { setLoading(false); }
  };

  const insertIntoBody = useCallback((snippet) => {
    const el = bodyRef.current;
    const body = content?.body_markdown || "";
    if (el && typeof el.selectionStart === "number") {
      const pos = el.selectionStart;
      update({ body_markdown: body.slice(0, pos) + snippet + body.slice(pos) });
    } else {
      update({ body_markdown: body + snippet });
    }
  }, [content]);

  const onMediaInsert = (snippet, media) => {
    if (mediaTarget === "header") {
      update({ header_image: { media_id: media.id, url: absUrl(media.url) } });
      toast.success("Header image set");
    } else {
      insertIntoBody(snippet);
      toast.success("Media inserted");
    }
  };

  const generateHeaderFromPrompt = async () => {
    const prompt = content?.image_prompts?.[0] || content?.title;
    if (!prompt) return;
    setHeaderLoading(true);
    try {
      const media = await generateImage({ prompt });
      update({ header_image: { media_id: media.id, url: absUrl(media.url) } });
      toast.success("Header image generated");
    } catch { toast.error("Image generation failed"); }
    finally { setHeaderLoading(false); }
  };

  // ---------- Render: compose / batch ----------
  if (!content) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Blog Studio</h1>
          <p className="text-muted-foreground mt-1">Describe what you want and let AI craft an on-brand blog post.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PromptComposer models={models} defaultModel={defaultModel} loading={loading} onGenerate={handleGenerate} kind="blog" />

          {job ? (
            <Card className="cs-card p-5" data-testid="batch-queue-list">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2"><Layers className="h-4 w-4" /> Batch generation</h3>
                <span className="cs-badge badge-queued">{job.completed}/{job.total}</span>
              </div>
              <Progress value={(job.completed / job.total) * 100} className="mb-4" />
              <div className="space-y-2 max-h-[360px] overflow-auto">
                {job.items.map((it) => (
                  <div key={it.index} className="flex items-center gap-3 rounded-xl border border-border p-3" data-testid="batch-queue-item">
                    <div className="shrink-0">
                      {it.status === "complete" ? <CheckCircle2 className="h-5 w-5 text-[hsl(168_35%_34%)]" />
                        : it.status === "failed" ? <XCircle className="h-5 w-5 text-destructive" />
                        : <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{it.title || it.topic}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`cs-badge ${itemStatusClass(it.status)}`}>{it.status}</span>
                        {it.status === "complete" && it.score != null && (
                          <span className="cs-badge badge-published" data-testid={`batch-score-${it.index}`}>Score {it.score}/100</span>
                        )}
                      </div>
                    </div>
                    {it.status === "complete" && (
                      <Button size="sm" variant="secondary" className="rounded-lg" onClick={() => navigate(`/blog/${it.content_id}`)} data-testid={`batch-open-${it.index}`}>Open</Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ) : loading ? (
            <Card className="cs-card p-5 space-y-3">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </Card>
          ) : (
            <Card className="cs-card border-dashed p-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary"><Sparkles className="h-6 w-6 text-primary" /></div>
              <p className="text-muted-foreground max-w-xs">Your generated post will appear here, ready to edit, score, and export.</p>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // ---------- Render: editor ----------
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/blog")} data-testid="editor-back-button"><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-semibold truncate">{content.title || "Untitled"}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`cs-badge ${statusBadgeClass(content.status)}`} data-testid="status-badge">{content.status}</span>
            {content.model_used && <span className={`cs-badge ${providerBadgeClass(content.model_used)}`} data-testid="model-provider-chip">{providerLabel[providerOf(content.model_used)]} · {content.model_used}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="rounded-xl gap-2" onClick={handleConvert} disabled={loading} data-testid="convert-newsletter-button"><Mail className="h-4 w-4" /> To Newsletter</Button>
          <Button variant="secondary" className="rounded-xl gap-2" onClick={() => setExportOpen(true)} data-testid="open-export-button"><Download className="h-4 w-4" /> Export</Button>
          <Button className="rounded-xl gap-2" onClick={handleSave} data-testid="save-button"><Save className="h-4 w-4" /> Save</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header image */}
          <Card className="cs-card overflow-hidden">
            {content.header_image?.url ? (
              <div className="relative">
                <img src={absUrl(content.header_image.url)} alt="header" className="w-full max-h-64 object-cover" data-testid="header-image" />
                <div className="absolute right-3 top-3 flex gap-2">
                  <Button size="sm" variant="secondary" className="rounded-lg gap-1" onClick={() => { setMediaTarget("header"); setMediaOpen(true); }} data-testid="change-header-button"><ImagePlus className="h-4 w-4" /> Change</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-8 bg-secondary/30">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No header image yet</p>
                <div className="flex gap-2">
                  <Button size="sm" className="rounded-xl gap-2" onClick={generateHeaderFromPrompt} disabled={headerLoading} data-testid="generate-header-button">
                    {headerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate
                  </Button>
                  <Button size="sm" variant="secondary" className="rounded-xl gap-2" onClick={() => { setMediaTarget("header"); setMediaOpen(true); }} data-testid="add-header-button"><ImagePlus className="h-4 w-4" /> Upload / URL</Button>
                </div>
              </div>
            )}
          </Card>

          <Card className="cs-card p-4 sm:p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
              <Input value={content.title || ""} onChange={(e) => update({ title: e.target.value })} className="rounded-xl font-display text-lg" data-testid="edit-title" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Meta description</label>
              <Textarea value={content.meta_description || ""} onChange={(e) => update({ meta_description: e.target.value })} className="rounded-xl min-h-[52px]" data-testid="edit-meta" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags (comma separated)</label>
                <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} className="rounded-xl" data-testid="edit-tags" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Excerpt</label>
                <Input value={content.excerpt || ""} onChange={(e) => update({ excerpt: e.target.value })} className="rounded-xl" data-testid="edit-excerpt" />
              </div>
            </div>
          </Card>

          <Card className="cs-card p-4 sm:p-5">
            <Tabs defaultValue="write">
              <div className="flex items-center justify-between mb-3">
                <TabsList className="rounded-xl">
                  <TabsTrigger value="write" className="rounded-lg" data-testid="rich-editor-write-tab">Write</TabsTrigger>
                  <TabsTrigger value="preview" className="rounded-lg" data-testid="rich-editor-preview-tab">Preview</TabsTrigger>
                </TabsList>
                <Button size="sm" variant="secondary" className="rounded-xl gap-2" onClick={() => { setMediaTarget("body"); setMediaOpen(true); }} data-testid="insert-media-button"><Plus className="h-4 w-4" /> Insert media</Button>
              </div>
              <TabsContent value="write">
                <Textarea ref={bodyRef} value={content.body_markdown || ""} onChange={(e) => update({ body_markdown: e.target.value })} className="rounded-xl min-h-[440px] font-mono text-sm leading-6" data-testid="rich-editor" />
              </TabsContent>
              <TabsContent value="preview">
                <div className="min-h-[440px] rounded-xl border border-border p-5">
                  <MarkdownPreview content={content.body_markdown} />
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Inspector */}
        <div className="space-y-4">
          <QualityScorePanel score={content.quality_score} loading={scoring} onScore={handleScore} />
          {content.image_prompts?.length > 0 && (
            <Card className="cs-card p-4 sm:p-5">
              <h3 className="text-sm font-semibold mb-2">Suggested image ideas</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {content.image_prompts.map((p, i) => (
                  <li key={i} className="flex gap-2"><span className="text-primary">{i + 1}.</span><span>{p}</span></li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <MediaInsertDialog open={mediaOpen} onOpenChange={setMediaOpen} onInsert={onMediaInsert} />
      <ExportModal open={exportOpen} onOpenChange={setExportOpen} content={content} />
    </div>
  );
}
