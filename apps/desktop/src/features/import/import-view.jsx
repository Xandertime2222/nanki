import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Upload, FileText } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

export function ImportView() {
  const [files, setFiles] = useState([]);

  const onDrop = useCallback((accepted) => {
    setFiles((prev) => [...prev, ...accepted]);
    toast.success(`${accepted.length} file(s) added`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/*": [".md", ".txt"], "application/pdf": [".pdf"] },
  });

  return (
    <div className="p-6 space-y-6" data-testid="import-view">
      <div className="flex items-center gap-3">
        <Upload className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Import</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import Files</CardTitle>
          <CardDescription>Drag and drop files or click to browse</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
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
          <CardContent className="space-y-2">
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{file.name}</span>
                <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            ))}
            <Button className="mt-4" onClick={() => { toast.info("Import started"); }}>
              Import All
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}