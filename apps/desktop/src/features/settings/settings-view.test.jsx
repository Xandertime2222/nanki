import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SettingsView } from "./settings-view";

// Mock API
vi.mock("../../lib/api", () => ({
  api: {
    getSettings: vi.fn().mockResolvedValue({}),
    updateSettings: vi.fn().mockResolvedValue({}),
    testAnki: vi.fn().mockResolvedValue({}),
    getAnkiDecks: vi.fn().mockResolvedValue({ decks: [] }),
    testAi: vi.fn().mockResolvedValue({}),
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

describe("SettingsView", () => {
  it("renders settings heading", async () => {
    render(<SettingsView />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("has settings view test id", () => {
    render(<SettingsView />);
    expect(screen.getByTestId("settings-view")).toBeInTheDocument();
  });

  it("shows connection status section", async () => {
    render(<SettingsView />);
    await waitFor(() => {
      expect(screen.getByText("Connection Status")).toBeInTheDocument();
    });
  });

  it("shows AnkiConnect section", async () => {
    render(<SettingsView />);
    await waitFor(() => {
      expect(screen.getByText("AnkiConnect")).toBeInTheDocument();
    });
  });

  it("shows general settings section", async () => {
    render(<SettingsView />);
    await waitFor(() => {
      expect(screen.getByText("General Settings")).toBeInTheDocument();
    });
  });
});