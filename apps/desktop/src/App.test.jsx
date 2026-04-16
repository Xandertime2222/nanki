import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "./App";

vi.mock("@/lib/api", () => ({
  api: { health: vi.fn().mockResolvedValue({ status: "ok" }) },
}));

describe("App", () => {
  it("renders the app shell", () => {
    render(<App />);
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
  });

  it("renders sidebar", () => {
    render(<App />);
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });

  it("renders navigation items", () => {
    render(<App />);
    expect(screen.getByTestId("nav-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("nav-import")).toBeInTheDocument();
    expect(screen.getByTestId("nav-library")).toBeInTheDocument();
  });
});