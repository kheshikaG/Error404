"use client";
import { useEffect, useRef, useState } from "react";

// Browser speech-to-text (Chrome / Edge). Never saves anything by itself.
export function useSpeech(onText) {
  const rec = useRef(null);
  const cb = useRef(onText);
  cb.current = onText;
  const [live, setLive] = useState(false);
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { setSupported(false); return; }
    const r = new SR();
    r.lang = navigator.language?.startsWith("en") ? navigator.language : "en-US";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => cb.current(Array.from(e.results).map((x) => x[0].transcript).join(" "), e.results[e.results.length - 1].isFinal);
    r.onend = () => setLive(false);
    r.onerror = () => setLive(false);
    rec.current = r;
    return () => { try { r.abort(); } catch {} };
  }, []);
  const toggle = () => {
    if (!rec.current) return;
    if (live) { rec.current.stop(); setLive(false); }
    else { try { rec.current.start(); setLive(true); } catch {} }
  };
  return { live, toggle, supported };
}
