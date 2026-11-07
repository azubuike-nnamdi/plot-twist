import "server-only"

import { env } from "@/lib/env"
import { AppError } from "@/lib/errors"

const OLLAMA_CLOUD_URL = "https://ollama.com"
const LOCAL_OLLAMA_URL = "http://127.0.0.1:11434"
const CLOUD_MODEL = "gpt-oss:120b"
const LOCAL_MODEL = "llama3.2"
const REQUEST_MS = 60_000

type OllamaChatResponse = {
  message?: { content?: string }
}

// With an API key and no URL, talk to Ollama Cloud. Without a key, assume a
// local Ollama for development.
function ollamaBaseUrl() {
  const url = env.OLLAMA_BASE_URL || (env.OLLAMA_API_KEY ? OLLAMA_CLOUD_URL : LOCAL_OLLAMA_URL)
  return url.replace(/\/$/, "")
}

export function ollamaModel() {
  return env.OLLAMA_MODEL || (ollamaBaseUrl() === OLLAMA_CLOUD_URL ? CLOUD_MODEL : LOCAL_MODEL)
}

/**
 * One chat call to Ollama. Works with a self-hosted server (OLLAMA_BASE_URL)
 * or Ollama Cloud (OLLAMA_BASE_URL=https://ollama.com plus OLLAMA_API_KEY).
 * The nightly job runs on Vercel, so localhost only works in development.
 */
export async function requestOllama(prompt: string) {
  const baseUrl = ollamaBaseUrl()
  const model = ollamaModel()
  let response: Response
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(env.OLLAMA_API_KEY ? { authorization: `Bearer ${env.OLLAMA_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        options: { temperature: 0.9 },
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(REQUEST_MS),
    })
  } catch {
    throw new AppError("Ollama is not reachable. Check OLLAMA_BASE_URL.", "VALIDATION")
  }
  if (!response.ok) {
    throw new AppError(
      `Ollama could not run ${model} (status ${response.status}). Check OLLAMA_MODEL and OLLAMA_API_KEY.`,
      "VALIDATION"
    )
  }
  const body = (await response.json()) as OllamaChatResponse
  const content = body.message?.content
  if (!content) throw new AppError("Ollama returned an empty draft.", "VALIDATION")
  return content
}
