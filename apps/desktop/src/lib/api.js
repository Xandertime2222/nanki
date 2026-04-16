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
  health: () => request("/health"),
  getSettings: () => request("/api/settings"),
  updateSettings: (data) => request("/api/settings", { method: "PUT", body: JSON.stringify(data) }),
  getNotes: () => request("/api/notes"),
  getNote: (id) => request(`/api/notes/${id}`),
  createNote: (data) => request("/api/notes", { method: "POST", body: JSON.stringify(data) }),
  deleteNote: (id) => request(`/api/notes/${id}`, { method: "DELETE" }),
  getFolders: () => request("/api/folders"),
  createFolder: (name) => request("/api/folders", { method: "POST", body: JSON.stringify({ name }) }),
  getAnkiDecks: () => request("/api/anki/decks"),
  testAnki: () => request("/api/anki/test", { method: "POST" }),
  getAiModels: () => request("/api/ai/models"),
  testAi: () => request("/api/ai/test", { method: "POST" }),
};