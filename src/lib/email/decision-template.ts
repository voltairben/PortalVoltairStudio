/** Studio notification when a client approves or requests changes on a deliverable. */

export interface DecisionEmailArgs {
  decision: "approved" | "changes-requested";
  deliverableName: string;
  projectName: string;
  clientName: string;
  reviewUrl: string;
}

/** Render the studio notification sent after a client records a review decision. */
export function renderDecisionEmail(args: DecisionEmailArgs): {
  subject: string;
  html: string;
  text: string;
} {
  const approved = args.decision === "approved";
  const verb = approved ? "approved" : "requested changes on";
  const accent = approved ? "#46D19E" : "#FF4F00";
  const subject = approved
    ? `"${args.deliverableName}" approved`
    : `Changes requested on "${args.deliverableName}"`;

  const text = [
    `${args.clientName} ${verb} "${args.deliverableName}" (${args.projectName}).`,
    ``,
    `Review it: ${args.reviewUrl}`,
    ``,
    `— Voltair Studio Portal`,
  ].join("\n");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="color-scheme" content="dark"></head>
<body style="margin:0;background:#050505;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;">
<tr><td align="center" style="padding:36px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0A0A0A;border:1px solid #1E1E1E;border-radius:14px;">
    <tr><td style="padding:28px 32px;">
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:${accent};font-weight:600;">
        ${approved ? "Deliverable approved" : "Changes requested"}
      </div>
      <p style="margin:14px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#FFFFFF;">
        <strong>${escapeHtml(args.clientName)}</strong> ${verb}
        <strong>${escapeHtml(args.deliverableName)}</strong>.
      </p>
      <p style="margin:6px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;color:#8F8F8F;">
        Project: ${escapeHtml(args.projectName)}
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;">
        <tr><td style="border-radius:9px;background:#FF4F00;">
          <a href="${escapeAttr(args.reviewUrl)}" style="display:inline-block;padding:11px 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;font-weight:600;color:#0A0A0A;text-decoration:none;">
            Open the review
          </a>
        </td></tr>
      </table>
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
