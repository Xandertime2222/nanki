const state = {
  settings: null,
  notes: [],
  activeNoteId: null,
  activeNote: null,
  decks: [],
  models: [],
  searchTerm: '',
  saveTimer: null,
  dirty: false,
  coverageReport: null,
  coverageView: false,
  ankiConnectionInfo: null,
  inspectorPanel: 'cards',
  studyOpen: false,
  noteDetailsOpen: false,
  editorHasFocus: false,
  markdownSnapshot: '',
  markdownDirty: true,
  markdownPromise: null,
  editorApplying: false,
  selection: null,
  selectionToken: 0,
  quickCard: {
    open: false,
    front: '',
    back: '',
    sourceExcerpt: '',
    sourceLocator: '',
    anchor: null,
  },
  drawer: {
    open: false,
    editingId: null,
    sourceExcerpt: '',
    anchor: null,
  },
};

const els = {};

const I18N = {
  en: {
    'app.subtitle': 'Write notes. Select text. Build cards.',
    'sidebar.new': 'New',
    'sidebar.newNote': 'New note',
    'sidebar.import': 'Import',
    'sidebar.focusLabel': 'Writing first',
    'sidebar.focusTitle': 'Create your own notes first',
    'sidebar.focusSubtitle': 'Nanki is built around writing. Import stays available when you need it.',
    'sidebar.searchPlaceholder': 'Search notes, tags, deck',
    'sidebar.importFile': 'Import file',
    'sidebar.pasteText': 'Paste text',
    'sidebar.duplicate': 'Duplicate',
    'sidebar.delete': 'Delete',
    'sidebar.notes': 'Notes',
    'sidebar.noNotes': 'No notes yet. Start with your own note or import existing material.',
    'notes.title': 'Title',
    'notes.titlePlaceholder': 'Untitled note',
    'notes.tags': 'Tags',
    'notes.tagsPlaceholder': 'biology, chapter-2',
    'notes.defaultDeck': 'Default deck',
    'notes.defaultDeckPlaceholder': 'Default',
    'notes.pinned': 'Pinned',
    'notes.untitledTitle': 'Untitled note',
    'notes.storageBadge': 'Saved as Markdown',
    'notes.importedSourceBadge': 'Imported source',
    'topbar.openSettings': 'Settings',
    'topbar.noteDetails': 'Details',
    'topbar.studyTools': 'Study',
    'topbar.pushAll': 'Push note cards to Anki',
    'editor.bold': 'Bold',
    'editor.italic': 'Italic',
    'editor.h1': 'H1',
    'editor.h2': 'H2',
    'editor.h3': 'H3',
    'editor.bullet': 'Bullet',
    'editor.quote': 'Quote',
    'editor.code': 'Code',
    'editor.clearFormatting': 'Clear',
    'editor.storageHint': 'Stored as Markdown in the background',
    'editor.shortcutHint': 'Use # for headings, - for lists, > for quotes, and Ctrl/Cmd+B for bold.',
    'editor.emptyLabel': 'Blank note',
    'editor.emptyTitle': 'Start with your own thoughts',
    'editor.emptySubtitle': 'Type directly. Nanki saves Markdown in the background and lets you import files later.',
    'editor.startWriting': 'Start writing',
    'editor.importFile': 'Import file',
    'editor.pasteText': 'Paste text',
    'editor.placeholder': 'Write like a normal notes app. Markdown is only used for saving.',
    'inspector.title': 'Study tools',
    'inspector.subtitle': 'Open this when you want cards, coverage, or your imported source.',
    'inspector.cards': 'Cards',
    'inspector.coverage': 'Coverage',
    'inspector.source': 'Source',
    'cards.savedCards': 'Saved cards for note',
    'cards.newCard': 'New card',
    'cards.pushAll': 'Push all',
    'cards.emptyHint': 'Select text in your note or imported source and use the popup to create a card instantly.',
    'cards.type': 'Type',
    'cards.deck': 'Deck',
    'cards.tags': 'Tags',
    'cards.front': 'Front / Text',
    'cards.back': 'Back',
    'cards.extra': 'Extra',
    'cards.sourceLocator': 'Source locator',
    'cards.tagsPlaceholder': 'term, exam, lecture',
    'cards.extraPlaceholder': 'Extra context for cloze cards',
    'cards.sourceLocatorPlaceholder': 'Page 4 / Slide 2 / section heading',
    'cards.saveCard': 'Save card',
    'cards.saveAndPush': 'Save & push',
    'cards.noSavedCards': 'No cards saved for this note yet.',
    'cards.edit': 'Edit',
    'cards.push': 'Push',
    'cards.delete': 'Delete',
    'cards.mappedWords': 'Mapped · {count} sentence(s)',
    'cards.unmapped': 'Unmapped',
    'cards.frontLabel': 'Front / Text',
    'cards.backLabel': 'Back',
    'cards.extraLabel': 'Extra',
    'cardTypes.basic': 'Basic',
    'cardTypes.reverse': 'Basic + reverse',
    'cardTypes.cloze': 'Cloze',
    'selection.basicCard': 'Basic',
    'selection.clozeCard': 'Cloze',
    'selection.useAsFront': 'To front',
    'selection.useAsBack': 'To back',
    'selection.editorSelection': 'Note selection',
    'selection.importedSource': 'Imported source',
    'drawer.newCardTitle': 'Quick card',
    'drawer.editCardTitle': 'Edit card',
    'drawer.subtitle': 'Built from your current selection without leaving the note.',
    'drawer.selectionEmpty': 'No captured selection.',
    'quickCard.title': 'Fast card',
    'quickCard.emptyMeta': 'Add a front and back from your note.',
    'quickCard.hint': 'Use To front and To back from the selection bubble, then save.',
    'quickCard.ready': 'Front and back are ready. Save now or open details.',
    'quickCard.openDetails': 'Open details',
    'quickCard.clear': 'Clear',
    'quickCard.save': 'Save card',
    'quickCard.savePush': 'Save & push',
    'coverage.title': 'Flashcard coverage',
    'coverage.refresh': 'Refresh',
    'coverage.toggleView': 'Show coverage in editor',
    'coverage.hideView': 'Back to writing',
    'coverage.editorEmpty': 'Run coverage once to inspect the current note inside the editor.',
    'coverage.bySection': 'By section',
    'coverage.largestGaps': 'Largest gaps',
    'coverage.unmappedCards': 'Cards without mapping',
    'coverage.ankiMatches': 'Matching Anki cards',
    'coverage.map': 'Coverage map',
    'coverage.ankiMatched': '{count} matched in Anki',
    'coverage.ankiScanned': '{count} cards in Anki',
    'coverage.ankiUnavailable': 'Anki not available',
    'coverage.noAnkiMatches': 'No matching cards found in your Anki library.',
    'coverage.mapEmpty': 'Coverage highlighting appears here after the first analysis.',
    'coverage.noNoteLoaded': 'No note loaded.',
    'coverage.noSectionData': 'No section data yet.',
    'coverage.noGaps': 'No gaps to show yet.',
    'coverage.noCardMapping': 'No card mapping data yet.',
    'coverage.summary': '{covered} of {total} sentences are covered by {mapped} matching card(s).',
    'coverage.totalCards': '{count} total cards',
    'coverage.mapped': '{count} mapped',
    'coverage.unmapped': '{count} unmapped',
    'coverage.incompleteSections': '{count} incomplete section(s)',
    'coverage.sectionWords': '{covered}/{total} sentences',
    'coverage.sectionCards': '{count} card(s)',
    'coverage.gapWords': '{count} sentences',
    'coverage.everythingCovered': 'Everything currently has at least some card coverage.',
    'coverage.allMapped': 'All saved cards are mapped to note text.',
    'coverage.noSourceReference': 'No source reference stored.',
    'source.title': 'Imported source',
    'source.openOriginal': 'Open original',
    'source.noSource': 'No imported source for this note.',
    'source.selectTextDirectly': 'select text directly',
    'settings.title': 'Settings',
    'settings.subtitle': 'Workspace, language, and Anki connection.',
    'settings.generalTitle': 'General settings',
    'settings.generalSubtitle': 'Workspace and interface language.',
    'settings.workspacePath': 'Workspace path',
    'settings.language': 'Language',
    'settings.save': 'Save settings',
    'settings.ankiTitle': 'AnkiConnect',
    'settings.ankiSubtitle': 'Connection, deck discovery, and sync behavior.',
    'settings.ankiUrl': 'AnkiConnect URL',
    'settings.autoSync': 'Sync automatically after pushing cards',
    'settings.testConnection': 'Test connection',
    'settings.refreshDecks': 'Refresh decks',
    'settings.decks': 'Decks',
    'settings.models': 'Models',
    'settings.notTestedYet': 'Not tested yet.',
    'settings.noneLoaded': 'Nothing loaded yet.',
    'settings.connectionOk': 'Connection successful',
    'settings.connectionFailed': 'Connection failed',
    'settings.version': 'Version {version}',
    'settings.deckCount': '{count} deck(s)',
    'settings.modelCount': '{count} model(s)',
    'importText.title': 'Import pasted text',
    'importText.subtitle': 'Paste lecture notes, transcript text, or excerpts.',
    'importText.noteTitle': 'Title',
    'importText.titlePlaceholder': 'Lecture notes',
    'importText.type': 'Type',
    'importText.plainText': 'Plain text',
    'importText.markdown': 'Markdown',
    'importText.tags': 'Tags',
    'importText.tagsPlaceholder': 'lecture, week-3',
    'importText.content': 'Content',
    'importText.import': 'Import',
    'importText.defaultTitle': 'Imported text',
    'importHub.title': 'Bring existing material into Nanki',
    'importHub.subtitle': 'Import is optional. Your main workflow can stay centered on your own notes.',
    'importHub.fileTitle': 'Import a file',
    'importHub.fileSubtitle': 'PDF, Markdown, plain text, or PowerPoint',
    'importHub.textTitle': 'Paste existing text',
    'importHub.textSubtitle': 'Turn copied excerpts into a new note',
    'common.close': 'Close',
    'common.textFallback': 'text',
    'status.ready': 'Ready',
    'status.unsavedChanges': 'Unsaved changes',
    'status.saving': 'Saving…',
    'status.loaded': 'Saved · {date}',
    'toast.newNoteCreated': 'New note created.',
    'toast.noteDuplicated': 'Note duplicated.',
    'toast.noteDeleted': 'Note deleted.',
    'toast.importedFile': 'Imported {name}.',
    'toast.textImported': 'Text imported.',
    'toast.settingsSaved': 'Settings updated.',
    'toast.deckListRefreshed': 'Deck list refreshed.',
    'toast.ankiOffline': 'AnkiConnect is not reachable yet. The app will still work offline.',
    'toast.ankiOk': 'AnkiConnect OK · v{version} · {count} deck(s)',
    'toast.pushedCards': 'Pushed {count} card(s) to Anki.',
    'toast.noCardsPushed': 'No cards were pushed.',
    'toast.exported': 'Exported {filename}.',
    'toast.cardSaved': 'Card saved.',
    'toast.cardUpdated': 'Card updated.',
    'toast.cardDeleted': 'Card deleted.',
    'toast.fastCardReady': 'Card draft prepared from the current selection.',
    'toast.frontCaptured': 'Selection added to the front side.',
    'toast.backCaptured': 'Selection added to the back side.',
    'toast.quickCardCleared': 'Fast card cleared.',
    'toast.connectionSettingsSaved': 'Connection settings updated.',
    'errors.pasteText': 'Paste some text to import.',
    'errors.selectTextFirst': 'Select some text in the note or source pane first.',
    'errors.createOrOpenNoteFirst': 'Create or open a note first.',
    'errors.frontEmpty': 'Front / Text cannot be empty.',
    'errors.backEmpty': 'Back cannot be empty for non-cloze cards.',
    'errors.saveCardFirst': 'Save the card first.',
    'errors.saveCurrentNoteFailed': 'Could not save current note: {message}',
    'errors.noActiveNote': 'No note loaded.',
    'dialogs.deleteNoteConfirm': 'Delete this note and all of its saved cards?',
    'dialogs.deleteCardConfirm': 'Delete this card?',
    'unit.cards': 'cards',
    'unit.words': 'words',
    'unit.chars': 'chars',
    'unit.none': '—',
  },
  de: {
    'app.subtitle': 'Notizen schreiben. Text markieren. Karten bauen.',
    'sidebar.new': 'Neu',
    'sidebar.newNote': 'Neue Notiz',
    'sidebar.import': 'Importieren',
    'sidebar.focusLabel': 'Schreiben zuerst',
    'sidebar.focusTitle': 'Erstelle zuerst deine eigenen Notizen',
    'sidebar.focusSubtitle': 'Nanki ist auf eigenes Schreiben ausgelegt. Import bleibt verfügbar, wenn du ihn brauchst.',
    'sidebar.searchPlaceholder': 'Notizen, Tags, Deck durchsuchen',
    'sidebar.importFile': 'Datei importieren',
    'sidebar.pasteText': 'Text einfügen',
    'sidebar.duplicate': 'Duplizieren',
    'sidebar.delete': 'Löschen',
    'sidebar.notes': 'Notizen',
    'sidebar.noNotes': 'Noch keine Notizen. Starte mit einer eigenen Notiz oder importiere bestehendes Material.',
    'notes.title': 'Titel',
    'notes.titlePlaceholder': 'Unbenannte Notiz',
    'notes.tags': 'Tags',
    'notes.tagsPlaceholder': 'biologie, kapitel-2',
    'notes.defaultDeck': 'Standarddeck',
    'notes.defaultDeckPlaceholder': 'Default',
    'notes.pinned': 'Angeheftet',
    'notes.untitledTitle': 'Unbenannte Notiz',
    'notes.storageBadge': 'Als Markdown gespeichert',
    'notes.importedSourceBadge': 'Importierte Quelle',
    'topbar.openSettings': 'Einstellungen',
    'topbar.noteDetails': 'Details',
    'topbar.studyTools': 'Lernen',
    'topbar.pushAll': 'Notizkarten zu Anki senden',
    'editor.bold': 'Fett',
    'editor.italic': 'Kursiv',
    'editor.h1': 'H1',
    'editor.h2': 'H2',
    'editor.h3': 'H3',
    'editor.bullet': 'Liste',
    'editor.quote': 'Zitat',
    'editor.code': 'Code',
    'editor.clearFormatting': 'Zurücksetzen',
    'editor.storageHint': 'Wird im Hintergrund als Markdown gespeichert',
    'editor.shortcutHint': 'Nutze # für Überschriften, - für Listen, > für Zitate und Strg/Cmd+B für Fett.',
    'editor.emptyLabel': 'Leere Notiz',
    'editor.emptyTitle': 'Starte mit deinen eigenen Gedanken',
    'editor.emptySubtitle': 'Schreibe direkt los. Nanki speichert im Hintergrund als Markdown und lässt dich später Dateien importieren.',
    'editor.startWriting': 'Jetzt schreiben',
    'editor.importFile': 'Datei importieren',
    'editor.pasteText': 'Text einfügen',
    'editor.placeholder': 'Schreibe wie in einer normalen Notiz-App. Markdown dient nur dem Speichern.',
    'inspector.title': 'Lernwerkzeuge',
    'inspector.subtitle': 'Öffne diesen Bereich, wenn du Karten, Abdeckung oder die importierte Quelle brauchst.',
    'inspector.cards': 'Karten',
    'inspector.coverage': 'Abdeckung',
    'inspector.source': 'Quelle',
    'cards.savedCards': 'Gespeicherte Karten der Notiz',
    'cards.newCard': 'Neue Karte',
    'cards.pushAll': 'Alle senden',
    'cards.emptyHint': 'Markiere Text in deiner Notiz oder Quelle und nutze das Popup, um sofort eine Karte zu erstellen.',
    'cards.type': 'Typ',
    'cards.deck': 'Deck',
    'cards.tags': 'Tags',
    'cards.front': 'Vorderseite / Text',
    'cards.back': 'Rückseite',
    'cards.extra': 'Extra',
    'cards.sourceLocator': 'Quellenhinweis',
    'cards.tagsPlaceholder': 'begriff, prüfung, vorlesung',
    'cards.extraPlaceholder': 'Zusätzlicher Kontext für Cloze-Karten',
    'cards.sourceLocatorPlaceholder': 'Seite 4 / Folie 2 / Abschnitt',
    'cards.saveCard': 'Karte speichern',
    'cards.saveAndPush': 'Speichern & senden',
    'cards.noSavedCards': 'Für diese Notiz sind noch keine Karten gespeichert.',
    'cards.edit': 'Bearbeiten',
    'cards.push': 'Senden',
    'cards.delete': 'Löschen',
    'cards.mappedWords': 'Zugeordnet · {count} Satz/Sätze',
    'cards.unmapped': 'Nicht zugeordnet',
    'cards.frontLabel': 'Vorderseite / Text',
    'cards.backLabel': 'Rückseite',
    'cards.extraLabel': 'Extra',
    'cardTypes.basic': 'Basic',
    'cardTypes.reverse': 'Basic + Rückseite',
    'cardTypes.cloze': 'Cloze',
    'selection.basicCard': 'Basic',
    'selection.clozeCard': 'Cloze',
    'selection.useAsFront': 'Zur Vorderseite',
    'selection.useAsBack': 'Zur Rückseite',
    'selection.editorSelection': 'Notizauswahl',
    'selection.importedSource': 'Importierte Quelle',
    'drawer.newCardTitle': 'Schnellkarte',
    'drawer.editCardTitle': 'Karte bearbeiten',
    'drawer.subtitle': 'Direkt aus deiner Auswahl gebaut, ohne die Notiz zu verlassen.',
    'drawer.selectionEmpty': 'Keine Auswahl erfasst.',
    'quickCard.title': 'Schnellkarte',
    'quickCard.emptyMeta': 'Füge Vorder- und Rückseite direkt aus deiner Notiz hinzu.',
    'quickCard.hint': 'Nutze im Auswahl-Popup Zur Vorderseite und Zur Rückseite und speichere dann.',
    'quickCard.ready': 'Vorder- und Rückseite sind bereit. Jetzt speichern oder Details öffnen.',
    'quickCard.openDetails': 'Details öffnen',
    'quickCard.clear': 'Leeren',
    'quickCard.save': 'Karte speichern',
    'quickCard.savePush': 'Speichern & senden',
    'coverage.title': 'Kartenabdeckung',
    'coverage.refresh': 'Aktualisieren',
    'coverage.toggleView': 'Abdeckung im Editor zeigen',
    'coverage.hideView': 'Zurück zum Schreiben',
    'coverage.editorEmpty': 'Führe zuerst eine Abdeckungsanalyse aus, um die Notiz direkt im Editor zu sehen.',
    'coverage.bySection': 'Nach Abschnitt',
    'coverage.largestGaps': 'Größte Lücken',
    'coverage.unmappedCards': 'Karten ohne Zuordnung',
    'coverage.ankiMatches': 'Passende Anki-Karten',
    'coverage.map': 'Abdeckungsansicht',
    'coverage.ankiMatched': '{count} Treffer in Anki',
    'coverage.ankiScanned': '{count} Karten in Anki',
    'coverage.ankiUnavailable': 'Anki nicht verfügbar',
    'coverage.noAnkiMatches': 'In deiner Anki-Bibliothek wurden keine passenden Karten gefunden.',
    'coverage.mapEmpty': 'Die markierte Abdeckungsansicht erscheint nach der ersten Analyse hier.',
    'coverage.noNoteLoaded': 'Keine Notiz geladen.',
    'coverage.noSectionData': 'Noch keine Abschnittsdaten.',
    'coverage.noGaps': 'Noch keine Lücken vorhanden.',
    'coverage.noCardMapping': 'Noch keine Zuordnungsdaten vorhanden.',
    'coverage.summary': '{covered} von {total} Sätzen werden durch {mapped} passende Karte(n) abgedeckt.',
    'coverage.totalCards': '{count} Karten gesamt',
    'coverage.mapped': '{count} zugeordnet',
    'coverage.unmapped': '{count} nicht zugeordnet',
    'coverage.incompleteSections': '{count} unvollständige(r) Abschnitt(e)',
    'coverage.sectionWords': '{covered}/{total} Sätze',
    'coverage.sectionCards': '{count} Karte(n)',
    'coverage.gapWords': '{count} Sätze',
    'coverage.everythingCovered': 'Aktuell hat jeder Bereich zumindest etwas Kartenabdeckung.',
    'coverage.allMapped': 'Alle gespeicherten Karten sind dem Notiztext zugeordnet.',
    'coverage.noSourceReference': 'Kein Quellenhinweis gespeichert.',
    'source.title': 'Importierte Quelle',
    'source.openOriginal': 'Original öffnen',
    'source.noSource': 'Für diese Notiz gibt es keine importierte Quelle.',
    'source.selectTextDirectly': 'Text direkt markieren',
    'settings.title': 'Einstellungen',
    'settings.subtitle': 'Workspace, Sprache und Anki-Verbindung.',
    'settings.generalTitle': 'Allgemeine Einstellungen',
    'settings.generalSubtitle': 'Workspace und Oberflächensprache.',
    'settings.workspacePath': 'Workspace-Pfad',
    'settings.language': 'Sprache',
    'settings.save': 'Einstellungen speichern',
    'settings.ankiTitle': 'AnkiConnect',
    'settings.ankiSubtitle': 'Verbindung, Deck-Erkennung und Sync-Verhalten.',
    'settings.ankiUrl': 'AnkiConnect-URL',
    'settings.autoSync': 'Nach dem Senden automatisch synchronisieren',
    'settings.testConnection': 'Verbindung testen',
    'settings.refreshDecks': 'Decks aktualisieren',
    'settings.decks': 'Decks',
    'settings.models': 'Modelle',
    'settings.notTestedYet': 'Noch nicht getestet.',
    'settings.noneLoaded': 'Noch nichts geladen.',
    'settings.connectionOk': 'Verbindung erfolgreich',
    'settings.connectionFailed': 'Verbindung fehlgeschlagen',
    'settings.version': 'Version {version}',
    'settings.deckCount': '{count} Deck(s)',
    'settings.modelCount': '{count} Modell(e)',
    'importText.title': 'Eingefügten Text importieren',
    'importText.subtitle': 'Füge Vorlesungsnotizen, Transkripte oder Textauszüge ein.',
    'importText.noteTitle': 'Titel',
    'importText.titlePlaceholder': 'Vorlesungsnotizen',
    'importText.type': 'Typ',
    'importText.plainText': 'Klartext',
    'importText.markdown': 'Markdown',
    'importText.tags': 'Tags',
    'importText.tagsPlaceholder': 'vorlesung, woche-3',
    'importText.content': 'Inhalt',
    'importText.import': 'Importieren',
    'importText.defaultTitle': 'Importierter Text',
    'importHub.title': 'Bestehendes Material in Nanki holen',
    'importHub.subtitle': 'Import ist optional. Dein Hauptfluss kann auf eigenen Notizen bleiben.',
    'importHub.fileTitle': 'Datei importieren',
    'importHub.fileSubtitle': 'PDF, Markdown, Klartext oder PowerPoint',
    'importHub.textTitle': 'Bestehenden Text einfügen',
    'importHub.textSubtitle': 'Verwandle kopierte Auszüge in eine neue Notiz',
    'common.close': 'Schließen',
    'common.textFallback': 'Text',
    'status.ready': 'Bereit',
    'status.unsavedChanges': 'Ungespeicherte Änderungen',
    'status.saving': 'Speichere…',
    'status.loaded': 'Gespeichert · {date}',
    'toast.newNoteCreated': 'Neue Notiz erstellt.',
    'toast.noteDuplicated': 'Notiz dupliziert.',
    'toast.noteDeleted': 'Notiz gelöscht.',
    'toast.importedFile': '{name} importiert.',
    'toast.textImported': 'Text importiert.',
    'toast.settingsSaved': 'Einstellungen aktualisiert.',
    'toast.deckListRefreshed': 'Deck-Liste aktualisiert.',
    'toast.ankiOffline': 'AnkiConnect ist noch nicht erreichbar. Die App funktioniert weiterhin offline.',
    'toast.ankiOk': 'AnkiConnect OK · v{version} · {count} Deck(s)',
    'toast.pushedCards': '{count} Karte(n) zu Anki gesendet.',
    'toast.noCardsPushed': 'Es wurden keine Karten gesendet.',
    'toast.exported': '{filename} exportiert.',
    'toast.cardSaved': 'Karte gespeichert.',
    'toast.cardUpdated': 'Karte aktualisiert.',
    'toast.cardDeleted': 'Karte gelöscht.',
    'toast.fastCardReady': 'Kartenentwurf aus der aktuellen Auswahl vorbereitet.',
    'toast.frontCaptured': 'Auswahl zur Vorderseite hinzugefügt.',
    'toast.backCaptured': 'Auswahl zur Rückseite hinzugefügt.',
    'toast.quickCardCleared': 'Schnellkarte geleert.',
    'toast.connectionSettingsSaved': 'Verbindungseinstellungen aktualisiert.',
    'errors.pasteText': 'Füge Text ein, um ihn zu importieren.',
    'errors.selectTextFirst': 'Markiere zuerst Text in der Notiz oder im Quellenbereich.',
    'errors.createOrOpenNoteFirst': 'Erstelle oder öffne zuerst eine Notiz.',
    'errors.frontEmpty': 'Vorderseite / Text darf nicht leer sein.',
    'errors.backEmpty': 'Die Rückseite darf bei Nicht-Cloze-Karten nicht leer sein.',
    'errors.saveCardFirst': 'Speichere zuerst die Karte.',
    'errors.saveCurrentNoteFailed': 'Aktuelle Notiz konnte nicht gespeichert werden: {message}',
    'errors.noActiveNote': 'Keine Notiz geladen.',
    'dialogs.deleteNoteConfirm': 'Diese Notiz und alle gespeicherten Karten löschen?',
    'dialogs.deleteCardConfirm': 'Diese Karte löschen?',
    'unit.cards': 'Karten',
    'unit.words': 'Wörter',
    'unit.chars': 'Zeichen',
    'unit.none': '—',
  },
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : response.text();
};

