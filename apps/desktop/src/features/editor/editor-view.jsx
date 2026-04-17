import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { useAppStore } from "../../stores/app-store";
import { useNotesStore } from "../../stores/notes-store";
import { useCardsStore } from "../../stores/cards-store";
import { Edit3, Save, Trash2, Plus, Sparkles, FileText, Tag, Layers } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";

export function EditorView() {
  const backendStatus = useAppStore((s) => s.backendStatus);
  const { notes, currentNote, loadNotes, loadNote, updateNote } = useNotesStore();
  const { cards, loadCards, createCard, deleteCard } = useCardsStore();
  const [noteId, setNoteId] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [deck, setDeck] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCardDrawer, setShowCardDrawer] = useState(false);
  const [newCardFront, setNewCardFront] = useState("");
  const [newCardBack, setNewCardBack] = useState("");
  const [newCardType, setNewCardType] = useState("basic");
  const [aiLoading, setAiLoading] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (backendStatus === "running" && notes.length === 0) {
      loadNotes().catch((err) => console.error("Failed to load notes:", err));
    }
  }, [backendStatus, loadNotes, notes.length]);

  useEffect(() => {
    if (noteId) {
      loadNote(noteId).then((note) => {
        if (note) {
          setTitle(note.meta?.title || "");
          setContent(note.content || "");
          setTags(joinTags(note.meta?.tags || []));
          setDeck(note.meta?.default_deck || "");
          loadCards(noteId).catch(console.error);
        }
      }).catch(console.error);
    }
  }, [noteId, loadNote, loadCards]);

  const joinTags = (tags) => (tags || []).join(", ");

  const parseTags = (value) =>
    value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

  const handleSave = async () => {
    if (!noteId) return;
    setSaving(true);
    try {
      await updateNote(noteId, {
        title: title || "Untitled note",
        content,
        tags: parseTags(tags),
        default_deck: deck,
      });
      toast.success("Note saved");
    } catch (err) {
      toast.error(`Failed to save: ${err.message}`);
    }
    setSaving(false);
  };

  const handleAddCard = async () => {
    if (!noteId || !newCardFront.trim()) {
      toast.error("Card front is required");
      return;
    }
    try {
      await createCard(noteId, {
        front: newCardFront,
        back: newCardBack,
        type: newCardType,
        deck: deck || "Default",
      });
      setNewCardFront("");
      setNewCardBack("");
      toast.success("Card added");
      loadCards(noteId);
    } catch (err) {
      toast.error(`Failed to add card: ${err.message}`);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!confirm("Delete this card?")) return;
    try {
      await deleteCard(noteId, cardId);
      toast.success("Card deleted");
      loadCards(noteId);
    } catch (err) {
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  const handleAiGenerate = async () => {
    if (!content.trim()) {
      toast.error("Write some content first");
      return;
    }
    setAiLoading(true);
    try {
      const result = await api.generateCards(noteId, { content: content.slice(0, 5000) });
      toast.success(`Generated ${result.cards?.length || 0} cards`);
      loadCards(noteId);
    } catch (err) {
      toast.error(`AI failed: ${err.message}`);
    }
    setAiLoading(false);
  };

  const handlePushToAnki = async () => {
    if (!noteId || cards.length === 0) {
      toast.error("No cards to push");
      return;
    }
    try {
      const result = await api.pushToAnki(noteId);
      toast.success(`Pushed ${result.pushed || 0} cards to Anki`);
    } catch (err) {
      toast.error(`Push failed: ${err.message}`);
    }
  };

  return (
    <div className="flex h-full" data-testid="editor-view">
      {/* Sidebar - Note List */}
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-3 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notes
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {notes.map((note) => (
            <Button
              key={note.meta.id}
              variant={noteId === note.meta.id ? "secondary" : "ghost"}
              className="w-full justify-start text-left"
              onClick={() => setNoteId(note.meta.id)}
            >
              <span className="truncate">{note.meta.title || "Untitled"}</span>
            </Button>
          ))}
          {notes.length === 0 && (
            <p className="text-sm text-muted-foreground p-2">No notes yet</p>
          )}
        </div>
        <div className="p-2 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              try {
                const note = await api.createNote({ title: "New Note", tags: [] });
                await loadNotes();
                setNoteId(note.meta.id);
              } catch (err) {
                toast.error(`Failed to create note: ${err.message}`);
              }
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        </div>
      </aside>

      {/* Main Editor */}
      <main className="flex-1 flex flex-col">
        {noteId ? (
          <>
            {/* Toolbar */}
            <header className="border-b p-3 flex items-center gap-3 bg-background">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title..."
                className="flex-1 text-lg font-medium bg-transparent border-none outline-none"
              />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" size="sm" onClick={handlePushToAnki}>
                  <Layers className="h-4 w-4 mr-1" />
                  Push to Anki
                </Button>
                <Button variant="outline" size="sm" onClick={handleAiGenerate} disabled={aiLoading}>
                  <Sparkles className="h-4 w-4 mr-1" />
                  {aiLoading ? "Generating..." : "AI Generate"}
                </Button>
              </div>
            </header>

            {/* Meta */}
            <div className="border-b p-3 flex items-center gap-4 bg-muted/30">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Tags (comma-separated)"
                  className="bg-transparent border-none outline-none text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Deck:</span>
                <input
                  type="text"
                  value={deck}
                  onChange={(e) => setDeck(e.target.value)}
                  placeholder="Default"
                  className="bg-transparent border-none outline-none text-sm w-32"
                />
              </div>
            </div>

            {/* Content Editor */}
            <div className="flex-1 flex">
              <div className="flex-1 p-4">
                <textarea
                  ref={contentRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your notes here... (Markdown supported)"
                  className="w-full h-full resize-none border-none outline-none bg-transparent font-mono text-sm"
                />
              </div>

              {/* Card Drawer */}
              {showCardDrawer && (
                <aside className="w-80 border-l bg-muted/30 flex flex-col">
                  <div className="p-3 border-b flex items-center justify-between">
                    <h3 className="font-semibold">Cards ({cards.length})</h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowCardDrawer(false)}>
                      ×
                    </Button>
                  </div>

                  {/* New Card Form */}
                  <div className="p-3 border-b space-y-2">
                    <select
                      value={newCardType}
                      onChange={(e) => setNewCardType(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      <option value="basic">Basic</option>
                      <option value="cloze">Cloze</option>
                    </select>
                    <textarea
                      value={newCardFront}
                      onChange={(e) => setNewCardFront(e.target.value)}
                      placeholder="Front / Question"
                      className="w-full px-2 py-1 border rounded text-sm resize-none"
                      rows={2}
                    />
                    <textarea
                      value={newCardBack}
                      onChange={(e) => setNewCardBack(e.target.value)}
                      placeholder="Back / Answer"
                      className="w-full px-2 py-1 border rounded text-sm resize-none"
                      rows={2}
                    />
                    <Button size="sm" className="w-full" onClick={handleAddCard}>
                      Add Card
                    </Button>
                  </div>

                  {/* Card List */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {cards.map((card) => (
                      <Card key={card.id}>
                        <CardContent className="p-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{card.front}</p>
                              <p className="text-xs text-muted-foreground truncate">{card.back}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleDeleteCard(card.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {card.type}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                    {cards.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No cards yet. Use AI Generate or add manually.
                      </p>
                    )}
                  </div>
                </aside>
              )}
            </div>

            {/* Toggle Card Drawer */}
            {!showCardDrawer && (
              <div className="border-t p-2">
                <Button variant="outline" size="sm" onClick={() => setShowCardDrawer(true)}>
                  <Layers className="h-4 w-4 mr-1" />
                  Show Cards ({cards.length})
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Edit3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-medium">Select a note</h2>
              <p className="text-muted-foreground">Choose a note from the sidebar or create a new one</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}