"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onFile: (file: File | null) => void;
  mode?: "camera" | "gallery" | "both";
};

export function TicketPhoto({ onFile, mode = "both" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [hint, setHint] = useState("Foto masuk ke kotak Teks OCR, lalu pecah ke field.");

  useEffect(() => {
    return () => stop();
  }, []);

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLive(false);
  }

  function applyFile(file: File) {
    onFile(file);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    setHint("Foto siap. Boleh ganti sebelum simpan.");
    stop();
  }

  async function startCamera() {
    setHint("Meminta izin kamera…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setLive(true);
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setHint("Ambil foto seluruh tiket, termasuk barcode.");
    } catch {
      setHint("Kamera tidak bisa dibuka. Pakai pilih dari galeri / kamera HP.");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        applyFile(new File([blob], `mixer-ticket-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.85,
    );
  }

  return (
    <div className="scan-box">
      <label>Foto Mixer Ticket</label>
      <p className="muted" style={{ margin: "4px 0 8px" }}>
        {hint}
      </p>
      {live ? (
        <>
          <video ref={videoRef} playsInline muted autoPlay />
          <div className="grid-2" style={{ marginTop: 8 }}>
            <button className="btn" type="button" onClick={capture}>
              Ambil foto
            </button>
            <button className="btn ghost" type="button" onClick={stop}>
              Tutup kamera
            </button>
          </div>
        </>
      ) : (
        <div className={mode === "both" ? "grid-2" : undefined}>
          {mode !== "gallery" ? (
            <button className="btn" type="button" onClick={startCamera}>
              Buka kamera
            </button>
          ) : null}
          {mode !== "camera" ? (
            <label className="btn ghost" style={{ cursor: "pointer", display: "block", textAlign: "center" }}>
              Pilih dari galeri
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) applyFile(f);
                }}
              />
            </label>
          ) : null}
        </div>
      )}
      {preview ? (
        <img className="ticket-photo" src={preview} alt="Pratinjau Mixer Ticket" />
      ) : null}
    </div>
  );
}
