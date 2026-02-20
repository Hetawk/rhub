import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { cookies } from "next/headers";

/**
 * GET /api/auth/callback/google
 * Handles Google OAuth2 callback.
 * Exchange code for tokens, get user info, create/link account.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") || "/tools/dbt";
  const errorParam = searchParams.get("error");

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://rhub.ekddigital.com";
  const redirectUri = `${siteUrl}/api/auth/callback/google`;

  if (errorParam) {
    return NextResponse.redirect(`${siteUrl}/login?error=google_denied`);
  }

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/login?error=no_code`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.AUTH_GOOGLE_ID || "",
        client_secret: process.env.AUTH_GOOGLE_SECRET || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Google token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(`${siteUrl}/login?error=token_exchange`);
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
      id_token?: string;
    };

    // Get user info
    const userInfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
    );

    if (!userInfoRes.ok) {
      return NextResponse.redirect(`${siteUrl}/login?error=user_info`);
    }

    const googleUser = (await userInfoRes.json()) as {
      id: string;
      email: string;
      name: string;
      picture?: string;
      verified_email: boolean;
    };

    if (!googleUser.email) {
      return NextResponse.redirect(`${siteUrl}/login?error=no_email`);
    }

    // Find or create user in our system
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleUser.id }, { email: googleUser.email }],
      },
    });

    if (user) {
      // Update googleId and emailVerified if not set
      if (!user.googleId || !user.emailVerified) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: user.googleId || googleUser.id,
            emailVerified: true,
            isActive: true,
          },
        });
      }
    } else {
      // Create new user (Google-authenticated, no password)
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name || googleUser.email.split("@")[0],
          password: null,
          googleId: googleUser.id,
          role: "AUDIENCE",
          isActive: true,
          emailVerified: true,
        },
      });
    }

    if (!user.isActive) {
      return NextResponse.redirect(`${siteUrl}/login?error=account_disabled`);
    }

    // Create session
    const token = await createSession(user.id);

    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    // Redirect to intended destination
    const destination = decodeURIComponent(state);
    // Only allow relative paths to prevent open redirect
    const safeDest = destination.startsWith("/") ? destination : "/tools/dbt";
    return NextResponse.redirect(`${siteUrl}${safeDest}`);
  } catch (error) {
    console.error("Google auth callback error:", error);
    return NextResponse.redirect(`${siteUrl}/login?error=server_error`);
  }
}
