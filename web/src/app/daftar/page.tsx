import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RegisterForm } from "@/components/RegisterForm";
import { getSession } from "@/lib/session";

export default async function DaftarPage() {
  const session = await getSession();
  if (!session) redirect("/masuk");
  return (
    <AppShell role={session.role} name={session.name} nik={session.nik} path="/daftar">
      <p className="h-kicker">Register skid</p>
      <h1 className="page-title">DARI MIXER TICKET</h1>
      <p className="muted" style={{ marginTop: -8, marginBottom: 12 }}>
        Tab <strong>Live</strong> = kamera barcode (atas compound, samping run+skid). Foto/Galeri mengisi
        Teks OCR, lalu pecah ke field. Tanggal wajib; jam boleh kosong. Kg tetap diketik.
        Kamera live butuh HTTPS (bukan IP http).
      </p>
      <RegisterForm />
    </AppShell>
  );
}
