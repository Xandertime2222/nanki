import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "./api";

describe("API client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("calls health endpoint", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: "ok" }),
    });
    const result = await api.health();
    expect(result).toEqual({ status: "ok" });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8642/health",
      expect.objectContaining({ headers: expect.any(Object) })
    );
  });

  it("throws on non-ok response", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    });
    await expect(api.health()).rejects.toThrow("API 500");
  });

  it("calls getNotes endpoint", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });
    const result = await api.getNotes();
    expect(result).toEqual([]);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8642/api/notes",
      expect.any(Object)
    );
  });

  it("sends POST body for createNote", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: "1" }),
    });
    await api.createNote({ title: "Test" });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8642/api/notes",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ title: "Test" }) })
    );
  });
});