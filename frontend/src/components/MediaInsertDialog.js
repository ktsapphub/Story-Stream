import React, { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, Link2, Sparkles, Image as ImageIcon, Search, Camera, KeyRound } from "lucide-react";
import { toast } from "sonner";
import {
  uploadMedia, mediaFromUrl, generateImage, listMedia, absUrl,
  getStockProviders, stockSearch,
} from "@/lib/api";

const PROVIDER_LABELS = { pexels: "Pexels", pixabay: "Pixabay", unsplash: "Unsplash" };

export const MediaInsertDialog = ({ open, onOpenChange, onInsert }) => {
  const [tab, setTab] = useState("generate");
  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [library, setLibrary] = useState([]);

  // stock state
  const [providers, setProviders] = useState({ pexels: false, pixabay: false, unsplash: false });
  const [provider, setProvider] = useState("all");
  const [kind, setKind] = useState("photo");
  const [stockQuery, setStockQuery] = useState("");
  const [stockResults, setStockResults] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockSearched, setStockSearched] = useState(false);

  useEffect(() => {
    if (open) {
      listMedia().then(setLibrary).catch(() => {});
      getStockProviders().then((d) => setProviders(d.providers || {})).catch(() => {});
    }
  }, [open]);

  const anyProvider = providers.pexels || providers.pixabay || providers.unsplash;
  const enabledProviders = Object.keys(PROVIDER_LABELS).filter((p) => providers[p]);

  const finish = (media) => {
    let snippet = "";
    const u = absUrl(media.url);
    if (media.media_type === "video") snippet = `\n\n[▶ Watch video](${u})\n\n`;
    else snippet = `\n\n![${media.prompt || media.original_filename || "media"}](${u})\n\n`;
    onInsert(snippet, media);
    onOpenChange(false);
    setUrl(""); setPrompt("");
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try { const media = await uploadMedia(file); toast.success("Uploaded"); finish(media); }
    catch { toast.error("Upload failed"); }
    finally { setLoading(false); }
  };

  const handleUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try { const media = await mediaFromUrl({ url: url.trim() }); toast.success("Media added"); finish(media); }
    catch { toast.error("Could not add media"); }
    finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try { const media = await generateImage({ prompt: prompt.trim() }); toast.success("Image generated"); finish(media); }
    catch { toast.error("Generation failed"); }
    finally { setLoading(false); }
  };

  const runStockSearch = async () => {
    if (!stockQuery.trim()) return;
    setStockLoading(true);
    setStockSearched(true);
    try {
      const data = await stockSearch(stockQuery.trim(), provider, kind);
      setStockResults(data.results || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Stock search failed");
      setStockResults([]);
    } finally { setStockLoading(false); }
  };

  const pickStock = async (item) => {
    setStockLoading(true);
    try {
      const media = await mediaFromUrl({
        url: item.full_url,
        media_type: item.type === "video" ? "video" : "image",
        title: item.photographer_name ? `Photo by ${item.photographer_name} on ${PROVIDER_LABELS[item.provider]}` : PROVIDER_LABELS[item.provider],
        source: item.provider,
        source_page_url: item.source_page_url,
      });
      toast.success(`Added from ${PROVIDER_LABELS[item.provider]}`);
      finish(media);
    } catch { toast.error("Could not add media"); }
    finally { setStockLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]" data-testid="media-insert-dialog">
        <DialogHeader><DialogTitle className="font-display">Insert media</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={setTab} data-testid="media-insert-tabs">
          <TabsList className="grid grid-cols-5 rounded-xl">
            <TabsTrigger value="generate" data-testid="media-tab-generate">Generate</TabsTrigger>
            <TabsTrigger value="stock" data-testid="media-tab-stock">Stock</TabsTrigger>
            <TabsTrigger value="upload" data-testid="media-tab-upload">Upload</TabsTrigger>
            <TabsTrigger value="url" data-testid="media-tab-url">URL</TabsTrigger>
            <TabsTrigger value="library" data-testid="media-tab-library">Library</TabsTrigger>
          </TabsList>

          {/* AI Generate */}
          <TabsContent value="generate" className="pt-4 space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> Create a unique image with AI (Nano Banana)
            </div>
            <Textarea placeholder="Describe the image to generate..." value={prompt} onChange={(e) => setPrompt(e.target.value)} className="rounded-xl min-h-[90px]" data-testid="media-generate-prompt-textarea" />
            <Button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="rounded-xl gap-2 w-full" data-testid="media-generate-submit-button">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate image
            </Button>
          </TabsContent>

          {/* Stock providers */}
          <TabsContent value="stock" className="pt-4 space-y-3">
            {!anyProvider ? (
              <div className="rounded-2xl border border-dashed border-border bg-[hsl(var(--surface-2))] p-6 text-center" data-testid="stock-not-configured">
                <KeyRound className="h-7 w-7 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium mt-2">Stock search needs an API key</p>
                <p className="text-xs text-muted-foreground mt-1">Add a Pexels, Pixabay, or Unsplash API key to the backend to enable searching free stock photos &amp; videos.</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger className="w-[130px] rounded-xl" data-testid="stock-provider-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sources</SelectItem>
                      {enabledProviders.map((p) => <SelectItem key={p} value={p}>{PROVIDER_LABELS[p]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={kind} onValueChange={setKind}>
                    <SelectTrigger className="w-[110px] rounded-xl" data-testid="stock-kind-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="photo">Photos</SelectItem>
                      <SelectItem value="video">Videos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={stockQuery}
                    onChange={(e) => setStockQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runStockSearch()}
                    placeholder="Search free stock media..."
                    className="rounded-xl flex-1"
                    data-testid="stock-search-input"
                  />
                  <Button onClick={runStockSearch} disabled={stockLoading || !stockQuery.trim()} className="rounded-xl gap-1" data-testid="stock-search-button">
                    {stockLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>

                {stockLoading ? (
                  <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
                ) : stockResults.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 max-h-[320px] overflow-auto" data-testid="stock-results-grid">
                    {stockResults.map((item) => (
                      <button key={`${item.provider}-${item.id}`} onClick={() => pickStock(item)} className="group relative aspect-square rounded-xl overflow-hidden border border-border" data-testid={`stock-result-${item.provider}-${item.id}`}>
                        <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                        <span className="absolute left-1 top-1 cs-badge badge-image text-[9px] capitalize">{item.provider}</span>
                        {item.type === "video" && <span className="absolute right-1 top-1 cs-badge badge-video text-[9px]">video</span>}
                      </button>
                    ))}
                  </div>
                ) : stockSearched ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No results. Try another search.</p>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-6 flex items-center justify-center gap-1"><Camera className="h-4 w-4" /> Search Pexels, Pixabay &amp; Unsplash for free media.</p>
                )}
              </>
            )}
          </TabsContent>

          {/* Upload */}
          <TabsContent value="upload" className="pt-4">
            <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-[hsl(var(--surface-2))] p-8 cursor-pointer hover:bg-[hsl(var(--surface-3))] transition-colors">
              {loading ? <Loader2 className="h-7 w-7 animate-spin text-primary" /> : <Upload className="h-7 w-7 text-primary" />}
              <span className="text-sm text-muted-foreground">Click to upload image, GIF, or video</span>
              <input type="file" className="hidden" accept="image/*,video/*,.gif" onChange={handleUpload} data-testid="media-upload-input" />
            </label>
          </TabsContent>

          {/* From URL */}
          <TabsContent value="url" className="pt-4 space-y-3">
            <Input placeholder="Paste image/GIF/video, Cloudinary, YouTube or Giphy URL" value={url} onChange={(e) => setUrl(e.target.value)} className="rounded-xl" data-testid="media-url-input" />
            <p className="text-xs text-muted-foreground">Works with direct image/video links, Cloudinary URLs, YouTube and Giphy embeds.</p>
            <Button onClick={handleUrl} disabled={loading || !url.trim()} className="rounded-xl gap-2 w-full" data-testid="media-url-submit">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Add media
            </Button>
          </TabsContent>

          {/* Library */}
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
