import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LibraryView } from "./library-view";

// Mock API
vi.mock("../../lib/api", () => ({
  api: {
    getNotes: vi.fn().mockResolvedValue([]),
    getNote: vi.fn().mockResolvedValue({ meta: { id: "1", title: "Test" }, cards: [] }),
  },
}));

// Mock notes store
vi.mock("../../stores/notes-store", () => ({
  useNotesStore: (selector) => {
    const state = {
      notes: [],
      loading: false,
      loadNotes: vi.fn().mockResolvedValue([]),
    };
    return selector ? selector(state) : state;
  },
}));

// Mock app store
vi.mock("../../stores/app-store", () => ({
  useAppStore: (selector) => {
    const state = {
      backendStatus: "running",
    };
    return selector ? selector(state) : state;
  },
}));

describe("LibraryView", () => {
  it("renders library heading", () => {
    render(<LibraryView />);
    expect(screen.getByText("Library")).toBeInTheDocument();
  });

  it("has library view test id", () => {
    render(<LibraryView />);
    expect(screen.getByTestId("library-view")).toBeInTheDocument();
  });

  it("shows empty state when no notes", () => {
    render(<LibraryView />);
    expect(screen.getByText("Empty Library")).toBeInTheDocument();
  });
});