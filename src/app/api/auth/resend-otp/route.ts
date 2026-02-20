import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genOTP } from "@/lib/dbt/utils";
import { sendVerificationEmail } from "@/lib/mail";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Return success anyway — don't leak whether the email is registered
      return NextResponse.json({
        message: "If that address is registered, a new code has been sent.",
      });
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "This account is already verified. Please log in." },
        { status: 409 },
      );
    }

    // Rate-limit: prevent re-sends within 55 seconds of the last one
    if (user.verifyTokenExp) {
      const msUntilExpiry = user.verifyTokenExp.getTime() - Date.now();
      const originalWindowMs = 15 * 60 * 1000;
      const msElapsed = originalWindowMs - msUntilExpiry;
      if (msElapsed < 55_000) {
        const waitSeconds = Math.ceil((55_000 - msElapsed) / 1000);
        return NextResponse.json(
          {
            error: `Please wait ${waitSeconds} seconds before requesting a new code.`,
          },
          { status: 429 },
        );
      }
    }

    const otp = genOTP();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { verifyToken: otp, verifyTokenExp: expiry },
    });

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      console.error(
        "[resend-otp] Failed to send verification email to:",
        email,
      );
      return NextResponse.json(
        { error: "Failed to send email. Please try again shortly." },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "New verification code sent." });
  } catch (error) {
    console.error("[resend-otp] error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
