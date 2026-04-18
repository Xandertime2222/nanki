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
  checkUpdates: () => request("/api/updates/check"),
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
  importFile: (file, title, tags, defaultDeck) => {
    const formData = new FormData();
    formData.append("file", file);
    if (title) formData.append("title", title);
    if (tags) formData.append("tags", JSON.stringify(tags));
    if (defaultDeck) formData.append("default_deck", defaultDeck);
    
    return fetch(`${API_BASE}/api/import/file`, {
      method: "POST",
      body: formData,
    }).then(res => res.json());
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
  generateCards: (noteId, data) => request(`/api/ai/generate-cards?note_id=${noteId}`, { method: "POST", body: JSON.stringify(data) }),
  aiSuggestCardsForGaps: (data) => request("/api/ai/suggest-cards-for-gaps", { method: "POST", body: JSON.stringify(data) }),
  
  // Anki Push
  pushToAnki: (noteId, deckName = null) => {
    const url = deckName
      ? `/api/anki/push/${noteId}?deck_name=${encodeURIComponent(deckName)}`
      : `/api/anki/push/${noteId}`;
    return request(url, { method: "POST" });
  },
  
  // Coverage
  getCoverage: (noteId, mode = "apcg") => request(`/api/notes/${noteId}/coverage?mode=${mode}`),
  getCoverageSummary: (noteId) => request(`/api/notes/${noteId}/coverage/summary`),
  postCoverageApcg: (noteId, data) => request(`/api/notes/${noteId}/coverage/apcg`, { method: "POST", body: JSON.stringify(data) }),

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

  // Updates
  checkForUpdates: () => request("/api/updates/check"),
};
