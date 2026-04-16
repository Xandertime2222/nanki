import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";

function App() {
  const setBackendStatus = useAppStore((s) => s.setBackendStatus);

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        await api.health();
        if (mounted) setBackendStatus("running");
      } catch {
        if (mounted) setBackendStatus("unreachable");
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, [setBackendStatus]);

  return <AppShell />;
}

export default App;