import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAppStore } from "./app-store";
import { notesStore } from "./notes-store";

// Mock API
vi.mock("../lib/api", () => ({
  api: {
    getNotes: vi.fn().mockResolvedValue([]),
    getNote: vi.fn().mockResolvedValue({ meta: { id: "1", title: "Test" }, cards: [] }),
    createNote: vi.fn().mockResolvedValue({ meta: { id: "1", title: "Test" }, cards: [] }),
    updateNote: vi.fn().mockResolvedValue({ meta: { id: "1", title: "Updated" }, cards: [] }),
    deleteNote: vi.fn().mockResolvedValue(undefined),
    duplicateNote: vi.fn().mockResolvedValue({ meta: { id: "2", title: "Copy" }, cards: [] }),
  },
}));

describe("appStore", () => {
  it("has default state", () => {
    const state = useAppStore.getState();
    expect(state.sidebarOpen).toBe(true);
    expect(state.activeView).toBe("editor");
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
  beforeEach(() => {
    // Reset store state before each test
    notesStore.getState().clear();
  });

  it("has default empty state", () => {
    const state = notesStore.getState();
    expect(state.notes).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("sets notes", () => {
    notesStore.getState().setNotes([{ id: "1", title: "Test" }]);
    expect(notesStore.getState().notes).toHaveLength(1);
  });

  it("sets loading state", () => {
    notesStore.getState().setLoading(true);
    expect(notesStore.getState().loading).toBe(true);
  });

  it("sets error state", () => {
    notesStore.getState().setError("fail");
    expect(notesStore.getState().error).toBe("fail");
    expect(notesStore.getState().loading).toBe(false);
  });

  it("clears state", () => {
    notesStore.getState().setNotes([{ id: "1" }]);
    notesStore.getState().clear();
    expect(notesStore.getState().notes).toEqual([]);
  });
});