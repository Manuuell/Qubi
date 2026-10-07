import { cookies } from "next/headers";
import { isValidJoinToken } from "@/lib/join-token";

// set/take/clear escriben cookies y solo deben llamarse desde Server Actions o
// Route Handlers. read solo lee y también es seguro en Server Components.
const COOKIE = "qubi.join";
const MAX_AGE = 60 * 60;

export async function setPendingJoin(token: string): Promise<void> {
  if (!isValidJoinToken(token)) return;
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function readPendingJoin(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  return isValidJoinToken(value) ? value : null;
}

export async function takePendingJoin(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(COOKIE)?.value;
  if (store.has(COOKIE)) store.delete(COOKIE);
  return isValidJoinToken(value) ? value : null;
}

export async function clearPendingJoin(): Promise<void> {
  const store = await cookies();
  if (store.has(COOKIE)) store.delete(COOKIE);
}
