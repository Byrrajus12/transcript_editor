"use client";
import React, { useEffect, useRef } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import {
  $getRoot,
  $createParagraphNode,
  $createTextNode,
  type SerializedEditorState,
  type SerializedLexicalNode,
} from "lexical";
import FloatingToolbarPlugin from "@/components/FloatingToolbarPlugin";
import type { Segment } from "@/lib/parseTranscript";
import { cn } from "@/lib/utils";

/* ---------- Theme ---------- */
const theme = {
  paragraph: "mb-1",
  text: {
    bold: "font-bold",
    italic: "italic",
    highlight: "bg-yellow-200",
    red: "text-red-500",
    blue: "text-blue-500",
  },
};

/* ---------- Types ---------- */
interface RichSegment extends Segment {
  rich_text?: SerializedEditorState<SerializedLexicalNode> | null;
}

interface Props {
  /** The single transcript segment being edited */
  segment: RichSegment;
  /** Called once when user leaves editor or presses Done */
  onCommit: (
    plainText: string,
    richJSON: SerializedEditorState<SerializedLexicalNode> | null
  ) => void;
  /** Optional cancel handler (discard changes) */
  onCancel?: () => void;
}

/* ---------- Component ---------- */
function RichSegmentEditor({ segment, onCommit, onCancel }: Props) {
  const initialConfig = {
    namespace: `SegmentEditor-${segment.id}`,
    theme,
    editable: true,
    onError(error: Error) {
      console.error(error);
    },
  };

  /* ---------- Load initial text or rich JSON ---------- */
const LoadTextPlugin = () => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.update(() => {
      const root = $getRoot();
      root.clear();

      // Try to load from rich_text JSON first
      if (segment.rich_text) {
        try {
          const state = editor.parseEditorState(segment.rich_text);
          editor.setEditorState(state);
          return;
        } catch (e) {
          console.warn("Failed to parse rich_text; falling back to plain text", e);
        }
      }

      // Fallback to plain text only
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(segment.text || ""));
      root.append(paragraph);
    });
  }, [editor, segment.text, segment.rich_text]); // re-run if either changes
  return null;
};

  /* ---------- Track internal edits (no React state churn) ---------- */
  const jsonRef = useRef<SerializedEditorState<SerializedLexicalNode> | null>(
    segment.rich_text ?? null
  );
  const textRef = useRef<string>(segment.text || "");

  const TrackChangesPlugin = () => {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
      return editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const plain =
            editor
              .getEditorState()
              .read(() => editor.getRootElement()?.innerText || "") || "";
          textRef.current = plain;
          jsonRef.current = editorState.toJSON();
        });
      });
    }, [editor]);
    return null;
  };

  /* ---------- Commit / Cancel ---------- */
  const handleCommit = (): void => onCommit(textRef.current, jsonRef.current);
  const handleCancel = (): void => {
    onCancel?.();
  };

  /* ---------- Render ---------- */
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div
        className={cn(
          "lexical-editor editable-box border border-gray-200 rounded-md p-3 bg-white text-sm focus-within:ring-1 focus-within:ring-sky-400"
        )}
        onBlur={(e) => {
          // Commit only when the whole editor loses focus
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            handleCommit();
          }
        }}
      >
        {/* Toolbar row */}
        <div className="mb-1 flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            className="rounded border border-gray-300 px-2 py-0.5 hover:bg-gray-50"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded border border-sky-500 text-sky-600 px-2 py-0.5 hover:bg-sky-50"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCommit}
          >
            Done
          </button>
        </div>

        <RichTextPlugin
          contentEditable={<ContentEditable className="min-h-[60px] outline-none" />}
          placeholder={<div className="text-gray-400">Type here…</div>}
          ErrorBoundary={() => null}
        />
        <HistoryPlugin />
        <LoadTextPlugin />
        <TrackChangesPlugin />
        <FloatingToolbarPlugin />
      </div>
    </LexicalComposer>
  );
}

/* ---------- Prevent unnecessary re-renders ---------- */
export default React.memo(
  RichSegmentEditor,
  (prev, next) => prev.segment.id === next.segment.id
);
