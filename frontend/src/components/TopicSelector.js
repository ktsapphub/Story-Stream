import React, { useEffect, useRef, useState } from "react";
import { X, Tag, Plus } from "lucide-react";
import { getKnowledgeTopics } from "@/lib/api";

/**
 * Type-or-select topic chooser. Suggestions come from the user's knowledge base
 * topics; users can also type a custom topic and press Enter to add it.
 * `value` is string[], `onChange(string[])`.
 */
export const TopicSelector = ({ value = [], onChange, label = "Knowledge base topics" }) => {
  const [all, setAll] = useState([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    getKnowledgeTopics().then((d) => setAll(d.topics || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const add = (t) => {
    const clean = (t || "").trim();
    if (!clean) return;
    if (!value.some((v) => v.toLowerCase() === clean.toLowerCase())) onChange([...value, clean]);
    setQuery("");
  };
  const remove = (t) => onChange(value.filter((v) => v !== t));

  const suggestions = all
    .filter((t) => !value.some((v) => v.toLowerCase() === t.toLowerCase()))
    .filter((t) => t.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  return (
    <div ref={boxRef} className="relative">
      <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
        <Tag className="h-3.5 w-3.5" /> {label}
      </label>
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-xl border border-input bg-background px-2 py-1.5 min-h-[42px] focus-within:ring-2 focus-within:ring-ring"
        onClick={() => setOpen(true)}
      >
        {value.map((t) => (
          <span key={t} className="cs-badge badge-newsletter gap-1" data-testid={`topic-chip-${t}`}>
            {t}
            <button type="button" onClick={(e) => { e.stopPropagation(); remove(t); }} data-testid={`topic-remove-${t}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(query); }
            else if (e.key === "Backspace" && !query && value.length) remove(value[value.length - 1]);
          }}
          placeholder={value.length ? "" : "Type a topic or pick from your knowledge base..."}
          className="flex-1 min-w-[140px] bg-transparent text-sm outline-none py-1"
          data-testid="topic-selector-input"
        />
      </div>

      {open && (suggestions.length > 0 || query.trim()) && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-border bg-popover shadow-[var(--shadow-md)] p-1 max-h-56 overflow-auto" data-testid="topic-suggestions">
          {query.trim() && !suggestions.some((s) => s.toLowerCase() === query.trim().toLowerCase()) && (
            <button
              type="button"
              onClick={() => add(query)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-[hsl(var(--surface-2))] text-left"
              data-testid="topic-add-custom"
            >
              <Plus className="h-4 w-4 text-primary" /> Add &ldquo;{query.trim()}&rdquo;
            </button>
          )}
          {suggestions.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => add(t)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-[hsl(var(--surface-2))] text-left"
              data-testid={`topic-suggestion-${t}`}
            >
              <Tag className="h-3.5 w-3.5 text-muted-foreground" /> {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
