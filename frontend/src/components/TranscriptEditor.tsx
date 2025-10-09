// "use client";
// import { useEffect, useMemo, useRef } from "react";
// import type { Segment } from "@/lib/parseTranscript";
// import { Input } from "@/components/ui/input";
// import { cn } from "@/lib/utils";

// type Props = {
//   segments: Segment[];
//   currentTime: number;
//   onChangeAction: (segments: Segment[]) => void;
//   onSeekAction: (t: number) => void;
// };

// export default function TranscriptEditor({
//   segments,
//   currentTime,
//   onChangeAction,
//   onSeekAction,
// }: Props) {
//   const containerRef = useRef<HTMLDivElement | null>(null);

//   const activeId = useMemo(() => {
//     const s = segments.find((x) => currentTime >= x.start && currentTime < x.end);
//     return s?.id;
//   }, [segments, currentTime]);

//   useEffect(() => {
//     if (!activeId || !containerRef.current) return;
//     const el = containerRef.current.querySelector<HTMLDivElement>(`[data-id="${activeId}"]`);
//     if (el) el.scrollIntoView({ block: "nearest" });
//   }, [activeId]);

//   const handleEdit = (id: string, field: "text" | "speaker", value: string) => {
//     const next = segments.map((s) => (s.id === id ? { ...s, [field]: value } : s));
//     onChangeAction(next);
//   };

//   return (
//     <div ref={containerRef} className="max-h-[420px] overflow-auto p-3 space-y-3">
//       {segments.map((s) => (
//         <div
//           key={s.id}
//           data-id={s.id}
//           onClick={() => onSeekAction(s.start)}
//           className={cn(
//             "p-3 rounded-md cursor-pointer space-y-2 border border-gray-200 bg-white shadow-sm",
//             s.id === activeId && "border-sky-400 bg-sky-50"
//           )}
//         >
//           <div className="flex items-center gap-2 text-xs text-gray-500">
//             <Input
//               value={s.speaker}
//               onClick={(e) => e.stopPropagation()}
//               onChange={(e) => handleEdit(s.id, "speaker", e.target.value)}
//               className="w-28"
//             />
//             <span>
//               [{fmt(s.start)} → {fmt(s.end)}]
//             </span>
//           </div>
//           <textarea
//             value={s.text}
//             onClick={(e) => e.stopPropagation()}
//             onChange={(e) => handleEdit(s.id, "text", e.target.value)}
//             onInput={e => {
//               const target = e.target as HTMLTextAreaElement;
//               target.style.height = 'auto';
//               target.style.height = target.scrollHeight + 'px';
//             }}
//             style={{ overflow: 'hidden' }}
//             className="w-full bg-white text-sm border border-gray-200 rounded-md p-3 resize-none focus:outline-none focus:ring-1 focus:ring-sky-400"
//           />
//         </div>
//       ))}
//     </div>
//   );
// }

// const fmt = (t: number) => {
//   const hh = Math.floor(t / 3600);
//   const mm = Math.floor((t % 3600) / 60);
//   const ss = Math.floor(t % 60);
//   const ms = Math.floor((t - Math.floor(t)) * 1000);
//   const pad = (n: number, len = 2) => String(n).padStart(len, "0");
//   return `${pad(hh)}:${pad(mm)}:${pad(ss)}.${String(ms).padStart(3, "0")}`;
// };
"use client";
import { useRef, useMemo, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Segment } from "@/lib/parseTranscript";
import type { SerializedEditorState, SerializedLexicalNode } from "lexical";
import RichSegmentEditor from "@/components/RichSegmentEditor";

interface RichSegment extends Segment {
  rich_text?: SerializedEditorState<SerializedLexicalNode> | null;
}

interface Props {
  segments: RichSegment[];
  currentTime: number;
  onChangeAction: (segments: RichSegment[]) => void;
  onSeekAction: (t: number) => void;
}

/**
 * TranscriptEditor — base segment list view with hybrid inline editing.
 * Click segment background to seek audio, click inside text to edit.
 */
