import { AppSidebar } from "./app-sidebar";
import { CommandPalette } from "./command-palette";
import { Toaster } from "sonner";
import { useAppStore } from "../stores/app-store";
import { WorkspaceView } from "../features/workspace/workspace-view";
import { ImportView } from "../features/import/import-view";
import { LibraryView } from "../features/library/library-view";
import { AnalysisView } from "../features/analysis/analysis-view";
import { ReviewView } from "../features/review/review-view";
import { SettingsView } from "../features/settings/settings-view";
import { EditorView } from "../features/editor/editor-view";
import { motion, AnimatePresence } from "framer-motion";

const views = {
  editor: EditorView,
  workspace: WorkspaceView,
  import: ImportView,
  library: LibraryView,
  analysis: AnalysisView,
  review: ReviewView,
  settings: SettingsView,
};

export function AppShell() {
  const { activeView } = useAppStore();
  const ActiveView = views[activeView] || WorkspaceView;

  return (
    <div className="flex h-screen w-screen overflow-hidden" data-testid="app-shell">
      <AppSidebar />
      <main className="flex-1 overflow-auto bg-background">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <ActiveView />
          </motion.div>
        </AnimatePresence>
      </main>
      <CommandPalette />
      <Toaster position="bottom-right" />
    </div>
  );
}