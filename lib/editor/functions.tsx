"use client";

import { defaultMarkdownParser, defaultMarkdownSerializer } from "prosemirror-markdown";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";

import { documentSchema } from "./config";
import { createSuggestionWidget, type UISuggestion } from "./suggestions";

export const buildDocumentFromContent = (content: string): ProseMirrorNode => {
  try {
    // Use defaultMarkdownParser directly instead of renderToString
    const doc = defaultMarkdownParser.parse(content || "");
    console.log("[buildDocumentFromContent] Parsed document, childCount:", doc.content.childCount);
    return doc;
  } catch (error) {
    console.error("[buildDocumentFromContent] Parse error:", error);
    // Return empty document on error
    return documentSchema.node("doc", null, [documentSchema.node("paragraph")]);
  }
};

export const buildContentFromDocument = (document: ProseMirrorNode): string => {
  return defaultMarkdownSerializer.serialize(document);
};

export const createDecorations = (
  suggestions: UISuggestion[],
  view: EditorView
): DecorationSet => {
  const decorations: Decoration[] = [];

  for (const suggestion of suggestions) {
    decorations.push(
      Decoration.inline(
        suggestion.selectionStart,
        suggestion.selectionEnd,
        {
          class: "suggestion-highlight",
        },
        {
          suggestionId: suggestion.id,
          type: "highlight",
        }
      )
    );

    decorations.push(
      Decoration.widget(
        suggestion.selectionStart,
        (currentView) => {
          const { dom } = createSuggestionWidget(suggestion, currentView);
          return dom;
        },
        {
          suggestionId: suggestion.id,
          type: "widget",
        }
      )
    );
  }

  return DecorationSet.create(view.state.doc, decorations);
};