export default function TranscriptEditor({
  segments,
  currentTime,
  onChangeAction,
  onSeekAction,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [richId, setRichId] = useState<string | null>(null);

  // Identify currently active segment based on playback time
  const activeId = useMemo(() => {
    const s = segments.find((x) => currentTime >= x.start && currentTime < x.end);
    return s?.id;
  }, [segments, currentTime]);

  // Scroll active segment into view
  useEffect(() => {
    if (!activeId || !containerRef.current) return;
    // 🚫 Don't auto-scroll while editing a text box
    if (richId !== null) return;
    const el = containerRef.current.querySelector<HTMLDivElement>(`[data-id="${activeId}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeId, richId]);

  // Update speaker or text field
  const handleEdit = (id: string, field: "text" | "speaker", value: string): void => {
    const next = segments.map((s) => (s.id === id ? { ...s, [field]: value } : s));
    onChangeAction(next);
  };

  return (
    <div ref={containerRef} className="max-h-[420px] overflow-auto p-3 space-y-3">
      {segments.map((s) => (
        <div
          key={s.id}
          data-id={s.id}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            // Only trigger seek when clicking outside editor, toolbar, or input
            if (
              target.closest(".segment-editor") ||
              target.closest(".speaker-input") ||
              target.closest(".lexical-editor") ||
              target.closest(".floating-toolbar")
            ) {
              return;
            }
            onSeekAction(s.start);
            setFocusedId(s.id);
          }}
          className={cn(
            "p-3 rounded-md cursor-pointer space-y-2 border border-gray-200 bg-white shadow-sm transition-all",
            s.id === activeId && "border-sky-400 bg-sky-50"
          )}
        >
          {/* --- Speaker row --- */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Input
              value={s.speaker}
              onClick={(e) => e.stopPropagation()}
              onFocus={() => setFocusedId(s.id)}
              onChange={(e) => handleEdit(s.id, "speaker", e.target.value)}
              className="w-28 speaker-input"
            />
            <span>
              [{fmt(s.start)} → {fmt(s.end)}]
            </span>
          </div>

          {/* --- Text row --- */}
          {richId === s.id ? (
            <RichSegmentEditor
              segment={s}
              onCommit={(plainText, richJSON) => {
                const next = segments.map((seg) =>
                  seg.id === s.id
                    ? { ...seg, text: plainText, rich_text: richJSON }
                    : seg
                );
                onChangeAction(next);
                setRichId(null);
                setFocusedId(null);
              }}
              onCancel={() => {
                setRichId(null);
                setFocusedId(null);
              }}
            />
          ) : (
            <div
              className={cn(
                "segment-editor border border-gray-200 rounded-md p-3 text-sm bg-white min-h-[60px] focus-within:ring-1 focus-within:ring-sky-400"
              )}
              onClick={(e) => {
                e.stopPropagation();
                setRichId(s.id);
                setFocusedId(s.id);
              }}
            >
              <div
                className="whitespace-pre-wrap prose max-w-none text-sm"
                dangerouslySetInnerHTML={{
                  __html:
                    s.rich_text && typeof s.rich_text === "object"
                      ? renderRichPreview(s.rich_text)
                      : s.text || "Click to edit…",
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- Helper: time formatter ---------- */
function fmt(t: number): string {
  const hh = Math.floor(t / 3600);
  const mm = Math.floor((t % 3600) / 60);
  const ss = Math.floor(t % 60);
  const ms = Math.floor((t - Math.floor(t)) * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}.${String(ms).padStart(3, "0")}`;
}

/* ---------- Helper: lightweight rich preview ---------- */
function renderRichPreview(
  rich: SerializedEditorState<SerializedLexicalNode>
): string {
  try {
    const root = (rich as {
      root?: { children?: Array<Record<string, unknown>> };
    }).root;
    if (!root?.children?.length) return "";

    const renderNode = (node: Record<string, unknown>): string => {
      if (node.type === "paragraph" && Array.isArray(node.children)) {
        return node.children.map(renderNode).join("");
      }
      if (node.type === "text") {
        const content = String(node.text || "");
        const fmt = Number(node.format ?? 0);

        // Lexical bitmask flags
        const BOLD = 1;
        const ITALIC = 2;
        const STRIKETHROUGH = 8;
        const CODE = 16;
        const SUBSCRIPT = 32;
        const SUPERSCRIPT = 64;
        const HIGHLIGHT = 128;

        // Start with raw text
        let html = content;

        // Wrap in highlight first (so underline etc inside of mark)
        if (fmt & HIGHLIGHT) {
          html = `<mark style="background-color:#fde68a;">${html}</mark>`;
        }
        
        // Other text styles
        if (fmt & BOLD) html = `<strong>${html}</strong>`;
        if (fmt & ITALIC) html = `<em>${html}</em>`;
        if (fmt & STRIKETHROUGH) html = `<s>${html}</s>`;
        if (fmt & CODE) html = `<code>${html}</code>`;
        if (fmt & SUBSCRIPT) html = `<sub>${html}</sub>`;
        if (fmt & SUPERSCRIPT) html = `<sup>${html}</sup>`;

        // Color: only if node has explicit style or class marker
        let color: string | null = null;
        if (typeof node.style === "string") {
          const m = node.style.match(/color:\s*([^;]+)/);
          if (m) color = m[1].trim();
        } else if (typeof node.classNames === "string") {
          // if your toolbar sets classNames like "text-red-500"
          if (node.classNames.includes("text-red-500")) color = "#ef4444";
          if (node.classNames.includes("text-blue-500")) color = "#3b82f6";
        }
        if (color) {
          html = `<span style="color:${color};">${html}</span>`;
        }

        return html;
      }
      return "";
    };

    return root.children.map(renderNode).join("<br>");
  } catch (err) {
    console.warn("Failed to render rich preview:", err);
    return "";
  }
}
