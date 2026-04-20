const API_BASE = "http://localhost:8642";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  // Health
  health: () => request("/health"),
  
  // Settings
  getSettings: () => request("/api/settings"),
  updateSettings: (data) => request("/api/settings", { method: "PUT", body: JSON.stringify(data) }),
  getState: () => request("/api/state"),
  updateState: (data) => request("/api/state", { method: "PUT", body: JSON.stringify(data) }),
  updateWorkspace: (path) => request("/api/settings/workspace", { method: "POST", body: JSON.stringify({ workspace_path: path }) }),
  resetPrompts: () => request("/api/settings/prompts/reset", { method: "POST" }),
  resetApcg: () => request("/api/settings/apcg/reset", { method: "POST" }),
  
  // Notes
  getNotes: () => request("/api/notes"),
  getNote: (id) => request(`/api/notes/${id}`),
  createNote: (data) => request("/api/notes", { method: "POST", body: JSON.stringify(data) }),
  updateNote: (id, data) => request(`/api/notes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteNote: (id) => request(`/api/notes/${id}`, { method: "DELETE" }),
  duplicateNote: (id, newTitle) => request(`/api/notes/${id}/duplicate`, { method: "POST", body: JSON.stringify({ new_title: newTitle }) }),
  
  // Cards
  createCard: (noteId, data) => request(`/api/notes/${noteId}/cards`, { method: "POST", body: JSON.stringify(data) }),
  updateCard: (noteId, cardId, data) => request(`/api/notes/${noteId}/cards/${cardId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCard: (noteId, cardId) => request(`/api/notes/${noteId}/cards/${cardId}`, { method: "DELETE" }),
  exportCsv: (noteId) => request(`/api/notes/${noteId}/cards/export/csv`, { method: "POST" }),
  exportAnkiTxt: (noteId) => request(`/api/notes/${noteId}/cards/export/anki-txt`, { method: "POST" }),
  exportApkg: (noteId) => request(`/api/notes/${noteId}/cards/export/apkg`, { method: "POST" }),
  
  // Import
  importFile: async (file, title, tags, defaultDeck) => {
    const formData = new FormData();
    formData.append("file", file);
    if (title) formData.append("title", title);
    if (tags) formData.append("tags", JSON.stringify(tags));
    if (defaultDeck) formData.append("default_deck", defaultDeck);

    const res = await fetch(`${API_BASE}/api/import/file`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Import failed (${res.status}): ${body}`);
    }
    return res.json();
  },
  importText: (data) => request("/api/import/text", { method: "POST", body: JSON.stringify(data) }),
  
  // Anki
  testAnki: () => request("/api/anki/test", { method: "POST" }),
  getAnkiDecks: () => request("/api/anki/decks"),
  
  // AI
  testAi: () => request("/api/ai/test", { method: "POST" }),
  getAiModels: () => request("/api/ai/models"),
  aiChat: (data) => request("/api/ai/chat", { method: "POST", body: JSON.stringify(data) }),
  aiExplain: (data) => request("/api/ai/explain", { method: "POST", body: JSON.stringify(data) }),
  generateCards: (noteId, data) => request(`/api/ai/generate-cards?note_id=${noteId}`, { method: "POST", body: JSON.stringify({ ...data, note_id: noteId }) }),
  aiSuggestCardsForGaps: (data) => request("/api/ai/suggest-cards-for-gaps", { method: "POST", body: JSON.stringify(data) }),
  
  // Anki Push
  pushToAnki: (noteId, deckName = null) => {
    const url = deckName
      ? `/api/anki/push/${noteId}?deck_name=${encodeURIComponent(deckName)}`
      : `/api/anki/push/${noteId}`;
    return request(url, { method: "POST" });
  },
  
  // Coverage — normalize backend shape { coverage, html } into a flat report
  getCoverage: async (noteId, mode = "auto") => {
    const raw = await request(`/api/notes/${noteId}/coverage?mode=${mode}`);
    return normalizeCoverage(raw);
  },
  getCoverageSummary: (noteId) => request(`/api/notes/${noteId}/coverage/summary`),
  postCoverageApcg: async (noteId, data) => {
    const raw = await request(`/api/notes/${noteId}/coverage/apcg`, { method: "POST", body: JSON.stringify(data) });
    return normalizeCoverage(raw);
  },

  // Source
  getNoteSource: (noteId) => request(`/api/notes/${noteId}/source`),
  getSourceFile: (noteId, filename) => request(`/api/notes/${noteId}/source/file/${filename}`),

  // Render / Conversion
  renderMarkdown: (markdown) => request("/api/render-markdown", { method: "POST", body: JSON.stringify({ markdown }) }),
  convertHtml: (html) => request("/api/convert-html", { method: "POST", body: JSON.stringify({ html }) }),

  // Download
  downloadFile: (path) => `${API_BASE}/api/download?path=${encodeURIComponent(path)}`,

  // Export helpers (return response body from the POST calls)
  exportCards: (noteId, format) => {
    // format: "csv" | "anki-txt" | "apkg"
    if (format === "csv") return api.exportCsv(noteId);
    if (format === "anki-txt") return api.exportAnkiTxt(noteId);
    if (format === "apkg") return api.exportApkg(noteId);
    throw new Error(`Unknown export format: ${format}`);
  },

  // AI Coverage
  getAiCoverage: (noteId, text) => request(`/api/notes/${noteId}/coverage/ai`, { method: "POST", body: JSON.stringify({ text }) }),

  // Quiz
  getQuizSettings: () => request("/api/quiz/settings"),
  updateQuizSettings: (data) => request("/api/quiz/settings", { method: "PUT", body: JSON.stringify(data) }),
  generateQuiz: (data) => request("/api/quiz/generate", { method: "POST", body: JSON.stringify(data) }),
  listQuizzes: (noteId = null) => {
    const q = noteId ? `?note_id=${encodeURIComponent(noteId)}` : "";
    return request(`/api/quiz/list${q}`);
  },
  getQuiz: (quizId) => request(`/api/quiz/${quizId}`),
  deleteQuiz: (quizId) => request(`/api/quiz/${quizId}`, { method: "DELETE" }),
  submitQuiz: (quizId, answers) =>
    request(`/api/quiz/${quizId}/submit`, {
      method: "POST",
      body: JSON.stringify({ quiz_id: quizId, answers }),
    }),
  getQuizResults: (quizId) => request(`/api/quiz/${quizId}/results`),
  getQuizCoverage: async (noteId) => {
    const raw = await request(`/api/quiz/coverage/${noteId}`);
    // Normalize: backend returns { coverage_data, coverage_html, apcg }
    // If APCG data is attached, turn it into a normalized coverage report too.
    if (raw && raw.apcg) {
      raw.apcg = normalizeCoverage(raw.apcg);
    }
    return raw;
  },

  // Updates
  checkForUpdates: () => request("/api/updates/check"),
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Normalize the backend coverage response shape:
 *   { coverage: CoverageResult, html: string }
 * into a flat report the UI expects:
 *   { coverage_html, propositions, total_core_coverage, total_propositions,
 *     conflicts, cards, detected_mode, uncovered_count }
 */
function normalizeCoverage(raw) {
  if (!raw) return null;
  // Already flat (e.g. old shape)
  if (raw.coverage_html || raw.propositions) return raw;

  const coverage = raw.coverage || {};
  const propositions = (coverage.propositions || []).map((p) => ({
    id: p.proposition?.id || p.id,
    text: p.proposition?.text || p.text || "",
    type: p.proposition?.type || p.type || "general",
    core_score: p.core_score ?? 0,
    exact_score: p.exact_score ?? 0,
    matched: (p.core_score ?? 0) >= 0.3 || Boolean(p.front_back_match),
    match_method: p.match_method || "",
    front_back_match: Boolean(p.front_back_match),
    uncovered_slots: p.uncovered_slots || [],
    matched_card_ids: (p.matched_evidence || []).map((e) => e?.card_id || e?.id).filter(Boolean),
  }));
  const conflicts = (coverage.conflicting_cards || []).map(([card_id, score]) => ({
    card_id,
    conflict_score: score,
    description: `Card ${card_id} has conflicting coverage (score ${score?.toFixed?.(2) ?? score})`,
  }));
  return {
    coverage_html: raw.html || "",
    propositions,
    total_core_coverage: coverage.total_core ?? 0,
    total_exact_coverage: coverage.total_exact ?? 0,
    total_propositions: propositions.length,
    uncovered_count: propositions.filter((p) => !p.matched).length,
    detected_mode: coverage.detected_mode || "",
    conflicts,
    cards: coverage.cards || [],
  };
}
