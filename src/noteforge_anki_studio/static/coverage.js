/**
 * APCG Coverage Analysis UI Component
 */

class CoverageAnalyzer {
  constructor(noteId) {
    this.noteId = noteId;
    this.currentMode = 'auto';
    this.lastResult = null;
  }

  async analyze(mode = 'auto', includeAnki = true) {
    this.currentMode = mode;
    
    const url = `/api/notes/${this.noteId}/coverage/apcg?mode=${mode}&include_anki_cards=${includeAnki}`;
    
    try {
      const response = await fetch(url, { method: 'POST' });
      if (!response.ok) throw new Error('Analysis failed');
      
      this.lastResult = await response.json();
      return this.lastResult;
    } catch (error) {
      console.error('Coverage analysis error:', error);
      throw error;
    }
  }

  async getSummary(mode = 'auto') {
    const url = `/api/notes/${this.noteId}/coverage/summary?mode=${mode}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Summary failed');
      
      return await response.json();
    } catch (error) {
      console.error('Coverage summary error:', error);
      throw error;
    }
  }

  renderCoverageBar(container, coverage) {
    const percentage = Math.round(coverage * 100);
    const level = coverage > 0.6 ? 'high' : coverage > 0.3 ? 'medium' : 'low';
    const color = coverage > 0.6 ? '#22c55e' : coverage > 0.3 ? '#eab308' : '#ef4444';
    
    container.innerHTML = `
      <div class="coverage-bar-container" style="width: 100%; height: 24px; background: #f3f4f6; border-radius: 6px; overflow: hidden;">
        <div class="coverage-bar-fill" style="width: ${percentage}%; height: 100%; background: ${color}; transition: width 0.5s ease;"></div>
      </div>
      <div class="coverage-stats" style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 14px;">
        <span>${percentage}% Core Coverage</span>
        <span class="coverage-level" data-level="${level}">${level.charAt(0).toUpperCase() + level.slice(1)}</span>
      </div>
    `;
  }

  renderPropositions(container, propositions) {
    if (!propositions || propositions.length === 0) {
      container.innerHTML = '<p class="text-gray-500">No propositions analyzed</p>';
      return;
    }

    const covered = propositions.filter(p => p.matched);
    const uncovered = propositions.filter(p => !p.matched);

    container.innerHTML = `
      <div class="coverage-tabs">
        <button class="tab-btn active" data-tab="all">All (${propositions.length})</button>
        <button class="tab-btn" data-tab="covered">Covered (${covered.length})</button>
        <button class="tab-btn" data-tab="uncovered">Uncovered (${uncovered.length})</button>
      </div>
      
      <div class="tab-content" id="tab-all">
        ${this.renderPropositionList(propositions)}
      </div>
      
      <div class="tab-content hidden" id="tab-covered">
        ${this.renderPropositionList(covered)}
      </div>
      
      <div class="tab-content hidden" id="tab-uncovered">
        ${this.renderPropositionList(uncovered)}
      </div>
    `;

    // Add tab switching
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        
        e.target.classList.add('active');
        const tabId = e.target.dataset.tab;
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
      });
    });
  }

  renderPropositionList(propositions) {
    if (propositions.length === 0) {
      return '<p class="text-gray-500 p-4">No propositions in this category</p>';
    }

    return `
      <div class="proposition-list space-y-3">
        ${propositions.map(p => this.renderPropositionCard(p)).join('')}
      </div>
    `;
  }

  renderPropositionCard(prop) {
    const coveragePercent = Math.round(prop.core_score * 100);
    const coverageColor = prop.core_score > 0.6 ? '#22c55e' : prop.core_score > 0.3 ? '#eab308' : '#ef4444';
    const typeIcon = this.getTypeIcon(prop.type);
    
    return `
      <div class="proposition-card p-4 border rounded-lg ${prop.matched ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}">
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="text-lg">${typeIcon}</span>
            <span class="text-xs px-2 py-1 rounded bg-gray-200">${prop.type}</span>
            ${prop.front_back_match ? '<span class="text-xs px-2 py-1 rounded bg-blue-200">Q&A Match</span>' : ''}
          </div>
          <div class="text-right">
            <div class="text-sm font-semibold" style="color: ${coverageColor}">${coveragePercent}%</div>
          </div>
        </div>
        
        <p class="text-gray-800 mb-2">${this.escapeHtml(prop.text)}</p>
        
        ${prop.matched && prop.matched_card_ids.length > 0 ? `
          <div class="mt-2 text-sm text-gray-600">
            <strong>Matched cards:</strong> ${prop.matched_card_ids.join(', ')}
          </div>
        ` : ''}
        
        ${prop.uncovered_slots && prop.uncovered_slots.length > 0 ? `
          <div class="mt-2 text-sm text-red-600">
            <strong>Missing:</strong> ${prop.uncovered_slots.join(', ')}
          </div>
        ` : ''}
        
        <div class="mt-2 coverage-bar-mini" style="width: 100%; height: 6px; background: #e5e7eb; border-radius: 3px;">
          <div style="width: ${coveragePercent}%; height: 100%; background: ${coverageColor}; border-radius: 3px;"></div>
        </div>
      </div>
    `;
  }

  renderUncoveredList(uncovered) {
    if (!uncovered || uncovered.length === 0) {
      return '<p class="text-green-600">✅ All topics covered!</p>';
    }

    return `
      <div class="uncovered-list space-y-2">
        ${uncovered.map(u => `
          <div class="uncovered-item p-3 bg-red-50 border border-red-200 rounded">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-red-500">❌</span>
              <span class="text-xs px-2 py-1 rounded bg-red-200">${u.type}</span>
            </div>
            <p class="text-gray-800">${this.escapeHtml(u.text)}</p>
            <button class="mt-2 text-sm text-blue-600 hover:underline" onclick="suggestCardFor('${this.noteId}', '${u.id}')">
              + Suggest card for this topic
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderConflicts(conflicts) {
    if (!conflicts || conflicts.length === 0) {
      return '<p class="text-green-600">✅ No conflicts detected</p>';
    }

    return `
      <div class="conflicts-list space-y-2">
        ${conflicts.map(c => `
          <div class="conflict-item p-3 bg-yellow-50 border border-yellow-200 rounded">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-yellow-600">⚠️</span>
              <span class="font-semibold">Card: ${c.card_id}</span>
              <span class="text-xs px-2 py-1 rounded bg-yellow-200">Conflict: ${(c.conflict_score * 100).toFixed(0)}%</span>
            </div>
            <p class="text-gray-600 text-sm">This card may contain conflicting information. Review recommended.</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  getTypeIcon(type) {
    const icons = {
      'facts': '📜',
      'process': '🔬',
      'definition': '📖',
      'general': '📝',
    };
    return icons[type] || '📝';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getModeRecommendation(detectedMode) {
    const recommendations = {
      'facts': '📜 History/Geography content detected',
      'process': '🔬 Science/Process content detected',
      'definition': '📖 Definition/Concept content detected',
      'universal': '🌐 Mixed content detected',
    };
    return recommendations[detectedMode] || 'Auto-detected';
  }
}

// Global helper for card suggestion
function suggestCardFor(noteId, propositionId) {
  // TODO: Implement AI card suggestion based on proposition
  alert(`Would suggest a card for proposition: ${propositionId}\n\nThis feature is under development.`);
}

// Initialize coverage analysis on page load
document.addEventListener('DOMContentLoaded', function() {
  const noteIdEl = document.getElementById('note-id');
  if (noteIdEl) {
    const analyzer = new CoverageAnalyzer(noteIdEl.value);
    window.coverageAnalyzer = analyzer;
    
    // Auto-analyze on load
    analyzer.analyze('auto').then(result => {
      // Render results if container exists
      const container = document.getElementById('coverage-results');
      if (container) {
        renderCoverageResults(analyzer, result);
      }
    }).catch(err => {
      console.error('Auto-analysis failed:', err);
    });
  }
});

function renderCoverageResults(analyzer, result) {
  const container = document.getElementById('coverage-results');
  if (!container) return;
  
  container.innerHTML = `
    <div class="coverage-dashboard space-y-6">
      <!-- Summary -->
      <div class="summary-card p-4 bg-white rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-3">Coverage Summary</h3>
        <div id="coverage-bar"></div>
        <p class="mt-3 text-sm text-gray-600">
          ${analyzer.getModeRecommendation(result.detected_mode)}
        </p>
        <div class="mt-3 grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-2xl font-bold">${result.total_propositions}</div>
            <div class="text-sm text-gray-600">Propositions</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-green-600">${result.total_propositions - result.uncovered_count}</div>
            <div class="text-sm text-gray-600">Covered</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-red-600">${result.uncovered_count}</div>
            <div class="text-sm text-gray-600">Uncovered</div>
          </div>
        </div>
      </div>
      
      <!-- Mode Selector -->
      <div class="mode-selector p-4 bg-white rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-3">Analysis Mode</h3>
        <div class="flex gap-2 flex-wrap">
          <button class="mode-btn px-3 py-2 rounded ${result.detected_mode === 'auto' ? 'bg-blue-600 text-white' : 'bg-gray-200'}" 
                  onclick="changeMode('auto')">🤖 Auto</button>
          <button class="mode-btn px-3 py-2 rounded ${result.detected_mode === 'facts' ? 'bg-blue-600 text-white' : 'bg-gray-200'}"
                  onclick="changeMode('facts')">📜 Facts</button>
          <button class="mode-btn px-3 py-2 rounded ${result.detected_mode === 'process' ? 'bg-blue-600 text-white' : 'bg-gray-200'}"
                  onclick="changeMode('process')">🔬 Process</button>
          <button class="mode-btn px-3 py-2 rounded ${result.detected_mode === 'definition' ? 'bg-blue-600 text-white' : 'bg-gray-200'}"
                  onclick="changeMode('definition')">📖 Definition</button>
          <button class="mode-btn px-3 py-2 rounded ${result.detected_mode === 'universal' ? 'bg-blue-600 text-white' : 'bg-gray-200'}"
                  onclick="changeMode('universal')">🌐 Universal</button>
        </div>
      </div>
      
      <!-- Propositions -->
      <div class="propositions-card p-4 bg-white rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-3">Propositions</h3>
        <div id="propositions-container"></div>
      </div>
      
      <!-- Uncovered -->
      <div class="uncovered-card p-4 bg-white rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-3">Coverage Gaps</h3>
        <div id="uncovered-container">
          ${analyzer.renderUncoveredList(result.uncovered)}
        </div>
      </div>
      
      <!-- Conflicts -->
      <div class="conflicts-card p-4 bg-white rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-3">Conflicts</h3>
        <div id="conflicts-container">
          ${analyzer.renderConflicts(result.conflicts)}
        </div>
      </div>
    </div>
  `;
  
  // Render coverage bar
  analyzer.renderCoverageBar(
    document.getElementById('coverage-bar'),
    result.total_core_coverage
  );
  
  // Render propositions
  analyzer.renderPropositions(
    document.getElementById('propositions-container'),
    result.propositions
  );
}

function changeMode(mode) {
  if (window.coverageAnalyzer) {
    window.coverageAnalyzer.analyze(mode).then(result => {
      renderCoverageResults(window.coverageAnalyzer, result);
    });
  }
}
