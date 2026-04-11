/**
 * APCG Coverage Analysis - UI Integration
 * Integrates with existing Nanki UI patterns and design system
 */

(function() {
  'use strict';

  // State
  let currentNoteId = null;
  let currentMode = 'auto';
  let lastAnalysisResult = null;
  let analyzerInstance = null;

  /**
   * Initialize APCG coverage analyzer
   */
  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  /**
   * Setup event listeners and UI
   */
  function setup() {
    // Mode selector buttons
    document.querySelectorAll('.apcg-mode-btn').forEach(btn => {
      btn.addEventListener('click', handleModeChange);
    });

    // Run analysis button
    const runBtn = document.getElementById('run-apcg-analysis-btn');
    if (runBtn) {
      runBtn.addEventListener('click', runAnalysis);
    }

    // Tab switching
    document.querySelectorAll('.apcg-tab-btn').forEach(btn => {
      btn.addEventListener('click', handleTabChange);
    });

    // Listen for note changes
    window.addEventListener('note:loaded', handleNoteLoaded);
    window.addEventListener('note:updated', handleNoteUpdated);

    console.log('[APCG] Coverage analyzer initialized');
  }

  function handleNoteLoaded(event) {
    currentNoteId = event.detail?.noteId || window.currentNoteId;
    resetUI();
  }

  /**
   * Handle note updated event (cards added/removed)
   */
  function handleNoteUpdated(event) {
    // Re-run analysis if cards changed
    if (event.detail?.type === 'cards') {
      runAnalysis(currentMode);
    }
  }

  /**
   * Reset UI to initial state
   */
  function resetUI() {
    document.getElementById('apcg-summary-cards').style.display = 'none';
    document.getElementById('apcg-coverage-bar-container').style.display = 'none';
    document.getElementById('apcg-results-container').style.display = 'none';
    document.getElementById('apcg-loading').style.display = 'none';
    document.getElementById('apcg-empty-state').style.display = 'block';
    document.getElementById('apcg-detected-mode').style.display = 'none';
  }

  function handleNoteLoaded(event) {
    currentNoteId = event.detail?.noteId || window.currentNoteId;
    resetUI();
  }

  /**
   * Update mode hint text
   */
  function updateModeHint(mode) {
    const hints = {
      'auto': 'Auto-detects the best analysis mode for your content',
      'facts': 'Optimized for history, geography, events, and dates',
      'process': 'Optimized for biology, medicine, chemistry, and processes',
      'definition': 'Optimized for vocabulary, concepts, and definitions',
      'universal': 'Balanced analysis for mixed content types'
    };
    
    const hintEl = document.getElementById('apcg-mode-hint');
    if (hintEl) {
      hintEl.textContent = hints[mode] || hints['auto'];
    }
  }

  async function runAnalysis(mode = 'auto') {
    if (!currentNoteId) {
      showToast('Select a note first to analyze coverage', 'error');
      return;
    }

    showLoading(true);
    
    try {
      const includeAnki = document.getElementById('apcg-include-anki')?.checked ?? true;
      const url = `/api/notes/${currentNoteId}/coverage/apcg?mode=${mode}&include_anki_cards=${includeAnki}`;
      const response = await fetch(url, { method: 'POST' });
      
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }
      
      const result = await response.json();
      lastAnalysisResult = result;
      
      displayResults(result);
      updateDetectedModeBadge(result.detected_mode);
      
      showToast('Coverage analysis complete', 'success');
    } catch (error) {
      console.error('[APCG] Analysis error:', error);
      showToast(`Analysis failed: ${error.message}`, 'error');
      showEmptyState('Analysis failed. Please try again.');
    } finally {
      showLoading(false);
    }
  }

  /**
   * Display analysis results
   */
  function displayResults(result) {
    document.getElementById('apcg-empty-state').style.display = 'none';
    showSummaryCards(result);
    showCoverageBar(result);
    showPropositions(result);
  }

  /**
   * Show summary statistics cards
   */
  function showSummaryCards(result) {
    const covered = result.total_propositions - result.uncovered_count;
    
    document.getElementById('apcg-stat-propositions').textContent = result.total_propositions;
    document.getElementById('apcg-stat-covered').textContent = covered;
    document.getElementById('apcg-stat-uncovered').textContent = result.uncovered_count;
    document.getElementById('apcg-stat-conflicts').textContent = result.conflicts?.length || 0;
    
    document.getElementById('apcg-summary-cards').style.display = 'grid';
  }

  /**
   * Show coverage bar with level indicator
   */
  function showCoverageBar(result) {
    const corePercent = Math.round(result.total_core_coverage * 100);
    const exactPercent = Math.round(result.total_exact_coverage * 100);
    
    const barFill = document.getElementById('apcg-coverage-bar-fill');
    barFill.style.width = `${corePercent}%`;
    
    document.getElementById('apcg-coverage-percent').textContent = `${corePercent}%`;
    document.getElementById('apcg-exact-coverage-percent').textContent = `${exactPercent}%`;
    
    const levelEl = document.getElementById('apcg-coverage-level');
    const level = result.total_core_coverage > 0.6 ? 'high' : result.total_core_coverage > 0.3 ? 'medium' : 'low';
    levelEl.textContent = level.charAt(0).toUpperCase() + level.slice(1);
    levelEl.dataset.level = level;
    
    document.getElementById('apcg-coverage-bar-container').style.display = 'block';
  }

  /**
   * Show propositions in tabs
   */
  function showPropositions(result) {
    const allProps = result.propositions || [];
    const covered = allProps.filter(p => p.matched);
    const uncovered = allProps.filter(p => !p.matched);
    
    // Render all tab
    document.getElementById('apcg-tab-all').innerHTML = renderPropositionList(allProps);
    
    // Render covered tab
    document.getElementById('apcg-tab-covered').innerHTML = renderPropositionList(covered);
    
    // Render uncovered tab
    document.getElementById('apcg-tab-uncovered').innerHTML = renderUncoveredList(uncovered);
    
    // Show results container
    document.getElementById('apcg-results-container').style.display = 'block';
    
    // Also integrate with existing gaps section
    integrateWithExistingGaps(uncovered);
  }

  async function runAnalysis(mode = 'auto') {
    if (!currentNoteId) {
      showToast('No note selected', 'error');
      return;
    }

    showLoading(true);
    
    try {
      const includeAnkiEl = document.getElementById('apcg-include-anki');
      const includeAnki = includeAnkiEl ? includeAnkiEl.checked : true;
      const url = `/api/notes/${currentNoteId}/coverage/apcg?mode=${mode}&include_anki_cards=${includeAnki}`;
      const response = await fetch(url, { method: 'POST' });
      
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }
      
      const result = await response.json();
      lastAnalysisResult = result;
      
      displayResults(result);
      integrateWithExistingCoverage(result);
      
      showToast('Analysis complete', 'success');
    } catch (error) {
      console.error('[APCG] Analysis error:', error);
      showToast(`Analysis failed: ${error.message}`, 'error');
      showEmptyState('Analysis failed. Please try again.');
    } finally {
      showLoading(false);
    }
  }

  /**
   * Render individual proposition card
   */
  function renderPropositionCard(prop) {
    const coveragePercent = Math.round(prop.core_score * 100);
    const coverageClass = prop.core_score > 0.6 ? 'covered' : prop.core_score > 0.3 ? 'partial' : 'uncovered';
    const coverageColor = prop.core_score > 0.6 ? 'var(--success)' : prop.core_score > 0.3 ? 'var(--warning)' : 'var(--danger)';
    const typeIcon = getTypeIcon(prop.type);
    
    const tags = [];
    if (prop.front_back_match) {
      tags.push('<span class="apcg-prop-tag match">✓ Q&A Match</span>');
    }
    if (prop.uncovered_slots && prop.uncovered_slots.length > 0) {
      tags.push(`<span class="apcg-prop-tag missing">Missing: ${prop.uncovered_slots.slice(0, 3).join(', ')}</span>`);
    }
    
    return `
      <div class="apcg-proposition-card ${coverageClass}">
        <div class="apcg-prop-header">
          <span style="font-size: 16px;">${typeIcon}</span>
          <span class="apcg-prop-type">${prop.type}</span>
          <span class="apcg-prop-score" style="color: ${coverageColor}">${coveragePercent}%</span>
        </div>
        <p class="apcg-prop-text">${escapeHtml(prop.text)}</p>
        ${prop.matched_card_ids && prop.matched_card_ids.length > 0 ? `
          <div class="apcg-prop-meta">
            <strong>Matched:</strong> ${prop.matched_card_ids.slice(0, 3).join(', ')}${prop.matched_card_ids.length > 3 ? '...' : ''}
          </div>
        ` : ''}
        ${tags.length > 0 ? `<div class="apcg-prop-tags">${tags.join('')}</div>` : ''}
        <div class="apcg-coverage-bar-mini">
          <div class="apcg-coverage-bar-mini-fill" style="width: ${coveragePercent}%; background: ${coverageColor}"></div>
        </div>
        ${!prop.matched ? `
          <button class="apcg-suggest-btn" onclick="suggestCardForProposition('${prop.id}', '${escapeHtml(prop.text).replace(/'/g, "\\'")}')">
            + Suggest card for this topic
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render uncovered propositions list
   */
  function renderUncoveredList(uncovered) {
    if (!uncovered || uncovered.length === 0) {
      return `
        <div style="text-align: center; padding: 40px; color: var(--success);">
          <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
          <p style="font-size: 16px; font-weight: 600;">All topics covered!</p>
          <p style="font-size: 13px; color: var(--muted); margin-top: 8px;">No gaps detected in your flashcards</p>
        </div>
      `;
    }
    
    return `
      <div class="apcg-uncovered-list" style="display: flex; flex-direction: column; gap: 8px;">
        ${uncovered.map(u => `
          <div class="apcg-uncovered-item">
            <div class="apcg-uncovered-item-header">
              <span style="font-size: 16px;">❌</span>
              <span class="apcg-prop-type">${u.type}</span>
            </div>
            <p class="apcg-uncovered-item-text">${escapeHtml(u.text)}</p>
            <button class="apcg-suggest-btn" onclick="suggestCardForProposition('${u.id}', '${escapeHtml(u.text).replace(/'/g, "\\'")}')">
              + Suggest card for this topic
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Get icon for proposition type
   */
  function getTypeIcon(type) {
    const icons = {
      'facts': '📜',
      'process': '🔬',
      'definition': '📖',
      'general': '📝',
    };
    return icons[type] || '📝';
  }

  /**
   * Update detected mode badge
   */
  function updateDetectedModeBadge(detectedMode) {
    const badge = document.getElementById('apcg-detected-mode');
    if (!badge) return;
    
    const modeNames = {
      'facts': '📜 Facts',
      'process': '🔬 Process',
      'definition': '📖 Definition',
      'universal': '🌐 Universal',
    };
    
    badge.textContent = modeNames[detectedMode] || '🤖 Auto';
    badge.style.display = 'inline-block';
  }

  /**
   * Handle tab change
   */
  function handleTabChange(event) {
    const btn = event.currentTarget;
    const tabName = btn.dataset.tab;
    
    document.querySelectorAll('.apcg-tab-btn').forEach(b => {
      b.classList.remove('active');
    });
    btn.classList.add('active');
    
    document.querySelectorAll('.apcg-tab-content').forEach(content => {
      content.style.display = 'none';
    });
    document.getElementById(`apcg-tab-${tabName}`).style.display = 'block';
  }

  /**
   * Show/hide loading state
   */
  function showLoading(isLoading) {
    document.getElementById('apcg-loading').style.display = isLoading ? 'block' : 'none';
    document.getElementById('run-apcg-analysis-btn').disabled = isLoading;
    
    if (isLoading) {
      document.getElementById('apcg-summary-cards').style.display = 'none';
      document.getElementById('apcg-coverage-bar-container').style.display = 'none';
      document.getElementById('apcg-results-container').style.display = 'none';
    }
  }

  /**
   * Show empty state with message
   */
  function showEmptyState(message) {
    document.getElementById('apcg-empty-state').style.display = 'block';
    document.getElementById('apcg-empty-state').innerHTML = `
      <p style="font-size: 14px; margin-bottom: 8px;">${message}</p>
      <p style="font-size: 12px;">Click "Run APCG Analysis" to try again</p>
    `;
  }

  function integrateWithExistingCoverage(result) {
    const coveragePercent = document.getElementById('coverage-percent');
    const coverageBarFill = document.getElementById('coverage-bar-fill');
    const coverageStatPills = document.getElementById('coverage-stat-pills');
    const coverageSummaryText = document.getElementById('coverage-summary-text');
    
    const corePercent = Math.round(result.total_core_coverage * 100);
    const covered = result.total_propositions - result.uncovered_count;
    
    if (coveragePercent) coveragePercent.textContent = `${corePercent}%`;
    if (coverageBarFill) coverageBarFill.style.width = `${corePercent}%`;
    
    if (coverageStatPills) {
      coverageStatPills.innerHTML = [
        `<span class="pill">✓ ${covered} covered</span>`,
        `<span class="pill danger">✗ ${result.uncovered_count} gaps</span>`,
        result.conflicts?.length ? `<span class="pill warning">⚠ ${result.conflicts.length} conflicts</span>` : ''
      ].filter(Boolean).join('');
    }
    
    if (coverageSummaryText) {
      coverageSummaryText.textContent = `${result.total_propositions} propositions`;
    }
  }

  /**
   * Show toast notification
   */
  function showToast(message, type = 'info') {
    // Use existing toast if available
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.className = `toast ${type}`;
      toast.classList.remove('hidden');
      
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 3000);
    } else {
      console.log(`[Toast] ${type}: ${message}`);
    }
  }

  /**
   * Escape HTML for safe rendering
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Global function for card suggestion
  window.suggestCardForProposition = function(propositionId, propositionText) {
    // TODO: Integrate with AI suggest endpoint
    showToast(`Would suggest card for: ${propositionText.substring(0, 40)}...`, 'info');
    console.log('[APCG] Suggest card for proposition:', propositionId, propositionText);
    
    // Future: Call /api/ai/suggest-cards-for-gaps with proposition context
  };

  // Initialize
  init();

  // Export for external use
  window.APCGAnalyzer = {
    runAnalysis,
    setMode: (mode) => {
      currentMode = mode;
      document.querySelectorAll('.apcg-mode-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === mode);
      });
    },
    getResult: () => lastAnalysisResult,
  };

})();
