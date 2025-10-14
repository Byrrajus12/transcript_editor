// "use client";
// import { useRef, useState, useCallback, useEffect } from "react";
// import Waveform from "@/components/Waveform";
// import TranscriptEditor from "@/components/TranscriptEditor";
// import { Segment } from "@/lib/parseTranscript";
// import { exportTXT, exportDOCX, exportPDF } from "@/lib/exporters";
// import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Download, Play, Pause, Loader2, Trash, TriangleAlert } from "lucide-react";
// import type WaveSurfer from "wavesurfer.js";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Progress } from "@/components/ui/progress"
// import { v4 as uuidv4 } from "uuid"; 

// interface TranscriptHistoryItem {
//   sessionId: string;
//   filename: string;
//   segments: Segment[];
//   createdAt: number;
// }

// export default function V2TranscriptEditor() {
//   // Helper to format date
//   const formatDate = (ts: number) => {
//     const d = new Date(ts);
//     return d.toLocaleString();
//   };

//   // Delete transcript from history
//   const handleDeleteHistory = useCallback((sessionId: string) => {
//     setHistory((prev: TranscriptHistoryItem[]) => {
//       const updated = prev.filter((h: TranscriptHistoryItem) => h.sessionId !== sessionId);
//       localStorage.setItem("transcriptHistory", JSON.stringify(updated));
//       return updated;
//     });
//   }, []);
//   const [audioFile, setAudioFile] = useState<File | null>(null);
//   const [segments, setSegments] = useState<Segment[]>([]);
//   const [currentTime, setCurrentTime] = useState(0);
//   const [withTimestamps, setWithTimestamps] = useState(false);
//   // status: 'idle' | 'starting' | 'uploading' | 'transcribing'
//   const [status, setStatus] = useState<'idle' | 'starting' | 'uploading' | 'transcribing'>('idle');
//   const [uploadProgress, setUploadProgress] = useState<number>(0);
//   const wsRef = useRef<WaveSurfer | null>(null);
//   const [history, setHistory] = useState<TranscriptHistoryItem[]>([]);

//   useEffect(() => {
//   const stored = JSON.parse(localStorage.getItem("transcriptHistory") || "[]");
//   setHistory(stored);
// }, []);
  
//   const onWaveReady = useCallback((ws: WaveSurfer) => {
//     wsRef.current = ws;
//   }, []);

//   function timeStrToSeconds(str: string): number {
//     const [h, m, s] = str.split(":");
//     const [sec, ms = "0"] = s.split(".");
//     return (
//       Number(h) * 3600 +
//       Number(m) * 60 +
//       Number(sec) +
//       (ms ? Number("0." + ms) : 0)
//     );
//   }

//   // progress-aware uploader
//   function uploadFileWithProgress(
//     url: string,
//     file: File,
//     onProgress: (pct: number) => void
//   ): Promise<void> {
//     return new Promise((resolve, reject) => {
//       const xhr = new XMLHttpRequest();
//       xhr.open("PUT", url, true);
//       xhr.setRequestHeader("Content-Type", file.type);

//       xhr.upload.onprogress = (event) => {
//         if (event.lengthComputable) {
//           const pct = Math.round((event.loaded / event.total) * 100);
//           onProgress(pct);
//         }
//       };

//       xhr.onload = () => {
//         if (xhr.status >= 200 && xhr.status < 300) {
//           resolve();
//         } else {
//           reject(new Error(`Upload failed with status ${xhr.status}`));
//         }
//       };

//       xhr.onerror = () => reject(new Error("Upload error"));
//       xhr.send(file);
//     });
//   }



// const handleAudio = useCallback(async (f?: File) => {
//   if (!f) return;

//   const sessionId = uuidv4();
//   const activeSessionId = sessionId;
//   setAudioFile(f);
//   setSegments([]);
//   setUploadProgress(0);
//   setStatus('starting');

//   // 1. Get signed URL
//   const filename = `uploads/${Date.now()}-${f.name}`;
//   const res1 = await fetch(
//     "https://app-772741460830.us-central1.run.app/api/gcs-upload-url",
//     {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ filename, contentType: f.type }),
//     }
//   );
//   if (!res1.ok) {
//     alert("Failed to get upload URL.");
//     setStatus('idle');
//     return;
//   }
//   const { url, publicUrl } = await res1.json();

