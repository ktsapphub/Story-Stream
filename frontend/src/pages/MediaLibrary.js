import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, Sparkles, Copy, Trash2, Image as ImageIcon, Loader2, Film } from "lucide-react";
import { toast } from "sonner";
import { MediaInsertDialog } from "@/components/MediaInsertDialog";
import { listMedia, uploadMedia, deleteMedia, absUrl } from "@/lib/api";

export default function MediaLibrary() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const fileRef = useRef(null);

  const load = () => listMedia(filter === "all" ? null : filter).then(setItems).catch(() => {});
  useEffect(() => { load(); }, [filter]);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { await uploadMedia(file); toast.success("Uploaded"); load(); }
    catch { toast.error("Upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const copyUrl = (m) => { navigator.clipboard.writeText(absUrl(m.url)); toast.success("URL copied"); };
  const remove = async (id) => { await deleteMedia(id); toast.success("Removed"); load(); };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Media Library</h1>
          <p className="text-muted-foreground mt-1">Your uploaded and AI-generated images, GIFs, and videos.</p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px] rounded-xl" data-testid="media-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All media</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="gif">GIFs</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" className="rounded-xl gap-2" onClick={() => setGenOpen(true)} data-testid="media-generate-button"><Sparkles className="h-4 w-4" /> Generate</Button>
          <Button className="rounded-xl gap-2" onClick={() => fileRef.current?.click()} disabled={uploading} data-testid="media-library-upload-button">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
          </Button>
          <input ref={fileRef} type="file" className="hidden" accept="image/*,video/*,.gif" onChange={onUpload} />
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="cs-card border-dashed p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No media yet. Upload or generate your first asset.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((m) => (
            <Card key={m.id} className="cs-card overflow-hidden group" data-testid={`media-item-${m.id}`}>
              <div className="relative aspect-square bg-muted">
                {m.media_type === "video" ? (
                  <div className="flex h-full w-full items-center justify-center flex-col gap-1 text-muted-foreground"><Film className="h-7 w-7" /><span className="text-xs">Video</span></div>
                ) : (
                  <img src={absUrl(m.url)} alt={m.original_filename} className="h-full w-full object-cover" loading="lazy" />
                )}
                <div className="absolute inset-0 flex items-end justify-end gap-1 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2">
                  <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg" onClick={() => copyUrl(m)} data-testid={`media-copy-${m.id}`}><Copy className="h-4 w-4" /></Button>
                  <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg" onClick={() => remove(m.id)} data-testid={`media-delete-${m.id}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <div className="p-2">
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="rounded-full text-[10px] capitalize">{m.source}</Badge>
                  <span className="text-[11px] text-muted-foreground truncate">{m.media_type}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <MediaInsertDialog open={genOpen} onOpenChange={(v) => { setGenOpen(v); if (!v) load(); }} onInsert={() => load()} />
    </div>
  );
}
