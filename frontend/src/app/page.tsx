
'use client';
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { Button } from "@/components/ui/button";
// --- V2: End-to-end transcript editor (audio only) ---
import V2TranscriptEditor from "./V2TranscriptEditor";

// --- V1: Manual transcript upload ---
import V1TranscriptEditor from "./V1TranscriptEditor";

export default function Page() {
  const [tab, setTab] = useState<"v2" | "v1">("v2");
  const [sessionChecked, setSessionChecked] = useState(false);
  const router = useRouter()

  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // no session -> navigate to login
        router.replace('/login')
        return
      }
      // session present -> allow render
      if (mounted) setSessionChecked(true)
    }
    checkSession()
    return () => { mounted = false }
  }, [router])

  // Only add the 'loaded' class after the session check completes
  useEffect(() => {
    if (sessionChecked && typeof window !== "undefined") {
      document.body.classList.add("loaded");
    }
  }, [sessionChecked]);
  
  if (!sessionChecked) {
    // While verifying session, don't render the page. This prevents
    // the UI from appearing briefly before redirecting an unauthenticated user.
    return null
  }

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