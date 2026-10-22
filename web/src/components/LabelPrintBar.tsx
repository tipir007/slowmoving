"use client";

import { markPrintedAction } from "@/lib/actions";

export function LabelPrintBar({ dispositionId }: { dispositionId: string }) {
  return (
    <div className="grid-2 no-print" style={{ margin: "12px 0 16px" }}>
      <button className="btn sulfur" type="button" onClick={() => window.print()}>
        Cetak / PDF
      </button>
      <form action={markPrintedAction}>
        <input type="hidden" name="id" value={dispositionId} />
        <button className="btn ghost" type="submit">
          Sudah dicetak
        </button>
      </form>
    </div>
  );
}
