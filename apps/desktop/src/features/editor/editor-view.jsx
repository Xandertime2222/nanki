import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { useAppStore } from "../../stores/app-store";
import { useNotesStore } from "../../stores/notes-store";
import { useCardsStore } from "../../stores/cards-store";
import { ObsidianEditor } from "../../components/obsidian-editor";
import { useTheme } from "../../components/theme-provider";
import {
  Edit3, Save, Trash2, Plus, Sparkles, FileText, Tag, Layers,
  Bold, Italic, Heading1, Heading2, Heading3, List, Quote, Code,
  Eraser, X, ChevronDown, ChevronRight, Search, MoreVertical,
  Copy, Download, Eye, Settings, BookOpen, RefreshCw, Moon, Sun, Monitor,
  Send, MessageSquare, Lightbulb, Loader2
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { toast } from "sonner";
import { api } from "../../lib/api";

// Simple markdown to HTML converter (client-side)
function markdownToHtml(md) {
  if (!md) return "";
  let html = md
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr/>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n/g, '<br/>');
  return html;
}

// Quick Card Dock component
function QuickCardDock({ noteId, deck, onSave, onSaveAndPush }) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [expanded, setExpanded] = useState(false);

  const hasContent = front.trim() || back.trim();

  return (
    <div className="border-t bg-muted/20 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <span className="text-sm font-medium">Quick Card</span>
          {hasContent && <span className="text-xs text-muted-foreground">Ready to save</span>}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => { setFront(""); setBack(""); }}>
            Clear
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Front</label>
              <textarea
                value={front}
                onChange={(e) => setFront(e.target.value)}
                className="w-full h-16 px-2 py-1 border rounded text-sm resize-none bg-background"
                placeholder="Front side..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Back</label>
              <textarea
                value={back}
                onChange={(e) => setBack(e.target.value)}
                className="w-full h-16 px-2 py-1 border rounded text-sm resize-none bg-background"
                placeholder="Back side..."
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" disabled={!front.trim() || !noteId} onClick={() => onSave({ front, back, deck })}>
              Save Card
            </Button>
            <Button variant="outline" size="sm" disabled={!front.trim() || !noteId} onClick={() => onSaveAndPush({ front, back, deck })}>
              Save & Push
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Selection Bubble component
function SelectionBubble({ selection, onBasic, onCloze, onFront, onBack, onAiChat, onAiExplain }) {
  const bubbleRef = useRef(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (selection?.rect) {
      const rect = selection.rect;
      const bubbleWidth = 420;
      const bubbleHeight = 48;
      let left = rect.left + rect.width / 2 - bubbleWidth / 2;
      left = Math.max(8, Math.min(window.innerWidth - bubbleWidth - 8, left));
      let top = rect.top - bubbleHeight - 12;
      if (top < 12) top = rect.bottom + 12;
      setPosition({ left, top });
    }
  }, [selection]);

  if (!selection?.text) return null;

  return (
    <div
      ref={bubbleRef}
      className="fixed z-50 flex gap-1 p-1.5 rounded-lg bg-zinc-900/95 backdrop-blur-sm shadow-lg border border-white/10"
      style={{ left: position.left, top: position.top }}
    >
      <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 h-7 px-2 text-xs" onClick={onBasic}>
        Basic
      </Button>
      <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 h-7 px-2 text-xs" onClick={onCloze}>
        Cloze
      </Button>
      <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 h-7 px-2 text-xs" onClick={onFront}>
        To Front
      </Button>
      <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 h-7 px-2 text-xs" onClick={onBack}>
        To Back
      </Button>
      <div className="w-px bg-white/20 mx-1" />
      <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 h-7 px-2 text-xs" onClick={onAiChat}>
        AI Chat
      </Button>
      <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 h-7 px-2 text-xs" onClick={onAiExplain}>
        Explain
      </Button>
    </div>
  );
}

