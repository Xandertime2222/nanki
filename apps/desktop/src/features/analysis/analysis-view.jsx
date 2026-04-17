import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { useAppStore } from "../../stores/app-store";
import { BarChart3, RefreshCw, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";

export function AnalysisView() {
  const backendStatus = useAppStore((s) => s.backendStatus);
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCoverage, setLoadingCoverage] = useState(false);

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

  const loadCoverage = async (noteId) => {
    setLoadingCoverage(true);
    try {
      const data = await api.getCoverage(noteId, "apcg");
      setCoverage(data);
    } catch (err) {
      toast.error(`Failed to load coverage: ${err.message}`);
      setCoverage(null);
    }
    setLoadingCoverage(false);
  };

  const handleSelectNote = (note) => {
    setSelectedNote(note);
    setCoverage(null);
    loadCoverage(note.meta.id);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="analysis-view">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Analysis</h1>
          <Badge variant={backendStatus === "running" ? "success" : "secondary"}>
            {backendStatus === "running" ? "Connected" : "Offline"}
          </Badge>
        </div>
        <Button variant="outline" size="icon" onClick={loadNotes} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Select Note</CardTitle>
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

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {selectedNote ? selectedNote.meta.title : "Coverage Analysis"}
            </CardTitle>
            <CardDescription>
              APCG analysis shows how well your note content maps to potential flashcards
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedNote ? (
              <p className="text-sm text-muted-foreground">Select a note to see coverage analysis</p>
            ) : loadingCoverage ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : coverage ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{coverage.A || 0}</div>
                      <div className="text-xs text-muted-foreground">Acquired</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-yellow-500">{coverage.P || 0}</div>
                      <div className="text-xs text-muted-foreground">Prompted</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-blue-500">{coverage.C || 0}</div>
                      <div className="text-xs text-muted-foreground">Created</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-red-500">{coverage.G || 0}</div>
                      <div className="text-xs text-muted-foreground">Gaps</div>
                    </CardContent>
                  </Card>
                </div>

                {coverage.score !== undefined && (
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getScoreColor(coverage.score)}`}>
                      {coverage.score.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Coverage Score</div>
                  </div>
                )}

                {coverage.gaps && coverage.gaps.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Suggested Topics</h4>
                    <div className="space-y-2">
                      {coverage.gaps.slice(0, 5).map((gap, i) => (
                        <div key={i} className="p-2 bg-muted rounded-md text-sm">
                          {typeof gap === "string" ? gap : gap.topic || JSON.stringify(gap)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No coverage data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}