const debounce = (fn, delay) => {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
};

const parseTags = (value) =>
  (value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

const joinTags = (tags) => (tags || []).join(', ');

const escapeHtml = (value) =>
  String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const currentLanguage = () => state.settings?.language || 'en';
const localeCode = () => (currentLanguage() === 'de' ? 'de-DE' : 'en-US');
const translationLookup = (language, key) => I18N[language]?.[key] ?? I18N.en[key] ?? key;
const interpolate = (template, values = {}) => String(template).replace(/\{(\w+)\}/g, (_, key) => (values[key] ?? `{${key}}`));
const t = (key, values = {}) => interpolate(translationLookup(currentLanguage(), key), values);
const emitNankiEvent = (name, detail = {}) => document.dispatchEvent(new CustomEvent(name, { detail }));

const dismissToast = () => {
  els.toast.classList.add('toast-exit');
  window.clearTimeout(showToast.timer);
  window.setTimeout(() => {
    els.toast.classList.add('hidden');
    els.toast.classList.remove('toast-exit');
  }, 180);
};

const showToast = (message, kind = 'info') => {
  els.toast.textContent = message;
  els.toast.dataset.kind = kind;
  els.toast.classList.remove('hidden', 'toast-exit');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(dismissToast, 3200);
};

const setSaveStatus = (message) => {
  els.saveStatus.textContent = message;
};

const formatTimestamp = (value) => new Date(value).toLocaleString(localeCode());

const editorPlainText = () =>
  (els.noteEditor?.innerText || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\u200b/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const currentWordCount = () => (editorPlainText().match(/\b\w+\b/g) || []).length;

const updateEditorStats = () => {
  const words = currentWordCount();
  const chars = editorPlainText().length;
  els.editorStats.textContent = `${words} ${t('unit.words')} · ${chars} ${t('unit.chars')}`;
};


const updateSourceBadge = () => {
  if (!els.noteSourcePill) return;
  const hasSource = Boolean(state.activeNote?.source?.items?.length || state.activeNote?.source?.file_url);
  els.noteSourcePill.classList.toggle('hidden', !hasSource);
};

const updateEditorEmptyState = () => {
  if (!els.editorEmptyState) return;
  const isEmpty = !editorPlainText();
  const show = isEmpty && !state.editorHasFocus && !state.coverageView;
  els.editorEmptyState.classList.toggle('hidden', !show);
  els.editorShell?.classList.toggle('has-empty-state', show);
};

const updateCoverageToggleButton = () => {
  if (!els.toggleCoverageViewBtn) return;
  els.toggleCoverageViewBtn.textContent = t(state.coverageView ? 'coverage.hideView' : 'coverage.toggleView');
  els.toggleCoverageViewBtn.classList.toggle('active-toggle', state.coverageView);
  els.toggleCoverageViewBtn.setAttribute('aria-pressed', String(state.coverageView));
};

const renderEditorCoverageView = () => {
  if (!els.editorCoverageView || !els.editorShell) return;
  els.editorShell.classList.toggle('coverage-visible', state.coverageView);
  if (!state.coverageView) {
    els.editorCoverageView.classList.add('hidden');
    updateCoverageToggleButton();
    updateEditorEmptyState();
    return;
  }
  els.editorCoverageView.classList.remove('hidden');
  const html = state.coverageReport?.coverage_html || '';
  els.editorCoverageView.innerHTML = html || `<div class="editor-coverage-empty"><span class="section-label">${escapeHtml(t('coverage.title'))}</span><div class="coverage-muted-empty">${escapeHtml(t('coverage.editorEmpty'))}</div></div>`;
  updateCoverageToggleButton();
  updateEditorEmptyState();
};

const resetQuickCard = ({ quiet = false } = {}) => {
  state.quickCard.open = false;
  state.quickCard.front = '';
  state.quickCard.back = '';
  state.quickCard.sourceExcerpt = '';
  state.quickCard.sourceLocator = '';
  state.quickCard.anchor = null;
  renderQuickCardDock();
  if (!quiet) showToast(t('toast.quickCardCleared'));
};

const renderQuickCardDock = () => {
  if (!els.quickCardDock || !els.editorShell) return;
  const open = Boolean(state.quickCard.open);
  els.quickCardDock.classList.toggle('hidden', !open);
  els.editorShell.classList.toggle('has-quick-card', open);
  if (els.quickCardFront && els.quickCardFront.value !== state.quickCard.front) {
    els.quickCardFront.value = state.quickCard.front;
  }
  if (els.quickCardBack && els.quickCardBack.value !== state.quickCard.back) {
    els.quickCardBack.value = state.quickCard.back;
  }
  if (!open) {
    els.quickCardMeta.textContent = t('quickCard.emptyMeta');
    els.quickCardStatus.textContent = t('quickCard.hint');
    emitNankiEvent('nanki:quick-card-render', { open });
    return;
  }
  const meta = [];
  if (state.quickCard.front.trim()) meta.push(t('cards.front'));
  if (state.quickCard.back.trim()) meta.push(t('cards.back'));
  if (state.quickCard.sourceLocator) meta.push(state.quickCard.sourceLocator);
  els.quickCardMeta.textContent = meta.join(' · ') || t('quickCard.emptyMeta');
  els.quickCardStatus.textContent = state.quickCard.front.trim() && state.quickCard.back.trim() ? t('quickCard.ready') : t('quickCard.hint');
  emitNankiEvent('nanki:quick-card-render', { open });
};

const syncQuickCardFromInputs = () => {
  if (!els.quickCardFront || !els.quickCardBack) return;
  state.quickCard.front = els.quickCardFront.value;
  state.quickCard.back = els.quickCardBack.value;
  state.quickCard.open = true;
  renderQuickCardDock();
};

const appendSelectionToQuickCard = (side) => {
  const selection = state.selection;
  if (!selection?.text) {
    showToast(t('errors.selectTextFirst'), 'error');
    return false;
  }
  if (!state.activeNoteId) {
    showToast(t('errors.createOrOpenNoteFirst'), 'error');
    return false;
  }
  state.quickCard.open = true;
  if (side === 'front') {
    state.quickCard.front = state.quickCard.front.trim() ? `${state.quickCard.front.trim()}
${selection.text}` : selection.text;
    state.quickCard.sourceExcerpt = selection.text;
    state.quickCard.sourceLocator = selection.locator || state.quickCard.sourceLocator;
    state.quickCard.anchor = cloneAnchor(selection.anchor);
    showToast(t('toast.frontCaptured'));
  } else {
    state.quickCard.back = state.quickCard.back.trim() ? `${state.quickCard.back.trim()}
${selection.text}` : selection.text;
    if (!state.quickCard.sourceExcerpt) {
      state.quickCard.sourceExcerpt = selection.text;
      state.quickCard.sourceLocator = selection.locator || state.quickCard.sourceLocator;
      state.quickCard.anchor = cloneAnchor(selection.anchor);
    }
    showToast(t('toast.backCaptured'));
  }
  renderQuickCardDock();
  hideSelectionBubble();
  try {
    window.getSelection()?.removeAllRanges();
  } catch {
    // ignore
  }
  return true;
};

const openDrawerFromQuickCard = () => {
  if (!state.quickCard.front.trim() && !state.quickCard.back.trim()) {
    showToast(t('errors.selectTextFirst'), 'error');
    return;
  }
  resetDrawer();
  state.drawer.sourceExcerpt = state.quickCard.sourceExcerpt || state.quickCard.front || state.quickCard.back;
  state.drawer.anchor = cloneAnchor(state.quickCard.anchor);
  els.drawerCardType.value = 'basic';
  els.drawerCardDeck.value = state.activeNote?.meta.default_deck || 'Default';
  els.drawerCardSourceLocator.value = state.quickCard.sourceLocator || '';
  els.drawerCardFront.value = state.quickCard.front.trim();
  els.drawerCardBack.value = state.quickCard.back.trim();
  els.drawerSelectionPreview.textContent = state.quickCard.sourceExcerpt || state.quickCard.front || state.quickCard.back || t('drawer.selectionEmpty');
  els.drawerSelectionMeta.textContent = state.quickCard.sourceLocator || '';
  updateDrawerHeading();
  openDrawer();
};

const getQuickCardPayload = () => ({
  type: 'basic',
  front: state.quickCard.front.trim(),
  back: state.quickCard.back.trim(),
  extra: '',
  tags: [],
  deck_name: state.activeNote?.meta.default_deck || 'Default',
  source_excerpt: state.quickCard.sourceExcerpt || state.quickCard.front.trim() || state.quickCard.back.trim(),
  source_locator: state.quickCard.sourceLocator || '',
  coverage_anchor: cloneAnchor(state.quickCard.anchor),
});

const saveQuickCard = async ({ pushAfterSave = false } = {}) => {
  const payload = getQuickCardPayload();
  if (!validateCardPayload(payload)) return null;
  const saved = await saveCardPayload(payload);
  showToast(t('toast.cardSaved'));
  if (pushAfterSave && saved?.id) {
    await pushCards([saved.id]);
  }
  resetQuickCard({ quiet: true });
  renderQuickCardDock();
  return saved;
};

const toggleCoverageView = async () => {
  if (!state.activeNoteId) {
    showToast(t('errors.noActiveNote'), 'error');
    return;
  }
  if (!state.coverageView) {
    await loadCoverage({ quiet: true });
    state.coverageView = true;
  } else {
    state.coverageView = false;
  }
  renderEditorCoverageView();
};

const applyWorkspaceChrome = () => {
  if (els.workspaceGrid) {
    els.workspaceGrid.classList.toggle('study-open', state.studyOpen);
    els.workspaceGrid.classList.toggle('study-collapsed', !state.studyOpen);
  }
  if (els.studyInspector) {
    els.studyInspector.classList.toggle('hidden', !state.studyOpen);
  }
  if (els.toggleStudyBtn) {
    els.toggleStudyBtn.classList.toggle('active-toggle', state.studyOpen);
    els.toggleStudyBtn.setAttribute('aria-pressed', String(state.studyOpen));
  }
  if (els.noteDetailsPanel) {
    els.noteDetailsPanel.classList.toggle('hidden', !state.noteDetailsOpen);
  }
  if (els.toggleNoteDetailsBtn) {
    els.toggleNoteDetailsBtn.classList.toggle('active-toggle', state.noteDetailsOpen);
    els.toggleNoteDetailsBtn.setAttribute('aria-pressed', String(state.noteDetailsOpen));
  }
};

const openStudyPanel = (panel = state.inspectorPanel || 'cards') => {
  state.studyOpen = true;
  applyWorkspaceChrome();
  selectInspectorPanel(panel);
};

const closeStudyPanel = () => {
  state.studyOpen = false;
  applyWorkspaceChrome();
};

const toggleStudyPanel = () => {
  if (state.studyOpen) closeStudyPanel();
  else openStudyPanel();
};

const toggleNoteDetails = () => {
  state.noteDetailsOpen = !state.noteDetailsOpen;
  applyWorkspaceChrome();
};

const applyTranslations = () => {
  document.documentElement.lang = currentLanguage();
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  if (els.noteEditor?.dataset.placeholderKey) {
    els.noteEditor.dataset.placeholder = t(els.noteEditor.dataset.placeholderKey);
  }
  renderNoteList();
  renderCardList();
  renderCoveragePanel();
  renderAnkiStatus();
  renderAnkiLists();
  updateDrawerHeading();
  renderQuickCardDock();
  updateEditorStats();
  updateSourceBadge();
  updateEditorEmptyState();
  renderEditorCoverageView();
  applyWorkspaceChrome();
};

const noteListItems = () => {
  const term = state.searchTerm.trim().toLowerCase();
  const notes = [...state.notes].sort((a, b) => {
    if (a.meta.pinned !== b.meta.pinned) return a.meta.pinned ? -1 : 1;
    return new Date(b.meta.updated_at) - new Date(a.meta.updated_at);
  });
  if (!term) return notes;
  return notes.filter((note) => {
    const haystack = [note.meta.title, (note.meta.tags || []).join(' '), note.meta.default_deck || '']
      .join(' ')
      .toLowerCase();
    return haystack.includes(term);
  });
};

const renderNoteList = () => {
  if (!els.noteList) return;
  const items = noteListItems();
  els.noteCount.textContent = String(items.length);
  els.noteList.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = t('sidebar.noNotes');
    els.noteList.appendChild(empty);
    return;
  }

  for (const note of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `note-item ${state.activeNoteId === note.meta.id ? 'active' : ''}`;
    button.innerHTML = `
      <div class="note-item-title-row">
        <strong>${escapeHtml(note.meta.title)}</strong>
        <span class="pill">${note.card_count} ${escapeHtml(t('unit.cards'))}</span>
      </div>
      <div class="note-item-sub muted">
        <span>${escapeHtml(note.meta.default_deck || 'Default')}</span>
        <span>${note.word_count} ${escapeHtml(t('unit.words'))}</span>
      </div>
      <div class="note-item-tags">
        ${(note.meta.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        ${note.meta.pinned ? `<span class="tag">${escapeHtml(t('notes.pinned'))}</span>` : ''}
      </div>
    `;
    button.addEventListener('click', () => selectNote(note.meta.id).catch((error) => showToast(error.message, 'error')));
    els.noteList.appendChild(button);
  }
};

const selectInspectorPanel = (panel) => {
  state.inspectorPanel = panel;
  document.querySelectorAll('.inspector-tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.panel === panel);
  });
  document.querySelectorAll('.inspector-panel').forEach((section) => {
    section.classList.toggle('active', section.id === `${panel}-panel`);
  });
  if (panel === 'coverage') {
    loadCoverage().catch((error) => showToast(error.message, 'error'));
  }
};

