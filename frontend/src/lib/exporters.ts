import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import jsPDF from "jspdf";
import { Segment, serializeTXT } from "./parseTranscript";
import { serializeTXTNoTimestamps } from "./serializeTXTNoTimestamps";


export function exportTXT(
  segments: Segment[],
  filename = "transcript.txt",
  withTimestamps = false
) {
  const content = withTimestamps
    ? serializeTXT(segments)
    : serializeTXTNoTimestamps(segments);
  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  });
  saveAs(blob, filename);
}

export async function exportDOCX(
  segments: Segment[],
  filename = "transcript.docx",
  withTimestamps = false
) {
  const paras = segments.map((s) =>
    new Paragraph({
      children: [
        new TextRun({ text: `[${s.speaker}]`, bold: true }),
        ...(withTimestamps
          ? [new TextRun({ text: ` [${fmt(s.start)} --> ${fmt(s.end)}]: ` })]
          : [new TextRun({ text: ": " })]),
        new TextRun({ text: s.text }),
      ],
    })
  );
  const doc = new Document({ sections: [{ children: paras }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}

export function exportPDF(
  segments: Segment[],
  filename = "transcript.pdf",
  withTimestamps = false
) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const lineHeight = 16;
  const left = 48;
  let y = 64;
  const width = 515;
  const content = withTimestamps
    ? serializeTXT(segments)
    : serializeTXTNoTimestamps(segments);
  const lines = content.split("\n");
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, width);
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

const fmt = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s - Math.floor(s)) * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}.${String(ms).padStart(3, "0")}`;
};
