import "server-only"

import { env } from "@/lib/env"

const MAILTRAP_SEND_URL = "https://send.api.mailtrap.io/api/send"

export async function sendMail(options: {
  to: string
  subject: string
  text: string
  html: string
}) {
  const response = await fetch(MAILTRAP_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.MAILTRAP_API_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "plottwist",
    },
    body: JSON.stringify({
      from: {
        email: env.MAILTRAP_FROM_EMAIL,
        name: env.MAILTRAP_SENDER_NAME ?? "PlotTwist",
      },
      to: [{ email: options.to }],
      subject: options.subject,
      text: options.text,
      html: options.html,
      category: "game",
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean
    errors?: string[]
  }

  if (!response.ok || payload.success === false) {
    throw new Error("Email could not be sent.")
  }
}
