/**
 * Branded studio-admin invite email. Pure function, no dependencies — inline
 * HTML only, same reasoning as onboarding-template.ts.
 *
 * Palette: #0A0A0A container · #FFFFFF text · #8F8F8F subtle · #FF4F00 accent.
 */

export interface AdminInviteEmailArgs {
  email: string;
  displayName: string;
  tempPassword: string;
  loginUrl?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const DEFAULT_LOGIN_URL = "https://portal.voltairstudio.com/login";

export function renderAdminInviteEmail(args: AdminInviteEmailArgs): RenderedEmail {
  const loginUrl = args.loginUrl ?? DEFAULT_LOGIN_URL;
  const firstName = args.displayName.split(" ")[0] || args.displayName;
  const subject = "You've been added as a Voltair Studio admin";

  const text = [
    `Welcome to the Voltair Studio Portal, ${firstName}.`,
    ``,
    `You now have studio admin access — every client, project, and`,
    `deliverable in the portal.`,
    ``,
    `Sign in: ${loginUrl}`,
    `Email:   ${args.email}`,
    `Temporary password: ${args.tempPassword}`,
    ``,
    `Please change your password after your first sign-in.`,
    `This portal is invite-only and access is limited to your team.`,
    ``,
    `— Voltair Studio`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#050505;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#050505;">
<tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#0A0A0A;border:1px solid #1E1E1E;border-radius:16px;overflow:hidden;">
    <tr><td style="padding:36px 40px 8px 40px;">
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#FF4F00;font-weight:600;">
        Voltair Studio
      </div>
    </td></tr>
    <tr><td style="padding:16px 40px 0 40px;">
      <h1 style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;line-height:1.25;color:#FFFFFF;font-weight:600;letter-spacing:-0.01em;">
        Welcome, ${escapeHtml(firstName)}.
      </h1>
      <p style="margin:14px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#8F8F8F;">
        You now have <span style="color:#FFFFFF;">studio admin</span> access to the Voltair Studio
        Portal — every client, project, and deliverable, plus uploads and studio replies.
      </p>
    </td></tr>
    <tr><td style="padding:28px 40px 0 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#111111;border:1px solid #1E1E1E;border-radius:12px;">
        <tr><td style="padding:18px 20px;">
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#8F8F8F;">Email</div>
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#FFFFFF;margin-top:4px;">${escapeHtml(args.email)}</div>
          <div style="height:14px;"></div>
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#8F8F8F;">Temporary password</div>
          <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:16px;color:#FF4F00;margin-top:4px;letter-spacing:0.5px;">${escapeHtml(args.tempPassword)}</div>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:28px 40px 0 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr><td style="border-radius:10px;background-color:#FF4F00;">
          <a href="${escapeAttr(loginUrl)}" style="display:inline-block;padding:13px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#0A0A0A;text-decoration:none;border-radius:10px;">
            Open the portal &rarr;
          </a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:24px 40px 36px 40px;">
      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#8F8F8F;">
        Change your password after your first sign-in. This portal is invite-only —
        access stays limited to your team.
      </p>
    </td></tr>
    <tr><td style="padding:20px 40px;border-top:1px solid #1E1E1E;">
      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#555555;">
        Sent by Voltair Studio · If you weren't expecting this, ignore this email.
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
