(() => {
  const UI_PREFS_KEY = 'nanki-ui-prefs-v2';
  const DEFAULT_AI_SETTINGS = {
    enabled: false,
    provider: 'ollama_local',
    ollama_local_url: 'http://127.0.0.1:11434',
    ollama_cloud_url: 'https://ollama.com',
    openrouter_url: 'https://openrouter.ai/api/v1',
    ollama_cloud_api_key: '',
    openrouter_api_key: '',
    default_model: '',
    chat_model: '',
    explain_model: '',
    flashcard_model: '',
    auto_flashcard_model: '',
    use_anki_coverage_context: true,
    chat_note_only: false,
    explain_note_only: false,
    auto_detect_ollama_models: true,
    prompts: {
      chat: '',
      explain: '',
      flashcards: '',
      auto_flashcards: '',
    },
  };

  const DEFAULT_PREFS = {
    quickCardCollapsed: false,
    aiTab: 'chat',
    cardCount: 8,
  };

  const uiState = {
    prefs: loadPrefs(),
    modelOptions: [],
    connectionInfo: null,
    chatMessages: [],
    explainOutput: '',
    generatedCards: [],
    currentTab: 'chat',
    modalOpen: false,
    isRefreshingModels: false,
  };

  const aiEls = {};

  const STRINGS = {
    en: {
      'ai.topbar': 'AI',
      'ai.selectionExplain': 'Explain',
      'ai.selectionChat': 'AI chat',
      'ai.selectionCards': 'AI cards',
      'ai.settingsTitle': 'AI features',
      'ai.settingsSubtitle': 'Optional AI via Ollama or OpenRouter. Buttons stay hidden until AI is enabled.',
      'ai.enable': 'Enable AI features',
      'ai.provider': 'Provider',
      'ai.provider.ollamaLocal': 'Ollama (local)',
      'ai.provider.ollamaCloud': 'Ollama (cloud API)',
      'ai.provider.openrouter': 'OpenRouter',
      'ai.autoDetect': 'Automatically detect installed Ollama models when using the local preset',
      'ai.ollamaLocalUrl': 'Local Ollama URL',
      'ai.ollamaCloudUrl': 'Ollama Cloud URL',
      'ai.ollamaCloudKey': 'Ollama Cloud API key',
      'ai.openrouterUrl': 'OpenRouter API URL',
      'ai.openrouterKey': 'OpenRouter API key',
      'ai.defaultModel': 'Default model',
      'ai.chatModel': 'Chat model',
      'ai.explainModel': 'Explain model',
      'ai.flashcardModel': 'Flashcard model',
      'ai.autoFlashcardModel': 'Auto-card model',
      'ai.noteOnlyChat': 'Chat should only use the user\'s own text',
      'ai.noteOnlyExplain': 'Explain should only use the user\'s own text',
      'ai.useAnkiCoverage': 'Use semantic coverage context from all scanned Anki cards for card generation',
      'ai.availableModels': 'Available models',
      'ai.noneLoaded': 'No models loaded yet.',
      'ai.testConnection': 'Test AI connection',
      'ai.refreshModels': 'Refresh models',
      'ai.connectionOk': 'AI connection successful',
      'ai.connectionFailed': 'AI connection failed',
      'ai.modelCount': '{count} model(s)',
      'ai.providerBadge': 'Provider: {provider}',
      'ai.chatPrompt': 'Base prompt · chat',
      'ai.explainPrompt': 'Base prompt · explain',
      'ai.flashcardsPrompt': 'Base prompt · flashcards',
      'ai.autoFlashcardsPrompt': 'Base prompt · auto flashcards',
      'ai.modalTitle': 'AI workspace',
      'ai.modalSubtitle': 'Chat, explain, and card generation for the current note.',
      'ai.chatTab': 'Chat',
      'ai.explainTab': 'Explain',
      'ai.cardsTab': 'Cards',
      'ai.chatContext': 'Context text',
      'ai.chatMessage': 'Message',
      'ai.chatMessagePlaceholder': 'Ask about your note…',
      'ai.chatUseSelection': 'Insert selection',
      'ai.chatUseNote': 'Insert full note',
      'ai.chatClear': 'Clear chat',
      'ai.chatSend': 'Send',
      'ai.explainText': 'Text to explain',
      'ai.explainQuestion': 'Optional instruction',
      'ai.explainQuestionPlaceholder': 'Explain simply, compare, summarize…',
      'ai.explainUseSelection': 'Use selection',
      'ai.explainUseNote': 'Use full note',
      'ai.explainRun': 'Explain now',
      'ai.cardsText': 'Source text',
      'ai.cardsCount': 'Target card count',
      'ai.cardsUseSelection': 'Use selection',
      'ai.cardsUseNote': 'Use full note',
      'ai.cardsGenerate': 'Generate cards',
      'ai.cardsAuto': 'Auto-create from whole note',
      'ai.cardsSaveAll': 'Save all cards',
      'ai.cardsNoDrafts': 'No AI card drafts yet.',
      'ai.cardsMeta': 'Scanned {anki} Anki card(s), shared {relevant} relevant semantic match(es).',
      'ai.cardsSaved': 'Saved {count} AI card(s).',
      'ai.cardsGenerated': 'AI generated {count} card draft(s).',
      'ai.contextEmpty': 'No selection yet.',
      'ai.modelLabel': 'Model {model}',
      'ai.strictTextOnly': 'Strict text-only mode',
      'ai.noText': 'Add some text first.',
      'ai.aiDisabled': 'Enable AI features in settings first.',
      'ai.fastCardCollapse': 'Collapse',
      'ai.fastCardExpand': 'Expand',
      'ai.fastCardSource': 'Source context',
      'ai.role.user': 'You',
      'ai.role.assistant': 'AI',
      'ai.errorNoNote': 'Open or create a note first.',
      'ai.errorNoSelection': 'Select some text first.',
    },
    de: {
      'ai.topbar': 'KI',
      'ai.selectionExplain': 'Erklären',
      'ai.selectionChat': 'KI-Chat',
      'ai.selectionCards': 'KI-Karten',
      'ai.settingsTitle': 'KI-Funktionen',
      'ai.settingsSubtitle': 'Optionale KI über Ollama oder OpenRouter. Buttons bleiben verborgen, bis KI aktiviert ist.',
      'ai.enable': 'KI-Funktionen aktivieren',
      'ai.provider': 'Anbieter',
      'ai.provider.ollamaLocal': 'Ollama (lokal)',
      'ai.provider.ollamaCloud': 'Ollama (Cloud-API)',
      'ai.provider.openrouter': 'OpenRouter',
      'ai.autoDetect': 'Installierte Ollama-Modelle beim lokalen Preset automatisch erkennen',
      'ai.ollamaLocalUrl': 'Lokale Ollama-URL',
      'ai.ollamaCloudUrl': 'Ollama-Cloud-URL',
      'ai.ollamaCloudKey': 'Ollama-Cloud-API-Key',
      'ai.openrouterUrl': 'OpenRouter-API-URL',
      'ai.openrouterKey': 'OpenRouter-API-Key',
      'ai.defaultModel': 'Standardmodell',
      'ai.chatModel': 'Chat-Modell',
      'ai.explainModel': 'Explain-Modell',
      'ai.flashcardModel': 'Karteikarten-Modell',
      'ai.autoFlashcardModel': 'Auto-Karten-Modell',
      'ai.noteOnlyChat': 'Chat soll nur mit dem eigenen Text arbeiten',
      'ai.noteOnlyExplain': 'Explain soll nur mit dem eigenen Text arbeiten',
      'ai.useAnkiCoverage': 'Semantischen Coverage-Kontext aus allen gescannten Anki-Karten für die Kartenerstellung verwenden',
      'ai.availableModels': 'Verfügbare Modelle',
      'ai.noneLoaded': 'Noch keine Modelle geladen.',
      'ai.testConnection': 'KI-Verbindung testen',
      'ai.refreshModels': 'Modelle aktualisieren',
      'ai.connectionOk': 'KI-Verbindung erfolgreich',
      'ai.connectionFailed': 'KI-Verbindung fehlgeschlagen',
      'ai.modelCount': '{count} Modell(e)',
      'ai.providerBadge': 'Anbieter: {provider}',
      'ai.chatPrompt': 'Basis-Prompt · Chat',
      'ai.explainPrompt': 'Basis-Prompt · Explain',
      'ai.flashcardsPrompt': 'Basis-Prompt · Karteikarten',
      'ai.autoFlashcardsPrompt': 'Basis-Prompt · Auto-Karteikarten',
      'ai.modalTitle': 'KI-Arbeitsbereich',
      'ai.modalSubtitle': 'Chat, Erklären und Kartenerstellung für die aktuelle Notiz.',
      'ai.chatTab': 'Chat',
      'ai.explainTab': 'Explain',
      'ai.cardsTab': 'Karten',
      'ai.chatContext': 'Kontexttext',
      'ai.chatMessage': 'Nachricht',
      'ai.chatMessagePlaceholder': 'Frage etwas zu deiner Notiz…',
      'ai.chatUseSelection': 'Auswahl einfügen',
      'ai.chatUseNote': 'Ganze Notiz einfügen',
      'ai.chatClear': 'Chat leeren',
      'ai.chatSend': 'Senden',
      'ai.explainText': 'Zu erklärender Text',
      'ai.explainQuestion': 'Optionale Anweisung',
      'ai.explainQuestionPlaceholder': 'Einfach erklären, vergleichen, zusammenfassen…',
      'ai.explainUseSelection': 'Auswahl verwenden',
      'ai.explainUseNote': 'Ganze Notiz verwenden',
      'ai.explainRun': 'Jetzt erklären',
      'ai.cardsText': 'Quelltext',
      'ai.cardsCount': 'Zielanzahl Karten',
      'ai.cardsUseSelection': 'Auswahl verwenden',
      'ai.cardsUseNote': 'Ganze Notiz verwenden',
      'ai.cardsGenerate': 'Karten generieren',
      'ai.cardsAuto': 'Automatisch aus ganzer Notiz',
      'ai.cardsSaveAll': 'Alle Karten speichern',
      'ai.cardsNoDrafts': 'Noch keine KI-Kartenvorschläge vorhanden.',
      'ai.cardsMeta': '{anki} Anki-Karte(n) gescannt, {relevant} relevante semantische Treffer geteilt.',
      'ai.cardsSaved': '{count} KI-Karte(n) gespeichert.',
      'ai.cardsGenerated': 'KI hat {count} Kartenvorschlag/Vorschläge erstellt.',
      'ai.contextEmpty': 'Noch keine Auswahl vorhanden.',
      'ai.modelLabel': 'Modell {model}',
      'ai.strictTextOnly': 'Strenger Nur-Text-Modus',
      'ai.noText': 'Bitte zuerst Text einfügen.',
      'ai.aiDisabled': 'Bitte zuerst KI in den Einstellungen aktivieren.',
      'ai.fastCardCollapse': 'Einklappen',
      'ai.fastCardExpand': 'Ausklappen',
      'ai.fastCardSource': 'Quellkontext',
      'ai.role.user': 'Du',
      'ai.role.assistant': 'KI',
      'ai.errorNoNote': 'Bitte zuerst eine Notiz öffnen oder erstellen.',
      'ai.errorNoSelection': 'Bitte zuerst Text markieren.',
    },
  };

  function getApi() {
    return window.Nanki;
  }

  function currentLanguage() {
    return getApi()?.state?.settings?.language || 'en';
  }

  function interpolate(template, values = {}) {
    return String(template).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`);
  }

  function lt(key, values = {}) {
    const lang = currentLanguage();
    return interpolate(STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key, values);
  }

  function loadPrefs() {
    try {
      return { ...DEFAULT_PREFS, ...(JSON.parse(window.localStorage.getItem(UI_PREFS_KEY) || '{}') || {}) };
    } catch {
      return { ...DEFAULT_PREFS };
    }
  }

  function savePrefs() {
    try {
      window.localStorage.setItem(UI_PREFS_KEY, JSON.stringify(uiState.prefs));
    } catch {
      // ignore localStorage failures
    }
  }

  function ensureAiSettings() {
    const api = getApi();
    if (!api?.state) return { ...DEFAULT_AI_SETTINGS };
    if (!api.state.settings) api.state.settings = {};
    if (!api.state.settings.ai) api.state.settings.ai = structuredClone(DEFAULT_AI_SETTINGS);
    api.state.settings.ai.prompts = {
      ...DEFAULT_AI_SETTINGS.prompts,
      ...(api.state.settings.ai.prompts || {}),
    };
    return api.state.settings.ai;
  }

  function structuredClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function insertUiShell() {
    const settingsGrid = document.querySelector('#settings-modal .settings-grid');
    if (settingsGrid && !document.getElementById('ai-settings-section')) {
      settingsGrid.insertAdjacentHTML('beforeend', `
        <section id="ai-settings-section" class="card-surface nested-card">
          <div class="panel-head inline-bottom-gap">
            <div>
              <h4 data-ai-i18n="ai.settingsTitle"></h4>
              <p class="muted" data-ai-i18n="ai.settingsSubtitle"></p>
            </div>
          </div>
          <div class="settings-form-grid">
            <label class="checkbox-row wide">
              <input id="ai-enabled" type="checkbox" />
              <span data-ai-i18n="ai.enable"></span>
            </label>
            <label>
              <span data-ai-i18n="ai.provider"></span>
              <select id="ai-provider">
                <option value="ollama_local" data-ai-i18n="ai.provider.ollamaLocal"></option>
                <option value="ollama_cloud" data-ai-i18n="ai.provider.ollamaCloud"></option>
                <option value="openrouter" data-ai-i18n="ai.provider.openrouter"></option>
              </select>
            </label>
            <label class="checkbox-row wide">
              <input id="ai-ollama-auto-detect" type="checkbox" />
              <span data-ai-i18n="ai.autoDetect"></span>
            </label>
            <label id="ai-ollama-local-url-group" class="wide">
              <span data-ai-i18n="ai.ollamaLocalUrl"></span>
              <input id="ai-ollama-local-url" type="text" />
            </label>
            <label id="ai-ollama-cloud-url-group" class="wide hidden">
              <span data-ai-i18n="ai.ollamaCloudUrl"></span>
              <input id="ai-ollama-cloud-url" type="text" />
            </label>
            <label id="ai-ollama-cloud-key-group" class="wide hidden">
              <span data-ai-i18n="ai.ollamaCloudKey"></span>
              <input id="ai-ollama-cloud-key" type="password" autocomplete="off" />
            </label>
            <label id="ai-openrouter-url-group" class="wide hidden">
              <span data-ai-i18n="ai.openrouterUrl"></span>
              <input id="ai-openrouter-url" type="text" />
            </label>
            <label id="ai-openrouter-key-group" class="wide hidden">
              <span data-ai-i18n="ai.openrouterKey"></span>
              <input id="ai-openrouter-key" type="password" autocomplete="off" />
            </label>
            <label class="wide">
              <span data-ai-i18n="ai.defaultModel"></span>
              <input id="ai-default-model" type="text" list="ai-model-options" />
            </label>
            <label>
              <span data-ai-i18n="ai.chatModel"></span>
              <input id="ai-chat-model" type="text" list="ai-model-options" />
            </label>
            <label>
              <span data-ai-i18n="ai.explainModel"></span>
              <input id="ai-explain-model" type="text" list="ai-model-options" />
            </label>
            <label>
              <span data-ai-i18n="ai.flashcardModel"></span>
              <input id="ai-flashcard-model" type="text" list="ai-model-options" />
            </label>
            <label>
              <span data-ai-i18n="ai.autoFlashcardModel"></span>
              <input id="ai-auto-flashcard-model" type="text" list="ai-model-options" />
            </label>
            <label class="checkbox-row wide">
              <input id="ai-chat-note-only" type="checkbox" />
              <span data-ai-i18n="ai.noteOnlyChat"></span>
            </label>
            <label class="checkbox-row wide">
              <input id="ai-explain-note-only" type="checkbox" />
              <span data-ai-i18n="ai.noteOnlyExplain"></span>
            </label>
            <label class="checkbox-row wide">
              <input id="ai-use-anki-coverage" type="checkbox" />
              <span data-ai-i18n="ai.useAnkiCoverage"></span>
            </label>
            <label class="wide">
              <span data-ai-i18n="ai.chatPrompt"></span>
              <textarea id="ai-chat-prompt" rows="5"></textarea>
            </label>
            <label class="wide">
              <span data-ai-i18n="ai.explainPrompt"></span>
              <textarea id="ai-explain-prompt" rows="5"></textarea>
            </label>
            <label class="wide">
              <span data-ai-i18n="ai.flashcardsPrompt"></span>
              <textarea id="ai-flashcards-prompt" rows="6"></textarea>
            </label>
            <label class="wide">
              <span data-ai-i18n="ai.autoFlashcardsPrompt"></span>
              <textarea id="ai-auto-flashcards-prompt" rows="6"></textarea>
            </label>
          </div>
          <div class="toolbar-group wrap compact-top-gap">
            <button id="ai-test-btn" type="button" data-ai-i18n="ai.testConnection"></button>
            <button id="ai-refresh-btn" type="button" data-ai-i18n="ai.refreshModels"></button>
          </div>
          <div class="settings-status-card compact-top-gap">
            <div id="ai-status-text" class="settings-status-text muted"></div>
            <div id="ai-status-meta" class="settings-status-meta"></div>
          </div>
          <div class="compact-top-gap">
            <div class="section-label" data-ai-i18n="ai.availableModels"></div>
            <div id="ai-model-list" class="settings-chip-list"></div>
          </div>
          <datalist id="ai-model-options"></datalist>
        </section>
      `);
    }

    const topbarActions = document.querySelector('.header-actions');
    if (topbarActions && !document.getElementById('open-ai-btn')) {
      const button = document.createElement('button');
      button.id = 'open-ai-btn';
      button.type = 'button';
      button.className = 'ghost hidden';
      button.setAttribute('data-ai-i18n', 'ai.topbar');
      topbarActions.insertBefore(button, document.getElementById('open-settings-btn'));
    }

    const selectionBubble = document.getElementById('selection-bubble');
    if (selectionBubble && !document.getElementById('bubble-ai-chat-btn')) {
      selectionBubble.insertAdjacentHTML('beforeend', `
        <button id="bubble-ai-chat-btn" class="hidden" type="button" data-ai-i18n="ai.selectionChat"></button>
        <button id="bubble-ai-explain-btn" class="hidden" type="button" data-ai-i18n="ai.selectionExplain"></button>
        <button id="bubble-ai-cards-btn" class="hidden" type="button" data-ai-i18n="ai.selectionCards"></button>
      `);
    }

    if (!document.getElementById('ai-modal')) {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="ai-modal" class="overlay hidden">
          <div class="overlay-backdrop" data-close-ai="true"></div>
          <div class="modal-panel ai-modal-panel">
            <div class="drawer-header">
              <div>
                <h3 data-ai-i18n="ai.modalTitle"></h3>
                <p class="muted" data-ai-i18n="ai.modalSubtitle"></p>
              </div>
              <button id="ai-close-btn" class="ghost" type="button">×</button>
            </div>
            <div class="ai-meta-row">
              <span id="ai-context-pill" class="pill subtle"></span>
              <span id="ai-provider-pill" class="pill"></span>
            </div>
            <div class="inspector-tabs ai-tabs">
              <button class="ai-tab active" type="button" data-ai-tab="chat" data-ai-i18n="ai.chatTab"></button>
              <button class="ai-tab" type="button" data-ai-tab="explain" data-ai-i18n="ai.explainTab"></button>
              <button class="ai-tab" type="button" data-ai-tab="cards" data-ai-i18n="ai.cardsTab"></button>
            </div>
            <section id="ai-tab-chat" class="ai-tab-panel active">
              <div id="ai-chat-log" class="ai-chat-log"></div>
              <div class="toolbar-group wrap compact-top-gap">
                <button id="ai-chat-use-selection-btn" type="button" data-ai-i18n="ai.chatUseSelection"></button>
                <button id="ai-chat-use-note-btn" type="button" data-ai-i18n="ai.chatUseNote"></button>
                <button id="ai-chat-clear-btn" type="button" data-ai-i18n="ai.chatClear"></button>
              </div>
              <label class="wide compact-top-gap">
                <span data-ai-i18n="ai.chatContext"></span>
                <textarea id="ai-chat-context" rows="5"></textarea>
              </label>
              <label class="wide compact-top-gap">
                <span data-ai-i18n="ai.chatMessage"></span>
                <textarea id="ai-chat-input" rows="3" data-ai-i18n-placeholder="ai.chatMessagePlaceholder"></textarea>
              </label>
              <div class="toolbar-group right compact-top-gap">
                <button id="ai-chat-send-btn" class="primary" type="button" data-ai-i18n="ai.chatSend"></button>
              </div>
            </section>
            <section id="ai-tab-explain" class="ai-tab-panel hidden">
              <div class="toolbar-group wrap compact-top-gap">
                <button id="ai-explain-use-selection-btn" type="button" data-ai-i18n="ai.explainUseSelection"></button>
                <button id="ai-explain-use-note-btn" type="button" data-ai-i18n="ai.explainUseNote"></button>
              </div>
              <label class="wide compact-top-gap">
                <span data-ai-i18n="ai.explainText"></span>
                <textarea id="ai-explain-text" rows="8"></textarea>
              </label>
              <label class="wide compact-top-gap">
                <span data-ai-i18n="ai.explainQuestion"></span>
                <input id="ai-explain-question" type="text" data-ai-i18n-placeholder="ai.explainQuestionPlaceholder" />
              </label>
              <div class="toolbar-group right compact-top-gap">
                <button id="ai-explain-run-btn" class="primary" type="button" data-ai-i18n="ai.explainRun"></button>
              </div>
              <div id="ai-explain-output" class="ai-output-box compact-top-gap muted"></div>
            </section>
            <section id="ai-tab-cards" class="ai-tab-panel hidden">
              <div class="toolbar-group wrap compact-top-gap">
                <button id="ai-cards-use-selection-btn" type="button" data-ai-i18n="ai.cardsUseSelection"></button>
                <button id="ai-cards-use-note-btn" type="button" data-ai-i18n="ai.cardsUseNote"></button>
              </div>
              <div class="settings-form-grid compact-top-gap">
                <label class="wide">
                  <span data-ai-i18n="ai.cardsText"></span>
                  <textarea id="ai-cards-text" rows="10"></textarea>
                </label>
                <label>
                  <span data-ai-i18n="ai.cardsCount"></span>
                  <input id="ai-cards-count" type="number" min="1" max="24" value="8" />
                </label>
              </div>
              <div class="toolbar-group wrap compact-top-gap">
                <button id="ai-cards-generate-btn" class="primary" type="button" data-ai-i18n="ai.cardsGenerate"></button>
                <button id="ai-cards-auto-btn" type="button" data-ai-i18n="ai.cardsAuto"></button>
                <button id="ai-cards-save-all-btn" class="hidden" type="button" data-ai-i18n="ai.cardsSaveAll"></button>
              </div>
              <div id="ai-cards-meta" class="muted compact-top-gap"></div>
              <div id="ai-generated-card-list" class="ai-generated-card-list"></div>
            </section>
          </div>
        </div>
      `);
    }

    const dockHeadActions = document.querySelector('#quick-card-dock .quick-card-head-actions');
    if (dockHeadActions && !document.getElementById('quick-card-collapse-btn')) {
      const collapseBtn = document.createElement('button');
      collapseBtn.id = 'quick-card-collapse-btn';
      collapseBtn.type = 'button';
      collapseBtn.className = 'ghost';
      dockHeadActions.insertBefore(collapseBtn, dockHeadActions.firstChild);
    }

    const quickCardGrid = document.querySelector('#quick-card-dock .quick-card-grid');
    if (quickCardGrid && !document.getElementById('quick-card-source-preview')) {
      quickCardGrid.insertAdjacentHTML('afterend', `
        <div id="quick-card-source-preview" class="quick-card-source-preview hidden">
          <div class="section-label" data-ai-i18n="ai.fastCardSource"></div>
          <div id="quick-card-source-preview-text" class="muted"></div>
        </div>
      `);
    }
  }

  function mapElements() {
    Object.assign(aiEls, {
      openAiBtn: document.getElementById('open-ai-btn'),
      bubbleAiChatBtn: document.getElementById('bubble-ai-chat-btn'),
      bubbleAiExplainBtn: document.getElementById('bubble-ai-explain-btn'),
      bubbleAiCardsBtn: document.getElementById('bubble-ai-cards-btn'),
      aiSettingsSection: document.getElementById('ai-settings-section'),
      aiEnabled: document.getElementById('ai-enabled'),
      aiProvider: document.getElementById('ai-provider'),
      aiOllamaAutoDetect: document.getElementById('ai-ollama-auto-detect'),
      aiOllamaLocalUrlGroup: document.getElementById('ai-ollama-local-url-group'),
      aiOllamaCloudUrlGroup: document.getElementById('ai-ollama-cloud-url-group'),
      aiOllamaCloudKeyGroup: document.getElementById('ai-ollama-cloud-key-group'),
      aiOpenrouterUrlGroup: document.getElementById('ai-openrouter-url-group'),
      aiOpenrouterKeyGroup: document.getElementById('ai-openrouter-key-group'),
      aiOllamaLocalUrl: document.getElementById('ai-ollama-local-url'),
      aiOllamaCloudUrl: document.getElementById('ai-ollama-cloud-url'),
      aiOllamaCloudKey: document.getElementById('ai-ollama-cloud-key'),
      aiOpenrouterUrl: document.getElementById('ai-openrouter-url'),
      aiOpenrouterKey: document.getElementById('ai-openrouter-key'),
      aiDefaultModel: document.getElementById('ai-default-model'),
      aiChatModel: document.getElementById('ai-chat-model'),
      aiExplainModel: document.getElementById('ai-explain-model'),
      aiFlashcardModel: document.getElementById('ai-flashcard-model'),
      aiAutoFlashcardModel: document.getElementById('ai-auto-flashcard-model'),
      aiChatNoteOnly: document.getElementById('ai-chat-note-only'),
      aiExplainNoteOnly: document.getElementById('ai-explain-note-only'),
      aiUseAnkiCoverage: document.getElementById('ai-use-anki-coverage'),
      aiChatPrompt: document.getElementById('ai-chat-prompt'),
      aiExplainPrompt: document.getElementById('ai-explain-prompt'),
      aiFlashcardsPrompt: document.getElementById('ai-flashcards-prompt'),
      aiAutoFlashcardsPrompt: document.getElementById('ai-auto-flashcards-prompt'),
      aiTestBtn: document.getElementById('ai-test-btn'),
      aiRefreshBtn: document.getElementById('ai-refresh-btn'),
      aiStatusText: document.getElementById('ai-status-text'),
      aiStatusMeta: document.getElementById('ai-status-meta'),
      aiModelList: document.getElementById('ai-model-list'),
      aiModelOptions: document.getElementById('ai-model-options'),
      aiModal: document.getElementById('ai-modal'),
      aiCloseBtn: document.getElementById('ai-close-btn'),
      aiContextPill: document.getElementById('ai-context-pill'),
      aiProviderPill: document.getElementById('ai-provider-pill'),
      aiTabs: Array.from(document.querySelectorAll('.ai-tab')),
      aiTabPanels: Array.from(document.querySelectorAll('.ai-tab-panel')),
      aiChatLog: document.getElementById('ai-chat-log'),
      aiChatUseSelectionBtn: document.getElementById('ai-chat-use-selection-btn'),
      aiChatUseNoteBtn: document.getElementById('ai-chat-use-note-btn'),
      aiChatClearBtn: document.getElementById('ai-chat-clear-btn'),
      aiChatContext: document.getElementById('ai-chat-context'),
      aiChatInput: document.getElementById('ai-chat-input'),
      aiChatSendBtn: document.getElementById('ai-chat-send-btn'),
      aiExplainUseSelectionBtn: document.getElementById('ai-explain-use-selection-btn'),
      aiExplainUseNoteBtn: document.getElementById('ai-explain-use-note-btn'),
      aiExplainText: document.getElementById('ai-explain-text'),
      aiExplainQuestion: document.getElementById('ai-explain-question'),
      aiExplainRunBtn: document.getElementById('ai-explain-run-btn'),
      aiExplainOutput: document.getElementById('ai-explain-output'),
      aiCardsUseSelectionBtn: document.getElementById('ai-cards-use-selection-btn'),
      aiCardsUseNoteBtn: document.getElementById('ai-cards-use-note-btn'),
      aiCardsText: document.getElementById('ai-cards-text'),
      aiCardsCount: document.getElementById('ai-cards-count'),
      aiCardsGenerateBtn: document.getElementById('ai-cards-generate-btn'),
      aiCardsAutoBtn: document.getElementById('ai-cards-auto-btn'),
      aiCardsSaveAllBtn: document.getElementById('ai-cards-save-all-btn'),
      aiCardsMeta: document.getElementById('ai-cards-meta'),
      aiGeneratedCardList: document.getElementById('ai-generated-card-list'),
      quickCardCollapseBtn: document.getElementById('quick-card-collapse-btn'),
      quickCardSourcePreview: document.getElementById('quick-card-source-preview'),
      quickCardSourcePreviewText: document.getElementById('quick-card-source-preview-text'),
    });
  }

  function applyTranslations() {
    document.querySelectorAll('[data-ai-i18n]').forEach((node) => {
      node.textContent = lt(node.getAttribute('data-ai-i18n'));
    });
    document.querySelectorAll('[data-ai-i18n-placeholder]').forEach((node) => {
      node.setAttribute('placeholder', lt(node.getAttribute('data-ai-i18n-placeholder')));
    });
    renderQuickCardEnhancements();
    renderChatLog();
    renderAiSettingsStatus();
    renderGeneratedCards();
    renderAiContextPills();
  }

  function renderAiVisibility() {
    const ai = ensureAiSettings();
    const enabled = Boolean(ai.enabled);
    aiEls.openAiBtn?.classList.toggle('hidden', !enabled);
    aiEls.bubbleAiChatBtn?.classList.toggle('hidden', !enabled);
    aiEls.bubbleAiExplainBtn?.classList.toggle('hidden', !enabled);
    aiEls.bubbleAiCardsBtn?.classList.toggle('hidden', !enabled);
    if (!enabled && uiState.modalOpen) closeAiModal();
  }

  function renderAiSettingsFromState() {
    const ai = ensureAiSettings();
    if (!aiEls.aiEnabled) return;
    aiEls.aiEnabled.checked = Boolean(ai.enabled);
    aiEls.aiProvider.value = ai.provider || 'ollama_local';
    aiEls.aiOllamaAutoDetect.checked = Boolean(ai.auto_detect_ollama_models);
    aiEls.aiOllamaLocalUrl.value = ai.ollama_local_url || '';
    aiEls.aiOllamaCloudUrl.value = ai.ollama_cloud_url || '';
    aiEls.aiOllamaCloudKey.value = ai.ollama_cloud_api_key || '';
    aiEls.aiOpenrouterUrl.value = ai.openrouter_url || '';
    aiEls.aiOpenrouterKey.value = ai.openrouter_api_key || '';
    aiEls.aiDefaultModel.value = ai.default_model || '';
    aiEls.aiChatModel.value = ai.chat_model || '';
    aiEls.aiExplainModel.value = ai.explain_model || '';
    aiEls.aiFlashcardModel.value = ai.flashcard_model || '';
    aiEls.aiAutoFlashcardModel.value = ai.auto_flashcard_model || '';
    aiEls.aiChatNoteOnly.checked = Boolean(ai.chat_note_only);
    aiEls.aiExplainNoteOnly.checked = Boolean(ai.explain_note_only);
    aiEls.aiUseAnkiCoverage.checked = Boolean(ai.use_anki_coverage_context);
    aiEls.aiChatPrompt.value = ai.prompts?.chat || '';
    aiEls.aiExplainPrompt.value = ai.prompts?.explain || '';
    aiEls.aiFlashcardsPrompt.value = ai.prompts?.flashcards || '';
    aiEls.aiAutoFlashcardsPrompt.value = ai.prompts?.auto_flashcards || '';

    const provider = ai.provider || 'ollama_local';
    aiEls.aiOllamaLocalUrlGroup?.classList.toggle('hidden', provider !== 'ollama_local');
    aiEls.aiOllamaCloudUrlGroup?.classList.toggle('hidden', provider !== 'ollama_cloud');
    aiEls.aiOllamaCloudKeyGroup?.classList.toggle('hidden', provider !== 'ollama_cloud');
    aiEls.aiOpenrouterUrlGroup?.classList.toggle('hidden', provider !== 'openrouter');
    aiEls.aiOpenrouterKeyGroup?.classList.toggle('hidden', provider !== 'openrouter');

    renderAiVisibility();
  }

  function syncAiSettingsFromInputs() {
    const ai = ensureAiSettings();
    ai.enabled = Boolean(aiEls.aiEnabled?.checked);
    ai.provider = aiEls.aiProvider?.value || 'ollama_local';
    ai.auto_detect_ollama_models = Boolean(aiEls.aiOllamaAutoDetect?.checked);
    ai.ollama_local_url = aiEls.aiOllamaLocalUrl?.value.trim() || DEFAULT_AI_SETTINGS.ollama_local_url;
    ai.ollama_cloud_url = aiEls.aiOllamaCloudUrl?.value.trim() || DEFAULT_AI_SETTINGS.ollama_cloud_url;
    ai.ollama_cloud_api_key = aiEls.aiOllamaCloudKey?.value.trim() || '';
    ai.openrouter_url = aiEls.aiOpenrouterUrl?.value.trim() || DEFAULT_AI_SETTINGS.openrouter_url;
    ai.openrouter_api_key = aiEls.aiOpenrouterKey?.value.trim() || '';
    ai.default_model = aiEls.aiDefaultModel?.value.trim() || '';
    ai.chat_model = aiEls.aiChatModel?.value.trim() || '';
    ai.explain_model = aiEls.aiExplainModel?.value.trim() || '';
    ai.flashcard_model = aiEls.aiFlashcardModel?.value.trim() || '';
    ai.auto_flashcard_model = aiEls.aiAutoFlashcardModel?.value.trim() || '';
    ai.chat_note_only = Boolean(aiEls.aiChatNoteOnly?.checked);
    ai.explain_note_only = Boolean(aiEls.aiExplainNoteOnly?.checked);
    ai.use_anki_coverage_context = Boolean(aiEls.aiUseAnkiCoverage?.checked);
    ai.prompts = ai.prompts || {};
    ai.prompts.chat = aiEls.aiChatPrompt?.value || '';
    ai.prompts.explain = aiEls.aiExplainPrompt?.value || '';
    ai.prompts.flashcards = aiEls.aiFlashcardsPrompt?.value || '';
    ai.prompts.auto_flashcards = aiEls.aiAutoFlashcardsPrompt?.value || '';
    renderAiSettingsFromState();
  }

  function refreshModelInputs() {
    if (!aiEls.aiModelOptions) return;
    aiEls.aiModelOptions.innerHTML = uiState.modelOptions.map((item) => `<option value="${escapeHtml(item.id)}"></option>`).join('');
    aiEls.aiModelList.innerHTML = uiState.modelOptions.length
      ? uiState.modelOptions.map((item) => `<span class="pill">${escapeHtml(item.name || item.id)}</span>`).join('')
      : `<span class="muted">${escapeHtml(lt('ai.noneLoaded'))}</span>`;
  }

  function renderAiSettingsStatus() {
    if (!aiEls.aiStatusText || !aiEls.aiStatusMeta) return;
    if (!uiState.connectionInfo) {
      aiEls.aiStatusText.textContent = lt('ai.noneLoaded');
      aiEls.aiStatusMeta.innerHTML = '';
      return;
    }
    if (!uiState.connectionInfo.ok) {
      aiEls.aiStatusText.textContent = `${lt('ai.connectionFailed')} · ${uiState.connectionInfo.error || ''}`.trim();
      aiEls.aiStatusMeta.innerHTML = '';
      return;
    }
    aiEls.aiStatusText.textContent = `${lt('ai.connectionOk')} · ${uiState.connectionInfo.base_url || ''}`.trim();
    aiEls.aiStatusMeta.innerHTML = [
      `<span class="pill success">${escapeHtml(lt('ai.modelCount', { count: uiState.connectionInfo.count || uiState.modelOptions.length || 0 }))}</span>`,
      uiState.connectionInfo.provider ? `<span class="pill">${escapeHtml(lt('ai.providerBadge', { provider: uiState.connectionInfo.provider }))}</span>` : '',
      uiState.connectionInfo.default_model ? `<span class="pill">${escapeHtml(lt('ai.modelLabel', { model: uiState.connectionInfo.default_model }))}</span>` : '',
    ].filter(Boolean).join('');
  }

  function renderAiContextPills() {
    if (!aiEls.aiContextPill || !aiEls.aiProviderPill) return;
    const api = getApi();
    const selectionText = api?.state?.selection?.text?.trim();
    const noteTitle = api?.state?.activeNote?.meta?.title || '';
    aiEls.aiContextPill.textContent = selectionText
      ? `${noteTitle ? `${noteTitle} · ` : ''}${truncate(selectionText, 80)}`
      : (noteTitle || lt('ai.contextEmpty'));
    const ai = ensureAiSettings();
    const strict = uiState.currentTab === 'chat' ? ai.chat_note_only : (uiState.currentTab === 'explain' ? ai.explain_note_only : true);
    aiEls.aiProviderPill.textContent = strict ? lt('ai.strictTextOnly') : lt('ai.providerBadge', { provider: ai.provider });
  }

  function renderQuickCardEnhancements() {
    const dock = document.getElementById('quick-card-dock');
    if (!dock || !aiEls.quickCardCollapseBtn) return;
    const open = Boolean(getApi()?.state?.quickCard?.open);
    dock.classList.toggle('quick-card-collapsed', open && uiState.prefs.quickCardCollapsed);
    aiEls.quickCardCollapseBtn.textContent = uiState.prefs.quickCardCollapsed ? lt('ai.fastCardExpand') : lt('ai.fastCardCollapse');
    aiEls.quickCardCollapseBtn.classList.toggle('hidden', !open);
    const previewText = getApi()?.state?.quickCard?.sourceExcerpt || getApi()?.state?.selection?.text || '';
    const showPreview = open && Boolean(previewText.trim());
    aiEls.quickCardSourcePreview?.classList.toggle('hidden', !showPreview || uiState.prefs.quickCardCollapsed);
    if (aiEls.quickCardSourcePreviewText) aiEls.quickCardSourcePreviewText.textContent = truncate(previewText.trim(), 240);
  }

  function openAiModal(tab = uiState.prefs.aiTab || 'chat') {
    const ai = ensureAiSettings();
    if (!ai.enabled) {
      getApi()?.showToast?.(lt('ai.aiDisabled'), 'error');
      return;
    }
    uiState.modalOpen = true;
    uiState.currentTab = tab;
    uiState.prefs.aiTab = tab;
    savePrefs();
    aiEls.aiModal.classList.remove('hidden');
    selectTab(tab);
    renderAiContextPills();
  }

  function closeAiModal() {
    uiState.modalOpen = false;
    aiEls.aiModal?.classList.add('hidden');
  }

  function selectTab(tab) {
    uiState.currentTab = tab;
    uiState.prefs.aiTab = tab;
    savePrefs();
    aiEls.aiTabs.forEach((button) => button.classList.toggle('active', button.dataset.aiTab === tab));
    aiEls.aiTabPanels.forEach((panel) => {
      const active = panel.id === `ai-tab-${tab}`;
      panel.classList.toggle('hidden', !active);
      panel.classList.toggle('active', active);
    });
    renderAiContextPills();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function truncate(value, limit = 120) {
    const text = String(value || '').trim();
    return text.length <= limit ? text : `${text.slice(0, limit - 1).trim()}…`;
  }

  function selectionTextOrToast() {
    const text = getApi()?.state?.selection?.text?.trim() || '';
    if (!text) {
      getApi()?.showToast?.(lt('ai.errorNoSelection'), 'error');
      return '';
    }
    return text;
  }

  function activeNoteOrToast() {
    const note = getApi()?.state?.activeNote;
    if (!note) {
      getApi()?.showToast?.(lt('ai.errorNoNote'), 'error');
      return null;
    }
    return note;
  }

  function fillContextFromSelection(target) {
    const text = selectionTextOrToast();
    if (!text) return false;
    target.value = text;
    renderAiContextPills();
    return true;
  }

  function fillContextFromNote(target) {
    const note = activeNoteOrToast();
    if (!note) return false;
    target.value = note.content || '';
    renderAiContextPills();
    return true;
  }

  async function saveCurrentSettingsQuietly() {
    syncAiSettingsFromInputs();
    await getApi()?.saveSettings?.({ quiet: true, reloadNotes: false });
  }

  async function refreshAiModels({ test = false, quiet = false } = {}) {
    if (uiState.isRefreshingModels) return;
    uiState.isRefreshingModels = true;
    try {
      await saveCurrentSettingsQuietly();
      const result = await getApi().fetchJson(test ? '/api/ai/test' : '/api/ai/models', { method: test ? 'POST' : 'GET' });
      uiState.modelOptions = result.models || [];
      uiState.connectionInfo = { ok: true, ...result };
      refreshModelInputs();
      renderAiSettingsStatus();
      if (!ensureAiSettings().default_model && uiState.modelOptions[0]) {
        aiEls.aiDefaultModel.value = uiState.modelOptions[0].id;
        syncAiSettingsFromInputs();
      }
      if (!quiet) getApi()?.showToast?.(lt('ai.connectionOk'));
    } catch (error) {
      uiState.connectionInfo = { ok: false, error: error.message || String(error) };
      renderAiSettingsStatus();
      if (!quiet) getApi()?.showToast?.(error.message || String(error), 'error');
    } finally {
      uiState.isRefreshingModels = false;
    }
  }

  function renderChatLog() {
    if (!aiEls.aiChatLog) return;
    aiEls.aiChatLog.innerHTML = uiState.chatMessages.length
      ? uiState.chatMessages.map((message) => `
          <article class="ai-chat-bubble ${message.role === 'assistant' ? 'assistant' : 'user'}">
            <div class="ai-chat-role">${escapeHtml(lt(`ai.role.${message.role}`))}</div>
            <div class="ai-chat-content">${escapeHtml(message.content).replace(/\n/g, '<br>')}</div>
          </article>
        `).join('')
      : `<div class="muted">${escapeHtml(lt('ai.contextEmpty'))}</div>`;
    aiEls.aiChatLog.scrollTop = aiEls.aiChatLog.scrollHeight;
  }

  async function sendChat() {
    const note = activeNoteOrToast();
    if (!note) return;
    const message = aiEls.aiChatInput.value.trim();
    if (!message) return;
    await getApi().persistActiveNote?.({ quiet: true });
    await saveCurrentSettingsQuietly();
    const messages = [...uiState.chatMessages, { role: 'user', content: message }];
    uiState.chatMessages = messages;
    renderChatLog();
    aiEls.aiChatInput.value = '';
    try {
      const response = await getApi().fetchJson('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          note_id: note.meta.id,
          context_text: aiEls.aiChatContext.value,
          selected_text: getApi().state?.selection?.text || '',
          messages,
          model: ensureAiSettings().chat_model || ensureAiSettings().default_model || null,
        }),
      });
      uiState.chatMessages = [...uiState.chatMessages, { role: 'assistant', content: response.content || '' }];
      renderChatLog();
      getApi()?.showToast?.(lt('ai.connectionOk'));
    } catch (error) {
      uiState.chatMessages = uiState.chatMessages.slice(0, -1);
      renderChatLog();
      getApi()?.showToast?.(error.message || String(error), 'error');
    }
  }

  async function runExplain() {
    const note = activeNoteOrToast();
    if (!note) return;
    const text = aiEls.aiExplainText.value.trim();
    if (!text) {
      getApi()?.showToast?.(lt('ai.noText'), 'error');
      return;
    }
    await getApi().persistActiveNote?.({ quiet: true });
    await saveCurrentSettingsQuietly();
    aiEls.aiExplainOutput.textContent = '…';
    try {
      const response = await getApi().fetchJson('/api/ai/explain', {
        method: 'POST',
        body: JSON.stringify({
          note_id: note.meta.id,
          selected_text: text,
          question: aiEls.aiExplainQuestion.value.trim(),
          model: ensureAiSettings().explain_model || ensureAiSettings().default_model || null,
        }),
      });
      uiState.explainOutput = response.content || '';
      aiEls.aiExplainOutput.textContent = uiState.explainOutput;
    } catch (error) {
      aiEls.aiExplainOutput.textContent = error.message || String(error);
      getApi()?.showToast?.(error.message || String(error), 'error');
    }
  }

  function renderGeneratedCards() {
    if (!aiEls.aiGeneratedCardList || !aiEls.aiCardsMeta) return;
    const cards = uiState.generatedCards || [];
    aiEls.aiCardsSaveAllBtn?.classList.toggle('hidden', !cards.length);
    aiEls.aiGeneratedCardList.innerHTML = cards.length
      ? cards.map((card, index) => `
          <article class="ai-generated-card card-surface">
            <div class="ai-generated-card-head">
              <strong>#${index + 1}</strong>
              <span class="pill">${escapeHtml(card.type || 'basic')}</span>
            </div>
            <div class="ai-generated-card-block">
              <div class="section-label">Front</div>
              <div>${escapeHtml(card.front || '').replace(/\n/g, '<br>')}</div>
            </div>
            <div class="ai-generated-card-block">
              <div class="section-label">Back</div>
              <div>${escapeHtml(card.back || '').replace(/\n/g, '<br>')}</div>
            </div>
            ${card.extra ? `<div class="ai-generated-card-block"><div class="section-label">Extra</div><div>${escapeHtml(card.extra).replace(/\n/g, '<br>')}</div></div>` : ''}
            ${card.source_excerpt ? `<div class="ai-generated-card-block"><div class="section-label">Excerpt</div><div class="muted">${escapeHtml(card.source_excerpt)}</div></div>` : ''}
          </article>
        `).join('')
      : `<div class="muted">${escapeHtml(lt('ai.cardsNoDrafts'))}</div>`;
  }

  async function generateCards({ auto = false } = {}) {
    const note = activeNoteOrToast();
    if (!note) return;
    const text = auto ? (note.content || '') : aiEls.aiCardsText.value.trim();
    if (!text) {
      getApi()?.showToast?.(lt('ai.noText'), 'error');
      return;
    }
    await getApi().persistActiveNote?.({ quiet: true });
    await saveCurrentSettingsQuietly();
    uiState.prefs.cardCount = Number(aiEls.aiCardsCount.value || uiState.prefs.cardCount || 8);
    savePrefs();
    try {
      aiEls.aiCardsMeta.textContent = '…';
      const response = await getApi().fetchJson('/api/ai/generate-cards', {
        method: 'POST',
        body: JSON.stringify({
          note_id: note.meta.id,
          source_text: text,
          target_count: Math.max(1, Math.min(24, Number(aiEls.aiCardsCount.value || 8))),
          auto,
          model: auto ? (ensureAiSettings().auto_flashcard_model || ensureAiSettings().default_model || null) : (ensureAiSettings().flashcard_model || ensureAiSettings().default_model || null),
          include_anki_coverage: Boolean(ensureAiSettings().use_anki_coverage_context),
        }),
      });
      uiState.generatedCards = response.cards || [];
      aiEls.aiCardsMeta.textContent = lt('ai.cardsMeta', {
        anki: response.total_anki_cards_scanned || 0,
        relevant: response.relevant_anki_cards_shared || 0,
      });
      renderGeneratedCards();
      getApi()?.showToast?.(lt('ai.cardsGenerated', { count: uiState.generatedCards.length }));
    } catch (error) {
      uiState.generatedCards = [];
      aiEls.aiCardsMeta.textContent = error.message || String(error);
      renderGeneratedCards();
      getApi()?.showToast?.(error.message || String(error), 'error');
    }
  }

  async function saveGeneratedCards() {
    const note = activeNoteOrToast();
    if (!note || !uiState.generatedCards.length) return;
    let savedCount = 0;
    for (const card of uiState.generatedCards) {
      await getApi().saveCardPayload({
        type: card.type || 'basic',
        front: card.front || '',
        back: card.back || '',
        extra: card.extra || '',
        tags: Array.isArray(card.tags) ? card.tags : [],
        deck_name: note.meta.default_deck || 'Default',
        source_excerpt: card.source_excerpt || aiEls.aiCardsText.value.trim().slice(0, 180),
        source_locator: note.meta.title || '',
        coverage_anchor: null,
      });
      savedCount += 1;
    }
    getApi()?.showToast?.(lt('ai.cardsSaved', { count: savedCount }));
    await getApi().openStudyPanel?.('cards');
    uiState.generatedCards = [];
    aiEls.aiCardsMeta.textContent = '';
    renderGeneratedCards();
  }

  function bindInputSync() {
    [
      aiEls.aiEnabled,
      aiEls.aiProvider,
      aiEls.aiOllamaAutoDetect,
      aiEls.aiOllamaLocalUrl,
      aiEls.aiOllamaCloudUrl,
      aiEls.aiOllamaCloudKey,
      aiEls.aiOpenrouterUrl,
      aiEls.aiOpenrouterKey,
      aiEls.aiDefaultModel,
      aiEls.aiChatModel,
      aiEls.aiExplainModel,
      aiEls.aiFlashcardModel,
      aiEls.aiAutoFlashcardModel,
      aiEls.aiChatNoteOnly,
      aiEls.aiExplainNoteOnly,
      aiEls.aiUseAnkiCoverage,
      aiEls.aiChatPrompt,
      aiEls.aiExplainPrompt,
      aiEls.aiFlashcardsPrompt,
      aiEls.aiAutoFlashcardsPrompt,
    ].forEach((node) => {
      if (!node) return;
      const eventName = ['checkbox', 'select-one'].includes(node.type) || node.tagName === 'SELECT' ? 'change' : 'input';
      node.addEventListener(eventName, () => {
        syncAiSettingsFromInputs();
        if (node === aiEls.aiProvider) renderAiSettingsFromState();
        if (node === aiEls.aiEnabled) renderAiVisibility();
      });
    });
  }

  function bindEvents() {
    aiEls.openAiBtn?.addEventListener('click', () => openAiModal('chat'));
    aiEls.bubbleAiChatBtn?.addEventListener('click', () => {
      openAiModal('chat');
      fillContextFromSelection(aiEls.aiChatContext);
    });
    aiEls.bubbleAiExplainBtn?.addEventListener('click', () => {
      openAiModal('explain');
      fillContextFromSelection(aiEls.aiExplainText);
    });
    aiEls.bubbleAiCardsBtn?.addEventListener('click', () => {
      openAiModal('cards');
      fillContextFromSelection(aiEls.aiCardsText);
    });

    aiEls.aiCloseBtn?.addEventListener('click', closeAiModal);
    document.querySelectorAll('[data-close-ai="true"]').forEach((node) => node.addEventListener('click', closeAiModal));
    aiEls.aiTabs.forEach((button) => button.addEventListener('click', () => selectTab(button.dataset.aiTab)));

    aiEls.aiChatUseSelectionBtn?.addEventListener('click', () => fillContextFromSelection(aiEls.aiChatContext));
    aiEls.aiChatUseNoteBtn?.addEventListener('click', () => fillContextFromNote(aiEls.aiChatContext));
    aiEls.aiChatClearBtn?.addEventListener('click', () => {
      uiState.chatMessages = [];
      renderChatLog();
    });
    aiEls.aiChatSendBtn?.addEventListener('click', () => sendChat());
    aiEls.aiChatInput?.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        sendChat();
      }
    });

    aiEls.aiExplainUseSelectionBtn?.addEventListener('click', () => fillContextFromSelection(aiEls.aiExplainText));
    aiEls.aiExplainUseNoteBtn?.addEventListener('click', () => fillContextFromNote(aiEls.aiExplainText));
    aiEls.aiExplainRunBtn?.addEventListener('click', () => runExplain());

    aiEls.aiCardsUseSelectionBtn?.addEventListener('click', () => fillContextFromSelection(aiEls.aiCardsText));
    aiEls.aiCardsUseNoteBtn?.addEventListener('click', () => fillContextFromNote(aiEls.aiCardsText));
    aiEls.aiCardsGenerateBtn?.addEventListener('click', () => generateCards({ auto: false }));
    aiEls.aiCardsAutoBtn?.addEventListener('click', () => generateCards({ auto: true }));
    aiEls.aiCardsSaveAllBtn?.addEventListener('click', () => saveGeneratedCards());
    aiEls.aiCardsCount.value = String(uiState.prefs.cardCount || 8);
    aiEls.aiCardsCount?.addEventListener('change', () => {
      uiState.prefs.cardCount = Number(aiEls.aiCardsCount.value || 8);
      savePrefs();
    });

    aiEls.aiTestBtn?.addEventListener('click', () => refreshAiModels({ test: true }));
    aiEls.aiRefreshBtn?.addEventListener('click', () => refreshAiModels({ quiet: false }));

    aiEls.quickCardCollapseBtn?.addEventListener('click', () => {
      uiState.prefs.quickCardCollapsed = !uiState.prefs.quickCardCollapsed;
      savePrefs();
      renderQuickCardEnhancements();
    });

    document.addEventListener('nanki:settings-changed', (event) => {
      renderAiSettingsFromState();
      applyTranslations();
      syncAiSettingsFromInputs();
      const ai = ensureAiSettings();
      if (event?.detail?.source === 'load' && ai.enabled && ai.provider === 'ollama_local' && ai.auto_detect_ollama_models) {
        refreshAiModels({ quiet: true }).catch(() => undefined);
      }
    });
    document.addEventListener('nanki:note-selected', () => {
      uiState.chatMessages = [];
      uiState.explainOutput = '';
      uiState.generatedCards = [];
      if (aiEls.aiExplainOutput) aiEls.aiExplainOutput.textContent = '';
      aiEls.aiCardsMeta.textContent = '';
      renderGeneratedCards();
      renderChatLog();
      renderAiContextPills();
    });
    document.addEventListener('nanki:quick-card-render', () => renderQuickCardEnhancements());

    document.getElementById('settings-language')?.addEventListener('change', () => {
      window.setTimeout(() => applyTranslations(), 0);
    });
  }

  function init() {
    insertUiShell();
    mapElements();
    bindInputSync();
    bindEvents();
    renderAiSettingsFromState();
    refreshModelInputs();
    applyTranslations();
    renderGeneratedCards();
    renderChatLog();
    renderAiContextPills();
    renderQuickCardEnhancements();
    window.setTimeout(() => {
      const ai = ensureAiSettings();
      renderAiSettingsFromState();
      if (ai.enabled && ai.provider === 'ollama_local' && ai.auto_detect_ollama_models) {
        refreshAiModels({ quiet: true }).catch(() => undefined);
      }
    }, 250);
  }

  window.addEventListener('DOMContentLoaded', init);
})();
