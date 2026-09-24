"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Shell from "@/components/Shell.js";
import JoinModal from "@/components/JoinModal.js";

function Join() {
  const params = useSearchParams();
  const router = useRouter();
  return <main className="page"><JoinModal initial={(params.get("code") || "").toUpperCase()} onClose={() => router.push("/groups")} /></main>;
}

export default function Page() {
  return <Shell><Suspense><Join /></Suspense></Shell>;
}
