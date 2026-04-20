import { useState, useEffect, useRef } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { toast } from "sonner";
import { api } from "../../lib/api";
import {
  MessageSquare, Lightbulb, Layers, Send, Loader2, X, ChevronDown,
  Sparkles, Save, RefreshCw
} from "lucide-react";

export function AiModal({ noteId, noteContent, selectionText, noteMeta, isOpen, onClose, noteCards = [], onCardsSaved }) {
  const [activeTab, setActiveTab] = useState("chat");
  const [aiSettings, setAiSettings] = useState(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatContext, setChatContext] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Explain state
  const [explainText, setExplainText] = useState("");
  const [explainQuestion, setExplainQuestion] = useState("");
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainResult, setExplainResult] = useState("");

  // Cards state
  const [cardsText, setCardsText] = useState("");
  const [cardCount, setCardCount] = useState("8");
  const [cardsLoading, setCardsLoading] = useState(false);
  const [generatedCards, setGeneratedCards] = useState([]);
  const [cardsMeta, setCardsMeta] = useState("");

  // Load AI settings
  useEffect(() => {
    api.getSettings().then(s => setAiSettings(s?.ai || null)).catch(() => {});
  }, []);

  // Auto-fill context when opening modal or tab
  useEffect(() => {
    if (activeTab === "chat" && selectionText) {
      setChatContext(selectionText);
    }
  }, [activeTab, selectionText]);

  // Reset state when note changes
  useEffect(() => {
    setChatMessages([]);
    setGeneratedCards([]);
    setCardsMeta("");
    setExplainResult("");
    setChatContext("");
    setExplainText("");
    setCardsText("");
  }, [noteId]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (!isOpen) return null;

  // Chat handler
  const handleSendChat = async () => {
    if (!chatInput.trim() || !noteId) return;
    setChatLoading(true);
    const userMsg = { role: "user", content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    const input = chatInput;
    setChatInput("");
    try {
      const context = chatContext || selectionText || noteContent?.slice(0, 3000) || "";
      const result = await api.aiChat({
        note_id: noteId,
        context_text: context,
        selected_text: selectionText || "",
        messages: [...chatMessages, userMsg],
        model: aiSettings?.chat_model || aiSettings?.default_model || null,
      });
      const aiText = result?.content || result?.response || result?.text || "No response";
      setChatMessages(prev => [...prev, { role: "assistant", content: aiText }]);
    } catch (err) {
      setChatMessages(prev => prev.slice(0, -1));
      toast.error(`AI chat failed: ${err.message}`);
    }
    setChatLoading(false);
  };

  // Explain handler
  const handleExplain = async () => {
    const text = explainText.trim();
    if (!text || !noteId) {
      toast.error("Add some text first");
      return;
    }
    setExplainLoading(true);
    try {
      const result = await api.aiExplain({
        note_id: noteId,
        selected_text: text,
        question: explainQuestion.trim(),
        model: aiSettings?.explain_model || aiSettings?.default_model || null,
      });
      setExplainResult(result?.content || result?.explanation || result?.response || "No explanation");
    } catch (err) {
      toast.error(`AI explain failed: ${err.message}`);
    }
    setExplainLoading(false);
  };

  // Generate cards handler
  const handleGenerateCards = async ({ auto = false } = {}) => {
    if (!noteId) return;
    const text = auto ? noteContent : cardsText.trim();
    if (!text) {
      toast.error("Add some text first");
      return;
    }
    setCardsLoading(true);
    setCardsMeta("...");
    try {
      const isAutoCount = cardCount === "auto";
      const result = await api.generateCards(noteId, {
        source_text: text,
        target_count: isAutoCount ? null : Math.max(1, Math.min(48, Number(cardCount) || 8)),
        auto,
        model: auto
          ? (aiSettings?.auto_flashcard_model || aiSettings?.default_model || null)
          : (aiSettings?.flashcard_model || aiSettings?.default_model || null),
        include_anki_coverage: Boolean(aiSettings?.use_anki_coverage_context),
      });
      setGeneratedCards(result.cards || []);
      setCardsMeta(`Scanned ${result.total_anki_cards_scanned || 0} Anki cards, ${result.relevant_anki_cards_shared || 0} relevant semantic matches`);
      toast.success(`Generated ${result.cards?.length || 0} card drafts`);
    } catch (err) {
      setGeneratedCards([]);
      setCardsMeta(err.message || String(err));
      toast.error(`AI card generation failed: ${err.message}`);
    }
    setCardsLoading(false);
  };

  // Save all generated cards
  const handleSaveCards = async () => {
    if (!generatedCards.length || !noteId) return;
    let savedCount = 0;
    for (const card of generatedCards) {
      try {
        await api.createCard(noteId, {
          type: card.type || "basic",
          front: card.front || "",
          back: card.back || "",
          extra: card.extra || "",
          tags: Array.isArray(card.tags) ? card.tags : [],
          deck_name: noteMeta?.default_deck || "Default",
          source_excerpt: card.source_excerpt || cardsText.trim().slice(0, 180),
          source_locator: noteMeta?.title || "",
        });
        savedCount++;
      } catch (err) {
        toast.error(`Failed to save card: ${err.message}`);
      }
    }
    toast.success(`Saved ${savedCount} card(s)`);
    setGeneratedCards([]);
    setCardsMeta("");
    onCardsSaved?.();
    onClose?.();
  };

  const tabs = [
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "explain", label: "Explain", icon: Lightbulb },
    { id: "cards", label: "Cards", icon: Layers },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-background rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">AI Workspace</h2>
            <p className="text-sm text-muted-foreground">Chat, explain, and card generation for this note</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Provider/Context Pills */}
        <div className="flex gap-2 px-4 py-2 text-xs text-muted-foreground border-b">
          <Badge variant="outline" className="text-xs">
            Context: {selectionText ? selectionText.slice(0, 50) + "..." : (noteMeta?.title || "Full note")}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Provider: {aiSettings?.provider || "Not configured"}
          </Badge>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Chat Tab */}
          {activeTab === "chat" && (
            <div className="flex flex-col space-y-3">
              {/* Chat log */}
              <div className="flex-1 min-h-[200px] max-h-[300px] overflow-y-auto space-y-3 border rounded-lg p-3">
                {chatMessages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Start a conversation about this note. Selected text will be included as context.
                  </p>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Context quick inserts */}
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => selectionText && setChatContext(selectionText)}
                  disabled={!selectionText}
                >
                  Use selection
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => noteContent && setChatContext(noteContent)}
                  disabled={!noteContent}
                >
                  Use full note
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setChatMessages([])}
                  disabled={!chatMessages.length}
                >
                  Clear chat
                </Button>
              </div>

              {/* Context textarea */}
              <label className="text-xs font-medium text-muted-foreground">Context text</label>
              <textarea
                value={chatContext}
                onChange={(e) => setChatContext(e.target.value)}
                placeholder="Context will appear here..."
                className="w-full h-24 px-3 py-2 border rounded text-sm resize-none bg-background"
              />

              {/* Message input */}
              <label className="text-xs font-medium text-muted-foreground">Message</label>
              <div className="flex gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  placeholder="Ask about this note..."
                  className="flex-1 h-16 px-3 py-2 border rounded text-sm resize-none bg-background"
                  disabled={chatLoading}
                />
                <Button size="sm" onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()}>
                  {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Explain Tab */}
          {activeTab === "explain" && (
            <div className="space-y-3">
              {/* Quick inserts */}
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => selectionText && setExplainText(selectionText)}
                  disabled={!selectionText}
                >
                  Use selection
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => noteContent && setExplainText(noteContent)}
                  disabled={!noteContent}
                >
                  Use full note
                </Button>
              </div>

              {/* Input text */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Text to explain</label>
                <textarea
                  value={explainText}
                  onChange={(e) => setExplainText(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border rounded text-sm resize-none bg-background"
                />
              </div>

              {/* Question */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Optional instruction</label>
                <input
                  type="text"
                  value={explainQuestion}
                  onChange={(e) => setExplainQuestion(e.target.value)}
                  placeholder="Explain simply, compare, summarize..."
                  className="w-full px-3 py-2 border rounded text-sm bg-background"
                  disabled={explainLoading}
                />
              </div>

              {/* Run button */}
              <div className="flex justify-end">
                <Button size="sm" onClick={handleExplain} disabled={explainLoading || !explainText.trim()}>
                  {explainLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Lightbulb className="h-4 w-4 mr-1" />}
                  Explain
                </Button>
              </div>

              {/* Result */}
              {explainResult && (
                <Card>
                  <CardContent className="p-3">
                    <h4 className="text-sm font-medium mb-2">Explanation</h4>
                    <p className="text-sm whitespace-pre-wrap">{explainResult}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Cards Tab */}
          {activeTab === "cards" && (
            <div className="space-y-3">
              {/* Quick inserts */}
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => selectionText && setCardsText(selectionText)}
                  disabled={!selectionText}
                >
                  Use selection
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => noteContent && setCardsText(noteContent)}
                  disabled={!noteContent}
                >
                  Use full note
                </Button>
              </div>

              {/* Source text */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Source text</label>
                <textarea
                  value={cardsText}
                  onChange={(e) => setCardsText(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border rounded text-sm resize-none bg-background"
                />
              </div>

              {/* Card count */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-muted-foreground">Card count</label>
                <select
                  value={cardCount}
                  onChange={(e) => setCardCount(e.target.value)}
                  className="px-2 py-1 border rounded text-sm bg-background"
                >
                  <option value="auto">Auto (AI decides)</option>
                  <option value="4">4</option>
                  <option value="8">8</option>
                  <option value="12">12</option>
                  <option value="16">16</option>
                  <option value="24">24</option>
                </select>
              </div>

              {/* Generate buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleGenerateCards({ auto: false })}
                  disabled={cardsLoading || !cardsText.trim()}
                >
                  {cardsLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  Generate cards
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => handleGenerateCards({ auto: true })}
                  disabled={cardsLoading || !noteContent}
                >
                  Auto-create from whole note
                </Button>
                {generatedCards.length > 0 && (
                  <Button
                    variant="secondary" size="sm"
                    onClick={handleSaveCards}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save all cards
                  </Button>
                )}
              </div>

              {/* Meta info */}
              {cardsMeta && (
                <p className="text-xs text-muted-foreground">{cardsMeta}</p>
              )}

              {/* Generated card drafts */}
              {generatedCards.length > 0 ? (
                <div className="space-y-2">
                  {generatedCards.map((card, i) => (
                    <Card key={i}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">#{i + 1}</span>
                          <Badge variant="outline" className="text-xs">{card.type || "basic"}</Badge>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Front</p>
                          <p className="text-sm whitespace-pre-wrap">{card.front}</p>
                        </div>
                        {card.back && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Back</p>
                            <p className="text-sm whitespace-pre-wrap">{card.back}</p>
                          </div>
                        )}
                        {card.extra && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Extra</p>
                            <p className="text-sm whitespace-pre-wrap">{card.extra}</p>
                          </div>
                        )}
                        {card.source_excerpt && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Excerpt</p>
                            <p className="text-sm text-muted-foreground">{card.source_excerpt}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No AI card drafts yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
