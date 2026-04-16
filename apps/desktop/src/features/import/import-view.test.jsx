import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ImportView } from "@/features/import/import-view";

describe("ImportView", () => {
  it("renders import heading", () => {
    render(<ImportView />);
    expect(screen.getByText("Import")).toBeInTheDocument();
  });

  it("renders dropzone", () => {
    render(<ImportView />);
    expect(screen.getByTestId("dropzone")).toBeInTheDocument();
  });

  it("has import view test id", () => {
    render(<ImportView />);
    expect(screen.getByTestId("import-view")).toBeInTheDocument();
  });

  it("shows import files card title", () => {
    render(<ImportView />);
    expect(screen.getByText("Import Files")).toBeInTheDocument();
  });
});