const refreshDeckDataList = () => {
  els.ankiDecks.innerHTML = '';
  for (const deck of state.decks || []) {
    const option = document.createElement('option');
    option.value = deck;
    els.ankiDecks.appendChild(option);
  }
  renderAnkiLists();
};

const renderAnkiLists = () => {
  if (!els.settingsDeckList) return;
  els.settingsDeckList.innerHTML = '';
  els.settingsModelList.innerHTML = '';
  const build = (container, items) => {
    if (!(items || []).length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = t('settings.noneLoaded');
      container.appendChild(empty);
      return;
    }
    for (const item of items) {
      const chip = document.createElement('span');
      chip.className = 'pill';
      chip.textContent = item;
      container.appendChild(chip);
    }
  };
  build(els.settingsDeckList, state.decks || []);
  build(els.settingsModelList, state.models || []);
};

const renderAnkiStatus = () => {
  if (!els.ankiStatusText) return;
  const info = state.ankiConnectionInfo;
  if (!info) {
    els.ankiStatusText.textContent = t('settings.notTestedYet');
    els.ankiStatusMeta.innerHTML = '';
    return;
  }
  if (!info.ok) {
    els.ankiStatusText.textContent = `${t('settings.connectionFailed')} · ${info.error || ''}`.trim();
    els.ankiStatusMeta.innerHTML = '';
    return;
  }
  els.ankiStatusText.textContent = `${t('settings.connectionOk')} · ${info.url}`;
  els.ankiStatusMeta.innerHTML = [
    `<span class="pill success">${escapeHtml(t('settings.version', { version: info.version ?? '?' }))}</span>`,
    `<span class="pill">${escapeHtml(t('settings.deckCount', { count: (info.decks || []).length }))}</span>`,
    `<span class="pill">${escapeHtml(t('settings.modelCount', { count: (info.models || []).length }))}</span>`,
  ].join('');
};

