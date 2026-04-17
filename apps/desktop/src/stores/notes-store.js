import { createStore } from 'zustand/vanilla';

export const notesStore = createStore((set, get) => ({
  notes: [],
  currentNote: null,
  loading: false,
  error: null,
  
  // Load all notes
  loadNotes: async () => {
    set({ loading: true, error: null });
    try {
      const { api } = await import('../lib/api');
      const notes = await api.getNotes();
      set({ notes, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },
  
  // Load single note
  loadNote: async (id) => {
    set({ loading: true, error: null });
    try {
      const { api } = await import('../lib/api');
      const note = await api.getNote(id);
      set({ currentNote: note, loading: false });
      return note;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },
  
  // Create note
  createNote: async (data) => {
    try {
      const { api } = await import('../lib/api');
      const note = await api.createNote(data);
      set((state) => ({ notes: [note, ...state.notes] }));
      return note;
    } catch (err) {
      throw err;
    }
  },
  
  // Update note
  updateNote: async (id, data) => {
    try {
      const { api } = await import('../lib/api');
      const note = await api.updateNote(id, data);
      set((state) => ({
        notes: state.notes.map(n => n.meta.id === id ? note : n),
        currentNote: state.currentNote?.meta.id === id ? note : state.currentNote,
      }));
      return note;
    } catch (err) {
      throw err;
    }
  },
  
  // Delete note
  deleteNote: async (id) => {
    try {
      const { api } = await import('../lib/api');
      await api.deleteNote(id);
      set((state) => ({
        notes: state.notes.filter(n => n.meta.id !== id),
        currentNote: state.currentNote?.meta.id === id ? null : state.currentNote,
      }));
    } catch (err) {
      throw err;
    }
  },
  
  // Duplicate note
  duplicateNote: async (id, newTitle) => {
    try {
      const { api } = await import('../lib/api');
      const note = await api.duplicateNote(id, newTitle);
      set((state) => ({ notes: [note, ...state.notes] }));
      return note;
    } catch (err) {
      throw err;
    }
  },
  
  // Set current note
  setCurrentNote: (note) => set({ currentNote: note }),
  
  // Clear error
  clearError: () => set({ error: null }),
}));
