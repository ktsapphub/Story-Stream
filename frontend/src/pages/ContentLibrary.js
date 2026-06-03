import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Download, Trash2, Send, RotateCcw, Library as LibraryIcon } from "lucide-react";
import { toast } from "sonner";
import { ExportModal } from "@/components/ExportModal";
import { listContent, deleteContent, setStatus } from "@/lib/api";

export default function ContentLibrary() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [type, setType] = useState("all");
  const [status, setStatusFilter] = useState("all");
  const [exportItem, setExportItem] = useState(null);

  const load = () => listContent(type, status).then(setItems).catch(() => {});
  useEffect(() => { load(); }, [type, status]);

  const openEditor = (c) => navigate(`/${c.type === "newsletter" ? "newsletter" : "blog"}/${c.id}`);

  const togglePublish = async (c) => {
    const next = c.status === "published" ? "draft" : "published";
    await setStatus(c.id, next);
    toast.success(next === "published" ? "Published" : "Moved to draft");
    load();
  };

  const remove = async (id) => { await deleteContent(id); toast.success("Deleted"); load(); };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Content Library</h1>
          <p className="text-muted-foreground mt-1">All your blog posts and newsletters in one place.</p>
        </div>
        <div className="flex gap-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[150px] rounded-xl" data-testid="library-type-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="blog">Blogs</SelectItem>
              <SelectItem value="newsletter">Newsletters</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] rounded-xl" data-testid="library-status-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="cs-card border-dashed p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <LibraryIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No content matches these filters.</p>
            <Button className="rounded-xl" onClick={() => navigate("/blog")}>Create content</Button>
          </div>
        </Card>
      ) : (
        <Card className="cs-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id} className="hover:bg-secondary/40" data-testid={`library-row-${c.id}`}>
                    <TableCell className="max-w-[320px]">
                      <button className="text-left font-medium hover:text-primary line-clamp-1" onClick={() => openEditor(c)} data-testid={`library-title-${c.id}`}>{c.title || "Untitled"}</button>
                      <div className="text-xs text-muted-foreground line-clamp-1">{c.excerpt || c.meta_description}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell"><Badge variant="secondary" className="rounded-full capitalize">{c.type}</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge className="rounded-full" style={{ background: c.status === "published" ? "hsl(168 35% 90%)" : "hsl(28 35% 90%)", color: c.status === "published" ? "hsl(168 35% 28%)" : "hsl(22 55% 30%)" }}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{c.quality_score ? <Badge variant="outline" className="rounded-full">{c.quality_score.overall_score}</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditor(c)} data-testid={`library-edit-${c.id}`}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setExportItem(c)} data-testid={`library-export-${c.id}`}><Download className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => togglePublish(c)} title={c.status === "published" ? "Unpublish" : "Publish"} data-testid={`library-publish-${c.id}`}>
                          {c.status === "published" ? <RotateCcw className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`library-delete-${c.id}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this content?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(c.id)} data-testid={`library-confirm-delete-${c.id}`}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <ExportModal open={!!exportItem} onOpenChange={(v) => !v && setExportItem(null)} content={exportItem} />
    </div>
  );
}
