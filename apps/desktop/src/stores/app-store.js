import { create } from "zustand";

export const useAppStore = create((set) => ({
  sidebarOpen: true,
  activeView: "editor",
  backendStatus: "unknown",
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setActiveView: (view) => set({ activeView: view }),
  setBackendStatus: (status) => set({ backendStatus: status }),
}));