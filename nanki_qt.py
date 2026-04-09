"""Nanki Desktop App - PyQt6 Native UI (Test Implementation)

This is a test implementation showing how a fully native Qt desktop app would look.
It provides a native UI without web technologies.
"""
import sys
from pathlib import Path
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QSplitter, QTextEdit, QListWidget, QListWidgetItem, QPushButton,
    QLabel, QTabWidget, QLineEdit, QTextBrowser, QComboBox, QMenu,
    QMenuBar, QToolBar, QStatusBar, QMessageBox, QFileDialog,
    QScrollArea, QFrame, QGroupBox, QFormLayout, QSpinBox, QCheckBox,
    QProgressBar, QStackedWidget, QToolButton, QSizePolicy
)
from PyQt6.QtCore import Qt, QTimer, QThread, pyqtSignal
from PyQt6.QtGui import QFont, QAction, QIcon, QKeySequence, QShortcut, QTextCursor
from PyQt6.QtWebEngineWidgets import QWebEngineView


class NoteEditor(QWidget):
    """Markdown note editor panel."""
    
    def __init__(self):
        super().__init__()
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # Toolbar
        toolbar = QHBoxLayout()
        self.save_btn = QPushButton("💾 Speichern")
        self.new_btn = QPushButton("📄 Neu")
        self.pin_btn = QPushButton("📌 Pin")
        toolbar.addWidget(self.new_btn)
        toolbar.addWidget(self.save_btn)
        toolbar.addWidget(self.pin_btn)
        toolbar.addStretch()
        
        # Editor
        self.editor = QTextEdit()
        self.editor.setPlaceholderText("Schreibe deine Notiz hier...\n\nMarkdown wird unterstützt:\n# Überschrift\n**fett**\n*kursiv*\n- Liste")
        self.editor.setFont(QFont("Consolas", 11))
        self.editor.setAcceptRichText(False)
        
        # Status
        self.status_label = QLabel("Keine Notiz geladen")
        self.status_label.setStyleSheet("color: #666; padding: 4px;")
        
        layout.addLayout(toolbar)
        layout.addWidget(self.editor, 1)
        layout.addWidget(self.status_label)
    
    def set_content(self, content: str, title: str = ""):
        self.editor.setPlainText(content)
        self.status_label.setText(title or "Notiz geladen")
    
    def get_content(self) -> str:
        return self.editor.toPlainText()


class CardPanel(QWidget):
    """Flashcard management panel."""
    
    def __init__(self):
        super().__init__()
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # Card list
        self.card_list = QListWidget()
        self.card_list.setPlaceholderText("Keine Karten")
        
        # Card editor
        card_form = QFormLayout()
        self.front_edit = QTextEdit()
        self.front_edit.setPlaceholderText("Vorderseite (Frage)")
        self.front_edit.setMaximumHeight(100)
        self.back_edit = QTextEdit()
        self.back_edit.setPlaceholderText("Rückseite (Antwort)")
        self.back_edit.setMaximumHeight(100)
        
        self.deck_combo = QComboBox()
        self.deck_combo.addItem("Default")
        self.deck_combo.addItem("Neues Deck...")
        
        self.tags_edit = QLineEdit()
        self.tags_edit.setPlaceholderText("tag1, tag2, tag3")
        
        card_form.addRow("Vorderseite:", self.front_edit)
        card_form.addRow("Rückseite:", self.back_edit)
        card_form.addRow("Deck:", self.deck_combo)
        card_form.addRow("Tags:", self.tags_edit)
        
        # Buttons
        btn_layout = QHBoxLayout()
        self.add_btn = QPushButton("+ Neue Karte")
        self.push_btn = QPushButton("📤 Zu Anki")
        self.push_btn.setStyleSheet("background-color: #7c6bf2; color: white; padding: 8px;")
        btn_layout.addWidget(self.add_btn)
        btn_layout.addWidget(self.push_btn)
        
        layout.addWidget(QLabel("📚 Lernkarten"))
        layout.addWidget(self.card_list, 1)
        layout.addLayout(card_form)
        layout.addLayout(btn_layout)