const normalizeSpace = (text) => String(text || '').replace(/\s+/g, ' ').trim();
const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MARKDOWN_BRIDGE_CHARS = '[\\s*_~`>#\\[\\]()!|]+';

const exactMatches = (content, excerpt) => {
  const matches = [];
  let start = 0;
  while (true) {
    const index = content.indexOf(excerpt, start);
    if (index === -1) break;
    matches.push({ start: index, end: index + excerpt.length, method: 'exact' });
    start = index + 1;
  }
  return matches;
};

const casefoldMatches = (content, excerpt) => {
  const matches = [];
  const haystack = content.toLowerCase();
  const needle = excerpt.toLowerCase();
  let start = 0;
  while (true) {
    const index = haystack.indexOf(needle, start);
    if (index === -1) break;
    matches.push({ start: index, end: index + excerpt.length, method: 'casefold' });
    start = index + 1;
  }
  return matches;
};

const regexMatches = (content, excerpt, allowMarkdownBridges = false) => {
  const parts = excerpt
    .trim()
    .split(/\s+/)
    .map((part) => escapeRegExp(part))
    .filter(Boolean);
  if (!parts.length) return [];
  const joiner = allowMarkdownBridges ? `(?:${MARKDOWN_BRIDGE_CHARS})` : '\\s+';
  const pattern = new RegExp(parts.join(joiner), 'gi');
  const matches = [];
  for (const match of content.matchAll(pattern)) {
    matches.push({ start: match.index, end: match.index + match[0].length, method: allowMarkdownBridges ? 'markdown-bridge' : 'whitespace' });
  }
  return matches;
};

const gatherExcerptMatches = (content, excerpt) => {
  const needle = String(excerpt || '').trim();
  if (!needle) return [];
  for (const matches of [
    exactMatches(content, needle),
    casefoldMatches(content, needle),
    regexMatches(content, needle, false),
    regexMatches(content, needle, true),
  ]) {
    if (matches.length) {
      const unique = new Map();
      for (const match of matches) {
        unique.set(`${match.start}:${match.end}`, match);
      }
      return [...unique.values()];
    }
  }
  return [];
};

const scoreMatch = (content, match, prefixText = '', suffixText = '') => {
  let score = 0;
  const prefix = normalizeSpace(prefixText);
  const suffix = normalizeSpace(suffixText);
  if (prefix) {
    const before = normalizeSpace(content.slice(Math.max(0, match.start - Math.max(180, prefix.length + 16)), match.start));
    if (before.endsWith(prefix)) score += 3;
    else if (before.includes(prefix)) score += 1;
  }
  if (suffix) {
    const after = normalizeSpace(content.slice(match.end, Math.min(content.length, match.end + Math.max(180, suffix.length + 16))));
    if (after.startsWith(suffix)) score += 3;
    else if (after.includes(suffix)) score += 1;
  }
  return score;
};

const locateSelectionInMarkdown = (content, selectedText, prefixText = '', suffixText = '') => {
  const matches = gatherExcerptMatches(content, selectedText);
  if (!matches.length) return null;
  const best = matches
    .slice()
    .sort((a, b) => {
      const aScore = scoreMatch(content, a, prefixText, suffixText);
      const bScore = scoreMatch(content, b, prefixText, suffixText);
      if (aScore !== bScore) return bScore - aScore;
      return (b.end - b.start) - (a.end - a.start);
    })[0];
  return { start: best.start, end: best.end, method: best.method };
};

