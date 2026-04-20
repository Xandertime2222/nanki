import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { useAppStore } from "../../stores/app-store";
import { useNotesStore } from "../../stores/notes-store";
import {
  Library, RefreshCw, FileText, Layers, ChevronDown, ChevronRight,
  Edit3, Trash2, Save, X, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";

const EMPTY_DRAFT = { front: "", back: "", type: "basic", extra: "", deck_name: "Default", tags: "" };

export function LibraryView() {
  const backendStatus = useAppStore((s) => s.backendStatus);
  const openNoteInEditor = useAppStore((s) => s.openNoteInEditor);
  const { notes, loading, loadNotes } = useNotesStore();

  // noteId → full NoteDocument (includes cards)
  const [fullNotes, setFullNotes] = useState({});
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editingCard, setEditingCard] = useState(null); // { noteId, cardId } | null
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [savingCard, setSavingCard] = useState(false);
  const [confirmDeleteCardId, setConfirmDeleteCardId] = useState(null);

  useEffect(() => {
    if (backendStatus === "running") {
      loadNotes().catch((err) => toast.error(`Bibliothek konnte nicht geladen werden: ${err.message}`));
    }
  }, [backendStatus, loadNotes]);

  useEffect(() => {
    if (notes.length > 0) loadAllNotes();
  }, [notes]);

  const loadAllNotes = async () => {
    setLoadingNotes(true);
    try {
      const results = await Promise.all(
        notes.map(async (note) => {
          try {
            const full = await api.getNote(note.meta.id);
            return [note.meta.id, full];
          } catch {
            return [note.meta.id, null];
          }
        })
      );
      setFullNotes(Object.fromEntries(results));
    } finally {
      setLoadingNotes(false);
    }
  };

  const reloadNote = async (noteId) => {
    try {
      const full = await api.getNote(noteId);
      setFullNotes((prev) => ({ ...prev, [noteId]: full }));
    } catch (err) {
      toast.error(`Notiz konnte nicht neu geladen werden: ${err.message}`);
    }
  };

  const formatDate = (value) => {
    if (!value) return "Unbekannt";
    const ms = typeof value === "number" ? value * 1000 : NaN;
    const date = typeof value === "string" ? new Date(value) : new Date(ms);
    if (isNaN(date.getTime())) return "Unbekannt";
    return date.toLocaleDateString("de-DE", { year: "numeric", month: "short", day: "numeric" });
  };

  const startEditCard = (noteId, card) => {
    setEditingCard({ noteId, cardId: card.id });
    setDraft({
      front: card.front || "",
      back: card.back || "",
      type: card.type || "basic",
      extra: card.extra || "",
      deck_name: card.deck_name || "Default",
      tags: (card.tags || []).join(", "),
    });
  };

  const cancelEdit = () => {
    setEditingCard(null);
    setDraft(EMPTY_DRAFT);
  };

  const handleSaveCard = async () => {
    if (!editingCard || !draft.front.trim()) {
      toast.error("Vorderseite ist erforderlich");
      return;
    }
    setSavingCard(true);
    try {
      await api.updateCard(editingCard.noteId, editingCard.cardId, {
        front: draft.front,
        back: draft.back,
        type: draft.type,
        extra: draft.extra,
        deck_name: draft.deck_name,
        tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      toast.success("Karte gespeichert");
      cancelEdit();
      await reloadNote(editingCard.noteId);
    } catch (err) {
      toast.error(`Speichern fehlgeschlagen: ${err.message}`);
    }
    setSavingCard(false);
  };

  const handleDeleteCard = async (noteId, cardId) => {
    if (confirmDeleteCardId !== cardId) {
      setConfirmDeleteCardId(cardId);
      setTimeout(() => setConfirmDeleteCardId((cur) => (cur === cardId ? null : cur)), 3000);
      return;
    }
    setConfirmDeleteCardId(null);
    try {
      await api.deleteCard(noteId, cardId);
      toast.success("Karte gelöscht");
      await reloadNote(noteId);
    } catch (err) {
      toast.error(`Löschen fehlgeschlagen: ${err.message}`);
    }
  };

  const toggleExpand = (noteId) => {
    setExpandedId((prev) => (prev === noteId ? null : noteId));
    setEditingCard(null);
    setDraft(EMPTY_DRAFT);
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6" data-testid="library-view">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Library className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Bibliothek</h1>
          <Badge variant={backendStatus === "running" ? "success" : "secondary"}>
            {backendStatus === "running" ? `${notes.length} Notizen` : "Offline"}
          </Badge>
        </div>
        <Button variant="outline" size="icon" onClick={() => loadNotes().catch((err) => toast.error(err.message))} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading || loadingNotes ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading && notes.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">Bibliothek wird geladen…</CardContent>
        </Card>
      ) : notes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Bibliothek leer</CardTitle>
            <CardDescription>Dateien importieren oder Notizen erstellen</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {notes.map((note) => {
            const full = fullNotes[note.meta.id];
            const cards = full?.cards || [];
            const isExpanded = expandedId === note.meta.id;

            return (
              <Card key={note.meta.id} className="overflow-hidden">
                {/* Note header — click to expand */}
                <CardHeader
                  className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors select-none"
                  onClick={() => toggleExpand(note.meta.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <CardTitle className="text-lg truncate">{note.meta.title}</CardTitle>
                        <CardDescription>Erstellt: {formatDate(note.meta.created_at)}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {loadingNotes ? "…" : cards.length}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => openNoteInEditor(note.meta.id)}
                      >
                        <Edit3 className="h-3.5 w-3.5 mr-1" /> Bearbeiten
                      </Button>
                    </div>
                  </div>

                  {note.meta.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 ml-7">
                      {note.meta.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardHeader>

                {/* Expanded: card list */}
                {isExpanded && (
                  <CardContent className="pt-0 border-t">
                    {cards.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Noch keine Karten. Im Editor erstellen oder KI verwenden.
                      </p>
                    ) : (
                      <div className="space-y-2 pt-3">
                        {cards.map((card) => {
                          const isEditing = editingCard?.cardId === card.id;

                          return (
                            <div key={card.id} className="border rounded-lg overflow-hidden">
                              {isEditing ? (
                                /* Inline edit form */
                                <div className="p-3 space-y-2 bg-muted/20">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase">Karte bearbeiten</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEdit}>
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                  <select
                                    value={draft.type}
                                    onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
                                    className="w-full px-2 py-1 border rounded text-sm bg-background"
                                  >
                                    <option value="basic">Basic</option>
                                    <option value="reverse">Basic + Rückseite</option>
                                    <option value="cloze">Lückentext</option>
                                  </select>
                                  <textarea
                                    value={draft.front}
                                    onChange={(e) => setDraft((d) => ({ ...d, front: e.target.value }))}
                                    placeholder="Vorderseite"
                                    rows={2}
                                    className="w-full px-2 py-1 border rounded text-sm resize-none bg-background"
                                  />
                                  {draft.type !== "cloze" && (
                                    <textarea
                                      value={draft.back}
                                      onChange={(e) => setDraft((d) => ({ ...d, back: e.target.value }))}
                                      placeholder="Rückseite"
                                      rows={2}
                                      className="w-full px-2 py-1 border rounded text-sm resize-none bg-background"
                                    />
                                  )}
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="text"
                                      value={draft.deck_name}
                                      onChange={(e) => setDraft((d) => ({ ...d, deck_name: e.target.value }))}
                                      placeholder="Deck"
                                      className="px-2 py-1 border rounded text-sm bg-background"
                                    />
                                    <input
                                      type="text"
                                      value={draft.tags}
                                      onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
                                      placeholder="Tags (kommagetrennt)"
                                      className="px-2 py-1 border rounded text-sm bg-background"
                                    />
                                  </div>
                                  <textarea
                                    value={draft.extra}
                                    onChange={(e) => setDraft((d) => ({ ...d, extra: e.target.value }))}
                                    placeholder="Zusatzinfo"
                                    rows={1}
                                    className="w-full px-2 py-1 border rounded text-sm resize-none bg-background"
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" className="flex-1" onClick={handleSaveCard} disabled={savingCard}>
                                      <Save className="h-3.5 w-3.5 mr-1" />
                                      {savingCard ? "Speichert…" : "Speichern"}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={cancelEdit}>Abbrechen</Button>
                                  </div>
                                </div>
                              ) : (
                                /* Card display */
                                <div className="p-3 flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">{card.front}</p>
                                    {card.back && (
                                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{card.back}</p>
                                    )}
                                    <div className="flex gap-1 mt-1.5 flex-wrap">
                                      <Badge variant="outline" className="text-xs">{card.type}</Badge>
                                      {card.deck_name && <Badge variant="outline" className="text-xs">{card.deck_name}</Badge>}
                                      {card.tags?.map((t) => (
                                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => startEditCard(note.meta.id, card)}
                                      title="Karte bearbeiten"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={`h-7 w-7 ${
                                        confirmDeleteCardId === card.id
                                          ? "text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/40"
                                          : ""
                                      }`}
                                      onClick={() => handleDeleteCard(note.meta.id, card.id)}
                                      title={confirmDeleteCardId === card.id ? "Nochmal klicken" : "Karte löschen"}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => openNoteInEditor(note.meta.id)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Karten im Editor hinzufügen
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
