/**
 * Learning Statistics Dashboard for Nanki
 */

class StatsDashboard {
  constructor() {
    this.data = null;
    this.isVisible = false;
    this.init();
  }

  init() {
    this.createDashboardPanel();
    this.attachEventListeners();
    this.loadStats();
  }

  createDashboardPanel() {
    const panel = document.createElement('div');
    panel.id = 'stats-dashboard-panel';
    panel.className = 'stats-dashboard hidden';
    panel.innerHTML = `
      <div class="stats-header">
        <h2 data-i18n="stats.title">📊 Learning Statistics</h2>
        <button id="close-stats-btn" class="ghost">
          <svg class="icon" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11.5 3.5l-8 8M3.5 3.5l8 8"/>
          </svg>
        </button>
      </div>
      
      <div class="stats-content">
        <!-- Overview Cards -->
        <div class="stats-grid overview">
          <div class="stat-card primary">
            <div class="stat-icon">📚</div>
            <div class="stat-value" id="stat-total-notes">-</div>
            <div class="stat-label" data-i18n="stats.totalNotes">Total Notes</div>
          </div>
          <div class="stat-card primary">
            <div class="stat-icon">🎴</div>
            <div class="stat-value" id="stat-total-cards">-</div>
            <div class="stat-label" data-i18n="stats.totalCards">Total Cards</div>
          </div>
          <div class="stat-card primary">
            <div class="stat-icon">✅</div>
            <div class="stat-value" id="stat-pushed-percent">-</div>
            <div class="stat-label" data-i18n="stats.pushedPercent">Pushed to Anki</div>
          </div>
          <div class="stat-card primary">
            <div class="stat-icon">🔥</div>
            <div class="stat-value" id="stat-streak">-</div>
            <div class="stat-label" data-i18n="stats.streak">Day Streak</div>
          </div>
        </div>

        <!-- Time Period Stats -->
        <div class="stats-section">
          <h3 data-i18n="stats.activity">Activity</h3>
          <div class="stats-grid periods">
            <div class="stat-card">
              <div class="stat-value" id="stat-today-cards">-</div>
              <div class="stat-label" data-i18n="stats.today">Today</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="stat-week-cards">-</div>
              <div class="stat-label" data-i18n="stats.thisWeek">This Week</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="stat-month-cards">-</div>
              <div class="stat-label" data-i18n="stats.thisMonth">This Month</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="stat-total-created">-</div>
              <div class="stat-label" data-i18n="stats.allTime">All Time</div>
            </div>
          </div>
        </div>

        <!-- Study Session -->
        <div class="stats-section">
          <h3 data-i18n="stats.session">Study Session</h3>
          <div class="session-controls">
            <button id="start-session-btn" class="primary">
              <span data-i18n="stats.startSession">Start Session</span>
            </button>
            <button id="end-session-btn" class="soft hidden">
              <span data-i18n="stats.endSession">End Session</span>
            </button>
            <span id="session-timer" class="session-timer hidden">00:00</span>
          </div>
          <div class="session-stats hidden" id="session-stats">
            <span data-i18n="stats.sessionCards">Cards created this session: </span>
            <strong id="session-cards-count">0</strong>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="stats-actions">
          <button id="refresh-stats-btn" class="ghost">
            <svg class="icon" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M7.5 1.5v2m0 8v2M1.5 7.5h2m8 0h2"/>
            </svg>
            <span data-i18n="stats.refresh">Refresh</span>
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
  }

  attachEventListeners() {
    // Open dashboard
    const studyBtn = document.getElementById('toggle-study-btn');
    if (studyBtn) {
      studyBtn.addEventListener('click', () => this.show());
    }

    // Close dashboard
    document.getElementById('close-stats-btn')?.addEventListener('click', () => this.hide());
    
    // Refresh
    document.getElementById('refresh-stats-btn')?.addEventListener('click', () => this.loadStats());
    
    // Session controls
    document.getElementById('start-session-btn')?.addEventListener('click', () => this.startSession());
    document.getElementById('end-session-btn')?.addEventListener('click', () => this.endSession());
  }

  show() {
    const panel = document.getElementById('stats-dashboard-panel');
    if (panel) {
      panel.classList.remove('hidden');
      this.isVisible = true;
      this.loadStats();
    }
  }

  hide() {
    const panel = document.getElementById('stats-dashboard-panel');
    if (panel) {
      panel.classList.add('hidden');
      this.isVisible = false;
    }
  }

  async loadStats() {
    try {
      const response = await fetch('/api/stats/dashboard');
      if (!response.ok) throw new Error('Failed to load stats');
      
      this.data = await response.json();
      this.updateUI();
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  updateUI() {
    if (!this.data) return;

    const { workspace, today, this_week, this_month, all_time, streak_days, current_session } = this.data;

    // Workspace stats
    this.setText('stat-total-notes', workspace?.total_notes ?? 0);
    this.setText('stat-total-cards', workspace?.total_cards ?? 0);
    this.setText('stat-pushed-percent', `${workspace?.push_percentage ?? 0}%`);
    this.setText('stat-streak', streak_days ?? 0);

    // Time period stats
    this.setText('stat-today-cards', today?.cards_created ?? 0);
    this.setText('stat-week-cards', this_week?.cards_created ?? 0);
    this.setText('stat-month-cards', this_month?.cards_created ?? 0);
    this.setText('stat-total-created', all_time?.cards_created ?? 0);

    // Session state
    if (current_session) {
      document.getElementById('start-session-btn')?.classList.add('hidden');
      document.getElementById('end-session-btn')?.classList.remove('hidden');
      document.getElementById('session-timer')?.classList.remove('hidden');
      document.getElementById('session-stats')?.classList.remove('hidden');
      document.getElementById('session-cards-count').textContent = current_session.cards_created ?? 0;
    }
  }

  setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  async startSession() {
    try {
      const response = await fetch('/api/stats/session/start', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to start session');
      
      document.getElementById('start-session-btn')?.classList.add('hidden');
      document.getElementById('end-session-btn')?.classList.remove('hidden');
      document.getElementById('session-timer')?.classList.remove('hidden');
      document.getElementById('session-stats')?.classList.remove('hidden');
      
      this.loadStats();
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  }

  async endSession() {
    try {
      const response = await fetch('/api/stats/session/end', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to end session');
      
      document.getElementById('start-session-btn')?.classList.remove('hidden');
      document.getElementById('end-session-btn')?.classList.add('hidden');
      document.getElementById('session-timer')?.classList.add('hidden');
      document.getElementById('session-stats')?.classList.add('hidden');
      
      this.loadStats();
    } catch (err) {
      console.error('Failed to end session:', err);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new StatsDashboard());
} else {
  new StatsDashboard();
}
