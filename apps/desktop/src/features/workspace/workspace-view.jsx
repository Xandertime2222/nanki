import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { useAppStore } from "../../stores/app-store";
import { useNotesStore } from "../../stores/notes-store";
import { FolderOpen, Plus, Trash2, Copy, FileText, RefreshCw, FileBadge } from "lucide-react";
import { toast } from "sonner";

function getSourceBadge(note) {
  const filename = note.meta?.original_filename || "";
  if (filename.endsWith(".pdf")) return { label: "PDF", variant: "destructive" };
  if (filename.endsWith(".md")) return { label: "MD", variant: "outline" };
  if (filename.endsWith(".txt")) return { label: "TXT", variant: "outline" };
  if (filename.endsWith(".pptx")) return { label: "PPTX", variant: "secondary" };
  return { label: "Manual", variant: "outline" };
}

export function WorkspaceView() {
  const backendStatus = useAppStore((s) => s.backendStatus);
  const { notes, loading, error, loadNotes, createNote, deleteNote, duplicateNote } = useNotesStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [sortMode, setSortMode] = useState("date");
  const [selectedTag, setSelectedTag] = useState("all");

  // Extract unique tags
  const allTags = useMemo(() => {
    const tags = [...new Set(notes.flatMap(n => n.meta?.tags || []))].sort();
    return tags;
  }, [notes]);

  // Filter and sort notes
  const displayNotes = useMemo(() => {
    let filtered = selectedTag === "all"
      ? [...notes]
      : notes.filter(n => n.meta?.tags?.includes(selectedTag));

    return filtered.sort((a, b) => {
      switch (sortMode) {
        case "title": return (a.meta?.title || "").localeCompare(b.meta?.title || "");
        case "cards": return (b.card_count || 0) - (a.card_count || 0);
        case "words": return (b.word_count || 0) - (a.word_count || 0);
        default: return new Date(b.meta?.updated_at || 0) - new Date(a.meta?.updated_at || 0);
      }
    });
  }, [notes, sortMode, selectedTag]);

  useEffect(() => {
    if (backendStatus === "running") {
      loadNotes().catch((err) => toast.error(`Failed to load notes: ${err.message}`));
    }
  }, [backendStatus, loadNotes]);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }
    try {
      await createNote({ title: newTitle, tags: [] });
      setNewTitle("");
      setShowCreate(false);
      toast.success("Note created");
    } catch (err) {
      toast.error(`Failed to create note: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this note?")) return;
    try {
      await deleteNote(id);
      toast.success("Note deleted");
    } catch (err) {
      toast.error(`Failed to delete note: ${err.message}`);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await duplicateNote(id, `Copy of note`);
      toast.success("Note duplicated");
    } catch (err) {
      toast.error(`Failed to duplicate note: ${err.message}`);
    }
  };

  const handleRefresh = () => {
    loadNotes().catch((err) => toast.error(`Failed to refresh: ${err.message}`));
  };

  return (
    <div className="p-6 space-y-6" data-testid="workspace-view">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Workspace</h1>
          <Badge variant={backendStatus === "running" ? "success" : "secondary"}>
            {backendStatus === "running" ? "Connected" : "Offline"}
          </Badge>
          <Badge variant="outline">{displayNotes.length} notes</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        </div>
      </div>

      {/* Filter and Sort Bar */}
      {allTags.length > 1 && (
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Tag:</span>
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort:</span>
            <Select value={sortMode} onValueChange={setSortMode}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="cards">Cards</SelectItem>
                <SelectItem value="words">Words</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="text"
              placeholder="Note title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              data-testid="new-note-title"
            />
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Create</Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {loading && notes.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Loading notes...
          </CardContent>
        </Card>
      ) : notes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Notes Yet</CardTitle>
            <CardDescription>Create your first note to get started</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayNotes.map((note) => {
            const sourceBadge = getSourceBadge(note);
            return (
              <Card key={note.meta.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-2 items-center">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <Badge variant={sourceBadge.variant} className="text-xs">{sourceBadge.label}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDuplicate(note.meta.id)}
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(note.meta.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2">{note.meta.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {note.content?.slice(0, 100) || "No content"}
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">{note.word_count || 0} words</Badge>
                    <Badge variant="secondary" className="text-xs">{note.card_count || 0} cards</Badge>
                  </div>
                  {note.meta.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {note.meta.tags.slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                      {note.meta.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">+{note.meta.tags.length - 3}</Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}