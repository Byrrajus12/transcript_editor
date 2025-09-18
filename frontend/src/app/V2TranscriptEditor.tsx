"use client";
import { useRef, useState, useCallback } from "react";
import Waveform from "@/components/Waveform";
import TranscriptEditor from "@/components/TranscriptEditor";
import { Segment } from "@/lib/parseTranscript";
import { exportTXT, exportDOCX, exportPDF } from "@/lib/exporters";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Play, Pause, Loader2 } from "lucide-react";
import type WaveSurfer from "wavesurfer.js";
import { Checkbox } from "@/components/ui/checkbox";

export default function V2TranscriptEditor() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [withTimestamps, setWithTimestamps] = useState(false);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef<WaveSurfer | null>(null);

  const onWaveReady = useCallback((ws: WaveSurfer) => {
    wsRef.current = ws;
  }, []);

  function timeStrToSeconds(str: string): number {
    const [h, m, s] = str.split(":");
    const [sec, ms = "0"] = s.split(".");
    return (
      Number(h) * 3600 +
      Number(m) * 60 +
      Number(sec) +
      (ms ? Number("0." + ms) : 0)
    );
  }

  const handleAudio = useCallback(async (f?: File) => {
    setAudioFile(f ?? null);
    setSegments([]);
    if (!f) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", f);
      const res = await fetch("https://app-772741460830.us-central1.run.app/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to transcribe audio");
      const data = await res.json();
      if (Array.isArray(data.segments)) {
        setSegments(
          data.segments.map((seg: { speaker: string; start: string; end: string; text: string }, idx: number) => ({
            ...seg,
            start: timeStrToSeconds(seg.start),
            end: timeStrToSeconds(seg.end),
            id: `${seg.speaker}-${seg.start}-${seg.end}-${idx}`,
          }))
        );
      } else {
        throw new Error("Invalid response from backend");
      }
    } catch (err) {
      setSegments([]);
      alert("Error: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSeek = useCallback((t: number) => wsRef.current?.setTime(t), []);
  const handlePlayPause = useCallback(() => wsRef.current?.playPause(), []);
  const onTimeUpdate = useCallback((t: number) => setCurrentTime(t), []);
  const isPlaying = !!wsRef.current?.isPlaying();

  const handleAudioDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleAudioDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) handleAudio(file);
  };

  return (
    <>
      <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: 'hsl(0 0% 98%)' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center w-full h-32 text-gray-500">
            <span className="text-sm animate-pulse"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" />Transcribing audio</span>
          </div>
        ) : !audioFile ? (
          <label
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition"
            onDragOver={handleAudioDragOver}
            onDrop={handleAudioDrop}
          >
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => handleAudio(e.target.files?.[0])}
            />
            <span className="text-sm text-gray-600">
              <span className="font-semibold">Click to upload</span> or <span className="font-semibold">Drag and drop</span> audio
            </span>
          </label>
        ) : (
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handlePlayPause} size="sm">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <div className="flex-1">
              <Waveform
                file={audioFile}
                onReadyAction={onWaveReady}
                onTimeUpdateAction={onTimeUpdate}
              />
            </div>
          </div>
        )}
      </div>
      {audioFile && !loading && segments.length > 0 && (
        <div className="rounded-lg shadow-md p-4 relative" style={{ backgroundColor: 'hsl(0 0% 98%)' }}>
          <div className="flex justify-between items-center border-b">
            <div className="mb-1">
              <h2 className="text-lg font-medium">Transcript</h2>
              <p className="text-sm text-gray-500">
                Click a segment to jump in audio
              </p>
            </div>
            <div className="flex items-center gap-2">
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
                      onCheckedChange={val => setWithTimestamps(val === true)}
                      className="size-4"
                    />
                    <label htmlFor="timestamps" className="cursor-pointer select-none">
                      Include timestamps
                    </label>
                  </div>
                  <DropdownMenuItem onClick={() => exportTXT(segments, "transcript.txt", withTimestamps)}>
                    Download as .txt
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportDOCX(segments, "transcript.docx", withTimestamps)}>
                    Download as .docx
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportPDF(segments, "transcript.pdf", withTimestamps)}>
                    Download as .pdf
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <TranscriptEditor
            segments={segments}
            currentTime={currentTime}
            onChangeAction={setSegments}
            onSeekAction={handleSeek}
          />
        </div>
      )}
    </>
  );
}