//   try {
//     // 2. Upload with progress
//     setStatus('uploading');
//     await uploadFileWithProgress(url, f, (pct) => setUploadProgress(pct));

//     // 3. Process audio
//     setStatus('transcribing');
//     const res2 = await fetch(
//       "https://app-772741460830.us-central1.run.app/api/process-gcs-audio",
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ gcsUrl: publicUrl, sessionId }),
//       }
//     );
//     if (!res2.ok) throw new Error("Failed to transcribe audio");
//     const data = await res2.json();

//     // Ignore stale responses
//     if (activeSessionId !== sessionId) return;

//     if (Array.isArray(data.segments)) {
//       const parsed = data.segments.map(
//         (
//           seg: { speaker: string; start: string; end: string; text: string },
//           idx: number
//         ) => ({
//           ...seg,
//           start: timeStrToSeconds(seg.start),
//           end: timeStrToSeconds(seg.end),
//           id: `${seg.speaker}-${seg.start}-${seg.end}-${idx}`,
//         })
//       );
//       setSegments(parsed);

//       // Save transcript to localStorage (for Option 2)
//       const history = JSON.parse(localStorage.getItem("transcriptHistory") || "[]");
//       history.push({ sessionId, filename: f.name, segments: parsed, createdAt: Date.now() });
//       localStorage.setItem("transcriptHistory", JSON.stringify(history));
//     }
//   } catch (err) {
//     alert("Error: " + (err instanceof Error ? err.message : "Unknown error"));
//   } finally {
//     if (activeSessionId === sessionId) {
//       setStatus('idle');
//       setUploadProgress(0);
//     }
//   }
// }, []);


//   const handleSeek = useCallback((t: number) => wsRef.current?.setTime(t), []);
//   const handlePlayPause = useCallback(
//     () => wsRef.current?.playPause(),
//     []
//   );
//   const onTimeUpdate = useCallback((t: number) => setCurrentTime(t), []);
//   const isPlaying = !!wsRef.current?.isPlaying();

//   const handleAudioDragOver = (e: React.DragEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//   };
//   const handleAudioDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//     const file = e.dataTransfer.files?.[0];
//     if (file) handleAudio(file);
//   };

//   return (
//     <>
//       <div
//         className="rounded-lg shadow-md p-4"
//         style={{ backgroundColor: "hsl(0 0% 98%)" }}
//       >
//         {status !== 'idle' ? (
//           <div className="flex flex-col items-center justify-center w-full h-32 text-gray-500">
//             {status === 'starting' && (
//               <>
//                 <span className="text-sm animate-pulse">
//                   <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
//                   Waiting for Backend...
//                 </span>
//                 <div className="flex items-center mt-2 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded px-2 py-1 text-xs">
//                   <TriangleAlert className="w-4 h-4 mr-1 text-yellow-500" />
//                   Could take a couple of minutes. Please keep the page open.
//                 </div>
//               </>
//             )}
//             {status === 'uploading' && (
//               <>
//                 <span className="text-xs mb-2 text-gray-500 tracking-wide font-medium">
//                   Uploading audio... {uploadProgress}%
//                 </span>
//                 <Progress value={uploadProgress} className="w-full h-3 rounded-lg" />
//               </>
//             )}
//             {status === 'transcribing' && (
//               <>
//                 <span className="text-sm animate-pulse">
//                   <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
//                   Transcribing audio...
//                 </span>
//                 <div className="flex items-center mt-2 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded px-2 py-1 text-xs">
//                   <TriangleAlert className="w-4 h-4 mr-1 text-yellow-500" />
//                   Could take a couple of minutes. Please keep page open, and only run one transcription at a time.
//                 </div>
//               </>
//             )}
//           </div>
//         ) : !audioFile ? (
//           <label
//             className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition"
//             onDragOver={handleAudioDragOver}
//             onDrop={handleAudioDrop}
//           >
//             <input
//               type="file"
//               accept="audio/*"
//               className="hidden"
//               onChange={(e) => handleAudio(e.target.files?.[0])}
//             />
//             <span className="text-sm text-gray-600">
//               <span className="font-semibold">Click to upload</span> or{" "}
//               <span className="font-semibold">Drag and drop</span> audio
//             </span>
//           </label>
//         ) : (
//           <div className="flex items-center gap-3">
//             <Button variant="ghost" onClick={handlePlayPause} size="sm">
//               {isPlaying ? (
//                 <Pause className="w-5 h-5" />
//               ) : (
//                 <Play className="w-5 h-5" />
//               )}
//             </Button>
//             <div className="flex-1">
//               <Waveform
//                 file={audioFile}
//                 onReadyAction={onWaveReady}
//                 onTimeUpdateAction={onTimeUpdate}
//               />
//             </div>
//           </div>
//         )}
//       </div>

