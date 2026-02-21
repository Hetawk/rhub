import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSessionFull } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const result = await validateSessionFull(token);

    if (!result) {
      cookieStore.delete("auth_token");
      return NextResponse.json({ user: null });
    }

    const { user, sessionCreatedAt } = result;

    const res = NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      // roleChangedAt lets the client show a "please re-login" banner
      roleChangedAt: user.roleChangedAt ?? null,
      sessionCreatedAt: sessionCreatedAt.toISOString(),
    });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return res;
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
