import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genOTP } from "@/lib/dbt/utils";
import { forgotSchema, safeParse } from "@/lib/dbt/schemas";
import { sendPasswordResetEmail } from "@/lib/mail";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = safeParse(forgotSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.emailVerified) {
      // Don't leak whether email exists
      return NextResponse.json({
        message: "If an account exists, a reset email was sent",
      });
    }

    const otp = genOTP();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.user.update({
      where: { id: user.id },
      data: { verifyToken: otp, verifyTokenExp: expiry },
    });

    await sendPasswordResetEmail(email, otp);

    return NextResponse.json({
      message: "If an account exists, a reset email was sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
