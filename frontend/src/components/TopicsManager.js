import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tags, Plus, Pencil, Trash2, Loader2, Sparkles, User, Wand2, Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  listTopics, createTopic, updateTopic, deleteTopic, deriveTopics, describeTopic, listKnowledge,
} from "@/lib/api";

const NONE = "__none__";

const SourceBadge = ({ source }) =>
  source === "derived" ? (
    <Badge className="rounded-full gap-1 border-transparent" style={{ background: "hsl(255 88% 66% / 0.12)", color: "hsl(255 60% 46%)" }} data-testid="topic-source-ai">
      <Sparkles className="h-3 w-3" /> AI-derived
    </Badge>
  ) : (
    <Badge variant="secondary" className="rounded-full gap-1" data-testid="topic-source-user">
      <User className="h-3 w-3" /> Written
    </Badge>
  );

export const TopicsManager = () => {
  const [topics, setTopics] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addAi, setAddAi] = useState(false);
  const [addDesc, setAddDesc] = useState("");
  const [addSource, setAddSource] = useState(NONE);
  const [saving, setSaving] = useState(false);

  // edit dialog
  const [editTopic, setEditTopic] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAi, setEditAi] = useState(false);
  const [editSource, setEditSource] = useState(NONE);
  const [regening, setRegening] = useState(false);

  // derive dialog
  const [deriveOpen, setDeriveOpen] = useState(false);
  const [deriveMode, setDeriveMode] = useState("source"); // source | text
  const [deriveSource, setDeriveSource] = useState(NONE);
  const [deriveText, setDeriveText] = useState("");
  const [deriveCount, setDeriveCount] = useState(8);
  const [deriving, setDeriving] = useState(false);

  const load = () => {
    setLoading(true);
    return listTopics()
      .then((d) => setTopics(d || []))
      .catch(() => toast.error("Could not load topics"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    listKnowledge().then(setSources).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter(
      (t) => t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q)
    );
  }, [topics, search]);

  // ---- add ----
  const resetAdd = () => { setAddName(""); setAddAi(false); setAddDesc(""); setAddSource(NONE); };
  const submitAdd = async () => {
    const name = addName.trim();
    if (!name) { toast.error("Topic name is required"); return; }
    setSaving(true);
    try {
      const created = await createTopic(name, addAi ? "" : addDesc.trim());
      if (addAi) {
        try {
          await describeTopic(created.id, addSource === NONE ? null : addSource);
        } catch {
          toast.error("Topic added, but AI description failed. You can regenerate later.");
        }
      }
      toast.success("Topic added");
      setAddOpen(false);
      resetAdd();
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not add topic");
    } finally {
      setSaving(false);
    }
  };

  // ---- edit ----
  const openEdit = (t) => {
    setEditTopic(t);
    setEditName(t.name);
    setEditDesc(t.description || "");
    setEditAi(t.source === "derived");
    setEditSource(NONE);
  };
  const regenDescription = async () => {
    if (!editTopic) return;
    setRegening(true);
    try {
      const updated = await describeTopic(editTopic.id, editSource === NONE ? null : editSource);
      setEditDesc(updated.description || "");
      toast.success("Description generated");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not generate description");
    } finally {
      setRegening(false);
    }
  };
  const submitEdit = async () => {
    if (!editTopic) return;
    const name = editName.trim();
    if (!name) { toast.error("Topic name is required"); return; }
    setSaving(true);
    try {
      await updateTopic(editTopic.id, { name, description: editDesc.trim() });
      toast.success("Topic updated");
      setEditTopic(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not update topic");
    } finally {
      setSaving(false);
    }
  };

  // ---- delete ----
  const remove = async (t) => {
    try { await deleteTopic(t.id); toast.success("Topic removed"); load(); }
    catch { toast.error("Could not remove topic"); }
  };

  // ---- derive (bulk) ----
  const submitDerive = async () => {
    const payload = { count: deriveCount };
    if (deriveMode === "source") {
      if (deriveSource === NONE) { toast.error("Choose a knowledge source"); return; }
      payload.source_id = deriveSource;
    } else {
      if (!deriveText.trim()) { toast.error("Paste some text to derive topics from"); return; }
      payload.text = deriveText.trim();
    }
    setDeriving(true);
    try {
      const res = await deriveTopics(payload);
      const added = res.added?.length || 0;
      toast.success(`${added} topic${added === 1 ? "" : "s"} added${res.skipped ? `, ${res.skipped} skipped (duplicates)` : ""}`);
      setDeriveOpen(false);
      setDeriveText("");
      setDeriveSource(NONE);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not derive topics");
    } finally {
      setDeriving(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="topics-manager">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topics..."
            className="rounded-xl pl-9"
            data-testid="topics-search-input"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl gap-2" onClick={() => setDeriveOpen(true)} data-testid="topics-derive-button">
            <Wand2 className="h-4 w-4" /> Derive with AI
          </Button>
          <Button className="rounded-xl gap-2" onClick={() => { resetAdd(); setAddOpen(true); }} data-testid="topics-add-button">
            <Plus className="h-4 w-4" /> Add topic
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <Card key={i} className="cs-card p-4 h-32 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="cs-card border-dashed p-12 text-center" data-testid="topics-empty">
          <div className="flex flex-col items-center gap-3">
            <Tags className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              {search ? "No topics match your search." : "No topics yet. Add one or derive topics from your sources."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="topics-grid">
          {filtered.map((t) => (
            <Card key={t.id} className="cs-card p-4 flex flex-col gap-3" data-testid={`topic-card-${t.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium leading-snug line-clamp-2" data-testid={`topic-name-${t.id}`}>{t.name}</div>
                <SourceBadge source={t.source} />
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3 min-h-[1.25rem]" data-testid={`topic-desc-${t.id}`}>
                {t.description || <span className="italic opacity-70">No description yet.</span>}
              </p>
              <div className="flex justify-end gap-1 pt-1 mt-auto">
                <Button variant="ghost" size="sm" className="gap-1 rounded-lg" onClick={() => openEdit(t)} data-testid={`topic-edit-${t.id}`}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(t)} data-testid={`topic-delete-${t.id}`}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md" data-testid="topic-add-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Add topic</DialogTitle>
            <DialogDescription>Create a reusable topic to steer your content generation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="add-topic-name">Topic name</Label>
              <Input id="add-topic-name" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. Cozy winter date nights" className="rounded-xl" data-testid="topic-add-name-input" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                {addAi ? <Sparkles className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-muted-foreground" />}
                <Label htmlFor="add-ai-toggle" className="cursor-pointer">{addAi ? "AI-derived description" : "Write it myself"}</Label>
              </div>
              <Switch id="add-ai-toggle" checked={addAi} onCheckedChange={setAddAi} data-testid="topic-add-ai-toggle" />
            </div>
            {addAi ? (
              <div className="space-y-1.5">
                <Label>Context source <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Select value={addSource} onValueChange={setAddSource}>
                  <SelectTrigger className="rounded-xl" data-testid="topic-add-source-select"><SelectValue placeholder="Topic name only" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Topic name only</SelectItem>
                    {sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">AI will write a description when you add the topic.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="add-topic-desc">Description</Label>
                <Textarea id="add-topic-desc" value={addDesc} onChange={(e) => setAddDesc(e.target.value)} placeholder="Describe what this topic is about..." className="rounded-xl min-h-[90px]" data-testid="topic-add-desc-input" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setAddOpen(false)} data-testid="topic-add-cancel">Cancel</Button>
            <Button className="rounded-xl gap-2" onClick={submitAdd} disabled={saving} data-testid="topic-add-submit">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add topic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTopic} onOpenChange={(v) => !v && setEditTopic(null)}>
        <DialogContent className="sm:max-w-md" data-testid="topic-edit-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Edit topic</DialogTitle>
            <DialogDescription>Update the name or description for this topic.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="edit-topic-name">Topic name</Label>
              <Input id="edit-topic-name" value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded-xl" data-testid="topic-edit-name-input" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                {editAi ? <Sparkles className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-muted-foreground" />}
                <Label htmlFor="edit-ai-toggle" className="cursor-pointer">{editAi ? "AI-derived description" : "Write it myself"}</Label>
              </div>
              <Switch id="edit-ai-toggle" checked={editAi} onCheckedChange={setEditAi} data-testid="topic-edit-ai-toggle" />
            </div>
            {editAi && (
              <div className="space-y-1.5">
                <Label>Context source <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <div className="flex gap-2">
                  <Select value={editSource} onValueChange={setEditSource}>
                    <SelectTrigger className="rounded-xl" data-testid="topic-edit-source-select"><SelectValue placeholder="Topic name only" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Topic name only</SelectItem>
                      {sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="rounded-xl gap-2 shrink-0" onClick={regenDescription} disabled={regening} data-testid="topic-edit-regen">
                    {regening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Generate
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="edit-topic-desc">Description</Label>
              <Textarea id="edit-topic-desc" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Describe what this topic is about..." className="rounded-xl min-h-[100px]" data-testid="topic-edit-desc-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditTopic(null)} data-testid="topic-edit-cancel">Cancel</Button>
            <Button className="rounded-xl gap-2" onClick={submitEdit} disabled={saving} data-testid="topic-edit-submit">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />} Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Derive dialog */}
      <Dialog open={deriveOpen} onOpenChange={setDeriveOpen}>
        <DialogContent className="sm:max-w-md" data-testid="topic-derive-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Derive topics with AI</DialogTitle>
            <DialogDescription>Generate multiple topics (name + description) from a source or pasted text.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="flex gap-2">
              <Button variant={deriveMode === "source" ? "default" : "outline"} className="rounded-xl flex-1" onClick={() => setDeriveMode("source")} data-testid="derive-mode-source">From source</Button>
              <Button variant={deriveMode === "text" ? "default" : "outline"} className="rounded-xl flex-1" onClick={() => setDeriveMode("text")} data-testid="derive-mode-text">Paste text</Button>
            </div>
            {deriveMode === "source" ? (
              <div className="space-y-1.5">
                <Label>Knowledge source</Label>
                <Select value={deriveSource} onValueChange={setDeriveSource}>
                  <SelectTrigger className="rounded-xl" data-testid="derive-source-select"><SelectValue placeholder="Choose a source" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE} disabled>Choose a source</SelectItem>
                    {sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                  </SelectContent>
                </Select>
                {sources.length === 0 && <p className="text-xs text-muted-foreground">No sources yet. Add one in the Sources tab, or paste text instead.</p>}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="derive-text">Source text</Label>
                <Textarea id="derive-text" value={deriveText} onChange={(e) => setDeriveText(e.target.value)} placeholder="Paste an article, notes, or any reference text..." className="rounded-xl min-h-[120px]" data-testid="derive-text-input" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="derive-count">Number of topics: <span className="text-primary font-semibold">{deriveCount}</span></Label>
              <input id="derive-count" type="range" min="1" max="15" value={deriveCount} onChange={(e) => setDeriveCount(Number(e.target.value))} className="w-full accent-primary" data-testid="derive-count-slider" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeriveOpen(false)} data-testid="derive-cancel">Cancel</Button>
            <Button className="rounded-xl gap-2" onClick={submitDerive} disabled={deriving} data-testid="derive-submit">
              {deriving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Derive topics
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
