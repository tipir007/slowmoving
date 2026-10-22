"use client";

import { deleteSkidAction } from "@/lib/actions";

export function DeleteSkidButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  return (
    <form
      action={deleteSkidAction}
      onSubmit={(e) => {
        if (!confirm(`Hapus ${label} dari rak?\n\nTag OPEN ikut dihapus. Skid yang sudah dipakai di mesin tidak bisa dihapus.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="btn danger" type="submit">
        Hapus dari rak
      </button>
    </form>
  );
}
