import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { useAppStore } from "../../stores/app-store";
import { useNotesStore } from "../../stores/notes-store";
import { Library, RefreshCw, FileText, Cards } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";

export function LibraryView() {
  const backendStatus = useAppStore((s) => s.backendStatus);
  const { notes, loading, loadNotes } = useNotesStore();
  const [selectedNote, setSelectedNote] = useState(null);
  const [cardCount, setCardCount] = useState({});
  const [loadingCards, setLoadingCards] = useState(false);

  useEffect(() => {
    if (backendStatus === "running") {
      loadNotes().catch((err) => toast.error(`Failed to load notes: ${err.message}`));
    }
  }, [backendStatus, loadNotes]);

  useEffect(() => {
    if (notes.length > 0) {
      loadCardCounts();
    }
  }, [notes]);

  const loadCardCounts = async () => {
    setLoadingCards(true);
    const counts = {};
    for (const note of notes) {
      try {
        const fullNote = await api.getNote(note.meta.id);
        counts[note.meta.id] = fullNote.cards?.length || 0;
      } catch (err) {
        counts[note.meta.id] = 0;
      }
    }
    setCardCount(counts);
    setLoadingCards(false);
  };

  const handleRefresh = () => {
    loadNotes().catch((err) => toast.error(`Failed to refresh: ${err.message}`));
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp * 1000).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="p-6 space-y-6" data-testid="library-view">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Library className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Library</h1>
          <Badge variant={backendStatus === "running" ? "success" : "secondary"}>
            {backendStatus === "running" ? `${notes.length} Notes` : "Offline"}
          </Badge>
        </div>
        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading && notes.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Loading library...
          </CardContent>
        </Card>
      ) : notes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Empty Library</CardTitle>
            <CardDescription>Import files or create notes to see them here</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {notes.map((note) => (
            <Card
              key={note.meta.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedNote === note.meta.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedNote(note.meta.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">{note.meta.title}</CardTitle>
                      <CardDescription>
                        Created: {formatDate(note.meta.created)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Cards className="h-3 w-3" />
                      {loadingCards ? "..." : cardCount[note.meta.id] || 0}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {note.content?.slice(0, 200) || "No content"}
                </p>
                {note.meta.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {note.meta.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}