class AIPanel(QWidget):
    """AI chat and generation panel."""
    
    def __init__(self):
        super().__init__()
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # Tabs
        tabs = QTabWidget()
        
        # Chat tab
        chat_widget = QWidget()
        chat_layout = QVBoxLayout(chat_widget)
        self.chat_display = QTextBrowser()
        self.chat_display.setPlaceholderText("KI-Chat wird hier angezeigt...")
        self.chat_input = QLineEdit()
        self.chat_input.setPlaceholderText("Frage stellen...")
        self.chat_input.returnPressed.connect(self.send_chat)
        send_btn = QPushButton("Senden")
        send_btn.clicked.connect(self.send_chat)
        chat_btns = QHBoxLayout()
        chat_btns.addWidget(self.chat_input)
        chat_btns.addWidget(send_btn)
        chat_layout.addWidget(self.chat_display, 1)
        chat_layout.addLayout(chat_btns)
        tabs.addTab(chat_widget, "💬 Chat")
        
        # Generate tab
        gen_widget = QWidget()
        gen_layout = QVBoxLayout(gen_widget)
        gen_layout.addWidget(QLabel("Lernkarten automatisch generieren"))
        self.count_spin = QSpinBox()
        self.count_spin.setRange(1, 20)
        self.count_spin.setValue(5)
        gen_layout.addWidget(QLabel("Anzahl Karten:"))
        gen_layout.addWidget(self.count_spin)
        self.gen_btn = QPushButton("🤖 Generieren")
        self.gen_btn.setStyleSheet("background-color: #7c6bf2; color: white; padding: 10px;")
        gen_layout.addWidget(self.gen_btn)
        gen_layout.addStretch()
        tabs.addTab(gen_widget, "⚡ Generieren")
        
        layout.addWidget(tabs)
    
    def send_chat(self):
        text = self.chat_input.text()
        if text:
            self.chat_display.append(f"<b>Du:</b> {text}")
            self.chat_display.append(f"<b>KI:</b> <i>denkt nach...</i>")
            self.chat_input.clear()


class CoveragePanel(QWidget):
    """Coverage analysis panel."""
    
    def __init__(self):
        super().__init__()
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # Progress bar
        self.progress = QProgressBar()
        self.progress.setValue(0)
        self.progress.setTextVisible(True)
        self.progress.setFormat("%p% abgedeckt")
        
        # Stats
        stats = QGridLayout()
        self.total_cards = QLabel("0")
        self.covered_sections = QLabel("0")
        self.gaps = QLabel("0")
        stats.addWidget(QLabel("Gesamte Karten:"), 0, 0)
        stats.addWidget(self.total_cards, 0, 1)
        stats.addWidget(QLabel("Abgedeckte Abschnitte:"), 1, 0)
        stats.addWidget(self.covered_sections, 1, 1)
        stats.addWidget(QLabel("Lücken:"), 2, 0)
        stats.addWidget(self.gaps, 2, 1)
        
        # Actions
        self.sync_btn = QPushButton("🔄 Mit Anki synchronisieren")
        self.analyze_btn = QPushButton("📊 Analysieren")
        
        layout.addWidget(QLabel("📊 Coverage-Analyse"))
        layout.addWidget(self.progress)
        layout.addLayout(stats)
        layout.addWidget(self.sync_btn)
        layout.addWidget(self.analyze_btn)
        layout.addStretch()


