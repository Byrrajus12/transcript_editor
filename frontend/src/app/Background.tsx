"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

export default function Background() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) {
      document.body.classList.add("bg-loaded");
    }
  }, [loaded]);

  return (
    <>
      <Image
        src="/gradient-background.jpg"
        alt="Background"
        fill
        priority
        sizes="100vw"
        onLoadingComplete={() => setLoaded(true)}
        style={{
          objectFit: "cover",
          zIndex: -1,
        }}
      />

      {/* optional translucent overlay for aesthetic balance */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] z-0 pointer-events-none" />
    </>
  );
}