//   {audioFile && status === 'idle' && segments.length > 0 && (
//         <div
//           className="rounded-lg shadow-md p-4 relative"
//           style={{ backgroundColor: "hsl(0 0% 98%)" }}
//         >
//           <div className="flex justify-between items-center border-b">
//             <div className="mb-1">
//               <h2 className="text-lg font-medium">Transcript</h2>
//               <p className="text-sm text-gray-500">
//                 Click a segment to jump in audio
//               </p>
//             </div>
//             <div className="flex items-center gap-2">
//               <DropdownMenu>
//                 <DropdownMenuTrigger asChild>
//                   <Button variant="ghost" size="icon">
//                     <Download className="h-5 w-5" />
//                   </Button>
//                 </DropdownMenuTrigger>
//                 <DropdownMenuContent align="end" className="w-44">
//                   <div className="flex items-center gap-2 px-2 py-2 text-xs border-b">
//                     <Checkbox
//                       id="timestamps"
//                       checked={withTimestamps}
//                       onCheckedChange={(val) =>
//                         setWithTimestamps(val === true)
//                       }
//                       className="size-4"
//                     />
//                     <label
//                       htmlFor="timestamps"
//                       className="cursor-pointer select-none"
//                     >
//                       Include timestamps
//                     </label>
//                   </div>
//                   <DropdownMenuItem
//                     onClick={() =>
//                       exportTXT(segments, "transcript.txt", withTimestamps)
//                     }
//                   >
//                     Download as .txt
//                   </DropdownMenuItem>
//                   <DropdownMenuItem
//                     onClick={() =>
//                       exportDOCX(segments, "transcript.docx", withTimestamps)
//                     }
//                   >
//                     Download as .docx
//                   </DropdownMenuItem>
//                   <DropdownMenuItem
//                     onClick={() =>
//                       exportPDF(segments, "transcript.pdf", withTimestamps)
//                     }
//                   >
//                     Download as .pdf
//                   </DropdownMenuItem>
//                 </DropdownMenuContent>
//               </DropdownMenu>
//             </div>
//           </div>
//           <TranscriptEditor
//             segments={segments}
//             currentTime={currentTime}
//             onChangeAction={setSegments}
//             onSeekAction={handleSeek}
//           />
//         </div>
//       )}

//       {history.length > 0 && (
//         <div className="mt-4 p-2 border rounded-lg bg-white">
//           <h3 className="font-medium mb-1 p-2">Previous transcripts</h3>
//           <ul className="space-y-1 border-t border-gray-200 p-2">
//             {history.map((h) => (
//               <li key={h.sessionId} className="flex justify-between items-center border-b p-2 border-gray-200 ">
//                 <div className="flex flex-col">
//                   <span className="text-sm font-medium">{h.filename}</span>
//                   <span className="text-xs text-gray-400">{formatDate(h.createdAt)}</span>
//                 </div>
//                 <div className="flex items-center gap-1">
//                   <DropdownMenu>
//                     <DropdownMenuTrigger asChild>
//                       <Button variant="ghost" size="icon">
//                         <Download className="h-5 w-5" />
//                       </Button>
//                     </DropdownMenuTrigger>
//                     <DropdownMenuContent align="end" className="w-44">
//                       <div className="flex items-center gap-2 px-2 py-2 text-xs border-b">
//                         <Checkbox
//                           id={`timestamps-${h.sessionId}`}
//                           checked={withTimestamps}
//                           onCheckedChange={(val) =>
//                             setWithTimestamps(val === true)
//                           }
//                           className="size-4"
//                         />
//                         <label
//                           htmlFor={`timestamps-${h.sessionId}`}
//                           className="cursor-pointer select-none"
//                         >
//                           Include timestamps
//                         </label>
//                       </div>
//                       <DropdownMenuItem
//                         onClick={() =>
//                           exportTXT(h.segments, `${h.filename}.txt`, withTimestamps)
//                         }
//                       >
//                         Download as .txt
//                       </DropdownMenuItem>
//                       <DropdownMenuItem
//                         onClick={() =>
//                           exportDOCX(h.segments, `${h.filename}.docx`, withTimestamps)
//                         }
//                       >
//                         Download as .docx
//                       </DropdownMenuItem>
//                       <DropdownMenuItem
//                         onClick={() =>
//                           exportPDF(h.segments, `${h.filename}.pdf`, withTimestamps)
//                         }
//                       >
//                         Download as .pdf
//                       </DropdownMenuItem>
//                     </DropdownMenuContent>
//                   </DropdownMenu>
//                   <Button variant="ghost" size="icon" onClick={() => handleDeleteHistory(h.sessionId)} aria-label="Delete transcript">
//                     <Trash className="h-5 w-5 text-red-500 hover:text-red-700" />
//                   </Button>
//                 </div>
//               </li>
//             ))}
//           </ul>
//         </div>
//       )}
//     </>
//   );
// }

