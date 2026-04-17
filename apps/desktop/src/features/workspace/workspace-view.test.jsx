import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkspaceView } from "./workspace-view";

// Mock API
vi.mock("../../lib/api", () => ({
  api: {
    getNotes: vi.fn().mockResolvedValue([]),
    createNote: vi.fn().mockResolvedValue({ meta: { id: "1", title: "Test" }, cards: [] }),
    deleteNote: vi.fn().mockResolvedValue(undefined),
    duplicateNote: vi.fn().mockResolvedValue({ meta: { id: "2", title: "Copy" }, cards: [] }),
  },
}));

// Mock notes store
vi.mock("../../stores/notes-store", () => ({
  useNotesStore: (selector) => {
    const state = {
      notes: [],
      loading: false,
      error: null,
      loadNotes: vi.fn().mockResolvedValue([]),
      createNote: vi.fn().mockResolvedValue({ meta: { id: "1", title: "Test" } }),
      deleteNote: vi.fn().mockResolvedValue(undefined),
      duplicateNote: vi.fn().mockResolvedValue({ meta: { id: "2", title: "Copy" } }),
    };
    return selector ? selector(state) : state;
  },
}));

// Mock app store
vi.mock("../../stores/app-store", () => ({
  useAppStore: (selector) => {
    const state = {
      sidebarOpen: true,
      activeView: "workspace",
      backendStatus: "running",
    };
    return selector ? selector(state) : state;
  },
}));

describe("WorkspaceView", () => {
  it("renders workspace heading", () => {
    render(<WorkspaceView />);
    expect(screen.getByText("Workspace")).toBeInTheDocument();
  });

  it("has workspace test id", () => {
    render(<WorkspaceView />);
    expect(screen.getByTestId("workspace-view")).toBeInTheDocument();
  });

  it("shows connected badge when running", () => {
    render(<WorkspaceView />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("shows new note button", () => {
    render(<WorkspaceView />);
    expect(screen.getByText("New Note")).toBeInTheDocument();
  });
});