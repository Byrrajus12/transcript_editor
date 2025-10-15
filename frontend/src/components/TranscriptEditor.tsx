import { Plus, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Segment } from "@/lib/parseTranscript";
import type { SerializedEditorState, SerializedLexicalNode } from "lexical";
import RichSegmentEditor from "@/components/RichSegmentEditor";
import { useState, useMemo, useRef, useEffect } from "react";

interface RichSegment extends Segment {
  rich_text?: SerializedEditorState<SerializedLexicalNode> | null;
}

interface Props {
  segments: RichSegment[];
  currentTime: number;
  onChangeAction: (segments: RichSegment[]) => void;
  onSeekAction: (t: number) => void;
}

export default function TranscriptEditor({
  segments,
  currentTime,
  onChangeAction,
  onSeekAction,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [richId, setRichId] = useState<string | null>(null);

  const activeId = useMemo(() => {
    const s = segments.find((x) => currentTime >= x.start && currentTime < x.end);
    return s?.id;
  }, [segments, currentTime]);

  useEffect(() => {
    if (!activeId || !containerRef.current || richId) return;
    const el = containerRef.current.querySelector<HTMLDivElement>(
      `[data-id="${activeId}"]`
    );
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeId, richId]);

  const handleEdit = (id: string, field: "text" | "speaker", value: string) => {
    const next = segments.map((s) =>
      s.id === id ? { ...s, [field]: value } : s
    );
    onChangeAction(next);
  };

  const handleDelete = (id: string) => {
    const next = segments.filter((s) => s.id !== id);
    onChangeAction(next);
  };

  const handleInsertBelow = (id: string) => {
    const idx = segments.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const newSeg: RichSegment = {
      id: uuidv4(),
      speaker: "UNKNOWN",
      start: 0,
      end: 0,
      text: "",
      rich_text: null,
    };
    const next = [
      ...segments.slice(0, idx + 1),
      newSeg,
      ...segments.slice(idx + 1),
    ];
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
            if (
              target.closest(".segment-editor") ||
              target.closest(".speaker-input") ||
              target.closest(".lexical-editor") ||
              target.closest(".floating-toolbar")
            )
              return;
            onSeekAction(s.start);
            setFocusedId(s.id);
          }}
          className={cn(
            "group p-3 rounded-md cursor-pointer space-y-2 border border-gray-200 bg-white shadow-sm transition-all relative",
            s.id === activeId && "border-sky-400 bg-sky-50"
          )}
        >
          {/* --- top row: speaker + actions --- */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <Input
                value={s.speaker}
                onClick={(e) => e.stopPropagation()}
                onFocus={() => setFocusedId(s.id)}
                onChange={(e) => handleEdit(s.id, "speaker", e.target.value)}
                className="w-28 speaker-input"
              />
              <span>[{fmt(s.start)} → {fmt(s.end)}]</span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInsertBelow(s.id);
                }}
                title="Insert new segment below"
              >
                <Plus className="w-4 h-4 text-green-500" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(s.id);
                }}
                title="Delete segment"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>

          {/* --- text area --- */}
          {richId === s.id ? (
            <RichSegmentEditor
              segment={s}
              onCommit={(plain, richJSON) => {
                const next = segments.map((seg) =>
                  seg.id === s.id
                    ? { ...seg, text: plain, rich_text: richJSON }
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
              className="segment-editor border border-gray-200 rounded-md p-3 text-sm bg-white min-h-[60px] hover:ring-1 hover:ring-sky-200"
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
                  : s.text || '<span class="text-gray-400">Click to edit…</span>',
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

        const BOLD = 1;
        const ITALIC = 2;
        const STRIKETHROUGH = 8;
        const CODE = 16;
        const SUBSCRIPT = 32;
        const SUPERSCRIPT = 64;
        const HIGHLIGHT = 128;

        let html = content;

        // Apply inline styles first
        if (fmt & BOLD) html = `<strong>${html}</strong>`;
        if (fmt & ITALIC) html = `<em>${html}</em>`;
        if (fmt & STRIKETHROUGH) html = `<s>${html}</s>`;
        if (fmt & CODE) html = `<code>${html}</code>`;
        if (fmt & SUBSCRIPT) html = `<sub>${html}</sub>`;
        if (fmt & SUPERSCRIPT) html = `<sup>${html}</sup>`;

        // Detect color from node.style
        let color: string | null = null;
        if (typeof node.style === "string") {
          const m = node.style.match(/color:\s*([^;]+)/);
          if (m) color = m[1].trim();
        } else if (typeof node.classNames === "string") {
          if (node.classNames.includes("text-red-500")) color = "#ef4444";
          if (node.classNames.includes("text-blue-500")) color = "#3b82f6";
        }

        // Apply color (inner)
        if (color) html = `<span style="color:${color};">${html}</span>`;

        // Apply highlight (outermost)
        if (fmt & HIGHLIGHT) {
          html = `<mark style="background-color:#fde68a;">${html}</mark>`;
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
