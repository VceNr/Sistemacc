import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path:     "/",
  maxAge:   60 * 60, // 1 hora
};

const ALLOWED_ROLES = ["super-admin", "admin", "analista"];

// POST /api/auth/session  →  establece las cookies de sesión con HttpOnly
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, rol } = body;

    if (!uid || typeof uid !== "string" || uid.trim() === "") {
      return NextResponse.json({ error: "uid inválido" }, { status: 400 });
    }
    if (!rol || !ALLOWED_ROLES.includes(rol)) {
      return NextResponse.json({ error: "rol inválido" }, { status: 400 });
    }

    const store = await cookies();
    store.set("token", uid.trim(), COOKIE_OPTS);
    store.set("rol",   rol,        COOKIE_OPTS);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/auth/session  →  elimina las cookies de sesión
export async function DELETE() {
  try {
    const store = await cookies();
    store.delete("token");
    store.delete("rol");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
