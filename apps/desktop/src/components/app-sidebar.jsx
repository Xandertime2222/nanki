import { useAppStore } from "../stores/app-store";
import { cn } from "../lib/utils";
import {
  FolderOpen,
  Upload,
  Library,
  BarChart3,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Edit3,
} from "lucide-react";
import { Button } from "./ui/button";

const navItems = [
  { id: "editor", label: "Editor", icon: Edit3 },
  { id: "workspace", label: "Workspace", icon: FolderOpen },
  { id: "import", label: "Import", icon: Upload },
  { id: "library", label: "Library", icon: Library },
  { id: "analysis", label: "Analysis", icon: BarChart3 },
  { id: "review", label: "Review", icon: CheckSquare },
  { id: "settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const { sidebarOpen, toggleSidebar, activeView, setActiveView } = useAppStore();

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-muted/40 transition-all duration-200",
        sidebarOpen ? "w-56" : "w-14"
      )}
      data-testid="sidebar"
    >
      <div className="flex items-center justify-between p-3 border-b">
        {sidebarOpen && (
          <span className="font-bold text-lg tracking-tight">Nanki</span>
        )}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} data-testid="toggle-sidebar">
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 p-2 space-y-1" data-testid="nav-items">
        {navItems.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={activeView === id ? "secondary" : "ghost"}
            className={cn("w-full justify-start gap-2", !sidebarOpen && "justify-center px-0")}
            onClick={() => setActiveView(id)}
            data-testid={`nav-${id}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>{label}</span>}
          </Button>
        ))}
      </nav>

      <div className="p-3 border-t">
        <BackendStatus />
      </div>
    </aside>
  );
}

function BackendStatus() {
  const { backendStatus } = useAppStore();
  const { sidebarOpen } = useAppStore();

  return (
    <div className="flex items-center gap-2 text-xs" data-testid="backend-status">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          backendStatus === "running" ? "bg-green-500" : "bg-yellow-500"
        )}
      />
      {sidebarOpen && (
        <span className="text-muted-foreground">
          {backendStatus === "running" ? "Backend connected" : "Backend connecting..."}
        </span>
      )}
    </div>
  );
}