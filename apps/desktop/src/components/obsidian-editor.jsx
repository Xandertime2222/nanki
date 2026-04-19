import { useEffect, useRef, useCallback } from "react";
import { EditorView, keymap, ViewPlugin, Decoration } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { indentUnit, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";

// Custom CSS for Obsidian-style live preview
const obsidianEditorTheme = EditorView.theme({
  "&": {
    fontSize: "16px",
    fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace)',
    lineHeight: "1.6",
  },
  ".cm-content": {
    padding: "16px",
    minHeight: "100%",
  },

  ".cm-line": {
    padding: "0 4px",
  },

  // Headings
  "& .cm-header-1": { fontSize: "1.75em", fontWeight: "600", lineHeight: "1.3" },
  "& .cm-header-2": { fontSize: "1.5em", fontWeight: "600", lineHeight: "1.3" },
  "& .cm-header-3": { fontSize: "1.25em", fontWeight: "600", lineHeight: "1.3" },
  "& .cm-header-4": { fontSize: "1.1em", fontWeight: "600" },
  "& .cm-header-5": { fontSize: "1em", fontWeight: "600" },
  "& .cm-header-6": { fontSize: "0.9em", fontWeight: "600" },

  // Code
  "& .cm-inline-code": {
    backgroundColor: "rgba(175, 184, 193, 0.2)",
    padding: "0.2em 0.4em",
    borderRadius: "4px",
    fontSize: "0.9em",
  },

  // Links
  "& .cm-url": { color: "#0969da", textDecoration: "underline" },
  "& .cm-link": { color: "#0969da", textDecoration: "underline", cursor: "pointer" },

  // Emphasis
  "& .cm-emphasis": { fontStyle: "italic" },
  "& .cm-strong": { fontWeight: "600" },

  // Blockquotes
  "& .cm-blockquote": {
    borderLeft: "3px solid var(--border)",
    paddingLeft: "16px",
    color: "var(--muted-foreground)",
    fontStyle: "italic",
  },

  // Lists
  "& .cm-list": { paddingLeft: "24px" },

  // Hide markdown markers (the Obsidian live preview effect)
  "& .cm-formatting": {
    opacity: "0",
    fontSize: "0.85em",
    transition: "opacity 0.15s ease",
  },
  "&.cm-focused .cm-cursorLine .cm-formatting": {
    opacity: "1",
  },

  // Hide heading markers (#) - the # characters at start of header lines
  "& .cm-content .cm-line.cm-header-1::before, & .cm-content .cm-line.cm-header-2::before, & .cm-content .cm-line.cm-header-3::before": {
    content: "''",
    display: "none",
  },

  // Alternative: Target header formatting marks specifically
  "& .cm-content .cm-line .cm-header-marker, & .cm-content .cm-line[class*=cm-header] > span:first-child": {
    opacity: "0",
    transition: "opacity 0.15s ease",
  },
  "&.cm-focused .cm-cursorLine .cm-header-marker, &.cm-focused .cm-cursorLine[class*=cm-header] > span:first-child": {
    opacity: "1",
  },

  // Strikethrough
  "& .cm-strikethrough": { textDecoration: "line-through" },
});

// Plugin to hide header markers (#) on non-active lines
const hideHeaderMarkers = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = this.computeDecorations(view);
    }

    update(update) {
      if (update.selectionSet || update.viewportChanged) {
        this.decorations = this.computeDecorations(update.view);
      }
    }

    computeDecorations(view) {
      const cursorPos = view.state.selection.main.head;
      const cursorLine = view.state.doc.lineAt(cursorPos);
      const decorations = [];

      for (const { from, to } of view.visibleRanges) {
        const startLine = view.state.doc.lineAt(from);
        const endLine = view.state.doc.lineAt(to);

        for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum++) {
          const line = view.state.doc.line(lineNum);
          const lineText = line.text;

          // Skip the current cursor line
          if (lineNum === cursorLine.number) continue;

          // Check for header markers at start of line
          const headerMatch = lineText.match(/^(#{1,6})\s/);
          if (headerMatch) {
            // Hide the # markers by replacing them with empty decoration
            const from = line.from;
            const to = from + headerMatch[1].length;
            decorations.push(
              Decoration.replace({}).range(from, to)
            );
          }
        }
      }

      return Decoration.set(decorations, true);
    }
  },
  { decorations: (v) => v.decorations }
);

// Custom extension to show/hide markdown markers based on cursor position
const hideMarkdownMarkers = EditorView.updateListener.of((update) => {
  if (!update.selectionSet) return;

  const view = update.view;
  const cursorLine = view.state.doc.lineAt(view.state.selection.main.head);

  // Add a data attribute to the editor for CSS targeting
  const dom = view.dom;
  const lines = dom.querySelectorAll('.cm-line');
  lines.forEach((line, index) => {
    const lineNum = view.state.doc.lineAt(view.viewport.from);
    const actualLineNum = lineNum.number + index;
    if (actualLineNum === cursorLine.number) {
      line.classList.add('cm-cursorLine');
    } else {
      line.classList.remove('cm-cursorLine');
    }
  });
});

