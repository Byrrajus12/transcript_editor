// "use client";
// import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
// import { $getSelection, $isRangeSelection } from "lexical";
// import { createDOMRange } from "@lexical/selection";
// import { useEffect, useState } from "react";

// export default function FloatingToolbarPlugin() {
//   const [editor] = useLexicalComposerContext();
//   const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

//   useEffect(() => {
//     let rafId: number | null = null;

//     const update = () => {
//       if (rafId) cancelAnimationFrame(rafId);
//       rafId = requestAnimationFrame(() => {
//         editor.getEditorState().read(() => {
//           const sel = $getSelection();
//           if ($isRangeSelection(sel) && !sel.isCollapsed()) {
//             const range = createDOMRange(
//               editor,
//               sel.anchor.getNode(),
//               sel.anchor.offset,
//               sel.focus.getNode(),
//               sel.focus.offset
//             );
//             if (range) {
//               const rect = range.getBoundingClientRect();
//               setCoords({
//                 x: rect.left + rect.width / 2 + window.scrollX,
//                 y: rect.top + window.scrollY - 12,
//               });
//               return;
//             }
//           }
//           setCoords(null);
//         });
//       });
//     };

//     const unregister = editor.registerUpdateListener(() => update());
//     window.addEventListener("scroll", update, true);
//     window.addEventListener("resize", update);
//     return () => {
//       if (rafId) cancelAnimationFrame(rafId);
//       unregister();
//       window.removeEventListener("scroll", update, true);
//       window.removeEventListener("resize", update);
//     };
//   }, [editor]);

//   if (!coords) return null;

//   const toggleFormat = (
//     style: "bold" | "italic" | "underline" | "highlight" | "red" | "blue"
//   ) => {
//     editor.update(() => {
//       const selection = $getSelection();
//       if ($isRangeSelection(selection)) {
//         if (style === "highlight") {
//           selection.formatText("highlight");
//         } else if (style === "red" || style === "blue") {
//           const colorClass = style === "red" ? "text-red-500" : "text-blue-500";
//           selection.getNodes().forEach((node) => {
//             const elem = node.getLatest();
//             if (elem && elem.getType() === "text") {
//               const dom = editor.getElementByKey(elem.getKey());
//               if (dom) dom.classList.toggle(colorClass);
//             }
//           });
//         } else {
//           selection.formatText(style);
//         }
//       }
//     });
//   };

//   return (
//     <div
//       className="floating-toolbar fixed z-50 flex gap-1 rounded-md border bg-white shadow p-1"
//       style={{
//         left: coords.x,
//         top: coords.y,
//         transform: "translate(-50%, -100%)",
//       }}
//       onMouseDown={(e) => e.preventDefault()}
//     >
//       <button className="px-2 py-1 text-xs font-bold rounded hover:bg-gray-100" onClick={() => toggleFormat("bold")}>
//         B
//       </button>
//       <button className="px-2 py-1 text-xs italic rounded hover:bg-gray-100" onClick={() => toggleFormat("italic")}>
//         I
//       </button>
//       <button className="px-2 py-1 text-xs underline rounded hover:bg-gray-100" onClick={() => toggleFormat("underline")}>
//         U
//       </button>
//       <button className="px-2 py-1 rounded bg-yellow-200 hover:bg-yellow-300" onClick={() => toggleFormat("highlight")}>
//         H
//       </button>
//       <button className="px-2 py-1 rounded text-red-500 hover:bg-gray-100" onClick={() => toggleFormat("red")}>
//         A
//       </button>
//       <button className="px-2 py-1 rounded text-blue-500 hover:bg-gray-100" onClick={() => toggleFormat("blue")}>
//         A
//       </button>
//     </div>
//   );
// }

"use client";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection } from "lexical";
import { createDOMRange } from "@lexical/selection";
import { useEffect, useState } from "react";
import { $patchStyleText } from "@lexical/selection";

export default function FloatingToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let rafId: number | null = null;

    const update = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        editor.getEditorState().read(() => {
          const sel = $getSelection();
          if ($isRangeSelection(sel) && !sel.isCollapsed()) {
            const range = createDOMRange(
              editor,
              sel.anchor.getNode(),
              sel.anchor.offset,
              sel.focus.getNode(),
              sel.focus.offset
            );
            if (range) {
              const rect = range.getBoundingClientRect();
              setCoords({
                x: rect.left + rect.width / 2 + window.scrollX,
                y: rect.top + window.scrollY - 12,
              });
              return;
            }
          }
          setCoords(null);
        });
      });
    };

    const unregister = editor.registerUpdateListener(() => update());
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      unregister();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [editor]);

  if (!coords) return null;

  const toggleFormat = (
    style: "bold" | "italic" | "highlight" | "black" | "red" | "blue"
  ) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (style === "highlight") {
          selection.formatText("highlight");
        } else if (style === "red" || style === "blue" || style === "black") {
          // ✅ Proper color application (serializable)
          const color =
            style === "red" ? "#020101ff" : style === "blue" ? "#3b82f6" : "#000000";
          $patchStyleText(selection, { color });
        } else {
          selection.formatText(style);
        }
      }
    });
  };

  return (
    <div
      className="floating-toolbar fixed z-50 flex gap-1 rounded-md border bg-white shadow p-1"
      style={{
        left: coords.x,
        top: coords.y,
        transform: "translate(-50%, -100%)",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        className="px-2 py-1 text-xs font-bold rounded hover:bg-gray-100"
        onClick={() => toggleFormat("bold")}
      >
        B
      </button>
      <button
        className="px-2 py-1 text-xs italic rounded hover:bg-gray-100"
        onClick={() => toggleFormat("italic")}
      >
        I
      </button>
      <button
        className="px-2 py-1 rounded bg-yellow-200 hover:bg-yellow-300"
        onClick={() => toggleFormat("highlight")}
      >
        H
      </button>
      <button
        className="px-2 py-1 rounded text-black hover:bg-gray-100"
        onClick={() => toggleFormat("black")}
      >
        A
      </button>
      <button
        className="px-2 py-1 rounded text-red-500 hover:bg-gray-100"
        onClick={() => toggleFormat("red")}
      >
        A
      </button>
      <button
        className="px-2 py-1 rounded text-blue-500 hover:bg-gray-100"
        onClick={() => toggleFormat("blue")}
      >
        A
      </button>
    </div>
  );
}
