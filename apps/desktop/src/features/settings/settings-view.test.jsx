import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SettingsView } from "./settings-view";

describe("SettingsView", () => {
  it("renders settings heading", () => {
    render(<SettingsView />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("has settings view test id", () => {
    render(<SettingsView />);
    expect(screen.getByTestId("settings-view")).toBeInTheDocument();
  });

  it("shows backend connection section", () => {
    render(<SettingsView />);
    expect(screen.getByText("Backend Connection")).toBeInTheDocument();
  });

  it("shows AI configuration section", () => {
    render(<SettingsView />);
    expect(screen.getByText("AI Configuration")).toBeInTheDocument();
  });
});