import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAppStore } from "./app-store";
import { useNotesStore } from "./notes-store";

describe("appStore", () => {
  it("has default state", () => {
    const state = useAppStore.getState();
    expect(state.sidebarOpen).toBe(true);
    expect(state.activeView).toBe("workspace");
    expect(state.backendStatus).toBe("unknown");
  });

  it("toggles sidebar", () => {
    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().sidebarOpen).toBe(false);
    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().sidebarOpen).toBe(true);
  });

  it("sets active view", () => {
    useAppStore.getState().setActiveView("import");
    expect(useAppStore.getState().activeView).toBe("import");
    useAppStore.getState().setActiveView("workspace");
  });

  it("sets backend status", () => {
    useAppStore.getState().setBackendStatus("running");
    expect(useAppStore.getState().backendStatus).toBe("running");
  });
});

describe("notesStore", () => {
  afterEach(() => {
    useNotesStore.getState().clear();
  });

  it("has default empty state", () => {
    const state = useNotesStore.getState();
    expect(state.notes).toEqual([]);
    expect(state.loading).toBe(false);
  });

  it("sets notes", () => {
    useNotesStore.getState().setNotes([{ id: "1", title: "Test" }]);
    expect(useNotesStore.getState().notes).toHaveLength(1);
  });

  it("sets loading state", () => {
    useNotesStore.getState().setLoading(true);
    expect(useNotesStore.getState().loading).toBe(true);
  });

  it("sets error state", () => {
    useNotesStore.getState().setError("fail");
    expect(useNotesStore.getState().error).toBe("fail");
    expect(useNotesStore.getState().loading).toBe(false);
  });

  it("clears state", () => {
    useNotesStore.getState().setNotes([{ id: "1" }]);
    useNotesStore.getState().clear();
    expect(useNotesStore.getState().notes).toEqual([]);
  });
});