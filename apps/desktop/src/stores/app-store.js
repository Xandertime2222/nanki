import { create } from "zustand";

export const useAppStore = create((set, get) => ({
  sidebarOpen: true,
  activeView: "editor",
  backendStatus: "unknown",
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setActiveView: (view) => set({ activeView: view }),
  setBackendStatus: (status) => set({ backendStatus: status }),
  
  // Check backend health
  checkBackend: async () => {
    try {
      const resp = await fetch("http://localhost:8642/health", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      
      if (resp.ok) {
        set({ backendStatus: "running" });
        return true;
      } else {
        set({ backendStatus: "error" });
        return false;
      }
    } catch (err) {
      set({ backendStatus: "error" });
      console.error("Backend connection failed:", err);
      return false;
    }
  },
}));

// Auto-check backend on load (only in browser, not in tests)
if (typeof window !== "undefined" && typeof process === "undefined") {
  const checkBackend = async () => {
    try {
      const resp = await fetch("http://localhost:8642/health", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      
      if (resp.ok) {
        useAppStore.getState().setBackendStatus("running");
      } else {
        useAppStore.getState().setBackendStatus("error");
      }
    } catch (err) {
      useAppStore.getState().setBackendStatus("error");
      console.error("Backend not reachable:", err.message);
    }
  };
  
  // Check immediately
  checkBackend();
  
  // Check every 5 seconds if not connected
  setInterval(() => {
    const status = useAppStore.getState().backendStatus;
    if (status !== "running") {
      checkBackend();
    }
  }, 5000);
}