const sectionLabelAtOffset = (content, offset) => {
  const matches = [...content.matchAll(/^(#{1,6})\s+(.+)$/gm)];
  let current = '';
  for (const match of matches) {
    if (match.index > offset) break;
    current = (match[2] || '').trim();
  }
  return current;
};

const contextAroundSubstring = (containerText, selectedText) => {
  if (!containerText || !selectedText) return { prefix: '', suffix: '' };
  const index = containerText.indexOf(selectedText);
  if (index === -1) return { prefix: '', suffix: '' };
  return {
    prefix: containerText.slice(Math.max(0, index - 90), index),
    suffix: containerText.slice(index + selectedText.length, index + selectedText.length + 90),
  };
};

const rangeContextWithinRoot = (range, root) => {
  const beforeRange = range.cloneRange();
  beforeRange.selectNodeContents(root);
  beforeRange.setEnd(range.startContainer, range.startOffset);

  const afterRange = range.cloneRange();
  afterRange.selectNodeContents(root);
  afterRange.setStart(range.endContainer, range.endOffset);

  const prefix = beforeRange.toString().slice(-90);
  const suffix = afterRange.toString().slice(0, 90);
  return { prefix, suffix };
};

const renderCoveragePanel = () => {
  const report = state.coverageReport;
  if (!report) {
    els.coveragePercent.textContent = '0%';
    els.coverageSummaryText.textContent = t('coverage.noNoteLoaded');
    els.coverageBarFill.style.width = '0%';
    els.coverageStatPills.innerHTML = '';
    els.coverageSections.innerHTML = `<div class="coverage-muted-empty">${escapeHtml(t('coverage.noSectionData'))}</div>`;
    els.coverageGaps.innerHTML = `<div class="coverage-muted-empty">${escapeHtml(t('coverage.noGaps'))}</div>`;
    els.coverageUnmapped.innerHTML = `<div class="coverage-muted-empty">${escapeHtml(t('coverage.noCardMapping'))}</div>`;
    if (els.coverageAnkiMatches) {
      els.coverageAnkiMatches.innerHTML = `<div class="coverage-muted-empty">${escapeHtml(t('coverage.ankiUnavailable'))}</div>`;
    }
    renderEditorCoverageView();
    return;
  }

  const stats = report.stats || {};
  const anki = report.anki || {};
  const coveragePercent = Number(stats.coverage_percent || 0);
  const totalMapped = Number(stats.coverage_card_count ?? stats.mapped_cards ?? 0);
  els.coveragePercent.textContent = `${coveragePercent.toFixed(1)}%`;
  els.coverageSummaryText.textContent = t('coverage.summary', {
    covered: stats.covered_words || 0,
    total: stats.total_words || 0,
    mapped: totalMapped,
  });
  els.coverageBarFill.style.width = `${Math.max(0, Math.min(100, coveragePercent))}%`;
  const ankiPill = anki.available
    ? `<span class="pill success">${escapeHtml(t('coverage.ankiMatched', { count: anki.matched_cards || 0 }))}</span>`
    : `<span class="pill warning">${escapeHtml(t('coverage.ankiUnavailable'))}</span>`;
  els.coverageStatPills.innerHTML = [
    `<span class="pill">${escapeHtml(t('coverage.totalCards', { count: stats.total_cards || 0 }))}</span>`,
    `<span class="pill success">${escapeHtml(t('coverage.mapped', { count: stats.local_mapped_cards || 0 }))}</span>`,
    `<span class="pill warning">${escapeHtml(t('coverage.unmapped', { count: stats.unmapped_cards || 0 }))}</span>`,
    ankiPill,
  ].join('');

  const sections = report.sections || [];
  els.coverageSections.innerHTML = sections.length
    ? sections
        .map(
          (section) => `
            <div class="coverage-list-item">
              <div class="coverage-list-item-header">
                <strong>${escapeHtml(section.title)}</strong>
                <span class="pill">${Number(section.coverage_percent || 0).toFixed(1)}%</span>
              </div>
              <div class="coverage-mini-row muted">
                <span>${escapeHtml(t('coverage.sectionWords', { covered: section.covered_words || 0, total: section.total_words || 0 }))}</span>
                <span>${escapeHtml(t('coverage.sectionCards', { count: (section.card_ids || []).length }))}</span>
              </div>
              <div class="coverage-mini-bar"><span style="width:${Math.max(0, Math.min(100, Number(section.coverage_percent || 0)))}%"></span></div>
            </div>
          `,
        )
        .join('')
    : `<div class="coverage-muted-empty">${escapeHtml(t('coverage.noSectionData'))}</div>`;

  const gaps = report.gaps || [];
  els.coverageGaps.innerHTML = gaps.length
    ? gaps
        .map(
          (gap) => `
            <div class="coverage-list-item">
              <div class="coverage-list-item-header">
                <strong>${escapeHtml(gap.section_title || 'Gap')}</strong>
                <span class="pill warning">${escapeHtml(t('coverage.gapWords', { count: gap.word_count || 0 }))}</span>
              </div>
              <div class="muted">${escapeHtml(gap.excerpt || '')}</div>
            </div>
          `,
        )
        .join('')
    : `<div class="coverage-muted-empty">${escapeHtml(t('coverage.everythingCovered'))}</div>`;

  const unmappedCards = (report.cards || []).filter((card) => card.origin !== 'anki' && !card.mapped);
  els.coverageUnmapped.innerHTML = unmappedCards.length
    ? unmappedCards
        .map(
          (card) => `
            <div class="coverage-list-item">
              <div class="coverage-list-item-header">
                <strong>${escapeHtml((card.front || 'Untitled card').slice(0, 72))}</strong>
                <span class="pill warning">${escapeHtml(t('cards.unmapped'))}</span>
              </div>
              <div class="muted">${escapeHtml(card.source_locator || card.selected_text || t('coverage.noSourceReference'))}</div>
            </div>
          `,
        )
        .join('')
    : `<div class="coverage-muted-empty">${escapeHtml(t('coverage.allMapped'))}</div>`;

  if (els.coverageAnkiMatches) {
    const ankiMatches = (report.cards || []).filter((card) => card.origin === 'anki' && card.mapped);
    els.coverageAnkiMatches.innerHTML = ankiMatches.length
      ? ankiMatches
          .map(
            (card) => `
              <div class="coverage-list-item">
                <div class="coverage-list-item-header">
                  <strong>${escapeHtml((card.front || 'Anki').slice(0, 72))}</strong>
                  <span class="pill success">${escapeHtml(card.deck_name || 'Anki')}</span>
                </div>
                <div class="coverage-mini-row muted">
                  <span>${escapeHtml(card.section_title || t('unit.none'))}</span>
                  <span>${escapeHtml(t('cards.mappedWords', { count: card.covered_words || 0 }))}</span>
                </div>
              </div>
            `,
          )
          .join('')
      : `<div class="coverage-muted-empty">${escapeHtml(anki.available ? t('coverage.noAnkiMatches') : (anki.error || t('coverage.ankiUnavailable')))}</div>`;
    if (anki.available && anki.total_cards) {
      els.coverageAnkiMatches.insertAdjacentHTML(
        'afterbegin',
        `<div class="coverage-list-item"><div class="coverage-list-item-header"><strong>${escapeHtml(t('coverage.ankiScanned', { count: anki.total_cards || 0 }))}</strong><span class="pill">${escapeHtml(t('coverage.ankiMatched', { count: anki.matched_cards || 0 }))}</span></div></div>`,
      );
    }
  }

  renderEditorCoverageView();
};

const coverageCardMap = () => Object.fromEntries(((state.coverageReport?.cards) || []).map((card) => [card.id, card]));

const renderCardList = () => {
  if (!els.cardList) return;
  const cards = state.activeNote?.cards || [];
  els.cardCount.textContent = `${cards.length} ${t('unit.cards')}`;
  els.cardsEmptyHint.classList.toggle('hidden', cards.length > 0);
  els.cardList.innerHTML = '';
  if (!cards.length) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = t('cards.noSavedCards');
    els.cardList.appendChild(empty);
    return;
  }

  const coverageMap = coverageCardMap();

  for (const card of cards) {
    const coverage = coverageMap[card.id] || null;
    const mappedBadge = coverage
      ? coverage.mapped
        ? `<span class="tag success">${escapeHtml(t('cards.mappedWords', { count: coverage.covered_words || 0 }))}</span>`
        : `<span class="tag warning">${escapeHtml(t('cards.unmapped'))}</span>`
      : '';
    const item = document.createElement('div');
    item.className = 'saved-card';
    item.innerHTML = `
      <div class="saved-card-row">
        <strong>${escapeHtml(translationLookup(currentLanguage(), `cardTypes.${card.type}`) || card.type)}</strong>
        <span class="pill">${escapeHtml(card.deck_name || state.activeNote?.meta.default_deck || 'Default')}</span>
      </div>
      <div class="saved-card-body">
        <div>
          <div class="saved-card-label">${escapeHtml(t('cards.frontLabel'))}</div>
          <div>${escapeHtml(card.front || t('unit.none'))}</div>
        </div>
        <div>
          <div class="saved-card-label">${escapeHtml(t('cards.backLabel'))}</div>
          <div>${escapeHtml(card.back || t('unit.none'))}</div>
        </div>
        ${card.extra ? `
          <div>
            <div class="saved-card-label">${escapeHtml(t('cards.extraLabel'))}</div>
            <div>${escapeHtml(card.extra)}</div>
          </div>
        ` : ''}
      </div>
      <div class="saved-card-tags">
        ${(card.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        ${card.source_locator ? `<span class="tag">${escapeHtml(card.source_locator)}</span>` : ''}
        ${coverage?.section_title ? `<span class="tag">${escapeHtml(coverage.section_title)}</span>` : ''}
        ${mappedBadge}
      </div>
      <div class="saved-card-actions">
        <button data-action="edit">${escapeHtml(t('cards.edit'))}</button>
        <button data-action="push">${escapeHtml(t('cards.push'))}</button>
        <button data-action="delete" class="danger">${escapeHtml(t('cards.delete'))}</button>
      </div>
    `;
    item.querySelector('[data-action="edit"]').addEventListener('click', () => openDrawerForCard(card));
    item.querySelector('[data-action="push"]').addEventListener('click', () => pushCards([card.id]).catch((error) => showToast(error.message, 'error')));
    item.querySelector('[data-action="delete"]').addEventListener('click', () => deleteCard(card.id).catch((error) => showToast(error.message, 'error')));
    els.cardList.appendChild(item);
  }
};

const loadSourceViewer = (source) => {
  els.sourceViewer.innerHTML = '';
  els.sourceSummary.textContent = source?.summary || t('source.noSource');
  els.openSourceBtn.classList.add('hidden');
  els.pdfPreview.classList.add('hidden');
  els.pdfPreview.removeAttribute('src');
  updateSourceBadge();
  if (!source) return;
  if (source.file_url) {
    els.openSourceBtn.classList.remove('hidden');
    els.openSourceBtn.onclick = () => window.open(source.file_url, '_blank', 'noopener');
    if (source.source_type === 'pdf') {
      els.pdfPreview.classList.remove('hidden');
      els.pdfPreview.src = source.file_url;
    }
  }
  for (const item of source.items || []) {
    const block = document.createElement('div');
    block.className = 'source-block';
    block.dataset.locator = item.label;
    block.dataset.sourceItemIndex = String(item.index || 0);
    block.innerHTML = `
      <div class="saved-card-row">
        <strong>${escapeHtml(item.label)}</strong>
        <span class="muted">${escapeHtml(t('source.selectTextDirectly'))}</span>
      </div>
      <pre>${escapeHtml(item.text)}</pre>
    `;
    els.sourceViewer.appendChild(block);
  }
};

const loadNoteSource = async (noteId) => {
  if (!noteId) return null;
  const response = await fetchJson(`/api/notes/${noteId}/source`);
  return response?.source || null;
};

const bindNoteMetaFields = (note) => {
  els.noteTitle.value = note.meta.title;
  els.noteTags.value = joinTags(note.meta.tags);
  els.noteDeck.value = note.meta.default_deck || 'Default';
  els.notePinned.checked = Boolean(note.meta.pinned);
};

const renderEditorFromMarkdown = async (markdown) => {
  const result = await fetchJson('/api/render-markdown', {
    method: 'POST',
    body: JSON.stringify({ markdown: markdown || '' }),
  });
  state.editorApplying = true;
  els.noteEditor.innerHTML = (result.html || '').trim();
  if (!els.noteEditor.innerHTML && markdown && markdown.trim()) {
    els.noteEditor.textContent = markdown;
  }
  state.editorApplying = false;
  updateEditorStats();
  updateEditorEmptyState();
};

const updateNoteListEntry = (note) => {
  const entry = {
    meta: note.meta,
    card_count: note.cards.length,
    word_count: (note.content.match(/\b\w+\b/g) || []).length,
  };
  const index = state.notes.findIndex((item) => item.meta.id === note.meta.id);
  if (index >= 0) state.notes[index] = entry;
  else state.notes.unshift(entry);
  renderNoteList();
};

const hydrateActiveNote = async (note, { reloadEditor = true } = {}) => {
  note.source = note.source || (await loadNoteSource(note.meta.id));
  state.activeNote = note;
  state.activeNoteId = note.meta.id;
  state.markdownSnapshot = note.content || '';
  state.markdownDirty = false;
  state.markdownPromise = null;
  bindNoteMetaFields(note);
  updateSourceBadge();
  if (reloadEditor) await renderEditorFromMarkdown(note.content || '');
  loadSourceViewer(note.source);
  updateNoteListEntry(note);
  await loadCoverage({ quiet: true });
  renderCardList();
  setSaveStatus(t('status.loaded', { date: formatTimestamp(note.meta.updated_at) }));
};

const serializeEditorToMarkdown = async () => {
  if (!state.activeNote) return '';
  if (!state.markdownDirty && state.markdownSnapshot !== null) return state.markdownSnapshot;
  if (state.markdownPromise) return state.markdownPromise;
  const html = editorPlainText() ? els.noteEditor.innerHTML : '';
  state.markdownPromise = fetchJson('/api/convert-html', {
    method: 'POST',
    body: JSON.stringify({ html }),
  })
    .then((result) => {
      state.markdownSnapshot = result.markdown || '';
      state.markdownDirty = false;
      return state.markdownSnapshot;
    })
    .finally(() => {
      state.markdownPromise = null;
    });
  return state.markdownPromise;
};

const persistActiveNote = async ({ quiet = false } = {}) => {
  if (!state.activeNote || !state.dirty) return state.activeNote;
  const markdown = await serializeEditorToMarkdown();
  const payload = {
    title: els.noteTitle.value.trim() || t('notes.untitledTitle'),
    tags: parseTags(els.noteTags.value),
    pinned: els.notePinned.checked,
    content: markdown,
    default_deck: els.noteDeck.value.trim() || 'Default',
  };
  if (!quiet) setSaveStatus(t('status.saving'));
  const saved = await fetchJson(`/api/notes/${state.activeNoteId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  state.activeNote = { ...saved, source: state.activeNote.source };
  state.dirty = false;
  state.markdownSnapshot = saved.content || '';
  state.markdownDirty = false;
  updateNoteListEntry(state.activeNote);
  setSaveStatus(t('status.loaded', { date: formatTimestamp(saved.meta.updated_at) }));
  if (state.inspectorPanel === 'coverage' && saved.cards.length) {
    await loadCoverage({ quiet: true });
  }
  return state.activeNote;
};

const scheduleSave = () => {
  if (state.editorApplying) return;
  state.dirty = true;
  setSaveStatus(t('status.unsavedChanges'));
  window.clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(() => {
    persistActiveNote().catch((error) => showToast(error.message, 'error'));
  }, 850);
};

const fetchActiveNote = async ({ reloadEditor = true } = {}) => {
  if (!state.activeNoteId) return null;
  const note = await fetchJson(`/api/notes/${state.activeNoteId}`);
  await hydrateActiveNote(note, { reloadEditor });
  return state.activeNote;
};

const selectNote = async (noteId) => {
  try {
    await persistActiveNote({ quiet: true });
  } catch (error) {
    showToast(t('errors.saveCurrentNoteFailed', { message: error.message }), 'error');
  }
  hideSelectionBubble();
  closeDrawer({ reset: true });
  state.coverageView = false;
  resetQuickCard({ quiet: true });
  const note = await fetchJson(`/api/notes/${noteId}`);
  await hydrateActiveNote(note, { reloadEditor: true });
  emitNankiEvent('nanki:note-selected', { noteId });
};

const clearWorkspaceUi = () => {
  els.noteTitle.value = '';
  els.noteTags.value = '';
  els.noteDeck.value = 'Default';
  els.notePinned.checked = false;
  state.editorApplying = true;
  els.noteEditor.innerHTML = '';
  state.editorApplying = false;
  state.coverageReport = null;
  state.coverageView = false;
  resetQuickCard({ quiet: true });
  updateEditorStats();
  updateSourceBadge();
  updateEditorEmptyState();
  loadSourceViewer(null);
  renderCoveragePanel();
  renderCardList();
  setSaveStatus(t('status.ready'));
};

const createBlankNote = async () => {
  const note = await fetchJson('/api/notes', {
    method: 'POST',
    body: JSON.stringify({ title: t('notes.untitledTitle'), tags: [], content: '', default_deck: 'Default' }),
  });
  state.notes.unshift({ meta: note.meta, card_count: 0, word_count: 0 });
  await selectNote(note.meta.id);
  window.setTimeout(() => els.noteEditor?.focus(), 40);
  showToast(t('toast.newNoteCreated'));
};

const duplicateCurrentNote = async () => {
  if (!state.activeNoteId) return;
  await persistActiveNote({ quiet: true });
  const duplicate = await fetchJson(`/api/notes/${state.activeNoteId}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  state.notes.unshift({
    meta: duplicate.meta,
    card_count: duplicate.cards.length,
    word_count: (duplicate.content.match(/\b\w+\b/g) || []).length,
  });
  await selectNote(duplicate.meta.id);
  showToast(t('toast.noteDuplicated'));
};

const deleteCurrentNote = async () => {
  if (!state.activeNoteId) return;
  if (!window.confirm(t('dialogs.deleteNoteConfirm'))) return;
  const deletedId = state.activeNoteId;
  await fetchJson(`/api/notes/${deletedId}`, { method: 'DELETE' });
  state.notes = state.notes.filter((note) => note.meta.id !== deletedId);
  state.activeNoteId = null;
  state.activeNote = null;
  renderNoteList();
  closeDrawer({ reset: true });
  if (state.notes[0]) await selectNote(state.notes[0].meta.id);
  else clearWorkspaceUi();
  showToast(t('toast.noteDeleted'));
};

const importFile = async (file) => {
  closeImportHubModal();
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/import/file', { method: 'POST', body: formData });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || 'Import failed');
  }
  const note = await response.json();
  state.notes.unshift({ meta: note.meta, card_count: note.cards.length, word_count: (note.content.match(/\b\w+\b/g) || []).length });
  await selectNote(note.meta.id);
  showToast(t('toast.importedFile', { name: file.name }));
};

const importText = async () => {
  closeImportHubModal();
  const title = els.textImportTitle.value.trim() || t('importText.defaultTitle');
  const text = els.textImportContent.value;
  if (!text.trim()) {
    showToast(t('errors.pasteText'), 'error');
    return;
  }
  const note = await fetchJson('/api/import/text', {
    method: 'POST',
    body: JSON.stringify({
      title,
      text,
      tags: parseTags(els.textImportTags.value),
      source_type: els.textImportType.value,
      default_deck: state.activeNote?.meta.default_deck || 'Default',
    }),
  });
  els.textImportTitle.value = '';
  els.textImportTags.value = '';
  els.textImportContent.value = '';
  closeImportModal();
  state.notes.unshift({ meta: note.meta, card_count: note.cards.length, word_count: (note.content.match(/\b\w+\b/g) || []).length });
  await selectNote(note.meta.id);
  showToast(t('toast.textImported'));
};

const applySettingsToInputs = () => {
  els.workspacePath.value = state.settings.workspace_path || '';
  els.settingsLanguage.value = state.settings.language || 'en';
  els.settingsAnkiUrl.value = state.settings.anki_url || 'http://127.0.0.1:8765';
  els.settingsAutoSync.checked = Boolean(state.settings.auto_sync);
};

const loadSettings = async () => {
  state.settings = await fetchJson('/api/settings');
  applySettingsToInputs();
  applyTranslations();
  emitNankiEvent('nanki:settings-changed', { source: 'load' });
};

const collectSettingsPayload = () => ({
  ...state.settings,
  workspace_path: els.workspacePath.value.trim() || state.settings.workspace_path,
  anki_url: els.settingsAnkiUrl.value.trim() || 'http://127.0.0.1:8765',
  auto_sync: els.settingsAutoSync.checked,
  language: els.settingsLanguage.value,
});

const saveSettings = async ({ quiet = false, reloadNotes = true } = {}) => {
  const payload = collectSettingsPayload();
  const workspaceChanged = payload.workspace_path !== state.settings.workspace_path;
  state.settings = await fetchJson('/api/settings', { method: 'PUT', body: JSON.stringify(payload) });
  applySettingsToInputs();
  applyTranslations();
  if (!quiet) showToast(t('toast.settingsSaved'));
  if (reloadNotes && workspaceChanged) {
    state.activeNoteId = null;
    state.activeNote = null;
    await loadNotes();
  }
  emitNankiEvent('nanki:settings-changed', { source: 'save' });
  return state.settings;
};

const loadNotes = async () => {
  state.notes = await fetchJson('/api/notes');
  renderNoteList();
  if (state.activeNoteId) {
    const stillExists = state.notes.some((note) => note.meta.id === state.activeNoteId);
    if (stillExists) {
      await selectNote(state.activeNoteId);
      return;
    }
  }
  if (state.notes.length) {
    await selectNote(state.notes[0].meta.id);
    return;
  }
  clearWorkspaceUi();
};

const testAnki = async () => {
  await saveSettings({ quiet: true, reloadNotes: false });
  const result = await fetchJson('/api/anki/test', { method: 'POST' });
  state.decks = result.decks || [];
  state.models = result.models || [];
  state.ankiConnectionInfo = { ok: true, ...result };
  refreshDeckDataList();
  renderAnkiStatus();
  showToast(t('toast.ankiOk', { version: result.version, count: state.decks.length }));
};

const refreshAnkiDecks = async ({ quiet = false } = {}) => {
  await saveSettings({ quiet: true, reloadNotes: false });
  const result = await fetchJson('/api/anki/decks');
  state.decks = result.decks || [];
  state.models = result.models || [];
  state.ankiConnectionInfo = {
    ok: true,
    version: state.ankiConnectionInfo?.version ?? '?',
    decks: state.decks,
    models: state.models,
    url: els.settingsAnkiUrl.value.trim() || state.settings?.anki_url,
  };
  refreshDeckDataList();
  renderAnkiStatus();
  if (!quiet) showToast(t('toast.deckListRefreshed'));
};

const loadCoverage = async ({ quiet = false } = {}) => {
  if (!state.activeNoteId) {
    state.coverageReport = null;
    renderCoveragePanel();
    return null;
  }
  const report = await fetchJson(`/api/notes/${state.activeNoteId}/coverage`);
  state.coverageReport = report;
  renderCoveragePanel();
  renderCardList();
  if (!quiet && state.inspectorPanel === 'coverage') {
    // no toast needed, just keep panel current
  }
  return report;
};

const cloneAnchor = (anchor) => (anchor ? JSON.parse(JSON.stringify(anchor)) : null);

const smartSplitSelection = (text) => {
  const separators = ['::', '\t', ' — ', ' – ', ' - ', ': '];
  for (const separator of separators) {
    if (text.includes(separator)) {
      const [front, ...rest] = text.split(separator);
      const back = rest.join(separator).trim();
      if (front.trim() && back) return { front: front.trim(), back };
    }
  }
  return { front: '', back: text.trim() };
};

const buildClozeFromSelection = (selection) => {
  const selected = selection?.text?.trim() || '';
  if (!selected) return '';
  if (selected.includes('{{c')) return selected;
  const prefix = normalizeSpace(selection.anchor?.prefix_text || '');
  const suffix = normalizeSpace(selection.anchor?.suffix_text || '');
  const prefixTail = (prefix.split(/(?<=[.!?])\s+/).pop() || prefix).slice(-120);
  const suffixHead = (suffix.split(/(?<=[.!?])\s+/)[0] || suffix).slice(0, 120);
  const context = [prefixTail, selected, suffixHead].filter(Boolean).join(' ').trim();
  if (!context || context === selected) return `{{c1::${selected}}}`;
  const index = context.indexOf(selected);
  if (index === -1) return `{{c1::${selected}}}`;
  return `${context.slice(0, index)}{{c1::${selected}}}${context.slice(index + selected.length)}`.trim();
};

const resetDrawer = () => {
  state.drawer.editingId = null;
  state.drawer.sourceExcerpt = '';
  state.drawer.anchor = null;
  els.drawerCardType.value = 'basic';
  els.drawerCardDeck.value = state.activeNote?.meta.default_deck || 'Default';
  els.drawerCardTags.value = '';
  els.drawerCardFront.value = '';
  els.drawerCardBack.value = '';
  els.drawerCardExtra.value = '';
  els.drawerCardSourceLocator.value = '';
  els.drawerSelectionPreview.textContent = t('drawer.selectionEmpty');
  els.drawerSelectionMeta.textContent = '';
  els.drawerDeleteBtn.classList.add('hidden');
  updateDrawerHeading();
};

const updateDrawerHeading = () => {
  els.drawerTitle.textContent = state.drawer.editingId ? t('drawer.editCardTitle') : t('drawer.newCardTitle');
  if (!state.drawer.editingId && !state.drawer.sourceExcerpt) {
    els.drawerStatus.textContent = t('drawer.subtitle');
  } else if (state.drawer.editingId) {
    els.drawerStatus.textContent = t('drawer.subtitle');
  }
};

const openDrawer = () => {
  els.cardDrawer.classList.remove('hidden');
  state.drawer.open = true;
};

const closeDrawer = ({ reset = false } = {}) => {
  els.cardDrawer.classList.add('hidden');
  state.drawer.open = false;
  if (reset) resetDrawer();
};

const fillDrawerFromSelection = (mode) => {
  const selection = state.selection;
  if (!selection?.text) {
    showToast(t('errors.selectTextFirst'), 'error');
    return false;
  }
  if (!state.activeNoteId) {
    showToast(t('errors.createOrOpenNoteFirst'), 'error');
    return false;
  }
  const shouldReset = !state.drawer.open || mode === 'basic' || mode === 'cloze' || Boolean(state.drawer.editingId);
  if (shouldReset) {
    resetDrawer();
  }
  state.drawer.editingId = null;
  state.drawer.sourceExcerpt = selection.text;
  state.drawer.anchor = cloneAnchor(selection.anchor);
  els.drawerCardDeck.value = els.drawerCardDeck.value.trim() || state.activeNote?.meta.default_deck || 'Default';
  els.drawerCardSourceLocator.value = selection.locator || '';
  els.drawerSelectionPreview.textContent = selection.text;
  els.drawerSelectionMeta.textContent = [selection.metaKey ? t(selection.metaKey) : '', selection.locator].filter(Boolean).join(' · ');
  els.drawerDeleteBtn.classList.add('hidden');

  if (mode === 'basic') {
    const split = smartSplitSelection(selection.text);
    els.drawerCardType.value = 'basic';
    els.drawerCardFront.value = split.front;
    els.drawerCardBack.value = split.back;
    els.drawerCardExtra.value = '';
    openDrawer();
    if (els.drawerCardFront.value.trim()) els.drawerCardBack.focus();
    else els.drawerCardFront.focus();
  } else if (mode === 'cloze') {
    els.drawerCardType.value = 'cloze';
    els.drawerCardFront.value = buildClozeFromSelection(selection);
    els.drawerCardBack.value = '';
    if (!els.drawerCardExtra.value.trim()) {
      els.drawerCardExtra.value = state.activeNote?.meta.title || '';
    }
    openDrawer();
    els.drawerCardFront.focus();
  } else if (mode === 'front') {
    return appendSelectionToQuickCard('front');
  } else if (mode === 'back') {
    return appendSelectionToQuickCard('back');
  }
  updateDrawerHeading();
  showToast(t('toast.fastCardReady'));
  return true;
};

const openBlankCardDrawer = () => {
  resetDrawer();
  openDrawer();
  els.drawerCardFront.focus();
};

const openDrawerForCard = (card) => {
  state.drawer.editingId = card.id;
  state.drawer.sourceExcerpt = card.source_excerpt || '';
  state.drawer.anchor = cloneAnchor(card.coverage_anchor);
  els.drawerCardType.value = card.type || 'basic';
  els.drawerCardDeck.value = card.deck_name || state.activeNote?.meta.default_deck || 'Default';
  els.drawerCardTags.value = joinTags(card.tags);
  els.drawerCardFront.value = card.front || '';
  els.drawerCardBack.value = card.back || '';
  els.drawerCardExtra.value = card.extra || '';
  els.drawerCardSourceLocator.value = card.source_locator || '';
  els.drawerSelectionPreview.textContent = card.source_excerpt || card.front || t('drawer.selectionEmpty');
  els.drawerSelectionMeta.textContent = card.source_locator || '';
  els.drawerDeleteBtn.classList.remove('hidden');
  updateDrawerHeading();
  openDrawer();
};

const getDrawerPayload = () => ({
  type: els.drawerCardType.value,
  front: els.drawerCardFront.value.trim(),
  back: els.drawerCardBack.value.trim(),
  extra: els.drawerCardExtra.value.trim(),
  tags: parseTags(els.drawerCardTags.value),
  deck_name: els.drawerCardDeck.value.trim() || state.activeNote?.meta.default_deck || 'Default',
  source_excerpt: state.drawer.sourceExcerpt || state.selection?.text || '',
  source_locator: els.drawerCardSourceLocator.value.trim(),
  coverage_anchor: cloneAnchor(state.drawer.anchor),
});

const validateCardPayload = (payload) => {
  if (!payload.front) {
    showToast(t('errors.frontEmpty'), 'error');
    return false;
  }
  if (payload.type !== 'cloze' && !payload.back) {
    showToast(t('errors.backEmpty'), 'error');
    return false;
  }
  return true;
};

const saveCardPayload = async (payload, cardId = null) => {
  if (!state.activeNoteId) {
    showToast(t('errors.createOrOpenNoteFirst'), 'error');
    return null;
  }
  await persistActiveNote({ quiet: true });
  const url = cardId ? `/api/notes/${state.activeNoteId}/cards/${cardId}` : `/api/notes/${state.activeNoteId}/cards`;
  const method = cardId ? 'PUT' : 'POST';
  const saved = await fetchJson(url, { method, body: JSON.stringify(payload) });
  await fetchActiveNote({ reloadEditor: false });
  return saved;
};

const saveDrawerCard = async ({ pushAfterSave = false } = {}) => {
  const payload = getDrawerPayload();
  if (!validateCardPayload(payload)) return null;
  const editingId = state.drawer.editingId;
  const saved = await saveCardPayload(payload, editingId);
  showToast(t(editingId ? 'toast.cardUpdated' : 'toast.cardSaved'));
  if (pushAfterSave && saved?.id) {
    await pushCards([saved.id]);
  }
  closeDrawer({ reset: true });
  return saved;
};

const deleteCard = async (cardId) => {
  if (!window.confirm(t('dialogs.deleteCardConfirm'))) return;
  await fetchJson(`/api/notes/${state.activeNoteId}/cards/${cardId}`, { method: 'DELETE' });
  await fetchActiveNote({ reloadEditor: false });
  showToast(t('toast.cardDeleted'));
};

const deleteDrawerCard = async () => {
  if (!state.drawer.editingId) return;
  await deleteCard(state.drawer.editingId);
  closeDrawer({ reset: true });
};

const quickCreateClozeFromSelection = async () => {
  if (!fillDrawerFromSelection('cloze')) return;
  await saveDrawerCard();
};

const pushCards = async (cardIds = null) => {
  if (!state.activeNoteId) return;
  await persistActiveNote({ quiet: true });
  const result = await fetchJson(`/api/notes/${state.activeNoteId}/cards/push`, {
    method: 'POST',
    body: JSON.stringify({ card_ids: cardIds, sync_after_push: Boolean(state.settings?.auto_sync) }),
  });
  await fetchActiveNote({ reloadEditor: false });
  if (result.pushed?.length) showToast(t('toast.pushedCards', { count: result.pushed.length }));
  else showToast(result.skipped?.[0]?.reason || t('toast.noCardsPushed'), 'error');
};

const exportCards = async (kind) => {
  if (!state.activeNoteId) return;
  await persistActiveNote({ quiet: true });
  const endpoint = { csv: 'csv', txt: 'anki-txt', apkg: 'apkg' }[kind];
  const result = await fetchJson(`/api/notes/${state.activeNoteId}/cards/export/${endpoint}`, { method: 'POST' });
  window.open(result.url, '_blank', 'noopener');
  showToast(t('toast.exported', { filename: result.filename }));
};

const hideSelectionBubble = () => {
  els.selectionBubble.classList.add('hidden');
};

const showSelectionBubbleAt = (rect) => {
  const bubble = els.selectionBubble;
  bubble.classList.remove('hidden');
  const bubbleWidth = bubble.offsetWidth || 320;
  const bubbleHeight = bubble.offsetHeight || 52;
  let left = rect.left + rect.width / 2 - bubbleWidth / 2;
  left = Math.max(12, Math.min(window.innerWidth - bubbleWidth - 12, left));
  let top = rect.top - bubbleHeight - 12;
  if (top < 12) top = rect.bottom + 12;
  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
};

const refreshSelectionState = debounce(async () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    hideSelectionBubble();
    return;
  }
  const text = selection.toString().trim();
  if (!text) {
    hideSelectionBubble();
    return;
  }
  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement;
  if (!container) {
    hideSelectionBubble();
    return;
  }

  const sourceBlock = container.closest('.source-block');
  const editor = container.closest('#note-editor');
  if (!sourceBlock && !editor) {
    hideSelectionBubble();
    return;
  }

  const token = ++state.selectionToken;
  const rect = range.getBoundingClientRect();

  if (sourceBlock) {
    const containerText = sourceBlock.querySelector('pre')?.textContent || sourceBlock.textContent || '';
    const context = contextAroundSubstring(containerText, text);
    state.selection = {
      text,
      source: 'source',
      metaKey: 'selection.importedSource',
      locator: sourceBlock.dataset.locator || '',
      anchor: {
        source: 'source',
        selected_text: text,
        prefix_text: context.prefix,
        suffix_text: context.suffix,
        raw_start: null,
        raw_end: null,
        note_start: null,
        note_end: null,
        source_item_index: Number(sourceBlock.dataset.sourceItemIndex || 0) || null,
        source_item_label: sourceBlock.dataset.locator || '',
      },
    };
    showSelectionBubbleAt(rect);
    return;
  }

  if (editor) {
    const context = rangeContextWithinRoot(range, els.noteEditor);
    const markdown = await serializeEditorToMarkdown();
    if (token !== state.selectionToken) return;
    const resolved = locateSelectionInMarkdown(markdown, text, context.prefix, context.suffix);
    state.selection = {
      text,
      source: 'editor',
      metaKey: 'selection.editorSelection',
      locator: resolved ? sectionLabelAtOffset(markdown, resolved.start) : '',
      anchor: {
        source: 'editor',
        selected_text: text,
        prefix_text: context.prefix,
        suffix_text: context.suffix,
        raw_start: resolved?.start ?? null,
        raw_end: resolved?.end ?? null,
        note_start: null,
        note_end: null,
        source_item_index: null,
        source_item_label: resolved ? sectionLabelAtOffset(markdown, resolved.start) : '',
      },
    };
    showSelectionBubbleAt(rect);
  }
}, 60);

