import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { useAppStore } from "../../stores/app-store";
import { CheckSquare, RefreshCw, Loader2, ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";

export function ReviewView() {
  const backendStatus = useAppStore((s) => s.backendStatus);
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);

  useEffect(() => {
    if (backendStatus === "running") {
      loadNotes();
    }
  }, [backendStatus]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await api.getNotes();
      setNotes(data);
    } catch (err) {
      toast.error(`Failed to load notes: ${err.message}`);
    }
    setLoading(false);
  };

  const loadCards = async (noteId) => {
    setLoadingCards(true);
    try {
      const note = await api.getNote(noteId);
      setCards(note.cards || []);
      setCurrentCard(0);
      setShowAnswer(false);
    } catch (err) {
      toast.error(`Failed to load cards: ${err.message}`);
      setCards([]);
    }
    setLoadingCards(false);
  };

  const handleSelectNote = (note) => {
    setSelectedNote(note);
    loadCards(note.meta.id);
  };

  const handleNext = () => {
    if (currentCard < cards.length - 1) {
      setCurrentCard((c) => c + 1);
      setShowAnswer(false);
    }
  };

  const handlePrevious = () => {
    if (currentCard > 0) {
      setCurrentCard((c) => c - 1);
      setShowAnswer(false);
    }
  };

  const currentCardContent = cards[currentCard];

  return (
    <div className="p-6 space-y-6" data-testid="review-view">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckSquare className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Review</h1>
          <Badge variant={backendStatus === "running" ? "success" : "secondary"}>
            {cards.length > 0 ? `${currentCard + 1}/${cards.length}` : backendStatus === "running" ? "Ready" : "Offline"}
          </Badge>
        </div>
        <Button variant="outline" size="icon" onClick={loadNotes} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {loading && notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes available</p>
            ) : (
              notes.map((note) => (
                <Button
                  key={note.meta.id}
                  variant={selectedNote?.meta.id === note.meta.id ? "default" : "outline"}
                  className="w-full justify-start text-left"
                  onClick={() => handleSelectNote(note)}
                >
                  <span className="truncate">{note.meta.title}</span>
                </Button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">
              {selectedNote ? selectedNote.meta.title : "Select a Note"}
            </CardTitle>
            <CardDescription>
              Review flashcards from your notes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedNote ? (
              <p className="text-sm text-muted-foreground">Select a note from the list to start reviewing</p>
            ) : loadingCards ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : cards.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">This note has no cards</p>
                  <p className="text-sm text-muted-foreground mt-1">Create cards in the note to review them here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card className="min-h-48">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-lg font-medium">
                        {currentCardContent?.front || currentCardContent?.question || "No question"}
                      </p>
                      {showAnswer && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-muted-foreground">
                            {currentCardContent?.back || currentCardContent?.answer || "No answer"}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={handlePrevious} disabled={currentCard === 0}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  {!showAnswer ? (
                    <Button onClick={() => setShowAnswer(true)}>
                      Show Answer
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowAnswer(false)}>
                        <X className="h-4 w-4 mr-1" />
                        Hide
                      </Button>
                      <Button onClick={handleNext}>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                  <Button variant="outline" onClick={handleNext} disabled={currentCard >= cards.length - 1}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}