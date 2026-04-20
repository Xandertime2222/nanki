import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { useAppStore } from "../../stores/app-store";
import { useNotesStore } from "../../stores/notes-store";
import { FolderOpen, Plus, Trash2, Copy, FileText, RefreshCw, Edit3, Folder } from "lucide-react";
import { toast } from "sonner";

function getSourceBadge(note) {
  const filename = note.meta?.original_filename || "";
  if (filename.endsWith(".pdf")) return { label: "PDF", variant: "destructive" };
  if (filename.endsWith(".md")) return { label: "MD", variant: "outline" };
  if (filename.endsWith(".txt")) return { label: "TXT", variant: "outline" };
  if (filename.endsWith(".pptx")) return { label: "PPTX", variant: "secondary" };
  return { label: "Manuell", variant: "outline" };
}

export function WorkspaceView() {
  const backendStatus = useAppStore((s) => s.backendStatus);
  const openNoteInEditor = useAppStore((s) => s.openNoteInEditor);
  const { notes, loading, error, loadNotes, createNote, deleteNote, duplicateNote } = useNotesStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [sortMode, setSortMode] = useState("date");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const allTags = useMemo(() => {
    return [...new Set(notes.flatMap(n => n.meta?.tags || []))].sort();
  }, [notes]);

  const allFolders = useMemo(() => {
    return [...new Set(notes.map(n => n.meta?.folder_name || "").filter(Boolean))].sort();
  }, [notes]);

  const displayNotes = useMemo(() => {
    let filtered = [...notes];
    if (selectedTag !== "all") filtered = filtered.filter(n => n.meta?.tags?.includes(selectedTag));
    if (selectedFolder !== "all") filtered = filtered.filter(n => (n.meta?.folder_name || "") === selectedFolder);

    return filtered.sort((a, b) => {
      switch (sortMode) {
        case "title": return (a.meta?.title || "").localeCompare(b.meta?.title || "");
        case "cards": return (b.card_count || 0) - (a.card_count || 0);
        case "words": return (b.word_count || 0) - (a.word_count || 0);
        default: return new Date(b.meta?.updated_at || 0) - new Date(a.meta?.updated_at || 0);
      }
    });
  }, [notes, sortMode, selectedTag, selectedFolder]);

  // Group by folder when no specific folder is selected
  const groupedNotes = useMemo(() => {
    if (selectedFolder !== "all") return null;
    const groups = {};
    for (const note of displayNotes) {
      const folder = note.meta?.folder_name || "";
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(note);
    }
    // Sort: named folders first (alphabetical), then ungrouped
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (!a && b) return 1;
      if (a && !b) return -1;
      return a.localeCompare(b);
    });
    return sortedKeys.map(k => ({ folder: k, notes: groups[k] }));
  }, [displayNotes, selectedFolder]);

  useEffect(() => {
    if (backendStatus === "running") {
      loadNotes().catch((err) => toast.error(`Notizen konnten nicht geladen werden: ${err.message}`));
    }
  }, [backendStatus, loadNotes]);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error("Bitte einen Titel eingeben");
      return;
    }
    try {
      await createNote({ title: newTitle, tags: [], folder_name: newFolder.trim() });
      setNewTitle("");
      setNewFolder("");
      setShowCreate(false);
      toast.success("Notiz erstellt");
    } catch (err) {
      toast.error(`Notiz konnte nicht erstellt werden: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId((cur) => (cur === id ? null : cur)), 3000);
      return;
    }
    setConfirmDeleteId(null);
    try {
      await deleteNote(id);
      toast.success("Notiz gelöscht");
    } catch (err) {
      toast.error(`Löschen fehlgeschlagen: ${err.message}`);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await duplicateNote(id, "Kopie der Notiz");
      toast.success("Notiz dupliziert");
    } catch (err) {
      toast.error(`Duplizieren fehlgeschlagen: ${err.message}`);
    }
  };

  const renderNoteCard = (note) => {
    const sourceBadge = getSourceBadge(note);
    return (
      <Card
        key={note.meta.id}
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => openNoteInEditor(note.meta.id)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex gap-2 items-center">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <Badge variant={sourceBadge.variant} className="text-xs">{sourceBadge.label}</Badge>
              {note.meta?.folder_name && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Folder className="h-3 w-3" />
                  {note.meta.folder_name}
                </Badge>
              )}
            </div>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openNoteInEditor(note.meta.id)}
                title="Im Editor öffnen"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDuplicate(note.meta.id)}
                title="Duplizieren"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${
                  confirmDeleteId === note.meta.id
                    ? "text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400"
                    : "text-destructive hover:text-destructive"
                }`}
                onClick={() => handleDelete(note.meta.id)}
                title={confirmDeleteId === note.meta.id ? "Nochmal klicken zum Bestätigen" : "Löschen"}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardTitle className="text-lg mt-2">{note.meta.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {note.content?.slice(0, 100) || "Kein Inhalt"}
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">{note.word_count || 0} Wörter</Badge>
            <Badge variant="secondary" className="text-xs">{note.card_count || 0} Karten</Badge>
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
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6" data-testid="workspace-view">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Arbeitsbereich</h1>
          <Badge variant={backendStatus === "running" ? "success" : "secondary"}>
            {backendStatus === "running" ? "Verbunden" : "Offline"}
          </Badge>
          <Badge variant="outline">{displayNotes.length} Notizen</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => loadNotes().catch((err) => toast.error(err.message))} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Neue Notiz
          </Button>
        </div>
      </div>

      {/* Filter / Sort Bar */}
      {(allTags.length > 0 || allFolders.length > 0) && (
        <div className="flex gap-3 items-center flex-wrap">
          {allFolders.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Ordner:</span>
              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Alle Ordner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Ordner</SelectItem>
                  {allFolders.map(folder => (
                    <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tag:</span>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Alle Tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sortieren:</span>
            <Select value={sortMode} onValueChange={setSortMode}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Datum</SelectItem>
                <SelectItem value="title">Titel</SelectItem>
                <SelectItem value="cards">Karten</SelectItem>
                <SelectItem value="words">Wörter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Neue Notiz erstellen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="text"
              placeholder="Titel der Notiz…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="w-full px-3 py-2 border rounded-md bg-background"
              autoFocus
              data-testid="new-note-title"
            />
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Ordner (optional)…"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md bg-background"
                list="folder-suggestions"
              />
              <datalist id="folder-suggestions">
                {allFolders.map(f => <option key={f} value={f} />)}
              </datalist>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Erstellen</Button>
              <Button variant="outline" onClick={() => { setShowCreate(false); setNewTitle(""); setNewFolder(""); }}>Abbrechen</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Fehler: {error}</p>
          </CardContent>
        </Card>
      )}

      {loading && notes.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Notizen werden geladen…
          </CardContent>
        </Card>
      ) : notes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Noch keine Notizen</CardTitle>
            <CardDescription>Erstelle deine erste Notiz um zu beginnen</CardDescription>
          </CardHeader>
        </Card>
      ) : groupedNotes ? (
        // Grouped by folder
        <div className="space-y-6">
          {groupedNotes.map(({ folder, notes: groupNotes }) => (
            <div key={folder || "__ungrouped__"}>
              {folder ? (
                <div className="flex items-center gap-2 mb-3">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{folder}</h2>
                  <span className="text-xs text-muted-foreground">({groupNotes.length})</span>
                </div>
              ) : groupedNotes.some(g => g.folder) ? (
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ohne Ordner</h2>
                  <span className="text-xs text-muted-foreground">({groupNotes.length})</span>
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupNotes.map(renderNoteCard)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayNotes.map(renderNoteCard)}
        </div>
      )}
    </div>
  );
}
