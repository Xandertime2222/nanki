import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Target,
  Trophy,
  AlertCircle,
  Loader2,
  BookOpen,
  ChevronDown,
  FileText,
  BookMarked,
} from "lucide-react";
import { api } from "../../lib/api";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Client-side answer grading (mirrors backend logic). */
function isAnswerCorrect(question, answer) {
  if (answer === undefined || answer === null) return false;
  const u = String(answer).trim().toLowerCase();
  const c = (question.correct_answer || "").trim().toLowerCase();
  if (question.type === "answer_typing") {
    const norm = (s) =>
      s
        .replace(/\s+/g, " ")
        .replace(/^[\s.,;:!?"'()[\]{}]+|[\s.,;:!?"'()[\]{}]+$/g, "")
        .trim();
    return norm(u) === norm(c);
  }
  return u === c;
}

// ---------------------------------------------------------------------------
// Question sub-components
// ---------------------------------------------------------------------------

function MultipleChoiceQuestion({
  question,
  options,
  selectedAnswer,
  onSelect,
  isSubmitted,
  correctAnswer,
  explanation,
}) {
  return (
    <div className="space-y-3">
      <p className="text-base font-medium leading-snug">{question}</p>
      <div className="space-y-2">
        {options.map((option, idx) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = option === correctAnswer;
          let cls =
            "w-full text-left justify-start p-3.5 h-auto transition-all ";
          if (isSubmitted) {
            if (isCorrect)
              cls +=
                "bg-green-50 border-green-500 text-green-900 hover:bg-green-50 dark:bg-green-950 dark:text-green-100";
            else if (isSelected)
              cls +=
                "bg-red-50 border-red-400 text-red-900 hover:bg-red-50 dark:bg-red-950 dark:text-red-100";
            else cls += "opacity-50";
          } else {
            cls += isSelected
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background hover:bg-muted/60";
          }
          return (
            <Button
              key={idx}
              variant="outline"
              className={cls}
              onClick={() => !isSubmitted && onSelect(option)}
              disabled={isSubmitted}
            >
              <div className="flex items-center gap-3 w-full">
                <div
                  className={`w-7 h-7 rounded-full border flex items-center justify-center font-semibold text-xs shrink-0 ${
                    isSubmitted && isCorrect
                      ? "border-green-500 bg-green-500 text-white"
                      : isSubmitted && isSelected
                      ? "border-red-400 bg-red-400 text-white"
                      : isSelected
                      ? "border-primary-foreground bg-primary-foreground/20 text-primary-foreground"
                      : ""
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="flex-1">{option}</span>
                {isSubmitted && isCorrect && (
                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                )}
                {isSubmitted && isSelected && !isCorrect && (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                )}
              </div>
            </Button>
          );
        })}
      </div>
      {isSubmitted && explanation && <ExplanationBox explanation={explanation} />}
    </div>
  );
}

function AnswerTypingQuestion({
  question,
  userAnswer,
  onChange,
  isSubmitted,
  correctAnswer,
  explanation,
}) {
  const correct =
    isSubmitted &&
    isAnswerCorrect({ type: "answer_typing", correct_answer: correctAnswer }, userAnswer);

  return (
    <div className="space-y-3">
      <p className="text-base font-medium leading-snug">{question}</p>
      <input
        type="text"
        value={userAnswer || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={isSubmitted}
        placeholder="Antwort eingeben…"
        className={`w-full px-4 py-3 border rounded-lg text-base bg-background transition-colors ${
          isSubmitted
            ? correct
              ? "border-green-500 bg-green-50 dark:bg-green-950"
              : "border-red-400 bg-red-50 dark:bg-red-950"
            : "border-input focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        }`}
      />
      {isSubmitted && (
        <div
          className={`p-3.5 rounded-lg ${correct ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"}`}
        >
          <div className="flex items-center gap-2 mb-1">
            {correct ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                <span className="font-semibold text-green-800 dark:text-green-300 text-sm">
                  Richtig!
                </span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span className="font-semibold text-red-800 dark:text-red-300 text-sm">
                  Falsch
                </span>
              </>
            )}
          </div>
          {!correct && (
            <p className="text-sm">
              <span className="text-muted-foreground">Richtige Antwort: </span>
              <span className="font-semibold text-green-700 dark:text-green-400">
                {correctAnswer}
              </span>
            </p>
          )}
        </div>
      )}
      {isSubmitted && explanation && <ExplanationBox explanation={explanation} />}
    </div>
  );
}

function TrueFalseQuestion({
  question,
  selectedAnswer,
  onSelect,
  isSubmitted,
  correctAnswer,
  explanation,
}) {
  return (
    <div className="space-y-3">
      <p className="text-base font-medium leading-snug">{question}</p>
      <div className="grid grid-cols-2 gap-3">
        {["True", "False"].map((option) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = option === correctAnswer;
          let cls = "h-14 text-base font-medium transition-all ";
          if (isSubmitted) {
            if (isCorrect)
              cls +=
                "bg-green-50 border-green-500 text-green-900 hover:bg-green-50 dark:bg-green-950 dark:text-green-100";
            else if (isSelected)
              cls +=
                "bg-red-50 border-red-400 text-red-900 hover:bg-red-50 dark:bg-red-950 dark:text-red-100";
            else cls += "opacity-50";
          } else {
            cls += isSelected
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background hover:bg-muted/60";
          }
          return (
            <Button
              key={option}
              variant="outline"
              className={cls}
              onClick={() => !isSubmitted && onSelect(option)}
              disabled={isSubmitted}
            >
              <div className="flex items-center gap-2">
                {option === "True" ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                <span>{option === "True" ? "Wahr" : "Falsch"}</span>
              </div>
            </Button>
          );
        })}
      </div>
      {isSubmitted && explanation && <ExplanationBox explanation={explanation} />}
    </div>
  );
}

function ExplanationBox({ explanation }) {
  return (
    <div className="p-3.5 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <div>
          <div className="font-medium text-sm text-blue-900 dark:text-blue-200 mb-0.5">
            Erklärung
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-300">{explanation}</p>
        </div>
      </div>
    </div>
  );
}

function QuestionRenderer({ question, answer, onAnswer, isSubmitted, showResult }) {
  switch (question.type) {
    case "multiple_choice":
      return (
        <MultipleChoiceQuestion
          question={question.question}
          options={question.options}
          selectedAnswer={answer}
          onSelect={onAnswer}
          isSubmitted={isSubmitted}
          correctAnswer={showResult ? question.correct_answer : null}
          explanation={showResult ? question.explanation : null}
        />
      );
    case "answer_typing":
      return (
        <AnswerTypingQuestion
          question={question.question}
          userAnswer={answer}
          onChange={onAnswer}
          isSubmitted={isSubmitted}
          correctAnswer={showResult ? question.correct_answer : null}
          explanation={showResult ? question.explanation : null}
        />
      );
    case "true_false":
      return (
        <TrueFalseQuestion
          question={question.question}
          selectedAnswer={answer}
          onSelect={onAnswer}
          isSubmitted={isSubmitted}
          correctAnswer={showResult ? question.correct_answer : null}
          explanation={showResult ? question.explanation : null}
        />
      );
    default:
      return <div>Unknown question type: {question.type}</div>;
  }
}

// ---------------------------------------------------------------------------
// Segment chips
// ---------------------------------------------------------------------------

function SegmentChips({ segments, segmentStatus, currentSegment, onJump }) {
  if (segments.length === 0) return null;
  return (
    <div className="flex gap-1.5 flex-wrap">
      {segments.map((seg) => {
        const st = segmentStatus[seg] || { total: 0, submitted: 0, correct: 0 };
        const isActive = seg === currentSegment;
        const allDone = st.submitted === st.total && st.total > 0;
        const allCorrect = allDone && st.correct === st.total;
        const partialCorrect = allDone && st.correct > 0 && st.correct < st.total;

        return (
          <button
            key={seg}
            onClick={() => onJump(seg)}
            title={`${st.correct}/${st.total} correct in this segment`}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border leading-tight ${
              isActive
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : allCorrect
                ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-200 dark:border-green-700"
                : partialCorrect
                ? "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-700"
                : allDone
                ? "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700"
                : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
            }`}
          >
            {seg}
            {st.submitted > 0 && (
              <span className="ml-1 opacity-75">
                {st.correct}/{st.total}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Source excerpt panel
// ---------------------------------------------------------------------------

function SourceExcerptPanel({ excerpt }) {
  const [open, setOpen] = useState(false);
  if (!excerpt) return null;
  return (
    <div className="border rounded-lg overflow-hidden text-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          Textstelle aus der Notiz
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-4 py-3 bg-muted/20 border-t">
          <p className="text-muted-foreground italic leading-relaxed">
            „{excerpt}"
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results summary
// ---------------------------------------------------------------------------

function QuizResultsSummary({ result, questions, answers, onRestart, onClose }) {
  const percentage = result.percentage;
  const isPassing = percentage >= 70;

  // Per-segment breakdown
  const segBreakdown = useMemo(() => {
    const map = {};
    for (const q of questions) {
      const seg = q.source_segment || "General";
      if (!map[seg]) map[seg] = { total: 0, correct: 0 };
      map[seg].total += 1;
      if (isAnswerCorrect(q, answers[q.id])) map[seg].correct += 1;
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [questions, answers]);

  return (
    <div className="space-y-5">
      {/* Score hero */}
      <div className="text-center py-4">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 ${
            isPassing ? "bg-green-100 dark:bg-green-900/40" : "bg-yellow-100 dark:bg-yellow-900/40"
          }`}
        >
          {isPassing ? (
            <Trophy className="h-10 w-10 text-green-600" />
          ) : (
            <Target className="h-10 w-10 text-yellow-600" />
          )}
        </div>
        <h2 className="text-2xl font-bold mb-1">
          {isPassing ? "Gut gemacht!" : "Weiter üben!"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {percentage}% richtig — {result.correct_answers} von{" "}
          {result.total_questions} Fragen
        </p>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {result.correct_answers}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Richtig</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-red-500">
              {result.incorrect_answers}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Falsch</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {questions.length}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Gesamt</div>
          </CardContent>
        </Card>
      </div>

      {/* Per-segment breakdown */}
      {segBreakdown.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <BookMarked className="h-4 w-4" />
            Ergebnis nach Thema
          </h3>
          <div className="space-y-1.5">
            {segBreakdown.map(([seg, { total, correct }]) => {
              const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
              return (
                <div
                  key={seg}
                  className="flex items-center gap-3 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="truncate text-xs text-muted-foreground">
                        {seg}
                      </span>
                      <span
                        className={`text-xs font-medium shrink-0 ml-2 ${
                          pct === 100
                            ? "text-green-600"
                            : pct >= 50
                            ? "text-yellow-600"
                            : "text-red-500"
                        }`}
                      >
                        {correct}/{total}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          pct === 100
                            ? "bg-green-500"
                            : pct >= 50
                            ? "bg-yellow-500"
                            : "bg-red-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Schließen
        </Button>
        <Button className="flex-1" onClick={onRestart}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Nochmal
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Quiz Modal
// ---------------------------------------------------------------------------

export function QuizModal({ quiz, isOpen, onClose, onComplete }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submittedQuestions, setSubmittedQuestions] = useState(new Set());
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Sort questions by segment so topics are grouped together
  const questions = useMemo(() => {
    const qs = quiz?.questions || [];
    if (qs.every((q) => !q.source_segment)) return qs;
    const segOrder = [];
    const seenSet = new Set();
    for (const q of qs) {
      const s = q.source_segment || "";
      if (s && !seenSet.has(s)) {
        seenSet.add(s);
        segOrder.push(s);
      }
    }
    const orderMap = Object.fromEntries(segOrder.map((s, i) => [s, i]));
    return [...qs].sort(
      (a, b) =>
        (orderMap[a.source_segment || ""] ?? 999) -
        (orderMap[b.source_segment || ""] ?? 999)
    );
  }, [quiz]);

  // Unique segments in order
  const segments = useMemo(() => {
    const segs = [];
    const seen = new Set();
    for (const q of questions) {
      const s = q.source_segment || "";
      if (s && !seen.has(s)) {
        seen.add(s);
        segs.push(s);
      }
    }
    return segs;
  }, [questions]);

  // Per-segment progress (depends on answers + submittedQuestions)
  const segmentStatus = useMemo(() => {
    const status = {};
    for (const seg of segments) {
      const segQs = questions.filter((q) => q.source_segment === seg);
      const submitted = segQs.filter((q) => submittedQuestions.has(q.id));
      const correct = submitted.filter((q) => isAnswerCorrect(q, answers[q.id]));
      status[seg] = {
        total: segQs.length,
        submitted: submitted.length,
        correct: correct.length,
      };
    }
    return status;
  }, [segments, questions, submittedQuestions, answers]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion?.id];
  const isCurrentSubmitted = submittedQuestions.has(currentQuestion?.id);

  const answeredCount = questions.filter((q) => {
    const v = answers[q.id];
    return v !== undefined && v !== null && String(v).trim() !== "";
  }).length;

  // Reset on quiz change / dialog open
  useEffect(() => {
    if (isOpen) {
      setCurrentQuestionIndex(0);
      setAnswers({});
      setSubmittedQuestions(new Set());
      setIsCompleted(false);
      setResult(null);
    }
  }, [isOpen, quiz?.id]);

  const handleAnswer = (value) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleSubmitAnswer = useCallback(() => {
    if (!currentQuestion) return;
    const v = answers[currentQuestion.id];
    if (v === undefined || v === null || String(v).trim() === "") {
      toast.error("Bitte eine Antwort eingeben");
      return;
    }
    setSubmittedQuestions((prev) => new Set([...prev, currentQuestion.id]));
  }, [answers, currentQuestion]);

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  }, [currentQuestionIndex, questions.length]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  }, [currentQuestionIndex]);

  const jumpToSegment = useCallback(
    (seg) => {
      const idx = questions.findIndex((q) => q.source_segment === seg);
      if (idx >= 0) setCurrentQuestionIndex(idx);
    },
    [questions]
  );

  const handleCompleteQuiz = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // Ensure all answers are strings (backend expects dict[str, str])
      const stringAnswers = Object.fromEntries(
        Object.entries(answers).map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)])
      );
      const res = await api.submitQuiz(quiz.id, stringAnswers);
      setResult(res);
      setIsCompleted(true);
      onComplete?.(res);
    } catch (err) {
      toast.error(`Quiz konnte nicht abgeschickt werden: ${err.message}`);
    }
    setSubmitting(false);
  }, [answers, onComplete, quiz?.id, submitting]);

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSubmittedQuestions(new Set());
    setIsCompleted(false);
    setResult(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen || isCompleted) return;
    const handler = (e) => {
      // Don't fire shortcuts while submitting
      if (submitting) return;

      const inInput =
        e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA";

      if (e.key === "Enter") {
        e.preventDefault();
        if (isCurrentSubmitted) {
          if (currentQuestionIndex < questions.length - 1) handleNext();
          else handleCompleteQuiz();
        } else {
          // Only submit once — both inInput and non-input paths call the same handler
          handleSubmitAnswer();
        }
        return;
      }
      if (inInput) return;

      if (e.key === "ArrowRight" && isCurrentSubmitted) {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevious();
      } else if (
        !isCurrentSubmitted &&
        currentQuestion?.type === "multiple_choice"
      ) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < (currentQuestion.options?.length || 0)) {
          e.preventDefault();
          handleAnswer(currentQuestion.options[idx]);
        }
      } else if (
        !isCurrentSubmitted &&
        currentQuestion?.type === "true_false"
      ) {
        if (e.key.toLowerCase() === "t") handleAnswer("True");
        else if (e.key.toLowerCase() === "f") handleAnswer("False");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    isOpen,
    isCompleted,
    isCurrentSubmitted,
    submitting,
    currentQuestion,
    currentQuestionIndex,
    questions.length,
    handleNext,
    handlePrevious,
    handleSubmitAnswer,
    handleCompleteQuiz,
  ]);

  if (!quiz) return null;

  // Guard: quiz with no questions
  if (!questions.length) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{quiz.title}</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">Dieses Quiz enthält keine Fragen.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={onClose}>
              Schließen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const progress = questions.length
    ? ((currentQuestionIndex + 1) / questions.length) * 100
    : 0;
  const currentSegment = currentQuestion?.source_segment || null;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b space-y-3 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="text-base font-semibold leading-snug truncate">
              {quiz.title}
            </DialogTitle>
            {!isCompleted && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="secondary" className="text-xs font-normal">
                  {answeredCount}/{questions.length} beantwortet
                </Badge>
                <Badge variant="outline" className="text-xs font-medium">
                  {currentQuestionIndex + 1}/{questions.length}
                </Badge>
              </div>
            )}
          </div>

          {/* Segment navigation chips */}
          {!isCompleted && segments.length > 0 && (
            <SegmentChips
              segments={segments}
              segmentStatus={segmentStatus}
              currentSegment={currentSegment}
              onJump={jumpToSegment}
            />
          )}

          {/* Progress bar */}
          {!isCompleted && (
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </DialogHeader>

        {/* ── Body ── */}
        {!isCompleted ? (
          <>
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-6 py-5 space-y-4">
                {/* Segment label */}
                {currentSegment && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{currentSegment}</span>
                  </div>
                )}

                {/* Question */}
                {currentQuestion && (
                  <QuestionRenderer
                    question={currentQuestion}
                    answer={currentAnswer}
                    onAnswer={handleAnswer}
                    isSubmitted={isCurrentSubmitted}
                    showResult={isCurrentSubmitted}
                  />
                )}

                {/* Source excerpt — revealed after check */}
                {isCurrentSubmitted && currentQuestion?.source_excerpt && (
                  <SourceExcerptPanel excerpt={currentQuestion.source_excerpt} />
                )}
              </div>
            </ScrollArea>

            {/* ── Footer ── */}
            <div className="px-6 py-4 border-t flex items-center justify-between bg-background flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Zurück
              </Button>

              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground hidden sm:block select-none">
                  {isCurrentSubmitted
                    ? "→ oder Enter zum Weitermachen"
                    : "Enter zum Prüfen"}
                </span>

                {!isCurrentSubmitted ? (
                  <Button
                    size="sm"
                    onClick={handleSubmitAnswer}
                    disabled={
                      currentAnswer === undefined ||
                      currentAnswer === null ||
                      String(currentAnswer).trim() === ""
                    }
                  >
                    Antwort prüfen
                  </Button>
                ) : isLastQuestion ? (
                  <Button
                    size="sm"
                    onClick={handleCompleteQuiz}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        Wird gespeichert…
                      </>
                    ) : (
                      <>
                        Quiz abschließen
                        <CheckCircle className="h-4 w-4 ml-1.5" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleNext}>
                    Weiter
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* ── Results ── */
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-6">
              <QuizResultsSummary
                result={result}
                questions={questions}
                answers={answers}
                onRestart={handleRestart}
                onClose={onClose}
              />
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
