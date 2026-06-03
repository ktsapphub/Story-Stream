import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download, Copy, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportUrl, fetchExportText } from "@/lib/api";

const FORMATS = [
  { key: "html", label: "HTML", desc: "Standalone styled web page" },
  { key: "markdown", label: "Markdown", desc: "With frontmatter" },
  { key: "wordpress", label: "WordPress-ready", desc: "HTML body + meta for WP" },
  { key: "pdf", label: "PDF", desc: "Printable document" },
  { key: "csv", label: "CSV", desc: "Spreadsheet / newsletter rows" },
  { key: "txt", label: "Plain text", desc: "Raw text" },
];

export const ExportModal = ({ open, onOpenChange, content }) => {
  const [format, setFormat] = useState("html");
  const [busy, setBusy] = useState(false);

  if (!content) return null;

  const download = () => {
    const a = document.createElement("a");
    a.href = exportUrl(content.id, format);
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success(`Exporting as ${format.toUpperCase()}`);
  };

  const copy = async () => {
    if (format === "pdf") { toast.message("PDF can only be downloaded"); return; }
    setBusy(true);
    try {
      const text = await fetchExportText(content.id, format);
      await navigator.clipboard.writeText(typeof text === "string" ? text : JSON.stringify(text));
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]" data-testid="export-modal">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2"><FileText className="h-5 w-5" /> Export content</DialogTitle>
          <DialogDescription>Publish to WordPress, a React subdomain, or download in your preferred format.</DialogDescription>
        </DialogHeader>

        <RadioGroup value={format} onValueChange={setFormat} className="grid grid-cols-2 gap-2" data-testid="export-format-radio-group">
          {FORMATS.map((f) => (
            <Label
              key={f.key}
              htmlFor={`fmt-${f.key}`}
              className={`flex items-start gap-2 rounded-xl border p-3 cursor-pointer transition-colors ${format === f.key ? "border-primary bg-secondary/60" : "border-border hover:bg-secondary/40"}`}
              data-testid={`export-format-${f.key}`}
            >
              <RadioGroupItem value={f.key} id={`fmt-${f.key}`} className="mt-0.5" />
              <div>
                <div className="text-sm font-medium">{f.label}</div>
                <div className="text-xs text-muted-foreground">{f.desc}</div>
              </div>
            </Label>
          ))}
        </RadioGroup>

        <div className="flex gap-2 pt-2">
          <Button onClick={download} className="rounded-xl gap-2 flex-1" data-testid="export-confirm-button">
            <Download className="h-4 w-4" /> Download
          </Button>
          <Button onClick={copy} variant="secondary" className="rounded-xl gap-2 flex-1" disabled={busy} data-testid="export-copy-button">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} Copy text
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
