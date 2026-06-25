import { cookies } from "next/headers";
import { createSwitchToken } from "@/lib/switch-token";

// "Anillo de cuentas": cookie httpOnly con las cuentas vistas en este navegador.
// Cada entrada guarda un token de cambio firmado para entrar sin contraseña.
// Solo se lee/escribe en el servidor; los tokens nunca llegan al cliente.

const COOKIE = "qubi.accounts";
const MAX_ACCOUNTS = 5;
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

export type RingEntry = {
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  token: string;
};

type RingUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

export async function readRing(): Promise<RingEntry[]> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RingEntry =>
        e && typeof e.userId === "string" && typeof e.token === "string",
    );
  } catch {
    return [];
  }
}

async function writeRing(entries: RingEntry[]) {
  const store = await cookies();
  if (entries.length === 0) {
    store.delete(COOKIE);
    return;
  }
  store.set(COOKIE, JSON.stringify(entries), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

// Inserta (o refresca) una cuenta al frente del anillo, sin duplicados.
export async function addToRing(user: RingUser) {
  const entries = await readRing();
  const token = createSwitchToken({
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  });
  const next: RingEntry[] = [
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      token,
    },
    ...entries.filter((e) => e.userId !== user.id),
  ];
  await writeRing(next.slice(0, MAX_ACCOUNTS));
}

export async function removeFromRing(userId: string) {
  const entries = await readRing();
  await writeRing(entries.filter((e) => e.userId !== userId));
}
