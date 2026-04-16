import { create } from "zustand";

export const useNotesStore = create((set) => ({
  notes: [],
  selectedNoteId: null,
  loading: false,
  error: null,
  setNotes: (notes) => set({ notes, loading: false, error: null }),
  setSelectedNoteId: (id) => set({ selectedNoteId: id }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  clear: () => set({ notes: [], selectedNoteId: null, loading: false, error: null }),
}));