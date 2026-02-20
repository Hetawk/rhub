import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPwd } from "@/lib/auth";
import { resetSchema, safeParse } from "@/lib/dbt/schemas";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = safeParse(resetSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { email, token, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (
      !user ||
      user.verifyToken !== token ||
      !user.verifyTokenExp ||
      user.verifyTokenExp < new Date()
    ) {
      return NextResponse.json(
        { error: "Invalid or expired reset code" },
        { status: 400 },
      );
    }

    const hashed = await hashPwd(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        verifyToken: null,
        verifyTokenExp: null,
      },
    });

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
