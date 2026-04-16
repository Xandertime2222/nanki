import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { WorkspaceView } from "@/features/workspace/workspace-view";

describe("WorkspaceView", () => {
  it("renders workspace heading", () => {
    render(<WorkspaceView />);
    expect(screen.getByText("Workspace")).toBeInTheDocument();
  });

  it("shows welcome card", () => {
    render(<WorkspaceView />);
    expect(screen.getByText("Welcome to Nanki")).toBeInTheDocument();
  });

  it("has workspace test id", () => {
    render(<WorkspaceView />);
    expect(screen.getByTestId("workspace-view")).toBeInTheDocument();
  });
});