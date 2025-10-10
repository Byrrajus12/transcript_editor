import { saveAs } from "file-saver";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import jsPDF from "jspdf";
import type { Segment } from "./parseTranscript";
import { serializeTXT } from "./parseTranscript";
import { serializeTXTNoTimestamps } from "./serializeTXTNoTimestamps";
import type {
  SerializedEditorState,
  SerializedLexicalNode,
  SerializedTextNode,
} from "lexical";


interface RichSegment extends Segment {
  rich_text?: SerializedEditorState<SerializedLexicalNode> | null;
}


function renderRichToDocxRuns(
  rich: SerializedEditorState<SerializedLexicalNode>
): TextRun[] {
  const runs: TextRun[] = [];

  const root = (rich as { root?: { children?: SerializedLexicalNode[] } }).root;
  if (!root?.children?.length) return runs;

  const processNode = (node: SerializedLexicalNode): void => {
    // paragraph nodes
    if (node.type === "paragraph") {
      const paraNode = node as SerializedLexicalNode & { children?: SerializedLexicalNode[] };
      if (Array.isArray(paraNode.children)) {
        for (const child of paraNode.children) processNode(child);
      }
      return;
    }

    // text nodes
    if (node.type === "text") {
      const textNode = node as SerializedTextNode & { style?: string };
      const text = textNode.text ?? "";
      const fmt = Number(textNode.format ?? 0);
      const style = textNode.style ?? "";

      const BOLD = 1,
        ITALIC = 2,
        STRIKETHROUGH = 8,
        SUBSCRIPT = 32,
        SUPERSCRIPT = 64,
        HIGHLIGHT = 128;

      // Extract color from inline style
      const colorMatch = style.match(/color:\s*([^;]+)/);
      const color = colorMatch ? colorMatch[1].trim().replace("#", "") : undefined;

      const highlight = fmt & HIGHLIGHT ? "yellow" : undefined;

      runs.push(
        new TextRun({
          text,
          bold: !!(fmt & BOLD),
          italics: !!(fmt & ITALIC),
          strike: !!(fmt & STRIKETHROUGH),
          subScript: !!(fmt & SUBSCRIPT),
          superScript: !!(fmt & SUPERSCRIPT),
          color,
          highlight,
        })
      );
    }
  };

  for (const child of root.children) processNode(child);
  return runs;
}


function renderRichHTML(
  rich: SerializedEditorState<SerializedLexicalNode>
): string {
  try {
    const root = (rich as { root?: { children?: SerializedLexicalNode[] } }).root;
    if (!root?.children?.length) return "";

    const renderNode = (node: SerializedLexicalNode): string => {
      // Handle paragraph nodes (recursive descent)
      if (node.type === "paragraph") {
        const paraNode = node as SerializedLexicalNode & {
          children?: SerializedLexicalNode[];
        };
        if (Array.isArray(paraNode.children)) {
          return paraNode.children.map(renderNode).join("");
        }
        return "";
      }

      // Handle text nodes
      if (node.type === "text") {
        const textNode = node as SerializedTextNode & { style?: string };
        let html = textNode.text ?? "";
        const fmt = Number(textNode.format ?? 0);

        const BOLD = 1;
        const ITALIC = 2;
        const HIGHLIGHT = 128;

        // Apply inline text styles
        if (fmt & BOLD) html = `<strong>${html}</strong>`;
        if (fmt & ITALIC) html = `<em>${html}</em>`;

        // Detect color from inline style (set by $patchStyleText)
        const style = textNode.style ?? "";
        const colorMatch = style.match(/color:\s*([^;]+)/);
        const color = colorMatch ? colorMatch[1].trim() : undefined;

        // Apply color (inner)
        if (color) html = `<span style="color:${color};">${html}</span>`;

        // Apply highlight (outermost)
        if (fmt & HIGHLIGHT)
          html = `<mark style="background:#fff59d;">${html}</mark>`;

        return html;
      }

      // Default: ignore other node types
      return "";
    };

    return root.children.map(renderNode).join("<br>");
  } catch (err) {
    console.warn("Failed to render rich_text:", err);
    return "";
  }
}


function stripHTML(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}


export function exportTXT(
  segments: Segment[],
  filename = "transcript.txt",
  withTimestamps = false
): void {
  const content = withTimestamps
    ? serializeTXT(segments)
    : serializeTXTNoTimestamps(segments);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  saveAs(blob, filename);
}

export async function exportDOCX(
  segments: RichSegment[],
  filename = "transcript.docx",
  withTimestamps = false
): Promise<void> {
  const paras = segments.map((s) => {
    const runs: TextRun[] = [
      new TextRun({ text: `[${s.speaker}]`, bold: true }),
      ...(withTimestamps
        ? [new TextRun({ text: ` [${fmt(s.start)} --> ${fmt(s.end)}]: ` })]
        : [new TextRun({ text: ": " })]),
    ];

    if (s.rich_text) runs.push(...renderRichToDocxRuns(s.rich_text));
    else runs.push(new TextRun({ text: s.text || "" }));

    return new Paragraph({ children: runs });
  });

  const doc = new Document({ sections: [{ children: paras }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}

export function exportPDF(
  segments: RichSegment[],
  filename = "transcript.pdf",
  withTimestamps = false
): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const lineHeight = 16;
  const left = 48;
  let y = 64;
  const width = 515;

  for (const s of segments) {
    const html = s.rich_text ? renderRichHTML(s.rich_text) : s.text || "";
    const plain = stripHTML(html);
    const prefix = `[${s.speaker}]${
      withTimestamps ? ` [${fmt(s.start)} --> ${fmt(s.end)}]` : ""
    }: `;
    const wrapped = doc.splitTextToSize(prefix + plain, width);

    for (const w of wrapped) {
      if (y > 720) {
        doc.addPage();
        y = 64;
      }
      doc.text(w, left, y);
      y += lineHeight;
    }
  }

  doc.save(filename);
}

const fmt = (s: number): string => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s - Math.floor(s)) * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}.${String(ms).padStart(3, "0")}`;
};
