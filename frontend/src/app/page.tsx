"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

// --- V2: End-to-end transcript editor (audio only) ---
import V2TranscriptEditor from "./V2TranscriptEditor";

// --- V1: Manual transcript upload ---
import V1TranscriptEditor from "./V1TranscriptEditor";

export default function Page() {
  const [tab, setTab] = useState<"v2" | "v1">("v2");

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="rounded-lg shadow-md p-4 mb-2" style={{ backgroundColor: 'hsl(0 0% 98%)' }}>
        <h1 className="text-2xl text-center font-semibold">Transcript Editor</h1>
        <div className="mt-4">
          <div className="inline-flex flex-wrap p-2 gap-2 rounded-md outline outline-1 outline-gray-300 mx-auto w-max max-w-full">
            <Button
              variant={tab === "v2" ? "default" : "outline"}
              onClick={() => setTab("v2")}
            >
              End-to-end (Audio Only)
            </Button>
            <Button
              variant={tab === "v1" ? "default" : "outline"}
              onClick={() => setTab("v1")}
            >
              Manual Transcript Upload
            </Button>
          </div>
        </div>
      </div>
      {tab === "v2" ? <V2TranscriptEditor /> : <V1TranscriptEditor />}
    </main>
  );
}