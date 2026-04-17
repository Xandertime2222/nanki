import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { useAppStore } from "../../stores/app-store";
import { Settings, RefreshCw, Loader2, Check, X, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";

export function SettingsView() {
  const backendStatus = useAppStore((s) => s.backendStatus);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingAnki, setTestingAnki] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [ankiConnected, setAnkiConnected] = useState(null);
  const [aiConnected, setAiConnected] = useState(null);
  const [ankiDecks, setAnkiDecks] = useState([]);

  useEffect(() => {
    if (backendStatus === "running") {
      loadSettings();
    }
  }, [backendStatus]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      toast.error(`Failed to load settings: ${err.message}`);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSettings(settings);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(`Failed to save settings: ${err.message}`);
    }
    setSaving(false);
  };

  const handleTestAnki = async () => {
    setTestingAnki(true);
    try {
      await api.testAnki();
      setAnkiConnected(true);
      const decks = await api.getAnkiDecks();
      setAnkiDecks(decks.decks || []);
      toast.success("AnkiConnect connected");
    } catch (err) {
      setAnkiConnected(false);
      toast.error(`AnkiConnect failed: ${err.message}`);
    }
    setTestingAnki(false);
  };

  const handleTestAi = async () => {
    setTestingAi(true);
    try {
      await api.testAi();
      setAiConnected(true);
      toast.success("AI connected");
    } catch (err) {
      setAiConnected(false);
      toast.error(`AI failed: ${err.message}`);
    }
    setTestingAi(false);
  };

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 space-y-6" data-testid="settings-view">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Settings</h1>
          <Badge variant={backendStatus === "running" ? "success" : "secondary"}>
            {backendStatus === "running" ? "Connected" : "Offline"}
          </Badge>
        </div>
        <Button variant="outline" size="icon" onClick={loadSettings} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connection Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">AnkiConnect</div>
                      <div className="text-sm text-muted-foreground">
                        {ankiConnected === null ? "Not tested" : ankiConnected ? `Connected (${ankiDecks.length} decks)` : "Not connected"}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleTestAnki} disabled={testingAnki}>
                      {testingAnki ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : ankiConnected === true ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : ankiConnected === false ? (
                        <X className="h-4 w-4 text-red-500" />
                      ) : (
                        "Test"
                      )}
                    </Button>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">AI Service</div>
                      <div className="text-sm text-muted-foreground">
                        {aiConnected === null ? "Not tested" : aiConnected ? "Connected" : "Not connected"}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleTestAi} disabled={testingAi}>
                      {testingAi ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : aiConnected === true ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : aiConnected === false ? (
                        <X className="h-4 w-4 text-red-500" />
                      ) : (
                        "Test"
                      )}
                    </Button>
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Workspace Path</label>
                  <input
                    type="text"
                    value={settings?.workspace_path || ""}
                    onChange={(e) => handleChange("workspace_path", e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="~/NankiWorkspace"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Default Deck</label>
                  <input
                    type="text"
                    value={settings?.default_deck || ""}
                    onChange={(e) => handleChange("default_deck", e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Default"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">AI Model</label>
                  <input
                    type="text"
                    value={settings?.ai_model || ""}
                    onChange={(e) => handleChange("ai_model", e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="gpt-4"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">AnkiConnect URL</label>
                  <input
                    type="text"
                    value={settings?.anki_url || "http://localhost:8765"}
                    onChange={(e) => handleChange("anki_url", e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="http://localhost:8765"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}