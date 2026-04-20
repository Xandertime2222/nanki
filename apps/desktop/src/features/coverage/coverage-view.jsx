import { useState, useCallback, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  BookOpen,
  RefreshCw,
  X,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";

/**
 * Shared Coverage Analysis view.
 *
 * Layout mirrors the main branch:
 *   - header bar: icon + label + pills (covered / gaps / conflicts) + big % badge
 *   - hero section (optional): big % + progress bar + pill stats
 *   - coverage text block (rendered backend HTML with hover tooltips & clickable gaps)
 *   - gaps list (with "Suggest card" buttons)
 *   - conflicts list
 *
 * Used by both the editor's "Show coverage" overlay and the dedicated Coverage tab,
 * and by the Quiz Coverage view (in "quiz" variant — reuses report computed from
 * correct quiz answers).
 */
export function CoverageView({
  title = "Coverage",
  noteId,
  coverageReport,
  coverageLoading,
  onRefresh,
  onClose,
  onCardCreated,
  noteCards = [],
  variant = "editor", // "editor" | "quiz"
  showHero = true,
  interactiveGaps = true,
  emptyMessage = "No coverage data yet. Click \"Analyze\" to run coverage analysis.",
  extraStats = null, // optional ReactNode shown in hero (e.g. quiz attempts)
}) {
  const textRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  // Build a card index so we can show matching card info in hover tooltips
  const buildCardIndex = useCallback(() => {
    const index = {};
    for (const card of coverageReport?.cards || []) {
      if (card?.id) index[card.id] = card;
    }
    for (const card of noteCards) {
      if (card?.id) index[card.id] = { ...index[card.id], ...card };
    }
    return index;
  }, [coverageReport, noteCards]);

  // Hover tooltip for covered / partial spans (editor variant)
  const handleMouseEnter = useCallback(
    (event) => {
      const span = event.target.closest(
        ".coverage-token.covered, .coverage-token.partial"
      );
      if (!span) return;
      const cardIds = (span.dataset.cardIds || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!cardIds.length) return;

      const cardIndex = buildCardIndex();
      const maxShow = 6;
      const cards = cardIds.slice(0, maxShow).map((id) => {
        const card = cardIndex[id] || {};
        const front = card.front || id;
        const back = card.back || "";
        const type = card.type || (id.startsWith("anki:") ? "anki" : "basic");
        const origin = id.startsWith("anki:") ? "Anki" : card.deck_name || "";
        return { id, type, origin, front, back };
      });
      const overflow = cardIds.length - maxShow;

      setTooltip({
        rect: span.getBoundingClientRect(),
        cards,
        overflow: overflow > 0 ? overflow : 0,
        total: cardIds.length,
        type: "cards",
      });
    },
    [buildCardIndex]
  );

  // Hover tooltip for knowledge segments (quiz variant)
  const handleKnowledgeSegmentEnter = useCallback(
    (event) => {
      const segment = event.target.closest(".knowledge-segment");
      if (!segment) return;
      const status = segment.dataset.status || "none";
      let questions = [];
      try {
        // data-questions-json contains HTML-escaped JSON
        const raw = segment.dataset.questionsJson;
        if (raw) {
          questions = JSON.parse(raw);
        }
      } catch {
        questions = [];
      }

      setTooltip({
        rect: segment.getBoundingClientRect(),
        type: "questions",
        status,
        questions,
        text: segment.textContent?.slice(0, 200) || "",
      });
    },
    []
  );

  // Click handler for uncovered spans -> AI card suggestion
  const handleUncoveredClick = useCallback(
    async (event) => {
      if (!interactiveGaps || !noteId) return;
      const span = event.target.closest(".coverage-token.uncovered");
      if (!span) return;
      if (span.classList.contains("suggesting") || span.classList.contains("suggested")) return;

      const propText = span.dataset.propText || span.textContent || "";
      if (!propText.trim()) return;

      span.classList.add("suggesting");
      try {
        const result = await api.aiSuggestCardsForGaps({
          note_id: noteId,
          gap_excerpts: [propText.slice(0, 400)],
        });
        const cards = result?.cards || [];
        if (!cards.length) {
          span.classList.remove("suggesting");
          toast.error("AI did not return any card for this gap");
          return;
        }
        for (const c of cards) {
          await api.createCard(noteId, {
            type: c.type || "basic",
            front: c.front || "",
            back: c.back || "",
            extra: c.extra || "",
            tags: c.tags || [],
            deck_name: c.deck_name || "Default",
            source_excerpt: c.source_excerpt || propText.slice(0, 180),
            source_locator: "",
          });
          onCardCreated?.(c);
        }
        span.classList.remove("suggesting");
        span.classList.add("suggested");
        toast.success(`Created ${cards.length} card(s) for gap`);
      } catch (err) {
        span.classList.remove("suggesting");
        toast.error(`Failed to suggest card: ${err.message}`);
      }
    },
    [interactiveGaps, noteId, onCardCreated]
  );

  // Wire events on coverage HTML using individual mouseenter/mouseleave per element
  // This matches the main branch approach and is more reliable than event delegation
  useEffect(() => {
    const container = textRef.current;
    if (!container) return;

    // Attach individual mouseenter/mouseleave on target elements after HTML is set
    const attachHandlers = () => {
      if (variant === "quiz") {
        // Knowledge segments (quiz variant)
        container.querySelectorAll(".knowledge-segment").forEach((segment) => {
          segment.addEventListener("mouseenter", handleKnowledgeSegmentEnter);
          segment.addEventListener("mouseleave", () => setTooltip(null));
        });
      } else {
        // Coverage tokens (editor variant)
        container.querySelectorAll(".coverage-token.covered, .coverage-token.partial").forEach((token) => {
          token.addEventListener("mouseenter", handleMouseEnter);
          token.addEventListener("mouseleave", () => setTooltip(null));
        });
        // Make uncovered tokens clickable
        if (interactiveGaps) {
          container.querySelectorAll(".coverage-token.uncovered").forEach((token) => {
            token.title = "Click to suggest a card for this gap";
            token.style.cursor = "pointer";
            token.addEventListener("click", handleUncoveredClick);
          });
        }
      }
    };

    attachHandlers();

    // We need to re-attach when the HTML changes, but since dangerouslySetInnerHTML
    // replaces the content, we use a MutationObserver to detect changes
    const observer = new MutationObserver(() => {
      attachHandlers();
    });
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      // Clean up is handled by removing the container entirely on unmount
    };
  }, [coverageReport, handleMouseEnter, handleKnowledgeSegmentEnter, handleUncoveredClick, interactiveGaps, variant]);

  // Position tooltip after render
  useLayoutEffect(() => {
    if (!tooltip?.rect) return;
    const el = document.getElementById("coverage-hover-tooltip");
    if (!el) return;
    const tw = el.offsetWidth || 300;
    const th = el.offsetHeight || 120;
    let left = tooltip.rect.left + tooltip.rect.width / 2 - tw / 2;
    left = Math.max(8, Math.min(window.innerWidth - tw - 8, left));
    let top = tooltip.rect.top - th - 8;
    if (top < 8) top = tooltip.rect.bottom + 8;
    el.style.left = `${left}px`;
    el.style.top = `${Math.max(8, top)}px`;
  }, [tooltip]);

  // Early empty state
  const hasData =
    !!(coverageReport?.coverage_html) || (coverageReport?.propositions?.length || 0) > 0;

  const covered = coverageReport?.propositions?.filter((p) => p.matched).length || 0;
  const gaps = coverageReport?.propositions?.filter((p) => !p.matched) || [];
  const conflicts = coverageReport?.conflicts || [];
  const corePercent = Math.round((coverageReport?.total_core_coverage || 0) * 100);

  // Quiz variant stats: use core_score and questions for understanding labels
  const understood = coverageReport?.propositions?.filter((p) => p.core_score >= 1).length || 0;
  const partial = coverageReport?.propositions?.filter((p) => p.core_score > 0 && p.core_score < 1).length || 0;
  const notUnderstood = coverageReport?.propositions?.filter((p) => p.core_score === 0 && (p.questions?.length > 0)).length || 0;
  const isQuiz = variant === "quiz";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header bar */}
      <div className="border-b bg-muted/30 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {variant === "quiz" ? (
              <Sparkles className="h-4 w-4 text-indigo-500" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
            <span className="text-sm font-semibold">{title}</span>
          </div>
          {hasData && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {isQuiz ? (
                <>
                  <Badge className="text-xs gap-1" style={{ backgroundColor: "#22c55e", color: "#fff" }}>
                    {understood} understood
                  </Badge>
                  <Badge className="text-xs" style={{ backgroundColor: "#eab308", color: "#fff" }}>
                    {partial} partial
                  </Badge>
                  <Badge variant="destructive" className="text-xs">{notUnderstood} not understood</Badge>
                </>
              ) : (
                <>
                  <Badge variant="default" className="text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {covered} covered
                  </Badge>
                  <Badge variant="destructive" className="text-xs">{gaps.length} gaps</Badge>
                  {conflicts.length > 0 && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <AlertTriangle className="h-3 w-3" /> {conflicts.length} conflicts
                    </Badge>
                  )}
                </>
              )}
              <Badge variant="outline" className="text-sm font-bold">
                {corePercent}%
              </Badge>
            </div>
          )}
        </div>
        <div className="flex gap-1.5">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={coverageLoading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${coverageLoading ? "animate-spin" : ""}`} />
              {coverageLoading ? "Analyzing..." : "Refresh"}
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-3.5 w-3.5 mr-1" /> Close
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-4">
        {!hasData && !coverageLoading ? (
          <div className="max-w-xl mx-auto text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">{emptyMessage}</p>
          </div>
        ) : coverageLoading && !hasData ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Analyzing coverage…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Hero */}
            {showHero && (
              <div className="coverage-hero">
                <div className="flex items-end justify-between gap-3">
                  <div className="coverage-hero-percent">{corePercent}%</div>
                  {extraStats}
                </div>
                <div className="coverage-hero-bar">
                  <span
                    className="coverage-hero-bar-fill"
                    style={{ width: `${Math.min(100, corePercent)}%` }}
                  />
                </div>
                <div className="coverage-hero-pills">
                  {isQuiz ? (
                    <>
                      <Badge className="text-xs" style={{ backgroundColor: "#22c55e", color: "#fff" }}>
                        {understood} understood
                      </Badge>
                      <Badge className="text-xs" style={{ backgroundColor: "#eab308", color: "#fff" }}>
                        {partial} partial
                      </Badge>
                      <Badge variant="destructive" className="text-xs">{notUnderstood} not understood</Badge>
                    </>
                  ) : (
                    <>
                      <Badge variant="default" className="text-xs">
                        {covered} covered
                      </Badge>
                      <Badge variant="destructive" className="text-xs">{gaps.length} gaps</Badge>
                      {conflicts.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {conflicts.length} conflicts
                        </Badge>
                      )}
                    </>
                  )}
                  {coverageReport?.detected_mode && (
                    <Badge variant="outline" className="text-xs">
                      mode: {coverageReport.detected_mode}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Coverage text block */}
            {coverageReport?.coverage_html ? (
              <div
                ref={textRef}
                className="rounded-lg border bg-background p-4"
                dangerouslySetInnerHTML={{ __html: coverageReport.coverage_html }}
              />
            ) : null}

            {/* Conflicts */}
            {conflicts.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Conflicts
                </h4>
                <div className="space-y-2">
                  {conflicts.map((c, i) => (
                    <div key={c.card_id || i} className="coverage-list-item conflict">
                      <div className="coverage-list-item-header">
                        <span>{c.description || `Conflict on card ${c.card_id}`}</span>
                        {typeof c.conflict_score === "number" && (
                          <span className="coverage-list-item-type-badge">
                            {Math.round(c.conflict_score * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hover tooltip (portal) */}
      {tooltip &&
        createPortal(
          <div
            id="coverage-hover-tooltip"
            className="coverage-hover-tooltip fixed z-[100] pointer-events-none"
            style={{ left: 0, top: 0 }}
          >
            {tooltip.type === "questions" ? (
              <>
                <div className="coverage-tooltip-title">
                  {tooltip.status === "understood" && "✓ Understood"}
                  {tooltip.status === "partial" && "◐ Partially understood"}
                  {tooltip.status === "not_understood" && "✗ Not understood"}
                  {tooltip.status === "none" && "— No questions"}
                </div>
                {tooltip.questions.length > 0 ? (
                  <div className="space-y-1.5">
                    {tooltip.questions.map((q, i) => (
                      <div key={i} className="coverage-tooltip-card">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className={q.is_correct ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                            {q.is_correct ? "✓" : "✗"}
                          </span>
                          <span className="text-[10px] px-1 py-0 rounded bg-muted">{q.type === "multiple_choice" ? "MC" : q.type === "true_false" ? "TF" : "Type"}</span>
                        </div>
                        <div className="coverage-tooltip-card-front text-sm mt-0.5">
                          {q.question}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No quiz questions mapped to this segment</div>
                )}
              </>
            ) : (
              <>
                <div className="coverage-tooltip-title">
                  {tooltip.total} matching card{tooltip.total === 1 ? "" : "s"}
                </div>
                {tooltip.cards.map((card) => (
                  <div key={card.id} className="coverage-tooltip-card">
                    <div className="coverage-tooltip-card-type">
                      <Badge variant="outline" className="text-[10px] py-0 h-4">
                        {card.type}
                      </Badge>
                      {card.origin && (
                        <Badge variant="secondary" className="text-[10px] py-0 h-4">
                          {card.origin}
                        </Badge>
                      )}
                    </div>
                    <div className="coverage-tooltip-card-front">
                      {card.front.slice(0, 120)}
                    </div>
                    {card.back && (
                      <div className="coverage-tooltip-card-back">
                        {card.back.slice(0, 100)}
                      </div>
                    )}
                  </div>
                ))}
                {tooltip.overflow > 0 && (
                  <div className="text-[11px] text-muted-foreground mt-1">
                    + {tooltip.overflow} more
                  </div>
                )}
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

function GapItem({ gap, noteId, interactive, onCardCreated }) {
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  const handleSuggest = async () => {
    if (!noteId || status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      const result = await api.aiSuggestCardsForGaps({
        note_id: noteId,
        gap_excerpts: [gap.text.slice(0, 400)],
      });
      const cards = result?.cards || [];
      if (!cards.length) {
        setStatus("error");
        setMessage("No card returned");
        return;
      }
      for (const c of cards) {
        await api.createCard(noteId, {
          type: c.type || "basic",
          front: c.front || "",
          back: c.back || "",
          extra: c.extra || "",
          tags: c.tags || [],
          deck_name: c.deck_name || "Default",
          source_excerpt: c.source_excerpt || gap.text.slice(0, 180),
          source_locator: "",
        });
        onCardCreated?.(c);
      }
      setStatus("success");
      setMessage(`✓ ${cards.length} card${cards.length === 1 ? "" : "s"} created`);
    } catch (err) {
      setStatus("error");
      setMessage(err.message || "Failed");
    }
  };

  return (
    <div className="coverage-list-item">
      <div className="coverage-list-item-header">
        <span className="flex-1 min-w-0">{gap.text}</span>
        {gap.type && <span className="coverage-list-item-type-badge">{gap.type}</span>}
      </div>
      {interactive && noteId && (
        <div className="flex items-center gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleSuggest}
            disabled={status === "loading" || status === "success"}
          >
            {status === "loading" ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Suggesting…
              </>
            ) : status === "success" ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                Created
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 mr-1" />
                Suggest card
              </>
            )}
          </Button>
          {message && (
            <span
              className={`text-xs ${
                status === "success"
                  ? "text-green-600"
                  : status === "error"
                  ? "text-red-500"
                  : "text-muted-foreground"
              }`}
            >
              {message}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
