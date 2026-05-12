import { cookies } from "next/headers";

// Lee el UID de sesión desde la cookie HttpOnly (uso en Server Components / Route Handlers)
export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("token")?.value ?? null;
}

// Lectura del rol para Server Components
export async function getSessionRol(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("rol")?.value ?? null;
}
