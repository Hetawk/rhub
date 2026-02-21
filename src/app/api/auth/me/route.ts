import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSessionFull } from "@/lib/auth";

// Helper to create a no-cache response
function noCache(data: unknown, status = 200) {
  const res = NextResponse.json(data, { status });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return noCache({ user: null });
    }

    const result = await validateSessionFull(token);

    if (!result) {
      cookieStore.delete("auth_token");
      return noCache({ user: null });
    }

    const { user, sessionCreatedAt } = result;

    return noCache({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      // roleChangedAt lets the client show a "please re-login" banner
      roleChangedAt: user.roleChangedAt ?? null,
      sessionCreatedAt: sessionCreatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Me error:", error);
    return noCache({ user: null }, 500);
  }
}
