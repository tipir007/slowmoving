"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BarcodeLive } from "@/components/BarcodeLive";
import { resolveScanAction, verifyDispositionAction } from "@/lib/actions";
import type { DecodedBarcode } from "@/lib/barcode";

type Props = {
  purpose: "execute" | "verify";
  expectedId?: string;
};

export function ScanSm1({ purpose, expectedId }: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "bad" | null>(null);
  const [, startTransition] = useTransition();

  async function onHit(decoded: DecodedBarcode): Promise<"continue" | "stop"> {
    if (decoded.kind !== "sm1" || !decoded.sm1) {
      setTone("bad");
      setMsg(
        decoded.kind === "compound" || decoded.kind === "run_skid"
          ? "Ini Mixer Ticket, bukan label SM1. Scan QR/barcode tag yang dicetak dari Disposisi."
          : decoded.message || "Kode tidak dikenali.",
      );
      return "continue";
    }

    if (purpose === "verify") {
      const res = await verifyDispositionAction(decoded.raw, expectedId);
      setTone(res.ok ? "ok" : "bad");
      setMsg(res.message);
      if (res.ok) startTransition(() => router.refresh());
      return res.ok ? "stop" : "continue";
    }

    const res = await resolveScanAction(decoded.raw);
    if (!res.ok) {
      setTone("bad");
      setMsg(res.error);
      return "continue";
    }
    setTone("ok");
    setMsg(`Tag #${res.tagNo} · ${res.compound} run ${res.runNo}.`);
    router.push(`/eksekusi?skid=${res.skidId}&disp=${res.dispositionId}`);
    return "stop";
  }

  return (
    <div>
      <BarcodeLive
        mode="sm1"
        autoStart={purpose === "execute"}
        title={purpose === "verify" ? "Scan verify tempel" : "Scan label SM1"}
        onHit={onHit}
      />
      {msg ? <div className={tone === "ok" ? "alert ok" : "alert"}>{msg}</div> : null}
    </div>
  );
}
