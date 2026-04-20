import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Brain,
  FileText,
  Settings,
  Loader2,
  HelpCircle,
  CheckCircle2,
  ListTodo,
  Type,
  ToggleLeft,
  Sparkles,
  Zap,
  Target,
  BrainCircuit
} from "lucide-react";
import { api } from "../../lib/api";
import { toast } from "sonner";

const QUESTION_TYPES = [
  { id: "multiple_choice", label: "Multiple Choice", icon: ListTodo, description: "4 Antwortmöglichkeiten, eine ist richtig" },
  { id: "answer_typing", label: "Freitext", icon: Type, description: "Antwort eintippen" },
  { id: "true_false", label: "Wahr/Falsch", icon: ToggleLeft, description: "Aussage bewerten" },
];

const QUESTION_COUNT_PRESETS = [
  { value: "few", label: "Wenige", description: "Kurzes Quiz, wichtigste Punkte", icon: Zap },
  { value: "ai_decides", label: "Auto", description: "KI entscheidet die passende Menge", icon: BrainCircuit },
  { value: "many", label: "Viele", description: "Umfassendes Quiz, vollständige Abdeckung", icon: Brain },
];

const DIFFICULTY_LEVELS = [
  { value: "easy", label: "Leicht", description: "Grundlegendes Verständnis, ~80% korrekt", color: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-200 dark:border-green-700" },
  { value: "normal", label: "Normal", description: "Ausgewogen, ~60–70% korrekt", color: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700" },
  { value: "hard", label: "Schwer", description: "Tiefes Verständnis nötig, anspruchsvoll", color: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700" },
];

export function QuizGeneratorModal({ isOpen, onClose, onGenerated }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [questionCountPreset, setQuestionCountPreset] = useState("few");
  const [difficulty, setDifficulty] = useState("normal");
  const [selectedTypes, setSelectedTypes] = useState(["multiple_choice", "answer_typing", "true_false"]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [quizSettings, setQuizSettings] = useState(null);

  // Load notes and settings
  useEffect(() => {
    if (isOpen) {
      loadNotes();
      loadSettings();
    }
  }, [isOpen]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await api.getNotes();
      setNotes(data);
      if (data.length > 0 && !selectedNoteId) {
        setSelectedNoteId(data[0].meta.id);
      }
    } catch (err) {
      toast.error(`Failed to load notes: ${err.message}`);
    }
    setLoading(false);
  };

  const loadSettings = async () => {
    try {
      const settings = await api.getQuizSettings();
      setQuizSettings(settings);
      if (settings?.allowed_question_types) {
        setSelectedTypes(settings.allowed_question_types);
      }
    } catch (err) {
      console.error("Failed to load quiz settings:", err);
    }
  };

  const toggleQuestionType = (typeId) => {
    setSelectedTypes((prev) => {
      if (prev.includes(typeId)) {
        // Don't allow unselecting the last type
        if (prev.length === 1) return prev;
        return prev.filter((t) => t !== typeId);
      }
      return [...prev, typeId];
    });
  };

  const handleGenerate = async () => {
    if (!selectedNoteId) {
      toast.error("Bitte eine Notiz auswählen");
      return;
    }
    if (selectedTypes.length === 0) {
      toast.error("Bitte mindestens einen Fragetyp auswählen");
      return;
    }

    setGenerating(true);
    try {
      const quiz = await api.generateQuiz({
        note_id: selectedNoteId,
        question_count_preset: questionCountPreset,
        question_types: selectedTypes,
        difficulty: difficulty,
        custom_prompt: customPrompt || undefined,
      });

      toast.success(`Quiz mit ${quiz.questions?.length || 0} Fragen erstellt`);
      onGenerated?.(quiz);
      onClose();
    } catch (err) {
      toast.error(`Quiz-Erstellung fehlgeschlagen: ${err.message}`);
    }
    setGenerating(false);
  };

  const selectedNote = notes.find((n) => n.meta.id === selectedNoteId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Neues Quiz erstellen
          </DialogTitle>
          <DialogDescription>
            KI-generiertes Quiz aus deinen Notizen — teste dein Wissen
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2 overflow-y-auto flex-1 pr-1">
          {/* Note Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notiz auswählen
            </label>
            <Select value={selectedNoteId} onValueChange={setSelectedNoteId}>
              <SelectTrigger disabled={loading}>
                <SelectValue placeholder={loading ? "Lade Notizen…" : "Notiz wählen…"} />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <SelectItem value="__loading" disabled>
                    Lade Notizen…
                  </SelectItem>
                ) : notes.length === 0 ? (
                  <SelectItem value="__empty" disabled>
                    Keine Notizen vorhanden
                  </SelectItem>
                ) : (
                  notes.map((note) => (
                    <SelectItem key={note.meta.id} value={note.meta.id}>
                      {note.meta.title || "Unbenannte Notiz"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedNote && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                <span>{selectedNote.word_count || 0} Wörter</span>
                <span>·</span>
                <span>{selectedNote.card_count || 0} Karten</span>
                {(selectedNote.word_count || 0) < 100 && (
                  <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400 ml-auto">
                    Sehr kurz
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Question Count */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Anzahl der Fragen
            </label>
            <div className="grid grid-cols-3 gap-2">
              {QUESTION_COUNT_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = questionCountPreset === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    className={`rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:bg-muted/50 hover:border-muted-foreground/30"
                    }`}
                    onClick={() => setQuestionCountPreset(preset.value)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`font-medium text-sm ${isSelected ? "text-primary" : ""}`}>
                        {preset.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Schwierigkeit
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTY_LEVELS.map((level) => {
                const isSelected = difficulty === level.value;
                return (
                  <button
                    key={level.value}
                    type="button"
                    className={`rounded-lg border p-3 text-center transition-all ${
                      isSelected
                        ? `${level.color} shadow-sm`
                        : "border-border hover:bg-muted/50 hover:border-muted-foreground/30"
                    }`}
                    onClick={() => setDifficulty(level.value)}
                  >
                    <div className="font-medium text-sm">{level.label}</div>
                    <div className="text-xs opacity-75 mt-0.5 leading-snug">{level.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Types */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Fragetypen
            </label>
            <div className="grid grid-cols-3 gap-2">
              {QUESTION_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedTypes.includes(type.id);
                const isLastSelected = isSelected && selectedTypes.length === 1;
                return (
                  <button
                    key={type.id}
                    type="button"
                    disabled={isLastSelected}
                    title={isLastSelected ? "Mindestens ein Typ muss ausgewählt sein" : undefined}
                    className={`rounded-lg border p-3 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:bg-muted/50 hover:border-muted-foreground/30"
                    }`}
                    onClick={() => !isLastSelected && toggleQuestionType(type.id)}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`font-medium text-xs ${isSelected ? "text-primary" : ""}`}>
                        {type.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              {showAdvanced ? "Erweiterte Optionen ausblenden" : "Erweiterte Optionen"}
            </button>

            {showAdvanced && (
              <div className="space-y-2 p-3 bg-muted/40 rounded-lg border">
                <label className="text-xs font-medium text-muted-foreground">
                  Eigener KI-Prompt (optional)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Eigenen Prompt eingeben, um die KI-Generierung zu steuern…"
                  className="w-full h-28 px-3 py-2 border rounded-md text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Leer lassen für den Standard-Prompt
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t shrink-0">
          <Button variant="outline" onClick={onClose} disabled={generating}>
            Abbrechen
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!selectedNoteId || generating || selectedTypes.length === 0 || loading}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Erstelle Quiz…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Quiz erstellen
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