"use client"
import { useRef, useState, useCallback, useEffect } from "react"
import type React from "react"

import Waveform from "@/components/Waveform"
import TranscriptEditor from "@/components/TranscriptEditor"
import type { Segment } from "@/lib/parseTranscript"
import { exportTXT, exportDOCX, exportPDF } from "@/lib/exporters"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, Play, Pause, Loader2, Trash, TriangleAlert, Save, FolderOpen, FileAudio2, FileDown} from "lucide-react"
import type WaveSurfer from "wavesurfer.js"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { v4 as uuidv4 } from "uuid"
import Notification from "@/components/Notification"
import type { SerializedEditorState, SerializedLexicalNode } from "lexical";

interface TranscriptHistoryItem {
  session_id: string
  filename: string
  audio_url?: string
  updated?: string
}

interface NotificationState {
  message: string
  type: "success" | "error" | "info"
}

interface RichSegment extends Segment {
  rich_text?: SerializedEditorState<SerializedLexicalNode> | null;
}

const API_BASE = "https://app-772741460830.us-central1.run.app/api"

export default function V2TranscriptEditor() {
  const [notification, setNotification] = useState<NotificationState | null>(null)

  const showNotification = (message: string, type: "success" | "error" | "info" = "info") => {
    setNotification({ message, type })
  }

  const formatDate = (ts: string | number) => {
    const d = new Date(ts)
    return d.toLocaleString()
  }

  const [audioFile, setAudioFile] = useState<string | File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [segments, setSegments] = useState<RichSegment[]>([]);
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [withTimestamps, setWithTimestamps] = useState(false)
  const [status, setStatus] = useState<"idle" | "starting" | "uploading" | "transcribing" | "loading">("idle")
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [currentFilename, setCurrentFilename] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [downloadingAudioId, setDownloadingAudioId] = useState<string | null>(null)
  const [history, setHistory] = useState<TranscriptHistoryItem[]>([])

  const wsRef = useRef<WaveSurfer | null>(null)

  const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00"
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}

  useEffect(() => {
    loadTranscriptHistory()
  }, [])

  const loadTranscriptHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/transcripts`)
      if (res.ok) {
        const data = await res.json()
        setHistory(data.transcripts || [])
      }
    } catch (err) {
      console.error("Failed to load transcript history:", err)
    }
  }

  const onWaveReady = useCallback((ws: WaveSurfer) => {
    wsRef.current = ws
    setDuration(ws.getDuration())
  }, [])

  function timeStrToSeconds(str: string): number {
    const [h, m, s] = str.split(":")
    const [sec, ms = "0"] = s.split(".")
    return Number(h) * 3600 + Number(m) * 60 + Number(sec) + (ms ? Number("0." + ms) : 0)
  }

  function uploadFileWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("PUT", url, true)
      xhr.setRequestHeader("Content-Type", file.type)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100)
          onProgress(pct)
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      }

      xhr.onerror = () => reject(new Error("Upload error"))
      xhr.send(file)
    })
  }

  const handleAudio = useCallback(async (f?: File) => {
    if (!f) return

    const sessionId = uuidv4()
    setAudioFile(f)
    setAudioUrl(null)
    setSegments([])
    setUploadProgress(0)
    setStatus("starting")
    setCurrentSessionId(sessionId)
    setCurrentFilename(f.name)
    setHasUnsavedChanges(false)

    const filename = `uploads/${Date.now()}-${f.name}`

    try {
      const res1 = await fetch(`${API_BASE}/gcs-upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, contentType: f.type }),
      })

      if (!res1.ok) {
        throw new Error("Failed to get upload URL")
      }

      const { url, publicUrl } = await res1.json()

      setStatus("uploading")
      await uploadFileWithProgress(url, f, (pct) => setUploadProgress(pct))

      setStatus("transcribing")
      const res2 = await fetch(`${API_BASE}/process-gcs-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gcsUrl: publicUrl, sessionId }),
      })

      if (!res2.ok) throw new Error("Failed to transcribe audio")
      const data = await res2.json()

      if (Array.isArray(data.segments)) {
        const parsed = data.segments.map(
          (seg: { speaker: string; start: string; end: string; text: string }, idx: number) => ({
            ...seg,
            start: timeStrToSeconds(seg.start),
            end: timeStrToSeconds(seg.end),
            id: `${seg.speaker}-${seg.start}-${seg.end}-${idx}`,
          }),
        )
        setSegments(parsed)
        setAudioUrl(publicUrl)

        await fetch(`${API_BASE}/transcript/${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            segments: parsed,
            audio_url: publicUrl,
            filename: f.name,
            created_at: new Date().toISOString(),
          }),
        })

        await loadTranscriptHistory()

        showNotification("Transcription complete and saved", "success")
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Unknown error", "error")
    } finally {
      setStatus("idle")
      setUploadProgress(0)
    }
  }, [])

  const handleDownloadAudio = async (sessionId: string, filename?: string) => {
    setDownloadingAudioId(sessionId);
    try {
      const res = await fetch(`${API_BASE}/download-audio/${sessionId}`);
      if (!res.ok) throw new Error("Failed to download audio");

      // Extract the real filename from Content-Disposition header
      const disposition = res.headers.get("Content-Disposition");
      let extractedFilename: string | null = null;
      if (disposition && disposition.includes("filename=")) {
        extractedFilename = disposition.split("filename=")[1].replace(/["']/g, "").trim();
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = extractedFilename || filename || `${sessionId}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Download failed", "error");
    }
    finally {
      setDownloadingAudioId(null);
    }
  };


const handleLoadTranscript = async (sessionId: string) => {
  setStatus("loading");
  try {
    const res = await fetch(`${API_BASE}/transcript/${sessionId}`);
    if (!res.ok) throw new Error("Failed to load transcript");

    type TranscriptResponse = {
      segments: { speaker: string; start: string | number; end: string | number; text: string; id?: string }[];
      filename?: string;
      created_at?: string;
    };

    const data: TranscriptResponse = await res.json();
    const playbackUrl = `${API_BASE}/audio/${sessionId}`;

    const audioResp = await fetch(playbackUrl);
    const blob = await audioResp.blob();
    const blobUrl = URL.createObjectURL(blob);

    const parsed: Segment[] = data.segments.map(
      (seg: TranscriptResponse["segments"][number], idx: number): Segment => ({
        ...seg,
        start: typeof seg.start === "string" ? timeStrToSeconds(seg.start) : seg.start,
        end:   typeof seg.end   === "string" ? timeStrToSeconds(seg.end)   : seg.end,
        id: seg.id || `${seg.speaker}-${seg.start}-${seg.end}-${idx}`,
      })
    );
    setCurrentTime(0);
    setSegments(parsed);
    setCurrentSessionId(sessionId);
    setCurrentFilename(data.filename ?? null);
    setAudioFile(blobUrl);
    setAudioUrl(blobUrl);
    setHasUnsavedChanges(false);
    showNotification(`Loaded ${data.filename}`, "success");
  } catch (err) {
    showNotification(err instanceof Error ? err.message : "Failed to load transcript", "error");
  } finally {
    setStatus("idle");
  }
};

  const handleSaveChanges = async () => {
    if (!currentSessionId) return

    try {
      await fetch(`${API_BASE}/transcript/${currentSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments,
          filename: currentFilename,
        }),
      })

      setHasUnsavedChanges(false)
      await loadTranscriptHistory()

      showNotification("Changes saved successfully", "success")
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Failed to save changes", "error")
    }
  }

  const handleSegmentsChange = useCallback((newSegments: Segment[]) => {
    setSegments(newSegments)
    setHasUnsavedChanges(true)
  }, [])

  const handleDeleteHistory = useCallback(async (sessionId: string) => {
    try {
      if (!confirm("Are you sure you want to delete this transcript and its audio file?")) return;
      const res = await fetch(`${API_BASE}/transcript/${sessionId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete transcript");

      await loadTranscriptHistory();

      showNotification("Transcript and audio deleted successfully", "success");

      // Optional: Clear currently loaded transcript if it's the one being deleted
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setAudioFile(null);
        setAudioUrl(null);
        setSegments([]);
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Failed to delete transcript", "error");
    }
  }, [currentSessionId, loadTranscriptHistory]);


  const handleSeek = useCallback((t: number) => wsRef.current?.setTime(t), [])
  const handlePlayPause = useCallback(() => wsRef.current?.playPause(), [])
  const onTimeUpdate = useCallback((t: number) => setCurrentTime(t), [])
  const isPlaying = !!wsRef.current?.isPlaying()

  const handleAudioDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleAudioDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file) handleAudio(file)
  }

  return (
    <>
      {notification && (
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}

      <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: "hsl(0 0% 98%)" }}>
          {status !== "idle" ? ( 
          <div className="flex flex-col items-center justify-center w-full h-32 text-gray-500">
            {status === "starting" && (
              <>
                <span className="text-sm animate-pulse">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                  Waiting for Backend...
                </span>
                <div className="flex items-center mt-2 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded px-2 py-1 text-xs">
                  <TriangleAlert className="w-4 h-4 mr-1 text-yellow-500" />
                  Could take a couple of minutes. Please keep the page open.
                </div>
              </>
            )}
            {status === "uploading" && (
              <>
                <span className="text-xs mb-2 text-gray-500 tracking-wide font-medium">
                  Uploading audio... {uploadProgress}%
                </span>
                <Progress value={uploadProgress} className="w-full h-3 rounded-lg" />
              </>
            )}
            {status === "transcribing" && (
              <>
                <span className="text-sm animate-pulse">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                  Transcribing audio...
                </span>
                <div className="flex items-center mt-2 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded px-2 py-1 text-xs">
                  <TriangleAlert className="w-4 h-4 mr-1 text-yellow-500" />
                  Could take a couple of minutes. Please keep page open, and only run one transcription at a time.
                </div>
              </>
            )}
            {status === "loading" && (
              <span className="text-sm animate-pulse">
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                Loading transcript...
              </span>
            )}
          </div>
        ) : !audioFile ? (
          <label
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition"
            onDragOver={handleAudioDragOver}
            onDrop={handleAudioDrop}
          >
            <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleAudio(e.target.files?.[0])} />
            <span className="text-sm text-gray-600">
              <span className="font-semibold">Click to upload</span> or{" "}
              <span className="font-semibold">Drag and drop</span> audio
            </span>
          </label>
        ) : (
          <div className="space-y-2">
            {currentFilename && (
              <div className="flex items-center justify-between text-sm text-gray-600 pb-2 border-b">
                <span className="font-medium">{currentFilename}</span>
                {hasUnsavedChanges && (
                  <span className="text-xs text-amber-600 flex items-center gap-1">
                    <span className="w-2 h-2 bg-amber-600 rounded-full"></span>
                    Unsaved changes
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={handlePlayPause} size="sm">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>

              <span className="text-xs font-mono text-gray-500 w-10 text-right">
                {formatTime(currentTime)}
              </span>

              <div className="flex-1">
                <Waveform file={audioFile} onReadyAction={onWaveReady} onTimeUpdateAction={onTimeUpdate} />
              </div>

              <span className="text-xs font-mono text-gray-500 w-10 text-left">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        )}
      </div>

      {audioFile && status === "idle" && segments.length > 0 && (
        <div className="rounded-lg shadow-md p-4 relative" style={{ backgroundColor: "hsl(0 0% 98%)" }}>
          <div className="flex justify-between items-center border-b pb-2">
            <div className="mb-1">
              <h2 className="text-lg font-medium">Transcript</h2>
              <p className="text-sm text-gray-500">Click a segment to jump in audio</p>
            </div>
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Button onClick={handleSaveChanges} size="sm" className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Download className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <div className="flex items-center gap-2 px-2 py-2 text-xs border-b">
                    <Checkbox
                      id="timestamps"
                      checked={withTimestamps}
                      onCheckedChange={(val) => setWithTimestamps(val === true)}
                      className="size-4"
                    />
                    <label htmlFor="timestamps" className="cursor-pointer select-none">
                      Include timestamps
                    </label>
                  </div>
                  <DropdownMenuItem onClick={() => exportTXT(segments, `${currentFilename || "transcript"}_transcribed.txt`, withTimestamps)}>
                    Download as .txt
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportDOCX(segments, `${currentFilename || "transcript"}_transcribed.docx`, withTimestamps)}>
                    Download as .docx
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportPDF(segments, `${currentFilename || "transcript"}_transcribed.pdf`, withTimestamps)}>
                    Download as .pdf
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <TranscriptEditor
            segments={segments}
            currentTime={currentTime}
            onChangeAction={handleSegmentsChange}
            onSeekAction={handleSeek}
          />
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4 rounded-lg shadow-md bg-white">
          <div className="p-4 border-b bg-gray-50 rounded-t-lg">
            <h3 className="font-medium flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Previous Transcripts
            </h3>
          </div>
          <ul className="divide-y">
            {history.map((h) => (
              <li
                key={h.session_id}
                className={`flex justify-between items-center p-4 hover:bg-gray-50 transition ${
                  currentSessionId === h.session_id ? "bg-sky-50 border-l-4 border-sky-500" : ""
                }`}
              >
                <button
                  onClick={() => handleLoadTranscript(h.session_id)}
                  className="flex flex-col items-start flex-1 text-left"
                >
                  <span className="text-sm font-medium text-gray-900">{h.filename || "Untitled"}</span>
                  <span className="text-xs text-gray-400">{h.updated ? formatDate(h.updated) : "No date"}</span>
                </button>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadAudio(h.session_id, h.filename)}
                    aria-label="Download audio"
                    title="Download Audio"
                    className="flex items-center gap-2 px-2"
                    disabled={downloadingAudioId === h.session_id}
                  >
                    {downloadingAudioId === h.session_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileAudio2 className="h-5 w-5" />
                    )}
                    <span className="hidden sm:inline text-xs text-gray-800">Download Audio</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" aria-label="Download Transcript" title="Download Transcript" className="flex items-center gap-2 px-2">
                        <FileDown className="h-5 w-5" />
                        <span className="hidden sm:inline text-xs text-gray-800">Download Transcript</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <div className="flex items-center gap-2 px-2 py-2 text-xs border-b">
                        <Checkbox
                          id={`timestamps-${h.session_id}`}
                          checked={withTimestamps}
                          onCheckedChange={(val) => setWithTimestamps(val === true)}
                          className="size-4"
                        />
                        <label htmlFor={`timestamps-${h.session_id}`} className="cursor-pointer select-none">
                          Include timestamps
                        </label>
                      </div>
                      <DropdownMenuItem
                        onClick={async () => {
                          const res = await fetch(`${API_BASE}/transcript/${h.session_id}`)
                          const data = await res.json()
                          exportTXT(data.segments, `${h.filename}_transcribed.txt`, withTimestamps)
                        }}
                      >
                        Download as .txt
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          const res = await fetch(`${API_BASE}/transcript/${h.session_id}`)
                          const data = await res.json()
                          exportDOCX(data.segments, `${h.filename}_transcribed.docx`, withTimestamps)
                        }}
                      >
                        Download as .docx
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          const res = await fetch(`${API_BASE}/transcript/${h.session_id}`)
                          const data = await res.json()
                          exportPDF(data.segments, `${h.filename}_transcribed.pdf`, withTimestamps)
                        }}
                      >
                        Download as .pdf
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDeleteHistory(h.session_id)}
                    aria-label="Delete Transcript and Audio" 
                    title="Delete Transcript and Audio"
                  >
                    <Trash className="h-5 w-5 text-red-500 hover:text-red-700" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
