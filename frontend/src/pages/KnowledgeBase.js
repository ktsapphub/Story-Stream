import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Link2, Upload, Trash2, Loader2, BookOpen, FileText, Globe, Eye, Library, Tags,
} from "lucide-react";
import { toast } from "sonner";
import { listKnowledge, addKnowledgeUrl, uploadKnowledge, deleteKnowledge, getKnowledge } from "@/lib/api";
import { TopicsManager } from "@/components/TopicsManager";

export default function KnowledgeBase() {
  const [items, setItems] = useState([]);
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [detail, setDetail] = useState(null);
  const fileRef = useRef(null);

  const load = () => listKnowledge().then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  const addUrl = async () => {
    if (!url.trim()) return;
    setAdding(true);
    try { await addKnowledgeUrl(url.trim()); toast.success("Source analyzed & added"); setUrl(""); load(); }
    catch (e) { toast.error("Could not add: " + (e.response?.data?.detail || e.message)); }
    finally { setAdding(false); }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { await uploadKnowledge(file); toast.success("Document analyzed & added"); load(); }
    catch (e2) { toast.error("Could not process: " + (e2.response?.data?.detail || e2.message)); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const remove = async (id) => { await deleteKnowledge(id); toast.success("Removed"); load(); };
  const openDetail = async (id) => { try { const d = await getKnowledge(id); setDetail(d); } catch { toast.error("Could not load"); } };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">Knowledge Base</h1>
        <p className="text-muted-foreground mt-1">Add successful articles and reference docs. Use them to generate look-alike, on-brand content.</p>
      </div>

      <Tabs defaultValue="sources" data-testid="knowledge-base-main-tabs">
        <TabsList className="rounded-xl">
          <TabsTrigger value="sources" className="rounded-lg gap-1.5" data-testid="kb-main-tab-sources"><Library className="h-4 w-4" /> Sources</TabsTrigger>
          <TabsTrigger value="topics" className="rounded-lg gap-1.5" data-testid="kb-main-tab-topics"><Tags className="h-4 w-4" /> Topics</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="pt-4 space-y-5">
          <Card className="cs-card p-4 sm:p-5">
        <Tabs defaultValue="url" data-testid="knowledge-base-tabs">
          <TabsList className="rounded-xl">
            <TabsTrigger value="url" className="rounded-lg" data-testid="kb-tab-url">Add URL</TabsTrigger>
            <TabsTrigger value="doc" className="rounded-lg" data-testid="kb-tab-doc">Upload Document</TabsTrigger>
          </TabsList>
          <TabsContent value="url" className="pt-4">
            <div className="flex gap-2">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/great-article" className="rounded-xl" data-testid="knowledge-base-add-url-input" onKeyDown={(e) => e.key === "Enter" && addUrl()} />
              <Button onClick={addUrl} disabled={adding || !url.trim()} className="rounded-xl gap-2" data-testid="knowledge-base-add-url-button">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Analyze & add
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="doc" className="pt-4">
            <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/40 p-8 cursor-pointer hover:bg-secondary/60 transition-colors">
              {uploading ? <Loader2 className="h-7 w-7 animate-spin text-primary" /> : <Upload className="h-7 w-7 text-primary" />}
              <span className="text-sm text-muted-foreground">Upload PDF, DOCX, TXT, or MD reference document</span>
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,.txt,.md,.csv" onChange={onUpload} data-testid="knowledge-base-upload-input" />
            </label>
          </TabsContent>
        </Tabs>
      </Card>

      {items.length === 0 ? (
        <Card className="cs-card border-dashed p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No knowledge sources yet. Add a URL or document above.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="knowledge-base-sources-table">
          {items.map((s) => (
            <Card key={s.id} className="cs-card p-4 space-y-3" data-testid={`kb-source-${s.id}`}>
              <div className="flex items-start gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  {s.type === "url" ? <Globe className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium line-clamp-1">{s.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{s.source_url || s.original_filename}</div>
                </div>
                <Badge className="rounded-full" style={{ background: "hsl(168 35% 90%)", color: "hsl(168 35% 28%)" }}>{s.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{s.summary}</p>
              <div className="flex flex-wrap gap-1">
                {(s.topics || []).slice(0, 4).map((t, i) => (
                  <Badge key={i} variant="secondary" className="rounded-full text-[10px]">{t}</Badge>
                ))}
              </div>
              <div className="flex justify-end gap-1 pt-1">
                <Button variant="ghost" size="sm" className="gap-1 rounded-lg" onClick={() => openDetail(s.id)} data-testid={`kb-view-${s.id}`}><Eye className="h-4 w-4" /> View</Button>
                <Button variant="ghost" size="icon" onClick={() => remove(s.id)} data-testid={`kb-delete-${s.id}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
        </TabsContent>

        <TabsContent value="topics" className="pt-4">
          <TopicsManager />
        </TabsContent>
      </Tabs>

      <Sheet open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display">{detail.title}</SheetTitle>
                <SheetDescription>{detail.source_url || detail.original_filename}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1">Summary</h4>
                  <p className="text-sm text-muted-foreground">{detail.summary}</p>
                </div>
                {detail.tone && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Tone & style</h4>
                    <p className="text-sm text-muted-foreground">{detail.tone}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold mb-1">Key topics</h4>
                  <div className="flex flex-wrap gap-1">
                    {(detail.topics || []).map((t, i) => <Badge key={i} variant="secondary" className="rounded-full">{t}</Badge>)}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">Extracted content</h4>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-[20]">{detail.content?.slice(0, 2000)}</p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
