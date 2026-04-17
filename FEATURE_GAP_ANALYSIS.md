# FEHLENDE FEATURES: Main Branch → Tauri Branch

## Kritische Features (Core-UX der Main branch)

### 1. Quick Card Dock (NICHT vorhanden)
- Persistentes Dock am Editor-Ende
- Front/Back Textarea-Inputs
- Save Card / Save & Push Buttons
- Clear Button
- Expand-Button (öffnet Card Drawer mit Vorausfüllung)
- Meta-Status-Text zeigt was befuellt ist

### 2. Selection Bubble / Text Selection Popup (NICHT vorhanden)
- Popup bei Textmarkierung im Editor
- Buttons: Basic / Cloze / To Front / To Back
- Auto-Positionierung nahe der Auswahl
- Verschwindet bei Deselection

### 3. Editor Toolbar (NICHT vorhanden)
- Formatierungsbuttons: Bold, Italic, H1, H2, H3, Bullet, Quote, Code, Clear
- Markdown Input Rules (# + Space → H1, - + Space → Liste, > + Space → Zitat)
- Editor Stats (Word Count, Char Count, Read Time)
- Paste als Plain Text

### 4. Theme Toggle (NICHT vorhanden)
- Light / Dark / Auto (System Preference)
- localStorage persistence
- Cycle durch alle 3 Modi

### 5. Duplicate Note (API vorhanden, aber nicht in allen Views)
- Workspace-View hat es
- Editor-View: noch nicht implementiert

### 6. Delete Note aus Sidebar (NICHT vollstaendig)
- Workspace-View implementiert
- Editor-View: fehlt

### 7. Card Drawer mit voller Funktionalitaet (TEILWEISE)
- Source Locator Field
- Extra Field (fuer Cloze)
- Selection Preview im Drawer
- Source Excerpt Anzeige

### 8. Coverage View Toggle (im Editor) (NICHT vorhanden)
- "Show coverage in editor" Button
- Zeigt Coverage-HTML direkt im Editor-Overlay
- Hover-Tooltips fuer Coverage-Tokens
- Klick auf uncovered Spans → Suggest Card

### 9. Export Cards (CSV / TXT / APKG) (NICHT vorhanden)
- Buttons im Cards-Panel
- API-Endpunkte existieren
- Noch keine UI-Buttons

### 10. Note Details Panel (NICHT vorhanden)
- Toggle-Button "Details" in Header
- Zeigt Tags, Deck, Pinned inline im Header

### 11. Study Panel / Inspector (TEILWEISE)
- Cards-Panel: vollstaendig
- Coverage-Panel: vollstaendig  
- Source-Panel: FEHLT (importierte Quelle anzeigen)

### 12. Import Hub (TEILWEISE)
- File Import: vorhanden
- Text Import (Paste): vorhanden
- Import Hub Modal: FEHLT (die Auswahl-UI)

### 13. Onboarding / Tour (NICHT vorhanden)
- Onboarding-Modal beim ersten Start
- Feature-Tour mit Highlights

### 14. Search Notes (TEILWEISE)
- Workspace-View hat Suche
- Editor-View: FEHLT

### 15. Auto-Save mit Debounce (NICHT vorhanden)
- Auto-save nach 850ms
- Save-Status-Anzeige (Ready / Saving / Saved · timestamp)
- Warnung beim Verlassen mit ungespeicherten Aenderungen

## Backend Features
- AI Chat/Explain (API vorhanden, keine UI in Tauri)
- Update Checker (API vorhanden)
- Reset Prompts (API vorhanden)
- Reset APCG Settings (API vorhanden)

## Prioritaeten
P0 - Core-UX: Quick Card Dock, Selection Bubble, Editor Toolbar, Auto-Save
P1 - Wichtig: Theme Toggle, Search, Note Details, Source Panel, Export
P2 - Zusaetzlich: Import Hub Modal, Onboarding, Coverage View Toggle
P3 - Backend-UI: AI Chat, Update Checker
