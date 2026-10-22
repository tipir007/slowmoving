import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import type { RoleId } from "@/lib/constants";

const NAV = [
  { href: "/", label: "Stok" },
  { href: "/dashboard", label: "Papan" },
  { href: "/daftar", label: "Daftar" },
  { href: "/disposisi", label: "Dispo" },
  { href: "/eksekusi", label: "Pakai" },
  { href: "/kamus", label: "Kamus" },
];

export function AppShell({
  role,
  name,
  nik,
  path,
  wide,
  children,
}: {
  role: RoleId;
  name: string;
  nik?: string;
  path: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`app-shell${wide ? " wide" : ""}`}>
      <header className="topbar">
        <div>
          <div className="brand">RAK MERAH</div>
          <small>COMPOUND SLOW MOVING</small>
        </div>
        <form action={logoutAction}>
          <button className="role-chip" type="submit">
            {nik || name} · {role}
          </button>
        </form>
      </header>
      <main className="page">{children}</main>
      <nav className="bottom-nav">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={path === item.href || (item.href !== "/" && path.startsWith(item.href)) ? "on" : ""}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
