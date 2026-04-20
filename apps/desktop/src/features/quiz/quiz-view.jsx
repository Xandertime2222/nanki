import { useState, useEffect, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";
import {
  Brain,
  Plus,
  Play,
  Trash2,
  Trophy,
  Target,
  Clock,
  Loader2,
  BarChart2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { QuizModal } from "./quiz-modal";
import { QuizGeneratorModal } from "./quiz-generator-modal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(pct) {
  if (pct >= 80) return "text-green-600";
  if (pct >= 50) return "text-yellow-600";
  return "text-red-500";
}

function scoreBg(pct) {
  if (pct >= 80) return "bg-green-100 dark:bg-green-900/40";
  if (pct >= 50) return "bg-yellow-100 dark:bg-yellow-900/40";
  return "bg-red-100 dark:bg-red-900/40";
}

function avgScore(results) {
  if (!results?.length) return 0;
  return Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length);
}

function bestScore(results) {
  if (!results?.length) return 0;
  return Math.max(...results.map((r) => r.percentage));
}

function typeLabel(t) {
  if (t === "multiple_choice") return "Multiple Choice";
  if (t === "answer_typing") return "Freitext";
  if (t === "true_false") return "Wahr/Falsch";
  return t;
}

// ---------------------------------------------------------------------------
// QuizListItem
// ---------------------------------------------------------------------------

