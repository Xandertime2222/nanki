import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Library as LibraryIcon, Search, Plus } from "lucide-react";
import { toast } from "sonner";

export function LibraryView() {
  const [search, setSearch] = useState("");

  return (
    <div className="p-6 space-y-6" data-testid="library-view">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LibraryIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Library</h1>
          <Badge variant="secondary">0 notes</Badge>
        </div>
        <Button onClick={() => toast.info("Create note coming soon")}>
          <Plus className="h-4 w-4 mr-2" /> New Note
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="library-search"
        />
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <LibraryIcon className="h-12 w-12 mb-4 opacity-20" />
          <p>No notes yet. Import or create one to get started.</p>
        </CardContent>
      </Card>
    </div>
  );
}