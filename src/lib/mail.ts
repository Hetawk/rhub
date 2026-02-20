/**
 * Email service using EKDSend API
 * Mirrors ekddigital/ email system for transactional emails
 * Uses env vars: EKDSEND_API_URL, EKDSEND_API_KEY, EKDSEND_DEFAULT_FROM
 */

function getApiUrl(): string {
  return process.env.EKDSEND_API_URL || "https://es.ekddigital.com/api/v1";
}

function getApiKey(): string {
  return process.env.EKDSEND_API_KEY || "";
}

function getDefaultFrom(): string {
  return process.env.EKDSEND_DEFAULT_FROM || "noreply@rhub.ekddigital.com";
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

/** Strip HTML tags to produce a plain-text fallback for multipart emails */
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("[mail] EKDSEND_API_KEY not configured");
    return false;
  }

  const payload = {
    type: "email",
    to: opts.to,
    from: opts.from || getDefaultFrom(),
    subject: opts.subject,
    body: opts.html, // /send endpoint uses "body" for HTML content
    text: htmlToText(opts.html), // plain-text fallback for deliverability
    ...(opts.replyTo && { replyTo: opts.replyTo }),
  };

  console.log("[mail] sending to EKDSend:", {
    to: payload.to,
    from: payload.from,
    subject: payload.subject,
  });

  try {
    const res = await fetch(`${getApiUrl()}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorBody = await res.text().catch(() => "(no body)");
      console.error(`[mail] send failed: HTTP ${res.status}`, errorBody);
      return false;
    }
    const result = await res.json().catch(() => ({}));
    console.log("[mail] sent successfully:", {
      messageId: result.messageId,
      to: payload.to,
    });
    return true;
  } catch (err) {
    console.error("[mail] send failed:", err);
    return false;
  }
}

function brandedTemplate(content: string): string {
  const siteUrl = getSiteUrl();
  const year = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

  <!-- Header with logo -->
  <tr><td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:28px 32px;text-align:center">
    <img src="${siteUrl}/rhub_logo.png"
         alt="RHub Logo"
         width="80"
         style="display:block;margin:0 auto 14px;height:auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" />
    <h1 style="margin:0;color:#d4af37;font-size:22px;font-weight:700;letter-spacing:0.5px">EKD Digital Resource Hub</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;font-style:italic">Building a Better World Through KINGDOM Principles</p>
    <p style="margin:4px 0 0;color:rgba(255,255,255,0.5);font-size:11px">rhub.ekddigital.com</p>
  </td></tr>

  <!-- Gold accent bar -->
  <tr><td style="height:3px;background:linear-gradient(90deg,transparent 0%,#d4af37 50%,transparent 100%)"></td></tr>

  <!-- Body content -->
  <tr><td style="padding:32px">${content}</td></tr>

  <!-- Gold accent bar -->
  <tr><td style="height:3px;background:linear-gradient(90deg,transparent 0%,#d4af37 50%,transparent 100%)"></td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px;background:linear-gradient(135deg,#1a1a2e,#16213e);text-align:center">
    <img src="${siteUrl}/logo.png"
         alt="EKD Digital"
         width="48"
         style="display:block;margin:0 auto 10px;height:auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" />
    <p style="margin:0 0 6px;color:rgba(255,255,255,0.9);font-size:12px;font-weight:500">
      &copy; 2023&ndash;${year} EKD Digital. All rights reserved.
    </p>
    <p style="margin:0 0 4px;font-size:12px">
      <a href="${siteUrl}" style="color:#d4af37;text-decoration:none;font-weight:500">rhub.ekddigital.com</a>
      &nbsp;|&nbsp;
      <a href="mailto:support@ekddigital.com" style="color:rgba(255,255,255,0.7);text-decoration:none">support@ekddigital.com</a>
    </p>
    <p style="margin:0;color:#d4af37;font-size:11px;font-style:italic">Building a Better World Through KINGDOM Principles</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<boolean> {
  const html = brandedTemplate(`
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:18px">Verify Your Email</h2>
    <p style="color:#475569;line-height:1.6">Use this code to verify your account:</p>
    <div style="text-align:center;margin:24px 0">
      <span style="display:inline-block;padding:16px 32px;background:#1a1a2e;color:#d4af37;font-size:28px;font-weight:700;letter-spacing:6px;border-radius:8px">${token}</span>
    </div>
    <p style="color:#94a3b8;font-size:13px">This code expires in 15 minutes. If you didn't request this, ignore this email.</p>
  `);

  return sendEmail({ to: email, subject: "Verify your RHub account", html });
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<boolean> {
  const html = brandedTemplate(`
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:18px">Reset Your Password</h2>
    <p style="color:#475569;line-height:1.6">Use this code to reset your password:</p>
    <div style="text-align:center;margin:24px 0">
      <span style="display:inline-block;padding:16px 32px;background:#1a1a2e;color:#d4af37;font-size:28px;font-weight:700;letter-spacing:6px;border-radius:8px">${token}</span>
    </div>
    <p style="color:#94a3b8;font-size:13px">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
  `);

  return sendEmail({ to: email, subject: "Reset your RHub password", html });
}

export async function sendJudgeInviteEmail(
  email: string,
  eventTitle: string,
  alias: string,
  gameType: "TEST" | "REAL" = "REAL",
): Promise<boolean> {
  const siteUrl = getSiteUrl();
  const isTest = gameType === "TEST";

  const gameLabel = isTest
    ? `<span style="display:inline-block;padding:4px 12px;background:#fef3c7;color:#92400e;border-radius:4px;font-size:12px;font-weight:600;margin-bottom:8px">TEST GAME</span>`
    : `<span style="display:inline-block;padding:4px 12px;background:#dcfce7;color:#166534;border-radius:4px;font-size:12px;font-weight:600;margin-bottom:8px">OFFICIAL GAME</span>`;

  const testNote = isTest
    ? `<p style="color:#92400e;font-size:13px;background:#fef3c7;padding:12px;border-radius:8px;margin:16px 0">This is a <strong>test game</strong> for practice and system familiarization. Scores will not count toward official results.</p>`
    : "";

  const html = brandedTemplate(`
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:18px">You've Been Invited as a Judge</h2>
    ${gameLabel}
    <p style="color:#475569;line-height:1.6">You have been assigned as <strong>${alias}</strong> for:</p>
    <div style="margin:16px 0;padding:16px;background:#f8fafc;border-radius:8px;border-left:4px solid #d4af37">
      <p style="margin:0;color:#1a1a2e;font-weight:600;font-size:16px">${eventTitle}</p>
    </div>
    ${testNote}
    <p style="color:#475569;line-height:1.6">Log in to access your judging dashboard and scoring sheets.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${siteUrl}/tools/dbt/judge" style="display:inline-block;padding:12px 32px;background:#d4af37;color:#1a1a2e;text-decoration:none;border-radius:8px;font-weight:600">Go to Judge Dashboard</a>
    </div>
  `);

  return sendEmail({
    to: email,
    subject: `${isTest ? "[TEST] " : ""}Judge Invitation: ${eventTitle}`,
    html,
  });
}

/**
 * Sent to someone who has been assigned as a judge but does NOT yet have an account.
 * The setupLink includes a pre-populated invite token so they land on the register page
 * with their email pre-filled and their judge slot auto-linked on signup.
 */
export async function sendAccountSetupEmail(
  email: string,
  name: string,
  eventTitle: string,
  setupLink: string,
  alias: string,
): Promise<boolean> {
  const html = brandedTemplate(`
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:18px">You&rsquo;ve Been Invited as a Judge</h2>
    <p style="color:#475569;line-height:1.6">Hi <strong>${name || "there"}</strong>,</p>
    <p style="color:#475569;line-height:1.6">
      You have been assigned as judge <strong>${alias}</strong> for the following debate event:
    </p>
    <div style="margin:16px 0;padding:16px;background:#f8fafc;border-radius:8px;border-left:4px solid #d4af37">
      <p style="margin:0;color:#1a1a2e;font-weight:600;font-size:16px">${eventTitle}</p>
    </div>
    <p style="color:#475569;line-height:1.6">
      You don&rsquo;t have an account yet &mdash; click the button below to create one and
      get instant access to your judging panel. Your judge assignment will be linked automatically.
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="${setupLink}"
         style="display:inline-block;padding:14px 36px;background:#d4af37;color:#1a1a2e;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px">
        Set Up My Account →
      </a>
    </div>
    <p style="color:#94a3b8;font-size:12px;text-align:center">
      This invitation link expires in 7 days. If you did not expect this email, you can safely ignore it.
    </p>
    <p style="color:#94a3b8;font-size:11px;text-align:center;word-break:break-all">
      ${setupLink}
    </p>
  `);

  return sendEmail({
    to: email,
    subject: `Judge Invitation: ${eventTitle} — Set up your RHub account`,
    html,
  });
}

export async function sendGameNotificationEmail(
  email: string,
  eventTitle: string,
  roundTitle: string,
  topic: string,
  startTime: string | null,
  gameType: "TEST" | "REAL" = "REAL",
): Promise<boolean> {
  const siteUrl = getSiteUrl();
  const isTest = gameType === "TEST";

  const timeInfo = startTime
    ? `<p style="color:#475569"><strong>Scheduled:</strong> ${new Date(startTime).toLocaleString()}</p>`
    : "";

  const html = brandedTemplate(`
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:18px">New Game Scheduled</h2>
    ${isTest ? `<span style="display:inline-block;padding:4px 12px;background:#fef3c7;color:#92400e;border-radius:4px;font-size:12px;font-weight:600;margin-bottom:8px">TEST GAME</span>` : ""}
    <div style="margin:16px 0;padding:16px;background:#f8fafc;border-radius:8px;border-left:4px solid #d4af37">
      <p style="margin:0 0 4px;color:#1a1a2e;font-weight:600;font-size:16px">${eventTitle}</p>
      <p style="margin:0 0 4px;color:#475569;font-size:14px">${roundTitle}</p>
      <p style="margin:0;color:#64748b;font-size:13px;font-style:italic">"${topic}"</p>
    </div>
    ${timeInfo}
    <div style="text-align:center;margin:24px 0">
      <a href="${siteUrl}/tools/dbt/judge" style="display:inline-block;padding:12px 32px;background:#d4af37;color:#1a1a2e;text-decoration:none;border-radius:8px;font-weight:600">Open Judge Dashboard</a>
    </div>
  `);

  return sendEmail({
    to: email,
    subject: `${isTest ? "[TEST] " : ""}Game: ${roundTitle} — ${eventTitle}`,
    html,
  });
}