const execEditorCommand = (command, value = null) => {
  els.noteEditor.focus();
  document.execCommand(command, false, value);
  state.markdownDirty = true;
  scheduleSave();
  updateEditorStats();
};

const wrapEditorSelectionInCode = () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
  const container = selection.anchorNode?.parentElement;
  if (!container?.closest('#note-editor')) return;
  const text = selection.toString() || t('common.textFallback');
  document.execCommand('insertHTML', false, `<code>${escapeHtml(text)}</code>`);
  state.markdownDirty = true;
  scheduleSave();
  updateEditorStats();
};

const closestEditorBlock = (node) => {
  let current = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
  while (current && current !== els.noteEditor) {
    if (['P', 'DIV', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'LI'].includes(current.tagName)) return current;
    current = current.parentElement;
  }
  return null;
};

const placeCaretAtStart = (element) => {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
};

const markEditorChanged = () => {
  state.markdownDirty = true;
  scheduleSave();
  updateEditorStats();
  updateEditorEmptyState();
};

const replaceBlockForInputRule = (block, type) => {
  let replacement = null;
  let focusTarget = null;
  if (type === 'ul' || type === 'ol') {
    replacement = document.createElement(type);
    const listItem = document.createElement('li');
    listItem.appendChild(document.createElement('br'));
    replacement.appendChild(listItem);
    focusTarget = listItem;
  } else if (type === 'blockquote') {
    replacement = document.createElement('blockquote');
    const paragraph = document.createElement('p');
    paragraph.appendChild(document.createElement('br'));
    replacement.appendChild(paragraph);
    focusTarget = paragraph;
  } else {
    replacement = document.createElement(type);
    replacement.appendChild(document.createElement('br'));
    focusTarget = replacement;
  }
  block.replaceWith(replacement);
  placeCaretAtStart(focusTarget);
  markEditorChanged();
};

