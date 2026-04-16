import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { useAppStore } from "../../stores/app-store";
import { FolderOpen } from "lucide-react";

export function WorkspaceView() {
  const backendStatus = useAppStore((s) => s.backendStatus);

  return (
    <div className="p-6 space-y-6" data-testid="workspace-view">
      <div className="flex items-center gap-3">
        <FolderOpen className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Workspace</h1>
        <Badge variant={backendStatus === "running" ? "success" : "secondary"}>
          {backendStatus === "running" ? "Connected" : "Offline"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome to Nanki</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Create and manage flashcard notes. Use the sidebar to navigate between workflows.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}