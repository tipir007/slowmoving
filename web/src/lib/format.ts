export function kg(n: number | null | undefined) {
  const v = Number(n || 0);
  return `${v.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg`;
}

export function stampDate(iso?: string | null) {
  if (!iso) return "—";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso.trim());
  const d = new Date(dateOnly ? `${iso}T00:00:00+07:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (dateOnly) {
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
  }
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

export function daysTo(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export function ageingClass(iso?: string | null) {
  const n = daysTo(iso);
  if (n === null) return "";
  if (n < 0) return "expired";
  if (n <= 2) return "soon";
  return "";
}
