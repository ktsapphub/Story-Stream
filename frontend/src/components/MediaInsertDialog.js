import React, { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Link2, Sparkles, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { uploadMedia, mediaFromUrl, generateImage, listMedia, absUrl } from "@/lib/api";

export const MediaInsertDialog = ({ open, onOpenChange, onInsert }) => {
  const [tab, setTab] = useState("upload");
  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [library, setLibrary] = useState([]);

  useEffect(() => {
    if (open) listMedia().then(setLibrary).catch(() => {});
  }, [open]);

  const finish = (media) => {
    let snippet = "";
    const u = absUrl(media.url);
    if (media.media_type === "video") {
      snippet = `\n\n[▶ Watch video](${u})\n\n`;
    } else {
      snippet = `\n\n![${media.prompt || media.original_filename || "media"}](${u})\n\n`;
    }
    onInsert(snippet, media);
    onOpenChange(false);
    setUrl(""); setPrompt("");
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const media = await uploadMedia(file);
      toast.success("Uploaded");
      finish(media);
    } catch (err) {
      toast.error("Upload failed");
    } finally { setLoading(false); }
  };

  const handleUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const media = await mediaFromUrl({ url: url.trim() });
      toast.success("Media added");
      finish(media);
    } catch (err) {
      toast.error("Could not add media");
    } finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const media = await generateImage({ prompt: prompt.trim() });
      toast.success("Image generated");
      finish(media);
    } catch (err) {
      toast.error("Generation failed");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]" data-testid="media-insert-dialog">
        <DialogHeader><DialogTitle className="font-display">Insert media</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={setTab} data-testid="media-insert-tabs">
          <TabsList className="grid grid-cols-4 rounded-xl">
            <TabsTrigger value="upload" data-testid="media-tab-upload">Upload</TabsTrigger>
            <TabsTrigger value="url" data-testid="media-tab-url">From URL</TabsTrigger>
            <TabsTrigger value="generate" data-testid="media-tab-generate">Generate</TabsTrigger>
            <TabsTrigger value="library" data-testid="media-tab-library">Library</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="pt-4">
            <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/40 p-8 cursor-pointer hover:bg-secondary/60 transition-colors">
              {loading ? <Loader2 className="h-7 w-7 animate-spin text-primary" /> : <Upload className="h-7 w-7 text-primary" />}
              <span className="text-sm text-muted-foreground">Click to upload image, GIF, or video</span>
              <input type="file" className="hidden" accept="image/*,video/*,.gif" onChange={handleUpload} data-testid="media-upload-input" />
            </label>
          </TabsContent>

          <TabsContent value="url" className="pt-4 space-y-3">
            <Input placeholder="Paste image, GIF, YouTube or Giphy URL" value={url} onChange={(e) => setUrl(e.target.value)} className="rounded-xl" data-testid="media-url-input" />
            <Button onClick={handleUrl} disabled={loading || !url.trim()} className="rounded-xl gap-2 w-full" data-testid="media-url-submit">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Add media
            </Button>
          </TabsContent>

          <TabsContent value="generate" className="pt-4 space-y-3">
            <Textarea placeholder="Describe the image to generate with AI (Nano Banana)..." value={prompt} onChange={(e) => setPrompt(e.target.value)} className="rounded-xl min-h-[90px]" data-testid="media-generate-prompt-textarea" />
            <Button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="rounded-xl gap-2 w-full" data-testid="media-generate-submit-button">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate image
            </Button>
          </TabsContent>

          <TabsContent value="library" className="pt-4">
            {library.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8 flex flex-col items-center gap-2">
                <ImageIcon className="h-7 w-7" /> No media yet
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-auto">
                {library.map((m) => (
                  <button key={m.id} onClick={() => finish(m)} className="group relative aspect-square rounded-xl overflow-hidden border border-border" data-testid={`library-media-${m.id}`}>
                    {m.media_type === "video" ? (
                      <div className="flex h-full items-center justify-center bg-muted text-xs text-muted-foreground p-2 text-center">Video</div>
                    ) : (
                      <img src={absUrl(m.url)} alt="" className="h-full w-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