// Click to edit plugin - allows clicking on rendered content to edit
const clickToEdit = EditorView.domEventHandlers({
  click(event, view) {
    const target = event.target;
    if (target.classList.contains('cm-foldMarker')) return false;

    // Focus the editor
    view.focus();

    // Try to place cursor at click position
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos !== null) {
      view.dispatch({
        selection: { anchor: pos, head: pos },
        scrollIntoView: true,
      });
    }
    return true;
  },
});

// Custom keymap for Obsidian-like shortcuts
const obsidianKeymap = keymap.of([
  {
    key: "Mod-b",
    run: (view) => {
      const selection = view.state.selection.main;
      const text = view.state.doc.sliceString(selection.from, selection.to);
      const newText = text ? `**${text}**` : "**bold**";
      view.dispatch(view.state.replaceSelection(newText));
      // Move cursor inside if empty
      if (!text) {
        view.dispatch({
          selection: { anchor: selection.from + 2, head: selection.from + 2 },
        });
      }
      return true;
    },
  },
  {
    key: "Mod-i",
    run: (view) => {
      const selection = view.state.selection.main;
      const text = view.state.doc.sliceString(selection.from, selection.to);
      const newText = text ? `*${text}*` : "*italic*";
      view.dispatch(view.state.replaceSelection(newText));
      if (!text) {
        view.dispatch({
          selection: { anchor: selection.from + 1, head: selection.from + 1 },
        });
      }
      return true;
    },
  },
  {
    key: "Mod-k",
    run: (view) => {
      const selection = view.state.selection.main;
      const text = view.state.doc.sliceString(selection.from, selection.to);
      const newText = text ? `[${text}](url)` : "[link](url)";
      view.dispatch(view.state.replaceSelection(newText));
      return true;
    },
  },
]);

export function ObsidianEditor({
  value,
  onChange,
  onSelect,
  onFocus,
  onBlur,
  placeholder,
  readOnly = false,
  commandsRef,
}) {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onSelectRef = useRef(onSelect);

  // Keep refs updated
  useEffect(() => {
    onChangeRef.current = onChange;
    onSelectRef.current = onSelect;
  });

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current) return;

    const startState = EditorState.create({
      doc: value || "",
      extensions: [
        // Core editing
        history(),
        closeBrackets(),
        indentUnit.of("  "),
        indentOnInput(),

        // Language
        markdown({
          completeHTMLTags: false,
        }),

        // Theme
        obsidianEditorTheme,
        syntaxHighlighting(defaultHighlightStyle),

        // Obsidian-like features
        hideMarkdownMarkers,
        hideHeaderMarkers,
        clickToEdit,
        obsidianKeymap,

        // Keymaps
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          ...lintKeymap,
        ]),

        // Selection
        highlightSelectionMatches(),

        // Event handlers
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString();
            onChangeRef.current?.(newValue);
          }
          if (update.selectionSet && onSelectRef.current) {
            const selection = update.state.selection.main;
            const text = update.state.doc.sliceString(selection.from, selection.to);
            if (text) {
              const coords = viewRef.current?.coordsAtPos(selection.from);
              onSelectRef.current({
                text,
                from: selection.from,
                to: selection.to,
                rect: coords,
              });
            }
          }
        }),

        EditorView.focusChangeEffect.of((state, focusing) => {
          if (focusing) {
            onFocus?.();
          } else {
            onBlur?.();
          }
          return null;
        }),

        // Read-only
        ...(readOnly ? [EditorView.editable.of(false)] : []),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Update value from props (controlled component)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentValue = view.state.doc.toString();
    if (value !== currentValue) {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value || "" },
      });
    }
  }, [value]);

  // Expose editor instance to parent for commands
  useEffect(() => {
    if (!commandsRef) return;

    commandsRef.current = {
      wrapText: (before, after = before) => {
        const view = viewRef.current;
        if (!view) return;
        const selection = view.state.selection.main;
        const text = view.state.doc.sliceString(selection.from, selection.to);
        view.dispatch(view.state.replaceSelection(`${before}${text}${after}`));
        view.focus();
      },
      insertText: (text) => {
        const view = viewRef.current;
        if (!view) return;
        view.dispatch(view.state.replaceSelection(text));
        view.focus();
      },
      focus: () => {
        const view = viewRef.current;
        view?.focus();
      },
      getSelection: () => {
        const view = viewRef.current;
        if (!view) return "";
        const selection = view.state.selection.main;
        return view.state.doc.sliceString(selection.from, selection.to);
      },
    };
  }, [commandsRef]);

  return (
    <div
      ref={editorRef}
      className="obsidian-editor h-full w-full overflow-auto bg-background"
      data-placeholder={placeholder}
    />
  );
}

export default ObsidianEditor;
