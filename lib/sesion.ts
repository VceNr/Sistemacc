import { cookies } from "next/headers";
import { cacheLife } from "next/cache";

export async function getSession() {
  "use cache";
  cacheLife("hours"); // expira en horas, también puedes usar "days", "weeks", o un objeto custom

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
    maxAge:   60 // 1 día en segundos
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("token");
}