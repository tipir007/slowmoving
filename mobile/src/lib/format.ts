const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Tampilkan tanggal tiket; jam hanya jika ada. Tidak mengarang 00:00. */
export function stampTicket(iso?: string | null) {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2}))?/);
  if (!m) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    });
  }
  const day = `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
  return m[4] ? `${day} ${m[4]}` : day;
}

export function stampSystem(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}
