import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Upload, FileText, File, X, Loader2, ClipboardPaste } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { api } from "../../lib/api";

const TABS = {
  FILE: "file",
  TEXT: "text"
};

export function ImportView() {
  const [activeTab, setActiveTab] = useState(TABS.FILE);

  // File import state
  const [files, setFiles] = useState([]);
  const [fileImporting, setFileImporting] = useState(false);
  const [fileTitle, setFileTitle] = useState("");
  const [fileTags, setFileTags] = useState("");
  const [fileDefaultDeck, setFileDefaultDeck] = useState("");

  // Text import state
  const [text, setText] = useState("");
  const [textImporting, setTextImporting] = useState(false);
  const [textTitle, setTextTitle] = useState("");
  const [textTags, setTextTags] = useState("");
  const [textDefaultDeck, setTextDefaultDeck] = useState("");

  const onDrop = useCallback((accepted) => {
    setFiles((prev) => [...prev, ...accepted]);
    toast.success(`${accepted.length} file(s) added`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/markdown": [".md"],
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
    },
  });

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileImport = async () => {
    if (files.length === 0) {
      toast.error("Please select files to import");
      return;
    }

    setFileImporting(true);
    const failedFiles = [];
    let successCount = 0;

    for (const file of files) {
      try {
        const parsedTags = fileTags ? fileTags.split(",").map((t) => t.trim()).filter(Boolean) : [];
        await api.importFile(file, fileTitle || undefined, parsedTags.length > 0 ? parsedTags : undefined, fileDefaultDeck || undefined);
        successCount++;
      } catch (err) {
        console.error(`Failed to import ${file.name}:`, err);
        failedFiles.push(file.name);
      }
    }

    setFileImporting(false);

    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} file(s)`);
      // Only clear successfully-imported files
      if (failedFiles.length === 0) {
        setFiles([]);
        setFileTitle("");
        setFileTags("");
        setFileDefaultDeck("");
      } else {
        // Keep only the failed files in the list so the user can retry
        setFiles((prev) => prev.filter((f) => failedFiles.includes(f.name)));
      }
    }
    if (failedFiles.length > 0) {
      toast.error(`Failed to import: ${failedFiles.join(", ")}`);
    }
  };

  const handleTextImport = async () => {
    if (!text.trim()) {
      toast.error("Please enter text to import");
      return;
    }

    setTextImporting(true);

    try {
      const parsedTags = textTags ? textTags.split(",").map((t) => t.trim()).filter(Boolean) : [];
      await api.importText({
        text: text.trim(),
        title: textTitle || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        default_deck: textDefaultDeck || undefined,
      });

      toast.success("Text imported successfully");
      setText("");
      setTextTitle("");
      setTextTags("");
      setTextDefaultDeck("");
    } catch (err) {
      console.error("Failed to import text:", err);
      toast.error("Failed to import text");
    } finally {
      setTextImporting(false);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return <File className="h-4 w-4 text-red-500" />;
      case "pptx":
        return <File className="h-4 w-4 text-orange-500" />;
      case "md":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "txt":
        return <FileText className="h-4 w-4 text-gray-500" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6" data-testid="import-view">
      <div className="flex items-center gap-3">
        <Upload className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Import</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-muted-foreground/25">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === TABS.FILE
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
          }`}
          onClick={() => setActiveTab(TABS.FILE)}
          data-testid="tab-file-import"
        >
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            File Import
          </div>
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === TABS.TEXT
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
          }`}
          onClick={() => setActiveTab(TABS.TEXT)}
          data-testid="tab-text-import"
        >
          <div className="flex items-center gap-2">
            <ClipboardPaste className="h-4 w-4" />
            Text Import
          </div>
        </button>
      </div>

      {/* File Import Tab */}
      {activeTab === TABS.FILE && (
        <div data-testid="file-import-panel">
          <Card>
            <CardHeader>
              <CardTitle>Import Files</CardTitle>
              <CardDescription>
                Drag and drop files or click to browse. Supports Markdown, Text, PDF, and PPTX files.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                }`}
                data-testid="dropzone"
              >
                <input {...getInputProps()} />
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                {isDragActive ? (
                  <p>Drop files here...</p>
                ) : (
                  <p className="text-muted-foreground">Drop files here, or click to select</p>
                )}
              </div>
            </CardContent>
          </Card>

          {files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Selected Files ({files.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.name)}
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeFile(i)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Title (optional)</label>
                    <input
                      type="text"
                      placeholder="Custom title..."
                      value={fileTitle}
                      onChange={(e) => setFileTitle(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Tags (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="tag1, tag2, tag3"
                      value={fileTags}
                      onChange={(e) => setFileTags(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Default Deck (Anki)</label>
                    <input
                      type="text"
                      placeholder="Default::Deck"
                      value={fileDefaultDeck}
                      onChange={(e) => setFileDefaultDeck(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>

                <Button className="w-full" onClick={handleFileImport} disabled={fileImporting}>
                  {fileImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import All
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Text Import Tab */}
      {activeTab === TABS.TEXT && (
        <Card data-testid="text-import-panel">
          <CardHeader>
            <CardTitle>Import from Text</CardTitle>
            <CardDescription>
              Paste or type your text below and configure import options.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Text Content</label>
              <textarea
                placeholder="Paste your text here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-3 py-2 border rounded-md h-64 font-mono text-sm resize-y"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Title (optional)</label>
                <input
                  type="text"
                  placeholder="Custom title..."
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="tag1, tag2, tag3"
                  value={textTags}
                  onChange={(e) => setTextTags(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Default Deck (Anki)</label>
                <input
                  type="text"
                  placeholder="Default::Deck"
                  value={textDefaultDeck}
                  onChange={(e) => setTextDefaultDeck(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            <Button className="w-full" onClick={handleTextImport} disabled={textImporting}>
              {textImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <ClipboardPaste className="h-4 w-4 mr-2" />
                  Import Text
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
