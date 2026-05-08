import { cookies } from "next/headers";

export async function getSession() {
  // Sin caché — la cookie de sesión cambia al hacer login/logout
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  return token ?? null;
}

export async function setSession(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("token", token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 // ← cambia el 60 por esto (1 día)
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("token");
}