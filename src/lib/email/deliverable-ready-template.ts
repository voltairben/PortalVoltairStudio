/** Client notification when the studio publishes a new deliverable for review. */

export interface DeliverableReadyEmailArgs {
  to: string;
  contactName: string;
  deliverableName: string;
  projectName: string;
  reviewUrl: string;
}

export function renderDeliverableReadyEmail(args: DeliverableReadyEmailArgs): {
  subject: string;
  html: string;
  text: string;
} {
  const first = args.contactName.split(" ")[0] || args.contactName;
  const subject = `New deliverable ready: "${args.deliverableName}"`;

  const text = [
    `Hi ${first},`,
    ``,
    `Voltair Studio has published a new deliverable for ${args.projectName}:`,
    `"${args.deliverableName}".`,
    ``,
    `Review and approve it here: ${args.reviewUrl}`,
    ``,
    `— Voltair Studio`,
  ].join("\n");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="color-scheme" content="dark"></head>
<body style="margin:0;background:#050505;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;">
<tr><td align="center" style="padding:36px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0A0A0A;border:1px solid #1E1E1E;border-radius:14px;">
    <tr><td style="padding:30px 32px;">
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#FF4F00;font-weight:600;">
        New deliverable ready for review
      </div>
      <p style="margin:14px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#FFFFFF;">
        Hi ${escapeHtml(first)}, the studio has published
        <strong>${escapeHtml(args.deliverableName)}</strong> for
        <strong>${escapeHtml(args.projectName)}</strong>.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;">
        <tr><td style="border-radius:9px;background:#FF4F00;">
          <a href="${escapeAttr(args.reviewUrl)}" style="display:inline-block;padding:12px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;font-weight:600;color:#0A0A0A;text-decoration:none;">
            Review the deliverable
          </a>
        </td></tr>
      </table>
      <p style="margin:22px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#8F8F8F;">
        Leave frame-anchored feedback or approve it right from the portal.
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;

  return { subject, html, text };
}

function escapeHtml(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escapeAttr(v: string): string {
  return escapeHtml(v).replace(/'/g, "&#39;");
}
