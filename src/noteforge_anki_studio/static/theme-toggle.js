/**
 * Dark Mode Theme Toggle
 */

class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.createToggleButton();
    this.listenToSystemChanges();
  }

  getStoredTheme() {
    return localStorage.getItem('nanki-theme');
  }

  getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    localStorage.setItem('nanki-theme', theme);
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
    this.updateButtonIcon(newTheme);
  }

  createToggleButton() {
    const button = document.createElement('button');
    button.className = 'theme-toggle';
    button.id = 'theme-toggle-btn';
    button.setAttribute('aria-label', 'Toggle theme');
    button.innerHTML = this.currentTheme === 'dark' ? '☀️' : '🌙';
    
    button.addEventListener('click', () => this.toggleTheme());
    document.body.appendChild(button);
  }

  updateButtonIcon(theme) {
    const button = document.getElementById('theme-toggle-btn');
    if (button) {
      button.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  listenToSystemChanges() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!this.getStoredTheme()) {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => new ThemeManager());
