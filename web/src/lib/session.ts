import { cookies } from "next/headers";
import { ROLES, type RoleId } from "./constants";

const NIK_KEY = "rk_nik";
const ROLE_KEY = "rk_role";
const NAME_KEY = "rk_name";

export type Session = { nik: string; role: RoleId; name: string };

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const nik = jar.get(NIK_KEY)?.value || "";
  const role = jar.get(ROLE_KEY)?.value;
  const name = jar.get(NAME_KEY)?.value || "";
  const valid = ROLES.find((r) => r.id === role);
  if (!nik || !valid || !name) return null;
  return { nik, role: valid.id, name };
}

export async function setSession(session: Session) {
  const jar = await cookies();
  const opts = { path: "/", httpOnly: true, sameSite: "lax" as const };
  jar.set(NIK_KEY, session.nik, opts);
  jar.set(ROLE_KEY, session.role, opts);
  jar.set(NAME_KEY, session.name, opts);
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(NIK_KEY);
  jar.delete(ROLE_KEY);
  jar.delete(NAME_KEY);
}
