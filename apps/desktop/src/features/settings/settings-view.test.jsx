import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SettingsView } from "./settings-view";

// Mock API
vi.mock("../../lib/api", () => ({
  api: {
    getSettings: vi.fn().mockResolvedValue({
      workspace_path: "/home/test/workspace",
      language: "en",
      anki_url: "http://127.0.0.1:8765",
      auto_sync: false,
      ai: {
        enabled: false,
        provider: "ollama_local",
        ollama_local_url: "http://127.0.0.1:11434",
        ollama_cloud_url: "https://ollama.com",
        openrouter_url: "https://openrouter.ai/api/v1",
        ollama_cloud_api_key: "",
        openrouter_api_key: "",
        default_model: "",
        chat_model: "",
        explain_model: "",
        flashcard_model: "",
        auto_flashcard_model: "",
        language: "en",
        use_anki_coverage_context: true,
        chat_note_only: false,
        explain_note_only: false,
        auto_detect_ollama_models: true,
        prompts: {
          chat: "",
          explain: "",
          flashcards: "",
          auto_flashcards: "",
        },
      },
      apcg: {
        default_mode: "auto",
        include_anki_cards: true,
        auto_refresh: false,
        use_ai_coverage: false,
      },
    }),
    updateSettings: vi.fn().mockResolvedValue({}),
    testAnki: vi.fn().mockResolvedValue({}),
    getAnkiDecks: vi.fn().mockResolvedValue({ decks: [] }),
    testAi: vi.fn().mockResolvedValue({}),
    checkForUpdates: vi.fn().mockResolvedValue(null),
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
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /settings/i })).toBeInTheDocument();
    });
  });

  it("shows AnkiConnect section", async () => {
    render(<SettingsView />);
    await waitFor(() => {
      expect(screen.getByText("AnkiConnect")).toBeInTheDocument();
    });
  });

  it("shows AI Features section", async () => {
    render(<SettingsView />);
    await waitFor(() => {
      expect(screen.getByText("AI Features")).toBeInTheDocument();
    });
  });

  it("shows APCG Analysis section", async () => {
    render(<SettingsView />);
    await waitFor(() => {
      expect(screen.getByText("APCG Analysis")).toBeInTheDocument();
    });
  });
  
  it("shows General section", async () => {
    render(<SettingsView />);
    await waitFor(() => {
      expect(screen.getByText("General")).toBeInTheDocument();
    });
  });
});
