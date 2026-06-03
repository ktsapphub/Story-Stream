import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tag, Plus, Trash2, Save, Sparkles, Loader2, Wand2, Hash,
} from "lucide-react";
import { toast } from "sonner";
import {
  listTopics, createTopic, updateTopic, deleteTopic, deriveTopics, describeTopic, listKnowledge,
} from "@/lib/api";

const TopicCard = ({ topic, onChanged }) => {
  const [name, setName] = useState(topic.name);
  const [description, setDescription] = useState(topic.description || "");
  const [saving, setSaving] = useState(false);
  const [describing, setDescribing] = useState(false);

  useEffect(() => { setName(topic.name); setDescription(topic.description || ""); }, [topic.id]);

  const dirty = name !== topic.name || description !== (topic.description || "");

  const save = async () => {
    setSaving(true);
    try { await updateTopic(topic.id, { name, description }); toast.success("Topic saved"); onChanged(); }
    catch (e) { toast.error(e.response?.data?.detail || "Save failed"); }
    finally { setSaving(false); }
  };

  const autoDescribe = async () => {
    setDescribing(true);
    try {
      const updated = await describeTopic(topic.id);
      setDescription(updated.description || "");
      toast.success("Description generated");
      onChanged();
    } catch (e) { toast.error(e.response?.data?.detail || "Could not generate"); }
    finally { setDescribing(false); }
  };

  const remove = async () => { await deleteTopic(topic.id); toast.success("Topic removed"); onChanged(); };

  return (
    <Card className="cs-card p-4 space-y-3" data-testid={`topic-card-${topic.id}`}>
      <div className="flex items-center gap-2">
        <Hash className="h-4 w-4 text-primary shrink-0" />
        <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl font-medium" data-testid={`topic-name-${topic.id}`} />
        <span className={`cs-badge ${topic.source === "derived" ? "badge-newsletter" : "badge-blog"}`} data-testid={`topic-source-${topic.id}`}>
          {topic.source === "derived" ? "derived" : "user"}
        </span>
      </div>
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Add a description, or auto-generate one from a source..."
        className="rounded-xl min-h-[70px] text-sm"
        data-testid={`topic-description-${topic.id}`}
      />
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" className="gap-1 rounded-lg" onClick={autoDescribe} disabled={describing} data-testid={`topic-autodescribe-${topic.id}`}>
          {describing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Auto-describe
        </Button>
        <div className="flex items-center gap-1">
          <Button size="sm" className="gap-1 rounded-lg" onClick={save} disabled={!dirty || saving} data-testid={`topic-save-${topic.id}`}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </Button>
          <Button size="icon" variant="ghost" onClick={remove} data-testid={`topic-delete-${topic.id}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </div>
    </Card>
  );
};

export const TopicsManager = () => {
  const [topics, setTopics] = useState([]);
  const [sources, setSources] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [adding, setAdding] = useState(false);
  const [deriveSource, setDeriveSource] = useState("");
  const [deriving, setDeriving] = useState(false);

  const load = () => listTopics().then(setTopics).catch(() => {});
  useEffect(() => { load(); listKnowledge().then(setSources).catch(() => {}); }, []);

  const add = async () => {
    if (!name.trim()) return;
    setAdding(true);
    try {
      await createTopic(name.trim(), description.trim());
      toast.success("Topic added");
      setName(""); setDescription("");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Could not add topic"); }
    finally { setAdding(false); }
  };

  const derive = async () => {
    if (!deriveSource) { toast.message("Pick a source to derive topics from"); return; }
    setDeriving(true);
    try {
      const res = await deriveTopics({ source_id: deriveSource });
      toast.success(`Added ${res.added.length} topic${res.added.length === 1 ? "" : "s"}${res.skipped ? `, ${res.skipped} already existed` : ""}`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Could not derive topics"); }
    finally { setDeriving(false); }
  };

  return (
    <div className="space-y-5">
      {/* Add + derive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="cs-card p-4 sm:p-5 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Add a topic</h3>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Topic name (e.g. Stargazing date nights)" className="rounded-xl" data-testid="topic-add-name-input" />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional) — type your own or auto-derive later" className="rounded-xl min-h-[70px]" data-testid="topic-add-description-input" />
          <Button onClick={add} disabled={adding || !name.trim()} className="rounded-xl gap-2 w-full" data-testid="topic-add-button">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add topic
          </Button>
        </Card>

        <Card className="cs-card p-4 sm:p-5 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4" /> Derive topics from a source</h3>
          <p className="text-xs text-muted-foreground">Auto-extract topics and descriptions from one of your knowledge-base sources.</p>
          <Select value={deriveSource} onValueChange={setDeriveSource}>
            <SelectTrigger className="rounded-xl" data-testid="topic-derive-source-select"><SelectValue placeholder="Choose a source..." /></SelectTrigger>
            <SelectContent>
              {sources.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No sources yet</div>
              ) : sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={derive} disabled={deriving || !deriveSource} variant="secondary" className="rounded-xl gap-2 w-full" data-testid="topic-derive-button">
            {deriving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Derive topics
          </Button>
        </Card>
      </div>

      {/* List */}
      {topics.length === 0 ? (
        <Card className="cs-card border-dashed p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <Tag className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No topics yet. Add one above or derive them from a source.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="topics-list">
          {topics.map((t) => <TopicCard key={t.id} topic={t} onChanged={load} />)}
        </div>
      )}
    </div>
  );
};
