"use client";
import { useRef, useState, useCallback } from "react";
import Waveform from "@/components/Waveform";
import TranscriptEditor from "@/components/TranscriptEditor";
import { parseTranscript, Segment } from "@/lib/parseTranscript";
import { exportTXT, exportDOCX, exportPDF } from "@/lib/exporters";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Play, Pause } from "lucide-react";
import type WaveSurfer from "wavesurfer.js";
import { Checkbox } from "@/components/ui/checkbox";

export default function V1TranscriptEditor() {
  const [audioFile, setAudioFile] = useState<string | File | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [withTimestamps, setWithTimestamps] = useState(false);
  const wsRef = useRef<WaveSurfer | null>(null);

  const onWaveReady = useCallback((ws: WaveSurfer) => {
    wsRef.current = ws;
  }, []);

  const handleAudio = useCallback((f?: File) => setAudioFile(f ?? null), []);

  const handleTranscript = async (f?: File) => {
    if (!f) return setSegments([]);
    const text = await f.text();
    setSegments(parseTranscript(text));
  };

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
  const handleTranscriptDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleTranscriptDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) handleTranscript(file);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-4">
        {!audioFile ? (
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
      <div className="bg-white rounded-lg shadow-md p-4 relative">
        {!segments.length ? (
          <label
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition"
            onDragOver={handleTranscriptDragOver}
            onDrop={handleTranscriptDrop}
          >
            <input
              type="file"
              accept=".txt"
              className="hidden"
              onChange={(e) => handleTranscript(e.target.files?.[0])}
            />
            <span className="text-sm text-gray-600">
              <span className="font-semibold">Click to upload</span> or <span className="font-semibold">Drag and drop</span> transcript
            </span>
          </label>
        ) : (
          <>
            <div className="flex justify-between items-center border-b">
              <div className="mb-1">
                <h2 className="text-lg font-medium">Transcript</h2>
                <p className="text-sm text-gray-500">
                  Click a segment to jump in audio
                </p>
              </div>
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
            <TranscriptEditor
              segments={segments}
              currentTime={currentTime}
              onChangeAction={setSegments}
              onSeekAction={handleSeek}
            />
          </>
        )}
      </div>
    </>
  );
}