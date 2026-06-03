import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sparkles, BookOpen, Loader2 } from "lucide-react";
import { listKnowledge } from "@/lib/api";
import { providerOf } from "@/lib/ui";
import { TopicSelector } from "@/components/TopicSelector";

const PROVIDER_DOT = { openai: "--accent-openai", anthropic: "--accent-anthropic", gemini: "--accent-gemini" };

const TONES = ["warm and engaging", "playful and fun", "professional", "romantic", "inspirational", "conversational"];

export const PromptComposer = ({
  models = [], defaultModel, loading, onGenerate, kind = "blog",
}) => {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(defaultModel || "");
  const [tone, setTone] = useState(TONES[0]);
  const [length, setLength] = useState("medium");
  const [mode, setMode] = useState("single");
  const [sources, setSources] = useState([]);
  const [selected, setSelected] = useState([]);
  const [focusTopics, setFocusTopics] = useState([]);

  useEffect(() => { if (defaultModel && !model) setModel(defaultModel); }, [defaultModel]);
  useEffect(() => { listKnowledge().then(setSources).catch(() => {}); }, []);

  const topics = prompt.split("\n").map((t) => t.trim()).filter(Boolean);

  const submit = () => {
    if (mode === "batch" && kind === "blog") {
      onGenerate({ mode: "batch", topics, model_key: model, tone, length, reference_source_ids: selected, focusTopics });
    } else {
      onGenerate({ mode: "single", topic: prompt.trim(), model_key: model, tone, length, reference_source_ids: selected, focusTopics });
    }
  };

  const toggleSource = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const disabled = loading || (mode === "batch" ? topics.length === 0 : !prompt.trim());

  return (
    <Card className="cs-card p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="section-title text-lg font-semibold">
          {kind === "blog" ? "Generate a blog post" : "Generate a newsletter"}
        </h3>
        {kind === "blog" && (
          <Tabs value={mode} onValueChange={setMode} data-testid="prompt-composer-mode-tabs">
            <TabsList className="rounded-xl">
              <TabsTrigger value="single" className="rounded-lg" data-testid="mode-single">Single</TabsTrigger>
              <TabsTrigger value="batch" className="rounded-lg" data-testid="mode-batch">Batch</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      <Textarea
        data-testid="prompt-composer-textarea"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={
          mode === "batch"
            ? "Enter one topic per line to generate multiple posts at once...\nRomantic picnic ideas for spring\nBest board games for date night"
            : kind === "blog"
            ? "Describe the blog post you want — e.g. 'Creative at-home date night ideas on a budget'"
            : "Describe the newsletter you want to write..."
        }
        className="min-h-[120px] rounded-xl resize-y"
      />

      {mode === "batch" && (
        <div className="text-xs text-muted-foreground">
          {topics.length} topic{topics.length === 1 ? "" : "s"} • up to 10 at a time
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">AI Model</label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="rounded-xl" data-testid="prompt-composer-model-select"><SelectValue placeholder="Model" /></SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.key} value={m.key}>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: `hsl(var(${PROVIDER_DOT[providerOf(m.key)]}))` }} />
                    {m.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Tone</label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="rounded-xl" data-testid="prompt-composer-tone-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {kind === "blog" ? (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Length</label>
            <Select value={length} onValueChange={setLength}>
              <SelectTrigger className="rounded-xl" data-testid="prompt-composer-length-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="long">Long</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : <div />}
      </div>

      <TopicSelector value={focusTopics} onChange={setFocusTopics} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="rounded-xl gap-2" data-testid="prompt-composer-references-button">
              <BookOpen className="h-4 w-4" />
              References {selected.length > 0 && <Badge className="ml-1">{selected.length}</Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="text-sm font-medium mb-2">Knowledge sources for look-alike content</div>
            {sources.length === 0 ? (
              <div className="text-xs text-muted-foreground">No sources yet. Add some in Knowledge Base.</div>
            ) : (
              <div className="max-h-56 overflow-auto space-y-2">
                {sources.map((s) => (
                  <label key={s.id} className="flex items-start gap-2 text-sm cursor-pointer">
                    <Checkbox checked={selected.includes(s.id)} onCheckedChange={() => toggleSource(s.id)} data-testid={`reference-source-${s.id}`} />
                    <span className="line-clamp-2">{s.title}</span>
                  </label>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Button onClick={submit} disabled={disabled} className="rounded-xl gap-2" data-testid="prompt-composer-generate-button">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Generating..." : mode === "batch" ? `Generate ${topics.length || ""} posts` : "Generate"}
        </Button>
      </div>
    </Card>
  );
};