function QuizListItem({ quiz, onDelete, onTake, onViewResults, deleting }) {
  const hasResults = quiz.results?.length > 0;
  const last = quiz.results?.[quiz.results.length - 1];
  const uniqueTypes = [...new Set(quiz.questions?.map((q) => q.type) || [])];
  // Unique segments for this quiz
  const uniqueSegs = [
    ...new Set(
      (quiz.questions || [])
        .map((q) => q.source_segment)
        .filter(Boolean)
        .filter((s) => s.length <= 40) // only short segment labels
    ),
  ].slice(0, 4);

  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Score ring (if results exist) */}
          {hasResults && (
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${scoreBg(last.percentage)}`}
            >
              <span className={`text-sm font-bold ${scoreColor(last.percentage)}`}>
                {last.percentage}%
              </span>
            </div>
          )}

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-sm leading-snug truncate"
              title={quiz.title}
            >
              {quiz.title}
            </h3>

            <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
              <span>{quiz.questions?.length || 0} Fragen</span>
              {hasResults && (
                <>
                  <span className="flex items-center gap-1">
                    <Trophy className="h-3 w-3" />
                    Best: {bestScore(quiz.results)}%
                  </span>
                  <span>Ø {avgScore(quiz.results)}%</span>
                  <span>
                    {quiz.results.length} Versuch
                    {quiz.results.length !== 1 ? "e" : ""}
                  </span>
                </>
              )}
            </div>

            {/* Type + segment badges */}
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {uniqueTypes.map((t) => (
                <Badge key={t} variant="outline" className="text-xs py-0 px-1.5">
                  {typeLabel(t)}
                </Badge>
              ))}
              {uniqueSegs.map((s) => (
                <Badge
                  key={s}
                  variant="secondary"
                  className="text-xs py-0 px-1.5 max-w-[120px] truncate"
                  title={s}
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
            <Button size="sm" onClick={() => onTake(quiz)}>
              <Play className="h-3.5 w-3.5 mr-1" />
              Start
            </Button>
            {hasResults && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewResults(quiz)}
              >
                <BarChart2 className="h-3.5 w-3.5 mr-1" />
                Verlauf
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-500"
              disabled={deleting === quiz.id}
              onClick={() => onDelete(quiz.id)}
            >
              {deleting === quiz.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// QuizResultsView
// ---------------------------------------------------------------------------

function QuizResultsView({ quiz, onClose }) {
  const results = quiz.results || [];
  const sortedResults = [...results].sort(
    (a, b) => new Date(b.completed_at) - new Date(a.completed_at)
  );

  const avg = avgScore(results);
  const best = bestScore(results);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Back */}
      <div className="flex items-center justify-between">
        <div>
          <h3
            className="text-base font-semibold truncate max-w-[300px]"
            title={quiz.title}
          >
            {quiz.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {quiz.questions?.length || 0} Fragen
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          ← Zurück
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {results.length}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Versuche</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${scoreColor(best)}`}>{best}%</div>
            <div className="text-xs text-muted-foreground mt-0.5">Beste</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${scoreColor(avg)}`}>{avg}%</div>
            <div className="text-xs text-muted-foreground mt-0.5">Durchschnitt</div>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      {sortedResults.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Noch keine Ergebnisse.
        </div>
      ) : (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold text-sm mb-3">Verlauf</h4>
            <div className="space-y-2">
              {sortedResults.map((result, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-muted/40 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${scoreBg(result.percentage)}`}
                    >
                      {result.percentage >= 80 ? (
                        <Trophy className={`h-4 w-4 ${scoreColor(result.percentage)}`} />
                      ) : result.percentage >= 50 ? (
                        <Target className={`h-4 w-4 ${scoreColor(result.percentage)}`} />
                      ) : (
                        <Clock className={`h-4 w-4 ${scoreColor(result.percentage)}`} />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        Versuch #{sortedResults.length - idx}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(result.completed_at).toLocaleString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold text-sm ${scoreColor(result.percentage)}`}>
                      {result.percentage}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {result.correct_answers}/{result.total_questions} richtig
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuizView (main)
// ---------------------------------------------------------------------------

export function QuizView() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [viewingResults, setViewingResults] = useState(null);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listQuizzes();
      setQuizzes(data || []);
    } catch (err) {
      toast.error(`Quizzes konnten nicht geladen werden: ${err.message}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  const handleDelete = async (quizId) => {
    setDeletingId(quizId);
    try {
      await api.deleteQuiz(quizId);
      toast.success("Quiz gelöscht");
      // If we were viewing results for this quiz, go back
      if (viewingResults?.id === quizId) setViewingResults(null);
      loadQuizzes();
    } catch (err) {
      toast.error(`Löschen fehlgeschlagen: ${err.message}`);
    }
    setDeletingId(null);
  };

  const handleTakeQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setShowModal(true);
  };

  const handleQuizComplete = (result) => {
    setShowModal(false);
    setActiveQuiz(null);
    toast.success(`Quiz abgeschlossen! ${result.percentage}% richtig`);
    loadQuizzes();
  };

  const handleGenerated = (quiz) => {
    setShowGenerator(false);
    toast.success(`Quiz mit ${quiz.questions?.length || 0} Fragen erstellt`);
    loadQuizzes();
  };

  // Group quizzes by note for display
  const byNote = quizzes.reduce((map, q) => {
    const key = q.note_id || "unknown";
    if (!map[key]) map[key] = [];
    map[key].push(q);
    return map;
  }, {});

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Quiz-Center</h1>
          {!loading && (
            <Badge variant="secondary" className="text-xs">
              {quizzes.length} {quizzes.length === 1 ? "Quiz" : "Quizzes"}
            </Badge>
          )}
        </div>
        <Button onClick={() => setShowGenerator(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Quiz erstellen
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Lade Quizzes…</p>
            </div>
          ) : viewingResults ? (
            <QuizResultsView
              quiz={viewingResults}
              onClose={() => setViewingResults(null)}
            />
          ) : quizzes.length === 0 ? (
            <div className="text-center py-20">
              <Brain className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Noch keine Quizzes</h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                Erstelle AI-generierte Quizzes aus deinen Notizen und teste dein Wissen.
              </p>
              <Button onClick={() => setShowGenerator(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Erstes Quiz erstellen
              </Button>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {Object.entries(byNote).map(([noteId, noteQuizzes]) => {
                const noteTitle = noteQuizzes[0]?.title
                  ?.replace(/^Quiz:\s*/i, "")
                  ?.split("  ")[0]
                  ?.trim();
                return (
                  <div key={noteId}>
                    {Object.keys(byNote).length > 1 && (
                      <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span className="truncate">{noteTitle}</span>
                        <Badge variant="outline" className="text-xs py-0">
                          {noteQuizzes.length}
                        </Badge>
                      </div>
                    )}
                    <div className="space-y-2">
                      {noteQuizzes.map((quiz) => (
                        <QuizListItem
                          key={quiz.id}
                          quiz={quiz}
                          deleting={deletingId}
                          onDelete={handleDelete}
                          onTake={handleTakeQuiz}
                          onViewResults={setViewingResults}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Modals */}
      {activeQuiz && (
        <QuizModal
          quiz={activeQuiz}
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setActiveQuiz(null);
          }}
          onComplete={handleQuizComplete}
        />
      )}
      {showGenerator && (
        <QuizGeneratorModal
          isOpen={showGenerator}
          onClose={() => setShowGenerator(false)}
          onGenerated={handleGenerated}
        />
      )}
    </div>
  );
}
