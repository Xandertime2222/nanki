import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { useAppStore } from "../../stores/app-store";
import {
  BarChart3, RefreshCw, Loader2, Sparkles, CheckSquare, Square,
  ChevronDown, ChevronRight, Save, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";

export function AnalysisView() {
  const backendStatus = useAppStore((s) => s.backendStatus);
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCoverage, setLoadingCoverage] = useState(false);
  const [coverageMode, setCoverageMode] = useState("auto");

  // Auto-generate state
  const [targetCount, setTargetCount] = useState("10");
  const [generatingCards, setGeneratingCards] = useState(false);
  const [generatedCards, setGeneratedCards] = useState([]);
  const [selectedCardIds, setSelectedCardIds] = useState(new Set());
  const [savingCards, setSavingCards] = useState(false);
  const [showGenerated, setShowGenerated] = useState(true);

  // Gap-cards state
  const [generatingGapCards, setGeneratingGapCards] = useState(false);
  const [gapCards, setGapCards] = useState([]);
  const [selectedGapIds, setSelectedGapIds] = useState(new Set());
  const [showGapCards, setShowGapCards] = useState(true);

  useEffect(() => {
    if (backendStatus === "running") loadNotes();
  }, [backendStatus]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await api.getNotes();
      setNotes(data);
    } catch (err) {
      toast.error(`Notizen konnten nicht geladen werden: ${err.message}`);
    }
    setLoading(false);
  };

  const loadCoverage = async (noteId, mode = coverageMode) => {
    setLoadingCoverage(true);
    setCoverage(null);
    try {
      const data = await api.getCoverage(noteId, mode);
      setCoverage(data);
    } catch (err) {
      toast.error(`Abdeckungsanalyse fehlgeschlagen: ${err.message}`);
    }
    setLoadingCoverage(false);
  };

  const handleSelectNote = (note) => {
    setSelectedNote(note);
    setCoverage(null);
    setGeneratedCards([]);
    setGapCards([]);
    setSelectedCardIds(new Set());
    setSelectedGapIds(new Set());
    loadCoverage(note.meta.id);
  };

  // ── Auto-generate cards from full note ─────────────────────────────────────

  const handleAutoGenerate = async () => {
    if (!selectedNote) return;
    setGeneratingCards(true);
    setGeneratedCards([]);
    setSelectedCardIds(new Set());
    try {
      const result = await api.generateCards(selectedNote.meta.id, {
        auto: true,
        target_count: parseInt(targetCount, 10),
      });
      const cards = result.cards || [];
      setGeneratedCards(cards);
      setSelectedCardIds(new Set(cards.map((_, i) => i)));
      if (cards.length === 0) toast.info("KI hat keine Karten generiert – Notiz möglicherweise zu kurz.");
      else toast.success(`${cards.length} Karten generiert`);
    } catch (err) {
      toast.error(`Generierung fehlgeschlagen: ${err.message}`);
    }
    setGeneratingCards(false);
  };

  const toggleCard = (idx) =>
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });

  const toggleAllCards = (cards, setSelected) =>
    setSelected((prev) => (prev.size === cards.length ? new Set() : new Set(cards.map((_, i) => i))));

  const handleSaveGeneratedCards = async () => {
    if (!selectedNote || selectedCardIds.size === 0) return;
    setSavingCards(true);
    let saved = 0;
    for (const idx of selectedCardIds) {
      const card = generatedCards[idx];
      if (!card) continue;
      try {
        await api.createCard(selectedNote.meta.id, {
          type: card.type || "basic",
          front: card.front,
          back: card.back,
          extra: card.extra || "",
          tags: card.tags || [],
          deck_name: selectedNote.meta?.default_deck || "Default",
          source_excerpt: card.source_excerpt || "",
        });
        saved++;
      } catch (err) {
        toast.error(`Karte konnte nicht gespeichert werden: ${err.message}`);
      }
    }
    toast.success(`${saved} Karten gespeichert`);
    setGeneratedCards([]);
    setSelectedCardIds(new Set());
    setSavingCards(false);
  };

  // ── Generate cards for coverage gaps ───────────────────────────────────────

  const uncoveredPropositions = coverage?.propositions?.filter((p) => !p.matched) || [];

  const handleGenerateGapCards = async () => {
    if (!selectedNote || uncoveredPropositions.length === 0) {
      toast.error("Keine Lücken gefunden");
      return;
    }
    setGeneratingGapCards(true);
    setGapCards([]);
    setSelectedGapIds(new Set());
    try {
      const result = await api.aiSuggestCardsForGaps({
        note_id: selectedNote.meta.id,
        gap_excerpts: uncoveredPropositions.slice(0, 20).map((p) => p.text || ""),
      });
      const cards = result.cards || [];
      setGapCards(cards);
      setSelectedGapIds(new Set(cards.map((_, i) => i)));
      if (cards.length === 0) toast.info("Keine Kartenvorschläge für die Lücken.");
      else toast.success(`${cards.length} Karten für Lücken generiert`);
    } catch (err) {
      toast.error(`Generierung fehlgeschlagen: ${err.message}`);
    }
    setGeneratingGapCards(false);
  };

  const handleSaveGapCards = async () => {
    if (!selectedNote || selectedGapIds.size === 0) return;
    setSavingCards(true);
    let saved = 0;
    for (const idx of selectedGapIds) {
      const card = gapCards[idx];
      if (!card) continue;
      try {
        await api.createCard(selectedNote.meta.id, {
          type: card.type || "basic",
          front: card.front,
          back: card.back,
          extra: card.extra || "",
          tags: card.tags || [],
          deck_name: selectedNote.meta?.default_deck || "Default",
          source_excerpt: card.source_excerpt || "",
        });
        saved++;
      } catch (err) {
        toast.error(`Karte konnte nicht gespeichert werden: ${err.message}`);
      }
    }
    toast.success(`${saved} Karten gespeichert`);
    setGapCards([]);
    setSelectedGapIds(new Set());
    setSavingCards(false);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const CardPreviewList = ({ cards, selectedIds, onToggle, onToggleAll, onSave, saving, label }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onToggleAll}>
            {selectedIds.size === cards.length ? <CheckSquare className="h-3.5 w-3.5 mr-1" /> : <Square className="h-3.5 w-3.5 mr-1" />}
            Alle
          </Button>
          <span className="text-xs text-muted-foreground">{selectedIds.size} / {cards.length} ausgewählt</span>
        </div>
        <Button size="sm" onClick={onSave} disabled={saving || selectedIds.size === 0}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
          {selectedIds.size} {label} speichern
        </Button>
      </div>
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`border rounded-lg p-2.5 cursor-pointer transition-colors ${
              selectedIds.has(idx) ? "border-primary bg-primary/5" : "opacity-60"
            }`}
            onClick={() => onToggle(idx)}
          >
            <div className="flex items-start gap-2">
              {selectedIds.has(idx)
                ? <CheckSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                : <Square className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{card.front}</p>
                {card.back && <p className="text-xs text-muted-foreground mt-0.5">{card.back}</p>}
                <div className="flex gap-1 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">{card.type || "basic"}</Badge>
                  {card.tags?.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6" data-testid="analysis-view">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Analyse</h1>
          <Badge variant={backendStatus === "running" ? "success" : "secondary"}>
            {backendStatus === "running" ? "Verbunden" : "Offline"}
          </Badge>
        </div>
        <Button variant="outline" size="icon" onClick={loadNotes} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Note selector */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Notiz auswählen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {loading && notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Lädt…</p>
            ) : notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Notizen vorhanden</p>
            ) : (
              notes.map((note) => (
                <Button
                  key={note.meta.id}
                  variant={selectedNote?.meta.id === note.meta.id ? "default" : "outline"}
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => handleSelectNote(note)}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm">{note.meta.title}</div>
                    <div className="text-xs opacity-70">{note.card_count || 0} Karten</div>
                  </div>
                </Button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right panel */}
        <div className="md:col-span-2 space-y-4">

          {/* ── Coverage analysis ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selectedNote ? selectedNote.meta.title : "Abdeckungsanalyse"}
              </CardTitle>
              <CardDescription>
                Zeigt wie gut deine Karten den Notizinhalt abdecken
              </CardDescription>
              {selectedNote && (
                <div className="flex items-center gap-2 mt-2">
                  <Select
                    value={coverageMode}
                    onValueChange={(v) => { setCoverageMode(v); loadCoverage(selectedNote.meta.id, v); }}
                  >
                    <SelectTrigger className="w-48 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automatisch</SelectItem>
                      <SelectItem value="history">Geschichte / Geographie</SelectItem>
                      <SelectItem value="science">Naturwissenschaften / Medizin</SelectItem>
                      <SelectItem value="vocabulary">Vokabular</SelectItem>
                      <SelectItem value="universal">Universal</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => loadCoverage(selectedNote.meta.id)} disabled={loadingCoverage}>
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingCoverage ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!selectedNote ? (
                <p className="text-sm text-muted-foreground">Wähle links eine Notiz aus</p>
              ) : loadingCoverage ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : coverage ? (
                <div className="space-y-4">
                  {/* Score + stats */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${getScoreColor(Math.round((coverage.total_core_coverage || 0) * 100))}`}>
                        {Math.round((coverage.total_core_coverage || 0) * 100)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Kernabdeckung</div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 flex-1">
                      <div className="text-center border rounded-lg p-2">
                        <div className="text-xl font-bold text-green-500">
                          {coverage.propositions?.filter(p => p.matched).length || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Abgedeckt</div>
                      </div>
                      <div className="text-center border rounded-lg p-2">
                        <div className="text-xl font-bold text-red-500">{coverage.uncovered_count || 0}</div>
                        <div className="text-xs text-muted-foreground">Lücken</div>
                      </div>
                      <div className="text-center border rounded-lg p-2">
                        <div className="text-xl font-bold">{coverage.total_propositions || 0}</div>
                        <div className="text-xs text-muted-foreground">Gesamt</div>
                      </div>
                    </div>
                  </div>

                  {/* Propositions */}
                  {coverage.propositions?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Aussagen ({coverage.propositions.filter(p => p.matched).length}/{coverage.propositions.length} abgedeckt)
                      </h4>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {coverage.propositions.map((p, i) => (
                          <div
                            key={i}
                            className={`border-l-4 px-3 py-1.5 text-sm ${
                              p.matched
                                ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                                : "border-red-500 bg-red-50 dark:bg-red-950/20"
                            }`}
                          >
                            <span className="font-medium mr-1">{p.matched ? "✓" : "✗"}</span>
                            {p.text || "—"}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gap cards */}
                  {uncoveredPropositions.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-medium">Karten für Lücken generieren</h4>
                          <p className="text-xs text-muted-foreground">
                            KI erstellt Karten für {uncoveredPropositions.length} nicht abgedeckte Aussagen
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleGenerateGapCards}
                          disabled={generatingGapCards}
                        >
                          {generatingGapCards
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            : <Zap className="h-3.5 w-3.5 mr-1" />}
                          Lücken schließen
                        </Button>
                      </div>

                      {gapCards.length > 0 && (
                        <div>
                          <button
                            className="flex items-center gap-1 text-xs text-muted-foreground mb-2 hover:text-foreground"
                            onClick={() => setShowGapCards((v) => !v)}
                          >
                            {showGapCards ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            {gapCards.length} Karten für Lücken
                          </button>
                          {showGapCards && (
                            <CardPreviewList
                              cards={gapCards}
                              selectedIds={selectedGapIds}
                              onToggle={(idx) => setSelectedGapIds((prev) => {
                                const next = new Set(prev);
                                next.has(idx) ? next.delete(idx) : next.add(idx);
                                return next;
                              })}
                              onToggleAll={() => toggleAllCards(gapCards, setSelectedGapIds)}
                              onSave={handleSaveGapCards}
                              saving={savingCards}
                              label="Karten"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Keine Analysedaten vorhanden</p>
              )}
            </CardContent>
          </Card>

          {/* ── Auto-generate cards ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                KI Karten-Autogenerierung
              </CardTitle>
              <CardDescription>
                KI liest die gesamte Notiz und erstellt Lernkarten automatisch
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedNote ? (
                <p className="text-sm text-muted-foreground">Zuerst eine Notiz auswählen</p>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Anzahl Karten:</span>
                      <Select value={targetCount} onValueChange={setTargetCount}>
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="15">15</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="30">30</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAutoGenerate} disabled={generatingCards} className="flex-1">
                      {generatingCards
                        ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generiert…</>
                        : <><Sparkles className="h-4 w-4 mr-2" /> Karten generieren</>}
                    </Button>
                  </div>

                  {generatedCards.length > 0 && (
                    <div>
                      <button
                        className="flex items-center gap-1 text-xs text-muted-foreground mb-2 hover:text-foreground"
                        onClick={() => setShowGenerated((v) => !v)}
                      >
                        {showGenerated ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        {generatedCards.length} generierte Karten
                      </button>
                      {showGenerated && (
                        <CardPreviewList
                          cards={generatedCards}
                          selectedIds={selectedCardIds}
                          onToggle={toggleCard}
                          onToggleAll={() => toggleAllCards(generatedCards, setSelectedCardIds)}
                          onSave={handleSaveGeneratedCards}
                          saving={savingCards}
                          label="Karten"
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
