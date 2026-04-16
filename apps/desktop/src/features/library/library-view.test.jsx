import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LibraryView } from "@/features/library/library-view";

describe("LibraryView", () => {
  it("renders library heading", () => {
    render(<LibraryView />);
    expect(screen.getByText("Library")).toBeInTheDocument();
  });

  it("has library view test id", () => {
    render(<LibraryView />);
    expect(screen.getByTestId("library-view")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<LibraryView />);
    expect(screen.getByTestId("library-search")).toBeInTheDocument();
  });

  it("shows empty state message", () => {
    render(<LibraryView />);
    expect(screen.getByText(/No notes yet/i)).toBeInTheDocument();
  });
});