const applyEditorInputRule = (event) => {
  if (event.key !== ' ' || event.altKey || event.ctrlKey || event.metaKey) return false;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;
  const anchorElement = selection.anchorNode?.parentElement;
  if (!anchorElement?.closest('#note-editor')) return false;
  const range = selection.getRangeAt(0);
  const block = closestEditorBlock(range.startContainer);
  if (!block) return false;
  const beforeRange = range.cloneRange();
  beforeRange.selectNodeContents(block);
  beforeRange.setEnd(range.startContainer, range.startOffset);
  const beforeText = beforeRange.toString().replace(/ /g, ' ').trim();
  const blockText = (block.textContent || '').replace(/ /g, ' ').trim();
  if (!beforeText || beforeText !== blockText) return false;
  const triggerMap = {
    '#': 'h1',
    '##': 'h2',
    '###': 'h3',
    '-': 'ul',
    '*': 'ul',
    '>': 'blockquote',
    '1.': 'ol',
  };
  const type = triggerMap[beforeText];
  if (!type) return false;
  event.preventDefault();
  replaceBlockForInputRule(block, type);
  return true;
};

const handleEditorKeydown = (event) => {
  applyEditorInputRule(event);
};

const handleEditorPaste = (event) => {
  event.preventDefault();
  const text = event.clipboardData?.getData('text/plain') || '';
  document.execCommand('insertText', false, text);
};

const openSettingsModal = () => {
  els.settingsModal.classList.remove('hidden');
};

const closeSettingsModal = () => {
  els.settingsModal.classList.add('hidden');
};

const openImportModal = () => {
  closeImportHubModal();
  els.textImportModal.classList.remove('hidden');
};

const closeImportModal = () => {
  els.textImportModal.classList.add('hidden');
};


const openImportHubModal = () => {
  els.importHubModal.classList.remove('hidden');
};

const closeImportHubModal = () => {
  els.importHubModal.classList.add('hidden');
};

const handleGlobalShortcuts = (event) => {
  const modifier = event.metaKey || event.ctrlKey;
  const key = event.key.toLowerCase();
  const code = event.code || '';
  if (key === 'escape') {
    if (state.drawer.open) { closeDrawer({ reset: true }); return; }
    const aiModal = document.getElementById('ai-modal');
    if (aiModal && !aiModal.classList.contains('hidden')) { aiModal.classList.add('hidden'); return; }
    if (!els.settingsModal.classList.contains('hidden')) { closeSettingsModal(); return; }
    if (!els.textImportModal.classList.contains('hidden')) { closeImportModal(); return; }
    if (!els.importHubModal.classList.contains('hidden')) { closeImportHubModal(); return; }
    if (state.coverageView) { state.coverageView = false; renderEditorCoverageView(); return; }
    return;
  }
  if (modifier && key === 's' && !event.shiftKey) {
    event.preventDefault();
    persistActiveNote().catch((error) => showToast(error.message, 'error'));
    return;
  }
  if (modifier && key === 'n' && !event.shiftKey) {
    event.preventDefault();
    createBlankNote().catch((error) => showToast(error.message, 'error'));
    return;
  }
  if (modifier && event.shiftKey && key === 'k') {
    event.preventDefault();
    fillDrawerFromSelection('basic');
    return;
  }
  if (modifier && event.shiftKey && key === 'c') {
    event.preventDefault();
    quickCreateClozeFromSelection().catch((error) => showToast(error.message, 'error'));
    return;
  }
  if (modifier && event.shiftKey && code === 'Digit1') {
    event.preventDefault();
    appendSelectionToQuickCard('front');
    return;
  }
  if (modifier && event.shiftKey && code === 'Digit2') {
    event.preventDefault();
    appendSelectionToQuickCard('back');
    return;
  }
  if (state.drawer.open && modifier && key === 'enter' && event.shiftKey) {
    event.preventDefault();
    saveDrawerCard({ pushAfterSave: true }).catch((error) => showToast(error.message, 'error'));
    return;
  }
  if (state.drawer.open && modifier && key === 'enter') {
    event.preventDefault();
    saveDrawerCard().catch((error) => showToast(error.message, 'error'));
    return;
  }
  if (!state.drawer.open && state.quickCard.open && modifier && key === 'enter' && event.shiftKey) {
    event.preventDefault();
    saveQuickCard({ pushAfterSave: true }).catch((error) => showToast(error.message, 'error'));
    return;
  }
  if (!state.drawer.open && state.quickCard.open && modifier && key === 'enter') {
    event.preventDefault();
    saveQuickCard().catch((error) => showToast(error.message, 'error'));
  }
};

