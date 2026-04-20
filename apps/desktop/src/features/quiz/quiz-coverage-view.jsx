import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { CoverageView } from "../coverage/coverage-view";

/**
 * Quiz Knowledge Coverage view.
 *
 * Shows understanding-based coverage: segments of the note text colored by
 * how well quiz questions covering those segments were answered.
 * - Green = understood (all questions correct)
 * - Yellow = partially understood (some correct)
 * - Red = not understood (all wrong)
 * - Gray = no questions mapped
 *
 * Uses the shared CoverageView component in "quiz" variant, which renders
 * the backend HTML and shows questions (not cards) in tooltips.
 */
export function QuizCoverageView({ noteId, onClose, onCardCreated }) {
  const [loading, setLoading] = useState(true);
  const [coverageReport, setCoverageReport] = useState(null);
  const [quizStats, setQuizStats] = useState(null);

  const loadCoverage = useCallback(async () => {
    if (!noteId) return;
    setLoading(true);
    try {
      const response = await api.getQuizCoverage(noteId);
      // Backend returns { coverage_data, coverage_html, apcg }
      // The HTML already contains data-questions-json attributes for tooltips
      if (response?.apcg) {
        setCoverageReport({
          ...response.apcg,
          coverage_html: response.coverage_html || response.apcg.html || "",
        });
      } else if (response?.coverage_html || response?.propositions) {
        setCoverageReport(response);
      } else {
        setCoverageReport(null);
      }
      setQuizStats(response?.coverage_data || null);
    } catch (err) {
      toast.error(`Failed to load knowledge coverage: ${err.message}`);
      setCoverageReport(null);
      setQuizStats(null);
    }
    setLoading(false);
  }, [noteId]);

  useEffect(() => {
    loadCoverage();
  }, [loadCoverage]);

  const hasAttempts = (quizStats?.total_quizzes_taken || 0) > 0;
  const hasReport = !!(coverageReport?.coverage_html || coverageReport?.propositions?.length);

  // Compute quiz-specific stats for the hero
  const understood = coverageReport?.propositions?.filter(p => p.core_score >= 1)?.length || 0;
  const partial = coverageReport?.propositions?.filter(p => p.core_score > 0 && p.core_score < 1)?.length || 0;
  const notUnderstood = coverageReport?.propositions?.filter(p => p.core_score === 0 && (p.questions?.length > 0))?.length || 0;

  const extraStats = quizStats ? (
    <div className="text-right text-xs">
      <div className="font-semibold text-sm">
        {quizStats.average_score ?? 0}% avg score
      </div>
      <div className="text-muted-foreground">
        {quizStats.total_quizzes_taken || 0} attempt
        {quizStats.total_quizzes_taken === 1 ? "" : "s"}
        {quizStats.last_quiz_date && (
          <>
            {" · "}
            {new Date(quizStats.last_quiz_date).toLocaleDateString()}
          </>
        )}
      </div>
    </div>
  ) : null;

  return (
    <CoverageView
      title="Knowledge Coverage"
      noteId={noteId}
      coverageReport={coverageReport}
      coverageLoading={loading}
      onRefresh={loadCoverage}
      onClose={onClose}
      onCardCreated={onCardCreated}
      variant="quiz"
      showHero={hasAttempts || hasReport}
      interactiveGaps={false}
      emptyMessage={
        hasAttempts
          ? "No knowledge coverage data to display yet."
          : "Take a quiz on this note to see which parts of the text you've mastered."
      }
      extraStats={extraStats}
    />
  );
}