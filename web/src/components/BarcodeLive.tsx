"use client";

import { useEffect, useRef, useState } from "react";
import { decodeBarcode, type BarcodeKind, type DecodedBarcode } from "@/lib/barcode";

type Mode = "ticket" | "sm1";

type Props = {
  mode?: Mode;
  title?: string;
  autoStart?: boolean;
  onHit: (decoded: DecodedBarcode) => "continue" | "stop" | Promise<"continue" | "stop">;
};

export function BarcodeLive({ mode = "ticket", title, autoStart = false, onHit }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const running = useRef(false);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(
    mode === "sm1"
      ? "Scan QR / Code128 pada label SM1 yang dicetak."
      : "Scan dua barcode tiket: atas = compound, samping = run+skid.",
  );
  const [typed, setTyped] = useState("");

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoStart || open || running.current) return;
    const t = window.setTimeout(() => {
      void start();
    }, 80);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  async function start() {
    setOpen(true);
    running.current = true;
    setHint("Menyalakan kamera…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      const Detector = window.BarcodeDetector;
      if (!Detector) {
        setHint("Browser ini belum bisa decode live. Tempel kode di kolom bawah.");
        return;
      }
      const detector = new Detector({
        formats: ["code_128", "code_39", "code_93", "ean_13", "qr_code"],
      });
      setHint(
        mode === "sm1"
          ? "Arahkan ke QR atau garis barcode label SM1."
          : "Arahkan ke barcode atas, lalu samping. Jangan tutup sampai keduanya terbaca.",
      );

      const seen = new Set<string>();
      const tick = async () => {
        if (!running.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          for (const code of codes) {
            const raw = code.rawValue?.trim();
            if (!raw || seen.has(raw)) continue;
            seen.add(raw);
            const decoded = decodeBarcode(raw);
            const next = await onHit(decoded);
            if (next === "stop") {
              stop();
              return;
            }
          }
        } catch {
          /* keep scanning */
        }
        window.setTimeout(tick, 280);
      };
      window.setTimeout(tick, 280);
    } catch {
      setHint("Kamera ditolak. Tempel / ketik kode.");
    }
  }

  function stop() {
    running.current = false;
    const video = videoRef.current;
    const stream = video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (video) video.srcObject = null;
    setOpen(false);
  }

  async function submitTyped(raw: string) {
    const decoded = decodeBarcode(raw);
    const next = await onHit(decoded);
    setTyped("");
    if (next === "stop") stop();
  }

  return (
    <div className="scan-box">
      <div className="row-between" style={{ alignItems: "center" }}>
        <strong>{title || (mode === "sm1" ? "Scan label SM1" : "Scan Mixer Ticket")}</strong>
        {open ? (
          <button type="button" className="chip" onClick={stop}>
            Tutup
          </button>
        ) : (
          <button type="button" className="chip on" onClick={start}>
            Buka kamera
          </button>
        )}
      </div>
      {open ? <video ref={videoRef} muted playsInline autoPlay /> : null}
      <p className="muted" style={{ margin: "8px 0 8px" }}>
        {hint}
      </p>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Tempel / ketik kode</label>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={mode === "sm1" ? "SM1|3001|T7131|790392|3|dp_…" : "S6H63  atau  785751003"}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (typed.trim()) submitTyped(typed);
            }
          }}
        />
        <button
          type="button"
          className="btn ghost"
          style={{ marginTop: 8 }}
          onClick={() => typed.trim() && submitTyped(typed)}
        >
          Pakai kode
        </button>
      </div>
    </div>
  );
}

export function kindLabel(kind: BarcodeKind) {
  if (kind === "compound") return "compound (barcode atas)";
  if (kind === "run_skid") return "run+skid (barcode samping)";
  if (kind === "sm1") return "label SM1";
  return "tidak dikenali";
}
