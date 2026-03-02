"use client";

import { exampleSetup } from "prosemirror-example-setup";
import { inputRules } from "prosemirror-inputrules";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useEffect, useRef, useState, useCallback } from "react";

import type { Suggestion } from "@/lib/db/schema";
import {
  documentSchema,
  handleTransaction,
  headingRule,
} from "@/lib/editor/config";
import {
  buildContentFromDocument,
  buildDocumentFromContent,
  createDecorations,
} from "@/lib/editor/functions";
import {
  projectWithPositions,
  suggestionsPlugin,
  suggestionsPluginKey,
} from "@/lib/editor/suggestions";

type EditorProps = {
  content: string;
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
  status: "streaming" | "idle";
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  suggestions: Suggestion[];
};

// Typewriter speed (ms per character)
const TYPEWRITER_SPEED = 15;

function PureEditor({
  content,
  onSaveContent,
  suggestions,
  status,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const isInitializedRef = useRef(false);
  
  // Typewriter effect state
  const [displayedContent, setDisplayedContent] = useState("");
  const targetContentRef = useRef("");
  const isTypingRef = useRef(false);
  const typewriterTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize editor once
  useEffect(() => {
    if (containerRef.current && !isInitializedRef.current) {
      isInitializedRef.current = true;
      
      try {
        const doc = buildDocumentFromContent(content || "");
        
        const state = EditorState.create({
          doc,
          plugins: [
            ...exampleSetup({ schema: documentSchema, menuBar: false }),
            inputRules({
              rules: [
                headingRule(1),
                headingRule(2),
                headingRule(3),
                headingRule(4),
                headingRule(5),
                headingRule(6),
              ],
            }),
            suggestionsPlugin,
          ],
        });

        editorRef.current = new EditorView(containerRef.current, {
          state,
        });
        
        // Initialize displayed content
        setDisplayedContent(content || "");
        targetContentRef.current = content || "";
      } catch (error) {
        console.error("[Editor] Failed to initialize:", error);
      }
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
        isInitializedRef.current = false;
      }
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
    };
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Typewriter effect - gradually reveal content
  const typeNextCharacter = useCallback(() => {
    if (!isTypingRef.current) return;
    
    const target = targetContentRef.current;
    const current = displayedContent;
    
    if (current.length < target.length) {
      // Add next character(s) - can add multiple for faster effect
      const charsToAdd = Math.min(3, target.length - current.length);
      const newContent = target.substring(0, current.length + charsToAdd);
      
      setDisplayedContent(newContent);
      
      // Update editor
      if (editorRef.current) {
        try {
          const newDocument = buildDocumentFromContent(newContent);
          const transaction = editorRef.current.state.tr.replaceWith(
            0,
            editorRef.current.state.doc.content.size,
            newDocument.content
          );
          transaction.setMeta("no-save", true);
          editorRef.current.dispatch(transaction);
          
          // Auto-scroll to bottom
          if (containerRef.current) {
            const scrollContainer = containerRef.current.closest('.overflow-y-scroll');
            if (scrollContainer) {
              scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
          }
        } catch (error) {
          console.error("[Editor] Error updating content:", error);
        }
      }
      
      // Schedule next character
      typewriterTimeoutRef.current = setTimeout(typeNextCharacter, TYPEWRITER_SPEED);
    } else {
      // Finished typing
      isTypingRef.current = false;
    }
  }, [displayedContent]);

  // Update target content when prop changes
  useEffect(() => {
    if (content !== undefined && content !== targetContentRef.current) {
      const wasIdle = targetContentRef.current.length === 0;
      targetContentRef.current = content;
      
      if (status === "streaming") {
        // During streaming, use typewriter effect
        if (!isTypingRef.current) {
          isTypingRef.current = true;
          typeNextCharacter();
        }
      } else {
        // When idle, show content immediately
        setDisplayedContent(content);
        isTypingRef.current = false;
        
        if (editorRef.current) {
          try {
            const newDocument = buildDocumentFromContent(content);
            const transaction = editorRef.current.state.tr.replaceWith(
              0,
              editorRef.current.state.doc.content.size,
              newDocument.content
            );
            transaction.setMeta("no-save", true);
            editorRef.current.dispatch(transaction);
          } catch (error) {
            console.error("[Editor] Error updating content:", error);
          }
        }
      }
    }
  }, [content, status, typeNextCharacter]);

  // Cleanup typewriter on unmount or when idle
  useEffect(() => {
    if (status === "idle") {
      isTypingRef.current = false;
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
      // Show final content immediately
      if (displayedContent !== targetContentRef.current) {
        setDisplayedContent(targetContentRef.current);
        if (editorRef.current) {
          try {
            const newDocument = buildDocumentFromContent(targetContentRef.current);
            const transaction = editorRef.current.state.tr.replaceWith(
              0,
              editorRef.current.state.doc.content.size,
              newDocument.content
            );
            transaction.setMeta("no-save", true);
            editorRef.current.dispatch(transaction);
          } catch (error) {
            console.error("[Editor] Error updating content:", error);
          }
        }
      }
    }
  }, [status, displayedContent]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setProps({
        dispatchTransaction: (transaction) => {
          handleTransaction({
            transaction,
            editorRef,
            onSaveContent,
          });
        },
      });
    }
  }, [onSaveContent]);

  useEffect(() => {
    if (editorRef.current?.state.doc && content) {
      const projectedSuggestions = projectWithPositions(
        editorRef.current.state.doc,
        suggestions
      ).filter(
        (suggestion) => suggestion.selectionStart && suggestion.selectionEnd
      );

      const decorations = createDecorations(
        projectedSuggestions,
        editorRef.current
      );

      const transaction = editorRef.current.state.tr;
      transaction.setMeta(suggestionsPluginKey, { decorations });
      editorRef.current.dispatch(transaction);
    }
  }, [suggestions, content]);

  return (
    <div className="relative">
      <div 
        className="prose dark:prose-invert relative min-h-[200px]" 
        ref={containerRef}
        style={{ minHeight: "200px" }}
      />
    </div>
  );
}

// Don't use memo during streaming to ensure updates are applied
export const Editor = PureEditor;