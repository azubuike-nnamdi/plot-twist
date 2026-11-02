import "server-only"

import { env } from "@/lib/env"
import { sendMail } from "@/lib/mail/mailtrap"

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function layout(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f7f7f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e1ea;border-radius:20px;">
          <tr>
            <td style="padding:24px 32px;background:#5b3fd6;color:#ffffff;font-family:Arial,Helvetica,sans-serif;border-radius:20px 20px 0 0;">
              <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;">PlotTwist</p>
              <h1 style="margin:8px 0 0;font-size:24px;font-weight:700;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;font-family:Arial,Helvetica,sans-serif;color:#1b1730;font-size:15px;line-height:24px;">
              ${body}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendWelcomeEmail(input: { to: string; name: string }) {
  const loginUrl = `${env.NEXT_PUBLIC_APP_URL}/login`
  const url = escapeHtml(loginUrl)
  const text = `Hello ${input.name},

Your PlotTwist account is ready.

Sign in:
${loginUrl}`
  const html = layout(
    "Welcome to PlotTwist",
    `<p>Hello ${escapeHtml(input.name)},</p>
     <p>Your account is ready. Host a room or join one with a code.</p>
     <p><a href="${url}" style="display:inline-block;background:#ff6b8a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">Sign in</a></p>
     <p style="color:#676672;font-size:13px;">${url}</p>`
  )
  await sendMail({
    to: input.to,
    subject: "Welcome to PlotTwist",
    text,
    html,
  })
}

export async function sendPasswordResetEmail(input: {
  to: string
  name: string
  url: string
}) {
  const url = escapeHtml(input.url)
  const text = `Hello ${input.name},

Reset your PlotTwist password:
${input.url}

This link expires in 60 minutes. If you did not ask for a reset, you can ignore this email.`
  const html = layout(
    "Reset your password",
    `<p>Hello ${escapeHtml(input.name)},</p>
     <p>Use the link below to choose a new password.</p>
     <p><a href="${url}" style="display:inline-block;background:#ff6b8a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">Reset password</a></p>
     <p style="color:#676672;font-size:13px;">This link expires in 60 minutes. If you did not ask for a reset, you can ignore this email.<br />${url}</p>`
  )
  await sendMail({
    to: input.to,
    subject: "Reset your PlotTwist password",
    text,
    html,
  })
}

export async function sendReportNotice(input: {
  to: string
  roomCode: string
  reportsUrl: string
}) {
  const reportsUrl = escapeHtml(input.reportsUrl)
  const roomCode = escapeHtml(input.roomCode)
  const text = `A player filed a report in room ${input.roomCode}.

Open the reports queue:
${input.reportsUrl}`
  const html = layout(
    "New report",
    `<p>A player filed a report in room ${roomCode}.</p>
     <p>The answer text is not included in this email.</p>
     <p><a href="${reportsUrl}" style="display:inline-block;background:#ff6b8a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">Open reports</a></p>
     <p style="color:#676672;font-size:13px;">${reportsUrl}</p>`
  )
  await sendMail({
    to: input.to,
    subject: `PlotTwist report in ${input.roomCode}`,
    text,
    html,
  })
}
