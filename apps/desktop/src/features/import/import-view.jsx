import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Upload, FileText, File, X, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { api } from "../../lib/api";

export function ImportView() {
  const [files, setFiles] = useState([]);
  const [importing, setImporting] = useState(false);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [defaultDeck, setDefaultDeck] = useState("");

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

  const handleImport = async () => {
    if (files.length === 0) {
      toast.error("Please select files to import");
      return;
    }

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        const parsedTags = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
        await api.importFile(file, title || undefined, parsedTags.length > 0 ? parsedTags : undefined, defaultDeck || undefined);
        successCount++;
      } catch (err) {
        console.error(`Failed to import ${file.name}:`, err);
        errorCount++;
      }
    }

    setImporting(false);

    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} file(s)`);
      setFiles([]);
      setTitle("");
      setTags("");
      setDefaultDeck("");
    }
    if (errorCount > 0) {
      toast.error(`Failed to import ${errorCount} file(s)`);
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
    <div className="p-6 space-y-6" data-testid="import-view">
      <div className="flex items-center gap-3">
        <Upload className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Import</h1>
      </div>

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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="tag1, tag2, tag3"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Default Deck (Anki)</label>
                <input
                  type="text"
                  placeholder="Default::Deck"
                  value={defaultDeck}
                  onChange={(e) => setDefaultDeck(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            <Button className="w-full" onClick={handleImport} disabled={importing}>
              {importing ? (
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
  );
}