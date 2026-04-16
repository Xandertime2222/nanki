import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Settings as SettingsIcon } from "lucide-react";
import { useAppStore } from "../../stores/app-store";
import { toast } from "sonner";

export function SettingsView() {
  const backendStatus = useAppStore((s) => s.backendStatus);

  return (
    <div className="p-6 space-y-6" data-testid="settings-view">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Backend Connection</CardTitle>
          <CardDescription>Python backend status and configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Badge variant={backendStatus === "running" ? "success" : "secondary"}>
              {backendStatus === "running" ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">URL:</span>
            <Input value="http://localhost:8642" readOnly className="max-w-xs" />
          </div>
          <Button onClick={() => toast.info("Testing connection...")}>Test Connection</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Configuration</CardTitle>
          <CardDescription>Configure AI model provider and settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Provider</label>
            <Input placeholder="ollama / openrouter" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Model</label>
            <Input placeholder="e.g. llama3" className="mt-1" />
          </div>
          <Button onClick={() => toast.success("Settings saved")}>Save</Button>
        </CardContent>
      </Card>
    </div>
  );
}