// Editor Toolbar
function EditorToolbar({ onFormat }) {
  const tools = [
    { icon: Bold, label: "Bold", action: () => onFormat("bold") },
    { icon: Italic, label: "Italic", action: () => onFormat("italic") },
    { icon: Heading1, label: "H1", action: () => onFormat("h1") },
    { icon: Heading2, label: "H2", action: () => onFormat("h2") },
    { icon: Heading3, label: "H3", action: () => onFormat("h3") },
    { icon: List, label: "List", action: () => onFormat("ul") },
    { icon: Quote, label: "Quote", action: () => onFormat("quote") },
    { icon: Code, label: "Code", action: () => onFormat("code") },
    { icon: Eraser, label: "Clear", action: () => onFormat("clear") },
  ];

  return (
    <div className="border-b p-2 flex items-center gap-1 bg-background">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <Button key={tool.label} variant="ghost" size="sm" title={tool.label} onClick={tool.action} className="h-7 w-7 p-0">
            <Icon className="h-3.5 w-3.5" />
          </Button>
        );
      })}
    </div>
  );
}

export function EditorView() {
  const backendStatus = useAppStore((s) => s.backendStatus);
  const { notes, currentNote, loadNotes, loadNote, updateNote, deleteNote, duplicateNote } = useNotesStore();
  const { cards, loadCards, createCard, deleteCard } = useCardsStore();
  const [noteId, setNoteId] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [deck, setDeck] = useState("Default");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showCardDrawer, setShowCardDrawer] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [newCardFront, setNewCardFront] = useState("");
  const [newCardBack, setNewCardBack] = useState("");
  const [newCardType, setNewCardType] = useState("basic");
  const [newCardTags, setNewCardTags] = useState("");
  const [newCardExtra, setNewCardExtra] = useState("");
  const [newCardSourceLocator, setNewCardSourceLocator] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [selection, setSelection] = useState(null);
  // Theme
  const { theme, setTheme } = useTheme();
  const [showSource, setShowSource] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiMode, setAiMode] = useState("chat");
  const [showPreview, setShowPreview] = useState(false);
  const [coverageView, setCoverageView] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [coverageReport, setCoverageReport] = useState(null);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [noteSource, setNoteSource] = useState(null);
  const editorCommandsRef = useRef(null);
  const chatEndRef = useRef(null);
  const saveTimerRef = useRef(null);
  const [wordCount, setWordCount] = useState(0);
  // AI Panel state
  const [chatMessages, setChatMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiExplainContext, setAiExplainContext] = useState("");
  const [aiExplainInstructions, setAiExplainInstructions] = useState("");
  const [aiProcessing, setAiProcessing] = useState(false);
  const [explainResult, setExplainResult] = useState(null);

  // Load notes on mount
  useEffect(() => {
    if (backendStatus === "running" && notes.length === 0) {
      loadNotes().catch((err) => console.error("Failed to load notes:", err));
    }
  }, [backendStatus, loadNotes, notes.length]);

  // Load note when selected
  useEffect(() => {
    if (noteId) {
      loadNote(noteId).then((note) => {
        if (note) {
          setTitle(note.meta?.title || "Untitled note");
          setContent(note.content || "");
          setTags(note.meta?.tags?.join(", ") || "");
          setDeck(note.meta?.default_deck || "Default");
          setPinned(note.meta?.pinned || false);
          loadCards(noteId).catch(console.error);
          loadNoteSource(noteId);
          setStatus(`Saved · ${new Date(note.meta?.updated_at).toLocaleTimeString()}`);
        }
      }).catch(console.error);
    }
  }, [noteId, loadNote, loadCards]);

  // Load note source
  const loadNoteSource = async (id) => {
    if (!id) return;
    try {
      const source = await api.getNoteSource(id);
      setNoteSource(source);
    } catch (err) {
      // Source not found, ignore
    }
  };

  // Word count
  useEffect(() => {
    const words = content.match(/\b\w+\b/g)?.length || 0;
    setWordCount(words);
  }, [content]);

  // Apply selection to card drawer
  const applySelectionToDrawer = useCallback((mode) => {
    if (!selection?.text) {
      toast.error("Select some text first");
      return;
    }
    const text = selection.text;
    if (mode === "basic") {
      const parts = text.split(/(::|\t| — | – | - | : )/);
      if (parts.length >= 3) {
        setNewCardFront(parts[0].trim());
        setNewCardBack(parts.slice(2).join("").trim());
      } else {
        setNewCardFront("");
        setNewCardBack(text.trim());
      }
      setNewCardType("basic");
    } else if (mode === "cloze") {
      setNewCardFront(`{{c1::${text}}}`);
      setNewCardType("cloze");
    } else if (mode === "front") {
      setNewCardFront((prev) => prev ? `${prev}\n${text}` : text);
    } else if (mode === "back") {
      setNewCardBack((prev) => prev ? `${prev}\n${text}` : text);
    }
    setShowCardDrawer(true);
    setSelection(null);
  }, [selection]);

  // Handle text selection in editor
  const handleEditorSelect = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setSelection(null);
      return;
    }
    const text = sel.toString().trim();
    if (!text) {
      setSelection(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelection({ text, rect });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if (mod && e.key === "n") {
        e.preventDefault();
        handleCreateNote();
      }
      if (mod && e.shiftKey && e.key === "k") {
        e.preventDefault();
        applySelectionToDrawer("basic");
      }
      if (mod && e.shiftKey && e.key === "c") {
        e.preventDefault();
        applySelectionToDrawer("cloze");
      }
      if (e.key === "Escape") {
        setSelection(null);
        setShowCardDrawer(false);
        setShowSearch(false);
        setShowAiPanel(false);
        setShowPreview(false);
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [noteId, title, content, tags, deck, applySelectionToDrawer]);

  // Auto-join tags
  const joinTags = (tags) => (tags || []).join(", ");
  const parseTags = (value) => value.split(",").map((t) => t.trim()).filter(Boolean);

  // Auto-save with debounce
  const scheduleSave = useCallback(() => {
    setStatus("Saving...");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (!noteId) return;
      setSaving(true);
      updateNote(noteId, {
        title: title || "Untitled note",
        content,
        tags: parseTags(tags),
        default_deck: deck,
        pinned,
      }).then(() => {
        setStatus(`Saved · ${new Date().toLocaleTimeString()}`);
        setSaving(false);
      }).catch((err) => {
        setStatus("Unsaved changes");
        toast.error(`Save failed: ${err.message}`);
        setSaving(false);
      });
    }, 850);
  }, [noteId, title, content, tags, deck, pinned, updateNote]);

  const handleSave = async () => {
    if (!noteId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaving(true);
    setStatus("Saving...");
    try {
      await updateNote(noteId, {
        title: title || "Untitled note",
        content,
        tags: parseTags(tags),
        default_deck: deck,
        pinned,
      });
      setStatus(`Saved · ${new Date().toLocaleTimeString()}`);
      toast.success("Note saved");
    } catch (err) {
      setStatus("Unsaved changes");
      toast.error(`Failed to save: ${err.message}`);
    }
    setSaving(false);
  };

  const handleCreateNote = async () => {
    try {
      const note = await api.createNote({ title: "Untitled note", tags: [] });
      await loadNotes();
      setNoteId(note.meta.id);
    } catch (err) {
      toast.error(`Failed to create note: ${err.message}`);
    }
  };

  const handleDuplicateNote = async () => {
    if (!noteId) return;
    try {
      await duplicateNote(noteId, `Copy of ${title}`);
      await loadNotes();
      toast.success("Note duplicated");
    } catch (err) {
      toast.error(`Failed to duplicate: ${err.message}`);
    }
  };

  const handleDeleteNote = async () => {
    if (!noteId) return;
    if (!confirm("Delete this note and all cards?")) return;
    try {
      await deleteNote(noteId);
      setNoteId(null);
      await loadNotes();
      if (notes.length > 0) setNoteId(notes[0].meta.id);
      toast.success("Note deleted");
    } catch (err) {
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  const handleFormat = (type) => {
    const commands = editorCommandsRef.current;
    if (!commands) return;

    const selected = commands.getSelection();

    switch (type) {
      case "bold": commands.wrapText("**"); break;
      case "italic": commands.wrapText("*"); break;
      case "h1": commands.insertText(`# ${selected || "Heading"}\n`); break;
      case "h2": commands.insertText(`## ${selected || "Heading"}\n`); break;
      case "h3": commands.insertText(`### ${selected || "Heading"}\n`); break;
      case "ul": commands.insertText(`- ${selected || "Item"}\n`); break;
      case "quote": commands.insertText(`> ${selected || "Quote"}\n`); break;
      case "code": commands.wrapText("`"); break;
      case "clear": break;
    }
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
        deck_name: deck || "Default",
        tags: parseTags(newCardTags),
        extra: newCardExtra,
        source_locator: newCardSourceLocator,
      });
      setNewCardFront("");
      setNewCardBack("");
      setNewCardTags("");
      setNewCardExtra("");
      setNewCardSourceLocator("");
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

  const handlePushToAnki = async () => {
    if (!noteId || cards.length === 0) {
      toast.error("No cards to push");
      return;
    }
    try {
      const result = await api.pushToAnki(noteId);
      toast.success(`Pushed ${result.pushed?.length || 0} cards to Anki`);
    } catch (err) {
      toast.error(`Push failed: ${err.message}`);
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

  // Coverage analysis
  const loadCoverage = async () => {
    if (!noteId) return;
    setCoverageLoading(true);
    try {
      const report = await api.getCoverage(noteId);
      setCoverageReport(report);
      toast.success("Analysis complete");
    } catch (err) {
      toast.error(`Analysis failed: ${err.message}`);
    }
    setCoverageLoading(false);
  };

  // Export cards
  const handleExport = async (format) => {
    if (!noteId || cards.length === 0) {
      toast.error("No cards to export");
      return;
    }
    try {
      const result = await api.exportCards(noteId, format);
      toast.success(`Exported as ${format.toUpperCase()}`);
      // Trigger download from backend URL
      if (result?.url) {
        window.open(result.url, "_blank");
      }
    } catch (err) {
      toast.error(`Export failed: ${err.message}`);
    }
  };

  // AI Chat handler
  const handleAiChat = async () => {
    if (!aiInput.trim() || !noteId) return;
    setAiProcessing(true);
    const userMessage = { role: "user", content: aiInput, timestamp: new Date().toLocaleTimeString() };
    setChatMessages((prev) => [...prev, userMessage]);
    const currentInput = aiInput;
    setAiInput("");
    try {
      const contextText = selection?.text || content?.slice(0, 3000) || "";
      const result = await api.aiChat({ message: currentInput, note_id: noteId, context_text: contextText });
      const aiText = result?.content || result?.response || result?.text || "No response";
      setChatMessages((prev) => [...prev, { role: "assistant", content: aiText, timestamp: new Date().toLocaleTimeString() }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err.message}`, timestamp: new Date().toLocaleTimeString() }]);
    }
    setAiProcessing(false);
  };

  // AI Explain handler
  const handleAiExplain = async () => {
    if (!aiExplainContext.trim()) return;
    setAiProcessing(true);
    try {
      const result = await api.aiExplain({
        context_text: aiExplainContext,
        instructions: aiExplainInstructions,
        note_id: noteId,
      });
      setExplainResult(result?.explanation || result?.content || result?.response || "No explanation returned");
    } catch (err) {
      toast.error(`Explain failed: ${err.message}`);
    }
    setAiProcessing(false);
  };

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (note.meta?.title || "").toLowerCase().includes(term) ||
           (note.meta?.tags || []).some((t) => t.toLowerCase().includes(term)) ||
           (note.meta?.default_deck || "").toLowerCase().includes(term);
  }).sort((a, b) => {
    if (a.meta?.pinned && !b.meta?.pinned) return -1;
    if (!a.meta?.pinned && b.meta?.pinned) return 1;
    return new Date(b.meta?.updated_at) - new Date(a.meta?.updated_at);
  });

  return (
    <div className="flex h-full overflow-hidden" data-testid="editor-view">
      {/* Sidebar */}
      <aside className={`border-r bg-muted/30 flex flex-col transition-all duration-200 ${sidebarCollapsed ? 'w-10' : 'w-64'}`}>
        <div className="p-2 border-b flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="font-semibold text-sm">Notes ({filteredNotes.length})</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        {!sidebarCollapsed && (
          <>
            <div className="p-3 border-b">
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleCreateNote}>
                  <Plus className="h-3 w-3 mr-1" /> New
                </Button>
                {showSearch ? (
                  <Button variant="ghost" size="sm" onClick={() => setShowSearch(false)}>✕</Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setShowSearch(true)}>
                    <Search className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {showSearch && (
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full mt-2 px-2 py-1 text-sm border rounded bg-background"
                />
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
              {filteredNotes.map((note) => (
                <Button
                  key={note.meta.id}
                  variant={noteId === note.meta.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => setNoteId(note.meta.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate text-sm">{note.meta.title || "Untitled"}</div>
                    <div className="text-xs text-muted-foreground flex gap-2">
                      <span>{note.card_count || 0} cards</span>
                      <span>{note.word_count || 0} words</span>
                    </div>
                    {note.meta.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {note.meta.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs py-0 h-4">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {note.meta.pinned && <Badge variant="secondary" className="ml-1 text-xs">📌</Badge>}
                </Button>
              ))}
              {filteredNotes.length === 0 && (
                <p className="text-sm text-muted-foreground p-2 text-center">
                  {searchTerm ? "No matches" : "No notes yet"}
                </p>
              )}
            </div>
            <div className="p-2 border-t flex gap-1">
              <Button variant="ghost" size="sm" className="flex-1" onClick={handleDuplicateNote} disabled={!noteId}>
                <Copy className="h-3 w-3 mr-1" /> Duplicate
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 text-red-500" onClick={handleDeleteNote} disabled={!noteId}>
                <Trash2 className="h-3 w-3 mr-1" /> Delete
              </Button>
            </div>
          </>
        )}
      </aside>

      {/* Main Editor */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {noteId ? (
          <div className="flex flex-col h-full min-h-0">
            {/* Toolbar */}
            <header className="border-b p-3 flex items-center gap-3 bg-background">
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); scheduleSave(); }}
                placeholder="Note title..."
                className="flex-1 text-lg font-medium bg-transparent border-none outline-none"
              />
              <div className="flex items-center gap-2">
                {/* Theme Toggle */}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                  const themes = ["system", "light", "dark"];
                  const next = themes[(themes.indexOf(theme) + 1) % themes.length];
                  setTheme(next);
                }} title={`Theme: ${theme}`}>
                  {theme === "light" ? <Sun className="h-3.5 w-3.5" /> :
                   theme === "dark" ? <Moon className="h-3.5 w-3.5" /> :
                   <Monitor className="h-3.5 w-3.5" />}
                </Button>

                {/* Details Toggle */}
                <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> Details
                </Button>

                {/* Push to Anki */}
                <Button variant="outline" size="sm" onClick={handlePushToAnki}>
                  <Layers className="h-3.5 w-3.5 mr-1" /> Push
                </Button>

                {/* AI Generate */}
                <Button variant="outline" size="sm" onClick={handleAiGenerate} disabled={aiLoading}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  {aiLoading ? "..." : "AI"}
                </Button>

                {/* Coverage */}
                <Button variant="outline" size="sm" onClick={() => setCoverageView(!coverageView)}>
                  <BookOpen className="h-3.5 w-3.5 mr-1" /> Coverage
                </Button>

                {/* Preview Toggle */}
                <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} title="Toggle Markdown Preview">
                  <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                </Button>

                {/* AI Panel Toggle */}
                <Button variant={showAiPanel ? "secondary" : "outline"} size="sm" onClick={() => setShowAiPanel(!showAiPanel)}>
                  <MessageSquare className="h-3.5 w-3.5 mr-1" /> AI
                </Button>

                {/* Save */}
                <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {saving ? "..." : "Save"}
                </Button>
              </div>
            </header>

            {/* Details Panel */}
            {showDetails && (
              <div className="border-b p-3 bg-muted/30 grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Tags</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => { setTags(e.target.value); scheduleSave(); }}
                    placeholder="biology, chapter-2"
                    className="w-full text-sm bg-transparent border-none outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Deck</label>
                  <input
                    type="text"
                    value={deck}
                    onChange={(e) => { setDeck(e.target.value); scheduleSave(); }}
                    placeholder="Default"
                    className="w-full text-sm bg-transparent border-none outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pinned}
                      onChange={(e) => { setPinned(e.target.checked); scheduleSave(); }}
                    />
                    <span className="text-sm">Pinned</span>
                  </label>
                </div>
              </div>
            )}

            {/* Status Bar */}
            <div className="border-b px-3 py-1 flex items-center justify-between bg-muted/20">
              <span className="text-xs text-muted-foreground">{status}</span>
              <span className="text-xs text-muted-foreground">{wordCount} words</span>
            </div>

            {/* Editor Toolbar */}
            <EditorToolbar onFormat={handleFormat} />

            {/* Main Content Area */}
            <div className="flex-1 flex min-h-0">
              {coverageView && coverageReport ? (
                // Coverage View
                <div className="flex-1 p-4 overflow-auto min-h-0">
                  <div className="max-w-3xl mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Coverage Analysis</h3>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={loadCoverage} disabled={coverageLoading}>
                          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${coverageLoading ? "animate-spin" : ""}`} />
                          Refresh
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setCoverageView(false)}>
                          Back to Editor
                        </Button>
                      </div>
                    </div>
                    {coverageReport.propositions && (
                      <>
                        {/* Coverage Stats */}
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="default" className="text-sm">
                            {(coverageReport.propositions.filter((p) => p.matched)?.length || 0)} covered
                          </Badge>
                          <Badge variant="destructive" className="text-sm">
                            {(coverageReport.propositions.filter((p) => !p.matched)?.length || 0)} gaps
                          </Badge>
                          {coverageReport.conflicts?.length > 0 && (
                            <Badge variant="secondary" className="text-sm">
                              {coverageReport.conflicts.length} conflicts
                            </Badge>
                          )}
                        </div>

                        {/* Coverage Text */}
                        <div className="border rounded p-4 bg-background font-mono text-sm leading-relaxed whitespace-pre-wrap">
                          {coverageReport.coverage_html || "No coverage data"}
                        </div>

                        {/* Gaps */}
                        {coverageReport.propositions.filter((p) => !p.matched).length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Gaps</h4>
                            <div className="space-y-2">
                              {coverageReport.propositions.filter((p) => !p.matched).slice(0, 10).map((gap, i) => (
                                <div key={i} className="border-l-2 border-red-500 pl-3 py-1">
                                  <p className="text-sm">{gap.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : showPreview ? (
                // Split Preview
                <div className="flex-1 flex min-h-0 overflow-hidden">
                  <div className="flex-1 flex flex-col min-h-0">
                    <ObsidianEditor
                      value={content}
                      onChange={(newContent) => { setContent(newContent); scheduleSave(); }}
                      onSelect={setSelection}
                      placeholder="Write your notes here... Markdown supported"
                      commandsRef={editorCommandsRef}
                    />
                  </div>
                  <div className="w-px border-l bg-border" />
                  <div className="flex-1 overflow-auto p-4 bg-background">
                    <div
                      className="prose prose-sm max-w-none prose-headings:font-semibold prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-pre:bg-muted prose-pre:rounded"
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
                    />
                  </div>
                </div>
              ) : (
                // Editor
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <ObsidianEditor
                    value={content}
                    onChange={(newContent) => { setContent(newContent); scheduleSave(); }}
                    onSelect={setSelection}
                    placeholder="Write your notes here... Markdown supported"
                    commandsRef={editorCommandsRef}
                  />
                </div>
              )}

              {/* Cards Sidebar */}
              {showCardDrawer && (
                <aside className="w-80 border-l bg-muted/20 flex flex-col min-h-0">
                  <div className="p-3 border-b flex items-center justify-between">
                    <h3 className="font-semibold">Cards ({cards.length})</h3>
                    <Button variant="ghost" size="icon" onClick={() => setShowCardDrawer(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Export */}
                  <div className="px-3 py-2 border-b flex gap-1">
                    <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => handleExport("csv")}>CSV</Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => handleExport("anki-txt")}>TXT</Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => handleExport("apkg")}>APKG</Button>
                  </div>

                  {/* New Card */}
                  <div className="p-3 border-b space-y-2">
                    <select
                      value={newCardType}
                      onChange={(e) => setNewCardType(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm bg-background"
                    >
                      <option value="basic">Basic</option>
                      <option value="reverse">Basic + Reverse</option>
                      <option value="cloze">Cloze</option>
                    </select>
                    <textarea
                      value={newCardFront}
                      onChange={(e) => setNewCardFront(e.target.value)}
                      placeholder="Front"
                      className="w-full px-2 py-1 border rounded text-sm resize-none bg-background"
                      rows={2}
                    />
                    {newCardType !== "cloze" && (
                      <textarea
                        value={newCardBack}
                        onChange={(e) => setNewCardBack(e.target.value)}
                        placeholder="Back"
                        className="w-full px-2 py-1 border rounded text-sm resize-none bg-background"
                        rows={2}
                      />
                    )}
                    <textarea
                      value={newCardExtra}
                      onChange={(e) => setNewCardExtra(e.target.value)}
                      placeholder="Extra (for cloze)"
                      className="w-full px-2 py-1 border rounded text-sm resize-none bg-background"
                      rows={1}
                    />
                    <input
                      type="text"
                      value={newCardSourceLocator}
                      onChange={(e) => setNewCardSourceLocator(e.target.value)}
                      placeholder="Source: Page 4 / Slide 2"
                      className="w-full px-2 py-1 border rounded text-sm bg-background"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={handleAddCard}>Save</Button>
                      <Button variant="outline" size="sm" onClick={() => { handleAddCard(); handlePushToAnki(); }}>
                        Save & Push
                      </Button>
                    </div>
                  </div>

                  {/* Card List */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {cards.map((card) => (
                      <Card key={card.id}>
                        <CardContent className="p-2 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{card.front}</p>
                              {card.back && <p className="text-xs text-muted-foreground truncate">{card.back}</p>}
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleDeleteCard(card.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex gap-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">{card.type}</Badge>
                            {card.deck_name && <Badge variant="outline" className="text-xs">{card.deck_name}</Badge>}
                            {card.tags?.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {cards.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No cards yet. Use text selection or AI to create cards.
                      </p>
                    )}
                  </div>
                </aside>
              )}
            </div>

            {/* AI Panel (right sidebar) */}
            {showAiPanel && (
              <div className="w-96 border-l bg-muted/20 flex flex-col min-h-0">
                <div className="p-3 border-b flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={aiMode === "chat" ? "secondary" : "ghost"}
                      onClick={() => setAiMode("chat")}
                      className="h-7 text-xs"
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1" /> Chat
                    </Button>
                    <Button
                      size="sm"
                      variant={aiMode === "explain" ? "secondary" : "ghost"}
                      onClick={() => setAiMode("explain")}
                      className="h-7 text-xs"
                    >
                      <Lightbulb className="h-3.5 w-3.5 mr-1" /> Explain
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAiPanel(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {aiMode === "chat" && (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                      {chatMessages.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Start a conversation about this note. Selected text will be included as context.
                        </p>
                      )}
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <span className="text-xs opacity-60 mt-1 block">{msg.timestamp}</span>
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Context Preview */}
                    {selection?.text && (
                      <div className="px-3 py-1 border-t text-xs text-muted-foreground truncate">
                        Context: "{selection.text.slice(0, 50)}..."
                      </div>
                    )}

                    {/* Chat Input */}
                    <div className="p-3 border-t flex gap-2">
                      <textarea
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAiChat();
                          }
                        }}
                        placeholder="Ask about this note..."
                        className="flex-1 px-2 py-1.5 border rounded text-sm bg-background resize-none"
                        rows={2}
                        disabled={aiProcessing}
                      />
                      <Button size="sm" onClick={handleAiChat} disabled={aiProcessing || !aiInput.trim()}>
                        {aiProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {aiMode === "explain" && (
                  <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-3 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Context text
                      </label>
                      <textarea
                        value={aiExplainContext}
                        onChange={(e) => setAiExplainContext(e.target.value)}
                        rows={5}
                        className="w-full px-2 py-1.5 border rounded text-sm bg-background resize-none"
                        disabled={aiProcessing}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Instructions (optional)
                      </label>
                      <textarea
                        value={aiExplainInstructions}
                        onChange={(e) => setAiExplainInstructions(e.target.value)}
                        placeholder="e.g., Explain this like I'm 12 years old..."
                        rows={2}
                        className="w-full px-2 py-1.5 border rounded text-sm bg-background resize-none"
                        disabled={aiProcessing}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={handleAiExplain}
                      disabled={aiProcessing || !aiExplainContext.trim()}
                    >
                      {aiProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Lightbulb className="h-4 w-4 mr-1" />}
                      Explain
                    </Button>
                    {explainResult && (
                      <Card className="mt-2">
                        <CardContent className="p-3">
                          <h4 className="text-sm font-medium mb-2">Explanation</h4>
                          <p className="text-sm whitespace-pre-wrap">{explainResult}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Source Panel (if imported) */}
            {noteSource && noteSource.items?.length > 0 && (
              <div className="border-t max-h-48 overflow-auto">
                <div className="p-3 border-b flex items-center justify-between">
                  <h4 className="text-sm font-medium">Source: {noteSource.original_filename || "Imported"}</h4>
                  <Button variant="ghost" size="sm" onClick={() => setShowSource(!showSource)}>
                    {showSource ? "Hide" : "Show"}
                  </Button>
                </div>
                {showSource && (
                  <div className="p-3 space-y-2">
                    {noteSource.items.map((item, i) => (
                      <div key={i} className="border rounded p-2">
                        <div className="text-xs font-medium text-muted-foreground">{item.label}</div>
                        <pre className="text-xs mt-1 whitespace-pre-wrap">{item.text}</pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Coverage Analysis Panel */}
            {!coverageView && (
              <div className="border-t p-2 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowCardDrawer(!showCardDrawer)}>
                  <Layers className="h-3.5 w-3.5 mr-1" />
                  Cards ({cards.length})
                </Button>
                <Button variant="outline" size="sm" onClick={loadCoverage} disabled={coverageLoading}>
                  <BookOpen className="h-3.5 w-3.5 mr-1" />
                  {coverageLoading ? "Analyzing..." : "Analyze"}
                </Button>
              </div>
            )}

            {/* Quick Card Dock */}
            <QuickCardDock
              noteId={noteId}
              deck={deck}
              onSave={async ({ front, back, deck }) => {
                try {
                  await createCard(noteId, { front, back, type: "basic", deck_name: deck || "Default" });
                  toast.success("Card saved");
                  loadCards(noteId);
                } catch (err) {
                  toast.error(`Failed: ${err.message}`);
                }
              }}
              onSaveAndPush={async ({ front, back, deck }) => {
                try {
                  const card = await createCard(noteId, { front, back, type: "basic", deck_name: deck || "Default" });
                  await api.pushToAnki(noteId);
                  toast.success("Card saved & pushed");
                  loadCards(noteId);
                } catch (err) {
                  toast.error(`Failed: ${err.message}`);
                }
              }}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center max-w-md p-8">
              <Edit3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Welcome to Nanki</h2>
              <p className="text-muted-foreground mb-6">
                Create or select a note to start writing. Use Markdown for formatting.
              </p>
              <div className="flex justify-center gap-3">
                <Button onClick={handleCreateNote}>
                  <Plus className="h-4 w-4 mr-2" /> New Note
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Selection Bubble */}
      <SelectionBubble
        selection={selection}
        onBasic={() => applySelectionToDrawer("basic")}
        onCloze={() => applySelectionToDrawer("cloze")}
        onFront={() => applySelectionToDrawer("front")}
        onBack={() => applySelectionToDrawer("back")}
        onAiChat={() => {
          setShowAiPanel(true);
          setAiMode("chat");
          setAiInput(`Explain this: "${selection?.text?.slice(0, 200)}"`);
          setSelection(null);
        }}
        onAiExplain={() => {
          setShowAiPanel(true);
          setAiMode("explain");
          setAiExplainContext(selection?.text?.slice(0, 1000) || "");
          setAiExplainInstructions("");
          setSelection(null);
        }}
      />
    </div>
  );
}
