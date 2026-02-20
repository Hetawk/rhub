import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/google
 * Initiates Google OAuth2 authentication flow.
 * Redirects user to Google's OAuth consent screen.
 *
 * Authorized redirect URI to add in Google Cloud Console:
 *   https://rhub.ekddigital.com/api/auth/callback/google
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.AUTH_GOOGLE_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Google OAuth not configured" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const state = searchParams.get("state") || "/dashboard";

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://rhub.ekddigital.com";
  const redirectUri = `${siteUrl}/api/auth/callback/google`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: state,
    access_type: "offline",
    prompt: "select_account",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
}