class MainWindow(QMainWindow):
    """Main Nanki window."""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Nanki - Study Workspace")
        self.setMinimumSize(1200, 800)
        self.init_ui()
    
    def init_ui(self):
        # Central widget
        central = QWidget()
        self.setCentralWidget(central)
        layout = QHBoxLayout(central)
        
        # Left sidebar - Note list
        sidebar = QWidget()
        sidebar.setMaximumWidth(250)
        sidebar.setMinimumWidth(180)
        sidebar_layout = QVBoxLayout(sidebar)
        sidebar_layout.setContentsMargins(0, 0, 0, 0)
        
        self.note_list = QListWidget()
        self.note_list.addItem(QListWidgetItem("📖 Erste Schritte"))
        self.note_list.addItem(QListWidgetItem("📝 Projektideen"))
        self.note_list.addItem(QListListItem("🔬 Forschung"))
        
        new_note_btn = QPushButton("+ Neue Notiz")
        new_note_btn.setStyleSheet("background-color: #7c6bf2; color: white;")
        
        sidebar_layout.addWidget(QLabel("📝 Notizen"))
        sidebar_layout.addWidget(self.note_list, 1)
        sidebar_layout.addWidget(new_note_btn)
        
        # Main splitter
        main_splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # Note editor
        self.editor = NoteEditor()
        
        # Right panel - Tabs
        right_tabs = QTabWidget()
        right_tabs.setMaximumWidth(400)
        right_tabs.setMinimumWidth(300)
        
        self.cards = CardPanel()
        self.ai = AIPanel()
        self.coverage = CoveragePanel()
        
        right_tabs.addTab(self.cards, "📚 Karten")
        right_tabs.addTab(self.ai, "🤖 KI")
        right_tabs.addTab(self.coverage, "📊 Coverage")
        
        main_splitter.addWidget(self.editor)
        main_splitter.addWidget(right_tabs)
        main_splitter.setSizes([700, 400])
        
        layout.addWidget(sidebar)
        layout.addWidget(main_splitter, 1)
        
        # Menu bar
        self.create_menus()
        
        # Toolbar
        self.create_toolbar()
        
        # Status bar
        self.statusBar().showMessage("Bereit")
        
        # Apply dark theme
        self.apply_style()
    
    def create_menus(self):
        menubar = self.menuBar()
        
        # File menu
        file_menu = menubar.addMenu("&Datei")
        file_menu.addAction(QAction("Neue Notiz", self, shortcut="Ctrl+N"))
        file_menu.addAction(QAction("Öffnen...", self, shortcut="Ctrl+O"))
        file_menu.addAction(QAction("Speichern", self, shortcut="Ctrl+S"))
        file_menu.addSeparator()
        file_menu.addAction(QAction("Importieren...", self))
        file_menu.addSeparator()
        file_menu.addAction(QAction("Beenden", self, shortcut="Ctrl+Q"))
        
        # Edit menu
        edit_menu = menubar.addMenu("&Bearbeiten")
        edit_menu.addAction(QAction("Rückgängig", self, shortcut="Ctrl+Z"))
        edit_menu.addAction(QAction("Wiederholen", self, shortcut="Ctrl+Y"))
        edit_menu.addSeparator()
        edit_menu.addAction(QAction("Ausschneiden", self, shortcut="Ctrl+X"))
        edit_menu.addAction(QAction("Kopieren", self, shortcut="Ctrl+C"))
        edit_menu.addAction(QAction("Einfügen", self, shortcut="Ctrl+V"))
        
        # Anki menu
        anki_menu = menubar.addMenu("&Anki")
        anki_menu.addAction(QAction("Zu Anki pushen", self))
        anki_menu.addAction(QAction("Mit Anki synchronisieren", self))
        anki_menu.addAction(QAction("Decks verwalten...", self))
        
        # AI menu
        ai_menu = menubar.addMenu("KI")
        ai_menu.addAction(QAction("Karten generieren", self))
        ai_menu.addAction(QAction("Text erklären", self))
        ai_menu.addSeparator()
        ai_menu.addAction(QAction("KI-Einstellungen...", self))
        
        # Help menu
        help_menu = menubar.addMenu("&Hilfe")
        help_menu.addAction(QAction("Dokumentation", self))
        help_menu.addAction(QAction("Wiki", self))
        help_menu.addSeparator()
        help_menu.addAction(QAction("Über Nanki", self))
    
    def create_toolbar(self):
        toolbar = QToolBar()
        toolbar.setMovable(False)
        self.addToolBar(toolbar)
        
        toolbar.addAction("📄 Neu")
        toolbar.addAction("💾 Speichern")
        toolbar.addSeparator()
        toolbar.addAction("📤 Anki")
        toolbar.addAction("🤖 KI")
        toolbar.addSeparator()
        toolbar.addAction("⚙️ Einstellungen")
    
    def apply_style(self):
        """Apply dark theme."""
        self.setStyleSheet("""
            QMainWindow {
                background-color: #1a1a28;
            }
            QWidget {
                background-color: #1a1a28;
                color: #e0e0f0;
            }
            QListWidget {
                background-color: #13131e;
                border: 1px solid #2a2a3a;
                border-radius: 8px;
            }
            QListWidget::item {
                padding: 8px;
                border-radius: 4px;
            }
            QListWidget::item:selected {
                background-color: #7c6bf230;
                border: 1px solid #7c6bf2;
            }
            QListWidget::item:hover {
                background-color: #2a2a3a;
            }
            QTextEdit, QTextBrowser, QLineEdit {
                background-color: #13131e;
                border: 1px solid #2a2a3a;
                border-radius: 6px;
                padding: 8px;
            }
            QPushButton {
                background-color: #2a2a3a;
                border: 1px solid #3a3a4a;
                border-radius: 6px;
                padding: 8px 16px;
            }
            QPushButton:hover {
                background-color: #3a3a4a;
                border-color: #7c6bf2;
            }
            QPushButton:pressed {
                background-color: #7c6bf2;
            }
            QTabWidget::pane {
                border: 1px solid #2a2a3a;
                border-radius: 8px;
            }
            QTabBar::tab {
                background-color: #13131e;
                border: 1px solid #2a2a3a;
                padding: 8px 16px;
                margin-right: 2px;
            }
            QTabBar::tab:selected {
                background-color: #7c6bf220;
                border-color: #7c6bf2;
            }
            QMenuBar {
                background-color: #13131e;
            }
            QMenuBar::item:selected {
                background-color: #7c6bf230;
            }
            QMenu {
                background-color: #1a1a28;
                border: 1px solid #2a2a3a;
            }
            QMenu::item:selected {
                background-color: #7c6bf230;
            }
            QToolBar {
                background-color: #13131e;
                border-bottom: 1px solid #2a2a3a;
                spacing: 8px;
                padding: 4px;
            }
            QStatusBar {
                background-color: #13131e;
                border-top: 1px solid #2a2a3a;
            }
            QProgressBar {
                border: 1px solid #2a2a3a;
                border-radius: 4px;
                text-align: center;
            }
            QProgressBar::chunk {
                background-color: #7c6bf2;
                border-radius: 4px;
            }
            QComboBox, QSpinBox {
                background-color: #13131e;
                border: 1px solid #2a2a3a;
                border-radius: 4px;
                padding: 4px;
            }
        """)


def main():
    """Launch the PyQt desktop application."""
    app = QApplication(sys.argv)
    app.setApplicationName("Nanki")
    app.setApplicationDisplayName("Nanki - Study Workspace")
    
    window = MainWindow()
    window.show()
    
    sys.exit(app.exec())


if __name__ == "__main__":
    main()