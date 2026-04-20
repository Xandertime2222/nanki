import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Separator } from "../../components/ui/separator";
import { ScrollArea } from "../../components/ui/scroll-area";
import {
  Settings, RefreshCw, Loader2, Check, X, Save, Wifi, WifiOff,
  Bot, Brain, MessageSquare, Sparkles, Languages, Moon, Sun,
  Monitor, Globe, RotateCcw, Download, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useTheme } from "../../components/theme-provider";

export function SettingsView() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Connection states
  const [testingAnki, setTestingAnki] = useState(false);
  const [ankiStatus, setAnkiStatus] = useState(null);
  const [ankiDecks, setAnkiDecks] = useState([]);
  const [ankiModels, setAnkiModels] = useState([]);

  const [testingAi, setTestingAi] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const [aiModels, setAiModels] = useState([]);

  // Update checker
  const [updateInfo, setUpdateInfo] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  // Theme
  const { theme, setTheme } = useTheme();

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
      // Fetch AI models after loading settings
      if (data?.ai?.enabled) {
        api.getAiModels().then(m => setAiModels(m || [])).catch(() => {});
      }
    } catch (err) {
      toast.error(`Failed to load settings: ${err.message}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();
    checkForUpdates();
  }, [loadSettings]);

  const checkForUpdates = async () => {
    try {
      const info = await api.checkForUpdates();
      setUpdateInfo(info);
    } catch {
      // Silent fail
    }
  };

  const handleUpdateSetting = useCallback((section, key, value) => {
    setSettings((prev) => {
      if (!prev) return prev;
      if (section === "root") {
        return { ...prev, [key]: value };
      }
      if (section === "ai") {
        return { ...prev, ai: { ...prev.ai, [key]: value } };
      }
      if (section === "apcg") {
        return { ...prev, apcg: { ...prev.apcg, [key]: value } };
      }
      if (section === "ai.prompts") {
        return { ...prev, ai: { ...prev.ai, prompts: { ...prev.ai?.prompts, [key]: value } } };
      }
      return prev;
    });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await api.updateSettings(settings);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(`Failed to save: ${err.message}`);
    }
    setSaving(false);
  };

  const handleTestAnki = async () => {
    setTestingAnki(true);
    try {
      await handleSave(); // Save first
      const result = await api.testAnki();
      setAnkiStatus({ ok: true, ...result });
      setAnkiDecks(result.decks || []);
      setAnkiModels(result.models || []);
      toast.success(`Anki connected: v${result.version || "?"}, ${result.decks?.length || 0} decks`);
    } catch (err) {
      setAnkiStatus({ ok: false, error: err.message });
      setAnkiDecks([]);
      setAnkiModels([]);
      toast.error(`Anki failed: ${err.message}`);
    }
    setTestingAnki(false);
  };

  const handleTestAi = async () => {
    setTestingAi(true);
    try {
      await handleSave(); // Save first
      const result = await api.testAi();
      setAiStatus({ ok: true, ...result });
      setAiModels(result.models || []);
      toast.success(`AI connected: ${result.models?.length || 0} models`);
    } catch (err) {
      setAiStatus({ ok: false, error: err.message });
      setAiModels([]);
      toast.error(`AI failed: ${err.message}`);
    }
    setTestingAi(false);
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      await checkForUpdates();
      toast.success("Update check complete");
    } catch (err) {
      toast.error(`Update check failed: ${err.message}`);
    }
    setCheckingUpdate(false);
  };

  const handleResetPrompts = async () => {
    try {
      await api.resetPrompts();
      toast.success("Prompts reset to default");
      loadSettings();
    } catch (err) {
      toast.error(`Failed to reset prompts: ${err.message}`);
    }
  };

  const handleResetApcg = async () => {
    try {
      await api.resetApcg();
      toast.success("APCG settings reset");
      loadSettings();
    } catch (err) {
      toast.error(`Failed to reset APCG: ${err.message}`);
    }
  };

  const handleRefreshDecks = async () => {
    try {
      const result = await api.getAnkiDecks();
      setAnkiDecks(result.decks || []);
      setAnkiModels(result.models || []);
      toast.success("Decks refreshed");
    } catch (err) {
      toast.error(`Failed to refresh: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Failed to load settings
      </div>
    );
  }

  const ai = settings.ai || {};
  const apcg = settings.apcg || {};
  const prompts = ai.prompts || {};

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between bg-background">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Settings</h1>
          <Badge variant="default">v0.5.0</Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={() => {
            const themes = ["system", "light", "dark"];
            const next = themes[(themes.indexOf(theme) + 1) % themes.length];
            setTheme(next);
          }} title={`Theme: ${theme}`}>
            {theme === "light" ? <Sun className="h-4 w-4" /> :
             theme === "dark" ? <Moon className="h-4 w-4" /> :
             <Monitor className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          
          {/* === GENERAL === */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" />
                General
              </CardTitle>
              <CardDescription>Workspace path and interface language.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Workspace Path</label>
                <Input
                  value={settings.workspace_path || ""}
                  onChange={(e) => handleUpdateSetting("root", "workspace_path", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Language</label>
                <Select
                  value={settings.language || "en"}
                  onValueChange={(v) => handleUpdateSetting("root", "language", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* === ANKICONNECT === */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                AnkiConnect
              </CardTitle>
              <CardDescription>Connection, deck discovery, and sync behavior.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">AnkiConnect URL</label>
                <Input
                  value={settings.anki_url || "http://127.0.0.1:8765"}
                  onChange={(e) => handleUpdateSetting("root", "anki_url", e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.auto_sync || false}
                  onCheckedChange={(v) => handleUpdateSetting("root", "auto_sync", v)}
                />
                <span className="text-sm">Auto-sync after pushing cards</span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleTestAnki} disabled={testingAnki}>
                  {testingAnki ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wifi className="h-4 w-4 mr-1" />}
                  Test Connection
                </Button>
                <Button variant="outline" onClick={handleRefreshDecks}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh Decks
                </Button>
              </div>

              {/* Anki Status */}
              <div className="border rounded-md p-3 bg-muted/30">
                <div className="text-sm text-muted-foreground mb-2">
                  {!ankiStatus ? "Not tested yet." :
                   ankiStatus.ok ? `Connected: ${settings.anki_url}` :
                   `Failed: ${ankiStatus.error || "Unknown error"}`}
                </div>
                {ankiStatus?.ok && (
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline">v{ankiStatus.version || "?"}</Badge>
                    <Badge variant="outline">{ankiDecks.length} deck(s)</Badge>
                    <Badge variant="outline">{ankiModels.length} model(s)</Badge>
                  </div>
                )}
              </div>

              {/* Decks & Models */}
              {ankiDecks.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Decks</label>
                    <div className="border rounded-md p-2 max-h-32 overflow-auto space-y-1">
                      {ankiDecks.map((d) => (
                        <Badge key={d} variant="secondary" className="mr-1">{d}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Models</label>
                    <div className="border rounded-md p-2 max-h-32 overflow-auto space-y-1">
                      {ankiModels.map((m) => (
                        <Badge key={m} variant="outline" className="mr-1">{m}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* === AI FEATURES === */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4" />
                AI Features
              </CardTitle>
              <CardDescription>Optional AI via Ollama or OpenRouter.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Enable AI */}
              <div className="flex items-center space-x-2">
                <Switch
                  checked={ai.enabled || false}
                  onCheckedChange={(v) => handleUpdateSetting("ai", "enabled", v)}
                />
                <span className="text-sm font-medium">Enable AI features</span>
              </div>

              {ai.enabled && (
                <>
                  {/* Provider */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Provider</label>
                      <Select
                        value={ai.provider || "ollama_local"}
                        onValueChange={(v) => handleUpdateSetting("ai", "provider", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ollama_local">Ollama (local)</SelectItem>
                          <SelectItem value="ollama_cloud">Ollama (cloud)</SelectItem>
                          <SelectItem value="openrouter">OpenRouter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Local Ollama URL */}
                    {ai.provider === "ollama_local" && (
                      <div>
                        <label className="text-sm font-medium mb-1 block">Local Ollama URL</label>
                        <Input
                          value={ai.ollama_local_url || "http://127.0.0.1:11434"}
                          onChange={(e) => handleUpdateSetting("ai", "ollama_local_url", e.target.value)}
                        />
                      </div>
                    )}

                    {/* Cloud Ollama */}
                    {ai.provider === "ollama_cloud" && (
                      <>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Ollama Cloud URL</label>
                          <Input
                            value={ai.ollama_cloud_url || ""}
                            onChange={(e) => handleUpdateSetting("ai", "ollama_cloud_url", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Ollama Cloud API Key</label>
                          <Input
                            type="password"
                            value={ai.ollama_cloud_api_key || ""}
                            onChange={(e) => handleUpdateSetting("ai", "ollama_cloud_api_key", e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {/* OpenRouter */}
                    {ai.provider === "openrouter" && (
                      <>
                        <div>
                          <label className="text-sm font-medium mb-1 block">OpenRouter URL</label>
                          <Input
                            value={ai.openrouter_url || "https://openrouter.ai/api/v1"}
                            onChange={(e) => handleUpdateSetting("ai", "openrouter_url", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">OpenRouter API Key</label>
                          <Input
                            type="password"
                            value={ai.openrouter_api_key || ""}
                            onChange={(e) => handleUpdateSetting("ai", "openrouter_api_key", e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Auto-detect Ollama models */}
                  {ai.provider === "ollama_local" && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={ai.auto_detect_ollama_models ?? true}
                        onCheckedChange={(v) => handleUpdateSetting("ai", "auto_detect_ollama_models", v)}
                      />
                      <span className="text-sm">Auto-detect installed Ollama models</span>
                    </div>
                  )}

                  {/* Model selects */}
                  {aiModels.length > 0 && (
                    <Separator />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Default Model</label>
                      {aiModels.length > 0 ? (
                        <Select
                          value={ai.default_model || "__custom__"}
                          onValueChange={(v) => handleUpdateSetting("ai", "default_model", v === "__custom__" ? "" : v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            {aiModels.map((m) => (
                              <SelectItem key={m.id || m} value={m.id || m}>{m.name || m.id || m}</SelectItem>
                            ))}
                            <SelectItem value="__custom__">Custom (type below)</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : null}
                      <Input
                        value={ai.default_model || ""}
                        onChange={(e) => handleUpdateSetting("ai", "default_model", e.target.value)}
                        placeholder={aiModels.length === 0 ? "Model ID or blank for default" : "Or type a custom model name"}
                        className={aiModels.length > 0 ? "mt-1" : ""}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Chat Model</label>
                      {aiModels.length > 0 ? (
                        <Select
                          value={ai.chat_model || "__custom__"}
                          onValueChange={(v) => handleUpdateSetting("ai", "chat_model", v === "__custom__" ? "" : v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            {aiModels.map((m) => (
                              <SelectItem key={m.id || m} value={m.id || m}>{m.name || m.id || m}</SelectItem>
                            ))}
                            <SelectItem value="__custom__">Custom (type below)</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : null}
                      <Input
                        value={ai.chat_model || ""}
                        onChange={(e) => handleUpdateSetting("ai", "chat_model", e.target.value)}
                        placeholder={aiModels.length === 0 ? "Uses default if blank" : "Or type a custom model name"}
                        className={aiModels.length > 0 ? "mt-1" : ""}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Explain Model</label>
                      {aiModels.length > 0 ? (
                        <Select
                          value={ai.explain_model || "__custom__"}
                          onValueChange={(v) => handleUpdateSetting("ai", "explain_model", v === "__custom__" ? "" : v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            {aiModels.map((m) => (
                              <SelectItem key={m.id || m} value={m.id || m}>{m.name || m.id || m}</SelectItem>
                            ))}
                            <SelectItem value="__custom__">Custom (type below)</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : null}
                      <Input
                        value={ai.explain_model || ""}
                        onChange={(e) => handleUpdateSetting("ai", "explain_model", e.target.value)}
                        placeholder={aiModels.length === 0 ? "Uses default if blank" : "Or type a custom model name"}
                        className={aiModels.length > 0 ? "mt-1" : ""}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Flashcard Model</label>
                      {aiModels.length > 0 ? (
                        <Select
                          value={ai.flashcard_model || "__custom__"}
                          onValueChange={(v) => handleUpdateSetting("ai", "flashcard_model", v === "__custom__" ? "" : v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            {aiModels.map((m) => (
                              <SelectItem key={m.id || m} value={m.id || m}>{m.name || m.id || m}</SelectItem>
                            ))}
                            <SelectItem value="__custom__">Custom (type below)</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : null}
                      <Input
                        value={ai.flashcard_model || ""}
                        onChange={(e) => handleUpdateSetting("ai", "flashcard_model", e.target.value)}
                        placeholder={aiModels.length === 0 ? "Uses default if blank" : "Or type a custom model name"}
                        className={aiModels.length > 0 ? "mt-1" : ""}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Auto Flashcard Model</label>
                      {aiModels.length > 0 ? (
                        <Select
                          value={ai.auto_flashcard_model || "__custom__"}
                          onValueChange={(v) => handleUpdateSetting("ai", "auto_flashcard_model", v === "__custom__" ? "" : v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            {aiModels.map((m) => (
                              <SelectItem key={m.id || m} value={m.id || m}>{m.name || m.id || m}</SelectItem>
                            ))}
                            <SelectItem value="__custom__">Custom (type below)</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : null}
                      <Input
                        value={ai.auto_flashcard_model || ""}
                        onChange={(e) => handleUpdateSetting("ai", "auto_flashcard_model", e.target.value)}
                        placeholder={aiModels.length === 0 ? "Uses default if blank" : "Or type a custom model name"}
                        className={aiModels.length > 0 ? "mt-1" : ""}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                        <Languages className="h-3 w-3" />
                        AI Language
                      </label>
                      <Input
                        value={ai.language || "en"}
                        onChange={(e) => handleUpdateSetting("ai", "language", e.target.value)}
                        placeholder="en or de"
                      />
                    </div>
                  </div>

                  {/* Behavior toggles */}
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={ai.chat_note_only || false}
                        onCheckedChange={(v) => handleUpdateSetting("ai", "chat_note_only", v)}
                      />
                      <span className="text-sm">Chat should only use user's own text</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={ai.explain_note_only || false}
                        onCheckedChange={(v) => handleUpdateSetting("ai", "explain_note_only", v)}
                      />
                      <span className="text-sm">Explain should only use user's own text</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={ai.use_anki_coverage_context ?? true}
                        onCheckedChange={(v) => handleUpdateSetting("ai", "use_anki_coverage_context", v)}
                      />
                      <span className="text-sm">Use semantic coverage context from Anki cards</span>
                    </div>
                  </div>

                  {/* AI Prompts */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">AI Prompts</h4>
                      <Button variant="outline" size="sm" onClick={handleResetPrompts}>
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reset Prompts
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Chat Prompt</label>
                        <Textarea
                          value={prompts.chat || ""}
                          onChange={(e) => handleUpdateSetting("ai.prompts", "chat", e.target.value)}
                          rows={4}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Explain Prompt</label>
                        <Textarea
                          value={prompts.explain || ""}
                          onChange={(e) => handleUpdateSetting("ai.prompts", "explain", e.target.value)}
                          rows={4}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Flashcards Prompt</label>
                        <Textarea
                          value={prompts.flashcards || ""}
                          onChange={(e) => handleUpdateSetting("ai.prompts", "flashcards", e.target.value)}
                          rows={4}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Auto Flashcard Prompt</label>
                        <Textarea
                          value={prompts.auto_flashcards || ""}
                          onChange={(e) => handleUpdateSetting("ai.prompts", "auto_flashcards", e.target.value)}
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Test AI */}
                  <Separator />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleTestAi} disabled={testingAi}>
                      {testingAi ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Brain className="h-4 w-4 mr-1" />}
                      Test AI Connection
                    </Button>
                  </div>

                  {/* AI Status */}
                  <div className="border rounded-md p-3 bg-muted/30">
                    <div className="text-sm text-muted-foreground mb-2">
                      {!aiStatus ? "Not tested yet." :
                       aiStatus.ok ? `Connected: ${ai.base_url || ai.provider}` :
                       `Failed: ${aiStatus.error || "Unknown error"}`}
                    </div>
                    {aiStatus?.ok && (
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary">{aiModels.length} model(s)</Badge>
                        {ai.provider && <Badge variant="outline">{ai.provider}</Badge>}
                        {ai.default_model && <Badge variant="outline">{ai.default_model}</Badge>}
                      </div>
                    )}
                    {aiModels.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {aiModels.map((m) => (
                          <Badge key={m.id || m} variant="outline">{m.name || m.id || m}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* === APCG ANALYSIS === */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" />
                APCG Analysis
              </CardTitle>
              <CardDescription>Advanced Propositional Coverage Graph settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Default Analysis Mode</label>
                <Select
                  value={apcg.default_mode || "auto"}
                  onValueChange={(v) => handleUpdateSetting("apcg", "default_mode", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    <SelectItem value="history">History / Geography / Events</SelectItem>
                    <SelectItem value="science">Science / Medicine / Biology</SelectItem>
                    <SelectItem value="vocabulary">Vocabulary / Definitions</SelectItem>
                    <SelectItem value="universal">Universal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={apcg.include_anki_cards ?? true}
                    onCheckedChange={(v) => handleUpdateSetting("apcg", "include_anki_cards", v)}
                  />
                  <span className="text-sm">Include Anki cards in analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={apcg.auto_refresh || false}
                    onCheckedChange={(v) => handleUpdateSetting("apcg", "auto_refresh", v)}
                  />
                  <span className="text-sm">Auto-refresh on note changes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={apcg.use_ai_coverage || false}
                    onCheckedChange={(v) => handleUpdateSetting("apcg", "use_ai_coverage", v)}
                  />
                  <span className="text-sm">Use AI for coverage analysis</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleResetApcg}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset APCG Settings
              </Button>
            </CardContent>
          </Card>

          {/* === UPDATES === */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="h-4 w-4" />
                Updates
              </CardTitle>
              <CardDescription>Check for new versions of Nanki.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCheckUpdate} disabled={checkingUpdate}>
                  {checkingUpdate ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                  Check for updates
                </Button>
                {updateInfo?.has_update && (
                  <Button variant="default" asChild>
                    <a href={updateInfo.release_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Download v{updateInfo.latest_version}
                    </a>
                  </Button>
                )}
              </div>
              {updateInfo && (
                <div className="border rounded-md p-3 bg-muted/30 text-sm">
                  {updateInfo.has_update ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Update available</Badge>
                        <span>v{updateInfo.current_version} → v{updateInfo.latest_version}</span>
                      </div>
                      {updateInfo.release_notes && (
                        <div className="text-muted-foreground whitespace-pre-wrap max-h-32 overflow-auto">
                          {updateInfo.release_notes.slice(0, 500)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Up to date</Badge>
                      <span>v{updateInfo.current_version}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
