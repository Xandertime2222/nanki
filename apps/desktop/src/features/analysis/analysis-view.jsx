import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { BarChart3 } from "lucide-react";
import { useAppStore } from "../../stores/app-store";

export function AnalysisView() {
  const backendStatus = useAppStore((s) => s.backendStatus);

  return (
    <div className="p-6 space-y-6" data-testid="analysis-view">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Analysis</h1>
        <Badge variant={backendStatus === "running" ? "success" : "secondary"}>
          {backendStatus === "running" ? "AI Ready" : "Offline"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coverage Analysis</CardTitle>
          <CardDescription>Analyze how well your cards cover the source material</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          <p>Select a note from the library to analyze coverage.</p>
        </CardContent>
      </Card>
    </div>
  );
}