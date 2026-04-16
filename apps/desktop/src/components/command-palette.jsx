import { useState, useEffect } from "react";
import { Command } from "cmdk";
import { useAppStore } from "../stores/app-store";
import {
  FolderOpen,
  Upload,
  Library,
  BarChart3,
  CheckSquare,
  Settings,
} from "lucide-react";

const commands = [
  { id: "workspace", label: "Go to Workspace", icon: FolderOpen, view: "workspace" },
  { id: "import", label: "Go to Import", icon: Upload, view: "import" },
  { id: "library", label: "Go to Library", icon: Library, view: "library" },
  { id: "analysis", label: "Go to Analysis", icon: BarChart3, view: "analysis" },
  { id: "review", label: "Go to Review", icon: CheckSquare, view: "review" },
  { id: "settings", label: "Go to Settings", icon: Settings, view: "settings" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const setActiveView = useAppStore((s) => s.setActiveView);

  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
    >
      <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative z-10 w-full max-w-md rounded-lg border bg-background shadow-xl overflow-hidden" data-testid="command-palette">
        <Command.Input
          placeholder="Type a command..."
          className="w-full border-none bg-transparent p-4 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Command.List className="max-h-64 overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>
          {commands.map(({ id, label, icon: Icon, view }) => (
            <Command.Item
              key={id}
              onSelect={() => { setActiveView(view); setOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Command.Item>
          ))}
        </Command.List>
      </div>
    </Command.Dialog>
  );
}