const bindEvents = () => {
  document.querySelectorAll('.inspector-tab').forEach((button) => {
    button.addEventListener('click', () => selectInspectorPanel(button.dataset.panel));
  });

  els.newNoteBtn.addEventListener('click', () => createBlankNote().catch((error) => showToast(error.message, 'error')));
  els.duplicateNoteBtn.addEventListener('click', () => duplicateCurrentNote().catch((error) => showToast(error.message, 'error')));
  els.deleteNoteBtn.addEventListener('click', () => deleteCurrentNote().catch((error) => showToast(error.message, 'error')));

  const triggerFileImport = () => {
    closeImportHubModal();
    els.fileInput.click();
  };

  els.openImportHubBtn.addEventListener('click', openImportHubModal);
  els.focusEditorBtn.addEventListener('click', () => els.noteEditor.focus());
  els.emptyImportFileBtn.addEventListener('click', triggerFileImport);
  els.emptyImportTextBtn.addEventListener('click', openImportModal);
  els.importHubFileBtn.addEventListener('click', triggerFileImport);
  els.importHubTextBtn.addEventListener('click', openImportModal);
  els.importHubCloseBtn.addEventListener('click', closeImportHubModal);

  els.fileInput.addEventListener('change', async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    try {
      await importFile(file);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      els.fileInput.value = '';
    }
  });

  els.textImportSubmitBtn.addEventListener('click', () => importText().catch((error) => showToast(error.message, 'error')));
  els.textImportCloseBtn.addEventListener('click', closeImportModal);
  els.noteSearch.addEventListener('input', (event) => {
    state.searchTerm = event.target.value;
    renderNoteList();
  });

  [els.noteTitle, els.noteTags, els.noteDeck, els.notePinned].forEach((control) => {
    control.addEventListener('input', scheduleSave);
    control.addEventListener('change', scheduleSave);
  });

  els.toggleNoteDetailsBtn.addEventListener('click', toggleNoteDetails);
  els.toggleStudyBtn.addEventListener('click', toggleStudyPanel);
  els.closeStudyBtn.addEventListener('click', closeStudyPanel);

  els.noteEditor.addEventListener('input', () => {
    if (state.editorApplying) return;
    state.markdownDirty = true;
    scheduleSave();
    updateEditorStats();
    updateEditorEmptyState();
  });
  els.noteEditor.addEventListener('focus', () => {
    state.editorHasFocus = true;
    updateEditorEmptyState();
  });
  els.noteEditor.addEventListener('blur', () => {
    state.editorHasFocus = false;
    window.setTimeout(updateEditorEmptyState, 0);
  });
  els.noteEditor.addEventListener('keydown', handleEditorKeydown);
  els.noteEditor.addEventListener('paste', handleEditorPaste);
  els.noteEditor.addEventListener('mouseup', () => refreshSelectionState());
  els.noteEditor.addEventListener('keyup', () => refreshSelectionState());

  els.toggleCoverageViewBtn.addEventListener('click', () => toggleCoverageView().catch((error) => showToast(error.message, 'error')));

  els.pushAllBtn.addEventListener('click', () => pushCards().catch((error) => showToast(error.message, 'error')));
  els.refreshCoverageBtn.addEventListener('click', () => loadCoverage().catch((error) => showToast(error.message, 'error')));

  els.newCardBtn.addEventListener('click', openBlankCardDrawer);
  els.drawerCloseBtn.addEventListener('click', () => closeDrawer({ reset: true }));
  els.drawerSaveBtn.addEventListener('click', () => saveDrawerCard().catch((error) => showToast(error.message, 'error')));
  els.drawerSavePushBtn.addEventListener('click', () => saveDrawerCard({ pushAfterSave: true }).catch((error) => showToast(error.message, 'error')));
  els.drawerDeleteBtn.addEventListener('click', () => deleteDrawerCard().catch((error) => showToast(error.message, 'error')));

  els.quickCardFront.addEventListener('input', syncQuickCardFromInputs);
  els.quickCardBack.addEventListener('input', syncQuickCardFromInputs);
  els.quickCardClearBtn.addEventListener('click', () => resetQuickCard());
  els.quickCardExpandBtn.addEventListener('click', openDrawerFromQuickCard);
  els.quickCardSaveBtn.addEventListener('click', () => saveQuickCard().catch((error) => showToast(error.message, 'error')));
  els.quickCardSavePushBtn.addEventListener('click', () => saveQuickCard({ pushAfterSave: true }).catch((error) => showToast(error.message, 'error')));

  els.exportCsvBtn.addEventListener('click', () => exportCards('csv').catch((error) => showToast(error.message, 'error')));
  els.exportAnkiBtn.addEventListener('click', () => exportCards('txt').catch((error) => showToast(error.message, 'error')));
  els.exportApkgBtn.addEventListener('click', () => exportCards('apkg').catch((error) => showToast(error.message, 'error')));

  els.selectionBubble.addEventListener('mousedown', (event) => event.preventDefault());
  els.bubbleBasicBtn.addEventListener('click', () => fillDrawerFromSelection('basic'));
  els.bubbleClozeBtn.addEventListener('click', () => fillDrawerFromSelection('cloze'));
  els.bubbleFrontBtn.addEventListener('click', () => fillDrawerFromSelection('front'));
  els.bubbleBackBtn.addEventListener('click', () => fillDrawerFromSelection('back'));

  els.openSettingsBtn.addEventListener('click', openSettingsModal);
  els.settingsCloseBtn.addEventListener('click', closeSettingsModal);
  els.saveSettingsBtn.addEventListener('click', () => saveSettings().catch((error) => showToast(error.message, 'error')));
  els.settingsLanguage.addEventListener('change', () => {
    if (!state.settings) return;
    state.settings.language = els.settingsLanguage.value;
    applyTranslations();
  });
  els.ankiTestBtn.addEventListener('click', () => testAnki().catch((error) => {
    state.ankiConnectionInfo = { ok: false, error: error.message, url: els.settingsAnkiUrl.value.trim() };
    renderAnkiStatus();
    showToast(error.message, 'error');
  }));
  els.ankiRefreshBtn.addEventListener('click', () => refreshAnkiDecks().catch((error) => {
    state.ankiConnectionInfo = { ok: false, error: error.message, url: els.settingsAnkiUrl.value.trim() };
    renderAnkiStatus();
    showToast(error.message, 'error');
  }));

  document.querySelectorAll('[data-close-drawer="true"]').forEach((node) => node.addEventListener('click', () => closeDrawer({ reset: true })));
  document.querySelectorAll('[data-close-settings="true"]').forEach((node) => node.addEventListener('click', closeSettingsModal));
  document.querySelectorAll('[data-close-import="true"]').forEach((node) => node.addEventListener('click', closeImportModal));
  document.querySelectorAll('[data-close-import-hub="true"]').forEach((node) => node.addEventListener('click', closeImportHubModal));

  els.toast.addEventListener('click', dismissToast);

  document.addEventListener('selectionchange', () => refreshSelectionState());
  document.addEventListener('keydown', handleGlobalShortcuts);
  window.addEventListener('resize', hideSelectionBubble);
  window.addEventListener('scroll', hideSelectionBubble, true);
};

const mapElements = () => {
  Object.assign(els, {
    noteSearch: document.getElementById('note-search'),
    newNoteBtn: document.getElementById('new-note-btn'),
    duplicateNoteBtn: document.getElementById('duplicate-note-btn'),
    deleteNoteBtn: document.getElementById('delete-note-btn'),
    openImportHubBtn: document.getElementById('open-import-hub-btn'),
    importHubModal: document.getElementById('import-hub-modal'),
    importHubCloseBtn: document.getElementById('import-hub-close-btn'),
    importHubFileBtn: document.getElementById('import-hub-file-btn'),
    importHubTextBtn: document.getElementById('import-hub-text-btn'),
    focusEditorBtn: document.getElementById('focus-editor-btn'),
    emptyImportFileBtn: document.getElementById('empty-import-file-btn'),
    emptyImportTextBtn: document.getElementById('empty-import-text-btn'),
    noteList: document.getElementById('note-list'),
    noteCount: document.getElementById('note-count'),
    workspaceGrid: document.getElementById('workspace-grid'),
    studyInspector: document.getElementById('study-inspector'),
    noteTitle: document.getElementById('note-title'),
    noteStoragePill: document.getElementById('note-storage-pill'),
    noteSourcePill: document.getElementById('note-source-pill'),
    noteDetailsPanel: document.getElementById('note-details-panel'),
    toggleNoteDetailsBtn: document.getElementById('toggle-note-details-btn'),
    noteTags: document.getElementById('note-tags'),
    noteDeck: document.getElementById('note-deck'),
    notePinned: document.getElementById('note-pinned'),
    toggleStudyBtn: document.getElementById('toggle-study-btn'),
    closeStudyBtn: document.getElementById('close-study-btn'),
    openSettingsBtn: document.getElementById('open-settings-btn'),
    pushAllBtn: document.getElementById('push-all-btn'),
    saveStatus: document.getElementById('save-status'),
    editorStats: document.getElementById('editor-stats'),
    editorShell: document.getElementById('editor-shell'),
    editorEmptyState: document.getElementById('editor-empty-state'),
    editorCoverageView: document.getElementById('editor-coverage-view'),
    noteEditor: document.getElementById('note-editor'),
    toggleCoverageViewBtn: document.getElementById('toggle-coverage-view-btn'),
    quickCardDock: document.getElementById('quick-card-dock'),
    quickCardMeta: document.getElementById('quick-card-meta'),
    quickCardStatus: document.getElementById('quick-card-status'),
    quickCardFront: document.getElementById('quick-card-front'),
    quickCardBack: document.getElementById('quick-card-back'),
    quickCardExpandBtn: document.getElementById('quick-card-expand-btn'),
    quickCardClearBtn: document.getElementById('quick-card-clear-btn'),
    quickCardSaveBtn: document.getElementById('quick-card-save-btn'),
    quickCardSavePushBtn: document.getElementById('quick-card-save-push-btn'),
    cardCount: document.getElementById('card-count'),
    cardsEmptyHint: document.getElementById('cards-empty-hint'),
    cardList: document.getElementById('card-list'),
    newCardBtn: document.getElementById('new-card-btn'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    exportAnkiBtn: document.getElementById('export-anki-btn'),
    exportApkgBtn: document.getElementById('export-apkg-btn'),
    coveragePercent: document.getElementById('coverage-percent'),
    coverageSummaryText: document.getElementById('coverage-summary-text'),
    coverageBarFill: document.getElementById('coverage-bar-fill'),
    coverageStatPills: document.getElementById('coverage-stat-pills'),
    coverageSections: document.getElementById('coverage-sections'),
    coverageGaps: document.getElementById('coverage-gaps'),
    coverageUnmapped: document.getElementById('coverage-unmapped'),
    coverageAnkiMatches: document.getElementById('coverage-anki-matches'),
    refreshCoverageBtn: document.getElementById('refresh-coverage-btn'),
    sourceSummary: document.getElementById('source-summary'),
    sourceViewer: document.getElementById('source-viewer'),
    pdfPreview: document.getElementById('pdf-preview'),
    openSourceBtn: document.getElementById('open-source-btn'),
    selectionBubble: document.getElementById('selection-bubble'),
    bubbleBasicBtn: document.getElementById('bubble-basic-btn'),
    bubbleClozeBtn: document.getElementById('bubble-cloze-btn'),
    bubbleFrontBtn: document.getElementById('bubble-front-btn'),
    bubbleBackBtn: document.getElementById('bubble-back-btn'),
    cardDrawer: document.getElementById('card-drawer'),
    drawerTitle: document.getElementById('drawer-title'),
    drawerStatus: document.getElementById('drawer-status'),
    drawerCloseBtn: document.getElementById('drawer-close-btn'),
    drawerSelectionMeta: document.getElementById('drawer-selection-meta'),
    drawerSelectionPreview: document.getElementById('drawer-selection-preview'),
    drawerCardType: document.getElementById('drawer-card-type'),
    drawerCardDeck: document.getElementById('drawer-card-deck'),
    drawerCardTags: document.getElementById('drawer-card-tags'),
    drawerCardFront: document.getElementById('drawer-card-front'),
    drawerCardBack: document.getElementById('drawer-card-back'),
    drawerCardExtra: document.getElementById('drawer-card-extra'),
    drawerCardSourceLocator: document.getElementById('drawer-card-source-locator'),
    drawerSaveBtn: document.getElementById('drawer-save-btn'),
    drawerSavePushBtn: document.getElementById('drawer-save-push-btn'),
    drawerDeleteBtn: document.getElementById('drawer-delete-btn'),
    settingsModal: document.getElementById('settings-modal'),
    settingsCloseBtn: document.getElementById('settings-close-btn'),
    workspacePath: document.getElementById('workspace-path'),
    settingsLanguage: document.getElementById('settings-language'),
    settingsAnkiUrl: document.getElementById('settings-anki-url'),
    settingsAutoSync: document.getElementById('settings-auto-sync'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),
    ankiTestBtn: document.getElementById('anki-test-btn'),
    ankiRefreshBtn: document.getElementById('anki-refresh-btn'),
    settingsDeckList: document.getElementById('settings-deck-list'),
    settingsModelList: document.getElementById('settings-model-list'),
    ankiStatusText: document.getElementById('anki-status-text'),
    ankiStatusMeta: document.getElementById('anki-status-meta'),
    textImportModal: document.getElementById('text-import-modal'),
    textImportCloseBtn: document.getElementById('text-import-close-btn'),
    textImportTitle: document.getElementById('text-import-title'),
    textImportType: document.getElementById('text-import-type'),
    textImportTags: document.getElementById('text-import-tags'),
    textImportContent: document.getElementById('text-import-content'),
    textImportSubmitBtn: document.getElementById('text-import-submit-btn'),
    fileInput: document.getElementById('file-input'),
    toast: document.getElementById('toast'),
    ankiDecks: document.getElementById('anki-decks'),
  });
};

const init = async () => {
  mapElements();
  bindEvents();
  resetDrawer();
  resetQuickCard({ quiet: true });
  applyWorkspaceChrome();
  updateEditorEmptyState();
  renderCoveragePanel();
  renderQuickCardDock();
  renderEditorCoverageView();
  updateCoverageToggleButton();
  renderCardList();
  try {
    document.execCommand('defaultParagraphSeparator', false, 'p');
  } catch {
    // ignore
  }
  await loadSettings();
  try {
    await refreshAnkiDecks({ quiet: true });
  } catch {
    state.ankiConnectionInfo = { ok: false, error: t('toast.ankiOffline'), url: state.settings?.anki_url };
    renderAnkiStatus();
  }
  await loadNotes();
  if (!state.notes.length) await createBlankNote();
};

window.Nanki = {
  state,
  els,
  t,
  fetchJson,
  showToast,
  saveSettings,
  persistActiveNote,
  saveCardPayload,
  pushCards,
  cloneAnchor,
  renderQuickCardDock,
  openDrawerFromQuickCard,
  openStudyPanel,
  selectInspectorPanel,
};

window.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => {
    console.error(error);
    showToast(error.message, 'error');
  });
});
