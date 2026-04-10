/**
 * Keyboard Shortcuts for Nanki
 */

class KeyboardShortcuts {
  constructor() {
    this.shortcuts = {
      // Navigation
      'Ctrl+Shift+N': { action: 'newNote', description: 'Create new note' },
      'Ctrl+Shift+S': { action: 'saveNote', description: 'Save current note' },
      'Ctrl+Shift+F': { action: 'focusSearch', description: 'Focus search box' },
      'Ctrl+Shift+?': { action: 'showHelp', description: 'Show keyboard shortcuts' },
      
      // Editor
      'Ctrl+B': { action: 'bold', description: 'Bold text' },
      'Ctrl+I': { action: 'italic', description: 'Italic text' },
      'Ctrl+K': { action: 'createCard', description: 'Create flashcard from selection' },
      'Ctrl+Enter': { action: 'pushToAnki', description: 'Push cards to Anki' },
      
      // View
      'Ctrl+Shift+D': { action: 'toggleDashboard', description: 'Toggle statistics dashboard' },
      'Ctrl+Shift+T': { action: 'toggleTheme', description: 'Toggle dark/light theme' },
    };
    
    this.init();
  }

  init() {
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
    this.createHelpModal();
  }

  handleKeydown(e) {
    const key = [];
    if (e.ctrlKey) key.push('Ctrl');
    if (e.shiftKey) key.push('Shift');
    if (e.altKey) key.push('Alt');
    if (e.metaKey) key.push('Meta');
    key.push(e.key === ' ' ? 'Space' : e.key);
    
    const shortcut = key.join('+');
    const action = this.shortcuts[shortcut];
    
    if (action) {
      e.preventDefault();
      this.executeAction(action.action);
    }
  }

  executeAction(action) {
    switch (action) {
      case 'newNote':
        document.getElementById('new-note-btn')?.click();
        break;
      case 'saveNote':
        // Trigger save event
        window.dispatchEvent(new CustomEvent('nanki:save-note'));
        break;
      case 'focusSearch':
        document.getElementById('note-search')?.focus();
        break;
      case 'showHelp':
        this.showHelp();
        break;
      case 'createCard':
        document.getElementById('card-from-selection-btn')?.click();
        break;
      case 'pushToAnki':
        document.getElementById('push-to-anki-btn')?.click();
        break;
      case 'toggleDashboard':
        document.getElementById('toggle-study-btn')?.click();
        break;
      case 'toggleTheme':
        document.getElementById('theme-toggle-btn')?.click();
        break;
    }
  }

  createHelpModal() {
    const modal = document.createElement('div');
    modal.id = 'shortcuts-help-modal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>⌨️ Keyboard Shortcuts</h2>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="shortcuts-grid">
            ${Object.entries(this.shortcuts).map(([key, value]) => `
              <div class="shortcut-row">
                <kbd class="key-combo">${key}</kbd>
                <span class="description">${value.description}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close-btn')?.addEventListener('click', () => this.hideHelp());
    modal.querySelector('.modal-overlay')?.addEventListener('click', () => this.hideHelp());
  }

  showHelp() {
    document.getElementById('shortcuts-help-modal')?.classList.remove('hidden');
  }

  hideHelp() {
    document.getElementById('shortcuts-help-modal')?.classList.add('hidden');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => new KeyboardShortcuts());
