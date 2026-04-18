import { create } from 'zustand';
import { notesStore } from './notes-store';

export const useCardsStore = create((set, get) => ({
  cards: [],
  loading: false,
  error: null,

  // Load cards for a note
  loadCards: async (noteId) => {
    set({ loading: true, error: null });
    try {
      const { api } = await import('../lib/api');
      const note = await api.getNote(noteId);
      set({ cards: note.cards || [], loading: false });
      return note.cards || [];
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // Create card
  createCard: async (noteId, data) => {
    try {
      const { api } = await import('../lib/api');
      const card = await api.createCard(noteId, data);
      set((state) => ({ cards: [...state.cards, card] }));
      return card;
    } catch (err) {
      throw err;
    }
  },

  // Update card
  updateCard: async (noteId, cardId, data) => {
    try {
      const { api } = await import('../lib/api');
      const card = await api.updateCard(noteId, cardId, data);
      set((state) => ({
        cards: state.cards.map(c => c.id === cardId ? card : c),
      }));
      return card;
    } catch (err) {
      throw err;
    }
  },

  // Delete card
  deleteCard: async (noteId, cardId) => {
    try {
      const { api } = await import('../lib/api');
      await api.deleteCard(noteId, cardId);
      set((state) => ({ cards: state.cards.filter(c => c.id !== cardId) }));
    } catch (err) {
      throw err;
    }
  },

  // Export cards
  exportCsv: async (noteId) => {
    try {
      const { api } = await import('../lib/api');
      return await api.exportCsv(noteId);
    } catch (err) {
      throw err;
    }
  },

  exportAnkiTxt: async (noteId) => {
    try {
      const { api } = await import('../lib/api');
      return await api.exportAnkiTxt(noteId);
    } catch (err) {
      throw err;
    }
  },

  exportApkg: async (noteId) => {
    try {
      const { api } = await import('../lib/api');
      return await api.exportApkg(noteId);
    } catch (err) {
      throw err;
    }
  },

  // Set cards directly
  setCards: (cards) => set({ cards }),

  // Clear error
  clearError: () => set({ error: null }),
}));

// Export store for non-hook access
export const cardsStore = { getState: () => useCardsStore.getState() };