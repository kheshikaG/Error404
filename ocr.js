"use client";
// Receipt OCR with Tesseract, running in the browser from local files (works offline).
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.Tesseract) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("We couldn't start the receipt scanner. Run npm install again, then restart the app."));
    document.head.appendChild(s);
  });
}

export async function readReceiptText(dataUrl, onProgress) {
  await loadScript("/tesseract/tesseract.min.js");
  const o = window.location.origin;
  const worker = await window.Tesseract.createWorker("eng", 1, {
    workerPath: o + "/tesseract/worker.min.js",
    corePath: o + "/tesseract/core",
    langPath: o + "/tesseract/lang",
    logger: (m) => m.status === "recognizing text" && onProgress?.(Math.round(m.progress * 100)),
  });
  try {
    const { data } = await worker.recognize(dataUrl);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
